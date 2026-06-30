import { NextRequest, NextResponse } from 'next/server'
import { parsePhone } from '@/lib/phone-utils'

// Meta WhatsApp Business API
// Docs : https://developers.facebook.com/docs/whatsapp/cloud-api/messages

// Modèle approuvé Meta : "solargeo" (fr) — image + texte fixe
const TEMPLATE_NAME = 'solargeo'
const TEMPLATE_LANG = 'fr'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message, prospectId, type, imageUrl, caption, useTemplate } = body

    if (!to) {
      return NextResponse.json({ error: 'Numéro requis' }, { status: 400 })
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'WhatsApp non configuré.' },
        { status: 500 }
      )
    }

    // Normaliser le numéro
    const parsed = parsePhone(to)
    const toNumber = parsed.formatted
      ? parsed.formatted.replace('+', '')
      : to.replace(/\D/g, '')

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`

    let payload: Record<string, unknown>

    if (useTemplate || type === 'template') {
      // ── Envoi via modèle approuvé "solargeo" ──
      // Le modèle a une image en en-tête OBLIGATOIRE
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Une image est obligatoire pour ce modèle. Choisissez une image avant d\'envoyer.' },
          { status: 400 }
        )
      }

      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: 'template',
        template: {
          name: TEMPLATE_NAME,
          language: { code: TEMPLATE_LANG },
          components: [
            {
              type: 'header',
              parameters: [{ type: 'image', image: { link: imageUrl } }],
            },
          ],
        },
      }
    } else if (type === 'image') {
      // ── Image libre (fonctionne si le client a écrit dans les 24h) ──
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: 'image',
        image: {
          link: imageUrl,
          ...(caption ? { caption } : {}),
        },
      }
    } else {
      // ── Texte libre (fonctionne si le client a écrit dans les 24h) ──
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: 'text',
        text: { preview_url: false, body: message },
      }
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

    if (prospectId) {
      try {
        const { addActivity } = await import('@/lib/activity-store')
        addActivity({
          prospectId,
          type: 'WHATSAPP_SENT',
          content: useTemplate
            ? `📋 Modèle "solargeo" envoyé${imageUrl ? ' avec image' : ''}`
            : type === 'image'
              ? `🖼️ Image envoyée${caption ? ` : ${caption}` : ''}`
              : message,
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
