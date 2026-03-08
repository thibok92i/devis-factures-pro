import React from 'react'
import { GripVertical, Copy, CopyPlus, Trash2, Layers } from 'lucide-react'
import { formatCHF } from '../../utils/format'
import type { EditableLigne } from './types'

interface SectionRowProps {
  ligne: EditableLigne
  index: number
  subtotal?: number
  sectionNumber?: number
  isDragOver: boolean
  onUpdateLine: (index: number, field: keyof EditableLigne, value: string | number) => void
  onDuplicateLine: (index: number) => void
  onDuplicateSection?: (index: number) => void
  onRemoveLine: (index: number) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}

export default function SectionRow({
  ligne,
  index,
  subtotal,
  sectionNumber,
  isDragOver,
  onUpdateLine,
  onDuplicateLine,
  onDuplicateSection,
  onRemoveLine,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: SectionRowProps) {
  return (
    <tr
      className={`transition-colors ${isDragOver ? 'border-t-2 border-primary' : ''}`}
      style={{ background: 'hsl(var(--primary) / 0.06)' }}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      <td className="px-1 py-1.5 text-center">
        <div
          draggable
          onDragStart={(e) => onDragStart(e, index)}
          onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing rounded p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </td>
      <td colSpan={4} className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          {sectionNumber !== undefined && (
            <span className="text-xs font-bold text-primary/60 min-w-[1.5rem]">{sectionNumber}.</span>
          )}
          <Layers className="h-4 w-4 text-primary flex-shrink-0" />
          <input
            className="input text-sm font-bold flex-1"
            style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))' }}
            value={ligne.designation}
            onChange={(e) => onUpdateLine(index, 'designation', e.target.value)}
            placeholder="Nom de la section"
          />
        </div>
      </td>
      <td className="px-3 py-1.5 text-right">
        {subtotal !== undefined && (
          <span className="text-xs font-semibold text-primary">{formatCHF(subtotal)}</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-center">
        <div className="flex gap-0.5 justify-center">
          {onDuplicateSection && (
            <button onClick={() => onDuplicateSection(index)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Dupliquer la section entière">
              <CopyPlus className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => onDuplicateLine(index)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors" title="Dupliquer l'en-tête">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onRemoveLine(index)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Supprimer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
