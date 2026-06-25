import type { WorkoutSession, ProgressionRecommendation, RecommendationType, ConfidenceLevel, SessionExercise, ExerciseSet, Exercise } from '@/types'
import { getExerciseIntelligence } from './exerciseIntelligence'
import { calcEstimated1RM } from './utils'
import { SEEDED_EXERCISES, SEEDED_TEMPLATES } from '@/constants/seeds'

/**
 * Rounds weight to nearest 2.5kg for heavy exercises (> 20kg), or 0.5kg for lighter ones.
 */
function roundWeight(w: number, increment?: number): number {
  if (w <= 0) return 0
  if (increment === 1.0) {
    return Math.round(w * 2) / 2 // round to nearest 0.5kg for isolation
  }
  if (increment === 2.0) {
    return Math.round(w) // round to nearest 1.0kg for DB compound
  }
  if (increment === 5.0) {
    return Math.round(w / 5) * 5 // round to nearest 5.0kg for heavy compound lower
  }
  if (w < 20) {
    return Math.round(w * 2) / 2 // round to nearest 0.5kg
  }
  return Math.round(w / 2.5) * 2.5 // round to nearest 2.5kg
}

/**
 * Parses target reps limit from string (e.g. "8-12" -> 12, "5" -> 5)
 */
function parseUpperRepLimit(targetRepsStr: string): number {
  if (targetRepsStr.includes('-')) {
    const parts = targetRepsStr.split('-')
    const high = parseInt(parts[1].trim(), 10)
    if (!isNaN(high)) return high
  }
  const val = parseInt(targetRepsStr.trim(), 10)
  return isNaN(val) ? 12 : val
}

/**
 * Parses lower reps limit from string (e.g. "8-12" -> 8, "5" -> 5)
 */
function parseLowerRepLimit(targetRepsStr: string): number {
  if (targetRepsStr.includes('-')) {
    const parts = targetRepsStr.split('-')
    const low = parseInt(parts[0].trim(), 10)
    if (!isNaN(low)) return low
  }
  const val = parseInt(targetRepsStr.trim(), 10)
  return isNaN(val) ? 8 : val
}

/**
 * Calculates a strength-coach-like progression recommendation for a target exercise.
 * Consumes getExerciseIntelligence outputs as the single source of truth.
 * 
 * @param exerciseId The ID of the exercise
 * @param sessions The list of completed workout sessions
 * @param goal The user's active goal profile
 */
const _recommendationCache = new Map<string, ProgressionRecommendation>()

export function getCachedRecommendation(
  exerciseId: string,
  sessions: WorkoutSession[],
  goal: 'strength' | 'hypertrophy' | 'maintenance'
): ProgressionRecommendation {
  const lastSessionHash = sessions.length > 0
    ? `${sessions[0].id}_${sessions[0].completedAt ?? 'active'}_${sessions.length}`
    : 'none'
  const cacheKey = `${exerciseId}_${lastSessionHash}_${goal}`

  const cached = _recommendationCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const rec = getProgressionRecommendation(exerciseId, sessions, goal)
  
  if (_recommendationCache.size > 1000) {
    _recommendationCache.clear()
  }
  _recommendationCache.set(cacheKey, rec)
  return rec
}

export function getProgressionRecommendation(
  exerciseId: string,
  sessions: WorkoutSession[],
  goal: 'strength' | 'hypertrophy' | 'maintenance'
): ProgressionRecommendation {
  const intelligence = getExerciseIntelligence(exerciseId, sessions)

  // Find exercise details in seeded or look up in completed sessions
  let exercise = SEEDED_EXERCISES.find((e) => e.id === exerciseId)
  if (!exercise) {
    for (const s of sessions) {
      const se = s.exercises.find((e) => e.exerciseId === exerciseId)
      if (se && se.exercise) {
        exercise = se.exercise
        break
      }
    }
  }
  const exerciseName = exercise ? exercise.name : 'Exercise'

  // Standard lower body muscle groups classification
  const lowerBodyMuscles = [
    'glutes', 'hamstrings', 'quads', 'calves', 'legs',
    'outer thighs', 'inner thighs', 'adductors', 'hip flexors'
  ]
  const isLowerBody = exercise
    ? exercise.muscleGroups.some(m => lowerBodyMuscles.includes(m.toLowerCase()))
    : false

  // 1. Handle No History (Insufficient Data)
  if (!intelligence.lastSession || intelligence.history.length === 0) {
    const msg = `No history exists for ${exerciseName}. Log your first workout session to begin tracking progression.`
    return {
      exerciseId,
      recommendationType: 'insufficient_data',
      recommendation: 'insufficient_data',
      message: msg,
      suggestedWeightKg: null,
      suggestedWeight: null,
      suggestedRepTarget: null,
      suggestedReps: null,
      confidence: 'low',
      reasoning: ['No workout history found for this exercise.'],
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
      reason: msg
    }
  }

  const lastSession = intelligence.lastSession
  const lastMaxWeight = lastSession.sets.length > 0 ? Math.max(...lastSession.sets.map(s => s.weightKg)) : 0
  const lastMaxReps = lastSession.sets.length > 0 ? Math.max(...lastSession.sets.map(s => s.reps)) : 0
  const historyLength = intelligence.history.length

  // Calculate days since last session (DST-safe by comparing local midnights)
  const today = new Date()
  const lastDate = new Date(lastSession.date + 'T00:00:00')
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffTime = todayMidnight.getTime() - lastDate.getTime()
  const daysSinceLastSession = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)))

  // Calculate weekly frequency (sessions containing exercise in last 28 days / 4)
  const twentyEightDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28)
  const twentyEightDaysAgoISO = `${twentyEightDaysAgo.getFullYear()}-${String(twentyEightDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twentyEightDaysAgo.getDate()).padStart(2, '0')}`

  const matchesExercise = (se: SessionExercise) => {
    const targetName = exercise ? exercise.name.toLowerCase() : ''
    if (se.exerciseId === exerciseId) return true
    if (targetName) {
      if (se.exercise?.name?.toLowerCase() === targetName) return true
      const seeded = SEEDED_EXERCISES.find((e) => e.id === se.exerciseId)
      if (seeded && seeded.name.toLowerCase() === targetName) return true
    }
    return false
  }

  const sessionsInLast28Days = sessions.filter(s => {
    return s.completedAt && s.date >= twentyEightDaysAgoISO && s.exercises.some(matchesExercise)
  })
  const weeklyFrequency = sessionsInLast28Days.length / 4

  // Refined Confidence System
  const confidence: ConfidenceLevel =
    historyLength >= 5 && daysSinceLastSession < 14 && weeklyFrequency >= 1.0
      ? 'high'
      : (historyLength <= 2 || daysSinceLastSession >= 21 || weeklyFrequency < 0.5
          ? 'low'
          : 'medium')

  // Volume Progression Detection
  const previousSessionInfo = intelligence.history[1]
  const volumeImproving = previousSessionInfo ? lastSession.volume > previousSessionInfo.volume : false

  // Fallback target ranges if template information is not found
  let targetRepsStr = goal === 'strength' ? '5' : '8-12'
  let foundInTemplate = false
  const lastWorkoutSession = sessions.find(s => s.id === lastSession.sessionId)
  if (lastWorkoutSession?.templateId) {
    const targetTemplate = SEEDED_TEMPLATES.find(t => t.id === lastWorkoutSession.templateId)
    if (targetTemplate) {
      const te = targetTemplate.exercises.find(e => e.exerciseId === exerciseId)
      if (te && te.targetReps) {
        targetRepsStr = te.targetReps
        foundInTemplate = true
      }
    }
  }
  if (!foundInTemplate) {
    for (const t of SEEDED_TEMPLATES) {
      const te = t.exercises.find(e => e.exerciseId === exerciseId)
      if (te && te.targetReps) {
        targetRepsStr = te.targetReps
        break
      }
    }
  }
  const upperRepLimit = parseUpperRepLimit(targetRepsStr)
  const lowerRepLimit = parseLowerRepLimit(targetRepsStr)

  // Retrieve previous session records for checks
  const prevSession = previousSessionInfo
    ? (sessions.find(s => s.id === previousSessionInfo.sessionId) || null)
    : null
  const prevSets: ExerciseSet[] = prevSession
    ? (prevSession.exercises.find(matchesExercise)?.sets.filter(s => !s.isWarmup) || [])
    : []
  const prevMaxWeight = prevSets.length > 0 ? Math.max(...prevSets.map(s => s.weightKg)) : 0

  // Deload safety constraint: never deload consecutively without a newer session
  const alreadyDeloaded = lastMaxWeight < prevMaxWeight && prevMaxWeight > 0

  // Bodyweight movements constraint
  const isBodyweight = exercise?.equipment === 'Bodyweight' && lastMaxWeight === 0

  // Target reps and completion rules for progression
  const targetRepsForProgression = goal === 'strength' ? lowerRepLimit : upperRepLimit
  const completedAllSets = lastSession.sets.length > 0 && lastSession.sets.every(set => set.reps >= targetRepsForProgression)

  const e1rmImproved = goal === 'strength'
    ? (intelligence.history.length >= 3 && intelligence.trends30d.e1rmPctChange !== null
        ? intelligence.trends30d.e1rmPctChange > 0
        : (previousSessionInfo ? lastSession.peakE1RM >= previousSessionInfo.peakE1RM : true))
    : false

  const readyToProgress = goal === 'strength'
    ? (completedAllSets && e1rmImproved)
    : (goal === 'hypertrophy'
        ? (lastSession.sets.length > 0 && (lastSession.sets.filter(s => s.reps >= (upperRepLimit - 1)).length / lastSession.sets.length) >= 0.8)
        : false)

  // Stall Detection (3 consecutive sessions stagnant or decreasing peak e1RM)
  let stallDetected = false
  if (historyLength >= 3) {
    const h0 = intelligence.history[0].peakE1RM
    const h1 = intelligence.history[1].peakE1RM
    const h2 = intelligence.history[2].peakE1RM
    stallDetected = h0 <= h1 && h1 <= h2
  }
  if (readyToProgress) {
    stallDetected = false
  }

  // Fatigue Warning (Both e1RM and Volume declining strictly for 3 consecutive sessions)
  let fatigueWarning = false
  if (historyLength >= 3) {
    const e1rmDeclining = intelligence.history[0].peakE1RM < intelligence.history[1].peakE1RM &&
                          intelligence.history[1].peakE1RM < intelligence.history[2].peakE1RM
    const volumeDeclining = intelligence.history[0].volume < intelligence.history[1].volume &&
                            intelligence.history[1].volume < intelligence.history[2].volume
    fatigueWarning = e1rmDeclining && volumeDeclining
  }

  // Readiness Score Calculation (0-100)
  let readinessScore = 75

  // 1. e1RM Trend
  if (intelligence.trends30d.e1rmPctChange !== null) {
    const chg = intelligence.trends30d.e1rmPctChange
    if (chg > 5) readinessScore += 10
    else if (chg > 0) readinessScore += 5
    else if (chg < -5) readinessScore -= 10
    else if (chg < 0) readinessScore -= 5
  } else if (previousSessionInfo) {
    const lastE1RM = lastSession.peakE1RM
    const prevE1RM = previousSessionInfo.peakE1RM
    if (lastE1RM > prevE1RM) readinessScore += 3
    if (lastE1RM < prevE1RM) readinessScore -= 3
  }

  // 2. Volume Trend
  if (intelligence.trends30d.volumePctChange !== null) {
    const chg = intelligence.trends30d.volumePctChange
    if (chg > 10 && !stallDetected) readinessScore += 10
    else if (chg > 0 && !stallDetected) readinessScore += 5
    else if (chg < -10) readinessScore -= 10
    else if (chg < 0) readinessScore -= 5
  } else if (previousSessionInfo) {
    const lastVol = lastSession.volume
    const prevVol = previousSessionInfo.volume
    if (lastVol > prevVol && !stallDetected) readinessScore += 3
    if (lastVol < prevVol) readinessScore -= 3
  }

  // 3. Recent PR
  const prE1RM = intelligence.personalRecords.highestE1RM
  if (prE1RM) {
    if (prE1RM.achievedAt === lastSession.date) readinessScore += 5
    else if (previousSessionInfo && prE1RM.achievedAt === previousSessionInfo.date) readinessScore += 3
  }

  // 4. Training Consistency
  if (daysSinceLastSession < 21) {
    if (historyLength >= 5) readinessScore += 5
    else if (historyLength >= 3) readinessScore += 3
  }

  // 5. Recovery Gap Penalty
  if (daysSinceLastSession >= 21) readinessScore -= 15
  else if (daysSinceLastSession >= 14) readinessScore -= 10
  else if (daysSinceLastSession >= 7) readinessScore -= 5

  // 6. Weekly Frequency Adjustment
  if (weeklyFrequency < 0.75) readinessScore -= 10
  else if (weeklyFrequency >= 1.25 && weeklyFrequency <= 2.5) readinessScore += 3

  // 7. Negative Flags
  if (stallDetected) readinessScore -= 30
  if (fatigueWarning) readinessScore -= 30

  // Bound between 0 and 100
  readinessScore = Math.min(100, Math.max(0, readinessScore))

  // Determine exercise-specific weight increments
  let weightIncrement = 2.5
  if (exercise) {
    const isCompound = exercise.exerciseType === 'compound'
    const isIsolation = exercise.exerciseType === 'isolation'
    const eq = exercise.equipment || ''

    if (isCompound) {
      if (eq === 'Dumbbell') {
        weightIncrement = 2.0 // Dumbbell Compound (+2kg total)
      } else if (isLowerBody && (eq === 'Barbell' || eq === 'Machine' || eq === 'Smith')) {
        weightIncrement = 5.0 // Heavy Compound Lower
      } else if (!isLowerBody && (eq === 'Barbell' || eq === 'Smith' || eq === 'Other' || eq === 'Cable')) {
        weightIncrement = 2.5 // Heavy Compound Upper
      } else {
        weightIncrement = isLowerBody ? 5.0 : 2.5
      }
    } else if (isIsolation) {
      weightIncrement = 1.0 // Isolation
    }
  }



  // ─── STAGE PRIORITY 1: FATIGUE WARNING ────────────────────────────────────
  if (fatigueWarning) {
    const reasonText = `Training volume and estimated strength declined for three consecutive sessions. Recovery may be limiting performance. Maintain current loads and focus on recovery.`
    return {
      exerciseId,
      recommendationType: 'maintain',
      recommendation: 'maintain',
      message: `Fatigue warning active. Keep load at ${lastMaxWeight}kg. Focus on recovery and nutrition.`,
      suggestedWeightKg: lastMaxWeight,
      suggestedWeight: lastMaxWeight,
      suggestedRepTarget: lastMaxReps,
      suggestedReps: lastMaxReps,
      confidence,
      reasoning: [
        'e1RM declined strictly for 3 consecutive sessions.',
        'Volume declined strictly for 3 consecutive sessions.',
        'High fatigue indicators detected.'
      ],
      currentPeakE1RM: lastSession.peakE1RM,
      currentVolume: lastSession.volume,
      projectedE1RM: lastSession.peakE1RM,
      projectedVolume: lastSession.volume,
      stallDetected: true,
      potentialPR: false,
      readinessScore,
      volumeImproving: false,
      fatigueWarning: true,
      daysSinceLastSession,
      weeklyFrequency,
      reason: reasonText
    }
  }

  // ─── STAGE PRIORITY 2: DELOAD RECOMMENDATION ──────────────────────────────
  if (stallDetected && !alreadyDeloaded && !readyToProgress) {
    // Deload safety rule: do not recommend more than 10% load reduction
    const deloadWeight = roundWeight(lastMaxWeight * 0.9, weightIncrement)
    const reasonText = `Performance has stagnated for three consecutive sessions while volume remained stable. A deload is recommended.`
    const projectedE1RM = calcEstimated1RM(deloadWeight, lowerRepLimit)
    const projectedVolume = deloadWeight * lowerRepLimit * lastSession.sets.length

    return {
      exerciseId,
      recommendationType: 'deload',
      recommendation: 'deload',
      message: `Performance has plateaued for three consecutive sessions. Reduce load by approximately 10% to ${deloadWeight}kg next session.`,
      suggestedWeightKg: deloadWeight,
      suggestedWeight: deloadWeight,
      suggestedRepTarget: lowerRepLimit,
      suggestedReps: lowerRepLimit,
      confidence,
      reasoning: [
        'Peak e1RM stagnant or decreasing for 3 sessions.',
        'Stall detected.',
        `Suggested deload weight is 90% of last load (${lastMaxWeight}kg → ${deloadWeight}kg).`
      ],
      currentPeakE1RM: lastSession.peakE1RM,
      currentVolume: lastSession.volume,
      projectedE1RM,
      projectedVolume,
      stallDetected: true,
      potentialPR: false,
      readinessScore,
      volumeImproving,
      fatigueWarning: false,
      daysSinceLastSession,
      weeklyFrequency,
      reason: reasonText
    }
  }

  // Variables for final recommendations
  let recType: RecommendationType
  let suggestedWeight = lastMaxWeight
  let suggestedReps = lastMaxReps
  const reasoningList: string[] = []
  let reasonText: string
  let messageText: string

  // ─── STAGE PRIORITY 3/4/5: GOAL LOGIC ──────────────────────────────────────
  if (goal === 'strength') {
    // Strength Rules

    // Rule 2: Weight increased recently and reps dropped sharply (average reps drop >= 2)
    const lastAvgReps = lastSession.sets.length > 0
      ? lastSession.sets.reduce((sum, s) => sum + s.reps, 0) / lastSession.sets.length
      : 0
    const prevAvgReps = prevSets.length > 0
      ? prevSets.reduce((sum, s) => sum + s.reps, 0) / prevSets.length
      : 0
    const repsDroppedSharply = prevSets.length > 0 && lastAvgReps <= prevAvgReps - 2
    const weightIncreasedRecently = prevSets.length > 0 && lastMaxWeight > prevMaxWeight

    // Rule 3: Performance declined (peak e1RM decreased)
    const e1rmDeclined = previousSessionInfo ? lastSession.peakE1RM < previousSessionInfo.peakE1RM : false

    if (weightIncreasedRecently && repsDroppedSharply) {
      recType = 'maintain'
      reasonText = `Weight increased recently to ${lastMaxWeight}kg but average reps dropped sharply by ${Math.round((prevAvgReps - lastAvgReps) * 10) / 10} reps. Maintain current loading to stabilize performance.`
      messageText = `Maintain current load at ${lastMaxWeight}kg next session to stabilize reps.`
      reasoningList.push('Weight increased recently.', 'Average reps dropped sharply.', 'Awaiting rep stabilization.')
    } else if (e1rmDeclined) {
      recType = 'maintain'
      reasonText = `Peak e1RM declined from ${previousSessionInfo?.peakE1RM}kg to ${lastSession.peakE1RM}kg. Maintain load of ${lastMaxWeight}kg to consolidate.`
      messageText = `Peak strength declined last session. Maintain loading at ${lastMaxWeight}kg.`
      reasoningList.push('Peak e1RM decreased.', 'Strength declined.', 'Loading consolidated.')
    } else if (completedAllSets && e1rmImproved) {
      // Rule 1: All sets completed successfully and strength improved
      if (isBodyweight) {
        recType = 'increase_reps'
        suggestedWeight = 0
        suggestedReps = lastMaxReps + 1
        reasonText = `Bodyweight exercise target reached with improved strength. Progression is routed to reps instead of added weight.`
        messageText = `Bodyweight movement. Keep weight at bodyweight and increase rep target to ${suggestedReps} reps.`
        reasoningList.push('Bodyweight exercise detected.', 'All working sets completed successfully.', 'Rep progression prioritized.')
      } else {
        recType = 'increase_weight'
        suggestedWeight = roundWeight(lastMaxWeight + weightIncrement, weightIncrement)
        suggestedReps = lowerRepLimit
        reasonText = `${exerciseName} improved from ${previousSessionInfo?.peakE1RM || 0}kg e1RM to ${lastSession.peakE1RM}kg e1RM while volume increased ${Math.round(((lastSession.volume - (previousSessionInfo?.volume || 0)) / (previousSessionInfo?.volume || 1)) * 100)}%. You reached the top of your target rep range. Increase load by ${weightIncrement}kg next session.`
        messageText = `All target sets met. Increase weight by ${weightIncrement}kg to ${suggestedWeight}kg next session.`
        reasoningList.push('Peak e1RM improved.', 'All target reps completed.', `Weight increased by bucket increment (+${weightIncrement}kg).`)
      }
    } else {
      // Rep progression focus
      if (lastMaxReps < upperRepLimit) {
        recType = 'increase_reps'
        suggestedReps = Math.min(upperRepLimit, lastMaxReps + 1)
        reasonText = `Accumulate more reps to reach the target rep limit of ${upperRepLimit} reps before increasing weight.`
        messageText = `Aim for ${suggestedReps} reps per set next session at ${lastMaxWeight}kg.`
        reasoningList.push('Working sets not fully completed.', `Target reps are ${upperRepLimit}.`, 'Reps progression prioritized.')
      } else {
        recType = 'maintain'
        reasonText = `Performance is stable. Maintain current loading and continue accumulating quality volume.`
        messageText = `Maintain current loading of ${lastMaxWeight}kg and continue accumulating quality volume.`
        reasoningList.push('Strength is stable.', 'Sets completed but e1RM did not improve.')
      }
    }
  } else if (goal === 'hypertrophy') {
    // Hypertrophy Rules: rep progression first, weight second
    // Refined threshold: at least 80% of working sets must reach (upperRepLimit - 1)
    const thresholdRep = upperRepLimit - 1
    const numWorkingSets = lastSession.sets.length
    const setsReachingTarget = lastSession.sets.filter(s => s.reps >= thresholdRep).length
    const thresholdPassed = numWorkingSets > 0 ? (setsReachingTarget / numWorkingSets) >= 0.8 : false

    if (thresholdPassed) {
      if (isBodyweight) {
        recType = 'increase_reps'
        suggestedWeight = 0
        suggestedReps = lastMaxReps + 1
        reasonText = `Target rep threshold reached on bodyweight movement. Progressing reps to ${suggestedReps} before added weight.`
        messageText = `Bodyweight exercise. Maintain bodyweight and increase rep target to ${suggestedReps} reps.`
        reasoningList.push('Bodyweight exercise detected.', '80% hypertrophy rep threshold met.', 'Rep target increased.')
      } else {
        recType = 'increase_weight'
        suggestedWeight = roundWeight(lastMaxWeight + weightIncrement, weightIncrement)
        suggestedReps = lowerRepLimit
        reasonText = `Training volume increased by ${Math.round(((lastSession.volume - (previousSessionInfo?.volume || 0)) / (previousSessionInfo?.volume || 1)) * 100)}%. At least 80% of working sets reached target reps of ${thresholdRep}. Increase weight by ${weightIncrement}kg next session.`
        messageText = `Threshold met. Increase weight to ${suggestedWeight}kg and reduce target reps to ${suggestedReps}.`
        reasoningList.push('80% hypertrophy rep threshold met.', `Weight increased by bucket increment (+${weightIncrement}kg).`, `Target reps reset to ${suggestedReps}.`)
      }
    } else {
      recType = 'increase_reps'
      suggestedReps = Math.min(upperRepLimit, lastMaxReps + 1)
      const volPctStr = previousSessionInfo
        ? `Training volume increased by ${Math.round(((lastSession.volume - previousSessionInfo.volume) / previousSessionInfo.volume) * 100)}%. `
        : ''
      reasonText = `${volPctStr}Continue progressing reps before increasing load.`
      messageText = `Continue accumulating reps. Target ${suggestedReps} reps per set next session at ${lastMaxWeight}kg.`
      reasoningList.push('Hypertrophy threshold not met yet.', `Aim to reach ${upperRepLimit} reps across working sets.`, 'Reps progression prioritized.')
    }
  } else {
    // Maintenance Goal
    // Default to maintain unless e1rmPctChange is <= -10% (decline)
    const e1rmDecline = intelligence.trends30d.e1rmPctChange !== null && intelligence.trends30d.e1rmPctChange <= -10
    const volDecline = previousSessionInfo && lastSession.volume < previousSessionInfo.volume * 0.9

    if (e1rmDecline || volDecline) {
      recType = 'maintain'
      reasonText = `Large performance decline detected in maintenance. Check fatigue, nutrition, or recovery factors.`
      messageText = `Keep load at ${lastMaxWeight}kg. Do not increase weight or reps until performance recovers.`
      reasoningList.push('Performance decline >= 10% in last 30 days.', 'Recovery likely compromised.')
    } else {
      recType = 'maintain'
      reasonText = `Maintenance mode active. Keep load unchanged.`
      messageText = `Maintain current load of ${lastMaxWeight}kg at ${lastMaxReps} reps.`
      reasoningList.push('Maintenance goal active.', 'No adjustments needed.')
    }
  }

  // Include frequency context in reason text when relevant
  if (weeklyFrequency > 0 && weeklyFrequency < 0.75) {
    reasonText += ` This exercise has only been trained ${weeklyFrequency.toFixed(1)} times per week recently. Additional data is recommended before aggressive progression.`
  } else if (weeklyFrequency >= 1.0) {
    reasonText += ` Trained ${weeklyFrequency.toFixed(1)} times per week over the last month.`
  }

  // PR Detection
  const highestE1RMVal = intelligence.personalRecords.highestE1RM?.value || 0
  const projectedE1RM = (suggestedWeight && suggestedReps)
    ? calcEstimated1RM(suggestedWeight, suggestedReps)
    : null
  
  const potentialPR = projectedE1RM !== null && highestE1RMVal > 0
    ? projectedE1RM > (highestE1RMVal * 1.01)
    : false

  if (potentialPR) {
    reasoningList.push('Potential PR opportunity detected.')
    reasonText += ` Potential PR opportunity detected. Projected e1RM of ${projectedE1RM}kg exceeds current PR of ${highestE1RMVal}kg.`
  }

  // Calculate projected volume
  const numSets = lastSession.sets.length
  const projectedVolume = (suggestedWeight && suggestedReps)
    ? suggestedWeight * suggestedReps * numSets
    : null

  // Format outputs
  return {
    exerciseId,
    recommendationType: recType,
    recommendation: recType,
    message: messageText || `Suggested: ${suggestedWeight}kg x ${suggestedReps} reps.`,
    suggestedWeightKg: suggestedWeight,
    suggestedWeight: suggestedWeight,
    suggestedRepTarget: suggestedReps,
    suggestedReps: suggestedReps,
    confidence,
    reasoning: reasoningList,
    currentPeakE1RM: lastSession.peakE1RM,
    currentVolume: lastSession.volume,
    projectedE1RM,
    projectedVolume,
    stallDetected,
    potentialPR,
    readinessScore,
    volumeImproving,
    fatigueWarning,
    daysSinceLastSession,
    weeklyFrequency,
    reason: reasonText
  }
}

/**
 * Generates the AI coach training intelligence prompt section based on Abdullah's history.
 * Limits the included exercises to:
 * - Top 5 most-trained exercises (by count)
 * - Exercises with active fatigue warnings
 * - Exercises with active stall warnings
 * - Exercises with active progression recommendations (weight/rep increases)
 */
export function generateTrainingIntelligence(
  sessions: WorkoutSession[],
  exercises: Exercise[],
  activeGoal: { name: string; type: string } | null
): string {
  const trainingGoal = activeGoal && activeGoal.name.toLowerCase().match(/(strength|power|lift)/) 
    ? 'strength' as const 
    : (activeGoal?.type === 'maintain' ? 'maintenance' as const : 'hypertrophy' as const)

  const completedSessions = sessions.filter(s => s.completedAt)
  const exerciseCounts: Record<string, number> = {}
  completedSessions.forEach(s => {
    s.exercises.forEach(ex => {
      exerciseCounts[ex.exerciseId] = (exerciseCounts[ex.exerciseId] || 0) + 1
    })
  })
  const top5ExerciseIds = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0])

  const idsToInclude = new Set<string>(top5ExerciseIds)
  const trainedIds = new Set<string>()
  sessions.forEach(s => {
    s.exercises.forEach(ex => {
      if (ex.exerciseId) trainedIds.add(ex.exerciseId)
    })
  })
  
  trainedIds.forEach(id => {
    const rec = getCachedRecommendation(id, sessions, trainingGoal)
    if (rec.fatigueWarning || rec.stallDetected || rec.recommendationType === 'increase_weight' || rec.recommendationType === 'increase_reps') {
      idsToInclude.add(id)
    }
  })

  const intelLines: string[] = []
  if (idsToInclude.size > 0) {
    intelLines.push('### Exercise Intelligence')
    Array.from(idsToInclude).forEach(exId => {
      const intel = getExerciseIntelligence(exId, sessions)
      if (!intel.lastSession) return // skip if never trained
      
      const exName = exercises.find(e => e.id === exId)?.name || 'Exercise'
      
      intelLines.push(`${exName}:`)
      if (intel.personalRecords.highestE1RM) {
        intelLines.push(`  Current PR: ${intel.personalRecords.highestE1RM.value}kg e1RM`)
      }
      if (intel.trends30d.e1rmPctChange !== null) {
        intelLines.push(`  30-Day e1RM Change: ${intel.trends30d.e1rmPctChange >= 0 ? '+' : ''}${intel.trends30d.e1rmPctChange}%`)
      }
      if (intel.trends30d.volumePctChange !== null) {
        intelLines.push(`  Volume Change: ${intel.trends30d.volumePctChange >= 0 ? '+' : ''}${intel.trends30d.volumePctChange}%`)
      }
      if (intel.bestSession) {
        intelLines.push(`  Best Session: ${intel.bestSession.date} (Vol: ${Math.round(intel.bestSession.volume)}kg, Peak e1RM: ${intel.bestSession.peakE1RM}kg)`)
      }
      intelLines.push('')
    })

    intelLines.push('### Progressive Overload Data')
    Array.from(idsToInclude).forEach(exId => {
      const rec = getCachedRecommendation(exId, sessions, trainingGoal)
      if (rec.recommendationType === 'insufficient_data') return

      const exName = exercises.find(e => e.id === exId)?.name || 'Exercise'

      intelLines.push(`${exName}:`)
      intelLines.push(`  Recommendation: ${rec.recommendationType.replace('_', ' ')}`)
      if (rec.suggestedWeight !== null && rec.suggestedReps !== null) {
        intelLines.push(`  Suggested: ${rec.suggestedWeight}kg × ${rec.suggestedReps}`)
      }
      intelLines.push(`  Readiness: ${rec.readinessScore}`)
      intelLines.push(`  Confidence: ${rec.confidence}`)
      if (rec.fatigueWarning) {
        intelLines.push(`  Fatigue Flag: Active`)
      }
      if (rec.stallDetected) {
        intelLines.push(`  Stall Flag: Active`)
      }
      intelLines.push(`  Weekly Frequency: ${rec.weeklyFrequency.toFixed(1)} sessions/week`)
      intelLines.push(`  Coaching Note: ${rec.reason}`)
      intelLines.push('')
    })
  }
  return intelLines.join('\n')
}

