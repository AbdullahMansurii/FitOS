# Architectural Decisions Document (ADR)

This document details the critical design decisions made during the development of FitOS, the rationale behind them, major trade-offs, and alternatives considered.

---

## 1. Single-Owner Architecture

### Decision
FitOS is designed strictly as a single-owner, multi-device application. There is a single master profile and data ownership record within the database, which is shared and synchronized across the owner's devices.

### Rationale
* **Goal**: FitOS is designed as a highly personal, hyper-tailored operating system for a single individual (Abdullah Mansuri). It does not require multi-tenant SaaS features like user sign-ups, teams, public profiles, or cross-tenant collaboration.
* **Simplification**: Eliminates the overhead of managing user access control lists, tenant isolation logic, subscription tiers, and multi-tenant security auditing.

### Alternatives Considered
* **Multi-Tenant SaaS Model**: Allowing any user to sign up and host their own profiles in a shared DB.
  * *Rejection reason*: Unnecessary architectural complexity. Introducing multi-tenancy increases database querying overhead, complicates Row-Level Security (RLS), and introduces vector surfaces for data leakage between users.

---

## 2. No Supabase Auth (Custom Header Authentication)

### Decision
Supabase's built-in authentication system (GoTrue/JWT) is bypassed. Instead, FitOS uses a custom header validation scheme (`x-fitos-auth`) against the `sync_token` field in the database.

### Rationale
* **UX & Frictionless Access**: The client doesn't need to perform OAuth round-trips, handle token refreshes, manage sessions, or redirect the user to verification screens. The app functions as a fast local-first tool.
* **Simplified Access Model**: Since there is only one user (the owner), authenticating via a static, secure, cryptographically derived token passed in a custom header is sufficient.

### Trade-offs
* **Security Scope**: If the anon key and the sync token are both compromised, the attacker has read/write access to the database tables. This is mitigated by restricting database permissions via Row-Level Security to only check the sync token and preventing arbitrary profile creations.

---

## 3. Client-Side Cryptographic Token Derivation (SHA-256)

### Decision
The `syncToken` used for Supabase queries is derived client-side from the user's master password using a one-way SHA-256 hash function with a static salt:
$$\text{syncToken} = \text{SHA-256}(\text{password} + \text{salt})$$

### Rationale
* **Zero-Knowledge Token Delivery**: The master password itself is never stored in the database or sent over the network.
* **No Synchronization of Shared Secrets**: A new device is paired simply by entering the master password. The device derives the SHA-256 token, queries the database for a profile where `sync_token` matches, and if found, downloads the profile to pair.
* **Prevention of Lockout**: By deriving the token deterministically from the password, the user cannot lose access to sync as long as they remember their master password.

### Alternatives Considered
* **Random UUID Sync Token**: Generating a random UUID upon first setup.
  * *Rejection reason*: Requires the user to manually copy-paste a long, random UUID string to pair new devices, creating a high-friction user experience. If local storage was cleared on the primary device, recovery was difficult.

---

## 4. Local-First Storage (Zustand + LocalStorage)

### Decision
Zustand stores serve as the single source of truth for the application state. They are persisted to the browser's `localStorage` via the Zustand `persist` middleware. Supabase functions strictly as an asynchronous backup/restore layer.

### Rationale
* **Instant UI Responsiveness**: All reads and writes happen instantly in memory and local storage, guaranteeing 60 FPS interfaces.
* **Offline Functionality**: The app remains fully functional in airplanes, gyms, or areas with poor cellular reception.
* **Robustness**: Network failures, database timeouts, or rate limits do not block the user from tracking their workouts or logging meals.

---

## 5. Row-Level Security (RLS) & Security Gate Trigger

### Decision
Row-Level Security (RLS) is enabled on all tables in Supabase. Access is locked down so that any query must supply an `x-fitos-auth` header that matches the profile's `sync_token`. A `SECURITY DEFINER` trigger validates profile updates.

### Rationale
* **Granular Control**: Every table verifies that `get_auth_token() = (select sync_token from profiles limit 1)`.
* **Immutability of Key Structures**: The database trigger `verify_profile_update` enforces that the single master profile `id` and `is_master` flags are immutable once created. It also enforces that the `sync_token` must strictly match a 64-character SHA-256 hex string, preventing arbitrary values from locking out the database.

---

## 6. Deletion Tombstone Tracking

### Decision
When an entity (food log, goal, workout template, etc.) is deleted, its ID is appended to a local `deleted<Entity>Ids` tombstone array in local storage instead of just being deleted from the client.

### Rationale
* **Preventing Data Resurrection**: Since the pull cycle fetches all data from Supabase and merges/replaces local state, a deleted client record would normally be fetched again from Supabase and restored ("resurrected").
* **Sync Synchronization**: Appending IDs to tombstones tells the sync engine to issue a `DELETE` query to Supabase. Once the deletion query succeeds, the ID is pruned from the local tombstone array.

---

## 7. JSON Backup and DB Snapshotting

### Decision
FitOS integrates explicit JSON export/import of Zustand state and raw database snapshot downloads inside the Settings panel.

### Rationale
* **Sovereignty over Data**: The owner is never locked into the cloud provider (Supabase).
* **Easy Migration/Reset**: Allows downloading the entire local state as a single JSON file and restoring it onto any browser tab in one click.
* **Corrupt State Recovery**: If the cloud database becomes corrupted, the user can restore a local JSON backup, which automatically updates Supabase.
