import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || (globalThis as typeof globalThis & { process?: { env?: Record<string, string> } }).process?.env?.VITE_SUPABASE_URL || '') as string
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || (globalThis as typeof globalThis & { process?: { env?: Record<string, string> } }).process?.env?.VITE_SUPABASE_ANON_KEY || '') as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[FitOS] Supabase env vars missing — running in local-only mode')
}

// Retrieve initial sync token from localStorage synchronously if present
let initialSyncToken = ''
try {
  const authStr = localStorage.getItem('fitos-auth')
  if (authStr) {
    const parsed = JSON.parse(authStr)
    initialSyncToken = parsed.state?.syncToken || ''
  }
} catch {
  // Ignore JSON parse errors or missing local storage
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // We use a custom local master-password auth, not Supabase Auth.
    // Supabase is used only for data sync (storage layer).
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-fitos-auth': initialSyncToken,
    },
  },
})

export function setSupabaseAuthHeader(token: string) {
  // @ts-expect-error - Custom headers on Supabase rest client
  if (supabase.rest && supabase.rest.headers) {
    // @ts-expect-error - Custom headers on Supabase rest client
    const headers = supabase.rest.headers
    if (typeof headers.set === 'function') {
      headers.set('x-fitos-auth', token)
    } else {
      (headers as unknown as Record<string, string>)['x-fitos-auth'] = token
    }
  }
}

// ─── Table helpers (typed thin wrappers) ────────────────────────────────────

export const db = {
  // Weight logs
  weightLogs: () => supabase.from('weight_logs'),

  // Food logs
  foodLogs: () => supabase.from('food_logs'),

  // Workout sessions
  workoutSessions: () => supabase.from('workout_sessions'),

  // Goals
  goals: () => supabase.from('goals'),

  // Memories
  memories: () => supabase.from('memories'),

  // Profile
  profile: () => supabase.from('profiles'),
}

// ─── Connectivity check ───────────────────────────────────────────────────────

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}
