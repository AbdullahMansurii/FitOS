import { searchExercises } from '../src/lib/exerciseSearch'
// Import SEEDED_EXERCISES with relative path mapping for scratch script
import { SEEDED_EXERCISES as exercises } from '../src/constants/seeds'

interface SearchTest {
  query: string
  expectedMatches: string[]
}

const tests: SearchTest[] = [
  { query: 'db press incline', expectedMatches: ['Incline Dumbbell Press'] },
  { query: 'reverse curl', expectedMatches: ['EZ Bar Reverse Curl', 'Reverse Curl', 'Reverse Dumbbell Curl'] },
  { query: 'Bench Press', expectedMatches: ['Bench Press'] },
  { query: 'bp', expectedMatches: ['Bench Press'] }, // exact alias
  { query: 'rear delt fly', expectedMatches: ['Cable Rear Delt Fly', 'Bent Over Rear Delt Raise', 'Reverse Pec Deck', 'Single Arm Rear Delt Fly'] }, // alias matching
]

console.log('=== EXERCISE SEARCH TESTING ===')
let passed = 0
for (const t of tests) {
  const results = searchExercises(exercises, t.query)
  const resultNames = results.map((ex) => ex.name)
  
  // Check that all expectedMatches are in the results
  const matchesAll = t.expectedMatches.every((name) => resultNames.includes(name))
  if (matchesAll) {
    console.log(`✅ SUCCESS: Query "${t.query}" matched all expected: [${t.expectedMatches.join(', ')}]`)
    console.log(`   Found: ${resultNames.slice(0, 5).join(', ')}${resultNames.length > 5 ? '...' : ''}`)
    passed++
  } else {
    console.error(`❌ FAILURE: Query "${t.query}" did not match all expected: [${t.expectedMatches.join(', ')}]`)
    console.error(`   Found: ${resultNames.join(', ')}`)
  }
}

console.log(`\nResult: ${passed}/${tests.length} tests passed.\n`)
process.exit(passed === tests.length ? 0 : 1)
