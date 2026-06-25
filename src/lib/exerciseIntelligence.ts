import type { WorkoutSession, ExerciseHistorySummary, ExerciseSessionRecord, ExerciseSetPerformance, PersonalRecordMetric, SessionExercise } from '@/types'
import { calcEstimated1RM } from './utils'
import { SEEDED_EXERCISES } from '@/constants/seeds'

/**
 * Calculates the exercise intelligence data and performance summary for a target exercise.
 * This is the single source of truth for exercise analytics, progression targets, and coach context.
 * 
 * @param exerciseId The ID of the exercise to analyze
 * @param sessions The list of workout sessions to extract history from
 */
export function getExerciseIntelligence(
  exerciseId: string,
  sessions: WorkoutSession[]
): ExerciseHistorySummary {
  const targetExercise = SEEDED_EXERCISES.find((e) => e.id === exerciseId)
  const targetName = targetExercise ? targetExercise.name.toLowerCase() : ''

  const matchesExercise = (se: SessionExercise) => {
    if (se.exerciseId === exerciseId) return true
    if (targetName) {
      if (se.exercise?.name?.toLowerCase() === targetName) return true
      const seeded = SEEDED_EXERCISES.find((e) => e.id === se.exerciseId)
      if (seeded && seeded.name.toLowerCase() === targetName) return true
    }
    return false
  }

  // Filter for completed sessions containing this exercise, sorted chronologically (ascending)
  const completedSessions = sessions
    .filter((s) => s.completedAt && s.exercises.some(matchesExercise))
    .sort((a, b) => a.date.localeCompare(b.date))

  // If no sessions exist for this exercise, return an empty profile
  if (completedSessions.length === 0) {
    return {
      exerciseId,
      lastSession: null,
      bestSession: null,
      trends30d: {
        e1rmPctChange: null,
        volumePctChange: null,
      },
      personalRecords: {
        heaviestWeight: null,
        highestReps: null,
        highestVolume: null,
        highestE1RM: null,
      },
      history: [],
    }
  }

  // Parse each completed session into a performance record
  const parsedRecords: ExerciseSessionRecord[] = completedSessions.map((session) => {
    const se = session.exercises.find(matchesExercise)!
    const workingSets: ExerciseSetPerformance[] = se.sets
      .filter((set) => !set.isWarmup)
      .map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps,
        isWarmup: set.isWarmup,
        e1rm: calcEstimated1RM(set.weightKg, set.reps),
      }))

    // Total volume of working sets
    const volume = workingSets.reduce((sum, set) => sum + set.weightKg * set.reps, 0)

    // Peak estimated 1RM for the session
    const peakE1RM = workingSets.length > 0
      ? Math.max(...workingSets.map((s) => s.e1rm))
      : 0

    // Find the best set (by e1RM)
    let bestSet = { weightKg: 0, reps: 0, e1rm: 0 }
    if (workingSets.length > 0) {
      const best = workingSets.reduce((max, current) => current.e1rm > max.e1rm ? current : max, workingSets[0])
      bestSet = { weightKg: best.weightKg, reps: best.reps, e1rm: best.e1rm }
    }

    return {
      sessionId: session.id,
      sessionName: session.name,
      date: session.date,
      sets: workingSets,
      volume,
      peakE1RM,
      bestSet,
    }
  })

  // 1. Last Session (most recent is the last in the ascending chronological array)
  const lastSession = parsedRecords[parsedRecords.length - 1]

  // 2. Best Session Selection
  // - Primary selector: Highest peak e1RM.
  // - Tie-breaker: If within 2% e1RM difference, choose the higher-volume session.
  let bestSession = parsedRecords[0]
  for (let i = 1; i < parsedRecords.length; i++) {
    const candidate = parsedRecords[i]
    const maxE1RM = Math.max(candidate.peakE1RM, bestSession.peakE1RM || 1)
    const diffPct = Math.abs(candidate.peakE1RM - bestSession.peakE1RM) / maxE1RM
    
    if (diffPct <= 0.02) {
      if (candidate.volume > bestSession.volume) {
        bestSession = candidate
      }
    } else if (candidate.peakE1RM > bestSession.peakE1RM) {
      bestSession = candidate
    }
  }

  // 3. Trends (last 30 days)
  // Compute percentage changes relative to the oldest logged session in the last 30 days
  // Anchored on the date of the latest session (lastSession.date) to preserve trend visibility after layoffs
  const anchorDate = new Date(lastSession.date + 'T00:00:00')
  const thirtyDaysAgoDate = new Date(anchorDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  const year = thirtyDaysAgoDate.getFullYear()
  const month = String(thirtyDaysAgoDate.getMonth() + 1).padStart(2, '0')
  const day = String(thirtyDaysAgoDate.getDate()).padStart(2, '0')
  const thirtyDaysAgoISO = `${year}-${month}-${day}`

  const recordsInLast30Days = parsedRecords.filter(
    (r) => r.date >= thirtyDaysAgoISO && r.date <= lastSession.date
  )
  
  let e1rmPctChange: number | null = null
  let volumePctChange: number | null = null

  if (recordsInLast30Days.length >= 2) {
    const recent = recordsInLast30Days[recordsInLast30Days.length - 1]
    const baseline = recordsInLast30Days[0] // Oldest logged session in the 30-day window

    if (baseline.peakE1RM > 0) {
      e1rmPctChange = Math.round(((recent.peakE1RM - baseline.peakE1RM) / baseline.peakE1RM) * 1000) / 10
    }
    if (baseline.volume > 0) {
      volumePctChange = Math.round(((recent.volume - baseline.volume) / baseline.volume) * 1000) / 10
    }
  }

  // 4. Personal Records (PR) Mapping
  let heaviestWeight: PersonalRecordMetric | null = null
  let highestReps: PersonalRecordMetric | null = null
  let highestVolume: PersonalRecordMetric | null = null
  let highestE1RM: PersonalRecordMetric | null = null

  parsedRecords.forEach((record) => {
    // Session Volume PR
    if (!highestVolume || record.volume > highestVolume.value) {
      highestVolume = {
        value: record.volume,
        achievedAt: record.date,
        sessionId: record.sessionId,
        sessionName: record.sessionName,
      }
    }

    // Set-level PRs
    record.sets.forEach((set) => {
      if (!heaviestWeight || set.weightKg > heaviestWeight.value) {
        heaviestWeight = {
          value: set.weightKg,
          achievedAt: record.date,
          sessionId: record.sessionId,
          sessionName: record.sessionName,
        }
      }
      if (!highestReps || set.reps > highestReps.value) {
        highestReps = {
          value: set.reps,
          achievedAt: record.date,
          sessionId: record.sessionId,
          sessionName: record.sessionName,
        }
      }
      if (!highestE1RM || set.e1rm > highestE1RM.value) {
        highestE1RM = {
          value: set.e1rm,
          achievedAt: record.date,
          sessionId: record.sessionId,
          sessionName: record.sessionName,
        }
      }
    })
  })

  // 5. History List (last 10 sessions, sorted descending - most recent first)
  const history = parsedRecords
    .slice(-10)
    .map((r) => ({
      sessionId: r.sessionId,
      sessionName: r.sessionName,
      date: r.date,
      volume: r.volume,
      peakE1RM: r.peakE1RM,
    }))
    .reverse()

  return {
    exerciseId,
    lastSession,
    bestSession,
    trends30d: {
      e1rmPctChange,
      volumePctChange,
    },
    personalRecords: {
      heaviestWeight,
      highestReps,
      highestVolume,
      highestE1RM,
    },
    history,
  }
}
