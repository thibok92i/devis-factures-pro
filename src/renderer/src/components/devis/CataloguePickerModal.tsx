import { Search, Plus, Check, Star } from 'lucide-react'
import { formatCHF } from '../../utils/format'
import type { CatalogueItem } from '../../types'

interface CataloguePickerModalProps {
  catalogue: CatalogueItem[]
  catalogueSearch: string
  onSearchChange: (search: string) => void
  catalogueAddedCount: number
  /** IDs of catalogue items already in the devis */
  addedCatalogueIds: Set<string | undefined>
  onAddItem: (item: CatalogueItem) => void
  onClose: () => void
}

export default function CataloguePickerModal({
  catalogue,
  catalogueSearch,
  onSearchChange,
  catalogueAddedCount,
  addedCatalogueIds,
  onAddItem,
  onClose
}: CataloguePickerModalProps) {
  const filtered = catalogue.filter((item) =>
    item.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    item.reference.toLowerCase().includes(catalogueSearch.toLowerCase())
  )

  const favs = filtered.filter((item) => item.is_favorite)
  const others = filtered.filter((item) => !item.is_favorite)

  const renderItem = (item: CatalogueItem) => {
    const alreadyAdded = addedCatalogueIds.has(item.id)
    return (
      <div key={item.id} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${alreadyAdded ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {item.is_favorite && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          {alreadyAdded && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{item.designation}</div>
            <div className="text-xs text-muted-foreground">{item.reference} - {item.type === 'materiau' ? 'Matériau' : "Main d'oeuvre"} - {item.categorie || 'Sans catégorie'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-medium text-foreground">{formatCHF(item.prix_unitaire)}</div>
            <div className="text-xs text-muted-foreground">/{item.unite}</div>
          </div>
          <button
            onClick={() => onAddItem(item)}
            className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
            title="Ajouter au devis"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Catalogue</h3>
          <button onClick={onClose} className="btn-primary text-sm">
            <Check className="h-4 w-4" />
            Terminer{catalogueAddedCount > 0 ? ` (${catalogueAddedCount} ajouté${catalogueAddedCount > 1 ? 's' : ''})` : ''}
          </button>
        </div>
        <div className="search-bar mb-3">
          <Search className="search-icon" />
          <input className="search-input" placeholder="Rechercher un article..." value={catalogueSearch} onChange={(e) => onSearchChange(e.target.value)} autoFocus />
        </div>
        <div className="overflow-y-auto flex-1">
          {favs.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-600 flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500" /> Favoris
              </div>
              {favs.map(renderItem)}
              {others.length > 0 && <div className="border-t border-border my-1" />}
            </>
          )}
          {others.map(renderItem)}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun article trouvé</p>
          )}
        </div>
      </div>
    </div>
  )
}
