import { app } from 'electron'
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import { getDbPath } from '../database'

let backupInterval: ReturnType<typeof setInterval> | null = null

function getBackupDir(): string {
  const documentsPath = app.getPath('documents')
  const backupDir = join(documentsPath, 'DevisPro', 'Sauvegardes')
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }
  return backupDir
}

export function performBackup(): string {
  const dbPath = getDbPath()
  if (!existsSync(dbPath)) return ''

  const backupDir = getBackupDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupPath = join(backupDir, `devispro_${timestamp}.db`)

  copyFileSync(dbPath, backupPath)
  cleanOldBackups(backupDir)
  return backupPath
}

function cleanOldBackups(backupDir: string, maxBackups = 20): void {
  const files = readdirSync(backupDir)
    .filter((f) => f.startsWith('devispro_') && f.endsWith('.db'))
    .map((f) => ({
      name: f,
      path: join(backupDir, f),
      time: statSync(join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time)

  // Remove oldest backups beyond limit
  for (let i = maxBackups; i < files.length; i++) {
    unlinkSync(files[i].path)
  }
}

export function startAutoBackup(intervalMinutes = 30): void {
  // Initial backup
  try {
    performBackup()
  } catch {
    // Silently fail on initial backup
  }

  // Schedule periodic backups
  backupInterval = setInterval(
    () => {
      try {
        performBackup()
      } catch {
        // Silently fail on scheduled backup
      }
    },
    intervalMinutes * 60 * 1000
  )
}

export function stopAutoBackup(): void {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
  }
}

export function getBackupPath(): string {
  return getBackupDir()
}
