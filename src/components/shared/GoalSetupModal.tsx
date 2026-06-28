import { useState } from 'react'
import { X, Target, Calculator, Settings, Info } from 'lucide-react'
import { useGoalsStore, useProfileStore, useWeightStore } from '@/store/index'
import { todayISO } from '@/lib/utils'
import { calculateGoal } from '@/lib/goalCalculator'
import type { GoalType, GoalMode, ActivityLevel } from '@/types'

interface GoalSetupModalProps {
  onClose: () => void
}

const getAge = (dobString?: string) => {
  if (!dobString) return 28 // Default fallback age
  const today = new Date()
  const birthDate = new Date(dobString)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function GoalSetupModal({ onClose }: GoalSetupModalProps) {
  const { addGoal, updateGoal, getActiveGoal } = useGoalsStore()
  const { profile } = useProfileStore()
  const { getLatest } = useWeightStore()
  
  const existing = getActiveGoal()
  const latestWeight = getLatest()

  // Mode: smart or manual
  const [isSmartMode, setIsSmartMode] = useState(existing?.goalMode !== undefined)

  // Smart Mode Inputs
  const [goalMode, setGoalMode] = useState<GoalMode>(existing?.goalMode || 'fat_loss')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existing?.activityLevel || 'moderately_active')
  const [weight, setWeight] = useState(latestWeight?.weightKg?.toString() || existing?.startWeight?.toString() || '80')
  const [height, setHeight] = useState(profile?.heightCm?.toString() || '175')
  const [age, setAge] = useState(getAge(profile?.dateOfBirth).toString())
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(profile?.gender || 'male')

  // Common Inputs
  const [name, setName] = useState(existing?.name || '')
  const [targetWeight, setTargetWeight] = useState(existing?.targetWeight?.toString() || '')
  const [targetDate, setTargetDate] = useState(existing?.targetDate || '')

  // Manual Mode Inputs
  const [manualCalorieTarget, setManualCalorieTarget] = useState(existing?.calorieTarget?.toString() || '2000')
  const [manualProteinTarget, setManualProteinTarget] = useState(existing?.proteinTarget?.toString() || '150')

  // Calculation Results computed on the fly during render to avoid cascading render state
  const wNum = parseFloat(weight)
  const hNum = parseFloat(height)
  const aNum = parseInt(age)
  const calculated = (wNum > 0 && hNum > 0 && aNum > 0) ? calculateGoal({
    weightKg: wNum,
    heightCm: hNum,
    age: aNum,
    gender,
    activityLevel,
    goalMode,
  }) : null

  const handleSave = () => {
    const w = parseFloat(weight) || existing?.startWeight || 80

    let calorieTarget: number
    let proteinTarget: number
    let carbTarget: number | undefined
    let fatTarget: number | undefined
    let tdeeEstimate: number | undefined
    let deficitSurplus: number | undefined
    let finalType: GoalType

    if (isSmartMode && calculated) {
      calorieTarget = calculated.targetCalories
      proteinTarget = calculated.targetProtein
      carbTarget = calculated.targetCarbs
      fatTarget = calculated.targetFat
      tdeeEstimate = calculated.tdee
      deficitSurplus = calculated.deficitOrSurplus
      finalType = calculated.goalType
    } else {
      calorieTarget = parseInt(manualCalorieTarget) || 2000
      proteinTarget = parseInt(manualProteinTarget) || 150
      
      // Basic fallback estimation for carbs/fat target in manual mode (25% fat, remaining carbs)
      const fatKcal = Math.round(calorieTarget * 0.25)
      fatTarget = Math.max(Math.round(fatKcal / 9), 40)
      const proteinKcal = proteinTarget * 4
      const remainingKcal = calorieTarget - (proteinKcal + (fatTarget * 9))
      carbTarget = Math.max(0, Math.round(remainingKcal / 4))
      
      // Map manual goal type based on name or target weight compared to start weight
      const tw = parseFloat(targetWeight)
      if (tw > 0 && w > 0) {
        finalType = tw < w ? 'cut' : tw > w ? 'bulk' : 'maintain'
      } else {
        finalType = 'maintain'
      }
    }

    const data = {
      name: name || `${isSmartMode ? goalMode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : finalType.toUpperCase()} Phase`,
      type: finalType,
      status: 'active' as const,
      startDate: existing?.startDate || todayISO(),
      startWeight: w,
      targetWeight: parseFloat(targetWeight) || undefined,
      targetDate: targetDate || undefined,
      calorieTarget,
      proteinTarget,
      // Smart fields
      goalMode: isSmartMode ? goalMode : undefined,
      activityLevel: isSmartMode ? activityLevel : undefined,
      carbTarget,
      fatTarget,
      tdeeEstimate,
      deficitSurplus,
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
      <div className="card-glass animate-fade-in" style={{ width: '100%', maxWidth: 480, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div className="flex-start" style={{ gap: 8 }}>
            <Target size={18} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
              {existing ? 'Edit Fitness Goal' : 'Create Fitness Goal'}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Mode Selector Tab */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 10, padding: 3, marginBottom: 16 }}>
          <button
            onClick={() => setIsSmartMode(true)}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: isSmartMode ? 'var(--bg-base)' : 'transparent',
              color: isSmartMode ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s ease'
            }}
          >
            <Calculator size={13} /> Smart Mode
          </button>
          <button
            onClick={() => setIsSmartMode(false)}
            style={{
              flex: 1, padding: '8px 12px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: !isSmartMode ? 'var(--bg-base)' : 'transparent',
              color: !isSmartMode ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s ease'
            }}
          >
            <Settings size={13} /> Manual Override
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Goal Name */}
          <div className="input-group">
            <label className="input-label">Goal Name (optional)</label>
            <input
              className="input"
              placeholder={isSmartMode ? `${goalMode.replace(/_/g, ' ').toUpperCase()} Phase` : 'My Fitness Goal'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ fontSize: 13, height: 38 }}
            />
          </div>

          {/* Smart Mode Form */}
          {isSmartMode ? (
            <>
              {/* Goal Mode Selection */}
              <div>
                <label className="input-label" style={{ marginBottom: 6 }}>Target Goal</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {([
                    { val: 'fat_loss', label: 'Fat Loss 💧' },
                    { val: 'aggressive_cut', label: 'Aggressive Cut ⚠️' },
                    { val: 'recomp', label: 'Recomposition ⚖️' },
                    { val: 'maintain', label: 'Maintenance ⚡' },
                    { val: 'lean_bulk', label: 'Lean Bulk 📈' },
                    { val: 'muscle_gain', label: 'Muscle Gain 💪' }
                  ] as { val: GoalMode; label: string }[]).map((g) => (
                    <button
                      key={g.val}
                      onClick={() => setGoalMode(g.val)}
                      type="button"
                      style={{
                        padding: '10px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, textAlign: 'center', cursor: 'pointer',
                        border: `1px solid ${goalMode === g.val ? 'var(--accent)' : 'var(--border-default)'}`,
                        background: goalMode === g.val ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                        color: goalMode === g.val ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Level Selection */}
              <div className="input-group">
                <label className="input-label">Activity Level</label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="input"
                  style={{ fontSize: 13, height: 38, cursor: 'pointer' }}
                >
                  <option value="sedentary">Sedentary (No exercise / Desk Job)</option>
                  <option value="lightly_active">Lightly Active (1-3 days/wk light training)</option>
                  <option value="moderately_active">Moderately Active (3-5 days/wk moderate workout)</option>
                  <option value="very_active">Very Active (6-7 days/wk heavy workout)</option>
                  <option value="athlete">Athlete (Twice daily training / Heavy physical labor)</option>
                </select>
              </div>

              {/* Bio Data inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <div className="input-group">
                  <label className="input-label">Current Weight (kg)</label>
                  <input
                    type="number"
                    className="input"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="80"
                    style={{ fontSize: 13, height: 38 }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Height (cm)</label>
                  <input
                    type="number"
                    className="input"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                    style={{ fontSize: 13, height: 38 }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Age (years)</label>
                  <input
                    type="number"
                    className="input"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="28"
                    style={{ fontSize: 13, height: 38 }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Biological Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}
                    className="input"
                    style={{ fontSize: 13, height: 38 }}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Neutral</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            /* Manual Mode Form */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="input-group">
                <label className="input-label">Daily Calories (kcal)</label>
                <input
                  type="number"
                  className="input"
                  value={manualCalorieTarget}
                  onChange={(e) => setManualCalorieTarget(e.target.value)}
                  placeholder="2000"
                  style={{ fontSize: 13, height: 38 }}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Daily Protein (g)</label>
                <input
                  type="number"
                  className="input"
                  value={manualProteinTarget}
                  onChange={(e) => setManualProteinTarget(e.target.value)}
                  placeholder="150"
                  style={{ fontSize: 13, height: 38 }}
                />
              </div>
            </div>
          )}

          {/* Common Targets (Target Weight, Target Date) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label className="input-label">Target Weight (kg)</label>
              <input
                type="number"
                className="input"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="e.g. 75"
                style={{ fontSize: 13, height: 38 }}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Target Date</label>
              <input
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={todayISO()}
                style={{ fontSize: 13, height: 38 }}
              />
            </div>
          </div>

          {/* Smart Calculator Live Preview Card */}
          {isSmartMode && calculated && (
            <div
              className="card-glass"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginTop: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                <Info size={12} />
                <span>ESTIMATED DAILY TARGETS</span>
              </div>
              <div className="flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>BMR / TDEE</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {calculated.bmr} / {calculated.tdee} kcal
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deficit / Surplus</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: calculated.deficitOrSurplus < 0 ? 'var(--accent)' : calculated.deficitOrSurplus > 0 ? 'var(--emerald)' : 'var(--text-primary)' }}>
                    {calculated.deficitOrSurplus > 0 ? '+' : ''}{calculated.deficitOrSurplus} kcal
                  </div>
                </div>
              </div>

              {/* Major Macro Numbers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center', marginTop: 4 }}>
                <div style={{ background: 'rgba(244,63,94,0.05)', padding: '6px 4px', borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: 'var(--macro-calories)', fontWeight: 600 }}>CALORIES</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--macro-calories)' }}>{calculated.targetCalories}</div>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>kcal</div>
                </div>
                <div style={{ background: 'rgba(59,130,246,0.05)', padding: '6px 4px', borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: 'var(--macro-protein)', fontWeight: 600 }}>PROTEIN</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--macro-protein)' }}>{calculated.targetProtein}g</div>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{Math.round((calculated.targetProtein * 4 / calculated.targetCalories) * 100)}%</div>
                </div>
                <div style={{ background: 'rgba(234,179,8,0.05)', padding: '6px 4px', borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: 'var(--macro-carbs)', fontWeight: 600 }}>CARBS</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--macro-carbs)' }}>{calculated.targetCarbs}g</div>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{Math.round((calculated.targetCarbs * 4 / calculated.targetCalories) * 100)}%</div>
                </div>
                <div style={{ background: 'rgba(34,197,94,0.05)', padding: '6px 4px', borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: 'var(--macro-fat)', fontWeight: 600 }}>FAT</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--macro-fat)' }}>{calculated.targetFat}g</div>
                  <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>{Math.round((calculated.targetFat * 9 / calculated.targetCalories) * 100)}%</div>
                </div>
              </div>
              
              {calculated.estimatedWeeklyChange !== 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                  Expected Weight Change: <span style={{ fontWeight: 600, color: calculated.estimatedWeeklyChange < 0 ? 'var(--accent)' : 'var(--emerald)' }}>
                    {calculated.estimatedWeeklyChange > 0 ? '+' : ''}{calculated.estimatedWeeklyChange} kg/week
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
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
