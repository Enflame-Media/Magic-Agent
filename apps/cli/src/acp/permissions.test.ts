/**
 * Tests for PermissionPolicyStore and PermissionHandler
 *
 * Validates: policy storage and lookup, auto-respond logic,
 * permission request handling, "always" policy creation, and event emission.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionPolicyStore, PermissionHandler } from './permissions';
import { ToolCallRegistry } from './toolcalls';
import type {
    AcpRequestPermissionRequest,
    AcpPermissionOption,
    AcpToolCall,
} from '@magic-agent/protocol';

/** Helper to create a minimal permission request */
function makePermissionRequest(overrides: {
    toolCallId?: string;
    toolKind?: string;
    title?: string;
    options?: AcpPermissionOption[];
} = {}): AcpRequestPermissionRequest {
    return {
        sessionId: 'sess-1',
        toolCall: {
            toolCallId: overrides.toolCallId ?? 'tc-1',
            title: overrides.title ?? 'Execute command',
            kind: (overrides.toolKind ?? 'execute') as AcpToolCall['kind'],
        },
        options: overrides.options ?? [
            { optionId: 'opt-allow', name: 'Allow', kind: 'allow_once' },
            { optionId: 'opt-always', name: 'Allow Always', kind: 'allow_always' },
            { optionId: 'opt-deny', name: 'Deny', kind: 'reject_once' },
            { optionId: 'opt-deny-always', name: 'Deny Always', kind: 'reject_always' },
        ],
    };
}

// ─── PermissionPolicyStore ─────────────────────────────────────────────────

describe('PermissionPolicyStore', () => {
    let store: PermissionPolicyStore;

    beforeEach(() => {
        store = new PermissionPolicyStore();
    });

    describe('setPolicy / getPolicy', () => {
        it('should store and retrieve an allow policy', () => {
            store.setPolicy('edit', 'allow');

            expect(store.getPolicy('edit')).toBe('allow');
        });

        it('should store and retrieve a reject policy', () => {
            store.setPolicy('execute', 'reject');

            expect(store.getPolicy('execute')).toBe('reject');
        });

        it('should return undefined for unknown tool kinds', () => {
            expect(store.getPolicy('unknown')).toBeUndefined();
        });

        it('should overwrite existing policies', () => {
            store.setPolicy('edit', 'allow');
            store.setPolicy('edit', 'reject');

            expect(store.getPolicy('edit')).toBe('reject');
        });
    });

    describe('hasPolicy', () => {
        it('should return true when policy exists', () => {
            store.setPolicy('read', 'allow');

            expect(store.hasPolicy('read')).toBe(true);
        });

        it('should return false when no policy exists', () => {
            expect(store.hasPolicy('read')).toBe(false);
        });
    });

    describe('autoRespond', () => {
        it('should auto-respond with allow_once when allow policy exists', () => {
            store.setPolicy('execute', 'allow');
            const request = makePermissionRequest({ toolKind: 'execute' });

            const optionId = store.autoRespond(request);

            expect(optionId).toBe('opt-allow');
        });

        it('should auto-respond with reject_once when reject policy exists', () => {
            store.setPolicy('execute', 'reject');
            const request = makePermissionRequest({ toolKind: 'execute' });

            const optionId = store.autoRespond(request);

            expect(optionId).toBe('opt-deny');
        });

        it('should return null when no policy matches', () => {
            const request = makePermissionRequest({ toolKind: 'execute' });

            expect(store.autoRespond(request)).toBeNull();
        });

        it('should return null when tool kind is missing', () => {
            store.setPolicy('execute', 'allow');
            const request = makePermissionRequest({ toolKind: undefined });
            // Override to remove kind
            (request.toolCall as Record<string, unknown>).kind = undefined;

            expect(store.autoRespond(request)).toBeNull();
        });

        it('should return null when no matching option found', () => {
            store.setPolicy('execute', 'allow');
            // Request with only reject options
            const request = makePermissionRequest({
                toolKind: 'execute',
                options: [
                    { optionId: 'opt-deny', name: 'Deny', kind: 'reject_once' },
                ],
            });

            expect(store.autoRespond(request)).toBeNull();
        });
    });

    describe('getAllPolicies', () => {
        it('should return all stored policies', () => {
            store.setPolicy('read', 'allow');
            store.setPolicy('execute', 'reject');

            const policies = store.getAllPolicies();
            expect(policies).toHaveLength(2);
        });
    });

    describe('clearPolicies', () => {
        it('should remove all policies', () => {
            store.setPolicy('read', 'allow');
            store.setPolicy('execute', 'reject');

            store.clearPolicies();

            expect(store.size).toBe(0);
            expect(store.getPolicy('read')).toBeUndefined();
        });
    });

    describe('size', () => {
        it('should return the number of stored policies', () => {
            expect(store.size).toBe(0);

            store.setPolicy('read', 'allow');
            expect(store.size).toBe(1);

            store.setPolicy('edit', 'allow');
            expect(store.size).toBe(2);
        });
    });
});

// ─── PermissionHandler ─────────────────────────────────────────────────────

describe('PermissionHandler', () => {
    let policyStore: PermissionPolicyStore;
    let registry: ToolCallRegistry;
    let handler: PermissionHandler;

    beforeEach(() => {
        policyStore = new PermissionPolicyStore();
        registry = new ToolCallRegistry();
        handler = new PermissionHandler(policyStore, registry);
    });

    describe('handleRequest - auto-respond', () => {
        it('should auto-respond when allow policy exists', async () => {
            policyStore.setPolicy('execute', 'allow');

            // Register the tool call so the registry can track it
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const response = await handler.handleRequest(makePermissionRequest());

            expect(response.outcome).toEqual({
                outcome: 'selected',
                optionId: 'opt-allow',
            });
        });

        it('should auto-respond when reject policy exists', async () => {
            policyStore.setPolicy('execute', 'reject');

            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const response = await handler.handleRequest(makePermissionRequest());

            expect(response.outcome).toEqual({
                outcome: 'selected',
                optionId: 'opt-deny',
            });
        });

        it('should emit permission:auto_responded event', async () => {
            policyStore.setPolicy('execute', 'allow');

            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const listener = vi.fn();
            handler.on('permission:auto_responded', listener);

            await handler.handleRequest(makePermissionRequest());

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    toolCallId: 'tc-1',
                    optionId: 'opt-allow',
                    policyAction: 'allow',
                }),
            );
        });

        it('should emit permission:responded event on auto-respond', async () => {
            policyStore.setPolicy('execute', 'allow');

            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const listener = vi.fn();
            handler.on('permission:responded', listener);

            await handler.handleRequest(makePermissionRequest());

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    toolCallId: 'tc-1',
                    optionId: 'opt-allow',
                    optionKind: 'allow_once',
                }),
            );
        });

        it('should clear registry permission state after auto-respond', async () => {
            policyStore.setPolicy('execute', 'allow');

            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            await handler.handleRequest(makePermissionRequest());

            const call = registry.getCall('tc-1')!;
            expect(call.permissionRequest).toBeNull();
        });
    });

    describe('handleRequest - user decision', () => {
        it('should emit permission:request when no policy matches', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            // Don't await — the handler will wait for user response
            const responsePromise = handler.handleRequest(makePermissionRequest());

            // Wait for the event to be emitted
            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            // Simulate user selecting "Allow"
            const pending = requestListener.mock.calls[0][0];
            pending.resolve('opt-allow');

            const response = await responsePromise;

            expect(response.outcome).toEqual({
                outcome: 'selected',
                optionId: 'opt-allow',
            });
        });

        it('should handle cancellation', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            const responsePromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            // Simulate cancellation
            const pending = requestListener.mock.calls[0][0];
            pending.cancel();

            const response = await responsePromise;

            expect(response.outcome).toEqual({
                outcome: 'cancelled',
            });
        });

        it('should provide pending permission details to listener', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            const responsePromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            const pending = requestListener.mock.calls[0][0];
            expect(pending.toolCallId).toBe('tc-1');
            expect(pending.options).toHaveLength(4);
            expect(pending.toolKind).toBe('execute');
            expect(typeof pending.resolve).toBe('function');
            expect(typeof pending.cancel).toBe('function');

            pending.resolve('opt-allow');
            await responsePromise;
        });

        it('should set registry permission pending state', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            const responsePromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            // Before responding, check registry state
            const call = registry.getCall('tc-1')!;
            expect(call.status).toBe('pending_permission');
            expect(call.permissionRequest).toBeDefined();

            const pending = requestListener.mock.calls[0][0];
            pending.resolve('opt-allow');
            await responsePromise;

            // After responding, permission should be cleared
            expect(registry.getCall('tc-1')!.permissionRequest).toBeNull();
        });
    });

    describe('handleRequest - policy creation from "always" options', () => {
        it('should create allow policy when user selects allow_always', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            const responsePromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            // Select "Allow Always"
            const pending = requestListener.mock.calls[0][0];
            pending.resolve('opt-always');

            await responsePromise;

            // Policy should be stored
            expect(policyStore.getPolicy('execute')).toBe('allow');
        });

        it('should create reject policy when user selects reject_always', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            const responsePromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            // Select "Deny Always"
            const pending = requestListener.mock.calls[0][0];
            pending.resolve('opt-deny-always');

            await responsePromise;

            // Policy should be stored
            expect(policyStore.getPolicy('execute')).toBe('reject');
        });

        it('should not create policy for allow_once', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            const responsePromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            // Select "Allow" (once)
            const pending = requestListener.mock.calls[0][0];
            pending.resolve('opt-allow');

            await responsePromise;

            // No policy should be created
            expect(policyStore.size).toBe(0);
        });

        it('should not create policy for reject_once', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            const responsePromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            // Select "Deny" (once)
            const pending = requestListener.mock.calls[0][0];
            pending.resolve('opt-deny');

            await responsePromise;

            // No policy should be created
            expect(policyStore.size).toBe(0);
        });
    });

    describe('handleRequest - auto-respond after policy creation', () => {
        it('should auto-respond to second request after allow_always', async () => {
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });

            const requestListener = vi.fn();
            handler.on('permission:request', requestListener);

            // First request — user selects "Allow Always"
            const firstPromise = handler.handleRequest(makePermissionRequest());

            await vi.waitFor(() => {
                expect(requestListener).toHaveBeenCalledOnce();
            });

            const pending = requestListener.mock.calls[0][0];
            pending.resolve('opt-always');
            await firstPromise;

            // Second request — should auto-respond
            registry.register({
                toolCallId: 'tc-2',
                title: 'Execute another',
                kind: 'execute',
                status: 'pending',
            });

            const secondResponse = await handler.handleRequest(
                makePermissionRequest({ toolCallId: 'tc-2' }),
            );

            expect(secondResponse.outcome).toEqual({
                outcome: 'selected',
                optionId: 'opt-allow',
            });

            // requestListener should NOT have been called again
            expect(requestListener).toHaveBeenCalledOnce();
        });
    });

    describe('without registry', () => {
        it('should work without a registry', async () => {
            const handlerNoRegistry = new PermissionHandler(policyStore);
            policyStore.setPolicy('execute', 'allow');

            const response = await handlerNoRegistry.handleRequest(makePermissionRequest());

            expect(response.outcome).toEqual({
                outcome: 'selected',
                optionId: 'opt-allow',
            });
        });
    });

    describe('policies accessor', () => {
        it('should expose the policy store', () => {
            expect(handler.policies).toBe(policyStore);
        });
    });

    describe('event management', () => {
        it('should support removing listeners with off()', () => {
            const listener = vi.fn();
            handler.on('permission:responded', listener);
            handler.off('permission:responded', listener);

            // Trigger via auto-respond
            policyStore.setPolicy('execute', 'allow');
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });
            handler.handleRequest(makePermissionRequest());

            expect(listener).not.toHaveBeenCalled();
        });

        it('should remove all listeners', () => {
            const listener = vi.fn();
            handler.on('permission:responded', listener);
            handler.on('permission:auto_responded', listener);

            handler.removeAllListeners();

            policyStore.setPolicy('execute', 'allow');
            registry.register({
                toolCallId: 'tc-1',
                title: 'Execute command',
                kind: 'execute',
                status: 'pending',
            });
            handler.handleRequest(makePermissionRequest());

            expect(listener).not.toHaveBeenCalled();
        });
    });
});
