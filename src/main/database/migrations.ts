/**
 * Versioned database migration system.
 * Each migration runs exactly once, in order.
 * The current version is stored in `schema_version`.
 */
import type { Database } from 'sql.js'

interface Migration {
  version: number
  description: string
  up: (db: Database) => void
}

/**
 * All migrations, in order.
 * Migrations 1–9 correspond to the legacy try/catch ALTER TABLEs.
 * They are safe to re-run on existing DBs (columns already exist → silently skipped).
 * New migrations start at 10+.
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Add checksum to licence',
    up: (db) => {
      try { db.run(`ALTER TABLE licence ADD COLUMN checksum TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 2,
    description: 'Add key_hint to licence',
    up: (db) => {
      try { db.run(`ALTER TABLE licence ADD COLUMN key_hint TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 3,
    description: 'Add server license columns',
    up: (db) => {
      try { db.run(`ALTER TABLE licence ADD COLUMN original_key TEXT`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE licence ADD COLUMN server_token TEXT`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE licence ADD COLUMN valid_until TEXT`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE licence ADD COLUMN last_server_check TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 4,
    description: 'Add objet to devis',
    up: (db) => {
      try { db.run(`ALTER TABLE devis ADD COLUMN objet TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 5,
    description: 'Add is_favorite to catalogue',
    up: (db) => {
      try { db.run(`ALTER TABLE catalogue ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`) } catch { /* exists */ }
    }
  },
  {
    version: 6,
    description: 'Add prix_achat and fournisseur to catalogue',
    up: (db) => {
      try { db.run(`ALTER TABLE catalogue ADD COLUMN prix_achat REAL`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE catalogue ADD COLUMN fournisseur TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 7,
    description: 'Add paiements table and montant_paye',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS paiements (
          id TEXT PRIMARY KEY,
          facture_id TEXT NOT NULL,
          montant REAL NOT NULL,
          date TEXT NOT NULL DEFAULT (date('now')),
          methode TEXT NOT NULL DEFAULT 'virement',
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (facture_id) REFERENCES factures(id) ON DELETE CASCADE
        )
      `)
      try { db.run(`ALTER TABLE factures ADD COLUMN montant_paye REAL NOT NULL DEFAULT 0`) } catch { /* exists */ }
    }
  },
  {
    version: 8,
    description: 'Add is_option to devis_lignes and facture_lignes',
    up: (db) => {
      try { db.run(`ALTER TABLE devis_lignes ADD COLUMN is_option INTEGER NOT NULL DEFAULT 0`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE facture_lignes ADD COLUMN is_option INTEGER NOT NULL DEFAULT 0`) } catch { /* exists */ }
    }
  },
  {
    version: 9,
    description: 'Add numero_ide and numero_tva to clients',
    up: (db) => {
      try { db.run(`ALTER TABLE clients ADD COLUMN numero_ide TEXT`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE clients ADD COLUMN numero_tva TEXT`) } catch { /* exists */ }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // NEW MIGRATIONS — v1.5.0+
  // ═══════════════════════════════════════════════════════════

  {
    version: 10,
    description: 'Add image to catalogue',
    up: (db) => {
      try { db.run(`ALTER TABLE catalogue ADD COLUMN image TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 11,
    description: 'Add catalogue price history table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS catalogue_prix_historique (
          id TEXT PRIMARY KEY,
          catalogue_item_id TEXT NOT NULL,
          prix_unitaire REAL NOT NULL,
          prix_achat REAL,
          date TEXT NOT NULL DEFAULT (date('now')),
          FOREIGN KEY (catalogue_item_id) REFERENCES catalogue(id) ON DELETE CASCADE
        )
      `)
    }
  },
  {
    version: 12,
    description: 'Add stock columns to catalogue',
    up: (db) => {
      try { db.run(`ALTER TABLE catalogue ADD COLUMN stock_actuel REAL`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE catalogue ADD COLUMN stock_minimum REAL`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE catalogue ADD COLUMN stock_emplacement TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 13,
    description: 'Add note_interne to devis_lignes',
    up: (db) => {
      try { db.run(`ALTER TABLE devis_lignes ADD COLUMN note_interne TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 14,
    description: 'Add avoir (credit note) support to factures',
    up: (db) => {
      try { db.run(`ALTER TABLE factures ADD COLUMN type TEXT NOT NULL DEFAULT 'facture'`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE factures ADD COLUMN facture_reference_id TEXT`) } catch { /* exists */ }
    }
  },
  {
    version: 15,
    description: 'Add langue to clients',
    up: (db) => {
      try { db.run(`ALTER TABLE clients ADD COLUMN langue TEXT DEFAULT 'fr'`) } catch { /* exists */ }
    }
  },
  {
    version: 16,
    description: 'Add taux_tva per line for devis and factures',
    up: (db) => {
      try { db.run(`ALTER TABLE devis_lignes ADD COLUMN taux_tva REAL`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE facture_lignes ADD COLUMN taux_tva REAL`) } catch { /* exists */ }
    }
  },
  {
    version: 17,
    description: 'Add client tags system',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS client_tags (
          id TEXT PRIMARY KEY,
          nom TEXT NOT NULL UNIQUE,
          couleur TEXT NOT NULL DEFAULT 'blue'
        );
        CREATE TABLE IF NOT EXISTS client_tag_relations (
          client_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (client_id, tag_id),
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES client_tags(id) ON DELETE CASCADE
        );
      `)
    }
  },
  {
    version: 18,
    description: 'Add counter_year for yearly numbering reset',
    up: (db) => {
      try { db.run(`ALTER TABLE counters ADD COLUMN counter_year INTEGER`) } catch { /* exists */ }
    }
  },
  {
    version: 19,
    description: 'Add note_interne to devis_lignes and facture_lignes',
    up: (db) => {
      try { db.run(`ALTER TABLE devis_lignes ADD COLUMN note_interne TEXT`) } catch { /* exists */ }
      try { db.run(`ALTER TABLE facture_lignes ADD COLUMN note_interne TEXT`) } catch { /* exists */ }
    }
  }
]

/**
 * Get the current schema version from the database.
 */
function getSchemaVersion(db: Database): number {
  try {
    const result = db.exec(`SELECT version FROM schema_version ORDER BY version DESC LIMIT 1`)
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] as number
    }
  } catch {
    // Table doesn't exist yet
  }
  return 0
}

/**
 * Run all pending migrations.
 * Safe to call multiple times — already-applied migrations are skipped.
 */
export function runMigrations(db: Database): void {
  // Ensure schema_version table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const currentVersion = getSchemaVersion(db)

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue

    console.log(`[DB] Running migration v${migration.version}: ${migration.description}`)
    try {
      migration.up(db)
      db.run(
        `INSERT INTO schema_version (version, description) VALUES (?, ?)`,
        [migration.version, migration.description]
      )
    } catch (err) {
      console.error(`[DB] Migration v${migration.version} failed:`, err)
      throw new Error(`Migration v${migration.version} (${migration.description}) failed: ${err}`)
    }
  }

  const finalVersion = getSchemaVersion(db)
  if (finalVersion > currentVersion) {
    console.log(`[DB] Migrations complete: v${currentVersion} → v${finalVersion}`)
  }
}
