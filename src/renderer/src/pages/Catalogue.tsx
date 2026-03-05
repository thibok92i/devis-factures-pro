import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, X, Package, Wrench } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{item ? 'Modifier' : 'Nouvel article'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <div>
            <label className="label">Type *</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm({ ...form, type: 'materiau' })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'materiau' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <Package className="inline h-4 w-4 mr-1" />Matériau
              </button>
              <button type="button" onClick={() => setForm({ ...form, type: 'main_oeuvre' })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.type === 'main_oeuvre' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
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

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer cet article ?')) {
      await execute(() => window.api.catalogue.delete(id))
      toast.success('Article supprimé')
      refresh()
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Catalogue</h1>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouvel article
        </button>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Tous les types</option>
          <option value="materiau">Matériaux</option>
          <option value="main_oeuvre">Main d'oeuvre</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Réf.</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Désignation</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Catégorie</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Unité</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Prix</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((item: CatalogueItem) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {item.type === 'materiau' ? (
                    <span className="badge badge-blue"><Package className="inline h-3 w-3 mr-1" />Matériau</span>
                  ) : (
                    <span className="badge badge-yellow"><Wrench className="inline h-3 w-3 mr-1" />Main d'oeuvre</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.reference}</td>
                <td className="px-4 py-3 text-sm font-medium">{item.designation}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.categorie || '-'}</td>
                <td className="px-4 py-3 text-center text-sm">{item.unite}</td>
                <td className="px-4 py-3 text-right font-medium text-sm">{formatCHF(item.prix_unitaire)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(item)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Aucun article</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <ItemForm item={editing || undefined} onSave={handleSave} onCancel={() => { setCreating(false); setEditing(null) }} />
      )}
    </div>
  )
}
