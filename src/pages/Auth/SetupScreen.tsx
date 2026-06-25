import { useState } from 'react'
import { Zap, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/index'
import { generateId } from '@/lib/utils'

const RECOVERY_WORDS = ['alpha', 'brave', 'cosmic', 'delta', 'ember', 'forge', 'grove', 'helix', 'iron', 'jade', 'karma', 'lunar']

function generateRecoveryPhrase(): string {
  const shuffled = [...RECOVERY_WORDS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 6).join('-')
}

export function SetupScreen() {
  const { setup } = useAuthStore()
  const { setProfile } = useProfileStore()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [recoveryPhrase] = useState(generateRecoveryPhrase())
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleStep1 = () => {
    if (!name.trim()) { setError('Please enter your name'); return }
    setError('')
    setStep(2)
  }

  const handleStep2 = () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setStep(3)
  }

  const handleFinish = async () => {
    if (!recoveryConfirmed) { setError('Please confirm you have saved your recovery phrase'); return }
    setLoading(true)
    try {
      setProfile({
        id: generateId(),
        displayName: name.trim(),
        weightUnit: 'kg',
        energyUnit: 'kcal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      await setup(password, recoveryPhrase)
    } catch {
      setError('Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64,
            background: 'var(--accent)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-accent)',
          }}>
            <Zap size={32} color="#0a0b0f" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Welcome to FitOS
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>
            Your personal fitness operating system
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              height: 4, width: step >= s ? 40 : 20, borderRadius: 9999,
              background: step >= s ? 'var(--accent)' : 'var(--bg-muted)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Step content */}
        <div className="card-glass" style={{ padding: 28 }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>What should we call you?</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>This will be used to personalize your experience</p>
              </div>
              <div className="input-group">
                <label className="input-label">Your Name</label>
                <input
                  className="input"
                  placeholder="e.g. Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStep1()}
                  autoFocus
                />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
              <button className="btn btn-primary" onClick={handleStep1}>Continue →</button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Set your master password</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>This is your app lock. Keep it safe.</p>
              </div>
              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Confirm Password</label>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStep2()}
                />
              </div>
              {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
                <button className="btn btn-primary" onClick={handleStep2} style={{ flex: 2 }}>Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={22} color="var(--accent)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Recovery Phrase</h2>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Save this phrase somewhere safe. You'll need it if you forget your password.
              </p>

              <div style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--accent)',
                borderRadius: 12,
                padding: '16px 20px',
                fontFamily: 'monospace',
                fontSize: 15,
                color: 'var(--accent)',
                letterSpacing: '0.04em',
                wordBreak: 'break-all',
                textAlign: 'center',
                lineHeight: 1.8,
              }}>
                {recoveryPhrase.split('-').map((word, i) => (
                  <span key={i}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginRight: 4 }}>{i + 1}.</span>
                    {word}{i < 5 ? <span style={{ color: 'var(--bg-muted)', margin: '0 8px' }}>·</span> : ''}
                  </span>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={recoveryConfirmed}
                  onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  I've saved my recovery phrase in a safe place
                </span>
              </label>

              {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</button>
                <button
                  className="btn btn-primary"
                  onClick={handleFinish}
                  disabled={loading}
                  style={{ flex: 2 }}
                >
                  {loading ? 'Setting up...' : 'Launch FitOS 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
