/**
 * License System with Anti-Tampering
 *
 * Features:
 * - License key format validation (XXXX-XXXX-XXXX-XXXX)
 * - Hardware fingerprint binding (machine ID)
 * - SHA-256 hashed key storage (original key not stored)
 * - HMAC integrity checksum to detect manual DB edits
 * - Ready for server-side validation (Keygen.sh, LemonSqueezy, etc.)
 *
 * To add server validation later, modify activateLicense() to call
 * your license server API before saving to the database.
 */

import { createHash, createHmac } from 'crypto'
import { machineIdSync } from './machine-id'
import { queryOne, execute, saveToFile } from '../database'

// Secret salt for integrity checks — changing this invalidates all existing licenses
const INTEGRITY_SECRET = 'DPro-2024-integrity-check-v1'

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
 * Activate a license key.
 * Validates format, binds to machine, stores with integrity checksum.
 *
 * TODO: Add server-side validation here:
 *   const response = await fetch('https://api.keygen.sh/v1/licenses/actions/validate', { ... })
 *   if (!response.ok) return { success: false, message: 'Clé invalide' }
 */
export function activateLicense(key: string): { success: boolean; message: string } {
  if (!validateLicenseFormat(key)) {
    return { success: false, message: 'Format de clé invalide. Format attendu: XXXX-XXXX-XXXX-XXXX' }
  }

  const machineId = getMachineId()

  // Check if already activated
  const existing = queryOne('SELECT * FROM licence WHERE id = 1') as {
    key: string
    is_active: number
  } | undefined
  if (existing?.is_active) {
    return { success: true, message: 'Licence déjà activée.' }
  }

  const hashedKey = hashKey(key.toUpperCase(), machineId)
  const activatedAt = new Date().toISOString()
  const checksum = generateIntegrityChecksum(hashedKey, machineId, activatedAt)

  execute(
    `INSERT OR REPLACE INTO licence (id, key, activated_at, machine_id, is_active, checksum)
     VALUES (1, ?, ?, ?, 1, ?)`,
    [hashedKey, activatedAt, machineId, checksum]
  )
  saveToFile()
  return { success: true, message: 'Licence activée avec succès!' }
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
      key: '****-****-****-' + (row.key as string).slice(-4)
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
