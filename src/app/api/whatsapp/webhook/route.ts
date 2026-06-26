import { NextRequest, NextResponse } from 'next/server'

// Webhook Meta WhatsApp — messages entrants
// Dans Meta for Developers : votre app → WhatsApp → Configuration → Webhook URL = https://votre-domaine.com/api/whatsapp/webhook
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
      // Accusé de réception / lu — ignorer
      return NextResponse.json({ received: true })
    }

    const messages = value?.messages
    if (!messages?.length) return NextResponse.json({ received: true })

    const msg = messages[0]
    const from: string = msg.from || ''
    const text: string = msg.text?.body || msg.button?.text || '(média)'
    const timestamp: string = msg.timestamp
      ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
      : new Date().toISOString()

    const normalized = from.replace(/\D/g, '')

    const { getProspects } = await import('@/lib/prospect-store')
    const { addActivity } = await import('@/lib/activity-store')

    const prospects = getProspects()
    const prospect = prospects.find(p => {
      const pPhone = p.phone?.replace(/\D/g, '') || ''
      return pPhone === normalized || pPhone.endsWith(normalized) || normalized.endsWith(pPhone)
    })

    if (prospect) {
      addActivity({
        prospectId: prospect.id,
        type: 'WHATSAPP_SENT',
        content: `📥 WhatsApp reçu : ${text}`,
        fromEmail: from,
        fromName: `${prospect.firstName ?? ''} ${prospect.lastName}`.trim(),
      })
      console.log(`WhatsApp inbound from ${from} → prospect ${prospect.id}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
