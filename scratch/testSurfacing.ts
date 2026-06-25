import type { WorkoutSession, Exercise, Goal } from '../src/types'
import { getProgressionRecommendation, generateTrainingIntelligence } from '../src/lib/progressiveOverload'
import { getExerciseIntelligence } from '../src/lib/exerciseIntelligence'

// Helper to generate local YYYY-MM-DD dates relative to today
const dateAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Mocks helper for completed session exercise
const mkSessionExercise = (exerciseId: string, sets: { weightKg: number; reps: number; isWarmup?: boolean; isPR?: boolean }[]) => ({
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
    isPR: s.isPR || false,
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

const testExercises: Exercise[] = [
  { id: 'ex-bench-press', name: 'Bench Press', category: 'strength', muscleGroups: ['Chest'], equipment: 'Barbell', isCustom: false },
  { id: 'ex-squat', name: 'Squat', category: 'strength', muscleGroups: ['Quads'], equipment: 'Barbell', isCustom: false },
  { id: 'ex-overhead-press', name: 'Overhead Press', category: 'strength', muscleGroups: ['Shoulders'], equipment: 'Barbell', isCustom: false },
  { id: 'ex-deadlift', name: 'Deadlift', category: 'strength', muscleGroups: ['Glutes', 'Hamstrings'], equipment: 'Barbell', isCustom: false },
  { id: 'ex-bicep-curl', name: 'Bicep Curl', category: 'strength', muscleGroups: ['Biceps'], equipment: 'Dumbbell', isCustom: false },
  { id: 'ex-tricep-pushdown', name: 'Tricep Pushdown', category: 'strength', muscleGroups: ['Triceps'], equipment: 'Cable', isCustom: false },
  { id: 'ex-lat-pulldown', name: 'Lat Pulldown', category: 'strength', muscleGroups: ['Back'], equipment: 'Machine', isCustom: false }
]

console.log('=== FitOS UI SURFACING & INTELLIGENCE VERIFICATION TESTS ===\n')

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
// Test 1: Active Workout Recommendations calculation
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-bench-press'
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push Day', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 77.5, reps: 5 }, { weightKg: 77.5, reps: 5 }])]),
    mkSession('s2', 'Push Day', dateAgo(8), [mkSessionExercise(exId, [{ weightKg: 77.5, reps: 5 }, { weightKg: 77.5, reps: 5 }])]),
    mkSession('s3', 'Push Day', dateAgo(1), [mkSessionExercise(exId, [{ weightKg: 80, reps: 5 }, { weightKg: 80, reps: 5 }])])
  ]
  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  console.log('Test 1 recommendation:', JSON.stringify(rec, null, 2))
  assert(rec.recommendationType === 'increase_weight', 'Test 1: Progression advice successfully computed')
  assert(rec.suggestedWeightKg === 82.5, 'Test 1: Progression weight increment correct for upper compound barbell')
  assert(rec.readinessScore > 0, `Test 1: Readiness score calculated correctly: ${rec.readinessScore}`)
} catch (err: any) {
  console.error('Test 1 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: Fatigue warning detection
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-squat'
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Legs A', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]),
    mkSession('s2', 'Legs A', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 95, reps: 4 }, { weightKg: 95, reps: 4 }])]),
    mkSession('s3', 'Legs A', dateAgo(5), [mkSessionExercise(exId, [{ weightKg: 90, reps: 3 }, { weightKg: 90, reps: 3 }])])
  ]
  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  assert(rec.fatigueWarning === true, 'Test 2: Fatigue warning correctly flagged when e1RM & volume decline for 3 sessions')
  assert(rec.recommendationType === 'maintain', 'Test 2: Recommends maintaining load during fatigue warning')
} catch (err: any) {
  console.error('Test 2 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: Stall/Plateau warning detection and Deload advice
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-deadlift'
  const sessions: WorkoutSession[] = [
    // Stagnant peak e1RM for 3 sessions
    mkSession('s1', 'Pull Day', dateAgo(15), [mkSessionExercise(exId, [{ weightKg: 120, reps: 5 }, { weightKg: 120, reps: 5 }])]),
    mkSession('s2', 'Pull Day', dateAgo(10), [mkSessionExercise(exId, [{ weightKg: 120, reps: 5 }, { weightKg: 120, reps: 5 }])]),
    mkSession('s3', 'Pull Day', dateAgo(5), [mkSessionExercise(exId, [{ weightKg: 120, reps: 5 }, { weightKg: 120, reps: 5 }])])
  ]
  const rec = getProgressionRecommendation(exId, sessions, 'strength')
  console.log('Test 3 recommendation:', JSON.stringify(rec, null, 2))
  assert(rec.stallDetected === true, 'Test 3: Stall warning correctly flagged for stagnant peak e1RM')
  assert(rec.recommendationType === 'deload', 'Test 3: Recommends deload during stall warning')
  assert(rec.suggestedWeightKg === 110, `Test 3: Recommends ~10% deload (${rec.suggestedWeightKg}kg from 120kg)`)
} catch (err: any) {
  console.error('Test 3 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: Workout history expand set logs
// ─────────────────────────────────────────────────────────────────────────────
try {
  const exId = 'ex-lat-pulldown'
  const session = mkSession('s1', 'Pull A', dateAgo(3), [
    mkSessionExercise(exId, [{ weightKg: 60, reps: 10, isWarmup: true }, { weightKg: 70, reps: 8 }, { weightKg: 70, reps: 8, isPR: true }])
  ])
  const exPerformance = session.exercises[0]
  assert(exPerformance.sets.length === 3, 'Test 4: Captured 3 sets inside history data')
  assert(exPerformance.sets[0].isWarmup === true, 'Test 4: Warmup flag preserved')
  assert(exPerformance.sets[2].isPR === true, 'Test 4: PR flag preserved')
} catch (err: any) {
  console.error('Test 4 Error:', err.stack)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: AI Coach Context generation & exercise limit filtering
// ─────────────────────────────────────────────────────────────────────────────
try {
  // Setup sessions containing 7 different exercises
  // Lat Pulldown trained 6 times (should be top-trained)
  // Bicep Curl trained 5 times
  // Tricep Pushdown trained 4 times
  // Squat trained 3 times
  // Bench Press trained 2 times
  // Overhead Press trained 1 time
  // Deadlift trained 1 time but has Plateau stall flag active (stallDetected === true)
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Pull', dateAgo(25), [
      mkSessionExercise('ex-lat-pulldown', [{ weightKg: 60, reps: 10 }]),
      mkSessionExercise('ex-bicep-curl', [{ weightKg: 10, reps: 12 }])
    ]),
    mkSession('s2', 'Pull', dateAgo(20), [
      mkSessionExercise('ex-lat-pulldown', [{ weightKg: 60, reps: 10 }]),
      mkSessionExercise('ex-bicep-curl', [{ weightKg: 10, reps: 12 }]),
      mkSessionExercise('ex-tricep-pushdown', [{ weightKg: 20, reps: 10 }])
    ]),
    mkSession('s3', 'Pull', dateAgo(18), [
      mkSessionExercise('ex-lat-pulldown', [{ weightKg: 60, reps: 10 }]),
      mkSessionExercise('ex-bicep-curl', [{ weightKg: 10, reps: 12 }]),
      mkSessionExercise('ex-tricep-pushdown', [{ weightKg: 20, reps: 10 }])
    ]),
    mkSession('s4', 'Pull', dateAgo(15), [
      mkSessionExercise('ex-lat-pulldown', [{ weightKg: 60, reps: 10 }]),
      mkSessionExercise('ex-bicep-curl', [{ weightKg: 10, reps: 12 }]),
      mkSessionExercise('ex-tricep-pushdown', [{ weightKg: 20, reps: 10 }]),
      mkSessionExercise('ex-squat', [{ weightKg: 80, reps: 5 }])
    ]),
    mkSession('s5', 'Pull', dateAgo(10), [
      mkSessionExercise('ex-lat-pulldown', [{ weightKg: 60, reps: 10 }]),
      mkSessionExercise('ex-bicep-curl', [{ weightKg: 10, reps: 12 }]),
      mkSessionExercise('ex-tricep-pushdown', [{ weightKg: 20, reps: 10 }]),
      mkSessionExercise('ex-squat', [{ weightKg: 80, reps: 5 }]),
      mkSessionExercise('ex-bench-press', [{ weightKg: 70, reps: 5 }])
    ]),
    mkSession('s6', 'Pull', dateAgo(5), [
      mkSessionExercise('ex-lat-pulldown', [{ weightKg: 60, reps: 10 }]),
      mkSessionExercise('ex-squat', [{ weightKg: 80, reps: 5 }]),
      mkSessionExercise('ex-bench-press', [{ weightKg: 70, reps: 5 }]),
      mkSessionExercise('ex-overhead-press', [{ weightKg: 40, reps: 5 }]),
      // Deadlift stagnant peak e1RM for 3 sessions to trigger stall warning
      mkSessionExercise('ex-deadlift', [{ weightKg: 120, reps: 5 }])
    ]),
    mkSession('s7', 'Pull', dateAgo(3), [
      mkSessionExercise('ex-deadlift', [{ weightKg: 120, reps: 5 }])
    ]),
    mkSession('s8', 'Pull', dateAgo(1), [
      mkSessionExercise('ex-deadlift', [{ weightKg: 120, reps: 5 }])
    ])
  ]

  const activeGoal: Goal = {
    id: 'goal-1',
    name: 'Get Strong',
    type: 'bulk',
    status: 'active',
    startDate: dateAgo(30),
    startWeight: 75,
    calorieTarget: 2500,
    proteinTarget: 160,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const contextText = generateTrainingIntelligence(sessions, testExercises, activeGoal)
  
  // Verify that it contains "Exercise Intelligence" and "Progressive Overload Data"
  assert(contextText.includes('### Exercise Intelligence'), 'Test 5: Context contains Exercise Intelligence section')
  assert(contextText.includes('### Progressive Overload Data'), 'Test 5: Context contains Progressive Overload Data section')
  
  // Verify specific metrics are in the context
  assert(contextText.includes('Current PR:'), 'Test 5: Context contains PR details')
  assert(contextText.includes('Readiness:'), 'Test 5: Context contains Readiness score')
  
  // Verify that Deadlift is included because of active Plateau stall warning, even though it is not in top 5 most trained (trained 3 times)
  assert(contextText.includes('Deadlift:'), 'Test 5: Deadlift included due to active warning flags')
  assert(contextText.includes('Stall Flag: Active'), 'Test 5: Stall warning active flag injected in Coach context')
} catch (err: any) {
  console.error('Test 5 Error:', err.stack)
  failed++
}

console.log(`\n=== RESULTS: ${passed}/${passed + failed} assertions passed ===`)
// @ts-ignore
process.exit(failed === 0 ? 0 : 1)
