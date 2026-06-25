import { useState } from 'react'
import { X, Scale } from 'lucide-react'
import { useWeightStore } from '@/store/index'
import { todayISO } from '@/lib/utils'

interface WeightLogModalProps {
  onClose: () => void
}

export function WeightLogModal({ onClose }: WeightLogModalProps) {
  const { addLog, getByDate } = useWeightStore()
  const today = todayISO()
  const existing = getByDate(today)
  const [weight, setWeight] = useState(existing ? String(existing.weightKg) : '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [loading, setLoading] = useState(false)

  const handleSave = () => {
    const kg = parseFloat(weight)
    if (isNaN(kg) || kg < 20 || kg > 300) return
    setLoading(true)
    addLog({ date: today, weightKg: kg, notes: notes.trim() || undefined })
    setLoading(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: 380, padding: 28 }}>
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <div className="flex-start" style={{ gap: 10 }}>
            <Scale size={20} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Log Weight</span>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Weight (kg)</label>
            <input
              className="input"
              type="number"
              placeholder="e.g. 80.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min="20" max="300" step="0.1"
              autoFocus
              style={{ fontSize: 20, textAlign: 'center', fontWeight: 600 }}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Notes (optional)</label>
            <input className="input" placeholder="e.g. Morning, fasted" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading || !weight}
              style={{ flex: 2 }}
            >
              {existing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
