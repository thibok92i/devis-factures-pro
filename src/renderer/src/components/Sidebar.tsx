import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Package,
  Layers,
  BarChart3,
  Settings,
  ChevronRight,
  Hammer,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/devis', label: 'Devis', icon: FileText },
  { to: '/factures', label: 'Factures', icon: Receipt },
  { to: '/catalogue', label: 'Catalogue', icon: Package },
  { to: '/forfaits', label: 'Forfaits', icon: Layers },
  { to: '/rapports', label: 'Rapports', icon: BarChart3 },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}
      style={{
        background: 'var(--gradient-sidebar)',
        borderRight: '1px solid hsl(var(--sidebar-border))'
      }}
    >
      {/* Logo */}
      <div
        className={`flex h-16 items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}
        style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white shrink-0"
          style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-primary)' }}
        >
          <Hammer className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div>
            <p
              className="text-sm font-bold leading-none"
              style={{ color: 'hsl(35 30% 90%)', fontFamily: "'Playfair Display', serif", letterSpacing: '0.01em' }}
            >
              DevisPro
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--sidebar-muted))' }}>
              Menuiserie · Suisse romande
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 ${collapsed ? 'px-1.5' : 'px-3'} pt-4 pb-2 space-y-0.5`}>
        {!collapsed && (
          <p
            className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.15em]"
            style={{ color: 'hsl(var(--sidebar-muted))' }}
          >
            Navigation
          </p>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''} ${collapsed ? 'justify-center !px-0' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: isActive ? 'hsl(152 55% 62%)' : 'hsl(var(--sidebar-foreground))' }}
                />
                {!collapsed && <span className="flex-1 text-sm">{item.label}</span>}
                {!collapsed && isActive && (
                  <ChevronRight className="h-3.5 w-3.5" style={{ color: 'hsl(152 55% 62%)' }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-3" style={{ height: '1px', background: 'hsl(var(--sidebar-border))' }} />

      {/* Bottom */}
      <div className={`${collapsed ? 'p-1.5' : 'p-3'} pt-3 space-y-1`}>
        <NavLink
          to="/settings"
          title={collapsed ? 'Réglages' : undefined}
          className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''} ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          {({ isActive }) => (
            <>
              <Settings
                className="h-4 w-4"
                style={{ color: isActive ? 'hsl(152 55% 62%)' : 'hsl(var(--sidebar-foreground))' }}
              />
              {!collapsed && <span className="text-sm">Réglages</span>}
            </>
          )}
        </NavLink>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Agrandir la sidebar (Ctrl+B)' : 'Réduire la sidebar (Ctrl+B)'}
          className="nav-link w-full justify-center !px-0"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" style={{ color: 'hsl(var(--sidebar-foreground))' }} />
          ) : (
            <PanelLeftClose className="h-4 w-4" style={{ color: 'hsl(var(--sidebar-foreground))' }} />
          )}
          {!collapsed && <span className="text-sm flex-1">Réduire</span>}
        </button>

        {/* Region badge */}
        {!collapsed && (
          <div
            className="mt-2 rounded-lg p-3"
            style={{ background: 'hsl(var(--sidebar-accent))' }}
          >
            <div className="wood-accent mb-2 w-8" />
            <p className="text-xs font-semibold" style={{ color: 'hsl(35 30% 85%)' }}>
              Région d'Oron
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--sidebar-muted))' }}>
              Suisse romande · CHF · TVA 8.1%
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
