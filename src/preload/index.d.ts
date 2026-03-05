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
}

interface CatalogueAPI {
  list(type?: string): Promise<CatalogueItem[]>
  get(id: string): Promise<CatalogueItem>
  create(data: Partial<CatalogueItem>): Promise<CatalogueItem>
  update(id: string, data: Partial<CatalogueItem>): Promise<CatalogueItem>
  delete(id: string): Promise<{ success: boolean }>
  search(query: string): Promise<CatalogueItem[]>
  categories(): Promise<string[]>
}

interface SettingsAPI {
  getAll(): Promise<Record<string, string>>
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<{ success: boolean }>
  setMultiple(settings: Record<string, string>): Promise<{ success: boolean }>
}

interface LicenseAPI {
  check(): Promise<{ isActive: boolean; key?: string }>
  activate(key: string): Promise<{ success: boolean; message: string }>
  deactivate(): Promise<{ success: boolean }>
}

interface BackupAPI {
  run(): Promise<{ success: boolean; path: string }>
  getPath(): Promise<string>
}

interface DashboardAPI {
  stats(): Promise<DashboardStats>
}

interface API {
  clients: ClientAPI
  devis: DevisAPI
  factures: FactureAPI
  catalogue: CatalogueAPI
  settings: SettingsAPI
  license: LicenseAPI
  backup: BackupAPI
  dashboard: DashboardAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
