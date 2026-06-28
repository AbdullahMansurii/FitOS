/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/purity, @typescript-eslint/no-unused-vars */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Target, Scale, Utensils, Dumbbell, 
  Plus, ChevronRight, Flame, Beef, Brain, Ruler, Heart, Moon, Footprints, Activity, Award
} from 'lucide-react'
import { useGoalsStore, useWeightStore, useFoodStore, useWorkoutStore, useProfileStore, useRecoveryStore } from '@/store/index'
import { todayISO, formatDate, getTimeGreeting, calcGoalProgress, daysAgo } from '@/lib/utils'
import { MacroRing } from '@/components/shared/MacroRing'
import { WeightLogModal } from '@/components/shared/WeightLogModal'
import { GoalSetupModal } from '@/components/shared/GoalSetupModal'
import { RecoveryLogModal } from '@/components/shared/RecoveryLogModal'
import { getCachedRecommendation } from '@/lib/progressiveOverload'
import { getRecompositionReport } from '@/lib/recompositionIntelligence'
import { getNutritionRecommendation } from '@/lib/nutritionIntelligence'
import { calculateRecoveryScore } from '@/lib/recoveryIntelligence'

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  successful_recomp: { label: 'Recomping Successfully', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  lean_bulk: { label: 'Lean Bulk On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  gaining_muscle: { label: 'Lean Bulk On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  losing_fat: { label: 'Fat Loss On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  cutting: { label: 'Cutting On Track', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  stalled: { label: 'Weight Stable', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  aggressive_bulk: { label: 'Bulk Too Aggressive', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  aggressive_cut: { label: 'Cut Too Aggressive', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  insufficient_data: { label: 'Insufficient Data', color: 'var(--text-muted)', bg: 'var(--bg-muted)', icon: '⚪' }
}

const NUTRITION_STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  increase_calories: { label: 'Increase Calories', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  decrease_calories: { label: 'Decrease Calories', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  maintain_calories: { label: 'Calories On Target', color: 'var(--emerald)', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  increase_protein: { label: 'Increase Protein', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  reduce_rate_of_gain: { label: 'Reduce Rate Of Gain', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟠' },
  increase_rate_of_gain: { label: 'Increase Rate Of Gain', color: 'var(--blue)', bg: 'rgba(59,130,246,0.1)', icon: '🔵' },
  reduce_rate_of_loss: { label: 'Aggressive Cut Detected', color: 'var(--red)', bg: 'rgba(239,68,68,0.1)', icon: '🔴' },
  increase_rate_of_loss: { label: 'Reduce Rate Of Loss', color: 'var(--amber)', bg: 'rgba(245,158,11,0.1)', icon: '🟠' }
}

export function Dashboard() {
  const profile = useProfileStore((s) => s.profile)
  const getActiveGoal = useGoalsStore((s) => s.getActiveGoal)
  const getLatest = useWeightStore((s) => s.getLatest)
  const getByDate = useWeightStore((s) => s.getByDate)
  const getRange = useWeightStore((s) => s.getRange)
  const measurements = useWeightStore((s) => s.measurements)
  const weightLogs = useWeightStore((s) => s.logs)
  const getLogsByDate = useFoodStore((s) => s.getLogsByDate)
  const foodLogs = useFoodStore((s) => s.foodLogs)
  const sessions = useWorkoutStore((s) => s.sessions)
  const exercises = useWorkoutStore((s) => s.exercises)
  const getRecoveryByDate = useRecoveryStore((s) => s.getByDate)

  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)

  const today = todayISO()
  const greeting = getTimeGreeting()
  const activeGoal = getActiveGoal()
  const latestWeight = getLatest()
  const todayWeight = getByDate(today)
  const todayLogs = getLogsByDate(today)
  const recentWeights = getRange(daysAgo(30), today)
  const todayRecovery = getRecoveryByDate(today)

  const recompReport = useMemo(() => {
    return getRecompositionReport(measurements, weightLogs, sessions)
  }, [measurements, weightLogs, sessions])

  const nutritionRec = useMemo(() => {
    return getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, profile)
  }, [weightLogs, measurements, foodLogs, sessions, activeGoal, profile])

  // Resolve training goal style
  const trainingGoal = useMemo(() => {
    if (!activeGoal) return 'hypertrophy'
    const name = activeGoal.name.toLowerCase()
    if (name.includes('strength') || name.includes('power') || name.includes('lift')) {
      return 'strength'
    }
    if (activeGoal.type === 'maintain') {
      return 'maintenance'
    }
    return 'hypertrophy'
  }, [activeGoal])

  // Cache progressive overload recommendations by exerciseId
  const recommendationsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof getCachedRecommendation>> = {}
    const trainedIds = new Set<string>()
    sessions.forEach(s => {
      s.exercises.forEach(ex => {
        if (ex.exerciseId) trainedIds.add(ex.exerciseId)
      })
    })
    
    exercises.forEach((ex) => {
      if (trainedIds.has(ex.id)) {
        map[ex.id] = getCachedRecommendation(ex.id, sessions, trainingGoal)
      } else {
        map[ex.id] = {
          exerciseId: ex.id,
          recommendationType: 'insufficient_data',
          recommendation: 'insufficient_data',
          message: 'No history exists.',
          suggestedWeightKg: null,
          suggestedWeight: null,
          suggestedRepTarget: null,
          suggestedReps: null,
          confidence: 'low',
          reasoning: [],
          currentPeakE1RM: null,
          currentVolume: null,
          projectedE1RM: null,
          projectedVolume: null,
          stallDetected: false,
          potentialPR: false,
          readinessScore: 0,
          volumeImproving: false,
          fatigueWarning: false,
          daysSinceLastSession: null,
          weeklyFrequency: 0,
          reason: 'No history exists.'
        }
      }
    })
    return map
  }, [exercises, sessions, trainingGoal])

  // Calculate training status widget values
  const trainingStatus = useMemo(() => {
    const activeRecs = Object.values(recommendationsMap).filter(
      r => r.recommendationType !== 'insufficient_data'
    )

    if (activeRecs.length === 0) {
      return {
          readinessScore: 100,
          statusLabel: 'Ready To Progress',
          recommendations: [],
          warnings: { fatigue: 'None', plateau: 'None' }
      }
    }

    const totalReadiness = activeRecs.reduce((sum, r) => sum + r.readinessScore, 0)
    const avgReadiness = Math.round(totalReadiness / activeRecs.length)

    let statusLabel = 'Ready To Progress'
    if (avgReadiness < 40) {
      statusLabel = 'Deload Recommended'
    } else if (avgReadiness < 60) {
      statusLabel = 'Recovery Recommended'
    } else if (avgReadiness < 75) {
      statusLabel = 'Maintain'
    } else if (avgReadiness < 90) {
      statusLabel = 'Likely Ready'
    }

    const topRecsList = activeRecs
      .filter(r => r.recommendationType === 'increase_weight' || r.recommendationType === 'increase_reps')
      .slice(0, 3)
      .map(r => {
        const exName = exercises.find(e => e.id === r.exerciseId)?.name || 'Exercise'
        if (r.recommendationType === 'increase_weight') {
          const diff = r.suggestedWeight && r.currentPeakE1RM ? (r.suggestedWeight - r.currentPeakE1RM) : 2.5
          return `${exName} → +${diff > 0 ? diff : 2.5}kg`
        } else {
          return `${exName} → +1 Rep`
        }
      })

    if (topRecsList.length === 0) {
      activeRecs.slice(0, 3).forEach(r => {
        const exName = exercises.find(e => e.id === r.exerciseId)?.name || 'Exercise'
        topRecsList.push(`${exName} → ${r.recommendationType.replace('_', ' ')}`)
      })
    }

    const fatigueExs = activeRecs.filter(r => r.fatigueWarning)
    const plateauExs = activeRecs.filter(r => r.stallDetected)

    const fatigueText = fatigueExs.length > 0
      ? fatigueExs.map(r => exercises.find(e => e.id === r.exerciseId)?.name).join(', ')
      : 'None'

    const plateauText = plateauExs.length > 0
      ? plateauExs.map(r => exercises.find(e => e.id === r.exerciseId)?.name).join(', ')
      : 'None'

    return {
      readinessScore: avgReadiness,
      statusLabel,
      recommendations: topRecsList,
      warnings: { fatigue: fatigueText, plateau: plateauText }
    }
  }, [recommendationsMap, exercises])


  // Nutrition totals
  const todayNutrition = todayLogs.reduce(
    (acc, l) => ({ calories: acc.calories + l.calories, protein: acc.protein + l.protein, carbs: acc.carbs + l.carbs, fat: acc.fat + l.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const calorieTarget = activeGoal?.calorieTarget || 2000
  const proteinTarget = activeGoal?.proteinTarget || 150
  const caloriePct = Math.min(100, Math.round((todayNutrition.calories / calorieTarget) * 100))
  const proteinPct = Math.min(100, Math.round((todayNutrition.protein / proteinTarget) * 100))

  // Goal progress
  const goalProgress = activeGoal && latestWeight
    ? calcGoalProgress(activeGoal.startWeight, activeGoal.targetWeight!, latestWeight.weightKg)
    : 0

  // Recent workouts
  const recentWorkout = sessions[0] || null
  const weekWorkouts = sessions.filter((s) => s.date >= daysAgo(7)).length

  // Weight trend
  const weightTrend = recentWeights.length >= 2
    ? (recentWeights[recentWeights.length - 1].weightKg - recentWeights[0].weightKg).toFixed(1)
    : null

  // Recovery calculations
  const calculatedRecovery = useMemo(() => {
    return calculateRecoveryScore(todayRecovery)
  }, [todayRecovery])

  // Consistency Streak
  const consistencyStreak = useMemo(() => {
    const activeDates = new Set<string>()
    foodLogs.forEach(l => activeDates.add(l.date))
    weightLogs.forEach(l => activeDates.add(l.date))
    
    // Retrieve recoveryLogs from state
    const recoveryLogs = useRecoveryStore.getState().recoveryLogs
    recoveryLogs.forEach(l => activeDates.add(l.date))
    sessions.forEach(s => activeDates.add(s.date))

    let streak = 0
    let checkDate = new Date()
    
    const todayStr = checkDate.toISOString().split('T')[0]
    if (!activeDates.has(todayStr)) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      if (!activeDates.has(yesterdayStr)) {
        return 0
      }
      checkDate = yesterday
    }
    
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (activeDates.has(dateStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [foodLogs, weightLogs, sessions])

  const greetingText = {
    morning: `Good morning, ${profile?.displayName || 'Champion'}! 🌅`,
    afternoon: `Good afternoon, ${profile?.displayName || 'Champion'}! ☀️`,
    evening: `Good evening, ${profile?.displayName || 'Champion'}! 🌙`,
  }[greeting]

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 1100, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'inline-block' }}>
            {greetingText}
          </h1>
          {consistencyStreak > 0 && (
            <span 
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                padding: '4px 10px',
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginLeft: 12,
                verticalAlign: 'middle',
                border: '1px solid rgba(239, 68, 68, 0.15)'
              }}
              title="Consecutive days logging food, weight, or training!"
            >
              🔥 {consistencyStreak} day streak
            </span>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {formatDate(today, 'long')}
          </p>
        </div>
      </div>

      {/* Redesigned Premium Top Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Calories Card */}
        <div className="card-elevated" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--macro-calories)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calories</span>
            <span className="badge badge-red" style={{ fontSize: 10 }}>
              {caloriePct >= 100 ? 'Target Reached' : `${calorieTarget - todayNutrition.calories} kcal left`}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {todayNutrition.calories}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>/ {calorieTarget} kcal</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-muted)', borderRadius: 9999, marginTop: 12 }}>
            <div style={{ height: '100%', width: `${caloriePct}%`, background: 'var(--macro-calories)', borderRadius: 9999, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Protein Card */}
        <div className="card-elevated" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--macro-protein)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Protein</span>
            <span className="badge badge-blue" style={{ fontSize: 10 }}>
              {proteinPct >= 100 ? 'Target Met' : `${Math.round(proteinTarget - todayNutrition.protein)}g left`}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {todayNutrition.protein.toFixed(0)}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>/ {proteinTarget}g</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-muted)', borderRadius: 9999, marginTop: 12 }}>
            <div style={{ height: '100%', width: `${proteinPct}%`, background: 'var(--macro-protein)', borderRadius: 9999, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Recovery Score Card */}
        <div
          className="card-elevated hover-glow"
          style={{ cursor: 'pointer', borderLeft: `3px solid ${calculatedRecovery.color}`, transition: 'all 0.2s ease' }}
          onClick={() => setShowRecoveryModal(true)}
        >
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recovery Score</span>
            <span 
              className="badge" 
              style={{ 
                fontSize: 10, 
                backgroundColor: calculatedRecovery.status === 'excellent' ? 'rgba(34, 197, 94, 0.1)' : calculatedRecovery.status === 'good' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: calculatedRecovery.color
              }}
            >
              {todayRecovery ? 'Logged' : 'Pending Log'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: calculatedRecovery.color }}>
              {calculatedRecovery.score}%
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{calculatedRecovery.statusLabel}</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {todayRecovery ? (
              `Sleep: ${todayRecovery.sleepHours ?? '—'}h · Steps: ${((todayRecovery.dailySteps || 0)/1000).toFixed(1)}k · Energy: ${todayRecovery.energy}/5`
            ) : 'Click to log steps, sleep, & wellness.'}
          </p>
        </div>

        {/* Weight / Goal Card */}
        <div
          className="card-elevated hover-glow"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => setShowWeightModal(true)}
        >
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body Weight</span>
            <span className="badge badge-accent" style={{ fontSize: 10 }}>
              {todayWeight ? 'Logged' : 'Log Today'}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {latestWeight ? latestWeight.weightKg : '—'}
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>kg</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {activeGoal ? (
              `${activeGoal.type.toUpperCase()}: ${activeGoal.startWeight}kg → ${activeGoal.targetWeight}kg (${goalProgress}% done)`
            ) : 'No active goal set.'}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="dashboard-grid">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Goal */}
          <div className="card-elevated">
            <div className="section-header">
              <div className="flex-start" style={{ gap: 10 }}>
                <Target size={18} color="var(--accent)" />
                <span className="section-title">Active Goal</span>
              </div>
              {!activeGoal && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowGoalModal(true)}>
                  <Plus size={14} /> Set Goal
                </button>
              )}
              {activeGoal && (
                <Link to="/progress" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                  Details <ChevronRight size={14} />
                </Link>
              )}
            </div>

            {activeGoal ? (
              <div>
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600 }}>{activeGoal.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span className={`badge badge-${activeGoal.type === 'cut' ? 'red' : activeGoal.type === 'bulk' ? 'blue' : 'muted'}`} style={{ marginRight: 8 }}>
                        {activeGoal.type.toUpperCase()}
                      </span>
                      {activeGoal.startWeight}kg → {activeGoal.targetWeight}kg
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>
                      {goalProgress}%
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>complete</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 8, background: 'var(--bg-muted)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${goalProgress}%`,
                    background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))',
                    borderRadius: 9999,
                    transition: 'width 1s var(--ease-default)',
                    boxShadow: '0 0 10px rgba(163,230,53,0.3)',
                  }} />
                </div>

                <div className="flex-between" style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {activeGoal.calorieTarget} kcal · {activeGoal.proteinTarget}g protein
                  </span>
                  {activeGoal.targetDate && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Target: {formatDate(activeGoal.targetDate, 'short')}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-state-icon"><Target size={24} /></div>
                <div className="empty-state-title">No active goal</div>
                <div className="empty-state-desc">Set a cut, bulk, or maintain goal to start tracking your progress</div>
              </div>
            )}
          </div>

          {/* Today's Macros */}
          <div className="card-elevated">
            <div className="section-header">
              <div className="flex-start" style={{ gap: 10 }}>
                <Utensils size={18} color="var(--amber)" />
                <span className="section-title">Today's Nutrition</span>
              </div>
              <Link to="/food" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                Log Food <ChevronRight size={14} />
              </Link>
            </div>

            <MacroRing
              calories={todayNutrition.calories}
              calorieTarget={calorieTarget}
              protein={todayNutrition.protein}
              proteinTarget={proteinTarget}
              carbs={todayNutrition.carbs}
              fat={todayNutrition.fat}
            />
          </div>

          {/* Recent Workout */}
          <div className="card-elevated">
            <div className="section-header">
              <div className="flex-start" style={{ gap: 10 }}>
                <Dumbbell size={18} color="var(--purple)" />
                <span className="section-title">Last Workout</span>
              </div>
              <Link to="/workout" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                <Plus size={14} /> Start
              </Link>
            </div>

            {recentWorkout ? (
              <div>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{recentWorkout.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                      {formatDate(recentWorkout.date, 'short')} · {recentWorkout.exercises.length} exercises
                      {recentWorkout.totalVolume ? ` · ${Math.round(recentWorkout.totalVolume)}kg volume` : ''}
                    </div>
                  </div>
                  {recentWorkout.rating && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} style={{ fontSize: 14, color: s <= recentWorkout.rating! ? 'var(--accent)' : 'var(--bg-muted)' }}>★</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {recentWorkout.exercises.slice(0, 4).map((ex) => (
                    <span key={ex.id} className="badge badge-muted" style={{ fontSize: 12 }}>
                      {ex.exercise?.name || 'Exercise'}
                    </span>
                  ))}
                  {recentWorkout.exercises.length > 4 && (
                    <span className="badge badge-muted" style={{ fontSize: 12 }}>+{recentWorkout.exercises.length - 4}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div className="empty-state-icon"><Dumbbell size={22} /></div>
                <div className="empty-state-title">No workouts yet</div>
                <div className="empty-state-desc">Start your first workout session</div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Today's Training Status Widget */}
          <div className="card-elevated" style={{ borderLeft: '4px solid var(--accent)' }} data-testid="training-status-widget">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Dumbbell size={16} color="var(--accent)" />
                <span>Today's Training Status</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                  {trainingStatus.readinessScore}/100
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Readiness</div>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                {trainingStatus.statusLabel}
              </div>
            </div>

            {trainingStatus.recommendations.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Recommendations</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {trainingStatus.recommendations.map((rec, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--accent)' }}>•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Warnings</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>⚠ Fatigue:</span>
                  <span style={{ fontWeight: 600, color: trainingStatus.warnings.fatigue === 'None' ? 'var(--emerald)' : 'var(--red)' }}>
                    {trainingStatus.warnings.fatigue}
                  </span>
                </div>
                <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>⚠ Plateau:</span>
                  <span style={{ fontWeight: 600, color: trainingStatus.warnings.plateau === 'None' ? 'var(--emerald)' : 'var(--amber)' }}>
                    {trainingStatus.warnings.plateau}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Physique Status Widget */}
          <div className="card-elevated">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div className="flex-start" style={{ gap: 10 }}>
                <Ruler size={18} color="var(--accent)" />
                <span className="section-title">Today's Physique Status</span>
              </div>
              <Link to="/measurements" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', padding: '2px 8px', fontSize: 11 }}>
                Log <ChevronRight size={12} />
              </Link>
            </div>

            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div>
                <span 
                  className="badge" 
                  style={{ 
                    backgroundColor: STATUS_META[recompReport.status]?.bg || 'var(--bg-muted)', 
                    color: STATUS_META[recompReport.status]?.color || 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: 11,
                    padding: '3px 6px',
                    borderRadius: 6
                  }}
                >
                  <span style={{ marginRight: 4 }}>{STATUS_META[recompReport.status]?.icon}</span>
                  {STATUS_META[recompReport.status]?.label || recompReport.status}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                  {recompReport.status === 'insufficient_data' ? '—' : `${recompReport.confidence}%`}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Confidence</div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              {recompReport.explanation}
            </p>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Body Fat Trend</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                  {recompReport.bodyFatTrend}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Weight Trend (30d)</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {recompReport.weightTrend.change !== null 
                    ? `${recompReport.weightTrend.change > 0 ? '+' : ''}${recompReport.weightTrend.change} kg`
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Nutrition Status Widget */}
          <div className="card-elevated" style={{ borderLeft: '4px solid var(--amber)' }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div className="flex-start" style={{ gap: 10 }}>
                <Utensils size={18} color="var(--amber)" />
                <span className="section-title" style={{ fontWeight: 700, fontSize: 15 }}>Nutrition Status</span>
              </div>
              <Link to="/progress" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', padding: '2px 8px', fontSize: 11 }}>
                Analytics <ChevronRight size={12} />
              </Link>
            </div>

            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div>
                <span 
                  className="badge" 
                  style={{ 
                    backgroundColor: NUTRITION_STATUS_META[nutritionRec.status]?.bg || 'var(--bg-muted)', 
                    color: NUTRITION_STATUS_META[nutritionRec.status]?.color || 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: 11,
                    padding: '3px 6px',
                    borderRadius: 6
                  }}
                >
                  <span style={{ marginRight: 4 }}>{NUTRITION_STATUS_META[nutritionRec.status]?.icon}</span>
                  {NUTRITION_STATUS_META[nutritionRec.status]?.label || nutritionRec.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
                  {nutritionRec.confidence}%
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Confidence</div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              {nutritionRec.reason}
            </p>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Calorie Target</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {nutritionRec.recommendedCalories !== nutritionRec.currentCalories ? (
                    <span>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: 6 }}>
                        {nutritionRec.currentCalories}
                      </span>
                      {nutritionRec.recommendedCalories} kcal
                    </span>
                  ) : (
                    <span>{nutritionRec.currentCalories} kcal</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Protein Target</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {nutritionRec.recommendedProtein !== nutritionRec.currentProtein ? (
                    <span>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: 6 }}>
                        {nutritionRec.currentProtein}g
                      </span>
                      {nutritionRec.recommendedProtein}g
                    </span>
                  ) : (
                    <span>{nutritionRec.currentProtein}g</span>
                  )}
                </div>
              </div>
            </div>

            {nutritionRec.weeklyRateOfWeightChange !== null && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, marginTop: 10 }}>
                <div className="flex-between" style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Weekly Weight Rate</span>
                  <span style={{ fontWeight: 600, color: nutritionRec.weeklyRateOfWeightChange > 0 ? 'var(--blue)' : 'var(--emerald)' }}>
                    {profile?.weightUnit === 'lbs' ? (
                      <span>
                        {nutritionRec.weeklyRateOfWeightChange > 0 ? '+' : ''}
                        {(nutritionRec.weeklyRateOfWeightChange * 2.20462).toFixed(2)} lbs/week
                      </span>
                    ) : (
                      <span>
                        {nutritionRec.weeklyRateOfWeightChange > 0 ? '+' : ''}
                        {nutritionRec.weeklyRateOfWeightChange.toFixed(2)} kg/week
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Body Composition Summary Widget */}
          {recompReport.status !== 'insufficient_data' && (
            <div className="card-elevated">
              <div className="section-title" style={{ marginBottom: 12, fontSize: 13 }}>Body Composition Summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="flex-between" style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Weight</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {recompReport.weightTrend.latest !== null ? `${recompReport.weightTrend.latest} kg` : 'N/A'}
                  </span>
                </div>
                <div className="flex-between" style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Waist Change (30d)</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {recompReport.waistTrend.change !== null 
                      ? `${recompReport.waistTrend.change > 0 ? '+' : ''}${recompReport.waistTrend.change} cm`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex-between" style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Strength Trend (30d)</span>
                  <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>
                    {recompReport.strengthTrend.avgStrengthChange !== null 
                      ? `${recompReport.strengthTrend.avgStrengthChange > 0 ? '+' : ''}${recompReport.strengthTrend.avgStrengthChange}%`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowWeightModal(true)} style={{ justifyContent: 'flex-start', gap: 12 }}>
                <Scale size={16} color="var(--accent)" />
                <span>Log Weight</span>
              </button>
              <Link to="/food" className="btn btn-secondary" style={{ textDecoration: 'none', justifyContent: 'flex-start', gap: 12 }}>
                <Utensils size={16} color="var(--amber)" />
                <span>Log Food</span>
              </Link>
              <Link to="/workout" className="btn btn-secondary" style={{ textDecoration: 'none', justifyContent: 'flex-start', gap: 12 }}>
                <Dumbbell size={16} color="var(--purple)" />
                <span>Start Workout</span>
              </Link>
              <Link to="/coach" className="btn btn-secondary" style={{ textDecoration: 'none', justifyContent: 'flex-start', gap: 12 }}>
                <Brain size={16} color="var(--blue)" />
                <span>Ask AI Coach</span>
              </Link>
            </div>
          </div>

          {/* AI Brief */}
          <div className="card-elevated" style={{ borderColor: 'var(--accent-bg)', background: 'linear-gradient(135deg, var(--bg-elevated), rgba(163,230,53,0.03))' }}>
            <div className="flex-start" style={{ gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={16} color="#0a0b0f" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>AI Coach Brief</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Powered by Groq</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {activeGoal
                ? `You're ${goalProgress}% toward your ${activeGoal.type} goal. `
                : 'Set a goal to get personalized insights. '}
              {caloriePct < 50
                ? `You've only hit ${caloriePct}% of your calorie target today — time to eat!`
                : caloriePct >= 100
                ? `You've hit your calorie target. Great consistency!`
                : `You're tracking well. Keep logging to stay on target.`}
            </p>
            <Link to="/coach" className="btn btn-ghost btn-sm" style={{ marginTop: 12, textDecoration: 'none', color: 'var(--accent)', paddingLeft: 0 }}>
              Ask your coach → 
            </Link>
          </div>

          {/* Nutrition breakdown */}
          <div className="card-elevated">
            <div className="section-title" style={{ marginBottom: 14 }}>Macro Breakdown</div>
            {[
              { label: 'Calories', value: todayNutrition.calories, target: calorieTarget, unit: 'kcal', color: 'var(--macro-calories)' },
              { label: 'Protein', value: todayNutrition.protein, target: proteinTarget, unit: 'g', color: 'var(--macro-protein)' },
              { label: 'Carbs', value: todayNutrition.carbs, target: Math.round(calorieTarget * 0.45 / 4), unit: 'g', color: 'var(--macro-carbs)' },
              { label: 'Fat', value: todayNutrition.fat, target: Math.round(calorieTarget * 0.25 / 9), unit: 'g', color: 'var(--macro-fat)' },
            ].map(({ label, value, target, unit, color }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div className="flex-between" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {Math.round(value)}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/{target}{unit}</span>
                  </span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-muted)', borderRadius: 9999 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.round((value / target) * 100))}%`, background: color, borderRadius: 9999, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWeightModal && <WeightLogModal onClose={() => setShowWeightModal(false)} />}
      {showGoalModal && <GoalSetupModal onClose={() => setShowGoalModal(false)} />}
      {showRecoveryModal && <RecoveryLogModal onClose={() => setShowRecoveryModal(false)} />}
    </div>
  )
}
