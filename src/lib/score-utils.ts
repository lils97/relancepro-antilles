// Calcul dynamique du Score IA — partagé entre la liste et la page détail

import type { Prospect, ScoreLabel } from '@/types'
import type { Activity } from './activity-store'

const STATUS_SCORES: Record<string, number> = {
  NEW: 5, TO_CONTACT: 8, CALLBACK: 14, INTERESTED: 20,
  APPOINTMENT: 18, SIGNED: 20, LOST: 0,
}

export function computeAiScore(prospect: Prospect, activities: Activity[]): number {
  // Réactivité (max 25)
  const reactScore = (prospect.phone ? 12 : 0) + (prospect.email ? 8 : 0)
    + (prospect.consentSms ? 3 : 0) + (prospect.consentEmail ? 2 : 0)
  const reactTotal = Math.min(reactScore, 25)

  // Intérêt projet (max 20)
  const interestScore = STATUS_SCORES[prospect.status] ?? 5
  const interestTotal = Math.min(
    interestScore + (prospect.project ? 5 : 0) + (prospect.budget ? 5 : 0),
    20,
  )

  // Localisation (max 15)
  const locTotal = (prospect.city ? 8 : 0) + (prospect.postalCode ? 4 : 0) + (prospect.country ? 3 : 0)

  // Interactions (max 20)
  const emailsSent = activities.filter(a => a.type === 'EMAIL_SENT').length
  const emailsRecv = activities.filter(a => a.type === 'EMAIL_RECEIVED').length
  const smsSent   = activities.filter(a => a.type === 'SMS_SENT').length
  const waSent    = activities.filter(a => a.type === 'WHATSAPP_SENT').length
  const interactTotal = Math.min(emailsSent * 3 + emailsRecv * 5 + smsSent * 2 + waSent * 2, 20)

  // Historique (max 20)
  const histTotal = Math.min(activities.length * 3 + (emailsRecv > 0 ? 8 : 0), 20)

  return reactTotal + histTotal + interestTotal + locTotal + interactTotal
}

export function scoreToLabel(score: number): ScoreLabel {
  if (score >= 65) return 'HIGH'
  if (score >= 35) return 'MEDIUM'
  return 'LOW'
}
