import { ElectronAPI } from '@electron-toolkit/preload'

interface ClientAPI {
  list(): Promise<Client[]>
  get(id: string): Promise<Client>
  create(data: Partial<Client>): Promise<Client>
  update(id: string, data: Partial<Client>): Promise<Client>
  delete(id: string): Promise<{ success: boolean }>
  search(query: string): Promise<Client[]>
}

interface DevisAPI {
  list(): Promise<DevisWithClient[]>
  get(id: string): Promise<DevisDetail>
  create(data: Partial<Devis>): Promise<{ id: string; numero: string }>
  update(id: string, data: Partial<Devis>): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  saveLignes(devisId: string, lignes: Partial<DevisLigne>[]): Promise<{ success: boolean }>
  updateRemise(devisId: string, remisePourcent: number): Promise<{ success: boolean }>
  updateStatut(id: string, statut: string): Promise<{ success: boolean }>
  exportPdf(id: string): Promise<{ success: boolean; path?: string; message?: string }>
  duplicate(id: string): Promise<{ success: boolean; id: string; numero?: string }>
}

interface FactureAPI {
  list(): Promise<FactureWithClient[]>
  get(id: string): Promise<FactureDetail>
  create(data: Partial<Facture>): Promise<{ id: string; numero: string }>
  createFromDevis(devisId: string): Promise<{ id: string; numero: string }>
  delete(id: string): Promise<{ success: boolean }>
  saveLignes(factureId: string, lignes: Partial<FactureLigne>[]): Promise<{ success: boolean }>
  updateStatut(id: string, statut: string): Promise<{ success: boolean }>
  exportPdf(id: string): Promise<{ success: boolean; path?: string; message?: string }>
  exportRelance(id: string): Promise<{ success: boolean; path?: string; message?: string; error?: string }>
  checkOverdue(): Promise<{ count: number }>
  overdue(): Promise<unknown[]>
}

interface PaiementsAPI {
  list(factureId: string): Promise<Paiement[]>
  add(data: Record<string, unknown>): Promise<{ success: boolean; id?: string; montant_paye?: number; error?: string }>
  delete(id: string): Promise<{ success: boolean; montant_paye?: number; error?: string }>
}

interface CatalogueAPI {
  list(type?: string): Promise<CatalogueItem[]>
  get(id: string): Promise<CatalogueItem>
  create(data: Partial<CatalogueItem>): Promise<CatalogueItem>
  update(id: string, data: Partial<CatalogueItem>): Promise<CatalogueItem>
  delete(id: string): Promise<{ success: boolean }>
  search(query: string): Promise<CatalogueItem[]>
  categories(): Promise<string[]>
  toggleFavorite(id: string): Promise<{ success: boolean }>
}

interface SettingsAPI {
  getAll(): Promise<Record<string, string>>
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<{ success: boolean }>
  setMultiple(settings: Record<string, string>): Promise<{ success: boolean }>
}

interface LicenseAPI {
  check(): Promise<{
    isActive: boolean
    key?: string
    daysRemaining?: number
    offlineExpired?: boolean
    needsReactivation?: boolean
  }>
  activate(key: string): Promise<{ success: boolean; message: string }>
  deactivate(): Promise<{ success: boolean }>
}

interface BackupAPI {
  run(): Promise<{ success: boolean; path: string }>
  getPath(): Promise<string>
}

interface DashboardAPI {
  stats(): Promise<DashboardStats>
  monthlyRevenue(): Promise<unknown[]>
}

interface ForfaitsAPI {
  list(): Promise<Forfait[]>
  get(id: string): Promise<ForfaitDetail | null>
  calculate(id: string, quantite: number): Promise<Record<string, unknown>>
  create(data: Record<string, unknown>): Promise<{ success: boolean; id?: string }>
  update(id: string, data: Record<string, unknown>): Promise<{ success: boolean }>
  createFromDevis(devisId: string, nom: string, uniteBase: string): Promise<{ success: boolean; id?: string }>
  delete(id: string): Promise<{ success: boolean }>
}

interface RapportAPI {
  caParMois(annee: number): Promise<unknown[]>
  caParClient(annee: number): Promise<unknown[]>
  topArticles(annee: number): Promise<unknown[]>
  resume(annee: number): Promise<Record<string, unknown>>
  anneesDisponibles(): Promise<number[]>
  exportPdf(annee: number): Promise<{ success: boolean; path?: string; message?: string }>
}

interface ExportAPI {
  facturesCsv(): Promise<{ success: boolean; path?: string; count?: number }>
  catalogueImportCsv(): Promise<{ success: boolean; count?: number; error?: string }>
  catalogueExportCsv(): Promise<{ success: boolean; path?: string; count?: number; error?: string }>
}

interface TemplateAPI {
  list(): Promise<unknown[]>
  get(id: string): Promise<unknown>
  createFromDevis(devisId: string, nom: string): Promise<{ success: boolean; error?: string }>
  delete(id: string): Promise<{ success: boolean }>
}

interface UpdaterAPI {
  check(): Promise<void>
  download(): Promise<void>
  install(): Promise<void>
  onUpdate(callback: (event: string, data: unknown) => void): () => void
}

interface API {
  clients: ClientAPI
  devis: DevisAPI
  factures: FactureAPI
  paiements: PaiementsAPI
  catalogue: CatalogueAPI
  forfaits: ForfaitsAPI
  settings: SettingsAPI
  license: LicenseAPI
  backup: BackupAPI
  dashboard: DashboardAPI
  rapport: RapportAPI
  export: ExportAPI
  templates: TemplateAPI
  updater: UpdaterAPI
  onSaveError(callback: (data: { message: string }) => void): () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
