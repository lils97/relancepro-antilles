'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import {
  Phone, Mail, MapPin, ArrowLeft, Flame,
  MessageSquare, Send, Calendar, FileText, Paperclip,
  CheckCircle, Activity, Plus, Trash2, ArrowDownLeft, ArrowUpRight,
  Euro, Eye, Image, X as XIcon, Pencil, Save,
} from 'lucide-react'
import {
  CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS, STATUS_COLORS,
  type ProspectStatus,
} from '@/types'
import { cn, formatDateTime, formatCurrency, getInitials } from '@/lib/utils'
import { formatPhoneDisplay } from '@/lib/phone-utils'
import type { Activity as ActivityType } from '@/lib/activity-store'

const ACTIVITY_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  EMAIL_SENT:     { icon: ArrowUpRight,  color: 'text-purple-500 bg-purple-50', label: 'Email envoyé' },
  EMAIL_RECEIVED: { icon: ArrowDownLeft, color: 'text-green-600 bg-green-50',   label: 'Réponse reçue' },
  NOTE_ADDED:     { icon: FileText,      color: 'text-gray-500 bg-gray-50',     label: 'Note' },
  CALL_OUTGOING:  { icon: Phone,         color: 'text-orange-500 bg-orange-50', label: 'Appel' },
  SMS_SENT:       { icon: Send,          color: 'text-blue-500 bg-blue-50',     label: 'SMS envoyé' },
  WHATSAPP_SENT:  { icon: MessageSquare, color: 'text-green-500 bg-green-50',   label: 'WhatsApp' },
  STATUS_CHANGED: { icon: Activity,      color: 'text-cyan-500 bg-cyan-50',     label: 'Statut modifié' },
}

const tabs = ['Vue générale', 'Messages', 'Historique', 'Documents', 'Tâches']

export default function ProspectDetailPage() {
  const params = useParams()
  const [prospect, setProspect] = useState<import('@/types').Prospect | null | undefined>(undefined)
  const [activeTab, setActiveTab] = useState('Vue générale')
  const [newNote, setNewNote] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ProspectStatus>('NEW')
  const [activities, setActivities] = useState<ActivityType[]>([])

  // Modal édition prospect
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    city: '', postalCode: '', category: 'PANNEAUX_SOLAIRES' as import('@/types').Prospect['category'],
    project: '', budget: '', comment: '', consentSms: false, consentEmail: false,
    status: 'NEW' as import('@/types').Prospect['status'],
    contractValue: '', signedAt: '',
  })

  const openEditModal = () => {
    if (!prospect) return
    setEditForm({
      firstName: prospect.firstName ?? '',
      lastName: prospect.lastName,
      phone: prospect.phone ?? '',
      email: prospect.email ?? '',
      city: prospect.city ?? '',
      postalCode: prospect.postalCode ?? '',
      category: prospect.category,
      project: prospect.project ?? '',
      budget: prospect.budget ? String(prospect.budget) : '',
      comment: prospect.comment ?? '',
      consentSms: prospect.consentSms,
      consentEmail: prospect.consentEmail,
      status: prospect.status,
      contractValue: prospect.contractValue ? String(prospect.contractValue) : '',
      signedAt: prospect.signedAt ? prospect.signedAt.slice(0, 10) : '',
    })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!prospect || !editForm.lastName) return
    const { updateProspect } = await import('@/lib/prospect-store')
    updateProspect(prospect.id, {
      firstName: editForm.firstName || undefined,
      lastName: editForm.lastName,
      phone: editForm.phone || undefined,
      email: editForm.email || undefined,
      city: editForm.city || undefined,
      postalCode: editForm.postalCode || undefined,
      category: editForm.category,
      status: editForm.status,
      project: editForm.project || undefined,
      budget: editForm.budget ? Number(editForm.budget) : undefined,
      comment: editForm.comment || undefined,
      consentSms: editForm.consentSms,
      consentEmail: editForm.consentEmail,
      contractValue: editForm.contractValue ? Number(editForm.contractValue) : undefined,
      signedAt: editForm.signedAt ? new Date(editForm.signedAt).toISOString() : undefined,
    })
    // Recharger le prospect
    const { getProspects } = await import('@/lib/prospect-store')
    const updated = getProspects().find(p => p.id === prospect.id) ?? null
    setProspect(updated)
    setShowEditModal(false)
  }

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailImageUrl, setEmailImageUrl] = useState('')
  const [emailAttachments, setEmailAttachments] = useState<{ name: string; content: string; size: number }[]>([])
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  // Modal réponse manuelle
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [replySubject, setReplySubject] = useState('')

  // Modal SMS
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Modal WhatsApp
  const [showWaModal, setShowWaModal] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [waImageUrl, setWaImageUrl] = useState('')
  const [waImageCaption, setWaImageCaption] = useState('')
  const [waWithImage, setWaWithImage] = useState(false)
  const [waUploading, setWaUploading] = useState(false)
  const [waSending, setWaSending] = useState(false)
  const [waResult, setWaResult] = useState<{ ok: boolean; message: string } | null>(null)

  const sendSms = async () => {
    if (!prospect?.phone || !smsMessage) return
    setSmsSending(true)
    setSmsResult(null)
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: prospect.phone, message: smsMessage, prospectId: prospect.id }),
      })
      const data = await res.json()
      if (res.ok) {
        setSmsResult({ ok: true, message: 'SMS envoyé !' })
        loadActivities(prospect.id)
        setTimeout(() => { setShowSmsModal(false); setSmsResult(null); setSmsMessage('') }, 2000)
      } else {
        setSmsResult({ ok: false, message: data.error || 'Erreur envoi SMS' })
      }
    } catch { setSmsResult({ ok: false, message: 'Erreur réseau' }) }
    finally { setSmsSending(false) }
  }

  const sendWhatsApp = async () => {
    if (!prospect?.phone) return
    if (!waWithImage && !waMessage) return
    if (waWithImage && !waImageUrl) return
    setWaSending(true)
    setWaResult(null)
    try {
      const payload: Record<string, unknown> = {
        to: prospect.phone,
        prospectId: prospect.id,
      }
      if (waWithImage) {
        payload.imageUrl = waImageUrl
        payload.caption = waImageCaption || waMessage
        payload.type = 'image'
      } else {
        payload.message = waMessage
        payload.type = 'text'
      }
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setWaResult({ ok: true, message: 'WhatsApp envoyé !' })
        loadActivities(prospect.id)
        setTimeout(() => {
          setShowWaModal(false)
          setWaResult(null)
          setWaMessage('')
          setWaImageUrl('')
          setWaImageCaption('')
          setWaWithImage(false)
        }, 2000)
      } else {
        setWaResult({ ok: false, message: data.error || 'Erreur envoi WhatsApp' })
      }
    } catch { setWaResult({ ok: false, message: 'Erreur réseau' }) }
    finally { setWaSending(false) }
  }

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setEmailAttachments(prev => [...prev, { name: file.name, content: base64, size: file.size }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const buildEmailHtml = (body: string, imageUrl: string) => {
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

  const sendEmail = async () => {
    if (!prospect?.email || !emailSubject || !emailBody) return
    setEmailSending(true)
    setEmailResult(null)
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: prospect.email,
          toName: `${prospect.firstName ?? ''} ${prospect.lastName}`.trim(),
          subject: emailSubject,
          htmlContent: buildEmailHtml(emailBody, emailImageUrl),
          textContent: emailBody,
          attachments: emailAttachments.map(a => ({ name: a.name, content: a.content })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailResult({ ok: true, message: 'Email envoyé avec succès !' })
        loadActivities(prospect.id)
        setTimeout(() => { setShowEmailModal(false); setEmailResult(null); setEmailSubject(''); setEmailBody(''); setEmailImageUrl(''); setEmailAttachments([]) }, 2000)
      } else {
        setEmailResult({ ok: false, message: data.error || 'Erreur lors de l\'envoi' })
      }
    } catch {
      setEmailResult({ ok: false, message: 'Erreur réseau' })
    } finally {
      setEmailSending(false)
    }
  }

  const loadActivities = (prospectId: string) => {
    import('@/lib/activity-store').then(({ getActivitiesForProspect }) => {
      setActivities(getActivitiesForProspect(prospectId))
    })
  }

  useEffect(() => {
    import('@/lib/prospect-store').then(({ getProspects }) => {
      const found = getProspects().find(p => p.id === params.id) ?? null
      setProspect(found)
      if (found) {
        setSelectedStatus(found.status)
        loadActivities(found.id)
      }
    })
  }, [params.id])

  const addManualReply = async () => {
    if (!replyContent || !prospect) return
    const { addActivity } = await import('@/lib/activity-store')
    addActivity({
      prospectId: prospect.id,
      type: 'EMAIL_RECEIVED',
      subject: replySubject || '(réponse client)',
      content: replyContent,
      fromEmail: prospect.email,
      fromName: `${prospect.firstName ?? ''} ${prospect.lastName}`.trim(),
    })
    setReplyContent('')
    setReplySubject('')
    setShowReplyModal(false)
    loadActivities(prospect.id)
  }

  const deleteActivityItem = async (id: string) => {
    if (!prospect) return
    const { deleteActivity } = await import('@/lib/activity-store')
    deleteActivity(id)
    loadActivities(prospect.id)
  }

  if (prospect === undefined) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Chargement..." subtitle="" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!prospect) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Prospect introuvable" subtitle="" />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <p className="text-lg font-medium mb-2">Ce prospect n'existe pas</p>
          <Link href="/prospects" className="text-brand-600 text-sm hover:text-brand-700">← Retour à la liste</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={`${prospect.firstName ?? ''} ${prospect.lastName}`}
        subtitle={`${CATEGORY_ICONS[prospect.category]} ${CATEGORY_LABELS[prospect.category]} • ${prospect.city ?? ''}`}
      />

      <div className="flex-1 overflow-hidden flex">
        {/* Colonne gauche — Info prospect */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          {/* Back + Avatar */}
          <div className="p-5 border-b border-gray-100">
            <Link href="/prospects" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-tropical-teal rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-3">
                {getInitials(prospect.firstName, prospect.lastName)}
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {prospect.firstName} {prospect.lastName}
              </h2>
              <p className="text-sm text-gray-500">{prospect.city}</p>

              {/* Score IA */}
              <div className={cn(
                'mt-3 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold',
                prospect.aiScoreLabel === 'HIGH' && 'bg-red-50 text-red-700',
                prospect.aiScoreLabel === 'MEDIUM' && 'bg-orange-50 text-orange-700',
                prospect.aiScoreLabel === 'LOW' && 'bg-green-50 text-green-700',
              )}>
                {prospect.aiScoreLabel === 'HIGH' && '🔥'}
                {prospect.aiScoreLabel === 'MEDIUM' && '🟠'}
                {prospect.aiScoreLabel === 'LOW' && '🟢'}
                <span>Score {prospect.aiScore}/100</span>
              </div>
            </div>
          </div>

          {/* Statut */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Statut</p>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as ProspectStatus)}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm font-medium border cursor-pointer outline-none',
                STATUS_COLORS[selectedStatus]
              )}
            >
              {(Object.keys(STATUS_LABELS) as ProspectStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Coordonnées */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Coordonnées</p>

            {prospect.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatPhoneDisplay(prospect.phone)}</p>
                  <p className="text-xs text-gray-400">{prospect.phoneCountry}</p>
                </div>
              </div>
            )}

            {prospect.email && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 break-all">{prospect.email}</p>
              </div>
            )}

            {prospect.city && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">{prospect.city}, {prospect.country}</p>
              </div>
            )}
          </div>

          {/* Projet */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projet</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Activité</span>
                <span className="text-sm font-medium">{CATEGORY_ICONS[prospect.category]} {CATEGORY_LABELS[prospect.category]}</span>
              </div>
              {prospect.project && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-500 flex-shrink-0">Projet</span>
                  <span className="text-sm font-medium text-right">{prospect.project}</span>
                </div>
              )}
              {prospect.budget && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Budget</span>
                  <span className="text-sm font-semibold text-green-700">{formatCurrency(prospect.budget)}</span>
                </div>
              )}
              {prospect.contractValue && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Contrat signé</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(prospect.contractValue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {prospect.tags.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {prospect.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions rapides */}
          <div className="p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Actions</p>
            <button
              onClick={openEditModal}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Modifier le prospect
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
              <Phone className="w-4 h-4" />
              Appeler maintenant
            </button>
            <button
              onClick={() => {
                if (!prospect.phone) return alert('Ce prospect n\'a pas de numéro de téléphone.')
                setShowSmsModal(true)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Envoyer SMS
            </button>
            <button
              onClick={() => {
                if (!prospect.phone) return alert('Ce prospect n\'a pas de numéro de téléphone.')
                setShowWaModal(true)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Envoyer WhatsApp
            </button>
            <button
              onClick={() => {
                if (!prospect.email) return alert('Ce prospect n\'a pas d\'adresse email.')
                setShowEmailModal(true)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Envoyer Email
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
              <Calendar className="w-4 h-4" />
              Programmer RDV
            </button>
          </div>
        </div>

        {/* Colonne droite — Contenu principal */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-6 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'Vue générale' && (() => {
              // --- Calcul dynamique des scores ---
              const statusScores: Record<string, number> = {
                NEW: 5, TO_CONTACT: 8, CALLBACK: 14, INTERESTED: 20, APPOINTMENT: 18, SIGNED: 20, LOST: 0,
              }
              const interestScore = statusScores[prospect.status] ?? 5
              const interestBonus = prospect.project ? 5 : 0
              const interestBudget = prospect.budget ? 5 : 0
              const interestTotal = Math.min(interestScore + interestBonus + interestBudget, 20)

              const reactScore = (prospect.phone ? 12 : 0) + (prospect.email ? 8 : 0) + (prospect.consentSms ? 3 : 0) + (prospect.consentEmail ? 2 : 0)
              const reactTotal = Math.min(reactScore, 25)

              const locTotal = (prospect.city ? 8 : 0) + (prospect.postalCode ? 4 : 0) + (prospect.country ? 3 : 0)

              const emailsSent = activities.filter(a => a.type === 'EMAIL_SENT').length
              const emailsRecv = activities.filter(a => a.type === 'EMAIL_RECEIVED').length
              const smsSent = activities.filter(a => a.type === 'SMS_SENT').length
              const waSent = activities.filter(a => a.type === 'WHATSAPP_SENT').length
              const interactTotal = Math.min(emailsSent * 3 + emailsRecv * 5 + smsSent * 2 + waSent * 2, 20)

              const histTotal = Math.min(activities.length * 3 + (emailsRecv > 0 ? 8 : 0), 20)

              const totalScore = reactTotal + histTotal + interestTotal + locTotal + interactTotal

              // Recommandation dynamique
              let recommandation = ''
              if (prospect.status === 'SIGNED') recommandation = 'Contrat signé — pensez à demander une recommandation client.'
              else if (prospect.status === 'LOST') recommandation = 'Prospect perdu. Tentez une relance après 3 mois avec une nouvelle offre.'
              else if (prospect.status === 'APPOINTMENT') recommandation = 'RDV planifié — préparez votre argumentaire et votre devis.'
              else if (prospect.status === 'INTERESTED') recommandation = 'Prospect chaud ! Envoyez un devis ou planifiez un RDV rapidement.'
              else if (prospect.status === 'CALLBACK') recommandation = 'À rappeler — contactez-le dans les 24h pour maintenir l\'intérêt.'
              else if (!prospect.phone && !prospect.email) recommandation = 'Aucune coordonnée — complétez la fiche pour pouvoir le contacter.'
              else if (activities.length === 0) recommandation = 'Aucune interaction — envoyez un premier message pour initier le contact.'
              else recommandation = 'Continuez les relances régulières pour maintenir l\'engagement.'

              const factors = [
                { label: 'Réactivité', score: reactTotal, max: 25, color: 'bg-blue-500' },
                { label: 'Historique', score: histTotal, max: 20, color: 'bg-orange-500' },
                { label: 'Intérêt projet', score: interestTotal, max: 20, color: 'bg-green-500' },
                { label: 'Localisation', score: locTotal, max: 15, color: 'bg-purple-500' },
                { label: 'Interactions', score: interactTotal, max: 20, color: 'bg-cyan-500' },
              ]

              return (
              <div className="space-y-6">
                {/* Scoring détaillé */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-red-500" />
                      Score IA — Analyse complète
                    </h3>
                    <span className={cn(
                      'text-lg font-bold px-3 py-1 rounded-full',
                      totalScore >= 65 ? 'bg-red-50 text-red-700' : totalScore >= 35 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'
                    )}>{totalScore}/100</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {factors.map(factor => (
                      <div key={factor.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">{factor.label}</span>
                          <span className="text-sm font-semibold">{factor.score}/{factor.max}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={cn('h-2 rounded-full transition-all', factor.color)}
                            style={{ width: `${(factor.score / factor.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 mb-1">💡 Recommandation</p>
                    <p className="text-sm text-amber-700">{recommandation}</p>
                  </div>
                </div>

                {/* Commentaire */}
                {prospect.comment && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">Commentaire</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{prospect.comment}</p>
                  </div>
                )}

                {/* Note rapide */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Ajouter une note</h3>
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Entrez votre note ici..."
                    className="w-full h-24 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none outline-none focus:border-brand-400 transition-colors"
                  />
                  <div className="flex justify-end mt-2">
                    <button className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
              )
            })()}

            {activeTab === 'Messages' && (
              <div className="space-y-4">
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!prospect.email) return alert('Ce prospect n\'a pas d\'email.')
                      setShowEmailModal(true)
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Envoyer un email
                  </button>
                  <button
                    onClick={() => setShowReplyModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    Enregistrer une réponse reçue
                  </button>
                </div>

                {/* Timeline messages */}
                {activities.filter(a => a.type === 'EMAIL_SENT' || a.type === 'EMAIL_RECEIVED').length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun message pour l'instant</p>
                    <p className="text-xs mt-1">Envoyez un email ou enregistrez une réponse client</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities
                      .filter(a => a.type === 'EMAIL_SENT' || a.type === 'EMAIL_RECEIVED')
                      .map(activity => {
                        const isSent = activity.type === 'EMAIL_SENT'
                        return (
                          <div
                            key={activity.id}
                            className={cn(
                              'bg-white rounded-xl border p-4',
                              isSent ? 'border-purple-100' : 'border-green-100'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                  isSent ? 'bg-purple-100' : 'bg-green-100'
                                )}>
                                  {isSent
                                    ? <ArrowUpRight className="w-4 h-4 text-purple-600" />
                                    : <ArrowDownLeft className="w-4 h-4 text-green-600" />
                                  }
                                </div>
                                <div>
                                  <p className={cn('text-xs font-semibold', isSent ? 'text-purple-700' : 'text-green-700')}>
                                    {isSent ? 'Email envoyé' : `Réponse de ${activity.fromName || prospect.lastName}`}
                                  </p>
                                  {activity.subject && (
                                    <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400">{formatDateTime(activity.createdAt)}</span>
                                <button
                                  onClick={() => deleteActivityItem(activity.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {activity.content && (
                              <div className="mt-3 pl-10">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{activity.content}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Historique' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Toutes les interactions</h3>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune interaction enregistrée</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                    <div className="space-y-4">
                      {activities.map(activity => {
                        const config = ACTIVITY_ICONS[activity.type] ?? { icon: Activity, color: 'text-gray-500 bg-gray-50', label: 'Activité' }
                        const Icon = config.icon
                        return (
                          <div key={activity.id} className="flex items-start gap-4 relative">
                            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10', config.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-gray-500">{config.label}</p>
                                <p className="text-xs text-gray-400">{formatDateTime(activity.createdAt)}</p>
                              </div>
                              {activity.subject && <p className="text-sm font-medium text-gray-800 mt-0.5">{activity.subject}</p>}
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{activity.content}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Documents' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Documents joints</h3>
                  <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">
                    <Paperclip className="w-3.5 h-3.5" />
                    Joindre un fichier
                  </button>
                </div>
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Déposez vos fichiers ici (devis, contrats, photos)</p>
                </div>
              </div>
            )}

            {activeTab === 'Tâches' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Tâches & RDV</h3>
                  <button className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700">
                    <Calendar className="w-3.5 h-3.5" />
                    Nouvelle tâche
                  </button>
                </div>
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune tâche en cours</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Édition prospect */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Modifier le prospect</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prénom</label>
                  <input type="text" value={editForm.firstName} onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom *</label>
                  <input type="text" value={editForm.lastName} onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléphone</label>
                  <input type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ville</label>
                  <input type="text" value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Code postal</label>
                  <input type="text" value={editForm.postalCode} onChange={e => setEditForm(p => ({ ...p, postalCode: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Activité</label>
                  <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value as typeof editForm.category }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400">
                    <option value="PANNEAUX_SOLAIRES">☀️ Panneaux Solaires</option>
                    <option value="INTERNET_FIBRE">📡 Internet / Fibre</option>
                    <option value="ISOLATION_THERMIQUE">🏠 Isolation Thermique</option>
                    <option value="CLIMATISATION">❄️ Climatisation</option>
                    <option value="BRASSEURS_AIR">💨 Brasseurs d&apos;Air</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</label>
                  <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as typeof editForm.status }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400">
                    <option value="NEW">Nouveau</option>
                    <option value="TO_CONTACT">À contacter</option>
                    <option value="VOICEMAIL">Messagerie</option>
                    <option value="CALLBACK">Rappel</option>
                    <option value="INTERESTED">Intéressé</option>
                    <option value="APPOINTMENT">RDV planifié</option>
                    <option value="QUOTE_SENT">Devis envoyé</option>
                    <option value="WAITING_QUOTE">Attente devis</option>
                    <option value="SIGNED">Signé ✅</option>
                    <option value="LOST">Perdu</option>
                    <option value="STOP">STOP</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projet</label>
                  <input type="text" value={editForm.project} onChange={e => setEditForm(p => ({ ...p, project: e.target.value }))}
                    placeholder="Description du projet..."
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget (€)</label>
                  <input type="number" value={editForm.budget} onChange={e => setEditForm(p => ({ ...p, budget: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commentaire</label>
                <textarea value={editForm.comment} onChange={e => setEditForm(p => ({ ...p, comment: e.target.value }))}
                  rows={3} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-400 resize-none" />
              </div>
              {/* Champs contrat — apparaissent si statut = SIGNED */}
              {editForm.status === 'SIGNED' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <div>
                    <label className="text-xs font-semibold text-green-700 uppercase tracking-wider">Valeur contrat (€)</label>
                    <input type="number" value={editForm.contractValue} onChange={e => setEditForm(p => ({ ...p, contractValue: e.target.value }))}
                      placeholder="Ex: 8500"
                      className="mt-1 w-full px-3 py-2 border border-green-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-green-700 uppercase tracking-wider">Date de signature</label>
                    <input type="date" value={editForm.signedAt} onChange={e => setEditForm(p => ({ ...p, signedAt: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-green-200 rounded-lg text-sm outline-none focus:border-green-400 bg-white" />
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.consentSms} onChange={e => setEditForm(p => ({ ...p, consentSms: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-600">Consent SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.consentEmail} onChange={e => setEditForm(p => ({ ...p, consentEmail: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-600">Consent Email</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm text-gray-600 font-medium">Annuler</button>
              <button
                onClick={saveEdit}
                disabled={!editForm.lastName}
                className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal SMS */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Envoyer un SMS</h2>
              </div>
              <button onClick={() => { setShowSmsModal(false); setSmsResult(null) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">À</label>
                <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                  {prospect.firstName} {prospect.lastName} — {formatPhoneDisplay(prospect.phone || '')}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</label>
                <textarea
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  placeholder="Bonjour, je vous contacte au sujet de..."
                  rows={5}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{smsMessage.length} caractères</p>
              </div>
              {smsResult && (
                <div className={cn('px-4 py-3 rounded-lg text-sm font-medium', smsResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                  {smsResult.ok ? '✅' : '❌'} {smsResult.message}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => { setShowSmsModal(false); setSmsResult(null) }} className="px-4 py-2 text-sm text-gray-600 font-medium">Annuler</button>
              <button
                onClick={sendSms}
                disabled={smsSending || !smsMessage}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {smsSending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                {smsSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal WhatsApp */}
      {showWaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Envoyer un WhatsApp</h2>
              </div>
              <button onClick={() => { setShowWaModal(false); setWaResult(null) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">À</label>
                <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                  {prospect.firstName} {prospect.lastName} — {formatPhoneDisplay(prospect.phone || '')}
                </div>
              </div>

              {/* Toggle image */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWaWithImage(false)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    !waWithImage ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
                  )}
                >
                  💬 Texte
                </button>
                <button
                  onClick={() => setWaWithImage(true)}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    waWithImage ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
                  )}
                >
                  🖼️ Image
                </button>
              </div>

              {!waWithImage ? (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</label>
                  <textarea
                    value={waMessage}
                    onChange={e => setWaMessage(e.target.value)}
                    placeholder="Bonjour, je vous contacte au sujet de..."
                    rows={5}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Image <span className="text-red-500">*</span></label>
                    <div className="mt-1">
                      <label className={cn(
                        'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                        waUploading ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50'
                      )}>
                        {waUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-green-600">Upload en cours...</span>
                          </div>
                        ) : waImageUrl ? (
                          <div className="relative w-full h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={waImageUrl} alt="Aperçu" className="w-full h-full object-cover rounded-lg" />
                            <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-white text-sm font-medium">Changer l'image</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <span className="text-3xl">🖼️</span>
                            <span className="text-sm font-medium">Cliquez pour choisir une image</span>
                            <span className="text-xs">JPG, PNG, WebP — max 5MB</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setWaUploading(true)
                            try {
                              const fd = new FormData()
                              fd.append('file', file)
                              const res = await fetch('/api/upload', { method: 'POST', body: fd })
                              const data = await res.json()
                              if (res.ok) setWaImageUrl(data.url)
                              else setWaResult({ ok: false, message: data.error || 'Erreur upload' })
                            } catch {
                              setWaResult({ ok: false, message: 'Erreur upload' })
                            } finally {
                              setWaUploading(false)
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Légende (optionnel)</label>
                    <textarea
                      value={waImageCaption}
                      onChange={e => setWaImageCaption(e.target.value)}
                      placeholder="Description ou message accompagnant l'image..."
                      rows={3}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none"
                    />
                  </div>
                </div>
              )}

              {waResult && (
                <div className={cn('px-4 py-3 rounded-lg text-sm font-medium', waResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                  {waResult.ok ? '✅' : '❌'} {waResult.message}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => { setShowWaModal(false); setWaResult(null) }} className="px-4 py-2 text-sm text-gray-600 font-medium">Annuler</button>
              <button
                onClick={sendWhatsApp}
                disabled={waSending || (!waWithImage && !waMessage) || (waWithImage && !waImageUrl)}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {waSending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {waSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Réponse reçue */}
      {showReplyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Réponse reçue du client</h2>
              </div>
              <button onClick={() => setShowReplyModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Objet (optionnel)</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={e => setReplySubject(e.target.value)}
                  placeholder="Objet de la réponse..."
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contenu de la réponse</label>
                <textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Copiez ici ce que le client a répondu..."
                  rows={6}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-green-400 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowReplyModal(false)} className="px-4 py-2 text-sm text-gray-600 font-medium">Annuler</button>
              <button
                onClick={addManualReply}
                disabled={!replyContent}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Envoyer un email</h2>
              </div>
              <button
                onClick={() => { setShowEmailModal(false); setEmailResult(null); setEmailImageUrl(''); setEmailAttachments([]) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
              >
                ✕
              </button>
            </div>

            {/* Contenu */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Destinataire */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">À</label>
                <div className="mt-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                  {prospect.firstName} {prospect.lastName} &lt;{prospect.email}&gt;
                </div>
              </div>

              {/* Objet */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Objet</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Objet de votre email..."
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              {/* Image */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Image className="w-3.5 h-3.5" />
                  Image (URL optionnel)
                </label>
                <input
                  type="url"
                  value={emailImageUrl}
                  onChange={e => setEmailImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 transition-colors"
                />
                {emailImageUrl && (
                  <img src={emailImageUrl} alt="Aperçu" className="mt-2 rounded-lg max-h-32 object-cover w-full" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>

              {/* Pièces jointes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  Pièces jointes
                </label>
                <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  <Paperclip className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Cliquez pour joindre un fichier (PDF, image, Word...)</span>
                  <input type="file" multiple className="hidden" onChange={handleFileAttach} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls" />
                </label>
                {emailAttachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {emailAttachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                          <span className="text-xs text-purple-800 font-medium truncate">{att.name}</span>
                          <span className="text-xs text-purple-400 flex-shrink-0">({Math.round(att.size / 1024)} Ko)</span>
                        </div>
                        <button onClick={() => removeAttachment(i)} className="ml-2 text-purple-300 hover:text-purple-600 flex-shrink-0">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Corps */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder={`Bonjour ${prospect.firstName ?? prospect.lastName},\n\n`}
                  rows={7}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-purple-400 transition-colors resize-none"
                />
              </div>

              {/* Résultat */}
              {emailResult && (
                <div className={cn(
                  'px-4 py-3 rounded-lg text-sm font-medium',
                  emailResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                  {emailResult.ok ? '✅' : '❌'} {emailResult.message}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setShowEmailPreview(true)}
                disabled={!emailBody}
                className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 font-medium border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Eye className="w-4 h-4" />
                Aperçu
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowEmailModal(false); setEmailResult(null); setEmailImageUrl(''); setEmailAttachments([]) }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={sendEmail}
                  disabled={emailSending || !emailSubject || !emailBody}
                  className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {emailSending ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {emailSending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Email */}
      {showEmailPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-900">Aperçu de l'email</h2>
                {emailSubject && <span className="text-sm text-gray-400">— {emailSubject}</span>}
              </div>
              <button onClick={() => setShowEmailPreview(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <iframe
                srcDoc={buildEmailHtml(emailBody, emailImageUrl)}
                className="w-full h-full rounded-lg border border-gray-100"
                style={{ minHeight: '400px' }}
                title="Aperçu email"
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setShowEmailPreview(false)} className="px-4 py-2 text-sm text-gray-600 font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                Modifier
              </button>
              <button
                onClick={() => { setShowEmailPreview(false); sendEmail() }}
                disabled={emailSending || !emailSubject || !emailBody}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
