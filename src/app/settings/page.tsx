'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { Save, EyeOff, CheckCircle, User, Mail, MessageSquare, Zap, AlertCircle, ShieldCheck, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'relancepro_settings'

interface AppSettings {
  // Profil commercial
  commercialName: string
  commercialPhone: string
  commercialEmail: string
  companyName: string

  // Signature email
  emailSignatureName: string
  emailSignatureTitle: string
  emailSignaturePhone: string
  emailSignatureEmail: string

  // Brevo
  brevoApiKey: string
  brevoSenderEmail: string
  brevoSenderName: string

  // SMS
  smsSenderId: string

  // WhatsApp
  whatsappPhoneNumberId: string
  whatsappVerifyToken: string
}

const DEFAULT_SETTINGS: AppSettings = {
  commercialName: 'Stephen BASPIN',
  commercialPhone: '06 96 68 62 69',
  commercialEmail: 'contact@stephenlils.com',
  companyName: 'Solargeo',

  emailSignatureName: 'Stephen BASPIN',
  emailSignatureTitle: 'Conseiller commercial',
  emailSignaturePhone: '06 96 68 62 69',
  emailSignatureEmail: 'contact@stephenlils.com',

  brevoApiKey: '',
  brevoSenderEmail: 'contact@stephenlils.com',
  brevoSenderName: 'Solargeo',

  smsSenderId: 'Solargeo',

  whatsappPhoneNumberId: '',
  whatsappVerifyToken: 'relancepro_webhook_2025',
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const d = localStorage.getItem(STORAGE_KEY)
    return d ? { ...DEFAULT_SETTINGS, ...JSON.parse(d) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

function saveSettings(s: AppSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

const TABS = [
  { id: 'profile',    label: 'Profil', icon: User },
  { id: 'signature',  label: 'Signature email', icon: Mail },
  { id: 'brevo',      label: 'Brevo (Email & SMS)', icon: MessageSquare },
  { id: 'whatsapp',   label: 'WhatsApp', icon: Zap },
]

interface EnvConfig {
  brevo: { apiKey: { configured: boolean; masked: string }; senderEmail: string; senderName: string }
  sms: { senderId: string }
  whatsapp: { phoneNumberId: string; accessToken: { configured: boolean; masked: string }; verifyToken: string }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [envConfig, setEnvConfig] = useState<EnvConfig | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [showWaToken, setShowWaToken] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    // Charger les valeurs réelles depuis le .env (masquées)
    fetch('/api/config').then(r => r.json()).then(setEnvConfig).catch(() => {})
  }, [])

  const set = (key: keyof AppSettings, value: string) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const previewSignature = `
<div style="font-family:Arial,sans-serif;font-size:13px;color:#374151;border-top:2px solid #6366f1;padding-top:12px;margin-top:16px">
  <table cellpadding="0" cellspacing="0">
    <tr><td style="font-weight:bold;font-size:14px">${settings.emailSignatureName}</td></tr>
    <tr><td style="color:#6b7280">${settings.emailSignatureTitle}</td></tr>
    <tr><td style="color:#6b7280">📞 ${settings.emailSignaturePhone}</td></tr>
    <tr><td style="color:#6366f1">✉️ ${settings.emailSignatureEmail}</td></tr>
  </table>
</div>`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Paramètres" subtitle="Configuration de l'application et des intégrations" />

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar tabs */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-white p-3 space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  activeTab === tab.id ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-6">

            {/* ---- PROFIL ---- */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h3 className="font-semibold text-gray-900">Informations commerciales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom complet</label>
                    <input value={settings.commercialName} onChange={e => set('commercialName', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Société</label>
                    <input value={settings.companyName} onChange={e => set('companyName', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléphone</label>
                    <input value={settings.commercialPhone} onChange={e => set('commercialPhone', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                    <input type="email" value={settings.commercialEmail} onChange={e => set('commercialEmail', e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                  </div>
                </div>
              </div>
            )}

            {/* ---- SIGNATURE ---- */}
            {activeTab === 'signature' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Signature email automatique</h3>
                  <p className="text-sm text-gray-500">Ajoutée automatiquement à la fin de chaque email envoyé.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</label>
                      <input value={settings.emailSignatureName} onChange={e => set('emailSignatureName', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Titre / Poste</label>
                      <input value={settings.emailSignatureTitle} onChange={e => set('emailSignatureTitle', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Téléphone</label>
                      <input value={settings.emailSignaturePhone} onChange={e => set('emailSignaturePhone', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email affiché</label>
                      <input type="email" value={settings.emailSignatureEmail} onChange={e => set('emailSignatureEmail', e.target.value)}
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400" />
                    </div>
                  </div>
                </div>

                {/* Aperçu signature */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Aperçu</p>
                  <div dangerouslySetInnerHTML={{ __html: previewSignature }} />
                </div>
              </>
            )}

            {/* ---- BREVO ---- */}
            {activeTab === 'brevo' && (
              <div className="space-y-4">
                {/* Statut depuis .env */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Brevo — Email transactionnel</h3>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clé API Brevo (fichier .env)</label>
                    <div className={cn(
                      'mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border',
                      envConfig?.brevo.apiKey.configured
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    )}>
                      {envConfig?.brevo.apiKey.configured
                        ? <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                        : <ShieldX className="w-4 h-4 text-red-500 flex-shrink-0" />
                      }
                      <span className={cn('text-sm font-mono flex-1',
                        envConfig?.brevo.apiKey.configured ? 'text-green-800' : 'text-red-600'
                      )}>
                        {envConfig === null
                          ? 'Chargement…'
                          : envConfig.brevo.apiKey.configured
                            ? envConfig.brevo.apiKey.masked
                            : 'Non configurée — ajoutez BREVO_API_KEY dans .env'
                        }
                      </span>
                    </div>
                    {envConfig?.brevo.apiKey.configured && (
                      <p className="text-xs text-green-700 mt-1">✅ Clé API active et opérationnelle</p>
                    )}
                    {envConfig && !envConfig.brevo.apiKey.configured && (
                      <p className="text-xs text-red-600 mt-1">Ajoutez <code className="bg-red-100 px-1 rounded">BREVO_API_KEY=xkeysib-...</code> dans votre fichier <code className="bg-red-100 px-1 rounded">.env</code></p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email expéditeur (.env)</label>
                      <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        {envConfig?.brevo.senderEmail || settings.brevoSenderEmail || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom expéditeur (.env)</label>
                      <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        {envConfig?.brevo.senderName || settings.brevoSenderName || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">SMS transactionnel</h3>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender ID alphanumérique (.env)</label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                      {envConfig?.sms.senderId || settings.smsSenderId || 'Solargeo'}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Modifiable dans .env via la variable <code className="bg-gray-100 px-1 rounded">TWILIO_SENDER_ID</code></p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 space-y-1">
                      <p className="font-medium">Modifier les clés API</p>
                      <p>Ouvrez le fichier <code className="bg-blue-100 px-1 rounded">/Users/stephenbaspin/relancepro-antilles/.env</code> et modifiez les variables directement. Redémarrez le serveur (<code className="bg-blue-100 px-1 rounded">npm run dev</code>) pour appliquer les changements.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---- WHATSAPP ---- */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Meta WhatsApp Cloud API</h3>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number ID (.env)</label>
                    <div className={cn(
                      'mt-1 px-3 py-2.5 rounded-lg border text-sm font-mono flex items-center gap-2',
                      envConfig?.whatsapp.phoneNumberId ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-400'
                    )}>
                      {envConfig?.whatsapp.phoneNumberId
                        ? <><ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />{envConfig.whatsapp.phoneNumberId}</>
                        : <><ShieldX className="w-4 h-4 text-red-400 flex-shrink-0" />Non configuré</>
                      }
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Variable <code className="bg-gray-100 px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code> dans .env</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Webhook Verify Token (.env)</label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono">
                      {envConfig?.whatsapp.verifyToken || settings.whatsappVerifyToken || '—'}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Access Token (.env)</label>
                    <div className={cn(
                      'mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border',
                      envConfig?.whatsapp.accessToken.configured
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    )}>
                      {envConfig?.whatsapp.accessToken.configured
                        ? <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                        : <ShieldX className="w-4 h-4 text-red-500 flex-shrink-0" />
                      }
                      <span className={cn('text-sm font-mono flex-1',
                        envConfig?.whatsapp.accessToken.configured ? 'text-green-800' : 'text-red-600'
                      )}>
                        {envConfig === null
                          ? 'Chargement…'
                          : envConfig.whatsapp.accessToken.configured
                            ? (showWaToken ? envConfig.whatsapp.accessToken.masked : '••••••••••••••••••••')
                            : 'Non configuré — ajoutez WHATSAPP_ACCESS_TOKEN dans .env'
                        }
                      </span>
                      {envConfig?.whatsapp.accessToken.configured && (
                        <button onClick={() => setShowWaToken(!showWaToken)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">URL du Webhook</p>
                  <code className="block text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700 break-all select-all">
                    https://stephenlils.com/api/whatsapp/webhook
                  </code>
                  <p className="text-xs text-gray-400 mt-2">À configurer dans Meta for Developers → votre app → WhatsApp → Configuration → Webhooks</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700 space-y-1">
                      <p><strong>App en mode Développement :</strong> envoi limité à 5 numéros de test enregistrés dans Meta.</p>
                      <p>Pour envoyer à tous les prospects : passez l'app en mode <strong>Live</strong> avec vérification de votre entreprise Meta Business.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton Sauvegarder */}
            <div className="flex justify-end">
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition-colors">
                {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Enregistré !' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
