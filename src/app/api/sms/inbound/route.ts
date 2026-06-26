import { NextRequest, NextResponse } from 'next/server'

// Webhook Twilio — SMS entrants
// Dans Twilio Console : Phone Numbers → votre numéro → Messaging → Webhook = https://votre-domaine.com/api/sms/inbound
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from: string = formData.get('From')?.toString() || ''
    const body: string = formData.get('Body')?.toString() || ''

    if (!from || !body) {
      return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
    }

    // Normaliser le numéro (enlever le +)
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
        type: 'SMS_SENT', // On réutilise SMS_SENT avec un flag pour les reçus — à améliorer
        content: `📥 SMS reçu : ${body}`,
        fromEmail: from,
        fromName: `${prospect.firstName ?? ''} ${prospect.lastName}`.trim(),
      })
      console.log(`SMS inbound from ${from} → prospect ${prospect.id}`)
    } else {
      console.log(`SMS inbound from unknown: ${from}`)
    }

    // Twilio attend une réponse TwiML
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })

  } catch (error) {
    console.error('SMS inbound error:', error)
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
  }
}
