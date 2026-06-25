import type { WorkoutSession, Exercise } from '../src/types'
import { getProgressionRecommendation } from '../src/lib/progressiveOverload'
import { SEEDED_EXERCISES } from '../src/constants/seeds'

const dateAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const mkSessionExercise = (exerciseId: string, sets: { weightKg: number; reps: number; isWarmup?: boolean }[]) => ({
  id: 'se-' + Math.random().toString(36).substr(2, 9),
  sessionId: '',
  exerciseId,
  orderIndex: 0,
  sets: sets.map((s, idx) => ({
    id: 'set-' + idx + '-' + Math.random().toString(36).substr(2, 9),
    sessionExerciseId: '',
    setNumber: idx + 1,
    reps: s.reps,
    weightKg: s.weightKg,
    isWarmup: s.isWarmup || false,
    completedAt: new Date().toISOString()
  }))
})

const mkSession = (id: string, name: string, date: string, exercises: any[], templateId = 'tmpl-push-a'): WorkoutSession => ({
  id,
  name,
  date,
  completedAt: new Date().toISOString(),
  templateId,
  exercises: exercises.map(e => ({ ...e, sessionId: id })),
  createdAt: new Date().toISOString()
})

// Generate 50 realistic simulated scenarios
const scenarios: { name: string; exerciseId: string; sessions: WorkoutSession[]; goal: 'strength' | 'hypertrophy' | 'maintenance' }[] = []

const exercisesList = ['ex-bench-press', 'ex-squat', 'ex-deadlift', 'ex-bicep-curl', 'ex-pull-up', 'ex-lateral-raise']

for (let i = 1; i <= 50; i++) {
  const exId = exercisesList[i % exercisesList.length]
  const goal = (i % 3 === 0) ? 'strength' : ((i % 3 === 1) ? 'hypertrophy' : 'maintenance') as any
  
  const sessions: WorkoutSession[] = []
  
  // Decide scenario profile type
  const type = i % 10
  
  if (type === 0) {
    // 1. Fresh Exercise (Only 1 session logged, e.g. 5 days ago)
    sessions.push(mkSession('s1', 'A', dateAgo(5), [mkSessionExercise(exId, [{ weightKg: 50, reps: 8 }])]))
  } else if (type === 1) {
    // 2. Short history progressing (2 sessions, 8 & 3 days ago)
    sessions.push(mkSession('s1', 'A', dateAgo(8), [mkSessionExercise(exId, [{ weightKg: 50, reps: 5 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 50, reps: 6 }])]))
  } else if (type === 2) {
    // 3. Normal progressing lifter (5 sessions, regular intervals, increasing reps/weights)
    sessions.push(mkSession('s1', 'A', dateAgo(24), [mkSessionExercise(exId, [{ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(19), [mkSessionExercise(exId, [{ weightKg: 60, reps: 9 }, { weightKg: 60, reps: 8 }])]))
    sessions.push(mkSession('s3', 'A', dateAgo(14), [mkSessionExercise(exId, [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 9 }])]))
    sessions.push(mkSession('s4', 'A', dateAgo(9), [mkSessionExercise(exId, [{ weightKg: 62.5, reps: 8 }, { weightKg: 62.5, reps: 8 }])]))
    sessions.push(mkSession('s5', 'A', dateAgo(4), [mkSessionExercise(exId, [{ weightKg: 62.5, reps: 9 }, { weightKg: 62.5, reps: 9 }])]))
  } else if (type === 3) {
    // 4. Stalled lifter (3 sessions, exact same reps/weight, stable volume)
    sessions.push(mkSession('s1', 'A', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(8), [mkSessionExercise(exId, [{ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }])]))
    sessions.push(mkSession('s3', 'A', dateAgo(2), [mkSessionExercise(exId, [{ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }])]))
  } else if (type === 4) {
    // 5. Systemic fatigue lifter (3 sessions strictly declining strength and volume)
    sessions.push(mkSession('s1', 'A', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(8), [mkSessionExercise(exId, [{ weightKg: 95, reps: 4 }, { weightKg: 95, reps: 4 }])]))
    sessions.push(mkSession('s3', 'A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 90, reps: 3 }, { weightKg: 90, reps: 3 }])]))
  } else if (type === 5) {
    // 6. Return from layoff (5 sessions, but last was 35 days ago)
    sessions.push(mkSession('s1', 'A', dateAgo(65), [mkSessionExercise(exId, [{ weightKg: 40, reps: 10 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(58), [mkSessionExercise(exId, [{ weightKg: 40, reps: 11 }])]))
    sessions.push(mkSession('s3', 'A', dateAgo(50), [mkSessionExercise(exId, [{ weightKg: 42.5, reps: 10 }])]))
    sessions.push(mkSession('s4', 'A', dateAgo(42), [mkSessionExercise(exId, [{ weightKg: 42.5, reps: 11 }])]))
    sessions.push(mkSession('s5', 'A', dateAgo(35), [mkSessionExercise(exId, [{ weightKg: 42.5, reps: 12 }])]))
  } else if (type === 6) {
    // 7. Elite lifter achieving PRs (6 sessions, high frequency, hitting PRs every second workout)
    sessions.push(mkSession('s1', 'A', dateAgo(18), [mkSessionExercise(exId, [{ weightKg: 110, reps: 5 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 112.5, reps: 5 }])])) // PR
    sessions.push(mkSession('s3', 'A', dateAgo(12), [mkSessionExercise(exId, [{ weightKg: 112.5, reps: 5 }])]))
    sessions.push(mkSession('s4', 'A', dateAgo(9), [mkSessionExercise(exId, [{ weightKg: 115, reps: 5 }])])) // PR
    sessions.push(mkSession('s5', 'A', dateAgo(6), [mkSessionExercise(exId, [{ weightKg: 115, reps: 5 }])]))
    sessions.push(mkSession('s6', 'A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 117.5, reps: 5 }])])) // PR
  } else if (type === 7) {
    // 8. Low frequency lifter (4 sessions over 40 days, last session 8 days ago)
    sessions.push(mkSession('s1', 'A', dateAgo(38), [mkSessionExercise(exId, [{ weightKg: 50, reps: 8 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(28), [mkSessionExercise(exId, [{ weightKg: 50, reps: 9 }])]))
    sessions.push(mkSession('s3', 'A', dateAgo(18), [mkSessionExercise(exId, [{ weightKg: 52.5, reps: 8 }])]))
    sessions.push(mkSession('s4', 'A', dateAgo(8), [mkSessionExercise(exId, [{ weightKg: 52.5, reps: 8 }])]))
  } else if (type === 8) {
    // 9. Moderate consistency (3 sessions, regular spacing)
    sessions.push(mkSession('s1', 'A', dateAgo(16), [mkSessionExercise(exId, [{ weightKg: 70, reps: 6 }])]))
    sessions.push(mkSession('s2', 'A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 70, reps: 7 }])]))
    sessions.push(mkSession('s3', 'A', dateAgo(4), [mkSessionExercise(exId, [{ weightKg: 72.5, reps: 6 }])]))
  } else {
    // 10. High frequency, stable performance (8 sessions in last 24 days)
    for (let s = 8; s >= 1; s--) {
      sessions.push(mkSession('s' + s, 'A', dateAgo(s * 3), [mkSessionExercise(exId, [{ weightKg: 85, reps: 5 }])]))
    }
  }

  scenarios.push({
    name: `Scenario ${i} (Type ${type}, Goal ${goal})`,
    exerciseId: exId,
    sessions,
    goal
  })
}

// We will run the simulation for different baselines: 65, 70, 75
function runSimForBaseline(baseVal: number) {
  const scores = scenarios.map(sc => {
    // Temporarily mock the baseline or calculate it manually based on progressiveOverload calculations
    // We can simulate the progressiveOverload readiness score calculation by adjusting the results of the engine (since they scale linearly with the baseline)
    // Wait, let's look at the engine's code: baseline is hardcoded to 75. 
    // Any score calculated with baseline 75 is: score = 75 + sum_modifiers.
    // If the baseline was baseVal, the new score would be: new_score = baseVal + sum_modifiers.
    // So new_score = old_score - (75 - baseVal), bounded between 0 and 100.
    // Wait, is that true? Yes, because the modifiers themselves are independent of the baseline, and the bounding [0, 100] is applied at the very end.
    
    // Let's call the engine to get the sum_modifiers by subtracting 75 from the score
    const rec = getProgressionRecommendation(sc.exerciseId, sc.sessions, sc.goal)
    
    // To reconstruct sum_modifiers:
    // If the original score was capped at 100, we don't know the exact sum_modifiers if it was > 100.
    // So let's write a manual readiness score calculator for the baseline simulation to be 100% accurate!
    return getReadinessScoreForSim(sc.exerciseId, sc.sessions, sc.goal, baseVal)
  })

  scores.sort((a, b) => a - b)

  const min = scores[0]
  const max = scores[scores.length - 1]
  const sum = scores.reduce((s, x) => s + x, 0)
  const avg = sum / scores.length
  const median = scores.length % 2 === 0
    ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : scores[Math.floor(scores.length / 2)]

  const buckets = {
    '0–39': 0,
    '40–59': 0,
    '60–74': 0,
    '75–89': 0,
    '90–100': 0
  }

  scores.forEach(s => {
    if (s <= 39) buckets['0–39']++
    else if (s <= 59) buckets['40–59']++
    else if (s <= 74) buckets['60–74']++
    else if (s <= 89) buckets['75–89']++
    else buckets['90–100']++
  })

  console.log(`\n=== RESULTS FOR BASELINE = ${baseVal} ===`)
  console.log(`Min Score: ${min}`)
  console.log(`Max Score: ${max}`)
  console.log(`Average Score: ${avg.toFixed(2)}`)
  console.log(`Median Score: ${median}`)
  console.log('Buckets:')
  console.log(JSON.stringify(buckets, null, 2))
  
  if (baseVal === 65) {
    console.log('\n=== DETAILED SCENARIO SCORES (BASELINE = 65) ===')
    scenarios.forEach((sc, idx) => {
      const score = getReadinessScoreForSim(sc.exerciseId, sc.sessions, sc.goal, baseVal)
      console.log(`${sc.name}: Score = ${score}, Sessions = ${sc.sessions.length}`)
    })
  }
}

// Manual readiness calculator for simulation to support arbitrary baseline
import { getExerciseIntelligence } from '../src/lib/exerciseIntelligence'
import { SEEDED_EXERCISES } from '../src/constants/seeds'
function getReadinessScoreForSim(exerciseId: string, sessions: WorkoutSession[], goal: string, baseline: number): number {
  const intelligence = getExerciseIntelligence(exerciseId, sessions)
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
  const lastSession = intelligence.lastSession!
  const historyLength = intelligence.history.length
  const today = new Date()
  const lastDate = new Date(lastSession.date + 'T00:00:00')
  const diffTime = today.getTime() - lastDate.getTime()
  const daysSinceLastSession = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

  const matchesExercise = (se: any) => {
    const targetName = exercise ? exercise.name.toLowerCase() : ''
    if (se.exerciseId === exerciseId) return true
    if (targetName && se.exercise?.name?.toLowerCase() === targetName) return true
    return false
  }
  const sessionsInLast28Days = sessions.filter(s => {
    return s.completedAt && s.date >= dateAgo(28) && s.exercises.some(matchesExercise)
  })
  const weeklyFrequency = sessionsInLast28Days.length / 4

  let stallDetected = false
  if (historyLength >= 3) {
    const h0 = intelligence.history[0].peakE1RM
    const h1 = intelligence.history[1].peakE1RM
    const h2 = intelligence.history[2].peakE1RM
    stallDetected = h0 <= h1 && h1 <= h2
  }
  
  // check if readyToProgress
  let targetRepsStr = goal === 'strength' ? '5' : '8-12'
  const upperRepLimit = targetRepsStr.includes('-') ? parseInt(targetRepsStr.split('-')[1], 10) : parseInt(targetRepsStr, 10)
  const lowerRepLimit = targetRepsStr.includes('-') ? parseInt(targetRepsStr.split('-')[0], 10) : parseInt(targetRepsStr, 10)
  const targetRepsForProgression = goal === 'strength' ? lowerRepLimit : upperRepLimit
  const completedAllSets = lastSession.sets.length > 0 && lastSession.sets.every(set => set.reps >= targetRepsForProgression)
  
  const previousSessionInfo = intelligence.history[1]
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

  if (readyToProgress) {
    stallDetected = false
  }

  let fatigueWarning = false
  if (historyLength >= 3) {
    const e1rmDeclining = intelligence.history[0].peakE1RM < intelligence.history[1].peakE1RM &&
                          intelligence.history[1].peakE1RM < intelligence.history[2].peakE1RM
    const volumeDeclining = intelligence.history[0].volume < intelligence.history[1].volume &&
                            intelligence.history[1].volume < intelligence.history[2].volume
    fatigueWarning = e1rmDeclining && volumeDeclining
  }

  let score = baseline

  // e1RM Trend
  if (intelligence.trends30d.e1rmPctChange !== null) {
    const chg = intelligence.trends30d.e1rmPctChange
    if (chg > 5) score += 15
    else if (chg > 0) score += 10
    else if (chg < -5) score -= 15
    else if (chg < 0) score -= 10
  } else if (previousSessionInfo) {
    if (lastSession.peakE1RM > previousSessionInfo.peakE1RM) score += 5
    if (lastSession.peakE1RM < previousSessionInfo.peakE1RM) score -= 5
  }

  // Volume Trend
  if (intelligence.trends30d.volumePctChange !== null) {
    const chg = intelligence.trends30d.volumePctChange
    if (chg > 10 && !stallDetected) score += 15
    else if (chg > 0 && !stallDetected) score += 10
    else if (chg < -10) score -= 15
    else if (chg < 0) score -= 10
  } else if (previousSessionInfo) {
    if (lastSession.volume > previousSessionInfo.volume && !stallDetected) score += 5
    if (lastSession.volume < previousSessionInfo.volume) score -= 5
  }

  // PR
  const prE1RM = intelligence.personalRecords.highestE1RM
  if (prE1RM) {
    if (prE1RM.achievedAt === lastSession.date) score += 10
    else if (previousSessionInfo && prE1RM.achievedAt === previousSessionInfo.date) score += 5
  }

  // Consistency
  if (daysSinceLastSession < 21) {
    if (historyLength >= 5) score += 10
    else if (historyLength >= 3) score += 5
  }

  // Recovery gap
  if (daysSinceLastSession >= 21) score -= 15
  else if (daysSinceLastSession >= 14) score -= 10
  else if (daysSinceLastSession >= 7) score -= 5

  // Weekly frequency
  if (weeklyFrequency < 0.75) score -= 10
  else if (weeklyFrequency >= 1.25 && weeklyFrequency <= 2.5) score += 5

  // Flags
  if (stallDetected) score -= 30
  if (fatigueWarning) score -= 30

  return Math.min(100, Math.max(0, score))
}

function getReadinessScoreConservative(exerciseId: string, sessions: WorkoutSession[], goal: string): number {
  const intelligence = getExerciseIntelligence(exerciseId, sessions)
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
  const lastSession = intelligence.lastSession!
  const historyLength = intelligence.history.length
  const today = new Date()
  const lastDate = new Date(lastSession.date + 'T00:00:00')
  const diffTime = today.getTime() - lastDate.getTime()
  const daysSinceLastSession = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

  const matchesExercise = (se: any) => {
    const targetName = exercise ? exercise.name.toLowerCase() : ''
    if (se.exerciseId === exerciseId) return true
    if (targetName && se.exercise?.name?.toLowerCase() === targetName) return true
    return false
  }
  const sessionsInLast28Days = sessions.filter(s => {
    return s.completedAt && s.date >= dateAgo(28) && s.exercises.some(matchesExercise)
  })
  const weeklyFrequency = sessionsInLast28Days.length / 4

  let stallDetected = false
  if (historyLength >= 3) {
    const h0 = intelligence.history[0].peakE1RM
    const h1 = intelligence.history[1].peakE1RM
    const h2 = intelligence.history[2].peakE1RM
    stallDetected = h0 <= h1 && h1 <= h2
  }
  
  // check if readyToProgress
  let targetRepsStr = goal === 'strength' ? '5' : '8-12'
  const upperRepLimit = targetRepsStr.includes('-') ? parseInt(targetRepsStr.split('-')[1], 10) : parseInt(targetRepsStr, 10)
  const lowerRepLimit = targetRepsStr.includes('-') ? parseInt(targetRepsStr.split('-')[0], 10) : parseInt(targetRepsStr, 10)
  const targetRepsForProgression = goal === 'strength' ? lowerRepLimit : upperRepLimit
  const completedAllSets = lastSession.sets.length > 0 && lastSession.sets.every(set => set.reps >= targetRepsForProgression)
  
  const previousSessionInfo = intelligence.history[1]
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

  if (readyToProgress) {
    stallDetected = false
  }

  let fatigueWarning = false
  if (historyLength >= 3) {
    const e1rmDeclining = intelligence.history[0].peakE1RM < intelligence.history[1].peakE1RM &&
                          intelligence.history[1].peakE1RM < intelligence.history[2].peakE1RM
    const volumeDeclining = intelligence.history[0].volume < intelligence.history[1].volume &&
                            intelligence.history[1].volume < intelligence.history[2].volume
    fatigueWarning = e1rmDeclining && volumeDeclining
  }

  let score = 75 // Keep baseline 75

  // e1RM Trend (Conservative)
  if (intelligence.trends30d.e1rmPctChange !== null) {
    const chg = intelligence.trends30d.e1rmPctChange
    if (chg > 5) score += 10
    else if (chg > 0) score += 5
    else if (chg < -5) score -= 10
    else if (chg < 0) score -= 5
  } else if (previousSessionInfo) {
    if (lastSession.peakE1RM > previousSessionInfo.peakE1RM) score += 3
    if (lastSession.peakE1RM < previousSessionInfo.peakE1RM) score -= 3
  }

  // Volume Trend (Conservative)
  if (intelligence.trends30d.volumePctChange !== null) {
    const chg = intelligence.trends30d.volumePctChange
    if (chg > 10 && !stallDetected) score += 10
    else if (chg > 0 && !stallDetected) score += 5
    else if (chg < -10) score -= 10
    else if (chg < 0) score -= 5
  } else if (previousSessionInfo) {
    if (lastSession.volume > previousSessionInfo.volume && !stallDetected) score += 3
    if (lastSession.volume < previousSessionInfo.volume) score -= 3
  }

  // PR (Conservative)
  const prE1RM = intelligence.personalRecords.highestE1RM
  if (prE1RM) {
    if (prE1RM.achievedAt === lastSession.date) score += 5
    else if (previousSessionInfo && prE1RM.achievedAt === previousSessionInfo.date) score += 3
  }

  // Consistency (Conservative)
  if (daysSinceLastSession < 21) {
    if (historyLength >= 5) score += 5
    else if (historyLength >= 3) score += 3
  }

  // Recovery gap (same)
  if (daysSinceLastSession >= 21) score -= 15
  else if (daysSinceLastSession >= 14) score -= 10
  else if (daysSinceLastSession >= 7) score -= 5

  // Weekly frequency (Conservative)
  if (weeklyFrequency < 0.75) score -= 10
  else if (weeklyFrequency >= 1.25 && weeklyFrequency <= 2.5) score += 3

  // Flags (same)
  if (stallDetected) score -= 30
  if (fatigueWarning) score -= 30

  return Math.min(100, Math.max(0, score))
}

function runSimConservative() {
  const scores = scenarios.map(sc => getReadinessScoreConservative(sc.exerciseId, sc.sessions, sc.goal))
  scores.sort((a, b) => a - b)

  const min = scores[0]
  const max = scores[scores.length - 1]
  const sum = scores.reduce((s, x) => s + x, 0)
  const avg = sum / scores.length
  const median = scores.length % 2 === 0
    ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : scores[Math.floor(scores.length / 2)]

  const buckets = {
    '0–39': 0,
    '40–59': 0,
    '60–74': 0,
    '75–89': 0,
    '90–100': 0
  }

  scores.forEach(s => {
    if (s <= 39) buckets['0–39']++
    else if (s <= 59) buckets['40–59']++
    else if (s <= 74) buckets['60–74']++
    else if (s <= 89) buckets['75–89']++
    else buckets['90–100']++
  })

  console.log(`\n=== RESULTS FOR CONSERVATIVE WEIGHTS (BASELINE = 75) ===`)
  console.log(`Min Score: ${min}`)
  console.log(`Max Score: ${max}`)
  console.log(`Average Score: ${avg.toFixed(2)}`)
  console.log(`Median Score: ${median}`)
  console.log('Buckets:')
  console.log(JSON.stringify(buckets, null, 2))
  
  console.log('\n=== DETAILED CONSERVATIVE SCORES ===')
  scenarios.forEach((sc, idx) => {
    const score = getReadinessScoreConservative(sc.exerciseId, sc.sessions, sc.goal)
    console.log(`${sc.name}: Score = ${score}, Sessions = ${sc.sessions.length}`)
  })
}

console.log('=== RUNNING READINESS SCORE AUDIT ===')
runSimForBaseline(75)
runSimForBaseline(70)
runSimForBaseline(65)
runSimConservative()

