'use client'

import { useState, useEffect, useMemo } from 'react'
import Header from '@/components/layout/Header'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Users, Mail, MessageSquare, CheckCircle, Euro } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Prospect } from '@/types'
import type { Activity } from '@/lib/activity-store'
import { computeAiScore } from '@/lib/score-utils'

const CATEGORY_LABELS: Record<string, string> = {
  PANNEAUX_SOLAIRES: 'Solaire', INTERNET_FIBRE: 'Fibre',
  ISOLATION_THERMIQUE: 'Isolation', CLIMATISATION: 'Clim', BRASSEURS_AIR: 'Brasseurs', OTHER: 'Autre',
}
const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau', TO_CONTACT: 'À contacter', VOICEMAIL: 'Messagerie', CALLBACK: 'Rappel',
  INTERESTED: 'Intéressé', APPOINTMENT: 'RDV', QUOTE_SENT: 'Devis', WAITING_QUOTE: 'Attente',
  SIGNED: 'Signé', LOST: 'Perdu', STOP: 'STOP',
}
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#ef4444', '#64748b', '#a3e635']

const PERIODS = ['7 jours', '30 jours', '90 jours', 'Tout']

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [period, setPeriod] = useState('30 jours')

  useEffect(() => {
    import('@/lib/prospect-store').then(({ getProspects }) => setProspects(getProspects()))
    import('@/lib/activity-store').then(({ getActivities }) => setActivities(getActivities()))
  }, [])

  const cutoff = useMemo(() => {
    const d = new Date()
    if (period === '7 jours')  d.setDate(d.getDate() - 7)
    if (period === '30 jours') d.setDate(d.getDate() - 30)
    if (period === '90 jours') d.setDate(d.getDate() - 90)
    if (period === 'Tout')     return new Date(0)
    return d
  }, [period])

  const filteredActivities = useMemo(() =>
    activities.filter(a => new Date(a.createdAt) >= cutoff),
    [activities, cutoff]
  )

  const stats = useMemo(() => {
    const signed = prospects.filter(p => p.status === 'SIGNED')
    const revenue = signed.reduce((s, p) => s + (p.contractValue ?? 0), 0)
    const convRate = prospects.length > 0 ? Math.round((signed.length / prospects.length) * 100) : 0

    // Par catégorie
    const byCategory: Record<string, number> = {}
    for (const p of prospects) {
      byCategory[p.category] = (byCategory[p.category] ?? 0) + 1
    }

    // Par statut
    const byStatus: Record<string, number> = {}
    for (const p of prospects) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
    }

    // Activité par canal
    const byType: Record<string, number> = {}
    for (const a of filteredActivities) {
      byType[a.type] = (byType[a.type] ?? 0) + 1
    }

    // Activité par jour (14 derniers jours)
    const byDay: Record<string, { emails: number; sms: number; wa: number }> = {}
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      byDay[key] = { emails: 0, sms: 0, wa: 0 }
    }
    for (const a of activities) {
      const d = new Date(a.createdAt)
      const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000)
      if (daysAgo > 13) continue
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      if (!byDay[key]) continue
      if (a.type === 'EMAIL_SENT')     byDay[key].emails++
      if (a.type === 'SMS_SENT')       byDay[key].sms++
      if (a.type === 'WHATSAPP_SENT')  byDay[key].wa++
    }

    // Top prospects (score dynamique)
    const topProspects = prospects
      .map(p => ({
        p,
        score: computeAiScore(p, activities.filter(a => a.prospectId === p.id)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return { signed, revenue, convRate, byCategory, byStatus, byType, byDay, topProspects }
  }, [prospects, activities, filteredActivities])

  const categoryData = Object.entries(stats.byCategory).map(([k, v]) => ({
    name: CATEGORY_LABELS[k] ?? k, value: v,
  }))

  const statusData = Object.entries(stats.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value)

  const activityData = Object.entries(stats.byDay).map(([date, v]) => ({
    date, ...v,
  }))

  const channelData = [
    { name: 'Emails', value: stats.byType['EMAIL_SENT'] ?? 0, color: '#8b5cf6' },
    { name: 'SMS', value: stats.byType['SMS_SENT'] ?? 0, color: '#3b82f6' },
    { name: 'WhatsApp', value: stats.byType['WHATSAPP_SENT'] ?? 0, color: '#10b981' },
    { name: 'Réponses', value: stats.byType['EMAIL_RECEIVED'] ?? 0, color: '#f59e0b' },
    { name: 'Appels', value: stats.byType['CALL_OUTGOING'] ?? 0, color: '#6366f1' },
  ].filter(d => d.value > 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Analytiques" subtitle="Vue d'ensemble de votre activité commerciale" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Période */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Période :</span>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                period === p ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}>
              {p}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total prospects" value={prospects.length} icon={Users} color="bg-brand-500" />
          <StatCard label="Taux de conversion" value={`${stats.convRate}%`} sub={`${stats.signed.length} signés`} icon={TrendingUp} color="bg-green-500" />
          <StatCard label="Revenus générés" value={formatCurrency(stats.revenue)} icon={Euro} color="bg-amber-500" />
          <StatCard
            label="Messages envoyés"
            value={(stats.byType['EMAIL_SENT'] ?? 0) + (stats.byType['SMS_SENT'] ?? 0) + (stats.byType['WHATSAPP_SENT'] ?? 0)}
            sub={`période sélectionnée`}
            icon={MessageSquare}
            color="bg-indigo-500"
          />
        </div>

        {/* Graphiques ligne 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activité quotidienne */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Activité des 14 derniers jours</h3>
            {activities.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune activité enregistrée</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="emails" name="Emails" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sms" name="SMS" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="wa" name="WhatsApp" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Répartition par statut */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Répartition par statut</h3>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucun prospect</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Prospects" radius={[0, 4, 4, 0]}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graphiques ligne 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition par catégorie */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Prospects par secteur</h3>
            {categoryData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucun prospect</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {categoryData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600">{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canaux de communication */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Communications ({period})</h3>
            {channelData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune communication sur la période</div>
            ) : (
              <div className="space-y-3">
                {channelData.map(d => {
                  const total = channelData.reduce((s, x) => s + x.value, 0)
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{d.name}</span>
                        <span className="text-sm font-semibold text-gray-900">{d.value}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${(d.value / total) * 100}%`, background: d.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top prospects */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top 5 prospects (Score IA)</h3>
          {stats.topProspects.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Aucun prospect</div>
          ) : (
            <div className="space-y-2">
              {stats.topProspects.map(({ p, score }, i) => (
                <a key={p.id} href={`/prospects/${p.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-400">{p.city} · {CATEGORY_LABELS[p.category] ?? p.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      p.status === 'SIGNED' && 'bg-green-100 text-green-700',
                      p.status === 'INTERESTED' && 'bg-amber-100 text-amber-700',
                      p.status === 'APPOINTMENT' && 'bg-indigo-100 text-indigo-700',
                    )}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    <div className={cn('flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full',
                      score >= 65 && 'bg-red-50 text-red-600',
                      score >= 35 && score < 65 && 'bg-orange-50 text-orange-600',
                      score < 35 && 'bg-green-50 text-green-600',
                    )}>
                      {score >= 65 ? '🔥' : score >= 35 ? '🟠' : '🟢'} {score}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Efficacité conversions */}
        {prospects.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Prospects actifs', value: prospects.filter(p => !['LOST', 'STOP', 'SIGNED'].includes(p.status)).length, color: 'text-brand-600' },
              { label: 'En cours de signature', value: prospects.filter(p => ['QUOTE_SENT', 'WAITING_QUOTE', 'APPOINTMENT'].includes(p.status)).length, color: 'text-amber-600' },
              { label: 'Perdus / STOP', value: prospects.filter(p => ['LOST', 'STOP'].includes(p.status)).length, color: 'text-red-500' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <p className={cn('text-3xl font-bold', item.color)}>{item.value}</p>
                <p className="text-sm text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
