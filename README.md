# FitOS: Fitness Operating System

FitOS is a local-first, single-owner fitness management system designed to track training progression, nutrition diaries, body compositions, and long-term AI-assisted coaching notes. It features bidirectional synchronization to Supabase and is fully operational offline.

---

## Key Features

* **Workout Planner & Logger**: Track exercises, sets, reps, load, and RPE. Features a deterministic **Progressive Overload Engine** that suggests load and rep adjustments for compound/isolation exercises based on training consistency and fatigue.
* **Nutrition Diary**: A food logging panel supporting natural language query parsing via Groq AI (e.g. *"6 egg whites, 2 slices wheat bread"*) and barcode/macro lookup.
* **Physique & Recomposition Analysis**: Consumes body circumferences (chest, waist, limbs) and weight to determine 30-day composition status (cutting, bulking, recomping) filtering out day-to-day fluctuations.
* **AI Coach Conversation**: An intelligent assistant populated with your training logs, current physique stats, goals, and customized coaching preferences.
* **Local-First & Multi-Device Sync**: All inputs run instantaneously on local storage. Multi-device pairing is verified cryptographically by deriving a static-salted SHA-256 token client-side from the master password.

---

## Technology Stack

* **Frontend**: React (v19) + TypeScript + Vite.
* **Styling**: Vanilla CSS custom properties (defined in [`src/index.css`](file:///d:/FitOS/src/index.css)) + Framer Motion animations.
* **State Management**: 9 Zustand stores persisted locally to `localStorage` (session locked via bcrypt password hashes).
* **Database**: Supabase PostgreSQL (12 tables with custom Row-Level Security policy matching the derived token).
* **AI Provider**: Groq API (SDK integration with system prompt construction).

---

## Directory Layout

```
d:\FitOS\
├── docs/                         # Detailed system documentation
│   ├── ARCHITECTURE_DECISIONS.md # Engineering decisions and ADRs
│   ├── AUTHENTICATION.md         # Lock screen, token derivation and pairing
│   ├── DATABASE.md             # PostgreSQL tables, triggers, and RLS
│   ├── DEPLOYMENT.md             # Setup guide, env variables and Vercel
│   ├── SYNC_ENGINE.md            # Pull/Push sync schedules and tombstones
│   ├── TESTING.md                # Automated test suites and checklists
│   └── TROUBLESHOOTING.md        # Debugging guide and knowledge base
├── src/
│   ├── App.tsx                   # Routing, AuthGate, and SyncInit
│   ├── main.tsx                  # App entry point
│   ├── components/               # Shared components (MacroRing, Modals)
│   ├── store/                    # Zustand state (index.ts, authStore.ts)
│   ├── lib/                      # Core logic (sync, progressive overload)
│   └── pages/                    # UI pages (Dashboard, Food, Workout, Settings)
├── supabase/
│   └── schema.sql                # Complete PostgreSQL SQL editor code
└── scratch/                      # Mock unit test suites
```

---

## Local Development & Setup

### 1. Prerequisites
Ensure you have **Node.js (v18+)** installed.

### 2. Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/AbdullahMansurii/FitOS.git
   cd FitOS
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` variables:
   ```ini
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_public_anon_key
   VITE_GROQ_API_KEY=your_groq_api_key
   ```
4. Run the local development server:
   ```bash
   npm run dev
   ```

For detailed guides on database configuration, RLS setup, and production deployment, refer to **[docs/DEPLOYMENT.md](file:///d:/FitOS/docs/DEPLOYMENT.md)**.
