// Utilitaires de gestion des numéros de téléphone Antilles/France

import type { PhoneCountry } from '@/types'

interface PhoneResult {
  isValid: boolean
  formatted: string | null
  country: PhoneCountry | null
  raw: string
  error?: string
}

/**
 * Détecte et normalise un numéro de téléphone au format international
 */
export function parsePhone(raw: string): PhoneResult {
  if (!raw) return { isValid: false, formatted: null, country: null, raw, error: 'Numéro vide' }

  // Nettoyer le numéro
  let cleaned = raw
    .toString()
    .trim()
    .replace(/[\s\.\-\(\)\/]/g, '') // Enlever espaces, points, tirets, parenthèses
    .replace(/^00/, '+')            // 0033 → +33

  // Cas : numéro trop court
  if (cleaned.replace(/\D/g, '').length < 8) {
    return { isValid: false, formatted: null, country: null, raw, error: 'Numéro trop court' }
  }

  // ============================================
  // MARTINIQUE : 0696 / +596696
  // ============================================
  if (cleaned.startsWith('+596')) {
    const digits = cleaned.slice(4).replace(/\D/g, '')
    if (digits.length === 9 && digits.startsWith('696')) {
      return { isValid: true, formatted: `+596${digits}`, country: 'MARTINIQUE', raw }
    }
    if (digits.length === 6 && digits.startsWith('696')) {
      // Format court sans l'indicatif mobile
      return { isValid: true, formatted: `+596696${digits.slice(3)}`, country: 'MARTINIQUE', raw }
    }
  }

  // Format local Martinique 0696XXXXXX
  if (/^0696\d{6}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+596${cleaned.slice(1)}`,
      country: 'MARTINIQUE',
      raw,
    }
  }

  // Format sans le 0 : 696XXXXXX (9 chiffres commençant par 696)
  if (/^696\d{6}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+596${cleaned}`,
      country: 'MARTINIQUE',
      raw,
    }
  }

  // Format Monday.com Martinique : 596696XXXXXX (12 chiffres, indicatif sans le +)
  if (/^596696\d{6}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+${cleaned}`,
      country: 'MARTINIQUE',
      raw,
    }
  }

  // Format Monday.com France : 33XXXXXXXXX (11 chiffres commençant par 336 ou 337)
  if (/^33[67]\d{8}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+${cleaned}`,
      country: 'FRANCE',
      raw,
    }
  }

  // Format Monday.com Guadeloupe : 590690XXXXXX (12 chiffres)
  if (/^590690\d{6}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+${cleaned}`,
      country: 'GUADELOUPE',
      raw,
    }
  }

  // ============================================
  // GUADELOUPE : 0690 / +590690
  // ============================================
  if (cleaned.startsWith('+590')) {
    const digits = cleaned.slice(4).replace(/\D/g, '')
    if (digits.length >= 6) {
      return { isValid: true, formatted: `+590${digits}`, country: 'GUADELOUPE', raw }
    }
  }

  if (/^0690\d{6}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+590${cleaned.slice(1)}`,
      country: 'GUADELOUPE',
      raw,
    }
  }

  if (/^690\d{6}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+590${cleaned}`,
      country: 'GUADELOUPE',
      raw,
    }
  }

  // ============================================
  // FRANCE MÉTROPOLITAINE : 06 / 07 / +33
  // ============================================
  if (cleaned.startsWith('+33')) {
    const digits = cleaned.slice(3).replace(/\D/g, '')
    if (digits.length === 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
      return {
        isValid: true,
        formatted: `+33${digits}`,
        country: 'FRANCE',
        raw,
      }
    }
  }

  if (/^0[67]\d{8}$/.test(cleaned)) {
    return {
      isValid: true,
      formatted: `+33${cleaned.slice(1)}`,
      country: 'FRANCE',
      raw,
    }
  }

  // ============================================
  // NUMÉRO FIXE OU AUTRE (on garde tel quel si 10+ chiffres)
  // ============================================
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length >= 10) {
    return {
      isValid: true,
      formatted: cleaned.startsWith('+') ? cleaned : `+${digits}`,
      country: 'OTHER',
      raw,
    }
  }

  return {
    isValid: false,
    formatted: null,
    country: null,
    raw,
    error: `Format non reconnu: ${raw}`,
  }
}

/**
 * Formater pour affichage lisible
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '—'

  // Martinique +596696XXXXXX
  if (phone.startsWith('+596696')) {
    const n = phone.slice(4)
    return `0${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`
  }

  // Guadeloupe +590690XXXXXX
  if (phone.startsWith('+590690')) {
    const n = phone.slice(4)
    return `0${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`
  }

  // France +336 ou +337
  if (phone.startsWith('+33')) {
    const n = phone.slice(3)
    return `0${n.slice(0, 1)} ${n.slice(1, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7, 9)}`
  }

  return phone
}

/**
 * Détecter les doublons dans un tableau de prospects importés
 */
export function detectDuplicates<T extends { phone?: string; email?: string }>(
  incoming: T[],
  existing: T[]
): { duplicates: Array<{ incoming: T; existing: T; reason: string }>; unique: T[] } {
  const duplicates: Array<{ incoming: T; existing: T; reason: string }> = []
  const unique: T[] = []

  for (const item of incoming) {
    let isDuplicate = false

    for (const ex of existing) {
      if (item.phone && ex.phone && item.phone === ex.phone) {
        duplicates.push({ incoming: item, existing: ex, reason: 'Même numéro de téléphone' })
        isDuplicate = true
        break
      }
      if (item.email && ex.email && item.email.toLowerCase() === ex.email.toLowerCase()) {
        duplicates.push({ incoming: item, existing: ex, reason: 'Même adresse email' })
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) unique.push(item)
  }

  return { duplicates, unique }
}
