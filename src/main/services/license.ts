/**
 * License System v2 — Server-based with offline fallback
 *
 * How it works:
 * 1. Activation requires internet → calls POST /api/activate
 * 2. Server validates key, checks max activations, returns signed token (30 days)
 * 3. Token stored locally → app works offline for 30 days
 * 4. checkLicense() tries server refresh, falls back to local token validity
 * 5. Deactivation calls server to free the machine slot
 *
 * Key format: XXXX-XXXX-XXXX-XXXX (validated server-side)
 */

import { app } from 'electron'
import { machineIdSync } from './machine-id'
import { queryOne, execute, saveToFile } from '../database'
import { createHmac } from 'crypto'

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://devispro-license.vercel.app/api'
const FETCH_TIMEOUT = 10_000 // 10 seconds

// Secret salt for integrity checks — prevents manual DB edits
const INTEGRITY_SECRET = 'DPro-2024-integrity-check-v1'

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getMachineId(): string {
  try {
    return machineIdSync()
  } catch {
    return 'unknown-machine'
  }
}

function getMachineName(): string {
  try {
    return require('os').hostname()
  } catch {
    return 'unknown'
  }
}

function getAppVersion(): string {
  try {
    return app.getVersion()
  } catch {
    return '0.0.0'
  }
}

/**
 * Integrity checksum to detect DB tampering.
 */
function generateIntegrityChecksum(originalKey: string, machineId: string, activatedAt: string): string {
  return createHmac('sha256', INTEGRITY_SECRET)
    .update(`${originalKey}|${machineId}|${activatedAt}`)
    .digest('hex')
}

/**
 * Validate license key format locally (basic regex check).
 */
export function validateLicenseFormat(key: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key.toUpperCase())
}

/**
 * Make a fetch request with timeout.
 */
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

// -------------------------------------------------------------------
// Core functions
// -------------------------------------------------------------------

/**
 * Activate a license key via server.
 * Requires internet connectivity.
 */
export async function activateLicense(
  key: string
): Promise<{ success: boolean; message: string }> {
  try {
    const upperKey = key.toUpperCase().trim()
    console.log('[License] Activation attempt for key:', upperKey.slice(0, 4) + '-****')

    if (!validateLicenseFormat(upperKey)) {
      return { success: false, message: 'Format de cl\u00e9 invalide. Format attendu: XXXX-XXXX-XXXX-XXXX' }
    }

    const machineId = getMachineId()
    const machineName = getMachineName()
    const appVersion = getAppVersion()

    console.log('[License] Calling server for activation...')

    let response: Response
    try {
      response = await fetchWithTimeout(`${LICENSE_SERVER_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: upperKey,
          machineId,
          machineName,
          appVersion
        })
      })
    } catch (networkErr) {
      console.error('[License] Network error:', networkErr)
      return {
        success: false,
        message: 'Connexion internet requise pour l\u2019activation. V\u00e9rifiez votre connexion et r\u00e9essayez.'
      }
    }

    const data = await response.json()

    if (!response.ok) {
      console.log('[License] Server rejected:', data.code, data.message)
      const messages: Record<string, string> = {
        INVALID_FORMAT: 'Format de cl\u00e9 invalide.',
        INVALID_KEY: 'Cl\u00e9 de licence invalide.',
        REVOKED: 'Cette licence a \u00e9t\u00e9 r\u00e9voqu\u00e9e.',
        MAX_ACTIVATIONS: data.message || 'Nombre maximum d\u2019activations atteint.',
        MISSING_FIELDS: 'Donn\u00e9es manquantes.',
        SERVER_ERROR: 'Erreur serveur. R\u00e9essayez plus tard.'
      }
      return {
        success: false,
        message: messages[data.code] || data.message || 'Erreur lors de l\u2019activation.'
      }
    }

    // Success! Store locally
    const keyHint = upperKey.split('-').pop() || ''
    const activatedAt = new Date().toISOString()
    const checksum = generateIntegrityChecksum(upperKey, machineId, activatedAt)

    console.log('[License] Server OK, storing locally...')

    try {
      execute(
        `INSERT OR REPLACE INTO licence (id, key, key_hint, activated_at, machine_id, is_active, checksum, original_key, server_token, valid_until, last_server_check)
         VALUES (1, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
        [
          upperKey, // store original key (needed for server calls)
          keyHint,
          activatedAt,
          machineId,
          checksum,
          upperKey,
          data.token || '',
          data.validUntil || '',
          new Date().toISOString()
        ]
      )
    } catch (dbErr) {
      // Self-heal: if columns are missing (old DB before migration), add them and retry
      if (String(dbErr).includes('no column named')) {
        console.log('[License] Adding missing columns...')
        const cols = ['checksum', 'key_hint', 'original_key', 'server_token', 'valid_until', 'last_server_check']
        for (const col of cols) {
          try { execute(`ALTER TABLE licence ADD COLUMN ${col} TEXT`) } catch { /* exists */ }
        }
        execute(
          `INSERT OR REPLACE INTO licence (id, key, key_hint, activated_at, machine_id, is_active, checksum, original_key, server_token, valid_until, last_server_check)
           VALUES (1, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
          [upperKey, keyHint, activatedAt, machineId, checksum, upperKey, data.token || '', data.validUntil || '', new Date().toISOString()]
        )
      } else {
        throw dbErr
      }
    }

    saveToFile()
    console.log('[License] Activation successful!')
    return { success: true, message: 'Licence activ\u00e9e avec succ\u00e8s!' }
  } catch (err) {
    console.error('[License] Activation failed:', err)
    const message = err instanceof Error ? err.message : 'Erreur inconnue lors de l\u2019activation'
    return { success: false, message }
  }
}

/**
 * Check license validity.
 * 1. Try server refresh (online → get fresh token)
 * 2. If offline → check local token validity (validUntil > now)
 * 3. Legacy support: old licenses without server_token get 30-day grace
 */
export async function checkLicense(): Promise<{
  isActive: boolean
  key?: string
  daysRemaining?: number
  offlineExpired?: boolean
  needsReactivation?: boolean
}> {
  try {
    const row = queryOne('SELECT * FROM licence WHERE id = 1') as {
      key: string
      key_hint: string | null
      machine_id: string
      is_active: number
      activated_at: string
      checksum: string | null
      original_key: string | null
      server_token: string | null
      valid_until: string | null
      last_server_check: string | null
    } | undefined

    if (!row || !row.is_active) return { isActive: false }

    // Verify machine binding
    const currentMachineId = getMachineId()
    if (row.machine_id !== currentMachineId) {
      return { isActive: false }
    }

    const keyDisplay = row.key_hint ? '****-****-****-' + row.key_hint : 'Activ\u00e9e'

    // Old license without server activation → must re-activate
    if (!row.original_key && !row.server_token) {
      return { isActive: false }
    }

    // --- Server-activated license ---
    const licenseKey = row.original_key || row.key
    const machineId = row.machine_id

    // Try online check
    try {
      const response = await fetchWithTimeout(`${LICENSE_SERVER_URL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, machineId })
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        // Server says valid — refresh local token
        execute(
          'UPDATE licence SET server_token = ?, valid_until = ?, last_server_check = ? WHERE id = 1',
          [data.token || row.server_token, data.validUntil || row.valid_until, new Date().toISOString()]
        )
        saveToFile()
        return { isActive: true, key: keyDisplay }
      }

      if (!response.ok) {
        // Server explicitly says invalid (revoked, not activated, etc.)
        console.log('[License] Server check failed:', data.code)
        if (data.code === 'REVOKED' || data.code === 'NOT_ACTIVATED' || data.code === 'KEY_NOT_FOUND') {
          execute('UPDATE licence SET is_active = 0 WHERE id = 1')
          saveToFile()
          return { isActive: false }
        }
      }
    } catch {
      // Offline — fall through to local token check
      console.log('[License] Server unreachable, checking offline token...')
    }

    // Offline fallback: check token validity
    if (row.valid_until) {
      const validUntil = new Date(row.valid_until)
      const now = new Date()
      if (now < validUntil) {
        const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        return { isActive: true, key: keyDisplay, daysRemaining }
      }
      // Token expired
      return { isActive: false, offlineExpired: true }
    }

    // No token at all but has server_token field — shouldn't happen, but handle it
    return { isActive: false, offlineExpired: true }
  } catch (err) {
    console.error('[License] Check error:', err)
    return { isActive: false }
  }
}

/**
 * Deactivate the current license.
 * Calls server to free the machine slot, then clears local data.
 */
export async function deactivateLicense(): Promise<void> {
  try {
    const row = queryOne('SELECT original_key, machine_id FROM licence WHERE id = 1') as {
      original_key: string | null
      machine_id: string | null
    } | undefined

    if (row?.original_key && row?.machine_id) {
      // Best-effort server call to free the slot
      try {
        await fetchWithTimeout(`${LICENSE_SERVER_URL}/deactivate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            licenseKey: row.original_key,
            machineId: row.machine_id
          })
        })
        console.log('[License] Server deactivation successful')
      } catch {
        console.log('[License] Server unreachable for deactivation (best-effort)')
      }
    }
  } catch {
    // Ignore errors reading DB
  }

  execute('DELETE FROM licence WHERE id = 1')
  saveToFile()
}
