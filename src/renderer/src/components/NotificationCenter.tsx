import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, FileText, Receipt, X, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  type: 'facture_overdue' | 'devis_expiring' | 'facture_unpaid'
  title: string
  message: string
  link: string
  read: boolean
  createdAt: Date
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const loadNotifications = useCallback(async () => {
    const notifs: Notification[] = []

    try {
      // Factures en retard
      const overdueList = await window.api.factures.overdue()
      if (Array.isArray(overdueList)) {
        for (const f of overdueList as Array<Record<string, unknown>>) {
          notifs.push({
            id: `overdue-${f.id}`,
            type: 'facture_overdue',
            title: 'Facture en retard',
            message: `${f.numero} — échéance dépassée`,
            link: `/factures/${f.id}`,
            read: false,
            createdAt: new Date()
          })
        }
      }

      // Devis expirants (validité dans les 7 prochains jours)
      const allDevis = await window.api.devis.list()
      const now = new Date()
      const in7days = new Date(now.getTime() + 7 * 86400000)
      for (const d of allDevis) {
        if (d.statut !== 'envoye') continue
        const validite = new Date(d.validite)
        if (validite >= now && validite <= in7days) {
          notifs.push({
            id: `expiring-${d.id}`,
            type: 'devis_expiring',
            title: 'Devis bientôt expiré',
            message: `${d.numero} — expire le ${validite.toLocaleDateString('fr-CH')}`,
            link: `/devis/${d.id}`,
            read: false,
            createdAt: new Date()
          })
        }
      }

      // Factures envoyées non payées > 15 jours
      const allFactures = await window.api.factures.list()
      const fifteenAgo = new Date(now.getTime() - 15 * 86400000)
      for (const f of allFactures) {
        if (f.statut !== 'envoyee') continue
        const created = new Date(f.date || f.created_at)
        if (created < fifteenAgo) {
          notifs.push({
            id: `unpaid-${f.id}`,
            type: 'facture_unpaid',
            title: 'Facture impayée',
            message: `${f.numero} — envoyée il y a plus de 15 jours`,
            link: `/factures/${f.id}`,
            read: false,
            createdAt: new Date()
          })
        }
      }
    } catch {
      // Silently fail — non-critical feature
    }

    // Restore read state from localStorage
    const readIds = JSON.parse(localStorage.getItem('notif_read') || '[]') as string[]
    for (const n of notifs) {
      if (readIds.includes(n.id)) n.read = true
    }

    setNotifications(notifs)
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 5 * 60 * 1000) // Refresh every 5 min
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const readIds = JSON.parse(localStorage.getItem('notif_read') || '[]') as string[]
    if (!readIds.includes(id)) {
      readIds.push(id)
      localStorage.setItem('notif_read', JSON.stringify(readIds))
    }
  }

  const markAllRead = () => {
    const ids = notifications.map(n => n.id)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    localStorage.setItem('notif_read', JSON.stringify(ids))
  }

  const handleClick = (notif: Notification) => {
    markRead(notif.id)
    setOpen(false)
    navigate(notif.link)
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'facture_overdue': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'devis_expiring': return <Clock className="h-4 w-4 text-amber-500" />
      case 'facture_unpaid': return <Receipt className="h-4 w-4 text-orange-500" />
      default: return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-1.5 hover:bg-muted transition-colors"
        title="Notifications"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: 'hsl(var(--destructive))' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-lg overflow-hidden z-50"
          style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  style={{
                    background: notif.read ? 'transparent' : 'hsl(var(--primary) / 0.04)',
                    borderBottom: '1px solid hsl(var(--border) / 0.5)'
                  }}
                >
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: 'hsl(var(--primary))' }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
