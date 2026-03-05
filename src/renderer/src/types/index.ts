// ============================================================
// Types principaux pour l'application DevisPro
// ============================================================

export interface Client {
  id: string
  nom: string
  prenom?: string
  entreprise?: string
  adresse: string
  npa: string
  ville: string
  telephone?: string
  email?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CatalogueItem {
  id: string
  type: 'materiau' | 'main_oeuvre'
  reference: string
  designation: string
  unite: string
  prix_unitaire: number
  categorie?: string
  is_favorite?: number
  created_at: string
  updated_at: string
}

export interface Devis {
  id: string
  numero: string
  client_id: string
  date: string
  validite: string
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse'
  sous_total: number
  taux_tva: number
  montant_tva: number
  total: number
  remise_pourcent: number
  remise_montant: number
  notes?: string
  conditions?: string
  created_at: string
  updated_at: string
}

export interface DevisWithClient extends Devis {
  client_nom: string
  client_prenom?: string
  client_entreprise?: string
}

export interface DevisLigne {
  id: string
  devis_id: string
  catalogue_item_id?: string
  designation: string
  description?: string
  unite: string
  quantite: number
  prix_unitaire: number
  total: number
  ordre: number
}

export interface DevisDetail extends DevisWithClient {
  client_adresse: string
  client_npa: string
  client_ville: string
  client_telephone?: string
  client_email?: string
  lignes: DevisLigne[]
}

export interface Facture {
  id: string
  numero: string
  devis_id?: string
  client_id: string
  date: string
  echeance: string
  statut: 'brouillon' | 'envoyee' | 'payee' | 'en_retard'
  sous_total: number
  taux_tva: number
  montant_tva: number
  total: number
  remise_pourcent: number
  remise_montant: number
  notes?: string
  conditions?: string
  date_paiement?: string
  created_at: string
  updated_at: string
}

export interface FactureWithClient extends Facture {
  client_nom: string
  client_prenom?: string
  client_entreprise?: string
}

export interface FactureLigne {
  id: string
  facture_id: string
  catalogue_item_id?: string
  designation: string
  description?: string
  unite: string
  quantite: number
  prix_unitaire: number
  total: number
  ordre: number
}

export interface FactureDetail extends FactureWithClient {
  client_adresse: string
  client_npa: string
  client_ville: string
  client_telephone?: string
  client_email?: string
  lignes: FactureLigne[]
}

export interface DashboardStats {
  totalClients: number
  devisStats: Array<{ statut: string; count: number; total: number }>
  factureStats: Array<{ statut: string; count: number; total: number }>
  chiffreAffaires: number
  enAttente: number
}

// ============================================================
// Forfaits (packs matériaux + main d'oeuvre)
// ============================================================

export interface Forfait {
  id: string
  nom: string
  description?: string
  unite_base: string
  ligne_count?: number
  created_at: string
  updated_at: string
}

export interface ForfaitLigne {
  id: string
  forfait_id: string
  catalogue_item_id?: string
  designation: string
  description?: string
  unite: string
  ratio: number
  prix_unitaire: number
  ordre: number
  catalogue_type?: string
}

export interface ForfaitDetail extends Forfait {
  lignes: ForfaitLigne[]
}

export interface ForfaitCalculated {
  catalogue_item_id: string | null
  designation: string
  description: string
  unite: string
  quantite: number
  prix_unitaire: number
  total: number
}

// ============================================================
// Templates de devis
// ============================================================

export interface DevisTemplate {
  id: string
  nom: string
  description?: string
  ligne_count?: number
  created_at: string
}

export interface DevisTemplateLigne {
  id: string
  template_id: string
  catalogue_item_id?: string
  designation: string
  description?: string
  unite: string
  quantite: number
  prix_unitaire: number
  ordre: number
}

export interface DevisTemplateDetail extends DevisTemplate {
  lignes: DevisTemplateLigne[]
}

export type DevisStatut = Devis['statut']
export type FactureStatut = Facture['statut']
