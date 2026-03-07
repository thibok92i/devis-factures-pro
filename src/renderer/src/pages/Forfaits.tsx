import { useState, useEffect } from 'react'
import { Plus, Search, Pencil, Trash2, X, Layers, Package, Wrench } from 'lucide-react'
import { useApiData, useApiCall } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import { formatCHF } from '../utils/format'
import type { Forfait, ForfaitDetail, ForfaitLigne, CatalogueItem } from '../types'

interface EditableForfaitLigne {
  catalogue_item_id?: string
  designation: string
  description: string
  unite: string
  ratio: number
  prix_unitaire: number
}

function ForfaitForm({
  forfait,
  onSave,
  onCancel
}: {
  forfait?: ForfaitDetail
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [nom, setNom] = useState(forfait?.nom || '')
  const [description, setDescription] = useState(forfait?.description || '')
  const [uniteBase, setUniteBase] = useState(forfait?.unite_base || 'm²')
  const [lignes, setLignes] = useState<EditableForfaitLigne[]>(
    forfait?.lignes.map((l: ForfaitLigne) => ({
      catalogue_item_id: l.catalogue_item_id || undefined,
      designation: l.designation,
      description: l.description || '',
      unite: l.unite,
      ratio: l.ratio,
      prix_unitaire: l.prix_unitaire
    })) || []
  )
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
  const [showCatalogue, setShowCatalogue] = useState(false)
  const [catalogueSearch, setCatalogueSearch] = useState('')

  useEffect(() => {
    window.api.catalogue.list().then(setCatalogue)
  }, [])

  const addLine = () => {
    setLignes([...lignes, { designation: '', description: '', unite: 'pce', ratio: 1, prix_unitaire: 0 }])
  }

  const addFromCatalogue = (item: CatalogueItem) => {
    setLignes([...lignes, {
      catalogue_item_id: item.id,
      designation: item.designation,
      description: '',
      unite: item.unite,
      ratio: 1,
      prix_unitaire: item.prix_unitaire
    }])
  }

  const updateLine = (index: number, field: keyof EditableForfaitLigne, value: string | number) => {
    const updated = [...lignes]
    updated[index] = { ...updated[index], [field]: value }
    setLignes(updated)
  }

  const removeLine = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      nom,
      description,
      unite_base: uniteBase,
      lignes: lignes.map((l) => ({
        catalogue_item_id: l.catalogue_item_id || null,
        designation: l.designation,
        description: l.description || null,
        unite: l.unite,
        ratio: l.ratio,
        prix_unitaire: l.prix_unitaire
      }))
    })
  }

  const filteredCatalogue = catalogue.filter((item) =>
    item.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    item.reference.toLowerCase().includes(catalogueSearch.toLowerCase())
  )

  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{forfait ? 'Modifier le forfait' : 'Nouveau forfait'}</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Nom *</label>
              <input className="input" required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Pose parquet" />
            </div>
            <div>
              <label className="label">Unite de base</label>
              <select className="input" value={uniteBase} onChange={(e) => setUniteBase(e.target.value)}>
                <option value="m²">m²</option>
                <option value="m">m</option>
                <option value="m³">m³</option>
                <option value="pce">pce</option>
                <option value="kg">kg</option>
                <option value="h">h</option>
                <option value="forfait">forfait</option>
                <option value="module">module</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description optionnelle" />
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Lignes du forfait</label>
              <div className="flex gap-1">
                <button type="button" onClick={() => setShowCatalogue(!showCatalogue)} className="btn-secondary text-xs py-1 px-2">
                  <Package className="h-3.5 w-3.5" />
                  Catalogue
                </button>
                <button type="button" onClick={addLine} className="btn-secondary text-xs py-1 px-2">
                  <Plus className="h-3.5 w-3.5" />
                  Ligne libre
                </button>
              </div>
            </div>

            {/* Catalogue picker */}
            {showCatalogue && (
              <div className="mb-3 rounded-lg border border-border p-3" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
                <input
                  className="input text-sm mb-2"
                  placeholder="Rechercher dans le catalogue..."
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredCatalogue.slice(0, 20).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addFromCatalogue(item)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {item.type === 'materiau'
                          ? <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                          : <Wrench className="h-3.5 w-3.5 text-accent shrink-0" />
                        }
                        <span className="truncate">{item.designation}</span>
                        {item.reference && <span className="text-xs text-muted-foreground">({item.reference})</span>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatCHF(item.prix_unitaire)}/{item.unite}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lines table */}
            {lignes.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Designation</th>
                      <th className="px-3 py-2 text-center text-xs font-medium uppercase text-muted-foreground w-16">Unite</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground w-20">Ratio</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground w-24">Prix unit.</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lignes.map((ligne, index) => (
                      <tr key={index}>
                        <td className="px-3 py-1.5">
                          <input
                            className="w-full bg-transparent text-sm outline-none text-foreground"
                            value={ligne.designation}
                            onChange={(e) => updateLine(index, 'designation', e.target.value)}
                            placeholder="Designation"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <select
                            className="w-full bg-transparent text-sm outline-none text-center text-foreground"
                            value={ligne.unite}
                            onChange={(e) => updateLine(index, 'unite', e.target.value)}
                          >
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
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className="w-full bg-transparent text-sm outline-none text-right text-foreground"
                            type="number"
                            step="0.01"
                            min="0"
                            value={ligne.ratio}
                            onChange={(e) => updateLine(index, 'ratio', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            className="w-full bg-transparent text-sm outline-none text-right text-foreground"
                            type="number"
                            step="0.05"
                            min="0"
                            value={ligne.prix_unitaire}
                            onChange={(e) => updateLine(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button type="button" onClick={() => removeLine(index)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune ligne. Ajoutez depuis le catalogue ou manuellement.</p>
            )}
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

export default function Forfaits() {
  const { data: forfaits, refresh } = useApiData(() => window.api.forfaits.list())
  const { execute } = useApiCall()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ForfaitDetail | null>(null)

  const filtered = (forfaits || []).filter((f: Forfait) =>
    f.nom.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = async (id: string) => {
    const detail = await window.api.forfaits.get(id)
    if (detail) setEditing(detail)
  }

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editing) {
        await execute(() => window.api.forfaits.update(editing.id, data))
        toast.success('Forfait mis a jour')
      } else {
        await execute(() => window.api.forfaits.create(data))
        toast.success('Forfait cree')
      }
      setEditing(null)
      setCreating(false)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'operation")
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce forfait ?')) {
      try {
        await execute(() => window.api.forfaits.delete(id))
        toast.success('Forfait supprime')
        refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
      }
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Forfaits</h1>
          <p className="page-subtitle">{(forfaits || []).length} pack{(forfaits || []).length > 1 ? 's' : ''} de materiaux + main d'oeuvre</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau forfait
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="search-bar flex-1">
          <Search className="search-icon" />
          <input className="search-input" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <Layers className="empty-state-icon" />
          <p className="text-sm text-muted-foreground">Aucun forfait trouve</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f: Forfait) => (
            <div key={f.id} className="card flex items-center justify-between group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{f.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.description && <span>{f.description} · </span>}
                    Unite: {f.unite_base} · {f.ligne_count || 0} ligne{(f.ligne_count || 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(f.id)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Modifier">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(f.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <ForfaitForm
          forfait={editing || undefined}
          onSave={handleSave}
          onCancel={() => { setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
