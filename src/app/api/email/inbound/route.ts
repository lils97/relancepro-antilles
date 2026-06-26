import { NextRequest, NextResponse } from 'next/server'

// Webhook Brevo Inbound Parsing
// À configurer dans Brevo : Settings → Inbound Parsing → URL = https://stephenlils.com/api/email/inbound
// Le Reply-To des emails envoyés doit pointer vers l'adresse inbound Brevo

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Format Brevo inbound parsing
    const fromEmail: string = body.From || body.from || ''
    const fromName: string = body.FromFull?.Name || body.sender?.name || fromEmail
    const subject: string = body.Subject || body.subject || '(sans objet)'
    const text: string = body.StrippedTextReply || body.TextDecoded || body.text || ''
    const toEmail: string = body.To || body.to || ''

    if (!fromEmail) {
      return NextResponse.json({ error: 'Expéditeur manquant' }, { status: 400 })
    }

    // Import dynamique pour éviter les erreurs côté serveur
    const { getProspects } = await import('@/lib/prospect-store')
    const { addActivity } = await import('@/lib/activity-store')

    // Trouver le prospect par email
    const prospects = getProspects()
    const prospect = prospects.find(
      p => p.email?.toLowerCase() === fromEmail.toLowerCase()
    )

    if (!prospect) {
      console.log(`Inbound email from unknown prospect: ${fromEmail}`)
      return NextResponse.json({ received: true, matched: false })
    }

    // Enregistrer la réponse comme activité
    addActivity({
      prospectId: prospect.id,
      type: 'EMAIL_RECEIVED',
      subject,
      content: text || '(contenu vide)',
      fromEmail,
      fromName,
    })

    console.log(`Inbound reply from ${fromEmail} → prospect ${prospect.id}`)
    return NextResponse.json({ received: true, matched: true, prospectId: prospect.id })

  } catch (error) {
    console.error('Inbound webhook error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// Brevo vérifie le webhook avec un GET
export async function GET() {
  return NextResponse.json({ status: 'Inbound webhook actif' })
}
