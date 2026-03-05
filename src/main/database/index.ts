import initSqlJs, { type Database } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createSchema } from './schema'
import { encryptBuffer, decryptBuffer, isEncrypted } from '../security/crypto'

let db: Database | null = null
let dbPath: string = ''
let saveInterval: ReturnType<typeof setInterval> | null = null

export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  return join(dbDir, 'devispro.db')
}

export async function initDatabase(): Promise<void> {
  dbPath = getDbPath()

  const SQL = await initSqlJs()

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath)

    if (isEncrypted(fileBuffer)) {
      // Encrypted database: decrypt it
      const decrypted = decryptBuffer(fileBuffer)
      if (decrypted) {
        db = new SQL.Database(decrypted)
      } else {
        // Decryption failed — could be wrong machine. Start fresh.
        console.error('[DB] Failed to decrypt database. Creating new one.')
        db = new SQL.Database()
      }
    } else {
      // Plain database (migration from old unencrypted format)
      console.log('[DB] Migrating unencrypted database to encrypted format...')
      db = new SQL.Database(fileBuffer)
      // Will be saved encrypted on next saveToFile() call
    }
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')
  createSchema(db)
  saveToFile() // This will encrypt on first save

  // Auto-save every 10 seconds
  saveInterval = setInterval(() => saveToFile(), 10000)
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Save database to disk with AES-256-GCM encryption.
 * The database file is encrypted at rest using a key derived from the machine ID.
 * This means:
 * - The .db file is useless if copied to another machine
 * - Even if someone accesses the user's Documents folder, data is protected
 */
export function saveToFile(): void {
  if (!db || !dbPath) return
  const data = db.export()
  const plainBuffer = Buffer.from(data)
  const encrypted = encryptBuffer(plainBuffer)
  writeFileSync(dbPath, encrypted)
}

export function closeDb(): void {
  if (saveInterval) {
    clearInterval(saveInterval)
    saveInterval = null
  }
  if (db) {
    saveToFile()
    db.close()
    db = null
  }
}

/** Run a query and return all rows as objects */
export function queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const database = getDb()
  const stmt = database.prepare(sql)
  if (params.length) stmt.bind(params)
  const results: Record<string, unknown>[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Record<string, unknown>)
  }
  stmt.free()
  return results
}

/** Run a query and return first row */
export function queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  return queryAll(sql, params)[0]
}

/** Execute a statement (INSERT, UPDATE, DELETE) */
export function execute(sql: string, params: unknown[] = []): void {
  getDb().run(sql, params)
}
