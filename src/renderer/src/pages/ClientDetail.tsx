import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Receipt, Pencil, Plus, Mail, Phone, MapPin } from 'lucide-react'
import { useToast } from '../components/Toast'
import ClientForm from '../components/ClientForm'
import {
  formatCHF,
  formatDate,
  clientDisplayName,
  devisStatutLabel,
  devisStatutColor,
  factureStatutLabel,
  factureStatutColor
} from '../utils/format'
import type { Client, DevisWithClient, FactureWithClient } from '../types'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [devis, setDevis] = useState<DevisWithClient[]>([])
  const [factures, setFactures] = useState<FactureWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  const loadData = async () => {
    if (!id) return
    try {
      const [clientData, allDevis, allFactures] = await Promise.all([
        window.api.clients.get(id),
        window.api.devis.list(),
        window.api.factures.list()
      ])
      setClient(clientData)
      setDevis((allDevis || []).filter((d: DevisWithClient) => d.client_id === id))
      setFactures((allFactures || []).filter((f: FactureWithClient) => f.client_id === id))
    } catch {
      toast.error('Erreur lors du chargement du client')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handleEditSave = async (data: Partial<Client>) => {
    if (!id) return
    try {
      await window.api.clients.update(id, data)
      toast.success('Client mis à jour')
      setEditing(false)
      loadData()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="empty-state">
        <p className="text-sm text-muted-foreground mb-4">Client introuvable</p>
        <button onClick={() => navigate('/clients')} className="btn-primary">Retour aux clients</button>
      </div>
    )
  }

  const totalFacture = factures.reduce((sum, f) => sum + f.total, 0)
  const totalPaye = factures.filter((f) => f.statut === 'payee').reduce((sum, f) => sum + f.total, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {client.entreprise
                ? client.entreprise.substring(0, 2).toUpperCase()
                : ((client.prenom?.[0] || '') + (client.nom?.[0] || '')).toUpperCase()
              }
            </div>
            <h1 className="page-title mb-0">{clientDisplayName(client)}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="btn-secondary"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </button>
          <button onClick={() => navigate('/devis?action=new')} className="btn-primary">
            <Plus className="h-4 w-4" />
            Nouveau devis
          </button>
        </div>
      </div>

      {/* Info + Stats grid */}
      <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
        {/* Client info card */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Informations client</h3>
          <div className="space-y-3">
            {client.entreprise && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground/70">Entreprise</span>
                <p className="font-medium text-foreground">{client.entreprise}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Nom</span>
              <p className="font-medium text-foreground">{[client.prenom, client.nom].filter(Boolean).join(' ')}</p>
            </div>
            {client.adresse && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">{client.adresse}</p>
                  <p className="text-sm text-foreground">{client.npa} {client.ville}</p>
                </div>
              </div>
            )}
            {client.telephone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-foreground">{client.telephone}</p>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-foreground">{client.email}</p>
              </div>
            )}
            {client.notes && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground/70">Notes</span>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Summary stats card */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Résumé</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg p-4" style={{ background: 'hsl(var(--primary) / 0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Devis</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{devis.length}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'hsl(145 60% 40% / 0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4" style={{ color: 'hsl(145 60% 40%)' }} />
                <span className="text-sm text-muted-foreground">Factures</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{factures.length}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'hsl(35 80% 50% / 0.08)' }}>
              <span className="text-sm text-muted-foreground">Total facturé</span>
              <p className="text-lg font-bold text-foreground">{formatCHF(totalFacture)}</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'hsl(145 60% 40% / 0.08)' }}>
              <span className="text-sm text-muted-foreground">Total payé</span>
              <p className="text-lg font-bold" style={{ color: 'hsl(145 60% 40%)' }}>{formatCHF(totalPaye)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Devis section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="wood-accent w-4" />
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Devis
          </h2>
        </div>
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">N°</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {devis.map((d) => (
                <tr key={d.id} className="table-row cursor-pointer" onClick={() => navigate(`/devis/${d.id}`)}>
                  <td className="px-4 py-3 font-medium text-primary">{d.numero}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(d.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${devisStatutColor(d.statut)}`}>{devisStatutLabel(d.statut)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">{formatCHF(d.total)}</td>
                </tr>
              ))}
              {devis.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucun devis pour ce client
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Factures section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="wood-accent w-4" />
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5" style={{ color: 'hsl(145 60% 40%)' }} />
            Factures
          </h2>
        </div>
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">N°</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Échéance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {factures.map((f) => (
                <tr key={f.id} className="table-row cursor-pointer" onClick={() => navigate(`/factures/${f.id}`)}>
                  <td className="px-4 py-3 font-medium text-primary">{f.numero}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(f.date)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(f.echeance)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${factureStatutColor(f.statut)}`}>{factureStatutLabel(f.statut)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">{formatCHF(f.total)}</td>
                </tr>
              ))}
              {factures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Aucune facture pour ce client
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <ClientForm
          client={client}
          onSave={handleEditSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  )
}
