import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import {
  validateCatalogueItem,
  requireUUID,
  requireEnum,
  validateSearchQuery,
  ValidationError
} from '../security/validators'

export function registerCatalogueHandlers(): void {
  ipcMain.handle('catalogue:list', (_event, type?: string) => {
    try {
      if (type) {
        const validType = requireEnum(type, 'Type', ['materiau', 'main_oeuvre'])
        return queryAll('SELECT * FROM catalogue WHERE type = ? ORDER BY categorie, designation', [validType])
      }
      return queryAll('SELECT * FROM catalogue ORDER BY type, categorie, designation')
    } catch (err) {
      if (err instanceof ValidationError) return []
      throw err
    }
  })

  ipcMain.handle('catalogue:get', (_event, id: string) => {
    const validId = requireUUID(id, 'ID article')
    return queryOne('SELECT * FROM catalogue WHERE id = ?', [validId])
  })

  ipcMain.handle('catalogue:create', (_event, data: Record<string, unknown>) => {
    try {
      const v = validateCatalogueItem(data)
      const id = uuid()
      execute(
        `INSERT INTO catalogue (id, type, reference, designation, unite, prix_unitaire, categorie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, v.type, v.reference, v.designation, v.unite, v.prix_unitaire, v.categorie]
      )
      saveToFile()
      return queryOne('SELECT * FROM catalogue WHERE id = ?', [id])
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('catalogue:update', (_event, id: string, data: Record<string, unknown>) => {
    try {
      const validId = requireUUID(id, 'ID article')
      const v = validateCatalogueItem(data)
      execute(
        `UPDATE catalogue SET type=?, reference=?, designation=?, unite=?, prix_unitaire=?, categorie=?, updated_at=datetime('now') WHERE id=?`,
        [v.type, v.reference, v.designation, v.unite, v.prix_unitaire, v.categorie, validId]
      )
      saveToFile()
      return queryOne('SELECT * FROM catalogue WHERE id = ?', [validId])
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('catalogue:delete', (_event, id: string) => {
    try {
      const validId = requireUUID(id, 'ID article')
      execute('DELETE FROM catalogue WHERE id = ?', [validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('catalogue:search', (_event, query: string) => {
    try {
      const validQuery = validateSearchQuery(query)
      const q = `%${validQuery}%`
      return queryAll(
        `SELECT * FROM catalogue WHERE designation LIKE ? OR reference LIKE ? OR categorie LIKE ? ORDER BY type, categorie, designation`,
        [q, q, q]
      )
    } catch (err) {
      if (err instanceof ValidationError) return []
      throw err
    }
  })

  ipcMain.handle('catalogue:categories', () => {
    return queryAll('SELECT DISTINCT categorie FROM catalogue WHERE categorie IS NOT NULL ORDER BY categorie').map((r) => r.categorie)
  })
}
