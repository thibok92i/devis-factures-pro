import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, CheckCircle, Send } from 'lucide-react'
import { useToast } from '../components/Toast'
import { formatCHF, formatDate, factureStatutLabel, factureStatutColor } from '../utils/format'
import type { FactureDetail } from '../types'

export default function FactureView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [facture, setFacture] = useState<FactureDetail | null>(null)

  useEffect(() => {
    if (!id) return
    window.api.factures.get(id).then(setFacture)
  }, [id])

  const handleStatut = async (statut: string) => {
    if (!facture) return
    try {
      await window.api.factures.updateStatut(facture.id, statut)
      const updated = await window.api.factures.get(facture.id)
      setFacture(updated)
      toast.success('Statut mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const handleExportPdf = async () => {
    if (!facture) return
    try {
      await window.api.factures.exportPdf(facture.id)
      toast.success('PDF exporté')
    } catch {
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  if (!facture) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Chargement...</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/factures')} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facture {facture.numero}</h1>
            <p className="text-sm text-gray-500">
              {facture.client_entreprise || `${facture.client_prenom || ''} ${facture.client_nom}`}
            </p>
          </div>
          <span className={`badge ${factureStatutColor(facture.statut)}`}>{factureStatutLabel(facture.statut)}</span>
        </div>
        <div className="flex gap-2">
          {facture.statut === 'brouillon' && (
            <button onClick={() => handleStatut('envoyee')} className="btn-secondary">
              <Send className="h-4 w-4" />
              Marquer envoyée
            </button>
          )}
          {(facture.statut === 'envoyee' || facture.statut === 'en_retard') && (
            <button onClick={() => handleStatut('payee')} className="btn-success">
              <CheckCircle className="h-4 w-4" />
              Marquer payée
            </button>
          )}
          <button onClick={handleExportPdf} className="btn-primary">
            <Download className="h-4 w-4" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Invoice details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Client</h3>
          <p className="font-medium">{facture.client_entreprise || ''}</p>
          <p>{facture.client_prenom} {facture.client_nom}</p>
          <p className="text-sm text-gray-600">{facture.client_adresse}</p>
          <p className="text-sm text-gray-600">{facture.client_npa} {facture.client_ville}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Détails</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Date:</span><span>{formatDate(facture.date)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Échéance:</span><span>{formatDate(facture.echeance)}</span></div>
            {facture.date_paiement && (
              <div className="flex justify-between"><span className="text-gray-600">Payée le:</span><span>{formatDate(facture.date_paiement)}</span></div>
            )}
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="card overflow-hidden p-0 mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Désignation</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Unité</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Qté</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Prix unit.</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {facture.lignes.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{l.designation}</div>
                  {l.description && <div className="text-xs text-gray-500">{l.description}</div>}
                </td>
                <td className="px-4 py-3 text-center text-sm">{l.unite}</td>
                <td className="px-4 py-3 text-right text-sm">{l.quantite}</td>
                <td className="px-4 py-3 text-right text-sm">{formatCHF(l.prix_unitaire)}</td>
                <td className="px-4 py-3 text-right font-medium text-sm">{formatCHF(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="card w-80">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{formatCHF(facture.sous_total)}</span>
            </div>
            {facture.remise_pourcent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remise ({facture.remise_pourcent}%)</span>
                <span className="font-medium text-red-600">-{formatCHF(facture.remise_montant)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">TVA ({facture.taux_tva}%)</span>
              <span className="font-medium">{formatCHF(facture.montant_tva)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-semibold">Total TTC</span>
              <span className="text-lg font-bold text-emerald-600">{formatCHF(facture.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
