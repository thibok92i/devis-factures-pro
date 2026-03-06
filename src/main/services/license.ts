/**
 * License System with Anti-Tampering
 *
 * Features:
 * - License key validation with cryptographic checksum
 * - Hardware fingerprint binding (machine ID)
 * - SHA-256 hashed key storage (original key not stored)
 * - HMAC integrity checksum to detect manual DB edits
 * - Only keys generated with generate-license.mjs are accepted
 *
 * Key format: XXXX-XXXX-XXXX-XXXX
 * The first 3 groups are random, the 4th group is a HMAC checksum.
 * Only keys where the 4th group matches are valid.
 *
 * To generate keys: node scripts/generate-license.mjs [count]
 */

import { createHash, createHmac } from 'crypto'
import { machineIdSync } from './machine-id'
import { queryOne, execute, saveToFile } from '../database'

// Secret salt for integrity checks — changing this invalidates all existing licenses
const INTEGRITY_SECRET = 'DPro-2024-integrity-check-v1'

// Secret for license key validation — injected at build time from .env
const LICENSE_KEY_SECRET = process.env.LICENSE_KEY_SECRET || ''
if (!LICENSE_KEY_SECRET) {
  console.error('[License] CRITICAL: LICENSE_KEY_SECRET is empty! License validation will reject all keys.')
}
const VALID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Compute the checksum group (4th group) from the first 3 groups.
 * Uses HMAC-SHA256 with a secret, mapped to A-Z0-9.
 */
function computeKeyChecksum(payload: string): string {
  const hmac = createHmac('sha256', LICENSE_KEY_SECRET).update(payload).digest()
  return Array.from(hmac.slice(0, 4))
    .map((b) => VALID_CHARS[b % 36])
    .join('')
}

function getMachineId(): string {
  try { return machineIdSync() } catch { return 'unknown-machine' }
}

/**
 * Hash the license key with the machine ID.
 * This binds the license to the specific machine.
 */
function hashKey(key: string, machineId: string): string {
  return createHash('sha256').update(`${key}:${machineId}`).digest('hex')
}

/**
 * Generate an integrity checksum to detect DB tampering.
 * If someone manually edits the licence table, the checksum won't match.
 */
function generateIntegrityChecksum(hashedKey: string, machineId: string, activatedAt: string): string {
  return createHmac('sha256', INTEGRITY_SECRET)
    .update(`${hashedKey}|${machineId}|${activatedAt}`)
    .digest('hex')
}

/**
 * Validate license key format: XXXX-XXXX-XXXX-XXXX
 * Each group is alphanumeric (A-Z, 0-9)
 */
export function validateLicenseFormat(key: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key.toUpperCase())
}

/**
 * Validate license key authenticity.
 * Checks format AND that the 4th group is a valid HMAC checksum of the first 3 groups.
 * Only keys generated with generate-license.mjs will pass.
 */
export function validateLicenseKey(key: string): boolean {
  if (!LICENSE_KEY_SECRET) return false // Reject all keys if secret is missing
  const upper = key.toUpperCase().trim()
  if (!validateLicenseFormat(upper)) return false
  const parts = upper.split('-')
  const payload = parts.slice(0, 3).join('-')
  const checkGroup = parts[3]
  return computeKeyChecksum(payload) === checkGroup
}

/**
 * Activate a license key.
 * Validates format + cryptographic checksum, binds to machine, stores with integrity.
 */
export function activateLicense(key: string): { success: boolean; message: string } {
  try {
    console.log('[License] Activation attempt for key:', key.slice(0, 4) + '-****')

    if (!validateLicenseFormat(key)) {
      console.log('[License] Format validation failed')
      return { success: false, message: 'Format de clé invalide. Format attendu: XXXX-XXXX-XXXX-XXXX' }
    }

    if (!validateLicenseKey(key)) {
      console.log('[License] Key checksum validation failed')
      return { success: false, message: 'Clé de licence invalide.' }
    }

    console.log('[License] Key validated, getting machine ID...')
    const machineId = getMachineId()
    console.log('[License] Machine ID:', machineId.slice(0, 8) + '...')

    // Check if already activated
    const existing = queryOne('SELECT * FROM licence WHERE id = 1') as {
      key: string
      is_active: number
    } | undefined
    if (existing?.is_active) {
      return { success: true, message: 'Licence déjà activée.' }
    }

    const upperKey = key.toUpperCase()
    const hashedKey = hashKey(upperKey, machineId)
    const keyHint = upperKey.split('-').pop() || '' // Last group of original key
    const activatedAt = new Date().toISOString()
    const checksum = generateIntegrityChecksum(hashedKey, machineId, activatedAt)

    console.log('[License] Writing to database...')
    try {
      execute(
        `INSERT OR REPLACE INTO licence (id, key, key_hint, activated_at, machine_id, is_active, checksum)
         VALUES (1, ?, ?, ?, ?, 1, ?)`,
        [hashedKey, keyHint, activatedAt, machineId, checksum]
      )
    } catch (dbErr) {
      // Self-heal: if columns are missing (old DB), add them and retry
      if (String(dbErr).includes('no column named')) {
        console.log('[License] Adding missing columns...')
        try { execute('ALTER TABLE licence ADD COLUMN checksum TEXT') } catch { /* exists */ }
        try { execute('ALTER TABLE licence ADD COLUMN key_hint TEXT') } catch { /* exists */ }
        execute(
          `INSERT OR REPLACE INTO licence (id, key, key_hint, activated_at, machine_id, is_active, checksum)
           VALUES (1, ?, ?, ?, ?, 1, ?)`,
          [hashedKey, keyHint, activatedAt, machineId, checksum]
        )
      } else {
        throw dbErr
      }
    }
    console.log('[License] Saving to file...')
    saveToFile()
    console.log('[License] Activation successful!')
    return { success: true, message: 'Licence activée avec succès!' }
  } catch (err) {
    console.error('[License] Activation failed:', err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue lors de l\'activation'
    return { success: false, message }
  }
}

/**
 * Check if the license is valid.
 * Verifies:
 * 1. License exists and is active
 * 2. Machine ID matches current machine
 * 3. Integrity checksum is valid (no tampering)
 */
export function checkLicense(): { isActive: boolean; key?: string } {
  try {
    const row = queryOne('SELECT * FROM licence WHERE id = 1') as {
      key: string
      key_hint: string | null
      machine_id: string
      is_active: number
      activated_at: string
      checksum: string
    } | undefined

    if (!row || !row.is_active) return { isActive: false }

    // Verify machine binding
    const currentMachineId = getMachineId()
    if (row.machine_id !== currentMachineId) {
      return { isActive: false }
    }

    // Verify integrity checksum (anti-tampering)
    if (row.checksum) {
      const expectedChecksum = generateIntegrityChecksum(
        row.key as string,
        row.machine_id as string,
        row.activated_at as string
      )
      if (row.checksum !== expectedChecksum) {
        // Tampering detected! Deactivate license.
        console.error('[License] Integrity check failed. Possible tampering detected.')
        execute('UPDATE licence SET is_active = 0 WHERE id = 1')
        saveToFile()
        return { isActive: false }
      }
    }

    return {
      isActive: true,
      key: row.key_hint ? '****-****-****-' + row.key_hint : 'Activée'
    }
  } catch {
    return { isActive: false }
  }
}

/**
 * Deactivate the current license.
 */
export function deactivateLicense(): void {
  execute('DELETE FROM licence WHERE id = 1')
  saveToFile()
}
