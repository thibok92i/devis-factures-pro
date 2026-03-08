import { X, RefreshCw } from 'lucide-react'
import ClientSearchInput from '../ClientSearchInput'
import type { Client } from '../../types'

interface ClientSwapModalProps {
  clients: Client[]
  onSwap: (clientId: string) => void
  onClose: () => void
}

export default function ClientSwapModal({ clients, onSwap, onClose }: ClientSwapModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            <RefreshCw className="h-5 w-5 inline-block mr-2 text-primary" />
            Changer de client
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Le devis sera attribué au nouveau client. Les lignes restent inchangées.
        </p>
        <ClientSearchInput
          clients={clients}
          value={null}
          onChange={(clientId) => onSwap(clientId)}
        />
      </div>
    </div>
  )
}
