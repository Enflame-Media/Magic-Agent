/**
 * Integration Tests for ACP Relay Handlers (HAP-1063)
 *
 * Tests the three ACP relay paths that forward encrypted messages between
 * CLI machines and mobile/web apps via the Workers server:
 *
 * 1. acp-session-update: CLI → user-scoped/session-scoped connections
 * 2. acp-permission-request: CLI → user-scoped connections (mobile/web)
 * 3. acp-permission-response: Mobile → all connections except sender
 *
 * Each relay path is tested for:
 * - Successful relay with correct broadcast filter
 * - Session ownership validation (reject for non-owned sessions)
 * - Malformed payload handling (missing/invalid fields)
 * - Sender exclusion verification (correct filter type)
 *
 * @module durable-objects/acp-relay.spec
 * @see HAP-1050 - ACP relay support implementation
 * @see HAP-1063 - Integration tests for ACP relay
 */

import { describe, it, expect, vi } from 'vitest';
import type { HandlerContext } from './handlers';
import {
    handleAcpSessionUpdate,
    handleAcpPermissionRequest,
    handleAcpPermissionResponse,
} from './handlers';

// =============================================================================
// MOCK HELPERS
// =============================================================================

interface MockDbSelectResult {
    from: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock database client that mimics Drizzle ORM behavior.
 *
 * Follows the same pattern as handlers.spec.ts for consistency.
 */
function createMockDb() {
    let selectResults: unknown[] = [];
    const selectResultsQueue: unknown[][] = [];
    let selectCallIndex = 0;

    const mockFrom = vi.fn(() => ({
        where: vi.fn(() => {
            const results = selectResultsQueue.length > 0 && selectCallIndex < selectResultsQueue.length
                ? selectResultsQueue[selectCallIndex++]
                : selectResults;

            return {
                then: (resolve: (value: unknown[] | undefined) => void, reject?: (reason: unknown) => void) => {
                    return Promise.resolve(results).then(resolve, reject);
                },
                limit: vi.fn(async () => results),
            };
        }),
    }));

    const db = {
        select: vi.fn((): MockDbSelectResult => ({
            from: mockFrom,
        })),
        update: vi.fn(),
        insert: vi.fn(),
        delete: vi.fn(),
        // Test helpers
        _setSelectResults: (results: unknown[]) => {
            selectResults = results;
        },
        _queueSelectResults: (resultsArray: unknown[][]) => {
            selectResultsQueue.length = 0;
            selectCallIndex = 0;
            resultsArray.forEach(r => selectResultsQueue.push(r));
        },
        _mockFrom: mockFrom,
    };

    return db;
}

/**
 * Create a basic handler context for testing
 */
function createContext(overrides: Partial<HandlerContext> = {}): HandlerContext {
    return {
        userId: 'test-user-123',
        db: createMockDb() as unknown as HandlerContext['db'],
        ...overrides,
    };
}

/**
 * Helper to set up a context where the session exists and belongs to the user
 */
function createContextWithOwnedSession(): HandlerContext {
    const ctx = createContext();
    (ctx.db as unknown as ReturnType<typeof createMockDb>)._setSelectResults([{ id: 'session-abc' }]);
    return ctx;
}

/**
 * Helper to set up a context where the session does NOT belong to the user
 */
function createContextWithNoSession(): HandlerContext {
    const ctx = createContext();
    (ctx.db as unknown as ReturnType<typeof createMockDb>)._setSelectResults([]);
    return ctx;
}

// =============================================================================
// ACP SESSION UPDATE TESTS
// =============================================================================

describe('ACP Relay Handlers', () => {
    describe('handleAcpSessionUpdate', () => {
        it('should relay update to all interested connections when session is owned', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, {
                sid: 'session-abc',
                update: 'encrypted-acp-update-blob',
            });

            expect(result.ephemeral).toBeDefined();
            expect(result.ephemeral!.message).toEqual({
                event: 'ephemeral',
                data: {
                    type: 'acp-session-update',
                    sid: 'session-abc',
                    update: 'encrypted-acp-update-blob',
                },
            });
            // Verify filter targets user-scoped + session-scoped, excludes machine-scoped
            expect(result.ephemeral!.filter).toEqual({
                type: 'all-interested-in-session',
                sessionId: 'session-abc',
            });
        });

        it('should reject relay for non-owned session', async () => {
            const ctx = createContextWithNoSession();

            const result = await handleAcpSessionUpdate(ctx, {
                sid: 'session-not-mine',
                update: 'encrypted-data',
            });

            // No ephemeral broadcast should be generated
            expect(result.ephemeral).toBeUndefined();
            expect(result.broadcast).toBeUndefined();
        });

        it('should reject malformed payload with missing sid', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, {
                update: 'encrypted-data',
            });

            expect(result.ephemeral).toBeUndefined();
            // DB should not be queried for invalid payloads
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject malformed payload with missing update', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, {
                sid: 'session-abc',
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject payload with non-string sid', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, {
                sid: 12345,
                update: 'encrypted-data',
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject payload with non-string update', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, {
                sid: 'session-abc',
                update: { nested: 'object' },
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject undefined payload', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, undefined);

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject null payload', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, null);

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject empty string fields', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpSessionUpdate(ctx, {
                sid: '',
                update: '',
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });
    });

    // =============================================================================
    // ACP PERMISSION REQUEST TESTS
    // =============================================================================

    describe('handleAcpPermissionRequest', () => {
        it('should relay permission request to user-scoped connections when session is owned', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: 'session-abc',
                requestId: 'req-123',
                payload: 'encrypted-permission-request',
            });

            expect(result.ephemeral).toBeDefined();
            expect(result.ephemeral!.message).toEqual({
                event: 'ephemeral',
                data: {
                    type: 'acp-permission-request',
                    sid: 'session-abc',
                    requestId: 'req-123',
                    payload: 'encrypted-permission-request',
                },
            });
            // Verify filter targets only user-scoped (mobile/web apps)
            expect(result.ephemeral!.filter).toEqual({
                type: 'user-scoped-only',
            });
        });

        it('should include optional timeoutMs in relay', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: 'session-abc',
                requestId: 'req-123',
                payload: 'encrypted-permission-request',
                timeoutMs: 30000,
            });

            expect(result.ephemeral).toBeDefined();
            expect(result.ephemeral!.message.data).toEqual(
                expect.objectContaining({
                    timeoutMs: 30000,
                })
            );
        });

        it('should omit timeoutMs when not provided', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: 'session-abc',
                requestId: 'req-123',
                payload: 'encrypted-data',
            });

            expect(result.ephemeral).toBeDefined();
            expect(result.ephemeral!.message.data).not.toHaveProperty('timeoutMs');
        });

        it('should reject relay for non-owned session', async () => {
            const ctx = createContextWithNoSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: 'session-not-mine',
                requestId: 'req-123',
                payload: 'encrypted-data',
            });

            expect(result.ephemeral).toBeUndefined();
        });

        it('should reject malformed payload with missing sid', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                requestId: 'req-123',
                payload: 'encrypted-data',
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject malformed payload with missing requestId', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: 'session-abc',
                payload: 'encrypted-data',
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject malformed payload with missing payload field', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: 'session-abc',
                requestId: 'req-123',
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject payload with non-string fields', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: 123,
                requestId: true,
                payload: { obj: true },
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject undefined payload', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, undefined);

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject empty string fields', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionRequest(ctx, {
                sid: '',
                requestId: '',
                payload: '',
            });

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });
    });

    // =============================================================================
    // ACP PERMISSION RESPONSE TESTS
    // =============================================================================

    describe('handleAcpPermissionResponse', () => {
        const senderConnectionId = 'conn-sender-456';

        it('should relay response to all connections except sender when session is owned', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    sid: 'session-abc',
                    requestId: 'req-123',
                    payload: 'encrypted-permission-response',
                },
                senderConnectionId
            );

            expect(result.ephemeral).toBeDefined();
            expect(result.ephemeral!.message).toEqual({
                event: 'ephemeral',
                data: {
                    type: 'acp-permission-response',
                    sid: 'session-abc',
                    requestId: 'req-123',
                    payload: 'encrypted-permission-response',
                },
            });
            // Verify sender exclusion filter
            expect(result.ephemeral!.filter).toEqual({
                type: 'exclude',
                connectionId: senderConnectionId,
            });
        });

        it('should use the correct sender connection ID for exclusion', async () => {
            const ctx = createContextWithOwnedSession();
            const differentSenderId = 'conn-different-789';

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    sid: 'session-abc',
                    requestId: 'req-123',
                    payload: 'encrypted-data',
                },
                differentSenderId
            );

            expect(result.ephemeral).toBeDefined();
            expect(result.ephemeral!.filter).toEqual({
                type: 'exclude',
                connectionId: differentSenderId,
            });
        });

        it('should reject relay for non-owned session', async () => {
            const ctx = createContextWithNoSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    sid: 'session-not-mine',
                    requestId: 'req-123',
                    payload: 'encrypted-data',
                },
                senderConnectionId
            );

            expect(result.ephemeral).toBeUndefined();
        });

        it('should reject malformed payload with missing sid', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    requestId: 'req-123',
                    payload: 'encrypted-data',
                },
                senderConnectionId
            );

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject malformed payload with missing requestId', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    sid: 'session-abc',
                    payload: 'encrypted-data',
                },
                senderConnectionId
            );

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject malformed payload with missing payload field', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    sid: 'session-abc',
                    requestId: 'req-123',
                },
                senderConnectionId
            );

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject payload with non-string fields', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    sid: 42,
                    requestId: null,
                    payload: undefined,
                },
                senderConnectionId
            );

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject undefined payload', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                undefined,
                senderConnectionId
            );

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });

        it('should reject empty string fields', async () => {
            const ctx = createContextWithOwnedSession();

            const result = await handleAcpPermissionResponse(
                ctx,
                {
                    sid: '',
                    requestId: '',
                    payload: '',
                },
                senderConnectionId
            );

            expect(result.ephemeral).toBeUndefined();
            expect(ctx.db.select).not.toHaveBeenCalled();
        });
    });
});
