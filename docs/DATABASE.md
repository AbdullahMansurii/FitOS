# Database Schema & Security Specification

This document details the PostgreSQL database schema deployed on Supabase for FitOS, including table structures, constraints, triggers, and Row-Level Security (RLS) policies.

---

## 1. Entity Relationship Overview

The database uses client-side generated UUID strings (`text`) for primary keys to enable offline-first record creation. 

```mermaid
erDiagram
    profiles ||--o{ goals : "syncs-by-token"
    profiles ||--o{ weight_logs : "syncs-by-token"
    profiles ||--o{ measurements : "syncs-by-token"
    profiles ||--o{ food_logs : "syncs-by-token"
    profiles ||--o{ workout_sessions : "syncs-by-token"
    profiles ||--o{ workout_templates : "syncs-by-token"
    profiles ||--o{ exercises : "syncs-by-token"
    profiles ||--o{ memories : "syncs-by-token"

    profiles {
        text id PK
        text display_name
        numeric height_cm
        text weight_unit
        text energy_unit
        text date_of_birth
        text gender
        text sync_token
        boolean is_master UNIQUE
    }
```

*Note: For maximum offline flexibility and split-second synchronization, hard foreign key constraints are not enforced on syncable data tables, preventing partial sync operations from crashing due to constraint violations.*

---

## 2. Table Specifications

### profiles
Stores the master profile settings and cryptographic sync token.
* `id` (`text`): Primary Key.
* `display_name` (`text`): User's name.
* `height_cm` (`numeric`): User's height in centimeters.
* `weight_unit` (`text`): `kg` or `lbs` (default `kg`).
* `energy_unit` (`text`): `kcal` or `kJ` (default `kcal`).
* `date_of_birth` (`text`): ISO YYYY-MM-DD.
* `gender` (`text`): `male`, `female`, or `other`.
* `sync_token` (`text`): Derived SHA-256 token used for authentication.
* `is_master` (`boolean`): Enforced `DEFAULT true CHECK (is_master = true) UNIQUE`. Ensures at most 1 profile row can ever exist in the table.

### goals
Tracks target physique phases.
* `id` (`text`): Primary Key.
* `name` (`text`): Goal title.
* `type` (`text`): `cut`, `bulk`, or `maintain`.
* `status` (`text`): `active`, `completed`, `paused`, or `abandoned`.
* `start_date` / `target_date` (`text`): YYYY-MM-DD.
* `start_weight` / `target_weight` (`numeric`): Targets in local units.
* `calorie_target` / `protein_target` (`integer`): Nutrition targets.

### weight_logs
Daily bodyweight entries.
* `id` (`text`): Primary Key.
* `date` (`text`): YYYY-MM-DD (Unique Index).
* `weight_kg` (`numeric`): Weight in kilograms.
* `notes` (`text`): Optional daily journal text.

### food_logs
Nutrition tracking diary.
* `id` (`text`): Primary Key.
* `date` (`text`): YYYY-MM-DD.
* `meal_type` (`text`): `breakfast`, `lunch`, `dinner`, or `snack`.
* `name` (`text`): Food item name.
* `quantity_g` / `calories` / `protein` / `carbs` / `fat` (`numeric`): Macros.

### workout_sessions
Completed training sessions.
* `id` (`text`): Primary key.
* `template_id` (`text`): Reference to workout template.
* `name` (`text`): Session name.
* `date` (`text`): YYYY-MM-DD.
* `exercises` (`jsonb`): Nested exercises and sets array (avoids heavy junction tables).

---

## 3. Row-Level Security (RLS) Policies

Row-Level Security is enabled on all 12 database tables.

### The Auth Token Extraction Function
```sql
CREATE OR REPLACE FUNCTION public.get_auth_token()
RETURNS text LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN current_setting('request.headers', true)::json->>'x-fitos-auth';
EXCEPTION
  WHEN others THEN RETURN null;
END;
$$;
```

### Table-Specific RLS Policies

#### 1. `profiles` Policies
* **`profile_insert_policy`** (`FOR INSERT`):
  ```sql
  WITH CHECK (
    ((SELECT COUNT(*) FROM profiles) = 0)
    OR
    (get_auth_token() = (SELECT sync_token FROM profiles LIMIT 1))
  );
  ```
  * *Rationale*: Allows initial setup if the table is empty. If the database is already paired, it only allows inserts/upserts if the caller supplies the correct current master `sync_token`.
* **`profile_select_access`** (`FOR SELECT`):
  ```sql
  USING (get_auth_token() = sync_token);
  ```
  * *Rationale*: Prevents reading the profile unless the request contains the matching derived sync token.
* **`profile_update_access`** (`FOR UPDATE`):
  ```sql
  USING (get_auth_token() = sync_token) WITH CHECK (true);
  ```
  * *Rationale*: Permits the owner to edit the profile, subject to trigger validation.

#### 2. Other Data Tables Policies (e.g., `goals`, `weight_logs`, `food_logs`, etc.)
* **`<table_name>_token_access`** (`FOR ALL`):
  ```sql
  USING (get_auth_token() = (SELECT sync_token FROM profiles LIMIT 1));
  ```
  * *Rationale*: Restricts all CRUD operations to only go through if the request's `x-fitos-auth` header matches the single registered `sync_token` in the `profiles` table.

---

## 4. Database Triggers & Security Definer Gates

### Immutability Security Gate: `verify_profile_update`
A `BEFORE UPDATE` trigger runs on the `profiles` table to prevent lockouts, data poisoning, and unauthorized token manipulation:

```sql
CREATE OR REPLACE FUNCTION verify_profile_update()
RETURNS trigger SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
  -- A. Ensure the update caller possesses the current valid database token
  IF get_auth_token() IS DISTINCT FROM OLD.sync_token THEN
    RAISE EXCEPTION 'Unauthorized: Invalid authentication credentials';
  END IF;

  -- B. Prevent modifications to the profile ID
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Unauthorized: Profile ID cannot be modified';
  END IF;

  -- C. Prevent modifying the master flag to anything other than true
  IF NEW.is_master IS NOT TRUE THEN
    RAISE EXCEPTION 'Unauthorized: Master flag cannot be modified';
  END IF;

  -- D. Enforce that any token update must be a valid 64-character SHA-256 hex string
  IF NEW.sync_token IS DISTINCT FROM OLD.sync_token THEN
    IF NEW.sync_token IS NULL OR NEW.sync_token !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'Invalid sync token format: Must be a 64-character SHA-256 hex string';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

* **Why it uses `SECURITY DEFINER`**: Runs with database owner privileges. It can bypass the normal RLS update constraint to safely compare the caller's token header against the *old* database value, preventing unauthorized overwrites.
