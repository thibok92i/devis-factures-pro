import { useEffect, useState, useRef } from 'react'
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

  // --- Keyboard shortcuts (ref pattern to avoid re-attaching on every render) ---
  const shortcutRef = useRef(handleExportPdf)
  shortcutRef.current = handleExportPdf

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        shortcutRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!facture) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/factures')} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="page-title mb-0">Facture {facture.numero}</h1>
            <p className="text-sm text-muted-foreground">
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
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Client</h3>
          <p className="font-medium text-foreground">{facture.client_entreprise || ''}</p>
          <p className="text-foreground">{facture.client_prenom} {facture.client_nom}</p>
          <p className="text-sm text-muted-foreground">{facture.client_adresse}</p>
          <p className="text-sm text-muted-foreground">{facture.client_npa} {facture.client_ville}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Détails</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span className="text-foreground">{formatDate(facture.date)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Échéance:</span><span className="text-foreground">{formatDate(facture.echeance)}</span></div>
            {facture.date_paiement && (
              <div className="flex justify-between"><span className="text-muted-foreground">Payée le:</span><span className="text-foreground">{formatDate(facture.date_paiement)}</span></div>
            )}
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="card overflow-hidden p-0 mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Désignation</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">Unité</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Qté</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Prix unit.</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {facture.lignes.map((l) => (
              <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-sm text-foreground">{l.designation}</div>
                  {l.description && <div className="text-xs text-muted-foreground">{l.description}</div>}
                </td>
                <td className="px-4 py-3 text-center text-sm text-muted-foreground">{l.unite}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground">{l.quantite}</td>
                <td className="px-4 py-3 text-right text-sm text-foreground">{formatCHF(l.prix_unitaire)}</td>
                <td className="px-4 py-3 text-right font-medium text-sm text-foreground">{formatCHF(l.total)}</td>
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
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium text-foreground">{formatCHF(facture.sous_total)}</span>
            </div>
            {facture.remise_pourcent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remise ({facture.remise_pourcent}%)</span>
                <span className="font-medium text-destructive">-{formatCHF(facture.remise_montant)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA ({facture.taux_tva}%)</span>
              <span className="font-medium text-foreground">{formatCHF(facture.montant_tva)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-semibold text-foreground">Total TTC</span>
              <span className="text-lg font-bold text-primary">{formatCHF(facture.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
