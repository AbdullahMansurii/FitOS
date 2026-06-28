import type { GoalMode, ActivityLevel, GoalType } from '@/types'

export interface GoalCalculationInput {
  weightKg: number
  heightCm: number
  age: number
  gender: 'male' | 'female' | 'other'
  activityLevel: ActivityLevel
  goalMode: GoalMode
}

export interface GoalCalculationResult {
  bmr: number
  tdee: number
  targetCalories: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
  deficitOrSurplus: number
  estimatedWeeklyChange: number // kg/week
  goalType: GoalType
}

export function calculateGoal(input: GoalCalculationInput): GoalCalculationResult {
  const { weightKg, heightCm, age, gender, activityLevel, goalMode } = input

  // 1. Calculate BMR using Mifflin-St Jeor
  let bmr: number
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  } else if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  } else {
    // Other / average
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78
  }

  // 2. Activity Multiplier
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    athlete: 1.9,
  }
  const multiplier = activityMultipliers[activityLevel] || 1.2
  const tdee = Math.round(bmr * multiplier)

  // 3. Goal Deficits/Surpluses and Weekly Changes
  let deficitOrSurplus: number
  let estimatedWeeklyChange: number
  let goalType: GoalType

  switch (goalMode) {
    case 'fat_loss':
      deficitOrSurplus = -500
      estimatedWeeklyChange = -0.45
      goalType = 'cut'
      break
    case 'aggressive_cut':
      deficitOrSurplus = -750
      estimatedWeeklyChange = -0.68
      goalType = 'cut'
      break
    case 'lean_bulk':
      deficitOrSurplus = 250
      estimatedWeeklyChange = 0.25
      goalType = 'bulk'
      break
    case 'muscle_gain':
      deficitOrSurplus = 500
      estimatedWeeklyChange = 0.45
      goalType = 'bulk'
      break
    case 'recomp':
      deficitOrSurplus = -100
      estimatedWeeklyChange = -0.09
      goalType = 'maintain'
      break
    case 'maintain':
    default:
      deficitOrSurplus = 0
      estimatedWeeklyChange = 0
      goalType = 'maintain'
      break
  }

  const targetCalories = Math.round(tdee + deficitOrSurplus)

  // 4. Calculate protein target based on goal mode and bodyweight
  // Cut: 2.2g/kg, Recomp: 2.0g/kg, Bulk/Maintain: 1.8g/kg
  let proteinMultiplier = 1.8
  if (goalMode === 'fat_loss' || goalMode === 'aggressive_cut') {
    proteinMultiplier = 2.2
  } else if (goalMode === 'recomp') {
    proteinMultiplier = 2.0
  }
  const targetProtein = Math.round(weightKg * proteinMultiplier)

  // 5. Calculate fat target: 25% of target calories (minimum of 0.8g/kg or 40g)
  const calculatedFat = Math.round((targetCalories * 0.25) / 9)
  const minFat = Math.max(Math.round(weightKg * 0.8), 40)
  const targetFat = Math.max(calculatedFat, minFat)

  // 6. Calculate carb target: remaining calories
  const proteinKcal = targetProtein * 4
  const fatKcal = targetFat * 9
  const remainingKcal = targetCalories - (proteinKcal + fatKcal)
  const targetCarbs = Math.max(0, Math.round(remainingKcal / 4))

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    deficitOrSurplus,
    estimatedWeeklyChange,
    goalType,
  }
}
