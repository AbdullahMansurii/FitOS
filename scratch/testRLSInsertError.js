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
  return {
    status: response.status,
    statusText: response.statusText,
    data: text ? JSON.parse(text) : null
  };
}

async function run() {
  const idA = 'profile-a';
  const tokenA = 'token-a';
  const idB = 'profile-b';
  const tokenB = 'token-b';

  console.log("1. Cleaning up any leftover profile-a or profile-b...");
  await request(`profiles?id=eq.${idA}`, 'DELETE', null, tokenA);
  await request(`profiles?id=eq.${idB}`, 'DELETE', null, tokenB);

  console.log("2. Inserting first profile (should succeed if empty)...");
  const res1 = await request('profiles', 'POST', {
    id: idA,
    display_name: 'Profile A',
    weight_unit: 'kg',
    energy_unit: 'kcal',
    sync_token: tokenA
  }, tokenA);
  console.log("Insert 1 response:", res1);

  console.log("3. Inserting second profile while first exists (should fail RLS)...");
  const res2 = await request('profiles', 'POST', {
    id: idB,
    display_name: 'Profile B',
    weight_unit: 'kg',
    energy_unit: 'kcal',
    sync_token: tokenB
  }, tokenB);
  console.log("Insert 2 response:", res2);

  console.log("4. Cleaning up profile-a...");
  await request(`profiles?id=eq.${idA}`, 'DELETE', null, tokenA);
  console.log("Cleanup done.");
}

run().catch(console.error);
