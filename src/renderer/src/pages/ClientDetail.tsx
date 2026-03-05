import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Receipt, Pencil, Plus, Mail, Phone, MapPin } from 'lucide-react'
import { useToast } from '../components/Toast'
import {
  formatCHF,
  formatDate,
  clientDisplayName,
  devisStatutLabel,
  devisStatutColor,
  factureStatutLabel,
  factureStatutColor
} from '../utils/format'
import type { Client, DevisWithClient, FactureWithClient } from '../types'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [devis, setDevis] = useState<DevisWithClient[]>([])
  const [factures, setFactures] = useState<FactureWithClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    const loadData = async () => {
      try {
        const [clientData, allDevis, allFactures] = await Promise.all([
          window.api.clients.get(id),
          window.api.devis.list(),
          window.api.factures.list()
        ])
        setClient(clientData)
        setDevis((allDevis || []).filter((d: DevisWithClient) => d.client_id === id))
        setFactures((allFactures || []).filter((f: FactureWithClient) => f.client_id === id))
      } catch {
        toast.error('Erreur lors du chargement du client')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Chargement...</div>
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>Client introuvable</p>
        <button onClick={() => navigate('/clients')} className="btn-primary mt-4">Retour aux clients</button>
      </div>
    )
  }

  // Summary stats
  const totalFacture = factures.reduce((sum, f) => sum + f.total, 0)
  const totalPaye = factures.filter((f) => f.statut === 'payee').reduce((sum, f) => sum + f.total, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{clientDisplayName(client)}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toast.info('Modification en cours de développement')}
            className="btn-secondary"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </button>
          <button onClick={() => navigate('/devis?action=new')} className="btn-primary">
            <Plus className="h-4 w-4" />
            Nouveau devis
          </button>
        </div>
      </div>

      {/* Info + Stats grid */}
      <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
        {/* Client info card */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Informations client</h3>
          <div className="space-y-3">
            {client.entreprise && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-400">Entreprise</span>
                <p className="font-medium text-gray-900">{client.entreprise}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium uppercase text-gray-400">Nom</span>
              <p className="font-medium text-gray-900">{[client.prenom, client.nom].filter(Boolean).join(' ')}</p>
            </div>
            {client.adresse && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-700">{client.adresse}</p>
                  <p className="text-sm text-gray-700">{client.npa} {client.ville}</p>
                </div>
              </div>
            )}
            {client.telephone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-700">{client.telephone}</p>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-700">{client.email}</p>
              </div>
            )}
            {client.notes && (
              <div>
                <span className="text-xs font-medium uppercase text-gray-400">Notes</span>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary stats card */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Résumé</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">Devis</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{devis.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-gray-600">Factures</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{factures.length}</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <span className="text-sm text-gray-600">Total facturé</span>
              <p className="text-lg font-bold text-gray-900">{formatCHF(totalFacture)}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <span className="text-sm text-gray-600">Total payé</span>
              <p className="text-lg font-bold text-emerald-600">{formatCHF(totalPaye)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Devis section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Devis
        </h2>
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">N°</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devis.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/devis/${d.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-blue-600">{d.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(d.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${devisStatutColor(d.statut)}`}>{devisStatutLabel(d.statut)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCHF(d.total)}</td>
                </tr>
              ))}
              {devis.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucun devis pour ce client
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factures section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-emerald-600" />
          Factures
        </h2>
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">N°</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Échéance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {factures.map((f) => (
                <tr
                  key={f.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/factures/${f.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-emerald-600">{f.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(f.date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(f.echeance)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${factureStatutColor(f.statut)}`}>{factureStatutLabel(f.statut)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatCHF(f.total)}</td>
                </tr>
              ))}
              {factures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucune facture pour ce client
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
