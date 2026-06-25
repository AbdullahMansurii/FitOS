-- ============================================================
-- FitOS Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id            text primary key,
  display_name  text not null,
  height_cm     numeric,
  weight_unit   text not null default 'kg',
  energy_unit   text not null default 'kcal',
  date_of_birth text,
  gender        text,
  avatar_url    text,
  sync_token    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Goals ───────────────────────────────────────────────────
create table if not exists goals (
  id              text primary key,
  name            text not null,
  type            text not null check (type in ('cut','bulk','maintain')),
  status          text not null default 'active' check (status in ('active','completed','paused','abandoned')),
  start_date      text not null,
  target_date     text,
  start_weight    numeric,
  target_weight   numeric,
  calorie_target  integer,
  protein_target  integer,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Weight Logs ─────────────────────────────────────────────
create table if not exists weight_logs (
  id          text primary key,
  date        text not null unique,
  weight_kg   numeric not null check (weight_kg > 0 and weight_kg < 500),
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists weight_logs_date_idx on weight_logs (date desc);

-- ─── Food Items (personal food database) ─────────────────────
create table if not exists food_items (
  id                 text primary key,
  name               text not null,
  brand              text,
  calories_per_100g  numeric not null default 0,
  protein_per_100g   numeric not null default 0,
  carbs_per_100g     numeric not null default 0,
  fat_per_100g       numeric not null default 0,
  fiber_per_100g     numeric not null default 0,
  barcode            text,
  source             text not null default 'manual' check (source in ('manual','openfoodfacts','usda')),
  created_at         timestamptz not null default now()
);

-- ─── Food Logs ───────────────────────────────────────────────
create table if not exists food_logs (
  id            text primary key,
  date          text not null,
  meal_type     text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name          text not null,
  quantity_g    numeric not null default 100,
  calories      numeric not null default 0,
  protein       numeric not null default 0,
  carbs         numeric not null default 0,
  fat           numeric not null default 0,
  fiber         numeric not null default 0,
  food_item_id  text references food_items(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists food_logs_date_idx on food_logs (date desc);

-- ─── Saved Meals (meal templates) ────────────────────────────
create table if not exists saved_meals (
  id              text primary key,
  name            text not null,
  items           jsonb not null default '[]',
  total_calories  numeric default 0,
  total_protein   numeric default 0,
  total_carbs     numeric default 0,
  total_fat       numeric default 0,
  created_at      timestamptz not null default now()
);

-- ─── Exercises ───────────────────────────────────────────────
create table if not exists exercises (
  id            text primary key,
  name          text not null,
  muscle_groups text[] not null default '{}',
  equipment     text,
  category      text,
  description   text,
  is_custom     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Workout Templates ───────────────────────────────────────
create table if not exists workout_templates (
  id          text primary key,
  name        text not null,
  description text,
  split_type  text,
  -- exercises stored as JSON array of { exerciseId, exercise{}, orderIndex, targetSets, targetReps, targetRpe }
  exercises   jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Workout Sessions ─────────────────────────────────────────
create table if not exists workout_sessions (
  id               text primary key,
  template_id      text references workout_templates(id) on delete set null,
  name             text not null,
  date             text not null,
  started_at       timestamptz,
  completed_at     timestamptz,
  duration_seconds integer,
  -- exercises stored as JSON: [{ id, exerciseId, exercise{}, orderIndex, sets: [{ id, setNumber, weightKg, reps, ... }] }]
  exercises        jsonb not null default '[]',
  total_volume     numeric,
  notes            text,
  rating           integer check (rating >= 1 and rating <= 5),
  created_at       timestamptz not null default now()
);

create index if not exists workout_sessions_date_idx on workout_sessions (date desc);

-- ─── Memories (AI Coach long-term memory) ────────────────────
create table if not exists memories (
  id               text primary key,
  category         text not null check (category in ('preference','insight','goal_context','behavioral')),
  title            text not null,
  content          text not null,
  source           text not null default 'ai' check (source in ('ai','manual')),
  confidence_score numeric not null default 0.8 check (confidence_score >= 0 and confidence_score <= 1),
  tags             text[] not null default '{}',
  is_approved      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Body Measurements ────────────────────────────────────────
create table if not exists measurements (
  id          text primary key,
  date        text not null,
  chest_cm    numeric,
  waist_cm    numeric,
  hips_cm     numeric,
  bicep_cm    numeric,
  thigh_cm    numeric,
  neck_cm     numeric,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ─── Sync Metadata ────────────────────────────────────────────
-- Tracks last sync time per entity type for future incremental sync
create table if not exists sync_metadata (
  entity_type   text primary key,
  last_synced_at timestamptz not null default now()
);

-- ─── RLS: Enabled with Custom Header Token Auth ───────────────
-- Enable Row Level Security
alter table profiles          enable row level security;
alter table goals             enable row level security;
alter table weight_logs       enable row level security;
alter table food_items        enable row level security;
alter table food_logs         enable row level security;
alter table saved_meals       enable row level security;
alter table exercises         enable row level security;
alter table workout_templates enable row level security;
alter table workout_sessions  enable row level security;
alter table memories          enable row level security;
alter table measurements      enable row level security;
alter table sync_metadata     enable row level security;

-- Helper to extract x-fitos-auth header
create or replace function get_auth_token()
returns text language plpgsql stable as $$
begin
  return current_setting('request.headers', true)::json->>'x-fitos-auth';
exception
  when others then return null;
end;
$$;

-- RLS Policies
create policy "profile_insert_empty" on profiles
  for insert with check ((select count(*) from profiles) = 0);

create policy "profile_token_access" on profiles
  for all using (get_auth_token() = sync_token)
  with check (get_auth_token() = sync_token);

create policy "goals_token_access" on goals
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "weight_logs_token_access" on weight_logs
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "food_items_token_access" on food_items
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "food_logs_token_access" on food_logs
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "saved_meals_token_access" on saved_meals
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "exercises_token_access" on exercises
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "workout_templates_token_access" on workout_templates
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "workout_sessions_token_access" on workout_sessions
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "memories_token_access" on memories
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "measurements_token_access" on measurements
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

create policy "sync_metadata_token_access" on sync_metadata
  for all using (get_auth_token() = (select sync_token from profiles limit 1));

-- ─── Auto-update updated_at ───────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create or replace trigger goals_updated_at
  before update on goals
  for each row execute function update_updated_at();

create or replace trigger memories_updated_at
  before update on memories
  for each row execute function update_updated_at();

create or replace trigger exercises_updated_at
  before update on exercises
  for each row execute function update_updated_at();

create or replace trigger workout_templates_updated_at
  before update on workout_templates
  for each row execute function update_updated_at();

-- Done! ✅
select 'FitOS schema created successfully 🚀' as result;
