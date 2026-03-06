import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, Receipt, TrendingUp, Clock, Plus, ArrowRight, Package } from 'lucide-react'
import { formatCHF, formatDate, clientDisplayName, devisStatutLabel, devisStatutColor, factureStatutLabel, factureStatutColor } from '../utils/format'
import type { DashboardStats } from '../types'

const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentDevis, setRecentDevis] = useState<any[]>([])
  const [recentFactures, setRecentFactures] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    window.api.dashboard.stats().then(setStats)
    window.api.devis.list().then((list: any[]) => setRecentDevis((list || []).slice(0, 5)))
    window.api.factures.list().then((list: any[]) => setRecentFactures((list || []).slice(0, 5)))
  }, [])

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  const devisTotal = stats.devisStats.reduce((sum, s) => sum + s.count, 0)
  const today = new Date()
  const dayName = dayNames[today.getDay()]

  return (
    <div className="flex flex-col min-h-[calc(100vh-7rem)]">
      {/* Header with greeting */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">
            Bon {dayName} ! Voici votre activité.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/clients?action=new')} className="btn-secondary text-sm">
            <Plus className="h-3.5 w-3.5" /> Client
          </button>
          <button onClick={() => navigate('/catalogue?action=new')} className="btn-secondary text-sm">
            <Package className="h-3.5 w-3.5" /> Article
          </button>
          <button onClick={() => navigate('/devis?action=new')} className="btn-primary">
            <Plus className="h-4 w-4" /> Nouveau devis
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card cursor-pointer" onClick={() => navigate('/clients')}>
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(var(--primary) / 0.12)' }}>
              <Users className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clients</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
            </div>
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/devis')}>
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(35 80% 50% / 0.12)' }}>
              <FileText className="h-5 w-5" style={{ color: 'hsl(35 80% 50%)' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Devis</p>
              <p className="text-2xl font-bold text-foreground">{devisTotal}</p>
            </div>
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/factures')}>
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(145 60% 40% / 0.12)' }}>
              <TrendingUp className="h-5 w-5" style={{ color: 'hsl(145 60% 40%)' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-foreground">{formatCHF(stats.chiffreAffaires)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(0 70% 55% / 0.12)' }}>
              <Clock className="h-5 w-5" style={{ color: 'hsl(0 70% 55%)' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="text-2xl font-bold text-foreground">{formatCHF(stats.enAttente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1">
        {/* Recent devis - takes 2 cols */}
        <div className="lg:col-span-2 card flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Derniers devis</h3>
            <button onClick={() => navigate('/devis')} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {recentDevis.length === 0 ? (
            <div className="empty-state flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="empty-state-icon" />
                <p className="text-sm text-muted-foreground mb-3">Aucun devis</p>
                <button onClick={() => navigate('/devis?action=new')} className="btn-primary text-sm">
                  <Plus className="h-3.5 w-3.5" /> Créer un devis
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentDevis.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded transition-colors" onClick={() => navigate(`/devis/${d.id}`)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-primary text-sm">{d.numero}</span>
                    <span className="text-sm text-foreground truncate">{clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`badge text-xs ${devisStatutColor(d.statut)}`}>{devisStatutLabel(d.statut)}</span>
                    <span className="font-medium text-sm w-24 text-right">{formatCHF(d.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - stats par statut */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">Devis par statut</h3>
            {stats.devisStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun devis</p>
            ) : (
              <div className="space-y-2">
                {stats.devisStats.map((s) => (
                  <div key={s.statut} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">{s.statut}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.count}</span>
                      <span className="text-xs text-muted-foreground">{formatCHF(s.total || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-foreground uppercase tracking-wider">Factures par statut</h3>
            {stats.factureStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture</p>
            ) : (
              <div className="space-y-2">
                {stats.factureStats.map((s) => (
                  <div key={s.statut} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">{s.statut}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.count}</span>
                      <span className="text-xs text-muted-foreground">{formatCHF(s.total || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent factures compact */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Dernières factures</h3>
              <button onClick={() => navigate('/factures')} className="text-xs text-primary hover:text-primary/80 transition-colors">Voir tout</button>
            </div>
            {recentFactures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture</p>
            ) : (
              <div className="space-y-2">
                {recentFactures.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded transition-colors" onClick={() => navigate(`/factures/${f.id}`)}>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-primary">{f.numero}</span>
                      <span className="text-xs text-muted-foreground ml-2 truncate">{clientDisplayName({ nom: f.client_nom, prenom: f.client_prenom, entreprise: f.client_entreprise })}</span>
                    </div>
                    <span className={`badge text-xs ${factureStatutColor(f.statut)}`}>{factureStatutLabel(f.statut)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wood accent footer */}
      <div className="mt-auto pt-8 flex items-center justify-center gap-3">
        <div className="wood-accent flex-1" />
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          Astuce : <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Ctrl+K</kbd> pour rechercher
        </p>
        <div className="wood-accent flex-1" />
      </div>
    </div>
  )
}
