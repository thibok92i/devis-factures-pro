import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, CheckCircle, Send, Plus, Trash2, CreditCard, AlertTriangle, Clock, Banknote, CircleDollarSign, FileX } from 'lucide-react'
import { useToast } from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import Breadcrumbs from '../components/Breadcrumbs'
import { formatCHF, formatDate, factureStatutLabel, factureStatutColor } from '../utils/format'
import type { FactureDetail } from '../types'

const METHODES_PAIEMENT = [
  { value: 'virement', label: 'Virement' },
  { value: 'especes', label: 'Espèces' },
  { value: 'carte', label: 'Carte' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'autre', label: 'Autre' },
]

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

  const [showPaiementForm, setShowPaiementForm] = useState(false)
  const [paiementMontant, setPaiementMontant] = useState('')
  const [paiementMethode, setPaiementMethode] = useState('virement')
  const [paiementDate, setPaiementDate] = useState(new Date().toISOString().slice(0, 10))
  const [paiementNotes, setPaiementNotes] = useState('')
  const [showPayeProposal, setShowPayeProposal] = useState(false)

  const reloadFacture = async () => {
    if (!id) return
    const updated = await window.api.factures.get(id)
    setFacture(updated)
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

  const handleExportRelance = async () => {
    if (!facture) return
    try {
      const result = await window.api.factures.exportRelance(facture.id)
      if (result.success) {
        toast.success('Lettre de relance exportée')
      } else {
        toast.error(result.error || 'Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur lors de l\'export de la relance')
    }
  }

  const handleCreateAvoir = async () => {
    if (!facture) return
    try {
      const result = await window.api.factures.createAvoir(facture.id)
      if (result.success && result.id) {
        toast.success(`Avoir ${result.numero} créé`)
        navigate(`/factures/${result.id}`)
      } else {
        toast.error(result.error || 'Erreur lors de la création de l\'avoir')
      }
    } catch {
      toast.error('Erreur lors de la création de l\'avoir')
    }
  }

  const handleAddPaiement = async () => {
    if (!facture) return
    const montant = parseFloat(paiementMontant)
    if (isNaN(montant) || montant <= 0) {
      toast.error('Montant invalide')
      return
    }
    try {
      const result = await window.api.paiements.add({
        facture_id: facture.id,
        montant,
        date: paiementDate,
        methode: paiementMethode,
        notes: paiementNotes || undefined,
      })
      if (result.success) {
        toast.success('Paiement enregistré')
        setShowPaiementForm(false)
        setPaiementMontant('')
        setPaiementNotes('')
        const updated = await window.api.factures.get(facture.id)
        setFacture(updated)
        // Auto-propose to mark as paid when total reached
        if (updated && updated.montant_paye >= updated.total && updated.statut !== 'payee') {
          setShowPayeProposal(true)
        }
      } else {
        toast.error(result.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout du paiement')
    }
  }

  const handleDeletePaiement = async (paiementId: string) => {
    if (!confirm('Supprimer ce paiement ?')) return
    try {
      const result = await window.api.paiements.delete(paiementId)
      if (result.success) {
        toast.success('Paiement supprimé')
        reloadFacture()
      } else {
        toast.error(result.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
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

  if (!facture) return <SkeletonList />

  return (
    <div>
      <Breadcrumbs items={[
        { label: 'Factures', to: '/factures' },
        { label: `${facture.type === 'avoir' ? 'Avoir' : 'Facture'} ${facture.numero}` }
      ]} />
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/factures')} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="page-title mb-0">
              {facture.type === 'avoir' ? 'Avoir' : 'Facture'} {facture.numero}
            </h1>
            <p className="text-sm text-muted-foreground">
              {facture.client_entreprise || `${facture.client_prenom || ''} ${facture.client_nom}`}
            </p>
          </div>
          {facture.type === 'avoir' && (
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: 'hsl(0 70% 55% / 0.1)', color: 'hsl(0 70% 55%)', border: '1px solid hsl(0 70% 55% / 0.3)' }}>
              NOTE DE CRÉDIT
            </span>
          )}
          <span className={`badge ${factureStatutColor(facture.statut)}`}>{factureStatutLabel(facture.statut)}</span>
        </div>
        <div className="flex gap-2">
          {facture.statut === 'brouillon' && facture.type !== 'avoir' && (
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
          {facture.statut === 'en_retard' && (
            <button onClick={handleExportRelance} className="btn-secondary" style={{ color: 'hsl(0 70% 55%)', borderColor: 'hsl(0 70% 55% / 0.3)' }}>
              <AlertTriangle className="h-4 w-4" />
              Relance
            </button>
          )}
          {facture.statut === 'payee' && facture.type !== 'avoir' && (
            <button onClick={handleCreateAvoir} className="btn-secondary" style={{ color: 'hsl(0 70% 55%)', borderColor: 'hsl(0 70% 55% / 0.3)' }}>
              <FileX className="h-4 w-4" />
              Créer un avoir
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

      {/* Totals + Payment progress */}
      <div className="flex justify-end mb-6">
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
            {facture.montant_paye > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payé</span>
                  <span className="font-medium" style={{ color: 'hsl(145 60% 40%)' }}>-{formatCHF(facture.montant_paye)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold text-foreground">Reste à payer</span>
                  <span className="text-lg font-bold" style={{ color: facture.total - facture.montant_paye > 0 ? 'hsl(35 80% 50%)' : 'hsl(145 60% 40%)' }}>
                    {formatCHF(Math.max(0, facture.total - facture.montant_paye))}
                  </span>
                </div>
              </>
            )}
            {/* Payment progress bar */}
            {facture.total > 0 && facture.statut !== 'brouillon' && (
              <div className="pt-1">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (facture.montant_paye / facture.total) * 100)}%`,
                      background: facture.montant_paye >= facture.total ? 'hsl(145 60% 40%)' : 'hsl(35 80% 50%)',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {Math.round((facture.montant_paye / facture.total) * 100)}% payé
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paiements section */}
      {facture.statut !== 'brouillon' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiements
            </h3>
            {facture.statut !== 'payee' && (
              <button onClick={() => setShowPaiementForm(!showPaiementForm)} className="btn-primary text-xs">
                <Plus className="h-3.5 w-3.5" />
                Ajouter un paiement
              </button>
            )}
          </div>

          {/* Add payment form */}
          {showPaiementForm && (() => {
            const restant = Math.max(0, facture.total - facture.montant_paye)
            const acompte30 = Math.round(facture.total * 0.3 * 100) / 100
            const acompte50 = Math.round(facture.total * 0.5 * 100) / 100
            return (
            <div className="mb-4 p-4 rounded-lg border border-border" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
              {/* Quick amount buttons */}
              {restant > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Raccourcis :</span>
                  {facture.montant_paye === 0 && acompte30 < restant && (
                    <button
                      onClick={() => setPaiementMontant(String(acompte30))}
                      className="text-xs px-2 py-1 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-foreground"
                    >
                      <Banknote className="h-3 w-3 inline mr-1" />
                      Acompte 30% ({formatCHF(acompte30)})
                    </button>
                  )}
                  {facture.montant_paye === 0 && acompte50 < restant && (
                    <button
                      onClick={() => setPaiementMontant(String(acompte50))}
                      className="text-xs px-2 py-1 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-foreground"
                    >
                      <Banknote className="h-3 w-3 inline mr-1" />
                      Acompte 50% ({formatCHF(acompte50)})
                    </button>
                  )}
                  <button
                    onClick={() => setPaiementMontant(String(restant))}
                    className="text-xs px-2 py-1 rounded-md border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-primary font-medium"
                  >
                    <CircleDollarSign className="h-3 w-3 inline mr-1" />
                    Solde ({formatCHF(restant)})
                  </button>
                </div>
              )}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Montant (CHF)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paiementMontant}
                    onChange={(e) => setPaiementMontant(e.target.value)}
                    placeholder={formatCHF(restant)}
                    className="input mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Méthode</label>
                  <select value={paiementMethode} onChange={(e) => setPaiementMethode(e.target.value)} className="input mt-1">
                    {METHODES_PAIEMENT.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <input type="date" value={paiementDate} onChange={(e) => setPaiementDate(e.target.value)} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Notes</label>
                  <input value={paiementNotes} onChange={(e) => setPaiementNotes(e.target.value)} placeholder="Optionnel" className="input mt-1" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowPaiementForm(false)} className="btn-secondary text-xs">Annuler</button>
                <button onClick={handleAddPaiement} className="btn-primary text-xs">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Enregistrer
                </button>
              </div>
            </div>
            )
          })()}

          {/* Auto-propose payée banner */}
          {showPayeProposal && (
            <div className="mb-4 flex items-center justify-between rounded-lg p-3 border" style={{ background: 'hsl(145 60% 40% / 0.08)', borderColor: 'hsl(145 60% 40% / 0.3)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" style={{ color: 'hsl(145 60% 40%)' }} />
                <span className="text-sm font-medium text-foreground">Le montant total a été payé !</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPayeProposal(false)}
                  className="btn-secondary text-xs"
                >
                  Plus tard
                </button>
                <button
                  onClick={async () => {
                    await handleStatut('payee')
                    setShowPayeProposal(false)
                  }}
                  className="btn-success text-xs"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Marquer payée
                </button>
              </div>
            </div>
          )}

          {/* Payment timeline */}
          {facture.paiements && facture.paiements.length > 0 ? (
            <div className="relative pl-6">
              {/* Vertical timeline line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-px" style={{ background: 'hsl(var(--border))' }} />
              <div className="space-y-4">
                {facture.paiements.map((p, i) => {
                  const cumul = facture.paiements.slice(0, i + 1).reduce((s, x) => s + x.montant, 0)
                  const pct = Math.min(100, Math.round((cumul / facture.total) * 100))
                  return (
                    <div key={p.id} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: cumul >= facture.total ? 'hsl(145 60% 40%)' : 'hsl(var(--primary))',
                          background: cumul >= facture.total ? 'hsl(145 60% 40% / 0.15)' : 'hsl(var(--primary) / 0.1)',
                        }}
                      >
                        {cumul >= facture.total
                          ? <CheckCircle className="h-3 w-3" style={{ color: 'hsl(145 60% 40%)' }} />
                          : <Clock className="h-3 w-3 text-primary" />
                        }
                      </div>
                      {/* Payment card */}
                      <div className="flex items-start justify-between rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: 'hsl(145 60% 40%)' }}>
                              +{formatCHF(p.montant)}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded-md capitalize" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                              {p.methode}
                            </span>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatDate(p.date)}</span>
                            {p.notes && <span className="text-xs text-muted-foreground/70">— {p.notes}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePaiement(p.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun paiement enregistré</p>
          )}
        </div>
      )}
    </div>
  )
}
