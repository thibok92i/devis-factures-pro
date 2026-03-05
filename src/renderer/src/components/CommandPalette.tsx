import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Users, FileText, Receipt,
  Package, Settings, Plus
} from 'lucide-react'

interface Command {
  id: string
  label: string
  description?: string
  icon: typeof Search
  action: () => void
  keywords: string[]
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const go = useCallback((path: string) => {
    navigate(path)
    setOpen(false)
  }, [navigate])

  const commands: Command[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, action: () => go('/dashboard'), keywords: ['accueil', 'home', 'stats'] },
    { id: 'clients', label: 'Clients', icon: Users, action: () => go('/clients'), keywords: ['client', 'contact'] },
    { id: 'new-client', label: 'Nouveau client', description: 'Ajouter un client', icon: Plus, action: () => go('/clients?action=new'), keywords: ['ajouter', 'créer', 'client'] },
    { id: 'devis', label: 'Devis', icon: FileText, action: () => go('/devis'), keywords: ['devis', 'offre', 'proposition'] },
    { id: 'new-devis', label: 'Nouveau devis', description: 'Créer un devis', icon: Plus, action: () => go('/devis?action=new'), keywords: ['ajouter', 'créer', 'devis'] },
    { id: 'factures', label: 'Factures', icon: Receipt, action: () => go('/factures'), keywords: ['facture', 'paiement', 'invoice'] },
    { id: 'catalogue', label: 'Catalogue', icon: Package, action: () => go('/catalogue'), keywords: ['article', 'matériau', 'produit', 'prix'] },
    { id: 'new-article', label: 'Nouvel article', description: 'Ajouter au catalogue', icon: Plus, action: () => go('/catalogue?action=new'), keywords: ['ajouter', 'créer', 'article'] },
    { id: 'settings', label: 'Réglages', icon: Settings, action: () => go('/settings'), keywords: ['paramètres', 'configuration', 'entreprise', 'tva'] },
  ]

  const filtered = query.trim()
    ? commands.filter((cmd) => {
        const q = query.toLowerCase()
        return cmd.label.toLowerCase().includes(q) ||
          cmd.keywords.some((k) => k.includes(q)) ||
          (cmd.description || '').toLowerCase().includes(q)
      })
    : commands

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery('')
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden"
        style={{
          background: 'hsl(var(--card))',
          borderColor: 'hsl(var(--border))'
        }}
      >
        <div className="flex items-center gap-3 border-b px-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 py-3.5 text-sm outline-none placeholder:text-muted-foreground bg-transparent text-foreground"
            placeholder="Rechercher une page, action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted))' }}>
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>
          )}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.id}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === selectedIndex ? 'text-primary' : 'text-foreground hover:bg-muted/50'
                }`}
                style={i === selectedIndex ? { background: 'hsl(var(--primary) / 0.08)' } : {}}
                onClick={() => cmd.action()}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon className={`h-4 w-4 shrink-0 ${i === selectedIndex ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{cmd.label}</span>
                  {cmd.description && (
                    <span className="ml-2 text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.5)' }}>
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>esc fermer</span>
        </div>
      </div>
    </div>
  )
}
