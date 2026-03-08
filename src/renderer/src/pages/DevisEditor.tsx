import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Save, Download, ArrowRight, Search, Check, Package, FileInput, RefreshCw, Layers, Undo2, Redo2 } from 'lucide-react'
import { useToast } from '../components/Toast'
import Breadcrumbs from '../components/Breadcrumbs'
import { devisStatutLabel, devisStatutColor } from '../utils/format'
import {
  SectionRow,
  LineRow,
  DevisTotals,
  ForfaitModal,
  TemplateSaveModal,
  ClientSwapModal,
  ImportDevisModal,
  CataloguePickerModal,
  isSection
} from '../components/devis'
import type { EditableLigne } from '../components/devis'
import type { DevisDetail, DevisLigne, CatalogueItem, Forfait, ForfaitCalculated, DevisWithClient, Client } from '../types'

export default function DevisEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  // --- Core state ---
  const [devis, setDevis] = useState<DevisDetail | null>(null)
  const [lignes, setLignes] = useState<EditableLigne[]>([])
  const [saving, setSaving] = useState(false)

  // --- Catalogue modal ---
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
  const [showCatalogue, setShowCatalogue] = useState(false)
  const [catalogueSearch, setCatalogueSearch] = useState('')
  const [catalogueAddedCount, setCatalogueAddedCount] = useState(0)

  // --- Forfait modal ---
  const [showForfait, setShowForfait] = useState(false)
  const [forfaits, setForfaits] = useState<Forfait[]>([])
  const [selectedForfait, setSelectedForfait] = useState<Forfait | null>(null)
  const [forfaitQuantite, setForfaitQuantite] = useState(1)
  const [forfaitPreview, setForfaitPreview] = useState<ForfaitCalculated[]>([])

  // --- Calculator ---
  const [calcLineIndex, setCalcLineIndex] = useState<number | null>(null)
  const [calcL, setCalcL] = useState('')
  const [calcW, setCalcW] = useState('')
  const [calcH, setCalcH] = useState('')
  const [calcPerte, setCalcPerte] = useState('10')

  // --- Drag & drop ---
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // --- Client swap ---
  const [showClientSwap, setShowClientSwap] = useState(false)
  const [allClients, setAllClients] = useState<Client[]>([])

  // --- Import from old devis ---
  const [showImportDevis, setShowImportDevis] = useState(false)
  const [importDevisList, setImportDevisList] = useState<DevisWithClient[]>([])
  const [importSearch, setImportSearch] = useState('')
  const [importSelectedDevis, setImportSelectedDevis] = useState<string | null>(null)
  const [importLignes, setImportLignes] = useState<DevisLigne[]>([])
  const [importChecked, setImportChecked] = useState<Set<number>>(new Set())

  // --- Template save ---
  const [showTemplateSave, setShowTemplateSave] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // --- Expanded descriptions & notes ---
  const [expandedDescs, setExpandedDescs] = useState<Set<number>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set())

  // --- Undo/Redo history ---
  const [history, setHistory] = useState<EditableLigne[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoing = useRef(false)

  // --- Auto-save ---
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoad = useRef(true)

  // ═══════════════════════════════════════════════
  // Load data
  // ═══════════════════════════════════════════════

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
          is_option: !!l.is_option,
          note_interne: (l as Record<string, unknown>).note_interne as string || ''
        }))
      )
    })
    window.api.catalogue.list().then(setCatalogue)
  }, [id])

  // ═══════════════════════════════════════════════
  // Computed values
  // ═══════════════════════════════════════════════

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

  // Post numbering: 1.1, 1.2, 2.1, etc.
  const postNumbers = (() => {
    const result: Record<number, string> = {}
    let sectionNum = 0
    let lineInSection = 0
    let sectionIndexMap: Record<number, number> = {}
    for (let i = 0; i < lignes.length; i++) {
      if (isSection(lignes[i])) {
        sectionNum++
        lineInSection = 0
        sectionIndexMap[i] = sectionNum
      } else {
        lineInSection++
        result[i] = sectionNum > 0 ? `${sectionNum}.${lineInSection}` : `${lineInSection}`
      }
    }
    return { lines: result, sections: sectionIndexMap }
  })()

  const lignesCatalogueIds = new Set(lignes.filter((l) => l.catalogue_item_id).map((l) => l.catalogue_item_id))

  // ═══════════════════════════════════════════════
  // Line handlers
  // ═══════════════════════════════════════════════

  const updateLine = (index: number, field: keyof EditableLigne, value: string | number) => {
    const updated = [...lignes]
    updated[index] = { ...updated[index], [field]: value }
    setLignes(updated)
  }

  const removeLine = (index: number) => setLignes(lignes.filter((_, i) => i !== index))

  const moveLine = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= lignes.length) return
    const updated = [...lignes]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setLignes(updated)
  }

  const duplicateLine = (index: number) => {
    const copy: EditableLigne = { ...lignes[index], id: undefined }
    const updated = [...lignes]
    updated.splice(index + 1, 0, copy)
    setLignes(updated)
  }

  const addLine = () => {
    setLignes([...lignes, { designation: '', description: '', unite: 'pce', quantite: 1, prix_unitaire: 0 }])
  }

  const addSection = () => {
    setLignes([...lignes, { designation: 'Nouvelle section', description: '__SECTION__', unite: 'pce', quantite: 0, prix_unitaire: 0 }])
  }

  const toggleDesc = (index: number) => {
    setExpandedDescs(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }

  const toggleOption = (index: number) => {
    const updated = [...lignes]
    updated[index] = { ...updated[index], is_option: !updated[index].is_option }
    setLignes(updated)
  }

  const toggleNote = (index: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index); else next.add(index)
      return next
    })
  }

  // ═══════════════════════════════════════════════
  // Undo / Redo
  // ═══════════════════════════════════════════════

  const pushHistory = useRef((snapshot: EditableLigne[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(snapshot.map(l => ({ ...l })))
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  })

  // Update pushHistory ref when historyIndex changes
  pushHistory.current = (snapshot: EditableLigne[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(snapshot.map(l => ({ ...l })))
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }

  // Push to history on lignes change (debounced)
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (isUndoRedoing.current) {
      isUndoRedoing.current = false
      return
    }
    if (lignes.length === 0) return
    if (historyTimer.current) clearTimeout(historyTimer.current)
    historyTimer.current = setTimeout(() => {
      pushHistory.current(lignes)
    }, 500)
    return () => { if (historyTimer.current) clearTimeout(historyTimer.current) }
  }, [lignes])

  const undo = () => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    isUndoRedoing.current = true
    setHistoryIndex(newIndex)
    setLignes(history[newIndex].map(l => ({ ...l })))
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    isUndoRedoing.current = true
    setHistoryIndex(newIndex)
    setLignes(history[newIndex].map(l => ({ ...l })))
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // ═══════════════════════════════════════════════
  // Duplicate entire section (header + lines)
  // ═══════════════════════════════════════════════

  const duplicateSection = (sectionIndex: number) => {
    // Find all lines belonging to this section (until next section or end)
    let endIndex = lignes.length
    for (let i = sectionIndex + 1; i < lignes.length; i++) {
      if (isSection(lignes[i])) { endIndex = i; break }
    }
    const sectionLines = lignes.slice(sectionIndex, endIndex).map(l => ({ ...l, id: undefined }))
    const updated = [...lignes]
    updated.splice(endIndex, 0, ...sectionLines)
    setLignes(updated)
    toast.success(`Section dupliquée (${sectionLines.length} lignes)`)
  }

  // ═══════════════════════════════════════════════
  // Drag & drop
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Calculator
  // ═══════════════════════════════════════════════

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
    if (result > 0) updateLine(calcLineIndex, 'quantite', result)
    setCalcLineIndex(null)
  }

  // ═══════════════════════════════════════════════
  // Catalogue handlers
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Client swap
  // ═══════════════════════════════════════════════

  const openClientSwap = async () => {
    const clients = await window.api.clients.list()
    setAllClients(clients)
    setShowClientSwap(true)
  }

  const handleClientSwap = async (clientId: string) => {
    if (!devis) return
    try {
      await window.api.devis.update(devis.id, {
        client_id: clientId, date: devis.date, validite: devis.validite,
        statut: devis.statut, objet: devis.objet || '', notes: devis.notes || '', conditions: devis.conditions || ''
      })
      const updated = await window.api.devis.get(devis.id)
      setDevis(updated)
      setShowClientSwap(false)
      toast.success('Client modifié')
    } catch {
      toast.error('Erreur lors du changement de client')
    }
  }

  // ═══════════════════════════════════════════════
  // Import devis
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Forfait handlers
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Save / Export / Statut
  // ═══════════════════════════════════════════════

  const handleSave = async () => {
    if (!devis) return
    setSaving(true)
    try {
      await window.api.devis.update(devis.id, {
        client_id: devis.client_id, date: devis.date, validite: devis.validite,
        statut: devis.statut, objet: devis.objet || '', notes: devis.notes || '', conditions: devis.conditions || ''
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
      toast.error("Erreur lors de l'export PDF")
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

  // ═══════════════════════════════════════════════
  // Keyboard shortcuts
  // ═══════════════════════════════════════════════

  const shortcutRef = useRef({ handleSave, handleExportPdf, devis, navigate, toast, undo, redo })
  shortcutRef.current = { handleSave, handleExportPdf, devis, navigate, toast, undo, redo }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { handleSave, handleExportPdf, devis, navigate, toast, undo, redo } = shortcutRef.current
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
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

  // ═══════════════════════════════════════════════
  // Auto-save (debounced 5s)
  // ═══════════════════════════════════════════════

  useEffect(() => {
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
          client_id: devis.client_id, date: devis.date, validite: devis.validite,
          statut: devis.statut, objet: devis.objet || '', notes: devis.notes || '', conditions: devis.conditions || ''
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

  // ═══════════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Devis', to: '/devis' }, { label: `Devis ${devis.numero}` }]} />

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
          <div className="flex gap-0.5 border-r border-border pr-2 mr-1">
            <button onClick={undo} disabled={!canUndo} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors" title="Annuler (Ctrl+Z)">
              <Undo2 className="h-4 w-4" />
            </button>
            <button onClick={redo} disabled={!canRedo} className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors" title="Rétablir (Ctrl+Shift+Z)">
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
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
              if (isSection(ligne)) {
                return (
                  <SectionRow
                    key={index}
                    ligne={ligne}
                    index={index}
                    subtotal={sectionSubtotals[index]}
                    sectionNumber={postNumbers.sections[index]}
                    isDragOver={dragOverIndex === index}
                    onUpdateLine={updateLine}
                    onDuplicateLine={duplicateLine}
                    onDuplicateSection={duplicateSection}
                    onRemoveLine={removeLine}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                  />
                )
              }

              return (
                <LineRow
                  key={index}
                  ligne={ligne}
                  index={index}
                  totalLines={lignes.length}
                  postNumber={postNumbers.lines[index]}
                  isDescExpanded={expandedDescs.has(index)}
                  isNoteExpanded={expandedNotes.has(index)}
                  isDragOver={dragOverIndex === index}
                  isDragging={dragIndex === index}
                  calcOpen={calcLineIndex === index}
                  calcL={calcL}
                  calcW={calcW}
                  calcH={calcH}
                  calcPerte={calcPerte}
                  onCalcLChange={setCalcL}
                  onCalcWChange={setCalcW}
                  onCalcHChange={setCalcH}
                  onCalcPerteChange={setCalcPerte}
                  onCalcOpen={openCalc}
                  onCalcApply={applyCalc}
                  onCalcCancel={() => setCalcLineIndex(null)}
                  onUpdateLine={updateLine}
                  onRemoveLine={removeLine}
                  onMoveLine={moveLine}
                  onDuplicateLine={duplicateLine}
                  onToggleDesc={toggleDesc}
                  onToggleOption={toggleOption}
                  onToggleNote={toggleNote}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
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
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0
              if (devis) setDevis({ ...devis, remise_pourcent: val })
            }}
          />
        </div>
      </div>

      {/* Totals */}
      <DevisTotals
        sousTotal={sousTotal}
        remisePourcent={remisePourcent}
        remiseMontant={remiseMontant}
        tauxTva={tauxTva}
        montantTva={montantTva}
        total={total}
        optionsTotal={optionsTotal}
      />

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

      {/* ══════════════ MODALS ══════════════ */}

      {showForfait && (
        <ForfaitModal
          forfaits={forfaits}
          selectedForfait={selectedForfait}
          forfaitQuantite={forfaitQuantite}
          forfaitPreview={forfaitPreview}
          onSelectForfait={handleForfaitSelect}
          onBackToList={() => { setSelectedForfait(null); setForfaitPreview([]) }}
          onQuantiteChange={handleForfaitQteChange}
          onAddLines={addForfaitLines}
          onClose={() => setShowForfait(false)}
        />
      )}

      {showTemplateSave && (
        <TemplateSaveModal
          lignesCount={lignes.length}
          templateName={templateName}
          onTemplateNameChange={setTemplateName}
          onSave={handleSaveAsTemplate}
          onClose={() => { setShowTemplateSave(false); setTemplateName('') }}
        />
      )}

      {showClientSwap && (
        <ClientSwapModal
          clients={allClients}
          onSwap={handleClientSwap}
          onClose={() => setShowClientSwap(false)}
        />
      )}

      {showImportDevis && (
        <ImportDevisModal
          devisList={importDevisList}
          importSearch={importSearch}
          onSearchChange={setImportSearch}
          selectedDevisId={importSelectedDevis}
          importLignes={importLignes}
          importChecked={importChecked}
          onSelectDevis={handleImportSelectDevis}
          onBackToList={() => { setImportSelectedDevis(null); setImportLignes([]) }}
          onToggleLine={(i, checked) => {
            const next = new Set(importChecked)
            if (checked) next.add(i); else next.delete(i)
            setImportChecked(next)
          }}
          onToggleAll={(checked) => {
            if (checked) {
              setImportChecked(new Set(importLignes.map((_: DevisLigne, i: number) => i)))
            } else {
              setImportChecked(new Set())
            }
          }}
          onConfirm={handleImportConfirm}
          onClose={() => setShowImportDevis(false)}
        />
      )}

      {showCatalogue && (
        <CataloguePickerModal
          catalogue={catalogue}
          catalogueSearch={catalogueSearch}
          onSearchChange={setCatalogueSearch}
          catalogueAddedCount={catalogueAddedCount}
          addedCatalogueIds={lignesCatalogueIds}
          onAddItem={addFromCatalogue}
          onClose={closeCatalogue}
        />
      )}
    </div>
  )
}
