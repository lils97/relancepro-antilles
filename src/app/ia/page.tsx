'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import {
  Sparkles, Send, Copy, RotateCcw, CheckCircle,
  MessageSquare, Mail, Zap,
  Sun, Wifi, Thermometer, AirVent, Wind,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/types'
import type { ProspectCategory, MessageChannel, MessageTone, MessageObjective, Prospect } from '@/types'
import { computeAiScore, scoreToLabel } from '@/lib/score-utils'
import type { Activity } from '@/lib/activity-store'
import { useRouter } from 'next/navigation'

const CATEGORIES: { id: ProspectCategory; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'INTERNET_FIBRE',       label: 'Internet / Fibre',    icon: Wifi,        color: 'text-sky-500' },
  { id: 'PANNEAUX_SOLAIRES',    label: 'Panneaux Solaires',   icon: Sun,         color: 'text-amber-500' },
  { id: 'ISOLATION_THERMIQUE',  label: 'Isolation Thermique', icon: Thermometer, color: 'text-green-500' },
  { id: 'CLIMATISATION',        label: 'Climatisation',       icon: AirVent,     color: 'text-indigo-500' },
  { id: 'BRASSEURS_AIR',        label: 'Brasseurs d\'Air',    icon: Wind,        color: 'text-teal-500' },
]

const OBJECTIVES: { id: MessageObjective; label: string; desc: string }[] = [
  { id: 'APPOINTMENT',  label: 'Prendre RDV',    desc: 'Obtenir un rendez-vous' },
  { id: 'SALE',         label: 'Vente directe',  desc: 'Conclure une vente' },
  { id: 'FOLLOWUP',     label: 'Relance',         desc: 'Relancer un prospect froid' },
  { id: 'REACTIVATION', label: 'Réactivation',   desc: 'Réactiver un prospect perdu' },
]

const TONES: { id: MessageTone; label: string; emoji: string }[] = [
  { id: 'PROFESSIONAL', label: 'Professionnel', emoji: '👔' },
  { id: 'COMMERCIAL',   label: 'Commercial',    emoji: '💼' },
  { id: 'FRIENDLY',     label: 'Amical',        emoji: '😊' },
]

const CHANNELS: { id: MessageChannel; label: string; icon: React.ElementType; limit?: string }[] = [
  { id: 'SMS',      label: 'SMS',      icon: MessageSquare, limit: '160 car.' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, limit: 'Libre' },
  { id: 'EMAIL',    label: 'Email',    icon: Mail,          limit: 'Libre' },
]

export default function IAPage() {
  const router = useRouter()
  const [category, setCategory]         = useState<ProspectCategory>('PANNEAUX_SOLAIRES')
  const [objective, setObjective]       = useState<MessageObjective>('APPOINTMENT')
  const [tone, setTone]                 = useState<MessageTone>('FRIENDLY')
  const [channel, setChannel]           = useState<MessageChannel>('SMS')
  const [customContext, setCustomContext] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [copied, setCopied]             = useState(false)
  const [activeSection, setActiveSection] = useState<'generate' | 'analyze' | 'score'>('generate')

  // Analyse
  const [analyzeText, setAnalyzeText]   = useState('')
  const [analyzeResult, setAnalyzeResult] = useState<{
    intent: string; status?: string; confidence: number; reason: string
  } | null>(null)

  // Scorer — vrais prospects
  const [prospects, setProspects]         = useState<Prospect[]>([])
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)

  useEffect(() => {
    import('@/lib/prospect-store').then(({ getProspects }) => setProspects(getProspects()))
    import('@/lib/activity-store').then(({ getActivities }) => setAllActivities(getActivities()))
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratedMessage('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_message', category, channel, objective, tone, context: customContext || undefined }),
      })
      const data = await res.json()
      setGeneratedMessage(data.message || 'Erreur lors de la génération. Vérifiez votre clé API Claude dans le fichier .env')
    } catch {
      setGeneratedMessage('Erreur de connexion à l\'API.')
    }
    setIsGenerating(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveAsTemplate = () => {
    if (!generatedMessage) return
    try {
      const stored = localStorage.getItem('relancepro_templates')
      const templates = stored ? JSON.parse(stored) : []
      const newT = {
        id: crypto.randomUUID(),
        name: `${CATEGORY_LABELS[category]} — ${channel}`,
        channel,
        category,
        content: generatedMessage,
        tone,
        objective,
        usageCount: 0,
        variables: (generatedMessage.match(/\{[a-z_]+\}/g) ?? []).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
        createdAt: new Date().toISOString(),
      }
      templates.push(newT)
      localStorage.setItem('relancepro_templates', JSON.stringify(templates))
      router.push('/templates')
    } catch {}
  }

  const handleCreateCampaign = () => {
    if (!generatedMessage) return
    try {
      const stored = localStorage.getItem('relancepro_templates')
      const templates = stored ? JSON.parse(stored) : []
      const newT = {
        id: crypto.randomUUID(),
        name: `IA — ${CATEGORY_LABELS[category]} ${channel}`,
        channel, category, content: generatedMessage, tone, objective,
        usageCount: 0,
        variables: (generatedMessage.match(/\{[a-z_]+\}/g) ?? []).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
        createdAt: new Date().toISOString(),
      }
      templates.push(newT)
      localStorage.setItem('relancepro_templates', JSON.stringify(templates))
      router.push(`/campaigns?template=${newT.id}`)
    } catch {}
  }

  const handleAnalyze = async () => {
    if (!analyzeText) return
    setIsGenerating(true)
    await new Promise(r => setTimeout(r, 600))
    const { analyzeTextResponse } = await import('@/lib/ai-scoring')
    const result = analyzeTextResponse(analyzeText)
    setAnalyzeResult({ intent: result.intent, status: result.suggestedStatus, confidence: result.confidence, reason: result.reason })
    setIsGenerating(false)
  }

  const handleApplyStatus = () => {
    if (!analyzeResult?.status || !selectedProspect) return
    import('@/lib/prospect-store').then(({ updateProspect }) => {
      updateProspect(selectedProspect.id, { status: analyzeResult.status as Prospect['status'] })
      alert(`Statut "${analyzeResult.status}" appliqué à ${selectedProspect.firstName} ${selectedProspect.lastName}`)
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Assistant IA" subtitle="Génération de messages et analyse des réponses" />

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
          {[
            { id: 'generate', label: '✨ Générer un message' },
            { id: 'analyze',  label: '🔍 Analyser une réponse' },
            { id: 'score',    label: '🎯 Scorer un prospect' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeSection === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 max-w-4xl mx-auto">

          {/* ---- GÉNÉRATION ---- */}
          {activeSection === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Configuration du message</h3>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Secteur</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon
                        return (
                          <button key={cat.id} onClick={() => setCategory(cat.id)}
                            className={cn('flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all',
                              category === cat.id ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            )}>
                            <Icon className={cn('w-4 h-4', cat.color)} />
                            {cat.label.split(' ')[0]}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Canal</p>
                    <div className="flex gap-2">
                      {CHANNELS.map(ch => {
                        const Icon = ch.icon
                        return (
                          <button key={ch.id} onClick={() => setChannel(ch.id)}
                            className={cn('flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-sm font-medium transition-all',
                              channel === ch.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            )}>
                            <Icon className="w-3.5 h-3.5" />
                            {ch.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Objectif</p>
                    <div className="grid grid-cols-2 gap-2">
                      {OBJECTIVES.map(obj => (
                        <button key={obj.id} onClick={() => setObjective(obj.id)}
                          className={cn('p-2.5 rounded-lg border text-left transition-all',
                            objective === obj.id ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                          )}>
                          <p className={cn('text-sm font-medium', objective === obj.id ? 'text-brand-700' : 'text-gray-700')}>{obj.label}</p>
                          <p className="text-xs text-gray-400">{obj.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ton</p>
                    <div className="flex gap-2">
                      {TONES.map(t => (
                        <button key={t.id} onClick={() => setTone(t.id)}
                          className={cn('flex-1 p-2 rounded-lg border text-sm font-medium transition-all',
                            tone === t.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          )}>
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contexte (optionnel)</p>
                    <textarea
                      value={customContext}
                      onChange={e => setCustomContext(e.target.value)}
                      placeholder="Ex: Client propriétaire à Fort-de-France, déjà contacté il y a 1 mois..."
                      className="w-full h-20 text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none outline-none focus:border-brand-400"
                    />
                  </div>

                  <button onClick={handleGenerate} disabled={isGenerating}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600 to-tropical-teal text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
                    {isGenerating
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Génération…</>
                      : <><Sparkles className="w-4 h-4" />Générer avec l&apos;IA</>
                    }
                  </button>
                </div>
              </div>

              <div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Message généré</h3>
                    {generatedMessage && (
                      <div className="flex gap-2">
                        <button onClick={handleCopy}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copié !' : 'Copier'}
                        </button>
                        <button onClick={handleGenerate}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Régénérer
                        </button>
                      </div>
                    )}
                  </div>

                  {generatedMessage ? (
                    <div>
                      <div className="bg-gray-50 rounded-xl p-4 min-h-[200px]">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">{generatedMessage}</pre>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Variables détectées</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['{prenom}', '{nom}', '{ville}', '{commercial}'].map(v =>
                            generatedMessage.includes(v) && (
                              <span key={v} className="px-2 py-0.5 bg-brand-50 text-brand-600 border border-brand-200 rounded text-xs font-mono">{v}</span>
                            )
                          )}
                        </div>
                      </div>

                      {channel === 'SMS' && (
                        <div className="mt-3 text-xs text-gray-400">
                          {generatedMessage.length} caractères / 160 max
                          {generatedMessage.length > 160 && <span className="text-amber-500 ml-2">⚠️ Multi-SMS</span>}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button onClick={handleSaveAsTemplate}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">
                          <Send className="w-3.5 h-3.5" />
                          Sauver en template
                        </button>
                        <button onClick={handleCreateCampaign}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
                          <Zap className="w-3.5 h-3.5" />
                          Créer une campagne
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                      <Sparkles className="w-12 h-12 mb-3" />
                      <p className="text-sm text-gray-400">Configurez et générez votre message</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---- ANALYSER ---- */}
          {activeSection === 'analyze' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-2">Analyser une réponse prospect</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Collez le texte reçu par SMS, WhatsApp ou email. L&apos;IA détecte l&apos;intention et suggère le statut.
                </p>

                {prospects.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prospect concerné (optionnel)</p>
                    <select
                      value={selectedProspect?.id ?? ''}
                      onChange={e => setSelectedProspect(prospects.find(p => p.id === e.target.value) ?? null)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400"
                    >
                      <option value="">— Sélectionner un prospect —</option>
                      {prospects.map(p => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.phone ?? p.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                <textarea
                  value={analyzeText}
                  onChange={e => setAnalyzeText(e.target.value)}
                  placeholder={'Exemples :\n"Oui je suis intéressé, appelez-moi"\n"Non merci, pas intéressé"\n"Rappeler demain matin"\n"STOP"'}
                  className="w-full h-32 text-sm bg-gray-50 border border-gray-200 rounded-xl p-4 resize-none outline-none focus:border-brand-400"
                />
                <button onClick={handleAnalyze} disabled={!analyzeText || isGenerating}
                  className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50">
                  {isGenerating
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Zap className="w-4 h-4" />
                  }
                  Analyser
                </button>
              </div>

              {analyzeResult && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-semibold text-gray-900 mb-4">Résultat de l&apos;analyse</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Intention détectée</span>
                      <span className={cn('px-3 py-1 rounded-full text-sm font-semibold',
                        analyzeResult.intent === 'INTERESTED' && 'bg-green-50 text-green-700',
                        analyzeResult.intent === 'CALLBACK'   && 'bg-yellow-50 text-yellow-700',
                        analyzeResult.intent === 'LOST'       && 'bg-red-50 text-red-700',
                        analyzeResult.intent === 'STOP'       && 'bg-gray-100 text-gray-600',
                        analyzeResult.intent === 'NEUTRAL'    && 'bg-blue-50 text-blue-700',
                      )}>
                        {analyzeResult.intent === 'INTERESTED' && '✅ Intéressé'}
                        {analyzeResult.intent === 'CALLBACK'   && '📞 Rappel'}
                        {analyzeResult.intent === 'LOST'       && '❌ Perdu'}
                        {analyzeResult.intent === 'STOP'       && '🚫 STOP'}
                        {analyzeResult.intent === 'NEUTRAL'    && '❓ Neutre'}
                      </span>
                    </div>

                    {analyzeResult.status && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Statut suggéré</span>
                        <span className="text-sm font-medium text-gray-900">{analyzeResult.status}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Confiance</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${analyzeResult.confidence}%` }} />
                        </div>
                        <span className="text-sm font-semibold">{analyzeResult.confidence}%</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600">{analyzeResult.reason}</p>
                    </div>

                    {analyzeResult.status && (
                      <button
                        onClick={handleApplyStatus}
                        disabled={!selectedProspect}
                        className="w-full mt-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedProspect
                          ? `Appliquer à ${selectedProspect.firstName} ${selectedProspect.lastName}`
                          : 'Sélectionnez un prospect pour appliquer'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- SCORER ---- */}
          {activeSection === 'score' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-2">Scorer un prospect</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Score dynamique calculé à partir des données réelles du prospect et de ses activités.
                </p>

                {prospects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun prospect pour l&apos;instant</p>
                    <p className="text-xs mt-1">Importez des prospects via <a href="/import" className="text-brand-600 hover:underline">l&apos;onglet Import</a></p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prospects.slice(0, 30).map(p => {
                      const acts = allActivities.filter(a => a.prospectId === p.id)
                      const score = computeAiScore(p, acts)
                      const label = scoreToLabel(score)
                      return (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/prospects/${p.id}`)}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-brand-300 cursor-pointer transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-gray-400">{p.city} • {CATEGORY_LABELS[p.category]}</p>
                          </div>
                          <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
                            label === 'HIGH'   && 'bg-red-50 text-red-600',
                            label === 'MEDIUM' && 'bg-orange-50 text-orange-600',
                            label === 'LOW'    && 'bg-green-50 text-green-600',
                          )}>
                            {label === 'HIGH' && '🔥'}
                            {label === 'MEDIUM' && '🟠'}
                            {label === 'LOW' && '🟢'}
                            {score}/100
                          </div>
                        </div>
                      )
                    })}
                    {prospects.length > 30 && (
                      <p className="text-xs text-center text-gray-400 pt-2">
                        Affichage des 30 premiers sur {prospects.length} — voir la <a href="/prospects" className="text-brand-600">liste complète</a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
