import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, X, Phone, Mail, MapPin } from 'lucide-react'
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
    <div className="modal-overlay">
      <div className="modal w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{client ? 'Modifier le client' : 'Nouveau client'}</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
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

  const getInitials = (client: Client) => {
    if (client.entreprise) return client.entreprise.substring(0, 2).toUpperCase()
    return ((client.prenom?.[0] || '') + (client.nom?.[0] || '')).toUpperCase() || '?'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{(clients || []).length} client{(clients || []).length > 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="search-bar mb-6">
        <Search className="search-icon" />
        <input
          className="search-input"
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client cards grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span className="text-2xl">👤</span>
          </div>
          <p className="text-sm text-muted-foreground">Aucun client trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client: Client) => (
            <div
              key={client.id}
              className="card card-hover cursor-pointer group"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  {getInitials(client)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate">{clientDisplayName(client)}</h3>
                  {client.entreprise && client.nom && (
                    <p className="text-xs text-muted-foreground truncate">{client.prenom} {client.nom}</p>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="mt-3 space-y-1.5">
                {client.telephone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{client.telephone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {(client.ville || client.npa) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{client.npa} {client.ville}</span>
                  </div>
                )}
              </div>

              {/* Hover actions */}
              <div className="mt-3 pt-3 border-t border-border flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setEditing(client)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Modifier">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(client.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
