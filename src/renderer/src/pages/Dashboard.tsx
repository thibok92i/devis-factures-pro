import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, Receipt, TrendingUp, Clock, Plus, ArrowRight, Package } from 'lucide-react'
import { formatCHF, formatDate, clientDisplayName, devisStatutLabel, devisStatutColor, factureStatutLabel, factureStatutColor } from '../utils/format'
import type { DashboardStats } from '../types'

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
    return <div className="flex items-center justify-center h-64 text-gray-500">Chargement...</div>
  }

  const devisTotal = stats.devisStats.reduce((sum, s) => sum + s.count, 0)
  const facturesTotal = stats.factureStats.reduce((sum, s) => sum + s.count, 0)

  return (
    <div>
      {/* Header with quick actions */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de votre activit&eacute;</p>
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
        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/clients')}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
            </div>
          </div>
        </div>

        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/devis')}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Devis</p>
              <p className="text-2xl font-bold text-gray-900">{devisTotal}</p>
            </div>
          </div>
        </div>

        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/factures')}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-gray-900">{formatCHF(stats.chiffreAffaires)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-gray-900">{formatCHF(stats.enAttente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent devis - takes 2 cols */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Derniers devis</h3>
            <button onClick={() => navigate('/devis')} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {recentDevis.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucun devis</p>
              <button onClick={() => navigate('/devis?action=new')} className="btn-primary mt-3 text-sm">
                <Plus className="h-3.5 w-3.5" /> Cr&eacute;er un devis
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentDevis.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-3 cursor-pointer hover:bg-gray-50 -mx-4 px-4 rounded" onClick={() => navigate(`/devis/${d.id}`)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-blue-600 text-sm">{d.numero}</span>
                    <span className="text-sm text-gray-700 truncate">{clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })}</span>
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
            <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wider">Devis par statut</h3>
            {stats.devisStats.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun devis</p>
            ) : (
              <div className="space-y-2">
                {stats.devisStats.map((s) => (
                  <div key={s.statut} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{s.statut}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{s.count}</span>
                      <span className="text-xs text-gray-400">{formatCHF(s.total || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 uppercase tracking-wider">Factures par statut</h3>
            {stats.factureStats.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune facture</p>
            ) : (
              <div className="space-y-2">
                {stats.factureStats.map((s) => (
                  <div key={s.statut} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{s.statut}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{s.count}</span>
                      <span className="text-xs text-gray-400">{formatCHF(s.total || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent factures compact */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Derni&egrave;res factures</h3>
              <button onClick={() => navigate('/factures')} className="text-xs text-blue-600 hover:text-blue-800">Voir tout</button>
            </div>
            {recentFactures.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune facture</p>
            ) : (
              <div className="space-y-2">
                {recentFactures.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded" onClick={() => navigate(`/factures/${f.id}`)}>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-blue-600">{f.numero}</span>
                      <span className="text-xs text-gray-500 ml-2 truncate">{clientDisplayName({ nom: f.client_nom, prenom: f.client_prenom, entreprise: f.client_entreprise })}</span>
                    </div>
                    <span className={`badge text-xs ${factureStatutColor(f.statut)}`}>{factureStatutLabel(f.statut)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Astuce : Appuyez sur <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono">Ctrl+K</kbd> pour rechercher rapidement
        </p>
      </div>
    </div>
  )
}
