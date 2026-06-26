'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  Plus, MessageSquare, Mail, Search, Edit, Trash2,
  Copy, CheckCircle, X, Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageChannel, ProspectCategory, MessageTone, MessageObjective } from '@/types'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'relancepro_templates'

interface Template {
  id: string
  name: string
  channel: MessageChannel
  category?: ProspectCategory
  subject?: string
  content: string
  tone: MessageTone
  objective: MessageObjective
  usageCount: number
  variables: string[]
  createdAt: string
}

const CHANNEL_CONFIG: Record<MessageChannel, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  SMS:      { icon: MessageSquare, color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'SMS' },
  WHATSAPP: { icon: MessageSquare, color: 'text-green-600',  bg: 'bg-green-50',  label: 'WhatsApp' },
  EMAIL:    { icon: Mail,          color: 'text-purple-600', bg: 'bg-purple-50', label: 'Email' },
}

const KNOWN_VARS = ['{prenom}', '{nom}', '{ville}', '{commercial}', '{offre}', '{date}']

function detectVariables(text: string): string[] {
  const matches = text.match(/\{[a-z_]+\}/g) ?? []
  return [...new Set(matches)]
}

function loadTemplates(): Template[] {
  if (typeof window === 'undefined') return []
  try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : [] } catch { return [] }
}

function saveTemplates(list: Template[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

const EMPTY_FORM: Omit<Template, 'id' | 'usageCount' | 'variables' | 'createdAt'> = {
  name: '',
  channel: 'SMS',
  category: undefined,
  subject: '',
  content: '',
  tone: 'FRIENDLY',
  objective: 'APPOINTMENT',
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const [filterChannel, setFilterChannel] = useState<MessageChannel | ''>('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.content.toLowerCase().includes(search.toLowerCase())) return false
    if (filterChannel && t.channel !== filterChannel) return false
    return true
  })

  const handleCopy = (t: Template) => {
    navigator.clipboard.writeText(t.content)
    setCopiedId(t.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openNewForm = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEditForm = (t: Template) => {
    setEditingId(t.id)
    setForm({ name: t.name, channel: t.channel, category: t.category, subject: t.subject ?? '', content: t.content, tone: t.tone, objective: t.objective })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.content.trim()) return
    const vars = detectVariables(form.content + ' ' + (form.subject ?? ''))
    let updated: Template[]

    if (editingId) {
      updated = templates.map(t => t.id === editingId
        ? { ...t, ...form, variables: vars }
        : t
      )
    } else {
      const newT: Template = {
        ...form,
        id: crypto.randomUUID(),
        usageCount: 0,
        variables: vars,
        createdAt: new Date().toISOString(),
      }
      updated = [...templates, newT]
    }

    saveTemplates(updated)
    setTemplates(updated)
    setShowForm(false)
    if (editingId) {
      setSelectedTemplate(updated.find(t => t.id === editingId) ?? null)
    }
  }

  const handleDelete = (id: string) => {
    const updated = templates.filter(t => t.id !== id)
    saveTemplates(updated)
    setTemplates(updated)
    if (selectedTemplate?.id === id) setSelectedTemplate(null)
    setDeleteConfirm(null)
  }

  const handleDuplicate = (t: Template) => {
    const dup: Template = {
      ...t,
      id: crypto.randomUUID(),
      name: `${t.name} (copie)`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    }
    const updated = [...templates, dup]
    saveTemplates(updated)
    setTemplates(updated)
  }

  const handleUseInCampaign = (t: Template) => {
    // Incrémente le compteur d'utilisation
    const updated = templates.map(x => x.id === t.id ? { ...x, usageCount: x.usageCount + 1 } : x)
    saveTemplates(updated)
    setTemplates(updated)
    // Redirige vers campagnes avec le template pré-rempli en query params
    router.push(`/campaigns?template=${encodeURIComponent(t.id)}`)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Templates de messages" subtitle={`${templates.length} modèle${templates.length > 1 ? 's' : ''} disponible${templates.length > 1 ? 's' : ''}`} />

      <div className="flex-1 overflow-hidden flex">
        {/* Liste */}
        <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="bg-transparent text-sm outline-none flex-1"
              />
            </div>
            <div className="flex gap-1.5">
              {(['', 'SMS', 'WHATSAPP', 'EMAIL'] as (MessageChannel | '')[]).map(ch => (
                <button
                  key={ch}
                  onClick={() => setFilterChannel(ch)}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    filterChannel === ch ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {ch || 'Tous'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm text-center">Aucun template<br />Créez votre premier modèle</p>
              </div>
            )}
            {filtered.map(t => {
              const config = CHANNEL_CONFIG[t.channel]
              const Icon = config.icon
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={cn(
                    'p-3 rounded-xl border cursor-pointer transition-all',
                    selectedTemplate?.id === t.id ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
                      <Icon className={cn('w-3.5 h-3.5', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{t.content.slice(0, 80)}{t.content.length > 80 ? '…' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{t.usageCount} utilisation{t.usageCount > 1 ? 's' : ''}</span>
                    <div className="flex gap-1">
                      {t.variables.slice(0, 3).map(v => (
                        <span key={v} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1 font-mono">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3 border-t border-gray-100">
            <button
              onClick={openNewForm}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" />
              Nouveau template
            </button>
          </div>
        </div>

        {/* Détail */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {showForm ? (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">{editingId ? 'Modifier le template' : 'Nouveau template'}</h2>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom du template *</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: Relance panneaux solaires SMS"
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Canal</label>
                      <select
                        value={form.channel}
                        onChange={e => setForm(f => ({ ...f, channel: e.target.value as MessageChannel }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                      >
                        <option value="SMS">SMS</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="EMAIL">Email</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Objectif</label>
                      <select
                        value={form.objective}
                        onChange={e => setForm(f => ({ ...f, objective: e.target.value as MessageObjective }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                      >
                        <option value="APPOINTMENT">Prendre RDV</option>
                        <option value="SALE">Vente directe</option>
                        <option value="FOLLOWUP">Relance</option>
                        <option value="REACTIVATION">Réactivation</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ton</label>
                      <select
                        value={form.tone}
                        onChange={e => setForm(f => ({ ...f, tone: e.target.value as MessageTone }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                      >
                        <option value="PROFESSIONAL">Professionnel</option>
                        <option value="COMMERCIAL">Commercial</option>
                        <option value="FRIENDLY">Amical</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie</label>
                      <select
                        value={form.category ?? ''}
                        onChange={e => setForm(f => ({ ...f, category: (e.target.value || undefined) as ProspectCategory | undefined }))}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                      >
                        <option value="">Toutes</option>
                        <option value="PANNEAUX_SOLAIRES">Panneaux Solaires</option>
                        <option value="INTERNET_FIBRE">Internet / Fibre</option>
                        <option value="ISOLATION_THERMIQUE">Isolation Thermique</option>
                        <option value="CLIMATISATION">Climatisation</option>
                        <option value="BRASSEURS_AIR">Brasseurs d&apos;Air</option>
                      </select>
                    </div>
                  </div>

                  {form.channel === 'EMAIL' && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Objet de l&apos;email</label>
                      <input
                        value={form.subject ?? ''}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="Ex: Votre projet solaire à {ville}"
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contenu *</label>
                      {form.channel === 'SMS' && (
                        <span className={cn('text-xs', form.content.length > 160 ? 'text-red-500' : 'text-gray-400')}>
                          {form.content.length}/160
                        </span>
                      )}
                    </div>
                    <textarea
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      placeholder={`Bonjour {prenom}, je vous contacte au sujet de...`}
                      rows={6}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 resize-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-xs text-gray-400">Variables disponibles :</span>
                      {KNOWN_VARS.map(v => (
                        <button
                          key={v}
                          onClick={() => setForm(f => ({ ...f, content: f.content + v }))}
                          className="text-xs font-mono bg-brand-50 text-brand-600 border border-brand-200 rounded px-1.5 hover:bg-brand-100"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={!form.name.trim() || !form.content.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {editingId ? 'Enregistrer les modifications' : 'Créer le template'}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="max-w-2xl space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {(() => {
                        const config = CHANNEL_CONFIG[selectedTemplate.channel]
                        const Icon = config.icon
                        return (
                          <>
                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', config.bg)}>
                              <Icon className={cn('w-3.5 h-3.5', config.color)} />
                            </div>
                            <span className="text-xs font-medium text-gray-500">{config.label}</span>
                          </>
                        )
                      })()}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h2>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditForm(selectedTemplate)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopy(selectedTemplate)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
                      title="Copier le contenu"
                    >
                      {copiedId === selectedTemplate.id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(selectedTemplate.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {deleteConfirm === selectedTemplate.id && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-red-700">Supprimer ce template ?</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(selectedTemplate.id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700">Supprimer</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-white text-gray-600 text-xs rounded-lg border hover:bg-gray-50">Annuler</button>
                    </div>
                  </div>
                )}
              </div>

              {selectedTemplate.subject && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Objet email</p>
                  <p className="text-sm text-gray-900">{selectedTemplate.subject}</p>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contenu</p>
                  {selectedTemplate.channel === 'SMS' && (
                    <span className={cn('text-xs', selectedTemplate.content.length > 160 ? 'text-red-500' : 'text-gray-400')}>
                      {selectedTemplate.content.length} caractères
                    </span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed bg-gray-50 rounded-xl p-4">
                  {selectedTemplate.content}
                </pre>
              </div>

              {selectedTemplate.variables.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Variables détectées</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map(v => (
                      <span key={v} className="px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-lg text-sm font-mono text-brand-700">{v}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleUseInCampaign(selectedTemplate)}
                  className="flex-1 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700"
                >
                  Utiliser dans une campagne
                </button>
                <button
                  onClick={() => handleDuplicate(selectedTemplate)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200"
                >
                  Dupliquer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Sélectionnez un template ou créez-en un nouveau</p>
              <button
                onClick={openNewForm}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700"
              >
                <Plus className="w-4 h-4" />
                Nouveau template
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
