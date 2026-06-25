import { useState } from 'react'
import { useSettingsStore, useProfileStore } from '@/store/index'
import { useAuthStore } from '@/store/authStore'
import { User, Shield, Brain, Scale, Eye, EyeOff, Check, Zap } from 'lucide-react'

type Tab = 'profile' | 'security' | 'ai' | 'units'

export function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore()
  const { profile, updateProfile } = useProfileStore()
  const { changePassword } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saved, setSaved] = useState(false)

  // Profile
  const [displayName, setDisplayName] = useState(profile?.displayName || '')
  const [heightCm, setHeightCm] = useState(String(profile?.heightCm || ''))
  const [dob, setDob] = useState(profile?.dateOfBirth || '')
  const [gender, setGender] = useState(profile?.gender || '')

  // Security
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  // AI
  const [apiKey, setApiKey] = useState(settings.aiApiKey)
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState(settings.aiModel)

  const GROQ_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ]

  const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const saveProfile = () => {
    updateProfile({
      displayName: displayName.trim() || 'User',
      heightCm: heightCm ? Number(heightCm) : undefined,
      dateOfBirth: dob || undefined,
      gender: (gender as 'male' | 'female' | 'other') || undefined,
      updatedAt: new Date().toISOString(),
    })
    showSaved()
  }

  const handlePasswordChange = async () => {
    setPwError('')
    if (!currentPw || !newPw) { setPwError('Fill in all fields'); return }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    const ok = await changePassword(currentPw, newPw)
    if (!ok) { setPwError('Current password is incorrect'); return }
    setPwSuccess(true)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwSuccess(false), 3000)
  }

  const saveAI = () => {
    updateSettings({ aiApiKey: apiKey, aiModel: model })
    showSaved()
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'security' as Tab, label: 'Security', icon: Shield },
    { id: 'ai' as Tab, label: 'AI Coach', icon: Brain },
    { id: 'units' as Tab, label: 'Units', icon: Scale },
  ]

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 720 }}>
      <div className="flex-between" style={{ marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Manage your preferences and account</p>
        </div>
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 14 }}>
            <Check size={16} /> Saved
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Tabs */}
        <div className="card" style={{ padding: 8 }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              style={{ width: '100%' }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="card-elevated" style={{ padding: 24 }}>
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Profile</div>
              <div className="input-group">
                <label className="input-label">Display Name</label>
                <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Height (cm)</label>
                  <input className="input" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 178" />
                </div>
                <div className="input-group">
                  <label className="input-label">Date of Birth</label>
                  <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Gender</label>
                <select className="input" value={gender} onChange={(e) => setGender(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={saveProfile} style={{ alignSelf: 'flex-start' }}>
                Save Profile
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Change Password</div>
              <div className="input-group">
                <label className="input-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type={showPw ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Current password" style={{ paddingRight: 44 }} />
                  <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input className="input" type={showPw ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min. 6 characters" />
              </div>
              <div className="input-group">
                <label className="input-label">Confirm New Password</label>
                <input className="input" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat new password" />
              </div>
              {pwError && <p style={{ color: 'var(--red)', fontSize: 13 }}>{pwError}</p>}
              {pwSuccess && <p style={{ color: 'var(--emerald)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} /> Password changed successfully</p>}
              <button className="btn btn-primary" onClick={handlePasswordChange} style={{ alignSelf: 'flex-start' }}>
                Change Password
              </button>
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>AI Coach Configuration</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Configure your AI provider to enable the coach</div>
              </div>

              <div style={{ padding: '12px 16px', background: 'var(--accent-bg)', border: '1px solid rgba(163,230,53,0.15)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Zap size={15} color="var(--accent)" />
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>Groq (Default Provider)</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Free tier available at <strong style={{ color: 'var(--text-primary)' }}>console.groq.com</strong>. 
                  Groq provides the fastest inference for llama models.
                </p>
              </div>

              <div className="input-group">
                <label className="input-label">Groq API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    style={{ paddingRight: 44, fontFamily: 'monospace', fontSize: 13 }}
                  />
                  <button onClick={() => setShowKey(!showKey)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Model</label>
                <select className="input" value={model} onChange={(e) => setModel(e.target.value)} style={{ cursor: 'pointer' }}>
                  {GROQ_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <button className="btn btn-primary" onClick={saveAI} style={{ alignSelf: 'flex-start' }}>
                Save AI Settings
              </button>
            </div>
          )}

          {activeTab === 'units' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Units & Display</div>
              
              <div>
                <label className="input-label" style={{ marginBottom: 10 }}>Weight Unit</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['kg', 'lbs'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => updateSettings({ weightUnit: u })}
                      style={{
                        padding: '10px 24px', borderRadius: 10,
                        border: `1px solid ${settings.weightUnit === u ? 'var(--accent)' : 'var(--border-default)'}`,
                        background: settings.weightUnit === u ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                        color: settings.weightUnit === u ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600, cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: 10 }}>Energy Unit</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['kcal', 'kj'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => updateSettings({ energyUnit: u })}
                      style={{
                        padding: '10px 24px', borderRadius: 10,
                        border: `1px solid ${settings.energyUnit === u ? 'var(--accent)' : 'var(--border-default)'}`,
                        background: settings.energyUnit === u ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                        color: settings.energyUnit === u ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600, cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      {u.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: 10 }}>Default Rest Timer</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[60, 90, 120, 180, 240].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateSettings({ restTimerDefault: s })}
                      style={{
                        padding: '8px 16px', borderRadius: 10,
                        border: `1px solid ${settings.restTimerDefault === s ? 'var(--accent)' : 'var(--border-default)'}`,
                        background: settings.restTimerDefault === s ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                        color: settings.restTimerDefault === s ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 500, cursor: 'pointer', fontSize: 13,
                      }}
                    >
                      {s >= 60 ? `${s / 60}m${s % 60 > 0 ? `${s % 60}s` : ''}` : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
