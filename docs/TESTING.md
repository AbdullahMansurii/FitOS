# Testing & Verification Specification

This document outlines the testing strategy, automated test suites, and manual checklists to guarantee the stability and correctness of FitOS.

---

## 1. Automated Test Suites

FitOS has 8 dedicated mock testing suites under [`scratch/`](file:///d:/FitOS/scratch) to validate core logic engines.

| Test Script | Target System | Core Assertions |
|---|---|---|
| `testDeletionSync.ts` | Tombstones & Sync | Validates deletion queues are tracked, applied to Supabase, and pruned on success. |
| `testSingleOwnerAuth.ts` | Hashing & Login | Validates password encryption, SHA-256 token derivation, pairing, and 409 unique handling. |
| `testBackupRestore.ts` | Import/Export | Verifies full state serialization/deserialization and cloud push behaviors. |
| `testProgressiveOverload.ts`| Overload Engine | Validates readiness, stall flags, fatigue, and progression buckets. |
| `testRecomposition.ts` | Physique Engine | Validates 30-day physique state classifications and dynamic unit scaling. |
| `testNutrition.ts` | Calories Engine | Validates adaptive macro target updates and macronutrient compliance stats. |
| `testStabilization.ts` | Dates & Times | Validates timezone conversions and ISO date indexing. |
| `testSurfacing.ts` | UI Layering | Validates memoized overlay maps and training statuses. |

### Running the Checks
To run the static TypeScript verification and lint checks:
```bash
# 1. Check TypeScript compilation
npx tsc --noEmit

# 2. Check Code Style and Quality
npm run lint
```

---

## 2. Manual Verification Checklist

Follow these steps when verifying the application in staging or local environments:

### Initial Device Pairing
1. Open the app on a cleared browser/device.
2. Enter the password `"Sumaiyya"` on the lock screen.
3. Verify that the app transitions to "Pairing..." and successfully redirects to the dashboard.
4. Verify the console logs: `Profile found in SELECT, pairing device...`.

### Synchronization Check
1. Add a weight log on the dashboard.
2. Go to **Settings** → **Backup & Sync** → verify the sync indicator displays `success`.
3. Check the Supabase console `weight_logs` table and confirm the record exists.
4. Delete the weight log in the app.
5. Wait 5 seconds for the push to trigger.
6. Verify the record is deleted from the Supabase `weight_logs` table.

### Backup Import/Export
1. Click **Download JSON Backup** in settings.
2. Verify a `.json` file containing all Zustand stores is downloaded.
3. Reset local storage: `localStorage.clear()`.
4. Refresh the page (prompts lock screen).
5. Unlock the app, go to Settings → click **Restore JSON Backup** and choose the downloaded file.
6. Verify the dashboard and logs are immediately restored and synced back to Supabase.
