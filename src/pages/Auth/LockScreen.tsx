import { useState } from 'react'
import { Zap, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

export function LockScreen() {
  const { isSetup, unlock, resetWithRecovery } = useAuthStore()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryPhrase, setRecoveryPhrase] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const handleUnlock = async () => {
    if (!password) return
    setLoading(true)
    setError('')
    const result = await unlock(password)
    if (!result.success) {
      setError(result.error || (isSetup ? 'Incorrect password' : 'Incorrect password or connection issue'))
      setPassword('')
    }
    setLoading(false)
  }

  const handleRecovery = async () => {
    if (!recoveryPhrase || !newPassword) { setError('Please fill in all fields'); return }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    const result = await resetWithRecovery(recoveryPhrase, newPassword)
    if (!result.success) {
      setError(result.error || 'Invalid recovery phrase')
    } else {
      await unlock(newPassword)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(163,230,53,0.06) 0%, transparent 70%)',
    }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, background: 'var(--accent)',
            borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 40px rgba(163,230,53,0.25)',
          }}>
            <Zap size={36} color="#0a0b0f" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
            FitOS
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            {showRecovery 
              ? 'Reset with recovery phrase' 
              : isSetup 
                ? 'Enter your password to continue' 
                : 'Enter master password to pair this device'}
          </p>
        </div>

        <div className="card-glass" style={{ padding: 28 }}>
          {!showRecovery ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isSetup ? "Master Password" : "Enter Master Password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  autoFocus
                  style={{ paddingRight: 44, fontSize: 16 }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</p>
              )}
              <button
                className="btn btn-primary btn-lg"
                onClick={handleUnlock}
                disabled={loading || !password}
                style={{ width: '100%' }}
              >
                {loading 
                  ? (isSetup ? 'Unlocking...' : 'Pairing...') 
                  : (isSetup ? 'Unlock' : 'Unlock & Pair Device')}
              </button>
              {isSetup && (
                <button
                  onClick={() => { setShowRecovery(true); setError('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textAlign: 'center', textDecoration: 'underline' }}
                >
                  Forgot password?
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <KeyRound size={18} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Password Recovery</span>
              </div>
              <div className="input-group">
                <label className="input-label">Recovery Phrase</label>
                <input
                  className="input"
                  placeholder="word1-word2-word3-word4-word5-word6"
                  value={recoveryPhrase}
                  onChange={(e) => setRecoveryPhrase(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => { setShowRecovery(false); setError('') }} style={{ flex: 1 }}>Back</button>
                <button className="btn btn-primary" onClick={handleRecovery} disabled={loading} style={{ flex: 2 }}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
