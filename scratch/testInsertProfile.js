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

async function request(pathStr, method, body, syncToken) {
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
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function run() {
  const testId = 'temp-test-id-' + Math.random().toString(36).substring(7);
  const testToken = 'temp-token-' + Math.random().toString(36).substring(7);
  
  console.log("Attempting insert with testId:", testId, "testToken:", testToken);
  try {
    const res = await request('profiles', 'POST', {
      id: testId,
      display_name: 'Temp Insert Test',
      weight_unit: 'kg',
      energy_unit: 'kcal',
      sync_token: testToken
    }, testToken);
    console.log("Insert SUCCEEDED! This means profiles table was empty (or RLS allowed it). Result:", res);
    
    // Clean it up immediately
    console.log("Cleaning up inserted test profile...");
    await request(`profiles?id=eq.${testId}`, 'DELETE', null, testToken);
    console.log("Cleaned up successfully.");
  } catch (e) {
    console.log("Insert FAILED! This means profiles table already contains rows, violating RLS policy (or other database error):", e.message);
  }
}

run().catch(console.error);
