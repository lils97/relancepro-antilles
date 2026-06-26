// Store d'activités — localStorage

export type ActivityType =
  | 'EMAIL_SENT'
  | 'EMAIL_RECEIVED'
  | 'CALL_OUTGOING'
  | 'NOTE_ADDED'
  | 'STATUS_CHANGED'
  | 'SMS_SENT'
  | 'WHATSAPP_SENT'

export interface Activity {
  id: string
  prospectId: string
  type: ActivityType
  subject?: string
  content: string
  createdAt: string
  // Pour les emails reçus — contenu brut de la réponse client
  fromEmail?: string
  fromName?: string
}

const STORAGE_KEY = 'relancepro_activities'

export function getActivities(): Activity[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export function getActivitiesForProspect(prospectId: string): Activity[] {
  return getActivities()
    .filter(a => a.prospectId === prospectId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function addActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Activity {
  const all = getActivities()
  const newActivity: Activity = {
    ...activity,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  all.push(newActivity)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)) } catch {}
  return newActivity
}

export function deleteActivity(id: string): void {
  const all = getActivities().filter(a => a.id !== id)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)) } catch {}
}

export function clearActivitiesForProspect(prospectId: string): void {
  const all = getActivities().filter(a => a.prospectId !== prospectId)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)) } catch {}
}
