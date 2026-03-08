import { formatCHF } from '../../utils/format'

interface DevisTotalsProps {
  sousTotal: number
  remisePourcent: number
  remiseMontant: number
  tauxTva: number
  montantTva: number
  total: number
  optionsTotal: number
}

export default function DevisTotals({
  sousTotal,
  remisePourcent,
  remiseMontant,
  tauxTva,
  montantTva,
  total,
  optionsTotal
}: DevisTotalsProps) {
  return (
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
  )
}
