import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Users, Package, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, Receipt, FileText, Target,
  ArrowUpRight, Wallet, PieChart, Download
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { SkeletonDashboard } from '../components/Skeleton'
import { formatCHF } from '../utils/format'

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const monthNamesFull = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

interface MoisData {
  mois: string
  encaisse: number
  facture: number
  nb_factures: number
}

interface ClientData {
  id: string
  client_nom: string
  client_prenom?: string
  client_entreprise?: string
  encaisse: number
  total_facture: number
  nb_factures: number
}

interface ArticleData {
  designation: string
  unite: string
  total_quantite: number
  prix_moyen: number
  total_ca: number
  nb_factures: number
}

interface Resume {
  ca: number
  totalFacture: number
  nbFactures: number
  nbDevis: number
  nbClients: number
  enAttente: number
  tauxConversion: number
  caPrev: number
}

/* ── Conversion ring ───────────────────────────────────────────── */
function ConversionRing({ pct }: { pct: number }) {
  const r = 40
  const stroke = 8
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke="hsl(152 45% 28%)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-foreground">{pct}%</span>
      </div>
    </div>
  )
}

/* ── Bar chart with hover tooltip ──────────────────────────────── */
function CAChart({ data }: { data: MoisData[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const maxVal = Math.max(...data.map((d) => Math.max(d.encaisse, d.facture)), 1)
  const chartH = 220
  const barW = 36
  const gap = 16
  const leftPad = 60
  const svgW = data.length * (barW + gap) + leftPad + 20
  const svgH = chartH + 55

  return (
    <div className="overflow-x-auto -mx-1">
      <svg
        width="100%" viewBox={`0 0 ${svgW} ${svgH}`}
        className="min-w-[600px]"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Grid lines + labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = chartH - chartH * pct + 15
          return (
            <g key={pct}>
              <line
                x1={leftPad} y1={y} x2={svgW - 10} y2={y}
                stroke="hsl(var(--border))" strokeWidth="1"
                strokeDasharray={pct === 0 ? '' : '4,4'}
              />
              <text x={leftPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))" fontWeight="500">
                {formatCHF(maxVal * pct).replace('CHF', '').trim()}
              </text>
            </g>
          )
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const x = i * (barW + gap) + leftPad + 8
          const hFact = (d.facture / maxVal) * chartH
          const hEnc = (d.encaisse / maxVal) * chartH
          const month = parseInt(d.mois.split('-')[1]) - 1
          const isHovered = hoverIdx === i

          return (
            <g
              key={d.mois}
              onMouseEnter={() => setHoverIdx(i)}
              className="cursor-pointer"
            >
              {/* Hover background highlight */}
              {isHovered && (
                <rect
                  x={x - 6} y={15} width={barW + 12} height={chartH}
                  rx="6" fill="hsl(var(--muted) / 0.5)"
                />
              )}
              {/* Facturé bar (behind) */}
              <rect
                x={x} y={chartH - hFact + 15} width={barW} height={Math.max(hFact, 0)}
                rx="4" ry="4"
                fill={isHovered ? 'hsl(152 45% 28% / 0.3)' : 'hsl(152 45% 28% / 0.15)'}
                className="transition-all duration-200"
              />
              {/* Encaissé bar (front) */}
              <rect
                x={x} y={chartH - hEnc + 15} width={barW} height={Math.max(hEnc, 0)}
                rx="4" ry="4"
                fill={isHovered ? 'hsl(152 45% 35%)' : 'hsl(152 45% 28%)'}
                className="transition-all duration-200"
              />
              {/* Month label */}
              <text
                x={x + barW / 2} y={chartH + 35} textAnchor="middle"
                fontSize="11" fontWeight={isHovered ? '700' : '500'}
                fill={isHovered ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
              >
                {monthNames[month]}
              </text>
              {/* Hover tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={x + barW / 2 - 65} y={Math.max(chartH - hFact - 8, 2)}
                    width="130" height="46" rx="6"
                    fill="hsl(var(--foreground))" fillOpacity="0.92"
                  />
                  <text x={x + barW / 2} y={Math.max(chartH - hFact + 10, 20)} textAnchor="middle" fontSize="10" fill="hsl(var(--background))" fontWeight="600">
                    {monthNamesFull[month]}
                  </text>
                  <text x={x + barW / 2} y={Math.max(chartH - hFact + 23, 33)} textAnchor="middle" fontSize="9" fill="hsl(var(--background) / 0.8)">
                    Encaissé: {formatCHF(d.encaisse)}
                  </text>
                  <text x={x + barW / 2} y={Math.max(chartH - hFact + 35, 45)} textAnchor="middle" fontSize="9" fill="hsl(var(--background) / 0.8)">
                    Facturé: {formatCHF(d.facture)}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function Rapports() {
  const navigate = useNavigate()
  const toast = useToast()
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [annees, setAnnees] = useState<number[]>([])
  const [resume, setResume] = useState<Resume | null>(null)
  const [moisData, setMoisData] = useState<MoisData[]>([])
  const [clientData, setClientData] = useState<ClientData[]>([])
  const [articleData, setArticleData] = useState<ArticleData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'clients' | 'articles'>('clients')

  useEffect(() => {
    window.api.rapport.anneesDisponibles().then((a: number[]) => {
      // Generate range from earliest data year to 2030
      const minY = a.length > 0 ? Math.min(...a) : new Date().getFullYear()
      const maxY = 2030
      const range: number[] = []
      for (let y = maxY; y >= minY; y--) range.push(y)
      setAnnees(range)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      window.api.rapport.resume(annee),
      window.api.rapport.caParMois(annee),
      window.api.rapport.caParClient(annee),
      window.api.rapport.topArticles(annee)
    ]).then(([r, m, c, a]) => {
      setResume(r)
      setMoisData(m)
      setClientData(c)
      setArticleData(a)
      setLoading(false)
    })
  }, [annee])

  if (loading || !resume) return <SkeletonDashboard />

  const evolution = resume.caPrev > 0
    ? ((resume.ca - resume.caPrev) / resume.caPrev * 100)
    : resume.ca > 0 ? 100 : 0

  const clientName = (c: ClientData) =>
    c.client_entreprise || [c.client_prenom, c.client_nom].filter(Boolean).join(' ') || 'Client inconnu'

  const topClientMax = clientData.length > 0 ? Math.max(...clientData.map(c => c.encaisse)) : 1
  const topArticleMax = articleData.length > 0 ? Math.max(...articleData.map(a => a.total_ca)) : 1
  const factureMoyen = resume.nbFactures > 0 ? resume.totalFacture / resume.nbFactures : 0

  // Best month
  const nonZeroMonths = moisData.filter(d => d.encaisse > 0)
  const bestMonth = nonZeroMonths.length > 0
    ? nonZeroMonths.reduce((best, d) => d.encaisse > best.encaisse ? d : best, nonZeroMonths[0])
    : null
  const bestMonthIdx = bestMonth ? parseInt(bestMonth.mois.split('-')[1]) - 1 : 0

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports</h1>
          <p className="page-subtitle">Analyse détaillée de l'activité</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                await window.api.rapport.exportPdf(annee)
                toast.success('Rapport PDF exporté')
              } catch {
                toast.error("Erreur lors de l'export PDF")
              }
            }}
            className="btn-primary text-sm"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-1 py-1">
          <button
            onClick={() => setAnnee(a => a - 1)}
            disabled={annees.length > 0 && annee <= Math.min(...annees)}
            className="rounded-lg p-2 hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <select
            className="bg-transparent text-sm font-semibold text-center w-20 text-foreground outline-none cursor-pointer appearance-none"
            value={annee}
            onChange={(e) => setAnnee(parseInt(e.target.value))}
          >
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => setAnnee(a => a + 1)}
            disabled={annees.length > 0 && annee >= Math.max(...annees)}
            className="rounded-lg p-2 hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          </div>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* CA encaissé */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(145 60% 40% / 0.12)' }}>
              <Wallet className="h-5 w-5" style={{ color: 'hsl(145 60% 40%)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">CA encaissé</p>
              <p className="text-xl font-bold text-foreground">{formatCHF(resume.ca)}</p>
              {evolution !== 0 && (
                <p className={`text-xs font-medium flex items-center gap-0.5 ${evolution > 0 ? 'text-accent' : 'text-destructive'}`}>
                  {evolution > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {evolution > 0 ? '+' : ''}{evolution.toFixed(0)}% vs {annee - 1}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Total facturé */}
        <div className="stat-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/factures')}>
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(35 80% 50% / 0.12)' }}>
              <Receipt className="h-5 w-5" style={{ color: 'hsl(35 80% 50%)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total facturé</p>
              <p className="text-xl font-bold text-foreground">{formatCHF(resume.totalFacture)}</p>
              <p className="text-xs text-muted-foreground underline decoration-dotted">{resume.nbFactures} facture{resume.nbFactures > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Clients actifs */}
        <div className="stat-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/clients')}>
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(var(--primary) / 0.12)' }}>
              <Users className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Clients actifs</p>
              <p className="text-xl font-bold text-foreground underline decoration-dotted">{resume.nbClients}</p>
              <p className="text-xs text-muted-foreground">
                {resume.nbClients > 0 ? `~${formatCHF(resume.ca / resume.nbClients)}/client` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* En attente */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(0 70% 55% / 0.12)' }}>
              <TrendingDown className="h-5 w-5" style={{ color: 'hsl(0 70% 55%)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-xl font-bold text-foreground">{formatCHF(resume.enAttente)}</p>
              <p className="text-xs text-muted-foreground">Non encaissé</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Secondary KPIs row ─────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {/* Conversion rate ring */}
        <div className="card flex items-center gap-5 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/devis')}>
          <ConversionRing pct={resume.tauxConversion} />
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Target className="h-4 w-4 text-primary" />
              Taux de conversion
            </p>
            <p className="text-xs text-muted-foreground mt-1 underline decoration-dotted">
              {resume.nbDevis} devis envoyés
            </p>
            <p className="text-xs text-muted-foreground">
              {Math.round(resume.nbDevis * resume.tauxConversion / 100)} acceptés
            </p>
          </div>
        </div>

        {/* Facture moyen */}
        <div className="card flex items-center gap-5 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/factures')}>
          <div className="rounded-xl p-3" style={{ background: 'hsl(35 80% 50% / 0.1)' }}>
            <BarChart3 className="h-8 w-8" style={{ color: 'hsl(35 80% 50%)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Facture moyenne</p>
            <p className="text-2xl font-bold text-foreground">{formatCHF(factureMoyen)}</p>
            <p className="text-xs text-muted-foreground underline decoration-dotted">{resume.nbFactures} factures en {annee}</p>
          </div>
        </div>

        {/* Best month */}
        <div className="card flex items-center gap-5">
          <div className="rounded-xl p-3" style={{ background: 'hsl(145 60% 40% / 0.1)' }}>
            <ArrowUpRight className="h-8 w-8" style={{ color: 'hsl(145 60% 40%)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Meilleur mois</p>
            <p className="text-2xl font-bold text-foreground">{monthNamesFull[bestMonthIdx]}</p>
            <p className="text-xs text-muted-foreground">{formatCHF(bestMonth?.encaisse || 0)} encaissés</p>
          </div>
        </div>
      </div>

      {/* ── CA bar chart ───────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Chiffre d'affaires par mois
          </h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(152 45% 28%)' }} />
              Encaissé
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(152 45% 28% / 0.2)' }} />
              Facturé
            </span>
          </div>
        </div>
        {moisData.length > 0 ? (
          <CAChart data={moisData} />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée pour {annee}</p>
        )}
      </div>

      {/* ── Tabbed clients / articles section ──────────────── */}
      <div className="card">
        <div className="flex items-center gap-1 mb-5 border-b border-border -mx-6 px-6">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'clients'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            Top clients
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'articles'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-4 w-4" />
            Top articles / prestations
          </button>
        </div>

        {/* ── Top clients tab ──────────────────────────────── */}
        {activeTab === 'clients' && (
          <>
            {clientData.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune donnée client pour {annee}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientData.slice(0, 10).map((c, i) => {
                  const pct = (c.encaisse / topClientMax) * 100
                  const encaissePct = c.total_facture > 0 ? (c.encaisse / c.total_facture) * 100 : 0
                  return (
                    <div key={c.id} className="group cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" onClick={() => navigate(`/clients/${c.id}`)}>
                      <div className="flex items-center gap-4">
                        {/* Rank badge */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-100 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-foreground truncate">{clientName(c)}</span>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className="text-xs text-muted-foreground">{c.nb_factures} fact.</span>
                              <span className="text-sm font-bold text-foreground">{formatCHF(c.encaisse)}</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                            <div
                              className="h-2 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${pct}%`, background: 'hsl(152 45% 28%)' }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-muted-foreground">
                              {Math.round(encaissePct)}% encaissé sur {formatCHF(c.total_facture)} facturé
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── Top articles tab ─────────────────────────────── */}
        {activeTab === 'articles' && (
          <>
            {articleData.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune donnée article pour {annee}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articleData.slice(0, 15).map((a, i) => {
                  const pct = (a.total_ca / topArticleMax) * 100
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {i + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate block">{a.designation}</span>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(a.total_quantite * 100) / 100} {a.unite} · ~{formatCHF(a.prix_moyen)}/{a.unite} · {a.nb_factures} fact.
                              </span>
                            </div>
                            <span className="text-sm font-bold text-foreground shrink-0 ml-3">{formatCHF(a.total_ca)}</span>
                          </div>
                          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                            <div
                              className="h-1.5 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${pct}%`, background: 'hsl(35 80% 50%)' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
