// Mocks for Node/TSX environment
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
  length: 0,
  key: (index: number) => null
} as any;

if (typeof (global as any).localStorage === 'undefined') {
  (global as any).localStorage = mockLocalStorage;
}
if (typeof (global as any).window === 'undefined') {
  (global as any).window = { localStorage: mockLocalStorage } as any;
} else if (typeof (global as any).window.localStorage === 'undefined') {
  (global as any).window.localStorage = mockLocalStorage;
}
if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = class MockWebSocket {
    url = '';
    readyState = 0;
    addEventListener() {}
    removeEventListener() {}
    close() {}
    send() {}
  } as any;
}
if (typeof (import.meta as any).env === 'undefined') {
  (import.meta as any).env = {
    DEV: true,
    VITE_SUPABASE_URL: 'https://mock.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'mock-key',
  };
}

// Mock Supabase storage
let databaseProfiles: any[] = [];

async function run() {
  console.log('=== TEST SINGLE OWNER AUTHENTICATION ===\n');

  // Dynamically import modules so the environment mock runs beforehand
  const { useAuthStore, deriveSyncToken } = await import('../src/store/authStore');
  const { useProfileStore } = await import('../src/store/index');
  const { supabase } = await import('../src/lib/supabase');

  supabase.from = (table: string) => {
    return {
      select: () => {
        return {
          limit: () => {
            return {
              maybeSingle: () => {
                // Simulated select: only matches row where get_auth_token() matches row's sync_token
                const headerToken = (supabase as any).rest?.headers?.['x-fitos-auth'];
                const matched = databaseProfiles.find(p => p.sync_token === headerToken);
                return Promise.resolve({ data: matched || null, error: null });
              }
            }
          }
        }
      },
      insert: (row: any) => {
        // UNIQUE single-row check simulation
        const alreadyHasRow = databaseProfiles.length > 0;
        if (alreadyHasRow) {
          return Promise.resolve({ error: { message: 'Unique constraint violation: profiles already has is_master row' } });
        }
        databaseProfiles.push(row);
        return Promise.resolve({ data: null, error: null });
      },
      update: (updates: any) => {
        return {
          eq: (field: string, val: any) => {
            databaseProfiles = databaseProfiles.map(p => p[field] === val ? { ...p, ...updates } : p);
            return Promise.resolve({ error: null });
          }
        }
      }
    } as any;
  };
  let passed = true;

  // 1. Test deterministic token derivation
  console.log('1. Testing token derivation...');
  const t1 = await deriveSyncToken('abdullah-password');
  const t2 = await deriveSyncToken('abdullah-password');
  const t3 = await deriveSyncToken('wrong-password');

  if (t1 !== t2) {
    console.error('❌ Expected derived tokens to be deterministic and identical.');
    passed = false;
  }
  if (t1 === t3) {
    console.error('❌ Expected different passwords to resolve to different tokens.');
    passed = false;
  }
  console.log('✅ Deterministic tokens verify successfully.');

  // Reset stores and database
  useAuthStore.setState({ isSetup: false, isUnlocked: false, passwordHash: null, syncToken: null });
  useProfileStore.setState({ profile: null });
  databaseProfiles = [];

  // 2. Test initial setup on empty database
  console.log('\n2. Testing setup on empty database...');
  const setupOk = await useAuthStore.getState().unlock('my-master-password');
  if (!setupOk) {
    console.error('❌ Expected setup unlock on empty database to succeed');
    passed = false;
  } else {
    console.log('✅ Initial setup unlock succeeded.');
  }

  const tokenInDb = databaseProfiles[0]?.sync_token;
  const expectedToken = await deriveSyncToken('my-master-password');
  if (tokenInDb !== expectedToken) {
    console.error(`❌ Expected db sync_token to match derived master token. Got: ${tokenInDb}, expected: ${expectedToken}`);
    passed = false;
  } else {
    console.log('✅ DB sync_token matched derived master token.');
  }

  // Clear local store to simulate a second new device trying to pair
  useAuthStore.setState({ isSetup: false, isUnlocked: false, passwordHash: null, syncToken: null });
  useProfileStore.setState({ profile: null });

  // 3. Test correct password pairing on secondary device
  console.log('\n3. Testing pairing on secondary device with CORRECT password...');
  const correctPairOk = await useAuthStore.getState().unlock('my-master-password');
  if (!correctPairOk) {
    console.error('❌ Expected pairing with correct password to succeed');
    passed = false;
  } else {
    console.log('✅ Pairing with correct password succeeded.');
  }

  // Clear local store again
  useAuthStore.setState({ isSetup: false, isUnlocked: false, passwordHash: null, syncToken: null });
  useProfileStore.setState({ profile: null });

  // 4. Test incorrect password pairing on secondary device
  console.log('\n4. Testing pairing on secondary device with INCORRECT password...');
  const wrongPairOk = await useAuthStore.getState().unlock('wrong-master-password');
  if (wrongPairOk) {
    console.error('❌ Expected pairing with wrong password to be rejected');
    passed = false;
  } else {
    console.log('✅ Pairing with wrong password successfully rejected.');
  }

  console.log(`\nFinal result: Auth tests ${passed ? 'PASSED' : 'FAILED'}\n`);
  process.exit(passed ? 0 : 1);
}

run().catch(console.error);
