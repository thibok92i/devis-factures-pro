import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, TrendingUp, Clock, Plus, ArrowRight, Package, AlertTriangle, Target, ArrowUpRight, ArrowDownRight, CalendarClock, RefreshCw } from 'lucide-react'
import { SkeletonDashboard } from '../components/Skeleton'
import { formatCHF, clientDisplayName, devisStatutLabel, devisStatutColor, factureStatutLabel, factureStatutColor } from '../utils/format'
import type { DashboardStats, DevisWithClient, FactureWithClient } from '../types'

const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

interface MonthlyData {
  mois: string
  encaisse: number
  facture: number
}

// ─── Revenue Chart with optional N-1 comparison ───────────────
function RevenueChart({ data, dataPrev }: { data: MonthlyData[]; dataPrev?: MonthlyData[] }) {
  if (data.length === 0) return null

  const allVals = [...data.map((d) => Math.max(d.encaisse, d.facture))]
  if (dataPrev) allVals.push(...dataPrev.map((d) => Math.max(d.encaisse, d.facture)))
  const maxVal = Math.max(...allVals, 1)
  const chartH = 160
  const barW = Math.min(28, Math.floor(500 / data.length) - 8)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Chiffre d'affaires mensuel</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(152 45% 28%)' }} />
            Encaissé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(152 45% 28% / 0.25)' }} />
            Facturé
          </span>
          {dataPrev && dataPrev.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border-2 border-dashed" style={{ borderColor: 'hsl(var(--muted-foreground))' }} />
              N-1
            </span>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${data.length * (barW + 8) + 40} ${chartH + 40}`} className="min-w-[400px]">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = chartH - chartH * pct + 10
            return (
              <g key={pct}>
                <line x1="35" y1={y} x2={data.length * (barW + 8) + 35} y2={y} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray={pct === 0 ? '' : '4,4'} />
                {pct > 0 && (
                  <text x="32" y={y + 3} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">
                    {Math.round(maxVal * pct)}
                  </text>
                )}
              </g>
            )
          })}
          {/* N-1 ghost bars */}
          {dataPrev && dataPrev.map((d, i) => {
            const x = i * (barW + 8) + 40
            const hEnc = (d.encaisse / maxVal) * chartH
            return (
              <g key={`prev-${d.mois}`} opacity={0.3}>
                <rect x={x + 2} y={chartH - hEnc + 10} width={barW - 4} height={hEnc} rx="2"
                  fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="3,3" />
              </g>
            )
          })}
          {/* Current year bars */}
          {data.map((d, i) => {
            const x = i * (barW + 8) + 40
            const hFact = (d.facture / maxVal) * chartH
            const hEnc = (d.encaisse / maxVal) * chartH
            const month = parseInt(d.mois.split('-')[1]) - 1
            return (
              <g key={d.mois}>
                <rect x={x} y={chartH - hFact + 10} width={barW} height={hFact} rx="3" fill="hsl(152 45% 28% / 0.2)" />
                <rect x={x} y={chartH - hEnc + 10} width={barW} height={hEnc} rx="3" fill="hsl(152 45% 28%)" />
                <text x={x + barW / 2} y={chartH + 24} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
                  {monthNames[month]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── Trend indicator (↑ / ↓ %) ──────────────────────────────
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const isUp = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentDevis, setRecentDevis] = useState<DevisWithClient[]>([])
  const [recentFactures, setRecentFactures] = useState<FactureWithClient[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [monthlyDataPrev, setMonthlyDataPrev] = useState<MonthlyData[]>([])
  const [overdueFactures, setOverdueFactures] = useState<FactureWithClient[]>([])
  const [allDevis, setAllDevis] = useState<DevisWithClient[]>([])
  const [allFactures, setAllFactures] = useState<FactureWithClient[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-detect overdue invoices then load everything
    window.api.factures.checkOverdue().then(() => {
      window.api.factures.overdue().then((list: FactureWithClient[]) => setOverdueFactures(list || []))
      window.api.dashboard.stats().then(setStats)
      window.api.factures.list().then((list: FactureWithClient[]) => {
        setAllFactures(list || [])
        setRecentFactures((list || []).slice(0, 5))
      })
    })
    window.api.devis.list().then((list: DevisWithClient[]) => {
      setAllDevis(list || [])
      setRecentDevis((list || []).slice(0, 5))
    })
    window.api.dashboard.monthlyRevenue().then((data: MonthlyData[]) => setMonthlyData(data || []))
    // Try to load N-1 data for comparison
    try {
      window.api.dashboard.monthlyRevenue(new Date().getFullYear() - 1).then((data: MonthlyData[]) => {
        setMonthlyDataPrev(data || [])
      }).catch(() => { /* N-1 not available */ })
    } catch { /* N-1 api not available yet */ }
  }, [])

  // ─── Computed: CA prévisionnel ──────────────────────────────
  const caPrevu = useMemo(() => {
    if (!allDevis.length) return 0
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    const recentDevisAll = allDevis.filter(d => new Date(d.date) >= sixMonthsAgo)
    const accepted = recentDevisAll.filter(d => d.statut === 'accepte').length
    const sent = recentDevisAll.filter(d => d.statut === 'envoye' || d.statut === 'accepte' || d.statut === 'refuse').length
    const conversionRate = sent > 0 ? accepted / sent : 0.5

    const pendingTotal = allDevis
      .filter(d => d.statut === 'envoye')
      .reduce((sum, d) => sum + d.total, 0)

    return pendingTotal * conversionRate
  }, [allDevis])

  // ─── Computed: Tâches / échéances ──────────────────────────
  const tasks = useMemo(() => {
    const items: { label: string; sub: string; type: 'warning' | 'danger' | 'info'; onClick: () => void }[] = []
    const now = Date.now()
    const day = 86400000

    // Devis envoyés depuis > 7 jours (relancer ?)
    allDevis.filter(d => d.statut === 'envoye').forEach(d => {
      const sent = new Date(d.date).getTime()
      if (now - sent > 7 * day) {
        const daysAgo = Math.floor((now - sent) / day)
        items.push({
          label: `${d.numero} — relancer ?`,
          sub: `Envoyé il y a ${daysAgo}j`,
          type: 'warning',
          onClick: () => navigate(`/devis/${d.id}`)
        })
      }
    })

    // Devis qui expirent bientôt (< 7 jours)
    allDevis.filter(d => d.statut === 'envoye' || d.statut === 'brouillon').forEach(d => {
      if (!d.validite) return
      const exp = new Date(d.validite).getTime()
      const daysLeft = Math.floor((exp - now) / day)
      if (daysLeft >= 0 && daysLeft < 7) {
        items.push({
          label: `${d.numero} — expire ${daysLeft === 0 ? "aujourd'hui" : `dans ${daysLeft}j`}`,
          sub: clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise }),
          type: daysLeft <= 2 ? 'danger' : 'info',
          onClick: () => navigate(`/devis/${d.id}`)
        })
      }
    })

    // Factures dont l'échéance approche (< 5 jours)
    allFactures.filter(f => f.statut === 'envoyee').forEach(f => {
      const due = new Date(f.echeance).getTime()
      const daysLeft = Math.floor((due - now) / day)
      if (daysLeft >= 0 && daysLeft < 5) {
        items.push({
          label: `${f.numero} — échéance ${daysLeft === 0 ? "aujourd'hui" : `dans ${daysLeft}j`}`,
          sub: formatCHF(f.total),
          type: daysLeft <= 1 ? 'danger' : 'warning',
          onClick: () => navigate(`/factures/${f.id}`)
        })
      }
    })

    return items.slice(0, 8)
  }, [allDevis, allFactures, navigate])

  // ─── Computed: Tendances mois courant vs précédent ─────────
  const trends = useMemo(() => {
    if (monthlyData.length < 2) return null
    const current = monthlyData[monthlyData.length - 1]
    const previous = monthlyData[monthlyData.length - 2]
    return { current, previous }
  }, [monthlyData])

  if (!stats) return <SkeletonDashboard />

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

      {/* Overdue invoices alert */}
      {overdueFactures.length > 0 && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-destructive mb-2">
                {overdueFactures.length} facture{overdueFactures.length > 1 ? 's' : ''} en retard de paiement
              </h3>
              <div className="space-y-1.5">
                {overdueFactures.slice(0, 5).map((f) => {
                  const days = Math.floor((Date.now() - new Date(f.echeance).getTime()) / 86400000)
                  const clientName = f.client_entreprise || [f.client_prenom, f.client_nom].filter(Boolean).join(' ')
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between text-sm cursor-pointer hover:bg-destructive/10 -mx-2 px-2 py-1 rounded transition-colors"
                      onClick={() => navigate(`/factures/${f.id}`)}
                    >
                      <span className="text-foreground">
                        <span className="font-medium text-primary">{f.numero}</span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span>{clientName}</span>
                      </span>
                      <span className="text-destructive font-medium shrink-0 ml-3">
                        {formatCHF(f.total)} · {days}j de retard
                      </span>
                    </div>
                  )
                })}
                {overdueFactures.length > 5 && (
                  <button onClick={() => navigate('/factures')} className="text-xs text-destructive hover:underline mt-1">
                    + {overdueFactures.length - 5} autre{overdueFactures.length - 5 > 1 ? 's' : ''}...
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards — 5 cards now */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-foreground">{formatCHF(stats.chiffreAffaires)}</p>
                {trends && <TrendBadge current={trends.current.encaisse} previous={trends.previous.encaisse} />}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/factures')}>
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

        {/* CA Prévisionnel — NEW */}
        <div className="stat-card cursor-pointer" onClick={() => navigate('/devis')}>
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(260 60% 55% / 0.12)' }}>
              <Target className="h-5 w-5" style={{ color: 'hsl(260 60% 55%)' }} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CA prévisionnel</p>
              <p className="text-2xl font-bold text-foreground">{formatCHF(caPrevu)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue chart with N-1 comparison */}
      {monthlyData.length > 0 && (
        <div className="mb-8">
          <RevenueChart data={monthlyData} dataPrev={monthlyDataPrev.length > 0 ? monthlyDataPrev : undefined} />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1">
        {/* Recent devis - takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card flex flex-col">
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
                {recentDevis.map((d) => (
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

          {/* Tasks / To-do widget — NEW */}
          {tasks.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">À faire</h3>
              </div>
              <div className="space-y-1.5">
                {tasks.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded transition-colors"
                    onClick={t.onClick}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        t.type === 'danger' ? 'bg-destructive' : t.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-sm text-foreground truncate">{t.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{t.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity timeline + Material/Labor donut */}
          <div className="grid grid-cols-2 gap-6">
            {/* Recent activity */}
            <div className="card">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Dernières activités</h3>
              {(() => {
                const activities: { icon: string; label: string; time: string; color: string }[] = []
                const timeAgo = (d: string) => {
                  const diff = Date.now() - new Date(d).getTime()
                  const mins = Math.floor(diff / 60000)
                  if (mins < 60) return `il y a ${mins}min`
                  const hrs = Math.floor(mins / 60)
                  if (hrs < 24) return `il y a ${hrs}h`
                  const days = Math.floor(hrs / 24)
                  return `il y a ${days}j`
                }
                // Last created devis
                if (allDevis.length > 0) {
                  const d = allDevis[0]
                  activities.push({ icon: '📝', label: `Devis ${d.numero} créé`, time: timeAgo(d.created_at), color: 'text-primary' })
                }
                // Last paid facture
                const paidFactures = allFactures.filter(f => f.statut === 'payee' && f.date_paiement)
                  .sort((a, b) => (b.date_paiement || '').localeCompare(a.date_paiement || ''))
                if (paidFactures.length > 0) {
                  const f = paidFactures[0]
                  activities.push({ icon: '✅', label: `Facture ${f.numero} payée`, time: timeAgo(f.date_paiement || f.updated_at), color: 'text-emerald-600' })
                }
                // Last created facture
                const sentFactures = allFactures.filter(f => f.statut === 'envoyee')
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                if (sentFactures.length > 0) {
                  const f = sentFactures[0]
                  activities.push({ icon: '📤', label: `Facture ${f.numero} envoyée`, time: timeAgo(f.created_at), color: 'text-blue-600' })
                }
                // Last accepted devis
                const acceptedDevis = allDevis.filter(d => d.statut === 'accepte')
                  .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                if (acceptedDevis.length > 0) {
                  const d = acceptedDevis[0]
                  activities.push({ icon: '🤝', label: `Devis ${d.numero} accepté`, time: timeAgo(d.updated_at), color: 'text-emerald-600' })
                }
                if (activities.length === 0) return <p className="text-sm text-muted-foreground">Aucune activité récente</p>
                return (
                  <div className="space-y-2.5">
                    {activities.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span className="text-sm">{a.icon}</span>
                        <span className={`text-sm flex-1 ${a.color}`}>{a.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Devis par statut — donut chart */}
            <div className="card">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Répartition devis</h3>
              {(() => {
                const statuts = stats.devisStats.filter(s => s.count > 0)
                const totalCount = statuts.reduce((s, d) => s + d.count, 0)
                if (totalCount === 0) return <p className="text-sm text-muted-foreground">Aucun devis</p>

                const colors: Record<string, string> = {
                  brouillon: 'hsl(var(--muted-foreground))',
                  envoye: 'hsl(35 80% 50%)',
                  accepte: 'hsl(152 45% 28%)',
                  refuse: 'hsl(0 70% 55%)',
                }
                const labels: Record<string, string> = {
                  brouillon: 'Brouillons',
                  envoye: 'Envoyés',
                  accepte: 'Acceptés',
                  refuse: 'Refusés',
                }

                const r = 40, cx = 55, cy = 55, stroke = 14
                const circ = 2 * Math.PI * r
                let offset = -circ * 0.25 // start from top

                return (
                  <div className="flex items-center gap-5">
                    <svg width="110" height="110" viewBox="0 0 110 110">
                      {/* Background circle */}
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
                      {/* Segments */}
                      {statuts.map((s) => {
                        const pct = s.count / totalCount
                        const segLen = circ * pct
                        const gap = statuts.length > 1 ? 2 : 0
                        const el = (
                          <circle
                            key={s.statut}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={colors[s.statut] || 'hsl(var(--primary))'}
                            strokeWidth={stroke}
                            strokeDasharray={`${Math.max(0, segLen - gap)} ${circ - segLen + gap}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="round"
                          />
                        )
                        offset += segLen
                        return el
                      })}
                      {/* Center text */}
                      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="16" fontWeight="700" fill="hsl(var(--foreground))">{totalCount}</text>
                      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">devis</text>
                    </svg>
                    <div className="space-y-1.5">
                      {statuts.map((s) => {
                        const pct = Math.round((s.count / totalCount) * 100)
                        return (
                          <div key={s.statut} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: colors[s.statut] || 'hsl(var(--primary))' }} />
                            <span className="text-sm text-foreground">{labels[s.statut] || s.statut}</span>
                            <span className="text-xs text-muted-foreground ml-auto pl-2">{s.count} ({pct}%)</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
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
                {recentFactures.map((f) => (
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
          Astuce : <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+K</kbd> pour rechercher
        </p>
        <div className="wood-accent flex-1" />
      </div>
    </div>
  )
}
