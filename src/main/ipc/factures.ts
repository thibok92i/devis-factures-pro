import { ipcMain, dialog, shell } from 'electron'
import { v4 as uuid } from 'uuid'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import { generatePdf, getDefaultExportPath } from '../services/pdf'
import { generateFactureHtml } from '../services/pdf-templates'
import { generateNumero, getNumFormat, getPrefix } from '../utils/numbering'
import {
  requireUUID,
  validateFactureStatut,
  validateLignes,
  optionalDate,
  optionalString,
  requireNumber,
  requireEnum,
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
    const paiements = queryAll('SELECT * FROM paiements WHERE facture_id = ? ORDER BY date DESC', [validId])
    return { ...facture, lignes, paiements }
  })

  ipcMain.handle('factures:createFromDevis', (_event, devisId: string) => {
    try {
      const validDevisId = requireUUID(devisId, 'ID devis')
      const devis = queryOne('SELECT * FROM devis WHERE id = ?', [validDevisId]) as Record<string, unknown>
      if (!devis) throw new Error('Devis introuvable')
      const devisLignes = queryAll('SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre', [validDevisId])
      const factureId = uuid()
      const numero = generateNumero('facture', getPrefix('facture_prefix', 'F'), getNumFormat())
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
      const numero = generateNumero('facture', getPrefix('facture_prefix', 'F'), getNumFormat())
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
      execute('DELETE FROM paiements WHERE facture_id = ?', [validId])
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
      const facture = queryOne('SELECT remise_pourcent, taux_tva FROM factures WHERE id = ?', [validId]) as { remise_pourcent: number; taux_tva: number } | undefined
      if (!facture) return { success: false, error: 'Facture introuvable' }
      const remiseMontant = sousTotal * ((facture.remise_pourcent || 0) / 100)
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

  // --- Paiements (partial payments / acomptes) ---

  ipcMain.handle('paiements:list', (_event, factureId: string) => {
    const validId = requireUUID(factureId, 'ID facture')
    return queryAll('SELECT * FROM paiements WHERE facture_id = ? ORDER BY date DESC', [validId])
  })

  ipcMain.handle('paiements:add', (_event, data: Record<string, unknown>) => {
    try {
      const factureId = requireUUID(data.facture_id, 'ID facture')
      const montant = requireNumber(data.montant, 'Montant', 0.01, 9999999)
      const date = optionalDate(data.date, 'Date') || new Date().toISOString().slice(0, 10)
      const methode = requireEnum(data.methode as string, 'Méthode', ['virement', 'especes', 'carte', 'cheque', 'autre'])
      const notes = optionalString(data.notes, 'Notes', 500)

      const id = uuid()
      execute(
        `INSERT INTO paiements (id, facture_id, montant, date, methode, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, factureId, montant, date, methode, notes]
      )
      // Update montant_paye on facture
      const totalPaye = (queryOne('SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE facture_id = ?', [factureId]) as { total: number }).total
      execute("UPDATE factures SET montant_paye = ?, updated_at = datetime('now') WHERE id = ?", [totalPaye, factureId])
      // Auto-mark as payee if fully paid
      const facture = queryOne('SELECT total FROM factures WHERE id = ?', [factureId]) as { total: number } | undefined
      if (facture && totalPaye >= facture.total) {
        execute("UPDATE factures SET statut = 'payee', date_paiement = ?, updated_at = datetime('now') WHERE id = ?", [date, factureId])
      }
      saveToFile()
      return { success: true, id, montant_paye: totalPaye }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('paiements:delete', (_event, id: string) => {
    try {
      const validId = requireUUID(id, 'ID paiement')
      const paiement = queryOne('SELECT facture_id FROM paiements WHERE id = ?', [validId]) as { facture_id: string } | undefined
      if (!paiement) return { success: false, error: 'Paiement introuvable' }

      execute('DELETE FROM paiements WHERE id = ?', [validId])
      // Recalculate montant_paye
      const totalPaye = (queryOne('SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE facture_id = ?', [paiement.facture_id]) as { total: number }).total
      execute("UPDATE factures SET montant_paye = ?, updated_at = datetime('now') WHERE id = ?", [totalPaye, paiement.facture_id])
      saveToFile()
      return { success: true, montant_paye: totalPaye }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  // --- Lettre de relance (payment reminder) ---
  ipcMain.handle('factures:exportRelance', async (_event, id: string) => {
    const validId = requireUUID(id, 'ID facture')
    const facture = queryOne(
      `SELECT f.*, c.nom as client_nom, c.prenom as client_prenom,
              c.entreprise as client_entreprise, c.adresse as client_adresse,
              c.npa as client_npa, c.ville as client_ville
       FROM factures f LEFT JOIN clients c ON f.client_id = c.id WHERE f.id = ?`, [validId]) as Record<string, unknown>
    if (!facture) return { success: false, error: 'Facture introuvable' }

    const settingsRows = queryAll('SELECT key, value FROM settings') as Array<{ key: string; value: string }>
    const settings = Object.fromEntries(settingsRows.map((r) => [r.key, r.value]))

    const paye = Number(facture.montant_paye) || 0
    const total = Number(facture.total) || 0
    const reste = total - paye
    const today = new Date().toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' })
    const echeanceDate = new Date(String(facture.echeance)).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' })
    const clientName = facture.client_entreprise
      ? String(facture.client_entreprise)
      : [facture.client_prenom, facture.client_nom].filter(Boolean).join(' ')

    const formatMontant = (n: number) => `CHF ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; margin: 50px 60px; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .company { font-size: 10pt; color: #555; }
  .company strong { color: #1a1a1a; font-size: 12pt; }
  .recipient { margin-bottom: 30px; }
  .recipient p { margin: 2px 0; }
  .date { text-align: right; margin-bottom: 30px; color: #555; }
  h1 { font-size: 16pt; color: #c0392b; margin-bottom: 20px; border-bottom: 2px solid #c0392b; padding-bottom: 8px; }
  .ref-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .ref-table td { padding: 6px 12px; font-size: 10pt; }
  .ref-table tr:nth-child(odd) { background: #f8f8f8; }
  .ref-table .label { color: #555; width: 200px; }
  .ref-table .value { font-weight: 600; }
  .amount { font-size: 14pt; font-weight: 700; color: #c0392b; }
  .body-text { margin: 25px 0; }
  .closing { margin-top: 40px; }
  .footer { margin-top: 60px; font-size: 9pt; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
</style></head><body>
<div class="header">
  <div class="company">
    <strong>${settings.entreprise_nom || 'DevisPro'}</strong><br>
    ${settings.entreprise_adresse || ''}<br>
    ${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}<br>
    ${settings.entreprise_telephone ? 'Tél: ' + settings.entreprise_telephone : ''}
    ${settings.entreprise_email ? '<br>' + settings.entreprise_email : ''}
  </div>
</div>

<div class="recipient">
  ${facture.client_entreprise ? '<p><strong>' + facture.client_entreprise + '</strong></p>' : ''}
  <p>${[facture.client_prenom, facture.client_nom].filter(Boolean).join(' ')}</p>
  <p>${facture.client_adresse || ''}</p>
  <p>${facture.client_npa || ''} ${facture.client_ville || ''}</p>
</div>

<div class="date">${settings.entreprise_ville || ''}, le ${today}</div>

<h1>Rappel de paiement</h1>

<div class="body-text">
  <p>Madame, Monsieur,</p>
  <p>Sauf erreur de notre part, nous constatons que la facture ci-dessous demeure impayée à ce jour :</p>
</div>

<table class="ref-table">
  <tr><td class="label">N° de facture</td><td class="value">${facture.numero}</td></tr>
  <tr><td class="label">Date de la facture</td><td class="value">${new Date(String(facture.date)).toLocaleDateString('fr-CH', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
  <tr><td class="label">Échéance</td><td class="value">${echeanceDate}</td></tr>
  <tr><td class="label">Montant total</td><td class="value">${formatMontant(total)}</td></tr>
  ${paye > 0 ? `<tr><td class="label">Déjà payé</td><td class="value">${formatMontant(paye)}</td></tr>` : ''}
  <tr><td class="label">Solde restant dû</td><td class="value amount">${formatMontant(reste)}</td></tr>
</table>

<div class="body-text">
  <p>Nous vous prions de bien vouloir procéder au règlement de ce montant dans les <strong>10 jours</strong> suivant la réception de ce courrier.</p>
  ${settings.entreprise_iban ? `<p>Coordonnées bancaires :<br><strong>IBAN : ${settings.entreprise_iban}</strong>${settings.entreprise_banque ? '<br>' + settings.entreprise_banque : ''}</p>` : ''}
  <p>Si le paiement a été effectué entre-temps, nous vous prions de considérer ce rappel comme sans objet.</p>
</div>

<div class="closing">
  <p>Avec nos meilleures salutations,</p>
  <p><strong>${settings.entreprise_nom || ''}</strong></p>
</div>

<div class="footer">${settings.entreprise_nom || ''} · ${settings.entreprise_adresse || ''} · ${settings.entreprise_npa || ''} ${settings.entreprise_ville || ''}</div>
</body></html>`

    const defaultPath = getDefaultExportPath('facture', `Relance_${facture.numero}`)
    const { filePath } = await dialog.showSaveDialog({ defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }] })
    if (!filePath) return { success: false, message: 'Export annulé' }
    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    await generatePdf(html, filePath)
    shell.openPath(filePath)
    return { success: true, path: filePath }
  })

  // --- Create credit note (avoir) ---
  ipcMain.handle('factures:createAvoir', (_event, factureId: string) => {
    try {
      const validId = requireUUID(factureId, 'ID facture')
      const facture = queryOne('SELECT * FROM factures WHERE id = ?', [validId]) as Record<string, unknown>
      if (!facture) return { success: false, error: 'Facture introuvable' }
      const lignes = queryAll('SELECT * FROM facture_lignes WHERE facture_id = ? ORDER BY ordre', [validId]) as Array<Record<string, unknown>>

      const avoirId = uuid()
      const numero = generateNumero('facture', 'A', getNumFormat())

      execute(
        `INSERT INTO factures (id, numero, devis_id, client_id, date, echeance, statut,
         sous_total, taux_tva, montant_tva, total, remise_pourcent, remise_montant, notes, conditions, type, facture_reference_id)
         VALUES (?, ?, NULL, ?, date('now'), date('now'), 'brouillon', ?, ?, ?, ?, ?, ?, ?, ?, 'avoir', ?)`,
        [avoirId, numero, facture.client_id,
         -(Number(facture.sous_total) || 0),
         facture.taux_tva,
         -(Number(facture.montant_tva) || 0),
         -(Number(facture.total) || 0),
         facture.remise_pourcent,
         -(Number(facture.remise_montant) || 0),
         `Avoir pour facture ${facture.numero}`,
         facture.conditions,
         validId]
      )

      for (const l of lignes) {
        execute(
          `INSERT INTO facture_lignes (id, facture_id, catalogue_item_id, designation, description, unite, quantite, prix_unitaire, total, ordre)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), avoirId, l.catalogue_item_id, l.designation, l.description, l.unite,
           -(Number(l.quantite) || 0), l.prix_unitaire, -(Number(l.total) || 0), l.ordre]
        )
      }
      saveToFile()
      return { success: true, id: avoirId, numero }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
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
