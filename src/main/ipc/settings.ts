import { ipcMain, dialog, shell } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import { generatePdf, getDefaultExportPath } from '../services/pdf'
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

  ipcMain.handle('license:check', async () => {
    return await checkLicense()
  })

  ipcMain.handle('license:activate', async (_event, key: string) => {
    try {
      const validKey = requireString(key, 'Clé de licence', 19)
      return await activateLicense(validKey)
    } catch (err) {
      console.error('[License] Activation error:', err)
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      return { success: false, message }
    }
  })

  ipcMain.handle('license:deactivate', async () => {
    await deactivateLicense()
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

  // Monthly revenue for chart (year or last 12 months)
  ipcMain.handle('dashboard:monthlyRevenue', (_event, annee?: number) => {
    if (annee && Number.isFinite(annee)) {
      const y = Number(annee)
      const rows = queryAll(`
        SELECT
          strftime('%Y-%m', date) as mois,
          COALESCE(SUM(CASE WHEN statut = 'payee' THEN total ELSE 0 END), 0) as encaisse,
          COALESCE(SUM(total), 0) as facture
        FROM factures
        WHERE strftime('%Y', date) = ?
        GROUP BY strftime('%Y-%m', date)
        ORDER BY mois ASC
      `, [String(y)])
      return rows
    }
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
  // Rapports annuels
  // ============================================================

  ipcMain.handle('rapport:caParMois', (_event, annee: number) => {
    const y = Number(annee) || new Date().getFullYear()
    // Generate all 12 months, fill with 0 if no data
    const rows = queryAll(`
      SELECT
        strftime('%m', f.date) as mois,
        COALESCE(SUM(CASE WHEN f.statut = 'payee' THEN f.total ELSE 0 END), 0) as encaisse,
        COALESCE(SUM(f.total), 0) as facture,
        COUNT(*) as nb_factures
      FROM factures f
      WHERE strftime('%Y', f.date) = ?
      GROUP BY strftime('%m', f.date)
      ORDER BY mois ASC
    `, [String(y)]) as Array<{ mois: string; encaisse: number; facture: number; nb_factures: number }>

    const result = []
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, '0')
      const found = rows.find(r => r.mois === key)
      result.push({
        mois: `${y}-${key}`,
        encaisse: found?.encaisse || 0,
        facture: found?.facture || 0,
        nb_factures: found?.nb_factures || 0
      })
    }
    return result
  })

  ipcMain.handle('rapport:caParClient', (_event, annee: number) => {
    const y = Number(annee) || new Date().getFullYear()
    return queryAll(`
      SELECT
        c.id,
        c.nom as client_nom,
        c.prenom as client_prenom,
        c.entreprise as client_entreprise,
        COALESCE(SUM(CASE WHEN f.statut = 'payee' THEN f.total ELSE 0 END), 0) as encaisse,
        COALESCE(SUM(f.total), 0) as total_facture,
        COUNT(f.id) as nb_factures
      FROM factures f
      LEFT JOIN clients c ON f.client_id = c.id
      WHERE strftime('%Y', f.date) = ?
      GROUP BY f.client_id
      ORDER BY encaisse DESC
    `, [String(y)])
  })

  ipcMain.handle('rapport:topArticles', (_event, annee: number) => {
    const y = Number(annee) || new Date().getFullYear()
    return queryAll(`
      SELECT
        fl.designation,
        fl.unite,
        SUM(fl.quantite) as total_quantite,
        AVG(fl.prix_unitaire) as prix_moyen,
        SUM(fl.total) as total_ca,
        COUNT(DISTINCT fl.facture_id) as nb_factures
      FROM facture_lignes fl
      JOIN factures f ON fl.facture_id = f.id
      WHERE strftime('%Y', f.date) = ?
        AND fl.description != '__SECTION__'
      GROUP BY fl.designation, fl.unite
      ORDER BY total_ca DESC
      LIMIT 20
    `, [String(y)])
  })

  ipcMain.handle('rapport:resume', (_event, annee: number) => {
    const y = Number(annee) || new Date().getFullYear()
    const ca = (queryOne(`SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut = 'payee' AND strftime('%Y', date) = ?`, [String(y)]) as { total: number }).total
    const totalFacture = (queryOne(`SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE strftime('%Y', date) = ?`, [String(y)]) as { total: number }).total
    const nbFactures = (queryOne(`SELECT COUNT(*) as count FROM factures WHERE strftime('%Y', date) = ?`, [String(y)]) as { count: number }).count
    const nbDevis = (queryOne(`SELECT COUNT(*) as count FROM devis WHERE strftime('%Y', date) = ?`, [String(y)]) as { count: number }).count
    const nbClients = (queryOne(`SELECT COUNT(DISTINCT client_id) as count FROM factures WHERE strftime('%Y', date) = ?`, [String(y)]) as { count: number }).count
    const enAttente = (queryOne(`SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut IN ('envoyee', 'en_retard') AND strftime('%Y', date) = ?`, [String(y)]) as { total: number }).total
    const tauxConversion = nbDevis > 0
      ? (queryOne(`SELECT COUNT(*) as count FROM devis WHERE statut = 'accepte' AND strftime('%Y', date) = ?`, [String(y)]) as { count: number }).count / nbDevis * 100
      : 0

    // Previous year for comparison
    const yPrev = String(y - 1)
    const caPrev = (queryOne(`SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut = 'payee' AND strftime('%Y', date) = ?`, [yPrev]) as { total: number }).total

    return { ca, totalFacture, nbFactures, nbDevis, nbClients, enAttente, tauxConversion: Math.round(tauxConversion), caPrev }
  })

  ipcMain.handle('rapport:anneesDisponibles', () => {
    const rows = queryAll(`
      SELECT DISTINCT strftime('%Y', date) as annee FROM factures
      UNION
      SELECT DISTINCT strftime('%Y', date) as annee FROM devis
      ORDER BY annee DESC
    `) as Array<{ annee: string }>
    const annees = rows.map(r => parseInt(r.annee)).filter(a => !isNaN(a))
    if (annees.length === 0) annees.push(new Date().getFullYear())
    return annees
  })

  // ============================================================
  // Export rapport annuel PDF
  // ============================================================

  ipcMain.handle('rapport:exportPdf', async (_event, annee: number) => {
    const y = Number(annee) || new Date().getFullYear()

    // Gather all data
    const settingsRows = queryAll('SELECT key, value FROM settings') as Array<{ key: string; value: string }>
    const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))

    const ca = (queryOne(`SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut = 'payee' AND strftime('%Y', date) = ?`, [String(y)]) as { total: number }).total
    const totalFacture = (queryOne(`SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE strftime('%Y', date) = ?`, [String(y)]) as { total: number }).total
    const nbFactures = (queryOne(`SELECT COUNT(*) as count FROM factures WHERE strftime('%Y', date) = ?`, [String(y)]) as { count: number }).count
    const nbClients = (queryOne(`SELECT COUNT(DISTINCT client_id) as count FROM factures WHERE strftime('%Y', date) = ?`, [String(y)]) as { count: number }).count
    const enAttente = (queryOne(`SELECT COALESCE(SUM(total), 0) as total FROM factures WHERE statut IN ('envoyee', 'en_retard') AND strftime('%Y', date) = ?`, [String(y)]) as { total: number }).total

    const moisData = queryAll(`
      SELECT
        strftime('%m', f.date) as mois,
        COALESCE(SUM(CASE WHEN f.statut = 'payee' THEN f.total ELSE 0 END), 0) as encaisse,
        COALESCE(SUM(f.total), 0) as facture,
        COUNT(*) as nb_factures
      FROM factures f WHERE strftime('%Y', f.date) = ?
      GROUP BY strftime('%m', f.date) ORDER BY mois ASC
    `, [String(y)]) as Array<{ mois: string; encaisse: number; facture: number; nb_factures: number }>

    const clientData = queryAll(`
      SELECT c.nom as client_nom, c.prenom as client_prenom, c.entreprise as client_entreprise,
             COALESCE(SUM(CASE WHEN f.statut = 'payee' THEN f.total ELSE 0 END), 0) as encaisse,
             COALESCE(SUM(f.total), 0) as total_facture, COUNT(f.id) as nb_factures
      FROM factures f LEFT JOIN clients c ON f.client_id = c.id
      WHERE strftime('%Y', f.date) = ? GROUP BY f.client_id ORDER BY encaisse DESC LIMIT 10
    `, [String(y)]) as Array<Record<string, unknown>>

    const articleData = queryAll(`
      SELECT fl.designation, fl.unite, SUM(fl.quantite) as total_quantite,
             AVG(fl.prix_unitaire) as prix_moyen, SUM(fl.total) as total_ca,
             COUNT(DISTINCT fl.facture_id) as nb_factures
      FROM facture_lignes fl JOIN factures f ON fl.facture_id = f.id
      WHERE strftime('%Y', f.date) = ? AND fl.description != '__SECTION__'
      GROUP BY fl.designation, fl.unite ORDER BY total_ca DESC LIMIT 15
    `, [String(y)]) as Array<Record<string, unknown>>

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

    const fmtCHF = (n: number) => new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 }).format(n)

    // Build monthly table
    let moisRows = ''
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, '0')
      const found = moisData.find(r => r.mois === key)
      const enc = found?.encaisse || 0
      const fact = found?.facture || 0
      const nb = found?.nb_factures || 0
      moisRows += `<tr><td>${monthNames[m - 1]}</td><td style="text-align:right">${nb}</td><td style="text-align:right">${fmtCHF(fact)}</td><td style="text-align:right">${fmtCHF(enc)}</td></tr>`
    }

    // Build client table
    let clientRows = ''
    for (const c of clientData) {
      const name = c.client_entreprise || [c.client_prenom, c.client_nom].filter(Boolean).join(' ')
      clientRows += `<tr><td>${name}</td><td style="text-align:right">${c.nb_factures}</td><td style="text-align:right">${fmtCHF(c.total_facture as number)}</td><td style="text-align:right">${fmtCHF(c.encaisse as number)}</td></tr>`
    }

    // Build articles table
    let articleRows = ''
    for (const a of articleData) {
      articleRows += `<tr><td>${a.designation}</td><td style="text-align:center">${a.unite}</td><td style="text-align:right">${Math.round(a.total_quantite as number * 100) / 100}</td><td style="text-align:right">${fmtCHF(a.prix_moyen as number)}</td><td style="text-align:right">${fmtCHF(a.total_ca as number)}</td></tr>`
    }

    const entreprise = settings.entreprise_nom || 'Mon Entreprise'

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 30px 40px; }
  h1 { font-size: 22px; color: #0f4c3a; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #0f4c3a; margin-top: 28px; margin-bottom: 10px; border-bottom: 2px solid #0f4c3a; padding-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: #f8f9fa; border-radius: 8px; padding: 14px; }
  .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi-value { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f0f0f0; padding: 6px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #666; border-bottom: 1px solid #ddd; }
  td { padding: 5px 10px; border-bottom: 1px solid #eee; font-size: 10px; }
  tr:nth-child(even) { background: #fafafa; }
  .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
</style></head><body>
  <h1>Rapport annuel ${y}</h1>
  <p class="subtitle">${entreprise} — Généré le ${new Date().toLocaleDateString('fr-CH')}</p>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">CA encaissé</div><div class="kpi-value">${fmtCHF(ca)}</div></div>
    <div class="kpi"><div class="kpi-label">Total facturé</div><div class="kpi-value">${fmtCHF(totalFacture)}</div></div>
    <div class="kpi"><div class="kpi-label">Clients actifs</div><div class="kpi-value">${nbClients}</div></div>
    <div class="kpi"><div class="kpi-label">En attente</div><div class="kpi-value">${fmtCHF(enAttente)}</div></div>
  </div>

  <h2>Chiffre d'affaires par mois</h2>
  <table>
    <thead><tr><th>Mois</th><th style="text-align:right">Factures</th><th style="text-align:right">Facturé</th><th style="text-align:right">Encaissé</th></tr></thead>
    <tbody>${moisRows}
      <tr style="font-weight:bold; border-top:2px solid #0f4c3a">
        <td>Total</td><td style="text-align:right">${nbFactures}</td><td style="text-align:right">${fmtCHF(totalFacture)}</td><td style="text-align:right">${fmtCHF(ca)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Top clients</h2>
  <table>
    <thead><tr><th>Client</th><th style="text-align:right">Factures</th><th style="text-align:right">Facturé</th><th style="text-align:right">Encaissé</th></tr></thead>
    <tbody>${clientRows}</tbody>
  </table>

  <h2>Top articles / prestations</h2>
  <table>
    <thead><tr><th>Désignation</th><th style="text-align:center">Unité</th><th style="text-align:right">Quantité</th><th style="text-align:right">Prix moy.</th><th style="text-align:right">CA total</th></tr></thead>
    <tbody>${articleRows}</tbody>
  </table>

  <div class="footer">Rapport généré automatiquement par DevisPro — ${entreprise}</div>
</body></html>`

    const defaultPath = getDefaultExportPath('rapport', String(y))
    const { filePath } = await dialog.showSaveDialog({
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (!filePath) return { success: false, message: 'Export annulé' }
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    await generatePdf(html, filePath)
    shell.openPath(filePath)
    return { success: true, path: filePath }
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
  // Export comptable (format Crésus / Banana / Abacus)
  // ============================================================

  ipcMain.handle('export:facturesComptable', async (_event, dateFrom?: string, dateTo?: string) => {
    let whereClause = "WHERE f.statut != 'brouillon'"
    const params: string[] = []
    if (dateFrom) { whereClause += ' AND f.date >= ?'; params.push(dateFrom) }
    if (dateTo) { whereClause += ' AND f.date <= ?'; params.push(dateTo) }

    const factures = queryAll(`
      SELECT f.numero, f.date, f.sous_total, f.taux_tva, f.montant_tva, f.total,
             f.remise_montant, f.type,
             c.nom as client_nom, c.prenom as client_prenom, c.entreprise as client_entreprise
      FROM factures f LEFT JOIN clients c ON f.client_id = c.id
      ${whereClause}
      ORDER BY f.date ASC
    `, params) as Record<string, unknown>[]

    if (factures.length === 0) return { success: false, error: 'Aucune facture à exporter pour cette période' }

    const headers = ['Date', 'N° pièce', 'Libellé', 'Débit', 'Crédit', 'Compte', 'Code TVA']
    const csvRows = [headers.join(';')]

    for (const f of factures) {
      const clientName = f.client_entreprise
        ? String(f.client_entreprise)
        : [f.client_prenom, f.client_nom].filter(Boolean).join(' ')
      const isAvoir = f.type === 'avoir'
      const montantHT = Math.abs(Number(f.sous_total) - Number(f.remise_montant))
      const montantTVA = Math.abs(Number(f.montant_tva))
      const montantTTC = Math.abs(Number(f.total))
      const tauxTva = Number(f.taux_tva)

      // Écriture comptable double (débit/crédit)
      // Facture : Débit 1100 (Débiteurs) / Crédit 3000 (Produits) + 2200 (TVA due)
      // Avoir :   Crédit 1100 (Débiteurs) / Débit 3000 (Produits) + 2200 (TVA due)
      const row = (libelle: string, debit: string, credit: string, compte: string, codeTva: string) =>
        [f.date, f.numero, libelle, debit, credit, compte, codeTva]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(';')

      if (!isAvoir) {
        // Débit Débiteurs
        csvRows.push(row(`${clientName} - ${f.numero}`, montantTTC.toFixed(2), '', '1100', ''))
        // Crédit Produits (HT)
        csvRows.push(row(`${clientName} - ${f.numero}`, '', montantHT.toFixed(2), '3000', tauxTva > 0 ? `TVA ${tauxTva}%` : ''))
        // Crédit TVA due
        if (montantTVA > 0) {
          csvRows.push(row(`TVA ${f.numero}`, '', montantTVA.toFixed(2), '2200', `TVA ${tauxTva}%`))
        }
      } else {
        // Avoir = écritures inversées
        csvRows.push(row(`Avoir ${clientName} - ${f.numero}`, '', montantTTC.toFixed(2), '1100', ''))
        csvRows.push(row(`Avoir ${clientName} - ${f.numero}`, montantHT.toFixed(2), '', '3000', tauxTva > 0 ? `TVA ${tauxTva}%` : ''))
        if (montantTVA > 0) {
          csvRows.push(row(`TVA avoir ${f.numero}`, montantTVA.toFixed(2), '', '2200', `TVA ${tauxTva}%`))
        }
      }
    }

    const csv = '\uFEFF' + csvRows.join('\n')
    const period = dateFrom && dateTo ? `${dateFrom}_${dateTo}` : new Date().toISOString().slice(0, 10)
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `export-comptable-${period}.csv`,
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

  // ============================================================
  // Export catalogue CSV
  // ============================================================

  ipcMain.handle('catalogue:exportCsv', async () => {
    const items = queryAll(`
      SELECT reference, designation, type, unite, prix_unitaire, categorie
      FROM catalogue ORDER BY categorie, designation
    `) as Record<string, unknown>[]

    if (items.length === 0) return { success: false, error: 'Catalogue vide' }

    const headers = ['Reference', 'Designation', 'Type', 'Unite', 'Prix unitaire', 'Categorie']
    const csvRows = [headers.join(';')]
    for (const item of items) {
      const row = [
        item.reference || '',
        item.designation || '',
        item.type || '',
        item.unite || '',
        (item.prix_unitaire as number).toFixed(2),
        item.categorie || ''
      ]
      csvRows.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    }

    const csv = '\uFEFF' + csvRows.join('\n')
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: `catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (!filePath) return { success: false, message: 'Export annule' }
    writeFileSync(filePath, csv, 'utf-8')
    return { success: true, path: filePath, count: items.length }
  })
}
