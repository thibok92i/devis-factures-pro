import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, FileText, ArrowRight, Trash2, Download, Copy, X, FileStack } from 'lucide-react'
import { useApiData, useApiCall } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import { formatCHF, formatDate, clientDisplayName, devisStatutLabel, devisStatutColor } from '../utils/format'
import ClientSearchInput from '../components/ClientSearchInput'
import ClientForm from '../components/ClientForm'
import type { DevisWithClient, Client, DevisTemplate } from '../types'

const statusFilters = [
  { value: 'all', label: 'Tous' },
  { value: 'brouillon', label: 'Brouillons' },
  { value: 'envoye', label: 'Envoyés' },
  { value: 'accepte', label: 'Acceptés' },
  { value: 'refuse', label: 'Refusés' },
]

export default function DevisList() {
  const { data: devisList, refresh } = useApiData(() => window.api.devis.list())
  const { data: clients, refresh: refreshClients } = useApiData(() => window.api.clients.list())
  const { execute } = useApiCall()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [showInlineClientForm, setShowInlineClientForm] = useState(false)
  const [templates, setTemplates] = useState<DevisTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openNewModal()
    }
  }, [searchParams])

  const openNewModal = async () => {
    setShowNewModal(true)
    setSelectedClient('')
    setSelectedTemplate(null)
    setShowInlineClientForm(false)
    // Load templates
    try {
      const tpls = await window.api.templates.list()
      setTemplates(tpls)
    } catch {
      setTemplates([])
    }
  }

  const filtered = (devisList || []).filter((d: DevisWithClient) => {
    const clientName = clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })
    const matchesSearch = d.numero.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || d.statut === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreate = async () => {
    if (!selectedClient) return
    const result = await execute(() => window.api.devis.create({ client_id: selectedClient }))
    if (result) {
      // If a template is selected, load its lines
      if (selectedTemplate) {
        try {
          const tpl = await window.api.templates.get(selectedTemplate)
          if (tpl && tpl.lignes.length > 0) {
            await window.api.devis.saveLignes(result.id, tpl.lignes.map((l: Record<string, unknown>) => ({
              catalogue_item_id: l.catalogue_item_id || null,
              designation: l.designation,
              description: l.description || '',
              unite: l.unite,
              quantite: l.quantite,
              prix_unitaire: l.prix_unitaire
            })))
          }
        } catch {
          // Template lines failed to load, devis still created
        }
      }
      setShowNewModal(false)
      navigate(`/devis/${result.id}`)
      toast.success('Devis créé')
    }
  }

  const handleInlineClientCreate = async (data: Partial<Record<string, unknown>>) => {
    try {
      const result = await window.api.clients.create(data)
      if (result && result.id) {
        await refreshClients()
        setSelectedClient(result.id)
        setShowInlineClientForm(false)
        toast.success('Client créé')
      }
    } catch {
      toast.error('Erreur lors de la création du client')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce devis ?')) {
      await execute(() => window.api.devis.delete(id))
      toast.success('Devis supprimé')
      refresh()
    }
  }

  const handleConvertToFacture = async (devisId: string) => {
    if (confirm('Convertir ce devis en facture ?')) {
      const result = await execute(() => window.api.factures.createFromDevis(devisId))
      if (result) {
        toast.success('Facture créée avec succès')
        refresh()
        navigate(`/factures/${result.id}`)
      }
    }
  }

  const handleExportPdf = async (id: string) => {
    await execute(() => window.api.devis.exportPdf(id))
    toast.success('PDF exporté')
  }

  const handleDuplicate = async (id: string) => {
    const result = await execute(() => window.api.devis.duplicate(id))
    if (result) {
      toast.success('Devis dupliqué')
      refresh()
      navigate(`/devis/${result.id}`)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Devis</h1>
          <p className="page-subtitle">{(devisList || []).length} devis au total</p>
        </div>
        <button onClick={openNewModal} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau devis
        </button>
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground tracking-wider">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d: DevisWithClient) => (
                <tr key={d.id} className="table-row cursor-pointer group" onClick={() => navigate(`/devis/${d.id}`)}>
                  <td className="px-4 py-3 font-medium text-primary">{d.numero}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(d.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${devisStatutColor(d.statut)}`}>{devisStatutLabel(d.statut)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">{formatCHF(d.total)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleExportPdf(d.id)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Exporter PDF">
                        <Download className="h-4 w-4" />
                      </button>
                      {d.statut === 'accepte' && (
                        <button onClick={() => handleConvertToFacture(d.id)} className="rounded p-1.5 text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors" title="Convertir en facture">
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDuplicate(d.id)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Dupliquer">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun devis trouvé</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Devis Modal — enhanced with search + templates */}
      {showNewModal && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Nouveau devis</h3>
              <button onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Client search */}
            <div className="mb-4">
              <label className="label">Client *</label>
              <ClientSearchInput
                clients={clients || []}
                value={selectedClient || null}
                onChange={(id) => setSelectedClient(id)}
                onCreateNew={() => setShowInlineClientForm(true)}
              />
              {/* Inline client creation */}
              {showInlineClientForm && (
                <ClientForm
                  inline
                  onSave={handleInlineClientCreate}
                  onCancel={() => setShowInlineClientForm(false)}
                />
              )}
            </div>

            {/* Template selection (optional) */}
            {templates.length > 0 && (
              <div className="mb-4">
                <label className="label flex items-center gap-1.5">
                  <FileStack className="h-3.5 w-3.5" />
                  Partir d'un modèle (optionnel)
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      !selectedTemplate ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    Devis vierge
                  </button>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedTemplate === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {t.nom} ({t.ligne_count} lignes)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleCreate} disabled={!selectedClient} className="btn-primary">Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
