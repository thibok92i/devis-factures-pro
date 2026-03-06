import { useEffect, useState } from 'react'
import { BarChart3, Users, Package, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCHF } from '../utils/format'

const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

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

function CAChart({ data }: { data: MoisData[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.encaisse, d.facture)), 1)
  const chartH = 200
  const barW = 32

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${data.length * (barW + 12) + 60} ${chartH + 50}`} className="min-w-[500px]">
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = chartH - chartH * pct + 15
          return (
            <g key={pct}>
              <line x1="50" y1={y} x2={data.length * (barW + 12) + 50} y2={y} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray={pct === 0 ? '' : '4,4'} />
              <text x="46" y={y + 3} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">
                {formatCHF(maxVal * pct).replace('CHF', '').trim()}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const x = i * (barW + 12) + 58
          const hFact = (d.facture / maxVal) * chartH
          const hEnc = (d.encaisse / maxVal) * chartH
          const month = parseInt(d.mois.split('-')[1]) - 1
          return (
            <g key={d.mois}>
              <rect x={x} y={chartH - hFact + 15} width={barW} height={hFact} rx="4" fill="hsl(152 45% 28% / 0.2)" />
              <rect x={x} y={chartH - hEnc + 15} width={barW} height={hEnc} rx="4" fill="hsl(152 45% 28%)" />
              <text x={x + barW / 2} y={chartH + 32} textAnchor="middle" fontSize="10" fontWeight="500" fill="hsl(var(--muted-foreground))">
                {monthNames[month]}
              </text>
              {d.encaisse > 0 && (
                <text x={x + barW / 2} y={chartH - hEnc + 10} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
                  {Math.round(d.encaisse)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Rapports() {
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [annees, setAnnees] = useState<number[]>([])
  const [resume, setResume] = useState<Resume | null>(null)
  const [moisData, setMoisData] = useState<MoisData[]>([])
  const [clientData, setClientData] = useState<ClientData[]>([])
  const [articleData, setArticleData] = useState<ArticleData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.rapport.anneesDisponibles().then((a: number[]) => setAnnees(a))
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

  if (loading || !resume) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement du rapport...</p>
        </div>
      </div>
    )
  }

  const evolution = resume.caPrev > 0
    ? ((resume.ca - resume.caPrev) / resume.caPrev * 100)
    : resume.ca > 0 ? 100 : 0

  const clientName = (c: ClientData) =>
    c.client_entreprise || [c.client_prenom, c.client_nom].filter(Boolean).join(' ') || 'Client inconnu'

  const topClientMax = clientData.length > 0 ? Math.max(...clientData.map(c => c.encaisse)) : 1

  return (
    <div>
      {/* Header with year selector */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapport annuel</h1>
          <p className="page-subtitle">Vue d'ensemble de l'activité</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnnee(a => a - 1)}
            disabled={!annees.includes(annee - 1) && annee - 1 < Math.min(...annees)}
            className="rounded-lg p-2 hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <select
            className="input text-sm font-semibold text-center w-28"
            value={annee}
            onChange={(e) => setAnnee(parseInt(e.target.value))}
          >
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => setAnnee(a => a + 1)}
            disabled={annee >= new Date().getFullYear()}
            className="rounded-lg p-2 hover:bg-muted transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(145 60% 40% / 0.12)' }}>
              <TrendingUp className="h-5 w-5" style={{ color: 'hsl(145 60% 40%)' }} />
            </div>
            <div>
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

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(35 80% 50% / 0.12)' }}>
              <BarChart3 className="h-5 w-5" style={{ color: 'hsl(35 80% 50%)' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Factures / Devis</p>
              <p className="text-xl font-bold text-foreground">{resume.nbFactures} / {resume.nbDevis}</p>
              <p className="text-xs text-muted-foreground">Taux conversion: {resume.tauxConversion}%</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(var(--primary) / 0.12)' }}>
              <Users className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clients actifs</p>
              <p className="text-xl font-bold text-foreground">{resume.nbClients}</p>
              <p className="text-xs text-muted-foreground">
                {resume.nbClients > 0 ? `~${formatCHF(resume.ca / resume.nbClients)}/client` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'hsl(0 70% 55% / 0.12)' }}>
              <TrendingDown className="h-5 w-5" style={{ color: 'hsl(0 70% 55%)' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-xl font-bold text-foreground">{formatCHF(resume.enAttente)}</p>
              <p className="text-xs text-muted-foreground">Non encaissé</p>
            </div>
          </div>
        </div>
      </div>

      {/* CA par mois chart */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Chiffre d'affaires par mois</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(152 45% 28%)' }} />
              Encaissé
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded" style={{ background: 'hsl(152 45% 28% / 0.25)' }} />
              Facturé
            </span>
          </div>
        </div>
        <CAChart data={moisData} />
      </div>

      {/* Two columns: clients + articles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top clients */}
        <div className="card">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Top clients
          </h3>
          {clientData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée pour {annee}</p>
          ) : (
            <div className="space-y-3">
              {clientData.slice(0, 10).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{clientName(c)}</span>
                      <span className="text-sm font-bold text-foreground shrink-0 ml-2">{formatCHF(c.encaisse)}</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: 'hsl(var(--muted))' }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${(c.encaisse / topClientMax) * 100}%`, background: 'hsl(152 45% 28%)' }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground">{c.nb_factures} facture{c.nb_factures > 1 ? 's' : ''}</span>
                      <span className="text-xs text-muted-foreground">Total facturé: {formatCHF(c.total_facture)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top articles */}
        <div className="card">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Top articles / prestations
          </h3>
          {articleData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune donnée pour {annee}</p>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left text-xs font-medium uppercase text-muted-foreground">#</th>
                    <th className="py-2 text-left text-xs font-medium uppercase text-muted-foreground">Désignation</th>
                    <th className="py-2 text-right text-xs font-medium uppercase text-muted-foreground">Qté</th>
                    <th className="py-2 text-right text-xs font-medium uppercase text-muted-foreground">CA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {articleData.slice(0, 15).map((a, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 text-xs font-bold text-muted-foreground">{i + 1}</td>
                      <td className="py-2">
                        <div className="font-medium text-foreground truncate max-w-[200px]">{a.designation}</div>
                        <div className="text-xs text-muted-foreground">{a.nb_factures} facture{a.nb_factures > 1 ? 's' : ''} · ~{formatCHF(a.prix_moyen)}/{a.unite}</div>
                      </td>
                      <td className="py-2 text-right text-foreground">{Math.round(a.total_quantite * 100) / 100} {a.unite}</td>
                      <td className="py-2 text-right font-bold text-foreground">{formatCHF(a.total_ca)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
