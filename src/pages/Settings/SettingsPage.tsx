import { useState } from 'react'
import { 
  useSettingsStore, 
  useProfileStore,
  useGoalsStore,
  useWeightStore,
  useFoodStore,
  useWorkoutStore,
  useMemoryStore,
  useChatStore
} from '@/store/index'
import { useAuthStore } from '@/store/authStore'
import { pushAll } from '@/lib/sync'
import { supabase } from '@/lib/supabase'
import { User, Shield, Brain, Scale, Eye, EyeOff, Check, Zap, Database, Download, Upload, AlertTriangle } from 'lucide-react'

type Tab = 'profile' | 'security' | 'ai' | 'units' | 'backup'

export function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore()
  const { profile, updateProfile } = useProfileStore()
  const { changePassword } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [saved, setSaved] = useState(false)

  // Backup & Restore
  const [exportLoading, setExportLoading] = useState(false)
  const [dbExportLoading, setDbExportLoading] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({ type: 'idle', message: '' })

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
    { id: 'backup' as Tab, label: 'Backup & Sync', icon: Database },
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

          {activeTab === 'backup' && (() => {
            const downloadJSON = (data: object, filename: string) => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            };

            const exportBackup = () => {
              setExportLoading(true);
              try {
                const backup = {
                  version: 'fitos-backup-v1',
                  timestamp: new Date().toISOString(),
                  auth: useAuthStore.getState(),
                  profile: useProfileStore.getState(),
                  settings: useSettingsStore.getState(),
                  goals: useGoalsStore.getState(),
                  workout: useWorkoutStore.getState(),
                  food: useFoodStore.getState(),
                  weight: useWeightStore.getState(),
                  memory: useMemoryStore.getState(),
                  chat: useChatStore.getState(),
                };
                downloadJSON(backup, `fitos-backup-${new Date().toISOString().split('T')[0]}.json`);
              } catch (err: unknown) {
                alert('Export failed: ' + (err instanceof Error ? err.message : String(err)));
              } finally {
                setExportLoading(false);
              }
            };

            const exportDBSnapshot = async () => {
              setDbExportLoading(true);
              try {
                const [
                  profiles,
                  goals,
                  weightLogs,
                  foodLogs,
                  exercises,
                  workoutTemplates,
                  workoutSessions,
                  memories,
                  measurements,
                  syncMetadata
                ] = await Promise.all([
                  supabase.from('profiles').select('*'),
                  supabase.from('goals').select('*'),
                  supabase.from('weight_logs').select('*'),
                  supabase.from('food_logs').select('*'),
                  supabase.from('exercises').select('*'),
                  supabase.from('workout_templates').select('*'),
                  supabase.from('workout_sessions').select('*'),
                  supabase.from('memories').select('*'),
                  supabase.from('measurements').select('*'),
                  supabase.from('sync_metadata').select('*')
                ]);

                const snapshot = {
                  type: 'fitos-database-snapshot',
                  timestamp: new Date().toISOString(),
                  tables: {
                    profiles: profiles.data || [],
                    goals: goals.data || [],
                    weight_logs: weightLogs.data || [],
                    food_logs: foodLogs.data || [],
                    exercises: exercises.data || [],
                    workout_templates: workoutTemplates.data || [],
                    workout_sessions: workoutSessions.data || [],
                    memories: memories.data || [],
                    measurements: measurements.data || [],
                    sync_metadata: syncMetadata.data || []
                  }
                };
                downloadJSON(snapshot, `fitos-db-snapshot-${new Date().toISOString().split('T')[0]}.json`);
              } catch (err: unknown) {
                alert('Database snapshot failed: ' + (err instanceof Error ? err.message : String(err)));
              } finally {
                setDbExportLoading(false);
              }
            };

            const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = async (evt) => {
                try {
                  const json = JSON.parse(evt.target?.result as string);
                  if (json.version !== 'fitos-backup-v1') {
                    setImportStatus({ type: 'error', message: 'Invalid backup file version (must be fitos-backup-v1).' });
                    return;
                  }
                  
                  // Restore all stores
                  if (json.auth) useAuthStore.setState(json.auth);
                  if (json.profile) useProfileStore.setState(json.profile);
                  if (json.settings) useSettingsStore.setState(json.settings);
                  if (json.goals) useGoalsStore.setState(json.goals);
                  if (json.workout) useWorkoutStore.setState(json.workout);
                  if (json.food) useFoodStore.setState(json.food);
                  if (json.weight) useWeightStore.setState(json.weight);
                  if (json.memory) useMemoryStore.setState(json.memory);
                  if (json.chat) useChatStore.setState(json.chat);

                  setImportStatus({ type: 'success', message: 'Local data loaded. Syncing with Supabase...' });
                  
                  const ok = await pushAll();
                  if (ok) {
                    setImportStatus({ type: 'success', message: 'Backup imported and synced successfully! Reloading...' });
                    setTimeout(() => window.location.reload(), 1500);
                  } else {
                    setImportStatus({ type: 'error', message: 'Local backup loaded, but cloud synchronization failed. Check connection.' });
                  }
                } catch (err: unknown) {
                  setImportStatus({ type: 'error', message: 'Failed to read file: ' + (err instanceof Error ? err.message : String(err)) });
                }
              };
              reader.readAsText(file);
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Backup & Sync System</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Export and restore your personal data or fetch raw cloud snapshots</div>
                </div>

                {/* Local Backup */}
                <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Download size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Export Local Backup</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Download a full snapshot of your current local tracking data, custom workouts, settings, and coach context as a local JSON file.
                  </p>
                  <button className="btn btn-primary" onClick={exportBackup} disabled={exportLoading} style={{ alignSelf: 'flex-start' }}>
                    {exportLoading ? 'Exporting...' : 'Download JSON Backup'}
                  </button>
                </div>

                {/* Local Restore */}
                <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Upload size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Import Local Backup</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Upload a previously exported JSON backup file to restore your entire state. 
                    <strong style={{ color: 'var(--red)' }}> Warning: This will overwrite all current local data and overwrite the cloud database during sync.</strong>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input type="file" accept=".json" onChange={handleFileImport} style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                    {importStatus.type !== 'idle' && (
                      <p style={{ 
                        fontSize: 12, 
                        color: importStatus.type === 'success' ? 'var(--emerald)' : 'var(--red)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <AlertTriangle size={13} /> {importStatus.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cloud Database Snapshot */}
                <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Database size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Database Snapshot Export</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Pulls all raw records from your Supabase REST API instance and compiles them into a single recovery file. Useful as a cold-storage backup.
                  </p>
                  <button className="btn btn-secondary" onClick={exportDBSnapshot} disabled={dbExportLoading} style={{ alignSelf: 'flex-start' }}>
                    {dbExportLoading ? 'Fetching...' : 'Download Cloud Snapshot'}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  )
}
