'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  Plus, Zap, Mail, MessageSquare, Trash2, Power, X, Save,
  ChevronRight, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProspectStatus, MessageChannel } from '@/types'

const STORAGE_KEY = 'relancepro_automations'

interface AutomationRule {
  id: string
  name: string
  active: boolean
  trigger: {
    type: 'STATUS_CHANGE' | 'DAYS_INACTIVE' | 'SCORE_BELOW'
    status?: ProspectStatus
    days?: number
    scoreThreshold?: number
  }
  action: {
    channel: MessageChannel
    templateId?: string
    message: string
    delayDays: number
  }
  stats: { sent: number; lastRun?: string }
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau', TO_CONTACT: 'À contacter', VOICEMAIL: 'Messagerie', CALLBACK: 'Rappel',
  INTERESTED: 'Intéressé', APPOINTMENT: 'RDV planifié', QUOTE_SENT: 'Devis envoyé',
  WAITING_QUOTE: 'Attente devis', SIGNED: 'Signé', LOST: 'Perdu', STOP: 'STOP',
}

const CHANNEL_CONFIG: Record<MessageChannel, { label: string; color: string; icon: React.ElementType }> = {
  SMS:      { label: 'SMS',      color: 'text-blue-600 bg-blue-50',   icon: MessageSquare },
  WHATSAPP: { label: 'WhatsApp', color: 'text-green-600 bg-green-50', icon: MessageSquare },
  EMAIL:    { label: 'Email',    color: 'text-purple-600 bg-purple-50', icon: Mail },
}

const PRESET_RULES: Omit<AutomationRule, 'id' | 'stats' | 'createdAt'>[] = [
  {
    name: 'Relance après RAPPEL',
    active: false,
    trigger: { type: 'STATUS_CHANGE', status: 'CALLBACK' },
    action: { channel: 'SMS', delayDays: 2, message: 'Bonjour {prenom}, suite à notre échange, avez-vous des questions sur votre projet solaire ? Stephen - Solargeo 📞 0696 68 62 69' },
  },
  {
    name: 'Réactivation prospect froid (30j)',
    active: false,
    trigger: { type: 'DAYS_INACTIVE', days: 30 },
    action: { channel: 'SMS', delayDays: 0, message: 'Bonjour {prenom}, nous pensons encore à votre projet ! Une offre spéciale vous attend. Intéressé(e) ? Stephen - Solargeo' },
  },
  {
    name: 'Follow-up après RDV',
    active: false,
    trigger: { type: 'STATUS_CHANGE', status: 'APPOINTMENT' },
    action: { channel: 'EMAIL', delayDays: 1, message: 'Bonjour {prenom},\n\nMerci pour notre rendez-vous d\'hier. Je vous envoie en pièce jointe notre proposition.\n\nCordialement,\nStephen BASPIN' },
  },
]

function loadRules(): AutomationRule[] {
  if (typeof window === 'undefined') return []
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : [] } catch { return [] }
}

function saveRules(list: AutomationRule[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

const EMPTY_FORM = {
  name: '',
  active: true,
  triggerType: 'STATUS_CHANGE' as AutomationRule['trigger']['type'],
  triggerStatus: 'CALLBACK' as ProspectStatus,
  triggerDays: 30,
  triggerScore: 30,
  channel: 'SMS' as MessageChannel,
  delayDays: 0,
  message: '',
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [addedPresets, setAddedPresets] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRules(loadRules())
  }, [])

  const toggleActive = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, active: !r.active } : r)
    saveRules(updated)
    setRules(updated)
  }

  const handleDelete = (id: string) => {
    const updated = rules.filter(r => r.id !== id)
    saveRules(updated)
    setRules(updated)
    setDeleteConfirm(null)
  }

  const openEdit = (r: AutomationRule) => {
    setEditingId(r.id)
    setForm({
      name: r.name,
      active: r.active,
      triggerType: r.trigger.type,
      triggerStatus: r.trigger.status ?? 'CALLBACK',
      triggerDays: r.trigger.days ?? 30,
      triggerScore: r.trigger.scoreThreshold ?? 30,
      channel: r.action.channel,
      delayDays: r.action.delayDays,
      message: r.action.message,
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.message.trim()) return
    const rule: AutomationRule = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name,
      active: form.active,
      trigger: {
        type: form.triggerType,
        ...(form.triggerType === 'STATUS_CHANGE' && { status: form.triggerStatus }),
        ...(form.triggerType === 'DAYS_INACTIVE' && { days: form.triggerDays }),
        ...(form.triggerType === 'SCORE_BELOW' && { scoreThreshold: form.triggerScore }),
      },
      action: { channel: form.channel, delayDays: form.delayDays, message: form.message },
      stats: editingId ? rules.find(r => r.id === editingId)?.stats ?? { sent: 0 } : { sent: 0 },
      createdAt: editingId ? rules.find(r => r.id === editingId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
    }
    const updated = editingId
      ? rules.map(r => r.id === editingId ? rule : r)
      : [...rules, rule]
    saveRules(updated)
    setRules(updated)
    setShowForm(false)
    setEditingId(null)
  }

  const addPreset = (preset: typeof PRESET_RULES[0]) => {
    const rule: AutomationRule = {
      ...preset,
      id: crypto.randomUUID(),
      stats: { sent: 0 },
      createdAt: new Date().toISOString(),
    }
    const updated = [...rules, rule]
    saveRules(updated)
    setRules(updated)
    setAddedPresets(prev => new Set([...prev, preset.name]))
  }

  const triggerLabel = (r: AutomationRule) => {
    if (r.trigger.type === 'STATUS_CHANGE') return `Statut → ${STATUS_LABELS[r.trigger.status ?? ''] ?? r.trigger.status}`
    if (r.trigger.type === 'DAYS_INACTIVE') return `Inactif depuis ${r.trigger.days}j`
    if (r.trigger.type === 'SCORE_BELOW')   return `Score < ${r.trigger.scoreThreshold}`
    return '—'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Automatisations" subtitle="Règles de relance automatique basées sur les statuts et l'activité" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Présets suggérés */}
        {PRESET_RULES.some(p => !addedPresets.has(p.name)) && (
          <div className="bg-gradient-to-r from-brand-50 to-indigo-50 rounded-xl border border-brand-200 p-5">
            <h3 className="font-semibold text-brand-900 mb-1">Règles suggérées</h3>
            <p className="text-sm text-brand-700 mb-4">Ajoutez des règles prêtes à l'emploi pour démarrer rapidement.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PRESET_RULES.filter(p => !addedPresets.has(p.name)).map(preset => {
                const ChanIcon = CHANNEL_CONFIG[preset.action.channel].icon
                return (
                  <div key={preset.name} className="bg-white rounded-xl border border-brand-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ChanIcon className={cn('w-4 h-4', CHANNEL_CONFIG[preset.action.channel].color.split(' ')[0])} />
                      <span className="text-sm font-semibold text-gray-900">{preset.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{preset.action.message}</p>
                    <button
                      onClick={() => addPreset(preset)}
                      className="w-full py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700"
                    >
                      + Ajouter
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Liste des règles */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Règles actives</h3>
              <p className="text-xs text-gray-500">{rules.filter(r => r.active).length} active{rules.filter(r => r.active).length > 1 ? 's' : ''} sur {rules.length}</p>
            </div>
            <button
              onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              Nouvelle règle
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Aucune règle d'automatisation</p>
              <p className="text-xs mt-1">Ajoutez un préset ou créez votre propre règle</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rules.map(rule => {
                const ChanIcon = CHANNEL_CONFIG[rule.action.channel].icon
                return (
                  <div key={rule.id} className={cn('p-5 transition-colors', !rule.active && 'opacity-50')}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Toggle actif */}
                        <button
                          onClick={() => toggleActive(rule.id)}
                          className={cn('mt-0.5 w-9 h-5 rounded-full flex-shrink-0 transition-colors relative',
                            rule.active ? 'bg-brand-600' : 'bg-gray-300'
                          )}
                        >
                          <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                            rule.active ? 'translate-x-4' : 'translate-x-0.5'
                          )} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{rule.name}</p>

                          {/* Flux de la règle */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                              <Zap className="w-3 h-3" />
                              {triggerLabel(rule)}
                            </span>
                            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            {rule.action.delayDays > 0 && (
                              <>
                                <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2 py-0.5">
                                  <Clock className="w-3 h-3" />
                                  +{rule.action.delayDays}j
                                </span>
                                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              </>
                            )}
                            <span className={cn('inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border',
                              CHANNEL_CONFIG[rule.action.channel].color,
                              rule.action.channel === 'SMS' ? 'border-blue-200' :
                              rule.action.channel === 'EMAIL' ? 'border-purple-200' : 'border-green-200'
                            )}>
                              <ChanIcon className="w-3 h-3" />
                              Envoyer {CHANNEL_CONFIG[rule.action.channel].label}
                            </span>
                          </div>

                          <p className="text-xs text-gray-400 mt-1.5 line-clamp-1 italic">
                            &ldquo;{rule.action.message.slice(0, 80)}{rule.action.message.length > 80 ? '…' : ''}&rdquo;
                          </p>

                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">{rule.stats.sent} envoi{rule.stats.sent > 1 ? 's' : ''}</span>
                            {rule.stats.lastRun && (
                              <span className="text-xs text-gray-400">Dernière exéc. : {new Date(rule.stats.lastRun).toLocaleDateString('fr-FR')}</span>
                            )}
                            <span className={cn('text-xs font-medium', rule.active ? 'text-green-600' : 'text-gray-400')}>
                              {rule.active ? '● Active' : '○ Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(rule)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400" title="Modifier">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M12.146.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-10 10a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l10-10z"/></svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(rule.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {deleteConfirm === rule.id && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-red-700">Supprimer &ldquo;{rule.name}&rdquo; ?</span>
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(rule.id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg">Supprimer</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-white text-gray-600 text-xs rounded-lg border">Annuler</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Note d'information */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Power className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Exécution des automatisations</p>
              <p className="text-xs text-amber-700 mt-1">
                Les règles sont évaluées manuellement ou lors du prochain déploiement avec un service cron.
                Pour l&apos;automatisation complète en production, une tâche planifiée (cron job) sur votre serveur
                appellera <code className="bg-amber-100 px-1 rounded">/api/automations/run</code> quotidiennement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire slide-in */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
              <h2 className="font-semibold text-gray-900">{editingId ? 'Modifier la règle' : 'Nouvelle règle'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom de la règle *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Relance après inactivité"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                />
              </div>

              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 space-y-3">
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Déclencheur</p>
                <select
                  value={form.triggerType}
                  onChange={e => setForm(f => ({ ...f, triggerType: e.target.value as AutomationRule['trigger']['type'] }))}
                  className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white"
                >
                  <option value="STATUS_CHANGE">Changement de statut</option>
                  <option value="DAYS_INACTIVE">Jours sans activité</option>
                  <option value="SCORE_BELOW">Score IA en dessous de</option>
                </select>

                {form.triggerType === 'STATUS_CHANGE' && (
                  <select
                    value={form.triggerStatus}
                    onChange={e => setForm(f => ({ ...f, triggerStatus: e.target.value as ProspectStatus }))}
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                )}
                {form.triggerType === 'DAYS_INACTIVE' && (
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={365} value={form.triggerDays}
                      onChange={e => setForm(f => ({ ...f, triggerDays: Number(e.target.value) }))}
                      className="w-24 border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none bg-white" />
                    <span className="text-sm text-gray-600">jours sans activité</span>
                  </div>
                )}
                {form.triggerType === 'SCORE_BELOW' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Score &lt;</span>
                    <input type="number" min={0} max={100} value={form.triggerScore}
                      onChange={e => setForm(f => ({ ...f, triggerScore: Number(e.target.value) }))}
                      className="w-24 border border-orange-200 rounded-lg px-3 py-2 text-sm outline-none bg-white" />
                  </div>
                )}
              </div>

              <div className="p-4 bg-brand-50 rounded-xl border border-brand-200 space-y-3">
                <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Action</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-brand-700">Canal</label>
                    <select
                      value={form.channel}
                      onChange={e => setForm(f => ({ ...f, channel: e.target.value as MessageChannel }))}
                      className="mt-1 w-full border border-brand-200 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                    >
                      <option value="SMS">SMS</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-brand-700">Délai après déclencheur</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input type="number" min={0} max={30} value={form.delayDays}
                        onChange={e => setForm(f => ({ ...f, delayDays: Number(e.target.value) }))}
                        className="w-16 border border-brand-200 rounded-lg px-3 py-2 text-sm outline-none bg-white" />
                      <span className="text-xs text-gray-500">jour(s)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-brand-700">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    rows={4}
                    placeholder="Bonjour {prenom}, ..."
                    className="mt-1 w-full border border-brand-200 rounded-lg px-3 py-2 text-sm outline-none bg-white resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Variables : {'{prenom}'} {'{nom}'} {'{ville}'} {'{commercial}'}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Activer la règle immédiatement</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 font-medium">Annuler</button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || !form.message.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Enregistrer' : 'Créer la règle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
