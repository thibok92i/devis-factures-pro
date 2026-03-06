import { ipcMain, dialog, shell } from 'electron'
import { v4 as uuid } from 'uuid'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import { generatePdf, getDefaultExportPath } from '../services/pdf'
import { generateFactureHtml } from '../services/pdf-templates'
import {
  requireUUID,
  validateFactureStatut,
  validateLignes,
  optionalDate,
  optionalString,
  ValidationError
} from '../security/validators'

export function registerFactureHandlers(): void {
  ipcMain.handle('factures:list', () => queryAll(
    `SELECT f.*, c.nom as client_nom, c.prenom as client_prenom, c.entreprise as client_entreprise
     FROM factures f LEFT JOIN clients c ON f.client_id = c.id ORDER BY f.created_at DESC`
  ))

  ipcMain.handle('factures:get', (_event, id: string) => {
    const validId = requireUUID(id, 'ID facture')
    const facture = queryOne(
      `SELECT f.*, c.nom as client_nom, c.prenom as client_prenom,
              c.entreprise as client_entreprise, c.adresse as client_adresse,
              c.npa as client_npa, c.ville as client_ville,
              c.telephone as client_telephone, c.email as client_email
       FROM factures f LEFT JOIN clients c ON f.client_id = c.id WHERE f.id = ?`, [validId])
    const lignes = queryAll('SELECT * FROM facture_lignes WHERE facture_id = ? ORDER BY ordre', [validId])
    return { ...facture, lignes }
  })

  ipcMain.handle('factures:createFromDevis', (_event, devisId: string) => {
    try {
      const validDevisId = requireUUID(devisId, 'ID devis')
      const devis = queryOne('SELECT * FROM devis WHERE id = ?', [validDevisId]) as Record<string, unknown>
      if (!devis) throw new Error('Devis introuvable')
      const devisLignes = queryAll('SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre', [validDevisId])
      const factureId = uuid()
      const counter = queryOne("SELECT value FROM counters WHERE name = 'facture'") as { value: number }
      const nextNum = counter.value + 1
      const fPrefix = (queryOne("SELECT value FROM settings WHERE key = 'facture_prefix'") as { value: string } | undefined)?.value || 'F'
      const numero = `${fPrefix}-${String(nextNum).padStart(4, '0')}`
      execute("UPDATE counters SET value = ? WHERE name = 'facture'", [nextNum])
      execute(
        `INSERT INTO factures (id, numero, devis_id, client_id, date, echeance, statut,
         sous_total, taux_tva, montant_tva, total, remise_pourcent, remise_montant, notes, conditions)
         VALUES (?, ?, ?, ?, date('now'), date('now', '+30 days'), 'brouillon', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [factureId, numero, validDevisId, devis.client_id, devis.sous_total, devis.taux_tva, devis.montant_tva, devis.total, devis.remise_pourcent, devis.remise_montant, devis.notes, devis.conditions]
      )
      for (const ligne of devisLignes) {
        execute(
          `INSERT INTO facture_lignes (id, facture_id, catalogue_item_id, designation, description, unite, quantite, prix_unitaire, total, ordre)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), factureId, ligne.catalogue_item_id, ligne.designation, ligne.description, ligne.unite, ligne.quantite, ligne.prix_unitaire, ligne.total, ligne.ordre]
        )
      }
      execute("UPDATE devis SET statut='accepte', updated_at=datetime('now') WHERE id=?", [validDevisId])
      saveToFile()
      return { id: factureId, numero }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('factures:create', (_event, data: Record<string, unknown>) => {
    try {
      const clientId = requireUUID(data.client_id, 'Client')
      const date = optionalDate(data.date, 'Date') || new Date().toISOString().slice(0, 10)
      const echeance = optionalDate(data.echeance, 'Échéance') || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const notes = optionalString(data.notes, 'Notes', 5000)
      const conditions = optionalString(data.conditions, 'Conditions', 5000)

      const id = uuid()
      const counter = queryOne("SELECT value FROM counters WHERE name = 'facture'") as { value: number }
      const nextNum = counter.value + 1
      const fPrefix = (queryOne("SELECT value FROM settings WHERE key = 'facture_prefix'") as { value: string } | undefined)?.value || 'F'
      const numero = `${fPrefix}-${String(nextNum).padStart(4, '0')}`
      execute("UPDATE counters SET value = ? WHERE name = 'facture'", [nextNum])
      execute(
        `INSERT INTO factures (id, numero, client_id, date, echeance, statut, notes, conditions) VALUES (?, ?, ?, ?, ?, 'brouillon', ?, ?)`,
        [id, numero, clientId, date, echeance, notes, conditions]
      )
      saveToFile()
      return { id, numero }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('factures:updateStatut', (_event, id: string, statut: string) => {
    try {
      const validId = requireUUID(id, 'ID facture')
      const validStatut = validateFactureStatut(statut)
      if (validStatut === 'payee') {
        execute("UPDATE factures SET statut=?, date_paiement=date('now'), updated_at=datetime('now') WHERE id=?", [validStatut, validId])
      } else {
        execute("UPDATE factures SET statut=?, updated_at=datetime('now') WHERE id=?", [validStatut, validId])
      }
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('factures:delete', (_event, id: string) => {
    try {
      const validId = requireUUID(id, 'ID facture')
      execute('DELETE FROM facture_lignes WHERE facture_id = ?', [validId])
      execute('DELETE FROM factures WHERE id = ?', [validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('factures:saveLignes', (_event, factureId: string, lignes: Array<Record<string, unknown>>) => {
    try {
      const validId = requireUUID(factureId, 'ID facture')
      const validLignes = validateLignes(lignes)

      execute('DELETE FROM facture_lignes WHERE facture_id = ?', [validId])
      let sousTotal = 0
      for (let i = 0; i < validLignes.length; i++) {
        const l = validLignes[i]
        const lineTotal = l.quantite * l.prix_unitaire
        sousTotal += lineTotal
        execute(
          `INSERT INTO facture_lignes (id, facture_id, catalogue_item_id, designation, description, unite, quantite, prix_unitaire, total, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), validId, l.catalogue_item_id, l.designation, l.description, l.unite, l.quantite, l.prix_unitaire, lineTotal, i]
        )
      }
      const facture = queryOne('SELECT remise_pourcent, taux_tva FROM factures WHERE id = ?', [validId]) as { remise_pourcent: number; taux_tva: number }
      const remiseMontant = sousTotal * (facture.remise_pourcent / 100)
      const apresRemise = sousTotal - remiseMontant
      const montantTva = apresRemise * (facture.taux_tva / 100)
      const total = apresRemise + montantTva
      execute(`UPDATE factures SET sous_total=?, remise_montant=?, montant_tva=?, total=?, updated_at=datetime('now') WHERE id=?`, [sousTotal, remiseMontant, montantTva, total, validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  // Auto-detect and update overdue invoices
  ipcMain.handle('factures:checkOverdue', () => {
    const count = (queryOne(
      `SELECT COUNT(*) as count FROM factures WHERE statut = 'envoyee' AND echeance < date('now')`
    ) as { count: number }).count
    if (count > 0) {
      execute(
        `UPDATE factures SET statut = 'en_retard', updated_at = datetime('now')
         WHERE statut = 'envoyee' AND echeance < date('now')`
      )
      saveToFile()
    }
    return { updated: count }
  })

  // Get overdue invoices for alerts
  ipcMain.handle('factures:overdue', () => {
    return queryAll(
      `SELECT f.id, f.numero, f.echeance, f.total,
              c.nom as client_nom, c.prenom as client_prenom, c.entreprise as client_entreprise
       FROM factures f LEFT JOIN clients c ON f.client_id = c.id
       WHERE f.statut = 'en_retard'
       ORDER BY f.echeance ASC`
    )
  })

  ipcMain.handle('factures:exportPdf', async (_event, id: string) => {
    const validId = requireUUID(id, 'ID facture')
    const facture = queryOne(
      `SELECT f.*, c.nom as client_nom, c.prenom as client_prenom,
              c.entreprise as client_entreprise, c.adresse as client_adresse,
              c.npa as client_npa, c.ville as client_ville
       FROM factures f LEFT JOIN clients c ON f.client_id = c.id WHERE f.id = ?`, [validId]) as Record<string, unknown>
    const lignes = queryAll('SELECT * FROM facture_lignes WHERE facture_id = ? ORDER BY ordre', [validId])
    const settingsRows = queryAll('SELECT key, value FROM settings') as Array<{ key: string; value: string }>
    const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))
    const html = await generateFactureHtml(facture, lignes, settings)
    const defaultPath = getDefaultExportPath('facture', facture.numero as string)
    const { filePath } = await dialog.showSaveDialog({ defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }] })
    if (!filePath) return { success: false, message: 'Export annulé' }
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    await generatePdf(html, filePath)
    shell.openPath(filePath)
    return { success: true, path: filePath }
  })
}
