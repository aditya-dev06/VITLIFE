import test from 'node:test';
import assert from 'node:assert/strict';

// Mock browser globals for node testing
if (typeof global.window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.localStorage = mockLocalStorage;
let navOnLine = true;
Object.defineProperty(globalThis, 'navigator', {
  value: {
    get onLine() { return navOnLine; }
  },
  configurable: true,
  writable: true
});
const setOnLine = (val) => { navOnLine = val; };

// Import our module functions
const {
  PENDING_SYNC_KEY,
  safeGetStorage,
  safeSetStorage,
  safeRemoveStorage,
  getInitialSyncStatus
} = await import('../src/hooks/useTimetableSync.js');

const {
  GRID_SLOT_MAP,
  NON_LUNCH_TIMESLOTS
} = await import('../src/utils/timetableConstants.js');

test('0ms Offline Profile Initialization & Initial Sync Status', () => {
  mockLocalStorage.clear();

  // Test 1: Clean online state -> synced
  setOnLine(true);
  assert.equal(getInitialSyncStatus(), 'synced');

  // Test 2: Clean offline state -> offline
  setOnLine(false);
  assert.equal(getInitialSyncStatus(), 'offline');

  // Test 3: Pending item while offline -> offline
  safeSetStorage(PENDING_SYNC_KEY, { timetable: [{ slot: 'A11', courseCode: 'CSE1001' }] });
  assert.equal(getInitialSyncStatus(), 'offline');

  // Test 4: Pending item while online -> pending (0ms synchronous result!)
  setOnLine(true);
  assert.equal(getInitialSyncStatus(), 'pending');

  mockLocalStorage.clear();
});

test('Safe localStorage Synchronization', () => {
  mockLocalStorage.clear();

  // Test 1: safeSetStorage & safeGetStorage with complex object
  const testPayload = { isGuest: false, timetable: [{ slot: 'B11', courseCode: 'MAT2002' }] };
  assert.equal(safeSetStorage('ds_ai_user', testPayload), true);
  assert.deepEqual(safeGetStorage('ds_ai_user'), testPayload);

  // Test 2: safeRemoveStorage
  assert.equal(safeRemoveStorage('ds_ai_user'), true);
  assert.equal(safeGetStorage('ds_ai_user'), null);

  // Test 3: Corrupted JSON recovery
  mockLocalStorage.setItem('corrupted_key', '{ invalid json ...');
  assert.equal(safeGetStorage('corrupted_key'), null);

  mockLocalStorage.clear();
});

test('Fast Slot Calculation Math & GRID_SLOT_MAP matrix', () => {
  // Test 1: Grid Dimensions (6 days, 7 non-lunch timeslots)
  assert.equal(GRID_SLOT_MAP.length, 6);
  assert.equal(NON_LUNCH_TIMESLOTS.length, 7);
  GRID_SLOT_MAP.forEach(daySlots => {
    assert.equal(daySlots.length, 7);
  });

  // Test 2: Specific slot code verifications
  // Day 1 (Monday), slot index 0 (08:30) => A11
  assert.equal(GRID_SLOT_MAP[0][0], 'A11');
  // Day 1 (Monday), slot index 1 (10:05) => B11
  assert.equal(GRID_SLOT_MAP[0][1], 'B11');
  // Day 2 (Tuesday), slot index 0 (08:30) => D11
  assert.equal(GRID_SLOT_MAP[1][0], 'D11');
  // Day 3 (Wednesday), slot index 0 (08:30) => A12
  assert.equal(GRID_SLOT_MAP[2][0], 'A12');

  // Test 3: Benchmark lookup math vs array iterations
  const startTime = performance.now();
  for (let i = 0; i < 10000; i++) {
    const dayIdx = i % 6;
    const slotIdx = i % 7;
    const code = GRID_SLOT_MAP[dayIdx][slotIdx];
    assert.ok(code);
  }
  const endTime = performance.now();
  const elapsed = endTime - startTime;
  console.log(`10,000 O(1) slot math lookups completed in ${elapsed.toFixed(3)} ms`);
  assert.ok(elapsed < 20, '10,000 lookups must take less than 20ms');
});
