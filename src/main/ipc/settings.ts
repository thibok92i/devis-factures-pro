import { ipcMain, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import { activateLicense, checkLicense, deactivateLicense } from '../services/license'
import { performBackup, getBackupPath, listBackups, restoreBackup } from '../services/backup'
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
      console.error('[License] Activation error:', err)
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      return { success: false, message }
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

  ipcMain.handle('backup:list', () => listBackups())

  ipcMain.handle('backup:restore', (_event, fileName: string) => {
    if (typeof fileName !== 'string' || !fileName) {
      return { success: false, error: 'Nom de fichier requis' }
    }
    return restoreBackup(fileName)
  })

  // ============================================================
  // Dashboard stats
  // ============================================================

  ipcMain.handle('dashboard:stats', () => {
    const totalClients = (queryOne('SELECT COUNT(*) as count FROM clients') as { count: number }).count
    const devisStats = queryAll('SELECT statut, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM devis GROUP BY statut')
    const factureStats = queryAll('SELECT statut, COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM factures GROUP BY statut')
    const chiffreAffaires = (queryOne("SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut = 'payee'") as { total: number }).total
    const enAttente = (queryOne("SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut IN ('envoyee', 'en_retard')") as { total: number }).total
    return { totalClients, devisStats, factureStats, chiffreAffaires, enAttente }
  })

  // Monthly revenue for chart (last 12 months)
  ipcMain.handle('dashboard:monthlyRevenue', () => {
    const rows = queryAll(`
      SELECT
        strftime('%Y-%m', date) as mois,
        COALESCE(SUM(CASE WHEN statut = 'payee' THEN total ELSE 0 END), 0) as encaisse,
        COALESCE(SUM(total), 0) as facture
      FROM factures
      WHERE date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY mois ASC
    `)
    return rows
  })

  // ============================================================
  // Logo upload (file dialog → base64 → settings)
  // ============================================================

  ipcMain.handle('settings:uploadLogo', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Choisir un logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }],
      properties: ['openFile']
    })
    if (!filePaths || filePaths.length === 0) return { success: false }
    const filePath = filePaths[0]
    const fileBuffer = readFileSync(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg'
    const base64 = `data:${mime};base64,${fileBuffer.toString('base64')}`
    // Max 150KB for logo
    if (base64.length > 150000) {
      return { success: false, error: 'Image trop volumineuse (max 100KB)' }
    }
    execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['entreprise_logo', base64])
    saveToFile()
    return { success: true, logo: base64 }
  })

  // ============================================================
  // Export comptable CSV
  // ============================================================

  ipcMain.handle('export:facturesCsv', async () => {
    const factures = queryAll(`
      SELECT f.numero, f.date, f.echeance, f.statut, f.sous_total, f.taux_tva, f.montant_tva,
             f.total, f.remise_pourcent, f.remise_montant, f.date_paiement,
             c.nom as client_nom, c.prenom as client_prenom, c.entreprise as client_entreprise,
             c.adresse as client_adresse, c.npa as client_npa, c.ville as client_ville
      FROM factures f LEFT JOIN clients c ON f.client_id = c.id
      ORDER BY f.date DESC
    `) as Record<string, unknown>[]

    if (factures.length === 0) return { success: false, error: 'Aucune facture à exporter' }

    const headers = ['Numéro', 'Date', 'Échéance', 'Statut', 'Client', 'Entreprise', 'Adresse', 'NPA', 'Ville', 'Sous-total', 'Remise %', 'Remise CHF', 'TVA %', 'TVA CHF', 'Total TTC', 'Date paiement']
    const csvRows = [headers.join(';')]
    for (const f of factures) {
      const clientName = [f.client_prenom, f.client_nom].filter(Boolean).join(' ')
      const row = [
        f.numero, f.date, f.echeance, f.statut,
        clientName, f.client_entreprise || '', f.client_adresse || '', f.client_npa || '', f.client_ville || '',
        (f.sous_total as number).toFixed(2), (f.remise_pourcent as number).toFixed(1), (f.remise_montant as number).toFixed(2),
        (f.taux_tva as number).toFixed(1), (f.montant_tva as number).toFixed(2), (f.total as number).toFixed(2),
        f.date_paiement || ''
      ]
      csvRows.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    }

    const csv = '\uFEFF' + csvRows.join('\n') // BOM for Excel UTF-8
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `export-factures-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!filePath) return { success: false, message: 'Export annulé' }
    writeFileSync(filePath, csv, 'utf-8')
    return { success: true, path: filePath, count: factures.length }
  })

  // ============================================================
  // Import catalogue CSV
  // ============================================================

  ipcMain.handle('catalogue:importCsv', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Importer un catalogue CSV',
      filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }],
      properties: ['openFile']
    })
    if (!filePaths || filePaths.length === 0) return { success: false }

    const content = readFileSync(filePaths[0], 'utf-8')
    const lines = content.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { success: false, error: 'Fichier CSV vide ou invalide' }

    // Parse header
    const headerLine = lines[0]
    const sep = headerLine.includes(';') ? ';' : ','
    const headers = headerLine.split(sep).map(h => h.replace(/"/g, '').trim().toLowerCase())

    // Map columns
    const colMap: Record<string, number> = {}
    headers.forEach((h, i) => {
      if (h.includes('référence') || h.includes('reference') || h === 'ref') colMap.reference = i
      if (h.includes('désignation') || h.includes('designation') || h === 'nom' || h === 'name') colMap.designation = i
      if (h === 'type') colMap.type = i
      if (h.includes('unité') || h.includes('unite') || h === 'unit') colMap.unite = i
      if (h.includes('prix') || h === 'price') colMap.prix_unitaire = i
      if (h.includes('catégorie') || h.includes('categorie') || h === 'category') colMap.categorie = i
    })

    if (colMap.designation === undefined) {
      return { success: false, error: 'Colonne "désignation" introuvable dans le CSV' }
    }

    const { v4: uuid } = await import('uuid')
    let imported = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.replace(/^"|"$/g, '').trim())
      const designation = cols[colMap.designation]
      if (!designation) continue

      const type = cols[colMap.type]?.toLowerCase() === 'main_oeuvre' ? 'main_oeuvre' : 'materiau'
      const reference = cols[colMap.reference] || ''
      const unite = cols[colMap.unite] || 'pce'
      const prix = parseFloat(cols[colMap.prix_unitaire] || '0') || 0
      const categorie = cols[colMap.categorie] || null

      execute(
        `INSERT INTO catalogue (id, type, reference, designation, unite, prix_unitaire, categorie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), type, reference, designation, unite, prix, categorie]
      )
      imported++
    }

    saveToFile()
    return { success: true, count: imported }
  })
}
