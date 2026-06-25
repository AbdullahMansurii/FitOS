import type { Exercise } from '@/types'

/**
 * Searches the exercise library using a layered priority strategy:
 * 1. Exact Name match
 * 2. Exact Alias match
 * 3. Substring match (Name or Alias)
 * 4. Fuzzy Word match (regardless of word order, e.g. "db press incline" matches "Incline Dumbbell Press")
 */
export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  const q = query.toLowerCase().trim()
  if (!q) return exercises

  const exactNameMatches: Exercise[] = []
  const exactAliasMatches: Exercise[] = []
  const substringMatches: Exercise[] = []
  const fuzzyMatches: Exercise[] = []

  const queryWords = q.split(/\s+/).filter(Boolean)

  for (const ex of exercises) {
    const nameLower = ex.name.toLowerCase()
    const aliasesLower = (ex.aliases || []).map((a) => a.toLowerCase())

    // 1. Exact Name
    if (nameLower === q) {
      exactNameMatches.push(ex)
      continue
    }

    // 2. Exact Alias
    if (aliasesLower.includes(q)) {
      exactAliasMatches.push(ex)
      continue
    }

    // 3. Substring (Name or Alias)
    if (nameLower.includes(q) || aliasesLower.some((a) => a.includes(q))) {
      substringMatches.push(ex)
      continue
    }

    // 4. Fuzzy Word Matching (word order independent)
    // Build a search target text combining name, category, equipment, muscles, and aliases
    const targetText = `${nameLower} ${ex.category.toLowerCase()} ${ex.equipment?.toLowerCase() || ''} ${ex.muscleGroups.join(' ').toLowerCase()} ${aliasesLower.join(' ')}`
    
    // Check if every query word is contained in the target text
    const matchesAllWords = queryWords.every((word) => targetText.includes(word))
    if (matchesAllWords) {
      fuzzyMatches.push(ex)
    }
  }

  // Merge results in rank order, removing duplicates
  const results: Exercise[] = []
  const seenIds = new Set<string>()

  const addUnique = (list: Exercise[]) => {
    for (const ex of list) {
      if (!seenIds.has(ex.id)) {
        seenIds.add(ex.id)
        results.push(ex)
      }
    }
  }

  addUnique(exactNameMatches)
  addUnique(exactAliasMatches)
  addUnique(substringMatches)
  addUnique(fuzzyMatches)

  return results
}
