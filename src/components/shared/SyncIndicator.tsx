import { useState, useEffect } from 'react'
import { Cloud, CloudOff, Loader, CheckCircle, RefreshCw } from 'lucide-react'
import { getSyncState, onSyncStateChange, pushAll, pullAll, type SyncStatus } from '@/lib/sync'

interface SyncIndicatorProps {
  compact?: boolean
}

const STATUS_CONFIG: Record<SyncStatus, { icon: React.ReactNode; label: string; color: string }> = {
  idle:    { icon: <Cloud size={14} />,        label: 'Not synced',  color: 'var(--text-muted)' },
  syncing: { icon: <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Syncing…', color: 'var(--amber)' },
  success: { icon: <CheckCircle size={14} />,  label: 'Synced',      color: 'var(--emerald)' },
  error:   { icon: <CloudOff size={14} />,     label: 'Sync failed', color: 'var(--red)' },
}

export function SyncIndicator({ compact = false }: SyncIndicatorProps) {
  const [state, setState] = useState(getSyncState())
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    return onSyncStateChange(setState)
  }, [])

  const { icon, label, color } = STATUS_CONFIG[state.status]

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!state.lastSyncedAt) return
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 30000)
    return () => clearInterval(interval)
  }, [state.lastSyncedAt])

  const relativeTime = state.lastSyncedAt
    ? (() => {
        const diff = Math.floor((now - new Date(state.lastSyncedAt).getTime()) / 1000)
        if (diff < 60) return 'just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        return `${Math.floor(diff / 3600)}h ago`
      })()
    : null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color, padding: '4px 8px', borderRadius: 8,
          fontSize: 12, fontWeight: 500,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        title={state.error ?? label}
      >
        {icon}
        {!compact && <span>{state.status === 'success' && relativeTime ? `Synced ${relativeTime}` : label}</span>}
      </button>

      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, zIndex: 50,
            background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
            borderRadius: 12, padding: 12, width: 220, marginBottom: 8,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Supabase Sync
            </div>
            {state.error && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, padding: '6px 8px', background: 'var(--red-bg)', borderRadius: 6 }}>
                {state.error}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => { pushAll(); setShowMenu(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
                }}
              >
                <RefreshCw size={13} color="var(--accent)" />
                Push to cloud
              </button>
              <button
                onClick={() => { pullAll(); setShowMenu(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13,
                }}
              >
                <Cloud size={13} color="var(--blue)" />
                Pull from cloud
              </button>
            </div>
            {relativeTime && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                Last synced: {relativeTime}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
