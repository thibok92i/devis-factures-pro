import { execSync } from 'child_process'
import { createHash } from 'crypto'

/**
 * Gets a unique machine identifier based on OS-specific hardware IDs.
 * Used for license binding.
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
    rawId = `fallback-${process.platform}-${process.arch}`
  }

  return createHash('sha256').update(rawId).digest('hex').slice(0, 32)
}
