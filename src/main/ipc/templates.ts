import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import {
  requireString,
  optionalString,
  requireUUID,
  ValidationError
} from '../security/validators'

export function registerTemplateHandlers(): void {
  // List all templates with line count
  ipcMain.handle('templates:list', () => {
    return queryAll(
      `SELECT t.*, COUNT(tl.id) as ligne_count
       FROM devis_templates t LEFT JOIN devis_template_lignes tl ON tl.template_id = t.id
       GROUP BY t.id ORDER BY t.nom`
    )
  })

  // Get a template with its lines
  ipcMain.handle('templates:get', (_event, id: string) => {
    try {
      const validId = requireUUID(id, 'ID template')
      const template = queryOne('SELECT * FROM devis_templates WHERE id = ?', [validId])
      if (!template) return null
      const lignes = queryAll(
        'SELECT * FROM devis_template_lignes WHERE template_id = ? ORDER BY ordre',
        [validId]
      )
      return { ...template, lignes }
    } catch (err) {
      if (err instanceof ValidationError) return null
      throw err
    }
  })

  // Create template from an existing devis
  ipcMain.handle('templates:createFromDevis', (_event, devisId: string, nom: string) => {
    try {
      const validDevisId = requireUUID(devisId, 'ID devis')
      const validNom = requireString(nom, 'Nom du modèle', 200)

      const lignes = queryAll(
        'SELECT * FROM devis_lignes WHERE devis_id = ? ORDER BY ordre',
        [validDevisId]
      ) as Array<Record<string, unknown>>

      if (lignes.length === 0) return { success: false, error: 'Aucune ligne dans ce devis' }

      const id = uuid()
      execute(
        `INSERT INTO devis_templates (id, nom, description) VALUES (?, ?, ?)`,
        [id, validNom, `Créé depuis un devis (${lignes.length} lignes)`]
      )

      for (let i = 0; i < lignes.length; i++) {
        const l = lignes[i]
        execute(
          `INSERT INTO devis_template_lignes (id, template_id, catalogue_item_id, designation, description, unite, quantite, prix_unitaire, ordre)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), id, l.catalogue_item_id || null, l.designation, l.description || null, l.unite, l.quantite, l.prix_unitaire, i]
        )
      }

      saveToFile()
      return { success: true, id, nom: validNom }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  // Delete a template
  ipcMain.handle('templates:delete', (_event, id: string) => {
    try {
      const validId = requireUUID(id, 'ID template')
      execute('DELETE FROM devis_template_lignes WHERE template_id = ?', [validId])
      execute('DELETE FROM devis_templates WHERE id = ?', [validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  // Rename a template
  ipcMain.handle('templates:rename', (_event, id: string, nom: string) => {
    try {
      const validId = requireUUID(id, 'ID template')
      const validNom = requireString(nom, 'Nom', 200)
      execute(`UPDATE devis_templates SET nom = ? WHERE id = ?`, [validNom, validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })
}
