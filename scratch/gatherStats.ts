import { SEEDED_EXERCISES } from '../src/constants/seeds'

const total = SEEDED_EXERCISES.length
const muscles: Record<string, number> = {}
const patterns: Record<string, number> = {}
const equipment: Record<string, number> = {}
let aliasCount = 0

for (const ex of SEEDED_EXERCISES) {
  for (const m of ex.muscleGroups) {
    muscles[m] = (muscles[m] || 0) + 1
  }
  if (ex.movementPattern) {
    patterns[ex.movementPattern] = (patterns[ex.movementPattern] || 0) + 1
  }
  const eq = ex.equipment || 'Bodyweight'
  equipment[eq] = (equipment[eq] || 0) + 1
  if (ex.aliases) {
    aliasCount += ex.aliases.length
  }
}

console.log('=== SEEDED EXERCISES STATS ===')
console.log('Total Count:', total)
console.log('\n--- Count by Muscle Group ---')
Object.entries(muscles).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => {
  console.log(`${k}: ${v}`)
})
console.log('\n--- Count by Movement Pattern ---')
Object.entries(patterns).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => {
  console.log(`${k}: ${v}`)
})
console.log('\n--- Count by Equipment ---')
Object.entries(equipment).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => {
  console.log(`${k}: ${v}`)
})
console.log('\nTotal Aliases:', aliasCount)
