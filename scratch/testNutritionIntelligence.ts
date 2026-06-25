import type { WorkoutSession, Measurement, WeightLog, FoodLog, Goal, Profile } from '../src/types'
import { getNutritionRecommendation, getNutritionAnalytics, generateNutritionCoachContext } from '../src/lib/nutritionIntelligence'

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

console.log('=== FitOS NUTRITION & GOAL INTELLIGENCE VERIFICATION TESTS ===\n')

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

const benchPressId = 'ex-bench-press'
const squatId = 'ex-squat'

const defaultProfile: Profile = {
  id: 'p1',
  displayName: 'User',
  weightUnit: 'kg',
  energyUnit: 'kcal',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: Successful Recomp
// ─────────────────────────────────────────────────────────────────────────────
console.log('Scenario 1: Testing Successful Recomp')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Recomp Phase',
    type: 'maintain',
    status: 'active',
    startDate: dateAgo(30),
    startWeight: 75,
    calorieTarget: 2200,
    proteinTarget: 160,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(30), waistCm: 86.0, weightKg: 75.0 },
    { id: 'm2', date: dateAgo(15), waistCm: 85.0, weightKg: 75.0 },
    { id: 'm3', date: dateAgo(1), waistCm: 84.0, weightKg: 75.0 }
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(30), weightKg: 75.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(1), weightKg: 75.0, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push', dateAgo(30), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Push', dateAgo(1), [mkSessionExercise(benchPressId, [{ weightKg: 88, reps: 5 }])])
  ]
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'maintain_calories', `S1: Status must be maintain_calories. Got: ${rec.status}`)
  assert(rec.currentCalories === 2200, `S1: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2200, `S1: Recommended calories should be 2200. Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 160, `S1: Current protein correct. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 150, `S1: Recommended protein should be 150g (2.0g/kg of 75kg). Got: ${rec.recommendedProtein}`)
  assert(rec.confidence >= 70, `S1: Confidence should be high. Got: ${rec.confidence}`)
  assert(rec.reason.toLowerCase().includes('recomposition'), `S1: Reason should mention recomposition. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 1 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Lean Bulk
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 2: Testing Lean Bulk')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Bulking Phase',
    type: 'bulk',
    status: 'active',
    startDate: dateAgo(30),
    startWeight: 80,
    calorieTarget: 2800,
    proteinTarget: 160,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 88.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(14), waistCm: 88.0, weightKg: 80.7 },
    { id: 'm3', date: dateAgo(0), waistCm: 88.0, weightKg: 81.4 } // 1.4kg over 28 days = 0.35kg/week
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 80.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 81.4, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push', dateAgo(28), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Push', dateAgo(0), [mkSessionExercise(benchPressId, [{ weightKg: 84, reps: 5 }])])
  ]
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'maintain_calories', `S2: Status must be maintain_calories. Got: ${rec.status}`)
  assert(rec.currentCalories === 2800, `S2: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2800, `S2: Recommended calories should be 2800. Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 160, `S2: Current protein correct. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 147, `S2: Recommended protein should be 147g (1.8g/kg of 81.4kg). Got: ${rec.recommendedProtein}`)
  assert(rec.confidence >= 70, `S2: Confidence is valid. Got: ${rec.confidence}`)
  assert(rec.reason.toLowerCase().includes('lean bulk'), `S2: Reason should mention lean bulk. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 2 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Aggressive Bulk
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 3: Testing Aggressive Bulk')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Bulk Phase',
    type: 'bulk',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 3000,
    proteinTarget: 160,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 85.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(0), waistCm: 86.2, weightKg: 83.6 } // 3.6kg over 28 days = 0.9kg/week (>0.75), waist up 1.2cm (>=0.5)
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 80.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 83.6, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = []
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'reduce_rate_of_gain', `S3: Status must be reduce_rate_of_gain. Got: ${rec.status}`)
  assert(rec.currentCalories === 3000, `S3: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2850, `S3: Recommended calories should be 2850 (3000 - 150). Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 160, `S3: Current protein correct. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 150, `S3: Recommended protein correct (1.8g/kg of 83.6kg). Got: ${rec.recommendedProtein}`)
  assert(rec.reason.toLowerCase().includes('too fast'), `S3: Reason should mention too fast. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 3 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Slow Bulk
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 4: Testing Slow Bulk')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Bulk Phase',
    type: 'bulk',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 2500,
    proteinTarget: 160,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 85.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(0), waistCm: 85.0, weightKg: 80.2 } // 0.2kg over 28 days = 0.05kg/week (<0.15)
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 80.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 80.2, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push', dateAgo(28), [mkSessionExercise(benchPressId, [{ weightKg: 80, reps: 5 }])]),
    mkSession('s2', 'Push', dateAgo(0), [mkSessionExercise(benchPressId, [{ weightKg: 78, reps: 5 }])]) // stagnant strength
  ]
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'increase_rate_of_gain', `S4: Status must be increase_rate_of_gain. Got: ${rec.status}`)
  assert(rec.currentCalories === 2500, `S4: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2650, `S4: Calories should be 2650 (2500 + 150). Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 160, `S4: Current protein correct. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 144, `S4: Recommended protein correct (1.8g/kg of 80.2kg). Got: ${rec.recommendedProtein}`)
  assert(rec.reason.toLowerCase().includes('stagnant strength'), `S4: Reason should mention stagnant strength. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 4 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Aggressive Cut
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 5: Testing Aggressive Cut')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Cut Phase',
    type: 'cut',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 90,
    calorieTarget: 1800,
    proteinTarget: 200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 95.0, weightKg: 90.0 },
    { id: 'm2', date: dateAgo(0), waistCm: 92.0, weightKg: 85.0 } // 5kg over 28 days = 1.25kg/week = 1.47% bodyweight (>1%)
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 90.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 85.0, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = [
    mkSession('s1', 'Push', dateAgo(28), [mkSessionExercise(benchPressId, [{ weightKg: 100, reps: 5 }])]),
    mkSession('s2', 'Push', dateAgo(0), [mkSessionExercise(benchPressId, [{ weightKg: 95, reps: 5 }])]) // dropping strength
  ]
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'reduce_rate_of_loss', `S5: Status must be reduce_rate_of_loss. Got: ${rec.status}`)
  assert(rec.currentCalories === 1800, `S5: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 1950, `S5: Calories should be 1950 (1800 + 150). Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 200, `S5: Current protein correct. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 187, `S5: Recommended protein correct (2.2g/kg of 85.0kg). Got: ${rec.recommendedProtein}`)
  assert(rec.reason.toLowerCase().includes('too aggressive'), `S5: Reason should warn about aggressive loss. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 5 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 6: Slow Cut
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 6: Testing Slow Cut')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Cut Phase',
    type: 'cut',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 2000,
    proteinTarget: 180,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 88.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(0), waistCm: 88.0, weightKg: 79.9 } // 0.1kg over 28 days = 0.025kg/week = 0.03% bodyweight (<0.25%), waist stable
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 80.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 79.9, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = []
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'increase_rate_of_loss', `S6: Status must be increase_rate_of_loss. Got: ${rec.status}`)
  assert(rec.currentCalories === 2000, `S6: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 1850, `S6: Calories should be 1850 (2000 - 150). Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 180, `S6: Current protein correct. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 176, `S6: Recommended protein correct (2.2g/kg of 79.9kg). Got: ${rec.recommendedProtein}`)
  assert(rec.reason.toLowerCase().includes('stalling'), `S6: Reason should mention stalled cut. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 6 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 7: Protein Too Low
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 7: Testing Protein Too Low')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Cut Phase',
    type: 'cut',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 2000,
    proteinTarget: 120, // 120g is 1.5g/kg, below min cut target (2.0g/kg)
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 88.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(0), waistCm: 87.0, weightKg: 78.4 } // successful standard cut
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 80.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 78.4, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = []
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'increase_protein', `S7: Status must be increase_protein since calories are on track. Got: ${rec.status}`)
  assert(rec.currentCalories === 2000, `S7: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2000, `S7: Recommended calories matches current target. Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 120, `S7: Current protein is 120g. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 172, `S7: Recommended protein should be 172g (2.2g/kg of 78.4kg). Got: ${rec.recommendedProtein}`)
  assert(rec.reason.toLowerCase().includes('protein target of 120g is below'), `S7: Reason should highlight low protein target. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 7 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 8: Protein Adequate
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 8: Testing Protein Adequate')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Cut Phase',
    type: 'cut',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 2000,
    proteinTarget: 170, // 170g is 2.125 g/kg, inside cut target range (2.0 - 2.4 g/kg)
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 88.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(0), waistCm: 87.0, weightKg: 78.4 }
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 80.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 78.4, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = []
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'maintain_calories', `S8: Status should be maintain_calories. Got: ${rec.status}`)
  assert(rec.currentCalories === 2000, `S8: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2000, `S8: Recommended calories correct. Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 170, `S8: Current protein matches. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 172, `S8: Recommended protein is 172g. Got: ${rec.recommendedProtein}`)
} catch (err: any) {
  console.error('Scenario 8 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 9: Maintenance
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 9: Testing Maintenance')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Maintenance Goal',
    type: 'maintain',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 2200,
    proteinTarget: 150,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = [
    { id: 'm1', date: dateAgo(28), waistCm: 85.0, weightKg: 80.0 },
    { id: 'm2', date: dateAgo(0), waistCm: 85.0, weightKg: 80.0 }
  ]
  const weightLogs: WeightLog[] = [
    { id: 'w1', date: dateAgo(28), weightKg: 80.0, createdAt: new Date().toISOString() },
    { id: 'w2', date: dateAgo(0), weightKg: 80.0, createdAt: new Date().toISOString() }
  ]
  const sessions: WorkoutSession[] = []
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'maintain_calories', `S9: Status should be maintain_calories. Got: ${rec.status}`)
  assert(rec.currentCalories === 2200, `S9: Current calories correct. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2200, `S9: Calories should be 2200. Got: ${rec.recommendedCalories}`)
  assert(rec.currentProtein === 150, `S9: Current protein matches. Got: ${rec.currentProtein}`)
  assert(rec.recommendedProtein === 144, `S9: Recommended protein correct (1.8g/kg of 80kg). Got: ${rec.recommendedProtein}`)
} catch (err: any) {
  console.error('Scenario 9 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 10: Insufficient Data
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 10: Testing Insufficient Data')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Maintenance Goal',
    type: 'maintain',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 2200,
    proteinTarget: 150,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const measurements: Measurement[] = []
  const weightLogs: WeightLog[] = []
  const sessions: WorkoutSession[] = []
  const foodLogs: FoodLog[] = []

  const rec = getNutritionRecommendation(weightLogs, measurements, foodLogs, sessions, activeGoal, defaultProfile)

  assert(rec.status === 'maintain_calories', `S10: Status defaults to maintain_calories. Got: ${rec.status}`)
  assert(rec.currentCalories === 2200, `S10: Current calories matches. Got: ${rec.currentCalories}`)
  assert(rec.recommendedCalories === 2200, `S10: Recommended calories matches. Got: ${rec.recommendedCalories}`)
  assert(rec.confidence === 0, `S10: Confidence must be 0. Got: ${rec.confidence}`)
  assert(rec.reason.toLowerCase().includes('insufficient weight or waist data'), `S10: Reason indicates insufficient data. Got: ${rec.reason}`)
} catch (err: any) {
  console.error('Scenario 10 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 11: Nutrition Analytics & Adherence Checks
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 11: Testing Nutrition Analytics & Adherence')
try {
  const foodLogs: FoodLog[] = [
    // 7 days ago
    { id: 'f1', date: dateAgo(6), mealType: 'breakfast', name: 'Eggs', quantityG: 100, calories: 1950, protein: 140, carbs: 100, fat: 50, createdAt: new Date().toISOString() }, // calorie target 2000 (within 10%), protein 140 (140/150 = 93% >= 90%) - Adherent!
    
    // 5 days ago
    { id: 'f2', date: dateAgo(4), mealType: 'breakfast', name: 'Eggs', quantityG: 100, calories: 1500, protein: 110, carbs: 100, fat: 50, createdAt: new Date().toISOString() }, // calorie 1500 (too low), protein 110 (too low) - Non-adherent!
    
    // 4 days ago
    { id: 'f3', date: dateAgo(3), mealType: 'breakfast', name: 'Eggs', quantityG: 100, calories: 2100, protein: 150, carbs: 100, fat: 50, createdAt: new Date().toISOString() }, // calorie 2100 (within 10%), protein 150 (>=90%) - Adherent!
    
    // 2 days ago
    { id: 'f4', date: dateAgo(1), mealType: 'breakfast', name: 'Eggs', quantityG: 100, calories: 2400, protein: 130, carbs: 100, fat: 50, createdAt: new Date().toISOString() }, // calorie 2400 (too high), protein 130 (130/150 = 86.6% < 90%) - Non-adherent!
  ]

  const calorieTarget = 2000
  const proteinTarget = 150

  const analytics = getNutritionAnalytics(foodLogs, calorieTarget, proteinTarget)

  // Averages should be calculated over logged days only (4 days)
  // Total calories = 1950 + 1500 + 2100 + 2400 = 7950. Average = 7950 / 4 = 1988 kcal
  // Total protein = 140 + 110 + 150 + 130 = 530g. Average = 530 / 4 = 133g
  assert(analytics.avgCalories7d === 1988, `S11: 7d avg calories correct. Got: ${analytics.avgCalories7d}`)
  assert(analytics.avgProtein7d === 133, `S11: 7d avg protein correct. Got: ${analytics.avgProtein7d}`)
  assert(analytics.avgCalories30d === 1988, `S11: 30d avg calories correct. Got: ${analytics.avgCalories30d}`)
  assert(analytics.avgProtein30d === 133, `S11: 30d avg protein correct. Got: ${analytics.avgProtein30d}`)

  // Calorie Adherent days: f1 (1950), f3 (2100). Total 2 / 4 logged days = 50%
  // Protein Adherent days: f1 (140 >= 135), f3 (150 >= 135). Total 2 / 4 logged days = 50%.
  assert(analytics.calorieAdherence7d === 50, `S11: 7d calorie adherence correct. Got: ${analytics.calorieAdherence7d}%`)
  assert(analytics.proteinAdherence7d === 50, `S11: 7d protein adherence correct. Got: ${analytics.proteinAdherence7d}%`)
  assert(analytics.calorieAdherence30d === 50, `S11: 30d calorie adherence correct. Got: ${analytics.calorieAdherence30d}%`)
  assert(analytics.proteinAdherence30d === 50, `S11: 30d protein adherence correct. Got: ${analytics.proteinAdherence30d}%`)

  // Verify daily history structure
  assert(analytics.dailyHistory.length === 4, `S11: Daily history length should be 4. Got: ${analytics.dailyHistory.length}`)
  assert(analytics.dailyHistory[0].calories === 1950, `S11: First log calories correct. Got: ${analytics.dailyHistory[0].calories}`)
  assert(analytics.dailyHistory[0].protein === 140, `S11: First log protein correct. Got: ${analytics.dailyHistory[0].protein}`)
} catch (err: any) {
  console.error('Scenario 11 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 12: Coach Context Format
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nScenario 12: Testing Coach Context Generation')
try {
  const activeGoal: Goal = {
    id: 'g1',
    name: 'Cut Phase',
    type: 'cut',
    status: 'active',
    startDate: dateAgo(28),
    startWeight: 80,
    calorieTarget: 2000,
    proteinTarget: 170,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const recommendation = {
    status: 'maintain_calories' as const,
    confidence: 85,
    currentCalories: 2000,
    recommendedCalories: 2000,
    currentProtein: 170,
    recommendedProtein: 172,
    reason: 'Fat loss is progressing on track.'
  }

  const analytics = {
    avgCalories7d: 1988,
    avgProtein7d: 133,
    avgCalories30d: 1950,
    avgProtein30d: 130,
    calorieAdherence7d: 50,
    proteinAdherence7d: 50,
    calorieAdherence30d: 60,
    proteinAdherence30d: 60,
    dailyHistory: []
  }

  const ctxStr = generateNutritionCoachContext(recommendation, analytics, activeGoal)

  assert(ctxStr.includes('### NUTRITION INTELLIGENCE & ADAPTATION ###'), 'S12: Includes section title')
  assert(ctxStr.includes('Active Goal: Cut Phase'), 'S12: Includes active goal name')
  assert(ctxStr.includes('Recommended Protein: 172g/day'), 'S12: Includes recommended protein')
  assert(ctxStr.includes('7d Average Intake: 1988 kcal'), 'S12: Includes 7d average calories')
  assert(ctxStr.includes('30d Adherence: Calories 60%, Protein 60%'), 'S12: Includes 30d adherence stats')
} catch (err: any) {
  console.error('Scenario 12 Error:', err)
  failed++
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== TEST RUN SUMMARY ===')
console.log(`Passed: ${passed} assertions`)
console.log(`Failed: ${failed} assertions`)

if (failed > 0) {
  console.log('❌ SOME TESTS FAILED.')
  process.exit(1)
} else {
  console.log('✅ ALL TESTS PASSED SUCCESSFULLY!')
  process.exit(0)
}
