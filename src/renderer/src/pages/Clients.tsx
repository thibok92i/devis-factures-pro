import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, X, Eye } from 'lucide-react'
import { useApiData, useApiCall } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import { clientDisplayName } from '../utils/format'
import type { Client } from '../types'

function ClientForm({
  client,
  onSave,
  onCancel
}: {
  client?: Client
  onSave: (data: Partial<Client>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    nom: client?.nom || '',
    prenom: client?.prenom || '',
    entreprise: client?.entreprise || '',
    adresse: client?.adresse || '',
    npa: client?.npa || '',
    ville: client?.ville || '',
    telephone: client?.telephone || '',
    email: client?.email || '',
    notes: client?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{client ? 'Modifier le client' : 'Nouveau client'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nom *</label>
              <input className="input" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Entreprise</label>
            <input className="input" value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">NPA</label>
              <input className="input" value={form.npa} onChange={(e) => setForm({ ...form, npa: e.target.value })} />
            </div>
            <div>
              <label className="label">Ville</label>
              <input className="input" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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

export default function Clients() {
  const { data: clients, refresh } = useApiData(() => window.api.clients.list())
  const { execute } = useApiCall()
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Client | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    if (params.get('action') === 'new') setCreating(true)
  }, [])

  const filtered = (clients || []).filter((c: Client) =>
    clientDisplayName(c).toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (data: Partial<Client>) => {
    try {
      if (editing) {
        await execute(() => window.api.clients.update(editing.id, data))
        toast.success('Client mis à jour')
      } else {
        await execute(() => window.api.clients.create(data))
        toast.success('Client créé avec succès')
      }
      setEditing(null)
      setCreating(false)
      refresh()
    } catch {
      toast.error('Erreur lors de l\'opération')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce client ?')) {
      try {
        await execute(() => window.api.clients.delete(id))
        toast.success('Client supprimé')
        refresh()
      } catch {
        toast.error('Erreur lors de l\'opération')
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client list */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Client</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Adresse</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contact</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((client: Client) => (
              <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                <td className="px-4 py-3">
                  <div className="font-medium text-blue-600 hover:text-blue-800">{clientDisplayName(client)}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {client.adresse && `${client.adresse}, `}{client.npa} {client.ville}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {client.telephone && <div>{client.telephone}</div>}
                  {client.email && <div>{client.email}</div>}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => navigate(`/clients/${client.id}`)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Voir détails">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditing(client)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600" title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  Aucun client trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {(creating || editing) && (
        <ClientForm
          client={editing || undefined}
          onSave={handleSave}
          onCancel={() => { setCreating(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
