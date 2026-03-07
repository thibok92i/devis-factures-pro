import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, X, Package, Wrench, Star, Upload, Copy, ArrowUpDown, Download, ChevronDown } from 'lucide-react'
import { useApiData, useApiCall } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import { formatCHF } from '../utils/format'
import type { CatalogueItem } from '../types'

// -------------------------------------------------------------------
// Category autocomplete input
// -------------------------------------------------------------------
function CategoryInput({
  value,
  onChange,
  categories
}: {
  value: string
  onChange: (v: string) => void
  categories: string[]
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = categories.filter((c) => c.toLowerCase().includes(value.toLowerCase()))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        className="input"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { setFocused(true); setOpen(true) }}
        onBlur={() => setFocused(false)}
        placeholder="Ex: Bois, Quincaillerie..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border shadow-lg max-h-40 overflow-y-auto" style={{ background: 'hsl(var(--card))' }}>
          {filtered.map((cat) => (
            <button
              key={cat}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors text-foreground"
              onMouseDown={(e) => { e.preventDefault(); onChange(cat); setOpen(false) }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------------
// Item form (create / edit)
// -------------------------------------------------------------------
function ItemForm({
  item,
  categories,
  onSave,
  onCancel
}: {
  item?: CatalogueItem
  categories: string[]
  onSave: (data: Partial<CatalogueItem>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    type: item?.type || 'materiau' as 'materiau' | 'main_oeuvre',
    reference: item?.reference || '',
    designation: item?.designation || '',
    unite: item?.unite || 'pce',
    prix_unitaire: item?.prix_unitaire || 0,
    prix_achat: item?.prix_achat || 0,
    fournisseur: item?.fournisseur || '',
    categorie: item?.categorie || ''
  })

  const marge = form.prix_achat > 0 ? ((form.prix_unitaire - form.prix_achat) / form.prix_achat * 100) : 0

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
                <Package className="inline h-4 w-4 mr-1" />Materiau
              </button>
              <button type="button" onClick={() => setForm({ ...form, type: 'main_oeuvre' })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'main_oeuvre' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                <Wrench className="inline h-4 w-4 mr-1" />Main d'oeuvre
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Reference</label>
              <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div>
              <label className="label">Categorie</label>
              <CategoryInput value={form.categorie} onChange={(v) => setForm({ ...form, categorie: v })} categories={categories} />
            </div>
          </div>
          <div>
            <label className="label">Designation *</label>
            <input className="input" required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unite</label>
              <select className="input" value={form.unite} onChange={(e) => setForm({ ...form, unite: e.target.value })}>
                <option value="pce">pce</option>
                <option value="m">m</option>
                <option value="m²">m²</option>
                <option value="m³">m³</option>
                <option value="kg">kg</option>
                <option value="h">h</option>
                <option value="forfait">forfait</option>
                <option value="boîte">boite</option>
                <option value="paire">paire</option>
                <option value="lot">lot</option>
              </select>
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <input className="input" value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} placeholder="Nom du fournisseur" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Prix achat (CHF)</label>
              <input className="input" type="number" step="0.05" min="0" value={form.prix_achat} onChange={(e) => setForm({ ...form, prix_achat: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Prix vente (CHF)</label>
              <input className="input" type="number" step="0.05" min="0" value={form.prix_unitaire} onChange={(e) => setForm({ ...form, prix_unitaire: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Marge</label>
              <div className={`input flex items-center justify-center font-medium text-sm ${marge > 30 ? 'text-green-500' : marge > 15 ? 'text-yellow-500' : marge > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} style={{ cursor: 'default' }}>
                {form.prix_achat > 0 ? `${marge.toFixed(1)}%` : '-'}
              </div>
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

// -------------------------------------------------------------------
// Sort types
// -------------------------------------------------------------------
type SortField = 'designation' | 'prix_unitaire' | 'reference' | 'categorie'
type SortDir = 'asc' | 'desc'

// -------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------
export default function Catalogue() {
  const { data: items, refresh } = useApiData(() => window.api.catalogue.list())
  const { execute } = useApiCall()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [favOnly, setFavOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>('designation')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editing, setEditing] = useState<CatalogueItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [showCatDropdown, setShowCatDropdown] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setCreating(true)
    }
  }, [searchParams])

  // Extract unique categories
  const allCategories = [...new Set((items || []).map((i: CatalogueItem) => i.categorie).filter(Boolean))] as string[]
  allCategories.sort((a, b) => a.localeCompare(b))

  // Filter
  const filtered = (items || []).filter((item: CatalogueItem) => {
    const matchesSearch = (item.designation || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.categorie || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    const matchesCat = catFilter === 'all' || item.categorie === catFilter
    const matchesFav = !favOnly || item.is_favorite
    return matchesSearch && matchesType && matchesCat && matchesFav
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'prix_unitaire') {
      cmp = a.prix_unitaire - b.prix_unitaire
    } else {
      cmp = (a[sortField] || '').localeCompare(b[sortField] || '')
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  // Group by category
  const grouped = sorted.reduce((acc: Record<string, CatalogueItem[]>, item: CatalogueItem) => {
    const cat = item.categorie || 'Sans categorie'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const handleSave = async (data: Partial<CatalogueItem>) => {
    try {
      if (editing) {
        await execute(() => window.api.catalogue.update(editing.id, data))
        toast.success('Article mis a jour')
      } else {
        await execute(() => window.api.catalogue.create(data))
        toast.success('Article ajoute au catalogue')
      }
      setEditing(null)
      setCreating(false)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'operation')
    }
  }

  const handleDuplicate = async (item: CatalogueItem) => {
    try {
      await execute(() => window.api.catalogue.create({
        type: item.type,
        reference: item.reference ? item.reference + '-COPIE' : '',
        designation: item.designation + ' (copie)',
        unite: item.unite,
        prix_unitaire: item.prix_unitaire,
        categorie: item.categorie || ''
      }))
      toast.success('Article duplique')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la duplication')
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      await execute(() => window.api.catalogue.toggleFavorite(id))
      refresh()
    } catch {
      // silently ignore toggle errors
    }
  }

  const handleImportCsv = async () => {
    try {
      const result = await window.api.export.catalogueImportCsv()
      if (result.success) {
        toast.success(`${result.count} articles importes`)
        refresh()
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Erreur lors de l'import")
    }
  }

  const handleExportCsv = async () => {
    try {
      const result = await window.api.export.catalogueExportCsv()
      if (result.success) {
        toast.success('Catalogue exporte en CSV')
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Erreur lors de l'export")
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cet article ?')) {
      try {
        await execute(() => window.api.catalogue.delete(id))
        toast.success('Article supprime')
        refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      }
    }
  }

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors ${sortField === field ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {label}
      {sortField === field && <ArrowUpDown className="h-3 w-3" />}
    </button>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalogue</h1>
          <p className="page-subtitle">{filtered.length} / {(items || []).length} article{(items || []).length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImportCsv} className="btn-secondary text-sm">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>
          <button onClick={handleExportCsv} className="btn-secondary text-sm">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Nouvel article
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="search-bar flex-1">
          <Search className="search-icon" />
          <input className="search-input" placeholder="Rechercher designation, reference, categorie..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <Package className="h-3 w-3" /> Materiaux
          </button>
          <button
            onClick={() => setTypeFilter('main_oeuvre')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1 ${typeFilter === 'main_oeuvre' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Wrench className="h-3 w-3" /> Main d'oeuvre
          </button>
        </div>
      </div>

      {/* Category chips + Favorites filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFavOnly(!favOnly)}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-all flex items-center gap-1 ${favOnly ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500' : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          <Star className={`h-3 w-3 ${favOnly ? 'fill-yellow-500' : ''}`} />
          Favoris
        </button>
        <div className="w-px h-5 bg-border" />
        <button
          onClick={() => setCatFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${catFilter === 'all' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
        >
          Toutes categories
        </button>
        {allCategories.slice(0, 8).map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${catFilter === cat ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            {cat}
          </button>
        ))}
        {allCategories.length > 8 && (
          <div className="relative">
            <button
              onClick={() => setShowCatDropdown(!showCatDropdown)}
              className="rounded-full px-3 py-1 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
            >
              +{allCategories.length - 8} <ChevronDown className="h-3 w-3" />
            </button>
            {showCatDropdown && (
              <div className="absolute z-50 top-full left-0 mt-1 rounded-lg border border-border shadow-lg max-h-48 overflow-y-auto min-w-[160px]" style={{ background: 'hsl(var(--card))' }}>
                {allCategories.slice(8).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCatFilter(catFilter === cat ? 'all' : cat); setShowCatDropdown(false) }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors ${catFilter === cat ? 'text-primary font-medium' : 'text-foreground'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sort row */}
      <div className="mb-3 flex items-center gap-4 px-4">
        <span className="text-xs text-muted-foreground/60">Trier par:</span>
        <SortBtn field="designation" label="Designation" />
        <SortBtn field="prix_unitaire" label="Prix" />
        <SortBtn field="reference" label="Reference" />
        <SortBtn field="categorie" label="Categorie" />
      </div>

      {/* Grouped list */}
      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <Package className="empty-state-icon" />
          <p className="text-sm text-muted-foreground">Aucun article trouve</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryItems]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div className="wood-accent w-4" />
                <button
                  onClick={() => setCatFilter(catFilter === category ? 'all' : category)}
                  className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                >
                  {category}
                </button>
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{item.unite}</span>
                            {item.fournisseur && <span className="text-xs text-muted-foreground/50">| {item.fournisseur}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.prix_achat != null && item.prix_achat > 0 && (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${((item.prix_unitaire - item.prix_achat) / item.prix_achat * 100) > 30 ? 'bg-green-500/10 text-green-500' : ((item.prix_unitaire - item.prix_achat) / item.prix_achat * 100) > 15 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            +{((item.prix_unitaire - item.prix_achat) / item.prix_achat * 100).toFixed(0)}%
                          </span>
                        )}
                        <span className="font-medium text-sm text-foreground">{formatCHF(item.prix_unitaire)}</span>
                        <button onClick={() => handleToggleFavorite(item.id)} className={`rounded p-1.5 transition-colors ${item.is_favorite ? 'text-yellow-500' : 'text-muted-foreground/30 hover:text-yellow-500'}`} title={item.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                          <Star className={`h-4 w-4 ${item.is_favorite ? 'fill-yellow-500' : ''}`} />
                        </button>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDuplicate(item)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Dupliquer">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditing(item)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Modifier">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
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
        <ItemForm item={editing || undefined} categories={allCategories} onSave={handleSave} onCancel={() => { setCreating(false); setEditing(null) }} />
      )}
    </div>
  )
}
