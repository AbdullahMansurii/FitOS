import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, Utensils, Dumbbell, TrendingUp, 
  MessageSquare, Settings, Lock, Zap, Ruler
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/index'
import { cn } from '@/lib/utils'
import { SyncIndicator } from '@/components/shared/SyncIndicator'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/food', icon: Utensils, label: 'Food' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/measurements', icon: Ruler, label: 'Measurements' },
  { to: '/coach', icon: MessageSquare, label: 'Coach' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { lock } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn('sidebar', sidebarOpen && 'open')}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--accent)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={20} color="#0a0b0f" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                FitOS
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Fitness OS</div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 16px 12px' }} />

        {/* Nav */}
        <nav style={{ padding: '0 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer: sync + lock */}
        <div style={{ padding: '12px' }}>
          <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 12 }} />
          {/* Sync indicator */}
          <div style={{ marginBottom: 8 }}>
            <SyncIndicator />
          </div>
          <button className="nav-item btn-danger" onClick={lock} style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 10 }}>
            <Lock size={16} />
            <span style={{ fontSize: 13 }}>Lock App</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// Bottom nav for mobile
export function BottomNav() {
  const mobileNavItems = navItems.slice(0, 5) // skip settings on bottom

  return (
    <nav className="bottom-nav">
      {mobileNavItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 12px', borderRadius: 10, textDecoration: 'none', transition: 'all 0.15s ease' }}
          className={({ isActive }) => cn(isActive ? 'text-accent' : 'text-muted')}
        >
          <Icon size={20} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
