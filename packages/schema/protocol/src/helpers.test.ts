/**
 * Tests for session and machine ID accessor helpers
 *
 * @see HAP-653 - Type-safe session/machine ID accessor helpers
 */

import { describe, it, expect } from 'vitest';
import {
    // Session ID helpers
    hasSessionId,
    hasSessionIdEphemeral,
    getSessionId,
    getSessionIdFromEphemeral,
    tryGetSessionId,
    tryGetSessionIdFromEphemeral,
    // Machine ID helpers
    hasMachineId,
    hasMachineIdEphemeral,
    getMachineId,
    getMachineIdFromEphemeral,
    tryGetMachineId,
    tryGetMachineIdFromEphemeral,
    // Types
    type SessionIdUpdate,
    type SessionIdEphemeral,
    type MachineIdUpdate,
    type MachineIdEphemeral,
    type ApiUpdate,
    type ApiEphemeralUpdate,
} from './index';

// =============================================================================
// Test Fixtures
// =============================================================================

// All session updates now use 'sid' field (HAP-654)
const newSessionUpdate: ApiUpdate = {
    t: 'new-session',
    sid: 'session-123',
    seq: 1,
    metadata: 'encrypted-metadata',
    metadataVersion: 1,
    agentState: null,
    agentStateVersion: 0,
    dataEncryptionKey: null,
    active: true,
    activeAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

const updateSessionUpdate: ApiUpdate = {
    t: 'update-session',
    sid: 'session-456',
    agentState: { version: 1, value: 'state' },
};

const newMessageUpdate: ApiUpdate = {
    t: 'new-message',
    sid: 'session-789',
    message: {
        id: 'msg-001',
        seq: 1,
        content: { t: 'encrypted', c: 'encrypted-content' },
        createdAt: Date.now(),
    },
};

const deleteSessionUpdate: ApiUpdate = {
    t: 'delete-session',
    sid: 'session-deleted',
};

// Machine updates with 'machineId' field
const newMachineUpdate: ApiUpdate = {
    t: 'new-machine',
    machineId: 'machine-abc',
    seq: 1,
    metadata: 'encrypted-metadata',
    metadataVersion: 1,
    daemonState: null,
    daemonStateVersion: 0,
    dataEncryptionKey: null,
    active: true,
    activeAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

const updateMachineUpdate: ApiUpdate = {
    t: 'update-machine',
    machineId: 'machine-xyz',
    active: true,
    activeAt: Date.now(),
};

// Non-ID updates (for negative tests)
const accountUpdate: ApiUpdate = {
    t: 'update-account',
    id: 'user-123',
    firstName: 'Jane',
};

// Ephemeral updates - session types now use 'sid' (HAP-654)
const activityEphemeral: ApiEphemeralUpdate = {
    type: 'activity',
    sid: 'session-activity',
    active: true,
    activeAt: Date.now(),
    thinking: false,
};

const usageEphemeral: ApiEphemeralUpdate = {
    type: 'usage',
    sid: 'session-usage',
    key: 'cost',
    timestamp: Date.now(),
    tokens: { total: 100 },
    cost: { total: 0.01 },
};

// Machine ephemeral types now use 'machineId' consistently (HAP-655)
const machineActivityEphemeral: ApiEphemeralUpdate = {
    type: 'machine-activity',
    machineId: 'machine-activity-id',
    active: true,
    activeAt: Date.now(),
};

const machineStatusEphemeral: ApiEphemeralUpdate = {
    type: 'machine-status',
    machineId: 'machine-status-id',
    online: true,
    timestamp: Date.now(),
};

// HAP-780: Machine disconnected notification
const machineDisconnectedEphemeral: ApiEphemeralUpdate = {
    type: 'machine-disconnected',
    machineId: 'machine-disconnected-id',
    reason: 'disconnected_by_user',
    timestamp: Date.now(),
};

// =============================================================================
// Session ID Helpers Tests
// =============================================================================

describe('Session ID Helpers', () => {
    describe('hasSessionId', () => {
        it('returns true for new-session', () => {
            expect(hasSessionId(newSessionUpdate)).toBe(true);
        });

        it('returns true for update-session', () => {
            expect(hasSessionId(updateSessionUpdate)).toBe(true);
        });

        it('returns true for new-message', () => {
            expect(hasSessionId(newMessageUpdate)).toBe(true);
        });

        it('returns true for delete-session', () => {
            expect(hasSessionId(deleteSessionUpdate)).toBe(true);
        });

        it('returns false for new-machine', () => {
            expect(hasSessionId(newMachineUpdate)).toBe(false);
        });

        it('returns false for update-machine', () => {
            expect(hasSessionId(updateMachineUpdate)).toBe(false);
        });

        it('returns false for update-account', () => {
            expect(hasSessionId(accountUpdate)).toBe(false);
        });
    });

    describe('hasSessionIdEphemeral', () => {
        it('returns true for activity', () => {
            expect(hasSessionIdEphemeral(activityEphemeral)).toBe(true);
        });

        it('returns true for usage', () => {
            expect(hasSessionIdEphemeral(usageEphemeral)).toBe(true);
        });

        it('returns false for machine-activity', () => {
            expect(hasSessionIdEphemeral(machineActivityEphemeral)).toBe(false);
        });

        it('returns false for machine-status', () => {
            expect(hasSessionIdEphemeral(machineStatusEphemeral)).toBe(false);
        });
    });

    describe('getSessionId', () => {
        it('extracts sid from new-session', () => {
            expect(getSessionId(newSessionUpdate as SessionIdUpdate)).toBe('session-123');
        });

        it('extracts sid from update-session', () => {
            expect(getSessionId(updateSessionUpdate as SessionIdUpdate)).toBe('session-456');
        });

        it('extracts sid from new-message', () => {
            expect(getSessionId(newMessageUpdate as SessionIdUpdate)).toBe('session-789');
        });

        it('extracts sid from delete-session', () => {
            expect(getSessionId(deleteSessionUpdate as SessionIdUpdate)).toBe('session-deleted');
        });
    });

    describe('getSessionIdFromEphemeral', () => {
        it('extracts sid from activity', () => {
            expect(getSessionIdFromEphemeral(activityEphemeral as SessionIdEphemeral)).toBe('session-activity');
        });

        it('extracts sid from usage', () => {
            expect(getSessionIdFromEphemeral(usageEphemeral as SessionIdEphemeral)).toBe('session-usage');
        });
    });

    describe('tryGetSessionId', () => {
        it('returns session id for session updates', () => {
            expect(tryGetSessionId(newSessionUpdate)).toBe('session-123');
            expect(tryGetSessionId(updateSessionUpdate)).toBe('session-456');
            expect(tryGetSessionId(newMessageUpdate)).toBe('session-789');
            expect(tryGetSessionId(deleteSessionUpdate)).toBe('session-deleted');
        });

        it('returns undefined for non-session updates', () => {
            expect(tryGetSessionId(newMachineUpdate)).toBeUndefined();
            expect(tryGetSessionId(updateMachineUpdate)).toBeUndefined();
            expect(tryGetSessionId(accountUpdate)).toBeUndefined();
        });
    });

    describe('tryGetSessionIdFromEphemeral', () => {
        it('returns session id for session ephemeral updates', () => {
            expect(tryGetSessionIdFromEphemeral(activityEphemeral)).toBe('session-activity');
            expect(tryGetSessionIdFromEphemeral(usageEphemeral)).toBe('session-usage');
        });

        it('returns undefined for machine ephemeral updates', () => {
            expect(tryGetSessionIdFromEphemeral(machineActivityEphemeral)).toBeUndefined();
            expect(tryGetSessionIdFromEphemeral(machineStatusEphemeral)).toBeUndefined();
        });
    });
});

// =============================================================================
// Machine ID Helpers Tests
// =============================================================================

describe('Machine ID Helpers', () => {
    describe('hasMachineId', () => {
        it('returns true for new-machine', () => {
            expect(hasMachineId(newMachineUpdate)).toBe(true);
        });

        it('returns true for update-machine', () => {
            expect(hasMachineId(updateMachineUpdate)).toBe(true);
        });

        it('returns false for new-session', () => {
            expect(hasMachineId(newSessionUpdate)).toBe(false);
        });

        it('returns false for new-message', () => {
            expect(hasMachineId(newMessageUpdate)).toBe(false);
        });

        it('returns false for update-account', () => {
            expect(hasMachineId(accountUpdate)).toBe(false);
        });
    });

    describe('hasMachineIdEphemeral', () => {
        it('returns true for machine-activity', () => {
            expect(hasMachineIdEphemeral(machineActivityEphemeral)).toBe(true);
        });

        it('returns true for machine-status', () => {
            expect(hasMachineIdEphemeral(machineStatusEphemeral)).toBe(true);
        });

        it('returns true for machine-disconnected', () => {
            expect(hasMachineIdEphemeral(machineDisconnectedEphemeral)).toBe(true);
        });

        it('returns false for activity', () => {
            expect(hasMachineIdEphemeral(activityEphemeral)).toBe(false);
        });

        it('returns false for usage', () => {
            expect(hasMachineIdEphemeral(usageEphemeral)).toBe(false);
        });
    });

    describe('getMachineId', () => {
        it('extracts machineId from new-machine', () => {
            expect(getMachineId(newMachineUpdate as MachineIdUpdate)).toBe('machine-abc');
        });

        it('extracts machineId from update-machine', () => {
            expect(getMachineId(updateMachineUpdate as MachineIdUpdate)).toBe('machine-xyz');
        });
    });

    describe('getMachineIdFromEphemeral', () => {
        it('extracts machineId from machine-activity', () => {
            expect(getMachineIdFromEphemeral(machineActivityEphemeral as MachineIdEphemeral)).toBe('machine-activity-id');
        });

        it('extracts machineId from machine-status', () => {
            expect(getMachineIdFromEphemeral(machineStatusEphemeral as MachineIdEphemeral)).toBe('machine-status-id');
        });

        it('extracts machineId from machine-disconnected', () => {
            expect(getMachineIdFromEphemeral(machineDisconnectedEphemeral as MachineIdEphemeral)).toBe('machine-disconnected-id');
        });
    });

    describe('tryGetMachineId', () => {
        it('returns machine id for machine updates', () => {
            expect(tryGetMachineId(newMachineUpdate)).toBe('machine-abc');
            expect(tryGetMachineId(updateMachineUpdate)).toBe('machine-xyz');
        });

        it('returns undefined for non-machine updates', () => {
            expect(tryGetMachineId(newSessionUpdate)).toBeUndefined();
            expect(tryGetMachineId(newMessageUpdate)).toBeUndefined();
            expect(tryGetMachineId(accountUpdate)).toBeUndefined();
        });
    });

    describe('tryGetMachineIdFromEphemeral', () => {
        it('returns machine id for machine ephemeral updates', () => {
            expect(tryGetMachineIdFromEphemeral(machineActivityEphemeral)).toBe('machine-activity-id');
            expect(tryGetMachineIdFromEphemeral(machineStatusEphemeral)).toBe('machine-status-id');
            expect(tryGetMachineIdFromEphemeral(machineDisconnectedEphemeral)).toBe('machine-disconnected-id');
        });

        it('returns undefined for session ephemeral updates', () => {
            expect(tryGetMachineIdFromEphemeral(activityEphemeral)).toBeUndefined();
            expect(tryGetMachineIdFromEphemeral(usageEphemeral)).toBeUndefined();
        });
    });
});

// =============================================================================
// Type Narrowing Tests
// =============================================================================

describe('Type Narrowing', () => {
    it('narrows to SessionIdUpdate after hasSessionId check', () => {
        const update: ApiUpdate = newMessageUpdate;
        if (hasSessionId(update)) {
            // TypeScript should know this is SessionIdUpdate
            const sessionId: string = getSessionId(update);
            expect(sessionId).toBe('session-789');
        }
    });

    it('narrows to MachineIdUpdate after hasMachineId check', () => {
        const update: ApiUpdate = newMachineUpdate;
        if (hasMachineId(update)) {
            // TypeScript should know this is MachineIdUpdate
            const machineId: string = getMachineId(update);
            expect(machineId).toBe('machine-abc');
        }
    });

    it('narrows to SessionIdEphemeral after hasSessionIdEphemeral check', () => {
        const update: ApiEphemeralUpdate = activityEphemeral;
        if (hasSessionIdEphemeral(update)) {
            const sessionId: string = getSessionIdFromEphemeral(update);
            expect(sessionId).toBe('session-activity');
        }
    });

    it('narrows to MachineIdEphemeral after hasMachineIdEphemeral check', () => {
        const update: ApiEphemeralUpdate = machineStatusEphemeral;
        if (hasMachineIdEphemeral(update)) {
            const machineId: string = getMachineIdFromEphemeral(update);
            expect(machineId).toBe('machine-status-id');
        }
    });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
    it('handles empty string session IDs', () => {
        // While the schema requires min(1), the helper should still work
        const updateWithEmptySid = { ...updateSessionUpdate, sid: '' } as SessionIdUpdate;
        expect(getSessionId(updateWithEmptySid)).toBe('');
    });

    it('handles empty string machine IDs', () => {
        const updateWithEmptyId = { ...updateMachineUpdate, machineId: '' } as MachineIdUpdate;
        expect(getMachineId(updateWithEmptyId)).toBe('');
    });

    it('handles special characters in IDs', () => {
        const specialId = 'session-123-äöü-@#$%^&*()';
        const updateWithSpecialId = { ...updateSessionUpdate, sid: specialId } as SessionIdUpdate;
        expect(getSessionId(updateWithSpecialId)).toBe(specialId);
    });

    it('handles very long IDs', () => {
        const longId = 'session-' + 'x'.repeat(1000);
        const updateWithLongId = { ...updateSessionUpdate, sid: longId } as SessionIdUpdate;
        expect(getSessionId(updateWithLongId)).toBe(longId);
    });
});

// =============================================================================
// Integration-style Tests
// =============================================================================

describe('Integration Patterns', () => {
    it('supports common consumer pattern: hasSessionId + getSessionId', () => {
        const updates: ApiUpdate[] = [
            newSessionUpdate,
            newMachineUpdate,
            newMessageUpdate,
            accountUpdate,
        ];

        const sessionIds = updates
            .filter(hasSessionId)
            .map(getSessionId);

        expect(sessionIds).toEqual(['session-123', 'session-789']);
    });

    it('supports common consumer pattern: tryGetSessionId', () => {
        const updates: ApiUpdate[] = [
            newSessionUpdate,
            newMachineUpdate,
            newMessageUpdate,
            accountUpdate,
        ];

        const sessionIds = updates
            .map(tryGetSessionId)
            .filter((id): id is string => id !== undefined);

        expect(sessionIds).toEqual(['session-123', 'session-789']);
    });

    it('supports processing mixed updates', () => {
        const updates: ApiUpdate[] = [
            newSessionUpdate,
            newMachineUpdate,
            newMessageUpdate,
        ];

        const results: Array<{ type: 'session' | 'machine'; id: string }> = [];

        for (const update of updates) {
            if (hasSessionId(update)) {
                results.push({ type: 'session', id: getSessionId(update) });
            } else if (hasMachineId(update)) {
                results.push({ type: 'machine', id: getMachineId(update) });
            }
        }

        expect(results).toEqual([
            { type: 'session', id: 'session-123' },
            { type: 'machine', id: 'machine-abc' },
            { type: 'session', id: 'session-789' },
        ]);
    });
});
