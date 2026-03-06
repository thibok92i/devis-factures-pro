import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import UpdateNotification from './UpdateNotification'

export default function Layout() {
  const navigate = useNavigate()
  const [saveError, setSaveError] = useState<string | null>(null)

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

  // Listen for save errors (antivirus blocking, permissions, etc.)
  useEffect(() => {
    const cleanup = window.api.onSaveError?.((data) => {
      setSaveError(data.message)
    })
    return () => cleanup?.()
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

      {/* Save error banner */}
      {saveError && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-xl rounded-lg border px-5 py-3 shadow-lg"
          style={{
            background: 'hsl(0 80% 97%)',
            borderColor: 'hsl(0 70% 80%)',
            color: 'hsl(0 70% 35%)'
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">Erreur de sauvegarde</p>
              <p className="text-xs mt-1">{saveError}</p>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-lg leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
