/* eslint-disable react-hooks/preserve-manual-memoization, react-hooks/purity, @typescript-eslint/no-unused-vars */
import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Target, Scale, Utensils, Dumbbell, 
  Plus, ChevronRight, Flame, Beef, Brain, Ruler, Heart, Moon, 
  Footprints, Activity, Award, CheckCircle2, Circle, Zap, Play, 
  Droplets, Pill, Percent, TrendingDown, TrendingUp, X, Sparkles
} from 'lucide-react'
import { useGoalsStore, useWeightStore, useFoodStore, useWorkoutStore, useProfileStore, useRecoveryStore } from '@/store/index'
import { todayISO, formatDate, getTimeGreeting, calcGoalProgress, daysAgo } from '@/lib/utils'
import { WeightLogModal } from '@/components/shared/WeightLogModal'
import { GoalSetupModal } from '@/components/shared/GoalSetupModal'
import { RecoveryLogModal } from '@/components/shared/RecoveryLogModal'
import { getCachedRecommendation } from '@/lib/progressiveOverload'
import { getRecompositionReport } from '@/lib/recompositionIntelligence'
import { getNutritionRecommendation, calculateDailyNutritionReport } from '@/lib/nutritionIntelligence'
import { calculateRecoveryScore } from '@/lib/recoveryIntelligence'
import { weightedAverageScore } from '@/lib/proteinQuality'
import { resolveFoodById } from '@/lib/nutritionResolver'
import type { SavedMeal, MealType } from '@/types'

const commonFruitsAndVeg = ['apple', 'banana', 'orange', 'strawberry', 'blueberry', 'broccoli', 'spinach', 'carrot', 'cucumber', 'tomato', 'fruit', 'vegetable', 'veg', 'salad', 'greens', 'lettuce', 'cabbage', 'onion', 'garlic', 'potato', 'sweet potato', 'avocado', 'mango', 'berries', 'lemon', 'lime', 'watermelon', 'grape', 'peach', 'pear', 'plum', 'cherry', 'kiwi', 'pineapple', 'kale', 'pepper', 'chili', 'mushroom', 'cauliflower', 'zucchini', 'asparagus', 'celery']

export function Dashboard() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.profile)
  const getActiveGoal = useGoalsStore((s) => s.getActiveGoal)
  const getLatest = useWeightStore((s) => s.getLatest)
  const getByDate = useWeightStore((s) => s.getByDate)
  const getRange = useWeightStore((s) => s.getRange)
  const measurements = useWeightStore((s) => s.measurements)
  const weightLogs = useWeightStore((s) => s.logs)
  const getLogsByDate = useFoodStore((s) => s.getLogsByDate)
  const foodLogs = useFoodStore((s) => s.foodLogs)
  const savedMeals = useFoodStore((s) => s.savedMeals)
  const sessions = useWorkoutStore((s) => s.sessions)
  const exercises = useWorkoutStore((s) => s.exercises)
  const getRecoveryByDate = useRecoveryStore((s) => s.getByDate)
  const startSession = useWorkoutStore((s) => s.startSession)
  const addFoodLog = useFoodStore((s) => s.addFoodLog)
  const incrementSavedMealUsage = useFoodStore((s) => s.incrementSavedMealUsage)

  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)

  const today = todayISO()
  const greeting = getTimeGreeting()
  const activeGoal = getActiveGoal()
  const latestWeight = getLatest()
  const todayWeight = getByDate(today)
  const todayLogs = getLogsByDate(today)
  const recentWeights = getRange(daysAgo(30), today)
  const todayRecovery = getRecoveryByDate(today)

  // 1. Water Tracker State (Persisted locally per day)
  const [waterCups, setWaterCups] = useState(() => {
    try {
      const saved = localStorage.getItem(`water_${today}`)
      return saved ? parseInt(saved, 10) : 0
    } catch {
      return 0
    }
  })

  const handleAdjustWater = (diff: number) => {
    const newVal = Math.max(0, waterCups + diff)
    setWaterCups(newVal)
    try {
      localStorage.setItem(`water_${today}`, newVal.toString())
    } catch (e) {
      console.error(e)
    }
  }

  // Recomp and Nutrition Recommendation calculations
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

  // Cache progressive overload recommendations
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
    (acc, l) => ({ 
      calories: acc.calories + l.calories, 
      protein: acc.protein + l.protein, 
      carbs: acc.carbs + l.carbs, 
      fat: acc.fat + l.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const calorieTarget = activeGoal?.calorieTarget || 2000
  const proteinTarget = activeGoal?.proteinTarget || 150
  const carbTarget = Math.round(calorieTarget * 0.45 / 4)
  const fatTarget = Math.round(calorieTarget * 0.25 / 9)

  const caloriePct = Math.min(100, Math.round((todayNutrition.calories / calorieTarget) * 100))
  const proteinPct = Math.min(100, Math.round((todayNutrition.protein / proteinTarget) * 100))

  // Goal progress
  const goalProgress = activeGoal && latestWeight
    ? calcGoalProgress(activeGoal.startWeight, activeGoal.targetWeight!, latestWeight.weightKg)
    : 0

  // Recovery calculations
  const calculatedRecovery = useMemo(() => {
    return calculateRecoveryScore(todayRecovery)
  }, [todayRecovery])

  // 2. Supplement logging detections
  const hasFishOil = todayLogs.some(l => l.name.toLowerCase().includes('fish oil'))
  const hasVitaminD = todayLogs.some(l => l.name.toLowerCase().includes('vitamin d') || l.name.toLowerCase().includes('d3'))
  const hasMagnesium = todayLogs.some(l => l.name.toLowerCase().includes('magnesium'))

  const handleQuickLogSupplement = (name: string) => {
    addFoodLog({
      date: today,
      mealType: 'breakfast',
      name,
      foodItemId: `supp-${name.toLowerCase().replace(/\s+/g, '-')}`,
      quantityG: 1,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      proteinQualityScore: null,
      proteinQualityMethod: 'none',
      nutritionSource: 'manual',
      savedMealVersion: 1
    })
    alert(`⚡ Logged "${name}" successfully!`)
  }

  const dailyReport = useMemo(() => {
    return calculateDailyNutritionReport(today, todayLogs, calorieTarget, proteinTarget)
  }, [today, todayLogs, calorieTarget, proteinTarget])

  // Workout Split logic
  const templates = useWorkoutStore((s) => s.templates)
  const activeSession = useWorkoutStore((s) => s.activeSession)

  const suggestedTemplate = useMemo(() => {
    if (activeSession) {
      return templates.find(t => t.id === activeSession.templateId) || null
    }
    if (templates.length === 0) return null
    if (sessions.length === 0) return templates[0]
    
    // Find the last session template ID
    const lastSession = sessions[0]
    if (!lastSession.templateId) return templates[0]
    
    const lastIndex = templates.findIndex(t => t.id === lastSession.templateId)
    if (lastIndex === -1 || lastIndex === templates.length - 1) {
      return templates[0]
    }
    return templates[lastIndex + 1]
  }, [templates, sessions, activeSession])

  const getLastPerformance = (exerciseId: string) => {
    for (const s of sessions) {
      const match = s.exercises.find(e => e.exerciseId === exerciseId)
      if (match && match.sets.length > 0) {
        return match.sets.map(set => `${set.reps}x @ ${set.weightKg}kg`).join(', ')
      }
    }
    return 'No previous sets'
  }

  const getOverloadTarget = (exerciseId: string) => {
    const rec = recommendationsMap[exerciseId]
    if (!rec || rec.recommendationType === 'insufficient_data') {
      return 'Maintain current / Log sets'
    }
    if (rec.recommendationType === 'increase_weight') {
      return `Target: ${rec.suggestedRepTarget} reps @ ${rec.suggestedWeightKg}kg (+weight)`
    }
    if (rec.recommendationType === 'increase_reps') {
      return `Target: ${rec.suggestedRepTarget} reps @ ${rec.suggestedWeightKg || 'same'}kg (+1 rep)`
    }
    return rec.message || 'Ready to progress'
  }

  const handleStartWorkout = (template: import('@/types').WorkoutTemplate) => {
    startSession({
      templateId: template.id,
      name: template.name,
      date: today,
      startedAt: new Date().toISOString(),
      exercises: template.exercises.map((te: import('@/types').WorkoutTemplateExercise) => ({
        id: `se_${te.id}`,
        sessionId: '',
        exerciseId: te.exerciseId,
        exercise: te.exercise,
        orderIndex: te.orderIndex,
        sets: [],
      })),
    })
    navigate('/workout')
  }

  // 3. Saved Meals Quick Access (Frequent)
  const frequentSavedMeals = useMemo(() => {
    return [...savedMeals].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 3)
  }, [savedMeals])

  const handleOneTapQuickLog = (meal: SavedMeal) => {
    const mealType = meal.category && ['breakfast', 'lunch', 'dinner', 'snack'].includes(meal.category)
      ? meal.category as MealType
      : 'breakfast'
    
    const items = meal.items || []
    items.forEach((item: { foodItemId: string; quantityG: number; name?: string; caloriesPer100g?: number; proteinPer100g?: number; carbsPer100g?: number; fatPer100g?: number; diaas?: number | null; source?: string }) => {
      const ratio = item.quantityG / 100
      addFoodLog({
        date: today,
        mealType,
        name: item.name || 'Meal Item',
        foodItemId: item.foodItemId,
        savedMealId: meal.id,
        quantityG: item.quantityG,
        calories: Math.round((item.caloriesPer100g || 0) * ratio),
        protein: Math.round((item.proteinPer100g || 0) * ratio * 10) / 10,
        carbs: Math.round((item.carbsPer100g || 0) * ratio * 10) / 10,
        fat: Math.round((item.fatPer100g || 0) * ratio * 10) / 10,
        proteinQualityScore: item.diaas || null,
        proteinQualityMethod: item.diaas ? 'diaas' : 'none',
        nutritionSource: item.source || 'manual',
        savedMealVersion: meal.version || 1
      })
    })

    incrementSavedMealUsage(meal.id)
    alert(`⚡ Logged "${meal.name}" instantly to today's ${mealType}!`)
  }

  // 4. Streaks calculations
  const streaks = useMemo(() => {
    const todayStr = today
    const yesterdayStr = daysAgo(1)

    const calcStreak = (checkFn: (date: string) => boolean) => {
      let streak = 0
      const checkDate = new Date()
      const isTodayMatched = checkFn(todayStr)
      const isYesterdayMatched = checkFn(yesterdayStr)
      
      if (!isTodayMatched && !isYesterdayMatched) return 0
      if (!isTodayMatched) checkDate.setDate(checkDate.getDate() - 1)

      while (true) {
        const dStr = checkDate.toISOString().split('T')[0]
        if (checkFn(dStr)) {
          streak++
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          break
        }
      }
      return streak
    }

    const dietStreak = calcStreak((date) => {
      const logs = foodLogs.filter(l => l.date === date)
      return logs.length > 0
    })

    const proteinStreak = calcStreak((date) => {
      const logs = foodLogs.filter(l => l.date === date)
      const totalProt = logs.reduce((sum, l) => sum + l.protein, 0)
      return totalProt >= proteinTarget
    })

    const weightStreak = calcStreak((date) => {
      return !!weightLogs.some(l => l.date === date)
    })

    const recoveryStreak = calcStreak((date) => {
      const recoveryLogs = useRecoveryStore.getState().recoveryLogs
      return !!recoveryLogs.some(l => l.date === date)
    })

    // Workout streak: consecutive weeks with at least 1 workout
    let workoutStreakWeeks = 0
    const checkWeekStart = new Date()
    while (true) {
      const weekAgoStr = new Date(checkWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const currentWeekStr = checkWeekStart.toISOString().split('T')[0]
      const hasWorkoutInWeek = sessions.some(s => s.date <= currentWeekStr && s.date > weekAgoStr)
      if (hasWorkoutInWeek) {
        workoutStreakWeeks++
        checkWeekStart.setDate(checkWeekStart.getDate() - 7)
      } else {
        break
      }
    }

    return {
      dietStreak,
      proteinStreak,
      weightStreak,
      recoveryStreak,
      workoutStreak: workoutStreakWeeks
    }
  }, [foodLogs, weightLogs, sessions, proteinTarget, today])

  // 5. Weekly Consistency score calculation
  const weeklyConsistency = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => daysAgo(i))
    
    let dietDays = 0
    let sleepDays = 0
    let stepDays = 0
    
    last7Days.forEach(dateStr => {
      const logs = foodLogs.filter(l => l.date === dateStr)
      const dailyCal = logs.reduce((sum, l) => sum + l.calories, 0)
      if (dailyCal > 0) dietDays++

      const rec = useRecoveryStore.getState().getByDate(dateStr)
      if (rec) {
        if ((rec.sleepHours || 0) >= 7) sleepDays++
        if ((rec.dailySteps || 0) >= 8000) stepDays++
      }
    })

    const workoutCount = sessions.filter(s => s.date >= daysAgo(7)).length
    const workoutPct = Math.min(100, Math.round((workoutCount / 4) * 100))
    const dietPct = Math.round((dietDays / 7) * 100)
    const sleepPct = Math.round((sleepDays / 7) * 100)
    const stepPct = Math.round((stepDays / 7) * 100)

    const overallScore = Math.round((workoutPct + dietPct + sleepPct + stepPct) / 4)

    return {
      workoutPct,
      dietPct,
      sleepPct,
      stepPct,
      overallScore
    }
  }, [foodLogs, sessions])

  // 6. Mission Progress centerpiece metrics
  const missionProgress = useMemo(() => {
    const items = []
    
    // Weight Log
    items.push({
      name: 'Weight Logged',
      met: !!todayWeight,
      value: todayWeight ? 1 : 0,
      label: 'Log Weight'
    })

    // Recovery Log
    items.push({
      name: 'Recovery Logged',
      met: !!todayRecovery,
      value: todayRecovery ? 1 : 0,
      label: 'Log Recovery'
    })

    // Protein Target
    const pRemaining = proteinTarget - todayNutrition.protein
    items.push({
      name: 'Protein Goal',
      met: pRemaining <= 0,
      value: Math.min(1, todayNutrition.protein / proteinTarget),
      label: pRemaining > 0 ? `${Math.round(pRemaining)}g Protein` : 'Protein Met'
    })

    // Calorie Target
    const cRemaining = calorieTarget - todayNutrition.calories
    items.push({
      name: 'Calorie Goal',
      met: cRemaining <= 0,
      value: Math.min(1, todayNutrition.calories / calorieTarget),
      label: cRemaining > 0 ? `${Math.round(cRemaining)} kcal` : 'Calories Met'
    })

    // Steps Target
    const stepsVal = todayRecovery?.dailySteps || 0
    const stepsRemaining = 10000 - stepsVal
    items.push({
      name: '10,000 Steps',
      met: stepsRemaining <= 0,
      value: Math.min(1, stepsVal / 10000),
      label: stepsRemaining > 0 ? `${stepsRemaining.toLocaleString()} Steps` : 'Steps Met'
    })

    // Sleep Target
    const sleepVal = todayRecovery?.sleepHours || 0
    const sleepRemaining = 7.5 - sleepVal
    items.push({
      name: 'Sleep 7.5h+',
      met: sleepRemaining <= 0,
      value: Math.min(1, sleepVal / 7.5),
      label: sleepRemaining > 0 ? `${sleepRemaining.toFixed(1)}h Sleep` : 'Sleep Met'
    })

    // Supplements
    items.push({
      name: 'Fish Oil',
      met: hasFishOil,
      value: hasFishOil ? 1 : 0,
      label: 'Fish Oil'
    })

    items.push({
      name: 'Vitamin D3',
      met: hasVitaminD,
      value: hasVitaminD ? 1 : 0,
      label: 'Vitamin D3'
    })

    items.push({
      name: 'Magnesium',
      met: hasMagnesium,
      value: hasMagnesium ? 1 : 0,
      label: 'Magnesium'
    })

    // Workout completed
    const hasWorkoutToday = sessions.some(s => s.date === today)
    items.push({
      name: 'Workout Session',
      met: hasWorkoutToday,
      value: hasWorkoutToday ? 1 : 0,
      label: 'Workout Completed'
    })

    const totalVal = items.reduce((sum, it) => sum + it.value, 0)
    const pct = Math.round((totalVal / items.length) * 100)
    const remaining = items.filter(it => !it.met)

    return {
      pct,
      remaining,
      totalCount: items.length,
      metCount: items.filter(it => it.met).length
    }
  }, [todayWeight, todayRecovery, todayNutrition, proteinTarget, calorieTarget, hasFishOil, hasVitaminD, hasMagnesium, sessions, today])

  const weightTrend = recentWeights.length >= 2
    ? (recentWeights[recentWeights.length - 1].weightKg - recentWeights[0].weightKg).toFixed(1)
    : null

  const weightChangeLabel = useMemo(() => {
    if (!weightTrend) return '—'
    const val = parseFloat(weightTrend)
    if (val === 0) return '0.0 kg'
    return `${val > 0 ? '↑' : '↓'} ${Math.abs(val)} kg`
  }, [weightTrend])

  const timeGreetingText = {
    morning: 'Good Morning',
    afternoon: 'Good Afternoon',
    evening: 'Good Evening',
  }[greeting]

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: 1200, paddingBottom: 80 }}>
      {/* Dynamic Style injection for responsive layouts & grid configuration */}
      <style>{`
        .fab-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
        }
        @media (max-width: 768px) {
          .fab-container {
            bottom: 84px;
          }
        }
        .mission-control-grid {
          display: grid;
          grid-template-columns: 1fr 1.6fr 1fr;
          gap: 20px;
        }
        @media (max-width: 1024px) {
          .mission-control-grid {
            grid-template-columns: 1.2fr 1fr;
          }
          .mission-control-col-3 {
            grid-column: span 2;
          }
        }
        @media (max-width: 768px) {
          .mission-control-grid {
            grid-template-columns: 1fr;
          }
          .mission-control-col-3 {
            grid-column: span 1;
          }
        }
        .hero-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 540px) {
          .hero-stats-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        .quick-actions-fab-btn {
          width: 56px;
          height: 56px;
          border-radius: 9999px;
          background: var(--accent);
          color: #0a0b0f;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(163, 230, 53, 0.4);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .quick-actions-fab-btn:hover {
          transform: scale(1.08) rotate(45deg);
        }
        .quick-actions-menu {
          position: absolute;
          bottom: 70px;
          right: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
          pointer-events: auto;
        }
        .quick-action-item {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: var(--shadow-md);
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .quick-action-item:hover {
          background: var(--bg-overlay);
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        .checklist-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-subtle);
          font-size: 13px;
        }
        .checklist-item.met {
          border-color: rgba(52, 211, 153, 0.2);
          background: rgba(52, 211, 153, 0.03);
          color: var(--text-secondary);
        }
      `}</style>

      {/* Header Greeting */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
            FitOS Mission Control
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>
            Today's Briefing · {formatDate(today, 'medium')}
          </h1>
        </div>
        {streaks.dietStreak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', padding: '6px 14px', borderRadius: 20 }}>
            <Flame size={16} color="var(--accent)" fill="var(--accent)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{streaks.dietStreak} Day Streak</span>
          </div>
        )}
      </div>

      {/* Mission Control Three-Column Grid */}
      <div className="mission-control-grid">
        
        {/* ================= COLUMN 1: MISSION METRICS & STATUS ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Piece de Resistance: Mission Progress Card */}
          <div className="card-elevated" style={{ background: 'linear-gradient(135deg, var(--bg-elevated), rgba(163, 230, 53, 0.02))', borderLeft: '4px solid var(--accent)' }}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's Objective</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {missionProgress.metCount}/{missionProgress.totalCount} Met
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 68, height: 68, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                <svg width="68" height="68" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--bg-muted)"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--accent)"
                    strokeDasharray={`${missionProgress.pct}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.6s ease-in-out' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{missionProgress.pct}%</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Mission Progress</h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {missionProgress.remaining.length === 0 ? '🏆 All goals logged! Day completed.' : `${missionProgress.remaining.length} items left to accomplish today`}
                </p>
              </div>
            </div>

            {missionProgress.remaining.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Remaining Targets:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {missionProgress.remaining.map((item, idx) => (
                    <span 
                      key={idx} 
                      className="badge badge-muted" 
                      style={{ fontSize: 11, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => {
                        if (item.name === 'Weight Log') setShowWeightModal(true)
                        if (item.name === 'Recovery Log') setShowRecoveryModal(true)
                        if (['Fish Oil', 'Vitamin D3', 'Magnesium'].includes(item.name)) handleQuickLogSupplement(item.name)
                      }}
                      title={['Weight Log', 'Recovery Log', 'Fish Oil', 'Vitamin D3', 'Magnesium'].includes(item.name) ? 'Click to log instantly' : ''}
                    >
                      {['Weight Log', 'Recovery Log', 'Fish Oil', 'Vitamin D3', 'Magnesium'].includes(item.name) && <span style={{ color: 'var(--accent)' }}>+</span>}
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Today's Checklist */}
          <div className="card-elevated">
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent)" />
              Today's Checklist
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Workout */}
              <div className={`checklist-item ${sessions.some(s => s.date === today) ? 'met' : ''}`}>
                <div className="flex-start" style={{ gap: 8 }}>
                  {sessions.some(s => s.date === today) ? <CheckCircle2 size={14} color="var(--emerald)" /> : <Circle size={14} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 500 }}>Workout Completed</span>
                </div>
                {!sessions.some(s => s.date === today) && (
                  <button 
                    onClick={() => {
                      if (suggestedTemplate) {
                        handleStartWorkout(suggestedTemplate)
                      } else {
                        navigate('/workout')
                      }
                    }} 
                    style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Start
                  </button>
                )}
              </div>

              {/* Weight Log */}
              <div className={`checklist-item ${todayWeight ? 'met' : ''}`}>
                <div className="flex-start" style={{ gap: 8 }}>
                  {todayWeight ? <CheckCircle2 size={14} color="var(--emerald)" /> : <Circle size={14} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 500 }}>Weight Logged</span>
                </div>
                {!todayWeight && (
                  <button onClick={() => setShowWeightModal(true)} style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                    Log
                  </button>
                )}
              </div>

              {/* Recovery Log */}
              <div className={`checklist-item ${todayRecovery ? 'met' : ''}`}>
                <div className="flex-start" style={{ gap: 8 }}>
                  {todayRecovery ? <CheckCircle2 size={14} color="var(--emerald)" /> : <Circle size={14} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 500 }}>Recovery Logged</span>
                </div>
                {!todayRecovery && (
                  <button onClick={() => setShowRecoveryModal(true)} style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                    Log
                  </button>
                )}
              </div>

              {/* Protein Target */}
              <div className={`checklist-item ${todayNutrition.protein >= proteinTarget ? 'met' : ''}`}>
                <div className="flex-start" style={{ gap: 8 }}>
                  {todayNutrition.protein >= proteinTarget ? <CheckCircle2 size={14} color="var(--emerald)" /> : <Circle size={14} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 500 }}>Protein Goal met ({proteinTarget}g)</span>
                </div>
                {todayNutrition.protein < proteinTarget && (
                  <Link to="/food" style={{ fontSize: 10, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                    Log Food
                  </Link>
                )}
              </div>

              {/* Calorie Target */}
              <div className={`checklist-item ${todayNutrition.calories >= calorieTarget ? 'met' : ''}`}>
                <div className="flex-start" style={{ gap: 8 }}>
                  {todayNutrition.calories >= calorieTarget ? <CheckCircle2 size={14} color="var(--emerald)" /> : <Circle size={14} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 500 }}>Calorie Goal met ({calorieTarget} kcal)</span>
                </div>
              </div>

              {/* Steps Target */}
              <div className={`checklist-item ${(todayRecovery?.dailySteps || 0) >= 10000 ? 'met' : ''}`}>
                <div className="flex-start" style={{ gap: 8 }}>
                  {(todayRecovery?.dailySteps || 0) >= 10000 ? <CheckCircle2 size={14} color="var(--emerald)" /> : <Circle size={14} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 500 }}>10,000 Steps</span>
                </div>
              </div>

              {/* Supplements: Fish Oil, Vitamin D3, Magnesium */}
              {[
                { name: 'Fish Oil', met: hasFishOil },
                { name: 'Vitamin D3', met: hasVitaminD },
                { name: 'Magnesium', met: hasMagnesium }
              ].map(supp => (
                <div key={supp.name} className={`checklist-item ${supp.met ? 'met' : ''}`}>
                  <div className="flex-start" style={{ gap: 8 }}>
                    {supp.met ? <CheckCircle2 size={14} color="var(--emerald)" /> : <Circle size={14} color="var(--text-muted)" />}
                    <span style={{ fontWeight: 500 }}>{supp.name}</span>
                  </div>
                  {!supp.met && (
                    <button 
                      onClick={() => handleQuickLogSupplement(supp.name)} 
                      style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Quick Log
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Current Streaks */}
          <div className="card-elevated">
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Current Streaks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🔥 Workout Streak
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {streaks.workoutStreak} {streaks.workoutStreak === 1 ? 'week' : 'weeks'}
                </span>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🥗 Diet Logging Streak</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{streaks.dietStreak} days</span>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🥩 Protein Streak</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{streaks.proteinStreak} days</span>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⚖️ Weight Log Streak</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{streaks.weightStreak} days</span>
              </div>
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🔋 Recovery Log Streak</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{streaks.recoveryStreak} days</span>
              </div>
            </div>
          </div>

        </div>

        {/* ================= COLUMN 2: HERO CARD & TODAY'S ACTIONS ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Hero Card */}
          <div className="card-glass hover-glow" style={{ position: 'relative', overflow: 'hidden', padding: 24, border: '1px solid var(--accent-glow)' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'var(--accent-glow)', filter: 'blur(40px)', borderRadius: '9999px', pointerEvents: 'none' }} />
            
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {timeGreetingText},
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                  {profile?.displayName || 'Abdullah'} 👋
                </h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active Goal</span>
                <span className="badge badge-accent" style={{ marginTop: 4, fontWeight: 700 }}>
                  {activeGoal ? activeGoal.type.replace(/_/g, ' ').toUpperCase() : 'NO GOAL SET'}
                </span>
              </div>
            </div>

            <div className="hero-stats-row" style={{ marginTop: 24, borderTop: '1px solid var(--border-subtle)', paddingTop: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {latestWeight ? `${latestWeight.weightKg} kg` : '—'}
                </div>
                <div style={{ fontSize: 11, color: parseFloat(weightTrend || '0') <= 0 ? 'var(--emerald)' : 'var(--red)', marginTop: 2 }}>
                  {weightChangeLabel} Weekly
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recovery</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: calculatedRecovery.color, marginTop: 4 }}>
                  {calculatedRecovery.score}/100
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  🟢 {calculatedRecovery.statusLabel}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Targets</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {calorieTarget} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>kcal</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginTop: 2 }}>
                  {proteinTarget}g Protein
                </div>
              </div>
            </div>
          </div>

          {/* Today's Workout Split */}
          <div className="card-elevated">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dumbbell size={18} color="var(--purple)" />
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Today's Training Focus</h3>
              </div>
              {activeSession ? (
                <span className="badge badge-emerald">ACTIVE SESSION</span>
              ) : (
                <span className="badge badge-muted">SUGGESTED SPLIT</span>
              )}
            </div>

            {suggestedTemplate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{suggestedTemplate.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {suggestedTemplate.exercises.length} Exercises scheduled
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="btn btn-primary btn-sm" 
                    onClick={() => handleStartWorkout(suggestedTemplate)}
                    style={{ gap: 6 }}
                  >
                    <Play size={10} fill="currentColor" /> {activeSession ? 'Resume Workout' : 'Start Workout'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Overload Program Guide:</div>
                  {suggestedTemplate.exercises.map((te: import('@/types').WorkoutTemplateExercise, idx: number) => {
                    const exName = exercises.find(e => e.id === te.exerciseId)?.name || 'Exercise';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < suggestedTemplate.exercises.length - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: idx < suggestedTemplate.exercises.length - 1 ? 8 : 0, paddingTop: idx > 0 ? 8 : 0 }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exName}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Last: {getLastPerformance(te.exerciseId)}</div>
                        </div>
                        <div style={{ textTransform: 'none', textAlign: 'right', fontSize: 11, fontWeight: 500, color: 'var(--accent)' }}>
                          {getOverloadTarget(te.exerciseId)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-state-icon"><Dumbbell size={24} /></div>
                <div className="empty-state-title">No templates configured</div>
                <div className="empty-state-desc">Create templates in the Workout page to receive training overload guides here.</div>
                <Link to="/workout" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Go to Workouts</Link>
              </div>
            )}
          </div>

          {/* Saved Meals Quick Access */}
          <div className="card-elevated">
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Utensils size={16} color="var(--amber)" />
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Saved Meals Quick Log</h3>
              </div>
              <Link to="/food" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>All templates →</Link>
            </div>

            {frequentSavedMeals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {frequentSavedMeals.map((meal) => (
                  <div key={meal.id} className="flex-between" style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{meal.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {meal.totalCalories} kcal · {meal.totalProtein}g Protein · {meal.category}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleOneTapQuickLog(meal)}
                      title="1-Tap Instant Log to Today"
                      style={{ padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(234,179,8,0.1)', color: 'rgb(202,138,4)', border: '1px solid rgba(234,179,8,0.2)' }}
                    >
                      <Zap size={10} fill="currentColor" /> Log
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ border: '1px dashed var(--border-default)', padding: 16, borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No saved meals. Save a template on the Food page to enable 1-tap logging.
              </div>
            )}
          </div>

        </div>

        {/* ================= COLUMN 3: TRACKING & INTELLIGENCE ================= */}
        <div className="mission-control-col-3" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Today's Progress Tracker */}
          <div className="card-elevated">
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Today's Targets Progress
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Calories progress bar */}
              <div>
                <div className="flex-between" style={{ fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Calories</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{todayNutrition.calories} / {calorieTarget} kcal ({caloriePct}%)</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${caloriePct}%`, background: 'var(--macro-calories)', borderRadius: 9999 }} />
                </div>
              </div>

              {/* Protein progress bar */}
              <div>
                <div className="flex-between" style={{ fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Protein</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Math.round(todayNutrition.protein)} / {proteinTarget}g ({proteinPct}%)</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${proteinPct}%`, background: 'var(--macro-protein)', borderRadius: 9999 }} />
                </div>
              </div>

              {/* Steps progress bar */}
              {(() => {
                const steps = todayRecovery?.dailySteps || 0;
                const stepsPct = Math.min(100, Math.round((steps / 10000) * 100));
                return (
                  <div>
                    <div className="flex-between" style={{ fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Daily Steps</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{steps.toLocaleString()} / 10,000 ({stepsPct}%)</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${stepsPct}%`, background: 'var(--accent)', borderRadius: 9999 }} />
                    </div>
                  </div>
                );
              })()}

              {/* Sleep progress bar */}
              {(() => {
                const sleep = todayRecovery?.sleepHours || 0;
                const sleepPct = Math.min(100, Math.round((sleep / 7.5) * 100));
                return (
                  <div>
                    <div className="flex-between" style={{ fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Sleep duration</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{sleep}h / 7.5h ({sleepPct}%)</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${sleepPct}%`, background: 'var(--blue)', borderRadius: 9999 }} />
                    </div>
                  </div>
                );
              })()}

              {/* Water logging tracker widget */}
              <div>
                <div className="flex-between" style={{ fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Water Intake</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{waterCups} / 8 cups ({Math.min(100, Math.round((waterCups / 8) * 100))}%)</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-base)', borderRadius: 8, padding: '4px 10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Droplets 
                        key={i} 
                        size={14} 
                        color={i < waterCups ? 'var(--blue)' : 'var(--text-muted)'} 
                        fill={i < waterCups ? 'var(--blue)' : 'none'} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleAdjustWater(i < waterCups ? -1 : 1)}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      type="button" 
                      onClick={() => handleAdjustWater(-1)} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 4px', fontSize: 13, fontWeight: 'bold' }}
                    >
                      -
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleAdjustWater(1)} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 4px', fontSize: 13, fontWeight: 'bold' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Recovery Breakdown Card */}
          <div className="card-elevated">
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Heart size={15} color={calculatedRecovery.color} />
              Recovery Breakdown
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              {calculatedRecovery.explanation}
            </p>
            {todayRecovery ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-base)', padding: 10, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div className="flex-between" style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sleep Quantity:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{todayRecovery.sleepHours ?? '—'} hours</span>
                </div>
                <div className="flex-between" style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Step Activity:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{todayRecovery.dailySteps?.toLocaleString() ?? '—'} steps</span>
                </div>
                <div className="flex-between" style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Energy Level:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{todayRecovery.energy ?? '—'} / 5</span>
                </div>
                <div className="flex-between" style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Muscle Soreness:</span>
                  <span style={{ fontWeight: 600, color: 'var(--red)' }}>{todayRecovery.muscleSoreness ?? '—'} / 5</span>
                </div>
                <div className="flex-between" style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mood Status:</span>
                  <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{todayRecovery.mood ?? '—'} / 5</span>
                </div>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowRecoveryModal(true)} style={{ width: '100%' }}>
                Log Today's Wellness
              </button>
            )}
          </div>

          {/* Today's Nutrition Intelligence */}
          <div className="card-elevated" style={{ borderLeft: '4px solid var(--amber)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={15} color="var(--amber)" />
              Nutrition Intelligence
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Protein quality DIAAS */}
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Protein Quality (DIAAS)</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: dailyReport.avgDiaas ? 'var(--emerald)' : 'var(--text-muted)' }}>
                  {dailyReport.avgDiaas ? `${Math.round(dailyReport.avgDiaas * 100)}% (${dailyReport.proteinQualityGrade})` : '—'}
                </span>
              </div>

              {/* Fiber Progress */}
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Fiber Tracker</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: dailyReport.fiber >= 30 ? 'var(--emerald)' : 'var(--text-primary)' }}>
                  {dailyReport.fiber}g / 30g
                </span>
              </div>

              {/* Fruit & Veg Servings */}
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Fruits & Vegetables</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: dailyReport.fruitVegServings >= 5 ? 'var(--emerald)' : 'var(--text-primary)' }}>
                  {dailyReport.fruitVegServings} / 5.0 servings
                </span>
              </div>

              {/* Omega-3 status */}
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Omega-3 Status</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: hasFishOil ? 'var(--emerald)' : 'var(--text-muted)' }}>
                  {hasFishOil ? 'Optimal (Logged)' : 'Pending (Log Fish Oil)'}
                </span>
              </div>

              {/* Supplement compliance */}
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supplement Status</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {((hasFishOil ? 1 : 0) + (hasVitaminD ? 1 : 0) + (hasMagnesium ? 1 : 0))} / 3 taken
                </span>
              </div>

              {/* Future-Ready Micronutrients */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Micro Nutrient Matrix (Future-Ready)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
                  <div style={{ background: 'var(--bg-base)', padding: '4px 2px', borderRadius: 4 }}>Iron</div>
                  <div style={{ background: 'var(--bg-base)', padding: '4px 2px', borderRadius: 4 }}>Ca</div>
                  <div style={{ background: 'var(--bg-base)', padding: '4px 2px', borderRadius: 4 }}>Zinc</div>
                  <div style={{ background: 'var(--bg-base)', padding: '4px 2px', borderRadius: 4 }}>B12</div>
                  <div style={{ background: 'var(--bg-base)', padding: '4px 2px', borderRadius: 4 }}>Vit C</div>
                </div>
              </div>

            </div>
          </div>

          {/* AI Coach Card */}
          <div className="card-elevated" style={{ borderColor: 'var(--accent-glow)', background: 'linear-gradient(135deg, var(--bg-elevated), rgba(163,230,53,0.02))' }}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={16} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>AI Coach Advisor</span>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: 9, animation: 'pulse 2s infinite' }}>ONLINE</span>
            </div>
            
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {todayRecovery ? `Your recovery score is ${calculatedRecovery.score}% (${calculatedRecovery.statusLabel}).` : 'Recovery log is pending.'}{' '}
              {suggestedTemplate ? `Your training program highlights progression on ${suggestedTemplate.name}.` : 'Set up a template to guide your progressions.'}{' '}
              Log at least {proteinTarget}g protein to secure recomposition rates.
            </p>

            <Link to="/coach" className="btn btn-ghost btn-sm" style={{ marginTop: 12, paddingLeft: 0, textDecoration: 'none', color: 'var(--accent)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Open Coach <ChevronRight size={14} />
            </Link>
          </div>

          {/* Weekly Consistency Score */}
          <div className="card-elevated">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Weekly Consistency
              </h3>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{weeklyConsistency.overallScore}%</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Diet consistency */}
              <div>
                <div className="flex-between" style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Diet Compliance</span>
                  <span>{weeklyConsistency.dietPct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${weeklyConsistency.dietPct}%`, background: 'var(--amber)', borderRadius: 2 }} />
                </div>
              </div>

              {/* Workout consistency */}
              <div>
                <div className="flex-between" style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Training Compliance</span>
                  <span>{weeklyConsistency.workoutPct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${weeklyConsistency.workoutPct}%`, background: 'var(--purple)', borderRadius: 2 }} />
                </div>
              </div>

              {/* Sleep consistency */}
              <div>
                <div className="flex-between" style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sleep (7h+) Adherence</span>
                  <span>{weeklyConsistency.sleepPct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${weeklyConsistency.sleepPct}%`, background: 'var(--blue)', borderRadius: 2 }} />
                </div>
              </div>

              {/* Step consistency */}
              <div>
                <div className="flex-between" style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Step Goal (8k+) Consistency</span>
                  <span>{weeklyConsistency.stepPct}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-base)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${weeklyConsistency.stepPct}%`, background: 'var(--accent)', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Floating Quick Actions FAB */}
      <div className="fab-container">
        {fabOpen && (
          <>
            {/* Backdrop cover overlay to click and close */}
            <div 
              onClick={() => setFabOpen(false)} 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998, backdropFilter: 'blur(4px)' }} 
            />
            <div className="quick-actions-menu" style={{ zIndex: 999 }}>
              <button className="quick-action-item" onClick={() => { setFabOpen(false); navigate('/food'); }}>
                <Utensils size={14} color="var(--amber)" /> Log Food
              </button>
              <button className="quick-action-item" onClick={() => { setFabOpen(false); navigate('/workout'); }}>
                <Dumbbell size={14} color="var(--purple)" /> Log Workout
              </button>
              <button className="quick-action-item" onClick={() => { setFabOpen(false); setShowWeightModal(true); }}>
                <Scale size={14} color="var(--accent)" /> Log Weight
              </button>
              <button className="quick-action-item" onClick={() => { setFabOpen(false); setShowRecoveryModal(true); }}>
                <Heart size={14} color="var(--red)" /> Recovery Log
              </button>
              <button className="quick-action-item" onClick={() => { setFabOpen(false); navigate('/measurements'); }}>
                <Ruler size={14} color="var(--blue)" /> Measurements
              </button>
              <button className="quick-action-item" onClick={() => { setFabOpen(false); navigate('/progress'); }}>
                <Activity size={14} color="var(--emerald)" /> Progress Photo
              </button>
            </div>
          </>
        )}
        <button 
          className="quick-actions-fab-btn" 
          onClick={() => setFabOpen(prev => !prev)}
          style={{ transform: fabOpen ? 'rotate(135deg)' : 'none', zIndex: 999 }}
        >
          {fabOpen ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>

      {/* Modals */}
      {showWeightModal && <WeightLogModal onClose={() => setShowWeightModal(false)} />}
      {showGoalModal && <GoalSetupModal onClose={() => setShowGoalModal(false)} />}
      {showRecoveryModal && <RecoveryLogModal onClose={() => setShowRecoveryModal(false)} />}
    </div>
  )
}
