import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Receipt, Pencil, Plus, Mail, Phone, MapPin, Building2, Clock } from 'lucide-react'
import { useToast } from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import Breadcrumbs from '../components/Breadcrumbs'
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
      const result = await window.api.clients.update(id, data)
      if (result && typeof result === 'object' && 'success' in result && !result.success) {
        toast.error(String((result as Record<string, unknown>).error || 'Erreur de validation'))
        return
      }
      toast.success('Client mis à jour')
      setEditing(false)
      loadData()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  if (loading) return <SkeletonList />

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
      <Breadcrumbs items={[{ label: 'Clients', to: '/clients' }, { label: clientDisplayName(client) }]} />

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
            {(client.numero_ide || client.numero_tva) && (
              <div className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  {client.numero_ide && <p className="text-sm text-foreground">IDE: {client.numero_ide}</p>}
                  {client.numero_tva && <p className="text-sm text-foreground">TVA: {client.numero_tva}</p>}
                </div>
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

      {/* Chronological timeline */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="wood-accent w-4" />
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Historique
          </h2>
        </div>
        {(() => {
          const timeline = [
            ...devis.map(d => ({ type: 'devis' as const, date: d.date, id: d.id, numero: d.numero, statut: d.statut, total: d.total })),
            ...factures.map(f => ({ type: 'facture' as const, date: f.date, id: f.id, numero: f.numero, statut: f.statut, total: f.total }))
          ].sort((a, b) => b.date.localeCompare(a.date))

          if (timeline.length === 0) {
            return (
              <div className="card text-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun document pour ce client</p>
              </div>
            )
          }

          return (
            <div className="space-y-2">
              {timeline.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.type === 'devis' ? `/devis/${item.id}` : `/factures/${item.id}`)}
                  className="card card-hover cursor-pointer flex items-center gap-4 py-3"
                >
                  <div className="shrink-0">
                    {item.type === 'devis' ? (
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'hsl(145 60% 40% / 0.1)' }}>
                        <Receipt className="h-4 w-4" style={{ color: 'hsl(145 60% 40%)' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary">{item.numero}</span>
                      <span className={`badge ${item.type === 'devis' ? devisStatutColor(item.statut) : factureStatutColor(item.statut)}`}>
                        {item.type === 'devis' ? devisStatutLabel(item.statut) : factureStatutLabel(item.statut)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{formatCHF(item.total)}</span>
                </div>
              ))}
            </div>
          )
        })()}
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
