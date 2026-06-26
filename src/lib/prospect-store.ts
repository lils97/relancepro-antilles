// Store de prospects — persistance localStorage (MVP sans base de données)

import type { Prospect, ScoreLabel, PhoneCountry } from '@/types'
import type { ImportedProspect } from './excel-import'

const STORAGE_KEY = 'relancepro_prospects'

export function getProspects(): Prospect[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Prospect[]) : []
  } catch {
    return []
  }
}

export function saveProspects(prospects: Prospect[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prospects))
}

export function addProspects(newProspects: Prospect[]): Prospect[] {
  const current = getProspects()
  // Dédoublonnage par téléphone ou email
  const existing = new Set([
    ...current.map(p => p.phone).filter(Boolean),
    ...current.map(p => p.email?.toLowerCase()).filter(Boolean),
  ])
  const unique = newProspects.filter(p =>
    (!p.phone || !existing.has(p.phone)) &&
    (!p.email || !existing.has(p.email?.toLowerCase()))
  )
  const merged = [...current, ...unique]
  saveProspects(merged)
  return merged
}

export function updateProspect(id: string, updates: Partial<Prospect>): void {
  const prospects = getProspects()
  const idx = prospects.findIndex(p => p.id === id)
  if (idx !== -1) {
    prospects[idx] = { ...prospects[idx], ...updates, updatedAt: new Date().toISOString() }
    saveProspects(prospects)
  }
}

export function deleteProspect(id: string): void {
  saveProspects(getProspects().filter(p => p.id !== id))
}

export function clearProspects(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
}

function scoreToLabel(score: number): ScoreLabel {
  if (score >= 65) return 'HIGH'
  if (score >= 35) return 'MEDIUM'
  return 'LOW'
}

/**
 * Convertir un ImportedProspect (depuis excel-import) en Prospect complet
 */
export function importedToProspect(p: ImportedProspect): Prospect {
  const now = new Date().toISOString()

  // Score heuristique rapide
  let score = 15
  if (p.phone && p.phoneValid) score += 20
  if (p.email) score += 10
  if (p.city) score += 5
  if (p.status === 'CALLBACK') score += 20
  if (p.status === 'INTERESTED') score += 35
  if (p.status === 'APPOINTMENT') score += 45
  if (p.status === 'SIGNED') score = 95
  if (p.budget && p.budget > 0) score += 10
  if (p.comment) score += 5
  score = Math.min(score, 100)

  return {
    id: crypto.randomUUID(),
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
    phoneRaw: p.phoneRaw,
    phoneCountry: (p.phoneCountry as PhoneCountry) || undefined,
    city: p.city,
    postalCode: p.postalCode,
    department: p.department,
    country: p.country ?? 'Martinique',
    category: p.category,
    status: p.status,
    aiScore: score,
    aiScoreLabel: scoreToLabel(score),
    comment: p.comment,
    project: p.project,
    budget: p.budget,
    tags: [],
    consentSms: !!(p.phone && p.phoneValid),
    consentEmail: false,
    createdAt: now,
    updatedAt: now,
  }
}
