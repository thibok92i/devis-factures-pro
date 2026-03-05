import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import UpdateNotification from './UpdateNotification'

export default function Layout() {
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
