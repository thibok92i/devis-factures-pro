import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom API exposed to renderer
const api = {
  // Clients
  clients: {
    list: () => ipcRenderer.invoke('clients:list'),
    get: (id: string) => ipcRenderer.invoke('clients:get', id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('clients:create', data),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('clients:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('clients:delete', id),
    search: (query: string) => ipcRenderer.invoke('clients:search', query)
  },

  // Devis
  devis: {
    list: () => ipcRenderer.invoke('devis:list'),
    get: (id: string) => ipcRenderer.invoke('devis:get', id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('devis:create', data),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('devis:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('devis:delete', id),
    saveLignes: (devisId: string, lignes: Array<Record<string, unknown>>) =>
      ipcRenderer.invoke('devis:saveLignes', devisId, lignes),
    updateRemise: (devisId: string, remisePourcent: number) =>
      ipcRenderer.invoke('devis:updateRemise', devisId, remisePourcent),
    updateStatut: (id: string, statut: string) =>
      ipcRenderer.invoke('devis:updateStatut', id, statut),
    exportPdf: (id: string) => ipcRenderer.invoke('devis:exportPdf', id),
    duplicate: (id: string) => ipcRenderer.invoke('devis:duplicate', id)
  },

  // Factures
  factures: {
    list: () => ipcRenderer.invoke('factures:list'),
    get: (id: string) => ipcRenderer.invoke('factures:get', id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('factures:create', data),
    createFromDevis: (devisId: string) => ipcRenderer.invoke('factures:createFromDevis', devisId),
    delete: (id: string) => ipcRenderer.invoke('factures:delete', id),
    saveLignes: (factureId: string, lignes: Array<Record<string, unknown>>) =>
      ipcRenderer.invoke('factures:saveLignes', factureId, lignes),
    updateStatut: (id: string, statut: string) =>
      ipcRenderer.invoke('factures:updateStatut', id, statut),
    exportPdf: (id: string) => ipcRenderer.invoke('factures:exportPdf', id),
    exportRelance: (id: string) => ipcRenderer.invoke('factures:exportRelance', id),
    createAvoir: (factureId: string) => ipcRenderer.invoke('factures:createAvoir', factureId),
    checkOverdue: () => ipcRenderer.invoke('factures:checkOverdue'),
    overdue: () => ipcRenderer.invoke('factures:overdue')
  },

  // Paiements
  paiements: {
    list: (factureId: string) => ipcRenderer.invoke('paiements:list', factureId),
    add: (data: Record<string, unknown>) => ipcRenderer.invoke('paiements:add', data),
    delete: (id: string) => ipcRenderer.invoke('paiements:delete', id)
  },

  // Catalogue
  catalogue: {
    list: (type?: string) => ipcRenderer.invoke('catalogue:list', type),
    get: (id: string) => ipcRenderer.invoke('catalogue:get', id),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('catalogue:create', data),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('catalogue:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('catalogue:delete', id),
    search: (query: string) => ipcRenderer.invoke('catalogue:search', query),
    categories: () => ipcRenderer.invoke('catalogue:categories'),
    toggleFavorite: (id: string) => ipcRenderer.invoke('catalogue:toggleFavorite', id)
  },

  // Settings
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    setMultiple: (settings: Record<string, string>) =>
      ipcRenderer.invoke('settings:setMultiple', settings),
    uploadLogo: () => ipcRenderer.invoke('settings:uploadLogo')
  },

  // License
  license: {
    check: () => ipcRenderer.invoke('license:check'),
    activate: (key: string) => ipcRenderer.invoke('license:activate', key),
    deactivate: () => ipcRenderer.invoke('license:deactivate')
  },

  // Backup
  backup: {
    run: () => ipcRenderer.invoke('backup:run'),
    getPath: () => ipcRenderer.invoke('backup:getPath'),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (fileName: string) => ipcRenderer.invoke('backup:restore', fileName)
  },

  // Forfaits
  forfaits: {
    list: () => ipcRenderer.invoke('forfaits:list'),
    get: (id: string) => ipcRenderer.invoke('forfaits:get', id),
    calculate: (id: string, quantite: number) =>
      ipcRenderer.invoke('forfaits:calculate', id, quantite),
    create: (data: Record<string, unknown>) => ipcRenderer.invoke('forfaits:create', data),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('forfaits:update', id, data),
    createFromDevis: (devisId: string, nom: string, uniteBase: string) =>
      ipcRenderer.invoke('forfaits:createFromDevis', devisId, nom, uniteBase),
    delete: (id: string) => ipcRenderer.invoke('forfaits:delete', id)
  },

  // Templates
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    get: (id: string) => ipcRenderer.invoke('templates:get', id),
    createFromDevis: (devisId: string, nom: string) =>
      ipcRenderer.invoke('templates:createFromDevis', devisId, nom),
    delete: (id: string) => ipcRenderer.invoke('templates:delete', id),
    rename: (id: string, nom: string) =>
      ipcRenderer.invoke('templates:rename', id, nom)
  },

  // Dashboard
  dashboard: {
    stats: () => ipcRenderer.invoke('dashboard:stats'),
    monthlyRevenue: (annee?: number) => ipcRenderer.invoke('dashboard:monthlyRevenue', annee)
  },

  // Rapports
  rapport: {
    caParMois: (annee: number) => ipcRenderer.invoke('rapport:caParMois', annee),
    caParClient: (annee: number) => ipcRenderer.invoke('rapport:caParClient', annee),
    topArticles: (annee: number) => ipcRenderer.invoke('rapport:topArticles', annee),
    resume: (annee: number) => ipcRenderer.invoke('rapport:resume', annee),
    anneesDisponibles: () => ipcRenderer.invoke('rapport:anneesDisponibles'),
    exportPdf: (annee: number) => ipcRenderer.invoke('rapport:exportPdf', annee)
  },

  // Export
  export: {
    facturesCsv: () => ipcRenderer.invoke('export:facturesCsv'),
    facturesComptable: (dateFrom?: string, dateTo?: string) => ipcRenderer.invoke('export:facturesComptable', dateFrom, dateTo),
    catalogueImportCsv: () => ipcRenderer.invoke('catalogue:importCsv'),
    catalogueExportCsv: () => ipcRenderer.invoke('catalogue:exportCsv')
  },

  // Save error listener
  onSaveError: (callback: (data: { message: string }) => void) => {
    const handler = (_event: unknown, data: { message: string }) => callback(data)
    ipcRenderer.on('save-error', handler)
    return () => ipcRenderer.removeListener('save-error', handler)
  },

  // Auto-Updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onUpdate: (callback: (event: string, data?: unknown) => void) => {
      const channels = ['update:checking', 'update:available', 'update:not-available', 'update:progress', 'update:downloaded', 'update:error']
      const handlers = channels.map((channel) => {
        const handler = (_event: unknown, data: unknown) => callback(channel, data)
        ipcRenderer.on(channel, handler)
        return { channel, handler }
      })
      // Return cleanup function
      return () => {
        handlers.forEach(({ channel, handler }) => ipcRenderer.removeListener(channel, handler))
      }
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback
  window.electron = electronAPI
  // @ts-expect-error fallback
  window.api = api
}
