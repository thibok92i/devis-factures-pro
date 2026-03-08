import React from 'react'

interface CalculatorPopoverProps {
  unite: string
  calcL: string
  calcW: string
  calcH: string
  calcPerte: string
  onCalcLChange: (v: string) => void
  onCalcWChange: (v: string) => void
  onCalcHChange: (v: string) => void
  onCalcPerteChange: (v: string) => void
  onApply: () => void
  onCancel: () => void
}

export default function CalculatorPopover({
  unite,
  calcL,
  calcW,
  calcH,
  calcPerte,
  onCalcLChange,
  onCalcWChange,
  onCalcHChange,
  onCalcPerteChange,
  onApply,
  onCancel
}: CalculatorPopoverProps) {
  const l = parseFloat(calcL) || 0
  const w = parseFloat(calcW) || 0
  const h = parseFloat(calcH) || 0
  const p = parseFloat(calcPerte) || 0
  let result = unite === 'm³' ? l * w * h : unite === 'm²' ? l * w : l
  if (p > 0) result *= (1 + p / 100)
  const display = (Math.ceil(result * 100) / 100).toFixed(2)

  return (
    <div className="absolute z-50 mt-1 p-3 rounded-lg border border-border shadow-lg" style={{ background: 'hsl(var(--card))' }}>
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Calculateur {unite}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <input className="input text-sm w-20 text-right" type="number" step="0.01" placeholder="Long." value={calcL} onChange={(e) => onCalcLChange(e.target.value)} autoFocus />
        {(unite === 'm²' || unite === 'm³') && (
          <>
            <span className="text-muted-foreground text-sm">×</span>
            <input className="input text-sm w-20 text-right" type="number" step="0.01" placeholder="Larg." value={calcW} onChange={(e) => onCalcWChange(e.target.value)} />
          </>
        )}
        {unite === 'm³' && (
          <>
            <span className="text-muted-foreground text-sm">×</span>
            <input className="input text-sm w-20 text-right" type="number" step="0.01" placeholder="Haut." value={calcH} onChange={(e) => onCalcHChange(e.target.value)} />
          </>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">+ Perte</span>
        <input className="input text-sm w-16 text-right" type="number" step="1" value={calcPerte} onChange={(e) => onCalcPerteChange(e.target.value)} />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">
          = {display} {unite}
        </span>
        <div className="flex gap-1">
          <button onClick={onCancel} className="btn-ghost text-xs px-2 py-1">Annuler</button>
          <button onClick={onApply} className="btn-primary text-xs px-2 py-1">Appliquer</button>
        </div>
      </div>
    </div>
  )
}
