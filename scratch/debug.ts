import { getProgressionRecommendation } from '../src/lib/progressiveOverload'
import type { WorkoutSession } from '../src/types'

const dateAgo = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

const mkSessionExercise = (exerciseId: string, sets: any[]) => ({
  id: 'se-1',
  sessionId: '',
  exerciseId,
  orderIndex: 0,
  sets: sets.map((s, idx) => ({
    id: 'set-' + idx,
    sessionExerciseId: '',
    setNumber: idx + 1,
    reps: s.reps,
    weightKg: s.weightKg,
    isWarmup: s.isWarmup || false,
    completedAt: new Date().toISOString()
  }))
})

const mkSession = (id: string, name: string, date: string, exercises: any[]) => ({
  id,
  name,
  date,
  completedAt: new Date().toISOString(),
  templateId: 'tmpl-push-a',
  exercises: exercises.map(e => ({ ...e, sessionId: id })),
  createdAt: new Date().toISOString()
})

console.log('=== DEBUGGING CASE 4 ===')
const exId4 = 'ex-lat-pulldown'
const sessions4 = [
  mkSession('s1', 'Pull A', dateAgo(10), [mkSessionExercise(exId4, [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }])]),
  mkSession('s2', 'Pull A', dateAgo(3), [mkSessionExercise(exId4, [{ weightKg: 60, reps: 12 }, { weightKg: 60, reps: 12 }, { weightKg: 60, reps: 11 }])])
]
console.log(getProgressionRecommendation(exId4, sessions4, 'hypertrophy'))

console.log('=== DEBUGGING CASE 7 ===')
const exId7 = 'ex-bench-press'
const sessions7 = [
  mkSession('s1', 'Push A', dateAgo(15), [mkSessionExercise(exId7, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]),
  mkSession('s2', 'Push A', dateAgo(8), [mkSessionExercise(exId7, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])]),
  mkSession('s3', 'Push A', dateAgo(2), [mkSessionExercise(exId7, [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }])])
]
console.log(getProgressionRecommendation(exId7, sessions7, 'strength'))
