global.WebSocket = class {};
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envPath = './.env'
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) env[match[1]] = (match[2] || '').replace(/['"]/g, '').trim()
})

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY'], {
  global: {
    headers: {
      'x-fitos-auth': 'caa8cf64e68f3cb7705bb3fc94876b056e104033373b1ec92921b100f9f676dd'
    }
  }
})

async function verify() {
  const { data, error } = await supabase.from('profiles').select('*')
  
  if (error) {
    console.error('\n❌ Verification Failed: Database query failed:', error.message)
    process.exit(1)
  }
  
  if (!data || data.length !== 1) {
    console.error(`\n❌ Verification Failed: Expected exactly 1 profile row, got ${data?.length || 0}`)
    process.exit(1)
  }
  
  const p = data[0]
  if (p.is_master !== true || p.sync_token !== 'caa8cf64e68f3cb7705bb3fc94876b056e104033373b1ec92921b100f9f676dd') {
    console.error('\n❌ Verification Failed: Profile contents mismatch:', p)
    process.exit(1)
  }
  
  console.log('\n✅ Verification Succeeded!')
  console.log('  - Profile ID:', p.id)
  console.log('  - Sync Token:', p.sync_token)
  console.log('  - Is Master:', p.is_master)
}

verify()
