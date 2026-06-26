import { NextRequest, NextResponse } from 'next/server'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, toName, subject, htmlContent, textContent, attachments } = body
    // attachments: Array<{ name: string; content: string }> — content est en base64

    if (!to || !subject || (!htmlContent && !textContent)) {
      return NextResponse.json({ error: 'Destinataire, objet et contenu requis' }, { status: 400 })
    }

    const apiKey = process.env.BREVO_API_KEY
    const senderEmail = process.env.BREVO_SENDER_EMAIL
    const senderName = process.env.BREVO_SENDER_NAME || 'RelancePro Antilles'

    if (!apiKey || !senderEmail) {
      return NextResponse.json(
        { error: 'Brevo non configuré. Ajoutez BREVO_API_KEY et BREVO_SENDER_EMAIL dans .env' },
        { status: 500 }
      )
    }

    const payload: Record<string, unknown> = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: htmlContent || `<p>${textContent}</p>`,
      textContent: textContent || htmlContent?.replace(/<[^>]*>/g, '') || '',
    }

    if (attachments?.length) {
      payload.attachment = attachments.map((a: { name: string; content: string }) => ({
        name: a.name,
        content: a.content, // base64
      }))
    }

    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('Brevo error (status', res.status, '):', JSON.stringify(err))
      return NextResponse.json(
        { error: `Brevo ${res.status}: ${err.message || 'Erreur envoi'}`, details: err },
        { status: 422 }
      )
    }

    const data = await res.json()

    // Enregistrer l'email envoyé comme activité
    try {
      const { addActivity } = await import('@/lib/activity-store')
      const { getProspects } = await import('@/lib/prospect-store')
      const prospects = getProspects()
      const prospect = prospects.find(p => p.email?.toLowerCase() === to.toLowerCase())
      if (prospect) {
        addActivity({
          prospectId: prospect.id,
          type: 'EMAIL_SENT',
          subject,
          content: textContent || htmlContent?.replace(/<[^>]*>/g, '') || '',
        })
      }
    } catch {}

    return NextResponse.json({ success: true, messageId: data.messageId })

  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET — vérifier la configuration Brevo
export async function GET() {
  const configured = !!(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL)
  return NextResponse.json({
    configured,
    senderEmail: process.env.BREVO_SENDER_EMAIL || null,
    senderName: process.env.BREVO_SENDER_NAME || null,
  })
}
