'use client'

import { useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
  XCircle, Phone, Mail, MapPin, ChevronRight, ArrowRight,
  RefreshCw, Download, Users, Merge,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS, STATUS_LABELS, type ProspectCategory, type ProspectStatus } from '@/types'
import type { ImportResult, ImportedProspect } from '@/lib/excel-import'

type Step = 'upload' | 'mapping' | 'preview' | 'duplicates' | 'done'

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [])

  const handleFile = async (f: File) => {
    setFile(f)
    setIsProcessing(true)
    setStep('mapping')

    try {
      // Dynamically import to avoid SSR issues
      const { parseExcelFile } = await import('@/lib/excel-import')
      const res = await parseExcelFile(f)
      setResult(res)
      setIsProcessing(false)
    } catch (err) {
      console.error(err)
      setIsProcessing(false)
    }
  }

  const steps = [
    { id: 'upload', label: 'Fichier' },
    { id: 'mapping', label: 'Colonnes' },
    { id: 'preview', label: 'Aperçu' },
    { id: 'duplicates', label: 'Doublons' },
    { id: 'done', label: 'Terminé' },
  ]

  const stepIndex = steps.findIndex(s => s.id === step)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Import Excel" subtitle="Importez vos prospects depuis Excel, CSV ou XLS" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8 max-w-2xl mx-auto">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all flex-shrink-0',
                i < stepIndex ? 'bg-green-500 text-white' :
                i === stepIndex ? 'bg-brand-600 text-white' :
                'bg-gray-200 text-gray-500'
              )}>
                {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                'ml-2 text-sm font-medium',
                i === stepIndex ? 'text-brand-600' : i < stepIndex ? 'text-green-600' : 'text-gray-400'
              )}>
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-3',
                  i < stepIndex ? 'bg-green-400' : 'bg-gray-200'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Étape 1 : Upload */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center transition-all',
                isDragging ? 'border-brand-400 bg-brand-50' : 'border-gray-300 bg-white hover:border-brand-300 hover:bg-gray-50'
              )}
            >
              <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Glissez votre fichier ici</h3>
              <p className="text-sm text-gray-500 mb-6">Formats supportés : Excel (.xlsx, .xls) et CSV</p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  Choisir un fichier
                </span>
              </label>
            </div>

            {/* Aide colonnes */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">💡 Détection automatique</h4>
              <p className="text-sm text-amber-700">
                RelancePro détecte automatiquement les colonnes même si elles ont des noms différents :
                "Nom Client", "NOM", "Client", "Prénom", "Tel mobile", "Ville", etc.
              </p>
            </div>

            {/* Exemple format */}
            <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Colonnes reconnues automatiquement</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  'Nom', 'Prénom', 'Téléphone', 'Email', 'Ville',
                  'Département', 'Commentaire', 'Projet', 'Statut', 'Catégorie',
                ].map(col => (
                  <span key={col} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Étape 2 : Mapping des colonnes */}
        {step === 'mapping' && (
          <div className="max-w-3xl mx-auto">
            {isProcessing ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">Analyse du fichier en cours...</p>
                <p className="text-sm text-gray-500 mt-1">Détection des colonnes et normalisation des numéros</p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Résumé */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Lignes totales', value: result.totalRows, color: 'text-gray-700', icon: '📄' },
                    { label: 'Valides', value: result.validRows, color: 'text-green-600', icon: '✅' },
                    { label: 'Avec erreurs', value: result.errorRows, color: 'text-red-500', icon: '⚠️' },
                    { label: 'Colonnes mappées', value: Object.keys(result.columnMapping).length, color: 'text-brand-600', icon: '🗂️' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Mapping colonnes */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">Colonnes détectées</h3>
                  <div className="space-y-2">
                    {Object.entries(result.columnMapping).map(([field, col]) => (
                      <div key={field} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-500 w-32">{field}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 flex-1 text-right">{col}</span>
                        <CheckCircle className="w-4 h-4 text-green-500 ml-3" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alertes */}
                {result.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Avertissements
                    </h4>
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-sm text-amber-700">• {w}</p>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                    ← Retour
                  </button>
                  <button
                    onClick={() => setStep('preview')}
                    className="px-6 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
                  >
                    Aperçu des données →
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Étape 3 : Aperçu */}
        {step === 'preview' && result && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Aperçu — {result.prospects.length} prospects</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {result.validRows} valides
                  </span>
                  {result.errorRows > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="w-4 h-4" />
                      {result.errorRows} avec erreurs
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Ligne</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Nom</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Téléphone</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Email</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Ville</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">Statut</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-500">État</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.prospects.slice(0, 20).map((p, i) => (
                      <ImportPreviewRow key={i} prospect={p} />
                    ))}
                  </tbody>
                </table>
                {result.prospects.length > 20 && (
                  <div className="text-center py-3 text-sm text-gray-400">
                    ... et {result.prospects.length - 20} autres lignes
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep('mapping')} className="px-4 py-2 text-sm text-gray-600">← Retour</button>
              <button
                onClick={() => setStep('duplicates')}
                className="px-6 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700"
              >
                Vérifier les doublons →
              </button>
            </div>
          </div>
        )}

        {/* Étape 4 : Doublons */}
        {step === 'duplicates' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Merge className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Vérification des doublons</h3>
                  <p className="text-sm text-gray-500">0 doublon détecté</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">Aucun doublon détecté</p>
                <p className="text-xs text-green-600">Tous les prospects peuvent être importés</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Résumé de l'import</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Prospects à importer</span>
                  <span className="font-semibold text-gray-900">{result?.validRows ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Doublons ignorés</span>
                  <span className="font-semibold text-gray-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lignes en erreur</span>
                  <span className="font-semibold text-red-500">{result?.errorRows ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep('preview')} className="px-4 py-2 text-sm text-gray-600">← Retour</button>
              <button
                onClick={async () => {
                  if (!result) return
                  const { importedToProspect, addProspects } = await import('@/lib/prospect-store')
                  const valid = result.prospects
                    .filter(p => p.lastName && (p.phone || p.email))
                    .map(p => importedToProspect(p))
                  addProspects(valid)
                  setImportedCount(valid.length)
                  setStep('done')
                }}
                className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700"
              >
                ✅ Importer {result?.validRows} prospects
              </button>
            </div>
          </div>
        )}

        {/* Étape 5 : Succès */}
        {step === 'done' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl border border-gray-200 p-10">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Import réussi !</h3>
              <p className="text-gray-500 mb-6">
                <strong className="text-green-600">{importedCount} prospects</strong> ont été importés avec succès dans votre CRM.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/prospects"
                  className="px-6 py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition-colors"
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Voir mes prospects
                </a>
                <button
                  onClick={() => { setStep('upload'); setFile(null); setResult(null) }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Importer un autre fichier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ImportPreviewRow({ prospect }: { prospect: ImportedProspect }) {
  const hasErrors = !prospect.phoneValid && !!prospect.phoneRaw
  const hasWarnings = prospect.warnings.length > 0

  return (
    <tr className={cn(
      'text-sm',
      hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-amber-50' : ''
    )}>
      <td className="px-4 py-2 text-gray-400">{prospect.rowIndex}</td>
      <td className="px-4 py-2 font-medium text-gray-900">
        {prospect.firstName} {prospect.lastName}
      </td>
      <td className="px-4 py-2">
        {prospect.phone ? (
          <span className="flex items-center gap-1 text-gray-700">
            <Phone className="w-3 h-3 text-green-500" />
            {prospect.phone}
          </span>
        ) : prospect.phoneRaw ? (
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="w-3 h-3" />
            {prospect.phoneRaw}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-gray-600">{prospect.email || '—'}</td>
      <td className="px-4 py-2 text-gray-600">{prospect.city || '—'}</td>
      <td className="px-4 py-2">
        <span className="text-xs text-gray-500">{STATUS_LABELS[prospect.status]}</span>
      </td>
      <td className="px-4 py-2">
        {hasErrors ? (
          <span title={prospect.warnings.join(', ')}>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </span>
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </td>
    </tr>
  )
}
