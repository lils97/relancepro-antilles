'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { ArrowLeft, Save, User } from 'lucide-react'
import Link from 'next/link'
import {
  CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS,
  type ProspectCategory, type ProspectStatus,
} from '@/types'
import { cn } from '@/lib/utils'

const CATEGORIES: ProspectCategory[] = [
  'INTERNET_FIBRE', 'PANNEAUX_SOLAIRES', 'ISOLATION_THERMIQUE',
  'CLIMATISATION', 'BRASSEURS_AIR', 'OTHER',
]

const STATUSES: ProspectStatus[] = [
  'NEW', 'TO_CONTACT', 'CALLBACK', 'INTERESTED',
  'APPOINTMENT', 'QUOTE_SENT', 'SIGNED', 'LOST', 'STOP',
]

export default function NewProspectPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    city: '',
    postalCode: '',
    category: 'PANNEAUX_SOLAIRES' as ProspectCategory,
    status: 'NEW' as ProspectStatus,
    comment: '',
    project: '',
    budget: '',
    consentSms: true,
    consentEmail: true,
  })

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!form.lastName) {
      alert('Le nom est obligatoire.')
      return
    }
    if (!form.phone && !form.email) {
      alert('Renseignez au moins un téléphone ou un email.')
      return
    }

    setSaving(true)
    try {
      const { addProspects, importedToProspect } = await import('@/lib/prospect-store')
      const imported = {
        lastName: form.lastName,
        firstName: form.firstName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        city: form.city || undefined,
        postalCode: form.postalCode || undefined,
        country: 'MARTINIQUE',
        category: form.category,
        status: form.status,
        comment: form.comment || undefined,
        project: form.project || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        tags: [],
        consentSms: form.consentSms,
        consentEmail: form.consentEmail,
      }
      const prospect = importedToProspect(imported as unknown as Parameters<typeof importedToProspect>[0])
      addProspects([prospect])
      router.push(`/prospects/${prospect.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Nouveau prospect" subtitle="Ajoutez un prospect manuellement" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <Link href="/prospects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>

          {/* Identité */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Identité
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                  placeholder="DUPONT"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Prénom</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  placeholder="Jean"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="0696 XX XX XX"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="jean@exemple.com"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Ville</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Fort-de-France"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Code postal</label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={e => set('postalCode', e.target.value)}
                  placeholder="97200"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Projet */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Projet</h3>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activité</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => set('category', cat)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                      form.category === cat
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Statut</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description projet</label>
                <input
                  type="text"
                  value={form.project}
                  onChange={e => set('project', e.target.value)}
                  placeholder="Installation 6 panneaux..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Budget (€)</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={e => set('budget', e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Commentaire */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Commentaire</h3>
            <textarea
              value={form.comment}
              onChange={e => set('comment', e.target.value)}
              placeholder="Notes sur ce prospect..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none outline-none focus:border-brand-400 transition-colors"
            />
          </div>

          {/* Consentements */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Consentements RGPD</h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentSms}
                  onChange={e => set('consentSms', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <span className="text-sm text-gray-700">Consent SMS/WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.consentEmail}
                  onChange={e => set('consentEmail', e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <span className="text-sm text-gray-700">Consentement Email</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Enregistrement...' : 'Enregistrer le prospect'}
            </button>
            <Link
              href="/prospects"
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Annuler
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
