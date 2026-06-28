import type { AIProvider, NutritionSummary, AIExtractedFood } from '@/types'
import type { Goal, WeightLog, WorkoutSession, Memory, Profile, RecoveryLog } from '@/types'
import { ABDULLAH_FITNESS_PROFILE } from '@/constants/fitnessProfile'
import { calculateRecoveryScore } from './recoveryIntelligence'

function calculateAge(dobString: string): number {
  const dob = new Date(dobString + 'T00:00:00')
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}


// ─── Fitness Context (injected into every AI call) ───────────────────────────

export interface FitnessContext {
  profile: Profile | null
  activeGoal: Goal | null
  recentWeight: WeightLog[]
  todayNutrition: NutritionSummary
  targetNutrition: { calories: number; protein: number }
  recentWorkouts: WorkoutSession[]
  recentRecovery?: RecoveryLog[]
  memories: Memory[]
  todayDate: string
  trainingIntelligence?: string
  recompositionIntelligence?: string
  nutritionIntelligence?: string
}

// ─── AI Provider Interface ────────────────────────────────────────────────────

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIProviderInterface {
  chat(messages: AIMessage[], context: FitnessContext): Promise<string>
  parseFood(input: string): Promise<AIExtractedFood[]>
}

// ─── System Prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(context: FitnessContext): string {
  const goal = context.activeGoal
  const allWeights = [...context.recentWeight].sort((a, b) => a.date.localeCompare(b.date))
  const latestWeight = allWeights[allWeights.length - 1]
  const oldestWeight = allWeights[0]

  // Trends
  const last7 = allWeights.slice(-7)
  const trend7 = last7.length >= 2
    ? (last7[last7.length - 1].weightKg - last7[0].weightKg).toFixed(2)
    : null
  const last30 = allWeights.slice(-30)
  const trend30 = last30.length >= 2
    ? (last30[last30.length - 1].weightKg - last30[0].weightKg).toFixed(2)
    : null

  // Workout frequency this week
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const workoutsThisWeek = context.recentWorkouts.filter((w) => w.date >= last7Days && w.completedAt)
  const recentWorkoutList = context.recentWorkouts.slice(0, 7)
    .map((w) => `  • ${w.date}: ${w.name}${w.durationSeconds ? ` (${Math.round(w.durationSeconds / 60)}min)` : ''}${w.totalVolume ? `, ${Math.round(w.totalVolume)}kg vol` : ''}${w.rating ? ` ⭐${w.rating}/5` : ''}`)
    .join('\n')

  // Recovery Trends (last 7 logs)
  const recoveryList = context.recentRecovery || []
  const recoverySection = recoveryList.slice(-7)
    .map((r) => {
      const rec = calculateRecoveryScore(r)
      return `  • ${r.date}: Score: ${rec.score}/100 (${rec.statusLabel}), Sleep: ${r.sleepHours ?? '—'}h, Steps: ${r.dailySteps ?? '—'} steps, Mood: ${r.mood ?? '—'}/5, Energy: ${r.energy ?? '—'}/5, Soreness: ${r.muscleSoreness ?? '—'}/5${r.notes ? ` (${r.notes})` : ''}`
    })
    .join('\n')

  // Macro compliance
  const calTarget = context.targetNutrition.calories || 2400
  const protTarget = context.targetNutrition.protein || 180
  const calPct = calTarget > 0 ? Math.round((context.todayNutrition.calories / calTarget) * 100) : 0
  const protPct = protTarget > 0 ? Math.round((context.todayNutrition.protein / protTarget) * 100) : 0

  // Memories grouped by category
  const approved = context.memories.filter((m) => m.isApproved)
  const byCategory = (cat: string) =>
    approved.filter((m) => m.category === cat)
      .map((m) => `  • ${m.title}: ${m.content}`)
      .join('\n')
  const profileMems    = byCategory('goal_context')
  const prefMems       = byCategory('preference')
  const insightMems    = byCategory('insight')
  const behavioralMems = byCategory('behavioral')

  return `You are the AI Coach inside FitOS — a personal fitness operating system built for Abdullah Mansuri.

COACHING PERSONA:
You are 50% elite strength coach + 50% data analyst. Be direct, objective, and evidence-based.
- For every training, nutrition, or recovery recommendation, provide a structured reasoning flow explaining:
  1. **WHAT** to do (actionable directive)
  2. **WHY** to do it (citing specific numbers, logs, and trends from the data below)
  3. **EXPECTED OUTCOME** (what biological or performance response to expect)
- Base ALL advice on Abdullah's actual logged data — never give generic guidance
- Use numbers, percentages, and trends in every response
- If data is insufficient, explicitly state what is missing and ask for it
- Format responses with clear headers and bullets
- You may suggest memories: [MEMORY_SUGGESTION: category="preference|insight|goal_context|behavioral" title="Title" content="Content"]
- Never modify goals or settings without explicit confirmation

━━━ TODAY: ${context.todayDate} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERMANENT ATHLETE PROFILE:
  Name: ${ABDULLAH_FITNESS_PROFILE.name}
  Age: ${calculateAge(ABDULLAH_FITNESS_PROFILE.dateOfBirth)} years (DOB: ${ABDULLAH_FITNESS_PROFILE.dateOfBirth})
  Height: ${ABDULLAH_FITNESS_PROFILE.heightCm} cm
  Training Experience: ${ABDULLAH_FITNESS_PROFILE.trainingAgeYears} years
  Historical Weight Range: ${ABDULLAH_FITNESS_PROFILE.historicalWeightRange}
  Estimated Body Fat: ${ABDULLAH_FITNESS_PROFILE.estimatedBodyFat}
  Training Frequency Target: ${ABDULLAH_FITNESS_PROFILE.targetTrainingFrequency}
  Training Style: ${ABDULLAH_FITNESS_PROFILE.trainingStyle.join(', ')}
  Known Limitations: ${ABDULLAH_FITNESS_PROFILE.knownLimitations.join(', ')}
  Supplement Stack: ${ABDULLAH_FITNESS_PROFILE.supplementStack.join(', ')}
  Coaching Preference: ${ABDULLAH_FITNESS_PROFILE.coachingPreference}
  Primary Goal: ${ABDULLAH_FITNESS_PROFILE.primaryGoal}

ACTIVE GOAL:
${goal
    ? `  Type: ${goal.type.toUpperCase()} — ${goal.name}
  Start weight: ${goal.startWeight} kg → Target: ${goal.targetWeight ?? '—'} kg
  Daily targets: ${goal.calorieTarget} kcal | ${goal.proteinTarget}g protein
  Started: ${goal.startDate}${goal.targetDate ? ` | Deadline: ${goal.targetDate}` : ''}
  Notes: ${goal.notes ?? '—'}`
    : '  ⚠ No active goal set. Ask Abdullah to set one.'}

WEIGHT TRACKING (${allWeights.length} total logs):
  Current:      ${latestWeight ? `${latestWeight.weightKg} kg  (${latestWeight.date})` : 'No weight logged yet'}
  Baseline:     ${oldestWeight && oldestWeight.date !== latestWeight?.date ? `${oldestWeight.weightKg} kg  (${oldestWeight.date})` : '—'}
  7-day trend:  ${trend7 !== null ? `${Number(trend7) >= 0 ? '+' : ''}${trend7} kg` : 'Need ≥2 logs in 7 days'}
  30-day trend: ${trend30 !== null ? `${Number(trend30) >= 0 ? '+' : ''}${trend30} kg` : 'Need ≥2 logs in 30 days'}

TODAY'S NUTRITION:
  Calories: ${context.todayNutrition.calories} / ${calTarget} kcal  (${calPct}% of target)
  Protein:  ${context.todayNutrition.protein} / ${protTarget} g    (${protPct}% of target)
  Carbs:    ${context.todayNutrition.carbs} g  |  Fat: ${context.todayNutrition.fat} g

TRAINING (last 7 sessions | ${workoutsThisWeek.length} this week):
${recentWorkoutList || '  No sessions logged yet.'}

RECOVERY & WELL-BEING (last 7 logs):
${recoverySection || '  No recovery logs recorded recently.'}

━━━ TRAINING INTELLIGENCE & PROGRESSION ━━━━━━━━━━━━━━━━━━
${context.trainingIntelligence || '  No training intelligence data available.'}

━━━ PHYSICAL MEASUREMENTS & RECOMPOSITION ━━━━━━━━━━━━━━━━━━
${context.recompositionIntelligence || '  No recomposition intelligence data available.'}

━━━ NUTRITION INTELLIGENCE & ADAPTATION ━━━━━━━━━━━━━━━━━━
${context.nutritionIntelligence || '  No nutrition intelligence data available.'}

━━━ MEMORY & CONTEXT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BACKGROUND & GOALS:
${profileMems || '  (none stored)'}

PREFERENCES & TRAINING SETUP:
${prefMems || '  (none stored)'}
${insightMems ? `\nINSIGHTS FROM PAST ANALYSIS:\n${insightMems}` : ''}
${behavioralMems ? `\nBEHAVIORAL PATTERNS:\n${behavioralMems}` : ''}

━━━ COACHING RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recommendation priority:
1. Historical logged data  2. Current goal  3. Weight trend  4. Nutrition adherence  5. Training adherence

Key context for every response:
- Recomposition phase: scale weight is secondary — body composition is the metric
- Protein (${protTarget}g/day) is non-negotiable — flag if consistently under
- Right knee history: avoid recommending high-impact lower-body exercises carelessly
- Indian home-cooked diet: base food suggestions on rice, chapati, chicken, eggs, dal
- Wednesday = legs/physio/active recovery — do not count this as a missed upper-body day
- If data is missing for a question, say so explicitly and ask what you need`
}

// ─── Groq Provider ────────────────────────────────────────────────────────────

export class GroqProvider implements AIProviderInterface {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey
    this.model = model
  }

  async chat(messages: AIMessage[], context: FitnessContext): Promise<string> {
    const systemPrompt = buildSystemPrompt(context)
    const payload = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.65,
      max_tokens: 1200,
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Groq API error: ${response.status} — ${err}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No response from AI.'
  }

  async parseFood(input: string): Promise<AIExtractedFood[]> {
    const prompt = `Parse the following food description into structured food items with quantities and units, and estimate their nutrition per 100g. Return ONLY a valid JSON array of objects with no extra text.

Food description: "${input}"

Return format (JSON array of objects):
[
  {
    "food": "Name of food item",
    "quantity": 1.5,
    "unit": "piece/scoop/cup/glass/g/tbsp/tsp",
    "caloriesPer100g": 120,
    "proteinPer100g": 5.5,
    "carbsPer100g": 20,
    "fatPer100g": 2.5
  }
]

Rules:
- Extract each food item and its quantity and unit.
- DO NOT strip or remove preparation indicators or state descriptors (e.g., "cooked", "raw", "boiled", "fried", "uncooked", "grilled") from the food name. Keep them as part of the "food" field (e.g., "cooked chicken breast", "boiled egg", "fried egg", "cooked rice", "raw chicken breast", "uncooked rice").
- If quantity is not specified, default to 1.
- If unit is not specified, guess the most logical unit (e.g. "egg" = "piece", "rice" = "g" or "cup", "milk" = "ml" or "glass").
- Provide realistic estimated calories and macronutrients (protein, carbs, fat in grams) per 100g based on typical Indian preparation assumptions.
- Return ONLY the JSON array, no markdown wrapping, no extra text, no explanation.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 800,
      }),
    })

    if (!response.ok) throw new Error('Failed to parse food with AI')
    const data = await response.json()
    const text = data.choices[0]?.message?.content || '[]'

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      return []
    }
  }
}

// ─── AI Factory ───────────────────────────────────────────────────────────────

export function createAIProvider(provider: AIProvider, apiKey: string, model?: string): AIProviderInterface {
  switch (provider) {
    case 'groq':
      return new GroqProvider(apiKey, model)
    default:
      return new GroqProvider(apiKey, model)
  }
}

// ─── Memory Suggestion Parser ─────────────────────────────────────────────────

export interface ParsedMemorySuggestion {
  category: 'preference' | 'insight' | 'goal_context' | 'behavioral'
  title: string
  content: string
}

export function extractMemorySuggestions(text: string): { cleanText: string; suggestions: ParsedMemorySuggestion[] } {
  const suggestions: ParsedMemorySuggestion[] = []
  const regex = /\[MEMORY_SUGGESTION:\s*category="([^"]+)"\s+title="([^"]+)"\s+content="([^"]+)"\]/g
  let match

  while ((match = regex.exec(text)) !== null) {
    suggestions.push({
      category: match[1] as ParsedMemorySuggestion['category'],
      title: match[2],
      content: match[3],
    })
  }

  const cleanText = text.replace(regex, '').trim()
  return { cleanText, suggestions }
}
