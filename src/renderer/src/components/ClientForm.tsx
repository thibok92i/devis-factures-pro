import { useState } from 'react'
import { X } from 'lucide-react'
import type { Client } from '../types'

interface ClientFormProps {
  client?: Client
  onSave: (data: Partial<Client>) => void
  onCancel: () => void
  inline?: boolean // if true, renders without modal overlay
}

export default function ClientForm({ client, onSave, onCancel, inline }: ClientFormProps) {
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

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nom *</label>
          <input className="input" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} autoFocus />
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
      {!inline && (
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Annuler</button>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </div>
    </form>
  )

  if (inline) {
    return (
      <div className="border border-border rounded-lg p-4 mt-3" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Nouveau client</h4>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {formContent}
      </div>
    )
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
        {formContent}
      </div>
    </div>
  )
}
