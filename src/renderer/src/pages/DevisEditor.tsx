import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Download, ArrowRight, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { useToast } from '../components/Toast'
import { formatCHF, devisStatutLabel, devisStatutColor } from '../utils/format'
import type { DevisDetail, DevisLigne, CatalogueItem } from '../types'

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
  const [saving, setSaving] = useState(false)

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
    setLignes([...lignes, {
      catalogue_item_id: item.id,
      designation: item.designation,
      description: '',
      unite: item.unite,
      quantite: 1,
      prix_unitaire: item.prix_unitaire
    }])
    setShowCatalogue(false)
    setCatalogueSearch('')
  }

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
                  <input className="input text-sm text-right" type="number" step="0.01" min="0" value={ligne.quantite} onChange={(e) => updateLine(index, 'quantite', parseFloat(e.target.value) || 0)} />
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

      {/* Catalogue picker modal */}
      {showCatalogue && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Catalogue</h3>
              <button onClick={() => { setShowCatalogue(false); setCatalogueSearch('') }} className="btn-secondary text-sm">Fermer</button>
            </div>
            <div className="search-bar mb-3">
              <Search className="search-icon" />
              <input className="search-input" placeholder="Rechercher..." value={catalogueSearch} onChange={(e) => setCatalogueSearch(e.target.value)} autoFocus />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredCatalogue.map((item) => (
                <button key={item.id} onClick={() => addFromCatalogue(item)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-primary/5 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.designation}</div>
                    <div className="text-xs text-muted-foreground">{item.reference} - {item.type === 'materiau' ? 'Matériau' : "Main d'oeuvre"} - {item.categorie || 'Sans catégorie'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">{formatCHF(item.prix_unitaire)}</div>
                    <div className="text-xs text-muted-foreground">/{item.unite}</div>
                  </div>
                </button>
              ))}
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
