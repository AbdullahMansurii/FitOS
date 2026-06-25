# FitOS — Changelog

> All notable changes to this project are documented in this file.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-06-25

### Added
- **Deterministic Multi-Device Authentication:** Implemented lock-screen-first auth using client-side Web Crypto SHA-256 token derivation from the master password, eliminating setup onboarding wizards.
- **Database Unique Profile Constraint:** Enforced a single-profile model via a SQL column constraint (`is_master BOOLEAN DEFAULT true CHECK (is_master = true) UNIQUE`) to guarantee a single row database-wide without hardcoding strings.
- **Backup & Recovery System:** Added JSON backup export/import and cloud database snapshot downloads inside a new "Backup & Sync" settings tab.
- **Tombstone Deletion Sync:** Integrated tombstone arrays to track local food, weight, measurement, goal, and memory deletions, propagating deletions to Supabase and pruning tombstones on success.

### Fixed
- **Weight Log Property Translation:** Corrected `weight_kg` vs `weightKg` mapping inside the sync engine `pushAll` database operations.
- **React Hook Rules Compliance:** Moved backup state hooks to the top-level of `SettingsPage.tsx` component out of the tab callback closure to satisfy react-hooks/rules-of-hooks.
- **Process Env Scope Safety:** Wrapped `process.env` calls in `src/lib/supabase.ts` with `globalThis` properties to pass browser build compilation checks.

## [0.9.0-alpha] — 2026-06-25

### Fixed
- **Timezone Date Drift:** Rewrote date generation utilities (`todayISO` and `daysAgo`) to use local year, month, and day components, resolving one-day calendar offset errors across food logs, weight entries, measurements, and workout sessions.
- **Exercise Intelligence Trend Anchoring:** Pinned the 30-day lookup window to the date of the user's latest logged exercise session rather than system runtime clock, ensuring reliable trend calculations even after long training gaps.
- **Sync Race Condition on Session Completion:** Reordered state mutations inside `completeSession` so that Zustand commits the session details locally *before* scheduling the Supabase sync job.
- **Sync Error Hardening for Metadata Notes:** Wrapped measurements notes JSON-metadata extraction in a robust try-catch block, adding type validations to prevent sync engine crashes.
- **Production-Grade Error Boundaries:** Integrated a class-level `<ErrorBoundary>` wrapper inside `App.tsx` layout to catch page rendering failures and prevent app-wide crashes.
- **Zustand Render Performance Caching:** Optimized component rendering via granular store selectors and dynamically mapped progressive overload lookups to only recalculate metrics for active or focused exercises.
- **Seeded Template Exercise IDs:** Standardized template exercises to use deterministic IDs, preventing hydration mismatches during synchronization.

## [0.8.0-alpha] — 2026-06-25

### Added
- **Adaptive Nutrition Recommendation Engine:** Created a local-first, deterministic, rule-based recommendation engine in `src/lib/nutritionIntelligence.ts` that evaluates weight trends, waist circumference shifts, and strength history to output calorie/protein adaptations.
- **Goal-Aware Calorie and Protein Adjustments**: Handles Cut, Recomp, Lean Bulk, Aggressive Bulk, and Maintenance. Formulates ±150 kcal targets and dynamically scales protein targets between 1.6 and 2.4 g/kg bodyweight.
- **Nutrition Analytics Sub-tab:** Added a Nutrition Analytics view to `ProgressPage.tsx` displaying average calorie/protein intakes, calorie/protein adherence (percentage of logged days within ±10% of target for calories, ≥90% for protein), intake history line charts, and log records.
- **Nutrition Status Dashboard Widget:** Integrated a color-coded "Nutrition Status" widget into the Dashboard right sidebar column showing current/recommended calorie targets, protein targets, weekly weight changes (scaled to lbs if Imperial settings), and status badges.
- **AI Coach Nutrition Prompts**: Configured the AI system prompt to inject calorie adjustments, protein targets, and weight/adherence metrics, allowing the AI Coach to answer macro and progress questions based on actual logs.
- **Nutrition Engine Verification Suite**: Created a comprehensive unit test suite in `scratch/testNutritionIntelligence.ts` containing 75 assertions across 12 scenarios.

## [0.7.0-alpha] — 2026-06-25

### Added
- **Recomposition Intelligence Engine:** Created a local-first, deterministic recomposition analytics engine in `src/lib/recompositionIntelligence.ts` evaluating 30-day baseline scale weight, waist circumference, and average e1RM strength changes.
- **Dynamic Recomposition Classification:** Categorizes progress into 8 states (`successful_recomp`, `gaining_muscle`, `losing_fat`, `lean_bulk`, `aggressive_bulk`, `cutting`, `aggressive_cut`, `stalled`, `insufficient_data`) with numeric confidence scores and explanations.
- **Physical Measurements Sync Serialization:** Added bidirectional sync for `measurements` table, using JSON-meta serialization inside the remote `notes` column to bypass remote database schema limitations.
- **Measurements Management Page:** Created a dedicated Measurements log view supportingMetric/Imperial units toggle, entry creation, editing, deletion, input validations, and chronological listing.
- **Physique Analytics Sub-tab:** Added a Physique Analytics view to `ProgressPage.tsx` displaying weight/waist history charts (with display-unit scaling), timeline classification logs, and monthly summaries.
- **Physique Status Dashboard Widgets:** Integrated Today's Physique Status and Body Composition Summary widgets inside the Dashboard right column, displaying status badges, trends, and explanations.
- **AI Coach Recomposition Prompts:** Configured the AI system prompt to inject physical measurements and body composition intelligence, enabling explanations of fat loss and bulking/cutting safety.
- **Comprehensive Verification Suite:** Created test coverage with 46 assertions in `scratch/testRecompositionIntelligence.ts`.

## [0.6.0-alpha] — 2026-06-25

### Added
- **Memoized Progression Caching:** Implemented full `useMemo` progression calculations (`recommendationsMap`) indexed by `exerciseId` to eliminate redundant computations during client-side render cycles.
- **Active Workout Progression Cards:** Integrated progressive overload recommendation displays (suggested weight/reps, readiness score, confidence level, reasons) inside active workout Exercise Cards.
- **Active Recovery & Stall Warning Banners:** Integrated recovery warnings (`⚠ Recovery Warning`) and plateau warning banners (`⚠ Plateau Detected` with target deload weight) during active sessions.
- **Dedicated Exercise Analytics Modal:** Added a comprehensive exercise details overlay featuring current PRs (weight, volume, e1RM), 30-day trends, readiness status, weekly frequency, and recovery warnings.
- **Collapsible Set-Level Workout History:** Expanded workout history logging to support detailed set breakdowns showing set indexes, exact weight and reps targets, warmup badges (`W`), and personal record indicators.
- **Dashboard Training Status Widget:** Integrated a compact training summary widget displaying average user readiness score, status labels, top 3 progression recommendations, and recovery warning flags.
- **AI Coach Training Intelligence:** Upgraded the AI system prompt and context serialization helper (`generateTrainingIntelligence`) to pass PR metrics, e1RM/volume trends, progression recommendations, and warnings. Context size is strictly limited to control token consumption.

## [0.5.0-alpha] — 2026-06-23

### Added
- **Progressive Overload Engine:** Created a fully local-first, deterministic recommendation engine in `src/lib/progressiveOverload.ts` that consumes the Exercise Intelligence outputs on demand.
- **Dynamic Readiness Score:** Implemented a `0-100` readiness scoring matrix incorporating 30-day e1RM/volume trends, recent personal records, recovery gap penalties, weekly frequency adjustments, and stagnation flags.
- **Plateau & Fatigue Diagnostics:** Integrated automatic stall detection (consecutive strength plateaus) and strict fatigue warnings (3 consecutive sessions of simultaneous strength and volume declines).
- **Advisory Progression Rules:** Structured a strict advisory priority system: Fatigue Warning (Maintain) -> Stall Deload (10% max load reduction) -> Weight Progression (via bucketed increments) -> Rep Progression -> Maintain.
- **Progression Buckets:** Integrated exercise-specific increments: Heavy Compound Lower (+5kg), Heavy Compound Upper (+2.5kg), Dumbbell Compound (+2kg total), and Isolation (+1kg).
- **Hypertrophy Threshold Adherence:** Created a volume-based hypertrophy check requiring $\ge 80\%$ of sets to reach the rep limit minus 1 before progressing weight.
- **Standalone Test Suite:** Created a comprehensive standalone progression test runner in `scratch/testProgressiveOverload.ts` validating all 10 core coaching and safety scenarios.

## [0.4.0-alpha] — 2026-06-23

### Added
- **Food Database Expansion:** Expanded curated food database to 152 items with custom aliases, serving size portion mappings, and NIN/IFCT macro profiles.
- **Exercise Library Expansion:** Seeded exercise database expanded to 269 items (from 137), annotating targeted muscle groups, equipment, movementPattern, exerciseType, and search aliases.
- **Portion Resolver:** Integrated deterministic portion weight resolver supporting plural normalizations and unit scaling.
- **Layered Exercise Search:** Implemented multi-tiered ranking search engine matching Exact Name -> Exact Alias -> Substring -> Fuzzy Word-Order Independent phrases.
- **AI Food Estimation:** Added estimation warnings and manual overrides UI for parsed foods, with macro recalculation protection when updating weight.

## [0.3.0-alpha] — 2026-06-21

### Added
- **Custom Workout Builder (Phase 1):** Integrated full workout routine customization UI (`TemplateEditor` component) enabling users to create custom templates, name routines, add exercises from the search library, adjust sets, reps target, rest timer, and note fields per exercise.
- **Template Reordering & Management:** Integrated Up/Down reordering triggers, inline set parameters configuration, and single-click removal on template lists.
- **Template Duplication & Deletion:** Added template cloning actions (`duplicateTemplate`) to replicate routine sets and exercises with unique template-scoped IDs, and deletion actions (`deleteTemplate`) for custom routines.
- **Custom Exercise Creator:** Added a custom exercise creation form modal to save custom exercises (name, equipment, category, targeted muscle groups checkboxes) and delete them from the library list.
- **Supabase Sync Integration for Workouts:** Extended `sync.ts` pushAll/pullAll cycles to synchronize `exercises` and `workout_templates` tables, ensuring user-defined structures are backed up. Added deterministic seed merging to pull cycles to prevent seed erasure.
- **Database Schema Upgrades:** Updated `supabase/schema.sql` to include `created_at` and `updated_at` columns on exercises and templates tables with SQL update triggers.

## [Unreleased] — 2026-06-20

### Added
- **Supabase Row Level Security (RLS):** Enforced RLS across all 12 database tables in `supabase/schema.sql`.
- **Sync Token Authorization:** Configured database authorization policies requiring an `x-fitos-auth` request header that matches the profile's `sync_token` (with bootstrap insert allowed only when the database is empty).
- **Zustand Auth Store Sync Token:** Added persistent `syncToken` state to `useAuthStore` to store client-side access credentials, with fallback to `.env` variable `VITE_SYNC_TOKEN` if defined.
- **Dynamic Client Headers:** Integrated `setSupabaseAuthHeader(token)` into `src/lib/supabase.ts` to update the Supabase REST client request headers dynamically during authentication events.

### Fixed
- **Workout Rest Timer Memory Leak:** Fixed in `src/pages/Workout/WorkoutPage.tsx` by adding a `useEffect` cleanup hook to `ExerciseCard` to clear the `restRef.current` interval on unmount.
- **Exercise & Template ID Regeneration Bug:** Fixed in `src/constants/seeds.ts` by replacing runtime `generateId()` UUIDs with deterministic slug-based IDs (e.g. `'ex-bench-press'`, `'tmpl-push-a'`) and pinning creation dates to a static ISO timestamp.
- **Mobile navigation overlap bug:** Bottom navigation bar was covering page content. Refactored inline styles on `AppShell.tsx` and `Sidebar.tsx` to use dedicated CSS classes (`.mobile-header`, `.bottom-nav`) with proper responsive breakpoints.
- **Groq API Key Exposure:** Configured the settings store and merge policies to load `import.meta.env.VITE_GROQ_API_KEY` only during development (`import.meta.env.DEV`), preventing developer keys from being bundled by default in production.

### Known Issues
- **DCE Key Exposure Risk:** The Groq API key is still present in compiled production bundles if the compiler fails to perform dead-code elimination on the local variable indirection `const isDev = import.meta.env.DEV`.
- **Initial Sync Race Condition:** Sync operations run in parallel during first-time sync. Tables may attempt to write and evaluate the RLS policy before the profile row has fully committed in the database, resulting in partial sync failures on new installations.

### Next Priorities
- Inline `import.meta.env.DEV` directly into the settings store ternary expression to ensure esbuild/terser perform dead-code elimination on the API key.
- Refactor the sync engine `pushAll()` method to serialize the profile upsert before parallelizing other tables.

---

## [0.1.0] — Initial Build (Pre-Release)

> **Note:** This version represents the complete initial codebase as of the first documentation audit. No prior changelog existed.

### Added

#### Core Infrastructure
- React 19 + TypeScript + Vite SPA bootstrapped
- Tailwind CSS 3.4 integration with PostCSS
- Path aliases configured (`@/` → `src/`)
- ESLint + TypeScript strict configuration
- Environment variable support for Supabase and AI keys

#### Authentication System
- Master password authentication with bcryptjs hashing
- 3-step first-run setup wizard (name → password → recovery phrase)
- Lock screen with password entry
- Recovery phrase system (6-word phrase from 12-word dictionary)
- Password change flow in Settings
- Session-based unlock (not persisted across page loads)

#### State Management
- 9 Zustand stores with `persist` middleware (localStorage)
- Stores: auth, profile, goals, weight, food, workout, memory, chat, settings
- Non-persisted UI store for sidebar/date state
- Custom merge logic for settings (env-var fallback for API key)

#### Data Sync
- Supabase PostgreSQL database schema (12 tables)
- Bidirectional sync engine (`sync.ts`): push (local→cloud) and pull (cloud→local)
- Debounced auto-push (5-second delay after mutations)
- Sync event bridge (`syncEvents.ts`) to avoid circular dependencies between stores and sync
- Manual push/pull via `SyncIndicator` component
- Connectivity check (`isSupabaseReachable`)

#### Dashboard
- Welcome greeting with time-of-day awareness
- Weight stats card (current, start, change, target delta)
- Daily calorie and protein progress bars
- Active goal overview with progress percentage
- Recent workout summary
- AI daily brief (auto-generated analysis)
- Today's macro breakdown (protein, carbs, fat)
- Quick action buttons (log weight, log food, start workout)

#### Food Tracking
- Three logging modes: AI chat parse, Open Food Facts search, manual entry
- AI-powered natural language food parsing via Groq
- Confirmation step for AI-parsed food entries (confidence scoring)
- Open Food Facts API integration for food search
- Expandable quantity selector on search results
- Meal type categorization (breakfast, lunch, dinner, snack)
- Daily diary view grouped by meal
- Date picker for past-day logging
- Daily macro summary with SVG calorie ring chart
- Delete individual food log entries

#### Weight Tracking
- Weight entry modal with validation (20–300 kg range)
- One log per day with deduplication
- Notes support per weight entry
- Delete individual weight entries

#### Progress Page
- Weight trend line chart (Recharts) with 7/30/90-day range toggle
- Goal progress bar with percentage display
- Goal type badge (CUT/BULK/MAINTAIN)
- Weight log history with day-over-day diff indicators (+/- kg)
- Goal target line overlay on chart
- Empty states with call-to-action buttons

#### Goal Management
- Goal types: cut, bulk, maintain
- Preset calorie/protein targets per goal type
- Start weight, target weight, target date fields
- Create new goal and edit existing active goal
- Goal status tracking (active, completed, paused, abandoned)

#### Workout Tracking
- Template-based workout system
- 6 pre-seeded workout templates (Push A, Pull A, Legs A, Upper Body, Lower Body, Full Body)
- 65+ pre-seeded exercises across all major muscle groups
- Active session with live elapsed-time timer
- Set logging: weight (kg) × reps, warmup toggle
- PR detection using Epley e1RM formula
- PR celebration notification ("🏆 NEW PR!")
- Rest timer with configurable default duration
- Previous performance reference for each exercise
- Session completion modal with 5-star rating and notes
- Workout history view with session cards (date, duration, volume, rating, exercises)
- Exercise library grid view with muscle groups and equipment

#### AI Coach
- Chat interface with message history
- System prompt with full fitness context (profile, goals, weight, nutrition, workouts, memories)
- Groq API integration (Llama 3.3 70B default)
- Memory suggestion extraction from AI responses
- Approve/reject memory suggestions inline
- Suggested quick prompts (8 options)
- Basic markdown rendering (headings, bullet points, bold)
- Typing indicator (animated dots)
- Error handling with user-facing error messages
- API key validation gate

#### Memory System
- AI-generated memory suggestions via `[MEMORY_SUGGESTION]` protocol
- 4 memory categories: preference, insight, goal_context, behavioral
- Manual approve/reject workflow
- Confidence scoring per memory
- Tag system with source tracking (ai/manual)
- Context seeding: 11 pre-built memories for Abdullah's fitness context
- Approved memories injected into every AI system prompt

#### Settings
- **Profile tab:** Display name, height (cm), date of birth, gender
- **Security tab:** Change password with current password verification
- **AI Coach tab:** Groq API key input (masked), model selector (4 models)
- **Units tab:** Weight unit (kg/lbs), energy unit (kcal/kJ), rest timer default (60s–4m)

#### Design System
- Dark-mode-first design with electric lime accent (#a3e635)
- CSS custom properties for all design tokens (50+ variables)
- Glassmorphism card variant (`.card-glass`)
- Component classes: cards, buttons (5 variants), badges (6 colors), inputs, nav items
- Responsive layout: desktop sidebar + mobile bottom nav + mobile header
- SVG macro ring chart component
- Smooth animations: fadeIn, slideInRight, pulse-glow

#### Data Seeding
- 65+ exercises across: Chest (9), Back (11), Shoulders (7), Biceps (7), Triceps (6), Legs (14), Core (7), Cardio (8)
- 6 workout templates with target sets/reps/rest
- Personal context seed for Abdullah Mansuri (11 memories, profile, default recomposition goal)
- Idempotent seeding with version key (`v1.1-abdullah`)

#### External Integrations
- **Groq API:** Chat completions + food parsing
- **Open Food Facts:** Food search by name, barcode lookup
- **Supabase:** Data persistence and backup

---

## File Attribution

| File | Lines | Primary Purpose |
|------|-------|-----------------|
| `src/types/index.ts` | 270 | All domain types |
| `src/store/index.ts` | 419 | 8 Zustand stores |
| `src/store/authStore.ts` | 80 | Auth store |
| `src/lib/ai.ts` | 309 | AI provider + system prompt |
| `src/lib/sync.ts` | 279 | Supabase sync engine |
| `src/lib/utils.ts` | 113 | Utility functions |
| `src/lib/contextSeed.ts` | 189 | Personal context seeder |
| `src/lib/foodApi.ts` | 76 | Food API client |
| `src/lib/supabase.ts` | 52 | Supabase client |
| `src/lib/syncEvents.ts` | 26 | Sync event bridge |
| `src/constants/seeds.ts` | 208 | Exercise + template seeds |
| `src/pages/Dashboard/Dashboard.tsx` | 421 | Dashboard page |
| `src/pages/Food/FoodPage.tsx` | 440 | Food tracking page |
| `src/pages/Workout/WorkoutPage.tsx` | 414 | Workout tracking page |
| `src/pages/Coach/CoachPage.tsx` | 337 | AI coach page |
| `src/pages/Progress/ProgressPage.tsx` | 233 | Progress page |
| `src/pages/Settings/SettingsPage.tsx` | 293 | Settings page |
| `src/pages/Auth/LockScreen.tsx` | 145 | Lock screen |
| `src/pages/Auth/SetupScreen.tsx` | 231 | Setup wizard |
| `src/components/layout/AppShell.tsx` | 30 | App layout shell |
| `src/components/layout/Sidebar.tsx` | 194 | Desktop sidebar + mobile nav |
| `src/components/shared/MacroRing.tsx` | 82 | SVG calorie ring |
| `src/components/shared/WeightLogModal.tsx` | 79 | Weight entry modal |
| `src/components/shared/GoalSetupModal.tsx` | 143 | Goal setup modal |
| `src/components/shared/SyncIndicator.tsx` | 120 | Sync status component |
| `src/index.css` | 497 | Global design system |
| `src/App.tsx` | 75 | Router + auth gate |
| `supabase/schema.sql` | 208 | Database schema |
| **Total** | **~5,500** | |
