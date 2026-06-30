import { NextRequest, NextResponse } from 'next/server'
import { parsePhone } from '@/lib/phone-utils'

// Brevo SMS API (Transactional SMS)
// Docs : https://developers.brevo.com/reference/sendtransacsms
// Utilise la même BREVO_API_KEY que l'email — aucune config supplémentaire

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, prospectId, sender: bodySender } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Numéro et message requis' }, { status: 400 })
    }

    const apiKey = process.env.BREVO_API_KEY
    // Priorité : sender passé depuis l'UI → variable d'env → valeur par défaut
    const sender = (bodySender as string)?.trim() || process.env.TWILIO_SENDER_ID || 'Solargeo'

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Brevo non configuré. Ajoutez BREVO_API_KEY dans .env' },
        { status: 500 }
      )
    }

    // Normaliser le numéro (Martinique, Guadeloupe, France, etc.)
    const parsed = parsePhone(to)
    const recipient = parsed.formatted ?? (to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`)

    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender,
        recipient,
        content: message,
        type: 'transactional',
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Brevo SMS error:', JSON.stringify(err))
      return NextResponse.json(
        { error: `Brevo SMS: ${err.message || 'Erreur envoi SMS'}`, details: err },
        { status: 422 }
      )
    }

    const data = await res.json()

    // Enregistrer l'activité
    if (prospectId) {
      try {
        const { addActivity } = await import('@/lib/activity-store')
        addActivity({
          prospectId,
          type: 'SMS_SENT',
          content: message,
        })
      } catch {}
    }

    return NextResponse.json({ success: true, messageId: data.messageId })

  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  const configured = !!process.env.BREVO_API_KEY
  return NextResponse.json({
    configured,
    sender: process.env.TWILIO_SENDER_ID || 'Solargeo',
    provider: 'Brevo',
  })
}
