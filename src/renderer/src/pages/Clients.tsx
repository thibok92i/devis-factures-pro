import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Phone, Mail, MapPin } from 'lucide-react'
import { useApiData, useApiCall } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import ClientForm from '../components/ClientForm'
import { clientDisplayName } from '../utils/format'
import type { Client } from '../types'

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
