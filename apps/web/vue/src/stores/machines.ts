/**
 * Machines Store
 *
 * Manages machine/daemon collection with optimized Map-based storage.
 * Machines represent CLI instances running on different computers.
 *
 * @example
 * ```typescript
 * const machines = useMachinesStore();
 * machines.upsertMachine(newMachine);
 * const online = machines.onlineMachines;
 * ```
 */

import { defineStore } from 'pinia';
import { ref, shallowRef, computed, triggerRef } from 'vue';

/**
 * Timeout for considering a machine offline if no heartbeat received.
 * CLI sends machine-alive every 20-25 seconds, so 60s gives ~3x buffer.
 * This handles crash scenarios where WebSocket close isn't detected quickly.
 */
const MACHINE_OFFLINE_TIMEOUT_MS = 60_000;

import type { ApiNewMachine } from '@magic-agent/protocol';

/**
 * Machine data structure
 *
 * Based on ApiNewMachine from protocol.
 * Note: metadata and daemonState are encrypted strings.
 */
export interface Machine {
    /** Machine ID (machineId from protocol) */
    id: string;
    /** Sequence number for ordering */
    seq: number;
    /** Encrypted metadata JSON string */
    metadata: string;
    /** Metadata version for optimistic concurrency */
    metadataVersion: number;
    /** Encrypted daemon state JSON string */
    daemonState: string | null;
    /** Daemon state version */
    daemonStateVersion: number;
    /** Data encryption key (Base64) */
    dataEncryptionKey: string | null;
    /** Whether machine is currently active */
    active: boolean;
    /** Timestamp of last activity */
    activeAt: number;
    /** Creation timestamp */
    createdAt: number;
    /** Last update timestamp */
    updatedAt: number;
    /** Whether machine is online (from ephemeral status) */
    online?: boolean;
    /** Last online status timestamp */
    onlineAt?: number;
}

/**
 * Check if a machine is truly online.
 * A machine is online if:
 * 1. It has received a machine-status online event (online === true), AND
 * 2. Its last activity (activeAt) is within the timeout threshold
 *
 * This handles crash scenarios where the WebSocket close event is delayed.
 */
function isMachineOnline(machine: Machine): boolean {
    // If explicitly marked offline by ephemeral event, trust it
    if (machine.online === false) {
        return false;
    }

    // If marked online, verify with activity timeout
    // This catches crashed CLIs that haven't sent heartbeats
    const now = Date.now();
    const lastActivity = machine.activeAt || 0;
    const isRecentlyActive = (now - lastActivity) < MACHINE_OFFLINE_TIMEOUT_MS;

    // Machine is online if: explicitly marked online AND recently active
    // OR: we have no online status yet but it was recently active (initial sync)
    if (machine.online === true) {
        return isRecentlyActive;
    }

    return isRecentlyActive;
}

/**
 * Convert API update to Machine interface
 */
function fromApiUpdate(update: ApiNewMachine): Machine {
    return {
        id: update.machineId,
        seq: update.seq,
        metadata: update.metadata,
        metadataVersion: update.metadataVersion,
        daemonState: update.daemonState,
        daemonStateVersion: update.daemonStateVersion,
        dataEncryptionKey: update.dataEncryptionKey,
        active: update.active,
        activeAt: update.activeAt,
        createdAt: update.createdAt,
        updatedAt: update.updatedAt,
    };
}

export const useMachinesStore = defineStore('machines', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Machine collection indexed by ID
     * Using shallowRef for better performance with Map mutations
     */
    const machines = shallowRef<Map<string, Machine>>(new Map());

    /** Currently selected machine ID */
    const activeMachineId = ref<string | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Currently active machine */
    const activeMachine = computed(() =>
        activeMachineId.value ? machines.value.get(activeMachineId.value) ?? null : null
    );

    /** Total number of machines */
    const count = computed(() => machines.value.size);

    /** All machines sorted by activeAt (most recent first) */
    const machinesList = computed(() =>
        Array.from(machines.value.values()).sort((a, b) => b.activeAt - a.activeAt)
    );

    /** Online machines (considers both ephemeral status and activity timeout) */
    const onlineMachines = computed(() =>
        Array.from(machines.value.values())
            .filter(isMachineOnline)
            .sort((a, b) => (b.onlineAt ?? 0) - (a.onlineAt ?? 0))
    );

    /** Offline machines (includes crashed machines with stale activity) */
    const offlineMachines = computed(() =>
        Array.from(machines.value.values())
            .filter((m) => !isMachineOnline(m))
            .sort((a, b) => b.activeAt - a.activeAt)
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get a machine by ID
     */
    function getMachine(id: string): Machine | undefined {
        return machines.value.get(id);
    }

    /**
     * Insert or update a machine
     */
    function upsertMachine(machine: Machine) {
        machines.value.set(machine.id, machine);
        triggerRef(machines);
    }

    /**
     * Insert or update from API update event
     */
    function upsertFromApi(update: ApiNewMachine) {
        const machine = fromApiUpdate(update);
        upsertMachine(machine);
    }

    /**
     * Update partial machine data
     */
    function updateMachine(
        id: string,
        updates: Partial<Omit<Machine, 'id'>>
    ) {
        const existing = machines.value.get(id);
        if (existing) {
            machines.value.set(id, { ...existing, ...updates });
            triggerRef(machines);
        }
    }

    /**
     * Update machine online status (from ephemeral events)
     */
    function setMachineOnlineStatus(id: string, online: boolean) {
        const existing = machines.value.get(id);
        if (existing) {
            machines.value.set(id, {
                ...existing,
                online,
                onlineAt: Date.now(),
            });
            triggerRef(machines);
        }
    }

    /**
     * Remove a machine by ID
     */
    function removeMachine(id: string) {
        const deleted = machines.value.delete(id);
        if (deleted) {
            triggerRef(machines);
            if (activeMachineId.value === id) {
                activeMachineId.value = null;
            }
        }
    }

    /**
     * Set the active machine
     */
    function setActiveMachine(id: string | null) {
        activeMachineId.value = id;
    }

    /**
     * Bulk update machines (for initial sync)
     */
    function setMachines(newMachines: Machine[]) {
        const map = new Map<string, Machine>();
        for (const machine of newMachines) {
            map.set(machine.id, machine);
        }
        machines.value = map;
        triggerRef(machines);
    }

    /**
     * Clear all machines
     */
    function clearMachines() {
        machines.value = new Map();
        activeMachineId.value = null;
        triggerRef(machines);
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        clearMachines();
    }

    return {
        // State
        machines,
        activeMachineId,
        // Getters
        activeMachine,
        count,
        machinesList,
        onlineMachines,
        offlineMachines,
        // Actions
        getMachine,
        upsertMachine,
        upsertFromApi,
        updateMachine,
        setMachineOnlineStatus,
        removeMachine,
        setActiveMachine,
        setMachines,
        clearMachines,
        $reset,
    };
});

// Export helper for components that need to check individual machines
export { isMachineOnline };
