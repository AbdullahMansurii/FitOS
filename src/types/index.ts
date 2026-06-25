// ─── Core Domain Types ───────────────────────────────────────────────────────

export type GoalType = 'cut' | 'bulk' | 'maintain'
export type GoalStatus = 'active' | 'completed' | 'abandoned'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MemoryCategory = 'preference' | 'insight' | 'goal_context' | 'behavioral'
export type MemorySource = 'ai' | 'manual'
export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'sport'
export type AIProvider = 'groq' | 'openai' | 'gemini' | 'anthropic'
export type WeightUnit = 'kg' | 'lbs'
export type EnergyUnit = 'kcal' | 'kj'

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  displayName: string
  heightCm?: number
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  weightUnit: WeightUnit
  energyUnit: EnergyUnit
  createdAt: string
  updatedAt: string
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export interface Goal {
  id: string
  name: string
  type: GoalType
  status: GoalStatus
  startDate: string
  targetDate?: string
  startWeight: number
  targetWeight?: number
  calorieTarget: number
  proteinTarget: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Weight ──────────────────────────────────────────────────────────────────

export interface WeightLog {
  id: string
  date: string
  weightKg: number
  bodyFatPct?: number
  notes?: string
  createdAt: string
}

// ─── Measurements ────────────────────────────────────────────────────────────

export interface Measurement {
  id: string
  date: string
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  armsCm?: number
  thighsCm?: number
  calvesCm?: number
  weightKg?: number
  leftArmCm?: number
  rightArmCm?: number
  leftThighCm?: number
  rightThighCm?: number
  neckCm?: number
  notes?: string
}

// ─── Food ────────────────────────────────────────────────────────────────────

export interface ServingSize {
  name: string
  weightG: number
}

export interface CuratedFood {
  id: string
  name: string
  aliases: string[]
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  servingSizes: ServingSize[]
}

export interface AIExtractedFood {
  food: string
  quantity: number
  unit: string
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
}

export interface ProposedFoodLog {
  id: string
  raw: AIExtractedFood
  matchedFood: CuratedFood | null
  selectedServingSize: ServingSize | null
  resolvedWeightG: number | null
  calculatedCalories: number
  calculatedProtein: number
  calculatedCarbs: number
  calculatedFat: number
  confidence: 'high' | 'medium' | 'low'
  source: 'curated' | 'custom' | 'open_food_facts' | 'ai_estimated'
}

export interface FoodItem {
  id: string
  name: string
  brand?: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
  servingSizeG?: number
  servingName?: string
  barcode?: string
  source: 'manual' | 'openfoodfacts' | 'usda' | 'seeded'
  isCustom: boolean
}

export interface FoodLog {
  id: string
  date: string
  mealType: MealType
  name: string
  foodItemId?: string
  savedMealId?: string
  quantityG: number
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
  createdAt: string
}

export interface SavedMeal {
  id: string
  name: string
  description?: string
  items: SavedMealItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  createdAt: string
}

export interface SavedMealItem {
  id: string
  savedMealId: string
  foodItemId: string
  foodItem?: FoodItem
  quantityG: number
}

export interface NutritionSummary {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

// ─── Workout ─────────────────────────────────────────────────────────────────

export type MovementPattern = 
  | 'horizontal_push' 
  | 'vertical_push' 
  | 'vertical_pull' 
  | 'horizontal_pull' 
  | 'squat' 
  | 'hinge' 
  | 'unilateral' 
  | 'isolation' 
  | 'core' 
  | 'cardio'

export type ExerciseType = 'compound' | 'isolation' | 'cardio'

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  muscleGroups: string[]
  equipment?: string
  instructions?: string
  isCustom: boolean
  userId?: string
  createdAt?: string
  updatedAt?: string
  aliases?: string[]
  movementPattern?: MovementPattern
  exerciseType?: ExerciseType
}

export interface WorkoutTemplate {
  id: string
  name: string
  description?: string
  splitType: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'custom'
  exercises: WorkoutTemplateExercise[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutTemplateExercise {
  id: string
  templateId: string
  exerciseId: string
  exercise?: Exercise
  orderIndex: number
  targetSets: number
  targetReps: string // "8-12" or "5" etc.
  targetWeight?: number
  restSeconds: number
  notes?: string
}

export interface WorkoutSession {
  id: string
  templateId?: string
  name: string
  date: string
  startedAt?: string
  completedAt?: string
  durationSeconds?: number
  notes?: string
  rating?: number
  totalVolume?: number
  exercises: SessionExercise[]
  createdAt: string
}

export interface SessionExercise {
  id: string
  sessionId: string
  exerciseId: string
  exercise?: Exercise
  orderIndex: number
  sets: ExerciseSet[]
  notes?: string
}

export interface ExerciseSet {
  id: string
  sessionExerciseId: string
  setNumber: number
  reps: number
  weightKg: number
  rpe?: number
  isWarmup: boolean
  completedAt?: string
  isPR?: boolean
}

export interface PersonalRecord {
  id: string
  exerciseId: string
  exercise?: Exercise
  recordType: '1rm' | 'max_reps' | 'max_volume'
  value: number
  achievedAt: string
}

// ─── AI & Memory ─────────────────────────────────────────────────────────────

export interface Memory {
  id: string
  category: MemoryCategory
  title: string
  content: string
  isApproved: boolean
  source: MemorySource
  confidenceScore?: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface AIResponse {
  content: string
  memorysuggestions?: MemorySuggestion[]
  provider: AIProvider
  model: string
}

export interface MemorySuggestion {
  title: string
  content: string
  category: MemoryCategory
  confidence: number
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface AppSettings {
  aiProvider: AIProvider
  aiApiKey: string
  aiModel: string
  weightUnit: WeightUnit
  energyUnit: EnergyUnit
  defaultMealTypes: MealType[]
  restTimerDefault: number
  theme: 'dark' | 'light'
}

// ─── UI Utility ──────────────────────────────────────────────────────────────

export interface DateRange {
  from: Date
  to: Date
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// ─── Exercise Intelligence Layer ─────────────────────────────────────────────

export interface ExerciseSetPerformance {
  weightKg: number
  reps: number
  isWarmup: boolean
  e1rm: number
}

export interface ExerciseSessionRecord {
  sessionId: string
  sessionName: string
  date: string
  sets: ExerciseSetPerformance[]
  volume: number
  peakE1RM: number
  bestSet: { weightKg: number; reps: number; e1rm: number }
}

export interface PersonalRecordMetric {
  value: number
  achievedAt: string
  sessionId: string
  sessionName: string
}

export interface ExerciseHistorySummary {
  exerciseId: string
  
  // 1. Last Session
  lastSession: ExerciseSessionRecord | null
  
  // 2. Best Session
  bestSession: ExerciseSessionRecord | null
  
  // 3. Trends (last 30 days)
  trends30d: {
    e1rmPctChange: number | null
    volumePctChange: number | null
  }
  
  // 4. Personal Records
  personalRecords: {
    heaviestWeight: PersonalRecordMetric | null
    highestReps: PersonalRecordMetric | null
    highestVolume: PersonalRecordMetric | null
    highestE1RM: PersonalRecordMetric | null
  }
  
  // 5. History list (up to 10 entries)
  history: {
    sessionId: string
    sessionName: string
    date: string
    volume: number
    peakE1RM: number
  }[]
}

// ─── Progressive Overload Engine ─────────────────────────────────────────────

export type RecommendationType =
  | 'increase_weight'
  | 'increase_reps'
  | 'maintain'
  | 'deload'
  | 'insufficient_data'

export type ConfidenceLevel =
  | 'low'
  | 'medium'
  | 'high'

export interface ProgressionRecommendation {
  exerciseId: string
  recommendationType: RecommendationType
  recommendation: RecommendationType
  message: string
  suggestedWeightKg: number | null
  suggestedWeight: number | null
  suggestedRepTarget: number | null
  suggestedReps: number | null
  confidence: ConfidenceLevel
  reasoning: string[]
  currentPeakE1RM: number | null
  currentVolume: number | null
  projectedE1RM: number | null
  projectedVolume: number | null
  stallDetected: boolean
  potentialPR: boolean
  readinessScore: number
  volumeImproving: boolean
  fatigueWarning: boolean
  daysSinceLastSession: number | null
  weeklyFrequency: number
  reason: string
}
