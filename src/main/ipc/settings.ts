import { ipcMain } from 'electron'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import { activateLicense, checkLicense, deactivateLicense } from '../services/license'
import { performBackup, getBackupPath } from '../services/backup'
import {
  validateSettingsKey,
  validateSettingsValue,
  validateSettings,
  requireString,
  ValidationError
} from '../security/validators'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getAll', () => {
    const rows = queryAll('SELECT key, value FROM settings') as Array<{ key: string; value: string }>
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  })

  ipcMain.handle('settings:get', (_event, key: string) => {
    try {
      const validKey = validateSettingsKey(key)
      const row = queryOne('SELECT value FROM settings WHERE key = ?', [validKey]) as { value: string } | undefined
      return row?.value ?? null
    } catch (err) {
      if (err instanceof ValidationError) return null
      throw err
    }
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    try {
      const validKey = validateSettingsKey(key)
      const validValue = validateSettingsValue(validKey, value)
      execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [validKey, validValue])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('settings:setMultiple', (_event, settings: Record<string, string>) => {
    try {
      const validated = validateSettings(settings)
      for (const [key, value] of Object.entries(validated)) {
        execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
      }
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('license:check', () => checkLicense())

  ipcMain.handle('license:activate', (_event, key: string) => {
    try {
      const validKey = requireString(key, 'Clé de licence', 19)
      return activateLicense(validKey)
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, message: err.message }
      throw err
    }
  })

  ipcMain.handle('license:deactivate', () => {
    deactivateLicense()
    return { success: true }
  })

  ipcMain.handle('backup:run', () => {
    const path = performBackup()
    return { success: true, path }
  })

  ipcMain.handle('backup:getPath', () => getBackupPath())

  ipcMain.handle('dashboard:stats', () => {
    const totalClients = (queryOne('SELECT COUNT(*) as count FROM clients') as { count: number }).count
    const devisStats = queryAll('SELECT statut, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM devis GROUP BY statut')
    const factureStats = queryAll('SELECT statut, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM factures GROUP BY statut')
    const chiffreAffaires = (queryOne("SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut = 'payee'") as { total: number }).total
    const enAttente = (queryOne("SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut IN ('envoyee', 'en_retard')") as { total: number }).total
    return { totalClients, devisStats, factureStats, chiffreAffaires, enAttente }
  })
}
