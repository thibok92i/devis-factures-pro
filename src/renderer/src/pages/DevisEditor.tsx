import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Download, ArrowRight, Search, ChevronUp, ChevronDown, Check, Package, Calculator, X, Copy, GripVertical, Star, FileInput, RefreshCw, Layers, ToggleLeft, ToggleRight, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { useToast } from '../components/Toast'
import { formatCHF, formatDate, devisStatutLabel, devisStatutColor, clientDisplayName } from '../utils/format'
import ClientSearchInput from '../components/ClientSearchInput'
import type { DevisDetail, DevisLigne, CatalogueItem, Forfait, ForfaitCalculated, DevisWithClient, Client } from '../types'

interface EditableLigne {
  id?: string
  catalogue_item_id?: string
  designation: string
  description: string
  unite: string
  quantite: number
  prix_unitaire: number
  is_option?: boolean
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
  // Drag & drop
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // Client swap
  const [showClientSwap, setShowClientSwap] = useState(false)
  const [allClients, setAllClients] = useState<Client[]>([])
  // Import from old devis
  const [showImportDevis, setShowImportDevis] = useState(false)
  const [importDevisList, setImportDevisList] = useState<DevisWithClient[]>([])
  const [importSearch, setImportSearch] = useState('')
  const [importSelectedDevis, setImportSelectedDevis] = useState<string | null>(null)
  const [importLignes, setImportLignes] = useState<DevisLigne[]>([])
  const [importChecked, setImportChecked] = useState<Set<number>>(new Set())

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
          prix_unitaire: l.prix_unitaire,
          is_option: !!l.is_option
        }))
      )
    })
    window.api.catalogue.list().then(setCatalogue)
  }, [id])

  const sousTotal = lignes.reduce((sum, l) => {
    if (isSection(l) || l.is_option) return sum
    return sum + l.quantite * l.prix_unitaire
  }, 0)
  const optionsTotal = lignes.reduce((sum, l) => {
    if (isSection(l) || !l.is_option) return sum
    return sum + l.quantite * l.prix_unitaire
  }, 0)
  const remisePourcent = devis?.remise_pourcent || 0
  const remiseMontant = sousTotal * (remisePourcent / 100)
  const apresRemise = sousTotal - remiseMontant
  const tauxTva = devis?.taux_tva || 8.1
  const montantTva = apresRemise * (tauxTva / 100)
  const total = apresRemise + montantTva

  // Expanded descriptions state
  const [expandedDescs, setExpandedDescs] = useState<Set<number>>(new Set())
  const toggleDesc = (index: number) => {
    setExpandedDescs(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }

  // Compute section subtotals for display
  const sectionSubtotals = (() => {
    const result: Record<number, number> = {}
    let currentSectionIndex = -1
    let runningTotal = 0
    for (let i = 0; i < lignes.length; i++) {
      if (isSection(lignes[i])) {
        if (currentSectionIndex >= 0) result[currentSectionIndex] = runningTotal
        currentSectionIndex = i
        runningTotal = 0
      } else if (currentSectionIndex >= 0 && !lignes[i].is_option) {
        runningTotal += lignes[i].quantite * lignes[i].prix_unitaire
      }
    }
    if (currentSectionIndex >= 0) result[currentSectionIndex] = runningTotal
    return result
  })()

  // --- Section helper ---
  const isSection = (ligne: EditableLigne) => ligne.description === '__SECTION__'

  const addLine = () => {
    setLignes([...lignes, { designation: '', description: '', unite: 'pce', quantite: 1, prix_unitaire: 0 }])
  }

  const addSection = () => {
    setLignes([...lignes, { designation: 'Nouvelle section', description: '__SECTION__', unite: 'pce', quantite: 0, prix_unitaire: 0 }])
  }

  const duplicateLine = (index: number) => {
    const source = lignes[index]
    const copy: EditableLigne = { ...source, id: undefined }
    const updated = [...lignes]
    updated.splice(index + 1, 0, copy)
    setLignes(updated)
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

  // --- Drag & drop handlers ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const updated = [...lignes]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(targetIndex, 0, moved)
    setLignes(updated)
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // --- Client swap ---
  const openClientSwap = async () => {
    const clients = await window.api.clients.list()
    setAllClients(clients)
    setShowClientSwap(true)
  }
  const handleClientSwap = async (clientId: string) => {
    if (!devis) return
    try {
      await window.api.devis.update(devis.id, {
        client_id: clientId,
        date: devis.date,
        validite: devis.validite,
        statut: devis.statut,
        objet: devis.objet || '',
        notes: devis.notes || '',
        conditions: devis.conditions || ''
      })
      const updated = await window.api.devis.get(devis.id)
      setDevis(updated)
      setShowClientSwap(false)
      toast.success('Client modifié')
    } catch {
      toast.error('Erreur lors du changement de client')
    }
  }

  // --- Import from old devis ---
  const openImportDevis = async () => {
    const list = await window.api.devis.list()
    setImportDevisList(list.filter((d: DevisWithClient) => d.id !== id))
    setImportSearch('')
    setImportSelectedDevis(null)
    setImportLignes([])
    setImportChecked(new Set())
    setShowImportDevis(true)
  }
  const handleImportSelectDevis = async (devisId: string) => {
    const detail = await window.api.devis.get(devisId)
    const lines = (detail.lignes || []) as DevisLigne[]
    setImportLignes(lines)
    setImportChecked(new Set(lines.map((_: DevisLigne, i: number) => i)))
    setImportSelectedDevis(devisId)
  }
  const handleImportConfirm = () => {
    const newLignes: EditableLigne[] = importLignes
      .filter((_: DevisLigne, i: number) => importChecked.has(i))
      .map((l: DevisLigne) => ({
        catalogue_item_id: l.catalogue_item_id || undefined,
        designation: l.designation,
        description: l.description || '',
        unite: l.unite,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire
      }))
    setLignes((prev) => [...prev, ...newLignes])
    setShowImportDevis(false)
    toast.success(`${newLignes.length} ligne${newLignes.length > 1 ? 's' : ''} importée${newLignes.length > 1 ? 's' : ''}`)
  }

  const handleSave = async () => {
    if (!devis) return
    setSaving(true)
    try {
      await window.api.devis.update(devis.id, {
        client_id: devis.client_id,
        date: devis.date,
        validite: devis.validite,
        statut: devis.statut,
        objet: devis.objet || '',
        notes: devis.notes || '',
        conditions: devis.conditions || ''
      })
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

  // --- Keyboard shortcuts (ref pattern to avoid re-attaching on every render) ---
  const shortcutRef = useRef({ handleSave, handleExportPdf, devis, navigate, toast })
  shortcutRef.current = { handleSave, handleExportPdf, devis, navigate, toast }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { handleSave, handleExportPdf, devis, navigate, toast } = shortcutRef.current
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        handleExportPdf()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
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
  }, [])

  // --- Auto-save (debounced 5s after last change) ---
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    // Skip auto-save on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    if (!devis || saving) return

    setAutoSaveStatus('idle')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving')
        await window.api.devis.update(devis.id, {
          client_id: devis.client_id,
          date: devis.date,
          validite: devis.validite,
          statut: devis.statut,
          objet: devis.objet || '',
          notes: devis.notes || '',
          conditions: devis.conditions || ''
        })
        await window.api.devis.saveLignes(devis.id, lignes)
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus('idle'), 2000)
      } catch {
        setAutoSaveStatus('idle')
      }
    }, 5000)

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [lignes, devis?.objet, devis?.notes, devis?.conditions, devis?.date, devis?.validite])

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
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {devis.client_entreprise || `${devis.client_prenom || ''} ${devis.client_nom}`}
              <button onClick={openClientSwap} className="rounded p-0.5 text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors" title="Changer de client">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </p>
            <input
              className="mt-1 w-full text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-0 p-0"
              placeholder="Objet du devis (ex: Rénovation cuisine)..."
              value={devis.objet || ''}
              onChange={(e) => setDevis({ ...devis, objet: e.target.value })}
            />
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
          {devis.statut !== 'refuse' && (
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
          {autoSaveStatus === 'saved' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" style={{ color: 'hsl(145 60% 40%)' }} />
              Enregistré
            </span>
          )}
          {autoSaveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground">Enregistrement...</span>
          )}
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
            {lignes.map((ligne, index) => {
              // --- Section separator row ---
              if (isSection(ligne)) {
                return (
                  <tr
                    key={index}
                    className={`transition-colors ${dragOverIndex === index ? 'border-t-2 border-primary' : ''}`}
                    style={{ background: 'hsl(var(--primary) / 0.06)' }}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <td className="px-1 py-1.5 text-center">
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing rounded p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    </td>
                    <td colSpan={4} className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                        <input
                          className="input text-sm font-bold flex-1"
                          style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))' }}
                          value={ligne.designation}
                          onChange={(e) => updateLine(index, 'designation', e.target.value)}
                          placeholder="Nom de la section"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {sectionSubtotals[index] !== undefined && (
                        <span className="text-xs font-semibold text-primary">{formatCHF(sectionSubtotals[index])}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => duplicateLine(index)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Dupliquer">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeLine(index)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              // --- Normal line row ---
              const isOpt = !!ligne.is_option
              return (
              <React.Fragment key={index}>
              <tr
                className={`hover:bg-muted/30 transition-colors ${dragOverIndex === index ? 'border-t-2 border-primary' : ''} ${dragIndex === index ? 'opacity-40' : ''} ${isOpt ? 'opacity-60' : ''}`}
                style={isOpt ? { borderLeft: '3px dashed hsl(var(--primary) / 0.4)' } : undefined}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                <td className="px-1 py-1.5 text-center">
                  <div className="flex flex-col items-center">
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      className="cursor-grab active:cursor-grabbing rounded p-0.5 text-muted-foreground/30 hover:text-foreground transition-colors mb-0.5"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </div>
                    <button onClick={() => moveLine(index, 'up')} disabled={index === 0} className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => moveLine(index, 'down')} disabled={index === lignes.length - 1} className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <input className="input text-sm flex-1" value={ligne.designation} onChange={(e) => updateLine(index, 'designation', e.target.value)} placeholder="Désignation" />
                    {isOpt && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 flex-shrink-0">Option</span>}
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <button
                    onClick={() => toggleDesc(index)}
                    className={`flex items-center gap-1 text-xs rounded px-2 py-1 transition-colors ${ligne.description ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
                    title={ligne.description ? 'Modifier la description' : 'Ajouter une description'}
                  >
                    <ChevronsUpDown className="h-3 w-3" />
                    {ligne.description ? 'Desc.' : '+ Desc.'}
                  </button>
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
                <td className={`px-3 py-1.5 text-right font-medium text-sm ${isOpt ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {formatCHF(ligne.quantite * ligne.prix_unitaire)}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <div className="flex gap-0.5 justify-center">
                    <button
                      onClick={() => {
                        const updated = [...lignes]
                        updated[index] = { ...updated[index], is_option: !updated[index].is_option }
                        setLignes(updated)
                      }}
                      className={`rounded p-1 transition-colors ${isOpt ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted hover:text-amber-500'}`}
                      title={isOpt ? 'Retirer option' : 'Marquer comme option'}
                    >
                      {isOpt ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => duplicateLine(index)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Dupliquer">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeLine(index)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              {/* Expandable description row */}
              {expandedDescs.has(index) && (
                <tr style={isOpt ? { borderLeft: '3px dashed hsl(var(--primary) / 0.4)' } : undefined}>
                  <td></td>
                  <td colSpan={6} className="px-3 pb-2">
                    <textarea
                      className="input text-sm w-full"
                      rows={2}
                      placeholder="Description technique, dimensions, finitions..."
                      value={ligne.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      autoFocus
                    />
                  </td>
                  <td></td>
                </tr>
              )}
              </React.Fragment>
              )
            })}
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
          <button onClick={openImportDevis} className="btn-secondary text-sm">
            <FileInput className="h-4 w-4" />
            Depuis un devis
          </button>
          <button onClick={addSection} className="btn-secondary text-sm">
            <Layers className="h-4 w-4" />
            Section
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
            {optionsTotal > 0 && (
              <div className="border-t border-border pt-2 mt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600 font-medium">Options</span>
                  <span className="text-amber-600 font-medium">+{formatCHF(optionsTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                  <span>Total avec options</span>
                  <span>{formatCHF(total + optionsTotal * (1 + tauxTva / 100) * (1 - remisePourcent / 100))}</span>
                </div>
              </div>
            )}
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

      {/* Client swap modal */}
      {showClientSwap && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                <RefreshCw className="h-5 w-5 inline-block mr-2 text-primary" />
                Changer de client
              </h3>
              <button onClick={() => setShowClientSwap(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Le devis sera attribué au nouveau client. Les lignes restent inchangées.
            </p>
            <ClientSearchInput
              clients={allClients}
              value={null}
              onChange={(clientId) => handleClientSwap(clientId)}
            />
          </div>
        </div>
      )}

      {/* Import from old devis modal */}
      {showImportDevis && (
        <div className="modal-overlay">
          <div className="modal w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                <FileInput className="h-5 w-5 inline-block mr-2 text-primary" />
                Importer depuis un devis
              </h3>
              <button onClick={() => setShowImportDevis(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!importSelectedDevis ? (
              /* Step 1: Choose a devis */
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="search-bar mb-3">
                  <Search className="search-icon" />
                  <input className="search-input" placeholder="Rechercher par numéro ou client..." value={importSearch} onChange={(e) => setImportSearch(e.target.value)} autoFocus />
                </div>
                <div className="overflow-y-auto flex-1 space-y-1">
                  {importDevisList
                    .filter((d) => {
                      if (!importSearch) return true
                      const q = importSearch.toLowerCase()
                      const name = clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })
                      return d.numero.toLowerCase().includes(q) || name.toLowerCase().includes(q)
                    })
                    .map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleImportSelectDevis(d.id)}
                        className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-primary">{d.numero}</span>
                            <span className="text-sm text-foreground ml-2">
                              {clientDisplayName({ nom: d.client_nom, prenom: d.client_prenom, entreprise: d.client_entreprise })}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-foreground">{formatCHF(d.total)}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(d.date)}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              /* Step 2: Select lines to import */
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-3 mb-3 p-3 rounded-lg" style={{ background: 'hsl(var(--primary) / 0.05)' }}>
                  <button onClick={() => { setImportSelectedDevis(null); setImportLignes([]) }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-foreground">
                    {importLignes.length} ligne{importLignes.length > 1 ? 's' : ''} disponible{importLignes.length > 1 ? 's' : ''}
                  </span>
                  <div className="ml-auto">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importChecked.size === importLignes.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setImportChecked(new Set(importLignes.map((_: DevisLigne, i: number) => i)))
                          } else {
                            setImportChecked(new Set())
                          }
                        }}
                        className="rounded border-border"
                      />
                      Tout sélectionner
                    </label>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Désignation</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Unité</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Qté</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Prix unit.</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {importLignes.map((l: DevisLigne, i: number) => (
                        <tr key={i} className={`hover:bg-muted/30 ${importChecked.has(i) ? '' : 'opacity-40'}`}>
                          <td className="px-3 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={importChecked.has(i)}
                              onChange={(e) => {
                                const next = new Set(importChecked)
                                if (e.target.checked) next.add(i); else next.delete(i)
                                setImportChecked(next)
                              }}
                              className="rounded border-border"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-foreground">
                            {l.description === '__SECTION__' ? <span className="font-bold text-primary">{l.designation}</span> : l.designation}
                          </td>
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
                  <div className="text-sm text-muted-foreground">
                    {importChecked.size} ligne{importChecked.size > 1 ? 's' : ''} sélectionnée{importChecked.size > 1 ? 's' : ''}
                  </div>
                  <button onClick={handleImportConfirm} disabled={importChecked.size === 0} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Importer {importChecked.size} ligne{importChecked.size > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}
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
              {/* Favorites first */}
              {(() => {
                const favs = filteredCatalogue.filter((item) => item.is_favorite)
                const others = filteredCatalogue.filter((item) => !item.is_favorite)
                const renderItem = (item: CatalogueItem) => {
                  const alreadyAdded = lignesCatalogueIds.has(item.id)
                  return (
                    <div key={item.id} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${alreadyAdded ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {item.is_favorite && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
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
                }
                return (
                  <>
                    {favs.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-600 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500" /> Favoris
                        </div>
                        {favs.map(renderItem)}
                        {others.length > 0 && <div className="border-t border-border my-1" />}
                      </>
                    )}
                    {others.map(renderItem)}
                  </>
                )
              })()}
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
