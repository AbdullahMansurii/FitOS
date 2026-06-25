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

  console.log("1. Cleaning up...");
  await request(`profiles?id=eq.${idA}`, 'DELETE', null, tokenA);
  await request(`profiles?id=eq.${idB}`, 'DELETE', null, tokenB);
  await request(`food_logs?id=eq.food-a`, 'DELETE', null, tokenA);
  await request(`food_logs?id=eq.food-b`, 'DELETE', null, tokenB);

  console.log("2. Setting up Profile A and Food A...");
  await request('profiles', 'POST', {
    id: idA, display_name: 'Profile A', weight_unit: 'kg', energy_unit: 'kcal', sync_token: tokenA
  }, tokenA);
  await request('food_logs', 'POST', {
    id: 'food-a', date: '2026-06-25', meal_type: 'breakfast', name: 'Food A', quantity_g: 100, calories: 100, protein: 10, carbs: 10, fat: 10
  }, tokenA);

  console.log("3. Setting up Profile B and Food B...");
  await request('profiles', 'POST', {
    id: idB, display_name: 'Profile B', weight_unit: 'kg', energy_unit: 'kcal', sync_token: tokenB
  }, tokenB);
  await request('food_logs', 'POST', {
    id: 'food-b', date: '2026-06-25', meal_type: 'lunch', name: 'Food B', quantity_g: 200, calories: 200, protein: 20, carbs: 20, fat: 20
  }, tokenB);

  console.log("\n4. Querying food_logs with Token A...");
  const getA = await request('food_logs', 'GET', null, tokenA);
  console.log("Token A food_logs:", getA.data);

  console.log("\n5. Querying food_logs with Token B...");
  const getB = await request('food_logs', 'GET', null, tokenB);
  console.log("Token B food_logs:", getB.data);

  console.log("\n6. Cleaning up...");
  await request(`profiles?id=eq.${idA}`, 'DELETE', null, tokenA);
  await request(`profiles?id=eq.${idB}`, 'DELETE', null, tokenB);
  console.log("Done.");
}

run().catch(console.error);
