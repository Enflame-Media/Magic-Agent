import type { Machine } from '@/sync/storageTypes';

/**
 * Timeout threshold for considering a machine offline.
 * CLI sends heartbeats every ~20-25 seconds, so 2 minutes gives ample buffer
 * for network latency and missed heartbeats while still detecting stale connections.
 *
 * This handles cases where the disconnect handler never runs:
 * - CLI crashes unexpectedly
 * - Network connection drops
 * - Server restarts
 */
const MACHINE_ONLINE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export function isMachineOnline(machine: Machine): boolean {
    // Must have active flag set
    if (!machine.active) {
        return false;
    }

    // Even with active flag, check if activeAt is too stale
    // This handles cases where disconnect handler never ran
    const now = Date.now();
    const timeSinceLastActive = now - machine.activeAt;

    return timeSinceLastActive < MACHINE_ONLINE_TIMEOUT_MS;
}