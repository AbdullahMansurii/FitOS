import type { CuratedFood } from '@/types'

// Normalizes and singularizes unit strings
export function normalizeUnit(unit: string): string {
  let u = unit.toLowerCase().trim()
  if (u === 'glasses') return 'glass'
  if (u === 'pieces') return 'piece'
  if (u === 'scoops') return 'scoop'
  if (u === 'cups') return 'cup'
  if (u === 'bowls') return 'bowl'
  if (u === 'plates') return 'plate'
  if (u === 'slices') return 'slice'
  if (u === 'rotis') return 'roti'
  if (u === 'chapatis') return 'chapati'
  if (u === 'ounces') return 'ounce'
  if (u === 'grams') return 'gram'
  if (u === 'g') return 'gram'
  if (u === 'ml') return 'ml'
  if (u === 'milliliters') return 'ml'
  if (u === 'milliliter') return 'ml'
  if (u === 'tbsp') return 'tbsp'
  if (u === 'tbsps') return 'tbsp'
  if (u === 'tablespoons') return 'tbsp'
  if (u === 'tablespoon') return 'tbsp'
  if (u === 'tsp') return 'tsp'
  if (u === 'tsps') return 'tsp'
  if (u === 'teaspoons') return 'tsp'
  if (u === 'teaspoon') return 'tsp'
  
  if (u.endsWith('s') && !u.endsWith('ss')) {
    u = u.slice(0, -1)
  }
  return u
}

import { resolveFood } from './nutritionResolver'

// Find matched food from database using layered matching rules to avoid circular dependency
function findMatchedFood(foodName: string): CuratedFood | null {
  const resolved = resolveFood(foodName)
  return resolved ? resolved.food : null
}


export interface PortionResolution {
  weightG: number | null
  confidence: 'high' | 'medium' | 'low'
  source: 'serving_size' | 'unknown'
}

/**
 * Resolves the weight in grams for a given food name, quantity, and unit
 * using only the CURATED_FOODS servingSizes as the single source of truth.
 */
export function resolvePortionWeight(
  foodName: string,
  quantity: number,
  unit: string
): PortionResolution {
  const normUnit = normalizeUnit(unit)
  const matchedFood = findMatchedFood(foodName)

  if (matchedFood) {
    // Check if unit matches grams directly
    if (normUnit === 'gram' || normUnit === 'g' || normUnit === 'ml') {
      return {
        weightG: quantity,
        confidence: 'high',
        source: 'serving_size',
      }
    }

    // Check serving sizes list
    const matchSize = matchedFood.servingSizes.find(
      (s) => {
        const normSizeName = normalizeUnit(s.name)
        return normSizeName === normUnit || normUnit.includes(normSizeName) || normSizeName.includes(normUnit)
      }
    )

    if (matchSize) {
      return {
        weightG: quantity * matchSize.weightG,
        confidence: 'high',
        source: 'serving_size',
      }
    }
  }

  return {
    weightG: null,
    confidence: 'low',
    source: 'unknown',
  }
}
