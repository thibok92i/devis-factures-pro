import { ArrowLeft, X, FileInput, Search, Plus } from 'lucide-react'
import { formatCHF, formatDate, clientDisplayName } from '../../utils/format'
import type { DevisWithClient, DevisLigne } from '../../types'

interface ImportDevisModalProps {
  devisList: DevisWithClient[]
  importSearch: string
  onSearchChange: (search: string) => void
  selectedDevisId: string | null
  importLignes: DevisLigne[]
  importChecked: Set<number>
  onSelectDevis: (devisId: string) => void
  onBackToList: () => void
  onToggleLine: (index: number, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onConfirm: () => void
  onClose: () => void
}

export default function ImportDevisModal({
  devisList,
  importSearch,
  onSearchChange,
  selectedDevisId,
  importLignes,
  importChecked,
  onSelectDevis,
  onBackToList,
  onToggleLine,
  onToggleAll,
  onConfirm,
  onClose
}: ImportDevisModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            <FileInput className="h-5 w-5 inline-block mr-2 text-primary" />
            Importer depuis un devis
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!selectedDevisId ? (
          /* Step 1: Choose a devis */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="search-bar mb-3">
              <Search className="search-icon" />
              <input className="search-input" placeholder="Rechercher par numéro ou client..." value={importSearch} onChange={(e) => onSearchChange(e.target.value)} autoFocus />
            </div>
            <div className="overflow-y-auto flex-1 space-y-1">
              {devisList
                .filter((d) => {
                  if (!importSearch) return true
                  const q = importSearch.toLowerCase()
                  const name = clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })
                  return d.numero.toLowerCase().includes(q) || name.toLowerCase().includes(q)
                })
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => onSelectDevis(d.id)}
                    className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-primary">{d.numero}</span>
                        <span className="text-sm text-foreground ml-2">
                          {clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">{formatCHF(d.total)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(d.date)}</div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          /* Step 2: Select lines to import */
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-3 mb-3 p-3 rounded-lg" style={{ background: 'hsl(var(--primary) / 0.05)' }}>
              <button onClick={onBackToList} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-foreground">
                {importLignes.length} ligne{importLignes.length > 1 ? 's' : ''} disponible{importLignes.length > 1 ? 's' : ''}
              </span>
              <div className="ml-auto">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importChecked.size === importLignes.length}
                    onChange={(e) => onToggleAll(e.target.checked)}
                    className="rounded border-border"
                  />
                  Tout sélectionner
                </label>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Désignation</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Unité</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qté</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Prix unit.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importLignes.map((l: DevisLigne, i: number) => (
                    <tr key={i} className={`hover:bg-muted/30 ${importChecked.has(i) ? '' : 'opacity-40'}`}>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={importChecked.has(i)}
                          onChange={(e) => onToggleLine(i, e.target.checked)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-foreground">
                        {l.description === '__SECTION__' ? <span className="font-bold text-primary">{l.designation}</span> : l.designation}
                      </td>
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
              <div className="text-sm text-muted-foreground">
                {importChecked.size} ligne{importChecked.size > 1 ? 's' : ''} sélectionnée{importChecked.size > 1 ? 's' : ''}
              </div>
              <button onClick={onConfirm} disabled={importChecked.size === 0} className="btn-primary">
                <Plus className="h-4 w-4" />
                Importer {importChecked.size} ligne{importChecked.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
