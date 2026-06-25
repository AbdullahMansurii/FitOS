# Troubleshooting & Knowledge Base

This document catalogues the primary bugs, errors, and database RLS conflicts encountered during the development of FitOS, along with their symptoms, root causes, resolutions, and preventions.

---

## Debugging Methodology

When diagnosing authentication or sync failures:
1. **Open browser DevTools** (F12) → **Console** and **Network** tabs.
2. Filter the Network tab for `/rest/v1/profiles` requests.
3. Inspect the outgoing request headers to verify if `X-Fitos-Auth` exists and contains a 64-character SHA-256 string.
4. Inspect the HTTP status response:
   * **401 Unauthorized**: Typically indicates RLS policy violation or incorrect token value/method.
   * **409 Conflict**: Indicates a unique constraint database violation (e.g. trying to write duplicate records).
   * **200 OK with empty array `[]`**: Indicates search parameters or select policies hid the row because the token was empty or mismatched.

---

## Troubleshooting Entries

### 1. Browser Headers.set() Omission

* **Symptoms**: The pairing lock screen accepts the correct master password but fails with a `409 Conflict` database error, logging `unique constraint violated on profiles_is_master_key`.
* **Root Cause**: In Supabase JS client v2, `supabase.rest.headers` is an instance of the native browser `Headers` class. Writing `supabase.rest.headers['x-fitos-auth'] = token` merely attached a custom JavaScript field on the wrapper object. The underlying Fetch API ignored it and sent the HTTP query with a blank header. RLS evaluated this as an unauthenticated request, returned an empty profile list `[]`, and the client incorrectly tried to run a fresh profile `INSERT`.
* **Resolution**: Refactored [`src/lib/supabase.ts`](file:///d:/FitOS/src/lib/supabase.ts) to verify if the headers object exposes `.set()` and invoke it:
  ```typescript
  if (typeof headers.set === 'function') {
    headers.set('x-fitos-auth', token);
  } else {
    headers['x-fitos-auth'] = token;
  }
  ```
* **Prevention**: Always verify standard browser Web API class signatures when dynamically editing configurations on client libraries.

---

### 2. RLS Insert Policy Conflict (401 Profile Upsert Failure)

* **Symptoms**: Sync fails immediately after pairing/unlocking, console logs `[FitOS Sync] pushAll failed: new row violates row-level security policy for table "profiles"`. The Network tab shows a failed `POST /profiles?on_conflict=id` request returning `401 Unauthorized`.
* **Root Cause**: The RLS policy for insert on profiles was `profile_insert_empty` (`FOR INSERT WITH CHECK ((SELECT COUNT(*) FROM profiles) = 0)`). PostgreSQL evaluates `INSERT` policies for the proposed row of an `UPSERT` first. Because a profile already existed, the row count was `1`, which evaluated the insert check to `FALSE` and threw an RLS violation before evaluating the conflict resolution.
* **Resolution**: Replaced the insert policy in Supabase with `profile_insert_policy`:
  ```sql
  CREATE POLICY "profile_insert_policy" ON profiles
    FOR INSERT WITH CHECK (
      ((SELECT COUNT(*) FROM profiles) = 0)
      OR
      (get_auth_token() = (SELECT sync_token FROM profiles LIMIT 1))
    );
  ```
  This permits inserting/upserting if the table is empty OR if the caller matches the existing sync token.
* **Prevention**: When writing RLS policies on tables that utilize `UPSERT` operations, make sure the `INSERT` policy grants access to authenticated updates if a conflict occurs.

---

### 3. Sync Resurrection Bug

* **Symptoms**: Food items, weight logs, or workouts that were deleted by the user reappear in the diaries on the next page reload or manual sync.
* **Root Cause**: The client-side delete operation cleared the record from local state, but on sync, `pullAll()` fetched all entries from Supabase (which still contained the deleted record because the deletion had not been pushed) and merged it back into the local state.
* **Resolution**: Implemented deletion tombstone arrays (`deletedGoalIds`, `deletedFoodLogIds`, etc.) in the Zustand stores. When a record is deleted, its ID is written to the tombstones. During pull sync, the client filters out any pulled record whose ID exists in the tombstone list. During push sync, the tombstones are deleted from Supabase first, then pruned from the client on success.
* **Prevention**: Always use tombstone records or synchronization markers to denote deleted entities in local-first database sync configurations.

---

### 4. LocalStorage Origin Separation

* **Symptoms**: Logging into `http://localhost:5173` successfully syncs data, but accessing the production app on `https://fit-os-psi.vercel.app` prompts the user with the lock screen as if they are a new user.
* **Root Cause**: Browsers isolate local storage domains by origin (protocol + host + port). Local storage data from one site cannot be accessed by another.
* **Resolution**: Use the pairing mechanism to synchronize the device. Entering the same master password on the production Vercel URL computes the SHA-256 token, fetches Abdullah's profile, and imports the full cloud state into the new origin's local storage automatically.
* **Prevention**: Document that multi-device local-first configurations require explicit cloud sync/pairing endpoints to bridge storage states.
