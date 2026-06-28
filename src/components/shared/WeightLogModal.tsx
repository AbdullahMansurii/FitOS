import { useState } from 'react'
import { Scale } from 'lucide-react'
import { useWeightStore } from '@/store/index'
import { todayISO } from '@/lib/utils'
import { Modal } from './Modal'

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
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth={380}
      title={
        <div className="flex-start" style={{ gap: 10 }}>
          <Scale size={20} color="var(--accent)" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>Log Weight</span>
        </div>
      }
    >
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
    </Modal>
  )
}
