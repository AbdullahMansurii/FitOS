/**
 * contextSeed.ts
 * ──────────────
 * Seeds Abdullah's personal fitness context as approved memories on first run.
 * These memories are injected into every AI Coach conversation via the system prompt.
 * 
 * Called once from App.tsx after unlock — idempotent (checks if already seeded).
 */

import { useMemoryStore, useProfileStore, useGoalsStore } from '@/store/index'
import { generateId } from '@/lib/utils'
import type { Memory } from '@/types'

const SEED_VERSION = 'v1.1-abdullah'
const SEED_KEY = 'fitos-context-seeded'

function makeMemory(
  category: Memory['category'],
  title: string,
  content: string
): Memory {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    category,
    title,
    content,
    source: 'manual',
    confidenceScore: 1.0,
    tags: ['seeded'],
    isApproved: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function seedUserContext() {
  // Only seed once per version
  if (localStorage.getItem(SEED_KEY) === SEED_VERSION) return

  const { memories } = useMemoryStore.getState()
  
  // Don't re-seed if memories already exist (e.g. pulled from Supabase)
  if (memories.filter((m) => m.tags?.includes('seeded')).length > 5) {
    localStorage.setItem(SEED_KEY, SEED_VERSION)
    return
  }

  const contextMemories: Memory[] = [
    // ── Personal Profile ──────────────────────────────────────────────────
    makeMemory(
      'goal_context',
      'Personal Profile',
      'Abdullah Mansuri, 20 years old (DOB: 15 June 2005), male. Height: ~173 cm. Located in Ahmedabad, Gujarat, India. Training experience: 2.5–3 years of consistent gym training.'
    ),

    // ── Fitness Journey ───────────────────────────────────────────────────
    makeMemory(
      'goal_context',
      'Fitness Journey Background',
      'Started fitness journey at ~50 kg bodyweight. Completed a long bulk phase, increasing from 50 kg to ~76–78 kg. No longer in aggressive bulk. Current focus: body recomposition — reducing body fat while preserving or gaining muscle.'
    ),

    // ── Current Goal ──────────────────────────────────────────────────────
    makeMemory(
      'goal_context',
      'Current Primary Goal',
      'Recomposition / Fat Loss Phase. Objectives: reduce body fat, maintain or increase muscle mass, improve visible muscularity and aesthetic physique. Values body composition over scale weight. Long-term: lean, athletic, and aesthetic physique with sustainable habits.'
    ),

    // ── Training Split ────────────────────────────────────────────────────
    makeMemory(
      'preference',
      'Weekly Training Split',
      'Monday: Back + Biceps + Rear Delts + Shrugs. Tuesday: Chest + Triceps + Shoulders. Wednesday: Legs / Physio / Active Recovery. Thursday: Back + Lats + Rear Delts + Shrugs. Friday: Chest + Shoulders. Saturday: Arms + Forearms + 100 bench-supported pushups. Sunday: Rest.'
    ),

    // ── Training Philosophy ───────────────────────────────────────────────
    makeMemory(
      'preference',
      'Training Philosophy',
      'Evidence-based training: progressive overload, consistency, adequate protein intake, long-term adherence, recovery management. Values objective data and measurable progress. Enjoys resistance training as a core lifestyle activity.'
    ),

    // ── Injury History ────────────────────────────────────────────────────
    makeMemory(
      'goal_context',
      'Right Knee Injury & Rehab History',
      'Previously had right knee issue. Physio assessment: right knee weaker than left, right adductor tightness, hip stiffness, movement imbalance. Rehab: mobility work, stability, unilateral lower-body exercises, controlled squat progression. Current status: significantly improved. Continue monitoring lower-body symmetry and recovery. Wednesday is designated for leg / physio / active recovery work.'
    ),

    // ── Activity Goal ─────────────────────────────────────────────────────
    makeMemory(
      'preference',
      'Daily Activity Goal',
      'Targets 10,000 steps per day. Values both gym performance and general daily movement. Maintaining high overall activity level is a priority.'
    ),

    // ── Nutrition Pattern ─────────────────────────────────────────────────
    makeMemory(
      'preference',
      'Diet & Nutrition Overview',
      'Primarily Indian home-cooked meals. Protein: chicken breast, eggs, whey protein, milk. Carbs: rice, chapati/roti, oats, bananas, dates. Other: mixed seeds, peanut butter, fruits, curries. Typical pattern — Breakfast: eggs, oats, whey, fruit, dates. Lunch: 2–4 chapatis + curry. Dinner: chicken with rice. Intake can be inconsistent due to lifestyle/schedule.'
    ),

    // ── Supplements ───────────────────────────────────────────────────────
    makeMemory(
      'preference',
      'Supplement Stack',
      'Regular: Whey Protein, Creatine. Also uses/has used: Omega-3 Fish Oil, Vitamin D3+K2, ZMA. Supplement adherence is generally good.'
    ),

    // ── Coaching Preferences ──────────────────────────────────────────────
    makeMemory(
      'preference',
      'Coaching Style Preference',
      'Wants 50% Coach (direct, actionable) + 50% Data Analyst (precise, evidence-based, trend-focused). Dislikes generic advice or blind motivation. Wants objective, reasoning-backed recommendations based on logged historical data. If data is missing, ask for clarification rather than assuming.'
    ),

    // ── Priority System ───────────────────────────────────────────────────
    makeMemory(
      'preference',
      'Priority Hierarchy for Recommendations',
      'When making recommendations, always prioritize in this order: 1. Historical logged data. 2. Current goal (recomposition). 3. Weight trend. 4. Nutrition adherence. 5. Training adherence. Avoid assumptions — ask if data is missing.'
    ),

    // ── What AI Should Track ──────────────────────────────────────────────
    makeMemory(
      'preference',
      'AI Coaching Focus Areas',
      'Monitor: body-weight trends, calorie intake, protein intake, workout consistency, fat-loss plateaus, recovery issues. Compare progress across periods. Suggest calorie adjustments when plateaued. Suggest training adjustments when needed. Keep historical records of the fitness journey.'
    ),
  ]

  // Batch add all memories
  for (const memory of contextMemories) {
    // Directly set to avoid triggering multiple syncs
    useMemoryStore.setState((s) => ({
      memories: [...s.memories, memory],
    }))
  }

  // ── Update Profile ────────────────────────────────────────────────────────
  const { profile, setProfile, updateProfile } = useProfileStore.getState()
  if (!profile) {
    setProfile({
      id: 'abdullah-primary',
      displayName: 'Abdullah',
      heightCm: 173,
      dateOfBirth: '2005-06-15',
      gender: 'male',
      weightUnit: 'kg',
      energyUnit: 'kcal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } else {
    // Update name/height/DOB if still at defaults
    updateProfile({
      displayName: profile.displayName === 'User' || profile.displayName === '' ? 'Abdullah' : profile.displayName,
      heightCm: profile.heightCm ?? 173,
      dateOfBirth: profile.dateOfBirth ?? '2005-06-15',
      gender: profile.gender ?? 'male',
    })
  }

  // ── Set Active Goal if none exists ───────────────────────────────────────
  const { goals, addGoal } = useGoalsStore.getState()
  const hasActiveGoal = goals.some((g) => g.status === 'active')
  if (!hasActiveGoal) {
    addGoal({
      name: 'Recomposition — Fat Loss Phase',
      type: 'cut',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: undefined,
      startWeight: 77,       // midpoint of 76–78 range
      targetWeight: 70,      // lean recomp target
      calorieTarget: 2400,   // moderate deficit for recomp
      proteinTarget: 180,    // ~1g/lb of target bodyweight
      notes: 'Recomposition phase — reduce body fat while preserving muscle. Not aggressive cut. Prioritize body composition over scale weight.',
    })
  }

  // Mark seeded
  localStorage.setItem(SEED_KEY, SEED_VERSION)
  console.info('[FitOS] Context seeded: Abdullah Mansuri fitness profile loaded into AI memory.')
}
