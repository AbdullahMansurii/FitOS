import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const clean = line.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      const key = clean.substring(0, idx).trim();
      const val = clean.substring(idx + 1).trim();
      env[key] = val;
    }
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

async function request(pathStr, syncToken) {
  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
  if (syncToken) {
    headers['x-fitos-auth'] = syncToken;
  }
  const url = `${supabaseUrl}/rest/v1/${pathStr}`;
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function run() {
  console.log("Supabase URL:", supabaseUrl);
  
  // Let's check profiles without token
  try {
    const res = await request('profiles');
    console.log("Profiles count (no token):", res.length);
    console.log("Profiles (no token):", res);
  } catch (e) {
    console.log("Profiles (no token) error:", e.message);
  }

  // Let's check food_logs count with no token
  try {
    const res = await request('food_logs');
    console.log("Food logs count (no token):", res.length);
  } catch (e) {
    console.log("Food logs (no token) error:", e.message);
  }
}

run().catch(console.error);
