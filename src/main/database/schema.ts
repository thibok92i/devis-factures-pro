import type { Database } from 'sql.js'

export function createSchema(db: Database): void {
  db.run(`
    -- Réglages entreprise
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Clients
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT,
      entreprise TEXT,
      adresse TEXT NOT NULL DEFAULT '',
      npa TEXT NOT NULL DEFAULT '',
      ville TEXT NOT NULL DEFAULT '',
      telephone TEXT,
      email TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Catalogue matériaux et main d'œuvre
    CREATE TABLE IF NOT EXISTS catalogue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('materiau', 'main_oeuvre')),
      reference TEXT NOT NULL DEFAULT '',
      designation TEXT NOT NULL,
      unite TEXT NOT NULL DEFAULT 'pce',
      prix_unitaire REAL NOT NULL DEFAULT 0,
      categorie TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Devis
    CREATE TABLE IF NOT EXISTS devis (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      validite TEXT NOT NULL DEFAULT (date('now', '+30 days')),
      statut TEXT NOT NULL DEFAULT 'brouillon'
        CHECK(statut IN ('brouillon', 'envoye', 'accepte', 'refuse')),
      sous_total REAL NOT NULL DEFAULT 0,
      taux_tva REAL NOT NULL DEFAULT 8.1,
      montant_tva REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      remise_pourcent REAL NOT NULL DEFAULT 0,
      remise_montant REAL NOT NULL DEFAULT 0,
      notes TEXT,
      conditions TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    -- Lignes de devis
    CREATE TABLE IF NOT EXISTS devis_lignes (
      id TEXT PRIMARY KEY,
      devis_id TEXT NOT NULL,
      catalogue_item_id TEXT,
      designation TEXT NOT NULL,
      description TEXT,
      unite TEXT NOT NULL DEFAULT 'pce',
      quantite REAL NOT NULL DEFAULT 1,
      prix_unitaire REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      ordre INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (devis_id) REFERENCES devis(id) ON DELETE CASCADE,
      FOREIGN KEY (catalogue_item_id) REFERENCES catalogue(id) ON DELETE SET NULL
    );

    -- Factures
    CREATE TABLE IF NOT EXISTS factures (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      devis_id TEXT,
      client_id TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      echeance TEXT NOT NULL DEFAULT (date('now', '+30 days')),
      statut TEXT NOT NULL DEFAULT 'brouillon'
        CHECK(statut IN ('brouillon', 'envoyee', 'payee', 'en_retard')),
      sous_total REAL NOT NULL DEFAULT 0,
      taux_tva REAL NOT NULL DEFAULT 8.1,
      montant_tva REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      remise_pourcent REAL NOT NULL DEFAULT 0,
      remise_montant REAL NOT NULL DEFAULT 0,
      notes TEXT,
      conditions TEXT,
      date_paiement TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (devis_id) REFERENCES devis(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    -- Lignes de factures
    CREATE TABLE IF NOT EXISTS facture_lignes (
      id TEXT PRIMARY KEY,
      facture_id TEXT NOT NULL,
      catalogue_item_id TEXT,
      designation TEXT NOT NULL,
      description TEXT,
      unite TEXT NOT NULL DEFAULT 'pce',
      quantite REAL NOT NULL DEFAULT 1,
      prix_unitaire REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      ordre INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (facture_id) REFERENCES factures(id) ON DELETE CASCADE,
      FOREIGN KEY (catalogue_item_id) REFERENCES catalogue(id) ON DELETE SET NULL
    );

    -- Compteur pour numéros auto
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    );

    -- Forfaits (packs matériaux + main d'oeuvre)
    CREATE TABLE IF NOT EXISTS forfaits (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      description TEXT,
      unite_base TEXT NOT NULL DEFAULT 'm²',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Lignes de forfait (avec ratio par rapport à l'unité de base)
    CREATE TABLE IF NOT EXISTS forfait_lignes (
      id TEXT PRIMARY KEY,
      forfait_id TEXT NOT NULL,
      catalogue_item_id TEXT,
      designation TEXT NOT NULL,
      description TEXT,
      unite TEXT NOT NULL DEFAULT 'pce',
      ratio REAL NOT NULL DEFAULT 1,
      prix_unitaire REAL NOT NULL DEFAULT 0,
      ordre INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (forfait_id) REFERENCES forfaits(id) ON DELETE CASCADE,
      FOREIGN KEY (catalogue_item_id) REFERENCES catalogue(id) ON DELETE SET NULL
    );

    -- Templates de devis (sauver et réutiliser)
    CREATE TABLE IF NOT EXISTS devis_templates (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devis_template_lignes (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      catalogue_item_id TEXT,
      designation TEXT NOT NULL,
      description TEXT,
      unite TEXT NOT NULL DEFAULT 'pce',
      quantite REAL NOT NULL DEFAULT 1,
      prix_unitaire REAL NOT NULL DEFAULT 0,
      ordre INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (template_id) REFERENCES devis_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (catalogue_item_id) REFERENCES catalogue(id) ON DELETE SET NULL
    );

    -- Licence (with anti-tampering checksum)
    CREATE TABLE IF NOT EXISTS licence (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      key TEXT,
      key_hint TEXT,
      activated_at TEXT,
      machine_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 0,
      checksum TEXT
    );

    -- Initialiser les compteurs si absents
    INSERT OR IGNORE INTO counters (name, value) VALUES ('devis', 0);
    INSERT OR IGNORE INTO counters (name, value) VALUES ('facture', 0);

    -- Initialiser les réglages par défaut
    INSERT OR IGNORE INTO settings (key, value) VALUES ('tva_taux', '8.1');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('devise', 'CHF');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('conditions_devis', 'Devis valable 30 jours. TVA 8.1% incluse.');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('conditions_facture', 'Payable dans les 30 jours. Merci de votre confiance.');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('entreprise_iban', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('entreprise_banque', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('delai_validite_devis', '30');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('delai_paiement_facture', '30');
  `)

  // Migration: add checksum to licence table (for existing DBs created before v1.0.2)
  try {
    db.run(`ALTER TABLE licence ADD COLUMN checksum TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // Migration: add key_hint to licence table (for displaying last 4 chars of original key)
  try {
    db.run(`ALTER TABLE licence ADD COLUMN key_hint TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // Migration v1.3.0: add server license columns
  try {
    db.run(`ALTER TABLE licence ADD COLUMN original_key TEXT`)
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE licence ADD COLUMN server_token TEXT`)
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE licence ADD COLUMN valid_until TEXT`)
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE licence ADD COLUMN last_server_check TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // Migration: add objet (title/subject) to devis
  try {
    db.run(`ALTER TABLE devis ADD COLUMN objet TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // Migration: add is_favorite to catalogue (Feature 5)
  try {
    db.run(`ALTER TABLE catalogue ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists, ignore
  }

  // Migration: add prix_achat and fournisseur to catalogue (margin tracking)
  try {
    db.run(`ALTER TABLE catalogue ADD COLUMN prix_achat REAL`)
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE catalogue ADD COLUMN fournisseur TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // Migration: add paiements table (partial payments / acomptes)
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

  // Migration: add montant_paye to factures (sum of payments)
  try {
    db.run(`ALTER TABLE factures ADD COLUMN montant_paye REAL NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists, ignore
  }

  // Migration: add is_option to devis_lignes (optional lines not counted in total)
  try {
    db.run(`ALTER TABLE devis_lignes ADD COLUMN is_option INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE facture_lignes ADD COLUMN is_option INTEGER NOT NULL DEFAULT 0`)
  } catch {
    // Column already exists, ignore
  }

  // --- Client: IDE/TVA fields ---
  try {
    db.run(`ALTER TABLE clients ADD COLUMN numero_ide TEXT`)
  } catch {
    // Column already exists, ignore
  }
  try {
    db.run(`ALTER TABLE clients ADD COLUMN numero_tva TEXT`)
  } catch {
    // Column already exists, ignore
  }

  // --- Catalogue par défaut : Matériaux (avec prix d'achat fournisseur Suisse Romande) ---
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-001', 'BOIS-001', 'Panneau chêne massif 20mm', 'materiau', 'm²', 89.0, 'Bois massif']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-002', 'BOIS-002', 'Panneau sapin 3 plis 27mm', 'materiau', 'm²', 52.0, 'Bois massif']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-003', 'BOIS-003', 'Panneau MDF 19mm', 'materiau', 'm²', 28.5, 'Panneaux']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-004', 'BOIS-004', 'Panneau contreplaqué bouleau 18mm', 'materiau', 'm²', 45.0, 'Panneaux']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-005', 'BOIS-005', 'Panneau mélaminé blanc 19mm', 'materiau', 'm²', 32.0, 'Panneaux']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-006', 'BOIS-006', 'Latte sapin 30x50mm', 'materiau', 'm', 3.2, 'Bois de construction']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-007', 'BOIS-007', 'Poutre lamellé-collé 120x240mm', 'materiau', 'm', 42.0, 'Bois de construction']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-008', 'BOIS-008', 'Parquet chêne massif 15mm', 'materiau', 'm²', 78.0, 'Revêtements']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-BOIS-009', 'BOIS-009', 'Lambris épicéa 12mm', 'materiau', 'm²', 24.0, 'Revêtements']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-QUIN-001', 'QUIN-001', 'Vis inox 4x40mm (boîte 200)', 'materiau', 'boîte', 12.5, 'Quincaillerie']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-QUIN-002', 'QUIN-002', 'Vis bois 5x60mm (boîte 100)', 'materiau', 'boîte', 8.9, 'Quincaillerie']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-QUIN-003', 'QUIN-003', 'Charnière porte 100mm (paire)', 'materiau', 'paire', 15.0, 'Quincaillerie']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-QUIN-004', 'QUIN-004', 'Poignée de porte inox', 'materiau', 'pce', 45.0, 'Quincaillerie']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-QUIN-005', 'QUIN-005', 'Serrure à encastrer', 'materiau', 'pce', 65.0, 'Quincaillerie']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-QUIN-006', 'QUIN-006', 'Coulisse tiroir pleine extension 500mm', 'materiau', 'paire', 28.0, 'Quincaillerie']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-QUIN-007', 'QUIN-007', 'Équerres d\'assemblage (lot 10)', 'materiau', 'lot', 18.0, 'Quincaillerie']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-ISOL-001', 'ISOL-001', 'Laine de roche 60mm', 'materiau', 'm²', 12.0, 'Isolation']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-ISOL-002', 'ISOL-002', 'Mousse PU expansive 750ml', 'materiau', 'pce', 8.5, 'Isolation']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-COLL-001', 'COLL-001', 'Colle à bois D3 (750g)', 'materiau', 'pce', 14.0, 'Colles & finitions']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-COLL-002', 'COLL-002', 'Vernis polyuréthane mat (1L)', 'materiau', 'pce', 32.0, 'Colles & finitions']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-COLL-003', 'COLL-003', 'Huile dure naturelle (1L)', 'materiau', 'pce', 38.0, 'Colles & finitions']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-COLL-004', 'COLL-004', 'Silicone sanitaire transparent', 'materiau', 'pce', 9.5, 'Colles & finitions']);

  // --- Remplir prix d'achat des articles existants ---
  db.run(`UPDATE catalogue SET prix_achat = 53.40, fournisseur = 'Corbat Holz' WHERE id = 'default-BOIS-001' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 31.20, fournisseur = 'Tschopp Holz' WHERE id = 'default-BOIS-002' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 17.10, fournisseur = 'HG Commerciale' WHERE id = 'default-BOIS-003' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 27.00, fournisseur = 'Corbat Holz' WHERE id = 'default-BOIS-004' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 19.20, fournisseur = 'HG Commerciale' WHERE id = 'default-BOIS-005' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 1.92, fournisseur = 'Tschopp Holz' WHERE id = 'default-BOIS-006' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 25.20, fournisseur = 'HG Commerciale' WHERE id = 'default-BOIS-007' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 46.80, fournisseur = 'Tschopp Holz' WHERE id = 'default-BOIS-008' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 14.40, fournisseur = 'Tschopp Holz' WHERE id = 'default-BOIS-009' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 7.50, fournisseur = 'Würth' WHERE id = 'default-QUIN-001' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 5.34, fournisseur = 'Würth' WHERE id = 'default-QUIN-002' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 9.00, fournisseur = 'Häfele' WHERE id = 'default-QUIN-003' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 27.00, fournisseur = 'Häfele' WHERE id = 'default-QUIN-004' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 39.00, fournisseur = 'Häfele' WHERE id = 'default-QUIN-005' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 16.80, fournisseur = 'Häfele' WHERE id = 'default-QUIN-006' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 10.80, fournisseur = 'Würth' WHERE id = 'default-QUIN-007' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 7.20, fournisseur = 'Isover' WHERE id = 'default-ISOL-001' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 5.10, fournisseur = 'Sika' WHERE id = 'default-ISOL-002' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 8.40, fournisseur = 'Würth' WHERE id = 'default-COLL-001' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 19.20, fournisseur = 'Livos' WHERE id = 'default-COLL-002' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 22.80, fournisseur = 'Livos' WHERE id = 'default-COLL-003' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 5.70, fournisseur = 'Sika' WHERE id = 'default-COLL-004' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 3.30, fournisseur = 'Tschopp Holz' WHERE id = 'default-REV-001' AND (prix_achat IS NULL OR prix_achat = 0)`)
  db.run(`UPDATE catalogue SET prix_achat = 5.10, fournisseur = 'Corbat Holz' WHERE id = 'default-REV-002' AND (prix_achat IS NULL OR prix_achat = 0)`)

  // --- Catalogue par défaut : Main d'oeuvre ---
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-001', 'MO-001', 'Menuisier qualifié', 'main_oeuvre', 'h', 95.0, 'Main d\'oeuvre']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-002', 'MO-002', 'Apprenti menuisier', 'main_oeuvre', 'h', 45.0, 'Main d\'oeuvre']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-003', 'MO-003', 'Aide menuisier', 'main_oeuvre', 'h', 65.0, 'Main d\'oeuvre']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-004', 'MO-004', 'Pose sur chantier', 'main_oeuvre', 'h', 95.0, 'Main d\'oeuvre']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-005', 'MO-005', 'Démontage / dépose', 'main_oeuvre', 'h', 85.0, 'Main d\'oeuvre']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-006', 'MO-006', 'Transport et livraison', 'main_oeuvre', 'forfait', 120.0, 'Transport']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-007', 'MO-007', 'Déplacement chantier', 'main_oeuvre', 'forfait', 80.0, 'Transport']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-008', 'MO-008', 'Prise de mesures sur site', 'main_oeuvre', 'forfait', 150.0, 'Prestations']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-009', 'MO-009', 'Conception et plans', 'main_oeuvre', 'h', 110.0, 'Prestations']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-MO-010', 'MO-010', 'Nettoyage fin de chantier', 'main_oeuvre', 'forfait', 200.0, 'Prestations']);

  // --- Sous-couche parquet (nécessaire pour le forfait) ---
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-REV-001', 'REV-001', 'Sous-couche parquet 2mm', 'materiau', 'm²', 5.5, 'Revêtements']);
  db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, ['default-REV-002', 'REV-002', 'Plinthe chêne 60mm', 'materiau', 'm', 8.5, 'Revêtements']);

  // ============================================================
  // Catalogue complet bois — Prix médians Suisse Romande 2025
  // Prix unitaire = prix vente artisan / Prix achat = prix fournisseur
  // ============================================================

  // Helper: insert catalogue with prix_achat and fournisseur
  const insertCat = (id: string, ref: string, designation: string, unite: string, prixVente: number, prixAchat: number, categorie: string, fournisseur: string) => {
    db.run(`INSERT OR IGNORE INTO catalogue (id, reference, designation, type, unite, prix_unitaire, categorie, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, ref, designation, 'materiau', unite, prixVente, categorie])
    db.run(`UPDATE catalogue SET prix_achat = ?, fournisseur = ? WHERE id = ? AND (prix_achat IS NULL OR prix_achat = 0)`,
      [prixAchat, fournisseur, id])
  }

  // ---- BOIS MASSIF RÉSINEUX ----
  insertCat('default-RES-001', 'RES-001', 'Sapin/Épicéa raboté 27x60mm', 'm', 4.20, 2.50, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-002', 'RES-002', 'Sapin/Épicéa raboté 27x100mm', 'm', 5.80, 3.50, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-003', 'RES-003', 'Sapin/Épicéa raboté 27x140mm', 'm', 7.50, 4.50, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-004', 'RES-004', 'Sapin/Épicéa raboté 27x200mm', 'm', 10.50, 6.30, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-005', 'RES-005', 'Sapin/Épicéa raboté 40x60mm', 'm', 5.80, 3.50, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-006', 'RES-006', 'Sapin/Épicéa raboté 40x100mm', 'm', 8.50, 5.10, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-007', 'RES-007', 'Sapin/Épicéa raboté 47x100mm', 'm', 9.50, 5.70, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-008', 'RES-008', 'Sapin/Épicéa raboté 47x147mm', 'm', 12.80, 7.70, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-009', 'RES-009', 'Sapin/Épicéa raboté 47x200mm', 'm', 16.50, 9.90, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-010', 'RES-010', 'Sapin/Épicéa raboté 60x120mm', 'm', 14.50, 8.70, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-011', 'RES-011', 'Sapin brut charpente 80x160mm', 'm', 18.50, 11.10, 'Bois massif résineux', 'HG Commerciale')
  insertCat('default-RES-012', 'RES-012', 'Sapin brut charpente 100x100mm', 'm', 16.00, 9.60, 'Bois massif résineux', 'HG Commerciale')
  insertCat('default-RES-013', 'RES-013', 'Sapin brut charpente 100x200mm', 'm', 28.00, 16.80, 'Bois massif résineux', 'HG Commerciale')
  insertCat('default-RES-014', 'RES-014', 'Sapin brut charpente 120x120mm', 'm', 22.00, 13.20, 'Bois massif résineux', 'HG Commerciale')
  insertCat('default-RES-015', 'RES-015', 'Pin sylvestre raboté 27x100mm', 'm', 7.50, 4.50, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-016', 'RES-016', 'Pin sylvestre raboté 27x200mm', 'm', 13.50, 8.10, 'Bois massif résineux', 'Tschopp Holz')
  insertCat('default-RES-017', 'RES-017', 'Mélèze raboté 27x100mm', 'm', 12.50, 7.50, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-018', 'RES-018', 'Mélèze raboté 27x140mm', 'm', 16.00, 9.60, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-019', 'RES-019', 'Mélèze raboté 40x60mm', 'm', 11.50, 6.90, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-020', 'RES-020', 'Douglas raboté 27x100mm', 'm', 10.50, 6.30, 'Bois massif résineux', 'HG Commerciale')
  insertCat('default-RES-021', 'RES-021', 'Douglas raboté 27x200mm', 'm', 18.00, 10.80, 'Bois massif résineux', 'HG Commerciale')
  insertCat('default-RES-022', 'RES-022', 'Arole/Pin cembro raboté 27x120mm', 'm', 22.00, 13.20, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-023', 'RES-023', 'Arole/Pin cembro raboté 40x120mm', 'm', 32.00, 19.20, 'Bois massif résineux', 'Corbat Holz')
  insertCat('default-RES-024', 'RES-024', 'Épicéa vieux bois (récupération)', 'm²', 95.00, 55.00, 'Bois massif résineux', 'Altholz Schweiz')

  // ---- BOIS MASSIF FEUILLUS ----
  insertCat('default-FEU-001', 'FEU-001', 'Chêne massif raboté 27x100mm', 'm', 18.00, 10.80, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-002', 'FEU-002', 'Chêne massif raboté 27x150mm', 'm', 25.00, 15.00, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-003', 'FEU-003', 'Chêne massif raboté 27x200mm', 'm', 32.00, 19.20, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-004', 'FEU-004', 'Chêne massif raboté 40x100mm', 'm', 24.00, 14.40, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-005', 'FEU-005', 'Chêne massif raboté 40x200mm', 'm', 42.00, 25.20, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-006', 'FEU-006', 'Chêne massif raboté 54x100mm', 'm', 32.00, 19.20, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-007', 'FEU-007', 'Chêne massif abouté 20mm', 'm²', 85.00, 52.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-008', 'FEU-008', 'Chêne massif abouté 40mm', 'm²', 145.00, 87.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-009', 'FEU-009', 'Hêtre massif raboté 27x100mm', 'm', 12.00, 7.20, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-010', 'FEU-010', 'Hêtre massif raboté 27x200mm', 'm', 22.00, 13.20, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-011', 'FEU-011', 'Hêtre massif raboté 40x100mm', 'm', 16.00, 9.60, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-012', 'FEU-012', 'Hêtre massif abouté 20mm', 'm²', 68.00, 41.00, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-013', 'FEU-013', 'Hêtre massif abouté 40mm', 'm²', 115.00, 69.00, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-014', 'FEU-014', 'Frêne massif raboté 27x100mm', 'm', 15.00, 9.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-015', 'FEU-015', 'Frêne massif raboté 27x200mm', 'm', 28.00, 16.80, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-016', 'FEU-016', 'Frêne massif abouté 20mm', 'm²', 78.00, 47.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-017', 'FEU-017', 'Frêne massif abouté 40mm', 'm²', 130.00, 78.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-018', 'FEU-018', 'Noyer massif raboté 27x100mm', 'm', 38.00, 22.80, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-019', 'FEU-019', 'Noyer massif raboté 27x200mm', 'm', 68.00, 40.80, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-020', 'FEU-020', 'Noyer massif abouté 20mm', 'm²', 185.00, 111.00, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-021', 'FEU-021', 'Noyer massif abouté 40mm', 'm²', 295.00, 177.00, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-022', 'FEU-022', 'Érable massif raboté 27x100mm', 'm', 14.00, 8.40, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-023', 'FEU-023', 'Érable massif abouté 20mm', 'm²', 72.00, 43.20, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-024', 'FEU-024', 'Merisier/Cerisier massif raboté 27x120mm', 'm', 28.00, 16.80, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-025', 'FEU-025', 'Merisier/Cerisier massif abouté 20mm', 'm²', 125.00, 75.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-026', 'FEU-026', 'Tilleul massif raboté 27x100mm', 'm', 10.00, 6.00, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-027', 'FEU-027', 'Tilleul massif abouté 20mm', 'm²', 58.00, 34.80, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-028', 'FEU-028', 'Orme massif raboté 27x120mm', 'm', 25.00, 15.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-029', 'FEU-029', 'Orme massif abouté 20mm', 'm²', 110.00, 66.00, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-030', 'FEU-030', 'Châtaignier massif raboté 27x100mm', 'm', 16.00, 9.60, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-031', 'FEU-031', 'Châtaignier massif abouté 20mm', 'm²', 82.00, 49.20, 'Bois massif feuillus', 'Tschopp Holz')
  insertCat('default-FEU-032', 'FEU-032', 'Bouleau massif raboté 27x100mm', 'm', 11.00, 6.60, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-033', 'FEU-033', 'Peuplier massif raboté 27x150mm', 'm', 8.50, 5.10, 'Bois massif feuillus', 'HG Commerciale')
  insertCat('default-FEU-034', 'FEU-034', 'Aulne massif raboté 27x100mm', 'm', 12.50, 7.50, 'Bois massif feuillus', 'Corbat Holz')
  insertCat('default-FEU-035', 'FEU-035', 'Robinier/Acacia massif raboté 27x100mm', 'm', 20.00, 12.00, 'Bois massif feuillus', 'Corbat Holz')

  // ---- PANNEAUX 3 PLIS / 5 PLIS ----
  insertCat('default-PAN-001', 'PAN-001', 'Panneau 3 plis sapin 19mm', 'm²', 42.00, 25.20, 'Panneaux bois massif', 'Tschopp Holz')
  insertCat('default-PAN-002', 'PAN-002', 'Panneau 3 plis sapin 27mm', 'm²', 55.00, 33.00, 'Panneaux bois massif', 'Tschopp Holz')
  insertCat('default-PAN-003', 'PAN-003', 'Panneau 3 plis sapin 42mm', 'm²', 78.00, 46.80, 'Panneaux bois massif', 'Tschopp Holz')
  insertCat('default-PAN-004', 'PAN-004', 'Panneau 3 plis mélèze 19mm', 'm²', 62.00, 37.20, 'Panneaux bois massif', 'Corbat Holz')
  insertCat('default-PAN-005', 'PAN-005', 'Panneau 3 plis mélèze 27mm', 'm²', 78.00, 46.80, 'Panneaux bois massif', 'Corbat Holz')
  insertCat('default-PAN-006', 'PAN-006', 'Panneau 3 plis chêne 19mm', 'm²', 95.00, 57.00, 'Panneaux bois massif', 'Corbat Holz')
  insertCat('default-PAN-007', 'PAN-007', 'Panneau 3 plis chêne 27mm', 'm²', 125.00, 75.00, 'Panneaux bois massif', 'Corbat Holz')
  insertCat('default-PAN-008', 'PAN-008', 'Panneau 5 plis sapin 40mm', 'm²', 85.00, 51.00, 'Panneaux bois massif', 'HG Commerciale')
  insertCat('default-PAN-009', 'PAN-009', 'Panneau 5 plis sapin 60mm', 'm²', 115.00, 69.00, 'Panneaux bois massif', 'HG Commerciale')

  // ---- PANNEAUX DÉRIVÉS ----
  insertCat('default-DER-001', 'DER-001', 'MDF standard 6mm', 'm²', 9.50, 5.70, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-002', 'DER-002', 'MDF standard 10mm', 'm²', 14.00, 8.40, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-003', 'DER-003', 'MDF standard 16mm', 'm²', 22.00, 13.20, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-004', 'DER-004', 'MDF standard 22mm', 'm²', 32.00, 19.20, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-005', 'DER-005', 'MDF laqué blanc 1 face 19mm', 'm²', 38.00, 22.80, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-006', 'DER-006', 'MDF hydrofuge (vert) 19mm', 'm²', 35.00, 21.00, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-007', 'DER-007', 'OSB 3 15mm', 'm²', 16.00, 9.60, 'Panneaux dérivés', 'Tschopp Holz')
  insertCat('default-DER-008', 'DER-008', 'OSB 3 18mm', 'm²', 19.50, 11.70, 'Panneaux dérivés', 'Tschopp Holz')
  insertCat('default-DER-009', 'DER-009', 'OSB 3 22mm', 'm²', 24.00, 14.40, 'Panneaux dérivés', 'Tschopp Holz')
  insertCat('default-DER-010', 'DER-010', 'Aggloméré brut 16mm', 'm²', 11.00, 6.60, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-011', 'DER-011', 'Aggloméré brut 19mm', 'm²', 13.50, 8.10, 'Panneaux dérivés', 'HG Commerciale')
  insertCat('default-DER-012', 'DER-012', 'Aggloméré hydrofuge 19mm', 'm²', 18.00, 10.80, 'Panneaux dérivés', 'HG Commerciale')

  // ---- CONTREPLAQUÉS ----
  insertCat('default-CPQ-001', 'CPQ-001', 'Contreplaqué peuplier 4mm', 'm²', 12.00, 7.20, 'Contreplaqués', 'Tschopp Holz')
  insertCat('default-CPQ-002', 'CPQ-002', 'Contreplaqué peuplier 8mm', 'm²', 18.00, 10.80, 'Contreplaqués', 'Tschopp Holz')
  insertCat('default-CPQ-003', 'CPQ-003', 'Contreplaqué peuplier 12mm', 'm²', 24.00, 14.40, 'Contreplaqués', 'Tschopp Holz')
  insertCat('default-CPQ-004', 'CPQ-004', 'Contreplaqué peuplier 18mm', 'm²', 32.00, 19.20, 'Contreplaqués', 'Tschopp Holz')
  insertCat('default-CPQ-005', 'CPQ-005', 'Contreplaqué bouleau 4mm', 'm²', 18.00, 10.80, 'Contreplaqués', 'Corbat Holz')
  insertCat('default-CPQ-006', 'CPQ-006', 'Contreplaqué bouleau 9mm', 'm²', 28.00, 16.80, 'Contreplaqués', 'Corbat Holz')
  insertCat('default-CPQ-007', 'CPQ-007', 'Contreplaqué bouleau 12mm', 'm²', 35.00, 21.00, 'Contreplaqués', 'Corbat Holz')
  insertCat('default-CPQ-008', 'CPQ-008', 'Contreplaqué bouleau 15mm', 'm²', 42.00, 25.20, 'Contreplaqués', 'Corbat Holz')
  insertCat('default-CPQ-009', 'CPQ-009', 'Contreplaqué bouleau 18mm', 'm²', 48.00, 28.80, 'Contreplaqués', 'Corbat Holz')
  insertCat('default-CPQ-010', 'CPQ-010', 'Contreplaqué bouleau 21mm', 'm²', 55.00, 33.00, 'Contreplaqués', 'Corbat Holz')
  insertCat('default-CPQ-011', 'CPQ-011', 'Contreplaqué okoumé marine 6mm', 'm²', 22.00, 13.20, 'Contreplaqués', 'HG Commerciale')
  insertCat('default-CPQ-012', 'CPQ-012', 'Contreplaqué okoumé marine 12mm', 'm²', 38.00, 22.80, 'Contreplaqués', 'HG Commerciale')
  insertCat('default-CPQ-013', 'CPQ-013', 'Contreplaqué okoumé marine 18mm', 'm²', 52.00, 31.20, 'Contreplaqués', 'HG Commerciale')
  insertCat('default-CPQ-014', 'CPQ-014', 'Contreplaqué coffrage 21mm', 'm²', 28.00, 16.80, 'Contreplaqués', 'Tschopp Holz')
  insertCat('default-CPQ-015', 'CPQ-015', 'Contreplaqué antidérapant 18mm', 'm²', 58.00, 34.80, 'Contreplaqués', 'HG Commerciale')

  // ---- MÉLAMINÉS / STRATIFIÉS ----
  insertCat('default-MEL-001', 'MEL-001', 'Mélaminé blanc 2 faces 16mm', 'm²', 28.00, 16.80, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-002', 'MEL-002', 'Mélaminé blanc 2 faces 19mm', 'm²', 34.00, 20.40, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-003', 'MEL-003', 'Mélaminé décor chêne naturel 19mm', 'm²', 42.00, 25.20, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-004', 'MEL-004', 'Mélaminé décor noyer 19mm', 'm²', 45.00, 27.00, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-005', 'MEL-005', 'Mélaminé décor gris anthracite 19mm', 'm²', 42.00, 25.20, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-006', 'MEL-006', 'Mélaminé décor noir 19mm', 'm²', 42.00, 25.20, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-007', 'MEL-007', 'Stratifié HPL compact 3mm', 'm²', 65.00, 39.00, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-008', 'MEL-008', 'Stratifié HPL à coller 0.8mm', 'm²', 32.00, 19.20, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-009', 'MEL-009', 'Chant mélaminé pré-encollé 23mm', 'm', 1.80, 1.08, 'Mélaminés', 'HG Commerciale')
  insertCat('default-MEL-010', 'MEL-010', 'Chant ABS 2mm assorti', 'm', 3.20, 1.92, 'Mélaminés', 'HG Commerciale')

  // ---- PLACAGES ----
  insertCat('default-PLA-001', 'PLA-001', 'Placage chêne 0.6mm (feuille)', 'm²', 22.00, 13.20, 'Placages', 'Corbat Holz')
  insertCat('default-PLA-002', 'PLA-002', 'Placage hêtre 0.6mm (feuille)', 'm²', 16.00, 9.60, 'Placages', 'Corbat Holz')
  insertCat('default-PLA-003', 'PLA-003', 'Placage noyer 0.6mm (feuille)', 'm²', 45.00, 27.00, 'Placages', 'Corbat Holz')
  insertCat('default-PLA-004', 'PLA-004', 'Placage érable 0.6mm (feuille)', 'm²', 18.00, 10.80, 'Placages', 'Corbat Holz')
  insertCat('default-PLA-005', 'PLA-005', 'Placage frêne 0.6mm (feuille)', 'm²', 18.00, 10.80, 'Placages', 'Corbat Holz')
  insertCat('default-PLA-006', 'PLA-006', 'Placage merisier 0.6mm (feuille)', 'm²', 28.00, 16.80, 'Placages', 'Corbat Holz')
  insertCat('default-PLA-007', 'PLA-007', 'Panneau plaqué chêne 19mm', 'm²', 68.00, 40.80, 'Placages', 'Tschopp Holz')
  insertCat('default-PLA-008', 'PLA-008', 'Panneau plaqué noyer 19mm', 'm²', 95.00, 57.00, 'Placages', 'Tschopp Holz')
  insertCat('default-PLA-009', 'PLA-009', 'Panneau plaqué hêtre 19mm', 'm²', 58.00, 34.80, 'Placages', 'Tschopp Holz')

  // ---- PARQUETS ----
  insertCat('default-PAR-001', 'PAR-001', 'Parquet chêne massif brut 15mm', 'm²', 78.00, 46.80, 'Parquets', 'Tschopp Holz')
  insertCat('default-PAR-002', 'PAR-002', 'Parquet chêne massif huilé 15mm', 'm²', 95.00, 57.00, 'Parquets', 'Tschopp Holz')
  insertCat('default-PAR-003', 'PAR-003', 'Parquet chêne massif brossé huilé 20mm', 'm²', 115.00, 69.00, 'Parquets', 'Tschopp Holz')
  insertCat('default-PAR-004', 'PAR-004', 'Parquet chêne contrecollé 15mm', 'm²', 68.00, 40.80, 'Parquets', 'HG Commerciale')
  insertCat('default-PAR-005', 'PAR-005', 'Parquet hêtre massif brut 15mm', 'm²', 62.00, 37.20, 'Parquets', 'HG Commerciale')
  insertCat('default-PAR-006', 'PAR-006', 'Parquet frêne massif brut 15mm', 'm²', 72.00, 43.20, 'Parquets', 'Corbat Holz')
  insertCat('default-PAR-007', 'PAR-007', 'Parquet noyer massif brut 15mm', 'm²', 145.00, 87.00, 'Parquets', 'Corbat Holz')
  insertCat('default-PAR-008', 'PAR-008', 'Parquet mélèze massif brut 15mm', 'm²', 72.00, 43.20, 'Parquets', 'Corbat Holz')
  insertCat('default-PAR-009', 'PAR-009', 'Parquet érable massif brut 15mm', 'm²', 68.00, 40.80, 'Parquets', 'HG Commerciale')
  insertCat('default-PAR-010', 'PAR-010', 'Parquet sapin vieux bois 20mm', 'm²', 110.00, 66.00, 'Parquets', 'Altholz Schweiz')

  // ---- LAMBRIS / BARDAGE ----
  insertCat('default-LAM-001', 'LAM-001', 'Lambris épicéa raboté 12x96mm', 'm²', 24.00, 14.40, 'Lambris & bardage', 'Tschopp Holz')
  insertCat('default-LAM-002', 'LAM-002', 'Lambris épicéa brossé 15x135mm', 'm²', 35.00, 21.00, 'Lambris & bardage', 'Tschopp Holz')
  insertCat('default-LAM-003', 'LAM-003', 'Lambris sapin vieux bois', 'm²', 85.00, 51.00, 'Lambris & bardage', 'Altholz Schweiz')
  insertCat('default-LAM-004', 'LAM-004', 'Lambris arole/pin cembro 15mm', 'm²', 72.00, 43.20, 'Lambris & bardage', 'Corbat Holz')
  insertCat('default-LAM-005', 'LAM-005', 'Lambris chêne massif 15mm', 'm²', 85.00, 51.00, 'Lambris & bardage', 'Corbat Holz')
  insertCat('default-LAM-006', 'LAM-006', 'Bardage mélèze 21x145mm (rhombus)', 'm²', 52.00, 31.20, 'Lambris & bardage', 'Corbat Holz')
  insertCat('default-LAM-007', 'LAM-007', 'Bardage mélèze 21x145mm (à recouvrement)', 'm²', 48.00, 28.80, 'Lambris & bardage', 'Corbat Holz')
  insertCat('default-LAM-008', 'LAM-008', 'Bardage douglas 21x145mm', 'm²', 45.00, 27.00, 'Lambris & bardage', 'HG Commerciale')
  insertCat('default-LAM-009', 'LAM-009', 'Bardage épicéa traité 21x145mm', 'm²', 32.00, 19.20, 'Lambris & bardage', 'HG Commerciale')
  insertCat('default-LAM-010', 'LAM-010', 'Bardage épicéa brûlé (shou sugi ban)', 'm²', 85.00, 51.00, 'Lambris & bardage', 'Altholz Schweiz')

  // ---- TERRASSES ----
  insertCat('default-TER-001', 'TER-001', 'Lame terrasse mélèze 27x145mm', 'm²', 58.00, 34.80, 'Terrasses', 'Corbat Holz')
  insertCat('default-TER-002', 'TER-002', 'Lame terrasse douglas 27x145mm', 'm²', 48.00, 28.80, 'Terrasses', 'HG Commerciale')
  insertCat('default-TER-003', 'TER-003', 'Lame terrasse robinier 21x120mm', 'm²', 72.00, 43.20, 'Terrasses', 'Corbat Holz')
  insertCat('default-TER-004', 'TER-004', 'Lame terrasse chêne 27x145mm', 'm²', 85.00, 51.00, 'Terrasses', 'Tschopp Holz')
  insertCat('default-TER-005', 'TER-005', 'Lame terrasse thermotraité 21x120mm', 'm²', 62.00, 37.20, 'Terrasses', 'HG Commerciale')
  insertCat('default-TER-006', 'TER-006', 'Lambourde mélèze 45x70mm', 'm', 8.50, 5.10, 'Terrasses', 'Corbat Holz')
  insertCat('default-TER-007', 'TER-007', 'Lambourde alu réglable', 'pce', 12.00, 7.20, 'Terrasses', 'HG Commerciale')
  insertCat('default-TER-008', 'TER-008', 'Plot terrasse réglable 50-80mm', 'pce', 5.50, 3.30, 'Terrasses', 'HG Commerciale')
  insertCat('default-TER-009', 'TER-009', 'Vis terrasse inox 5x50mm (boîte 200)', 'boîte', 45.00, 27.00, 'Terrasses', 'HG Commerciale')

  // ---- LAMELLÉ-COLLÉ / BOIS D'INGÉNIERIE ----
  insertCat('default-LCO-001', 'LCO-001', 'Lamellé-collé sapin 80x160mm', 'm', 22.00, 13.20, 'Lamellé-collé', 'HG Commerciale')
  insertCat('default-LCO-002', 'LCO-002', 'Lamellé-collé sapin 100x200mm', 'm', 32.00, 19.20, 'Lamellé-collé', 'HG Commerciale')
  insertCat('default-LCO-003', 'LCO-003', 'Lamellé-collé sapin 120x240mm', 'm', 45.00, 27.00, 'Lamellé-collé', 'HG Commerciale')
  insertCat('default-LCO-004', 'LCO-004', 'Lamellé-collé sapin 140x280mm', 'm', 58.00, 34.80, 'Lamellé-collé', 'HG Commerciale')
  insertCat('default-LCO-005', 'LCO-005', 'Lamellé-collé sapin 160x320mm', 'm', 72.00, 43.20, 'Lamellé-collé', 'HG Commerciale')
  insertCat('default-LCO-006', 'LCO-006', 'Lamellé-collé sapin 200x400mm', 'm', 105.00, 63.00, 'Lamellé-collé', 'HG Commerciale')
  insertCat('default-LCO-007', 'LCO-007', 'Lamellé-collé chêne 80x160mm', 'm', 68.00, 40.80, 'Lamellé-collé', 'Corbat Holz')
  insertCat('default-LCO-008', 'LCO-008', 'Lamellé-collé chêne 120x240mm', 'm', 125.00, 75.00, 'Lamellé-collé', 'Corbat Holz')
  insertCat('default-LCO-009', 'LCO-009', 'KVH (bois massif reconstitué) 60x120mm', 'm', 10.50, 6.30, 'Lamellé-collé', 'Tschopp Holz')
  insertCat('default-LCO-010', 'LCO-010', 'KVH 80x160mm', 'm', 16.00, 9.60, 'Lamellé-collé', 'Tschopp Holz')
  insertCat('default-LCO-011', 'LCO-011', 'KVH 100x200mm', 'm', 24.00, 14.40, 'Lamellé-collé', 'Tschopp Holz')

  // ---- BOIS EXOTIQUES / TROPICAUX ----
  insertCat('default-EXO-001', 'EXO-001', 'Teck massif raboté 27x100mm', 'm', 48.00, 28.80, 'Bois exotiques', 'HG Commerciale')
  insertCat('default-EXO-002', 'EXO-002', 'Iroko massif raboté 27x100mm', 'm', 32.00, 19.20, 'Bois exotiques', 'HG Commerciale')
  insertCat('default-EXO-003', 'EXO-003', 'Padouk massif raboté 27x100mm', 'm', 35.00, 21.00, 'Bois exotiques', 'HG Commerciale')
  insertCat('default-EXO-004', 'EXO-004', 'Wengé massif raboté 27x100mm', 'm', 55.00, 33.00, 'Bois exotiques', 'HG Commerciale')
  insertCat('default-EXO-005', 'EXO-005', 'Sipo/Acajou massif raboté 27x100mm', 'm', 28.00, 16.80, 'Bois exotiques', 'HG Commerciale')
  insertCat('default-EXO-006', 'EXO-006', 'Ipé lame terrasse 21x145mm', 'm²', 115.00, 69.00, 'Bois exotiques', 'HG Commerciale')
  insertCat('default-EXO-007', 'EXO-007', 'Cumaru lame terrasse 21x145mm', 'm²', 85.00, 51.00, 'Bois exotiques', 'HG Commerciale')

  // ---- PLINTHES / MOULURES / PROFILS ----
  insertCat('default-MOL-001', 'MOL-001', 'Plinthe sapin 12x60mm', 'm', 3.50, 2.10, 'Moulures & profils', 'Tschopp Holz')
  insertCat('default-MOL-002', 'MOL-002', 'Plinthe sapin 15x80mm', 'm', 4.80, 2.88, 'Moulures & profils', 'Tschopp Holz')
  insertCat('default-MOL-003', 'MOL-003', 'Plinthe chêne massif 15x60mm', 'm', 9.50, 5.70, 'Moulures & profils', 'Corbat Holz')
  insertCat('default-MOL-004', 'MOL-004', 'Plinthe chêne massif 15x80mm', 'm', 12.50, 7.50, 'Moulures & profils', 'Corbat Holz')
  insertCat('default-MOL-005', 'MOL-005', 'Plinthe MDF laquée blanc 15x80mm', 'm', 6.50, 3.90, 'Moulures & profils', 'HG Commerciale')
  insertCat('default-MOL-006', 'MOL-006', 'Quart-de-rond sapin 18x18mm', 'm', 2.20, 1.32, 'Moulures & profils', 'Tschopp Holz')
  insertCat('default-MOL-007', 'MOL-007', 'Quart-de-rond chêne 15x15mm', 'm', 4.80, 2.88, 'Moulures & profils', 'Corbat Holz')
  insertCat('default-MOL-008', 'MOL-008', 'Cornière sapin 25x25mm', 'm', 3.20, 1.92, 'Moulures & profils', 'Tschopp Holz')
  insertCat('default-MOL-009', 'MOL-009', 'Couvre-joint sapin 8x35mm', 'm', 2.50, 1.50, 'Moulures & profils', 'Tschopp Holz')
  insertCat('default-MOL-010', 'MOL-010', 'Chambranle sapin 12x60mm', 'm', 4.50, 2.70, 'Moulures & profils', 'Tschopp Holz')
  insertCat('default-MOL-011', 'MOL-011', 'Chambranle chêne 12x60mm', 'm', 12.00, 7.20, 'Moulures & profils', 'Corbat Holz')
  insertCat('default-MOL-012', 'MOL-012', 'Main courante hêtre ronde Ø42mm', 'm', 18.00, 10.80, 'Moulures & profils', 'HG Commerciale')
  insertCat('default-MOL-013', 'MOL-013', 'Main courante chêne ronde Ø42mm', 'm', 28.00, 16.80, 'Moulures & profils', 'Corbat Holz')
  insertCat('default-MOL-014', 'MOL-014', 'Balustre hêtre tourné 900mm', 'pce', 22.00, 13.20, 'Moulures & profils', 'HG Commerciale')

  // ---- LATTAGE / TASSEAUX ----
  insertCat('default-LAT-001', 'LAT-001', 'Tasseau sapin 18x38mm', 'm', 1.50, 0.90, 'Lattage & tasseaux', 'Tschopp Holz')
  insertCat('default-LAT-002', 'LAT-002', 'Tasseau sapin 24x48mm', 'm', 2.20, 1.32, 'Lattage & tasseaux', 'Tschopp Holz')
  insertCat('default-LAT-003', 'LAT-003', 'Tasseau sapin 30x50mm', 'm', 3.20, 1.92, 'Lattage & tasseaux', 'Tschopp Holz')
  insertCat('default-LAT-004', 'LAT-004', 'Latte sapin 24x48mm (contre-lattage)', 'm', 2.00, 1.20, 'Lattage & tasseaux', 'Tschopp Holz')
  insertCat('default-LAT-005', 'LAT-005', 'Latte sapin 30x60mm', 'm', 3.50, 2.10, 'Lattage & tasseaux', 'Tschopp Holz')
  insertCat('default-LAT-006', 'LAT-006', 'Volige sapin brut 24x150mm', 'm', 4.50, 2.70, 'Lattage & tasseaux', 'Tschopp Holz')
  insertCat('default-LAT-007', 'LAT-007', 'Volige sapin brut 24x200mm', 'm', 5.80, 3.48, 'Lattage & tasseaux', 'Tschopp Holz')

  // ---- ESCALIER ----
  insertCat('default-ESC-001', 'ESC-001', 'Marche escalier hêtre massif 40mm', 'pce', 125.00, 75.00, 'Escalier', 'Corbat Holz')
  insertCat('default-ESC-002', 'ESC-002', 'Marche escalier chêne massif 40mm', 'pce', 185.00, 111.00, 'Escalier', 'Corbat Holz')
  insertCat('default-ESC-003', 'ESC-003', 'Contremarche hêtre 20mm', 'pce', 42.00, 25.20, 'Escalier', 'HG Commerciale')
  insertCat('default-ESC-004', 'ESC-004', 'Contremarche chêne 20mm', 'pce', 65.00, 39.00, 'Escalier', 'Corbat Holz')
  insertCat('default-ESC-005', 'ESC-005', 'Nez de marche chêne (profil arrondi)', 'm', 28.00, 16.80, 'Escalier', 'Corbat Holz')
  insertCat('default-ESC-006', 'ESC-006', 'Limon sapin lamellé-collé 60x280mm', 'm', 45.00, 27.00, 'Escalier', 'HG Commerciale')
  insertCat('default-ESC-007', 'ESC-007', 'Limon chêne lamellé-collé 60x280mm', 'm', 85.00, 51.00, 'Escalier', 'Corbat Holz')

  // ---- PORTES / MENUISERIE INTÉRIEURE ----
  insertCat('default-POR-001', 'POR-001', 'Porte intérieure sapin massif 73x198cm', 'pce', 280.00, 168.00, 'Portes', 'HG Commerciale')
  insertCat('default-POR-002', 'POR-002', 'Porte intérieure alvéolaire laquée blanc', 'pce', 145.00, 87.00, 'Portes', 'HG Commerciale')
  insertCat('default-POR-003', 'POR-003', 'Porte intérieure chêne placage 73x198cm', 'pce', 420.00, 252.00, 'Portes', 'Corbat Holz')
  insertCat('default-POR-004', 'POR-004', 'Bloc-porte complet sapin (huisserie + porte)', 'pce', 450.00, 270.00, 'Portes', 'HG Commerciale')
  insertCat('default-POR-005', 'POR-005', 'Huisserie sapin 90x35mm', 'ens', 95.00, 57.00, 'Portes', 'Tschopp Holz')
  insertCat('default-POR-006', 'POR-006', 'Huisserie chêne 90x35mm', 'ens', 185.00, 111.00, 'Portes', 'Corbat Holz')

  // ---- PLANS DE TRAVAIL ----
  insertCat('default-PDT-001', 'PDT-001', 'Plan de travail hêtre massif 27mm', 'm²', 95.00, 57.00, 'Plans de travail', 'HG Commerciale')
  insertCat('default-PDT-002', 'PDT-002', 'Plan de travail hêtre massif 40mm', 'm²', 135.00, 81.00, 'Plans de travail', 'HG Commerciale')
  insertCat('default-PDT-003', 'PDT-003', 'Plan de travail chêne massif 27mm', 'm²', 145.00, 87.00, 'Plans de travail', 'Corbat Holz')
  insertCat('default-PDT-004', 'PDT-004', 'Plan de travail chêne massif 40mm', 'm²', 195.00, 117.00, 'Plans de travail', 'Corbat Holz')
  insertCat('default-PDT-005', 'PDT-005', 'Plan de travail noyer massif 40mm', 'm²', 320.00, 192.00, 'Plans de travail', 'Corbat Holz')
  insertCat('default-PDT-006', 'PDT-006', 'Plan de travail stratifié 38mm', 'm²', 55.00, 33.00, 'Plans de travail', 'HG Commerciale')
  insertCat('default-PDT-007', 'PDT-007', 'Plan de travail compact (fenix/dekton) 12mm', 'm²', 250.00, 150.00, 'Plans de travail', 'HG Commerciale')

  // ============================================================
  // Catalogue complet non-bois — Isolation, Visserie, Quincaillerie, Colles, Étanchéité
  // Prix médians Suisse Romande 2025
  // ============================================================

  // ---- ISOLATION ----
  insertCat('default-ISO-001', 'ISO-001', 'Laine de verre 100mm (rouleau)', 'm²', 12.00, 7.20, 'Isolation', 'Isover')
  insertCat('default-ISO-002', 'ISO-002', 'Laine de verre 160mm (rouleau)', 'm²', 18.50, 11.10, 'Isolation', 'Isover')
  insertCat('default-ISO-003', 'ISO-003', 'Laine de verre 200mm (rouleau)', 'm²', 22.00, 13.20, 'Isolation', 'Isover')
  insertCat('default-ISO-004', 'ISO-004', 'Laine de roche 60mm (panneau)', 'm²', 14.50, 8.70, 'Isolation', 'Flumroc')
  insertCat('default-ISO-005', 'ISO-005', 'Laine de roche 80mm (panneau)', 'm²', 18.00, 10.80, 'Isolation', 'Flumroc')
  insertCat('default-ISO-006', 'ISO-006', 'Laine de roche 120mm (panneau)', 'm²', 24.00, 14.40, 'Isolation', 'Flumroc')
  insertCat('default-ISO-007', 'ISO-007', 'Laine de roche 160mm (panneau)', 'm²', 32.00, 19.20, 'Isolation', 'Flumroc')
  insertCat('default-ISO-008', 'ISO-008', 'Fibre de bois souple 60mm', 'm²', 16.50, 9.90, 'Isolation', 'Pavatex')
  insertCat('default-ISO-009', 'ISO-009', 'Fibre de bois souple 100mm', 'm²', 24.00, 14.40, 'Isolation', 'Pavatex')
  insertCat('default-ISO-010', 'ISO-010', 'Fibre de bois souple 140mm', 'm²', 32.00, 19.20, 'Isolation', 'Pavatex')
  insertCat('default-ISO-011', 'ISO-011', 'Fibre de bois rigide 40mm (Isolair)', 'm²', 18.00, 10.80, 'Isolation', 'Pavatex')
  insertCat('default-ISO-012', 'ISO-012', 'Fibre de bois rigide 60mm (Isolair)', 'm²', 25.00, 15.00, 'Isolation', 'Pavatex')
  insertCat('default-ISO-013', 'ISO-013', 'Fibre de bois rigide 80mm (Isolair)', 'm²', 32.00, 19.20, 'Isolation', 'Pavatex')
  insertCat('default-ISO-014', 'ISO-014', 'Polystyrène expansé EPS 60mm', 'm²', 8.50, 5.10, 'Isolation', 'Swisspor')
  insertCat('default-ISO-015', 'ISO-015', 'Polystyrène expansé EPS 100mm', 'm²', 12.50, 7.50, 'Isolation', 'Swisspor')
  insertCat('default-ISO-016', 'ISO-016', 'Polystyrène extrudé XPS 60mm', 'm²', 18.00, 10.80, 'Isolation', 'Swisspor')
  insertCat('default-ISO-017', 'ISO-017', 'Polystyrène extrudé XPS 100mm', 'm²', 28.00, 16.80, 'Isolation', 'Swisspor')
  insertCat('default-ISO-018', 'ISO-018', 'Isolation chanvre 100mm', 'm²', 28.00, 16.80, 'Isolation', 'Thermo-Hanf')
  insertCat('default-ISO-019', 'ISO-019', 'Isolation ouate de cellulose (vrac)', 'kg', 1.80, 1.08, 'Isolation', 'Isofloc')
  insertCat('default-ISO-020', 'ISO-020', 'Pare-vapeur polyéthylène 0.2mm', 'm²', 2.80, 1.68, 'Isolation', 'Isover')
  insertCat('default-ISO-021', 'ISO-021', 'Frein-vapeur Intello Plus', 'm²', 4.50, 2.70, 'Isolation', 'ProClima')
  insertCat('default-ISO-022', 'ISO-022', 'Ruban adhésif pare-vapeur (rouleau 25m)', 'pce', 18.00, 10.80, 'Isolation', 'ProClima')
  insertCat('default-ISO-023', 'ISO-023', 'Sous-toiture perméable Solitex', 'm²', 3.80, 2.28, 'Isolation', 'ProClima')
  insertCat('default-ISO-024', 'ISO-024', 'Isolation acoustique (résilient) 5mm', 'm²', 6.50, 3.90, 'Isolation', 'Isover')

  // ---- VISSERIE & FIXATIONS ----
  insertCat('default-VIS-001', 'VIS-001', 'Vis bois aggloméré 3.5x30mm (boîte 500)', 'boîte', 12.00, 7.20, 'Visserie', 'Würth')
  insertCat('default-VIS-002', 'VIS-002', 'Vis bois aggloméré 3.5x40mm (boîte 500)', 'boîte', 13.50, 8.10, 'Visserie', 'Würth')
  insertCat('default-VIS-003', 'VIS-003', 'Vis bois aggloméré 4x50mm (boîte 500)', 'boîte', 16.00, 9.60, 'Visserie', 'Würth')
  insertCat('default-VIS-004', 'VIS-004', 'Vis bois aggloméré 4x60mm (boîte 200)', 'boîte', 12.50, 7.50, 'Visserie', 'Würth')
  insertCat('default-VIS-005', 'VIS-005', 'Vis bois aggloméré 5x70mm (boîte 200)', 'boîte', 15.00, 9.00, 'Visserie', 'Würth')
  insertCat('default-VIS-006', 'VIS-006', 'Vis bois aggloméré 5x80mm (boîte 200)', 'boîte', 16.50, 9.90, 'Visserie', 'Würth')
  insertCat('default-VIS-007', 'VIS-007', 'Vis bois aggloméré 5x100mm (boîte 100)', 'boîte', 14.00, 8.40, 'Visserie', 'Würth')
  insertCat('default-VIS-008', 'VIS-008', 'Vis inox A2 4x40mm (boîte 200)', 'boîte', 18.00, 10.80, 'Visserie', 'Würth')
  insertCat('default-VIS-009', 'VIS-009', 'Vis inox A2 4x50mm (boîte 200)', 'boîte', 20.00, 12.00, 'Visserie', 'Würth')
  insertCat('default-VIS-010', 'VIS-010', 'Vis inox A2 5x60mm (boîte 200)', 'boîte', 24.00, 14.40, 'Visserie', 'Würth')
  insertCat('default-VIS-011', 'VIS-011', 'Vis inox A2 5x80mm (boîte 100)', 'boîte', 22.00, 13.20, 'Visserie', 'Würth')
  insertCat('default-VIS-012', 'VIS-012', 'Vis terrasse inox 5x50mm (boîte 200)', 'boîte', 32.00, 19.20, 'Visserie', 'Spax')
  insertCat('default-VIS-013', 'VIS-013', 'Vis terrasse inox 5x60mm (boîte 200)', 'boîte', 35.00, 21.00, 'Visserie', 'Spax')
  insertCat('default-VIS-014', 'VIS-014', 'Vis charpente 8x100mm (boîte 50)', 'boîte', 18.00, 10.80, 'Visserie', 'Würth')
  insertCat('default-VIS-015', 'VIS-015', 'Vis charpente 8x160mm (boîte 50)', 'boîte', 25.00, 15.00, 'Visserie', 'Würth')
  insertCat('default-VIS-016', 'VIS-016', 'Vis charpente 8x200mm (boîte 50)', 'boîte', 32.00, 19.20, 'Visserie', 'Würth')
  insertCat('default-VIS-017', 'VIS-017', 'Vis à tête fraisée Torx 4x40mm (boîte 500)', 'boîte', 15.00, 9.00, 'Visserie', 'Spax')
  insertCat('default-VIS-018', 'VIS-018', 'Vis à tête fraisée Torx 5x60mm (boîte 200)', 'boîte', 16.00, 9.60, 'Visserie', 'Spax')
  insertCat('default-VIS-019', 'VIS-019', 'Pointe lisse 2.8x65mm (1kg)', 'kg', 8.50, 5.10, 'Visserie', 'Würth')
  insertCat('default-VIS-020', 'VIS-020', 'Pointe annelée 2.8x65mm (1kg)', 'kg', 12.00, 7.20, 'Visserie', 'Würth')
  insertCat('default-VIS-021', 'VIS-021', 'Clous finition sans tête 1.4x30mm (boîte 5000)', 'boîte', 22.00, 13.20, 'Visserie', 'Würth')
  insertCat('default-VIS-022', 'VIS-022', 'Agrafes 12mm (boîte 5000)', 'boîte', 8.50, 5.10, 'Visserie', 'Würth')
  insertCat('default-VIS-023', 'VIS-023', 'Agrafes 25mm (boîte 5000)', 'boîte', 12.00, 7.20, 'Visserie', 'Würth')
  insertCat('default-VIS-024', 'VIS-024', 'Tire-fond 8x80mm zingué (boîte 50)', 'boîte', 14.00, 8.40, 'Visserie', 'Würth')
  insertCat('default-VIS-025', 'VIS-025', 'Cheville nylon 8mm (boîte 100)', 'boîte', 8.00, 4.80, 'Visserie', 'Fischer')
  insertCat('default-VIS-026', 'VIS-026', 'Cheville nylon 10mm (boîte 50)', 'boîte', 9.50, 5.70, 'Visserie', 'Fischer')
  insertCat('default-VIS-027', 'VIS-027', 'Cheville métal à expansion M8 (boîte 50)', 'boîte', 22.00, 13.20, 'Visserie', 'Fischer')
  insertCat('default-VIS-028', 'VIS-028', 'Boulon poêlier M8x80mm (boîte 50)', 'boîte', 12.00, 7.20, 'Visserie', 'Würth')

  // ---- MOUSSE & ÉTANCHÉITÉ ----
  insertCat('default-MOU-001', 'MOU-001', 'Mousse PU expansive (750ml)', 'pce', 12.50, 7.50, 'Étanchéité', 'Sika')
  insertCat('default-MOU-002', 'MOU-002', 'Mousse PU coupe-feu (750ml)', 'pce', 18.00, 10.80, 'Étanchéité', 'Würth')
  insertCat('default-MOU-003', 'MOU-003', 'Mousse PU pistolable (750ml)', 'pce', 14.50, 8.70, 'Étanchéité', 'Sika')
  insertCat('default-MOU-004', 'MOU-004', 'Pistolet mousse PU professionnel', 'pce', 45.00, 27.00, 'Étanchéité', 'Würth')
  insertCat('default-MOU-005', 'MOU-005', 'Nettoyant mousse PU (500ml)', 'pce', 9.50, 5.70, 'Étanchéité', 'Würth')
  insertCat('default-MOU-006', 'MOU-006', 'Silicone sanitaire transparent (310ml)', 'pce', 9.50, 5.70, 'Étanchéité', 'Sika')
  insertCat('default-MOU-007', 'MOU-007', 'Silicone sanitaire blanc (310ml)', 'pce', 9.50, 5.70, 'Étanchéité', 'Sika')
  insertCat('default-MOU-008', 'MOU-008', 'Mastic acrylique blanc (310ml)', 'pce', 6.50, 3.90, 'Étanchéité', 'Sika')
  insertCat('default-MOU-009', 'MOU-009', 'Mastic polyuréthane noir (310ml)', 'pce', 12.00, 7.20, 'Étanchéité', 'Sikaflex')
  insertCat('default-MOU-010', 'MOU-010', 'Mastic MS polymère (310ml)', 'pce', 14.00, 8.40, 'Étanchéité', 'Bostik')
  insertCat('default-MOU-011', 'MOU-011', 'Joint mousse compressible (rouleau 10m)', 'pce', 8.50, 5.10, 'Étanchéité', 'Würth')
  insertCat('default-MOU-012', 'MOU-012', 'Joint brosse adhésif (rouleau 5m)', 'pce', 5.50, 3.30, 'Étanchéité', 'Würth')
  insertCat('default-MOU-013', 'MOU-013', 'Bande d\'étanchéité EPDM 50mm (10m)', 'pce', 18.00, 10.80, 'Étanchéité', 'ProClima')
  insertCat('default-MOU-014', 'MOU-014', 'Ruban adhésif alu (rouleau 50m)', 'pce', 12.00, 7.20, 'Étanchéité', 'Würth')
  insertCat('default-MOU-015', 'MOU-015', 'Fond de joint mousse PE 10mm (10m)', 'pce', 4.50, 2.70, 'Étanchéité', 'Sika')

  // ---- QUINCAILLERIE ÉTENDUE ----
  insertCat('default-QUI-001', 'QUI-001', 'Charnière piano laiton 32x1000mm', 'pce', 18.00, 10.80, 'Quincaillerie', 'Häfele')
  insertCat('default-QUI-002', 'QUI-002', 'Charnière invisible 35mm (Blum)', 'pce', 4.80, 2.88, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-003', 'QUI-003', 'Charnière invisible 35mm avec frein', 'pce', 7.50, 4.50, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-004', 'QUI-004', 'Coulisse tiroir 300mm pleine extension', 'paire', 22.00, 13.20, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-005', 'QUI-005', 'Coulisse tiroir 400mm pleine extension', 'paire', 25.00, 15.00, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-006', 'QUI-006', 'Coulisse tiroir 500mm pleine extension', 'paire', 28.00, 16.80, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-007', 'QUI-007', 'Coulisse tiroir 600mm pleine extension', 'paire', 32.00, 19.20, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-008', 'QUI-008', 'Amortisseur de porte Blumotion', 'pce', 6.50, 3.90, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-009', 'QUI-009', 'Relevable Aventos HK-XS (set)', 'ens', 85.00, 51.00, 'Quincaillerie', 'Blum')
  insertCat('default-QUI-010', 'QUI-010', 'Poignée coquille inox 96mm', 'pce', 8.50, 5.10, 'Quincaillerie', 'Häfele')
  insertCat('default-QUI-011', 'QUI-011', 'Poignée barre inox 128mm', 'pce', 12.00, 7.20, 'Quincaillerie', 'Häfele')
  insertCat('default-QUI-012', 'QUI-012', 'Poignée barre inox 256mm', 'pce', 18.00, 10.80, 'Quincaillerie', 'Häfele')
  insertCat('default-QUI-013', 'QUI-013', 'Bouton de meuble inox satiné', 'pce', 5.50, 3.30, 'Quincaillerie', 'Häfele')
  insertCat('default-QUI-014', 'QUI-014', 'Serrure à cylindre pour meuble', 'pce', 12.00, 7.20, 'Quincaillerie', 'Häfele')
  insertCat('default-QUI-015', 'QUI-015', 'Pied de meuble réglable H100mm', 'pce', 3.50, 2.10, 'Quincaillerie', 'Häfele')
  insertCat('default-QUI-016', 'QUI-016', 'Équerre de fixation 50x50mm (lot 10)', 'lot', 8.00, 4.80, 'Quincaillerie', 'Würth')
  insertCat('default-QUI-017', 'QUI-017', 'Équerre de renfort 70x70mm (lot 10)', 'lot', 12.00, 7.20, 'Quincaillerie', 'Würth')
  insertCat('default-QUI-018', 'QUI-018', 'Tourillon bois 8x35mm (boîte 100)', 'boîte', 6.00, 3.60, 'Quincaillerie', 'Würth')
  insertCat('default-QUI-019', 'QUI-019', 'Tourillon bois 10x40mm (boîte 100)', 'boîte', 7.50, 4.50, 'Quincaillerie', 'Würth')
  insertCat('default-QUI-020', 'QUI-020', 'Domino Festool 8x40mm (boîte 130)', 'boîte', 35.00, 21.00, 'Quincaillerie', 'Festool')
  insertCat('default-QUI-021', 'QUI-021', 'Domino Festool 10x50mm (boîte 85)', 'boîte', 38.00, 22.80, 'Quincaillerie', 'Festool')
  insertCat('default-QUI-022', 'QUI-022', 'Lamelle bois N°20 (boîte 1000)', 'boîte', 28.00, 16.80, 'Quincaillerie', 'Würth')
  insertCat('default-QUI-023', 'QUI-023', 'Connecteur métallique Simpson (lot 10)', 'lot', 18.00, 10.80, 'Quincaillerie', 'Simpson')
  insertCat('default-QUI-024', 'QUI-024', 'Sabot de solive galvanisé (lot 10)', 'lot', 22.00, 13.20, 'Quincaillerie', 'Simpson')

  // ---- COLLES & FINITIONS ----
  insertCat('default-COL-001', 'COL-001', 'Colle à bois PVAc D3 (750g)', 'pce', 14.00, 8.40, 'Colles & finitions', 'Würth')
  insertCat('default-COL-002', 'COL-002', 'Colle à bois PVAc D4 (750g)', 'pce', 18.00, 10.80, 'Colles & finitions', 'Würth')
  insertCat('default-COL-003', 'COL-003', 'Colle PU bois (500g)', 'pce', 22.00, 13.20, 'Colles & finitions', 'Sika')
  insertCat('default-COL-004', 'COL-004', 'Colle contact néoprène (1L)', 'pce', 24.00, 14.40, 'Colles & finitions', 'Bostik')
  insertCat('default-COL-005', 'COL-005', 'Colle parquet élastique (14kg)', 'seau', 85.00, 51.00, 'Colles & finitions', 'Bona')
  insertCat('default-COL-006', 'COL-006', 'Vernis polyuréthane mat (1L)', 'pce', 32.00, 19.20, 'Colles & finitions', 'Livos')
  insertCat('default-COL-007', 'COL-007', 'Vernis polyuréthane satiné (1L)', 'pce', 32.00, 19.20, 'Colles & finitions', 'Livos')
  insertCat('default-COL-008', 'COL-008', 'Huile dure naturelle (1L)', 'pce', 38.00, 22.80, 'Colles & finitions', 'Livos')
  insertCat('default-COL-009', 'COL-009', 'Huile de tung (1L)', 'pce', 42.00, 25.20, 'Colles & finitions', 'Livos')
  insertCat('default-COL-010', 'COL-010', 'Cire d\'abeille (500ml)', 'pce', 28.00, 16.80, 'Colles & finitions', 'Livos')
  insertCat('default-COL-011', 'COL-011', 'Lasure bois extérieur (2.5L)', 'pce', 55.00, 33.00, 'Colles & finitions', 'Sigma')
  insertCat('default-COL-012', 'COL-012', 'Peinture bois intérieur (2.5L)', 'pce', 48.00, 28.80, 'Colles & finitions', 'Sigma')
  insertCat('default-COL-013', 'COL-013', 'Fond dur bouche-pores (1L)', 'pce', 22.00, 13.20, 'Colles & finitions', 'Livos')
  insertCat('default-COL-014', 'COL-014', 'Teinte bois (250ml)', 'pce', 14.00, 8.40, 'Colles & finitions', 'Livos')
  insertCat('default-COL-015', 'COL-015', 'Diluant naturel (1L)', 'pce', 18.00, 10.80, 'Colles & finitions', 'Livos')

  // ---- ABRASIFS & CONSOMMABLES ----
  insertCat('default-ABR-001', 'ABR-001', 'Disque abrasif 125mm P80 (lot 50)', 'lot', 18.00, 10.80, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-002', 'ABR-002', 'Disque abrasif 125mm P120 (lot 50)', 'lot', 18.00, 10.80, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-003', 'ABR-003', 'Disque abrasif 125mm P180 (lot 50)', 'lot', 18.00, 10.80, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-004', 'ABR-004', 'Disque abrasif 125mm P240 (lot 50)', 'lot', 18.00, 10.80, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-005', 'ABR-005', 'Bande abrasive 75x533mm P80 (lot 10)', 'lot', 15.00, 9.00, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-006', 'ABR-006', 'Bande abrasive 75x533mm P120 (lot 10)', 'lot', 15.00, 9.00, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-007', 'ABR-007', 'Papier abrasif feuille P120 (lot 50)', 'lot', 12.00, 7.20, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-008', 'ABR-008', 'Papier abrasif feuille P240 (lot 50)', 'lot', 14.00, 8.40, 'Abrasifs', 'Klingspor')
  insertCat('default-ABR-009', 'ABR-009', 'Lame scie circulaire bois 190mm Z24', 'pce', 32.00, 19.20, 'Abrasifs', 'Festool')
  insertCat('default-ABR-010', 'ABR-010', 'Lame scie circulaire bois 260mm Z48', 'pce', 55.00, 33.00, 'Abrasifs', 'Festool')
  insertCat('default-ABR-011', 'ABR-011', 'Lame scie sauteuse bois (lot 5)', 'lot', 12.00, 7.20, 'Abrasifs', 'Festool')
  insertCat('default-ABR-012', 'ABR-012', 'Fraise défonceuse droite 8mm', 'pce', 18.00, 10.80, 'Abrasifs', 'Festool')
  insertCat('default-ABR-013', 'ABR-013', 'Fraise défonceuse droite 12mm', 'pce', 22.00, 13.20, 'Abrasifs', 'Festool')
  insertCat('default-ABR-014', 'ABR-014', 'Fraise défonceuse quart de rond 6mm', 'pce', 25.00, 15.00, 'Abrasifs', 'Festool')
  insertCat('default-ABR-015', 'ABR-015', 'Mèche à bois HSS 8mm', 'pce', 5.50, 3.30, 'Abrasifs', 'Würth')
  insertCat('default-ABR-016', 'ABR-016', 'Mèche à bois HSS 10mm', 'pce', 6.50, 3.90, 'Abrasifs', 'Würth')
  insertCat('default-ABR-017', 'ABR-017', 'Foret Forstner 35mm', 'pce', 15.00, 9.00, 'Abrasifs', 'Würth')
  insertCat('default-ABR-018', 'ABR-018', 'Scie cloche bois 68mm', 'pce', 18.00, 10.80, 'Abrasifs', 'Würth')

  // ---- PROTECTION & SÉCURITÉ CHANTIER ----
  insertCat('default-PRO-001', 'PRO-001', 'Film de protection sol (rouleau 50m²)', 'pce', 28.00, 16.80, 'Protection', 'Würth')
  insertCat('default-PRO-002', 'PRO-002', 'Ruban de masquage peintre 48mm (50m)', 'pce', 5.50, 3.30, 'Protection', 'Tesa')
  insertCat('default-PRO-003', 'PRO-003', 'Bâche plastique 4x5m', 'pce', 8.00, 4.80, 'Protection', 'Würth')
  insertCat('default-PRO-004', 'PRO-004', 'Carton de protection sol (rouleau 25m²)', 'pce', 22.00, 13.20, 'Protection', 'Würth')
  insertCat('default-PRO-005', 'PRO-005', 'Sac à gravats tissé (lot 10)', 'lot', 12.00, 7.20, 'Protection', 'Würth')

  // ---- FERRONNERIE CONSTRUCTION ----
  insertCat('default-FER-001', 'FER-001', 'Équerre d\'assemblage 90x90x65mm (lot 10)', 'lot', 18.00, 10.80, 'Ferronnerie', 'Simpson')
  insertCat('default-FER-002', 'FER-002', 'Platine d\'assemblage 100x200mm (lot 5)', 'lot', 15.00, 9.00, 'Ferronnerie', 'Simpson')
  insertCat('default-FER-003', 'FER-003', 'Étrier de poutre réglable 60-100mm', 'pce', 8.50, 5.10, 'Ferronnerie', 'Simpson')
  insertCat('default-FER-004', 'FER-004', 'Support de poteau galvanisé H-form', 'pce', 15.00, 9.00, 'Ferronnerie', 'Simpson')
  insertCat('default-FER-005', 'FER-005', 'Tige filetée M12 galvanisée (1m)', 'pce', 4.50, 2.70, 'Ferronnerie', 'Würth')
  insertCat('default-FER-006', 'FER-006', 'Tige filetée M16 galvanisée (1m)', 'pce', 7.50, 4.50, 'Ferronnerie', 'Würth')
  insertCat('default-FER-007', 'FER-007', 'Rail de coulissage aluminium (2m)', 'pce', 18.00, 10.80, 'Ferronnerie', 'Häfele')
  insertCat('default-FER-008', 'FER-008', 'Galet de roulement porte coulissante', 'pce', 12.00, 7.20, 'Ferronnerie', 'Häfele')

  // ============================================================
  // Forfaits par défaut — Packs matériaux + main d'oeuvre
  // ============================================================

  // --- Forfait 1 : Pose parquet (par m²) ---
  db.run(`INSERT OR IGNORE INTO forfaits (id, nom, description, unite_base) VALUES (?, ?, ?, ?)`,
    ['forfait-parquet', 'Pose parquet', 'Fourniture et pose de parquet chêne massif avec sous-couche et plinthes', 'm²']);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-parquet-1', 'forfait-parquet', 'default-BOIS-008', 'Parquet chêne massif 15mm', 'm²', 1.1, 78.0, 0]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-parquet-2', 'forfait-parquet', 'default-REV-001', 'Sous-couche parquet 2mm', 'm²', 1.05, 5.5, 1]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-parquet-3', 'forfait-parquet', 'default-REV-002', 'Plinthe chêne 60mm', 'm', 0.8, 8.5, 2]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-parquet-4', 'forfait-parquet', 'default-COLL-001', 'Colle à bois D3 (750g)', 'pce', 0.125, 14.0, 3]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-parquet-5', 'forfait-parquet', 'default-QUIN-001', 'Vis inox 4x40mm (boîte 200)', 'boîte', 0.05, 12.5, 4]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-parquet-6', 'forfait-parquet', 'default-MO-001', 'Menuisier qualifié', 'h', 0.5, 95.0, 5]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-parquet-7', 'forfait-parquet', 'default-MO-003', 'Aide menuisier', 'h', 0.25, 65.0, 6]);

  // --- Forfait 2 : Pose porte intérieure (par pce) ---
  db.run(`INSERT OR IGNORE INTO forfaits (id, nom, description, unite_base) VALUES (?, ?, ?, ?)`,
    ['forfait-porte', 'Pose porte intérieure', 'Fourniture et pose de porte avec quincaillerie complète', 'pce']);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-porte-1', 'forfait-porte', null, 'Porte intérieure (à définir)', 'pce', 1, 250.0, 0]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-porte-2', 'forfait-porte', 'default-QUIN-003', 'Charnière porte 100mm (paire)', 'paire', 1.5, 15.0, 1]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-porte-3', 'forfait-porte', 'default-QUIN-004', 'Poignée de porte inox', 'pce', 1, 45.0, 2]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-porte-4', 'forfait-porte', 'default-QUIN-005', 'Serrure à encastrer', 'pce', 1, 65.0, 3]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-porte-5', 'forfait-porte', 'default-MO-001', 'Menuisier qualifié', 'h', 3, 95.0, 4]);

  // --- Forfait 3 : Pose cuisine (par module) ---
  db.run(`INSERT OR IGNORE INTO forfaits (id, nom, description, unite_base) VALUES (?, ?, ?, ?)`,
    ['forfait-cuisine', 'Pose cuisine', 'Montage et installation de modules de cuisine avec quincaillerie', 'module']);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-cuisine-1', 'forfait-cuisine', 'default-BOIS-005', 'Panneau mélaminé blanc 19mm', 'm²', 2.5, 32.0, 0]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-cuisine-2', 'forfait-cuisine', 'default-QUIN-006', 'Coulisse tiroir pleine extension 500mm', 'paire', 1, 28.0, 1]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-cuisine-3', 'forfait-cuisine', 'default-QUIN-003', 'Charnière porte 100mm (paire)', 'paire', 2, 15.0, 2]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-cuisine-4', 'forfait-cuisine', 'default-QUIN-004', 'Poignée de porte inox', 'pce', 2, 45.0, 3]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-cuisine-5', 'forfait-cuisine', 'default-MO-001', 'Menuisier qualifié', 'h', 2, 95.0, 4]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-cuisine-6', 'forfait-cuisine', 'default-MO-003', 'Aide menuisier', 'h', 1, 65.0, 5]);

  // --- Forfait 4 : Habillage mural lambris (par m²) ---
  db.run(`INSERT OR IGNORE INTO forfaits (id, nom, description, unite_base) VALUES (?, ?, ?, ?)`,
    ['forfait-lambris', 'Habillage mural lambris', 'Fourniture et pose de lambris épicéa avec lattage', 'm²']);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-lambris-1', 'forfait-lambris', 'default-BOIS-009', 'Lambris épicéa 12mm', 'm²', 1.1, 24.0, 0]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-lambris-2', 'forfait-lambris', 'default-BOIS-006', 'Latte sapin 30x50mm', 'm', 2.5, 3.2, 1]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-lambris-3', 'forfait-lambris', 'default-QUIN-001', 'Vis inox 4x40mm (boîte 200)', 'boîte', 0.1, 12.5, 2]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-lambris-4', 'forfait-lambris', 'default-MO-001', 'Menuisier qualifié', 'h', 0.75, 95.0, 3]);

  // --- Forfait 5 : Fabrication meuble sur mesure (forfait) ---
  db.run(`INSERT OR IGNORE INTO forfaits (id, nom, description, unite_base) VALUES (?, ?, ?, ?)`,
    ['forfait-meuble', 'Fabrication meuble sur mesure', 'Fabrication en atelier et pose d\'un meuble sur mesure', 'pce']);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-meuble-1', 'forfait-meuble', 'default-BOIS-004', 'Panneau contreplaqué bouleau 18mm', 'm²', 4, 45.0, 0]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-meuble-2', 'forfait-meuble', 'default-QUIN-006', 'Coulisse tiroir pleine extension 500mm', 'paire', 2, 28.0, 1]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-meuble-3', 'forfait-meuble', 'default-QUIN-003', 'Charnière porte 100mm (paire)', 'paire', 3, 15.0, 2]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-meuble-4', 'forfait-meuble', 'default-COLL-002', 'Vernis polyuréthane mat (1L)', 'pce', 1, 32.0, 3]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-meuble-5', 'forfait-meuble', 'default-MO-001', 'Menuisier qualifié', 'h', 16, 95.0, 4]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-meuble-6', 'forfait-meuble', 'default-MO-002', 'Apprenti menuisier', 'h', 8, 45.0, 5]);
  db.run(`INSERT OR IGNORE INTO forfait_lignes (id, forfait_id, catalogue_item_id, designation, unite, ratio, prix_unitaire, ordre) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['fl-meuble-7', 'forfait-meuble', 'default-MO-006', 'Transport et livraison', 'forfait', 1, 120.0, 6]);
}
