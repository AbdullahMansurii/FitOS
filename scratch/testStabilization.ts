// Mocks for Node/TSX environment
if (typeof (global as any).window === 'undefined') {
  (global as any).window = {} as any;
}
if (typeof (global as any).localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
    length: 0,
    key: (index: number) => null
  } as any;
}
if (typeof (import.meta as any).env === 'undefined') {
  (import.meta as any).env = {
    DEV: true,
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'mock-anon-key',
    VITE_SYNC_TOKEN: 'mock-sync-token',
    VITE_GROQ_API_KEY: 'mock-groq-key'
  };
}

import { todayISO, daysAgo } from '../src/lib/utils'
import { getExerciseIntelligence } from '../src/lib/exerciseIntelligence'
import { getProgressionRecommendation, getCachedRecommendation } from '../src/lib/progressiveOverload'
import type { WorkoutSession, Exercise } from '../src/types'
import { useWorkoutStore } from '../src/store/index'

console.log('=== FitOS STABILIZATION CRITICAL RELIABILITY TESTS ===\n')

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

// ─── 1. TIMEZONE BOUNDARY VERIFICATION ──────────────────────────────────────
console.log('Test 1: Timezone local calendar date generation')
try {
  // Test todayISO logic
  const now = new Date()
  const localYear = now.getFullYear()
  const localMonth = String(now.getMonth() + 1).padStart(2, '0')
  const localDay = String(now.getDate()).padStart(2, '0')
  const expectedISO = `${localYear}-${localMonth}-${localDay}`
  
  assert(todayISO() === expectedISO, `todayISO() matches local timezone date: ${todayISO()}`)
  
  // Test daysAgo logic
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yYear = yesterday.getFullYear()
  const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0')
  const yDay = String(yesterday.getDate()).padStart(2, '0')
  const expectedYesterdayISO = `${yYear}-${yMonth}-${yDay}`
  
  assert(daysAgo(1) === expectedYesterdayISO, `daysAgo(1) matches local timezone date: ${daysAgo(1)}`)
} catch (err: any) {
  console.error('Timezone Test Error:', err)
  failed++
}

// ─── 2. TREND WINDOW ANCHORING AFTER training breaks ───────────────────────
console.log('\nTest 2: Exercise intelligence trend anchoring with logging gaps')
try {
  const exerciseId = 'ex-bench-press'
  
  // User had a session 45 days ago, and another 40 days ago, then a break of 40 days
  const historySessions: WorkoutSession[] = [
    {
      id: 's1',
      name: 'Bench Workout 1',
      date: '2026-05-10',
      completedAt: '2026-05-10T10:00:00Z',
      exercises: [
        {
          id: 'se1',
          exerciseId,
          orderIndex: 0,
          sets: [{ id: 'set1', reps: 5, weightKg: 80, isWarmup: false, setNumber: 1, completedAt: '2026-05-10T10:10:00Z' }]
        }
      ],
      createdAt: '2026-05-10T10:00:00Z'
    },
    {
      id: 's2',
      name: 'Bench Workout 2',
      date: '2026-05-15',
      completedAt: '2026-05-15T10:00:00Z',
      exercises: [
        {
          id: 'se2',
          exerciseId,
          orderIndex: 0,
          sets: [{ id: 'set2', reps: 5, weightKg: 85, isWarmup: false, setNumber: 1, completedAt: '2026-05-15T10:10:00Z' }]
        }
      ],
      createdAt: '2026-05-15T10:00:00Z'
    }
  ]
  
  // Calculate exercise intelligence
  const intelligence = getExerciseIntelligence(exerciseId, historySessions)
  
  // Anchor date should be 2026-05-15, and 30-day trend should compare s2 vs s1.
  assert(intelligence.trends30d.e1rmPctChange !== null, 'E1RM trend calculated successfully after 30+ day layoff.')
  assert(intelligence.trends30d.e1rmPctChange! > 0, `E1RM trend correctly reflects improvement: ${intelligence.trends30d.e1rmPctChange}%`)
} catch (err: any) {
  console.error('Trend Anchoring Test Error:', err)
  failed++
}

// ─── 3. SYNC RACES ON completeSession ────────────────────────────────────────
console.log('\nTest 3: Zustand state commit before sync trigger')
try {
  // Use the imported store directly.
  
  // Start session
  useWorkoutStore.getState().startSession({
    name: 'Test Session',
    date: todayISO(),
    startedAt: new Date().toISOString(),
    exercises: []
  })
  
  // Complete the session
  useWorkoutStore.getState().completeSession('Great workout!', 5)
  
  const completed = useWorkoutStore.getState().sessions[0]
  assert(completed !== undefined, 'Completed session exists in state list.')
  assert(completed.notes === 'Great workout!', 'Completed session properties committed correctly.')
  assert(useWorkoutStore.getState().activeSession === null, 'Active session cleared from state.')
} catch (err: any) {
  console.error('Sync completeSession Test Error:', err)
  failed++
}

// ─── 4. CACHED PROGRESSION OVERLOAD CHECKS ──────────────────────────────────
console.log('\nTest 4: Cached progression recommendation performance')
try {
  const exerciseId = 'ex-bench-press'
  const mockSessions: WorkoutSession[] = [
    {
      id: 's1',
      name: 'Bench Workout',
      date: '2026-06-20',
      completedAt: '2026-06-20T10:00:00Z',
      exercises: [
        {
          id: 'se1',
          exerciseId,
          orderIndex: 0,
          sets: [{ id: 'set1', reps: 12, weightKg: 80, isWarmup: false, setNumber: 1, completedAt: '2026-06-20T10:10:00Z' }]
        }
      ],
      createdAt: '2026-06-20T10:00:00Z'
    }
  ]
  
  const t1 = performance.now()
  const rec1 = getCachedRecommendation(exerciseId, mockSessions, 'hypertrophy')
  const t2 = performance.now()
  const rec2 = getCachedRecommendation(exerciseId, mockSessions, 'hypertrophy')
  const t3 = performance.now()
  
  assert(rec1 !== null && rec2 !== null, 'Progression recommendations generated.')
  assert(rec1 === rec2, 'Cache returns identical references for same session hash/goal.')
  console.log(`  ⏱ Cache hit time: ${(t3 - t2).toFixed(4)}ms vs initial compute time: ${(t2 - t1).toFixed(4)}ms`)
} catch (err: any) {
  console.error('Cache Performance Test Error:', err)
  failed++
}

// ─── SUMMARY ────────────────────────────────────────────────────────────────
console.log('\n=== STABILIZATION TEST RUN SUMMARY ===')
console.log(`Passed: ${passed} assertions`)
console.log(`Failed: ${failed} assertions`)

if (failed > 0) {
  console.log('❌ SOME TESTS FAILED.')
  process.exit(1)
} else {
  console.log('✅ ALL TESTS PASSED SUCCESSFULLY!')
  process.exit(0)
}
