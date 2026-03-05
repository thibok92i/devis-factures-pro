import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, FileText, ArrowRight, Trash2, Download, Copy } from 'lucide-react'
import { useApiData, useApiCall } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import { formatCHF, formatDate, clientDisplayName, devisStatutLabel, devisStatutColor } from '../utils/format'
import type { DevisWithClient, Client } from '../types'

export default function DevisList() {
  const { data: devisList, refresh } = useApiData(() => window.api.devis.list())
  const { data: clients } = useApiData(() => window.api.clients.list())
  const { execute } = useApiCall()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowNewModal(true)
    }
  }, [searchParams])

  const filtered = (devisList || []).filter((d: DevisWithClient) => {
    const clientName = clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })
    return d.numero.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase())
  })

  const handleCreate = async () => {
    if (!selectedClient) return
    const result = await execute(() => window.api.devis.create({ client_id: selectedClient }))
    if (result) {
      setShowNewModal(false)
      navigate(`/devis/${result.id}`)
      toast.success('Devis créé')
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
        <button onClick={() => setShowNewModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau devis
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input className="input pl-10" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">N°</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Statut</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((d: DevisWithClient) => (
              <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/devis/${d.id}`)}>
                <td className="px-4 py-3 font-medium text-blue-600">{d.numero}</td>
                <td className="px-4 py-3 text-sm">{clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(d.date)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${devisStatutColor(d.statut)}`}>{devisStatutLabel(d.statut)}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatCHF(d.total)}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleExportPdf(d.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Exporter PDF">
                      <Download className="h-4 w-4" />
                    </button>
                    {d.statut === 'accepte' && (
                      <button onClick={() => handleConvertToFacture(d.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-emerald-600" title="Convertir en facture">
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDuplicate(d.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Dupliquer">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Aucun devis</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Devis Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card w-full max-w-md">
            <h3 className="mb-4 text-lg font-semibold">Nouveau devis</h3>
            <div className="mb-4">
              <label className="label">Client *</label>
              <select className="input" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                <option value="">Sélectionner un client...</option>
                {(clients || []).map((c: Client) => (
                  <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
                ))}
              </select>
            </div>
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
