# Progressive Overload Engine Report

The Progressive Overload Engine is a deterministic, strength-coach-like recommendation system designed to analyze exercise history, current goals, and muscle/equipment metadata to produce actionable training recommendations. It executes fully local-first on demand and requires no database migrations.

---

## 1. Engine Architecture & Mathematical Foundations

Every recommendation is calculated on demand using historical workout sessions, exercise metadata, and output from the **Exercise Intelligence Layer**.

### e1RM Formula (Epley)
$$\text{e1RM} = \text{weight} \times \left(1 + \frac{\text{reps}}{30}\right)$$
Used as the basis for tracking peak strength. Peak session e1RM is calculated as the maximum e1RM across all non-warmup sets.

### Weekly Frequency
$$\text{weeklyFrequency} = \frac{\text{completed sessions containing exercise in last 28 days}}{4}$$
Used to adjust progression confidence and modify the readiness score.

### Confidence System
The confidence in progression recommendations is categorized as:
*   **High**: History length $\ge 5$ sessions AND days since last session $< 14$ AND weekly frequency $\ge 1.0$/week.
*   **Low**: History length $\le 2$ sessions OR days since last session $\ge 21$ OR weekly frequency $< 0.5$/week.
*   **Medium**: Default for all other scenarios.

---

## 2. Readiness Score Calculation Matrix

The readiness score is a `0–100` indicator representing the user's suitability to progress in the upcoming session. It starts at a baseline of **75** and is modified by:

| Category | Condition | Modifier |
| :--- | :--- | :---: |
| **e1RM Trend** | 30d trend $> 5\%$ or 30d trend $> 0\%$ | `+15` / `+10` |
| | 30d trend $< -5\%$ or 30d trend $< 0\%$ | `-15` / `-10` |
| | 2-session fallback: last peak e1RM $>$ / $<$ previous peak e1RM | `+5` / `-5` |
| **Volume Trend** | 30d trend $> 10\%$ or 30d trend $> 0\%$ (without stall) | `+15` / `+10` |
| | 30d trend $< -10\%$ or 30d trend $< 0\%$ | `-15` / `-10` |
| | 2-session fallback: last volume $>$ / $<$ previous volume (without stall) | `+5` / `-5` |
| **Recent PR** | PR achieved in the last session | `+10` |
| | PR achieved in the session before last | `+5` |
| **Recovery Gap** | days since last session $\ge 21$ / $\ge 14$ / $\ge 7$ | `-15` / `-10` / `-5` |
| **Weekly Frequency** | weekly frequency $< 0.75$/week | `-10` |
| | weekly frequency between $1.25$ and $2.5$/week | `+5` |
| **Consistency** | history length $\ge 5$ / $\ge 3$ (only if trained in last 21 days) | `+10` / `+5` |
| **Negative Flags** | Stall detected (consecutive stagnation) | `-30` |
| | Fatigue warning active | `-30` |

---

## 3. Progression Buckets & Increments

Increments are tailored to muscle group and equipment classifications:

1.  **Heavy Compound Lower (+5kg)**: Barbell, Machine, or Smith compound movements for glutes, hamstrings, quads, calves, legs, or thighs.
    *   *Examples*: Squat, Front Squat, Deadlift, RDL, Hack Squat, Leg Press.
2.  **Heavy Compound Upper (+2.5kg)**: Barbell, Smith, Cable, or other compound movements for upper body.
    *   *Examples*: Bench Press, Incline Bench Press, Overhead Press, Barbell Row, Weighted Pull-Up.
3.  **Dumbbell Compound (+2kg total / +1kg per dumbbell)**: Compound movements using dumbbells.
    *   *Examples*: Incline Dumbbell Press, Dumbbell Shoulder Press, Dumbbell Row.
4.  **Isolation Exercises (+1kg or smallest increment)**: Isolation movements using dumbbells, cables, or machines.
    *   *Examples*: Lateral Raise, Bicep Curl, Tricep Pushdown, Rear Delt Fly.

---

## 4. Rule-Based Progression Logic

Progression recommendations are evaluated in a strict priority order to prevent conflicting advice:

### Priority 1: Fatigue Warning
*   **Trigger**: Peak e1RM **and** total volume both declining strictly for 3 consecutive sessions.
*   **Action**: Recommend `maintain`. Keep weight and reps equal to the last session's max. Override all deload or weight progression rules. Focus on recovery and nutrition.

### Priority 2: Deload Recommendation
*   **Trigger**: Stall detected (peak e1RM stagnant or decreasing for 3 consecutive sessions) while volume is stable or improving.
*   **Constraint**: Cannot exceed 10% load reduction. Cannot recommend consecutive deloads without a newer completed session.
*   **Action**: Recommend `deload`. Reduce last max weight by 10% (rounded to nearest increment). Reset target reps to lower limit.

### Priority 3: Increase Weight
*   **Trigger**:
    *   *Strength*: All target sets completed at or above the target reps limit, and strength (peak e1RM) improved or remained stable.
    *   *Hypertrophy*: At least **80%** of completed sets reach the rep target minus 1 (i.e. $\ge \text{upperRepLimit} - 1$).
*   **Action**: Increment weight based on the progression bucket. Reset reps target to the lower rep limit.

### Priority 4: Increase Reps
*   **Trigger**: Target rep limit not reached yet, but user is not stalled.
*   **Action**: Maintain weight. Increment rep target by 1 rep (bounded by upper limit).

### Priority 5: Maintain
*   **Trigger**: Maintenance goal is active, or user is consolidating after a recent weight increase or minor performance drop.
*   **Action**: Maintain current load and reps.

---

## 5. Standalone Verification Suite Outcomes

A suite of 10 test scenarios (containing 36 assertions) was run using the TSX compiler to validate progression math:

*   **Case 1 (No History)**: Returns `insufficient_data` with `low` confidence. (Pass)
*   **Case 2 (Strength Weight Progression)**: Bench Press progresses from 82.5kg to 85.0kg (+2.5kg) with `high` confidence and readiness score 100. (Pass)
*   **Case 3 (Lower Body Compound Progression)**: Squat progresses from 100kg to 105kg (+5kg) with `low` confidence due to short history. (Pass)
*   **Case 4 (Hypertrophy Threshold Pass)**: Bicep Curl progresses weight from 60kg to 62.5kg (+2.5kg compound upper) and resets rep target to 8 because >80% sets met threshold (reps $\ge 11$). (Pass)
*   **Case 5 (Hypertrophy Threshold Fail)**: 75% of sets met threshold. Maintained weight at 60kg and increased reps target to 12. (Pass)
*   **Case 6 (Fatigue Warning)**: strictly declining strength and volume for 3 sessions overrides deload and recommends `maintain` at 95kg. (Pass)
*   **Case 7 (Stall Deload)**: Stagnant strength but improving volume triggers a 10% deload from 100kg to 90kg with a readiness penalty (-30). (Pass)
*   **Case 8 (Bodyweight Movement)**: Pull-ups target reached. Kept weight at 0kg and progressed reps to 11. (Pass)
*   **Case 9 (Large Recovery Gap)**: 29 days gap forces `low` confidence, weekly frequency of 0, and readiness score of 50. (Pass)
*   **Case 10 (Maintenance Mode)**: Keeps load and reps identical. (Pass)

All **36 of 36 assertions passed successfully**.
