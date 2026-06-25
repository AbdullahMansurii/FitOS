# FitOS — Architecture

> Last updated: 2026-06-25

---

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │   React UI   │  │  Zustand     │  │  localStorage      │    │
│  │  (Pages +    │◄►│  Stores (10) │◄►│  (persisted state) │    │
│  │  Components) │  │              │  │                    │    │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────┘    │
│         │                 │                                     │
│         │                 ▼                                     │
│         │          ┌──────────────┐                              │
│         │          │  Sync Layer  │                              │
│         │          │  (sync.ts)   │                              │
│         │          └──────┬───────┘                              │
│         │                 │                                     │
│         ▼                 ▼                                     │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │  Groq API    │  │  Supabase    │                              │
│  │  (AI Coach)  │  │  (Backup DB) │                              │
│  └──────────────┘  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow priority:** User → Zustand Store → localStorage (primary) → Supabase (backup).
The app is fully functional without Supabase connectivity.

---

## Folder Structure Explanation

```
d:\FitOS\
├── index.html                    # SPA entry point
├── package.json                  # Dependencies and scripts
├── vite.config.ts                # Vite config with path aliases
├── tsconfig.json                 # TypeScript project references
├── tsconfig.app.json             # App-level TS config
├── tsconfig.node.json            # Node-level TS config (Vite)
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.js             # PostCSS → Tailwind pipeline
├── eslint.config.js              # ESLint config
├── .env                          # Environment variables (Supabase + Groq keys)
│
├── public/
│   ├── favicon.svg               # App favicon
│   └── icons.svg                 # SVG sprite (unused)
│
├── supabase/
│   └── schema.sql                # Complete PostgreSQL schema (12 tables)
│
├── src/
│   ├── main.tsx                  # React root + QueryClientProvider
│   ├── App.tsx                   # Router + AuthGate + SyncInit
│   ├── App.css                   # Legacy/unused Vite starter CSS
│   ├── index.css                 # Global design system (tokens + components)
│   │
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces (444 lines)
│   │
│   ├── store/
│   │   ├── index.ts              # 9 Zustand stores (541 lines)
│   │   └── authStore.ts          # Auth store (password hashing)
│   │
│   ├── lib/
│   │   ├── ai.ts                 # AI provider interface + GroqProvider + system prompt
│   │   ├── contextSeed.ts        # Abdullah's personal context seeder
│   │   ├── sync.ts               # Supabase bidirectional sync engine
│   │   ├── syncEvents.ts         # Event bridge (store → sync, avoids circular deps)
│   │   ├── supabase.ts           # Supabase client + table helpers
│   │   ├── foodApi.ts            # Open Food Facts API client
│   │   ├── utils.ts              # Utility functions (cn, date, math, format) (~180 lines)
│   │   ├── portionResolver.ts    # Unit normalizer and deterministic gram resolver
│   │   ├── exerciseSearch.ts     # Multi-layered ranking search engine resolver
│   │   ├── foodMapper.ts         # Matches parsed foods and performs macro updates
│   │   ├── exerciseIntelligence.ts # Computes volume, e1RM, trends, and PRs (Source of Truth)
│   │   └── progressiveOverload.ts  # Deterministic, rule-based progressive overload engine
│   │
│   ├── constants/
│   │   ├── seeds.ts              # Seeded exercises (269) and workout templates (6)
│   │   └── foodDatabase.ts       # Curated food database (152 items)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      # Sidebar + mobile header + content area
│   │   │   └── Sidebar.tsx       # Desktop sidebar + mobile BottomNav
│   │   └── shared/
│   │       ├── MacroRing.tsx     # SVG calorie ring + macro stats
│   │       ├── WeightLogModal.tsx # Weight entry modal
│   │       ├── GoalSetupModal.tsx # Goal creation/edit modal
│   │       └── SyncIndicator.tsx  # Sync status + push/pull controls
│   │
│   └── pages/
│       ├── Auth/
│       │   └── LockScreen.tsx    # Password unlock & pairing screen
│       ├── Dashboard/
│       │   └── Dashboard.tsx     # Main dashboard with all widgets
│       ├── Food/
│       │   └── FoodPage.tsx      # Diary + AI chat + search + manual
│       ├── Workout/
│       │   └── WorkoutPage.tsx   # Templates + active session + history
│       ├── Progress/
│       │   └── ProgressPage.tsx  # Weight chart + goal + log history
│       ├── Coach/
│       │   └── CoachPage.tsx     # AI chat interface
│       └── Settings/
│           └── SettingsPage.tsx  # Profile + security + AI + units
```

---

## Frontend Architecture

### Routing

8 routes defined in `App.tsx` using React Router DOM v7:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | → `/dashboard` | Redirect |
| `/dashboard` | `Dashboard` | Main overview |
| `/food` | `FoodPage` | Nutrition tracking |
| `/workout` | `WorkoutPage` | Workout tracking |
| `/progress` | `ProgressPage` | Weight trends + goals |
| `/measurements` | `MeasurementsPage` | Body measurements tracking |
| `/coach` | `CoachPage` | AI chat |
| `/settings` | `SettingsPage` | Preferences |
| `*` | → `/dashboard` | Catch-all redirect |

### Auth Gate

`App.tsx` wraps all routes in an `AuthGate` component:

1. If the app is locked (`!isSetup || !isUnlocked`) → show `LockScreen` (handles initial setup, unlocking, and new device pairing).
2. Otherwise → render the app shell with routes.

The auth store uses `partialize` to persist `isSetup`, `passwordHash`, `recoveryHash`, and `syncToken` — never the unlocked state. Every browser session or refresh requires re-authentication via the lock screen.

### Component Patterns

1. **Page components are self-contained.** Each page file contains the page component and any sub-components specific to that page (e.g., `ExerciseCard`, `TemplateCard`, `SessionTimer` are all in `WorkoutPage.tsx`).
2. **Shared components are in `components/shared/`.** These are reusable across pages: modals, macro ring, sync indicator.
3. **No custom hooks directory.** Logic is colocated with the component that uses it.
4. **Inline styles dominate.** Most styling is via React `style` props with CSS custom properties. Global CSS classes are used for reusable patterns (`.card`, `.btn`, `.nav-item`, `.badge`, etc.).

### Styling Architecture

The design system is defined in `src/index.css`:

- **CSS Custom Properties (Lines 9–78):** Colors, typography, spacing, radius, shadows, transitions.
- **Global Reset (Lines 82–106):** Box-sizing, font smoothing, base body styles.
- **Layout Classes (Lines 117–155):** `#root`, `.app-shell`, `.sidebar`, `.main-content`, `.page-container`.
- **Component Classes (Lines 157–410):** `.card`, `.card-elevated`, `.card-glass`, `.btn` variants, `.badge` variants, `.input`, `.nav-item`, `.section-header`, `.empty-state`.
- **Utility Classes (Lines 412–429):** `.text-accent`, `.flex-center`, `.flex-between`, etc.
- **Animations (Lines 431–452):** `fadeIn`, `slideInRight`, `pulse-glow`, `spin`.
- **Responsive (Lines 454–497):** Mobile breakpoint at 768px. `.mobile-header` and `.bottom-nav` hidden on desktop, visible on mobile.

Tailwind CSS is installed and configured but is lightly used — primarily for `md:hidden` utility class (now refactored to CSS). The design system is essentially vanilla CSS with custom properties.

---

## Backend Architecture

**There is no backend server.** FitOS is a pure client-side SPA.

- **Supabase** is used as a dumb data store. No server-side logic or edge functions. Row Level Security (RLS) is enabled and enforced using a custom header token validation scheme.
- **AI calls** go directly from the browser to the Groq REST API.
- **Food search** goes directly from the browser to the Open Food Facts API.

### Security Implication

API keys (Supabase anon key, Groq API key) are embedded in the client bundle via environment variables. This is acceptable for a single-user app but would need a proxy layer for production/multi-user deployment.

---

## Database Architecture

### Supabase PostgreSQL Schema (12 tables)

```
profiles ──────────── 1 row (single user)
goals ─────────────── n rows (cut/bulk/maintain phases)
weight_logs ───────── n rows (one per date, unique constraint)
food_items ────────── n rows (personal food database)
food_logs ─────────── n rows (daily diary entries)
saved_meals ───────── n rows (meal templates, unused in UI)
exercises ─────────── n rows (269 seeded)
workout_templates ─── n rows (6 seeded)
workout_sessions ──── n rows (completed workouts with JSONB exercises)
memories ──────────── n rows (AI coach long-term memory)
measurements ──────── n rows (body measurements, synced via JSON notes serialization)
sync_metadata ─────── n rows (last sync time per entity type)
```

### Key Design Decisions

1. **Text primary keys.** All IDs are client-generated UUIDs (`crypto.randomUUID()`). This enables offline-first creation without ID conflicts.
2. **Date fields are text.** ISO date strings (`YYYY-MM-DD`) for dates, `timestamptz` for timestamps. This simplifies client-side date handling.
3. **JSONB for nested structures.** Workout sessions store exercises and sets as JSONB arrays rather than normalized junction tables. This simplifies sync (one upsert per session).
4. No foreign key enforcement for synced data. Most tables have text IDs without referential integrity, allowing partial syncs.
5. **RLS enabled.** Enforced on all 12 tables. All queries must pass a matching `sync_token` in the `x-fitos-auth` HTTP header.

### Sync Strategy

```
On app unlock:
  1. seedUserContext() — idempotent context seeding
  2. isSupabaseReachable() — connectivity check
  3. pullAll() — fetch all data from Supabase → merge into Zustand stores
  4. schedulePush(2000) — debounced push after 2 seconds

On store mutation (add/update/delete):
  1. Zustand store updates synchronously
  2. notifySync() → syncEvents → schedulePush(5000) — debounced push after 5s

The push is a full-table upsert (not incremental).
The pull is a full-table replace (not incremental).
```

**Conflict resolution:** Last-write-wins. The pull replaces local state entirely. The push upserts all local data. If both sides changed, the last operation wins.

---

## AI Architecture

### System Prompt Construction (`lib/ai.ts`)

Every AI call receives a system prompt built by `buildSystemPrompt(context)` containing:

1. **Coaching Persona** — "50% elite strength coach + 50% data analyst"
2. **Athlete Profile** — Name, height, training experience
3. **Active Goal** — Type, targets, start/target weight, dates
4. **Weight Tracking** — Current weight, baseline, 7-day trend, 30-day trend
5. **Today's Nutrition** — Calories, protein, carbs, fat vs targets
6. **Training Log** — Last 7 sessions with duration, volume, rating
7. **Approved Memories** — Grouped by category (goal_context, preference, insight, behavioral)
8. **Coaching Rules** — Recommendation priority, Indian diet context, injury history

### Memory Suggestion Protocol

The AI can embed memory suggestions in its responses using:

```
[MEMORY_SUGGESTION: category="preference" title="Title" content="Content"]
```

The `extractMemorySuggestions()` function parses these from the AI response, removes them from the displayed text, and presents them to the user for approval.

### Food Parsing

The AI also handles natural language food parsing via `parseFood()`:

- Input: "6 egg whites, 2 scoops whey, 1 banana"
- Output: JSON array of `ParsedFoodEntry` objects with name, quantity, macros, confidence
- Temperature set to 0.1 for consistency
- JSON is extracted via regex from the AI response

### Provider Interface

```typescript
interface AIProviderInterface {
  chat(messages: AIMessage[], context: FitnessContext): Promise<string>
  parseFood(input: string): Promise<ParsedFoodEntry[]>
}
```

Only `GroqProvider` implements this today. The `createAIProvider()` factory is ready for additional providers.

---

## Exercise, Overload & Nutrition Intelligence Layer

FitOS utilizes a local, fully deterministic, rule-based intelligence system to track athletic performance, suggest progressive overload changes, and adapt nutritional targets.

| Component | File Path |
|---|---|
| Exercise Intelligence Layer | `src/lib/exerciseIntelligence.ts` |
| Progressive Overload Engine | `src/lib/progressiveOverload.ts` |
| Recomposition Intelligence Engine | `src/lib/recompositionIntelligence.ts` |
| Adaptive Nutrition Engine | `src/lib/nutritionIntelligence.ts` |
| Exercise + template seeds | `src/constants/seeds.ts` |

### 1. Exercise Intelligence Layer (`lib/exerciseIntelligence.ts`)
Acts as the analytical engine that reads historical completed sessions for an exercise and calculates:
- Session Volume, Peak e1RM (Epley formula), and Best Set performance.
- 30-Day volume and strength trends (percentage changes).
- Set-level and session-level Personal Records (PRs).
- Chronological session history (up to 10 entries).

### 2. Progressive Overload Engine (`lib/progressiveOverload.ts`)
Consumes data from `exerciseIntelligence.ts` to compute ephemeral, on-demand, advisory recommendations for the upcoming workout session.
- **Readiness Score**: A 0–100 score dynamically calculated using consistency, recovery gap penalties, weekly training frequency, 30d strength/volume trends, and performance plateaus.
- **Stall & Fatigue Detection**: Automatically detects stagnation (plateaus) or systemic fatigue (declines in both strength and volume across 3 consecutive sessions).
- **Rule-Based Hierarchy**: Prevents conflicting advices by resolving priorities in the following order:
  1. *Fatigue Warning* (Maintain)
  2. *Deload* (10% max load reduction)
  3. *Increase Weight* (Adjusted by progression buckets)
  4. *Increase Reps*
  5. *Maintain*

### 3. Recomposition Intelligence Engine (`lib/recompositionIntelligence.ts`)
Synthesizes physical circumferences (chest, waist, hips, neck, limbs), scale weight, and completed workout history to provide body composition classification:
- **30-Day Baselines**: Computes trends using a 30-day baseline window (filtered between 14 and 45 days prior) to filter out daily fluctuations in weight and waist.
- **Top Exercises Strength Mapping**: Selects the top 3 most-trained exercises to calculate the Average Strength Change.
- **Deterministic Classification Rules**: Evaluates trends to output one of 8 states (recomp, lean bulk, aggressive bulk, fat loss, cutting, aggressive cut, stalled, insufficient data).
- **AI Coach and Dashboard Widgets**: Injects formatted prompt context into AI conversations and updates Today's Physique Status on the dashboard.
- **Dynamic Unit Scaling**: Automatically scales scales (lbs) and circumferences (inches) in the UI depending on user settings while storing metric values (kg and cm) internally.

### 4. Adaptive Nutrition Engine (`lib/nutritionIntelligence.ts`)
Synthesizes weight history, waist measurements, strength trends, and food log macro intake history to provide deterministic daily nutrition adjustments:
- **Calorie Recommendations**: Suggests caloric target updates of ±150 kcal based on goal progress (e.g. Cut Too Fast, Cut Too Slow, Bulk Too Fast, Bulk Too Slow, Recomp, Maintenance).
- **Protein Target Adaptation**: Calculates recommended targets (Cut: 2.2 g/kg, Recomp: 2.0 g/kg, Bulk/Maintenance: 1.8 g/kg) and warns when the current goal target is below the recommended range minimum.
- **Macronutrient Adherence Stats**: Computes 7-day and 30-day calorie adherence (percentage of logged days within ±10% of target) and protein adherence (percentage of logged days >=90% of target) for logged days only, ensuring the user is not penalized for untracked days.
- **Progression Buckets**:
  - *Heavy Compound Lower*: +5kg (Squat, Deadlift, Hack Squat, Leg Press, etc.)
  - *Heavy Compound Upper*: +2.5kg (Bench Press, Overhead Press, Rows, etc.)
  - *Dumbbell Compound*: +2kg total (Dumbbell Presses, Dumbbell Rows, etc.)
  - *Isolation Exercises*: +1kg (Bicep Curls, Lateral Raises, Pushdowns, etc.)
- **Hypertrophy Threshold**: Employs an 80% volume-adherence check where load increases only if $\ge$ 80% of working sets reach the top of the rep target minus 1.

### 3. UI Surfacing Layer & Performance Caching
Integrates the outputs of the Exercise Intelligence and Progressive Overload systems directly into the client interfaces.
- **Memoized Calculations**: Progressive overload recommendations are cached using a `useMemo` map indexed by `exerciseId` (`recommendationsMap`). This prevents heavy historical session parsing and Epley calculations from running repeatedly during list rendering and UI input updates.
- **Live Workout Coaching**: Active workout cards dynamically render recommendation overlays (suggested load, rep target, confidence, readiness, and notes) and flag warnings for fatigue (`⚠ Recovery Warning`) and stalls (`⚠ Plateau Detected`).
- **Dashboard Training Status Widget**: Renders a high-level widget displaying average readiness, status, top 3 recommendations, and active warnings.
- **Exercise Analytics Modal**: Offloads deep metrics (all PRs, 30-day e1RM/volume trend charts/percentages, recovery flags) to a non-intrusive modal overlay rather than overloading listing cards.
- **Set-Level History Breakdown**: Expands historical session details to list each set's load, reps, warmup indicators, and PR trophys inside collapsible details toggles.
- **Coach Intelligence Augmentation**: Merges structured recommendations, trends, and warning flags into the LLM system prompt via a token-saving context serializer (`generateTrainingIntelligence()`), limiting context to the top 5 most-trained exercises and active flags.

---

## Data Flow

### Food Logging (AI Chat)

```
User types: "2 eggs and toast"
  → createAIProvider() returns GroqProvider
  → provider.parseFood("2 eggs and toast")
  → Groq API call (temperature=0.1)
  → Parse JSON from response
  → Display ParsedFoodEntry[] cards with "Confirm" / "Discard"
  → User clicks "Confirm"
  → addFoodLog() for each entry → Zustand store → localStorage
  → notifySync() → schedulePush(5000) → pushAll() → Supabase upsert
```

### AI Coach Conversation

```
User sends message
  → addMessage({role:'user', content}) → chat store
  → buildContext() collects: profile, goal, weights, nutrition, workouts, memories
  → createAIProvider().chat(last10messages, context)
  → Groq API call with full system prompt
  → extractMemorySuggestions(rawResponse)
  → addMessage({role:'assistant', content: cleanText})
  → Display memory suggestions if any (approve/reject UI)
```

### Weight Logging

```
User opens WeightLogModal
  → Enters weight (kg) + optional notes
  → addLog({date, weightKg, notes})
  → Store deduplicates by date (replaces existing)
  → Sorts by date
  → triggerSync() → notifySync() → schedulePush() → pushAll()
```

---

## State Management

### 10 Zustand Stores

| Store | Key | Persisted | Description |
|-------|-----|-----------|-------------|
| `useAuthStore` | `fitos-auth` | ✅ (partial) | Password hash, recovery hash, setup state. `isUnlocked` is NOT persisted. |
| `useProfileStore` | `fitos-profile` | ✅ | Display name, height, DOB, gender, units. |
| `useGoalsStore` | `fitos-goals` | ✅ | Goal list with CRUD. One active goal at a time. |
| `useWeightStore` | `fitos-weight` | ✅ | Weight logs + body measurements. |
| `useFoodStore` | `fitos-food` | ✅ | Food items, food logs, saved meals. |
| `useWorkoutStore` | `fitos-workout` | ✅ | Exercises, templates, sessions, active session. |
| `useMemoryStore` | `fitos-memory` | ✅ | Approved memories + pending suggestions. |
| `useChatStore` | `fitos-chat` | ✅ | Chat message history. |
| `useSettingsStore` | `fitos-settings` | ✅ | AI config, units, rest timer, theme. Has custom merge logic for env-var fallback. |
| `useUIStore` | (not persisted) | ❌ | Sidebar state, active date. Ephemeral. |

### Persistence Strategy

All stores except `useUIStore` use Zustand's `persist` middleware with `localStorage` as the storage backend. Each store has its own localStorage key (e.g., `fitos-goals`).

The `authStore` uses `partialize` to exclude `isUnlocked` from persistence, forcing re-authentication on every session. Password entry triggers a client-side Web Crypto SHA-256 derivation of a static-salted `syncToken` used for cloud pairing, and hashes the password locally using `bcryptjs` for session unlock gates.

The `settingsStore` uses a custom `merge` function to fall back to the `.env` Groq API key if the persisted key is empty.

---

## API Patterns

### External APIs

| API | Usage | Auth |
|-----|-------|------|
| **Groq** (`api.groq.com/openai/v1/chat/completions`) | AI coach chat + food parsing | Bearer token (API key) |
| **Open Food Facts** (`world.openfoodfacts.org`) | Food search + barcode lookup | None (public API) |
| **Supabase** (`wmnjdbtkjyosxwyvninl.supabase.co`) | Data sync (backup/restore) | Anon key |

All API calls use native `fetch`. No HTTP client library.

### Supabase Usage

Supabase is used exclusively through `@supabase/supabase-js` client with:
- `persistSession: false` — no Supabase auth
- `autoRefreshToken: false`
- `detectSessionInUrl: false`

Operations: `select`, `upsert`, `maybeSingle`. No `insert`, `update`, `delete` — everything is upsert for idempotency.

---

## Security Considerations

### Current Security Model

| Area | Implementation | Risk Level |
|------|----------------|------------|
| **Auth** | Master password derived to deterministic SHA-256 sync token. Setup wizard removed, pairing is automatic via lock screen. | 🟢 Low — derived token eliminates random syncToken sharing. |
| **Recovery** | bcrypt-hashed recovery phrase (6 words from 12-word pool) | ⚠️ Medium — low entropy (12^6 = 2.9M combinations) |
| **API Keys** | Embedded in client bundle via `.env` in development. Developer keys excluded from production. | ⚠️ Medium — API key hidden in production builds, but local variable indirection can sometimes skip compiler DCE. |
| **Supabase RLS** | Enabled on all tables. Authorization token `x-fitos-auth` validated against profile's `sync_token`. Database uniqueness constraint `is_master` guarantees at most one profile row. | 🟢 Low — remote database queries are secure. |
| **Data at Rest** | Plain text in localStorage | ⚠️ Medium — no encryption |
| **Network** | HTTPS (Supabase + Groq) | 🟢 Low risk |

### Recommendations

1. **For production:** Inline the `import.meta.env.DEV` check inside `useSettingsStore` to ensure complete dead-code elimination of the default key.
2. **For production:** Serialize the sync engine `pushAll` call to upload the profile first, preventing RLS race conditions.
3. **Consider:** localStorage encryption for sensitive data (weight, nutrition) using a key derived from the master password.
4. **Consider:** Larger word pool for recovery phrases to increase entropy.

---

## Current Technical Debt

### Critical

1. **API keys in client bundle (Partially Resolved):** Default Groq key is excluded in production builds, but local variable indirection prevents DCE optimization in the bundler. Need to inline the `import.meta.env.DEV` check.
2. **Supabase Sync Race Condition (Resolved):** Profile upserts are serialized dynamically before other parallel table uploads in `pushAll()` to establish the authorization headers properly.
3. **Full-table sync:** Every push upserts ALL data. Every pull replaces ALL data. This doesn't scale and has data loss risk for concurrent edits.

### High

4. **`App.css` is dead code:** Contains Vite starter template CSS. Should be deleted.
5. **Framer Motion is installed but barely used:** Either use it for animations or remove it.
6. **TanStack React Query is installed but completely unused:** Remove or integrate.
7. **Zod is installed but completely unused:** Remove or integrate for form validation.
8. **No error boundaries (Resolved):** Production-grade React class `<ErrorBoundary>` wraps the page layout structure to prevent runtime errors from collapsing the client.
9. **No tests (Resolved):** Standardized local unit and integration tests are compiled under `/scratch/` (6 active test suites covering progressives, recomposition, nutrition adaptation, sync boundaries, data integrity, and local dates).

### Medium

10. **Unit settings not applied:** kg/lbs and kcal/kj settings exist but UI is hardcoded to kg/kcal.
11. **Inconsistent styling approach:** Mix of CSS classes (`.card-elevated`) and inline styles for the same purposes.
12. **No loading states for sync:** The sync indicator exists but pages don't show loading states during pull.
13. **Chat history grows unbounded:** No limit on stored messages. Will eventually degrade localStorage performance.

### Low

15. **No accessibility features.** No ARIA labels, no keyboard navigation for complex interactions, no screen reader support.
16. **No i18n.** Hardcoded English strings throughout.
17. **No PWA support.** No service worker, no manifest, no offline caching of static assets.
18. **Recovery phrase entropy is low.** 12 words, pick 6 = ~2.9M combinations. Not production-grade.

---

## Future Architectural Considerations

1. **Incremental sync.** Use `sync_metadata.last_synced_at` and `updated_at` timestamps to sync only changed records. The schema already supports this.
2. **Service worker.** Add a Vite PWA plugin for offline static asset caching and push notifications.
3. **Backend proxy.** A lightweight edge function (Supabase Edge Functions, Cloudflare Workers) to proxy AI API calls and hide keys.
4. **Multi-provider AI.** Implement `OpenAIProvider`, `GeminiProvider`, `AnthropicProvider` classes.
5. **Component library extraction.** Extract shared UI components (Modal, Badge, Button, Input) into a proper component library directory.
6. **Nutrition analytics.** Weekly/monthly trend charts for calories, protein adherence, and macros.
7. **Workout analytics.** Volume trend, frequency heatmap, PR timeline, muscle group balance.
8. **Data export (Completed).** JSON backup export/restore and DB snapshots are fully integrated into settings.
