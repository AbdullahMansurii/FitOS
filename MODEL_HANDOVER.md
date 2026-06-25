# FitOS — AI Model Handover Guide

> This document gives a new AI model immediate, operational context to continue development on FitOS without re-analyzing the codebase.

---

## Quick Start

```bash
cd d:\FitOS
npm install        # Install dependencies
npm run dev        # Start Vite dev server on localhost:5173
```

Default password on first run: Enter your master password on the Lock Screen. If the database is empty, this password becomes your master password. If the database is already populated, entering this password derives the pairing syncToken to pull your cloud profile.

---

## What FitOS Is

A **single-user, local-first fitness tracker** with an AI coach. It tracks nutrition, weight, workouts, and goals — and feeds ALL of that data into an AI system prompt so the coach can give evidence-based advice.

**Key mental model:** FitOS is a personal fitness operating system, not a SaaS product. One user. One database. No auth server.

---

## Critical Architecture Facts

1. **Local-first.** All data lives in `localStorage` via 10 Zustand stores with `persist` middleware. Supabase is an optional backup layer.

2. **The AI context system is the core feature.** Every AI call receives a rebuilt system prompt containing the user's profile, goals, weight history, today's nutrition, recent workouts, and all approved memories. See `src/lib/ai.ts` → `buildSystemPrompt()`.

3. **No backend server.** All API calls (Groq, Open Food Facts, Supabase) are made directly from the browser.

4. **Single-user assumption with RLS security.** No multi-tenant database. Row Level Security (RLS) is enabled across all tables in Supabase. Queries from the frontend are authenticated by passing a client-side sync token inside the custom `x-fitos-auth` HTTP header. This header is validated by database policies against the token saved in the single-row `profiles` table. The single-row limit is strictly enforced via a PostgreSQL column constraint (`is_master BOOLEAN DEFAULT true CHECK (is_master = true) UNIQUE`).

5. **Sync is full-table.** Push = upsert everything. Pull = replace everything. No incremental sync.

---

## Where Things Live

### Core Logic
| What | File |
|------|------|
| All TypeScript types | `src/types/index.ts` |
| All Zustand stores (9) | `src/store/index.ts` |
| Auth store | `src/store/authStore.ts` |
| AI provider + system prompt | `src/lib/ai.ts` |
| Supabase sync engine | `src/lib/sync.ts` |
| User context seeder | `src/lib/contextSeed.ts` |
| Food API (Open Food Facts) | `src/lib/foodApi.ts` |
| Utility functions | `src/lib/utils.ts` |
| Exercise Intelligence Layer | `src/lib/exerciseIntelligence.ts` |
| Progressive Overload Engine | `src/lib/progressiveOverload.ts` |
| Recomposition Intelligence Engine | `src/lib/recompositionIntelligence.ts` |
| Adaptive Nutrition Engine | `src/lib/nutritionIntelligence.ts` |
| Exercise + template seeds | `src/constants/seeds.ts` |
| Global design system | `src/index.css` |
| Database schema | `supabase/schema.sql` |

### Pages
| Route | File |
|-------|------|
| `/dashboard` | `src/pages/Dashboard/Dashboard.tsx` |
| `/food` | `src/pages/Food/FoodPage.tsx` |
| `/workout` | `src/pages/Workout/WorkoutPage.tsx` |
| `/progress` | `src/pages/Progress/ProgressPage.tsx` |
| `/measurements` | `src/pages/Measurements/MeasurementsPage.tsx` |
| `/coach` | `src/pages/Coach/CoachPage.tsx` |
| `/settings` | `src/pages/Settings/SettingsPage.tsx` |
| Lock Screen | `src/pages/Auth/LockScreen.tsx` |

### Shared Components
| Component | File |
|-----------|------|
| App layout shell | `src/components/layout/AppShell.tsx` |
| Sidebar + mobile nav | `src/components/layout/Sidebar.tsx` |
| SVG calorie ring | `src/components/shared/MacroRing.tsx` |
| Weight entry modal | `src/components/shared/WeightLogModal.tsx` |
| Goal setup modal | `src/components/shared/GoalSetupModal.tsx` |
| Sync status widget | `src/components/shared/SyncIndicator.tsx` |

---

## How to Add a New Feature

### Step 1: Define the types
Add interfaces to `src/types/index.ts`. Follow the existing naming convention (PascalCase, string literal unions for enums).

### Step 2: Add store logic
Add a new Zustand store slice or extend an existing one in `src/store/index.ts`. If the data should persist, use the `persist` middleware with a unique key (`fitos-<domain>`).

After any mutation that should sync, call `triggerSync()`:
```typescript
import { notifySync } from '@/lib/syncEvents'
// After state mutation:
notifySync()
```

### Step 3: Create the page
Create a new directory under `src/pages/<FeatureName>/` with a single `<FeatureName>Page.tsx` file. Follow the existing page patterns:
- Use `className="page-container animate-fade-in"` for the outer div
- Use `style={{ maxWidth: ... }}` for content width
- Use design system CSS custom properties for all colors

### Step 4: Add routing
Add a `<Route>` in `src/App.tsx` and a navigation item in `src/components/layout/Sidebar.tsx` (both desktop nav and mobile `BottomNav`).

### Step 5: Add Supabase schema (if needed)
Add the table definition to `supabase/schema.sql` and add the push/pull logic to `src/lib/sync.ts`.

---

## How to Extend the AI

### Adding context to the system prompt
1. Open `src/lib/ai.ts`
2. Find the `buildSystemPrompt(ctx: FitnessContext)` function
3. Add a new section using the template:
```typescript
sections.push(`\n## [Section Name]\n${yourData}`)
```
4. Make sure the new data is passed through the `FitnessContext` interface
5. Update the `buildContext()` function in `CoachPage.tsx` to include the new data

### Adding a new AI provider
1. Create a new class implementing `AIProviderInterface` in `src/lib/ai.ts`
2. Implement `chat()` and `parseFood()` methods
3. Add the provider to the `createAIProvider()` factory
4. Add models to the Settings page model selector
5. Add the new provider option to the `AIProvider` type in `src/types/index.ts`

### Adding new memory categories
1. Add the category to the `Memory['category']` union in `src/types/index.ts`
2. Update the category check in `memories` table schema
3. Update the memory grouping in `buildSystemPrompt()`

---

## How to Add a New Tracked Metric

Example: Adding sleep tracking.

1. **Type:** Add `SleepLog` interface to `src/types/index.ts`
2. **Store:** Add `useSleepStore` to `src/store/index.ts` with `persist` middleware
3. **Trigger sync:** Call `notifySync()` after mutations
4. **Schema:** Add `sleep_logs` table to `supabase/schema.sql`
5. **Sync:** Add push/pull for `sleep_logs` in `src/lib/sync.ts`
6. **AI context:** Add sleep data to `FitnessContext` interface and `buildSystemPrompt()`
7. **UI:** Create `src/pages/Sleep/SleepPage.tsx`
8. **Route:** Add route in `App.tsx` and nav item in `Sidebar.tsx`
9. **Dashboard:** Add a sleep widget to `Dashboard.tsx`

---

## Known Gotchas

### 1. Exercise and Template ID Stability (Resolved)
Previously, `src/constants/seeds.ts` generated random UUIDs at module-load time, causing IDs to regenerate on every refresh and breaking session templates and PR tracking.
- **Current implementation:** All seeded exercises and templates generate stable, deterministic slug-based IDs (e.g., `ex-bench-press`, `tmpl-push-a`) derived from their names. Seeding timestamps are also pinned to static ISO values.

### 2. The sync event bridge is not optional
`syncEvents.ts` exists to break a circular dependency:
```
store/index.ts → sync.ts → store/index.ts  ← CIRCULAR
```
The bridge pattern:
```
store/index.ts → syncEvents.ts (notifySync)
sync.ts → syncEvents.ts (registerSchedulePush)
```
**Never import `sync.ts` from `store/index.ts`.** Always use `notifySync()` from `syncEvents.ts`.

### 3. Auth persistence is intentionally partial
The `authStore` uses `partialize` to persist `isSetup`, `passwordHash`, and `recoveryHash` — but **NOT** `isUnlocked`. This means:
- Every page load requires re-entering the password.
- This is by design. Don't "fix" it by persisting `isUnlocked`.

### 4. The `.env` file contains real keys
The `.env` file at the project root contains the actual Supabase URL, anon key, and Groq API key. These are embedded in the Vite build. For development this is fine; for production, these need to be proxied.

### 5. Full-table sync is destructive
`pullAll()` replaces the entire local state for each entity. If you have local-only data and pull, it will be overwritten. Always push before pulling.

### 6. Chat history grows unbounded
The chat store has no message limit. Over time, this will bloat localStorage. Consider adding a max message count (e.g., 200) with automatic pruning.

### 7. The Dashboard AI brief makes an API call on every mount
The Dashboard's "AI Daily Brief" calls the Groq API every time the dashboard mounts. Consider caching the brief with a TTL (e.g., 1 hour).

### 8. Production API Key Bundling Risk
The settings store (`src/store/index.ts`) resolves default settings via an `isDev` local variable checking `import.meta.env.DEV`.
- **Gotcha:** If the compiler (esbuild/terser) fails to run dead-code elimination (DCE) on the local variable indirection, the default environment Groq API key might still end up in the client-side production build bundle.
- **Remedy:** The environment check must be inlined directly in the settings store property definition.

### 9. Parallel Initial Sync Race Condition
The sync engine `pushAll()` in `src/lib/sync.ts` initiates upserts for all tables in parallel via `Promise.all()`.
- **Gotcha:** Under PostgreSQL RLS policies, tables check credentials against the `sync_token` saved in the `profiles` table. If other tables attempt to insert data before the `profiles` write has resolved, database validation fails with RLS errors.
- **Remedy:** Serialize the sync engine to push the profile first before pushing other data tables.

---

## Current State Summary

| Metric | Value |
|--------|-------|
| Total source files | ~46 |
| Total lines of code | ~10,700 |
| npm dependencies | 17 production, 10 dev |
| Pages | 9 |
| Zustand stores | 9 |
| Supabase tables | 12 |
| Seeded exercises | 269 |
| Seeded workout templates | 6 |
| Unit tests | 3 suites (99 assertions total) |
| E2E tests | 0 |
| CI/CD | None |
| PWA support | No |
| Accessibility compliance | None |

---

## Priorities for Next Developer

### Completed (Milestones)
- **Phase 2C Recomposition Intelligence (Wave 2):** Fully implemented body measurements tracking page (Metric/Imperial display scaling), Physique Analytics progress view (weight/waist charts, timeline classifications, monthly summaries), Dashboard status widgets, AI Coach prompt context injections, and a 46-assertion unit test suite.
- **Phase 2C UI Surfacing (Wave 1):** Fully surfaced deterministic training intelligence to client UI components (memoized via `useMemo` caching), recovery & deload banners, exercise analytics modal, collapsible set-level workout history logs, and AI coach training context.
- **Phase 2B Progressive Overload Engine:** Deterministic, local strength progression recommendation engine with readiness scoring, fatigue warning indicators, volume checks, and exercise-specific target increments.

### Must Do (Technical Debt & Security)
1. ✅ Inline the `import.meta.env.DEV` check in `useSettingsStore` directly to guarantee dead-code elimination (DCE) of the default Groq API key in production builds. (Done)
2. ✅ Serialize the sync engine `pushAll()` call so the `profiles` table is uploaded and verified first, preventing PostgreSQL RLS race conditions during initial provisioning. (Done)
3. ❌ Remove unused dependencies: Framer Motion, TanStack React Query, Zod (or integrate them).
4. ❌ Delete `src/App.css` (dead Vite starter code).
5. ❌ Add React error boundaries to handle runtime faults without full application crash.
6. ❌ Limit and prune chat message history (e.g. max 200 messages) in Zustand store to avoid localStorage bloating.
7. ❌ Cache the Dashboard's AI daily brief with a time-to-live (e.g., 1 hour) instead of calling Groq API on every mount.

### Should Do (Feature Completeness)
1. Apply unit conversion (kg/lbs, kcal/kj) settings throughout the UI.
2. ✅ Build UI for body measurements (Zustand store + database schema already exist). (Done)
3. Build UI for saved meals (Zustand store + database schema already exist).
4. ✅ Build UI for custom exercise creation (Zustand store supports it). (Done)
5. ✅ Build UI for workout template CRUD (Zustand store supports it). (Done)
6. Add weekly/monthly nutrition trend charts.

### Nice to Have (Polish)
1. Integrate PWA support (service worker, manifest) for a native app feel.
2. Implement data export/import (CSV/JSON formats).
3. Implement alternative AI providers (OpenAI, Gemini, Anthropic classes).
4. Build a light theme toggle.
5. Create a mobile camera barcode scanner UI.
6. Build workout analytics charts (volume trends, PR timeline heatmaps).
