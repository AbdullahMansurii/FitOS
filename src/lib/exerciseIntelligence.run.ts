import { getExerciseIntelligence } from './exerciseIntelligence'
import type { WorkoutSession } from '@/types'

// Mock historical sessions for verification
const mockSessions: WorkoutSession[] = [
  {
    id: 'sess-1',
    name: 'Push Day A',
    date: '2026-05-25',
    completedAt: '2026-05-25T10:00:00.000Z',
    createdAt: '2026-05-25T10:00:00.000Z',
    exercises: [
      {
        id: 'se-1',
        sessionId: 'sess-1',
        exerciseId: 'ex-bench-press',
        orderIndex: 0,
        sets: [
          { id: 'set-1', sessionExerciseId: 'se-1', setNumber: 1, weightKg: 80, reps: 8, isWarmup: false },
          { id: 'set-2', sessionExerciseId: 'se-1', setNumber: 2, weightKg: 80, reps: 8, isWarmup: false },
          { id: 'set-3', sessionExerciseId: 'se-1', setNumber: 3, weightKg: 80, reps: 6, isWarmup: false }
        ]
      },
      {
        id: 'se-2',
        sessionId: 'sess-1',
        exerciseId: 'ex-dumbbell-chest-press',
        orderIndex: 1,
        sets: [
          { id: 'set-4', sessionExerciseId: 'se-2', setNumber: 1, weightKg: 20, reps: 10, isWarmup: false },
          { id: 'set-5', sessionExerciseId: 'se-2', setNumber: 2, weightKg: 22.5, reps: 10, isWarmup: false },
          { id: 'set-6', sessionExerciseId: 'se-2', setNumber: 3, weightKg: 25, reps: 8, isWarmup: false }
        ]
      }
    ]
  },
  {
    id: 'sess-2',
    name: 'Push Day B',
    date: '2026-06-10',
    completedAt: '2026-06-10T10:00:00.000Z',
    createdAt: '2026-06-10T10:00:00.000Z',
    exercises: [
      {
        id: 'se-3',
        sessionId: 'sess-2',
        exerciseId: 'ex-bench-press',
        orderIndex: 0,
        sets: [
          { id: 'set-7', sessionExerciseId: 'se-3', setNumber: 1, weightKg: 82.5, reps: 8, isWarmup: false },
          { id: 'set-8', sessionExerciseId: 'se-3', setNumber: 2, weightKg: 82.5, reps: 8, isWarmup: false },
          { id: 'set-9', sessionExerciseId: 'se-3', setNumber: 3, weightKg: 82.5, reps: 7, isWarmup: false }
        ]
      },
      {
        id: 'se-4',
        sessionId: 'sess-2',
        exerciseId: 'ex-dumbbell-chest-press',
        orderIndex: 1,
        sets: [
          { id: 'set-10', sessionExerciseId: 'se-4', setNumber: 1, weightKg: 20, reps: 11, isWarmup: false },
          { id: 'set-11', sessionExerciseId: 'se-4', setNumber: 2, weightKg: 22.5, reps: 11, isWarmup: false },
          { id: 'set-12', sessionExerciseId: 'se-4', setNumber: 3, weightKg: 25, reps: 9, isWarmup: false }
        ]
      }
    ]
  },
  {
    id: 'sess-3',
    name: 'Push Day A - Strength Peak',
    date: '2026-06-18',
    completedAt: '2026-06-18T10:00:00.000Z',
    createdAt: '2026-06-18T10:00:00.000Z',
    exercises: [
      {
        id: 'se-5',
        sessionId: 'sess-3',
        exerciseId: 'ex-bench-press',
        orderIndex: 0,
        sets: [
          { id: 'set-13', sessionExerciseId: 'se-5', setNumber: 1, weightKg: 85, reps: 8, isWarmup: false },
          { id: 'set-14', sessionExerciseId: 'se-5', setNumber: 2, weightKg: 85, reps: 7, isWarmup: false },
          { id: 'set-15', sessionExerciseId: 'se-5', setNumber: 3, weightKg: 85, reps: 6, isWarmup: false }
        ]
      }
    ]
  }
]

console.log("=== EXERCISE INTELLIGENCE VERIFICATION RUN ===")

const benchPressInt = getExerciseIntelligence('ex-bench-press', mockSessions)
console.log("\n--- BENCH PRESS SUMMARY ---")
console.log(JSON.stringify(benchPressInt, null, 2))

const dbChestPressInt = getExerciseIntelligence('ex-dumbbell-chest-press', mockSessions)
console.log("\n--- DUMBBELL CHEST PRESS SUMMARY ---")
console.log(JSON.stringify(dbChestPressInt, null, 2))
