// Types centraux RelancePro Antilles

export type ProspectCategory =
  | 'INTERNET_FIBRE'
  | 'PANNEAUX_SOLAIRES'
  | 'ISOLATION_THERMIQUE'
  | 'CLIMATISATION'
  | 'BRASSEURS_AIR'
  | 'OTHER'

export type ProspectStatus =
  | 'NEW'
  | 'TO_CONTACT'
  | 'VOICEMAIL'
  | 'CALLBACK'
  | 'INTERESTED'
  | 'APPOINTMENT'
  | 'QUOTE_SENT'
  | 'WAITING_QUOTE'
  | 'SIGNED'
  | 'LOST'
  | 'STOP'

export type ScoreLabel = 'HIGH' | 'MEDIUM' | 'LOW'
export type MessageChannel = 'SMS' | 'WHATSAPP' | 'EMAIL'
export type MessageTone = 'PROFESSIONAL' | 'COMMERCIAL' | 'FRIENDLY'
export type MessageObjective = 'APPOINTMENT' | 'SALE' | 'FOLLOWUP' | 'REACTIVATION'
export type PhoneCountry = 'MARTINIQUE' | 'GUADELOUPE' | 'FRANCE' | 'OTHER'

export interface Prospect {
  id: string
  firstName?: string
  lastName: string
  email?: string
  phone?: string
  phoneRaw?: string
  phoneCountry?: PhoneCountry
  address?: string
  city?: string
  postalCode?: string
  department?: string
  country: string
  category: ProspectCategory
  status: ProspectStatus
  source?: string
  aiScore: number
  aiScoreLabel: ScoreLabel
  aiScoreDetails?: Record<string, number>
  lastScoreAt?: string
  comment?: string
  project?: string
  budget?: number
  tags: string[]
  consentSms: boolean
  consentEmail: boolean
  consentDate?: string
  assignedToId?: string
  lastContactAt?: string
  nextFollowUpAt?: string
  contractValue?: number
  signedAt?: string
  createdAt: string
  updatedAt: string
  importBatchId?: string
  _count?: {
    activities: number
    messages: number
  }
}

export interface Activity {
  id: string
  type: string
  description: string
  metadata?: Record<string, unknown>
  prospectId: string
  userId?: string
  createdAt: string
  user?: { name?: string; email: string }
}

export interface MessageTemplate {
  id: string
  name: string
  category?: ProspectCategory
  channel: MessageChannel
  subject?: string
  content: string
  variables: string[]
  tone: MessageTone
  objective: MessageObjective
  isActive: boolean
  usageCount: number
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  id: string
  name: string
  channel: MessageChannel
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
  filterCategory?: ProspectCategory
  filterStatus?: ProspectStatus
  filterCity?: string
  filterDepartment?: string
  templateId?: string
  customContent?: string
  subject?: string
  totalTargets: number
  sentCount: number
  deliveredCount: number
  openedCount: number
  repliedCount: number
  failedCount: number
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalProspects: number
  byCategory: Record<ProspectCategory, number>
  byStatus: Record<ProspectStatus, number>
  signedThisMonth: number
  appointmentsToday: number
  responsesReceived: number
  conversionRate: number
  revenueGenerated: number
  highPriorityProspects: number
  weeklyData: Array<{ day: string; contacted: number; responses: number; signed: number }>
  monthlyData: Array<{ month: string; prospects: number; signed: number; revenue: number }>
}

// Labels français
export const CATEGORY_LABELS: Record<ProspectCategory, string> = {
  INTERNET_FIBRE: 'Internet / Fibre',
  PANNEAUX_SOLAIRES: 'Panneaux Solaires',
  ISOLATION_THERMIQUE: 'Isolation Thermique',
  CLIMATISATION: 'Climatisation',
  BRASSEURS_AIR: 'Brasseurs d\'Air',
  OTHER: 'Autres',
}

export const CATEGORY_COLORS: Record<ProspectCategory, string> = {
  INTERNET_FIBRE: '#0ea5e9',
  PANNEAUX_SOLAIRES: '#f59e0b',
  ISOLATION_THERMIQUE: '#10b981',
  CLIMATISATION: '#6366f1',
  BRASSEURS_AIR: '#14b8a6',
  OTHER: '#94a3b8',
}

export const CATEGORY_ICONS: Record<ProspectCategory, string> = {
  INTERNET_FIBRE: '📡',
  PANNEAUX_SOLAIRES: '☀️',
  ISOLATION_THERMIQUE: '🏠',
  CLIMATISATION: '❄️',
  BRASSEURS_AIR: '💨',
  OTHER: '📋',
}

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: 'Nouveau',
  TO_CONTACT: 'À contacter',
  VOICEMAIL: 'Messagerie',
  CALLBACK: 'Rappel',
  INTERESTED: 'Intéressé',
  APPOINTMENT: 'RDV programmé',
  QUOTE_SENT: 'Devis envoyé',
  WAITING_QUOTE: 'Attente devis',
  SIGNED: 'Signé',
  LOST: 'Perdu',
  STOP: 'STOP',
}

export const STATUS_COLORS: Record<ProspectStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  TO_CONTACT: 'bg-purple-50 text-purple-700 border-purple-200',
  VOICEMAIL: 'bg-gray-50 text-gray-600 border-gray-200',
  CALLBACK: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  INTERESTED: 'bg-orange-50 text-orange-700 border-orange-200',
  APPOINTMENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  QUOTE_SENT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  WAITING_QUOTE: 'bg-teal-50 text-teal-700 border-teal-200',
  SIGNED: 'bg-green-50 text-green-700 border-green-200',
  LOST: 'bg-red-50 text-red-600 border-red-200',
  STOP: 'bg-gray-100 text-gray-500 border-gray-300',
}
