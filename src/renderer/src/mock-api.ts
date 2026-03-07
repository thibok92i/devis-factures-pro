/**
 * Mock API for browser preview (when running outside Electron).
 * Returns empty/default data so the UI renders without crashing.
 * Field names match the actual TypeScript types and DB schema.
 */

const mockClients = [
  { id: 'demo-1', nom: 'Dupont', prenom: 'Pierre', entreprise: 'Menuiserie Dupont SA', email: 'contact@dupont.ch', telephone: '079 123 45 67', adresse: 'Rue du Lac 12', npa: '1000', ville: 'Lausanne', notes: '', created_at: '2025-01-15', updated_at: '2025-01-15' },
  { id: 'demo-2', nom: 'Martin', prenom: 'Jean', entreprise: '', email: 'jean.martin@gmail.com', telephone: '078 987 65 43', adresse: 'Avenue de la Gare 5', npa: '1200', ville: 'Genève', notes: 'Client fidèle', created_at: '2025-02-01', updated_at: '2025-02-01' }
]

const d = '2025-01-01'
const m = (id: string, ref: string, des: string, unite: string, prix: number, cat: string, pa?: number, four?: string) =>
  ({ id, reference: ref, designation: des, type: 'materiau' as const, unite, prix_unitaire: prix, categorie: cat, prix_achat: pa || 0, fournisseur: four || '', created_at: d, updated_at: d })
const mo = (id: string, ref: string, des: string, unite: string, prix: number, cat: string) =>
  ({ id, reference: ref, designation: des, type: 'main_oeuvre' as const, unite, prix_unitaire: prix, categorie: cat, prix_achat: 0, fournisseur: '', created_at: d, updated_at: d })

const mockCatalogue = [
  // ── Bois massif résineux ──
  m('cat-r01', 'RES-001', 'Sapin/Épicéa raboté 27x60mm', 'm', 4.20, 'Bois massif résineux', 2.50, 'Tschopp Holz'),
  m('cat-r02', 'RES-003', 'Sapin/Épicéa raboté 27x140mm', 'm', 7.50, 'Bois massif résineux', 4.50, 'Tschopp Holz'),
  m('cat-r03', 'RES-007', 'Sapin/Épicéa raboté 47x100mm', 'm', 9.50, 'Bois massif résineux', 5.70, 'Corbat Holz'),
  m('cat-r04', 'RES-009', 'Sapin/Épicéa raboté 47x200mm', 'm', 16.50, 'Bois massif résineux', 9.90, 'Corbat Holz'),
  m('cat-r05', 'RES-011', 'Sapin brut charpente 80x160mm', 'm', 18.50, 'Bois massif résineux', 11.10, 'HG Commerciale'),
  m('cat-r06', 'RES-013', 'Sapin brut charpente 100x200mm', 'm', 28.00, 'Bois massif résineux', 16.80, 'HG Commerciale'),
  m('cat-r07', 'RES-017', 'Mélèze raboté 27x100mm', 'm', 12.50, 'Bois massif résineux', 7.50, 'Corbat Holz'),
  m('cat-r08', 'RES-020', 'Douglas raboté 27x100mm', 'm', 10.50, 'Bois massif résineux', 6.30, 'HG Commerciale'),
  m('cat-r09', 'RES-022', 'Arole/Pin cembro raboté 27x120mm', 'm', 22.00, 'Bois massif résineux', 13.20, 'Corbat Holz'),

  // ── Bois massif feuillus ──
  m('cat-f01', 'FEU-001', 'Chêne raboté 27x80mm', 'm', 14.00, 'Bois massif feuillus', 8.40, 'Corbat Holz'),
  m('cat-f02', 'FEU-005', 'Chêne avivé 54x100mm', 'm', 28.00, 'Bois massif feuillus', 16.80, 'Corbat Holz'),
  m('cat-f03', 'FEU-008', 'Hêtre raboté 27x80mm', 'm', 10.50, 'Bois massif feuillus', 6.30, 'HG Commerciale'),
  m('cat-f04', 'FEU-015', 'Frêne raboté 27x80mm', 'm', 14.50, 'Bois massif feuillus', 8.70, 'Corbat Holz'),
  m('cat-f05', 'FEU-020', 'Noyer raboté 27x100mm', 'm', 42.00, 'Bois massif feuillus', 25.20, 'Corbat Holz'),
  m('cat-f06', 'FEU-025', 'Érable raboté 27x100mm', 'm', 18.00, 'Bois massif feuillus', 10.80, 'HG Commerciale'),
  m('cat-f07', 'FEU-030', 'Merisier raboté 27x100mm', 'm', 22.00, 'Bois massif feuillus', 13.20, 'Corbat Holz'),

  // ── Panneaux ──
  m('cat-p01', 'BOIS-001', 'Panneau chêne massif 20mm', 'm²', 89.00, 'Bois massif', 53.40, 'Corbat Holz'),
  m('cat-p02', 'BOIS-002', 'Panneau sapin 3 plis 27mm', 'm²', 52.00, 'Bois massif', 31.20, 'Tschopp Holz'),
  m('cat-p03', 'BOIS-003', 'Panneau MDF 19mm', 'm²', 28.50, 'Panneaux', 17.10, 'HG Commerciale'),
  m('cat-p04', 'BOIS-004', 'Panneau contreplaqué bouleau 18mm', 'm²', 45.00, 'Panneaux', 27.00, 'Corbat Holz'),
  m('cat-p05', 'BOIS-005', 'Panneau mélaminé blanc 19mm', 'm²', 32.00, 'Panneaux', 19.20, 'HG Commerciale'),
  m('cat-p06', 'DER-001', 'Panneau OSB3 15mm', 'm²', 14.50, 'Panneaux dérivés', 8.70, 'HG Commerciale'),
  m('cat-p07', 'DER-003', 'Panneau OSB3 22mm', 'm²', 22.00, 'Panneaux dérivés', 13.20, 'HG Commerciale'),
  m('cat-p08', 'DER-007', 'Panneau particules P2 19mm', 'm²', 12.00, 'Panneaux dérivés', 7.20, 'HG Commerciale'),
  m('cat-p09', 'CPQ-003', 'Contreplaqué peuplier 15mm', 'm²', 28.00, 'Contreplaqués', 16.80, 'HG Commerciale'),
  m('cat-p10', 'CPQ-007', 'Contreplaqué okoumé marine 18mm', 'm²', 52.00, 'Contreplaqués', 31.20, 'Corbat Holz'),
  m('cat-p11', 'MEL-001', 'Mélaminé blanc 19mm (2800x2070)', 'm²', 32.00, 'Mélaminés', 19.20, 'HG Commerciale'),
  m('cat-p12', 'MEL-005', 'Mélaminé chêne naturel 19mm', 'm²', 38.00, 'Mélaminés', 22.80, 'HG Commerciale'),

  // ── Parquets & Revêtements ──
  m('cat-par1', 'PAR-001', 'Parquet chêne massif 15mm brut', 'm²', 78.00, 'Parquets', 46.80, 'Tschopp Holz'),
  m('cat-par2', 'PAR-003', 'Parquet chêne massif 22mm brut', 'm²', 110.00, 'Parquets', 66.00, 'Corbat Holz'),
  m('cat-par3', 'PAR-006', 'Parquet contrecollé chêne 15mm huilé', 'm²', 68.00, 'Parquets', 40.80, 'HG Commerciale'),
  m('cat-par4', 'REV-001', 'Sous-couche parquet 2mm', 'm²', 5.50, 'Revêtements', 3.30, 'Tschopp Holz'),
  m('cat-par5', 'REV-002', 'Plinthe chêne 60mm', 'm', 8.50, 'Revêtements', 5.10, 'Corbat Holz'),

  // ── Lambris & Bardage ──
  m('cat-l01', 'LAM-001', 'Lambris épicéa 12.5x96mm', 'm²', 24.00, 'Lambris & bardage', 14.40, 'Tschopp Holz'),
  m('cat-l02', 'LAM-004', 'Lambris chêne 10x70mm', 'm²', 65.00, 'Lambris & bardage', 39.00, 'Corbat Holz'),
  m('cat-l03', 'LAM-006', 'Bardage mélèze 21x120mm', 'm²', 52.00, 'Lambris & bardage', 31.20, 'Corbat Holz'),
  m('cat-l04', 'LAM-008', 'Bardage douglas 21x140mm', 'm²', 45.00, 'Lambris & bardage', 27.00, 'HG Commerciale'),

  // ── Terrasses ──
  m('cat-t01', 'TER-001', 'Lame terrasse mélèze 27x145mm', 'm', 14.50, 'Terrasses', 8.70, 'Corbat Holz'),
  m('cat-t02', 'TER-004', 'Lame terrasse douglas 27x145mm', 'm', 12.00, 'Terrasses', 7.20, 'HG Commerciale'),
  m('cat-t03', 'TER-007', 'Lambourde pin autoclave 45x70mm', 'm', 5.50, 'Terrasses', 3.30, 'HG Commerciale'),

  // ── Bois exotiques ──
  m('cat-e01', 'EXO-001', 'Teck raboté 27x100mm', 'm', 52.00, 'Bois exotiques', 31.20, 'Corbat Holz'),
  m('cat-e02', 'EXO-003', 'Iroko raboté 27x100mm', 'm', 35.00, 'Bois exotiques', 21.00, 'Corbat Holz'),

  // ── Portes ──
  m('cat-po1', 'POR-001', 'Porte intérieure sapin massif 73x198cm', 'pce', 280.00, 'Portes', 168.00, 'HG Commerciale'),
  m('cat-po2', 'POR-002', 'Porte intérieure alvéolaire laquée blanc', 'pce', 145.00, 'Portes', 87.00, 'HG Commerciale'),
  m('cat-po3', 'POR-004', 'Bloc-porte complet sapin (huisserie + porte)', 'pce', 450.00, 'Portes', 270.00, 'HG Commerciale'),

  // ── Plans de travail ──
  m('cat-pdt1', 'PDT-001', 'Plan de travail hêtre massif 27mm', 'm²', 95.00, 'Plans de travail', 57.00, 'HG Commerciale'),
  m('cat-pdt2', 'PDT-003', 'Plan de travail chêne massif 27mm', 'm²', 145.00, 'Plans de travail', 87.00, 'Corbat Holz'),
  m('cat-pdt3', 'PDT-006', 'Plan de travail stratifié 38mm', 'm²', 55.00, 'Plans de travail', 33.00, 'HG Commerciale'),

  // ── Isolation ──
  m('cat-i01', 'ISO-001', 'Laine de verre 100mm (rouleau)', 'm²', 12.00, 'Isolation', 7.20, 'Isover'),
  m('cat-i02', 'ISO-003', 'Laine de verre 200mm (rouleau)', 'm²', 22.00, 'Isolation', 13.20, 'Isover'),
  m('cat-i03', 'ISO-006', 'Laine de roche 120mm (panneau)', 'm²', 24.00, 'Isolation', 14.40, 'Flumroc'),
  m('cat-i04', 'ISO-008', 'Fibre de bois souple 60mm', 'm²', 16.50, 'Isolation', 9.90, 'Pavatex'),
  m('cat-i05', 'ISO-010', 'Fibre de bois souple 140mm', 'm²', 32.00, 'Isolation', 19.20, 'Pavatex'),
  m('cat-i06', 'ISO-014', 'Polystyrène expansé EPS 60mm', 'm²', 8.50, 'Isolation', 5.10, 'Swisspor'),
  m('cat-i07', 'ISO-018', 'Isolation chanvre 100mm', 'm²', 28.00, 'Isolation', 16.80, 'Thermo-Hanf'),
  m('cat-i08', 'ISO-020', 'Pare-vapeur polyéthylène 0.2mm', 'm²', 2.80, 'Isolation', 1.68, 'Isover'),
  m('cat-i09', 'ISO-021', 'Frein-vapeur Intello Plus', 'm²', 4.50, 'Isolation', 2.70, 'ProClima'),
  m('cat-i10', 'ISO-024', 'Isolation acoustique (résilient) 5mm', 'm²', 6.50, 'Isolation', 3.90, 'Isover'),

  // ── Visserie & Fixations ──
  m('cat-v01', 'VIS-001', 'Vis bois aggloméré 3.5x30mm (boîte 500)', 'boîte', 12.00, 'Visserie', 7.20, 'Würth'),
  m('cat-v02', 'VIS-003', 'Vis bois aggloméré 4x50mm (boîte 500)', 'boîte', 16.00, 'Visserie', 9.60, 'Würth'),
  m('cat-v03', 'VIS-005', 'Vis bois aggloméré 5x70mm (boîte 200)', 'boîte', 15.00, 'Visserie', 9.00, 'Würth'),
  m('cat-v04', 'VIS-008', 'Vis inox A2 4x40mm (boîte 200)', 'boîte', 18.00, 'Visserie', 10.80, 'Würth'),
  m('cat-v05', 'VIS-010', 'Vis inox A2 5x60mm (boîte 200)', 'boîte', 24.00, 'Visserie', 14.40, 'Würth'),
  m('cat-v06', 'VIS-012', 'Vis terrasse inox 5x50mm (boîte 200)', 'boîte', 32.00, 'Visserie', 19.20, 'Spax'),
  m('cat-v07', 'VIS-014', 'Vis charpente 8x100mm (boîte 50)', 'boîte', 18.00, 'Visserie', 10.80, 'Würth'),
  m('cat-v08', 'VIS-016', 'Vis charpente 8x200mm (boîte 50)', 'boîte', 32.00, 'Visserie', 19.20, 'Würth'),
  m('cat-v09', 'VIS-017', 'Vis à tête fraisée Torx 4x40mm (boîte 500)', 'boîte', 15.00, 'Visserie', 9.00, 'Spax'),
  m('cat-v10', 'VIS-019', 'Pointe lisse 2.8x65mm (1kg)', 'kg', 8.50, 'Visserie', 5.10, 'Würth'),
  m('cat-v11', 'VIS-021', 'Clous finition sans tête 1.4x30mm (boîte 5000)', 'boîte', 22.00, 'Visserie', 13.20, 'Würth'),
  m('cat-v12', 'VIS-025', 'Cheville nylon 8mm (boîte 100)', 'boîte', 8.00, 'Visserie', 4.80, 'Fischer'),
  m('cat-v13', 'VIS-027', 'Cheville métal à expansion M8 (boîte 50)', 'boîte', 22.00, 'Visserie', 13.20, 'Fischer'),

  // ── Mousse & Étanchéité ──
  m('cat-m01', 'MOU-001', 'Mousse PU expansive (750ml)', 'pce', 12.50, 'Étanchéité', 7.50, 'Sika'),
  m('cat-m02', 'MOU-002', 'Mousse PU coupe-feu (750ml)', 'pce', 18.00, 'Étanchéité', 10.80, 'Würth'),
  m('cat-m03', 'MOU-003', 'Mousse PU pistolable (750ml)', 'pce', 14.50, 'Étanchéité', 8.70, 'Sika'),
  m('cat-m04', 'MOU-006', 'Silicone sanitaire transparent (310ml)', 'pce', 9.50, 'Étanchéité', 5.70, 'Sika'),
  m('cat-m05', 'MOU-008', 'Mastic acrylique blanc (310ml)', 'pce', 6.50, 'Étanchéité', 3.90, 'Sika'),
  m('cat-m06', 'MOU-009', 'Mastic polyuréthane noir (310ml)', 'pce', 12.00, 'Étanchéité', 7.20, 'Sikaflex'),
  m('cat-m07', 'MOU-011', 'Joint mousse compressible (rouleau 10m)', 'pce', 8.50, 'Étanchéité', 5.10, 'Würth'),
  m('cat-m08', 'MOU-013', 'Bande d\'étanchéité EPDM 50mm (10m)', 'pce', 18.00, 'Étanchéité', 10.80, 'ProClima'),

  // ── Quincaillerie ──
  m('cat-q01', 'QUI-002', 'Charnière invisible 35mm (Blum)', 'pce', 4.80, 'Quincaillerie', 2.88, 'Blum'),
  m('cat-q02', 'QUI-003', 'Charnière invisible 35mm avec frein', 'pce', 7.50, 'Quincaillerie', 4.50, 'Blum'),
  m('cat-q03', 'QUI-005', 'Coulisse tiroir 400mm pleine extension', 'paire', 25.00, 'Quincaillerie', 15.00, 'Blum'),
  m('cat-q04', 'QUI-006', 'Coulisse tiroir 500mm pleine extension', 'paire', 28.00, 'Quincaillerie', 16.80, 'Blum'),
  m('cat-q05', 'QUI-008', 'Amortisseur de porte Blumotion', 'pce', 6.50, 'Quincaillerie', 3.90, 'Blum'),
  m('cat-q06', 'QUI-011', 'Poignée barre inox 128mm', 'pce', 12.00, 'Quincaillerie', 7.20, 'Häfele'),
  m('cat-q07', 'QUI-014', 'Serrure à cylindre pour meuble', 'pce', 12.00, 'Quincaillerie', 7.20, 'Häfele'),
  m('cat-q08', 'QUI-015', 'Pied de meuble réglable H100mm', 'pce', 3.50, 'Quincaillerie', 2.10, 'Häfele'),
  m('cat-q09', 'QUI-020', 'Domino Festool 8x40mm (boîte 130)', 'boîte', 35.00, 'Quincaillerie', 21.00, 'Festool'),
  m('cat-q10', 'QUI-022', 'Lamelle bois N°20 (boîte 1000)', 'boîte', 28.00, 'Quincaillerie', 16.80, 'Würth'),
  m('cat-q11', 'QUIN-003', 'Charnière porte 100mm (paire)', 'paire', 15.00, 'Quincaillerie', 9.00, 'Häfele'),
  m('cat-q12', 'QUIN-004', 'Poignée de porte inox', 'pce', 45.00, 'Quincaillerie', 27.00, 'Häfele'),
  m('cat-q13', 'QUIN-005', 'Serrure à encastrer', 'pce', 65.00, 'Quincaillerie', 39.00, 'Häfele'),

  // ── Colles & Finitions ──
  m('cat-c01', 'COL-001', 'Colle à bois PVAc D3 (750g)', 'pce', 14.00, 'Colles & finitions', 8.40, 'Würth'),
  m('cat-c02', 'COL-003', 'Colle PU bois (500g)', 'pce', 22.00, 'Colles & finitions', 13.20, 'Sika'),
  m('cat-c03', 'COL-005', 'Colle parquet élastique (14kg)', 'seau', 85.00, 'Colles & finitions', 51.00, 'Bona'),
  m('cat-c04', 'COL-006', 'Vernis polyuréthane mat (1L)', 'pce', 32.00, 'Colles & finitions', 19.20, 'Livos'),
  m('cat-c05', 'COL-008', 'Huile dure naturelle (1L)', 'pce', 38.00, 'Colles & finitions', 22.80, 'Livos'),
  m('cat-c06', 'COL-011', 'Lasure bois extérieur (2.5L)', 'pce', 55.00, 'Colles & finitions', 33.00, 'Sigma'),

  // ── Abrasifs & Consommables ──
  m('cat-a01', 'ABR-001', 'Disque abrasif 125mm P80 (lot 50)', 'lot', 18.00, 'Abrasifs', 10.80, 'Klingspor'),
  m('cat-a02', 'ABR-003', 'Disque abrasif 125mm P180 (lot 50)', 'lot', 18.00, 'Abrasifs', 10.80, 'Klingspor'),
  m('cat-a03', 'ABR-009', 'Lame scie circulaire bois 190mm Z24', 'pce', 32.00, 'Abrasifs', 19.20, 'Festool'),
  m('cat-a04', 'ABR-012', 'Fraise défonceuse droite 8mm', 'pce', 18.00, 'Abrasifs', 10.80, 'Festool'),
  m('cat-a05', 'ABR-017', 'Foret Forstner 35mm', 'pce', 15.00, 'Abrasifs', 9.00, 'Würth'),

  // ── Ferronnerie ──
  m('cat-fer1', 'FER-001', 'Équerre d\'assemblage 90x90x65mm (lot 10)', 'lot', 18.00, 'Ferronnerie', 10.80, 'Simpson'),
  m('cat-fer2', 'FER-003', 'Étrier de poutre réglable 60-100mm', 'pce', 8.50, 'Ferronnerie', 5.10, 'Simpson'),
  m('cat-fer3', 'FER-004', 'Support de poteau galvanisé H-form', 'pce', 15.00, 'Ferronnerie', 9.00, 'Simpson'),
  m('cat-fer4', 'FER-007', 'Rail de coulissage aluminium (2m)', 'pce', 18.00, 'Ferronnerie', 10.80, 'Häfele'),

  // ── Protection ──
  m('cat-pr1', 'PRO-001', 'Film de protection sol (rouleau 50m²)', 'pce', 28.00, 'Protection', 16.80, 'Würth'),
  m('cat-pr2', 'PRO-002', 'Ruban de masquage peintre 48mm (50m)', 'pce', 5.50, 'Protection', 3.30, 'Tesa'),

  // ── Lattage & Tasseaux ──
  m('cat-lat1', 'LAT-001', 'Latte sapin 27x48mm', 'm', 2.20, 'Lattage', 1.32, 'Tschopp Holz'),
  m('cat-lat2', 'LAT-003', 'Tasseau sapin 40x50mm', 'm', 3.80, 'Lattage', 2.28, 'Tschopp Holz'),
  m('cat-lat3', 'LAT-005', 'Contre-latte sapin 27x60mm', 'm', 2.80, 'Lattage', 1.68, 'Tschopp Holz'),

  // ── Lamellé-collé ──
  m('cat-lc1', 'LCO-001', 'Poutre lamellé-collé GL24 80x160mm', 'm', 22.00, 'Lamellé-collé', 13.20, 'HG Commerciale'),
  m('cat-lc2', 'LCO-005', 'Poutre lamellé-collé GL24 120x240mm', 'm', 52.00, 'Lamellé-collé', 31.20, 'HG Commerciale'),
  m('cat-lc3', 'LCO-009', 'KVH sapin 60x120mm', 'm', 12.50, 'Lamellé-collé', 7.50, 'HG Commerciale'),

  // ── Escalier ──
  m('cat-es1', 'ESC-001', 'Marche chêne massif 40mm brute', 'pce', 95.00, 'Escalier', 57.00, 'Corbat Holz'),
  m('cat-es2', 'ESC-004', 'Contremarche chêne 20mm', 'pce', 42.00, 'Escalier', 25.20, 'Corbat Holz'),

  // ── Moulures & Profils ──
  m('cat-mo1', 'MOL-001', 'Plinthe sapin 12x60mm', 'm', 3.50, 'Moulures', 2.10, 'Tschopp Holz'),
  m('cat-mo2', 'MOL-005', 'Quart de rond sapin 15x15mm', 'm', 2.20, 'Moulures', 1.32, 'Tschopp Holz'),
  m('cat-mo3', 'MOL-009', 'Plinthe chêne 15x80mm', 'm', 12.00, 'Moulures', 7.20, 'Corbat Holz'),

  // ── Main d'oeuvre ──
  mo('cat-mo-1', 'MO-001', 'Menuisier qualifié', 'h', 95.00, 'Main d\'oeuvre'),
  mo('cat-mo-2', 'MO-002', 'Apprenti menuisier', 'h', 45.00, 'Main d\'oeuvre'),
  mo('cat-mo-3', 'MO-003', 'Aide menuisier', 'h', 65.00, 'Main d\'oeuvre'),
  mo('cat-mo-4', 'MO-004', 'Pose sur chantier', 'h', 95.00, 'Main d\'oeuvre'),
  mo('cat-mo-5', 'MO-005', 'Démontage / dépose', 'h', 85.00, 'Main d\'oeuvre'),
  mo('cat-mo-6', 'MO-006', 'Transport et livraison', 'forfait', 120.00, 'Transport'),
  mo('cat-mo-7', 'MO-009', 'Conception et plans', 'h', 110.00, 'Prestations'),
  mo('cat-mo-8', 'MO-010', 'Nettoyage fin de chantier', 'forfait', 200.00, 'Prestations'),
]

const noop = async () => ({ success: true })

export const mockApi = {
  clients: {
    list: async () => mockClients,
    get: async (id: string) => mockClients.find((c) => c.id === id) || mockClients[0],
    create: async () => ({ success: true, id: 'new-' + Date.now() }),
    update: noop,
    delete: noop,
    search: async (q: string) =>
      mockClients.filter((c) => (c.nom + c.prenom + c.entreprise).toLowerCase().includes(q.toLowerCase()))
  },
  devis: {
    list: async () => [
      { id: 'dev-1', numero: 'D-0001', client_id: 'demo-1', client_nom: 'Dupont', client_prenom: 'Pierre', client_entreprise: 'Menuiserie Dupont SA', date: '2025-02-10', validite: '2025-03-10', statut: 'brouillon', sous_total: 2500, remise_pourcent: 0, remise_montant: 0, taux_tva: 8.1, montant_tva: 202.50, total: 2702.50, notes: '', created_at: '2025-02-10', updated_at: '2025-02-10' },
      { id: 'dev-2', numero: 'D-0002', client_id: 'demo-2', client_nom: 'Martin', client_prenom: 'Jean', client_entreprise: '', date: '2025-02-15', validite: '2025-03-15', statut: 'envoye', sous_total: 5800, remise_pourcent: 5, remise_montant: 290, taux_tva: 8.1, montant_tva: 446.31, total: 5956.31, notes: '', created_at: '2025-02-15', updated_at: '2025-02-15' },
      { id: 'dev-3', numero: 'D-0003', client_id: 'demo-1', client_nom: 'Dupont', client_prenom: 'Pierre', client_entreprise: 'Menuiserie Dupont SA', date: '2025-03-01', validite: '2025-03-31', statut: 'accepte', sous_total: 3200, remise_pourcent: 0, remise_montant: 0, taux_tva: 8.1, montant_tva: 259.20, total: 3459.20, notes: 'Cuisine sur mesure', created_at: '2025-03-01', updated_at: '2025-03-05' }
    ],
    get: async () => ({
      id: 'dev-1', numero: 'D-0001', client_id: 'demo-1', date: '2025-02-10', validite: '2025-03-10', statut: 'brouillon', sous_total: 2460, remise_pourcent: 0, remise_montant: 0, taux_tva: 8.1, montant_tva: 199.26, total: 2659.26, notes: '',
      client_nom: 'Dupont', client_prenom: 'Pierre', client_entreprise: 'Menuiserie Dupont SA',
      client_adresse: 'Rue du Lac 12', client_npa: '1000', client_ville: 'Lausanne',
      client_telephone: '079 123 45 67', client_email: 'contact@dupont.ch',
      lignes: [
        { id: 'l-1', devis_id: 'dev-1', designation: 'Panneau chêne massif 20mm', unite: 'm²', quantite: 20, prix_unitaire: 85, total: 1700, ordre: 1 },
        { id: 'l-2', devis_id: 'dev-1', designation: 'Pose menuiserie standard', unite: 'h', quantite: 8, prix_unitaire: 95, total: 760, ordre: 2 }
      ],
      created_at: '2025-02-10', updated_at: '2025-02-10'
    }),
    create: async () => ({ success: true, id: 'new-dev', numero: 'D-0004' }),
    update: noop,
    delete: noop,
    duplicate: async (id: string) => ({ success: true, id: 'dup-' + Date.now(), numero: 'D-0004' }),
    saveLignes: noop,
    updateRemise: noop,
    updateNotes: noop,
    updateStatut: noop,
    exportPdf: async () => ({ success: true, path: '/tmp/devis.pdf' })
  },
  factures: {
    list: async () => [
      { id: 'fac-1', numero: 'F-0001', devis_id: 'dev-2', client_id: 'demo-2', client_nom: 'Martin', client_prenom: 'Jean', client_entreprise: '', date: '2025-03-01', echeance: '2025-04-01', statut: 'envoyee', sous_total: 5510, remise_pourcent: 5, remise_montant: 290, taux_tva: 8.1, montant_tva: 446.31, total: 5956.31, montant_paye: 2000, notes: '', created_at: '2025-03-01', updated_at: '2025-03-01' },
      { id: 'fac-2', numero: 'F-0002', devis_id: 'dev-3', client_id: 'demo-1', client_nom: 'Dupont', client_prenom: 'Pierre', client_entreprise: 'Menuiserie Dupont SA', date: '2025-02-01', echeance: '2025-03-01', statut: 'payee', sous_total: 3200, remise_pourcent: 0, remise_montant: 0, taux_tva: 8.1, montant_tva: 259.20, total: 3459.20, montant_paye: 3459.20, notes: 'Paiement reçu le 25.02.2025', created_at: '2025-02-01', updated_at: '2025-02-25' }
    ],
    get: async () => ({
      id: 'fac-1', numero: 'F-0001', devis_id: 'dev-2', client_id: 'demo-2', date: '2025-03-01', echeance: '2025-04-01', statut: 'envoyee', sous_total: 5510, remise_pourcent: 5, remise_montant: 290, taux_tva: 8.1, montant_tva: 446.31, total: 5956.31, montant_paye: 2000, notes: '',
      client_nom: 'Martin', client_prenom: 'Jean', client_entreprise: '',
      client_adresse: 'Avenue de la Gare 5', client_npa: '1200', client_ville: 'Genève',
      client_telephone: '078 987 65 43', client_email: 'jean.martin@gmail.com',
      lignes: [
        { id: 'fl-1', facture_id: 'fac-1', designation: 'Panneau chêne massif 20mm', unite: 'm²', quantite: 20, prix_unitaire: 85, total: 1700, ordre: 1 },
        { id: 'fl-2', facture_id: 'fac-1', designation: 'Pose menuiserie standard', unite: 'h', quantite: 40, prix_unitaire: 95, total: 3800, ordre: 2 }
      ],
      paiements: [
        { id: 'pai-1', facture_id: 'fac-1', montant: 2000, date: '2025-03-10', methode: 'virement', notes: 'Acompte', created_at: '2025-03-10' }
      ],
      created_at: '2025-03-01', updated_at: '2025-03-01'
    }),
    create: async () => ({ success: true, id: 'new-fac', numero: 'F-0003' }),
    createFromDevis: async () => ({ success: true, id: 'new-fac', numero: 'F-0003' }),
    delete: noop,
    saveLignes: noop,
    updateStatut: noop,
    exportPdf: async () => ({ success: true, path: '/tmp/facture.pdf' }),
    exportRelance: async () => ({ success: true, path: '/tmp/relance.pdf' }),
    checkOverdue: async () => ({ count: 0 }),
    overdue: async () => []
  },
  paiements: {
    list: async () => [],
    add: async () => ({ success: true, id: 'new-pai', montant_paye: 0 }),
    delete: async () => ({ success: true, montant_paye: 0 })
  },
  forfaits: {
    list: async () => [
      { id: 'for-1', nom: 'Pose parquet', description: 'Pack complet pose parquet', unite_base: 'm²', ligne_count: 3, created_at: '2025-01-15', updated_at: '2025-01-15' },
      { id: 'for-2', nom: 'Cuisine sur mesure', description: '', unite_base: 'module', ligne_count: 5, created_at: '2025-02-01', updated_at: '2025-02-01' }
    ],
    get: async () => ({
      id: 'for-1', nom: 'Pose parquet', description: 'Pack complet pose parquet', unite_base: 'm²',
      lignes: [
        { id: 'fl-1', forfait_id: 'for-1', catalogue_item_id: 'cat-1', designation: 'Panneau chêne massif 20mm', description: '', unite: 'm²', ratio: 1.1, prix_unitaire: 85, ordre: 0 },
        { id: 'fl-2', forfait_id: 'for-1', catalogue_item_id: null, designation: 'Sous-couche isolante', description: '', unite: 'm²', ratio: 1, prix_unitaire: 12, ordre: 1 },
        { id: 'fl-3', forfait_id: 'for-1', catalogue_item_id: 'cat-3', designation: 'Pose menuiserie standard', description: '', unite: 'h', ratio: 0.5, prix_unitaire: 95, ordre: 2 }
      ],
      created_at: '2025-01-15', updated_at: '2025-01-15'
    }),
    calculate: async () => ({ total: 150.50, lignes: [] }),
    create: async () => ({ success: true, id: 'new-for' }),
    update: noop,
    createFromDevis: async () => ({ success: true, id: 'new-for' }),
    delete: noop
  },
  catalogue: {
    list: async () => mockCatalogue,
    get: async (id: string) => mockCatalogue.find((c) => c.id === id) || mockCatalogue[0],
    create: async () => ({ success: true, id: 'new-cat' }),
    update: noop,
    delete: noop,
    search: async (q: string) =>
      mockCatalogue.filter((c) => c.designation.toLowerCase().includes(q.toLowerCase())),
    categories: async () => ['Bois massif résineux', 'Bois massif feuillus', 'Bois massif', 'Panneaux', 'Panneaux dérivés', 'Contreplaqués', 'Mélaminés', 'Parquets', 'Revêtements', 'Lambris & bardage', 'Terrasses', 'Bois exotiques', 'Portes', 'Plans de travail', 'Isolation', 'Visserie', 'Étanchéité', 'Quincaillerie', 'Colles & finitions', 'Abrasifs', 'Ferronnerie', 'Protection', 'Lattage', 'Lamellé-collé', 'Escalier', 'Moulures', 'Main d\'oeuvre', 'Transport', 'Prestations'],
    toggleFavorite: noop
  },
  settings: {
    getAll: async () => ({
      entreprise_nom: 'Menuiserie Demo',
      entreprise_adresse: 'Rue du Bois 1',
      entreprise_npa: '1000',
      entreprise_ville: 'Lausanne',
      entreprise_telephone: '021 123 45 67',
      entreprise_email: 'info@menuiserie-demo.ch',
      entreprise_site_web: '',
      entreprise_logo: '',
      entreprise_iban: 'CH93 0076 2011 6238 5295 7',
      entreprise_banque: 'Banque Cantonale Vaudoise',
      entreprise_numero_tva: 'CHE-123.456.789 TVA',
      tva_taux: '8.1',
      devise: 'CHF',
      delai_validite_devis: '30',
      delai_paiement_facture: '30',
      conditions_devis: 'Devis valable 30 jours. Les prix s\'entendent TVA 8.1% incluse.',
      conditions_facture: 'Payable sous 30 jours net. En cas de retard, un intérêt de 5% sera appliqué.',
      conditions_paiement: '30 jours net',
      mentions_devis: 'Devis valable 30 jours',
      mentions_facture: 'Payable sous 30 jours'
    }),
    get: async (key: string) => {
      const all = await mockApi.settings.getAll()
      return (all as Record<string, string>)[key] ?? null
    },
    set: noop,
    setMultiple: noop
  },
  license: {
    check: async () => ({ isActive: true, key: '****-****-****-DEMO' }),
    activate: async () => ({ success: true, message: 'Licence activée (demo)' }),
    deactivate: noop
  },
  backup: {
    run: async () => ({ success: true, path: '/tmp/backup.db' }),
    getPath: async () => 'C:\\Users\\Demo\\Documents\\DevisPro\\Sauvegardes'
  },
  dashboard: {
    stats: async () => ({
      totalClients: 2,
      devisStats: [
        { statut: 'brouillon', count: 1, total: 2702.50 },
        { statut: 'envoye', count: 1, total: 5956.31 },
        { statut: 'accepte', count: 1, total: 3459.20 }
      ],
      factureStats: [
        { statut: 'envoyee', count: 1, total: 5956.31 },
        { statut: 'payee', count: 1, total: 3459.20 }
      ],
      chiffreAffaires: 3459.20,
      enAttente: 5956.31
    }),
    monthlyRevenue: async () => []
  },
  rapport: {
    caParMois: async (annee: number) => {
      const base = [4200, 6100, 3800, 7500, 8200, 5500, 3200, 2800, 6900, 9200, 7800, 4500]
      const factor = annee === 2025 ? 0.8 : annee === 2026 ? 1 : annee > 2026 ? 0 : 0.6
      return base.map((v, i) => ({
        mois: `${annee}-${String(i + 1).padStart(2, '0')}`,
        encaisse: Math.round(v * factor),
        facture: Math.round(v * factor * 1.3),
        nb_factures: factor > 0 ? Math.max(1, Math.round((i % 4 + 2) * factor)) : 0
      }))
    },
    caParClient: async (annee: number) => {
      const factor = annee === 2025 ? 0.8 : annee === 2026 ? 1 : annee > 2026 ? 0 : 0.6
      if (factor === 0) return []
      return [
        { id: 'demo-1', client_nom: 'Dupont', client_prenom: 'Pierre', client_entreprise: 'Menuiserie Dupont SA', encaisse: Math.round(18500 * factor), total_facture: Math.round(24200 * factor), nb_factures: Math.round(8 * factor) },
        { id: 'demo-2', client_nom: 'Martin', client_prenom: 'Jean', client_entreprise: '', encaisse: Math.round(12800 * factor), total_facture: Math.round(15600 * factor), nb_factures: Math.round(6 * factor) },
        { id: 'demo-3', client_nom: 'Favre', client_prenom: 'Marie', client_entreprise: 'Atelier Favre', encaisse: Math.round(9200 * factor), total_facture: Math.round(11800 * factor), nb_factures: Math.round(5 * factor) },
        { id: 'demo-4', client_nom: 'Roux', client_prenom: 'Claude', client_entreprise: 'Construction Roux SA', encaisse: Math.round(7400 * factor), total_facture: Math.round(9500 * factor), nb_factures: Math.round(4 * factor) },
        { id: 'demo-5', client_nom: 'Bernard', client_prenom: 'Luc', client_entreprise: '', encaisse: Math.round(5800 * factor), total_facture: Math.round(7200 * factor), nb_factures: Math.round(3 * factor) }
      ]
    },
    topArticles: async (annee: number) => {
      const factor = annee === 2025 ? 0.8 : annee === 2026 ? 1 : annee > 2026 ? 0 : 0.6
      if (factor === 0) return []
      return [
        { designation: 'Panneau chêne massif 20mm', unite: 'm²', total_quantite: +(145.5 * factor).toFixed(1), prix_moyen: 85, total_ca: Math.round(12367.5 * factor), nb_factures: Math.round(12 * factor) },
        { designation: 'Pose menuiserie standard', unite: 'h', total_quantite: Math.round(280 * factor), prix_moyen: 95, total_ca: Math.round(26600 * factor), nb_factures: Math.round(18 * factor) },
        { designation: 'Sapin raboté 47x100mm', unite: 'm', total_quantite: Math.round(320 * factor), prix_moyen: 8.50, total_ca: Math.round(2720 * factor), nb_factures: Math.round(8 * factor) },
        { designation: 'Panneau MDF 19mm', unite: 'm²', total_quantite: Math.round(88 * factor), prix_moyen: 28, total_ca: Math.round(2464 * factor), nb_factures: Math.round(6 * factor) },
        { designation: 'Montage et installation', unite: 'h', total_quantite: Math.round(195 * factor), prix_moyen: 95, total_ca: Math.round(18525 * factor), nb_factures: Math.round(14 * factor) },
        { designation: 'Vis inox 4x40 (boîte 200)', unite: 'pce', total_quantite: Math.round(45 * factor), prix_moyen: 12.50, total_ca: Math.round(562.5 * factor), nb_factures: Math.round(10 * factor) },
        { designation: 'Laine de roche 120mm', unite: 'm²', total_quantite: Math.round(65 * factor), prix_moyen: 22, total_ca: Math.round(1430 * factor), nb_factures: Math.round(4 * factor) },
        { designation: 'Charnière acier inox', unite: 'pce', total_quantite: Math.round(120 * factor), prix_moyen: 4.50, total_ca: Math.round(540 * factor), nb_factures: Math.round(7 * factor) }
      ]
    },
    resume: async (annee: number) => {
      const factor = annee === 2025 ? 0.8 : annee === 2026 ? 1 : annee > 2026 ? 0 : 0.6
      return {
        ca: Math.round(69700 * factor),
        totalFacture: Math.round(87200 * factor),
        nbFactures: Math.round(48 * factor),
        nbDevis: Math.round(62 * factor),
        nbClients: Math.round(12 * factor),
        enAttente: Math.round(17500 * factor),
        tauxConversion: factor > 0 ? 77 : 0,
        caPrev: annee === 2026 ? 58200 : annee === 2025 ? 42000 : 0
      }
    },
    exportPdf: async () => ({ success: true, path: '/tmp/rapport.pdf' }),
    anneesDisponibles: async () => [2026, 2025]
  },
  export: {
    csv: async () => ({ success: true, path: '/tmp/export.csv' }),
    catalogueImportCsv: async () => ({ success: true, count: 0 }),
    catalogueExportCsv: async () => ({ success: true })
  },
  templates: {
    list: async () => [],
    get: async () => null,
    save: noop,
    delete: noop,
    createFromDevis: async () => ({ success: true })
  },
  onSaveError: (_callback: (error: string) => void) => () => {},
  updater: {
    check: async () => {},
    download: async () => {},
    install: async () => {},
    onUpdate: (_callback: (event: string, data: unknown) => void) => {
      // No-op in browser preview — updates only work in Electron
      return () => {}
    }
  }
}
