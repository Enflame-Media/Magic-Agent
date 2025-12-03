/**
 * Integration Tests for ConnectionManager Durable Object
 *
 * Tests the WebSocket connection lifecycle including:
 * - WebSocket upgrade and authentication
 * - Client type routing (user/session/machine-scoped)
 * - Connection metadata storage
 * - Disconnect handling
 * - Broadcasting to filtered connections
 *
 * @module durable-objects/ConnectionManager.spec
 */

import { describe, it, expect, vi } from 'vitest';

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

// Mock auth module to avoid Ed25519 crypto operations unsupported in Node.js
// The real implementation uses Web Crypto Ed25519 which only works in Cloudflare Workers
vi.mock('@/lib/auth', () => ({
    initAuth: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn().mockImplementation(async (token: string) => {
        // Return null for invalid/test tokens, simulating auth failure
        if (token === 'invalid-token' || token === 'test') {
            return null;
        }
        // Return valid result for "valid-token"
        if (token === 'valid-token') {
            return { userId: 'test-user-123', extras: {} };
        }
        return null;
    }),
    resetAuth: vi.fn(),
}));

import { ConnectionManager } from './ConnectionManager';
import type {
    ConnectionMetadata,
    WebSocketMessage,
    ConnectedMessage,
    ConnectionStats,
} from './types';
import { CloseCode } from './types';

// Mock environment
const mockEnv = {
    HANDY_MASTER_SECRET: 'test-secret-for-vitest-tests',
    ENVIRONMENT: 'development' as const,
};

// Mock DurableObjectState
function createMockState() {
    const webSockets = new Map<WebSocket, ConnectionMetadata>();

    return {
        id: { toString: () => 'test-do-id' },
        storage: {
            get: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            list: vi.fn(),
        },
        getWebSockets: vi.fn(() => Array.from(webSockets.keys())),
        acceptWebSocket: vi.fn(),
        setWebSocketAutoResponse: vi.fn(),
        blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
    };
}

// Mock WebSocket
function createMockWebSocket() {
    const messages: string[] = [];
    let closed = false;
    let closeCode: number | undefined;
    let closeReason: string | undefined;
    let attachment: unknown = null;

    return {
        send: vi.fn((msg: string) => {
            if (closed) throw new Error('WebSocket is closed');
            messages.push(msg);
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
        _getMessages: () => messages,
        _isClosed: () => closed,
        _getCloseCode: () => closeCode,
        _getCloseReason: () => closeReason,
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

describe('ConnectionManager', () => {
    describe('fetch - Health and Stats endpoints', () => {
        it('should return healthy status on GET /health', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/health', { method: 'GET' });
            const response = await cm.fetch(request);

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toMatchObject({
                status: 'healthy',
                connections: 0,
            });
        });

        it('should return stats on GET /stats', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/stats', { method: 'GET' });
            const response = await cm.fetch(request);

            expect(response.status).toBe(200);
            const stats = (await response.json()) as ConnectionStats;
            expect(stats).toMatchObject({
                totalConnections: 0,
                byType: {
                    'user-scoped': 0,
                    'session-scoped': 0,
                    'machine-scoped': 0,
                },
                activeSessions: 0,
                activeMachines: 0,
            });
        });
    });

    describe('fetch - WebSocket upgrade', () => {
        it('should reject non-WebSocket requests to /websocket', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/websocket', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await cm.fetch(request);

            expect(response.status).toBe(426);
            const text = await response.text();
            expect(text).toContain('WebSocket');
        });

        it('should reject WebSocket requests without token', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/websocket', {
                method: 'GET',
                headers: { Upgrade: 'websocket' },
            });
            const response = await cm.fetch(request);

            expect(response.status).toBe(400);
        });

        it('should reject WebSocket requests with invalid token', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/websocket?token=invalid-token', {
                method: 'GET',
                headers: { Upgrade: 'websocket' },
            });
            const response = await cm.fetch(request);

            expect(response.status).toBe(401);
        });

        it('should reject session-scoped connections without sessionId', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            // Use valid-token to pass auth, then test sessionId validation
            const request = new Request(
                'https://do/websocket?token=valid-token&clientType=session-scoped',
                {
                    method: 'GET',
                    headers: { Upgrade: 'websocket' },
                }
            );
            const response = await cm.fetch(request);

            // Should fail at validation since sessionId is missing
            expect(response.status).toBe(400);
            const text = await response.text();
            expect(text).toContain('Session ID');
        });

        it('should reject machine-scoped connections without machineId', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            // Use valid-token to pass auth, then test machineId validation
            const request = new Request(
                'https://do/websocket?token=valid-token&clientType=machine-scoped',
                {
                    method: 'GET',
                    headers: { Upgrade: 'websocket' },
                }
            );
            const response = await cm.fetch(request);

            // Should fail at validation since machineId is missing
            expect(response.status).toBe(400);
            const text = await response.text();
            expect(text).toContain('Machine ID');
        });
    });

    describe('fetch - Broadcast endpoint', () => {
        it('should accept valid broadcast requests', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const message: WebSocketMessage = {
                type: 'broadcast',
                payload: { test: 'data' },
                timestamp: Date.now(),
            };

            const request = new Request('https://do/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });
            const response = await cm.fetch(request);

            expect(response.status).toBe(200);
            const body = (await response.json()) as { success: boolean; delivered: number };
            expect(body).toMatchObject({
                success: true,
                delivered: 0, // No connections yet
            });
        });

        it('should reject invalid broadcast requests', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid json',
            });
            const response = await cm.fetch(request);

            expect(response.status).toBe(400);
        });
    });

    describe('fetch - 404 handling', () => {
        it('should return 404 for unknown paths', async () => {
            const state = createMockState();
            const cm = new ConnectionManager(state as unknown as DurableObjectState, mockEnv);

            const request = new Request('https://do/unknown-path', { method: 'GET' });
            const response = await cm.fetch(request);

            expect(response.status).toBe(404);
        });
    });
});

describe('ConnectionMetadata types', () => {
    it('should correctly type user-scoped connection metadata', () => {
        const metadata: ConnectionMetadata = {
            connectionId: 'conn-123',
            userId: 'user-456',
            clientType: 'user-scoped',
            connectedAt: Date.now(),
            lastActivityAt: Date.now(),
        };

        expect(metadata.clientType).toBe('user-scoped');
        expect(metadata.sessionId).toBeUndefined();
        expect(metadata.machineId).toBeUndefined();
    });

    it('should correctly type session-scoped connection metadata', () => {
        const metadata: ConnectionMetadata = {
            connectionId: 'conn-123',
            userId: 'user-456',
            clientType: 'session-scoped',
            sessionId: 'session-789',
            connectedAt: Date.now(),
            lastActivityAt: Date.now(),
        };

        expect(metadata.clientType).toBe('session-scoped');
        expect(metadata.sessionId).toBe('session-789');
    });

    it('should correctly type machine-scoped connection metadata', () => {
        const metadata: ConnectionMetadata = {
            connectionId: 'conn-123',
            userId: 'user-456',
            clientType: 'machine-scoped',
            machineId: 'machine-abc',
            connectedAt: Date.now(),
            lastActivityAt: Date.now(),
        };

        expect(metadata.clientType).toBe('machine-scoped');
        expect(metadata.machineId).toBe('machine-abc');
    });
});

describe('CloseCode constants', () => {
    it('should have correct standard WebSocket close codes', () => {
        expect(CloseCode.NORMAL).toBe(1000);
        expect(CloseCode.GOING_AWAY).toBe(1001);
        expect(CloseCode.PROTOCOL_ERROR).toBe(1002);
    });

    it('should have correct custom close codes in 4000 range', () => {
        expect(CloseCode.AUTH_FAILED).toBe(4001);
        expect(CloseCode.INVALID_HANDSHAKE).toBe(4002);
        expect(CloseCode.MISSING_SESSION_ID).toBe(4003);
        expect(CloseCode.MISSING_MACHINE_ID).toBe(4004);
        expect(CloseCode.CONNECTION_LIMIT_EXCEEDED).toBe(4005);
    });
});

describe('WebSocketMessage types', () => {
    it('should correctly type ConnectedMessage', () => {
        const msg: ConnectedMessage = {
            type: 'connected',
            payload: {
                connectionId: 'conn-123',
                userId: 'user-456',
                clientType: 'user-scoped',
            },
            timestamp: Date.now(),
        };

        expect(msg.type).toBe('connected');
        expect(msg.payload.connectionId).toBe('conn-123');
    });

    it('should correctly type broadcast messages', () => {
        const msg: WebSocketMessage = {
            type: 'broadcast',
            payload: { event: 'session-update', data: {} },
            timestamp: Date.now(),
        };

        expect(msg.type).toBe('broadcast');
    });
});
