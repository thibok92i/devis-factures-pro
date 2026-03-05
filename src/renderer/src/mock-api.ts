/**
 * Mock API for browser preview (when running outside Electron).
 * Returns empty/default data so the UI renders without crashing.
 * Field names match the actual TypeScript types and DB schema.
 */

const mockClients = [
  { id: 'demo-1', nom: 'Dupont', prenom: 'Pierre', entreprise: 'Menuiserie Dupont SA', email: 'contact@dupont.ch', telephone: '079 123 45 67', adresse: 'Rue du Lac 12', npa: '1000', ville: 'Lausanne', notes: '', created_at: '2025-01-15', updated_at: '2025-01-15' },
  { id: 'demo-2', nom: 'Martin', prenom: 'Jean', entreprise: '', email: 'jean.martin@gmail.com', telephone: '078 987 65 43', adresse: 'Avenue de la Gare 5', npa: '1200', ville: 'Genève', notes: 'Client fidèle', created_at: '2025-02-01', updated_at: '2025-02-01' }
]

const mockCatalogue = [
  { id: 'cat-1', reference: 'BOIS-001', designation: 'Panneau chêne massif 20mm', type: 'materiau', unite: 'm²', prix_unitaire: 85.00, categorie: 'Bois', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'cat-2', reference: 'QUIN-001', designation: 'Vis inox 4x40 (boîte 200)', type: 'materiau', unite: 'pce', prix_unitaire: 12.50, categorie: 'Quincaillerie', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'cat-3', reference: 'MO-001', designation: 'Pose menuiserie standard', type: 'main_oeuvre', unite: 'h', prix_unitaire: 95.00, categorie: 'Main d\'oeuvre', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'cat-4', reference: 'BOIS-002', designation: 'Sapin raboté 47x100mm', type: 'materiau', unite: 'm', prix_unitaire: 8.50, categorie: 'Bois de construction', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'cat-5', reference: 'BOIS-003', designation: 'Panneau MDF 19mm', type: 'materiau', unite: 'm²', prix_unitaire: 28.00, categorie: 'Panneaux', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'cat-6', reference: 'MO-002', designation: 'Montage et installation', type: 'main_oeuvre', unite: 'h', prix_unitaire: 95.00, categorie: 'Main d\'oeuvre', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'cat-7', reference: 'QUIN-002', designation: 'Charnière acier inox', type: 'materiau', unite: 'pce', prix_unitaire: 4.50, categorie: 'Quincaillerie', created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'cat-8', reference: 'ISOL-001', designation: 'Laine de roche 120mm', type: 'materiau', unite: 'm²', prix_unitaire: 22.00, categorie: 'Isolation', created_at: '2025-01-01', updated_at: '2025-01-01' }
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
      { id: 'fac-1', numero: 'F-0001', devis_id: 'dev-2', client_id: 'demo-2', client_nom: 'Martin', client_prenom: 'Jean', client_entreprise: '', date: '2025-03-01', echeance: '2025-04-01', statut: 'envoyee', sous_total: 5510, remise_pourcent: 5, remise_montant: 290, taux_tva: 8.1, montant_tva: 446.31, total: 5956.31, notes: '', created_at: '2025-03-01', updated_at: '2025-03-01' },
      { id: 'fac-2', numero: 'F-0002', devis_id: 'dev-3', client_id: 'demo-1', client_nom: 'Dupont', client_prenom: 'Pierre', client_entreprise: 'Menuiserie Dupont SA', date: '2025-02-01', echeance: '2025-03-01', statut: 'payee', sous_total: 3200, remise_pourcent: 0, remise_montant: 0, taux_tva: 8.1, montant_tva: 259.20, total: 3459.20, notes: 'Paiement reçu le 25.02.2025', created_at: '2025-02-01', updated_at: '2025-02-25' }
    ],
    get: async () => ({
      id: 'fac-1', numero: 'F-0001', devis_id: 'dev-2', client_id: 'demo-2', date: '2025-03-01', echeance: '2025-04-01', statut: 'envoyee', sous_total: 5510, remise_pourcent: 5, remise_montant: 290, taux_tva: 8.1, montant_tva: 446.31, total: 5956.31, notes: '',
      client_nom: 'Martin', client_prenom: 'Jean', client_entreprise: '',
      client_adresse: 'Avenue de la Gare 5', client_npa: '1200', client_ville: 'Genève',
      client_telephone: '078 987 65 43', client_email: 'jean.martin@gmail.com',
      lignes: [
        { id: 'fl-1', facture_id: 'fac-1', designation: 'Panneau chêne massif 20mm', unite: 'm²', quantite: 20, prix_unitaire: 85, total: 1700, ordre: 1 },
        { id: 'fl-2', facture_id: 'fac-1', designation: 'Pose menuiserie standard', unite: 'h', quantite: 40, prix_unitaire: 95, total: 3800, ordre: 2 }
      ],
      created_at: '2025-03-01', updated_at: '2025-03-01'
    }),
    create: async () => ({ success: true, id: 'new-fac', numero: 'F-0003' }),
    createFromDevis: async () => ({ success: true, id: 'new-fac', numero: 'F-0003' }),
    delete: noop,
    saveLignes: noop,
    updateStatut: noop,
    exportPdf: async () => ({ success: true, path: '/tmp/facture.pdf' })
  },
  catalogue: {
    list: async () => mockCatalogue,
    get: async (id: string) => mockCatalogue.find((c) => c.id === id) || mockCatalogue[0],
    create: async () => ({ success: true, id: 'new-cat' }),
    update: noop,
    delete: noop,
    search: async (q: string) =>
      mockCatalogue.filter((c) => c.designation.toLowerCase().includes(q.toLowerCase())),
    categories: async () => ['Bois', 'Bois de construction', 'Panneaux', 'Quincaillerie', 'Main d\'oeuvre', 'Isolation']
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
    })
  },
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
