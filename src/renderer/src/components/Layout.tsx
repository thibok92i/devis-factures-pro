import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import UpdateNotification from './UpdateNotification'

export default function Layout() {
  const navigate = useNavigate()

  // Apply dark mode from settings on mount
  useEffect(() => {
    window.api.settings.get('theme_mode').then((mode: string | null) => {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    })
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+N → Nouveau devis (from anywhere)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/devis?action=new')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 flex h-12 items-center px-8 border-b"
          style={{
            background: 'hsl(var(--background) / 0.85)',
            borderColor: 'hsl(var(--border))',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="wood-accent w-5 mr-2" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            DevisPro — Gestion artisan
          </span>
        </div>

        <div className="p-8">
          <Outlet />
        </div>
      </main>
      <CommandPalette />
      <UpdateNotification />
    </div>
  )
}
