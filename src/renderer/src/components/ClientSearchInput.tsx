import { useState, useRef, useEffect } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { clientDisplayName } from '../utils/format'
import type { Client } from '../types'

interface ClientSearchInputProps {
  clients: Client[]
  value: string | null
  onChange: (clientId: string) => void
  onCreateNew?: () => void
}

export default function ClientSearchInput({ clients, value, onChange, onCreateNew }: ClientSearchInputProps) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find the currently selected client to display their name
  const selectedClient = value ? clients.find((c) => c.id === value) : null

  const filtered = query.trim()
    ? clients.filter((c) => {
        const q = query.toLowerCase()
        return (
          c.nom.toLowerCase().includes(q) ||
          (c.prenom || '').toLowerCase().includes(q) ||
          (c.entreprise || '').toLowerCase().includes(q) ||
          (c.ville || '').toLowerCase().includes(q) ||
          (c.telephone || '').toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : clients.slice(0, 8)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = (client: Client) => {
    onChange(client.id)
    setQuery('')
    setShowDropdown(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current) {
      const items = dropdownRef.current.children
      if (items[selectedIndex]) {
        (items[selectedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  return (
    <div className="relative">
      {selectedClient && !showDropdown ? (
        <div
          className="input cursor-pointer flex items-center justify-between"
          onClick={() => { setShowDropdown(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        >
          <span className="text-foreground">{clientDisplayName(selectedClient)}</span>
          <span className="text-xs text-muted-foreground">{selectedClient.ville || ''}</span>
        </div>
      ) : (
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Rechercher un client (nom, entreprise, ville)..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      )}

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-border shadow-lg"
          style={{ background: 'hsl(var(--card))' }}
        >
          {filtered.map((c, i) => (
            <button
              key={c.id}
              className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                i === selectedIndex ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/50'
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c) }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div>
                <div className="text-sm font-medium">{clientDisplayName(c)}</div>
                {c.telephone && <span className="text-xs text-muted-foreground">{c.telephone}</span>}
              </div>
              {c.ville && <span className="text-xs text-muted-foreground">{c.ville}</span>}
            </button>
          ))}
          {filtered.length === 0 && query.trim() && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Aucun client trouvé</p>
              {onCreateNew && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); onCreateNew() }}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Créer un nouveau client
                </button>
              )}
            </div>
          )}
          {onCreateNew && filtered.length > 0 && (
            <button
              onMouseDown={(e) => { e.preventDefault(); onCreateNew() }}
              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/5 border-t border-border inline-flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Créer un nouveau client
            </button>
          )}
        </div>
      )}
    </div>
  )
}
