import { execSync } from 'child_process'
import { createHash, randomUUID } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

/**
 * Gets a persistent fallback machine ID.
 * If the OS-level hardware ID fails, we generate a random UUID once
 * and persist it in the userData directory so it survives restarts.
 */
function getPersistentFallbackId(): string {
  const userDataPath = app.getPath('userData')
  const idDir = join(userDataPath, 'data')
  const idFile = join(idDir, '.machine-id')

  if (existsSync(idFile)) {
    const stored = readFileSync(idFile, 'utf-8').trim()
    if (stored.length >= 32) return stored
  }

  // Generate and persist a new random UUID
  const newId = randomUUID()
  if (!existsSync(idDir)) {
    mkdirSync(idDir, { recursive: true })
  }
  writeFileSync(idFile, newId, 'utf-8')
  console.log('[MachineID] Generated persistent fallback ID')
  return newId
}

/**
 * Gets a unique machine identifier based on OS-specific hardware IDs.
 * Used for license binding and database encryption key derivation.
 * Falls back to a persistent UUID if hardware ID is unavailable.
 */
export function machineIdSync(): string {
  let rawId = ''

  try {
    if (process.platform === 'win32') {
      rawId = execSync('wmic csproduct get uuid', { encoding: 'utf-8' })
        .split('\n')
        .filter((line) => line.trim().length > 0 && !line.includes('UUID'))[0]
        ?.trim() || ''
    } else if (process.platform === 'darwin') {
      rawId = execSync(
        "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }'",
        { encoding: 'utf-8' }
      )
        .trim()
        .replace(/"/g, '')
    } else {
      rawId = execSync('cat /etc/machine-id', { encoding: 'utf-8' }).trim()
    }
  } catch {
    // Hardware ID unavailable — use persistent fallback
    rawId = getPersistentFallbackId()
  }

  // Extra safety: if rawId is still empty, use persistent fallback
  if (!rawId || rawId.length < 8) {
    rawId = getPersistentFallbackId()
  }

  return createHash('sha256').update(rawId).digest('hex').slice(0, 32)
}
