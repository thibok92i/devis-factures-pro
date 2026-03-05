/**
 * IPC Input Validation Layer
 * Validates and sanitizes all data coming from the renderer process.
 * Prevents injection attacks, type confusion, and invalid data.
 */

// ============================================================
// Validation Error
// ============================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// ============================================================
// Generic validation helpers
// ============================================================

/** Sanitize a string: trim + remove dangerous HTML/script tags */
function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError('Valeur texte attendue')
  return value
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
}

/** Validate a required string field */
export function requireString(value: unknown, fieldName: string, maxLength = 500): string {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`Le champ "${fieldName}" est requis`)
  }
  const str = sanitizeString(value)
  if (str.length === 0) throw new ValidationError(`Le champ "${fieldName}" est requis`)
  if (str.length > maxLength) {
    throw new ValidationError(`Le champ "${fieldName}" dépasse ${maxLength} caractères`)
  }
  return str
}

/** Validate an optional string field */
export function optionalString(value: unknown, _fieldName: string, maxLength = 500): string | null {
  if (value === null || value === undefined || value === '') return null
  const str = sanitizeString(value)
  if (str.length > maxLength) {
    throw new ValidationError(`Le champ "${_fieldName}" dépasse ${maxLength} caractères`)
  }
  return str
}

/** Validate a required number field */
export function requireNumber(value: unknown, fieldName: string, min?: number, max?: number): number {
  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) {
    throw new ValidationError(`Le champ "${fieldName}" doit être un nombre valide`)
  }
  if (min !== undefined && num < min) {
    throw new ValidationError(`Le champ "${fieldName}" doit être >= ${min}`)
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`Le champ "${fieldName}" doit être <= ${max}`)
  }
  return num
}

/** Validate an optional number field */
export function optionalNumber(value: unknown, fieldName: string, min?: number, max?: number): number | null {
  if (value === null || value === undefined || value === '') return null
  return requireNumber(value, fieldName, min, max)
}

/** Validate a UUID v4 format */
export function requireUUID(value: unknown, fieldName: string): string {
  const str = requireString(value, fieldName, 36)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str) &&
      !/^default-[A-Z]+-\d{3}$/.test(str)) {
    throw new ValidationError(`Le champ "${fieldName}" n'est pas un identifiant valide`)
  }
  return str
}

/** Validate a date format (YYYY-MM-DD) */
export function requireDate(value: unknown, fieldName: string): string {
  const str = requireString(value, fieldName, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new ValidationError(`Le champ "${fieldName}" doit être au format AAAA-MM-JJ`)
  }
  const date = new Date(str)
  if (isNaN(date.getTime())) {
    throw new ValidationError(`Le champ "${fieldName}" est une date invalide`)
  }
  return str
}

/** Validate an optional date */
export function optionalDate(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') return null
  return requireDate(value, fieldName)
}

/** Validate email format */
export function optionalEmail(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') return null
  const str = sanitizeString(value)
  if (str.length > 254) throw new ValidationError(`Le champ "${fieldName}" est trop long`)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    throw new ValidationError(`Le champ "${fieldName}" n'est pas un email valide`)
  }
  return str
}

/** Validate an enum value */
export function requireEnum(value: unknown, fieldName: string, allowed: string[]): string {
  const str = requireString(value, fieldName, 50)
  if (!allowed.includes(str)) {
    throw new ValidationError(`Valeur invalide pour "${fieldName}". Acceptées: ${allowed.join(', ')}`)
  }
  return str
}

/** Validate phone number */
export function optionalPhone(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') return null
  const str = sanitizeString(value)
  if (str.length > 30) throw new ValidationError(`Le champ "${fieldName}" est trop long`)
  if (!/^[0-9\s+\-().]+$/.test(str)) {
    throw new ValidationError(`Le champ "${fieldName}" contient des caractères invalides`)
  }
  return str
}

// ============================================================
// Entity-specific validators
// ============================================================

export interface ValidatedClient {
  nom: string
  prenom: string | null
  entreprise: string | null
  adresse: string
  npa: string
  ville: string
  telephone: string | null
  email: string | null
  notes: string | null
}

export function validateClient(data: Record<string, unknown>): ValidatedClient {
  if (!data || typeof data !== 'object') throw new ValidationError('Données client invalides')
  return {
    nom: requireString(data.nom, 'Nom', 100),
    prenom: optionalString(data.prenom, 'Prénom', 100),
    entreprise: optionalString(data.entreprise, 'Entreprise', 200),
    adresse: optionalString(data.adresse, 'Adresse', 300) || '',
    npa: optionalString(data.npa, 'NPA', 10) || '',
    ville: optionalString(data.ville, 'Ville', 100) || '',
    telephone: optionalPhone(data.telephone, 'Téléphone'),
    email: optionalEmail(data.email, 'Email'),
    notes: optionalString(data.notes, 'Notes', 2000)
  }
}

export interface ValidatedDevisCreate {
  client_id: string
  date: string
  validite: string
  notes: string | null
  conditions: string | null
}

export function validateDevisCreate(data: Record<string, unknown>): ValidatedDevisCreate {
  if (!data || typeof data !== 'object') throw new ValidationError('Données devis invalides')
  const today = new Date().toISOString().slice(0, 10)
  const validite30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  return {
    client_id: requireUUID(data.client_id, 'Client'),
    date: optionalDate(data.date, 'Date') || today,
    validite: optionalDate(data.validite, 'Validité') || validite30,
    notes: optionalString(data.notes, 'Notes', 5000),
    conditions: optionalString(data.conditions, 'Conditions', 5000)
  }
}

export interface ValidatedDevisUpdate {
  client_id: string
  date: string
  validite: string
  statut: string
  notes: string | null
  conditions: string | null
}

export function validateDevisUpdate(data: Record<string, unknown>): ValidatedDevisUpdate {
  if (!data || typeof data !== 'object') throw new ValidationError('Données devis invalides')
  return {
    client_id: requireUUID(data.client_id, 'Client'),
    date: requireDate(data.date, 'Date'),
    validite: requireDate(data.validite, 'Validité'),
    statut: requireEnum(data.statut, 'Statut', ['brouillon', 'envoye', 'accepte', 'refuse']),
    notes: optionalString(data.notes, 'Notes', 5000),
    conditions: optionalString(data.conditions, 'Conditions', 5000)
  }
}

export interface ValidatedLigne {
  catalogue_item_id: string | null
  designation: string
  description: string | null
  unite: string
  quantite: number
  prix_unitaire: number
}

export function validateLigne(data: Record<string, unknown>, index: number): ValidatedLigne {
  return {
    catalogue_item_id: data.catalogue_item_id
      ? requireString(data.catalogue_item_id, `Ligne ${index + 1} - Article`, 50)
      : null,
    designation: requireString(data.designation, `Ligne ${index + 1} - Désignation`, 500),
    description: optionalString(data.description, `Ligne ${index + 1} - Description`, 2000),
    unite: optionalString(data.unite, `Ligne ${index + 1} - Unité`, 20) || 'pce',
    quantite: requireNumber(data.quantite, `Ligne ${index + 1} - Quantité`, 0, 999999),
    prix_unitaire: requireNumber(data.prix_unitaire, `Ligne ${index + 1} - Prix unitaire`, 0, 9999999)
  }
}

export function validateLignes(lignes: unknown): ValidatedLigne[] {
  if (!Array.isArray(lignes)) throw new ValidationError('Les lignes doivent être un tableau')
  if (lignes.length > 200) throw new ValidationError('Maximum 200 lignes par document')
  return lignes.map((l, i) => validateLigne(l as Record<string, unknown>, i))
}

export interface ValidatedCatalogueItem {
  type: string
  reference: string
  designation: string
  unite: string
  prix_unitaire: number
  categorie: string | null
}

export function validateCatalogueItem(data: Record<string, unknown>): ValidatedCatalogueItem {
  if (!data || typeof data !== 'object') throw new ValidationError('Données catalogue invalides')
  return {
    type: requireEnum(data.type, 'Type', ['materiau', 'main_oeuvre']),
    reference: optionalString(data.reference, 'Référence', 50) || '',
    designation: requireString(data.designation, 'Désignation', 300),
    unite: optionalString(data.unite, 'Unité', 20) || 'pce',
    prix_unitaire: requireNumber(data.prix_unitaire, 'Prix unitaire', 0, 9999999),
    categorie: optionalString(data.categorie, 'Catégorie', 100)
  }
}

// ============================================================
// Settings validation with key whitelist
// ============================================================

const ALLOWED_SETTINGS_KEYS = new Set([
  'entreprise_nom',
  'entreprise_adresse',
  'entreprise_npa',
  'entreprise_ville',
  'entreprise_telephone',
  'entreprise_email',
  'entreprise_site',
  'entreprise_numero_tva',
  'entreprise_iban',
  'entreprise_banque',
  'tva_taux',
  'devise',
  'conditions_devis',
  'conditions_facture',
  'delai_validite_devis',
  'delai_paiement_facture'
])

export function validateSettingsKey(key: string): string {
  const sanitized = sanitizeString(key)
  if (!ALLOWED_SETTINGS_KEYS.has(sanitized)) {
    throw new ValidationError(`Clé de réglage non autorisée: "${sanitized}"`)
  }
  return sanitized
}

export function validateSettingsValue(key: string, value: unknown): string {
  const str = sanitizeString(value)
  if (str.length > 2000) {
    throw new ValidationError(`La valeur du réglage "${key}" est trop longue`)
  }
  return str
}

export function validateSettings(settings: unknown): Record<string, string> {
  if (!settings || typeof settings !== 'object') throw new ValidationError('Réglages invalides')
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
    const validKey = validateSettingsKey(key)
    result[validKey] = validateSettingsValue(validKey, value)
  }
  return result
}

export function validateSearchQuery(query: unknown): string {
  if (typeof query !== 'string') throw new ValidationError('Requête de recherche invalide')
  const trimmed = query.trim()
  if (trimmed.length === 0) throw new ValidationError('Requête de recherche vide')
  if (trimmed.length > 200) throw new ValidationError('Requête de recherche trop longue')
  return trimmed
}

// ============================================================
// Statut validators
// ============================================================

export const DEVIS_STATUTS = ['brouillon', 'envoye', 'accepte', 'refuse'] as const
export const FACTURE_STATUTS = ['brouillon', 'envoyee', 'payee', 'en_retard'] as const

export function validateDevisStatut(statut: unknown): string {
  return requireEnum(statut, 'Statut', [...DEVIS_STATUTS])
}

export function validateFactureStatut(statut: unknown): string {
  return requireEnum(statut, 'Statut', [...FACTURE_STATUTS])
}

export function validateRemise(value: unknown): number {
  return requireNumber(value, 'Remise', 0, 100)
}

// ============================================================
// IPC Handler wrapper with error handling
// ============================================================

/**
 * Wraps an IPC handler to catch ValidationErrors and return
 * proper error responses instead of crashing the app.
 */
export function safeHandler<T>(
  handler: (...args: unknown[]) => T | Promise<T>
): (...args: unknown[]) => Promise<{ success: false; error: string } | T> {
  return async (...args: unknown[]) => {
    try {
      return await handler(...args)
    } catch (err) {
      if (err instanceof ValidationError) {
        return { success: false, error: err.message }
      }
      console.error('[IPC Error]', err)
      throw err
    }
  }
}
