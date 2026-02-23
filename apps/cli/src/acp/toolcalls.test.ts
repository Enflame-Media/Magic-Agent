/**
 * Tests for ToolCallRegistry
 *
 * Validates tool call lifecycle tracking: registration, status updates,
 * permission-pending state, event emission, and query methods.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolCallRegistry } from './toolcalls';
import type { AcpToolCall, AcpToolCallUpdate, AcpRequestPermissionRequest } from '@magic-agent/protocol';

/** Helper to create a minimal tool call */
function makeToolCall(overrides: Partial<AcpToolCall> = {}): AcpToolCall {
    return {
        toolCallId: 'tc-1',
        title: 'Read file',
        kind: 'read',
        status: 'pending',
        ...overrides,
    };
}

/** Helper to create a minimal tool call update */
function makeUpdate(overrides: Partial<AcpToolCallUpdate> = {}): AcpToolCallUpdate {
    return {
        toolCallId: 'tc-1',
        ...overrides,
    };
}

/** Helper to create a minimal permission request */
function makePermissionRequest(
    toolCallId = 'tc-1',
    toolKind = 'execute',
): AcpRequestPermissionRequest {
    return {
        sessionId: 'sess-1',
        toolCall: {
            toolCallId,
            title: 'Run command',
            kind: toolKind as AcpToolCall['kind'],
        },
        options: [
            { optionId: 'opt-allow', name: 'Allow', kind: 'allow_once' },
            { optionId: 'opt-always', name: 'Allow Always', kind: 'allow_always' },
            { optionId: 'opt-deny', name: 'Deny', kind: 'reject_once' },
            { optionId: 'opt-deny-always', name: 'Deny Always', kind: 'reject_always' },
        ],
    };
}

describe('ToolCallRegistry', () => {
    let registry: ToolCallRegistry;

    beforeEach(() => {
        registry = new ToolCallRegistry();
    });

    // ─── Registration ──────────────────────────────────────────────────

    describe('register', () => {
        it('should register a new tool call', () => {
            registry.register(makeToolCall());

            const call = registry.getCall('tc-1');
            expect(call).toBeDefined();
            expect(call!.toolCallId).toBe('tc-1');
            expect(call!.title).toBe('Read file');
            expect(call!.kind).toBe('read');
            expect(call!.status).toBe('pending');
        });

        it('should set default status to pending when not provided', () => {
            registry.register(makeToolCall({ status: undefined }));

            expect(registry.getCall('tc-1')!.status).toBe('pending');
        });

        it('should capture content and locations', () => {
            registry.register(makeToolCall({
                content: [{ type: 'content', content: { type: 'text', text: 'file contents' } }],
                locations: [{ path: '/src/index.ts', line: 1 }],
            }));

            const call = registry.getCall('tc-1')!;
            expect(call.content).toHaveLength(1);
            expect(call.locations).toHaveLength(1);
            expect(call.locations[0].path).toBe('/src/index.ts');
        });

        it('should capture rawInput and rawOutput', () => {
            registry.register(makeToolCall({
                rawInput: { path: '/src/index.ts' },
                rawOutput: { success: true },
            }));

            const call = registry.getCall('tc-1')!;
            expect(call.rawInput).toEqual({ path: '/src/index.ts' });
            expect(call.rawOutput).toEqual({ success: true });
        });

        it('should emit registered event', () => {
            const listener = vi.fn();
            registry.on('registered', listener);

            registry.register(makeToolCall());

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    toolCallId: 'tc-1',
                    title: 'Read file',
                }),
            );
        });

        it('should set timestamps on registration', () => {
            registry.register(makeToolCall());

            const call = registry.getCall('tc-1')!;
            expect(call.registeredAt).toBeGreaterThan(0);
            expect(call.updatedAt).toBe(call.registeredAt);
        });
    });

    // ─── Updates ───────────────────────────────────────────────────────

    describe('update', () => {
        it('should update status', () => {
            registry.register(makeToolCall());
            registry.update(makeUpdate({ status: 'in_progress' }));

            expect(registry.getCall('tc-1')!.status).toBe('in_progress');
        });

        it('should update title', () => {
            registry.register(makeToolCall());
            registry.update(makeUpdate({ title: 'Read file (updated)' }));

            expect(registry.getCall('tc-1')!.title).toBe('Read file (updated)');
        });

        it('should update kind', () => {
            registry.register(makeToolCall());
            registry.update(makeUpdate({ kind: 'edit' }));

            expect(registry.getCall('tc-1')!.kind).toBe('edit');
        });

        it('should not overwrite fields with undefined', () => {
            registry.register(makeToolCall({ kind: 'read' }));
            registry.update(makeUpdate({ status: 'in_progress' }));

            expect(registry.getCall('tc-1')!.kind).toBe('read');
            expect(registry.getCall('tc-1')!.title).toBe('Read file');
        });

        it('should emit updated event', () => {
            registry.register(makeToolCall());
            const listener = vi.fn();
            registry.on('updated', listener);

            registry.update(makeUpdate({ status: 'in_progress' }));

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'in_progress' }),
            );
        });

        it('should emit completed event when status is completed', () => {
            registry.register(makeToolCall());
            const completedListener = vi.fn();
            registry.on('completed', completedListener);

            registry.update(makeUpdate({ status: 'completed' }));

            expect(completedListener).toHaveBeenCalledOnce();
            expect(completedListener).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'completed' }),
            );
        });

        it('should emit failed event when status is failed', () => {
            registry.register(makeToolCall());
            const failedListener = vi.fn();
            registry.on('failed', failedListener);

            registry.update(makeUpdate({ status: 'failed' }));

            expect(failedListener).toHaveBeenCalledOnce();
        });

        it('should auto-register unknown tool calls', () => {
            const listener = vi.fn();
            registry.on('registered', listener);

            registry.update(makeUpdate({
                toolCallId: 'tc-unknown',
                title: 'Auto-registered',
                status: 'in_progress',
            }));

            expect(registry.getCall('tc-unknown')).toBeDefined();
            expect(listener).toHaveBeenCalledOnce();
        });

        it('should update updatedAt timestamp', () => {
            registry.register(makeToolCall());
            const initialTime = registry.getCall('tc-1')!.updatedAt;

            // Small delay to ensure time difference
            registry.update(makeUpdate({ status: 'in_progress' }));

            expect(registry.getCall('tc-1')!.updatedAt).toBeGreaterThanOrEqual(initialTime);
        });
    });

    // ─── Permission State ──────────────────────────────────────────────

    describe('permission state', () => {
        it('should set permission pending status', () => {
            registry.register(makeToolCall());
            registry.setPermissionPending(makePermissionRequest());

            const call = registry.getCall('tc-1')!;
            expect(call.status).toBe('pending_permission');
            expect(call.permissionRequest).toBeDefined();
        });

        it('should emit permission_pending event', () => {
            registry.register(makeToolCall());
            const listener = vi.fn();
            registry.on('permission_pending', listener);

            registry.setPermissionPending(makePermissionRequest());

            expect(listener).toHaveBeenCalledOnce();
        });

        it('should clear permission state', () => {
            registry.register(makeToolCall());
            registry.setPermissionPending(makePermissionRequest());
            registry.clearPermission('tc-1');

            expect(registry.getCall('tc-1')!.permissionRequest).toBeNull();
        });

        it('should handle permission for unknown tool call gracefully', () => {
            // Should not throw
            registry.setPermissionPending(makePermissionRequest('tc-unknown'));
        });
    });

    // ─── Query Methods ─────────────────────────────────────────────────

    describe('query methods', () => {
        beforeEach(() => {
            registry.register(makeToolCall({ toolCallId: 'tc-1', status: 'pending' }));
            registry.register(makeToolCall({ toolCallId: 'tc-2', title: 'Write file', status: 'in_progress' }));
            registry.register(makeToolCall({ toolCallId: 'tc-3', title: 'Run test', status: 'completed' }));
            registry.register(makeToolCall({ toolCallId: 'tc-4', title: 'Search', status: 'failed' }));
        });

        it('should return all calls', () => {
            expect(registry.getAllCalls()).toHaveLength(4);
        });

        it('should return active calls (not completed or failed)', () => {
            const active = registry.getActiveCalls();
            expect(active).toHaveLength(2);
            expect(active.map((c) => c.toolCallId)).toEqual(['tc-1', 'tc-2']);
        });

        it('should return pending permission calls', () => {
            registry.setPermissionPending(makePermissionRequest('tc-1'));

            const pending = registry.getPendingPermissions();
            expect(pending).toHaveLength(1);
            expect(pending[0].toolCallId).toBe('tc-1');
        });

        it('should return correct size', () => {
            expect(registry.size).toBe(4);
        });
    });

    // ─── Reset ─────────────────────────────────────────────────────────

    describe('reset', () => {
        it('should clear all tracked tool calls', () => {
            registry.register(makeToolCall());
            registry.register(makeToolCall({ toolCallId: 'tc-2' }));

            registry.reset();

            expect(registry.size).toBe(0);
            expect(registry.getCall('tc-1')).toBeUndefined();
        });
    });

    // ─── Event Management ──────────────────────────────────────────────

    describe('event management', () => {
        it('should support multiple listeners for same event', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            registry.on('registered', listener1);
            registry.on('registered', listener2);

            registry.register(makeToolCall());

            expect(listener1).toHaveBeenCalledOnce();
            expect(listener2).toHaveBeenCalledOnce();
        });

        it('should remove specific listener with off()', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            registry.on('registered', listener1);
            registry.on('registered', listener2);
            registry.off('registered', listener1);

            registry.register(makeToolCall());

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalledOnce();
        });

        it('should remove all listeners', () => {
            const listener = vi.fn();
            registry.on('registered', listener);
            registry.on('completed', listener);

            registry.removeAllListeners();

            registry.register(makeToolCall());
            registry.update(makeUpdate({ status: 'completed' }));

            expect(listener).not.toHaveBeenCalled();
        });

        it('should catch and log listener errors without throwing', () => {
            const errorListener = vi.fn(() => {
                throw new Error('Listener failed');
            });
            const normalListener = vi.fn();

            registry.on('registered', errorListener);
            registry.on('registered', normalListener);

            registry.register(makeToolCall());

            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();
        });
    });

    // ─── Full Lifecycle ────────────────────────────────────────────────

    describe('full lifecycle', () => {
        it('should track a tool call through pending → in_progress → completed', () => {
            const events: string[] = [];

            registry.on('registered', () => events.push('registered'));
            registry.on('updated', (s) => events.push(`updated:${s.status}`));
            registry.on('completed', () => events.push('completed'));

            registry.register(makeToolCall({ status: 'pending' }));
            registry.update(makeUpdate({ status: 'in_progress' }));
            registry.update(makeUpdate({ status: 'completed' }));

            expect(events).toEqual([
                'registered',
                'updated:in_progress',
                'updated:completed',
                'completed',
            ]);
        });

        it('should track a tool call with permission pause', () => {
            const events: string[] = [];

            registry.on('registered', () => events.push('registered'));
            registry.on('permission_pending', () => events.push('permission_pending'));
            registry.on('updated', (s) => events.push(`updated:${s.status}`));
            registry.on('completed', () => events.push('completed'));

            registry.register(makeToolCall({ status: 'pending' }));
            registry.setPermissionPending(makePermissionRequest());
            registry.clearPermission('tc-1');
            registry.update(makeUpdate({ status: 'in_progress' }));
            registry.update(makeUpdate({ status: 'completed' }));

            expect(events).toEqual([
                'registered',
                'permission_pending',
                'updated:in_progress',
                'updated:completed',
                'completed',
            ]);
        });
    });
});
