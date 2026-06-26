import type { Prospect, DashboardStats } from '@/types'

// Aucun prospect de démonstration — données réelles uniquement
export const MOCK_PROSPECTS: Prospect[] = []

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalProspects: 0,
  byCategory: {
    INTERNET_FIBRE: 0,
    PANNEAUX_SOLAIRES: 0,
    ISOLATION_THERMIQUE: 0,
    CLIMATISATION: 0,
    BRASSEURS_AIR: 0,
    OTHER: 0,
  },
  byStatus: {
    NEW: 0,
    TO_CONTACT: 0,
    VOICEMAIL: 0,
    CALLBACK: 0,
    INTERESTED: 0,
    APPOINTMENT: 0,
    QUOTE_SENT: 0,
    WAITING_QUOTE: 0,
    SIGNED: 0,
    LOST: 0,
    STOP: 0,
  },
  signedThisMonth: 0,
  appointmentsToday: 0,
  responsesReceived: 0,
  conversionRate: 0,
  revenueGenerated: 0,
  highPriorityProspects: 0,
  weeklyData: [
    { day: 'Lun', contacted: 0, responses: 0, signed: 0 },
    { day: 'Mar', contacted: 0, responses: 0, signed: 0 },
    { day: 'Mer', contacted: 0, responses: 0, signed: 0 },
    { day: 'Jeu', contacted: 0, responses: 0, signed: 0 },
    { day: 'Ven', contacted: 0, responses: 0, signed: 0 },
    { day: 'Sam', contacted: 0, responses: 0, signed: 0 },
    { day: 'Dim', contacted: 0, responses: 0, signed: 0 },
  ],
  monthlyData: [],
}
