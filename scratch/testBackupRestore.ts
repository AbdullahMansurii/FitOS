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

async function run() {
  console.log('=== TEST BACKUP & RESTORE SYSTEM ===\n');

  // Dynamically import modules so the environment mock runs beforehand
  const { useAuthStore } = await import('../src/store/authStore');
  const indexExports = await import('../src/store/index');
  console.log('[Debug] Store exports:', Object.keys(indexExports));
  
  const { 
    useProfileStore, 
    useSettingsStore, 
    useGoalsStore, 
    useWorkoutStore, 
    useFoodStore, 
    useWeightStore, 
    useMemoryStore, 
    useChatStore 
  } = indexExports;
  const { pushAll } = await import('../src/lib/sync');
  const { supabase } = await import('../src/lib/supabase');

  // Mock supabase push/pull REST endpoints
  let pushCalled = false;
  supabase.from = (table: string) => {
    return {
      upsert: (data: any) => {
        console.log(`[Mock DB] Upserting to ${table}...`);
        pushCalled = true;
        return Promise.resolve({ error: null });
      },
      select: () => Promise.resolve({ data: [], error: null })
    } as any;
  };

  let passed = true;

  // 1. Populate initial store states with dummy data
  console.log('1. Seeding stores with dummy test data...');
  useProfileStore.setState({
    profile: {
      id: 'abdullah-master-id',
      name: 'Abdullah Mansuri',
      sync_token: 'test-token-123',
      created_at: new Date().toISOString()
    }
  });

  useSettingsStore.setState({
    settings: {
      theme: 'dark',
      unitWeight: 'kg',
      unitHeight: 'cm',
      aiModel: 'llama-3.3-70b-versatile',
      aiApiKey: 'dummy-api-key',
      calorieTarget: 2200,
      proteinTarget: 170
    }
  });

  const sampleGoal = useGoalsStore.getState().addGoal({
    name: 'Build muscle mass',
    type: 'recomp',
    status: 'active',
    startDate: '2026-06-25',
    calorieTarget: 2500,
    proteinTarget: 180
  });

  const sampleFood = useFoodStore.getState().addFoodLog({
    date: '2026-06-25',
    mealType: 'lunch',
    name: 'Chicken Breast & Rice',
    quantityG: 400,
    calories: 600,
    protein: 60,
    carbs: 70,
    fat: 8
  });

  // 2. Generate backup structure similar to SettingsPage.tsx
  console.log('\n2. Generating export backup JSON payload...');
  const backupPayload = {
    version: 'fitos-backup-v1',
    timestamp: new Date().toISOString(),
    auth: useAuthStore.getState(),
    profile: useProfileStore.getState(),
    settings: useSettingsStore.getState(),
    goals: useGoalsStore.getState(),
    workout: useWorkoutStore.getState(),
    food: useFoodStore.getState(),
    weight: useWeightStore.getState(),
    memory: useMemoryStore.getState(),
    chat: useChatStore.getState(),
  };

  // Verify backup contents
  if (backupPayload.version !== 'fitos-backup-v1') {
    console.error('❌ Version field incorrect');
    passed = false;
  }
  if (backupPayload.profile.profile?.name !== 'Abdullah Mansuri') {
    console.error('❌ Profile name in backup incorrect');
    passed = false;
  }
  if (backupPayload.goals.goals.length !== 1 || backupPayload.goals.goals[0].name !== 'Build muscle mass') {
    console.error('❌ Goals list in backup incorrect or missing');
    passed = false;
  }
  if (backupPayload.food.foodLogs.length !== 1 || backupPayload.food.foodLogs[0].name !== 'Chicken Breast & Rice') {
    console.error('❌ Food logs list in backup incorrect or missing');
    passed = false;
  }
  console.log('✅ Export backup payload verified successfully.');

  // 3. Clear/Reset all stores to simulate an empty app before restore
  console.log('\n3. Resetting all stores to empty...');
  useProfileStore.setState({ profile: null });
  useSettingsStore.setState({ settings: { theme: 'dark', unitWeight: 'kg', unitHeight: 'cm', aiModel: 'llama-3.3-70b-spec', aiApiKey: '', calorieTarget: 2000, proteinTarget: 150 } });
  useGoalsStore.setState({ goals: [], deletedGoalIds: [] });
  useFoodStore.setState({ foodLogs: [], deletedFoodLogIds: [] });

  if (useProfileStore.getState().profile !== null || useGoalsStore.getState().goals.length > 0) {
    console.error('❌ Stores did not reset correctly');
    passed = false;
  } else {
    console.log('✅ All local stores cleared successfully.');
  }

  // 4. Import / Restore the backup JSON payload
  console.log('\n4. Restoring data from exported backup payload...');
  try {
    const json = JSON.parse(JSON.stringify(backupPayload)); // Deep copy simulation

    if (json.version !== 'fitos-backup-v1') {
      throw new Error('Invalid version');
    }

    // Restore state using setState
    if (json.auth) useAuthStore.setState(json.auth);
    if (json.profile) useProfileStore.setState(json.profile);
    if (json.settings) useSettingsStore.setState(json.settings);
    if (json.goals) useGoalsStore.setState(json.goals);
    if (json.workout) useWorkoutStore.setState(json.workout);
    if (json.food) useFoodStore.setState(json.food);
    if (json.weight) useWeightStore.setState(json.weight);
    if (json.memory) useMemoryStore.setState(json.memory);
    if (json.chat) useChatStore.setState(json.chat);

    console.log('✅ Backup state applied to stores.');

    // Verify stores were correctly populated
    const restoredProfile = useProfileStore.getState().profile;
    const restoredGoals = useGoalsStore.getState().goals;
    const restoredFood = useFoodStore.getState().foodLogs;

    if (!restoredProfile || restoredProfile.name !== 'Abdullah Mansuri') {
      console.error('❌ Restored profile name incorrect or missing');
      passed = false;
    }
    if (restoredGoals.length !== 1 || restoredGoals[0].name !== 'Build muscle mass') {
      console.error('❌ Restored goals list incorrect or missing');
      passed = false;
    }
    if (restoredFood.length !== 1 || restoredFood[0].name !== 'Chicken Breast & Rice') {
      console.error('❌ Restored food logs list incorrect or missing');
      passed = false;
    }

    console.log('✅ Restored store states verified successfully.');

    // 5. Trigger sync after restore
    console.log('\n5. Triggering sync (pushAll) to cloud database...');
    pushCalled = false;
    const syncOk = await pushAll();
    if (!syncOk) {
      console.error('❌ Sync failed during restore procedure');
      passed = false;
    }
    if (!pushCalled) {
      console.error('❌ Expected pushAll to upsert data to Supabase');
      passed = false;
    } else {
      console.log('✅ Sync pushAll successfully executed and completed.');
    }

  } catch (err: any) {
    console.error('❌ Import/Restore failed with error:', err.message);
    passed = false;
  }

  console.log(`\nFinal result: Backup/Restore tests ${passed ? 'PASSED' : 'FAILED'}\n`);
  process.exit(passed ? 0 : 1);
}

run().catch(console.error);
