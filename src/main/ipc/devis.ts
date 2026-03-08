import { ipcMain, dialog, shell } from 'electron'
import { v4 as uuid } from 'uuid'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import { generatePdf, getDefaultExportPath } from '../services/pdf'
import { generateDevisHtml } from '../services/pdf-templates'
import { generateNumero, getNumFormat, getPrefix } from '../utils/numbering'
import {
  validateDevisCreate,
  validateDevisUpdate,
  validateLignes,
  validateDevisStatut,
  validateRemise,
  requireUUID,
  ValidationError
} from '../security/validators'

export function registerDevisHandlers(): void {
  ipcMain.handle('devis:list', () => queryAll(
    `SELECT d.*, c.nom as client_nom, c.prenom as client_prenom, c.entreprise as client_entreprise
     FROM devis d LEFT JOIN clients c ON d.client_id = c.id ORDER BY d.created_at DESC`
  ))

  ipcMain.handle('devis:get', (_event, id: string) => {
    const validId = requireUUID(id, 'ID devis')
    const devis = queryOne(
      `SELECT d.*, c.nom as client_nom, c.prenom as client_prenom,
              c.entreprise as client_entreprise, c.adresse as client_adresse,
              c.npa as client_npa, c.ville as client_ville,
              c.telephone as client_telephone, c.email as client_email
       FROM devis d LEFT JOIN clients c ON d.client_id = c.id WHERE d.id = ?`, [validId])
    const lignes = queryAll('SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre', [validId])
    return { ...devis, lignes }
  })

  ipcMain.handle('devis:create', (_event, data: Record<string, unknown>) => {
    try {
      const v = validateDevisCreate(data)
      const id = uuid()
      const numero = generateNumero('devis', getPrefix('devis_prefix', 'D'), getNumFormat())
      // Feature 3: Auto-fill conditions from settings if not provided
    let conditions = v.conditions
    if (!conditions) {
      const setting = queryOne("SELECT value FROM settings WHERE key = 'conditions_devis'") as { value: string } | undefined
      if (setting?.value) conditions = setting.value
    }

    execute(
        `INSERT INTO devis (id, numero, client_id, date, validite, statut, objet, notes, conditions)
         VALUES (?, ?, ?, ?, ?, 'brouillon', ?, ?, ?)`,
        [id, numero, v.client_id, v.date, v.validite, v.objet, v.notes, conditions]
      )
      saveToFile()
      return { id, numero }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('devis:update', (_event, id: string, data: Record<string, unknown>) => {
    try {
      const validId = requireUUID(id, 'ID devis')
      const v = validateDevisUpdate(data)
      execute(`UPDATE devis SET client_id=?, date=?, validite=?, statut=?, objet=?, notes=?, conditions=?, updated_at=datetime('now') WHERE id=?`,
        [v.client_id, v.date, v.validite, v.statut, v.objet, v.notes, v.conditions, validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('devis:delete', (_event, id: string) => {
    try {
      const validId = requireUUID(id, 'ID devis')
      execute('DELETE FROM devis_lignes WHERE devis_id = ?', [validId])
      execute('DELETE FROM devis WHERE id = ?', [validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('devis:saveLignes', (_event, devisId: string, lignes: Array<Record<string, unknown>>) => {
    try {
      const validId = requireUUID(devisId, 'ID devis')
      const validLignes = validateLignes(lignes)

      execute('DELETE FROM devis_lignes WHERE devis_id = ?', [validId])
      let sousTotal = 0
      for (let i = 0; i < validLignes.length; i++) {
        const l = validLignes[i]
        const lineTotal = l.quantite * l.prix_unitaire
        if (!l.is_option) sousTotal += lineTotal
        execute(
          `INSERT INTO devis_lignes (id, devis_id, catalogue_item_id, designation, description, unite, quantite, prix_unitaire, total, ordre, is_option, note_interne)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), validId, l.catalogue_item_id, l.designation, l.description, l.unite, l.quantite, l.prix_unitaire, lineTotal, i, l.is_option, l.note_interne || null]
        )
      }
      const devis = queryOne('SELECT remise_pourcent, taux_tva FROM devis WHERE id = ?', [validId]) as { remise_pourcent: number; taux_tva: number } | undefined
      if (!devis) return { success: false, error: 'Devis introuvable' }
      const remiseMontant = sousTotal * ((devis.remise_pourcent || 0) / 100)
      const apresRemise = sousTotal - remiseMontant
      const montantTva = apresRemise * ((devis.taux_tva || 0) / 100)
      const total = apresRemise + montantTva
      execute(`UPDATE devis SET sous_total=?, remise_montant=?, montant_tva=?, total=?, updated_at=datetime('now') WHERE id=?`,
        [sousTotal, remiseMontant, montantTva, total, validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('devis:updateRemise', (_event, devisId: string, remisePourcent: number) => {
    try {
      const validId = requireUUID(devisId, 'ID devis')
      const validRemise = validateRemise(remisePourcent)
      const devis = queryOne('SELECT sous_total, taux_tva FROM devis WHERE id = ?', [validId]) as { sous_total: number; taux_tva: number } | undefined
      if (!devis) return { success: false, error: 'Devis introuvable' }
      const remiseMontant = (devis.sous_total || 0) * (validRemise / 100)
      const apresRemise = devis.sous_total - remiseMontant
      const montantTva = apresRemise * (devis.taux_tva / 100)
      execute(`UPDATE devis SET remise_pourcent=?, remise_montant=?, montant_tva=?, total=?, updated_at=datetime('now') WHERE id=?`,
        [validRemise, remiseMontant, apresRemise + montantTva, apresRemise + montantTva, validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('devis:updateStatut', (_event, id: string, statut: string) => {
    try {
      const validId = requireUUID(id, 'ID devis')
      const validStatut = validateDevisStatut(statut)
      execute("UPDATE devis SET statut=?, updated_at=datetime('now') WHERE id=?", [validStatut, validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('devis:duplicate', (_event, devisId: string) => {
    try {
      const validId = requireUUID(devisId, 'ID devis')
      const original = queryOne('SELECT * FROM devis WHERE id = ?', [validId]) as Record<string, unknown>
      if (!original) return { success: false, message: 'Devis introuvable' }

      const lignes = queryAll('SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre', [validId]) as Array<Record<string, unknown>>

      const newId = uuid()
      const newNumero = generateNumero('devis', getPrefix('devis_prefix', 'D'), getNumFormat())

      const today = new Date().toISOString().slice(0, 10)
      const validite = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

      execute(
        `INSERT INTO devis (id, numero, client_id, date, validite, statut, objet, notes, conditions, remise_pourcent, taux_tva, sous_total, remise_montant, montant_tva, total)
         VALUES (?, ?, ?, ?, ?, 'brouillon', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, newNumero, original.client_id, today, validite, original.objet || null, original.notes || null, original.conditions || null,
         original.remise_pourcent || 0, original.taux_tva || 0, original.sous_total || 0, original.remise_montant || 0, original.montant_tva || 0, original.total || 0]
      )

      for (let i = 0; i < lignes.length; i++) {
        const l = lignes[i]
        execute(
          `INSERT INTO devis_lignes (id, devis_id, catalogue_item_id, designation, description, unite, quantite, prix_unitaire, total, ordre, is_option)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), newId, l.catalogue_item_id || null, l.designation, l.description || null, l.unite || 'pce', l.quantite, l.prix_unitaire, l.total, i, l.is_option || 0]
        )
      }

      saveToFile()
      return { success: true, id: newId, numero: newNumero }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('devis:exportPdf', async (_event, id: string) => {
    const validId = requireUUID(id, 'ID devis')
    const devis = queryOne(
      `SELECT d.*, c.nom as client_nom, c.prenom as client_prenom,
              c.entreprise as client_entreprise, c.adresse as client_adresse,
              c.npa as client_npa, c.ville as client_ville
       FROM devis d LEFT JOIN clients c ON d.client_id = c.id WHERE d.id = ?`, [validId]) as Record<string, unknown>
    const lignes = queryAll('SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre', [validId])
    const settingsRows = queryAll('SELECT key, value FROM settings') as Array<{ key: string; value: string }>
    const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))
    const html = generateDevisHtml(devis, lignes, settings)
    const defaultPath = getDefaultExportPath('devis', devis.numero as string)
    const { filePath } = await dialog.showSaveDialog({ defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }] })
    if (!filePath) return { success: false, message: 'Export annulé' }
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    await generatePdf(html, filePath)
    shell.openPath(filePath)
    return { success: true, path: filePath }
  })
}
