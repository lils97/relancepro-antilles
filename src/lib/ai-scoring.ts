// Moteur de scoring IA des prospects
// Score 0-100 basé sur réactivité, historique, projet, localisation, interactions

import type { Prospect, ScoreLabel } from '@/types'

interface ScoringFactors {
  reactivity: number      // 0-25 : réponse rapide aux messages
  history: number         // 0-20 : historique d'interactions
  project: number         // 0-20 : intérêt pour le projet
  location: number        // 0-15 : localisation (zones prioritaires)
  interactions: number    // 0-20 : nombre et qualité des interactions
}

/**
 * Calculer le score IA d'un prospect
 */
export function calculateProspectScore(prospect: Prospect): {
  score: number
  label: ScoreLabel
  factors: ScoringFactors
  explanation: string[]
} {
  const factors: ScoringFactors = {
    reactivity: 0,
    history: 0,
    project: 0,
    location: 0,
    interactions: 0,
  }
  const explanation: string[] = []

  // ========================================
  // 1. RÉACTIVITÉ (0-25)
  // ========================================
  if (prospect.status === 'INTERESTED') {
    factors.reactivity = 25
    explanation.push('✅ Prospect intéressé (+25)')
  } else if (prospect.status === 'APPOINTMENT') {
    factors.reactivity = 22
    explanation.push('📅 RDV programmé (+22)')
  } else if (prospect.status === 'CALLBACK') {
    factors.reactivity = 15
    explanation.push('📞 Demande de rappel (+15)')
  } else if (prospect.status === 'QUOTE_SENT' || prospect.status === 'WAITING_QUOTE') {
    factors.reactivity = 20
    explanation.push('📄 Phase devis (+20)')
  } else if (prospect.status === 'VOICEMAIL') {
    factors.reactivity = 5
    explanation.push('📱 Messagerie uniquement (+5)')
  } else if (prospect.status === 'NEW' || prospect.status === 'TO_CONTACT') {
    factors.reactivity = 8
    explanation.push('🆕 Nouveau prospect (+8)')
  } else if (prospect.status === 'LOST' || prospect.status === 'STOP') {
    factors.reactivity = 0
    explanation.push('❌ Prospect fermé (0)')
  }

  // ========================================
  // 2. HISTORIQUE (0-20)
  // ========================================
  if (prospect.lastContactAt) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(prospect.lastContactAt).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceContact <= 1) {
      factors.history = 20
      explanation.push('🔥 Contact très récent (+20)')
    } else if (daysSinceContact <= 3) {
      factors.history = 15
      explanation.push('⚡ Contact récent (+15)')
    } else if (daysSinceContact <= 7) {
      factors.history = 10
      explanation.push('📆 Contact cette semaine (+10)')
    } else if (daysSinceContact <= 30) {
      factors.history = 5
      explanation.push('🗓 Contact ce mois (+5)')
    } else {
      factors.history = 0
      explanation.push('⏰ Contact ancien (0)')
    }
  } else {
    factors.history = 10 // Nouveau prospect, première fois
    explanation.push('🆕 Jamais contacté (+10)')
  }

  // ========================================
  // 3. INTÉRÊT POUR LE PROJET (0-20)
  // ========================================
  if (prospect.budget && prospect.budget > 0) {
    const budgetScore = Math.min(20, Math.floor(prospect.budget / 1000) * 2)
    factors.project = budgetScore
    explanation.push(`💰 Budget indiqué: ${prospect.budget}€ (+${budgetScore})`)
  } else if (prospect.project) {
    factors.project = 12
    explanation.push('🎯 Projet défini (+12)')
  } else if (prospect.category !== 'OTHER') {
    factors.project = 8
    explanation.push('📂 Catégorie identifiée (+8)')
  } else {
    factors.project = 3
    explanation.push('❓ Projet non défini (+3)')
  }

  // ========================================
  // 4. LOCALISATION (0-15)
  // ========================================
  if (prospect.phone) {
    if (prospect.phoneCountry === 'MARTINIQUE') {
      factors.location = 15
      explanation.push('📍 Martinique (+15)')
    } else if (prospect.phoneCountry === 'GUADELOUPE') {
      factors.location = 12
      explanation.push('📍 Guadeloupe (+12)')
    } else if (prospect.phoneCountry === 'FRANCE') {
      factors.location = 8
      explanation.push('📍 France métropolitaine (+8)')
    } else {
      factors.location = 5
      explanation.push('📍 Localisation autre (+5)')
    }
  } else if (prospect.city) {
    factors.location = 10
    explanation.push(`📍 Ville connue: ${prospect.city} (+10)`)
  } else {
    factors.location = 3
    explanation.push('📍 Localisation inconnue (+3)')
  }

  // ========================================
  // 5. INTERACTIONS (0-20)
  // ========================================
  const count = prospect._count?.activities ?? 0
  if (count >= 10) {
    factors.interactions = 20
    explanation.push(`💬 Très actif: ${count} interactions (+20)`)
  } else if (count >= 5) {
    factors.interactions = 14
    explanation.push(`💬 Actif: ${count} interactions (+14)`)
  } else if (count >= 2) {
    factors.interactions = 8
    explanation.push(`💬 ${count} interactions (+8)`)
  } else if (count === 1) {
    factors.interactions = 4
    explanation.push('💬 1 interaction (+4)')
  } else {
    factors.interactions = 2
    explanation.push('💬 Aucune interaction (+2)')
  }

  // Score total
  const score = Math.min(100, Math.max(0,
    factors.reactivity +
    factors.history +
    factors.project +
    factors.location +
    factors.interactions
  ))

  // Label
  let label: ScoreLabel
  if (score >= 70) label = 'HIGH'
  else if (score >= 40) label = 'MEDIUM'
  else label = 'LOW'

  return { score, label, factors, explanation }
}

/**
 * Formater le label de score avec emoji
 */
export function formatScoreLabel(label: ScoreLabel): string {
  switch (label) {
    case 'HIGH': return '🔥 Priorité haute'
    case 'MEDIUM': return '🟠 Priorité moyenne'
    case 'LOW': return '🟢 Priorité faible'
  }
}

/**
 * Analyser une réponse texte et détecter le sentiment/intention
 */
export function analyzeTextResponse(text: string): {
  intent: 'INTERESTED' | 'CALLBACK' | 'LOST' | 'STOP' | 'NEUTRAL'
  suggestedStatus?: string
  confidence: number
  reason: string
} {
  const lower = text.toLowerCase().trim()

  // STOP
  const stopKeywords = ['stop', 'arrêt', 'ne plus', 'pas intéressé', 'aucun intérêt', 'supprimez', 'désabonner', 'désabonnement']
  if (stopKeywords.some(k => lower.includes(k))) {
    return { intent: 'STOP', suggestedStatus: 'STOP', confidence: 95, reason: 'Demande explicite d\'arrêt' }
  }

  // PERDU
  const lostKeywords = ['non merci', 'pas pour moi', 'je ne veux pas', 'plus intéressé', 'déjà fait', 'pas de budget', 'pas maintenant', 'laissez-moi']
  if (lostKeywords.some(k => lower.includes(k))) {
    return { intent: 'LOST', suggestedStatus: 'LOST', confidence: 85, reason: 'Refus ou désintérêt exprimé' }
  }

  // INTÉRESSÉ
  const interestedKeywords = ['oui', 'je suis intéressé', 'ça m\'intéresse', 'dites m\'en plus', 'volontiers', 'bien sûr', 'pourquoi pas', 'avec plaisir', 'ok', 'd\'accord']
  if (interestedKeywords.some(k => lower.includes(k))) {
    return { intent: 'INTERESTED', suggestedStatus: 'INTERESTED', confidence: 90, reason: 'Intérêt exprimé positivement' }
  }

  // RAPPEL
  const callbackKeywords = ['rappeler', 'appelez', 'contactez', 'demain', 'cette semaine', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'plus tard', 'dans quelques']
  if (callbackKeywords.some(k => lower.includes(k))) {
    return { intent: 'CALLBACK', suggestedStatus: 'CALLBACK', confidence: 80, reason: 'Demande de rappel ou rendez-vous' }
  }

  return { intent: 'NEUTRAL', confidence: 50, reason: 'Réponse neutre ou ambiguë' }
}
