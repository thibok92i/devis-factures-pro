import { app, BrowserWindow, shell, session, Menu } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDb } from './database'
import { registerAllHandlers } from './ipc'
import { startAutoBackup, stopAutoBackup } from './services/backup'
import { initAutoUpdater } from './services/updater'
import { checkAndNotify } from './services/notifications'

let mainWindow: BrowserWindow | null = null

function getAppIcon(): string | undefined {
  // In production: icon is in resources/ (via extraResources)
  // In dev: icon is in build/ at project root
  const candidates = [
    join(process.resourcesPath, 'icon.png'),           // production
    join(__dirname, '../../resources/icon.png'),         // dev (from out/main/)
    join(__dirname, '../../build/icon.png')              // dev fallback
  ]
  return candidates.find((p) => existsSync(p))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'DevisPro',
    icon: getAppIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // Security hardening
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Disable DevTools in production
  if (!is.dev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools()
    })
  }

  // Block external navigation — prevent phishing/redirect attacks
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    // In dev, allow Vite HMR URLs
    if (is.dev && (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
      return
    }
    // Block all other navigation
    event.preventDefault()
  })

  // Block new window creation (popups etc.)
  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Allow opening external links in default browser
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Set Content Security Policy headers.
 * Restricts what resources the renderer can load.
 */
function setupCSP(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = is.dev
      ? // Development: allow Vite HMR and local dev server
        [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' ws://localhost:* http://localhost:*",
          "img-src 'self' data:",
          "font-src 'self' data:"
        ].join('; ')
      : // Production: strict CSP
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "connect-src 'self' https://github.com https://api.github.com https://*.githubusercontent.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'"
        ].join('; ')

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

/**
 * Additional security: block permission requests from the renderer.
 * The app doesn't need camera, microphone, geolocation, etc.
 */
function setupPermissionHandlers(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    // Deny all permission requests — this app doesn't need any
    callback(false)
  })

  session.defaultSession.setPermissionCheckHandler(() => {
    return false
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.devispro.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Setup security measures
  setupCSP()
  setupPermissionHandlers()

  // Init database (async for sql.js WASM loading)
  await initDatabase()

  // Register IPC handlers
  registerAllHandlers()

  // Start auto-backup
  startAutoBackup()

  // Remove the default menu bar (File/Edit/View/Help in English)
  Menu.setApplicationMenu(null)

  createWindow()

  // Init auto-updater (checks GitHub Releases for new versions)
  if (mainWindow) {
    initAutoUpdater(mainWindow)
  }

  // Check for overdue invoices / expiring devis and show desktop notifications
  checkAndNotify()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopAutoBackup()
  closeDb()
})

// Security: prevent creating additional renderers
app.on('web-contents-created', (_event, contents) => {
  // Block navigation in all webContents
  contents.on('will-navigate', (event) => {
    if (!is.dev) {
      event.preventDefault()
    }
  })

  // Block webview creation
  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
})
