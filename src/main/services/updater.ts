/**
 * Auto-Update Service
 *
 * Uses electron-updater to check for updates from GitHub Releases.
 *
 * How it works:
 * 1. On app start, checks GitHub Releases for a newer version
 * 2. If found, notifies the renderer via IPC
 * 3. User can choose to download & install
 * 4. App restarts with the new version
 *
 * To publish a new version:
 * 1. Update version in package.json (e.g., "1.0.0" → "1.1.0")
 * 2. Run: npm run package:win
 * 3. Create a GitHub Release with the tag v1.1.0
 * 4. Upload the .exe installer + latest.yml from release/ folder
 * 5. Done! All users will be notified automatically.
 */

import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

/**
 * Initialize the auto-updater.
 * Call this once from the main process after the window is created.
 */
export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  // Don't check for updates in development
  if (is.dev) {
    console.log('[Updater] Skipping update check in dev mode')
    return
  }

  // Configure updater
  autoUpdater.autoDownload = false // Don't auto-download — let user decide
  autoUpdater.autoInstallOnAppQuit = true // Install on quit if downloaded

  // ─── Events ────────────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update:checking')
  })

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', () => {
    sendToRenderer('update:downloaded')
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message)
    sendToRenderer('update:error', err.message)
  })

  // ─── IPC Handlers ──────────────────────────────────────────

  ipcMain.handle('updater:check', () => {
    autoUpdater.checkForUpdates()
    return { success: true }
  })

  ipcMain.handle('updater:download', () => {
    autoUpdater.downloadUpdate()
    return { success: true }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Check for updates 5 seconds after launch
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('[Updater] Failed to check for updates:', err)
    }
  }, 5000)

  // Then check every 4 hours
  setInterval(
    () => {
      try {
        autoUpdater.checkForUpdates()
      } catch {
        // Silently fail — user might be offline
      }
    },
    4 * 60 * 60 * 1000
  )
}

/**
 * Send update event to the renderer process
 */
function sendToRenderer(channel: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}
