/**
 * Unit tests for the Machines store
 *
 * Tests Pinia store functionality for:
 * - Machine CRUD operations
 * - Computed getters (online/offline status)
 * - API update integration
 * - Activity timeout handling
 *
 * @see HAP-877 - Increase test coverage to 80%
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMachinesStore, isMachineOnline, type Machine } from '@/stores/machines';

// Mock machine factory
function createMockMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: `machine-${Math.random().toString(36).slice(2)}`,
    seq: 0,
    metadata: JSON.stringify({ name: 'Test Machine', os: 'darwin' }),
    metadataVersion: 1,
    daemonState: null,
    daemonStateVersion: 0,
    dataEncryptionKey: null,
    active: true,
    activeAt: Date.now(),
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('Machines Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have empty machines initially', () => {
      const store = useMachinesStore();

      expect(store.count).toBe(0);
      expect(store.machinesList).toEqual([]);
      expect(store.activeMachine).toBeNull();
    });
  });

  describe('upsertMachine', () => {
    it('should add a new machine', () => {
      const store = useMachinesStore();
      const machine = createMockMachine();

      store.upsertMachine(machine);

      expect(store.count).toBe(1);
      expect(store.getMachine(machine.id)).toEqual(machine);
    });

    it('should update an existing machine', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'test-id' });

      store.upsertMachine(machine);
      store.upsertMachine({ ...machine, metadata: JSON.stringify({ name: 'Updated' }) });

      expect(store.count).toBe(1);
      expect(JSON.parse(store.getMachine('test-id')?.metadata ?? '{}')).toEqual({ name: 'Updated' });
    });

    it('should handle multiple machines', () => {
      const store = useMachinesStore();
      const machine1 = createMockMachine({ id: 'machine-1' });
      const machine2 = createMockMachine({ id: 'machine-2' });
      const machine3 = createMockMachine({ id: 'machine-3' });

      store.upsertMachine(machine1);
      store.upsertMachine(machine2);
      store.upsertMachine(machine3);

      expect(store.count).toBe(3);
    });
  });

  describe('upsertFromApi', () => {
    it('should create machine from API update', () => {
      const store = useMachinesStore();
      const apiUpdate = {
        t: 'new-machine' as const,
        machineId: 'machine-api-1',
        seq: 1,
        metadata: JSON.stringify({ name: 'API Machine' }),
        metadataVersion: 1,
        daemonState: null,
        daemonStateVersion: 0,
        dataEncryptionKey: null,
        active: true,
        activeAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      store.upsertFromApi(apiUpdate);

      const machine = store.getMachine('machine-api-1');
      expect(machine).toBeDefined();
      expect(machine?.id).toBe('machine-api-1');
    });
  });

  describe('updateMachine', () => {
    it('should partially update an existing machine', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'test-id', active: true });

      store.upsertMachine(machine);
      store.updateMachine('test-id', { active: false, metadataVersion: 2 });

      const updated = store.getMachine('test-id');
      expect(updated?.active).toBe(false);
      expect(updated?.metadataVersion).toBe(2);
      expect(updated?.id).toBe('test-id'); // ID should remain unchanged
    });

    it('should do nothing for non-existent machine', () => {
      const store = useMachinesStore();

      store.updateMachine('non-existent', { active: false });

      expect(store.count).toBe(0);
    });
  });

  describe('setMachineOnlineStatus', () => {
    it('should set machine online status to true', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'test-id', online: false });

      store.upsertMachine(machine);
      store.setMachineOnlineStatus('test-id', true);

      const updated = store.getMachine('test-id');
      expect(updated?.online).toBe(true);
      expect(updated?.onlineAt).toBeDefined();
    });

    it('should set machine online status to false', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'test-id', online: true });

      store.upsertMachine(machine);
      store.setMachineOnlineStatus('test-id', false);

      const updated = store.getMachine('test-id');
      expect(updated?.online).toBe(false);
    });

    it('should do nothing for non-existent machine', () => {
      const store = useMachinesStore();

      store.setMachineOnlineStatus('non-existent', true);

      expect(store.count).toBe(0);
    });
  });

  describe('removeMachine', () => {
    it('should remove a machine', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'to-remove' });

      store.upsertMachine(machine);
      expect(store.count).toBe(1);

      store.removeMachine('to-remove');
      expect(store.count).toBe(0);
      expect(store.getMachine('to-remove')).toBeUndefined();
    });

    it('should clear active machine if removed', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'active-machine' });

      store.upsertMachine(machine);
      store.setActiveMachine('active-machine');
      expect(store.activeMachine).toBeTruthy();

      store.removeMachine('active-machine');
      expect(store.activeMachine).toBeNull();
    });

    it('should do nothing for non-existent machine', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'existing' });

      store.upsertMachine(machine);
      store.removeMachine('non-existent');

      expect(store.count).toBe(1);
    });
  });

  describe('setActiveMachine', () => {
    it('should set the active machine', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'my-machine' });

      store.upsertMachine(machine);
      store.setActiveMachine('my-machine');

      expect(store.activeMachineId).toBe('my-machine');
      expect(store.activeMachine).toEqual(machine);
    });

    it('should allow setting to null', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'my-machine' });

      store.upsertMachine(machine);
      store.setActiveMachine('my-machine');
      store.setActiveMachine(null);

      expect(store.activeMachine).toBeNull();
    });
  });

  describe('setMachines', () => {
    it('should replace all machines', () => {
      const store = useMachinesStore();
      const machines = [
        createMockMachine({ id: 'machine-1' }),
        createMockMachine({ id: 'machine-2' }),
        createMockMachine({ id: 'machine-3' }),
      ];

      store.upsertMachine(createMockMachine({ id: 'old-machine' }));
      store.setMachines(machines);

      expect(store.count).toBe(3);
      expect(store.getMachine('old-machine')).toBeUndefined();
      expect(store.getMachine('machine-1')).toBeDefined();
    });
  });

  describe('clearMachines', () => {
    it('should clear all machines and active state', () => {
      const store = useMachinesStore();
      const machine = createMockMachine({ id: 'machine-1' });

      store.upsertMachine(machine);
      store.setActiveMachine('machine-1');
      store.clearMachines();

      expect(store.count).toBe(0);
      expect(store.activeMachine).toBeNull();
    });
  });

  describe('$reset', () => {
    it('should reset store to initial state', () => {
      const store = useMachinesStore();

      store.upsertMachine(createMockMachine());
      store.setActiveMachine(store.machinesList[0]?.id ?? null);
      store.$reset();

      expect(store.count).toBe(0);
      expect(store.activeMachine).toBeNull();
    });
  });

  describe('Computed Getters', () => {
    describe('machinesList', () => {
      it('should return machines sorted by activeAt (most recent first)', () => {
        const store = useMachinesStore();
        const now = Date.now();

        store.setMachines([
          createMockMachine({ id: 'm1', activeAt: now - 2000 }),
          createMockMachine({ id: 'm2', activeAt: now }),
          createMockMachine({ id: 'm3', activeAt: now - 1000 }),
        ]);

        const list = store.machinesList;
        expect(list[0]?.id).toBe('m2');
        expect(list[1]?.id).toBe('m3');
        expect(list[2]?.id).toBe('m1');
      });
    });

    describe('onlineMachines', () => {
      it('should return only online machines', () => {
        const store = useMachinesStore();
        const now = Date.now();
        vi.setSystemTime(now);

        store.setMachines([
          createMockMachine({ id: 'm1', online: true, activeAt: now, onlineAt: now }),
          createMockMachine({ id: 'm2', online: false }),
          createMockMachine({ id: 'm3', online: true, activeAt: now, onlineAt: now - 1000 }),
        ]);

        const online = store.onlineMachines;
        expect(online.length).toBe(2);
        expect(online.map(m => m.id)).toContain('m1');
        expect(online.map(m => m.id)).toContain('m3');
      });

      it('should exclude machines with stale activity even if marked online', () => {
        const store = useMachinesStore();
        const now = Date.now();
        vi.setSystemTime(now);

        // Machine was online but hasnt had activity in 61 seconds (beyond 60s timeout)
        store.setMachines([
          createMockMachine({ id: 'm1', online: true, activeAt: now - 61000 }),
        ]);

        const online = store.onlineMachines;
        expect(online.length).toBe(0);
      });
    });

    describe('offlineMachines', () => {
      it('should return only offline machines', () => {
        const store = useMachinesStore();
        const now = Date.now();
        vi.setSystemTime(now);

        store.setMachines([
          createMockMachine({ id: 'm1', online: true, activeAt: now }),
          createMockMachine({ id: 'm2', online: false, activeAt: now - 120000 }),
          createMockMachine({ id: 'm3', online: false, activeAt: now - 180000 }),
        ]);

        const offline = store.offlineMachines;
        expect(offline.length).toBe(2);
        expect(offline[0]?.id).toBe('m2'); // More recent activity first
        expect(offline[1]?.id).toBe('m3');
      });
    });

    describe('count', () => {
      it('should return correct machine count', () => {
        const store = useMachinesStore();

        expect(store.count).toBe(0);

        store.upsertMachine(createMockMachine());
        expect(store.count).toBe(1);

        store.upsertMachine(createMockMachine());
        expect(store.count).toBe(2);

        store.clearMachines();
        expect(store.count).toBe(0);
      });
    });
  });
});

describe('isMachineOnline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false if machine is explicitly offline', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const machine = createMockMachine({ online: false, activeAt: now });
    expect(isMachineOnline(machine)).toBe(false);
  });

  it('should return true if machine is online and recently active', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const machine = createMockMachine({ online: true, activeAt: now - 30000 });
    expect(isMachineOnline(machine)).toBe(true);
  });

  it('should return false if machine is online but activity is stale', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    // 61 seconds ago - beyond 60s timeout
    const machine = createMockMachine({ online: true, activeAt: now - 61000 });
    expect(isMachineOnline(machine)).toBe(false);
  });

  it('should return true for recently active machine without online status', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const machine = createMockMachine({ online: undefined, activeAt: now - 30000 });
    expect(isMachineOnline(machine)).toBe(true);
  });

  it('should return false for stale activity without online status', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const machine = createMockMachine({ online: undefined, activeAt: now - 61000 });
    expect(isMachineOnline(machine)).toBe(false);
  });

  it('should handle machine with zero activeAt', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const machine = createMockMachine({ online: true, activeAt: 0 });
    expect(isMachineOnline(machine)).toBe(false);
  });
});
