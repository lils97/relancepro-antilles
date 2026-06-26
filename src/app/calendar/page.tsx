'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  ChevronLeft, ChevronRight, Plus, MapPin,
  Clock, Calendar, CheckCircle, X, Save, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Prospect } from '@/types'

const STORAGE_KEY = 'relancepro_calendar_events'
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

type EventType = 'APPOINTMENT' | 'CALL' | 'FOLLOWUP' | 'TASK'

interface CalendarEvent {
  id: string
  title: string
  type: EventType
  dateStr: string   // ISO string (date uniquement)
  time: string
  prospectId?: string
  prospectName?: string
  location?: string
  notes?: string
  done: boolean
}

const EVENT_COLORS: Record<EventType, { bg: string; border: string; badge: string }> = {
  APPOINTMENT: { bg: 'bg-indigo-500', border: 'border-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
  CALL:        { bg: 'bg-blue-500',   border: 'border-blue-400',   badge: 'bg-blue-100 text-blue-700' },
  FOLLOWUP:    { bg: 'bg-orange-500', border: 'border-orange-400', badge: 'bg-orange-100 text-orange-700' },
  TASK:        { bg: 'bg-gray-500',   border: 'border-gray-400',   badge: 'bg-gray-100 text-gray-700' },
}
const EVENT_LABELS: Record<EventType, string> = {
  APPOINTMENT: 'RDV', CALL: 'Appel', FOLLOWUP: 'Relance', TASK: 'Tâche',
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function loadEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return []
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : [] } catch { return [] }
}

function saveEvents(list: CalendarEvent[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

const EMPTY_FORM = {
  title: '',
  type: 'APPOINTMENT' as EventType,
  dateStr: toDateStr(new Date()),
  time: '09:00',
  prospectId: '',
  location: '',
  notes: '',
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    setEvents(loadEvents())
    import('@/lib/prospect-store').then(({ getProspects }) => setProspects(getProspects()))
  }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const todayStr = toDateStr(new Date())
  const selectedStr = toDateStr(selectedDate)

  const getEventsForDate = (dateStr: string) =>
    events.filter(e => e.dateStr === dateStr).sort((a, b) => a.time.localeCompare(b.time))

  const selectedEvents = getEventsForDate(selectedStr)
  const upcomingEvents = events
    .filter(e => !e.done && e.dateStr >= todayStr)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.time.localeCompare(b.time))
    .slice(0, 5)

  const openNewForm = (dateStr?: string) => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, dateStr: dateStr ?? selectedStr })
    setShowForm(true)
  }

  const openEditForm = (e: CalendarEvent) => {
    setEditingId(e.id)
    setForm({ title: e.title, type: e.type, dateStr: e.dateStr, time: e.time, prospectId: e.prospectId ?? '', location: e.location ?? '', notes: e.notes ?? '' })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    const prospect = prospects.find(p => p.id === form.prospectId)
    const prospectName = prospect ? `${prospect.firstName} ${prospect.lastName}` : undefined
    let updated: CalendarEvent[]

    if (editingId) {
      updated = events.map(e => e.id === editingId
        ? { ...e, ...form, prospectName, prospectId: form.prospectId || undefined }
        : e)
    } else {
      const newEvent: CalendarEvent = {
        ...form,
        id: crypto.randomUUID(),
        prospectName,
        prospectId: form.prospectId || undefined,
        done: false,
      }
      updated = [...events, newEvent]
    }

    saveEvents(updated)
    setEvents(updated)
    setShowForm(false)
  }

  const toggleDone = (id: string) => {
    const updated = events.map(e => e.id === id ? { ...e, done: !e.done } : e)
    saveEvents(updated)
    setEvents(updated)
  }

  const handleDelete = (id: string) => {
    const updated = events.filter(e => e.id !== id)
    saveEvents(updated)
    setEvents(updated)
    setDeleteConfirm(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Calendrier" subtitle="Vos RDV, relances et appels" />

      <div className="flex-1 overflow-hidden flex">
        {/* Calendrier principal */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <h2 className="text-lg font-bold text-gray-900">{MONTHS[month]} {year}</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const t = new Date(); setCurrentDate(t); setSelectedDate(t) }}
                className="px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100"
              >
                Aujourd&apos;hui
              </button>
              <button
                onClick={() => openNewForm()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
              >
                <Plus className="w-4 h-4" />
                Événement
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {DAYS.map(day => (
                <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-100 bg-gray-50" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedStr
                const dayEvents = getEventsForDate(dateStr)

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={cn(
                      'h-24 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors',
                      isSelected && 'bg-brand-50',
                      !isSelected && 'hover:bg-gray-50'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium mb-1',
                      isToday && 'bg-brand-600 text-white',
                      !isToday && isSelected && 'bg-brand-100 text-brand-700',
                      !isToday && !isSelected && 'text-gray-700'
                    )}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className={cn('text-[10px] px-1.5 py-0.5 rounded text-white truncate', EVENT_COLORS[e.type].bg)}>
                          {e.time} {e.title.slice(0, 12)}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 2}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Panneau latéral */}
        <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {showForm ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">{editingId ? 'Modifier' : 'Nouvel événement'}</h3>
                <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Titre *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: RDV panneau solaire"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="APPOINTMENT">RDV</option>
                    <option value="CALL">Appel</option>
                    <option value="FOLLOWUP">Relance</option>
                    <option value="TASK">Tâche</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Date *</label>
                    <input
                      type="date"
                      value={form.dateStr}
                      onChange={e => setForm(f => ({ ...f, dateStr: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Heure</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500">Prospect (optionnel)</label>
                  <select
                    value={form.prospectId}
                    onChange={e => setForm(f => ({ ...f, prospectId: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">— Aucun —</option>
                    {prospects.map(p => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.city ? `(${p.city})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500">Lieu</label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Ex: Fort-de-France"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 resize-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Enregistrer' : 'Créer l\'événement'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Événements du jour sélectionné */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <p className="text-xs text-gray-500">{selectedEvents.length} événement{selectedEvents.length > 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => openNewForm()}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedEvents.length > 0 ? selectedEvents.map(event => (
                  <div
                    key={event.id}
                    className={cn('p-3 rounded-xl border-l-4 bg-gray-50', EVENT_COLORS[event.type].border, event.done && 'opacity-60')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase', EVENT_COLORS[event.type].badge)}>
                            {EVENT_LABELS[event.type]}
                          </span>
                        </div>
                        <p className={cn('text-sm font-medium text-gray-900', event.done && 'line-through text-gray-400')}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{event.time}</span>
                          {event.location && (
                            <>
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                        {event.prospectName && (
                          <p className="text-xs text-brand-600 mt-0.5">👤 {event.prospectName}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditForm(event)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400" title="Modifier">
                          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-10 10a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l10-10z"/></svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(event.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {deleteConfirm === event.id && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                        <span className="text-xs text-red-700">Supprimer ?</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(event.id)} className="px-2 py-0.5 bg-red-600 text-white text-xs rounded">Oui</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 bg-white text-gray-600 text-xs rounded border">Non</button>
                        </div>
                      </div>
                    )}

                    {!event.done && (
                      <button
                        onClick={() => toggleDone(event.id)}
                        className="mt-2 w-full py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> Marquer terminé
                      </button>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun événement ce jour</p>
                    <button
                      onClick={() => openNewForm()}
                      className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 bg-brand-50 text-brand-600 text-sm font-medium rounded-lg hover:bg-brand-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un RDV
                    </button>
                  </div>
                )}
              </div>

              {/* Prochains RDV */}
              {upcomingEvents.length > 0 && (
                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Prochains événements</p>
                  {upcomingEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => {
                        const d = new Date(event.dateStr + 'T12:00:00')
                        setSelectedDate(d)
                        setCurrentDate(d)
                      }}
                      className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded px-1"
                    >
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', EVENT_COLORS[event.type].bg)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{event.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(event.dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {event.time}
                          {event.prospectName && ` · ${event.prospectName}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
