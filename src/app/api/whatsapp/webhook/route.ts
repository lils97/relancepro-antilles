import { NextRequest, NextResponse } from 'next/server'

// Webhook Meta WhatsApp — messages entrants
// Dans Meta for Developers : votre app → WhatsApp → Configuration → Webhook URL = https://relancepro-antilles.vercel.app/api/whatsapp/webhook
// Verify Token = valeur de WHATSAPP_VERIFY_TOKEN dans .env

// Vérification webhook Meta (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// Réception messages WhatsApp (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (value?.statuses) {
      return NextResponse.json({ received: true })
    }

    const messages = value?.messages
    if (!messages?.length) return NextResponse.json({ received: true })

    const msg = messages[0]
    const from: string = msg.from || ''
    const text: string = msg.text?.body || msg.button?.text || '(média)'

    const normalized = from.replace(/\D/g, '')

    // Chercher le prospect correspondant
    const { getProspects } = await import('@/lib/prospect-store')
    const prospects = getProspects()
    const prospect = prospects.find(p => {
      const pPhone = p.phone?.replace(/\D/g, '') || ''
      return pPhone === normalized || pPhone.endsWith(normalized) || normalized.endsWith(pPhone)
    })

    // Sauvegarder dans Redis (inbox temps réel)
    try {
      const { saveInboxMessage } = await import('@/lib/redis')
      await saveInboxMessage({
        from,
        fromName: prospect
          ? `${prospect.firstName ?? ''} ${prospect.lastName}`.trim()
          : from,
        prospectId: prospect?.id,
        body: text,
        channel: 'WHATSAPP',
      })
    } catch (redisErr) {
      console.error('Redis save error:', redisErr)
    }

    // Enregistrer aussi dans les activités prospect
    if (prospect) {
      try {
        const { addActivity } = await import('@/lib/activity-store')
        addActivity({
          prospectId: prospect.id,
          type: 'WHATSAPP_SENT',
          content: `📥 WhatsApp reçu : ${text}`,
          fromEmail: from,
          fromName: `${prospect.firstName ?? ''} ${prospect.lastName}`.trim(),
        })
      } catch {}
      console.log(`WhatsApp inbound from ${from} → prospect ${prospect.id}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
