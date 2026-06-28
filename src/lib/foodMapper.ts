import type { AIExtractedFood, ProposedFoodLog, ServingSize } from '@/types'
import { generateId } from './utils'
import { resolvePortionWeight, normalizeUnit } from './portionResolver'
import { resolveFood, resolveFoodById } from './nutritionResolver'

// Map AI extracted food item to a proposed log structure
export function mapExtractedToProposed(extracted: AIExtractedFood): ProposedFoodLog {
  const safeQty = Math.max(0, extracted.quantity)
  const safeExtracted = { ...extracted, quantity: safeQty }
  const resolved = resolveFood(safeExtracted.food)
  const foodMatch = resolved ? resolved.food : null
  const id = generateId()

  let selectedServingSize: ServingSize | null = null
  let resolvedWeightG: number | null
  let confidence: 'high' | 'medium' | 'low'
  let source: ProposedFoodLog['source']
  let diaas: number | null = null

  if (resolved && foodMatch) {
    source = resolved.source
    diaas = resolved.diaas
    // Attempt portion resolution
    const resolution = resolvePortionWeight(safeExtracted.food, safeQty, safeExtracted.unit)
    if (resolution.weightG !== null) {
      resolvedWeightG = resolution.weightG
      confidence = resolved.confidence
      
      // Attempt to map selected serving size
      const normUnit = normalizeUnit(safeExtracted.unit)
      const matchSize = foodMatch.servingSizes.find(
        (s) => normalizeUnit(s.name) === normUnit || normUnit.includes(normalizeUnit(s.name))
      )
      selectedServingSize = matchSize || { name: safeExtracted.unit, weightG: resolution.weightG / safeQty }
    } else {
      // Serving size unknown
      resolvedWeightG = null
      selectedServingSize = null
      confidence = 'low'
    }
  } else {
    // Check for AI assisted estimation fallback
    if (safeExtracted.caloriesPer100g !== undefined && safeExtracted.caloriesPer100g !== null) {
      source = 'ai_estimated'
      confidence = 'low'
      
      // Check if unit is grams directly
      const normUnit = normalizeUnit(safeExtracted.unit)
      if (normUnit === 'gram' || normUnit === 'g' || normUnit === 'ml') {
        resolvedWeightG = safeQty
      } else {
        // We cannot resolve portion without database entry, fallback to null weight
        resolvedWeightG = null
      }
    } else {
      // Fully custom / manual entry fallback
      source = 'custom'
      confidence = 'low'
      resolvedWeightG = null
    }
  }

  if (resolvedWeightG !== null) {
    resolvedWeightG = Math.max(0, resolvedWeightG)
  }

  // Calculate macros if weight resolved, otherwise set to 0/estimated values (user must input weight)
  const weight = resolvedWeightG || 0
  const ratio = weight / 100

  let calculatedCalories = 0
  let calculatedProtein = 0
  let calculatedCarbs = 0
  let calculatedFat = 0

  if (foodMatch) {
    calculatedCalories = Math.max(0, Math.round(foodMatch.caloriesPer100g * ratio))
    calculatedProtein = Math.max(0, Math.round(foodMatch.proteinPer100g * ratio * 10) / 10)
    calculatedCarbs = Math.max(0, Math.round(foodMatch.carbsPer100g * ratio * 10) / 10)
    calculatedFat = Math.max(0, Math.round(foodMatch.fatPer100g * ratio * 10) / 10)
  } else if (source === 'ai_estimated') {
    calculatedCalories = Math.max(0, Math.round((safeExtracted.caloriesPer100g || 0) * ratio))
    calculatedProtein = Math.max(0, Math.round((safeExtracted.proteinPer100g || 0) * ratio * 10) / 10)
    calculatedCarbs = Math.max(0, Math.round((safeExtracted.carbsPer100g || 0) * ratio * 10) / 10)
    calculatedFat = Math.max(0, Math.round((safeExtracted.fatPer100g || 0) * ratio * 10) / 10)
  }

  return {
    id,
    raw: safeExtracted,
    matchedFood: foodMatch,
    selectedServingSize,
    resolvedWeightG,
    calculatedCalories,
    calculatedProtein,
    calculatedCarbs,
    calculatedFat,
    confidence,
    source,
    diaas,
  }
}

// Re-calculate proposed item values on manual overrides
export function recalculateProposed(
  item: ProposedFoodLog,
  updates: Partial<ProposedFoodLog>
): ProposedFoodLog {
  const merged = { ...item, ...updates }
  
  if (merged.raw) {
    merged.raw.quantity = Math.max(0, merged.raw.quantity)
  }
  if (merged.resolvedWeightG !== null) {
    merged.resolvedWeightG = Math.max(0, merged.resolvedWeightG)
  }

  const isMacroUpdate = 'calculatedCalories' in updates || 
                         'calculatedProtein' in updates || 
                         'calculatedCarbs' in updates || 
                         'calculatedFat' in updates
  const isWeightOrFoodUpdate = 'resolvedWeightG' in updates || 
                                'raw' in updates || 
                                'matchedFood' in updates || 
                                'selectedServingSize' in updates

  if (merged.matchedFood) {
    // Re-resolve source and diaas score if the matchedFood has changed/updated
    const resolved = resolveFoodById(merged.matchedFood.id)
    if (resolved) {
      merged.source = resolved.source
      merged.diaas = resolved.diaas
    }

    if (isWeightOrFoodUpdate || !isMacroUpdate) {
      if (merged.resolvedWeightG !== null) {
        const ratio = merged.resolvedWeightG / 100
        merged.calculatedCalories = Math.max(0, Math.round(merged.matchedFood.caloriesPer100g * ratio))
        merged.calculatedProtein = Math.max(0, Math.round(merged.matchedFood.proteinPer100g * ratio * 10) / 10)
        merged.calculatedCarbs = Math.max(0, Math.round(merged.matchedFood.carbsPer100g * ratio * 10) / 10)
        merged.calculatedFat = Math.max(0, Math.round(merged.matchedFood.fatPer100g * ratio * 10) / 10)
      } else {
        merged.calculatedCalories = 0
        merged.calculatedProtein = 0
        merged.calculatedCarbs = 0
        merged.calculatedFat = 0
      }
    }
  } else if (merged.source === 'ai_estimated' && merged.raw?.caloriesPer100g !== undefined) {
    if (isWeightOrFoodUpdate || !isMacroUpdate) {
      if (merged.resolvedWeightG !== null) {
        const ratio = merged.resolvedWeightG / 100
        merged.calculatedCalories = Math.max(0, Math.round((merged.raw.caloriesPer100g || 0) * ratio))
        merged.calculatedProtein = Math.max(0, Math.round((merged.raw.proteinPer100g || 0) * ratio * 10) / 10)
        merged.calculatedCarbs = Math.max(0, Math.round((merged.raw.carbsPer100g || 0) * ratio * 10) / 10)
        merged.calculatedFat = Math.max(0, Math.round((merged.raw.fatPer100g || 0) * ratio * 10) / 10)
      } else {
        // Keep current values if weight is null but macros are set/estimated
      }
    }
  }

  // Ensure non-negative
  merged.calculatedCalories = Math.max(0, merged.calculatedCalories)
  merged.calculatedProtein = Math.max(0, merged.calculatedProtein)
  merged.calculatedCarbs = Math.max(0, merged.calculatedCarbs)
  merged.calculatedFat = Math.max(0, merged.calculatedFat)

  return merged
}
