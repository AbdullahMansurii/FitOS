export interface PermanentFitnessProfile {
  name: string
  dateOfBirth: string
  heightCm: number
  trainingAgeYears: number
  historicalWeightRange: string
  estimatedBodyFat: string
  targetTrainingFrequency: string
  trainingStyle: string[]
  knownLimitations: string[]
  supplementStack: string[]
  coachingPreference: string
  primaryGoal: string
}

export const ABDULLAH_FITNESS_PROFILE: PermanentFitnessProfile = {
  name: 'Abdullah',
  dateOfBirth: '2005-06-15',
  heightCm: 173,
  trainingAgeYears: 2.7,
  historicalWeightRange: '72–76 kg',
  estimatedBodyFat: '>20%',
  targetTrainingFrequency: '6 days/week',
  trainingStyle: [
    'progressive overload',
    'evidence-based training',
    'strength and hypertrophy focus'
  ],
  knownLimitations: [
    'right adductor tightness history',
    'previous knee imbalance'
  ],
  supplementStack: [
    'Whey Protein',
    'Creatine',
    'Vitamin D3 + K2',
    'Fish Oil',
    'ZMA'
  ],
  coachingPreference: 'direct, data-driven, performance-focused',
  primaryGoal: 'Body Recomposition'
}
