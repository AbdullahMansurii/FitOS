import type { Measurement, WeightLog, WorkoutSession } from '@/types'
import { getExerciseIntelligence } from './exerciseIntelligence'
import { getProgressionRecommendation } from './progressiveOverload'
import { SEEDED_EXERCISES } from '@/constants/seeds'

export type RecompositionStatus =
  | 'successful_recomp'
  | 'gaining_muscle'
  | 'losing_fat'
  | 'lean_bulk'
  | 'aggressive_bulk'
  | 'cutting'
  | 'aggressive_cut'
  | 'stalled'
  | 'insufficient_data'

export interface RecompositionReport {
  status: RecompositionStatus
  confidence: number // 0 to 100
  explanation: string
  bodyFatTrend: 'decreasing' | 'stable' | 'increasing'
  weightTrend: {
    baseline: number | null
    latest: number | null
    change: number | null
    percentChange: number | null
  }
  waistTrend: {
    baseline: number | null
    latest: number | null
    change: number | null
    percentChange: number | null
  }
  strengthTrend: {
    avgStrengthChange: number | null
    topExercises: { name: string; change: number | null; count: number }[]
  }
}

function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
}

function get30DayTrend(history: { date: string; value: number }[]): { baseline: number; latest: number; change: number; percentChange: number } | null {
  if (history.length < 2) return null
  const latest = history[history.length - 1]
  
  // Find candidates that are at least 14 days before latest, up to 45 days
  const candidates = history.filter(h => {
    const days = getDaysBetween(h.date, latest.date)
    return days >= 14 && days <= 45
  })
  
  let best: { date: string; value: number }
  if (candidates.length > 0) {
    // Find the one closest to 30 days
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
  const percentChange = best.value !== 0 ? (change / best.value) * 100 : 0
  
  return {
    baseline: Math.round(best.value * 100) / 100,
    latest: Math.round(latest.value * 100) / 100,
    change: Math.round(change * 100) / 100,
    percentChange: Math.round(percentChange * 10) / 10
  }
}

export function getRecompositionReport(
  measurements: Measurement[],
  weightLogs: WeightLog[],
  sessions: WorkoutSession[]
): RecompositionReport {
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

  // 3. Compute trends
  const weightTrend = get30DayTrend(weightHistory)
  const waistTrend = get30DayTrend(waistHistory)

  // 4. Compute Strength Trend (Top 3 most-trained exercises)
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

  const strengthDetails: { name: string; change: number | null; count: number }[] = []
  let strengthSum = 0
  let strengthCount = 0

  topExercises.forEach(([id, count]) => {
    const ex = SEEDED_EXERCISES.find(e => e.id === id)
    const name = ex ? ex.name : 'Custom Exercise'
    const intel = getExerciseIntelligence(id, sessions)
    const change = intel.trends30d.e1rmPctChange
    
    strengthDetails.push({ name, change, count })
    if (change !== null) {
      strengthSum += change
      strengthCount++
    }
  })

  const avgStrengthChange = strengthCount > 0 ? Math.round((strengthSum / strengthCount) * 10) / 10 : null

  // Helper formatting trends
  const weightTrendReport = {
    baseline: weightTrend ? weightTrend.baseline : null,
    latest: weightTrend ? weightTrend.latest : null,
    change: weightTrend ? weightTrend.change : null,
    percentChange: weightTrend ? weightTrend.percentChange : null,
  }

  const waistTrendReport = {
    baseline: waistTrend ? waistTrend.baseline : null,
    latest: waistTrend ? waistTrend.latest : null,
    change: waistTrend ? waistTrend.change : null,
    percentChange: waistTrend ? waistTrend.percentChange : null,
  }

  const strengthTrendReport = {
    avgStrengthChange,
    topExercises: strengthDetails,
  }

  // 5. Handle Insufficient Data
  if (!weightTrend || !waistTrend) {
    return {
      status: 'insufficient_data',
      confidence: 0,
      explanation: 'Insufficient measurement data. Please log body weight and waist measurements consistently for at least 14 days (minimum 2 entries separated by at least 7 days).',
      bodyFatTrend: 'stable',
      weightTrend: weightTrendReport,
      waistTrend: waistTrendReport,
      strengthTrend: strengthTrendReport,
    }
  }

  const wChange = weightTrend.change
  const waistChange = waistTrend.change
  const sChange = avgStrengthChange

  // Check fatigue warnings in top exercises
  let topExerciseHasFatigue = false
  topExercises.forEach(([id]) => {
    const rec = getProgressionRecommendation(id, sessions, 'hypertrophy')
    if (rec.fatigueWarning) {
      topExerciseHasFatigue = true
    }
  })

  // 6. Deterministic body fat trend calculation
  let bodyFatTrend: 'decreasing' | 'stable' | 'increasing'
  if (waistChange <= -0.5) {
    bodyFatTrend = 'decreasing'
  } else if (waistChange >= 0.5) {
    bodyFatTrend = 'increasing'
  } else {
    // Waist is stable, look at weight trend
    if (wChange <= -1.5) {
      bodyFatTrend = 'decreasing'
    } else if (wChange >= 1.5) {
      bodyFatTrend = 'increasing'
    } else {
      bodyFatTrend = 'stable'
    }
  }

  // 7. Status Classification & Explanations
  let status: RecompositionStatus
  let explanation: string
  let baseConfidence = 60

  // Log counts in 30 days
  const recentLogsCount = weightHistory.filter(h => getDaysBetween(h.date, weightHistory[weightHistory.length - 1].date) <= 30).length
  if (recentLogsCount >= 5) baseConfidence += 20
  else if (recentLogsCount >= 3) baseConfidence += 10

  if (sChange !== null) {
    baseConfidence += 10
  }

  // Define status classifications
  if (wChange <= -3.0 && (sChange !== null && sChange < -1.0)) {
    // Aggressive Cut: weight dropping fast (>3kg) and strength declining
    status = 'aggressive_cut'
    explanation = `Your body weight has dropped rapidly by ${Math.abs(wChange)} kg in the last month, but your average strength decreased by ${Math.abs(sChange)}%. This indicates you are cutting calories too aggressively, causing muscle loss.`
    baseConfidence += 10
  } else if (wChange <= -1.5 && topExerciseHasFatigue && (sChange !== null && sChange < 0)) {
    // Aggressive Cut with Fatigue Warning
    status = 'aggressive_cut'
    explanation = `Weight dropped by ${Math.abs(wChange)} kg alongside active workout fatigue warnings and a ${Math.abs(sChange)}% strength drop. This suggests recovery is compromised due to an excessive calorie deficit.`
    baseConfidence += 10
  } else if (wChange >= 1.5 && waistChange >= 0.8 && (sChange === null || sChange < 1.0)) {
    // Aggressive Bulk: rapid weight gain (>1.5kg), rapid waist increase (>0.8cm), lagging strength
    status = 'aggressive_bulk'
    explanation = `Your weight increased rapidly by ${wChange} kg and waist grew by ${waistChange} cm, while your average strength improved by only ${sChange ?? 0}%. Your calorie surplus is too high, leading to disproportionate fat gain.`
    baseConfidence += 10
  } else if (waistChange <= -0.5 && (sChange !== null && sChange >= 1.0) && Math.abs(wChange) <= 1.0) {
    // Successful Recomp: waist dropping, strength up, weight stable (+/- 1kg)
    status = 'successful_recomp'
    explanation = `Successful body recomposition! Your waist decreased by ${Math.abs(waistChange)} cm while your average strength improved by ${sChange}%, all while body weight remained stable (${wChange > 0 ? '+' : ''}${wChange} kg). This indicates you are simultaneously losing fat and gaining muscle.`
    baseConfidence += 20
  } else if (wChange >= 0.2 && wChange <= 1.5 && waistChange >= -0.5 && waistChange <= 0.5 && (sChange !== null && sChange >= 0.5)) {
    // Lean Bulk: weight increasing slowly, waist stable, strength increasing
    status = 'lean_bulk'
    explanation = `Your weight is increasing slowly by ${wChange} kg and waist remains stable (${waistChange > 0 ? '+' : ''}${waistChange} cm) while average strength improved by ${sChange}%. This indicates a highly successful lean bulk with minimal fat gain.`
    baseConfidence += 15
  } else if (wChange >= 0.2 && wChange <= 2.0 && waistChange > 0.2 && waistChange <= 0.8 && (sChange !== null && sChange >= 1.5)) {
    // Gaining Muscle: weight and waist up slightly, but strength up significantly
    status = 'gaining_muscle'
    explanation = `You are successfully gaining muscle. Weight is up by ${wChange} kg and strength increased by ${sChange}%, with a small, expected increase in waist size (+${waistChange} cm).`
    baseConfidence += 10
  } else if (waistChange <= -0.5 && wChange <= -0.5 && (sChange === null || sChange >= -0.5)) {
    // Losing Fat: waist decreasing, weight decreasing, strength maintained
    status = 'losing_fat'
    explanation = `You are successfully losing fat. Your waist decreased by ${Math.abs(waistChange)} cm and weight dropped by ${Math.abs(wChange)} kg, while strength remained stable (${sChange ?? 0}% change).`
    baseConfidence += 15
  } else if (wChange <= -0.5 && waistChange <= -0.2 && (sChange === null || sChange >= -1.0)) {
    // Cutting: standard fat loss / cut
    status = 'cutting'
    explanation = `You are on track with your cut. Weight is down ${Math.abs(wChange)} kg and waist is down ${Math.abs(waistChange)} cm, while strength is well maintained.`
    baseConfidence += 10
  } else if (Math.abs(wChange) <= 0.3 && Math.abs(waistChange) <= 0.3 && (sChange === null || Math.abs(sChange) <= 1.0)) {
    // Stalled: minimal changes in weight, waist, and strength
    status = 'stalled'
    explanation = `Your progress appears stalled. Body weight changed by ${wChange} kg, waist changed by ${waistChange} cm, and strength changed by ${sChange ?? 0}%. Consider adjusting calories or progressive overload targets to break the plateau.`
    baseConfidence += 10
  } else {
    // Fallback classification based on weight trend direction
    if (wChange > 0.5) {
      status = waistChange > 0.5 ? 'aggressive_bulk' : 'gaining_muscle'
      explanation = `Weight increased by ${wChange} kg and waist changed by ${waistChange} cm. Strength changed by ${sChange ?? 0}%.`
    } else if (wChange < -0.5) {
      status = waistChange < -0.3 ? 'losing_fat' : 'cutting'
      explanation = `Weight decreased by ${Math.abs(wChange)} kg and waist changed by ${waistChange} cm. Strength changed by ${sChange ?? 0}%.`
    } else {
      status = 'stalled'
      explanation = `Progress is neutral. Weight changed by ${wChange} kg, waist changed by ${waistChange} cm, and strength changed by ${sChange ?? 0}%.`
    }
  }

  // Clip confidence score to [10, 100]
  const confidence = Math.max(10, Math.min(100, baseConfidence))

  return {
    status,
    confidence,
    explanation,
    bodyFatTrend,
    weightTrend: weightTrendReport,
    waistTrend: waistTrendReport,
    strengthTrend: strengthTrendReport,
  }
}

export function generateRecompositionCoachContext(
  report: RecompositionReport,
  latestMeasurement: Measurement | null
): string {
  if (report.status === 'insufficient_data') {
    return `### PHYSICAL MEASUREMENTS & RECOMPOSITION ###\nRecomposition Status: insufficient_data\nMessage: ${report.explanation}\n`
  }

  const formatChange = (val: number | null, unit: string) => {
    if (val === null) return 'N/A'
    return `${val > 0 ? '+' : ''}${val} ${unit}`
  }

  const wChange = formatChange(report.weightTrend.change, 'kg')
  const waistChange = formatChange(report.waistTrend.change, 'cm')
  const sChange = report.strengthTrend.avgStrengthChange !== null ? `${report.strengthTrend.avgStrengthChange > 0 ? '+' : ''}${report.strengthTrend.avgStrengthChange}%` : 'N/A'

  let currentSection = 'Current Measurements:\n'
  if (latestMeasurement) {
    if (latestMeasurement.weightKg !== undefined) currentSection += `- Weight: ${latestMeasurement.weightKg} kg\n`
    if (latestMeasurement.waistCm !== undefined) currentSection += `- Waist: ${latestMeasurement.waistCm} cm\n`
    if (latestMeasurement.chestCm !== undefined) currentSection += `- Chest: ${latestMeasurement.chestCm} cm\n`
    if (latestMeasurement.leftArmCm !== undefined) currentSection += `- Left Arm: ${latestMeasurement.leftArmCm} cm\n`
    if (latestMeasurement.rightArmCm !== undefined) currentSection += `- Right Arm: ${latestMeasurement.rightArmCm} cm\n`
    if (latestMeasurement.leftThighCm !== undefined) currentSection += `- Left Thigh: ${latestMeasurement.leftThighCm} cm\n`
    if (latestMeasurement.rightThighCm !== undefined) currentSection += `- Right Thigh: ${latestMeasurement.rightThighCm} cm\n`
    if (latestMeasurement.neckCm !== undefined) currentSection += `- Neck: ${latestMeasurement.neckCm} cm\n`
    if (latestMeasurement.hipsCm !== undefined) currentSection += `- Hips: ${latestMeasurement.hipsCm} cm\n`
  } else {
    currentSection += '- None logged'
  }

  return `### PHYSICAL MEASUREMENTS & RECOMPOSITION ###
Recomposition Classification: ${report.status}
Confidence: ${report.confidence}%
Estimated Body Fat Trend: ${report.bodyFatTrend}
Weight Change (30d): ${wChange} (Baseline: ${report.weightTrend.baseline ?? 'N/A'} kg, Latest: ${report.weightTrend.latest ?? 'N/A'} kg)
Waist Change (30d): ${waistChange} (Baseline: ${report.waistTrend.baseline ?? 'N/A'} cm, Latest: ${report.waistTrend.latest ?? 'N/A'} cm)
Average Strength Change (30d): ${sChange}
Explanation: ${report.explanation}

${currentSection}`.trim()
}
