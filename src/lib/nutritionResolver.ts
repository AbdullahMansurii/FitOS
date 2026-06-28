import { PERSONAL_NUTRITION_CHART, PERSONAL_CHART_MAP, toCuratedFood, getDiaasScore } from '@/constants/personalNutritionChart'
import { CURATED_FOODS } from '@/constants/foodDatabase'
import type { CuratedFood } from '@/types'

export type NutritionSource = 'personal_chart' | 'curated' | 'open_food_facts' | 'ai_estimated' | 'custom'

export interface ResolvedFood {
  food: CuratedFood
  source: NutritionSource
  diaas: number | null
  confidence: 'high' | 'medium' | 'low'
}

export function resolveFoodById(id: string): ResolvedFood | null {
  if (id.startsWith('pnc-')) {
    const entry = PERSONAL_CHART_MAP.get(id)
    if (entry) {
      return {
        food: toCuratedFood(entry),
        source: 'personal_chart',
        diaas: getDiaasScore(entry),
        confidence: 'high',
      }
    }
    return null
  }

  const curated = CURATED_FOODS.find((f) => f.id === id)
  if (curated) {
    return {
      food: curated,
      source: 'curated',
      diaas: null,
      confidence: 'high',
    }
  }

  return null
}

export function resolveFood(query: string): ResolvedFood | null {
  const q = query.toLowerCase().trim()
  if (!q) return null

  // 1. Search Personal Nutrition Chart (Highest Priority)
  // 1a. Exact name match
  let pncEntry = PERSONAL_NUTRITION_CHART.find((f) => f.name.toLowerCase() === q)
  if (pncEntry) {
    return {
      food: toCuratedFood(pncEntry),
      source: 'personal_chart',
      diaas: getDiaasScore(pncEntry),
      confidence: 'high',
    }
  }

  // 1b. Exact alias match
  pncEntry = PERSONAL_NUTRITION_CHART.find((f) => f.aliases.some((a) => a.toLowerCase() === q))
  if (pncEntry) {
    return {
      food: toCuratedFood(pncEntry),
      source: 'personal_chart',
      diaas: getDiaasScore(pncEntry),
      confidence: 'high',
    }
  }

  // 1c. Substring match on name
  pncEntry = PERSONAL_NUTRITION_CHART.find((f) => f.name.toLowerCase().includes(q) || q.includes(f.name.toLowerCase()))
  if (pncEntry) {
    return {
      food: toCuratedFood(pncEntry),
      source: 'personal_chart',
      diaas: getDiaasScore(pncEntry),
      confidence: 'medium',
    }
  }

  // 1d. Substring match on aliases
  pncEntry = PERSONAL_NUTRITION_CHART.find((f) => f.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase())))
  if (pncEntry) {
    return {
      food: toCuratedFood(pncEntry),
      source: 'personal_chart',
      diaas: getDiaasScore(pncEntry),
      confidence: 'medium',
    }
  }

  // 2. Search Curated Foods (Second Priority)
  // 2a. Exact name match
  let curated = CURATED_FOODS.find((f) => f.name.toLowerCase() === q)
  if (curated) {
    return {
      food: curated,
      source: 'curated',
      diaas: null,
      confidence: 'high',
    }
  }

  // 2b. Exact alias match
  curated = CURATED_FOODS.find((f) => f.aliases.some((a) => a.toLowerCase() === q))
  if (curated) {
    return {
      food: curated,
      source: 'curated',
      diaas: null,
      confidence: 'high',
    }
  }

  // 2c. Substring match on name
  curated = CURATED_FOODS.find((f) => f.name.toLowerCase().includes(q) || q.includes(f.name.toLowerCase()))
  if (curated) {
    return {
      food: curated,
      source: 'curated',
      diaas: null,
      confidence: 'medium',
    }
  }

  // 2d. Substring match on aliases
  curated = CURATED_FOODS.find((f) => f.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase())))
  if (curated) {
    return {
      food: curated,
      source: 'curated',
      diaas: null,
      confidence: 'medium',
    }
  }

  return null
}

export function getAllFoods(): ResolvedFood[] {
  const pncFoods: ResolvedFood[] = PERSONAL_NUTRITION_CHART.map((entry) => ({
    food: toCuratedFood(entry),
    source: 'personal_chart',
    diaas: getDiaasScore(entry),
    confidence: 'high',
  }))

  const curatedFoods: ResolvedFood[] = CURATED_FOODS.map((food) => ({
    food,
    source: 'curated',
    diaas: null,
    confidence: 'high',
  }))

  return [...pncFoods, ...curatedFoods]
}
