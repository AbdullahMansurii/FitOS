import type { Goal, WeightLog, FoodLog, WorkoutSession, Profile, Measurement } from '@/types'
import { getExerciseIntelligence } from './exerciseIntelligence'

export interface NutritionRecommendation {
  status:
    | 'increase_calories'
    | 'decrease_calories'
    | 'maintain_calories'
    | 'increase_protein'
    | 'reduce_rate_of_gain'
    | 'increase_rate_of_gain'
    | 'reduce_rate_of_loss'
    | 'increase_rate_of_loss'

  confidence: number // 0 to 100

  currentCalories: number
  recommendedCalories: number

  currentProtein: number
  recommendedProtein: number

  reason: string
  weeklyRateOfWeightChange: number | null
}

export interface NutritionAnalytics {
  avgCalories7d: number
  avgProtein7d: number
  avgCalories30d: number
  avgProtein30d: number
  calorieAdherence7d: number // 0 to 100
  proteinAdherence7d: number // 0 to 100
  calorieAdherence30d: number // 0 to 100
  proteinAdherence30d: number // 0 to 100
  dailyHistory: { date: string; calories: number; protein: number; carbs: number; fat: number }[]
}

function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
}

function getPastNDays(n: number, anchorDate: string): string[] {
  const dates: string[] = []
  const end = new Date(anchorDate)
  for (let i = 0; i < n; i++) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    dates.push(d.toISOString().substring(0, 10))
  }
  return dates.reverse()
}

function getGoalCategory(activeGoal: Goal | null): 'cut' | 'bulk' | 'recomp' | 'maintain' {
  if (!activeGoal) return 'maintain'
  if (activeGoal.type === 'cut') return 'cut'
  if (activeGoal.type === 'bulk') return 'bulk'
  if (activeGoal.name.toLowerCase().includes('recomp')) return 'recomp'
  return 'maintain'
}

function calculateRecommendedProtein(weightKg: number, goalCategory: 'cut' | 'bulk' | 'recomp' | 'maintain'): number {
  const factor = goalCategory === 'cut' ? 2.2 : goalCategory === 'recomp' ? 2.0 : 1.8
  return Math.round(weightKg * factor)
}

function calculateMinProtein(weightKg: number, goalCategory: 'cut' | 'bulk' | 'recomp' | 'maintain'): number {
  const factor = goalCategory === 'cut' ? 2.0 : goalCategory === 'recomp' ? 1.8 : 1.6
  return Math.round(weightKg * factor)
}

function calculateMaxProtein(weightKg: number, goalCategory: 'cut' | 'bulk' | 'recomp' | 'maintain'): number {
  const factor = goalCategory === 'cut' ? 2.4 : goalCategory === 'recomp' ? 2.2 : 2.0
  return Math.round(weightKg * factor)
}

function getTrend(history: { date: string; value: number }[]): { baseline: number; latest: number; change: number; days: number; weeklyRate: number } | null {
  if (history.length < 2) return null
  const latest = history[history.length - 1]
  
  // Find candidates that are at least 14 days before latest, up to 45 days
  const candidates = history.filter(h => {
    const days = getDaysBetween(h.date, latest.date)
    return days >= 14 && days <= 45
  })
  
  let best: { date: string; value: number }
  if (candidates.length > 0) {
    best = candidates[0]
    let bestDiff = Math.abs(getDaysBetween(best.date, latest.date) - 30)
    for (const c of candidates) {
      const diff = Math.abs(getDaysBetween(c.date, latest.date) - 30)
      if (diff < bestDiff) {
        best = c
        bestDiff = diff
      }
    }
  } else {
    // Fallback: any candidate at least 7 days before
    const fallbackCandidates = history.filter(h => {
      const days = getDaysBetween(h.date, latest.date)
      return days >= 7
    })
    if (fallbackCandidates.length === 0) return null
    best = fallbackCandidates[0]
    let bestDiff = Math.abs(getDaysBetween(best.date, latest.date) - 30)
    for (const c of fallbackCandidates) {
      const diff = Math.abs(getDaysBetween(c.date, latest.date) - 30)
      if (diff < bestDiff) {
        best = c
        bestDiff = diff
      }
    }
  }
  
  const change = latest.value - best.value
  const days = getDaysBetween(best.date, latest.date)
  const weeklyRate = days > 0 ? (change / (days / 7)) : 0
  
  return {
    baseline: best.value,
    latest: latest.value,
    change,
    days,
    weeklyRate
  }
}

export function getNutritionRecommendation(
  weightLogs: WeightLog[],
  measurements: Measurement[],
  foodLogs: FoodLog[],
  sessions: WorkoutSession[],
  activeGoal: Goal | null,
  profile: Profile | null
): NutritionRecommendation {
  const currentCalories = activeGoal ? activeGoal.calorieTarget : 2000
  const currentProtein = activeGoal ? activeGoal.proteinTarget : 150

  // 1. Build unified weight history
  const weightMap = new Map<string, number>()
  weightLogs.forEach(l => weightMap.set(l.date, l.weightKg))
  measurements.forEach(m => {
    if (m.weightKg !== undefined && m.weightKg > 0) {
      weightMap.set(m.date, m.weightKg)
    }
  })
  const weightHistory = Array.from(weightMap.entries())
    .map(([date, weightKg]) => ({ date, value: weightKg }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 2. Build waist history
  const waistHistory = measurements
    .filter(m => m.waistCm !== undefined && m.waistCm > 0)
    .map(m => ({ date: m.date, value: m.waistCm! }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Get trends
  const weightTrend = getTrend(weightHistory)
  const waistTrend = getTrend(waistHistory)

  // Get strength trend (reusing same logic)
  const completedSessions = sessions
    .filter(s => s.completedAt)
    .sort((a, b) => a.date.localeCompare(b.date))

  const exerciseCounts: Record<string, number> = {}
  completedSessions.forEach(s => {
    s.exercises.forEach(se => {
      exerciseCounts[se.exerciseId] = (exerciseCounts[se.exerciseId] || 0) + 1
    })
  })

  const topExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  let strengthSum = 0
  let strengthCount = 0
  topExercises.forEach(([id]) => {
    const intel = getExerciseIntelligence(id, sessions)
    const change = intel.trends30d.e1rmPctChange
    if (change !== null) {
      strengthSum += change
      strengthCount++
    }
  })
  const strengthChange = strengthCount > 0 ? strengthSum / strengthCount : null

  const goalCategory = getGoalCategory(activeGoal)
  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].value : (activeGoal ? activeGoal.startWeight : (profile?.heightCm ? profile.heightCm - 100 : 80))
  const recommendedProtein = calculateRecommendedProtein(latestWeight, goalCategory)
  const minProteinTarget = calculateMinProtein(latestWeight, goalCategory)
  const maxProteinTarget = calculateMaxProtein(latestWeight, goalCategory)

  // 3. Handle Insufficient Data
  if (!weightTrend || !waistTrend || weightHistory.length < 2 || waistHistory.length < 2) {
    return {
      status: 'maintain_calories',
      confidence: 0,
      currentCalories,
      recommendedCalories: currentCalories,
      currentProtein,
      recommendedProtein,
      reason: 'Insufficient weight or waist data to formulate a recommendation. Log weight and waist measurements consistently for at least 14 days (minimum 2 entries separated by 7+ days).',
      weeklyRateOfWeightChange: null
    }
  }

  const weeklyRate = weightTrend.weeklyRate // kg/week
  const waistChange = waistTrend.change // cm
  const hasStrengthIncrease = strengthChange !== null && strengthChange > 0
  const hasStrengthDecrease = strengthChange !== null && strengthChange < 0
  const isStrengthStagnant = strengthChange === null || strengthChange <= 0

  let status: NutritionRecommendation['status']
  let recommendedCalories = currentCalories
  let reason: string
  let confidence = 70 // Base confidence for sufficient data

  // Adjust confidence based on log frequency
  const recentLogsCount = weightHistory.filter(h => getDaysBetween(h.date, weightHistory[weightHistory.length - 1].date) <= 30).length
  if (recentLogsCount >= 8) confidence += 15
  else if (recentLogsCount >= 4) confidence += 5

  if (strengthChange !== null) confidence += 10
  confidence = Math.min(100, Math.max(10, confidence))

  const weightChangeText = `${weeklyRate > 0 ? '+' : ''}${weeklyRate.toFixed(2)} kg/week`
  const waistChangeText = `${waistChange > 0 ? '+' : ''}${waistChange.toFixed(1)} cm`
  const strengthChangeText = strengthChange !== null ? `${strengthChange > 0 ? '+' : ''}${strengthChange.toFixed(1)}%` : 'N/A'

  // Apply deterministic Adaptive Nutrition rulesets
  if (goalCategory === 'cut') {
    const weightLossPctOfBodyweight = latestWeight > 0 ? (-weeklyRate / latestWeight) * 100 : 0
    if (weeklyRate < 0 && weightLossPctOfBodyweight > 1.0 && hasStrengthDecrease) {
      // Cut Too Fast
      status = 'reduce_rate_of_loss'
      recommendedCalories = currentCalories + 150
      reason = `Weight loss is too aggressive at ${weightLossPctOfBodyweight.toFixed(2)}%/week (${weightChangeText}) with declining strength (${strengthChangeText}). Calories increased by 150 kcal to preserve lean muscle.`
    } else if (weeklyRate >= -0.05 || (weightLossPctOfBodyweight < 0.25 && waistChange >= 0)) {
      // Cut Too Slow
      status = 'increase_rate_of_loss'
      recommendedCalories = currentCalories - 150
      reason = `Weight loss is stalling at ${weightLossPctOfBodyweight.toFixed(2)}%/week (${weightChangeText}) and waist is not decreasing (${waistChangeText}). Calories decreased by 150 kcal to restore deficit.`
    } else {
      // Cut On Track
      status = 'maintain_calories'
      reason = `Fat loss is on track at ${weightLossPctOfBodyweight.toFixed(2)}%/week (${weightChangeText}) and waist is decreasing (${waistChangeText}). Calories maintained.`
    }
  } else if (goalCategory === 'bulk') {
    if (weeklyRate > 0.75 && waistChange >= 0.5) {
      // Bulk Too Fast
      status = 'reduce_rate_of_gain'
      recommendedCalories = currentCalories - 150
      reason = `Weight is gaining too fast at ${weightChangeText} accompanied by rapid waist gain (${waistChangeText}). Calories decreased by 150 kcal to limit fat gain.`
    } else if (weeklyRate < 0.15 && isStrengthStagnant) {
      // Bulk Too Slow
      status = 'increase_rate_of_gain'
      recommendedCalories = currentCalories + 150
      reason = `Weight gain is too slow at ${weightChangeText} with stagnant strength (${strengthChangeText}). Calories increased by 150 kcal to support muscle growth.`
    } else if (weeklyRate >= 0.25 && weeklyRate <= 0.5 && Math.abs(waistChange) <= 0.2 && hasStrengthIncrease) {
      // Lean Bulk
      status = 'maintain_calories'
      reason = `Lean bulk is highly successful. Weight gain is optimal at ${weightChangeText}, waist is stable (${waistChangeText}), and strength is increasing (${strengthChangeText}). Calories maintained.`
    } else {
      status = 'maintain_calories'
      reason = `Weight gain is within targets at ${weightChangeText} and waist change is acceptable (${waistChangeText}). Calories maintained.`
    }
  } else if (goalCategory === 'recomp') {
    if (waistChange < 0 && hasStrengthIncrease && Math.abs(weeklyRate) <= 0.25) {
      status = 'maintain_calories'
      reason = `Successful body recomposition. Waist is decreasing (${waistChangeText}), strength is increasing (${strengthChangeText}), and weight is stable (${weightChangeText}). Calories maintained.`
    } else {
      status = 'maintain_calories'
      reason = `Recomposition is progressing neutrally. Weight is stable (${weightChangeText}) and waist is stable (${waistChangeText}). Calories maintained.`
    }
  } else {
    // Maintenance
    status = 'maintain_calories'
    reason = `Weight is stable at ${weightChangeText} and waist change is neutral (${waistChangeText}). Calories maintained.`
  }

  // Evaluate Protein intake targets
  if (currentProtein < minProteinTarget) {
    if (status === 'maintain_calories') {
      status = 'increase_protein'
    }
    reason += ` Protein target of ${currentProtein}g is below the recommended target range (${minProteinTarget}g - ${maxProteinTarget}g) for your ${latestWeight}kg bodyweight on a ${goalCategory} phase. Recommended: ${recommendedProtein}g.`
  }

  return {
    status,
    confidence,
    currentCalories,
    recommendedCalories,
    currentProtein,
    recommendedProtein,
    reason,
    weeklyRateOfWeightChange: weightTrend ? weightTrend.weeklyRate : null
  }
}

export function getNutritionAnalytics(
  foodLogs: FoodLog[],
  calorieTarget: number,
  proteinTarget: number
): NutritionAnalytics {
  if (foodLogs.length === 0) {
    return {
      avgCalories7d: 0,
      avgProtein7d: 0,
      avgCalories30d: 0,
      avgProtein30d: 0,
      calorieAdherence7d: 0,
      proteinAdherence7d: 0,
      calorieAdherence30d: 0,
      proteinAdherence30d: 0,
      dailyHistory: []
    }
  }

  // Group food logs by date
  const dailyIntakes = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>()
  foodLogs.forEach(log => {
    const dateStr = log.date.substring(0, 10)
    const existing = dailyIntakes.get(dateStr) || { calories: 0, protein: 0, carbs: 0, fat: 0 }
    existing.calories += log.calories
    existing.protein += log.protein
    existing.carbs += log.carbs
    existing.fat += log.fat
    dailyIntakes.set(dateStr, existing)
  })

  // Daily history list sorted chronologically
  const dailyHistory = Array.from(dailyIntakes.entries())
    .map(([date, values]) => ({
      date,
      calories: Math.round(values.calories),
      protein: Math.round(values.protein),
      carbs: Math.round(values.carbs),
      fat: Math.round(values.fat)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Find the anchor date (latest log date)
  const anchorDate = dailyHistory[dailyHistory.length - 1].date

  // Generate 7-day and 30-day date ranges
  const dates7d = getPastNDays(7, anchorDate)
  const dates30d = getPastNDays(30, anchorDate)

  // Adherence and averages calculations helper
  const computeAdherenceAndAvg = (dates: string[]) => {
    let loggedDaysCount = 0
    let totalCalories = 0
    let totalProtein = 0
    let calorieAdherentDays = 0
    let proteinAdherentDays = 0

    dates.forEach(date => {
      const intake = dailyIntakes.get(date)
      if (intake) {
        loggedDaysCount++
        totalCalories += intake.calories
        totalProtein += intake.protein

        // Calorie Adherence: within +/- 10% of target
        const calorieMin = calorieTarget * 0.9
        const calorieMax = calorieTarget * 1.1
        if (intake.calories >= calorieMin && intake.calories <= calorieMax) {
          calorieAdherentDays++
        }

        // Protein Adherence: >= 90% of target
        const proteinMin = proteinTarget * 0.9
        if (intake.protein >= proteinMin) {
          proteinAdherentDays++
        }
      }
    })

    const avgCalories = loggedDaysCount > 0 ? Math.round(totalCalories / loggedDaysCount) : 0
    const avgProtein = loggedDaysCount > 0 ? Math.round(totalProtein / loggedDaysCount) : 0
    const calorieAdherence = loggedDaysCount > 0 ? Math.round((calorieAdherentDays / loggedDaysCount) * 100) : 0
    const proteinAdherence = loggedDaysCount > 0 ? Math.round((proteinAdherentDays / loggedDaysCount) * 100) : 0

    return { avgCalories, avgProtein, calorieAdherence, proteinAdherence }
  }

  const stats7d = computeAdherenceAndAvg(dates7d)
  const stats30d = computeAdherenceAndAvg(dates30d)

  return {
    avgCalories7d: stats7d.avgCalories,
    avgProtein7d: stats7d.avgProtein,
    avgCalories30d: stats30d.avgCalories,
    avgProtein30d: stats30d.avgProtein,
    calorieAdherence7d: stats7d.calorieAdherence,
    proteinAdherence7d: stats7d.proteinAdherence,
    calorieAdherence30d: stats30d.calorieAdherence,
    proteinAdherence30d: stats30d.proteinAdherence,
    dailyHistory
  }
}

export function generateNutritionCoachContext(
  recommendation: NutritionRecommendation,
  analytics: NutritionAnalytics,
  activeGoal: Goal | null
): string {
  const goalCategory = getGoalCategory(activeGoal)
  const activeGoalName = activeGoal ? activeGoal.name : 'None'

  return `### NUTRITION INTELLIGENCE & ADAPTATION ###
Active Goal: ${activeGoalName} (${goalCategory})
Current Target Calories: ${recommendation.currentCalories} kcal/day
Recommended Calories: ${recommendation.recommendedCalories} kcal/day
Current Target Protein: ${recommendation.currentProtein}g/day
Recommended Protein: ${recommendation.recommendedProtein}g/day
Recommendation: ${recommendation.status.replace(/_/g, ' ').toUpperCase()}
Confidence Score: ${recommendation.confidence}/100
Adaptation Reason: ${recommendation.reason}

Nutrition Adherence & Averages (from logged days only):
- 7d Average Intake: ${analytics.avgCalories7d} kcal, ${analytics.avgProtein7d}g protein
- 30d Average Intake: ${analytics.avgCalories30d} kcal, ${analytics.avgProtein30d}g protein
- 7d Adherence: Calories ${analytics.calorieAdherence7d}%, Protein ${analytics.proteinAdherence7d}%
- 30d Adherence: Calories ${analytics.calorieAdherence30d}%, Protein ${analytics.proteinAdherence30d}%
`.trim()
}
