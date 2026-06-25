import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env: { [key: string]: string } = {}
envContent.split('\n').forEach(line => {
  const clean = line.trim()
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=')
    if (idx !== -1) {
      const key = clean.substring(0, idx).trim()
      const val = clean.substring(idx + 1).trim()
      env[key] = val
    }
  }
})

const supabaseUrl = env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || ''

async function request(pathStr: string, syncToken?: string) {
  const headers: { [key: string]: string } = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  }
  if (syncToken) {
    headers['x-fitos-auth'] = syncToken
  }
  const url = `${supabaseUrl}/rest/v1/${pathStr}`
  const response = await fetch(url, {
    method: 'GET',
    headers,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

async function run() {
  console.log("Fetching profiles with bypass token (getting all)...")
  // Let's see if we can get anything or if we need a token
  // Let's try getting profiles with no token
  try {
    const res = await request('profiles')
    console.log("Profiles (no token):", res)
  } catch (e: any) {
    console.log("Profiles with no token failed:", e.message)
  }
  
  // Let's check with some dummy tokens to see if we can read profiles
  // Wait, profiles policy is:
  // get_auth_token() = sync_token
  // So a profile row is only returned if get_auth_token() = sync_token.
  // Wait! If profiles table has a row, we can only retrieve it if we know its sync_token.
  // Wait, is there a way to query without RLS or inspect? No, REST API goes through RLS.
  // But we can check if RLS allows us to insert/select if we guess.
  // Wait, let's write a database query script that uses supabase client or postgres client?
  // Rest client is restricted by RLS.
}

run().catch(console.error)
