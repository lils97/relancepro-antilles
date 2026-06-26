'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import {
  Search, Filter, Download, Upload, Plus,
  MoreHorizontal, Phone, Mail, MapPin, Users,
} from 'lucide-react'
import {
  CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS, STATUS_COLORS,
  type Prospect, type ProspectStatus, type ProspectCategory, type ScoreLabel,
} from '@/types'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'
import { formatPhoneDisplay } from '@/lib/phone-utils'
import { computeAiScore, scoreToLabel } from '@/lib/score-utils'
import type { Activity } from '@/lib/activity-store'
import Link from 'next/link'

const STATUS_OPTIONS: ProspectStatus[] = [
  'NEW', 'TO_CONTACT', 'VOICEMAIL', 'CALLBACK', 'INTERESTED',
  'APPOINTMENT', 'QUOTE_SENT', 'WAITING_QUOTE', 'SIGNED', 'LOST', 'STOP',
]

const CATEGORY_OPTIONS: ProspectCategory[] = [
  'INTERNET_FIBRE', 'PANNEAUX_SOLAIRES', 'ISOLATION_THERMIQUE',
  'CLIMATISATION', 'BRASSEURS_AIR', 'OTHER',
]

function ScoreBadge({ score, label }: { score: number; label: ScoreLabel }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold',
      label === 'HIGH' && 'bg-red-50 text-red-700',
      label === 'MEDIUM' && 'bg-orange-50 text-orange-700',
      label === 'LOW' && 'bg-green-50 text-green-700',
    )}>
      {label === 'HIGH' && '🔥'}
      {label === 'MEDIUM' && '🟠'}
      {label === 'LOW' && '🟢'}
      {score}
    </div>
  )
}

function ProspectRow({ prospect, activities }: { prospect: Prospect; activities: Activity[] }) {
  const dynamicScore = computeAiScore(prospect, activities)
  const dynamicLabel = scoreToLabel(dynamicScore)
  return (
    <tr className="table-row-hover group">
      <td className="px-4 py-3">
        <input type="checkbox" className="rounded" />
      </td>
      <td className="px-4 py-3">
        <Link href={`/prospects/${prospect.id}`} className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-tropical-teal rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(prospect.firstName, prospect.lastName)}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {prospect.firstName} {prospect.lastName}
            </p>
            {prospect.city && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {prospect.city}
              </p>
            )}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          {prospect.phone && (
            <p className="text-gray-700 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-gray-400" />
              <span className="text-xs">{formatPhoneDisplay(prospect.phone)}</span>
            </p>
          )}
          {prospect.email && (
            <p className="text-gray-500 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-gray-400" />
              <span className="text-xs truncate max-w-[160px]">{prospect.email}</span>
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">
          {CATEGORY_ICONS[prospect.category]} {CATEGORY_LABELS[prospect.category]}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn('status-badge', STATUS_COLORS[prospect.status])}>
          {STATUS_LABELS[prospect.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        <ScoreBadge score={dynamicScore} label={dynamicLabel} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {formatRelativeTime(prospect.lastContactAt)}
      </td>
      <td className="px-4 py-3">
        <button className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 transition-all">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

function ProspectsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<ProspectStatus[]>([])
  const [selectedCategories, setSelectedCategories] = useState<ProspectCategory[]>(() => {
    // Lire le filtre catégorie depuis l'URL (?cat=PANNEAUX_SOLAIRES)
    if (typeof window !== 'undefined') {
      const cat = new URLSearchParams(window.location.search).get('cat')
      return cat ? [cat as ProspectCategory] : []
    }
    return []
  })
  const [selectedScore, setSelectedScore] = useState<ScoreLabel | ''>('')
  const [sortBy, setSortBy] = useState<'aiScore' | 'lastName' | 'createdAt' | 'lastContactAt'>('aiScore')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    import('@/lib/prospect-store').then(({ getProspects }) => {
      setProspects(getProspects())
    })
    import('@/lib/activity-store').then(({ getActivities }) => {
      setAllActivities(getActivities())
    })
  }, [])

  // Synchroniser le filtre catégorie quand l'URL change
  useEffect(() => {
    const cat = searchParams.get('cat')
    if (cat) {
      setSelectedCategories([cat as ProspectCategory])
      setShowFilters(true)
    }
  }, [searchParams])

  // Index des activités par prospectId pour lookup O(1)
  const activitiesByProspect = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const a of allActivities) {
      if (!map.has(a.prospectId)) map.set(a.prospectId, [])
      map.get(a.prospectId)!.push(a)
    }
    return map
  }, [allActivities])

  const filtered = useMemo(() => {
    let list = [...prospects]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.lastName.toLowerCase().includes(q) ||
        (p.firstName?.toLowerCase().includes(q)) ||
        (p.city?.toLowerCase().includes(q)) ||
        (p.phone?.includes(q)) ||
        (p.email?.toLowerCase().includes(q)) ||
        (p.project?.toLowerCase().includes(q))
      )
    }

    if (selectedStatuses.length > 0) {
      list = list.filter(p => selectedStatuses.includes(p.status))
    }
    if (selectedCategories.length > 0) {
      list = list.filter(p => selectedCategories.includes(p.category))
    }
    if (selectedScore) {
      list = list.filter(p => {
        const score = computeAiScore(p, activitiesByProspect.get(p.id) ?? [])
        return scoreToLabel(score) === selectedScore
      })
    }

    list.sort((a, b) => {
      let valA: string | number = 0, valB: string | number = 0
      if (sortBy === 'aiScore') {
        valA = computeAiScore(a, activitiesByProspect.get(a.id) ?? [])
        valB = computeAiScore(b, activitiesByProspect.get(b.id) ?? [])
      }
      else if (sortBy === 'lastName') { valA = a.lastName; valB = b.lastName }
      else if (sortBy === 'createdAt') { valA = a.createdAt; valB = b.createdAt }
      else if (sortBy === 'lastContactAt') {
        valA = a.lastContactAt ?? ''; valB = b.lastContactAt ?? ''
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [prospects, allActivities, activitiesByProspect, search, selectedStatuses, selectedCategories, selectedScore, sortBy, sortDir])

  const toggleStatus = (s: ProspectStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  const toggleCategory = (c: ProspectCategory) => {
    setSelectedCategories(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Prospects" subtitle={`${filtered.length} prospect${filtered.length > 1 ? 's' : ''} • ${prospects.length} au total`} />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nom, téléphone, ville, email..."
              className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder:text-gray-400"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {(selectedStatuses.length + selectedCategories.length + (selectedScore ? 1 : 0)) > 0 && (
              <span className="bg-brand-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {selectedStatuses.length + selectedCategories.length + (selectedScore ? 1 : 0)}
              </span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="bg-gray-100 text-sm rounded-lg px-3 py-2 text-gray-600 outline-none cursor-pointer"
          >
            <option value="aiScore">Score IA</option>
            <option value="lastName">Nom</option>
            <option value="createdAt">Date d'ajout</option>
            <option value="lastContactAt">Dernier contact</option>
          </select>

          <div className="flex-1" />

          <Link
            href="/import"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importer
          </Link>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <Link
            href="/prospects/new"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau
          </Link>
        </div>

        {/* Filtres panel */}
        {showFilters && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 animate-fade-in">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Statut</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={cn(
                        'status-badge cursor-pointer transition-all',
                        selectedStatuses.includes(s)
                          ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-brand-500'
                          : 'bg-white text-gray-500 border border-gray-300 hover:border-gray-400'
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activité</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleCategory(c)}
                      className={cn(
                        'status-badge cursor-pointer transition-all',
                        selectedCategories.includes(c)
                          ? 'bg-brand-100 text-brand-700 border border-brand-300'
                          : 'bg-white text-gray-500 border border-gray-300 hover:border-gray-400'
                      )}
                    >
                      {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priorité IA</p>
                <div className="flex gap-1.5">
                  {(['HIGH', 'MEDIUM', 'LOW'] as ScoreLabel[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedScore(selectedScore === s ? '' : s)}
                      className={cn(
                        'status-badge cursor-pointer',
                        selectedScore === s
                          ? s === 'HIGH' ? 'bg-red-100 text-red-700 border border-red-300'
                            : s === 'MEDIUM' ? 'bg-orange-100 text-orange-700 border border-orange-300'
                            : 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-white text-gray-500 border border-gray-300 hover:border-gray-400'
                      )}
                    >
                      {s === 'HIGH' ? '🔥 Haute' : s === 'MEDIUM' ? '🟠 Moyenne' : '🟢 Faible'}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedStatuses.length + selectedCategories.length + (selectedScore ? 1 : 0)) > 0 && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setSelectedStatuses([]); setSelectedCategories([]); setSelectedScore('') }}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Prospect</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Activité</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Score IA</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Dernier contact</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((prospect) => (
                <ProspectRow
                  key={prospect.id}
                  prospect={prospect}
                  activities={activitiesByProspect.get(prospect.id) ?? []}
                />
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">Aucun prospect trouvé</p>
              <p className="text-sm">Essayez de modifier vos filtres</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProspectsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Chargement…</div>}>
      <ProspectsPageInner />
    </Suspense>
  )
}
