import type { WorkoutSession, Exercise } from '../src/types'
import { getProgressionRecommendation } from '../src/lib/progressiveOverload'
import { SEEDED_EXERCISES } from '../src/constants/seeds'

// Helper to generate local YYYY-MM-DD dates relative to today
const dateAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Mocks helper for completed session exercise
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

// Mocks helper for workout session
const mkSession = (id: string, name: string, date: string, exercises: any[], templateId = 'tmpl-push-a'): WorkoutSession => ({
  id,
  name,
  date,
  completedAt: new Date().toISOString(),
  templateId,
  exercises: exercises.map(e => ({ ...e, sessionId: id })),
  createdAt: new Date().toISOString()
})

console.log('=== PROGRESSIVE OVERLOAD ENGINE STANDALONE TESTING ===\n')

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ SUCCESS: ${msg}`)
    passed++
  } else {
    console.log(`❌ FAILURE: ${msg}`)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 1: No History (Insufficient Data)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const rec = getProgressionRecommendation('ex-bench-press', [], 'strength')
  assert(rec.recommendationType === 'insufficient_data', 'Case 1: No history returns insufficient_data')
  assert(rec.confidence === 'low', 'Case 1: No history has low confidence')
} catch (err: any) {
  console.error('Case 1 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 2: Strength Progression (Increase Weight)
// Bench Press (Heavy Compound Upper: barbell + compound + upper body -> +2.5kg)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bench-press' // Barbell compound upper
  const sessions: WorkoutSession[] = [
    // 5 sessions to get High confidence (history.length >= 5) and weeklyFrequency >= 1.0 (4 in last 28 days)
    mkSession('s1', 'Push A', dateAgo(25), [mkSessionExercise(exId, [{ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Push A', dateAgo(18), [mkSessionExercise(exId, [{ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }])]),
    mkSession('s3', 'Push A', dateAgo(12), [mkSessionExercise(exId, [{ weightKg: 82.5, reps: 5 }, { weightKg: 82.5, reps: 5 }, { weightKg: 82.5, reps: 4 }])]),
    mkSession('s4', 'Push A', dateAgo(6), [mkSessionExercise(exId, [{ weightKg: 82.5, reps: 5 }, { weightKg: 82.5, reps: 5 }, { weightKg: 82.5, reps: 5 }])]),
    mkSession('s5', 'Push A', dateAgo(2), [mkSessionExercise(exId, [{ weightKg: 82.5, reps: 5 }, { weightKg: 82.5, reps: 5 }, { weightKg: 82.5, reps: 5 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.recommendationType === 'increase_weight', 'Case 2: Strength progression recommends increase_weight')
  assert(rec.suggestedWeightKg === 85, `Case 2: Bench Press weight increases from 82.5kg to 85kg (+2.5kg). Got: ${rec.suggestedWeightKg}kg`)
  assert(rec.suggestedRepTarget === 5, 'Case 2: Suggested reps matches strength target reps (5)')
  assert(rec.confidence === 'high', `Case 2: High confidence met (5 sessions, gap < 14, freq >= 1). Got: ${rec.confidence}`)
  assert(rec.readinessScore >= 80, `Case 2: Readiness score is high (${rec.readinessScore})`)
} catch (err: any) {
  console.error('Case 2 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 3: Heavy Compound Lower (Squat -> +5kg progression)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-squat' // Barbell compound lower
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Legs A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]),
    mkSession('s2', 'Legs A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.recommendationType === 'increase_weight', 'Case 3: Squat recommends increase_weight')
  assert(rec.suggestedWeightKg === 105, `Case 3: Squat weight increases from 100kg to 105kg (+5kg). Got: ${rec.suggestedWeightKg}kg`)
  assert(rec.confidence === 'low', `Case 3: Low confidence (only 2 sessions). Got: ${rec.confidence}`)
} catch (err: any) {
  console.error('Case 3 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 4: Hypertrophy 80% Threshold Pass (All >= 11 reps on target 8-12)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-incline-bench-press' // Barbell compound upper
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Pull A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }])]),
    mkSession('s2', 'Pull A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 60, reps: 12 }, { weightKg: 60, reps: 12 }, { weightKg: 60, reps: 11 }])])
  ]

  // Target range 8-12 reps. Threshold is (12 - 1) = 11. Working sets: 12, 12, 11 (all >= 11).
  // 100% of sets met the threshold. So thresholdPassed is true.
  const rec = getProgressionRecommendation(exId, sessions, 'hypertrophy')
  assert(rec.recommendationType === 'increase_weight', 'Case 4: Hypertrophy 80% threshold pass recommends increase_weight')
  assert(rec.suggestedWeightKg === 62.5, `Case 4: Weight increases from 60kg to 62.5kg. Got: ${rec.suggestedWeightKg}kg`)
  assert(rec.suggestedRepTarget === 8, 'Case 4: Reps target reset to lower limit (8)')
} catch (err: any) {
  console.error('Case 4 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 5: Hypertrophy 80% Threshold Fail (Sets: 12, 12, 12, 7 -> 75% < 80%)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-incline-bench-press'
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Pull A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 60, reps: 10 }])]),
    mkSession('s2', 'Pull A', dateAgo(3), [mkSessionExercise(exId, [
      { weightKg: 60, reps: 12 },
      { weightKg: 60, reps: 12 },
      { weightKg: 60, reps: 12 },
      { weightKg: 60, reps: 7 } // 7 is below the 11 rep threshold. 3 out of 4 sets reached = 75%.
    ])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'hypertrophy')
  assert(rec.recommendationType === 'increase_reps', 'Case 5: Hypertrophy 80% threshold fail recommends increase_reps')
  assert(rec.suggestedWeightKg === 60, 'Case 5: Weight remains unchanged (60kg)')
  assert(rec.suggestedRepTarget === 12, `Case 5: Suggested rep target is upper target reps (12). Got: ${rec.suggestedRepTarget}`)
  assert(rec.volumeImproving === true, 'Case 5: Volume is improving compared to previous single set session')
} catch (err: any) {
  console.error('Case 5 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 6: Fatigue Warning Trigger (3 consecutive strict declines in e1RM and Volume)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bench-press'
  const sessions: WorkoutSession[] = [
    // Session 1: 100kg x 6 reps (e1RM = 120, Vol = 1800)
    mkSession('s1', 'Push A', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 100, reps: 6 }, { weightKg: 100, reps: 6 }, { weightKg: 100, reps: 6 }])]),
    // Session 2: 100kg x 5 reps (e1RM = 117, Vol = 1500) - e1RM and Vol declined
    mkSession('s2', 'Push A', dateAgo(8), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]),
    // Session 3: 95kg x 5 reps (e1RM = 111, Vol = 1425) - e1RM and Vol declined again
    mkSession('s3', 'Push A', dateAgo(2), [mkSessionExercise(exId, [{ weightKg: 95, reps: 5 }, { weightKg: 95, reps: 5 }, { weightKg: 95, reps: 5 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.fatigueWarning === true, 'Case 6: Fatigue warning is correctly triggered')
  assert(rec.recommendationType === 'maintain', 'Case 6: Fatigue warning overrides stall/deload and recommends maintain first')
  assert(rec.suggestedWeightKg === 95, `Case 6: Weight is maintained at last max load (95kg). Got: ${rec.suggestedWeightKg}`)
  assert(rec.reason.includes('Recovery may be limiting'), 'Case 6: Reason contains recovery/fatigue warning context')
} catch (err: any) {
  console.error('Case 6 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 7: Stall Deload Trigger (3 consecutive stagnant e1RM, stable/improving volume)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bench-press'
  const sessions: WorkoutSession[] = [
    // Session 1: 100kg x 5 (e1RM = 117, Vol = 1500)
    mkSession('s1', 'Push A', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]),
    // Session 2: 100kg x 5 (e1RM = 117, Vol = 2000) - e1RM stagnant, Vol improved (4 sets)
    mkSession('s2', 'Push A', dateAgo(8), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]),
    // Session 3: 100kg x 5 (e1RM = 117, Vol = 2500) - e1RM stagnant, Vol improved (5 sets)
    mkSession('s3', 'Push A', dateAgo(2), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.fatigueWarning === false, 'Case 7: Fatigue warning is NOT triggered (volume is improving)')
  assert(rec.stallDetected === true, 'Case 7: Stall is detected (peak e1RM stagnant over 3 sessions)')
  assert(rec.recommendationType === 'deload', 'Case 7: Stall recommends deload')
  assert(rec.suggestedWeightKg === 90, `Case 7: Deload weight is exactly 90% of last max (90kg). Got: ${rec.suggestedWeightKg}kg`)
  assert(rec.readinessScore <= 50, `Case 7: Readiness score dropped significantly due to stall penalty. Got: ${rec.readinessScore}`)
} catch (err: any) {
  console.error('Case 7 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 8: Bodyweight Progression Logic (Pull-Ups -> prefer reps progression)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-pull-up' // Bodyweight exercise, equipment: Bodyweight
  const sessions: WorkoutSession[] = [
    // Completed all sets at target and improved, but it is bodyweight
    mkSession('s1', 'Pull A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 0, reps: 8 }, { weightKg: 0, reps: 8 }])]),
    mkSession('s2', 'Pull A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 0, reps: 10 }, { weightKg: 0, reps: 10 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'hypertrophy')
  assert(rec.recommendationType === 'increase_reps', 'Case 8: Bodyweight exercise recommends increase_reps instead of weight')
  assert(rec.suggestedWeightKg === 0, `Case 8: Suggested weight is kept at 0. Got: ${rec.suggestedWeightKg}`)
  assert(rec.suggestedRepTarget === 11, `Case 8: Suggested reps target progresses to 11. Got: ${rec.suggestedRepTarget}`)
} catch (err: any) {
  console.error('Case 8 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 9: Weekly Frequency & Recovery Gap Adjustments
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bicep-curl' // Dumbbell isolation
  const sessions: WorkoutSession[] = [
    // 5 sessions, but gap is 25 days (daysSinceLastSession >= 21) -> Low confidence & -15 gap penalty & -10 low frequency penalty
    mkSession('s1', 'Pull A', dateAgo(60), [mkSessionExercise(exId, [{ weightKg: 10, reps: 10 }])]),
    mkSession('s2', 'Pull A', dateAgo(50), [mkSessionExercise(exId, [{ weightKg: 10, reps: 10 }])]),
    mkSession('s3', 'Pull A', dateAgo(40), [mkSessionExercise(exId, [{ weightKg: 10, reps: 10 }])]),
    mkSession('s4', 'Pull A', dateAgo(32), [mkSessionExercise(exId, [{ weightKg: 10, reps: 10 }])]),
    mkSession('s5', 'Pull A', dateAgo(29), [mkSessionExercise(exId, [{ weightKg: 10, reps: 10 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.daysSinceLastSession !== null && rec.daysSinceLastSession >= 21, `Case 9: Days since last session matches gap of 29 days. Got: ${rec.daysSinceLastSession}`)
  assert(rec.weeklyFrequency === 0, `Case 9: Weekly frequency in last 28 days is 0. Got: ${rec.weeklyFrequency}`)
  assert(rec.confidence === 'low', `Case 9: Large gap (>=21 days) forces Low confidence. Got: ${rec.confidence}`)
  assert(rec.readinessScore <= 50, `Case 9: Readiness score penalized heavily due to gap and low frequency. Got: ${rec.readinessScore}`)
} catch (err: any) {
  console.error('Case 9 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 10: Maintenance Mode
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bicep-curl'
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Pull A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 12, reps: 10 }])]),
    mkSession('s2', 'Pull A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 12, reps: 10 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'maintenance')
  assert(rec.recommendationType === 'maintain', 'Case 10: Maintenance mode defaults to maintain')
  assert(rec.suggestedWeightKg === 12, 'Case 10: Suggested weight remains unchanged')
  assert(rec.suggestedRepTarget === 10, 'Case 10: Suggested reps remains unchanged')
} catch (err: any) {
  console.error('Case 10 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 11: Very High Frequency (>2.5x/week -> weeklyFrequency > 2.5)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bench-press'
  const sessions: WorkoutSession[] = []
  // 12 sessions in last 24 days (trained every 2 days) with progression to avoid stall
  for (let s = 1; s <= 12; s++) {
    const reps = s <= 4 ? 5 : (s <= 8 ? 6 : 7)
    sessions.push(mkSession(`s${s}`, 'Push A', dateAgo(26 - s * 2), [mkSessionExercise(exId, [{ weightKg: 80, reps }])]))
  }

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.weeklyFrequency === 3.0, `Case 11: Weekly frequency is 3.0. Got: ${rec.weeklyFrequency}`)
  assert(rec.confidence === 'high', `Case 11: High frequency supports High confidence. Got: ${rec.confidence}`)
  assert(rec.readinessScore === 100, `Case 11: Readiness score is capped at 100. Got: ${rec.readinessScore}`)
} catch (err: any) {
  console.error('Case 11 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 12: Long Layoff (>60 days)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bench-press'
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(65), [mkSessionExercise(exId, [{ weightKg: 80, reps: 5 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.daysSinceLastSession !== null && rec.daysSinceLastSession >= 60, `Case 12: Days since last session is >= 60 days. Got: ${rec.daysSinceLastSession}`)
  assert(rec.confidence === 'low', `Case 12: Long layoff forces Low confidence. Got: ${rec.confidence}`)
  assert(rec.readinessScore <= 60, `Case 12: Readiness score is heavily penalized due to layoff. Got: ${rec.readinessScore}`)
} catch (err: any) {
  console.error('Case 12 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 13: New PR with Declining Volume
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bench-press'
  const sessions: WorkoutSession[] = [
    // Session 1: 90kg x 5 (e1RM = 105, Vol = 900 - 2 sets)
    mkSession('s1', 'Push A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 90, reps: 5 }, { weightKg: 90, reps: 5 }])]),
    // Session 2: 95kg x 5 (e1RM = 110.83 - PR!, Vol = 475 - 1 set) - e1RM improved, Vol decreased
    mkSession('s2', 'Push A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 95, reps: 5 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.potentialPR === true, `Case 13: Potential PR is true since next recommended load would set a new PR. Got: ${rec.potentialPR}`)
  assert(rec.recommendationType === 'increase_weight', `Case 13: Recommends increase_weight. Got: ${rec.recommendationType}`)
  assert(rec.suggestedWeightKg === 97.5, `Case 13: Weight increases from 95kg to 97.5kg (+2.5kg compound upper). Got: ${rec.suggestedWeightKg}`)
} catch (err: any) {
  console.error('Case 13 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 14: Bodyweight Exercise with External Load (Weighted Pull-Up)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-weighted-pull-up' // equipment: Other, isCustom: false
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Pull A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 10, reps: 5 }])]),
    mkSession('s2', 'Pull A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 10, reps: 5 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.recommendationType === 'increase_weight', `Case 14: Recommends weight progression for weighted bodyweight. Got: ${rec.recommendationType}`)
  assert(rec.suggestedWeightKg === 12.5, `Case 14: Weight progresses from 10kg to 12.5kg (+2.5kg heavy compound upper). Got: ${rec.suggestedWeightKg}`)
} catch (err: any) {
  console.error('Case 14 Error:', err.message)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE 15: Machine Isolation Progression (Leg Extension)
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-leg-extension' // Machine isolation lower, type: isolation
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Legs A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 40, reps: 20 }, { weightKg: 40, reps: 20 }])]),
    mkSession('s2', 'Legs A', dateAgo(3), [mkSessionExercise(exId, [{ weightKg: 40, reps: 20 }, { weightKg: 40, reps: 20 }])])
  ]

  const rec = getProgressionRecommendation(exId, sessions, 'hypertrophy')
  assert(rec.recommendationType === 'increase_weight', `Case 15: Recommends increase_weight. Got: ${rec.recommendationType}`)
  assert(rec.suggestedWeightKg === 41.0, `Case 15: Leg Extension weight progresses from 40kg to 41kg (+1kg isolation increment). Got: ${rec.suggestedWeightKg}`)
} catch (err: any) {
  console.error('Case 15 Error:', err.message)
  failed++
}

console.log(`\n=== TEST RUN RESULTS: ${passed} passed, ${failed} failed ===`)
if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
