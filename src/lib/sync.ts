/**
 * FitOS Sync Service
 * ------------------
 * Bidirectional sync between local Zustand stores and Supabase.
 * Strategy: Local-first. Supabase is a backup/restore layer.
 */

import { supabase, setSupabaseAuthHeader } from './supabase'
import { registerSchedulePush } from './syncEvents'
import {
  useWeightStore,
  useGoalsStore,
  useFoodStore,
  useWorkoutStore,
  useMemoryStore,
  useProfileStore,
  useRecoveryStore,
  usePhotosStore,
  backupWorkoutStore,
} from '@/store/index'
import { useAuthStore } from '@/store/authStore'
import type { WeightLog, Goal, FoodLog, WorkoutSession, Memory, Profile, Exercise, WorkoutTemplate, Measurement, SavedMeal, RecoveryLog, ProgressPhoto } from '@/types'
import { SEEDED_EXERCISES, SEEDED_TEMPLATES } from '@/constants/seeds'

// ─── Status tracking ───────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline'

interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  error: string | null
}

let _syncState: SyncState = { status: 'idle', lastSyncedAt: null, error: null }
let _listeners: Array<(s: SyncState) => void> = []

// Self-register with the event bridge so store mutations can trigger syncs.
// This runs once when sync.ts is first statically imported (in App.tsx).
registerSchedulePush(schedulePush)

export function logSyncWarning(event: string, payload: unknown) {
  console.warn(`[Sync Warning] Event: ${event}`, payload)
}

export function getSyncState() { return _syncState }
export function onSyncStateChange(cb: (s: SyncState) => void) {
  _listeners.push(cb)
  return () => { _listeners = _listeners.filter((l) => l !== cb) }
}

function setState(updates: Partial<SyncState>) {
  _syncState = { ..._syncState, ...updates }
  _listeners.forEach((l) => l(_syncState))
}

export async function pushAll(): Promise<boolean> {
  backupWorkoutStore()
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setState({ status: 'offline', error: null })
    return false
  }
  setState({ status: 'syncing', error: null })
  try {
    const { profile } = useProfileStore.getState()
    const { goals } = useGoalsStore.getState()
    const { logs: weightLogs, measurements } = useWeightStore.getState()
    const { foodLogs, savedMeals, deletedSavedMealIds } = useFoodStore.getState()
    const { sessions, templates, exercises } = useWorkoutStore.getState()
    const { memories } = useMemoryStore.getState()
    const { recoveryLogs, deletedRecoveryLogIds } = useRecoveryStore.getState()
    const { photos, deletedPhotoIds } = usePhotosStore.getState()

    // Profile: Sequential upload first to establish RLS sync_token
    if (profile) {
      const { syncToken } = useAuthStore.getState()
      const { error } = await supabase.from('profiles').upsert({
        id: profile.id,
        display_name: profile.displayName,
        height_cm: profile.heightCm ?? null,
        weight_unit: profile.weightUnit,
        energy_unit: profile.energyUnit,
        date_of_birth: profile.dateOfBirth ?? null,
        gender: profile.gender ?? null,
        sync_token: syncToken,
      }, { onConflict: 'id' })

      if (error) throw new Error(error.message)
    }

    interface SyncResult {
      error: { message: string } | null
    }
    const ops: Promise<SyncResult>[] = []

    // Goals
    if (goals.length) {
      const rows = goals.map((g) => ({
        id: g.id, name: g.name, type: g.type, status: g.status,
        start_date: g.startDate, target_date: g.targetDate ?? null,
        start_weight: g.startWeight ?? null, target_weight: g.targetWeight ?? null,
        calorie_target: g.calorieTarget ?? null, protein_target: g.proteinTarget ?? null,
        notes: g.notes ?? null,
        goal_mode: g.goalMode ?? 'fat_loss',
        activity_level: g.activityLevel ?? 'moderately_active',
        carb_target: g.carbTarget ?? null,
        fat_target: g.fatTarget ?? null,
        tdee_estimate: g.tdeeEstimate ?? null,
        deficit_surplus: g.deficitSurplus ?? 0,
      }))
      ops.push(supabase.from('goals').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Weight logs
    if (weightLogs.length) {
      const rows = weightLogs.map((w) => ({
        id: w.id, date: w.date, weight_kg: w.weightKg, notes: w.notes ?? null,
      }))
      ops.push(supabase.from('weight_logs').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Measurements
    if (measurements.length) {
      const rows = measurements.map((m) => {
        const meta = {
          weightKg: m.weightKg,
          leftArmCm: m.leftArmCm,
          rightArmCm: m.rightArmCm,
          leftThighCm: m.leftThighCm,
          rightThighCm: m.rightThighCm,
          neckCm: m.neckCm,
          userNotes: m.notes ?? ''
        }
        const notesStr = `__fitos_meta__:${JSON.stringify(meta)}`
        return {
          id: m.id,
          date: m.date,
          chest_cm: m.chestCm ?? null,
          waist_cm: m.waistCm ?? null,
          hips_cm: m.hipsCm ?? null,
          bicep_cm: m.leftArmCm ?? null,
          thigh_cm: m.leftThighCm ?? null,
          neck_cm: m.neckCm ?? null,
          notes: notesStr
        }
      })
      ops.push(supabase.from('measurements').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Food logs
    if (foodLogs.length) {
      const rows = foodLogs.map((f) => ({
        id: f.id, date: f.date, meal_type: f.mealType, name: f.name,
        quantity_g: f.quantityG, calories: f.calories, protein: f.protein,
        carbs: f.carbs, fat: f.fat, food_item_id: f.foodItemId ?? null,
        protein_quality_score: f.proteinQualityScore ?? null,
        protein_quality_method: f.proteinQualityMethod ?? 'none',
        nutrition_source: f.nutritionSource ?? 'manual',
        saved_meal_version: f.savedMealVersion ?? null,
      }))
      ops.push(supabase.from('food_logs').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Saved Meals
    if (savedMeals.length) {
      const rows = savedMeals.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description ?? null,
        items: m.items,
        total_calories: m.totalCalories,
        total_protein: m.totalProtein,
        total_carbs: m.totalCarbs,
        total_fat: m.totalFat,
        category: m.category ?? 'custom',
        total_fiber: m.totalFiber ?? 0,
        protein_quality_score: m.proteinQualityScore ?? null,
        protein_quality_method: m.proteinQualityMethod ?? 'none',
        usage_count: m.usageCount ?? 0,
        last_used_at: m.lastUsedAt ?? null,
        version: m.version ?? 1,
        parent_meal_id: m.parentMealId ?? null,
        is_current: m.isCurrent ?? true,
        updated_at: m.updatedAt ?? new Date().toISOString(),
      }))
      ops.push(supabase.from('saved_meals').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Recovery logs
    if (recoveryLogs.length) {
      const rows = recoveryLogs.map((r) => ({
        id: r.id,
        date: r.date,
        daily_steps: r.dailySteps ?? null,
        sleep_hours: r.sleepHours ?? null,
        mood: r.mood ?? null,
        energy: r.energy ?? null,
        muscle_soreness: r.muscleSoreness ?? null,
        notes: r.notes ?? null,
        created_at: r.createdAt ?? new Date().toISOString(),
      }))
      ops.push(supabase.from('recovery_logs').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Workout sessions (exercises as JSONB)
    if (sessions.length) {
      const rows = sessions.map((s) => ({
        id: s.id, template_id: s.templateId ?? null, name: s.name, date: s.date,
        started_at: s.startedAt ?? null, completed_at: s.completedAt ?? null,
        duration_seconds: s.durationSeconds ?? null, exercises: s.exercises,
        total_volume: s.totalVolume ?? null, notes: s.notes ?? null, rating: s.rating ?? null,
      }))
      ops.push(supabase.from('workout_sessions').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Exercises
    if (exercises.length) {
      const rows = exercises.map((e) => ({
        id: e.id,
        name: e.name,
        muscle_groups: e.muscleGroups,
        equipment: e.equipment ?? null,
        category: e.category,
        description: e.instructions ?? null,
        is_custom: e.isCustom,
        created_at: e.createdAt ?? new Date().toISOString(),
        updated_at: e.updatedAt ?? new Date().toISOString(),
      }))
      ops.push(supabase.from('exercises').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Workout Templates
    if (templates.length) {
      const rows = templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        split_type: t.splitType,
        exercises: t.exercises,
        created_at: t.createdAt ?? new Date().toISOString(),
        updated_at: t.updatedAt ?? new Date().toISOString(),
      }))
      ops.push(supabase.from('workout_templates').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    const { deletedTemplateIds, deletedExerciseIds } = useWorkoutStore.getState()
    const { deletedGoalIds } = useGoalsStore.getState()
    const { deletedWeightLogIds, deletedMeasurementIds } = useWeightStore.getState()
    const { deletedFoodLogIds } = useFoodStore.getState()
    const { deletedMemoryIds } = useMemoryStore.getState()

    let successfullyDeletedExerciseIds: string[] = []
    let successfullyDeletedTemplateIds: string[] = []
    let successfullyDeletedGoalIds: string[] = []
    let successfullyDeletedWeightLogIds: string[] = []
    let successfullyDeletedMeasurementIds: string[] = []
    let successfullyDeletedFoodLogIds: string[] = []
    let successfullyDeletedMemoryIds: string[] = []
    let successfullyDeletedSavedMealIds: string[] = []
    let successfullyDeletedRecoveryLogIds: string[] = []
    let successfullyDeletedPhotoIds: string[] = []

    // Exercises deletion sync
    const deleteExercisesOp = (async () => {
      try {
        if (deletedExerciseIds.length > 0) {
          const { error: delErr } = await supabase.from('exercises').delete().in('id', deletedExerciseIds)
          if (delErr) return { error: delErr }
          successfullyDeletedExerciseIds = [...deletedExerciseIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync exercise deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteExercisesOp as unknown as Promise<SyncResult>)

    // Workout Templates deletion sync
    const deleteTemplatesOp = (async () => {
      try {
        if (deletedTemplateIds.length > 0) {
          const { error: delErr } = await supabase.from('workout_templates').delete().in('id', deletedTemplateIds)
          if (delErr) return { error: delErr }
          successfullyDeletedTemplateIds = [...deletedTemplateIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync template deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteTemplatesOp as unknown as Promise<SyncResult>)

    // Goals deletion sync
    const deleteGoalsOp = (async () => {
      try {
        if (deletedGoalIds.length > 0) {
          const { error: delErr } = await supabase.from('goals').delete().in('id', deletedGoalIds)
          if (delErr) return { error: delErr }
          successfullyDeletedGoalIds = [...deletedGoalIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync goal deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteGoalsOp as unknown as Promise<SyncResult>)

    // Weight logs deletion sync
    const deleteWeightLogsOp = (async () => {
      try {
        if (deletedWeightLogIds.length > 0) {
          const { error: delErr } = await supabase.from('weight_logs').delete().in('id', deletedWeightLogIds)
          if (delErr) return { error: delErr }
          successfullyDeletedWeightLogIds = [...deletedWeightLogIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync weight log deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteWeightLogsOp as unknown as Promise<SyncResult>)

    // Measurements deletion sync
    const deleteMeasurementsOp = (async () => {
      try {
        if (deletedMeasurementIds.length > 0) {
          const { error: delErr } = await supabase.from('measurements').delete().in('id', deletedMeasurementIds)
          if (delErr) return { error: delErr }
          successfullyDeletedMeasurementIds = [...deletedMeasurementIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync measurement deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteMeasurementsOp as unknown as Promise<SyncResult>)

    // Food logs deletion sync
    const deleteFoodLogsOp = (async () => {
      try {
        if (deletedFoodLogIds.length > 0) {
          const { error: delErr } = await supabase.from('food_logs').delete().in('id', deletedFoodLogIds)
          if (delErr) return { error: delErr }
          successfullyDeletedFoodLogIds = [...deletedFoodLogIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync food log deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteFoodLogsOp as unknown as Promise<SyncResult>)

    // Saved meals deletion sync
    const deleteSavedMealsOp = (async () => {
      try {
        if (deletedSavedMealIds.length > 0) {
          const { error: delErr } = await supabase.from('saved_meals').delete().in('id', deletedSavedMealIds)
          if (delErr) return { error: delErr }
          successfullyDeletedSavedMealIds = [...deletedSavedMealIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync saved meal deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteSavedMealsOp as unknown as Promise<SyncResult>)

    // Recovery logs deletion sync
    const deleteRecoveryLogsOp = (async () => {
      try {
        if (deletedRecoveryLogIds.length > 0) {
          const { error: delErr } = await supabase.from('recovery_logs').delete().in('id', deletedRecoveryLogIds)
          if (delErr) return { error: delErr }
          successfullyDeletedRecoveryLogIds = [...deletedRecoveryLogIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync recovery log deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteRecoveryLogsOp as unknown as Promise<SyncResult>)

    // Memories deletion sync
    const deleteMemoriesOp = (async () => {
      try {
        if (deletedMemoryIds.length > 0) {
          const { error: delErr } = await supabase.from('memories').delete().in('id', deletedMemoryIds)
          if (delErr) return { error: delErr }
          successfullyDeletedMemoryIds = [...deletedMemoryIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync memory deletions'
        return { error: { message } }
      }
    })()
    ops.push(deleteMemoriesOp as unknown as Promise<SyncResult>)

    // Memories (approved only)
    const approvedMemories = memories.filter((m) => m.isApproved)
    if (approvedMemories.length) {
      const rows = approvedMemories.map((m) => ({
        id: m.id, category: m.category, title: m.title, content: m.content,
        source: m.source, confidence_score: m.confidenceScore,
        tags: m.tags, is_approved: m.isApproved,
      }))
      ops.push(supabase.from('memories').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Progress Photos push
    if (photos.length) {
      const rows = photos.map((p) => ({
        id: p.id,
        date: p.date,
        photo_type: p.photoType,
        photo_data: p.photoData,
        notes: p.notes ?? null,
        created_at: p.createdAt ?? new Date().toISOString(),
      }))
      ops.push(supabase.from('progress_photos').upsert(rows, { onConflict: 'id' }) as unknown as Promise<SyncResult>)
    }

    // Progress Photos deletion sync
    const deletePhotosOp = (async () => {
      try {
        if (deletedPhotoIds.length > 0) {
          const { error: delErr } = await supabase.from('progress_photos').delete().in('id', deletedPhotoIds)
          if (delErr) return { error: delErr }
          successfullyDeletedPhotoIds = [...deletedPhotoIds]
        }
        return { error: null }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to sync photo deletions'
        return { error: { message } }
      }
    })()
    ops.push(deletePhotosOp as unknown as Promise<SyncResult>)

    const results = await Promise.all(ops)
    const firstError = results.find((r) => r?.error)?.error
    if (firstError) throw new Error(firstError.message)

    // Prune tombstones on success
    if (successfullyDeletedExerciseIds.length > 0 || successfullyDeletedTemplateIds.length > 0) {
      useWorkoutStore.setState((s) => ({
        deletedExerciseIds: s.deletedExerciseIds.filter(id => !successfullyDeletedExerciseIds.includes(id)),
        deletedTemplateIds: s.deletedTemplateIds.filter(id => !successfullyDeletedTemplateIds.includes(id)),
      }))
    }
    if (successfullyDeletedGoalIds.length > 0) {
      useGoalsStore.setState((s) => ({
        deletedGoalIds: s.deletedGoalIds.filter(id => !successfullyDeletedGoalIds.includes(id)),
      }))
    }
    if (successfullyDeletedWeightLogIds.length > 0) {
      useWeightStore.setState((s) => ({
        deletedWeightLogIds: s.deletedWeightLogIds.filter(id => !successfullyDeletedWeightLogIds.includes(id)),
      }))
    }
    if (successfullyDeletedMeasurementIds.length > 0) {
      useWeightStore.setState((s) => ({
        deletedMeasurementIds: s.deletedMeasurementIds.filter(id => !successfullyDeletedMeasurementIds.includes(id)),
      }))
    }
    if (successfullyDeletedFoodLogIds.length > 0) {
      useFoodStore.setState((s) => ({
        deletedFoodLogIds: s.deletedFoodLogIds.filter(id => !successfullyDeletedFoodLogIds.includes(id)),
      }))
    }
    if (successfullyDeletedSavedMealIds.length > 0) {
      useFoodStore.setState((s) => ({
        deletedSavedMealIds: s.deletedSavedMealIds.filter(id => !successfullyDeletedSavedMealIds.includes(id)),
      }))
    }
    if (successfullyDeletedRecoveryLogIds.length > 0) {
      useRecoveryStore.setState((s) => ({
        deletedRecoveryLogIds: s.deletedRecoveryLogIds.filter(id => !successfullyDeletedRecoveryLogIds.includes(id)),
      }))
    }
    if (successfullyDeletedPhotoIds.length > 0) {
      usePhotosStore.setState((s) => ({
        deletedPhotoIds: s.deletedPhotoIds.filter(id => !successfullyDeletedPhotoIds.includes(id)),
      }))
    }
    if (successfullyDeletedMemoryIds.length > 0) {
      useMemoryStore.setState((s) => ({
        deletedMemoryIds: s.deletedMemoryIds.filter(id => !successfullyDeletedMemoryIds.includes(id)),
      }))
    }

    // Update sync metadata
    const entityTypes = ['profiles','goals','weight_logs','food_logs','workout_sessions','memories','exercises','workout_templates','measurements','saved_meals','recovery_logs','progress_photos']
    await supabase.from('sync_metadata').upsert(
      entityTypes.map((t) => ({ entity_type: t, last_synced_at: new Date().toISOString() })),
      { onConflict: 'entity_type' }
    )

    setState({ status: 'success', lastSyncedAt: new Date().toISOString(), error: null })
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    setState({ status: 'error', error: msg })
    console.error('[FitOS Sync] pushAll failed:', msg)
    return false
  }
}

// ─── Pull: Supabase → local ───────────────────────────────────────────────

export async function pullAll(): Promise<boolean> {
  backupWorkoutStore()
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setState({ status: 'offline', error: null })
    return false
  }
  setState({ status: 'syncing', error: null })
  try {
    const { deletedGoalIds } = useGoalsStore.getState()
    const { deletedWeightLogIds, deletedMeasurementIds } = useWeightStore.getState()
    const { deletedFoodLogIds, deletedSavedMealIds } = useFoodStore.getState()
    const { deletedMemoryIds } = useMemoryStore.getState()
    const { deletedRecoveryLogIds } = useRecoveryStore.getState()
    const { deletedPhotoIds } = usePhotosStore.getState()

    const [
      profileRes,
      goalsRes,
      weightRes,
      foodRes,
      sessionsRes,
      memoriesRes,
      exercisesRes,
      templatesRes,
      measurementsRes,
      savedMealsRes,
      recoveryRes,
      photosRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').limit(1).maybeSingle(),
      supabase.from('goals').select('*').order('created_at', { ascending: true }),
      supabase.from('weight_logs').select('*').order('date', { ascending: true }),
      supabase.from('food_logs').select('*').order('date', { ascending: false }).limit(500),
      supabase.from('workout_sessions').select('*').order('date', { ascending: false }).limit(200),
      supabase.from('memories').select('*').eq('is_approved', true),
      supabase.from('exercises').select('*'),
      supabase.from('workout_templates').select('*'),
      supabase.from('measurements').select('*').order('date', { ascending: true }),
      supabase.from('saved_meals').select('*').order('created_at', { ascending: true }),
      supabase.from('recovery_logs').select('*').order('date', { ascending: true }),
      supabase.from('progress_photos').select('*').order('date', { ascending: false }),
    ])

    // Merge profile
    if (profileRes.data) {
      const row = profileRes.data
      useProfileStore.getState().setProfile({
        id: row.id,
        displayName: row.display_name,
        heightCm: row.height_cm,
        weightUnit: row.weight_unit,
        energyUnit: row.energy_unit,
        dateOfBirth: row.date_of_birth,
        gender: row.gender,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as Profile)

      const { syncToken } = useAuthStore.getState()
      if (!syncToken && row.sync_token) {
        useAuthStore.setState({ syncToken: row.sync_token })
        setSupabaseAuthHeader(row.sync_token)
      }
    }

    // Goals
    if (goalsRes.data?.length) {
      const parsedGoals: Goal[] = goalsRes.data.map((row) => ({
        id: row.id, name: row.name, type: row.type, status: row.status,
        startDate: row.start_date, targetDate: row.target_date,
        startWeight: row.start_weight, targetWeight: row.target_weight,
        calorieTarget: row.calorie_target, proteinTarget: row.protein_target,
        notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
        goalMode: row.goal_mode, activityLevel: row.activity_level,
        carbTarget: row.carb_target, fatTarget: row.fat_target,
        tdeeEstimate: row.tdee_estimate, deficitSurplus: row.deficit_surplus,
      }))
      const goals = parsedGoals.filter((g) => !deletedGoalIds.includes(g.id))
      useGoalsStore.setState({ goals })
    }

    // Weight logs
    if (weightRes.data?.length) {
      const parsedLogs: WeightLog[] = weightRes.data.map((row) => ({
        id: row.id, date: row.date, weightKg: row.weight_kg,
        notes: row.notes, createdAt: row.created_at,
      }))
      const logs = parsedLogs.filter((w) => !deletedWeightLogIds.includes(w.id))
      useWeightStore.setState({ logs })
    }

    // Measurements
    if (measurementsRes.data?.length) {
      const parsedMeasurements: Measurement[] = measurementsRes.data.map((row) => {
        let weightKg: number | undefined
        let leftArmCm: number | undefined
        let rightArmCm: number | undefined
        let leftThighCm: number | undefined
        let rightThighCm: number | undefined
        let neckCm: number | undefined
        let notes: string = row.notes ?? ''

        if (row.notes?.startsWith('__fitos_meta__:')) {
          try {
            const metaStr = row.notes.substring('__fitos_meta__:'.length)
            const meta = JSON.parse(metaStr)
            if (meta && typeof meta === 'object') {
              weightKg = typeof meta.weightKg === 'number' ? meta.weightKg : undefined
              leftArmCm = typeof meta.leftArmCm === 'number' ? meta.leftArmCm : undefined
              rightArmCm = typeof meta.rightArmCm === 'number' ? meta.rightArmCm : undefined
              leftThighCm = typeof meta.leftThighCm === 'number' ? meta.leftThighCm : undefined
              rightThighCm = typeof meta.rightThighCm === 'number' ? meta.rightThighCm : undefined
              neckCm = typeof meta.neckCm === 'number' ? meta.neckCm : undefined
              notes = typeof meta.userNotes === 'string' ? meta.userNotes : (row.notes ?? '')
            } else {
              logSyncWarning('malformed_metadata', { id: row.id, notes: row.notes })
            }
          } catch (e) {
            logSyncWarning('parse_error', { id: row.id, error: e instanceof Error ? e.message : String(e) })
          }
        } else {
          leftArmCm = row.bicep_cm ?? undefined
          leftThighCm = row.thigh_cm ?? undefined
        }

        return {
          id: row.id,
          date: row.date,
          chestCm: row.chest_cm ?? undefined,
          waistCm: row.waist_cm ?? undefined,
          hipsCm: row.hips_cm ?? undefined,
          armsCm: leftArmCm ?? undefined,
          thighsCm: leftThighCm ?? undefined,
          weightKg,
          leftArmCm,
          rightArmCm,
          leftThighCm,
          rightThighCm,
          neckCm: row.neck_cm ?? neckCm ?? undefined,
          notes: notes || undefined
        }
      })
      const measurements = parsedMeasurements.filter((m) => !deletedMeasurementIds.includes(m.id))
      useWeightStore.setState({ measurements })
    }

    // Food logs
    if (foodRes.data?.length) {
      const parsedFoodLogs: FoodLog[] = foodRes.data.map((row) => ({
        id: row.id, date: row.date, mealType: row.meal_type, name: row.name,
        quantityG: row.quantity_g, calories: row.calories, protein: row.protein,
        carbs: row.carbs, fat: row.fat,
        foodItemId: row.food_item_id, createdAt: row.created_at,
        proteinQualityScore: row.protein_quality_score,
        proteinQualityMethod: row.protein_quality_method,
        nutritionSource: row.nutrition_source,
        savedMealVersion: row.saved_meal_version,
      }))
      const foodLogs = parsedFoodLogs.filter((f) => !deletedFoodLogIds.includes(f.id))
      useFoodStore.setState({ foodLogs })
    }

    // Saved Meals
    if (savedMealsRes.data?.length) {
      const currentSavedMeals = useFoodStore.getState().savedMeals
      const pinnedMap = new Map(currentSavedMeals.map((m) => [m.id, m.isPinned]))

      const parsedSavedMeals: SavedMeal[] = savedMealsRes.data.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        items: row.items ?? [],
        totalCalories: row.total_calories,
        totalProtein: row.total_protein,
        totalCarbs: row.total_carbs,
        totalFat: row.total_fat,
        createdAt: row.created_at,
        category: row.category,
        totalFiber: row.total_fiber,
        proteinQualityScore: row.protein_quality_score,
        proteinQualityMethod: row.protein_quality_method,
        usageCount: row.usage_count,
        lastUsedAt: row.last_used_at,
        version: row.version,
        parentMealId: row.parent_meal_id,
        isCurrent: row.is_current,
        updatedAt: row.updated_at,
        isPinned: pinnedMap.get(row.id) || false,
      }))
      const savedMeals = parsedSavedMeals.filter((m) => !deletedSavedMealIds.includes(m.id))
      useFoodStore.setState({ savedMeals })
    }

    // Recovery logs
    if (recoveryRes.data?.length) {
      const parsedRecoveryLogs: RecoveryLog[] = recoveryRes.data.map((row) => ({
        id: row.id,
        date: row.date,
        dailySteps: row.daily_steps,
        sleepHours: row.sleep_hours,
        mood: row.mood,
        energy: row.energy,
        muscleSoreness: row.muscle_soreness,
        notes: row.notes,
        createdAt: row.created_at,
      }))
      const recoveryLogs = parsedRecoveryLogs.filter((r) => !deletedRecoveryLogIds.includes(r.id))
      useRecoveryStore.setState({ recoveryLogs })
    }

    // Progress Photos
    if (photosRes.data?.length) {
      const parsedPhotos: ProgressPhoto[] = photosRes.data.map((row) => ({
        id: row.id,
        date: row.date,
        photoType: row.photo_type as 'front' | 'left' | 'right' | 'back',
        photoData: row.photo_data,
        notes: row.notes,
        createdAt: row.created_at,
      }))
      const photos = parsedPhotos.filter((p) => !deletedPhotoIds.includes(p.id))
      usePhotosStore.setState({ photos })
    }

    // Workout sessions
    if (sessionsRes.data?.length) {
      const sessions: WorkoutSession[] = sessionsRes.data.map((row) => ({
        id: row.id, templateId: row.template_id, name: row.name, date: row.date,
        startedAt: row.started_at, completedAt: row.completed_at,
        durationSeconds: row.duration_seconds, exercises: row.exercises ?? [],
        totalVolume: row.total_volume, notes: row.notes, rating: row.rating,
        createdAt: row.created_at,
      }))
      useWorkoutStore.setState((s) => ({ ...s, sessions }))
    }

    // Helper function to check if an exercise is a legacy seeded exercise duplicate
    const isLegacySeededExercise = (name: string, id: string): boolean => {
      if (id.startsWith('ex-')) return false
      const seededNames = SEEDED_EXERCISES.map((e) => e.name.toLowerCase())
      return seededNames.includes(name.toLowerCase())
    }

    // Helper function to check if a template is a legacy seeded template duplicate
    const isLegacySeededTemplate = (name: string, id: string): boolean => {
      if (id.startsWith('tmpl-')) return false
      const seededNames = SEEDED_TEMPLATES.map((t) => t.name.toLowerCase())
      return seededNames.includes(name.toLowerCase())
    }

    // Exercises merging (Option C: local-first merge, exclude tombstones and legacy duplicates)
    const localExercises = useWorkoutStore.getState().exercises || []
    const { deletedExerciseIds } = useWorkoutStore.getState()
    const parsedExercises: Exercise[] = (exercisesRes.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      muscleGroups: row.muscle_groups || [],
      equipment: row.equipment,
      instructions: row.description,
      isCustom: row.is_custom,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    const seededExMap = new Map(SEEDED_EXERCISES.map((e) => [e.id, e]))

    // Preserve local custom exercises (exclude deleted and legacy duplicates)
    const localCustomExercises = localExercises.filter((e) =>
      e.isCustom &&
      !deletedExerciseIds.includes(e.id) &&
      !isLegacySeededExercise(e.name, e.id)
    )
    const localCustomExMap = new Map(localCustomExercises.map((e) => [e.id, e]))

    // Pulled exercises from Supabase (exclude deleted and legacy duplicates)
    const pulledExercises = parsedExercises.filter((e) =>
      !deletedExerciseIds.includes(e.id) &&
      !isLegacySeededExercise(e.name, e.id)
    )
    const pulledExMap = new Map(pulledExercises.map((e) => [e.id, e]))

    // Merge: Seeded -> Local Custom -> Pulled
    const mergedExercises = Array.from(new Map([
      ...seededExMap,
      ...localCustomExMap,
      ...pulledExMap
    ]).values())
    useWorkoutStore.setState((s) => ({ ...s, exercises: mergedExercises }))

    // Workout templates merging (Option C: local-first merge, exclude tombstones and legacy duplicates)
    const localTemplates = useWorkoutStore.getState().templates || []
    const { deletedTemplateIds } = useWorkoutStore.getState()
    const parsedTemplates: WorkoutTemplate[] = (templatesRes.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      splitType: row.split_type,
      exercises: row.exercises || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    const seededTmplMap = new Map(SEEDED_TEMPLATES.map((t) => [t.id, t]))

    // Preserve local custom templates (exclude deleted and legacy duplicates)
    const localCustomTemplates = localTemplates.filter((t) =>
      !t.id.startsWith('tmpl-') &&
      !deletedTemplateIds.includes(t.id) &&
      !isLegacySeededTemplate(t.name, t.id)
    )
    const localCustomTmplMap = new Map(localCustomTemplates.map((t) => [t.id, t]))

    // Pulled templates from Supabase (exclude deleted and legacy duplicates)
    const pulledTemplates = parsedTemplates.filter((t) =>
      !deletedTemplateIds.includes(t.id) &&
      !isLegacySeededTemplate(t.name, t.id)
    )
    const pulledTmplMap = new Map(pulledTemplates.map((t) => [t.id, t]))

    // Merge: Seeded -> Local Custom -> Pulled
    const mergedTemplates = Array.from(new Map([
      ...seededTmplMap,
      ...localCustomTmplMap,
      ...pulledTmplMap
    ]).values())
    useWorkoutStore.setState((s) => ({ ...s, templates: mergedTemplates }))

    // Memories
    if (memoriesRes.data?.length) {
      const parsedMemories: Memory[] = memoriesRes.data.map((row) => ({
        id: row.id, category: row.category, title: row.title, content: row.content,
        source: (row.source as 'ai' | 'manual'),
        confidenceScore: row.confidence_score,
        tags: row.tags ?? [], isApproved: row.is_approved,
        createdAt: row.created_at, updatedAt: row.updated_at,
      }))
      const memories = parsedMemories.filter((m) => !deletedMemoryIds.includes(m.id))
      useMemoryStore.setState((s) => ({ ...s, memories }))
    }

    setState({ status: 'success', lastSyncedAt: new Date().toISOString(), error: null })
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pull failed'
    setState({ status: 'error', error: msg })
    console.error('[FitOS Sync] pullAll failed:', msg)
    return false
  }
}

// ─── Auto-sync queue ────────────────────────────────────────────────────────
// Debounced background push — fires 5s after the last mutation

let _debounceTimer: ReturnType<typeof setTimeout> | null = null

export function schedulePush(delayMs = 5000) {
  if (_debounceTimer) {
    clearTimeout(_debounceTimer)
    _debounceTimer = null
  }
  if (delayMs === 0) {
    pushAll()
  } else {
    _debounceTimer = setTimeout(() => {
      pushAll()
      _debounceTimer = null
    }, delayMs)
  }
}

// ─── Connectivity check ──────────────────────────────────────────────────────

export async function isSupabaseReachable(): Promise<boolean> {
  try {
    const { error } = await supabase.from('sync_metadata').select('entity_type').limit(1)
    return !error
  } catch {
    return false
  }
}

// Auto-sync when connection restores
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[FitOS Sync] Internet connection detected. Triggering auto-sync...');
    pullAll();
  });
}
