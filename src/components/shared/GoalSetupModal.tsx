import { useState } from 'react'
import { X, Target } from 'lucide-react'
import { useGoalsStore } from '@/store/index'
import { todayISO } from '@/lib/utils'
import type { GoalType } from '@/types'

interface GoalSetupModalProps {
  onClose: () => void
}

const GOAL_PRESETS = {
  cut: { calorieTarget: 1800, proteinTarget: 180 },
  bulk: { calorieTarget: 2800, proteinTarget: 180 },
  maintain: { calorieTarget: 2200, proteinTarget: 160 },
}

export function GoalSetupModal({ onClose }: GoalSetupModalProps) {
  const { addGoal, updateGoal, getActiveGoal } = useGoalsStore()
  const existing = getActiveGoal()
  
  const [name, setName] = useState(existing?.name || '')
  const [type, setType] = useState<GoalType>(existing?.type || 'cut')
  const [startWeight, setStartWeight] = useState(existing?.startWeight?.toString() || '')
  const [targetWeight, setTargetWeight] = useState(existing?.targetWeight?.toString() || '')
  const [targetDate, setTargetDate] = useState(existing?.targetDate || '')
  const [calorieTarget, setCalorieTarget] = useState(existing?.calorieTarget?.toString() || '1800')
  const [proteinTarget, setProteinTarget] = useState(existing?.proteinTarget?.toString() || '180')

  const handleTypeChange = (t: GoalType) => {
    setType(t)
    setCalorieTarget(String(GOAL_PRESETS[t].calorieTarget))
    setProteinTarget(String(GOAL_PRESETS[t].proteinTarget))
  }

  const handleSave = () => {
    const data = {
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Phase`,
      type,
      status: 'active' as const,
      startDate: existing?.startDate || todayISO(),
      startWeight: parseFloat(startWeight) || 80,
      targetWeight: parseFloat(targetWeight) || undefined,
      targetDate: targetDate || undefined,
      calorieTarget: parseInt(calorieTarget) || 2000,
      proteinTarget: parseInt(proteinTarget) || 150,
    }
    if (existing) {
      updateGoal(existing.id, data)
    } else {
      addGoal(data)
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, overflowY: 'auto',
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <div className="flex-start" style={{ gap: 10 }}>
            <Target size={20} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>
              {existing ? 'Edit Goal' : 'Set Goal'}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Goal type */}
          <div>
            <label className="input-label">Goal Type</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {(['cut', 'bulk', 'maintain'] as GoalType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  style={{
                    flex: 1, padding: '10px 8px',
                    border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: type === t ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                    color: type === t ? 'var(--accent)' : 'var(--text-secondary)',
                    borderRadius: 10, cursor: 'pointer', fontWeight: 600,
                    fontSize: 13, transition: 'all 0.15s ease',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Goal Name (optional)</label>
            <input className="input" placeholder={`${type.charAt(0).toUpperCase() + type.slice(1)} Phase`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Start Weight (kg)</label>
              <input className="input" type="number" placeholder="e.g. 85" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Target Weight (kg)</label>
              <input className="input" type="number" placeholder="e.g. 78" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Target Date (optional)</label>
            <input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} min={todayISO()} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Daily Calories (kcal)</label>
              <input className="input" type="number" placeholder="2000" value={calorieTarget} onChange={(e) => setCalorieTarget(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Daily Protein (g)</label>
              <input className="input" type="number" placeholder="150" value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>
              {existing ? 'Update Goal' : 'Set Goal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
