import { useState } from 'react'
import { Moon, Footprints, Heart, Battery, Flame, AlignLeft } from 'lucide-react'
import { useRecoveryStore } from '@/store/index'
import { todayISO } from '@/lib/utils'
import { Modal } from './Modal'

interface RecoveryLogModalProps {
  onClose: () => void
  initialDate?: string
}

const MOODS = [
  { val: 1, label: 'Exhausted 😩', color: 'var(--red)' },
  { val: 2, label: 'Tired 🙁', color: 'var(--amber)' },
  { val: 3, label: 'Okay 😐', color: 'var(--blue)' },
  { val: 4, label: 'Good 🙂', color: 'var(--accent-dim)' },
  { val: 5, label: 'Excellent 😄', color: 'var(--accent)' }
]

const ENERGIES = [
  { val: 1, label: 'Drained 🔋', color: 'var(--red)' },
  { val: 2, label: 'Low 🔋🔋', color: 'var(--amber)' },
  { val: 3, label: 'Moderate 🔋🔋🔋', color: 'var(--blue)' },
  { val: 4, label: 'High 🔋🔋🔋🔋', color: 'var(--accent-dim)' },
  { val: 5, label: 'Charged 🔋🔋🔋🔋🔋', color: 'var(--accent)' }
]

const SORENESS_LEVELS = [
  { val: 1, label: 'None 🟢', color: 'var(--emerald)' },
  { val: 2, label: 'Mild 🟡', color: 'var(--blue)' },
  { val: 3, label: 'Moderate 🟠', color: 'var(--amber)' },
  { val: 4, label: 'Heavy 🔴', color: 'var(--orange)' },
  { val: 5, label: 'Very Heavy 🔥', color: 'var(--red)' }
]

export function RecoveryLogModal({ onClose, initialDate }: RecoveryLogModalProps) {
  const targetDate = initialDate || todayISO()
  const { getByDate, addRecoveryLog, updateRecoveryLog } = useRecoveryStore()
  
  const existing = getByDate(targetDate)

  // Form State
  const [sleepHours, setSleepHours] = useState<string>(existing?.sleepHours?.toString() || '7.5')
  const [dailySteps, setDailySteps] = useState<string>(existing?.dailySteps?.toString() || '8000')
  const [mood, setMood] = useState<number>(existing?.mood || 3)
  const [energy, setEnergy] = useState<number>(existing?.energy || 3)
  const [muscleSoreness, setMuscleSoreness] = useState<number>(existing?.muscleSoreness || 1)
  const [notes, setNotes] = useState<string>(existing?.notes || '')

  const handleSave = () => {
    const sleep = sleepHours ? parseFloat(sleepHours) : null
    const steps = dailySteps ? parseInt(dailySteps) : null

    const data = {
      date: targetDate,
      sleepHours: sleep !== null && !isNaN(sleep) ? sleep : null,
      dailySteps: steps !== null && !isNaN(steps) ? steps : null,
      mood,
      energy,
      muscleSoreness,
      notes: notes.trim() || undefined
    }

    if (existing) {
      updateRecoveryLog(existing.id, data)
    } else {
      addRecoveryLog(data)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      closeOnOverlayClick={false}
      maxWidth={440}
      title={
        <div className="flex-start" style={{ gap: 8 }}>
          <Heart size={18} color="var(--accent)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
            {existing ? 'Edit Recovery Log' : 'Log Recovery'}
          </span>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Date Label */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Logging for <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{targetDate}</span>
        </div>

        {/* Sleep and Steps Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Moon size={12} color="var(--blue)" /> Sleep (hrs)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              className="input"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="7.5"
              style={{ fontSize: 13, height: 38 }}
            />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Footprints size={12} color="var(--emerald)" /> Daily Steps
            </label>
            <input
              type="number"
              min="0"
              className="input"
              value={dailySteps}
              onChange={(e) => setDailySteps(e.target.value)}
              placeholder="10000"
              style={{ fontSize: 13, height: 38 }}
            />
          </div>
        </div>

        {/* Mood Slider/Selector */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Heart size={12} color="var(--accent)" /> Mood & Well-being
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {MOODS.map(m => (
              <button
                key={m.val}
                type="button"
                onClick={() => setMood(m.val)}
                style={{
                  padding: '8px 4px', fontSize: 11, borderRadius: 8, cursor: 'pointer', border: 'none',
                  background: mood === m.val ? m.color : 'var(--bg-elevated)',
                  color: mood === m.val ? '#0a0b0f' : 'var(--text-secondary)',
                  fontWeight: mood === m.val ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                {m.label.split(' ')[1] || m.label}
                <div style={{ fontSize: 8, marginTop: 2, opacity: 0.8 }}>
                  {m.label.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Energy Levels */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Battery size={12} color="var(--amber)" /> Energy Level
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {ENERGIES.map(e => (
              <button
                key={e.val}
                type="button"
                onClick={() => setEnergy(e.val)}
                style={{
                  padding: '8px 4px', fontSize: 11, borderRadius: 8, cursor: 'pointer', border: 'none',
                  background: energy === e.val ? e.color : 'var(--bg-elevated)',
                  color: energy === e.val ? '#0a0b0f' : 'var(--text-secondary)',
                  fontWeight: energy === e.val ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                🔋
                <div style={{ fontSize: 8, marginTop: 2, opacity: 0.8 }}>
                  {e.label.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Muscle Soreness */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Flame size={12} color="var(--red)" /> Muscle Soreness
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {SORENESS_LEVELS.map(s => (
              <button
                key={s.val}
                type="button"
                onClick={() => setMuscleSoreness(s.val)}
                style={{
                  padding: '8px 4px', fontSize: 11, borderRadius: 8, cursor: 'pointer', border: 'none',
                  background: muscleSoreness === s.val ? s.color : 'var(--bg-elevated)',
                  color: muscleSoreness === s.val ? '#0a0b0f' : 'var(--text-secondary)',
                  fontWeight: muscleSoreness === s.val ? 700 : 500,
                  transition: 'all 0.15s ease'
                }}
              >
                {s.val === 5 ? '🔥' : '💪'}
                <div style={{ fontSize: 8, marginTop: 2, opacity: 0.8 }}>
                  {s.label.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlignLeft size={12} /> Notes & Symptoms
          </label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How do you feel? Any joint pain, stress, or other issues?"
            style={{ fontSize: 13, padding: '8px 12px', resize: 'none', height: 60 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>
            Save Log
          </button>
        </div>
      </div>
    </Modal>
  )
}
