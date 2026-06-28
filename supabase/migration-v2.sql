-- ============================================================
-- FitOS v2.0 Migration Script
-- ============================================================
-- Safe to re-run (idempotent). All new columns have defaults.
-- Run this in Supabase Dashboard → SQL Editor BEFORE deployment.
-- ============================================================

-- ─── 1. Goals: Add fields for auto-calculation ──────────────────
ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_mode text DEFAULT 'fat_loss';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS activity_level text DEFAULT 'moderately_active';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS carb_target integer;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS fat_target integer;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS tdee_estimate integer;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deficit_surplus integer DEFAULT 0;

-- ─── 2. Food Logs: Add protein quality and source tracking ─────
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS protein_quality_score numeric;
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS protein_quality_method text DEFAULT 'none';
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS nutrition_source text DEFAULT 'manual';
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS saved_meal_version integer;

-- ─── 3. Food Items: Add protein quality ─────────────────────────
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS protein_quality_score numeric;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS protein_quality_method text DEFAULT 'none';

-- ─── 4. Saved Meals: Add versioning, category, usage tracking ──
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS category text DEFAULT 'custom';
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS total_fiber numeric DEFAULT 0;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS protein_quality_score numeric;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS protein_quality_method text DEFAULT 'none';
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS last_used_at timestamptz;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS parent_meal_id text;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- ─── 5. Recovery Logs (NEW TABLE) ───────────────────────────────
CREATE TABLE IF NOT EXISTS recovery_logs (
  id             text PRIMARY KEY,
  date           text NOT NULL,
  daily_steps    integer,
  sleep_hours    numeric,
  mood           integer CHECK (mood >= 1 AND mood <= 5),
  energy         integer CHECK (energy >= 1 AND energy <= 5),
  muscle_soreness integer CHECK (muscle_soreness >= 1 AND muscle_soreness <= 5),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS recovery_logs_date_idx ON recovery_logs (date DESC);

-- RLS for recovery_logs
ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recovery_logs' AND policyname = 'recovery_logs_token_access'
  ) THEN
    CREATE POLICY "recovery_logs_token_access" ON recovery_logs
      FOR ALL USING (get_auth_token() = (SELECT sync_token FROM profiles LIMIT 1));
  END IF;
END $$;

-- ─── 6. Progress Photos (NEW TABLE) ────────────────────────────
CREATE TABLE IF NOT EXISTS progress_photos (
  id             text PRIMARY KEY,
  date           text NOT NULL,
  photo_type     text NOT NULL CHECK (photo_type IN ('front', 'left', 'right', 'back')),
  photo_data     text NOT NULL,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS progress_photos_date_idx ON progress_photos (date DESC);

-- RLS for progress_photos
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progress_photos' AND policyname = 'progress_photos_token_access'
  ) THEN
    CREATE POLICY "progress_photos_token_access" ON progress_photos
      FOR ALL USING (get_auth_token() = (SELECT sync_token FROM profiles LIMIT 1));
  END IF;
END $$;

-- ─── 7. Sync Metadata: Track new tables ─────────────────────────
INSERT INTO sync_metadata (entity_type, last_synced_at)
VALUES ('recovery_logs', now())
ON CONFLICT (entity_type) DO NOTHING;

INSERT INTO sync_metadata (entity_type, last_synced_at)
VALUES ('progress_photos', now())
ON CONFLICT (entity_type) DO NOTHING;

-- ─── Done! ──────────────────────────────────────────────────────
SELECT 'FitOS v2.0 migration complete' AS result;
