import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trash2, Download, CheckCircle } from 'lucide-react'
import { useToast } from '../components/Toast'
import { useApiData, useApiCall } from '../hooks/useApi'
import { formatCHF, formatDate, clientDisplayName, factureStatutLabel, factureStatutColor } from '../utils/format'
import type { FactureWithClient } from '../types'

export default function FacturesList() {
  const { data: factures, refresh } = useApiData(() => window.api.factures.list())
  const { execute } = useApiCall()
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')

  const filtered = (factures || []).filter((f: FactureWithClient) => {
    const clientName = clientDisplayName({ nom: f.client_nom, prenom: f.client_prenom, entreprise: f.client_entreprise })
    return f.numero.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase())
  })

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cette facture ?')) {
      await execute(() => window.api.factures.delete(id))
      refresh()
      toast.success('Facture supprimée')
    }
  }

  const handleMarkPaid = async (id: string) => {
    await execute(() => window.api.factures.updateStatut(id, 'payee'))
    refresh()
    toast.success('Facture marquée comme payée')
  }

  const handleExportPdf = async (id: string) => {
    await execute(() => window.api.factures.exportPdf(id))
    toast.success('PDF exporté')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
        <p className="text-sm text-gray-500">Les factures sont créées automatiquement depuis les devis acceptés</p>
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Échéance</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Statut</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((f: FactureWithClient) => (
              <tr key={f.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/factures/${f.id}`)}>
                <td className="px-4 py-3 font-medium text-emerald-600">{f.numero}</td>
                <td className="px-4 py-3 text-sm">{clientDisplayName({ nom: f.client_nom, prenom: f.client_prenom, entreprise: f.client_entreprise })}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(f.date)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(f.echeance)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${factureStatutColor(f.statut)}`}>{factureStatutLabel(f.statut)}</span>
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatCHF(f.total)}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleExportPdf(f.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="PDF">
                      <Download className="h-4 w-4" />
                    </button>
                    {f.statut !== 'payee' && (
                      <button onClick={() => handleMarkPaid(f.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-emerald-600" title="Marquer payée">
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(f.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Aucune facture</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
