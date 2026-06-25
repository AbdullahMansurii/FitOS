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
// Setup import.meta.env mock first before importing store and supabase
if (typeof (import.meta as any).env === 'undefined') {
  (import.meta as any).env = {
    DEV: true,
    VITE_SUPABASE_URL: 'https://mock.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'mock-key',
  };
}

async function run() {
  console.log('=== TEST DELETION SYNC & TOMBSTONES ===\n');

  // Dynamically import modules so the environment mock runs beforehand
  const { useFoodStore, useGoalsStore } = await import('../src/store/index');
  const { pushAll } = await import('../src/lib/sync');
  const { supabase } = await import('../src/lib/supabase');

  // Override supabase REST calls to simulate database response
  supabase.from = (table: string) => {
    return {
      upsert: () => Promise.resolve({ error: null }),
      delete: () => {
        return {
          in: (field: string, values: any[]) => {
            console.log(`[Mock DB] Deleted from ${table} where ${field} in [${values.join(', ')}]`);
            return Promise.resolve({ error: null });
          }
        };
      },
      select: () => {
        return {
          order: () => {
            return {
              limit: () => Promise.resolve({ data: [] }),
              maybeSingle: () => Promise.resolve({ data: null })
            };
          },
          limit: () => Promise.resolve({ data: [] }),
          maybeSingle: () => Promise.resolve({ data: null })
        };
      }
    } as any;
  };

  let passed = true;

  // 1. Test Food deletion tombstone
  console.log('1. Testing Food deletion...');
  const foodLog = useFoodStore.getState().addFoodLog({
    date: '2026-06-25',
    mealType: 'breakfast',
    name: 'Test Eggs',
    quantityG: 150,
    calories: 220,
    protein: 18,
    carbs: 1,
    fat: 16
  });

  const logId = foodLog.id;
  const initialLogs = useFoodStore.getState().foodLogs;
  if (!initialLogs.find(l => l.id === logId)) {
    console.error('❌ Expected to find added food log');
    passed = false;
  }

  useFoodStore.getState().deleteFoodLog(logId);
  const postDeleteLogs = useFoodStore.getState().foodLogs;
  const tombstones = useFoodStore.getState().deletedFoodLogIds;

  if (postDeleteLogs.find(l => l.id === logId)) {
    console.error('❌ Expected deleted food log to be filtered locally');
    passed = false;
  }
  if (!tombstones.includes(logId)) {
    console.error('❌ Expected deleted food log ID to be in deletedFoodLogIds');
    passed = false;
  } else {
    console.log('✅ Food log successfully saved to tombstone list.');
  }

  // 2. Test Goal deletion tombstone
  console.log('\n2. Testing Goal deletion...');
  const goal = useGoalsStore.getState().addGoal({
    name: 'Cut to 10%',
    type: 'cut',
    status: 'active',
    startDate: '2026-06-01',
    calorieTarget: 2000,
    proteinTarget: 160
  });
  const goalId = goal.id;
  useGoalsStore.getState().deleteGoal(goalId);
  if (!useGoalsStore.getState().deletedGoalIds.includes(goalId)) {
    console.error('❌ Expected goal ID to be in deletedGoalIds');
    passed = false;
  } else {
    console.log('✅ Goal successfully saved to tombstone list.');
  }

  // 3. Test pushAll delete operations call
  console.log('\n3. Testing pushAll calls delete for tombstones...');
  try {
    const syncOk = await pushAll();
    if (!syncOk) {
      console.error('❌ pushAll sync failed');
      passed = false;
    } else {
      console.log('✅ pushAll finished successfully.');
    }

    // Verify tombstones were cleared
    const tombstonesCleared = useFoodStore.getState().deletedFoodLogIds.length === 0;
    const goalsCleared = useGoalsStore.getState().deletedGoalIds.length === 0;
    if (!tombstonesCleared || !goalsCleared) {
      console.error('❌ Expected tombstone lists to be cleared after successful pushAll');
      passed = false;
    } else {
      console.log('✅ Tombstone lists pruned successfully after sync.');
    }
  } catch (err: any) {
    console.error('❌ Sync test crashed:', err.message);
    passed = false;
  }

  console.log(`\nFinal result: Deletion Sync tests ${passed ? 'PASSED' : 'FAILED'}\n`);
  process.exit(passed ? 0 : 1);
}

run().catch(console.error);
