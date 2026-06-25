import { useState, useMemo } from 'react'
import { Ruler, Plus, Edit, Trash2, Calendar, AlertCircle } from 'lucide-react'
import { useWeightStore, useProfileStore } from '@/store/index'
import type { Measurement } from '@/types'
import { todayISO, formatDate } from '@/lib/utils'

export function MeasurementsPage() {
  const { profile } = useProfileStore()
  const { measurements, addMeasurement, updateMeasurement, deleteMeasurement } = useWeightStore()
  
  const isImperial = profile?.weightUnit === 'lbs'
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form fields (stored as strings to allow typing decimals)
  const [date, setDate] = useState(todayISO())
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [chest, setChest] = useState('')
  const [leftArm, setLeftArm] = useState('')
  const [rightArm, setRightArm] = useState('')
  const [leftThigh, setLeftThigh] = useState('')
  const [rightThigh, setRightThigh] = useState('')
  const [neck, setNeck] = useState('')
  const [hips, setHips] = useState('')
  const [notes, setNotes] = useState('')
  
  const [error, setError] = useState('')

  // Conversion Helpers
  // Internal storage is metric: weight (kg), lengths (cm)
  // Display/Inputs can be imperial: weight (lbs), lengths (in)
  
  const toMetricWeight = (val: string) => {
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) return undefined
    return isImperial ? num / 2.20462 : num
  }

  const toMetricLength = (val: string) => {
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) return undefined
    return isImperial ? num * 2.54 : num
  }

  const fromMetricWeight = (val?: number) => {
    if (val === undefined || val === null) return ''
    const weightVal = isImperial ? val * 2.20462 : val
    return (Math.round(weightVal * 100) / 100).toString()
  }

  const fromMetricLength = (val?: number) => {
    if (val === undefined || val === null) return ''
    const lengthVal = isImperial ? val / 2.54 : val
    return (Math.round(lengthVal * 100) / 100).toString()
  }

  const openAddModal = () => {
    setEditingId(null)
    setDate(todayISO())
    setWeight('')
    setWaist('')
    setChest('')
    setLeftArm('')
    setRightArm('')
    setLeftThigh('')
    setRightThigh('')
    setNeck('')
    setHips('')
    setNotes('')
    setError('')
    setIsOpen(true)
  }

  const openEditModal = (m: Measurement) => {
    setEditingId(m.id)
    setDate(m.date)
    setWeight(fromMetricWeight(m.weightKg))
    setWaist(fromMetricLength(m.waistCm))
    setChest(fromMetricLength(m.chestCm))
    setLeftArm(fromMetricLength(m.leftArmCm))
    setRightArm(fromMetricLength(m.rightArmCm))
    setLeftThigh(fromMetricLength(m.leftThighCm))
    setRightThigh(fromMetricLength(m.rightThighCm))
    setNeck(fromMetricLength(m.neckCm))
    setHips(fromMetricLength(m.hipsCm))
    setNotes(m.notes || '')
    setError('')
    setIsOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!date) {
      setError('Date is required.')
      return
    }

    const payload: Omit<Measurement, 'id'> = {
      date,
      weightKg: toMetricWeight(weight),
      waistCm: toMetricLength(waist),
      chestCm: toMetricLength(chest),
      leftArmCm: toMetricLength(leftArm),
      rightArmCm: toMetricLength(rightArm),
      leftThighCm: toMetricLength(leftThigh),
      rightThighCm: toMetricLength(rightThigh),
      neckCm: toMetricLength(neck),
      hipsCm: toMetricLength(hips),
      notes: notes.trim() || undefined
    }

    // Must log at least one metric
    const hasLog = [
      payload.weightKg, payload.waistCm, payload.chestCm,
      payload.leftArmCm, payload.rightArmCm, payload.leftThighCm,
      payload.rightThighCm, payload.neckCm, payload.hipsCm
    ].some(v => v !== undefined)

    if (!hasLog) {
      setError('Please log at least one physical measurement or weight log.')
      return
    }

    if (editingId) {
      updateMeasurement(editingId, payload)
    } else {
      addMeasurement(payload)
    }
    
    setIsOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this measurement entry?')) {
      deleteMeasurement(id)
    }
  }

  // Sorted list of measurements (newest first)
  const sortedMeasurements = useMemo(() => {
    return [...measurements].sort((a, b) => b.date.localeCompare(a.date))
  }, [measurements])

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Ruler className="h-8 w-8 text-indigo-500" />
            Physique Measurements
          </h1>
          <p className="text-muted-foreground mt-1">
            Track body weight, waist, chest, and limbs to monitor body recomposition.
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          Log Measurements
        </button>
      </div>

      {/* Info Header */}
      <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-300">
          <strong>Unit System:</strong> Abdullah's profile uses <strong>{isImperial ? 'Imperial (lbs, inches)' : 'Metric (kg, cm)'}</strong>. 
          Measurements logged below will be displayed in {isImperial ? 'inches and pounds' : 'cm and kg'} but stored in a unified metric format for recomposition intelligence analytics.
        </div>
      </div>

      {/* Main Grid / List */}
      {sortedMeasurements.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl p-12 text-center">
          <div className="bg-muted p-4 rounded-full mb-4">
            <Ruler className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1 text-foreground">No measurements logged yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Log your body weight and circumference measurements consistently (e.g. once a week) to start tracking recomposition intelligence.
          </p>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Log Your First Entry
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {sortedMeasurements.map((entry) => (
            <div
              key={entry.id}
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-indigo-500/30 transition-all flex flex-col md:flex-row gap-6 justify-between"
            >
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-lg text-foreground">
                    {formatDate(entry.date)}
                  </span>
                  {entry.notes && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground max-w-xs truncate" title={entry.notes}>
                      Notes: {entry.notes}
                    </span>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {entry.weightKg !== undefined && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Body Weight</div>
                      <div className="text-lg font-semibold text-foreground flex items-baseline gap-1 mt-0.5">
                        {fromMetricWeight(entry.weightKg)}
                        <span className="text-xs font-normal text-muted-foreground">{isImperial ? 'lbs' : 'kg'}</span>
                      </div>
                    </div>
                  )}
                  {entry.waistCm !== undefined && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Waist</div>
                      <div className="text-lg font-semibold text-foreground flex items-baseline gap-1 mt-0.5">
                        {fromMetricLength(entry.waistCm)}
                        <span className="text-xs font-normal text-muted-foreground">{isImperial ? 'in' : 'cm'}</span>
                      </div>
                    </div>
                  )}
                  {entry.chestCm !== undefined && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Chest</div>
                      <div className="text-lg font-semibold text-foreground flex items-baseline gap-1 mt-0.5">
                        {fromMetricLength(entry.chestCm)}
                        <span className="text-xs font-normal text-muted-foreground">{isImperial ? 'in' : 'cm'}</span>
                      </div>
                    </div>
                  )}
                  {(entry.leftArmCm !== undefined || entry.rightArmCm !== undefined) && (
                    <div className="bg-muted/40 rounded-lg p-3 col-span-1">
                      <div className="text-xs text-muted-foreground">Arms (L / R)</div>
                      <div className="text-lg font-semibold text-foreground flex items-baseline gap-1 mt-0.5">
                        {entry.leftArmCm ? fromMetricLength(entry.leftArmCm) : '—'} / {entry.rightArmCm ? fromMetricLength(entry.rightArmCm) : '—'}
                        <span className="text-xs font-normal text-muted-foreground">{isImperial ? 'in' : 'cm'}</span>
                      </div>
                    </div>
                  )}
                  {(entry.leftThighCm !== undefined || entry.rightThighCm !== undefined) && (
                    <div className="bg-muted/40 rounded-lg p-3 col-span-1">
                      <div className="text-xs text-muted-foreground">Thighs (L / R)</div>
                      <div className="text-lg font-semibold text-foreground flex items-baseline gap-1 mt-0.5">
                        {entry.leftThighCm ? fromMetricLength(entry.leftThighCm) : '—'} / {entry.rightThighCm ? fromMetricLength(entry.rightThighCm) : '—'}
                        <span className="text-xs font-normal text-muted-foreground">{isImperial ? 'in' : 'cm'}</span>
                      </div>
                    </div>
                  )}
                  {entry.neckCm !== undefined && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Neck</div>
                      <div className="text-lg font-semibold text-foreground flex items-baseline gap-1 mt-0.5">
                        {fromMetricLength(entry.neckCm)}
                        <span className="text-xs font-normal text-muted-foreground">{isImperial ? 'in' : 'cm'}</span>
                      </div>
                    </div>
                  )}
                  {entry.hipsCm !== undefined && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Hips</div>
                      <div className="text-lg font-semibold text-foreground flex items-baseline gap-1 mt-0.5">
                        {fromMetricLength(entry.hipsCm)}
                        <span className="text-xs font-normal text-muted-foreground">{isImperial ? 'in' : 'cm'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex md:flex-col justify-end items-center gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
                <button
                  onClick={() => openEditModal(entry)}
                  className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                  title="Edit Entry"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-2 hover:bg-muted text-red-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  title="Delete Entry"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">
                {editingId ? 'Edit Measurement Entry' : 'Log Body Measurements'}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 overflow-y-auto max-h-[70vh] grid grid-cols-1 md:grid-cols-2 gap-4">
                {error && (
                  <div className="col-span-full bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Date */}
                <div className="col-span-full">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Body Weight ({isImperial ? 'lbs' : 'kg'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 76.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Waist */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Waist ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 33.5"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Chest */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Chest ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 40.2"
                    value={chest}
                    onChange={(e) => setChest(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Neck */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Neck ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 14.5"
                    value={neck}
                    onChange={(e) => setNeck(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Hips */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Hips ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 37"
                    value={hips}
                    onChange={(e) => setHips(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Spacer / formatting */}
                <div></div>

                {/* Left Arm */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Left Arm ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15.0"
                    value={leftArm}
                    onChange={(e) => setLeftArm(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Right Arm */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Right Arm ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15.1"
                    value={rightArm}
                    onChange={(e) => setRightArm(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Left Thigh */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Left Thigh ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 23"
                    value={leftThigh}
                    onChange={(e) => setLeftThigh(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Right Thigh */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Right Thigh ({isImperial ? 'in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 23.2"
                    value={rightThigh}
                    onChange={(e) => setRightThigh(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Notes */}
                <div className="col-span-full">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Notes</label>
                  <textarea
                    placeholder="Describe how you felt, lighting conditions, or progress notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-muted border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-border flex justify-end gap-3 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-transparent hover:bg-muted border border-border text-foreground font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
