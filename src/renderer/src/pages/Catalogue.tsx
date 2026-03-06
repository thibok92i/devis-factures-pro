import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, X, Package, Wrench, Star, Upload } from 'lucide-react'
import { useApiData, useApiCall } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import { formatCHF } from '../utils/format'
import type { CatalogueItem } from '../types'

function ItemForm({
  item,
  onSave,
  onCancel
}: {
  item?: CatalogueItem
  onSave: (data: Partial<CatalogueItem>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    type: item?.type || 'materiau' as 'materiau' | 'main_oeuvre',
    reference: item?.reference || '',
    designation: item?.designation || '',
    unite: item?.unite || 'pce',
    prix_unitaire: item?.prix_unitaire || 0,
    categorie: item?.categorie || ''
  })

  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{item ? 'Modifier' : 'Nouvel article'}</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <div>
            <label className="label">Type *</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, type: 'materiau' })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'materiau' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                <Package className="inline h-4 w-4 mr-1" />Matériau
              </button>
              <button type="button" onClick={() => setForm({ ...form, type: 'main_oeuvre' })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'main_oeuvre' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                <Wrench className="inline h-4 w-4 mr-1" />Main d'oeuvre
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Référence</label>
              <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <label className="label">Catégorie</label>
              <input className="input" value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} placeholder="Ex: Bois, Quincaillerie..." />
            </div>
          </div>
          <div>
            <label className="label">Désignation *</label>
            <input className="input" required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unité</label>
              <select className="input" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })}>
                <option value="pce">pce</option>
                <option value="m">m</option>
                <option value="m²">m²</option>
                <option value="m³">m³</option>
                <option value="kg">kg</option>
                <option value="h">h</option>
                <option value="forfait">forfait</option>
              </select>
            </div>
            <div>
              <label className="label">Prix unitaire (CHF)</label>
              <input className="input" type="number" step="0.05" min="0" value={form.prix_unitaire} onChange={(e) => setForm({ ...form, prix_unitaire: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Catalogue() {
  const { data: items, refresh } = useApiData(() => window.api.catalogue.list())
  const { execute } = useApiCall()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [editing, setEditing] = useState<CatalogueItem | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setCreating(true)
    }
  }, [searchParams])

  const filtered = (items || []).filter((item: CatalogueItem) => {
    const matchesSearch = (item.designation || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.reference || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    return matchesSearch && matchesType
  })

  // Group by category
  const grouped = filtered.reduce((acc: Record<string, CatalogueItem[]>, item: CatalogueItem) => {
    const cat = item.categorie || 'Sans catégorie'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const handleSave = async (data: Partial<CatalogueItem>) => {
    if (editing) {
      await execute(() => window.api.catalogue.update(editing.id, data))
      toast.success('Article mis à jour')
    } else {
      await execute(() => window.api.catalogue.create(data))
      toast.success('Article ajouté au catalogue')
    }
    setEditing(null)
    setCreating(false)
    refresh()
  }

  const handleToggleFavorite = async (id: string) => {
    await execute(() => window.api.catalogue.toggleFavorite(id))
    refresh()
  }

  const handleImportCsv = async () => {
    try {
      const result = await window.api.export.catalogueImportCsv()
      if (result.success) {
        toast.success(`${result.count} articles importés`)
        refresh()
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Erreur lors de l'import")
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cet article ?')) {
      await execute(() => window.api.catalogue.delete(id))
      toast.success('Article supprimé')
      refresh()
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalogue</h1>
          <p className="page-subtitle">{(items || []).length} article{(items || []).length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImportCsv} className="btn-secondary text-sm">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Nouvel article
          </button>
        </div>
      </div>

      {/* Search + Type filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="search-bar flex-1">
          <Search className="search-icon" />
          <input className="search-input" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1" style={{ background: 'hsl(var(--muted))' }}>
          <button
            onClick={() => setTypeFilter('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${typeFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Tous
          </button>
          <button
            onClick={() => setTypeFilter('materiau')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${typeFilter === 'materiau' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Package className="h-3 w-3" /> Matériaux
          </button>
          <button
            onClick={() => setTypeFilter('main_oeuvre')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${typeFilter === 'main_oeuvre' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Wrench className="h-3 w-3" /> Main d'oeuvre
          </button>
        </div>
      </div>

      {/* Grouped list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <Package className="empty-state-icon" />
          <p className="text-sm text-muted-foreground">Aucun article trouvé</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryItems]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div className="wood-accent w-4" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
                <span className="text-xs text-muted-foreground/60">({categoryItems.length})</span>
              </div>
              <div className="card overflow-hidden p-0">
                <div className="divide-y divide-border">
                  {categoryItems.map((item: CatalogueItem) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.type === 'materiau' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                          {item.type === 'materiau'
                            ? <Package className="h-4 w-4 text-primary" />
                            : <Wrench className="h-4 w-4 text-accent" />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.designation}</span>
                            {item.reference && <span className="text-xs text-muted-foreground">({item.reference})</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">{item.unite}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm text-foreground">{formatCHF(item.prix_unitaire)}</span>
                        <button onClick={() => handleToggleFavorite(item.id)} className={`rounded p-1.5 transition-colors ${item.is_favorite ? 'text-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-500'}`} title={item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                          <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-500' : ''}`} />
                        </button>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditing(item)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ItemForm item={editing || undefined} onSave={handleSave} onCancel={() => { setCreating(false); setEditing(null) }} />
      )}
    </div>
  )
}
