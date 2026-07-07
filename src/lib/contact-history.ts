// Historique d'envoi par prospect et canal
// Stocké dans localStorage — persiste entre sessions

export type ContactChannel = 'EMAIL' | 'SMS' | 'WHATSAPP'

export interface ContactSend {
  sentAt: string   // ISO date du dernier envoi
  count: number    // nombre total d'envois sur ce canal
}

export type ContactRecord = Partial<Record<ContactChannel, ContactSend>>

const STORAGE_KEY = 'relancepro_contact_history'

function loadHistory(): Record<string, ContactRecord> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveHistory(history: Record<string, ContactRecord>): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)) } catch {}
}

/** Enregistre un envoi réussi pour un prospect */
export function recordContact(prospectId: string, channel: ContactChannel): void {
  const history = loadHistory()
  if (!history[prospectId]) history[prospectId] = {}
  const existing = history[prospectId][channel]
  history[prospectId][channel] = {
    sentAt: new Date().toISOString(),
    count: (existing?.count ?? 0) + 1,
  }
  saveHistory(history)
}

/** Enregistre plusieurs envois en une fois (après une campagne) */
export function recordContacts(prospectIds: string[], channel: ContactChannel): void {
  const history = loadHistory()
  for (const id of prospectIds) {
    if (!history[id]) history[id] = {}
    const existing = history[id][channel]
    history[id][channel] = {
      sentAt: new Date().toISOString(),
      count: (existing?.count ?? 0) + 1,
    }
  }
  saveHistory(history)
}

/** Vérifie si un prospect a déjà été contacté sur un canal donné */
export function hasBeenContacted(prospectId: string, channel: ContactChannel): boolean {
  const history = loadHistory()
  return !!(history[prospectId]?.[channel])
}

/** Retourne l'historique complet d'un prospect */
export function getContactRecord(prospectId: string): ContactRecord {
  const history = loadHistory()
  return history[prospectId] ?? {}
}

/** Retourne tous les IDs de prospects déjà contactés sur un canal */
export function getContactedIds(channel: ContactChannel): Set<string> {
  const history = loadHistory()
  const ids = new Set<string>()
  for (const [id, record] of Object.entries(history)) {
    if (record[channel]) ids.add(id)
  }
  return ids
}

/** Réinitialise l'historique d'un prospect (pour pouvoir le recontacter) */
export function resetContactHistory(prospectId: string, channel?: ContactChannel): void {
  const history = loadHistory()
  if (!history[prospectId]) return
  if (channel) {
    delete history[prospectId][channel]
  } else {
    delete history[prospectId]
  }
  saveHistory(history)
}
