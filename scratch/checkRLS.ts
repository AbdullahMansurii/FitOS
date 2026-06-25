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

async function request(pathStr: string, method: string, body: any, syncToken?: string) {
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
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

async function run() {
  console.log("Supabase URL:", supabaseUrl)

  // 1. Setup profile with Token A
  const tokenA = 'token-A-12345'
  const tokenB = 'token-B-67890'

  // Clean profiles and food_logs
  console.log("\n--- Cleaning profiles & food_logs ---")
  try {
    const profiles = await request('profiles', 'GET', null)
    for (const p of profiles) {
      await request(`profiles?id=eq.${p.id}`, 'DELETE', null, p.sync_token)
    }
  } catch (e: any) {
    console.error("Profiles cleanup error:", e.message)
  }

  // Insert profile with Token A
  const profileData = {
    id: 'test-profile-id',
    display_name: 'Test Profile',
    weight_unit: 'kg',
    energy_unit: 'kcal',
    sync_token: tokenA
  }
  await request('profiles', 'POST', profileData, tokenA)
  console.log("Profile created with Token A.")

  // 2. Insert food log using Token A
  const foodLogData = {
    id: 'test-food-log-id',
    date: '2026-06-25',
    meal_type: 'breakfast',
    name: 'Egg',
    quantity_g: 100,
    calories: 150,
    protein: 13,
    carbs: 1,
    fat: 10
  }
  console.log("\n--- Inserting food log with Token A ---")
  try {
    await request('food_logs', 'POST', foodLogData, tokenA)
    console.log("Food log inserted successfully!")
  } catch (e: any) {
    console.error("Food log insert failed:", e.message)
  }

  // 3. Try to select food log without header
  console.log("\n--- Selecting food logs with no header ---")
  try {
    const res = await request('food_logs', 'GET', null)
    console.log("Food logs count (no header):", res.length, res)
  } catch (e: any) {
    console.error("Select with no header failed:", e.message)
  }

  // 4. Try to select food log with Token B (should return 0 rows if RLS works)
  console.log(`\n--- Selecting food logs with Token B: ${tokenB} ---`)
  try {
    const res = await request('food_logs', 'GET', null, tokenB)
    console.log("Food logs count (Token B):", res.length, res)
  } catch (e: any) {
    console.error("Select with Token B failed:", e.message)
  }

  // 5. Select food log with Token A (should return 1 row)
  console.log(`\n--- Selecting food logs with Token A: ${tokenA} ---`)
  try {
    const res = await request('food_logs', 'GET', null, tokenA)
    console.log("Food logs count (Token A):", res.length, res)
  } catch (e: any) {
    console.error("Select with Token A failed:", e.message)
  }

  // Cleanup
  console.log("\n--- Cleanup ---")
  try {
    await request('profiles?id=eq.test-profile-id', 'DELETE', null, tokenA)
    console.log("Cleanup finished.")
  } catch (e: any) {
    console.error("Cleanup failed:", e.message)
  }
}

run().catch(console.error)
