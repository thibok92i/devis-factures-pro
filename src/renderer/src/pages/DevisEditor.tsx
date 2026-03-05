import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Download, ArrowRight, Search, ChevronUp, ChevronDown, Check, Package, Calculator, X } from 'lucide-react'
import { useToast } from '../components/Toast'
import { formatCHF, devisStatutLabel, devisStatutColor } from '../utils/format'
import type { DevisDetail, DevisLigne, CatalogueItem, Forfait, ForfaitCalculated } from '../types'

interface EditableLigne {
  id?: string
  catalogue_item_id?: string
  designation: string
  description: string
  unite: string
  quantite: number
  prix_unitaire: number
}

export default function DevisEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [devis, setDevis] = useState<DevisDetail | null>(null)
  const [lignes, setLignes] = useState<EditableLigne[]>([])
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
  const [showCatalogue, setShowCatalogue] = useState(false)
  const [catalogueSearch, setCatalogueSearch] = useState('')
  const [catalogueAddedCount, setCatalogueAddedCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showForfait, setShowForfait] = useState(false)
  const [forfaits, setForfaits] = useState<Forfait[]>([])
  const [selectedForfait, setSelectedForfait] = useState<Forfait | null>(null)
  const [forfaitQuantite, setForfaitQuantite] = useState(1)
  const [forfaitPreview, setForfaitPreview] = useState<ForfaitCalculated[]>([])
  const [calcLineIndex, setCalcLineIndex] = useState<number | null>(null)
  const [calcL, setCalcL] = useState('')
  const [calcW, setCalcW] = useState('')
  const [calcH, setCalcH] = useState('')
  const [calcPerte, setCalcPerte] = useState('10')

  useEffect(() => {
    if (!id || id === 'new') return
    window.api.devis.get(id).then((data: DevisDetail) => {
      setDevis(data)
      setLignes(
        data.lignes.map((l: DevisLigne) => ({
          id: l.id,
          catalogue_item_id: l.catalogue_item_id,
          designation: l.designation,
          description: l.description || '',
          unite: l.unite,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire
        }))
      )
    })
    window.api.catalogue.list().then(setCatalogue)
  }, [id])

  const sousTotal = lignes.reduce((sum, l) => sum + l.quantite * l.prix_unitaire, 0)
  const remisePourcent = devis?.remise_pourcent || 0
  const remiseMontant = sousTotal * (remisePourcent / 100)
  const apresRemise = sousTotal - remiseMontant
  const tauxTva = devis?.taux_tva || 8.1
  const montantTva = apresRemise * (tauxTva / 100)
  const total = apresRemise + montantTva

  const addLine = () => {
    setLignes([...lignes, { designation: '', description: '', unite: 'pce', quantite: 1, prix_unitaire: 0 }])
  }

  const addFromCatalogue = (item: CatalogueItem) => {
    setLignes((prev) => [...prev, {
      catalogue_item_id: item.id,
      designation: item.designation,
      description: '',
      unite: item.unite,
      quantite: 1,
      prix_unitaire: item.prix_unitaire
    }])
    setCatalogueAddedCount((c) => c + 1)
  }

  const closeCatalogue = () => {
    setShowCatalogue(false)
    setCatalogueSearch('')
    setCatalogueAddedCount(0)
  }

  // IDs of catalogue items already in the devis (for visual indicator)
  const lignesCatalogueIds = new Set(lignes.filter((l) => l.catalogue_item_id).map((l) => l.catalogue_item_id))

  const updateLine = (index: number, field: keyof EditableLigne, value: string | number) => {
    const updated = [...lignes]
    updated[index] = { ...updated[index], [field]: value }
    setLignes(updated)
  }

  const removeLine = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index))
  }

  const moveLine = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= lignes.length) return
    const updated = [...lignes]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setLignes(updated)
  }

  const handleSave = async () => {
    if (!devis) return
    setSaving(true)
    try {
      await window.api.devis.saveLignes(devis.id, lignes)
      const updated = await window.api.devis.get(devis.id)
      setDevis(updated)
      toast.success('Devis sauvegardé')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleStatut = async (statut: string) => {
    if (!devis) return
    try {
      await window.api.devis.updateStatut(devis.id, statut)
      const updated = await window.api.devis.get(devis.id)
      setDevis(updated)
      toast.success('Statut mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const handleExportPdf = async () => {
    if (!devis) return
    try {
      await handleSave()
      await window.api.devis.exportPdf(devis.id)
      toast.success('PDF exporté')
    } catch {
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  const handleConvertToFacture = async () => {
    if (!devis) return
    if (confirm('Convertir ce devis en facture ? Le devis sera marqué comme accepté.')) {
      try {
        await handleSave()
        const result = await window.api.factures.createFromDevis(devis.id)
        navigate(`/factures/${result.id}`)
        toast.success('Facture créée avec succès')
      } catch {
        toast.error('Erreur lors de la conversion en facture')
      }
    }
  }

  // --- Forfait handlers ---
  const openForfaitModal = async () => {
    const list = await window.api.forfaits.list()
    setForfaits(list)
    setSelectedForfait(null)
    setForfaitQuantite(1)
    setForfaitPreview([])
    setShowForfait(true)
  }

  const handleForfaitSelect = async (f: Forfait) => {
    setSelectedForfait(f)
    setForfaitQuantite(1)
    const result = await window.api.forfaits.calculate(f.id, 1)
    if (result.success) setForfaitPreview(result.lignes)
  }

  const handleForfaitQteChange = async (qte: number) => {
    setForfaitQuantite(qte)
    if (selectedForfait && qte > 0) {
      const result = await window.api.forfaits.calculate(selectedForfait.id, qte)
      if (result.success) setForfaitPreview(result.lignes)
    }
  }

  const addForfaitLines = () => {
    if (forfaitPreview.length === 0) return
    const newLignes: EditableLigne[] = forfaitPreview.map((l) => ({
      catalogue_item_id: l.catalogue_item_id || undefined,
      designation: l.designation,
      description: l.description || '',
      unite: l.unite,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire
    }))
    setLignes((prev) => [...prev, ...newLignes])
    setShowForfait(false)
    toast.success(`${newLignes.length} lignes ajoutées depuis le forfait`)
  }

  // --- Calculator handlers ---
  const openCalc = (index: number) => {
    setCalcLineIndex(index)
    setCalcL('')
    setCalcW('')
    setCalcH('')
    setCalcPerte('10')
  }

  const applyCalc = () => {
    if (calcLineIndex === null) return
    const unite = lignes[calcLineIndex].unite
    const l = parseFloat(calcL) || 0
    const w = parseFloat(calcW) || 0
    const h = parseFloat(calcH) || 0
    const perte = parseFloat(calcPerte) || 0
    let result = 0
    if (unite === 'm²') result = l * w
    else if (unite === 'm³') result = l * w * h
    else if (unite === 'm') result = l
    if (perte > 0) result = result * (1 + perte / 100)
    result = Math.ceil(result * 100) / 100
    if (result > 0) {
      updateLine(calcLineIndex, 'quantite', result)
    }
    setCalcLineIndex(null)
  }

  // --- Template save handler ---
  const [showTemplateSave, setShowTemplateSave] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const handleSaveAsTemplate = async () => {
    if (!devis || !templateName.trim()) return
    try {
      await handleSave()
      const result = await window.api.templates.createFromDevis(devis.id, templateName.trim())
      if (result.success) {
        toast.success(`Modèle "${templateName}" sauvegardé`)
        setShowTemplateSave(false)
        setTemplateName('')
      } else {
        toast.error(result.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde du modèle')
    }
  }

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        handleExportPdf()
      } else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        if (devis) {
          window.api.devis.duplicate(devis.id).then((result: { success: boolean; id: string }) => {
            if (result.success) {
              navigate(`/devis/${result.id}`)
              toast.success('Devis dupliqué')
            }
          })
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const filteredCatalogue = catalogue.filter((item) =>
    item.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) ||
    item.reference.toLowerCase().includes(catalogueSearch.toLowerCase())
  )

  if (!devis) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/devis')} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="page-title mb-0">Devis {devis.numero}</h1>
            <p className="text-sm text-muted-foreground">
              {devis.client_entreprise || `${devis.client_prenom || ''} ${devis.client_nom}`}
            </p>
          </div>
          <span className={`badge ${devisStatutColor(devis.statut)}`}>{devisStatutLabel(devis.statut)}</span>
        </div>
        <div className="flex gap-2">
          {devis.statut === 'brouillon' && (
            <button onClick={() => handleStatut('envoye')} className="btn-secondary">Marquer envoyé</button>
          )}
          {devis.statut === 'envoye' && (
            <>
              <button onClick={() => handleStatut('accepte')} className="btn-success">Accepté</button>
              <button onClick={() => handleStatut('refuse')} className="btn-danger">Refusé</button>
            </>
          )}
          {devis.statut === 'accepte' && (
            <button onClick={handleConvertToFacture} className="btn-success">
              <ArrowRight className="h-4 w-4" />
              Facturer
            </button>
          )}
          <button onClick={() => setShowTemplateSave(true)} className="btn-ghost text-sm" title="Sauver comme modèle">
            <Save className="h-4 w-4" />
            Modèle
          </button>
          <button onClick={handleExportPdf} className="btn-secondary">
            <Download className="h-4 w-4" />
            PDF
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Lines table */}
      <div className="card mb-6 overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
              <th className="px-1 py-2 w-[4%]"></th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground w-[28%]">Désignation</th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground w-[18%]">Description</th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase text-muted-foreground w-[8%]">Unité</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground w-[10%]">Qté</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground w-[12%]">Prix unit.</th>
              <th className="px-3 py-2 text-right text-xs font-medium uppercase text-muted-foreground w-[12%]">Total</th>
              <th className="px-3 py-2 w-[6%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lignes.map((ligne, index) => (
              <tr key={index} className="hover:bg-muted/30 transition-colors">
                <td className="px-1 py-1.5 text-center">
                  <div className="flex flex-col">
                    <button onClick={() => moveLine(index, 'up')} disabled={index === 0} className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveLine(index, 'down')} disabled={index === lignes.length - 1} className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <input className="input text-sm" value={ligne.designation} onChange={(e) => updateLine(index, 'designation', e.target.value)} placeholder="Désignation" />
                </td>
                <td className="px-3 py-1.5">
                  <input className="input text-sm" value={ligne.description} onChange={(e) => updateLine(index, 'description', e.target.value)} placeholder="Description" />
                </td>
                <td className="px-3 py-1.5">
                  <select className="input text-sm text-center" value={ligne.unite} onChange={(e) => updateLine(index, 'unite', e.target.value)}>
                    <option value="pce">pce</option>
                    <option value="m">m</option>
                    <option value="m²">m²</option>
                    <option value="m³">m³</option>
                    <option value="kg">kg</option>
                    <option value="h">h</option>
                    <option value="forfait">forfait</option>
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <input className="input text-sm text-right flex-1" type="number" step="0.01" min="0" value={ligne.quantite} onChange={(e) => updateLine(index, 'quantite', parseFloat(e.target.value) || 0)} />
                    {['m²', 'm', 'm³'].includes(ligne.unite) && (
                      <button onClick={() => openCalc(index)} className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0" title="Calculateur">
                        <Calculator className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Inline calculator popup */}
                  {calcLineIndex === index && (
                    <div className="absolute z-50 mt-1 p-3 rounded-lg border border-border shadow-lg" style={{ background: 'hsl(var(--card))' }}>
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Calculateur {ligne.unite}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <input className="input text-sm w-20 text-right" type="number" step="0.01" placeholder="Long." value={calcL} onChange={(e) => setCalcL(e.target.value)} autoFocus />
                        {(ligne.unite === 'm²' || ligne.unite === 'm³') && (
                          <>
                            <span className="text-muted-foreground text-sm">×</span>
                            <input className="input text-sm w-20 text-right" type="number" step="0.01" placeholder="Larg." value={calcW} onChange={(e) => setCalcW(e.target.value)} />
                          </>
                        )}
                        {ligne.unite === 'm³' && (
                          <>
                            <span className="text-muted-foreground text-sm">×</span>
                            <input className="input text-sm w-20 text-right" type="number" step="0.01" placeholder="Haut." value={calcH} onChange={(e) => setCalcH(e.target.value)} />
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">+ Perte</span>
                        <input className="input text-sm w-16 text-right" type="number" step="1" value={calcPerte} onChange={(e) => setCalcPerte(e.target.value)} />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          = {(() => {
                            const l = parseFloat(calcL) || 0; const w = parseFloat(calcW) || 0; const h = parseFloat(calcH) || 0; const p = parseFloat(calcPerte) || 0
                            let r = ligne.unite === 'm³' ? l * w * h : ligne.unite === 'm²' ? l * w : l
                            if (p > 0) r *= (1 + p / 100)
                            return (Math.ceil(r * 100) / 100).toFixed(2)
                          })()} {ligne.unite}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => setCalcLineIndex(null)} className="btn-ghost text-xs px-2 py-1">Annuler</button>
                          <button onClick={applyCalc} className="btn-primary text-xs px-2 py-1">Appliquer</button>
                        </div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <input className="input text-sm text-right" type="number" step="0.05" min="0" value={ligne.prix_unitaire} onChange={(e) => updateLine(index, 'prix_unitaire', parseFloat(e.target.value) || 0)} />
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-sm text-foreground">
                  {formatCHF(ligne.quantite * ligne.prix_unitaire)}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button onClick={() => removeLine(index)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-border p-3 flex gap-2">
          <button onClick={addLine} className="btn-secondary text-sm">
            <Plus className="h-4 w-4" />
            Ligne libre
          </button>
          <button onClick={() => setShowCatalogue(true)} className="btn-secondary text-sm">
            <Search className="h-4 w-4" />
            Depuis catalogue
          </button>
          <button onClick={openForfaitModal} className="btn-secondary text-sm" style={{ borderColor: 'hsl(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}>
            <Package className="h-4 w-4" />
            Forfait / Pack
          </button>
        </div>
      </div>

      {/* Remise */}
      <div className="mb-6 flex justify-end">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Remise (%)</label>
          <input
            className="input w-24 text-sm text-right"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={remisePourcent}
            onChange={async (e) => {
              const val = parseFloat(e.target.value) || 0
              if (devis) {
                setDevis({ ...devis, remise_pourcent: val })
              }
            }}
          />
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="card w-80">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium text-foreground">{formatCHF(sousTotal)}</span>
            </div>
            {remisePourcent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remise ({remisePourcent}%)</span>
                <span className="font-medium text-destructive">-{formatCHF(remiseMontant)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA ({tauxTva}%)</span>
              <span className="font-medium text-foreground">{formatCHF(montantTva)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-semibold text-foreground">Total TTC</span>
              <span className="text-lg font-bold text-primary">{formatCHF(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes & Conditions */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="card">
          <label className="label mb-1">Notes internes</label>
          <textarea
            className="input text-sm"
            rows={3}
            placeholder="Notes internes (non visibles sur le PDF)..."
            value={devis.notes || ''}
            onChange={(e) => setDevis({ ...devis, notes: e.target.value })}
          />
        </div>
        <div className="card">
          <label className="label mb-1">Conditions</label>
          <textarea
            className="input text-sm"
            rows={3}
            placeholder="Conditions particulières..."
            value={devis.conditions || ''}
            onChange={(e) => setDevis({ ...devis, conditions: e.target.value })}
          />
        </div>
      </div>

      {/* Forfait picker modal */}
      {showForfait && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                <Package className="h-5 w-5 inline-block mr-2 text-primary" />
                Forfaits / Packs
              </h3>
              <button onClick={() => setShowForfait(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!selectedForfait ? (
              /* Step 1: Choose a forfait */
              <div className="overflow-y-auto flex-1">
                <p className="text-sm text-muted-foreground mb-3">
                  Choisissez un pack pour ajouter automatiquement tous les matériaux et la main d'oeuvre :
                </p>
                <div className="space-y-2">
                  {forfaits.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleForfaitSelect(f)}
                      className="w-full text-left rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">{f.nom}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{f.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-primary">{f.ligne_count} lignes</div>
                          <div className="text-xs text-muted-foreground">par {f.unite_base}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {forfaits.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">Aucun forfait disponible</p>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Enter quantity and preview */
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: 'hsl(var(--primary) / 0.05)' }}>
                  <button onClick={() => { setSelectedForfait(null); setForfaitPreview([]) }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{selectedForfait.nom}</div>
                    <div className="text-xs text-muted-foreground">{selectedForfait.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-foreground">Quantité ({selectedForfait.unite_base}) :</label>
                    <input
                      className="input w-24 text-sm text-right"
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={forfaitQuantite}
                      onChange={(e) => handleForfaitQteChange(parseFloat(e.target.value) || 0)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Aperçu des lignes ({forfaitPreview.length})
                </div>
                <div className="overflow-y-auto flex-1 border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Désignation</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Unité</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qté</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Prix unit.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {forfaitPreview.map((l, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-3 py-1.5 text-foreground">{l.designation}</td>
                          <td className="px-3 py-1.5 text-center text-muted-foreground">{l.unite}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{l.quantite}</td>
                          <td className="px-3 py-1.5 text-right text-muted-foreground">{formatCHF(l.prix_unitaire)}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatCHF(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total forfait : </span>
                    <span className="text-lg font-bold text-primary">
                      {formatCHF(forfaitPreview.reduce((sum, l) => sum + l.total, 0))}
                    </span>
                  </div>
                  <button onClick={addForfaitLines} disabled={forfaitPreview.length === 0 || forfaitQuantite <= 0} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Ajouter {forfaitPreview.length} lignes au devis
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save as template modal */}
      {showTemplateSave && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Sauver comme modèle</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Les {lignes.length} lignes actuelles seront sauvegardées comme modèle réutilisable.
            </p>
            <input
              className="input mb-4"
              placeholder="Nom du modèle (ex: Cuisine standard)..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowTemplateSave(false); setTemplateName('') }} className="btn-secondary">Annuler</button>
              <button onClick={handleSaveAsTemplate} disabled={!templateName.trim() || lignes.length === 0} className="btn-primary">
                <Save className="h-4 w-4" />
                Sauver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalogue picker modal — multi-sélection */}
      {showCatalogue && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Catalogue</h3>
              <button onClick={closeCatalogue} className="btn-primary text-sm">
                <Check className="h-4 w-4" />
                Terminer{catalogueAddedCount > 0 ? ` (${catalogueAddedCount} ajouté${catalogueAddedCount > 1 ? 's' : ''})` : ''}
              </button>
            </div>
            <div className="search-bar mb-3">
              <Search className="search-icon" />
              <input className="search-input" placeholder="Rechercher un article..." value={catalogueSearch} onChange={(e) => setCatalogueSearch(e.target.value)} autoFocus />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredCatalogue.map((item) => {
                const alreadyAdded = lignesCatalogueIds.has(item.id)
                return (
                  <div key={item.id} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${alreadyAdded ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {alreadyAdded && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{item.designation}</div>
                        <div className="text-xs text-muted-foreground">{item.reference} - {item.type === 'materiau' ? 'Matériau' : "Main d'oeuvre"} - {item.categorie || 'Sans catégorie'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">{formatCHF(item.prix_unitaire)}</div>
                        <div className="text-xs text-muted-foreground">/{item.unite}</div>
                      </div>
                      <button
                        onClick={() => addFromCatalogue(item)}
                        className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
                        title="Ajouter au devis"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {filteredCatalogue.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun article trouvé</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
