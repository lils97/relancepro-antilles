// Moteur d'import Excel intelligent
// Détection automatique des colonnes, normalisation des numéros

import * as XLSX from 'xlsx'
import { parsePhone } from './phone-utils'
import type { ProspectCategory, ProspectStatus } from '@/types'

export interface RawProspectRow {
  lastName: string
  firstName?: string
  phone?: string
  email?: string
  city?: string
  department?: string
  postalCode?: string
  country?: string
  comment?: string
  project?: string
  status?: string
  category?: string
  [key: string]: string | undefined
}

export interface ImportedProspect {
  lastName: string
  firstName?: string
  phone?: string
  phoneRaw?: string
  phoneCountry?: string
  phoneValid: boolean
  phoneError?: string
  email?: string
  city?: string
  department?: string
  postalCode?: string
  country?: string
  comment?: string
  project?: string
  budget?: number
  status: ProspectStatus
  category: ProspectCategory
  rowIndex: number
  warnings: string[]
}

export interface ImportResult {
  prospects: ImportedProspect[]
  columnMapping: Record<string, string>
  totalRows: number
  validRows: number
  errorRows: number
  warnings: string[]
}

// Dictionnaire de synonymes pour la détection automatique des colonnes
const COLUMN_SYNONYMS: Record<string, string[]> = {
  lastName: [
    'nom', 'last name', 'lastname', 'nom client', 'nom du client',
    'client', 'nom de famille', 'surname', 'noms', 'nom_client',
  ],
  firstName: [
    'prénom', 'prenom', 'first name', 'firstname', 'prénom client',
    'first_name', 'prenoms', 'prénom du client',
  ],
  phone: [
    'téléphone', 'telephone', 'tel', 'tél', 'mobile', 'portable', 'gsm',
    'phone', 'cellphone', 'num', 'numéro', 'numero', 'contact',
    'tel mobile', 'telephone mobile', 'tel principal', 'numéro de téléphone',
    'phone number', 'tel.', 'tél.', 'mob',
  ],
  email: [
    'email', 'e-mail', 'mail', 'courriel', 'adresse email', 'email address',
    'adresse mail', 'adresse e-mail',
  ],
  city: [
    'ville', 'city', 'commune', 'localité', 'localite', 'town',
    'municipality', 'ville client', 'ville cp',
  ],
  department: [
    'département', 'departement', 'dept', 'dep', 'department', 'région', 'region',
  ],
  postalCode: [
    'code postal', 'cp', 'postal code', 'zip', 'zip code', 'codepostal',
    'code_postal', 'postcode',
  ],
  country: [
    'pays', 'country', 'nation', 'pays client',
  ],
  comment: [
    'commentaire', 'commentaires', 'comment', 'note', 'notes', 'remarque',
    'observation', 'info', 'informations', 'details', 'détails', 'remarks',
  ],
  project: [
    'projet', 'project', 'produit', 'offre', 'service', 'intérêt',
    'interet', 'demande', 'besoin', 'quel produit vous interesse',
  ],
  status: [
    'statut', 'status', 'état', 'etat', 'situation',
  ],
  category: [
    'catégorie', 'categorie', 'category', 'activité', 'activite',
    'secteur', 'type', 'domaine',
  ],
  sourceLead: [
    'source lead', 'source', 'origine', 'comment avez-vous connu',
    'comment avez vous connu', 'provenance',
  ],
  lastContactAt: [
    'date dernière action', 'date derniere action', 'dernière action',
    'derniere action', 'dernier contact', 'last contact',
  ],
  createdAt: [
    'date création', 'date creation', 'date_creation', 'created at',
    'créé le', 'cree le', '1ere prise de contacte', '1ère prise de contact',
  ],
  budget: [
    'client ca ht', 'ca ht', 'budget', 'montant', 'prix ttc kit',
    'prix', 'devis', 'valeur',
  ],
}

/**
 * Normaliser un header de colonne pour la comparaison
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s_\-\.]+/g, ' ')
    .trim()
}

/**
 * Détecter le mapping des colonnes automatiquement
 */
export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const usedHeaders = new Set<string>()

  for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    for (const header of headers) {
      if (usedHeaders.has(header)) continue
      const normalized = normalizeHeader(header)
      if (synonyms.some(s => normalizeHeader(s) === normalized || normalized.includes(normalizeHeader(s)))) {
        mapping[field] = header
        usedHeaders.add(header)
        break
      }
    }
  }

  return mapping
}

/**
 * Mapper le statut depuis le texte brut
 */
function mapStatus(raw?: string): ProspectStatus {
  if (!raw) return 'NEW'
  // Normaliser : enlever accents, minuscules
  const lower = raw.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')

  if (['nouveau', 'new', 'a traiter'].includes(lower)) return 'NEW'
  if (['a contacter', 'to contact'].includes(lower)) return 'TO_CONTACT'
  if (['messagerie', 'voicemail', 'repondeur'].includes(lower)) return 'VOICEMAIL'
  if (['rappel', 'callback', 'rappeler', 'a rappeler', 'a rappeler'].includes(lower)) return 'CALLBACK'
  if (lower.includes('rappeler') || lower.includes('rappel')) return 'CALLBACK'
  if (['interesse', 'interested'].includes(lower)) return 'INTERESTED'
  if (['rdv', 'rendez-vous', 'appointment', 'rdv programme'].includes(lower)) return 'APPOINTMENT'
  if (['devis envoye', 'devis', 'quote sent'].includes(lower)) return 'QUOTE_SENT'
  if (['attente', 'en attente', 'waiting'].includes(lower)) return 'WAITING_QUOTE'
  if (['signe', 'signed', 'client'].includes(lower)) return 'SIGNED'
  if (['perdu', 'lost', 'ko', 'refus'].includes(lower)) return 'LOST'
  if (['stop', 'ne pas appeler', 'dnc'].includes(lower)) return 'STOP'

  return 'NEW'
}

/**
 * Mapper la catégorie depuis le texte brut
 */
function mapCategory(raw?: string): ProspectCategory {
  if (!raw) return 'OTHER'
  const lower = raw.toLowerCase().trim()

  if (['fibre', 'internet', 'adsl', 'haut débit', 'box'].some(k => lower.includes(k))) return 'INTERNET_FIBRE'
  if (['solaire', 'solar', 'panneau', 'photovoltaïque', 'pv'].some(k => lower.includes(k))) return 'PANNEAUX_SOLAIRES'
  if (['isolation', 'thermique', 'combles'].some(k => lower.includes(k))) return 'ISOLATION_THERMIQUE'
  if (['clim', 'climatisation', 'air conditionné', 'pompe à chaleur', 'pac'].some(k => lower.includes(k))) return 'CLIMATISATION'
  if (['brasseur', 'ventilateur', 'ventilation'].some(k => lower.includes(k))) return 'BRASSEURS_AIR'

  return 'OTHER'
}

/**
 * Détecter si le fichier est un export Monday.com
 * et retourner l'index de la ligne contenant les vrais en-têtes (0-based)
 */
function findHeaderRow(rawRows: unknown[][]): number {
  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const row = rawRows[i] as unknown[]
    const nonEmpty = row.filter(v => v !== null && v !== undefined && v !== '').length
    // La ligne d'en-têtes réels aura plusieurs colonnes remplies
    if (nonEmpty >= 4) return i
  }
  return 0
}

/**
 * Parser "Le Vauclin → 97280" → { city: "Le Vauclin", postalCode: "97280" }
 */
function parseCityField(raw: string): { city: string; postalCode?: string } {
  if (!raw) return { city: raw }
  // Format Monday.com : "Ville → CP"
  const arrowMatch = raw.match(/^(.+?)\s*[→>\-–]\s*(\d{5})\s*$/)
  if (arrowMatch) {
    return { city: arrowMatch[1].trim(), postalCode: arrowMatch[2] }
  }
  // Format "CP Ville" ou "Ville CP"
  const cpMatch = raw.match(/^(\d{5})\s+(.+)$/) || raw.match(/^(.+?)\s+(\d{5})$/)
  if (cpMatch) {
    const digits = cpMatch[1].match(/^\d{5}$/) ? cpMatch[1] : cpMatch[2]
    const city = cpMatch[1].match(/^\d{5}$/) ? cpMatch[2] : cpMatch[1]
    return { city: city.trim(), postalCode: digits }
  }
  return { city: raw.trim() }
}

/**
 * Détecter la catégorie depuis le nom du fichier ou les données
 */
function detectCategoryFromContext(fileName: string, firstCellValue?: string): ProspectCategory | null {
  const ctx = `${fileName} ${firstCellValue ?? ''}`.toLowerCase()
  if (['solargeo', 'solaire', 'panneaux', 'pv ', 'photovoltaique', 'photovoltaïque'].some(k => ctx.includes(k))) return 'PANNEAUX_SOLAIRES'
  if (['fibre', 'internet', 'adsl', 'box'].some(k => ctx.includes(k))) return 'INTERNET_FIBRE'
  if (['isolation', 'thermique'].some(k => ctx.includes(k))) return 'ISOLATION_THERMIQUE'
  if (['clim', 'climatisation', 'pac'].some(k => ctx.includes(k))) return 'CLIMATISATION'
  if (['brasseur', 'ventilation'].some(k => ctx.includes(k))) return 'BRASSEURS_AIR'
  return null
}

/**
 * Parser un fichier XLSX/XLS/CSV et retourner les prospects importés
 */
export async function parseExcelFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  // Première feuille
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Lire toutes les lignes en tableau brut pour détecter la vraie ligne d'en-têtes
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: false })

  if (!rawRows.length) {
    return { prospects: [], columnMapping: {}, totalRows: 0, validRows: 0, errorRows: 0, warnings: ['Le fichier est vide'] }
  }

  // Détecter la catégorie depuis le nom du fichier et la première cellule
  const firstCellRaw = (rawRows[0] as unknown[])[0]?.toString() ?? ''
  const fileCategory = detectCategoryFromContext(file.name, firstCellRaw)

  // Trouver la vraie ligne d'en-têtes
  const headerRowIndex = findHeaderRow(rawRows)
  const headerRow = rawRows[headerRowIndex] as unknown[]

  // Construire les en-têtes (ignorer les colonnes vides)
  const headers: string[] = headerRow.map(h => (h ?? '').toString().trim())

  const columnMapping = detectColumnMapping(headers.filter(Boolean))

  // Lignes de données (après les en-têtes)
  const dataRows = rawRows.slice(headerRowIndex + 1)

  const prospects: ImportedProspect[] = []
  const globalWarnings: string[] = []

  if (!columnMapping.lastName) {
    globalWarnings.push('Colonne "Nom" non détectée automatiquement.')
  }
  if (!columnMapping.phone && !columnMapping.email) {
    globalWarnings.push('Ni téléphone ni email détecté.')
  }
  if (fileCategory) {
    globalWarnings.push(`Catégorie auto-détectée depuis le nom du fichier : ${fileCategory}`)
  }

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i] as unknown[]

    // Construire un objet clé/valeur avec les en-têtes
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      if (h) row[h] = (rawRow[idx] ?? '').toString().trim()
    })

    // Ignorer les lignes totalement vides
    if (Object.values(row).every(v => !v || v === 'null' || v === 'NaN')) continue

    const warnings: string[] = []

    const get = (field: string): string | undefined => {
      const col = columnMapping[field]
      if (!col) return undefined
      const val = row[col]
      if (!val || val === 'null' || val === 'NaN') return undefined
      return val
    }

    // Nom : priorité "Nom du client", fallback "Name" (colonne 1 = name complet)
    let lastName = get('lastName')
    let firstName = get('firstName')

    // Si "Nom du client" non trouvé mais "Name" disponible → splitter
    if (!lastName) {
      const fullName = headers[0] ? row[headers[0]] : ''
      if (fullName) {
        const parts = fullName.trim().split(/\s+/)
        if (parts.length >= 2) {
          // Heuristique : dernier mot en MAJ = nom de famille
          const lastPart = parts[parts.length - 1]
          if (lastPart === lastPart.toUpperCase() && lastPart.length > 1) {
            lastName = lastPart
            firstName = firstName || parts.slice(0, -1).join(' ')
          } else {
            lastName = parts[0]
            firstName = firstName || parts.slice(1).join(' ')
          }
        } else {
          lastName = fullName.trim()
        }
      }
    }

    if (!lastName) lastName = `Inconnu_${i + headerRowIndex + 2}`

    // Téléphone
    const phoneRaw = get('phone')
    let phone: string | undefined
    let phoneCountry: string | undefined
    let phoneValid = false
    let phoneError: string | undefined

    if (phoneRaw) {
      const result = parsePhone(phoneRaw)
      phoneValid = result.isValid
      phoneError = result.error
      if (result.formatted) {
        phone = result.formatted
        phoneCountry = result.country ?? undefined
      } else {
        warnings.push(`Numéro invalide: ${phoneRaw}`)
      }
    }

    // Email
    const email = get('email')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      warnings.push(`Email invalide: ${email}`)
    }

    // Ville CP (format "Le Vauclin → 97280")
    const cityRaw = get('city')
    let city: string | undefined
    let postalCode: string | undefined = get('postalCode')
    if (cityRaw) {
      const parsed = parseCityField(cityRaw)
      city = parsed.city
      if (!postalCode) postalCode = parsed.postalCode
    }

    // Source lead → commentaire additionnel
    const sourceLead = get('sourceLead')
    const commentRaw = get('comment')
    let comment = commentRaw && commentRaw !== 'nrp' ? commentRaw : undefined
    if (sourceLead) {
      const sourceNote = `Source : ${sourceLead}`
      comment = comment ? `${comment} | ${sourceNote}` : sourceNote
    }

    // Catégorie : fichier > colonne catégorie > projet
    const categoryRaw = get('category')
    const project = get('project')
    const category = fileCategory ?? mapCategory(categoryRaw || project)

    // Statut
    const statusRaw = get('status')
    const status = mapStatus(statusRaw)

    // Budget
    const budgetRaw = get('budget')
    const budget = budgetRaw && !isNaN(parseFloat(budgetRaw)) ? parseFloat(budgetRaw) : undefined

    prospects.push({
      lastName,
      firstName: firstName || undefined,
      phone,
      phoneRaw: phoneRaw || undefined,
      phoneCountry,
      phoneValid,
      phoneError,
      email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
      city: city || undefined,
      department: get('department') || undefined,
      postalCode: postalCode || undefined,
      country: get('country') || 'Martinique',
      comment: comment || undefined,
      project: project || undefined,
      status,
      category,
      rowIndex: i + headerRowIndex + 2,
      warnings,
      ...(budget ? { budget } : {}),
    })
  }

  const validRows = prospects.filter(p => p.lastName && (p.phone || p.email)).length
  const errorRows = prospects.length - validRows

  return {
    prospects,
    columnMapping,
    totalRows: prospects.length,
    validRows,
    errorRows,
    warnings: globalWarnings,
  }
}

/**
 * Parser un fichier CSV
 */
export async function parseCsvFile(file: File): Promise<ImportResult> {
  // Convertir en XLSX pour traitement uniforme
  const text = await file.text()
  const workbook = XLSX.read(text, { type: 'string' })
  const newFile = new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], file.name)
  return parseExcelFile(newFile)
}
