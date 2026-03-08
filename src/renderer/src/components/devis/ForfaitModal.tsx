import { ArrowLeft, X, Package, Plus } from 'lucide-react'
import { formatCHF } from '../../utils/format'
import type { Forfait, ForfaitCalculated } from '../../types'

interface ForfaitModalProps {
  forfaits: Forfait[]
  selectedForfait: Forfait | null
  forfaitQuantite: number
  forfaitPreview: ForfaitCalculated[]
  onSelectForfait: (f: Forfait) => void
  onBackToList: () => void
  onQuantiteChange: (qte: number) => void
  onAddLines: () => void
  onClose: () => void
}

export default function ForfaitModal({
  forfaits,
  selectedForfait,
  forfaitQuantite,
  forfaitPreview,
  onSelectForfait,
  onBackToList,
  onQuantiteChange,
  onAddLines,
  onClose
}: ForfaitModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            <Package className="h-5 w-5 inline-block mr-2 text-primary" />
            Forfaits / Packs
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!selectedForfait ? (
          /* Step 1: Choose a forfait */
          <div className="overflow-y-auto flex-1">
            <p className="text-sm text-muted-foreground mb-3">
              Choisissez un pack pour ajouter automatiquement tous les matériaux et la main d&apos;oeuvre :
            </p>
            <div className="space-y-2">
              {forfaits.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onSelectForfait(f)}
                  className="w-full text-left rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{f.nom}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{f.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-primary">{f.ligne_count} lignes</div>
                      <div className="text-xs text-muted-foreground">par {f.unite_base}</div>
                    </div>
                  </div>
                </button>
              ))}
              {forfaits.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun forfait disponible</p>
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Enter quantity and preview */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: 'hsl(var(--primary) / 0.05)' }}>
              <button onClick={onBackToList} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex-1">
                <div className="font-medium text-foreground">{selectedForfait.nom}</div>
                <div className="text-xs text-muted-foreground">{selectedForfait.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Quantité ({selectedForfait.unite_base}) :</label>
                <input
                  className="input w-24 text-sm text-right"
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={forfaitQuantite}
                  onChange={(e) => onQuantiteChange(parseFloat(e.target.value) || 0)}
                  autoFocus
                />
              </div>
            </div>

            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Aperçu des lignes ({forfaitPreview.length})
            </div>
            <div className="overflow-y-auto flex-1 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Désignation</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Unité</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qté</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Prix unit.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {forfaitPreview.map((l, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-3 py-1.5 text-foreground">{l.designation}</td>
                      <td className="px-3 py-1.5 text-center text-muted-foreground">{l.unite}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{l.quantite}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">{formatCHF(l.prix_unitaire)}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatCHF(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Total forfait : </span>
                <span className="text-lg font-bold text-primary">
                  {formatCHF(forfaitPreview.reduce((sum, l) => sum + l.total, 0))}
                </span>
              </div>
              <button onClick={onAddLines} disabled={forfaitPreview.length === 0 || forfaitQuantite <= 0} className="btn-primary">
                <Plus className="h-4 w-4" />
                Ajouter {forfaitPreview.length} lignes au devis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
