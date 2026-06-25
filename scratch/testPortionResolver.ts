import { resolvePortionWeight } from '../src/lib/portionResolver'

interface TestCase {
  food: string
  quantity: number
  unit: string
  expectedWeightG: number | null
}

const testCases: TestCase[] = [
  { food: 'Mango', quantity: 1, unit: 'mango', expectedWeightG: 200 },
  { food: 'Roti / Chapati', quantity: 2, unit: 'rotis', expectedWeightG: 80 },
  { food: 'Chicken Biryani', quantity: 0.5, unit: 'bowl', expectedWeightG: 125 }, // half bowl
  { food: 'Whey Protein', quantity: 1, unit: 'scoops', expectedWeightG: 30 },
  { food: 'Milk', quantity: 1, unit: 'glass', expectedWeightG: 250 },
  { food: 'Chapati', quantity: 2, unit: 'chapatis', expectedWeightG: 80 },
  { food: 'Egg, Whole, Boiled', quantity: 2, unit: 'piece', expectedWeightG: 100 },
  { food: 'Unknown Food', quantity: 1, unit: 'bowl', expectedWeightG: null },
]

console.log('=== PORTION RESOLVER TESTING ===')
let passed = 0
for (const tc of testCases) {
  const result = resolvePortionWeight(tc.food, tc.quantity, tc.unit)
  const isMatch = result.weightG === tc.expectedWeightG
  if (isMatch) {
    console.log(`✅ SUCCESS: "${tc.quantity} ${tc.unit} of ${tc.food}" resolved to ${result.weightG}g (Expected: ${tc.expectedWeightG}g)`)
    passed++
  } else {
    console.error(`❌ FAILURE: "${tc.quantity} ${tc.unit} of ${tc.food}" resolved to ${result.weightG}g (Expected: ${tc.expectedWeightG}g)`)
  }
}

console.log(`\nResult: ${passed}/${testCases.length} tests passed.\n`)
process.exit(passed === testCases.length ? 0 : 1)
