import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// POST /api/ai — Génération de messages et analyse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'generate_message':
        return await generateMessage(params)
      case 'analyze_response':
        return await analyzeResponse(params)
      case 'score_prospect':
        return await scoreProspect(params)
      default:
        return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }
}

async function generateMessage({
  category, channel, objective, tone, context, prospect,
}: {
  category: string
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL'
  objective: string
  tone: string
  context?: string
  prospect?: Record<string, string>
}) {
  const categoryLabels: Record<string, string> = {
    INTERNET_FIBRE: 'Internet / Fibre optique',
    PANNEAUX_SOLAIRES: 'Panneaux Solaires',
    ISOLATION_THERMIQUE: 'Isolation Thermique',
    CLIMATISATION: 'Climatisation',
    BRASSEURS_AIR: 'Brasseurs d\'Air',
  }

  const channelConstraints: Record<string, string> = {
    SMS: 'Message court, maximum 160 caractères. Direct et efficace.',
    WHATSAPP: 'Message de longueur moyenne, peut inclure des emojis. Personnalisé.',
    EMAIL: 'Email professionnel avec objet, corps structuré et signature.',
  }

  const toneInstructions: Record<string, string> = {
    PROFESSIONAL: 'Ton professionnel et formel',
    COMMERCIAL: 'Ton commercial, axé bénéfices et urgence',
    FRIENDLY: 'Ton amical et chaleureux, adapté aux Antilles',
  }

  const objectiveInstructions: Record<string, string> = {
    APPOINTMENT: 'Objectif: obtenir un rendez-vous',
    SALE: 'Objectif: conclure une vente directe',
    FOLLOWUP: 'Objectif: relancer un prospect qui ne répond plus',
    REACTIVATION: 'Objectif: réactiver un prospect perdu',
  }

  const systemPrompt = `Tu es un expert en prospection commerciale aux Antilles françaises (Martinique, Guadeloupe).
Tu génères des messages de prospection percutants, adaptés à la culture antillaise.
Utilise les variables dynamiques : {prenom}, {nom}, {ville}, {commercial}, {offre}, {date}.
${channelConstraints[channel]}
${toneInstructions[tone]}
${objectiveInstructions[objective]}
Secteur : ${categoryLabels[category] || category}
${context ? `Contexte supplémentaire : ${context}` : ''}
${channel === 'EMAIL' ? 'Génère l\'objet sur la première ligne prefixé de "Objet: " puis le corps séparé par une ligne vide.' : ''}
Génère UNIQUEMENT le message, sans explication.`

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Génère un message ${channel} pour la prospection en ${categoryLabels[category] || category} aux Antilles.`,
      },
    ],
    system: systemPrompt,
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 })
  }

  return NextResponse.json({ message: content.text })
}

async function analyzeResponse({ text }: { text: string }) {
  const { analyzeTextResponse } = await import('@/lib/ai-scoring')
  const result = analyzeTextResponse(text)

  // Pour une analyse plus précise, on pourrait appeler Claude
  // mais pour le MVP on utilise l'analyse locale
  return NextResponse.json(result)
}

async function scoreProspect({ prospect }: { prospect: Record<string, unknown> }) {
  const { calculateProspectScore } = await import('@/lib/ai-scoring')
  const result = calculateProspectScore(prospect as unknown as Parameters<typeof calculateProspectScore>[0])
  return NextResponse.json(result)
}
