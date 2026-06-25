import { useState } from 'react'
import { deriveSyncToken } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

export function DiagnosticsPage() {
  const [password, setPassword] = useState('')
  const [localToken] = useState<string | null>(() => {
    try {
      const authStr = localStorage.getItem('fitos-auth')
      if (authStr) {
        const parsed = JSON.parse(authStr)
        return parsed.state?.syncToken || null
      }
      return 'None (localStorage fitos-auth not found)'
    } catch (err: unknown) {
      return 'Error reading localStorage: ' + (err instanceof Error ? err.message : String(err))
    }
  })
  const [derivedToken, setDerivedToken] = useState<string | null>(null)
  const [dbTokenWithLocal, setDbTokenWithLocal] = useState<string | null>(null)
  const [dbTokenWithDerived, setDbTokenWithDerived] = useState<string | null>(null)
  const [localQueryStatus, setLocalQueryStatus] = useState<string>('Not started')
  const [derivedQueryStatus, setDerivedQueryStatus] = useState<string>('Not started')

  const runDiagnostics = async () => {
    if (!password) {
      alert('Please enter your master password to derive the token.')
      return
    }

    setLocalQueryStatus('Running...')
    setDerivedQueryStatus('Running...')
    setDbTokenWithLocal(null)
    setDbTokenWithDerived(null)

    // 2. Derive token from password
    try {
      const derived = await deriveSyncToken(password)
      setDerivedToken(derived)

      // 3. Query Supabase with current local token from localStorage
      if (localToken && !localToken.startsWith('None') && !localToken.startsWith('Error')) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('sync_token')
            .limit(1)
            .maybeSingle()
          
          if (error) {
            setLocalQueryStatus(`Failed: ${error.message}`)
          } else if (data) {
            setLocalQueryStatus('Profile Found!')
            setDbTokenWithLocal(data.sync_token)
          } else {
            setLocalQueryStatus('No Profile Found (RLS Blocked / Empty)')
          }
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e)
          setLocalQueryStatus(`Error: ${errMsg}`)
        }
      } else {
        setLocalQueryStatus('Skipped (No valid local token)')
      }

      // 4. Query Supabase using the derived SHA-256 token
      try {
        // Temporarily configure REST header for this request
        // @ts-expect-error - Custom headers on Supabase rest client
        const originalHeader = supabase.rest?.headers?.['x-fitos-auth']
        // @ts-expect-error - Custom headers on Supabase rest client
        if (supabase.rest) {
          // @ts-expect-error - Custom headers on Supabase rest client
          supabase.rest.headers['x-fitos-auth'] = derived
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('sync_token')
          .limit(1)
          .maybeSingle()

        // Restore original header
        // @ts-expect-error - Custom headers on Supabase rest client
        if (supabase.rest) {
          // @ts-expect-error - Custom headers on Supabase rest client
          supabase.rest.headers['x-fitos-auth'] = originalHeader || ''
        }

        if (error) {
          setDerivedQueryStatus(`Failed: ${error.message}`)
        } else if (data) {
          setDerivedQueryStatus('Profile Found!')
          setDbTokenWithDerived(data.sync_token)
        } else {
          setDerivedQueryStatus('No Profile Found (RLS Blocked / Empty)')
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e)
        setDerivedQueryStatus(`Error: ${errMsg}`)
      }

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      alert('Derivation failed: ' + errMsg)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 10px 0', color: '#38bdf8' }}>FitOS Security Diagnostics</h1>
          <p style={{ fontSize: '15px', color: '#94a3b8', margin: 0 }}>
            Inspect local storage values, dynamically derive master tokens, and audit Supabase database sync tokens.
          </p>
        </div>

        {/* Input Card */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 16px 0' }}>Enter Password to Derive Token</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="password"
              placeholder="Enter Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '15px',
                outline: 'none'
              }}
            />
            <button
              onClick={runDiagnostics}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Analyze Tokens
            </button>
          </div>
        </div>

        {/* Local Storage Card */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#38bdf8' }}>1. Local Device Token (localStorage)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>CURRENT TOKEN IN LOCAL STORAGE</label>
            <div style={{
              backgroundColor: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              wordBreak: 'break-all',
              border: '1px solid #334155'
            }}>
              {localToken || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Derivation Card */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#38bdf8' }}>2. Derived SHA-256 Token (Client-Side)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>DERIVED pairing token (deriveSyncToken(password))</label>
            <div style={{
              backgroundColor: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              wordBreak: 'break-all',
              border: '1px solid #334155',
              color: derivedToken ? '#f8fafc' : '#64748b'
            }}>
              {derivedToken || 'Enter password and click Analyze Tokens...'}
            </div>
          </div>
        </div>

        {/* Database Queries */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#38bdf8' }}>3. Cloud Database RLS Verification (Supabase)</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Local Token Query */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>A) QUERY USING LOCAL DEVICE TOKEN</label>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: localQueryStatus.includes('Found!') ? '#4ade80' : '#f87171'
                }}>{localQueryStatus}</span>
              </div>
              <div style={{
                backgroundColor: '#0f172a',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                wordBreak: 'break-all',
                border: '1px solid #334155',
                color: dbTokenWithLocal ? '#4ade80' : '#64748b'
              }}>
                {dbTokenWithLocal ? `profiles.sync_token = ${dbTokenWithLocal}` : 'No row returned'}
              </div>
            </div>

            {/* Derived Token Query */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>B) QUERY USING DERIVED SHA-256 TOKEN</label>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: derivedQueryStatus.includes('Found!') ? '#4ade80' : '#f87171'
                }}>{derivedQueryStatus}</span>
              </div>
              <div style={{
                backgroundColor: '#0f172a',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                wordBreak: 'break-all',
                border: '1px solid #334155',
                color: dbTokenWithDerived ? '#4ade80' : '#64748b'
              }}>
                {dbTokenWithDerived ? `profiles.sync_token = ${dbTokenWithDerived}` : 'No row returned'}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Report Analysis */}
        {derivedToken && (
          <div style={{
            backgroundColor: '#0c4a6e',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #0369a1',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#38bdf8' }}>Cryptographic Match Assessment</h2>
            <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#e0f2fe' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                • <strong>Local storage matches derived token?</strong>{' '}
                {localToken === derivedToken ? (
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>YES (Your local device has successfully transitioned to SHA-256)</span>
                ) : (
                  <span style={{ color: '#f87171', fontWeight: 700 }}>NO (Local device is still using the UUID token)</span>
                )}
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                • <strong>Database matches local token?</strong>{' '}
                {dbTokenWithLocal ? (
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>YES (Supabase allows select under your current local storage token)</span>
                ) : (
                  <span style={{ color: '#f87171', fontWeight: 700 }}>NO (Database is rejecting your current local storage token)</span>
                )}
              </p>
              <p style={{ margin: '0 0 10px 0' }}>
                • <strong>Database matches derived SHA-256 token?</strong>{' '}
                {dbTokenWithDerived ? (
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>YES (Database is updated to SHA-256 and matches master password)</span>
                ) : (
                  <span style={{ color: '#f87171', fontWeight: 700 }}>NO (Database does not yet have your SHA-256 derived token)</span>
                )}
              </p>
              
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px dashed #0284c7',
                fontSize: '13px',
                color: '#bae6fd',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div><strong>Current Derived SHA-256 token string:</strong></div>
                <div style={{ backgroundColor: '#082f49', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {derivedToken}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
