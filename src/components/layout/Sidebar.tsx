import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, Utensils, Dumbbell, TrendingUp, 
  MessageSquare, Settings, Lock, Zap, Ruler, UtensilsCrossed, MoreHorizontal
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/index'
import { cn } from '@/lib/utils'
import { SyncIndicator } from '@/components/shared/SyncIndicator'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/food', icon: Utensils, label: 'Food' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Meals' },
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
  const [showMore, setShowMore] = useState(false)

  const primaryItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/food', icon: Utensils, label: 'Food' },
    { to: '/workout', icon: Dumbbell, label: 'Workout' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
    { to: '/coach', icon: MessageSquare, label: 'Coach' },
  ]

  const overflowItems = [
    { to: '/meals', icon: UtensilsCrossed, label: 'Meals' },
    { to: '/measurements', icon: Ruler, label: 'Measurements' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      {/* Overflow Menu Sheet */}
      {showMore && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setShowMore(false)}
          />
          <div 
            className="fixed bottom-[var(--bottom-nav-height)] left-4 right-4 p-4 rounded-t-2xl z-40 md:hidden animate-fade-in"
            style={{
              background: 'rgba(18, 20, 26, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border-default)',
              borderBottom: 'none',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>More Options</span>
              <button 
                onClick={() => setShowMore(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {overflowItems.map(({ to, icon: Icon, label }) => (
                <NavLink 
                  key={to} 
                  to={to} 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', borderRadius: 12, textDecoration: 'none', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}
                  className={({ isActive }) => cn(isActive ? 'text-accent' : 'text-secondary')}
                  onClick={() => setShowMore(false)}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="bottom-nav">
        {primaryItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', borderRadius: 10, textDecoration: 'none', transition: 'all 0.15s ease', flex: 1 }}
            className={({ isActive }) => cn(isActive ? 'text-accent' : 'text-muted')}
          >
            <Icon size={18} />
            <span style={{ fontSize: 9, fontWeight: 500 }}>{label}</span>
          </NavLink>
        ))}
        
        {/* More button */}
        <button
          onClick={() => setShowMore(!showMore)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', borderRadius: 10, background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s ease', flex: 1 }}
          className={cn(showMore ? 'text-accent' : 'text-muted')}
        >
          <MoreHorizontal size={18} />
          <span style={{ fontSize: 9, fontWeight: 500 }}>More</span>
        </button>
      </nav>
    </>
  )
}
