import type { WorkoutSession, Exercise, Measurement, WeightLog } from '../src/types'
import { getRecompositionReport, generateRecompositionCoachContext } from '../src/lib/recompositionIntelligence'

// Helper to generate local YYYY-MM-DD dates relative to today
const dateAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Helper to generate a SessionExercise
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

// Helper to generate a Completed Workout Session
const mkSession = (id: string, name: string, date: string, exercises: any[]): WorkoutSession => ({
  id,
  name,
  date,
  completedAt: new Date().toISOString(),
  exercises: exercises.map(e => ({ ...e, sessionId: id })),
  createdAt: new Date().toISOString()
})

console.log('=== FitOS RECOMPOSITION INTELLIGENCE VERIFICATION TESTS ===\n')

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ SUCCESS: ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAILURE: ${msg}`)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Set up common Mock Exercises (from SEEDED_EXERCISES IDs)
// ─────────────────────────────────────────────────────────────────────────────
const benchPressId = 'ex-bench-press'
const squatId = 'ex-squat'
const deadliftId = 'ex-deadlift'

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: Successful Recomposition
// ─────────────────────────────────────────────────────────────────────────────
console.log('Scenario 1: Testing Successful Recomposition')
try {
  // Weight stable (+/- 1kg), Waist decreasing (-2cm), Strength increasing (+10%)
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 86.0, chestCm: 102.0, weightKg: 76.4, neckCm: 37.0 },
    { id: 'm2', date: dateAgo(15), waistCm: 85.0, chestCm: 102.0, weightKg: 76.3, neckCm: 37.0 },
    { id: 'm3', date: dateAgo(1), waistCm: 84.0, chestCm: 102.0, weightKg: 76.2, neckCm: 37.0 }
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(30), weightKg: 76.4, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(1), weightKg: 76.2, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Legs A', dateAgo(30), [mkSessionExercise(squatId, [{ weightKg: 100, reps: 5 }])]),
    mkSession('s3', 'Push A', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 88, reps: 5 }])]), // e1RM up 10%
    mkSession('s4', 'Legs A', dateAgo(1), [mkSessionExercise(squatId, [{ weightKg: 110, reps: 5 }])])  // e1RM up 10%
  ]

  const report = getRecompositionReport(measurements, weightLogs, sessions)

  assert(report.status === 'successful_recomp', 'S1: Classification must be successful_recomp')
  assert(report.bodyFatTrend === 'decreasing', 'S1: Body fat trend must be decreasing')
  assert(report.weightTrend.change === -0.2, `S1: Weight change correct (-0.2kg). Got: ${report.weightTrend.change}`)
  assert(report.waistTrend.change === -2.0, `S1: Waist change correct (-2.0cm). Got: ${report.waistTrend.change}`)
  assert(report.strengthTrend.avgStrengthChange !== null && report.strengthTrend.avgStrengthChange >= 9.0, `S1: Avg strength change correct (~10%). Got: ${report.strengthTrend.avgStrengthChange}%`)
  assert(report.confidence >= 80, `S1: Confidence score high (>= 80). Got: ${report.confidence}`)
  assert(report.explanation.includes('losing fat and gaining muscle'), 'S1: Explanation indicates both fat loss and muscle gain')
} catch (err: any) {
  console.error('Scenario 1 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Lean Bulk
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 2: Testing Lean Bulk')
try {
  // Weight slowly increasing (+0.8kg), Waist stable (+0.1cm), Strength increasing (+5%)
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 82.0, weightKg: 75.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 82.1, weightKg: 75.8 }
  ]
  const weightLogs: WeightLog[] = []
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Push A', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 84, reps: 5 }])]) // e1RM up 5%
  ]

  const report = getRecompositionReport(measurements, weightLogs, sessions)

  assert(report.status === 'lean_bulk', 'S2: Classification must be lean_bulk')
  assert(report.bodyFatTrend === 'stable', 'S2: Body fat trend must be stable')
  assert(report.weightTrend.change === 0.8, `S2: Weight change correct (0.8kg). Got: ${report.weightTrend.change}`)
  assert(report.waistTrend.change === 0.1, `S2: Waist change correct (0.1cm). Got: ${report.waistTrend.change}`)
  assert(report.strengthTrend.avgStrengthChange === 5.4, `S2: Avg strength change correct (5.4%). Got: ${report.strengthTrend.avgStrengthChange}`)
  assert(report.explanation.includes('lean bulk with minimal fat gain'), 'S2: Explanation highlights lean bulk')
} catch (err: any) {
  console.error('Scenario 2 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Aggressive Bulk
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 3: Testing Aggressive Bulk')
try {
  // Weight rapidly increasing (+2.2kg), Waist rapidly increasing (+1.4cm), Strength lagging (+0%)
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 82.0, weightKg: 75.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 83.4, weightKg: 77.2 }
  ]
  const weightLogs: WeightLog[] = []
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Push A', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]) // e1RM flat
  ]

  const report = getRecompositionReport(measurements, weightLogs, sessions)

  assert(report.status === 'aggressive_bulk', 'S3: Classification must be aggressive_bulk')
  assert(report.bodyFatTrend === 'increasing', 'S3: Body fat trend must be increasing')
  assert(report.weightTrend.change === 2.2, `S3: Weight change correct (2.2kg). Got: ${report.weightTrend.change}`)
  assert(report.waistTrend.change === 1.4, `S3: Waist change correct (1.4cm). Got: ${report.waistTrend.change}`)
  assert(report.strengthTrend.avgStrengthChange === 0, `S3: Strength change correct (0%). Got: ${report.strengthTrend.avgStrengthChange}`)
  assert(report.explanation.includes('surplus is too high'), 'S3: Explanation calls out excessive surplus')
} catch (err: any) {
  console.error('Scenario 3 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Fat Loss (Losing Fat)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 4: Testing Fat Loss (Losing Fat)')
try {
  // Weight decreasing (-1.8kg), Waist decreasing (-1.5cm), Strength stable (+0%)
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 88.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 86.5, weightKg: 78.2 }
  ]
  const weightLogs: WeightLog[] = []
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 90, reps: 5 }])]),
    mkSession('s2', 'Push A', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 90, reps: 5 }])]) // e1RM flat
  ]

  const report = getRecompositionReport(measurements, weightLogs, sessions)

  assert(report.status === 'losing_fat', 'S4: Classification must be losing_fat')
  assert(report.bodyFatTrend === 'decreasing', 'S4: Body fat trend must be decreasing')
  assert(report.weightTrend.change === -1.8, `S4: Weight change correct (-1.8kg). Got: ${report.weightTrend.change}`)
  assert(report.waistTrend.change === -1.5, `S4: Waist change correct (-1.5cm). Got: ${report.waistTrend.change}`)
  assert(report.explanation.includes('successfully losing fat'), 'S4: Explanation highlights successful fat loss')
} catch (err: any) {
  console.error('Scenario 4 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Aggressive Cut
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 5: Testing Aggressive Cut')
try {
  // Weight dropping rapidly (-3.5kg), Strength declining (-4%), Recovery declining
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 88.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 86.0, weightKg: 76.5 }
  ]
  const weightLogs: WeightLog[] = []
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 90, reps: 5 }])]),
    mkSession('s2', 'Push A', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 86.4, reps: 5 }])]) // e1RM down 4%
  ]

  const report = getRecompositionReport(measurements, weightLogs, sessions)

  assert(report.status === 'aggressive_cut', 'S5: Classification must be aggressive_cut')
  assert(report.bodyFatTrend === 'decreasing', 'S5: Body fat trend must be decreasing')
  assert(report.weightTrend.change === -3.5, `S5: Weight change correct (-3.5kg). Got: ${report.weightTrend.change}`)
  assert(report.strengthTrend.avgStrengthChange === -3.8, `S5: Strength change correct (-3.8%). Got: ${report.strengthTrend.avgStrengthChange}`)
  assert(report.explanation.includes('cutting calories too aggressively'), 'S5: Explanation warns about muscle loss')
} catch (err: any) {
  console.error('Scenario 5 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 6: Stalled
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 6: Testing Stalled')
try {
  // Weight stable (+/-0.1kg), Waist stable (+/-0.1cm), Strength stable (+0.5%)
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 85.0, weightKg: 78.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 85.1, weightKg: 78.1 }
  ]
  const weightLogs: WeightLog[] = []
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 90, reps: 5 }])]),
    mkSession('s2', 'Push A', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 90.5, reps: 5 }])]) // e1RM up 0.5%
  ]

  const report = getRecompositionReport(measurements, weightLogs, sessions)

  assert(report.status === 'stalled', 'S6: Classification must be stalled')
  assert(report.bodyFatTrend === 'stable', 'S6: Body fat trend must be stable')
  assert(report.weightTrend.change === 0.1, `S6: Weight change correct (0.1kg). Got: ${report.weightTrend.change}`)
  assert(report.waistTrend.change === 0.1, `S6: Waist change correct (0.1cm). Got: ${report.waistTrend.change}`)
  assert(report.explanation.includes('progress appears stalled'), 'S6: Explanation notes stalled state')
} catch (err: any) {
  console.error('Scenario 6 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 7: Insufficient Data
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 7: Testing Insufficient Data')
try {
  // Fewer than 2 logs in 30 days
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(1), waistCm: 85.0, weightKg: 78.0 }
  ]
  const weightLogs: WeightLog[] = []
  const sessions: WorkoutSession[] = []

  const report = getRecompositionReport(measurements, weightLogs, sessions)

  assert(report.status === 'insufficient_data', 'S7: Classification must be insufficient_data')
  assert(report.confidence === 0, `S7: Confidence should be 0. Got: ${report.confidence}`)
  assert(report.explanation.includes('Insufficient measurement data'), 'S7: Explanation flags insufficient data')
} catch (err: any) {
  console.error('Scenario 7 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 8: Conservative Body Fat Trend Logic (Waist stable but weight down)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 8: Testing Body Fat Trend edge-cases')
try {
  // Weight drops significantly (-2.0kg) but waist is stable (-0.1cm). Fat loss should still be decreasing.
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 85.0, weightKg: 78.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 84.9, weightKg: 76.0 }
  ]
  const report = getRecompositionReport(measurements, [], [])
  assert(report.bodyFatTrend === 'decreasing', `S8: Body fat trend should be decreasing (waist stable, weight down). Got: ${report.bodyFatTrend}`)

  // Weight increases significantly (+2.0kg) but waist is stable (+0.1cm). Fat loss should be increasing.
  const measurementsInc: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 85.0, weightKg: 78.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 85.1, weightKg: 80.0 }
  ]
  const reportInc = getRecompositionReport(measurementsInc, [], [])
  assert(reportInc.bodyFatTrend === 'increasing', `S8: Body fat trend should be increasing (waist stable, weight up). Got: ${reportInc.bodyFatTrend}`)
} catch (err: any) {
  console.error('Scenario 8 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 9: AI Coach context generation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 9: Testing AI Coach Context Generation')
try {
  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 86.0, chestCm: 102.0, weightKg: 76.4, neckCm: 37.0 },
    { id: 'm2', date: dateAgo(1), waistCm: 84.0, chestCm: 102.0, weightKg: 76.2, neckCm: 37.0 }
  ]
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push A', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Push A', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 88, reps: 5 }])])
  ]
  const report = getRecompositionReport(measurements, [], sessions)
  const context = generateRecompositionCoachContext(report, measurements[1])

  console.log('\nGenerated Coach Prompt Context:\n', context, '\n')

  assert(context.includes('PHYSICAL MEASUREMENTS & RECOMPOSITION'), 'S9: Context includes headers')
  assert(context.includes('Recomposition Classification: successful_recomp'), 'S9: Context includes classification')
  assert(context.includes('Weight Change (30d): -0.2 kg'), 'S9: Context includes weight change details')
  assert(context.includes('Waist Change (30d): -2 cm'), 'S9: Context includes waist change details')
  assert(context.includes('- Chest: 102 cm'), 'S9: Context lists Chest measurement')
  assert(context.includes('- Neck: 37 cm'), 'S9: Context lists Neck measurement')
  assert(context.includes('Average Strength Change (30d): +10.8%'), 'S9: Context lists strength change')
} catch (err: any) {
  console.error('Scenario 9 Error:', err.stack)
  failed++
}

console.log(`\n=== RESULTS: ${passed} / ${passed + failed} assertions passed ===`)
if (failed > 0) {
  process.exit(1)
} else {
  process.exit(0)
}
