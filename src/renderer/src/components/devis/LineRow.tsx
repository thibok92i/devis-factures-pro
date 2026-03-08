import React from 'react'
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Calculator,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  StickyNote
} from 'lucide-react'
import { formatCHF } from '../../utils/format'
import CalculatorPopover from './CalculatorPopover'
import type { EditableLigne } from './types'

interface LineRowProps {
  ligne: EditableLigne
  index: number
  totalLines: number
  postNumber?: string
  isDescExpanded: boolean
  isNoteExpanded?: boolean
  isDragOver: boolean
  isDragging: boolean
  // Calculator state
  calcOpen: boolean
  calcL: string
  calcW: string
  calcH: string
  calcPerte: string
  onCalcLChange: (v: string) => void
  onCalcWChange: (v: string) => void
  onCalcHChange: (v: string) => void
  onCalcPerteChange: (v: string) => void
  onCalcOpen: (index: number) => void
  onCalcApply: () => void
  onCalcCancel: () => void
  // Line handlers
  onUpdateLine: (index: number, field: keyof EditableLigne, value: string | number) => void
  onRemoveLine: (index: number) => void
  onMoveLine: (index: number, direction: 'up' | 'down') => void
  onDuplicateLine: (index: number) => void
  onToggleDesc: (index: number) => void
  onToggleOption: (index: number) => void
  onToggleNote?: (index: number) => void
  // Drag & drop
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}

export default function LineRow({
  ligne,
  index,
  totalLines,
  postNumber,
  isDescExpanded,
  isNoteExpanded,
  isDragOver,
  isDragging,
  calcOpen,
  calcL,
  calcW,
  calcH,
  calcPerte,
  onCalcLChange,
  onCalcWChange,
  onCalcHChange,
  onCalcPerteChange,
  onCalcOpen,
  onCalcApply,
  onCalcCancel,
  onUpdateLine,
  onRemoveLine,
  onMoveLine,
  onDuplicateLine,
  onToggleDesc,
  onToggleOption,
  onToggleNote,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: LineRowProps) {
  const isOpt = !!ligne.is_option

  return (
    <React.Fragment>
      <tr
        className={`hover:bg-muted/30 transition-colors ${isDragOver ? 'border-t-2 border-primary' : ''} ${isDragging ? 'opacity-40' : ''} ${isOpt ? 'opacity-60' : ''}`}
        style={isOpt ? { borderLeft: '3px dashed hsl(var(--primary) / 0.4)' } : undefined}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
      >
        {/* Drag handle + post number + move buttons */}
        <td className="px-1 py-1.5 text-center">
          <div className="flex flex-col items-center">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragEnd={onDragEnd}
              className="cursor-grab active:cursor-grabbing rounded p-0.5 text-muted-foreground/30 hover:text-foreground transition-colors mb-0.5"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            {postNumber && (
              <span className="text-[10px] font-mono text-muted-foreground/60 mb-0.5">{postNumber}</span>
            )}
            <button onClick={() => onMoveLine(index, 'up')} disabled={index === 0} className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors">
              <ChevronUp className="h-3 w-3" />
            </button>
            <button onClick={() => onMoveLine(index, 'down')} disabled={index === totalLines - 1} className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground disabled:opacity-30 transition-colors">
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </td>

        {/* Designation */}
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            <input className="input text-sm flex-1" value={ligne.designation} onChange={(e) => onUpdateLine(index, 'designation', e.target.value)} placeholder="Désignation" />
            {isOpt && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 flex-shrink-0">Option</span>}
          </div>
        </td>

        {/* Description toggle */}
        <td className="px-3 py-1.5">
          <button
            onClick={() => onToggleDesc(index)}
            className={`flex items-center gap-1 text-xs rounded px-2 py-1 transition-colors ${ligne.description ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
            title={ligne.description ? 'Modifier la description' : 'Ajouter une description'}
          >
            <ChevronsUpDown className="h-3 w-3" />
            {ligne.description ? 'Desc.' : '+ Desc.'}
          </button>
        </td>

        {/* Unite */}
        <td className="px-3 py-1.5">
          <select className="input text-sm text-center" value={ligne.unite} onChange={(e) => onUpdateLine(index, 'unite', e.target.value)}>
            <option value="pce">pce</option>
            <option value="m">m</option>
            <option value="m²">m²</option>
            <option value="m³">m³</option>
            <option value="kg">kg</option>
            <option value="h">h</option>
            <option value="forfait">forfait</option>
          </select>
        </td>

        {/* Quantite + calculator */}
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            <input className="input text-sm text-right flex-1" type="number" step="0.01" min="0" value={ligne.quantite} onChange={(e) => onUpdateLine(index, 'quantite', parseFloat(e.target.value) || 0)} />
            {['m²', 'm', 'm³'].includes(ligne.unite) && (
              <button onClick={() => onCalcOpen(index)} className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0" title="Calculateur">
                <Calculator className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {calcOpen && (
            <CalculatorPopover
              unite={ligne.unite}
              calcL={calcL}
              calcW={calcW}
              calcH={calcH}
              calcPerte={calcPerte}
              onCalcLChange={onCalcLChange}
              onCalcWChange={onCalcWChange}
              onCalcHChange={onCalcHChange}
              onCalcPerteChange={onCalcPerteChange}
              onApply={onCalcApply}
              onCancel={onCalcCancel}
            />
          )}
        </td>

        {/* Prix unitaire */}
        <td className="px-3 py-1.5">
          <input className="input text-sm text-right" type="number" step="0.05" min="0" value={ligne.prix_unitaire} onChange={(e) => onUpdateLine(index, 'prix_unitaire', parseFloat(e.target.value) || 0)} />
        </td>

        {/* Total */}
        <td className={`px-3 py-1.5 text-right font-medium text-sm ${isOpt ? 'text-muted-foreground' : 'text-foreground'}`}>
          {formatCHF(ligne.quantite * ligne.prix_unitaire)}
        </td>

        {/* Actions */}
        <td className="px-3 py-1.5 text-center">
          <div className="flex gap-0.5 justify-center">
            <button
              onClick={() => onToggleOption(index)}
              className={`rounded p-1 transition-colors ${isOpt ? 'text-amber-500 hover:bg-amber-500/10' : 'text-muted-foreground hover:bg-muted hover:text-amber-500'}`}
              title={isOpt ? 'Retirer option' : 'Marquer comme option'}
            >
              {isOpt ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
            </button>
            {onToggleNote && (
              <button
                onClick={() => onToggleNote(index)}
                className={`rounded p-1 transition-colors ${ligne.note_interne ? 'text-amber-600 bg-amber-500/10' : 'text-muted-foreground hover:bg-muted hover:text-amber-600'}`}
                title={ligne.note_interne ? 'Modifier la note interne' : 'Ajouter une note interne'}
              >
                <StickyNote className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => onDuplicateLine(index)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Dupliquer">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onRemoveLine(index)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expandable description row */}
      {isDescExpanded && (
        <tr style={isOpt ? { borderLeft: '3px dashed hsl(var(--primary) / 0.4)' } : undefined}>
          <td></td>
          <td colSpan={6} className="px-3 pb-2">
            <textarea
              className="input text-sm w-full"
              rows={2}
              placeholder="Description technique, dimensions, finitions..."
              value={ligne.description}
              onChange={(e) => onUpdateLine(index, 'description', e.target.value)}
              autoFocus
            />
          </td>
          <td></td>
        </tr>
      )}

      {/* Expandable internal note row (not printed on PDF) */}
      {isNoteExpanded && (
        <tr style={{ background: 'hsl(45 80% 96%)' }}>
          <td></td>
          <td colSpan={6} className="px-3 pb-2 pt-1">
            <div className="flex items-start gap-2">
              <StickyNote className="h-3.5 w-3.5 text-amber-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] uppercase font-semibold text-amber-700">Note interne (non imprimée)</span>
                <textarea
                  className="input text-sm w-full mt-1"
                  style={{ background: 'hsl(45 60% 98%)', borderColor: 'hsl(45 50% 80%)' }}
                  rows={2}
                  placeholder="Note privée : marge, fournisseur, délai..."
                  value={ligne.note_interne || ''}
                  onChange={(e) => onUpdateLine(index, 'note_interne', e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          </td>
          <td></td>
        </tr>
      )}
    </React.Fragment>
  )
}
