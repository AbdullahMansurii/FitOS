# FitOS — Decisions Log

This document records the architectural, design, and engineering decisions made during the development of FitOS.

---

## 2026-06-21 — Workout Builder & Overload Engine Phasing

### Context
FitOS is expanding to allow custom workouts (routines) and data-driven progression calculations to guide user workouts. This requires database changes, new state store actions, and mathematical logic.

### Decisions

1. **Phased Implementation**:
   - **Phase 1 (Current)**: Custom Workout Builder, template editing/duplication/deletion, and custom exercise library management.
   - **Phase 2**: Progressive Overload Engine, tracking last performance, best performance, and 30-day trends.
   - **Phase 3**: Workout Analytics and charts.
   - **Phase 4**: AI Coach integration.
   - *Rationale*: Allows validation of routine storage and sync capability before laying progressive overload algorithms on top.

2. **Global Exercise History for Progression**:
   - Suggestions and trend calculations will look at the global history of a given exercise ID across all sessions, rather than isolating it per-template.
   - *Rationale*: Strength adaptation is global; a user's bench press strength doesn't reset when performing it in a different routine split.

3. **Global Weight Increment Settings**:
   - Weight increments default to global configurations in `AppSettings` (2.5kg / 5lbs).
   - *Rationale*: Minimizes configuration complexity for the user.

4. **Deferred Warmup Suggestions**:
   - Do not generate warmup sets in Version 1. Only suggest progression metrics for working sets.
   - *Rationale*: Keeps the initial logging interface clean and focused.

5. **Local-First Deterministic Progression Engine**:
   - Overload math must be calculated locally on the client rather than by the AI Coach. The AI Coach can read these math targets but cannot dictate or hallucinate them.
   - *Rationale*: Ensures consistency, offline function, and eliminates AI hallucinations.

6. **Seed Merging Strategy**:
   - When pulling data from Supabase, pulled templates and exercises are merged with local in-memory seeds (SEEDED_TEMPLATES and SEEDED_EXERCISES).
   - *Rationale*: Guarantees default options are never lost on sync pull, while prioritizing user edits and custom additions.
