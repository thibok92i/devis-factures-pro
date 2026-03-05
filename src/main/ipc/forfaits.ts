import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import {
  requireString,
  optionalString,
  requireNumber,
  requireUUID,
  ValidationError
} from '../security/validators'

export function registerForfaitHandlers(): void {
  // List all forfaits with line count
  ipcMain.handle('forfaits:list', () => {
    return queryAll(
      `SELECT f.*, COUNT(fl.id) as ligne_count
       FROM forfaits f LEFT JOIN forfait_lignes fl ON fl.forfait_id = f.id
       GROUP BY f.id ORDER BY f.nom`
    )
  })

  // Get a forfait with its lines
  ipcMain.handle('forfaits:get', (_event, id: string) => {
    try {
      const validId = requireString(id, 'ID forfait', 50)
      const forfait = queryOne('SELECT * FROM forfaits WHERE id = ?', [validId])
      if (!forfait) return null
      const lignes = queryAll(
        `SELECT fl.*, c.type as catalogue_type
         FROM forfait_lignes fl
         LEFT JOIN catalogue c ON c.id = fl.catalogue_item_id
         WHERE fl.forfait_id = ? ORDER BY fl.ordre`,
        [validId]
      )
      return { ...forfait, lignes }
    } catch (err) {
      if (err instanceof ValidationError) return null
      throw err
    }
  })

  // Calculate forfait lines for a given quantity
  ipcMain.handle('forfaits:calculate', (_event, id: string, quantite: number) => {
    try {
      const validId = requireString(id, 'ID forfait', 50)
      const validQte = requireNumber(quantite, 'Quantité', 0.01, 99999)
      const forfait = queryOne('SELECT * FROM forfaits WHERE id = ?', [validId]) as Record<string, unknown> | null
      if (!forfait) return { success: false, error: 'Forfait introuvable' }

      const lignes = queryAll(
        `SELECT fl.*, c.type as catalogue_type
         FROM forfait_lignes fl
         LEFT JOIN catalogue c ON c.id = fl.catalogue_item_id
         WHERE fl.forfait_id = ? ORDER BY fl.ordre`,
        [validId]
      ) as Array<Record<string, unknown>>

      const calculated = lignes.map((l) => {
        const rawQte = (l.ratio as number) * validQte
        // Round to 2 decimals, but ceiling for materials (avoid shortage)
        const qte = l.catalogue_type === 'main_oeuvre'
          ? Math.round(rawQte * 100) / 100
          : Math.ceil(rawQte * 100) / 100
        return {
          catalogue_item_id: l.catalogue_item_id || null,
          designation: l.designation,
          description: l.description || '',
          unite: l.unite,
          quantite: qte,
          prix_unitaire: l.prix_unitaire,
          total: Math.round(qte * (l.prix_unitaire as number) * 100) / 100
        }
      })

      const totalForfait = calculated.reduce((sum, l) => sum + l.total, 0)

      return {
        success: true,
        forfait_nom: forfait.nom,
        unite_base: forfait.unite_base,
        quantite_base: validQte,
        lignes: calculated,
        total: Math.round(totalForfait * 100) / 100
      }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  // Create a custom forfait
  ipcMain.handle('forfaits:create', (_event, data: Record<string, unknown>) => {
    try {
      if (!data || typeof data !== 'object') throw new ValidationError('Données forfait invalides')
      const nom = requireString(data.nom, 'Nom', 200)
      const description = optionalString(data.description, 'Description', 1000)
      const unite_base = optionalString(data.unite_base, 'Unité de base', 20) || 'm²'

      const id = uuid()
      execute(
        `INSERT INTO forfaits (id, nom, description, unite_base) VALUES (?, ?, ?, ?)`,
        [id, nom, description, unite_base]
      )

      // Insert lines if provided
      const lignes = data.lignes
      if (Array.isArray(lignes)) {
        for (let i = 0; i < lignes.length; i++) {
          const l = lignes[i] as Record<string, unknown>
          const lineId = uuid()
          execute(
            `INSERT INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, description, unite, ratio, prix_unitaire, ordre)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              lineId, id,
              l.catalogue_item_id ? requireString(l.catalogue_item_id, 'Article', 50) : null,
              requireString(l.designation, `Ligne ${i + 1} - Désignation`, 500),
              optionalString(l.description, `Ligne ${i + 1} - Description`, 2000),
              optionalString(l.unite, `Ligne ${i + 1} - Unité`, 20) || 'pce',
              requireNumber(l.ratio, `Ligne ${i + 1} - Ratio`, 0, 99999),
              requireNumber(l.prix_unitaire, `Ligne ${i + 1} - Prix`, 0, 9999999),
              i
            ]
          )
        }
      }

      saveToFile()
      return { success: true, id }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  // Create forfait from existing devis
  ipcMain.handle('forfaits:createFromDevis', (_event, devisId: string, nom: string, uniteBase: string) => {
    try {
      const validDevisId = requireUUID(devisId, 'ID devis')
      const validNom = requireString(nom, 'Nom', 200)
      const validUnite = optionalString(uniteBase, 'Unité de base', 20) || 'pce'

      const lignes = queryAll(
        'SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre',
        [validDevisId]
      ) as Array<Record<string, unknown>>

      if (lignes.length === 0) return { success: false, error: 'Aucune ligne dans ce devis' }

      const id = uuid()
      execute(
        `INSERT INTO forfaits (id, nom, description, unite_base) VALUES (?, ?, ?, ?)`,
        [id, validNom, `Créé depuis un devis`, validUnite]
      )

      for (let i = 0; i < lignes.length; i++) {
        const l = lignes[i]
        execute(
          `INSERT INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, description, unite, ratio, prix_unitaire, ordre)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), id, l.catalogue_item_id || null, l.designation, l.description || null, l.unite, l.quantite, l.prix_unitaire, i]
        )
      }

      saveToFile()
      return { success: true, id }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  // Delete a forfait
  ipcMain.handle('forfaits:delete', (_event, id: string) => {
    try {
      const validId = requireString(id, 'ID forfait', 50)
      execute('DELETE FROM forfait_lignes WHERE forfait_id = ?', [validId])
      execute('DELETE FROM forfaits WHERE id = ?', [validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })
}
