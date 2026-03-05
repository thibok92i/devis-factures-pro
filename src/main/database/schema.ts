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

    -- Licence (with anti-tampering checksum)
    CREATE TABLE IF NOT EXISTS licence (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      key TEXT,
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

  // --- Catalogue par défaut : Matériaux ---
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
}
