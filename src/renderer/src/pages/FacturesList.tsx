import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trash2, Download, CheckCircle, Receipt, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useApiData, useApiCall } from '../hooks/useApi'
import { formatCHF, formatDate, clientDisplayName, factureStatutLabel, factureStatutColor } from '../utils/format'
import type { FactureWithClient } from '../types'

const statusFilters = [
  { value: 'all', label: 'Toutes' },
  { value: 'brouillon', label: 'Brouillons' },
  { value: 'envoyee', label: 'Envoyées' },
  { value: 'payee', label: 'Payées' },
  { value: 'en_retard', label: 'En retard' },
]

function isOverdue(f: FactureWithClient): boolean {
  if (f.statut === 'payee' || f.statut === 'brouillon') return false
  const today = new Date().toISOString().slice(0, 10)
  return f.echeance < today
}

function daysOverdue(echeance: string): number {
  const diff = Date.now() - new Date(echeance).getTime()
  return Math.floor(diff / 86400000)
}

export default function FacturesList() {
  const { data: factures, refresh } = useApiData(() => window.api.factures.list())
  const { execute } = useApiCall()
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showComptaExport, setShowComptaExport] = useState(false)
  const [comptaFrom, setComptaFrom] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [comptaTo, setComptaTo] = useState(() => new Date().toISOString().slice(0, 10))

  const allFactures = factures || []

  const filtered = allFactures.filter((f: FactureWithClient) => {
    const clientName = clientDisplayName({ nom: f.client_nom, prenom: f.client_prenom, entreprise: f.client_entreprise })
    const matchesSearch = f.numero.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || f.statut === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalEncaisse = allFactures.reduce((sum: number, f: FactureWithClient) => sum + (f.montant_paye || 0), 0)
  const totalEnAttente = allFactures.reduce((sum: number, f: FactureWithClient) => sum + Math.max(0, f.total - (f.montant_paye || 0)), 0)
  const overdueCount = allFactures.filter((f: FactureWithClient) => isOverdue(f)).length

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette facture ?')) {
      try {
        await execute(() => window.api.factures.delete(id))
        refresh()
        toast.success('Facture supprimée')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      }
    }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      await execute(() => window.api.factures.updateStatut(id, 'payee'))
      refresh()
      toast.success('Facture marquée comme payée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  const handleExportPdf = async (id: string) => {
    try {
      await execute(() => window.api.factures.exportPdf(id))
      toast.success('PDF exporté')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'export')
    }
  }

  const handleExportCsv = async () => {
    try {
      const result = await window.api.export.facturesCsv()
      if (result.success) {
        toast.success(`${result.count} factures exportées en CSV`)
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Erreur lors de l'export")
    }
  }

  const handleExportComptable = async () => {
    try {
      const result = await window.api.export.facturesComptable(comptaFrom, comptaTo)
      if (result.success) {
        toast.success(`${result.count} factures exportées (format comptable)`)
        setShowComptaExport(false)
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Erreur lors de l'export comptable")
    }
  }

  const handleMarkOverdue = async () => {
    const overdueFactures = allFactures.filter((f: FactureWithClient) => isOverdue(f) && f.statut === 'envoyee')
    try {
      for (const f of overdueFactures) {
        await execute(() => window.api.factures.updateStatut(f.id, 'en_retard'))
      }
      if (overdueFactures.length > 0) {
        refresh()
        toast.success(`${overdueFactures.length} facture(s) marquée(s) en retard`)
      } else {
        toast.info('Aucune facture en retard à mettre à jour')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Factures</h1>
          <p className="page-subtitle">Les factures sont créées depuis les devis acceptés</p>
        </div>
        <div className="flex gap-2">
          {overdueCount > 0 && (
            <button onClick={handleMarkOverdue} className="btn-secondary text-sm" style={{ color: 'hsl(0 70% 55%)' }} title="Marquer les factures échues comme en retard">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueCount} en retard
            </button>
          )}
          <button onClick={handleExportCsv} className="btn-secondary text-sm">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button onClick={() => setShowComptaExport(true)} className="btn-secondary text-sm">
            <Download className="h-3.5 w-3.5" />
            Export comptable
          </button>
        </div>
      </div>

      {/* Accounting export modal */}
      {showComptaExport && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-1">Export comptable</h3>
            <p className="text-xs text-muted-foreground mb-4">
              CSV compatible Crésus, Banana, Abacus (double écriture)
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Du</label>
                <input type="date" className="input mt-1" value={comptaFrom} onChange={(e) => setComptaFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Au</label>
                <input type="date" className="input mt-1" value={comptaTo} onChange={(e) => setComptaTo(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <button className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground" onClick={() => { const y = new Date().getFullYear(); setComptaFrom(`${y}-01-01`); setComptaTo(`${y}-12-31`) }}>
                Cette année
              </button>
              <button className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground" onClick={() => { const y = new Date().getFullYear() - 1; setComptaFrom(`${y}-01-01`); setComptaTo(`${y}-12-31`) }}>
                Année précédente
              </button>
              <button className="text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground" onClick={() => { const d = new Date(); const m = d.getMonth(); const y = d.getFullYear(); const qStart = new Date(y, Math.floor(m / 3) * 3, 1); const qEnd = new Date(y, Math.floor(m / 3) * 3 + 3, 0); setComptaFrom(qStart.toISOString().slice(0, 10)); setComptaTo(qEnd.toISOString().slice(0, 10)) }}>
                Ce trimestre
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowComptaExport(false)} className="btn-secondary text-sm">Annuler</button>
              <button onClick={handleExportComptable} className="btn-primary text-sm">
                <Download className="h-3.5 w-3.5" />
                Exporter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(145 60% 40% / 0.12)' }}>
              <CheckCircle className="h-5 w-5" style={{ color: 'hsl(145 60% 40%)' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Encaissé</p>
              <p className="text-2xl font-bold text-foreground">{formatCHF(totalEncaisse)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(35 80% 50% / 0.12)' }}>
              <Receipt className="h-5 w-5" style={{ color: 'hsl(35 80% 50%)' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold text-foreground">{formatCHF(totalEnAttente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Status filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="search-bar flex-1">
          <Search className="search-icon" />
          <input className="search-input" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1" style={{ background: 'hsl(var(--muted))' }}>
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground tracking-wider">N°</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground tracking-wider">Échéance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground tracking-wider">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground tracking-wider">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground tracking-wider">Payé</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((f: FactureWithClient) => {
                const overdue = isOverdue(f)
                return (
                  <tr key={f.id} className={`table-row cursor-pointer group ${overdue ? 'bg-destructive/5' : ''}`} onClick={() => navigate(`/factures/${f.id}`)}>
                    <td className="px-4 py-3 font-medium text-primary">
                      {f.numero}
                      {f.type === 'avoir' && <span className="ml-1.5 text-xs font-bold px-1 py-0.5 rounded" style={{ background: 'hsl(0 70% 55% / 0.1)', color: 'hsl(0 70% 55%)' }}>Avoir</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{clientDisplayName({ nom: f.client_nom, prenom: f.client_prenom, entreprise: f.client_entreprise })}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(f.date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                        {formatDate(f.echeance)}
                        {overdue && <span className="ml-1 text-xs">({daysOverdue(f.echeance)}j)</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${factureStatutColor(f.statut)}`}>{factureStatutLabel(f.statut)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{formatCHF(f.total)}</td>
                    <td className="px-4 py-3">
                      {f.statut !== 'brouillon' && f.total > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, ((f.montant_paye || 0) / f.total) * 100)}%`,
                                background: (f.montant_paye || 0) >= f.total ? 'hsl(145 60% 40%)' : 'hsl(35 80% 50%)',
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round(((f.montant_paye || 0) / f.total) * 100)}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground text-center block">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleExportPdf(f.id)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="PDF">
                          <Download className="h-4 w-4" />
                        </button>
                        {f.statut !== 'payee' && (
                          <button onClick={() => handleMarkPaid(f.id)} className="rounded p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors" title="Marquer payée">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(f.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune facture trouvée</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
