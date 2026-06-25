import { SEEDED_EXERCISES } from '../src/constants/seeds'

const lowerBodyMuscles = [
  'glutes', 'hamstrings', 'quads', 'calves', 'legs',
  'outer thighs', 'inner thighs', 'adductors', 'hip flexors'
]

// Simulate the progressiveOverload bucket classification logic
function getExerciseIncrement(exercise: any) {
  const isLowerBody = exercise.muscleGroups.some((m: string) => lowerBodyMuscles.includes(m.toLowerCase()))
  const isCompound = exercise.exerciseType === 'compound'
  const isIsolation = exercise.exerciseType === 'isolation'
  const eq = exercise.equipment || ''

  let weightIncrement = 2.5
  let bucketName = 'Default Fallback'

  if (isCompound) {
    if (eq === 'Dumbbell') {
      weightIncrement = 2.0 // Dumbbell Compound (+2kg total)
      bucketName = 'Dumbbell Compound'
    } else if (isLowerBody && (eq === 'Barbell' || eq === 'Machine' || eq === 'Smith')) {
      weightIncrement = 5.0 // Heavy Compound Lower
      bucketName = 'Heavy Compound Lower'
    } else if (!isLowerBody && (eq === 'Barbell' || eq === 'Smith' || eq === 'Other' || eq === 'Cable')) {
      weightIncrement = 2.5 // Heavy Compound Upper
      bucketName = 'Heavy Compound Upper'
    } else {
      weightIncrement = isLowerBody ? 5.0 : 2.5
      bucketName = isLowerBody ? 'Compound Lower (Non-standard eq)' : 'Compound Upper (Non-standard eq)'
    }
  } else if (isIsolation) {
    weightIncrement = 1.0 // Isolation
    bucketName = 'Isolation'
  }

  return { weightIncrement, bucketName }
}

const unclassified: any[] = []
const bucketGroups: { [key: string]: string[] } = {}

SEEDED_EXERCISES.forEach(ex => {
  if (!ex.exerciseType) {
    unclassified.push(ex.name)
  }
  
  const { weightIncrement, bucketName } = getExerciseIncrement(ex)
  const groupKey = `${bucketName} (+${weightIncrement}kg)`
  if (!bucketGroups[groupKey]) {
    bucketGroups[groupKey] = []
  }
  bucketGroups[groupKey].push(ex.name)
})

console.log('=== SEEDED EXERCISES PROGRESSION BUCKETS AUDIT ===')
console.log(`Total seeded exercises: ${SEEDED_EXERCISES.length}`)
console.log(`Unclassified exercises (missing exerciseType): ${unclassified.length}`)
if (unclassified.length > 0) {
  console.log('Unclassified:', unclassified)
}

const targetCheckNames = [
  'Squat', 'Front Squat', 'Hack Squat', 'Leg Press', 'Deadlift', 'Romanian Deadlift',
  'Bench Press', 'Incline Bench Press', 'Overhead Press', 'Weighted Pull-Up',
  'Incline Dumbbell Press', 'Dumbbell Row', 'Dumbbell Shoulder Press',
  'Lateral Raise', 'Rear Delt Fly', 'Leg Extension', 'Leg Curl', 'Pec Deck',
  'Cable Fly', 'Bicep Curl', 'Tricep Pushdown', 'Calf Raise', 'Adductor Machine', 'Abductor Machine'
]

console.log('\nSpecific Exercise Audits:')
targetCheckNames.forEach(name => {
  const found = SEEDED_EXERCISES.find(e => e.name.toLowerCase() === name.toLowerCase())
  if (found) {
    const { weightIncrement, bucketName } = getExerciseIncrement(found)
    console.log(`- ${found.name}: Type = ${found.exerciseType}, Eq = ${found.equipment}, Increment = +${weightIncrement}kg (Bucket: ${bucketName})`)
  } else {
    // Try fuzzy check or substring
    const fuzzy = SEEDED_EXERCISES.find(e => e.name.toLowerCase().includes(name.toLowerCase()))
    if (fuzzy) {
      const { weightIncrement, bucketName } = getExerciseIncrement(fuzzy)
      console.log(`- ${fuzzy.name}: Type = ${fuzzy.exerciseType}, Eq = ${fuzzy.equipment}, Increment = +${weightIncrement}kg (Bucket: ${bucketName})`)
    } else {
      console.log(`- ${name}: NOT FOUND in seeds`)
    }
  }
})

console.log('\nBucket Distributions:')
for (const [bucket, list] of Object.entries(bucketGroups)) {
  console.log(`\n* ${bucket}: ${list.length} exercises`)
  console.log(`  Examples: ${list.slice(0, 5).join(', ')}...`)
}
