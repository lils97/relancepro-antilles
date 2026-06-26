'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import {
  Plus, Send, MessageSquare, Mail, BarChart2,
  Play, Pause, Clock, CheckCircle, X, Eye,
  Zap, Trash2, XCircle, Image, Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageChannel } from '@/types'
import { formatDate } from '@/lib/utils'

interface Campaign {
  id: string
  name: string
  channel: MessageChannel
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
  totalTargets: number
  sentCount: number
  deliveredCount: number
  openedCount: number
  repliedCount: number
  failedCount: number
  scheduledAt?: string
  completedAt?: string
  createdAt: string
}

const DEMO_CAMPAIGNS: Campaign[] = []

const STATUS_CONFIG: Record<Campaign['status'], { label: string; color: string; icon: React.ElementType }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600', icon: Clock },
  SCHEDULED: { label: 'Planifiée', color: 'bg-blue-50 text-blue-700', icon: Clock },
  RUNNING: { label: 'En cours', color: 'bg-green-50 text-green-700', icon: Play },
  COMPLETED: { label: 'Terminée', color: 'bg-purple-50 text-purple-700', icon: CheckCircle },
  PAUSED: { label: 'En pause', color: 'bg-amber-50 text-amber-700', icon: Pause },
  CANCELLED: { label: 'Annulée', color: 'bg-red-50 text-red-600', icon: XCircle },
}

const CHANNEL_CONFIG: Record<MessageChannel, { icon: React.ElementType; color: string; label: string }> = {
  SMS: { icon: MessageSquare, color: 'text-blue-500', label: 'SMS' },
  WHATSAPP: { icon: MessageSquare, color: 'text-green-500', label: 'WhatsApp' },
  EMAIL: { icon: Mail, color: 'text-purple-500', label: 'Email' },
}

function CampaignsPageInner() {
  const STORAGE_KEY = 'relancepro_campaigns'
  const searchParams = useSearchParams()

  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setCampaigns(JSON.parse(saved))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns)) } catch {}
  }, [campaigns, hydrated])

  // Pré-remplir depuis un template (/campaigns?template=ID)
  useEffect(() => {
    const templateId = searchParams.get('template')
    if (!templateId || !hydrated) return
    try {
      const stored = localStorage.getItem('relancepro_templates')
      if (!stored) return
      const templates = JSON.parse(stored)
      const t = templates.find((x: { id: string }) => x.id === templateId)
      if (!t) return
      setNewCampaign(prev => ({
        ...prev,
        name: t.name,
        channel: t.channel,
        customContent: t.content,
        imageUrl: '',
      }))
      setActiveTab('create')
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, searchParams])

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list')
  const [filterStatus, setFilterStatus] = useState<Campaign['status'] | ''>('')
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null)
  const [sendResult, setSendResult] = useState<{ total: number; sent: number; failed: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    channel: 'SMS' as MessageChannel,
    filterCategory: '',
    filterStatus: '',
    filterCity: '',
    customContent: '',
    imageUrl: '',
    scheduledAt: '',
  })
  const [showPreview, setShowPreview] = useState(false)
  const [campaignAttachments, setCampaignAttachments] = useState<{ name: string; content: string; size: number }[]>([])

  const handleCampaignFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setCampaignAttachments(prev => [...prev, { name: file.name, content: base64, size: file.size }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeCampaignAttachment = (index: number) => {
    setCampaignAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const buildCampaignHtml = (body: string, imageUrl: string) => {
    const bodyHtml = body.replace(/\n/g, '<br/>')
    const imgBlock = imageUrl ? `<div style="text-align:center;margin:20px 0"><img src="${imageUrl}" alt="" style="max-width:100%;border-radius:8px" /></div>` : ''
    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
${imgBlock}
<div style="line-height:1.6">${bodyHtml}</div>
<hr style="margin:30px 0;border:none;border-top:1px solid #eee"/>
<table style="font-size:14px;color:#444;line-height:1.6">
  <tr><td style="font-weight:bold;font-size:15px">Stephen BASPIN</td></tr>
  <tr><td style="color:#666">Conseiller commercial</td></tr>
  <tr><td>📞 <a href="tel:+596696686269" style="color:#444;text-decoration:none">06 96 68 62 69</a></td></tr>
  <tr><td>✉️ <a href="mailto:contact@stephenlils.com" style="color:#444;text-decoration:none">contact@stephenlils.com</a></td></tr>
</table>
</body></html>`
  }

  const annulerEnvoi = () => {
    abortRef.current?.abort()
  }

  const supprimerCampagne = (id: string) => {
    if (!window.confirm('Supprimer cette campagne ?')) return
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  const lancerCampagne = async () => {
    if (!newCampaign.name || !newCampaign.customContent) {
      alert('Donnez un nom et un message à la campagne.')
      return
    }

    const { getProspects } = await import('@/lib/prospect-store')
    const channel = newCampaign.channel

    // Filtrer selon le canal : email ou téléphone
    let targets = getProspects().filter(p => channel === 'EMAIL' ? !!p.email : !!p.phone)
    if (newCampaign.filterCategory) targets = targets.filter(p => p.category === newCampaign.filterCategory)
    if (newCampaign.filterStatus) targets = targets.filter(p => p.status === newCampaign.filterStatus)
    if (newCampaign.filterCity) targets = targets.filter(p => p.city?.toLowerCase().includes(newCampaign.filterCity.toLowerCase()))

    if (targets.length === 0) {
      alert(`Aucun prospect avec un ${channel === 'EMAIL' ? 'email' : 'numéro de téléphone'} ne correspond à vos filtres.`)
      return
    }

    const channelLabel = channel === 'EMAIL' ? 'email' : channel === 'SMS' ? 'SMS' : 'WhatsApp'
    const ok = window.confirm(`Envoyer "${newCampaign.name}" à ${targets.length} prospect(s) par ${channelLabel} ?`)
    if (!ok) return

    const controller = new AbortController()
    abortRef.current = controller
    setSending(true)
    setSendResult(null)
    setSendProgress({ done: 0, total: targets.length })
    setActiveTab('list')

    const htmlContent = buildCampaignHtml(newCampaign.customContent, newCampaign.imageUrl)
    const textContent = newCampaign.customContent
    const campaignName = newCampaign.name
    const attachmentsSnapshot = campaignAttachments.map(a => ({ name: a.name, content: a.content }))
    setNewCampaign({ name: '', channel: 'SMS', filterCategory: '', filterStatus: '', filterCity: '', customContent: '', imageUrl: '', scheduledAt: '' })
    setCampaignAttachments([])

    let sent = 0
    let failed = 0
    let cancelled = false

    const BATCH = 5
    for (let i = 0; i < targets.length; i += BATCH) {
      if (controller.signal.aborted) { cancelled = true; break }
      const batch = targets.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        batch.map(prospect => {
          if (channel === 'EMAIL') {
            return fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                to: prospect.email,
                toName: `${prospect.firstName ?? ''} ${prospect.lastName}`.trim(),
                subject: campaignName,
                htmlContent,
                textContent,
                attachments: attachmentsSnapshot,
              }),
            }).then(r => r.ok ? 'ok' : 'fail').catch(e => e?.name === 'AbortError' ? 'abort' : 'fail')
          } else if (channel === 'SMS') {
            return fetch('/api/sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                to: prospect.phone,
                message: textContent,
                prospectId: prospect.id,
              }),
            }).then(r => r.ok ? 'ok' : 'fail').catch(e => e?.name === 'AbortError' ? 'abort' : 'fail')
          } else {
            // WhatsApp
            return fetch('/api/whatsapp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                to: prospect.phone,
                message: textContent,
                prospectId: prospect.id,
              }),
            }).then(r => r.ok ? 'ok' : 'fail').catch(e => e?.name === 'AbortError' ? 'abort' : 'fail')
          }
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value === 'ok') sent++
          else if (r.value === 'abort') { cancelled = true }
          else failed++
        } else failed++
      }
      setSendProgress({ done: Math.min(i + BATCH, targets.length), total: targets.length })
      if (cancelled) break
    }

    const newCamp: Campaign = {
      id: crypto.randomUUID(),
      name: campaignName,
      channel,
      status: cancelled ? 'CANCELLED' : 'COMPLETED',
      totalTargets: targets.length,
      sentCount: sent,
      deliveredCount: sent,
      openedCount: 0,
      repliedCount: 0,
      failedCount: failed,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    setCampaigns(prev => [newCamp, ...prev])
    setSendResult({ total: targets.length, sent, failed })
    setSending(false)
    setSendProgress(null)
    abortRef.current = null
  }

  const filtered = campaigns.filter(c => !filterStatus || c.status === filterStatus)

  const totalStats = campaigns.reduce((acc, c) => ({
    sent: acc.sent + c.sentCount,
    delivered: acc.delivered + c.deliveredCount,
    replied: acc.replied + c.repliedCount,
  }), { sent: 0, delivered: 0, replied: 0 })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Campagnes" subtitle="Gérez vos campagnes SMS, WhatsApp et Email" />

      {/* Stats globales */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-8">
          {[
            { label: 'Total envoyés', value: totalStats.sent, icon: Send, color: 'text-blue-600' },
            { label: 'Délivrés', value: totalStats.delivered, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Réponses reçues', value: totalStats.replied, icon: MessageSquare, color: 'text-orange-600' },
            {
              label: 'Taux de réponse',
              value: totalStats.sent > 0 ? `${Math.round((totalStats.replied / totalStats.sent) * 100)}%` : '0%',
              icon: BarChart2,
              color: 'text-purple-600'
            },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="flex items-center gap-3">
                <Icon className={cn('w-5 h-5', stat.color)} />
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
          {[
            { id: 'list', label: 'Mes campagnes' },
            { id: 'create', label: '+ Nouvelle campagne' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'list' && (
            <div className="space-y-4">

              {/* Barre de progression envoi en cours */}
              {sending && sendProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-semibold text-blue-800">
                        Envoi en cours — {sendProgress.done}/{sendProgress.total} messages
                      </p>
                    </div>
                    <button
                      onClick={annulerEnvoi}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Annuler l'envoi
                    </button>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(sendProgress.done / sendProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Résultat dernier envoi */}
              {sendResult && !sending && (
                <div className={cn(
                  'border rounded-xl p-4 flex items-center gap-3',
                  sendResult.sent > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                )}>
                  {sendResult.sent > 0
                    ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  }
                  <div>
                    <p className={cn('text-sm font-semibold', sendResult.sent > 0 ? 'text-green-800' : 'text-amber-800')}>
                      {sendResult.sent > 0 ? 'Campagne envoyée !' : 'Campagne annulée'}
                    </p>
                    <p className={cn('text-sm', sendResult.sent > 0 ? 'text-green-700' : 'text-amber-700')}>
                      {sendResult.sent} email{sendResult.sent > 1 ? 's' : ''} envoyé{sendResult.sent > 1 ? 's' : ''} sur {sendResult.total} cibles
                      {sendResult.failed > 0 && ` — ${sendResult.failed} échec(s)`}
                    </p>
                  </div>
                  <button onClick={() => setSendResult(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Filtres statut */}
              <div className="flex gap-2 flex-wrap">
                {(['', 'RUNNING', 'COMPLETED', 'CANCELLED', 'SCHEDULED', 'DRAFT'] as (Campaign['status'] | '')[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      filterStatus === s
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {s ? STATUS_CONFIG[s].label : 'Toutes'}
                  </button>
                ))}
              </div>

              {/* Liste */}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Send className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-lg font-medium text-gray-500">Aucune campagne</p>
                  <p className="text-sm mt-1">Créez votre première campagne SMS, WhatsApp ou Email</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle campagne
                  </button>
                </div>
              )}

              {filtered.map(campaign => {
                const statusConfig = STATUS_CONFIG[campaign.status]
                const StatusIcon = statusConfig.icon
                const channelConfig = CHANNEL_CONFIG[campaign.channel]
                const ChannelIcon = channelConfig.icon
                const responseRate = campaign.sentCount > 0
                  ? Math.round((campaign.repliedCount / campaign.sentCount) * 100)
                  : 0

                return (
                  <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <ChannelIcon className={cn('w-5 h-5', channelConfig.color)} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{channelConfig.label}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-500">{campaign.totalTargets} cibles</span>
                            {campaign.scheduledAt && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-xs text-gray-500">Planifiée {formatDate(campaign.scheduledAt)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', statusConfig.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        <button
                          onClick={() => supprimerCampagne(campaign.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {campaign.sentCount > 0 && (
                      <>
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                          <div
                            className="bg-gradient-to-r from-brand-500 to-tropical-teal h-2 rounded-full"
                            style={{ width: `${campaign.totalTargets > 0 ? (campaign.sentCount / campaign.totalTargets) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { label: 'Envoyés', value: campaign.sentCount, color: 'text-gray-700' },
                            { label: 'Délivrés', value: campaign.deliveredCount, color: 'text-blue-600' },
                            { label: 'Réponses', value: campaign.repliedCount, color: 'text-green-600' },
                            { label: 'Taux réponse', value: `${responseRate}%`, color: responseRate > 15 ? 'text-green-600' : responseRate > 5 ? 'text-orange-500' : 'text-red-500' },
                          ].map(stat => (
                            <div key={stat.label} className="text-center">
                              <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                              <p className="text-xs text-gray-400">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="max-w-2xl space-y-5">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Nouvelle campagne</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la campagne</label>
                    <input
                      type="text"
                      value={newCampaign.name}
                      onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Relance Solaire Juillet 2025"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Canal d'envoi</label>
                    <div className="flex gap-3">
                      {(['SMS', 'WHATSAPP', 'EMAIL'] as MessageChannel[]).map(ch => {
                        const config = CHANNEL_CONFIG[ch]
                        const Icon = config.icon
                        return (
                          <button
                            key={ch}
                            onClick={() => setNewCampaign(p => ({ ...p, channel: ch }))}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                              newCampaign.channel === ch
                                ? 'border-brand-400 bg-brand-50 text-brand-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            )}
                          >
                            <Icon className={cn('w-4 h-4', config.color)} />
                            {config.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer les cibles</label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={newCampaign.filterCategory}
                        onChange={e => setNewCampaign(p => ({ ...p, filterCategory: e.target.value }))}
                        className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                      >
                        <option value="">Toutes les activités</option>
                        <option value="PANNEAUX_SOLAIRES">Panneaux Solaires</option>
                        <option value="INTERNET_FIBRE">Internet / Fibre</option>
                        <option value="ISOLATION_THERMIQUE">Isolation Thermique</option>
                        <option value="CLIMATISATION">Climatisation</option>
                        <option value="BRASSEURS_AIR">Brasseurs d'Air</option>
                      </select>
                      <select
                        value={newCampaign.filterStatus}
                        onChange={e => setNewCampaign(p => ({ ...p, filterStatus: e.target.value }))}
                        className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none"
                      >
                        <option value="">Tous les statuts</option>
                        <option value="NEW">Nouveau</option>
                        <option value="TO_CONTACT">À contacter</option>
                        <option value="CALLBACK">Rappel</option>
                        <option value="INTERESTED">Intéressé</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville / Secteur (optionnel)</label>
                    <input
                      type="text"
                      value={newCampaign.filterCity}
                      onChange={e => setNewCampaign(p => ({ ...p, filterCity: e.target.value }))}
                      placeholder="Ex: Fort-de-France"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400"
                    />
                  </div>

                  {newCampaign.channel === 'EMAIL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Image className="w-4 h-4 text-gray-400" />
                        Image dans l'email (URL optionnel)
                      </label>
                      <input
                        type="url"
                        value={newCampaign.imageUrl}
                        onChange={e => setNewCampaign(p => ({ ...p, imageUrl: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400"
                      />
                      {newCampaign.imageUrl && (
                        <img src={newCampaign.imageUrl} alt="Aperçu" className="mt-2 rounded-lg max-h-28 object-cover w-full" onError={e => (e.currentTarget.style.display = 'none')} />
                      )}
                    </div>
                  )}

                  {newCampaign.channel === 'EMAIL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        Pièces jointes (optionnel)
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Cliquez pour joindre un fichier</span>
                        <input type="file" multiple className="hidden" onChange={handleCampaignFileAttach} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls" />
                      </label>
                      {campaignAttachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {campaignAttachments.map((att, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-brand-50 rounded-lg border border-brand-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                                <span className="text-xs text-brand-800 font-medium truncate">{att.name}</span>
                                <span className="text-xs text-brand-400 flex-shrink-0">({Math.round(att.size / 1024)} Ko)</span>
                              </div>
                              <button onClick={() => removeCampaignAttachment(i)} className="ml-2 text-brand-300 hover:text-red-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={newCampaign.customContent}
                      onChange={e => setNewCampaign(p => ({ ...p, customContent: e.target.value }))}
                      placeholder="Rédigez votre message ou sélectionnez un template..."
                      className="w-full h-32 px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none outline-none focus:border-brand-400"
                    />
                    <span className="text-xs text-gray-400">{newCampaign.customContent.length} caractères</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Planification</label>
                    <input
                      type="datetime-local"
                      value={newCampaign.scheduledAt}
                      onChange={e => setNewCampaign(p => ({ ...p, scheduledAt: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    {newCampaign.channel === 'EMAIL' && newCampaign.customContent && (
                      <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 px-4 py-3 border border-brand-300 text-brand-600 font-medium rounded-xl hover:bg-brand-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Aperçu
                      </button>
                    )}
                    <button
                      onClick={lancerCampagne}
                      disabled={sending}
                      className="flex-1 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Créer la campagne
                    </button>
                    <button
                      onClick={() => setActiveTab('list')}
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-800 mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Envoi de messages
                </p>
                <p className="text-sm text-amber-700">
                  Connectez Twilio (SMS), Meta Business (WhatsApp) ou Brevo (Email) pour activer l'envoi réel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Aperçu Email Campagne */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-semibold text-gray-900">Aperçu de l'email</h2>
                {newCampaign.name && <span className="text-sm text-gray-400">— {newCampaign.name}</span>}
              </div>
              <button onClick={() => setShowPreview(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <iframe
                srcDoc={buildCampaignHtml(newCampaign.customContent, newCampaign.imageUrl)}
                className="w-full h-full rounded-lg border border-gray-100"
                style={{ minHeight: '400px' }}
                title="Aperçu email campagne"
              />
            </div>
            <div className="flex justify-end p-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowPreview(false)} className="px-5 py-2 text-sm text-gray-600 font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400">Chargement…</div>}>
      <CampaignsPageInner />
    </Suspense>
  )
}
