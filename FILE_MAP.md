# FitOS — File Map

> Complete file reference with purpose, dependencies, and modification risk.
> Last updated: 2026-06-23

---

## Legend

| Risk | Meaning |
|------|---------|
| 🟢 Low | Safe to modify. Isolated impact. |
| 🟡 Medium | Moderate coupling. Test related features after changes. |
| 🔴 High | Core system file. Changes cascade widely. Modify with extreme care. |

---

## Configuration Files

| File | Lines | Risk | Purpose |
|------|-------|------|---------|
| [package.json](file:///d:/FitOS/package.json) | 64 | 🟡 | Dependencies, scripts, project metadata |
| [vite.config.ts](file:///d:/FitOS/vite.config.ts) | 26 | 🟡 | Vite build config, `@/` path alias |
| [tsconfig.json](file:///d:/FitOS/tsconfig.json) | 8 | 🟢 | TS project references |
| [tsconfig.app.json](file:///d:/FitOS/tsconfig.app.json) | 31 | 🟢 | App-level TypeScript config |
| [tsconfig.node.json](file:///d:/FitOS/tsconfig.node.json) | 23 | 🟢 | Vite/Node TypeScript config |
| [tailwind.config.js](file:///d:/FitOS/tailwind.config.js) | 9 | 🟢 | Tailwind CSS configuration |
| [postcss.config.js](file:///d:/FitOS/postcss.config.js) | 6 | 🟢 | PostCSS pipeline |
| [eslint.config.js](file:///d:/FitOS/eslint.config.js) | 28 | 🟢 | ESLint configuration |
| [.env](file:///d:/FitOS/.env) | 7 | 🔴 | Supabase + Groq API keys (SECRETS) |
| [index.html](file:///d:/FitOS/index.html) | 13 | 🟢 | SPA entry point |

---

## Source — Entry Points

| File | Lines | Risk | Purpose | Key Exports |
|------|-------|------|---------|-------------|
| [src/main.tsx](file:///d:/FitOS/src/main.tsx) | 14 | 🟡 | React root, QueryClientProvider | — |
| [src/App.tsx](file:///d:/FitOS/src/App.tsx) | 79 | 🔴 | Router, AuthGate, SyncInit | — |
| [src/index.css](file:///d:/FitOS/src/index.css) | 497 | 🔴 | Global design system (tokens + components) | CSS custom properties, component classes |
| [src/App.css](file:///d:/FitOS/src/App.css) | ~50 | 🟢 | ⚠️ DEAD CODE — Vite starter CSS (REMOVED). | — |

---

## Source — Types

| File | Lines | Risk | Purpose | Key Exports |
|------|-------|------|---------|-------------|
| [src/types/index.ts](file:///d:/FitOS/src/types/index.ts) | 444 | 🔴 | All domain interfaces | `Profile`, `Goal`, `GoalType`, `GoalStatus`, `WeightLog`, `FoodItem`, `FoodLog`, `MealType`, `SavedMeal`, `Exercise`, `WorkoutTemplate`, `TemplateExercise`, `WorkoutSession`, `SessionExercise`, `ExerciseSet`, `PersonalRecord`, `Memory`, `ChatMessage`, `BodyMeasurement`, `AIProvider`, `AppSettings`, `FitnessContext`, `MovementPattern`, `ExerciseType`, `CuratedFood`, `ServingSize`, `AIExtractedFood`, `ProposedFoodLog` |

---

## Source — State Management

| File | Lines | Risk | Purpose | Key Exports |
|------|-------|------|---------|-------------|
| [src/store/index.ts](file:///d:/FitOS/src/store/index.ts) | 541 | 🔴 | Zustand stores (all domain state, sync trigger) | `useProfileStore`, `useGoalsStore`, `useWeightStore`, `useFoodStore`, `useWorkoutStore`, `useMemoryStore`, `useChatStore`, `useSettingsStore`, `useUIStore` |
| [src/store/authStore.ts](file:///d:/FitOS/src/store/authStore.ts) | 279 | 🔴 | Authentication store (bcrypt + deterministic Web Crypto SHA-256 token) | `useAuthStore`, `deriveSyncToken` |

---

## Source — Libraries

| File | Lines | Risk | Purpose | Key Exports |
|------|-------|------|---------|-------------|
| [src/lib/ai.ts](file:///d:/FitOS/src/lib/ai.ts) | 332 | 🔴 | AI provider interface, GroqProvider, system prompt builder | `AIProviderInterface`, `createAIProvider`, `buildSystemPrompt`, `extractMemorySuggestions`, `FitnessContext` |
| [src/lib/sync.ts](file:///d:/FitOS/src/lib/sync.ts) | 680 | 🔴 | Supabase bidirectional sync engine with tombstones | `pushAll`, `pullAll`, `schedulePush`, `isSupabaseReachable`, `getSyncState`, `onSyncStateChange` |
| [src/lib/syncEvents.ts](file:///d:/FitOS/src/lib/syncEvents.ts) | 26 | 🔴 | Event bridge (stores→sync, circular dep breaker) | `registerSchedulePush`, `notifySync` |
| [src/lib/supabase.ts](file:///d:/FitOS/src/lib/supabase.ts) | 77 | 🟡 | Supabase client + table helpers | `supabase`, `db`, `checkSupabaseConnection` |
| [src/lib/contextSeed.ts](file:///d:/FitOS/src/lib/contextSeed.ts) | 189 | 🟡 | Abdullah's personal context seeder | `seedUserContext` |
| [src/lib/foodApi.ts](file:///d:/FitOS/src/lib/foodApi.ts) | 76 | 🟢 | Open Food Facts API client | `searchOpenFoodFacts`, `lookupBarcode`, `ExternalFoodResult` |
| [src/lib/utils.ts](file:///d:/FitOS/src/lib/utils.ts) | 134 | 🟡 | Utility functions | `cn`, `calcNutrition`, `calcEstimated1RM`, `todayISO`, `formatDate`, `daysAgo`, `getDaysBetween`, `getTimeGreeting`, `formatNumber`, `formatWeight`, `formatDuration`, `calcGoalProgress`, `generateId`, `getProgressColor`, `getMacroColor` |
| [src/lib/portionResolver.ts](file:///d:/FitOS/src/lib/portionResolver.ts) | 92 | 🟢 | Unit normalizer and deterministic gram resolver | `resolvePortionWeight`, `normalizeUnit`, `PortionResolution` |
| [src/lib/exerciseSearch.ts](file:///d:/FitOS/src/lib/exerciseSearch.ts) | 62 | 🟢 | Multi-layered ranking search engine resolver | `searchExercises` |
| [src/lib/foodMapper.ts](file:///d:/FitOS/src/lib/foodMapper.ts) | 201 | 🟢 | Matches parsed foods and performs macro updates | `mapExtractedToProposed`, `recalculateProposed`, `findBestLocalMatch` |
| [src/lib/exerciseIntelligence.ts](file:///d:/FitOS/src/lib/exerciseIntelligence.ts) | 185 | 🟡 | Computes volume, e1RM, trends, and PRs (Source of Truth) | `getExerciseIntelligence` |
| [src/lib/progressiveOverload.ts](file:///d:/FitOS/src/lib/progressiveOverload.ts) | 678 | 🔴 | Deterministic, rule-based progressive overload engine | `getOverloadRecommendation`, `progressionBuckets` |
| [src/lib/recompositionIntelligence.ts](file:///d:/FitOS/src/lib/recompositionIntelligence.ts) | 338 | 🟡 | Recomposition intelligence engine (fat loss, bulk, recomp classification) | `getRecompIntelligence` |
| [src/lib/nutritionIntelligence.ts](file:///d:/FitOS/src/lib/nutritionIntelligence.ts) | 373 | 🟡 | Adaptive nutrition intelligence engine (calorie/protein adaptations) | `getNutritionRecommendation` |
| [src/lib/dbCheck.ts](file:///d:/FitOS/src/lib/dbCheck.ts) | 42 | 🟢 | ⚠️ DIAGNOSTIC CODE — Database check utility (REMOVED) | `runDbCheck` |
| [src/lib/exerciseIntelligence.run.ts](file:///d:/FitOS/src/lib/exerciseIntelligence.run.ts) | 99 | 🟢 | ⚠️ DIAGNOSTIC CODE — Exercise intelligence testing runner (REMOVED) | — |

---

## Source — Constants

| File | Lines | Risk | Purpose | Key Exports |
|------|-------|------|---------|-------------|
| [src/constants/seeds.ts](file:///d:/FitOS/src/constants/seeds.ts) | 432 | 🟡 | Seeded exercises (266) and templates (6) | `SEEDED_EXERCISES`, `SEEDED_TEMPLATES` |
| [src/constants/foodDatabase.ts](file:///d:/FitOS/src/constants/foodDatabase.ts) | 2094 | 🟢 | Seeded food database (152 curated items) | `CURATED_FOODS` |
| [src/constants/fitnessProfile.ts](file:///d:/FitOS/src/constants/fitnessProfile.ts) | 38 | 🟢 | Permanent athlete background context constants | `PermanentFitnessProfile`, `ABDULLAH_FITNESS_PROFILE` |

---

## Source — Layout Components

| File | Lines | Risk | Purpose | Key Exports |
|------|-------|------|---------|-------------|
| [src/components/layout/AppShell.tsx](file:///d:/FitOS/src/components/layout/AppShell.tsx) | 30 | 🟡 | Sidebar + content area layout | `AppShell` |
| [src/components/layout/Sidebar.tsx](file:///d:/FitOS/src/components/layout/Sidebar.tsx) | 194 | 🟡 | Desktop sidebar + mobile BottomNav + hamburger menu | `Sidebar`, `BottomNav` |

---

## Source — Shared Components

| File | Lines | Risk | Purpose | Key Exports |
|------|-------|------|---------|-------------|
| [src/components/shared/MacroRing.tsx](file:///d:/FitOS/src/components/shared/MacroRing.tsx) | 82 | 🟢 | SVG calorie ring + macro stats display | `MacroRing` |
| [src/components/shared/WeightLogModal.tsx](file:///d:/FitOS/src/components/shared/WeightLogModal.tsx) | 79 | 🟢 | Weight entry modal (date-aware, dedup) | `WeightLogModal` |
| [src/components/shared/GoalSetupModal.tsx](file:///d:/FitOS/src/components/shared/GoalSetupModal.tsx) | 143 | 🟢 | Goal creation/edit modal with presets | `GoalSetupModal` |
| [src/components/shared/SyncIndicator.tsx](file:///d:/FitOS/src/components/shared/SyncIndicator.tsx) | 120 | 🟢 | Sync status badge + push/pull menu | `SyncIndicator` |
| [src/components/shared/ErrorBoundary.tsx](file:///d:/FitOS/src/components/shared/ErrorBoundary.tsx) | 60 | 🟢 | Class-level error boundary wrapping page components | `ErrorBoundary` |

---

## Source — Pages

| File | Lines | Risk | Route | Sub-components | Dependencies |
|------|-------|------|-------|---------------|-------------|
| [src/pages/Auth/LockScreen.tsx](file:///d:/FitOS/src/pages/Auth/LockScreen.tsx) | 153 | 🟡 | (auth gate) | — | `authStore` |
| [src/pages/Dashboard/Dashboard.tsx](file:///d:/FitOS/src/pages/Dashboard/Dashboard.tsx) | 421 | 🟡 | `/dashboard` | — | `useGoalsStore`, `useWeightStore`, `useFoodStore`, `useWorkoutStore`, `useMemoryStore`, `useProfileStore`, `useSettingsStore`, `ai.ts`, `utils` |
| [src/pages/Food/FoodPage.tsx](file:///d:/FitOS/src/pages/Food/FoodPage.tsx) | 796 | 🟡 | `/food` | `FoodSearchResult` | `useFoodStore`, `useGoalsStore`, `useSettingsStore`, `ai.ts`, `foodApi.ts`, `MacroRing`, `foodMapper.ts` |
| [src/pages/Workout/WorkoutPage.tsx](file:///d:/FitOS/src/pages/Workout/WorkoutPage.tsx) | 1099 | 🟡 | `/workout` | `TemplateCard`, `ExerciseCard`, `SessionTimer`, `TemplateEditor` | `useWorkoutStore`, `useSettingsStore`, `utils`, `exerciseSearch.ts` |
| [src/pages/Progress/ProgressPage.tsx](file:///d:/FitOS/src/pages/Progress/ProgressPage.tsx) | 233 | 🟡 | `/progress` | `CustomTooltip` | `useGoalsStore`, `useWeightStore`, `recharts`, `WeightLogModal`, `GoalSetupModal`, `utils` |
| [src/pages/Measurements/MeasurementsPage.tsx](file:///d:/FitOS/src/pages/Measurements/MeasurementsPage.tsx) | 400 | 🟡 | `/measurements` | `MeasurementHistory`, `MeasurementModal` | `useWeightStore`, `useSettingsStore`, `utils` |
| [src/pages/Coach/CoachPage.tsx](file:///d:/FitOS/src/pages/Coach/CoachPage.tsx) | 337 | 🟡 | `/coach` | — | `useGoalsStore`, `useWeightStore`, `useFoodStore`, `useWorkoutStore`, `useMemoryStore`, `useProfileStore`, `useSettingsStore`, `useChatStore`, `ai.ts`, `utils` |
| [src/pages/Settings/SettingsPage.tsx](file:///d:/FitOS/src/pages/Settings/SettingsPage.tsx) | 505 | 🟢 | `/settings` | — | `useSettingsStore`, `useProfileStore`, `authStore` |

---

## Database Schema

| File | Lines | Risk | Purpose |
|------|-------|------|---------|
| [supabase/schema.sql](file:///d:/FitOS/supabase/schema.sql) | 270 | 🟡 | Complete PostgreSQL schema (12 tables, indexes, triggers, RLS policies) |

### Tables Defined
| Table | Used in UI | Used in Sync | Notes |
|-------|-----------|-------------|-------|
| `profiles` | ✅ | ✅ | Single-row, holds sync token |
| `goals` | ✅ | ✅ | Target calories/protein + dates |
| `weight_logs` | ✅ | ✅ | Scales, notes, unique on date |
| `food_items` | ❌ (no UI) | ❌ | Custom food definitions |
| `food_logs` | ✅ | ✅ | Meal-categorized daily entries |
| `saved_meals` | ❌ (no UI) | ❌ | Custom meals configuration |
| `exercises` | ✅ | ✅ | Core exercise library + custom exercises, syncs tombstones |
| `workout_templates` | ✅ | ✅ | Routine configurations, syncs tombstones |
| `workout_sessions` | ✅ | ✅ | Completed sets with volume + PR flags |
| `memories` | ✅ | ✅ | AI coach insights and user details |
| `measurements` | ✅ | ✅ | Physical tape measurements history |
| `sync_metadata` | ❌ | ✅ | Tracks last sync per entity type |

---

## Dependency Graph (Simplified)

```
main.tsx → App.tsx
  ├── AuthGate
  │   ├── authStore.ts
  │   └── LockScreen.tsx → authStore
  │
  ├── SyncInit → sync.ts → supabase.ts
  │                       → syncEvents.ts ← store/index.ts
  │
  ├── AppShell.tsx → Sidebar.tsx → react-router-dom
  │
  └── Routes
      ├── Dashboard.tsx ──→ all stores, ai.ts, utils
      ├── FoodPage.tsx ───→ foodStore, goalsStore, settingsStore, ai.ts, foodApi.ts, MacroRing, foodMapper.ts, portionResolver.ts
      ├── WorkoutPage.tsx → workoutStore, settingsStore, utils, exerciseSearch.ts
      ├── ProgressPage.tsx→ goalsStore, weightStore, recharts, modals
      ├── CoachPage.tsx ──→ all stores, ai.ts
      └── SettingsPage.tsx→ settingsStore, profileStore, authStore

store/index.ts → types/index.ts, syncEvents.ts, seeds.ts, foodDatabase.ts
ai.ts ─────────→ types/index.ts
sync.ts ───────→ supabase.ts, syncEvents.ts, store/index.ts, types/index.ts
contextSeed.ts → store/index.ts, utils.ts, types/index.ts
```

---

## Total Codebase Size

| Category | Files | Lines |
|----------|-------|-------|
| Types | 1 | 444 |
| Stores | 2 | 621 |
| Libraries | 16 | ~3,317 |
| Constants | 3 | ~2,564 |
| Layout Components | 2 | 224 |
| Shared Components | 5 | ~484 |
| Pages | 9 | ~3,761 |
| Styles | 2 | ~547 |
| Config | 10 | ~200 |
| Database Schema | 1 | 270 |
| **Total** | **~49** | **~12,432** |
