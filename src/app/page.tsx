'use client'

import { useState, useEffect, useMemo } from 'react'
import Header from '@/components/layout/Header'
import {
  Users, TrendingUp, CalendarCheck, MessageSquare,
  Euro, Flame, Target, ArrowUpRight, ArrowDownRight,
  Sun, Wifi, Thermometer, AirVent, Wind, MoreHorizontal,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS } from '@/types'
import type { Prospect, ProspectCategory, ProspectStatus } from '@/types'
import { formatCurrency, formatRelativeTime, getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const STATUSES_PIPELINE: ProspectStatus[] = ['NEW', 'TO_CONTACT', 'CALLBACK', 'INTERESTED', 'APPOINTMENT', 'QUOTE_SENT', 'SIGNED']

export default function DashboardPage() {
  const [allProspects, setAllProspects] = useState<Prospect[]>([])

  useEffect(() => {
    import('@/lib/prospect-store').then(({ getProspects }) => {
      setAllProspects(getProspects())
    })
  }, [])

  const stats = useMemo(() => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const byCategory = {} as Record<ProspectCategory, number>
    const byStatus = {} as Record<ProspectStatus, number>
    ;(['INTERNET_FIBRE', 'PANNEAUX_SOLAIRES', 'ISOLATION_THERMIQUE', 'CLIMATISATION', 'BRASSEURS_AIR', 'OTHER'] as ProspectCategory[])
      .forEach(k => { byCategory[k] = 0 })
    ;(['NEW', 'TO_CONTACT', 'VOICEMAIL', 'CALLBACK', 'INTERESTED', 'APPOINTMENT', 'QUOTE_SENT', 'WAITING_QUOTE', 'SIGNED', 'LOST', 'STOP'] as ProspectStatus[])
      .forEach(k => { byStatus[k] = 0 })

    let signedThisMonth = 0
    let revenueGenerated = 0

    for (const p of allProspects) {
      if (byCategory[p.category] !== undefined) byCategory[p.category]++
      if (byStatus[p.status] !== undefined) byStatus[p.status]++
      if (p.status === 'SIGNED' && p.signedAt && new Date(p.signedAt) >= startOfMonth) {
        signedThisMonth++
        revenueGenerated += p.contractValue ?? 0
      }
    }

    const signed = allProspects.filter(p => p.status === 'SIGNED').length
    const conversionRate = allProspects.length > 0
      ? Math.round((signed / allProspects.length) * 100)
      : 0

    // Activité des 7 derniers jours par jour de semaine
    const weeklyData = DAYS_FR.map((day, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayStr = date.toISOString().split('T')[0]
      const contacted = allProspects.filter(p =>
        p.lastContactAt && p.lastContactAt.startsWith(dayStr)
      ).length
      const signedDay = allProspects.filter(p =>
        p.status === 'SIGNED' && p.signedAt && p.signedAt.startsWith(dayStr)
      ).length
      return { day, contacted, responses: 0, signed: signedDay }
    })

    return { totalProspects: allProspects.length, byCategory, byStatus, signedThisMonth, revenueGenerated, conversionRate, weeklyData }
  }, [allProspects])

  const kpiCards = [
    { label: 'Total Prospects', value: stats.totalProspects.toString(), icon: Users, color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100', sub: 'importés' },
    { label: 'Signés ce mois', value: stats.signedThisMonth.toString(), icon: TrendingUp, color: 'bg-green-50 text-green-600', iconBg: 'bg-green-100', sub: 'ce mois' },
    { label: 'À rappeler', value: (stats.byStatus['CALLBACK'] ?? 0).toString(), icon: CalendarCheck, color: 'bg-purple-50 text-purple-600', iconBg: 'bg-purple-100', sub: 'en attente' },
    { label: 'Intéressés', value: (stats.byStatus['INTERESTED'] ?? 0).toString(), icon: MessageSquare, color: 'bg-orange-50 text-orange-600', iconBg: 'bg-orange-100', sub: 'chauds' },
    { label: 'Taux conversion', value: `${stats.conversionRate}%`, icon: Target, color: 'bg-cyan-50 text-cyan-600', iconBg: 'bg-cyan-100', sub: 'total' },
    { label: 'CA généré', value: formatCurrency(stats.revenueGenerated), icon: Euro, color: 'bg-emerald-50 text-emerald-600', iconBg: 'bg-emerald-100', sub: 'signé' },
  ]

  const categoryData = Object.entries(stats.byCategory)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: CATEGORY_LABELS[key as ProspectCategory],
      value,
      color: CATEGORY_COLORS[key as ProspectCategory],
    }))

  const priorityProspects = allProspects
    .filter(p => p.aiScoreLabel === 'HIGH' && !['SIGNED', 'LOST', 'STOP'].includes(p.status))
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 5)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Tableau de bord"
        subtitle={`Bonjour 👋 — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', card.iconBg)}>
                    <Icon className={cn('w-4 h-4', card.color.split(' ')[1])} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                  <p className="text-xs text-gray-400">{card.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activité commerciale */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-gray-900">Activité commerciale</h3>
                <p className="text-sm text-gray-500">7 derniers jours</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.weeklyData.map(d => ({ name: d.day, Contactés: d.contacted, Signés: d.signed }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorContactes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReponses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="Contactés" stroke="#0ea5e9" fill="url(#colorContactes)" strokeWidth={2} />
                <Area type="monotone" dataKey="Signés" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition par activité */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="mb-5">
              <h3 className="font-semibold text-gray-900">Par activité</h3>
              <p className="text-sm text-gray-500">Répartition des prospects</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(value) => [value, '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prospects prioritaires */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  Prospects prioritaires
                </h3>
                <p className="text-sm text-gray-500">Score IA élevé — à contacter en premier</p>
              </div>
              <Link href="/prospects?score=HIGH" className="text-xs text-brand-600 font-medium hover:text-brand-700">
                Voir tous →
              </Link>
            </div>
            <div className="space-y-3">
              {priorityProspects.map((prospect) => (
                <Link
                  key={prospect.id}
                  href={`/prospects/${prospect.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-tropical-teal rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {getInitials(prospect.firstName, prospect.lastName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {prospect.firstName} {prospect.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{prospect.city} • {CATEGORY_LABELS[prospect.category]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('status-badge', STATUS_COLORS[prospect.status])}>
                      {STATUS_LABELS[prospect.status]}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-red-500 h-1.5 rounded-full"
                          style={{ width: `${prospect.aiScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{prospect.aiScore}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Statuts pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Pipeline commercial</h3>
                <p className="text-sm text-gray-500">Répartition par statut</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={STATUSES_PIPELINE.map(key => ({
                  name: STATUS_LABELS[key].split(' ')[0],
                  value: stats.byStatus[key] ?? 0,
                }))}
                margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
