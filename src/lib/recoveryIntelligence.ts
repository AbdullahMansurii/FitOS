/* eslint-disable no-useless-assignment, prefer-const, @typescript-eslint/no-unused-vars */
import type { RecoveryLog } from '@/types'

export interface CalculatedRecovery {
  score: number
  status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical'
  statusLabel: string
  color: string
  explanation: string
  breakdown: {
    sleep: number | null
    steps: number | null
    mood: number | null
    energy: number | null
    soreness: number | null
  }
}

export function calculateRecoveryScore(log: RecoveryLog | null | undefined): CalculatedRecovery {
  // Default fallback if no log exists
  if (!log) {
    return {
      score: 70,
      status: 'good',
      statusLabel: 'Ready to Train',
      color: 'var(--emerald)',
      explanation: 'No recovery metrics logged for today yet. Default recovery assumed.',
      breakdown: { sleep: null, steps: null, mood: null, energy: null, soreness: null }
    }
  }

  let totalWeight = 0
  let weightedScoreSum = 0

  const breakdown = {
    sleep: null as number | null,
    steps: null as number | null,
    mood: null as number | null,
    energy: null as number | null,
    soreness: null as number | null
  }

  // 1. Sleep (35% weight)
  if (log.sleepHours !== undefined && log.sleepHours !== null) {
    const sleep = log.sleepHours
    let sleepScore = 50
    if (sleep >= 7 && sleep <= 9) {
      sleepScore = 100
    } else if (sleep > 9) {
      sleepScore = 90 // oversleeping fatigue
    } else if (sleep >= 6) {
      sleepScore = 80
    } else if (sleep >= 5) {
      sleepScore = 60
    } else {
      sleepScore = 30
    }
    breakdown.sleep = sleepScore
    weightedScoreSum += sleepScore * 0.35
    totalWeight += 0.35
  }

  // 2. Steps (20% weight)
  if (log.dailySteps !== undefined && log.dailySteps !== null) {
    const steps = log.dailySteps
    let stepsScore = 50
    if (steps >= 7000 && steps <= 12000) {
      stepsScore = 100
    } else if (steps > 15000) {
      stepsScore = 75 // systemic fatigue from excessive steps
    } else if (steps >= 5000) {
      stepsScore = 85
    } else if (steps >= 2500) {
      stepsScore = 65
    } else {
      stepsScore = 50 // sedentary
    }
    breakdown.steps = stepsScore
    weightedScoreSum += stepsScore * 0.20
    totalWeight += 0.20
  }

  // 3. Mood (15% weight)
  if (log.mood !== undefined && log.mood !== null) {
    const moodScore = ((log.mood - 1) / 4) * 100 // 1-5 scale
    breakdown.mood = moodScore
    weightedScoreSum += moodScore * 0.15
    totalWeight += 0.15
  }

  // 4. Energy (15% weight)
  if (log.energy !== undefined && log.energy !== null) {
    const energyScore = ((log.energy - 1) / 4) * 100
    breakdown.energy = energyScore
    weightedScoreSum += energyScore * 0.15
    totalWeight += 0.15
  }

  // 5. Muscle Soreness (15% weight)
  if (log.muscleSoreness !== undefined && log.muscleSoreness !== null) {
    // 1 (none) = 100 score, 5 (extreme) = 0 score
    const sorenessScore = ((5 - log.muscleSoreness) / 4) * 100
    breakdown.soreness = sorenessScore
    weightedScoreSum += sorenessScore * 0.15
    totalWeight += 0.15
  }

  // Normalize score if some data is missing
  const finalScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 70

  let status: CalculatedRecovery['status'] = 'good'
  let statusLabel = 'Ready to Train'
  let color = 'var(--emerald)'
  let explanation = ''

  if (finalScore >= 85) {
    status = 'excellent'
    statusLabel = 'Fully Recovered'
    color = 'var(--emerald)'
    explanation = 'Your body is fully recovered and primed for peak performance. Excellent state to attempt PRs or higher intensity training!'
  } else if (finalScore >= 70) {
    status = 'good'
    statusLabel = 'Ready to Train'
    color = 'var(--accent)'
    explanation = 'Good recovery state. You are ready for standard training. Focus on a solid warmup and follow your regular routine.'
  } else if (finalScore >= 50) {
    status = 'moderate'
    statusLabel = 'Moderate Fatigue'
    color = 'var(--amber)'
    explanation = 'Mild fatigue detected. Consider moderate loads or adjusting workout volume. Ensure you warm up thoroughly.'
  } else {
    status = 'poor'
    statusLabel = 'Needs Rest / Deload'
    color = 'var(--red)'
    explanation = 'High fatigue detected. We highly recommend a rest day, light active recovery (stretching/walking), or a deload workout.'
  }

  return {
    score: finalScore,
    status,
    statusLabel,
    color,
    explanation,
    breakdown
  }
}
