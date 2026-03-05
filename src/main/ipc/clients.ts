import { ipcMain } from 'electron'
import { v4 as uuid } from 'uuid'
import { queryAll, queryOne, execute, saveToFile } from '../database'
import {
  validateClient,
  requireUUID,
  validateSearchQuery,
  ValidationError
} from '../security/validators'

export function registerClientHandlers(): void {
  ipcMain.handle('clients:list', () => {
    return queryAll('SELECT * FROM clients ORDER BY nom, prenom')
  })

  ipcMain.handle('clients:get', (_event, id: string) => {
    const validId = requireUUID(id, 'ID client')
    return queryOne('SELECT * FROM clients WHERE id = ?', [validId])
  })

  ipcMain.handle('clients:create', (_event, data: Record<string, unknown>) => {
    try {
      const v = validateClient(data)
      const id = uuid()
      execute(
        `INSERT INTO clients (id, nom, prenom, entreprise, adresse, npa, ville, telephone, email, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, v.nom, v.prenom, v.entreprise, v.adresse, v.npa, v.ville, v.telephone, v.email, v.notes]
      )
      saveToFile()
      return queryOne('SELECT * FROM clients WHERE id = ?', [id])
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('clients:update', (_event, id: string, data: Record<string, unknown>) => {
    try {
      const validId = requireUUID(id, 'ID client')
      const v = validateClient(data)
      execute(
        `UPDATE clients SET nom=?, prenom=?, entreprise=?, adresse=?, npa=?, ville=?,
         telephone=?, email=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [v.nom, v.prenom, v.entreprise, v.adresse, v.npa, v.ville, v.telephone, v.email, v.notes, validId]
      )
      saveToFile()
      return queryOne('SELECT * FROM clients WHERE id = ?', [validId])
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('clients:delete', (_event, id: string) => {
    try {
      const validId = requireUUID(id, 'ID client')
      execute('DELETE FROM clients WHERE id = ?', [validId])
      saveToFile()
      return { success: true }
    } catch (err) {
      if (err instanceof ValidationError) return { success: false, error: err.message }
      throw err
    }
  })

  ipcMain.handle('clients:search', (_event, query: string) => {
    try {
      const validQuery = validateSearchQuery(query)
      const q = `%${validQuery}%`
      return queryAll(
        `SELECT * FROM clients WHERE nom LIKE ? OR prenom LIKE ? OR entreprise LIKE ? OR email LIKE ? ORDER BY nom, prenom`,
        [q, q, q, q]
      )
    } catch (err) {
      if (err instanceof ValidationError) return []
      throw err
    }
  })
}
