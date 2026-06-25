import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  Goal, WeightLog, FoodLog, FoodItem, SavedMeal, 
  WorkoutSession, WorkoutTemplate, Exercise, Memory, 
  ChatMessage, Profile, AppSettings, Measurement
} from '@/types'
import { generateId, todayISO } from '@/lib/utils'
import { SEEDED_EXERCISES, SEEDED_TEMPLATES } from '@/constants/seeds'
import { notifySync } from '@/lib/syncEvents'

const triggerSync = () => notifySync()

// ─── Profile Store ─────────────────────────────────────────────────────────

interface ProfileState {
  profile: Profile | null
  setProfile: (p: Profile) => void
  updateProfile: (updates: Partial<Profile>) => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => { set({ profile }); triggerSync() },
      updateProfile: (updates) => { set((s) => ({ profile: s.profile ? { ...s.profile, ...updates } : null })); triggerSync() },
    }),
    { name: 'fitos-profile' }
  )
)

// ─── Goals Store ───────────────────────────────────────────────────────────

interface GoalsState {
  goals: Goal[]
  deletedGoalIds: string[]
  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Goal
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  getActiveGoal: () => Goal | null
}

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set, get) => ({
      goals: [],
      deletedGoalIds: [],
      addGoal: (data) => {
        const goal: Goal = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set((s) => ({ goals: [...s.goals, goal] }))
        triggerSync()
        return goal
      },
      updateGoal: (id, updates) => { set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g) })); triggerSync() },
      deleteGoal: (id) => { set((s) => ({ goals: s.goals.filter((g) => g.id !== id), deletedGoalIds: [...s.deletedGoalIds, id] })); triggerSync() },
      getActiveGoal: () => get().goals.find((g) => g.status === 'active') || null,
    }),
    { name: 'fitos-goals' }
  )
)

// ─── Weight Store ──────────────────────────────────────────────────────────

interface WeightState {
  logs: WeightLog[]
  measurements: Measurement[]
  deletedWeightLogIds: string[]
  deletedMeasurementIds: string[]
  addLog: (data: Omit<WeightLog, 'id' | 'createdAt'>) => void
  updateLog: (id: string, updates: Partial<WeightLog>) => void
  deleteLog: (id: string) => void
  getLatest: () => WeightLog | null
  getByDate: (date: string) => WeightLog | null
  getRange: (from: string, to: string) => WeightLog[]
  addMeasurement: (m: Omit<Measurement, 'id'>) => void
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void
  deleteMeasurement: (id: string) => void
}

export const useWeightStore = create<WeightState>()(
  persist(
    (set, get) => ({
      logs: [],
      measurements: [],
      deletedWeightLogIds: [],
      deletedMeasurementIds: [],
      addLog: (data) => {
        const log: WeightLog = { ...data, id: generateId(), createdAt: new Date().toISOString() }
        set((s) => {
          const filtered = s.logs.filter((l) => l.date !== data.date)
          return { logs: [...filtered, log].sort((a, b) => a.date.localeCompare(b.date)) }
        })
        triggerSync()
      },
      updateLog: (id, updates) => { set((s) => ({ logs: s.logs.map((l) => l.id === id ? { ...l, ...updates } : l) })); triggerSync() },
      deleteLog: (id) => { set((s) => ({ logs: s.logs.filter((l) => l.id !== id), deletedWeightLogIds: [...s.deletedWeightLogIds, id] })); triggerSync() },
      getLatest: () => {
        const sorted = [...get().logs].sort((a, b) => b.date.localeCompare(a.date))
        return sorted[0] || null
      },
      getByDate: (date) => get().logs.find((l) => l.date === date) || null,
      getRange: (from, to) => get().logs.filter((l) => l.date >= from && l.date <= to),
      addMeasurement: (data) => {
        const m: Measurement = { ...data, id: generateId() }
        set((s) => ({
          measurements: [...s.measurements.filter((x) => x.date !== data.date), m].sort((a, b) => a.date.localeCompare(b.date))
        }))
        triggerSync()
      },
      updateMeasurement: (id, updates) => {
        set((s) => ({
          measurements: s.measurements.map((m) => m.id === id ? { ...m, ...updates } : m).sort((a, b) => a.date.localeCompare(b.date))
        }))
        triggerSync()
      },
      deleteMeasurement: (id) => {
        set((s) => ({
          measurements: s.measurements.filter((m) => m.id !== id),
          deletedMeasurementIds: [...s.deletedMeasurementIds, id]
        }))
        triggerSync()
      },
    }),
    { name: 'fitos-weight' }
  )
)

// ─── Food Store ────────────────────────────────────────────────────────────

interface FoodState {
  foodItems: FoodItem[]
  foodLogs: FoodLog[]
  savedMeals: SavedMeal[]
  deletedFoodLogIds: string[]
  addFoodItem: (item: Omit<FoodItem, 'id'>) => FoodItem
  updateFoodItem: (id: string, updates: Partial<FoodItem>) => void
  deleteFoodItem: (id: string) => void
  addFoodLog: (log: Omit<FoodLog, 'id' | 'createdAt'>) => FoodLog
  updateFoodLog: (id: string, updates: Partial<FoodLog>) => void
  deleteFoodLog: (id: string) => void
  getLogsByDate: (date: string) => FoodLog[]
  addSavedMeal: (meal: Omit<SavedMeal, 'id' | 'createdAt'>) => void
  deleteSavedMeal: (id: string) => void
  searchFoodItems: (query: string) => FoodItem[]
}

export const useFoodStore = create<FoodState>()(
  persist(
    (set, get) => ({
      foodItems: [],
      foodLogs: [],
      savedMeals: [],
      deletedFoodLogIds: [],
      addFoodItem: (data) => {
        const item: FoodItem = { ...data, id: generateId() }
        set((s) => ({ foodItems: [...s.foodItems, item] }))
        return item
      },
      updateFoodItem: (id, updates) => set((s) => ({
        foodItems: s.foodItems.map((i) => i.id === id ? { ...i, ...updates } : i)
      })),
      deleteFoodItem: (id) => set((s) => ({ foodItems: s.foodItems.filter((i) => i.id !== id) })),
      addFoodLog: (data) => {
        const log: FoodLog = { ...data, id: generateId(), createdAt: new Date().toISOString() }
        set((s) => ({ foodLogs: [...s.foodLogs, log] }))
        triggerSync()
        return log
      },
      updateFoodLog: (id, updates) => { set((s) => ({ foodLogs: s.foodLogs.map((l) => l.id === id ? { ...l, ...updates } : l) })); triggerSync() },
      deleteFoodLog: (id) => { set((s) => ({ foodLogs: s.foodLogs.filter((l) => l.id !== id), deletedFoodLogIds: [...s.deletedFoodLogIds, id] })); triggerSync() },
      getLogsByDate: (date) => get().foodLogs.filter((l) => l.date === date),
      addSavedMeal: (data) => {
        const meal: SavedMeal = { ...data, id: generateId(), createdAt: new Date().toISOString() }
        set((s) => ({ savedMeals: [...s.savedMeals, meal] }))
        triggerSync()
      },
      deleteSavedMeal: (id) => {
        set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) }))
        triggerSync()
      },
      searchFoodItems: (query) => {
        const q = query.toLowerCase()
        return get().foodItems.filter((i) => i.name.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q)).slice(0, 20)
      },
    }),
    { name: 'fitos-food' }
  )
)

// ─── Workout Store ─────────────────────────────────────────────────────────

interface WorkoutState {
  exercises: Exercise[]
  templates: WorkoutTemplate[]
  sessions: WorkoutSession[]
  activeSession: WorkoutSession | null
  deletedTemplateIds: string[]
  deletedExerciseIds: string[]
  addExercise: (ex: Omit<Exercise, 'id'>) => Exercise
  updateExercise: (id: string, updates: Partial<Exercise>) => void
  deleteExercise: (id: string) => void
  addTemplate: (t: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => WorkoutTemplate
  updateTemplate: (id: string, updates: Partial<WorkoutTemplate>) => void
  deleteTemplate: (id: string) => void
  duplicateTemplate: (id: string) => WorkoutTemplate | null
  rollbackWorkoutStore: () => void
  startSession: (session: Omit<WorkoutSession, 'id' | 'createdAt'>) => void
  completeSession: (notes?: string, rating?: number) => void
  cancelSession: () => void
  addSetToSession: (sessionExerciseId: string, setData: Omit<import('@/types').ExerciseSet, 'id' | 'sessionExerciseId'>) => void
  deleteSetFromSession: (sessionExerciseId: string, setId: string) => void
  updateSetInSession: (sessionExerciseId: string, setId: string, updates: Partial<import('@/types').ExerciseSet>) => void
  getSessionsByDateRange: (from: string, to: string) => WorkoutSession[]
  getLastSessionForTemplate: (templateId: string) => WorkoutSession | null
  getPRForExercise: (exerciseId: string) => number
}

export const backupWorkoutStore = () => {
  try {
    const state = useWorkoutStore.getState()
    localStorage.setItem('fitos-workout-backup', JSON.stringify({
      templates: state.templates,
      exercises: state.exercises,
      sessions: state.sessions,
      deletedTemplateIds: state.deletedTemplateIds,
      deletedExerciseIds: state.deletedExerciseIds,
    }))
  } catch (err) {
    console.error('Failed to create store backup:', err)
  }
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      exercises: SEEDED_EXERCISES,
      templates: SEEDED_TEMPLATES,
      sessions: [],
      activeSession: null,
      deletedTemplateIds: [],
      deletedExerciseIds: [],

      addExercise: (data) => {
        const ex: Exercise = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set((s) => ({ exercises: [...s.exercises, ex] }))
        triggerSync()
        return ex
      },
      updateExercise: (id, updates) => {
        set((s) => ({
          exercises: s.exercises.map((e) => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)
        }))
        triggerSync()
      },
      deleteExercise: (id) => {
        backupWorkoutStore()
        set((s) => ({
          exercises: s.exercises.filter((e) => e.id !== id),
          deletedExerciseIds: [...s.deletedExerciseIds, id],
        }))
        notifySync(0)
      },
      addTemplate: (data) => {
        const templateId = generateId()
        const exercises = (data.exercises || []).map((te) => ({
          ...te,
          templateId,
        }))
        const t: WorkoutTemplate = {
          ...data,
          id: templateId,
          exercises,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({ templates: [...s.templates, t] }))
        triggerSync()
        return t
      },
      updateTemplate: (id, updates) => {
        set((s) => ({
          templates: s.templates.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
        }))
        triggerSync()
      },
      deleteTemplate: (id) => {
        backupWorkoutStore()
        set((s) => ({
          templates: s.templates.filter((t) => t.id !== id),
          deletedTemplateIds: [...s.deletedTemplateIds, id],
        }))
        notifySync(0)
      },
      duplicateTemplate: (id) => {
        const t = get().templates.find((x) => x.id === id)
        if (!t) return null
        const clone: WorkoutTemplate = {
          ...t,
          id: generateId(),
          name: `${t.name} Copy`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          exercises: t.exercises.map((te) => ({
            ...te,
            id: generateId(),
          })),
        }
        clone.exercises.forEach((te) => {
          te.templateId = clone.id
        })
        set((s) => ({ templates: [...s.templates, clone] }))
        triggerSync()
        return clone
      },
      rollbackWorkoutStore: () => {
        try {
          const backup = localStorage.getItem('fitos-workout-backup')
          if (backup) {
            const parsed = JSON.parse(backup)
            set({
              templates: parsed.templates || [],
              exercises: parsed.exercises || [],
              sessions: parsed.sessions || [],
              deletedTemplateIds: parsed.deletedTemplateIds || [],
              deletedExerciseIds: parsed.deletedExerciseIds || [],
            })
            notifySync(0)
          }
        } catch (err) {
          console.error('Failed to rollback store from backup:', err)
        }
      },

      startSession: (data) => {
        const session: WorkoutSession = { ...data, id: generateId(), createdAt: new Date().toISOString() }
        set({ activeSession: session })
      },
      completeSession: (notes, rating) => {
        const { activeSession } = get()
        if (!activeSession) return
        const completed: WorkoutSession = {
          ...activeSession,
          completedAt: new Date().toISOString(),
          notes,
          rating,
          totalVolume: activeSession.exercises.reduce((vol, ex) =>
            vol + ex.sets.reduce((s, set) => s + set.weightKg * set.reps, 0), 0
          ),
          durationSeconds: activeSession.startedAt
            ? Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000)
            : undefined,
        }
        set((s) => ({ sessions: [completed, ...s.sessions], activeSession: null }))
        triggerSync()
      },
      cancelSession: () => set({ activeSession: null }),

      addSetToSession: (sessionExerciseId, setData) => set((s) => {
        if (!s.activeSession) return s
        const exercises = s.activeSession.exercises.map((ex) => {
          if (ex.id !== sessionExerciseId) return ex
          const newSet = { ...setData, id: generateId(), sessionExerciseId: ex.id }
          return { ...ex, sets: [...ex.sets, newSet] }
        })
        return { activeSession: { ...s.activeSession, exercises } }
      }),
      deleteSetFromSession: (sessionExerciseId, setId) => set((s) => {
        if (!s.activeSession) return s
        const exercises = s.activeSession.exercises.map((ex) => {
          if (ex.id !== sessionExerciseId) return ex
          return { ...ex, sets: ex.sets.filter((set) => set.id !== setId) }
        })
        return { activeSession: { ...s.activeSession, exercises } }
      }),
      updateSetInSession: (sessionExerciseId, setId, updates) => set((s) => {
        if (!s.activeSession) return s
        const exercises = s.activeSession.exercises.map((ex) => {
          if (ex.id !== sessionExerciseId) return ex
          return { ...ex, sets: ex.sets.map((set) => set.id === setId ? { ...set, ...updates } : set) }
        })
        return { activeSession: { ...s.activeSession, exercises } }
      }),

      getSessionsByDateRange: (from, to) =>
        get().sessions.filter((s) => s.date >= from && s.date <= to),
      getLastSessionForTemplate: (templateId) =>
        get().sessions.find((s) => s.templateId === templateId) || null,
      getPRForExercise: (exerciseId) => {
        const targetExercise = SEEDED_EXERCISES.find((e) => e.id === exerciseId)
        const targetName = targetExercise ? targetExercise.name.toLowerCase() : ''
        const matchExercise = (exId: string, exName?: string) => {
          if (exId === exerciseId) return true
          if (targetName && exName && exName.toLowerCase() === targetName) return true
          return false
        }
        let best = 0
        for (const session of get().sessions) {
          for (const ex of session.exercises) {
            if (!matchExercise(ex.exerciseId, ex.exercise?.name)) continue
            for (const set of ex.sets) {
              if (!set.isWarmup) {
                const e1rm = set.weightKg * (1 + set.reps / 30)
                if (e1rm > best) best = e1rm
              }
            }
          }
        }
        return Math.round(best * 10) / 10
      },
    }),
    { name: 'fitos-workout' }
  )
)

// ─── Memory Store ──────────────────────────────────────────────────────────

interface MemoryState {
  memories: Memory[]
  pendingSuggestions: Memory[]
  deletedMemoryIds: string[]
  addMemory: (m: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => void
  approveMemory: (id: string) => void
  rejectMemory: (id: string) => void
  deleteMemory: (id: string) => void
  updateMemory: (id: string, updates: Partial<Memory>) => void
  addSuggestion: (m: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>) => void
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set) => ({
      memories: [],
      pendingSuggestions: [],
      deletedMemoryIds: [],
      addMemory: (data) => {
        const m: Memory = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set((s) => ({ memories: [m, ...s.memories] }))
      },
      approveMemory: (id) => set((s) => {
        const mem = s.pendingSuggestions.find((m) => m.id === id)
        if (!mem) return s
        return {
          pendingSuggestions: s.pendingSuggestions.filter((m) => m.id !== id),
          memories: [{ ...mem, isApproved: true }, ...s.memories],
        }
      }),
      rejectMemory: (id) => set((s) => ({
        pendingSuggestions: s.pendingSuggestions.filter((m) => m.id !== id)
      })),
      deleteMemory: (id) => {
        set((s) => ({
          memories: s.memories.filter((m) => m.id !== id),
          deletedMemoryIds: [...s.deletedMemoryIds, id]
        }))
        triggerSync()
      },
      updateMemory: (id, updates) => set((s) => ({
        memories: s.memories.map((m) => m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m)
      })),
      addSuggestion: (data) => {
        const m: Memory = { ...data, id: generateId(), isApproved: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set((s) => ({ pendingSuggestions: [m, ...s.pendingSuggestions] }))
      },
    }),
    { name: 'fitos-memory' }
  )
)

// ─── Chat Store ────────────────────────────────────────────────────────────

interface ChatState {
  messages: ChatMessage[]
  addMessage: (m: Omit<ChatMessage, 'id' | 'createdAt'>) => ChatMessage
  clearHistory: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (data) => {
        const msg: ChatMessage = { ...data, id: generateId(), createdAt: new Date().toISOString() }
        set((s) => ({ messages: [...s.messages, msg] }))
        return msg
      },
      clearHistory: () => set({ messages: [] }),
    }),
    { name: 'fitos-chat' }
  )
)

// ─── Settings Store ────────────────────────────────────────────────────────

interface SettingsState {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: 'groq',
  // Pre-seeded from .env — persisted to localStorage after first load.
  // Users can override in Settings → AI Coach.
  aiApiKey: import.meta.env?.DEV ? (import.meta.env.VITE_GROQ_API_KEY ?? '') : '',
  aiModel: 'llama-3.3-70b-versatile',
  weightUnit: 'kg',
  energyUnit: 'kcal',
  defaultMealTypes: ['breakfast', 'lunch', 'dinner', 'snack'],
  restTimerDefault: 90,
  theme: 'dark',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) => set((s) => ({ settings: { ...s.settings, ...updates } })),
    }),
    {
      name: 'fitos-settings',
      // If the stored key is empty (first run or key was blank before .env was added),
      // fall back to the env var so the AI Coach works immediately.
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<SettingsState>
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...(p.settings ?? {}),
            aiApiKey: (p.settings?.aiApiKey) || (import.meta.env?.DEV ? (import.meta.env.VITE_GROQ_API_KEY ?? '') : ''),
          },
        }
      },
    }
  )
)

// ─── UI Store (non-persistent) ─────────────────────────────────────────────

interface UIState {
  sidebarOpen: boolean
  activeDate: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveDate: (date: string) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  activeDate: todayISO(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveDate: (date) => set({ activeDate: date }),
}))
