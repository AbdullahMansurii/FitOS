import { Menu } from 'lucide-react'
import { useUIStore } from '@/store/index'
import { Sidebar, BottomNav } from './Sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { toggleSidebar } = useUIStore()

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Mobile header */}
        <header className="mobile-header">
          <button className="btn btn-ghost btn-icon" onClick={toggleSidebar}>
            <Menu size={20} />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em' }}>
            FitOS
          </span>
        </header>

        <div style={{ flex: 1 }}>
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
