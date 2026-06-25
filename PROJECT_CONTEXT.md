# FitOS — Project Context

> Last updated: 2026-06-25

---

## Project Identity

| Field             | Value                                      |
|-------------------|--------------------------------------------|
| **Name**          | FitOS                                      |
| **Tagline**       | Your Personal Fitness Operating System     |
| **Version**       | 0.8.0-alpha                                |
| **Product Maturity**| Beta (Feature Complete, Production Tested)  |
| **Vision**        | A single-user, AI-augmented fitness platform that treats logged data as the source of truth and the AI coach as an evidence-based analyst — not a generic motivator. |
| **Mission**       | Give one user (Abdullah Mansuri) a premium, local-first fitness dashboard that unifies nutrition, weight, workout tracking, goal management, and an AI coach powered by historical context. |
| **Product Category**| Personal Fitness Tracker + AI Coach (Single-User SPA) |

---

## Product Principles

### Core Philosophy

1. **AI-first, not AI-only.** AI assists — the user confirms. Every AI suggestion (food parse, memory) must be manually approved before it becomes persistent data.
2. **Manual confirmation + automated assistance.** The user is always in control. AI can propose memories; only the user promotes them to approved.
3. **Historical context over isolated data.** The AI system prompt is rebuilt on every call with the full weight history, nutrition totals, recent workouts, approved memories, and active goal. Context is the product.
4. **Consistency over complexity.** The codebase favors a small number of well-understood patterns (Zustand stores, inline styles, page-per-feature) over framework abstractions (no custom hooks folder, no HOCs, no render-prop patterns).
5. **Single-user optimized, future-user compatible.** There is no multi-tenant auth. Supabase is a backup/restore layer, not a user-scoped backend. RLS is enabled using a custom client-side `sync_token` validation scheme to secure single-user data.
6. **Provider-agnostic AI architecture.** The `AIProviderInterface` is a clean interface. Only `GroqProvider` is implemented today, but OpenAI/Gemini/Anthropic are typed and the factory is ready.

### What the Product IS

- A **personal fitness operating system** for a single power-user.
- A **local-first** application: works fully offline, syncs to Supabase when available.
- An **AI-augmented** tracker: the AI coach has full read access to all logged data.
- A **dark-mode, premium-feeling** SPA with custom design tokens.

### What the Product is NOT

- Not a social fitness app. No followers, no sharing, no leaderboards.
- Not a generic SaaS product. No signup flow, no billing, no multi-tenant database.
- Not a calorie-counting app that happens to have AI bolted on — the AI context system is a core architectural feature.
- Not a replacement for a personal trainer — it's a data analyst that happens to know fitness.

---

## Current Feature Set

### ✅ Fully Implemented

| Feature | Description |
|---------|-------------|
| **Single-Owner Auth** | Password entry dynamically computes a deterministic SHA-256 syncToken used for pairing. No setup wizard is used; the Lock Screen handles initial creation or multi-device pairing on first load. |
| **Lock Screen** | Password gate on every app launch. Backwards-compatible token migration updates old UUID clients to SHA-256 automatically. |
| **Dashboard** | Unified overview: weight stats, calorie/protein progress bars, active goal, recent workout, AI brief, macro breakdown, quick actions. |
| **Food Tracking** | Three logging modes: AI chat parse, Open Food Facts search, manual entry. Diary view grouped by meal type (breakfast/lunch/dinner/snack). Date picker. |
| **AI Food Parsing** | Natural language → structured nutrition via Groq LLM. Confidence scoring. Manual confirmation before logging. |
| **Weight Tracking** | Daily weight log with notes. Deduplication (one per date). Sorted chronologically. |
| **Progress Page** | Weight trend chart (Recharts LineChart) with 7/30/90-day range selector. Goal progress bar. Weight log history with diff indicators. |
| **Goal Management** | Cut/Bulk/Maintain goal types with calorie and protein targets. Goal presets. One active goal at a time. Progress calculation. |
| **Workout Tracking** | Template-based workout system. Active session with live timer, set logging (weight × reps), warmup toggle, PR detection (Epley e1RM), rest timer. Session completion with rating + notes. |
| **Exercise Library** | 269 seeded exercises across chest, back, shoulders, arms, legs, core, cardio. Muscle group and equipment metadata. |
| **Workout Templates** | 6 seeded templates (Push A, Pull A, Legs A, Upper Body, Lower Body, Full Body). PPL and UL split support. |
| **Custom Workout Builder** | Integrated workout routine customization UI (`TemplateEditor` component) enabling users to create, clone, edit, reorder, and delete templates directly from the UI. |
| **Custom Exercise Creator** | Custom exercise creation modal to add/delete custom exercises to/from the library, integrated with Supabase sync. |
| **Progressive Overload UI Surfacing** | Surfaces progressive overload recommendations (suggested weight/reps, readiness, confidence, coaching reasons) directly inside active workout exercise cards. Includes warnings for systemic fatigue and deloads. Memoized via `useMemo` for high rendering performance. |
| **Dedicated Exercise Analytics Modal** | Offers a dedicated analytics modal overlay showing lifetime PRs (weight, volume, e1RM), 30-day trends, readiness status, weekly frequency, and recovery flags. |
| **Expandable Set-Level Workout History** | Adds collapsible session detail cards in workout history, displaying set-by-set weight, reps, warmup indicators, and PR trophys. |
| **Dashboard Training Status Widget** | Exposes overall readiness and progression status on the dashboard with top relevant progression recommendations and recovery warnings. |
| **AI Coach Context Upgrade** | Reinforces the AI Coach prompt with detailed, token-capped training intelligence, including PR metrics, 30-day trends, progression recommendations, and fatigue/stall flags for top-trained or flagged exercises. |
| **Memory System** | AI can suggest memories via `[MEMORY_SUGGESTION]` tags. User approves/rejects. Memories are categorized (preference, insight, goal_context, behavioral). Approved memories are injected into every AI call. |
| **Context Seeding** | Idempotent seeding of Abdullah's personal fitness context (11 memories, profile, default goal) on first run. |
| **Supabase Sync** | Bidirectional local ↔ Supabase sync. Push (local→cloud) and pull (cloud→local). Secured via Row Level Security (RLS) with x-fitos-auth headers. Debounced auto-push on mutations. Manual push/pull via SyncIndicator. Connectivity check. |
| **Settings** | Profile editing, password change, AI provider configuration (API key + model selection), unit preferences (kg/lbs, kcal/kj), rest timer default. |
| **Responsive Layout** | Desktop sidebar + mobile bottom nav. Hamburger menu for mobile. CSS-based responsive breakpoints. |
| **Body Measurements & Recomposition** | Log circumferences (chest, waist, limbs, neck, hips) and body weight. Includes deterministic classification status (fat loss, bulk, recomp, cut safety), charts, timeline history, and AI Coach context injections. Fully supports Metric and Imperial systems. |
| **Adaptive Nutrition & Goal Intelligence** | Deterministic, rule-based recommendation engine adjusting calories (±150 kcal adjustments) and protein (1.6-2.4 g/kg bodyweight targets) based on weight trends, waist adjustments, strength logs, and macro diary adherence rates. Integrates a Dashboard status widget, dedicated progress charts/logs sub-tab, and AI Coach prompt context. |
| **Backup & Recovery System** | Export full state JSON backup, import/restore and auto-sync, or download raw SQL database snapshots from settings. |
| **Tombstone Deletion Sync** | Tracks local deletions using tombstone ID lists. Sync engine propagates deletions to Supabase and prunes tombstones on success. |

### 🟡 Partially Implemented

| Feature | Status |
|---------|--------|
| **Saved Meals** | Type defined, store has `addSavedMeal`/`deleteSavedMeal`, DB table exists — but no UI to create or reuse saved meals. |
| **Personal Records** | Type defined, PR detection works in active sessions — but no dedicated PR history view or leaderboard. |
| **Food Items Database** | Type and store exist with `addFoodItem`/`searchFoodItems` — but no UI for managing a personal food database. Items from Open Food Facts search are not saved. |
| **Weight Unit Conversion** | Integrated metric/imperial conversions for body measurements, weight entries, charts, dashboard status widgets, and progress screens. The food parser and nutrition diaries remain metric. |
| **Energy Unit Conversion** | Settings has `energyUnit` — but the UI always shows `kcal`. |
| **Multi-Provider AI** | `AIProvider` type includes groq/openai/gemini/anthropic, factory exists — but only GroqProvider is implemented. Settings UI only shows Groq models. |

### ❌ Not Yet Implemented

| Feature | Notes |
|---------|-------|
| **Nutrition Charts** | No weekly/monthly nutrition trend charts |
| **Workout Analytics** | No volume/frequency/PR trend charts |
| **Body Fat Estimation** | `bodyFatPct` field exists on WeightLog but unused |
| **Barcode Scanner** | `lookupBarcode` API exists but no camera/scanner UI |
| **Notifications/Reminders** | No push notifications or reminder system |
| **Photo Progress** | No progress photo storage or comparison |
| **Dark/Light Theme Toggle** | Settings has `theme` field, only dark theme implemented |
| **Offline Queue** | Mutations during offline are lost if the tab closes before reconnection |

---

## Current Priorities

### 1. Feature Completeness
- **Unit Conversions:** Apply weight (kg/lbs) and energy (kcal/kJ) conversions across all dashboard widgets, diaries, and logs.
- **Saved Meals UI:** Build frontend pages or forms to view, add, and reuse saved meals, fully utilizing the existing stores and database schemas.

### 2. Polish & Quality
- **PWA & Offline Assets Caching:** Add a Vite PWA plugin to cache frontend assets so the application behaves as a true desktop/mobile offline utility.
- **Pruning Chat Logs:** Implement limits on the chat store to restrict historical logs to the most recent ~200 messages, avoiding Zustand localStorage bloat over time.

---

## Current Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend Framework** | React 19 + TypeScript 6 | Single-page application |
| **Build Tool** | Vite 5.4 | With `@vitejs/plugin-react` |
| **Styling** | Tailwind CSS 3.4 + Vanilla CSS | Design tokens in CSS custom properties. Inline styles for most components. |
| **State Management** | Zustand 5 with `persist` middleware | localStorage persistence. 10 separate stores. |
| **Routing** | React Router DOM 7 | 8 routes, all client-side |
| **Charts** | Recharts 3 | Weight trend line chart |
| **Icons** | Lucide React | Consistent icon library |
| **Animations** | Framer Motion (installed) | Mostly unused — CSS animations used instead |
| **Database** | Supabase (PostgreSQL) | Used purely as sync/backup layer. Row Level Security (RLS) is enabled using a custom client-side token header authorization scheme (`x-fitos-auth`). No Supabase Auth. |
| **AI Provider** | Groq (Llama 3.3 70B) | Direct REST API calls (no SDK). OpenAI-compatible endpoint. |
| **Auth** | bcryptjs (client-side) | Master password hashing in the browser |
| **Food Data** | Open Food Facts API | Search and barcode lookup |
| **HTTP** | Native `fetch` | No axios or other HTTP library |
| **Query Cache** | TanStack React Query 5 | Installed but unused in current code |
| **Form Validation** | Zod 4 | Installed but unused in current code |
| **Deployment** | Not configured | No CI/CD, no hosting setup |

---

## Development Rules

### Things Future Models Should Preserve

1. **The local-first architecture.** Data lives in localStorage via Zustand persist. Supabase is a backup layer. Never make Supabase the primary data source.
2. **The AI context system.** The `buildSystemPrompt()` function in `ai.ts` is the heart of the product. Every AI call must receive the full fitness context. Protect and extend this.
3. **The memory approval flow.** AI suggests → user approves → memory persists. Never auto-approve AI memories.
4. **The single-user assumption.** The entire architecture assumes one user. Don't add multi-user features without a complete architectural redesign.
5. **The store-per-domain pattern.** Each domain (profile, goals, weight, food, workout, memory, chat, settings, UI) has its own Zustand store. Keep them separate.
6. **The design token system.** All colors, fonts, radii, shadows are defined as CSS custom properties in `index.css`. Use them consistently.
7. **The dark-mode-first aesthetic.** The design is built for dark backgrounds with the electric lime green accent (`#a3e635`).
8. **TypeScript strictness.** The codebase uses proper types everywhere. Don't introduce `any` types.
9. **The `contextSeed.ts` system.** This seeds Abdullah's personal context. It's idempotent and version-gated. Extend it, don't replace it.
10. **The sync event bridge pattern.** `syncEvents.ts` breaks the circular dependency between stores and sync. Preserve this.

### Things Future Models Should Avoid

1. **Don't introduce a custom hooks directory.** The codebase is intentionally flat. Logic lives in page components and stores. Only extract hooks if a pattern is used 3+ times.
2. **Don't add server-side rendering.** This is a client-only SPA. Don't add Next.js, SSR, or API routes.
3. **Don't replace Zustand with Redux/Context/Jotai.** The store architecture is stable and working. Zustand persist handles localStorage seamlessly.
4. **Don't add Supabase Auth.** Authentication is local master-password. Supabase is data-only.
5. **Don't make AI calls without the fitness context.** Every chat call must pass through `buildSystemPrompt()`.
6. **Don't auto-log AI-parsed food.** Always show confirmation before adding to diary.
7. **Don't add heavy UI frameworks** (Material UI, Chakra, Ant Design). The app has a custom design system.
8. **Don't move styles to CSS modules or styled-components.** The current pattern is inline styles + global CSS classes. It's intentional.
9. **Don't expose API keys in client bundles for production.** The current `.env` approach works for development but needs a proxy for production deployment.

### Product Scope Boundaries

- **In scope:** Nutrition tracking, weight tracking, workout tracking, goal management, AI coaching, body measurements, personal records, data visualization.
- **Out of scope:** Social features, marketplace, trainer-client relationships, payment processing, multi-device real-time sync, native mobile app (for now).
- **Future consideration:** PWA support, data export, multi-provider AI, light theme, workout analytics charts.

### UX Philosophy

1. **Premium dark aesthetic.** Every screen should feel like a high-end fitness dashboard.
2. **Information density.** Show relevant data at a glance — don't hide information behind tabs or menus.
3. **Immediate feedback.** Progress bars, ring charts, PR notifications, and sync indicators provide real-time feedback.
4. **Keyboard-first inputs.** Enter to submit, auto-focus on primary inputs.
5. **Minimal clicks to log.** Logging food, weight, or sets should be as fast as possible.

### AI Behavior Guidelines

1. **The AI is 50% coach + 50% data analyst.** Direct, objective, evidence-based.
2. **Base ALL advice on logged data.** Never give generic guidance.
3. **Use numbers, percentages, and trends in every response.**
4. **If data is insufficient, say so explicitly and ask for it.**
5. **Never modify goals or settings without explicit user confirmation.**
6. **Respect injury history** (right knee) — avoid recommending high-impact exercises carelessly.
7. **Understand Indian diet** — base food suggestions on rice, chapati, chicken, eggs, dal.
8. **Respect the weekly split** — Wednesday is legs/physio/active recovery.
9. **Memory suggestions are proposals, not actions.** The AI suggests; the user decides.
