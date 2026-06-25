global.WebSocket = class {};
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envPath = './.env'
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    const key = match[1]
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1)
    }
    env[key] = value.trim()
  }
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY']

const syncToken = process.argv[2] || "<SYNC_TOKEN>"

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-fitos-auth': syncToken
    }
  }
})

async function run() {
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*')
  console.log("\nProfiles fetched with UUID header:")
  if (profErr) {
    console.error("Error fetching profiles:", profErr)
  } else {
    console.log(JSON.stringify(profiles, null, 2))
  }
}

run()
