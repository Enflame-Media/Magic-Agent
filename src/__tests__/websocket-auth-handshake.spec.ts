/**
 * WebSocket Auth Handshake Integration Tests (HAP-371)
 *
 * Tests the message-based WebSocket authentication flow introduced in HAP-360.
 * This flow replaces URL query param auth for browser/React Native clients
 * that cannot send custom WebSocket headers.
 *
 * Auth Flow:
 * 1. Client connects without token in URL
 * 2. Server accepts in pending-auth state
 * 3. Client sends { event: 'auth', data: { token, clientType } }
 * 4. Server validates and responds with { event: 'connected' } or { event: 'auth-error' }
 * 5. 5-second timeout on both sides
 *
 * @module __tests__/websocket-auth-handshake.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cloudflare:workers module
vi.mock('cloudflare:workers', () => ({
    DurableObject: class DurableObject {
        ctx: DurableObjectState;
        env: unknown;
        constructor(ctx: DurableObjectState, env: unknown) {
            this.ctx = ctx;
            this.env = env;
        }
    },
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
    initAuth: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'valid-token') {
            return { userId: 'test-user-123', extras: {} };
        }
        if (token === 'user2-token') {
            return { userId: 'test-user-456', extras: {} };
        }
        return null;
    }),
    createToken: vi.fn().mockResolvedValue('generated-token'),
    resetAuth: vi.fn(),
}));

import { ConnectionManager } from '@/durable-objects/ConnectionManager';
import type { ConnectionMetadata, ClientMessage } from '@/durable-objects/types';
import { CloseCode } from '@/durable-objects/types';

// Mock D1Database
const mockD1Database = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({ success: true }),
    batch: vi.fn().mockResolvedValue([]),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 }),
} as unknown as D1Database;

// Mock environment
const mockEnv = {
    HANDY_MASTER_SECRET: 'test-secret-for-vitest-tests',
    ENVIRONMENT: 'development' as const,
    DB: mockD1Database,
};

// Mock DurableObjectState
function createMockState() {
    const webSockets = new Map<WebSocket, ConnectionMetadata>();
    let currentAlarm: number | null = null;

    return {
        id: { toString: () => 'test-do-id' },
        storage: {
            get: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            list: vi.fn(),
            setAlarm: vi.fn().mockImplementation(async (timestamp: number) => {
                currentAlarm = timestamp;
            }),
            getAlarm: vi.fn().mockImplementation(async () => currentAlarm),
            deleteAlarm: vi.fn().mockImplementation(async () => {
                currentAlarm = null;
            }),
        },
        getWebSockets: vi.fn(() => Array.from(webSockets.keys())),
        acceptWebSocket: vi.fn((_ws: WebSocket, _tags?: string[]) => {
            // Track accepted WebSocket
        }),
        setWebSocketAutoResponse: vi.fn(),
        blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),

        // Test helper to trigger alarm
        _triggerAlarm: async () => {
            if (currentAlarm !== null) {
                currentAlarm = null;
            }
        },
        _getCurrentAlarm: () => currentAlarm,
    };
}

// Mock WebSocket with message tracking
function createMockWebSocket() {
    const sentMessages: string[] = [];
    let closed = false;
    let closeCode: number | undefined;
    let closeReason: string | undefined;
    let attachment: unknown = null;

    return {
        send: vi.fn((msg: string) => {
            if (closed) throw new Error('WebSocket is closed');
            sentMessages.push(msg);
        }),
        close: vi.fn((code?: number, reason?: string) => {
            closed = true;
            closeCode = code;
            closeReason = reason;
        }),
        serializeAttachment: vi.fn((data: unknown) => {
            attachment = data;
        }),
        deserializeAttachment: vi.fn(() => attachment),
        readyState: 1 as const,

        // Test helpers
        _getMessages: () => sentMessages,
        _getParsedMessages: () => sentMessages.map((m) => JSON.parse(m) as ClientMessage),
        _isClosed: () => closed,
        _getCloseCode: () => closeCode,
        _getCloseReason: () => closeReason,
        _clearMessages: () => {
            sentMessages.length = 0;
        },
    };
}

// Mock WebSocketPair
class MockWebSocketPair {
    0: ReturnType<typeof createMockWebSocket>;
    1: ReturnType<typeof createMockWebSocket>;

    constructor() {
        this[0] = createMockWebSocket();
        this[1] = createMockWebSocket();
    }
}

// Set up global mocks
vi.stubGlobal('WebSocketPair', MockWebSocketPair);
vi.stubGlobal('WebSocketRequestResponsePair', class WebSocketRequestResponsePairMock {});

describe('WebSocket Auth Handshake (HAP-360)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Auth Message Flow', () => {
        it('should accept WebSocket connection without token in pending-auth state', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/websocket', {
                method: 'GET',
                headers: { Upgrade: 'websocket' },
            });

            // HAP-360: Connections without tokens are accepted in pending-auth state
            // Node.js Response doesn't support status 101, so we expect RangeError
            try {
                await cm.fetch(request);
            } catch (error) {
                expect(error).toBeInstanceOf(RangeError);
            }

            // Verify WebSocket was accepted
            expect(state.acceptWebSocket).toHaveBeenCalled();

            // Verify auth timeout alarm was scheduled
            expect(state.storage.setAlarm).toHaveBeenCalled();
        });

        it('should authenticate via message after connection and send connected event', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            // First establish a pending-auth connection
            const request = new Request('https://do/websocket', {
                method: 'GET',
                headers: { Upgrade: 'websocket' },
            });

            try {
                await cm.fetch(request);
            } catch {
                // Expected RangeError for status 101
            }

            // Get the mock server WebSocket from the pair
            const serverWs = createMockWebSocket();

            // Manually set up connection as pending-auth
            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            // Access internal connections map for testing
            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send auth message
            const authMessage = JSON.stringify({
                event: 'auth',
                data: {
                    token: 'valid-token',
                    clientType: 'user-scoped',
                },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify 'connected' event was sent
            const messages = serverWs._getParsedMessages();
            const connectedMsg = messages.find((m: ClientMessage) => m.event === 'connected');
            expect(connectedMsg).toBeDefined();
            expect(connectedMsg?.data).toHaveProperty('connectionId');
            expect(connectedMsg?.data).toHaveProperty('userId', 'test-user-123');
            expect(connectedMsg?.data).toHaveProperty('clientType', 'user-scoped');

            // Verify connection metadata was updated
            const updatedMetadata = testAccess.connections.get(serverWs as unknown as WebSocket);
            expect(updatedMetadata?.authState).toBe('authenticated');
            expect(updatedMetadata?.userId).toBe('test-user-123');
        });

        it('should support session-scoped authentication via message', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send auth message with session-scoped type
            const authMessage = JSON.stringify({
                event: 'auth',
                data: {
                    token: 'valid-token',
                    clientType: 'session-scoped',
                    sessionId: 'session-123',
                },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify connected event includes session info
            const messages = serverWs._getParsedMessages();
            const connectedMsg = messages.find((m: ClientMessage) => m.event === 'connected');
            expect(connectedMsg?.data).toHaveProperty('clientType', 'session-scoped');
            expect(connectedMsg?.data).toHaveProperty('sessionId', 'session-123');

            // Verify metadata
            const updatedMetadata = testAccess.connections.get(serverWs as unknown as WebSocket);
            expect(updatedMetadata?.clientType).toBe('session-scoped');
            expect(updatedMetadata?.sessionId).toBe('session-123');
        });

        it('should support machine-scoped authentication via message', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send auth message with machine-scoped type
            const authMessage = JSON.stringify({
                event: 'auth',
                data: {
                    token: 'valid-token',
                    clientType: 'machine-scoped',
                    machineId: 'machine-456',
                },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify connected event includes machine info
            const messages = serverWs._getParsedMessages();
            const connectedMsg = messages.find((m: ClientMessage) => m.event === 'connected');
            expect(connectedMsg?.data).toHaveProperty('clientType', 'machine-scoped');
            expect(connectedMsg?.data).toHaveProperty('machineId', 'machine-456');

            // Note: machine-update broadcast goes to user-scoped connections only
            // In unit tests without other connections, no broadcast is observed
        });
    });

    describe('Error Scenarios', () => {
        it('should reject invalid token with auth-error event', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send auth message with invalid token
            const authMessage = JSON.stringify({
                event: 'auth',
                data: {
                    token: 'invalid-token',
                    clientType: 'user-scoped',
                },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify auth-error was sent
            const messages = serverWs._getParsedMessages();
            const errorMsg = messages.find((m: ClientMessage) => m.event === 'auth-error');
            expect(errorMsg).toBeDefined();
            expect(errorMsg?.data).toHaveProperty('code', CloseCode.AUTH_FAILED);
            expect(errorMsg?.data).toHaveProperty('message');

            // Verify connection was closed
            expect(serverWs._isClosed()).toBe(true);
            expect(serverWs._getCloseCode()).toBe(CloseCode.AUTH_FAILED);
        });

        it('should reject auth message without token', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send auth message without token
            const authMessage = JSON.stringify({
                event: 'auth',
                data: {
                    clientType: 'user-scoped',
                },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify auth-error was sent
            const messages = serverWs._getParsedMessages();
            const errorMsg = messages.find((m: ClientMessage) => m.event === 'auth-error');
            expect(errorMsg).toBeDefined();
            expect(errorMsg?.data).toHaveProperty('message');
            expect((errorMsg?.data as { message: string }).message).toContain('token');
        });

        it('should reject non-auth message before authentication', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send non-auth message (like rpc-call)
            const rpcMessage = JSON.stringify({
                event: 'rpc-call',
                data: { method: 'test', params: {} },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, rpcMessage);

            // Verify auth-error was sent
            const messages = serverWs._getParsedMessages();
            const errorMsg = messages.find((m: ClientMessage) => m.event === 'auth-error');
            expect(errorMsg).toBeDefined();
            expect(errorMsg?.data).toHaveProperty('message');
            expect((errorMsg?.data as { message: string }).message).toContain('not authenticated');
        });

        it('should require sessionId for session-scoped auth', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send session-scoped auth without sessionId
            const authMessage = JSON.stringify({
                event: 'auth',
                data: {
                    token: 'valid-token',
                    clientType: 'session-scoped',
                    // Missing sessionId
                },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify auth-error with MISSING_SESSION_ID
            const messages = serverWs._getParsedMessages();
            const errorMsg = messages.find((m: ClientMessage) => m.event === 'auth-error');
            expect(errorMsg).toBeDefined();
            expect(errorMsg?.data).toHaveProperty('code', CloseCode.MISSING_SESSION_ID);
        });

        it('should require machineId for machine-scoped auth', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'test-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Send machine-scoped auth without machineId
            const authMessage = JSON.stringify({
                event: 'auth',
                data: {
                    token: 'valid-token',
                    clientType: 'machine-scoped',
                    // Missing machineId
                },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify auth-error with MISSING_MACHINE_ID
            const messages = serverWs._getParsedMessages();
            const errorMsg = messages.find((m: ClientMessage) => m.event === 'auth-error');
            expect(errorMsg).toBeDefined();
            expect(errorMsg?.data).toHaveProperty('code', CloseCode.MISSING_MACHINE_ID);
        });
    });

    describe('Auth Timeout (Alarm)', () => {
        it('should close pending-auth connections when alarm fires', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();
            const connectionId = 'timeout-conn-id';

            const pendingMetadata: ConnectionMetadata = {
                connectionId,
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
                pendingAuthAlarms: Map<string, number>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Simulate adding to pending auth alarms (this normally happens in fetch)
            testAccess.pendingAuthAlarms.set(connectionId, Date.now() - 1000); // Already expired

            // Trigger the alarm
            await cm.alarm();

            // Verify auth-error was sent with AUTH_TIMEOUT
            const messages = serverWs._getParsedMessages();
            const errorMsg = messages.find((m: ClientMessage) => m.event === 'auth-error');
            expect(errorMsg).toBeDefined();
            expect(errorMsg?.data).toHaveProperty('code', CloseCode.AUTH_TIMEOUT);

            // Verify connection was closed
            expect(serverWs._isClosed()).toBe(true);
            expect(serverWs._getCloseCode()).toBe(CloseCode.AUTH_TIMEOUT);

            // Verify connection was removed from map
            expect(testAccess.connections.has(serverWs as unknown as WebSocket)).toBe(false);
        });

        it('should not close already-authenticated connections during alarm', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();
            const connectionId = 'auth-conn-id';

            // Create already-authenticated connection
            const authMetadata: ConnectionMetadata = {
                connectionId,
                userId: 'test-user-123',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'authenticated',
            };
            serverWs.serializeAttachment(authMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
                pendingAuthAlarms: Map<string, number>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, authMetadata);

            // Add expired alarm (shouldn't affect authenticated connection)
            testAccess.pendingAuthAlarms.set(connectionId, Date.now() - 1000);

            // Trigger the alarm
            await cm.alarm();

            // Verify connection was NOT closed (authState is not pending-auth)
            expect(serverWs._isClosed()).toBe(false);

            // Connection should still be in the map
            expect(testAccess.connections.has(serverWs as unknown as WebSocket)).toBe(true);
        });
    });

    describe('Pending-Auth Connection Isolation', () => {
        it('should exclude pending-auth connections from broadcasts', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            // Create authenticated connection
            const authWs = createMockWebSocket();
            const authMetadata: ConnectionMetadata = {
                connectionId: 'auth-conn-id',
                userId: 'test-user-123',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'authenticated',
            };
            authWs.serializeAttachment(authMetadata);

            // Create pending-auth connection
            const pendingWs = createMockWebSocket();
            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'pending-conn-id',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            pendingWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
                broadcastClientMessage: (message: ClientMessage, filter?: unknown) => number;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(authWs as unknown as WebSocket, authMetadata);
            testAccess.connections.set(pendingWs as unknown as WebSocket, pendingMetadata);

            // Broadcast to all connections
            const delivered = testAccess.broadcastClientMessage({
                event: 'test-broadcast',
                data: { test: true },
            });

            // Only authenticated connection should receive the message
            expect(delivered).toBe(1);
            expect(authWs._getMessages().length).toBe(1);
            expect(pendingWs._getMessages().length).toBe(0);
        });
    });

    describe('Backward Compatibility', () => {
        it('should still support legacy auth via URL token', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            // Request with token in URL (legacy flow)
            const request = new Request('https://do/websocket?token=valid-token', {
                method: 'GET',
                headers: { Upgrade: 'websocket' },
            });

            try {
                await cm.fetch(request);
            } catch (error) {
                // Status 101 throws in Node.js
                expect(error).toBeInstanceOf(RangeError);
            }

            // Verify WebSocket was accepted immediately (no pending-auth)
            expect(state.acceptWebSocket).toHaveBeenCalled();
        });

        it('should still support legacy auth via Authorization header', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            // Request with token in header (CLI flow)
            const request = new Request('https://do/websocket', {
                method: 'GET',
                headers: {
                    Upgrade: 'websocket',
                    Authorization: 'Bearer valid-token',
                },
            });

            try {
                await cm.fetch(request);
            } catch (error) {
                expect(error).toBeInstanceOf(RangeError);
            }

            expect(state.acceptWebSocket).toHaveBeenCalled();
        });
    });

    describe('Connection Status Transitions', () => {
        it('should transition: connecting → authenticating → connected', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const serverWs = createMockWebSocket();

            // Stage 1: connecting → authenticating (pending-auth)
            const pendingMetadata: ConnectionMetadata = {
                connectionId: 'transition-test',
                userId: '',
                clientType: 'user-scoped',
                connectedAt: Date.now(),
                lastActivityAt: Date.now(),
                authState: 'pending-auth',
            };
            serverWs.serializeAttachment(pendingMetadata);

            interface ConnectionManagerTestAccess {
                connections: Map<WebSocket, ConnectionMetadata>;
            }
            const testAccess = cm as unknown as ConnectionManagerTestAccess;
            testAccess.connections.set(serverWs as unknown as WebSocket, pendingMetadata);

            // Verify initial state
            let metadata = testAccess.connections.get(serverWs as unknown as WebSocket);
            expect(metadata?.authState).toBe('pending-auth');

            // Stage 2: authenticating → connected (send auth message)
            const authMessage = JSON.stringify({
                event: 'auth',
                data: { token: 'valid-token', clientType: 'user-scoped' },
            });

            await cm.webSocketMessage(serverWs as unknown as WebSocket, authMessage);

            // Verify final state
            metadata = testAccess.connections.get(serverWs as unknown as WebSocket);
            expect(metadata?.authState).toBe('authenticated');
            expect(metadata?.userId).toBe('test-user-123');

            // Verify connected event was sent
            const messages = serverWs._getParsedMessages();
            expect(messages.some((m: ClientMessage) => m.event === 'connected')).toBe(true);
        });
    });
});
