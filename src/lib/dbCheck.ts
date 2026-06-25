import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function runDbCheck() {
  console.log("Supabase URL:", supabaseUrl)
  
  const { data: profile } = await supabase.from('profiles').select('*').limit(1).maybeSingle()
  console.log("\nProfile Row:")
  console.log(profile)

  const token = profile?.sync_token
  console.log("\nSync Token:", token)

  if (token) {
    // @ts-expect-error - Custom headers on Supabase rest client
    if (supabase.rest) {
      // @ts-expect-error - Custom headers on Supabase rest client
      supabase.rest.headers['x-fitos-auth'] = token
    }

    const { data: templates, error: tempErr } = await supabase
      .from('workout_templates')
      .select('*')
    
    console.log("\nWorkout Templates in Supabase:")
    if (tempErr) console.error("Error fetching templates:", tempErr)
    else console.log(JSON.stringify(templates, null, 2))
    
    const { data: exercises, error: exErr } = await supabase
      .from('exercises')
      .select('*')
    
    console.log("\nExercises in Supabase count:", exercises?.length || 0)
    if (exErr) console.error("Error fetching exercises:", exErr)
  }
}

