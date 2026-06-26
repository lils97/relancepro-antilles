import { NextRequest, NextResponse } from 'next/server'
import { parsePhone } from '@/lib/phone-utils'

// Meta WhatsApp Business API
// Docs : https://developers.facebook.com/docs/whatsapp/cloud-api/messages

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, prospectId } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'Numéro et message requis' }, { status: 400 })
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp non configuré. Ajoutez WHATSAPP_PHONE_NUMBER_ID et WHATSAPP_ACCESS_TOKEN dans .env' },
        { status: 500 }
      )
    }

    // Normaliser le numéro (Martinique, Guadeloupe, France, etc.)
    const parsed = parsePhone(to)
    const toNumber = parsed.formatted
      ? parsed.formatted.replace('+', '')  // Meta attend sans le +
      : to.replace(/\D/g, '')             // Fallback : chiffres bruts

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toNumber,
      type: 'text',
      text: { preview_url: false, body: message },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('WhatsApp error:', JSON.stringify(err))
      return NextResponse.json(
        { error: `WhatsApp: ${err.error?.message || 'Erreur envoi'}`, details: err },
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
          type: 'WHATSAPP_SENT',
          content: message,
        })
      } catch {}
    }

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id })

  } catch (error) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  const configured = !!(
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN
  )
  return NextResponse.json({ configured })
}
