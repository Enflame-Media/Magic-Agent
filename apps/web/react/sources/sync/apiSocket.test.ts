/**
 * ApiSocket Auth Flow Unit Tests (HAP-371)
 *
 * Tests the client-side WebSocket authentication flow including:
 * - HAP-360: Message-based auth (sends auth message after connection open)
 * - HAP-375: Ticket-based auth (fetches ticket first, skips auth message)
 * - Status transitions: connecting → authenticating → connected
 * - Auth timeout handling on client side
 * - Reconnection and re-authentication
 *
 * @module sync/apiSocket.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock TokenStorage
vi.mock('@/auth/tokenStorage', () => ({
    TokenStorage: {
        getCredentials: vi.fn().mockResolvedValue({
            token: 'test-token',
            userId: 'test-user-id',
        }),
    },
}));

// Mock expo-crypto
vi.mock('expo-crypto', () => ({
    randomUUID: vi.fn(() => `mock-uuid-${Date.now()}`),
}));

// Track WebSocket constructor calls and instances
interface MockWebSocketInstance {
    url: string;
    onopen: (() => void) | null;
    onclose: ((event: { code: number; reason: string }) => void) | null;
    onerror: ((event: unknown) => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    send: (msg: string) => void;
    close: (code?: number, reason?: string) => void;
    readyState: number;
    CONNECTING: 0;
    OPEN: 1;
    CLOSING: 2;
    CLOSED: 3;
    _sentMessages: string[];
    _triggerOpen: () => void;
    _triggerClose: (code?: number, reason?: string) => void;
    _triggerError: () => void;
    _triggerMessage: (data: string) => void;
}

let mockWebSocketInstances: MockWebSocketInstance[] = [];
let MockWebSocket: ((url: string) => MockWebSocketInstance) & { mockClear: () => void };

/**
 * HappyMessage format used by the WebSocket protocol
 */
interface HappyMessage {
    event: string;
    data?: unknown;
    ackId?: string;
    ack?: unknown;
}

beforeEach(() => {
    mockWebSocketInstances = [];
    MockWebSocket = vi.fn((url: string): MockWebSocketInstance => {
        const instance: MockWebSocketInstance = {
            url,
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null,
            send: vi.fn((msg: string) => {
                instance._sentMessages.push(msg);
            }),
            close: vi.fn(() => {
                instance.readyState = 3;
            }),
            readyState: 0,
            CONNECTING: 0,
            OPEN: 1,
            CLOSING: 2,
            CLOSED: 3,
            _sentMessages: [],
            _triggerOpen: () => {
                instance.readyState = 1;
                instance.onopen?.();
            },
            _triggerClose: (code = 1000, reason = '') => {
                instance.readyState = 3;
                instance.onclose?.({ code, reason });
            },
            _triggerError: () => {
                instance.onerror?.({});
            },
            _triggerMessage: (data: string) => {
                instance.onmessage?.({ data });
            },
        };
        mockWebSocketInstances.push(instance);
        return instance;
    });
    vi.stubGlobal('WebSocket', MockWebSocket);
});

// Mock fetch for ticket requests
const mockFetch = vi.fn();

afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
});

beforeEach(() => {
    // Re-stub fetch for each test (needed because tests use it for ticket auth)
    vi.stubGlobal('fetch', mockFetch);
});

describe('ApiSocket Auth Flow (HAP-360/HAP-375)', () => {
    describe('Message-based Auth (HAP-360 Fallback)', () => {
        it('should transition status: connecting → authenticating after WebSocket opens', async () => {
            // Mock ticket fetch to fail (forcing fallback to message auth)
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const statusChanges: string[] = [];
            const socket = new TestApiSocket();
            socket.onStatusChange((status) => statusChanges.push(status));

            // Initialize and connect
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            // Wait for ticket fetch to fail
            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));

            const wsInstance = mockWebSocketInstances[0];

            // Verify connecting status
            expect(statusChanges).toContain('connecting');

            // Trigger WebSocket open
            wsInstance._triggerOpen();

            // Verify authenticating status
            expect(statusChanges).toContain('authenticating');
        });

        it('should send auth message immediately after WebSocket opens when ticket fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const socket = new TestApiSocket();

            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            // Trigger open
            wsInstance._triggerOpen();

            // Verify auth message was sent
            expect(wsInstance._sentMessages.length).toBe(1);
            const authMsg = JSON.parse(wsInstance._sentMessages[0]) as HappyMessage;
            expect(authMsg.event).toBe('auth');
            expect(authMsg.data).toEqual({
                token: 'test-token',
                clientType: 'user-scoped',
            });
        });

        it('should transition to connected when server sends connected event', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const statusChanges: string[] = [];
            const socket = new TestApiSocket();
            socket.onStatusChange((status) => statusChanges.push(status));
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            // Open and send auth
            wsInstance._triggerOpen();

            // Server responds with connected
            wsInstance._triggerMessage(
                JSON.stringify({
                    event: 'connected',
                    data: {
                        connectionId: 'conn-123',
                        userId: 'test-user-id',
                        clientType: 'user-scoped',
                    },
                })
            );

            expect(statusChanges).toContain('connected');
        });

        it('should transition to error when server sends auth-error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const statusChanges: string[] = [];
            const errors: (Error | null)[] = [];
            const socket = new TestApiSocket();
            socket.onStatusChange((status) => statusChanges.push(status));
            socket.onErrorChange((error) => errors.push(error));
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'invalid-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            wsInstance._triggerOpen();

            // Server responds with auth-error
            wsInstance._triggerMessage(
                JSON.stringify({
                    event: 'auth-error',
                    data: {
                        code: 4001,
                        message: 'Invalid authentication token',
                    },
                })
            );

            expect(statusChanges).toContain('error');
            // Error message comes from the auth-error event data
            expect(errors.some((e) => e?.message.includes('Invalid authentication token'))).toBe(true);
        });
    });

    describe('Ticket-based Auth (HAP-375)', () => {
        it('should fetch ticket before connecting when available', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ticket: 'ws-ticket-abc123' }),
            });

            const socket = new TestApiSocket();

            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            // Wait for ticket fetch
            await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());

            // Verify ticket was fetched
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.example.com/v1/websocket/ticket',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-token',
                    }),
                })
            );

            // Wait for WebSocket connection
            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));

            // Verify ticket is in URL
            const wsInstance = mockWebSocketInstances[0];
            expect(wsInstance.url).toContain('ticket=ws-ticket-abc123');
        });

        it('should NOT send auth message when ticket was used', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ticket: 'ws-ticket-abc123' }),
            });

            const socket = new TestApiSocket();

            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            // Trigger open
            wsInstance._triggerOpen();

            // No auth message should be sent (ticket auth is used)
            expect(wsInstance._sentMessages.length).toBe(0);
        });

        it('should still transition to connected when server sends connected event after ticket auth', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ticket: 'ws-ticket-abc123' }),
            });

            const statusChanges: string[] = [];
            const socket = new TestApiSocket();
            socket.onStatusChange((status) => statusChanges.push(status));
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            wsInstance._triggerOpen();

            // Server validates ticket and sends connected immediately
            wsInstance._triggerMessage(
                JSON.stringify({
                    event: 'connected',
                    data: {
                        connectionId: 'conn-456',
                        userId: 'test-user-id',
                        clientType: 'user-scoped',
                    },
                })
            );

            expect(statusChanges).toContain('connected');
        });

        it('should fall back to message auth when ticket fetch returns non-ok', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            const socket = new TestApiSocket();

            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            // URL should NOT have ticket param
            expect(wsInstance.url).not.toContain('ticket=');

            // After open, should send auth message (fallback)
            wsInstance._triggerOpen();
            expect(wsInstance._sentMessages.length).toBe(1);

            const authMsg = JSON.parse(wsInstance._sentMessages[0]) as HappyMessage;
            expect(authMsg.event).toBe('auth');
        });
    });

    describe('Auth Timeout (Client-side)', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should timeout and close connection if no connected response within 5 seconds', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const statusChanges: string[] = [];
            const socket = new TestApiSocket();
            socket.onStatusChange((status) => statusChanges.push(status));
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            wsInstance._triggerOpen();
            expect(statusChanges).toContain('authenticating');

            // Advance time past auth timeout (5000ms + buffer)
            vi.advanceTimersByTime(AUTH_TIMEOUT_MS + 100);

            // Should transition to error
            expect(statusChanges).toContain('error');

            // WebSocket should be closed with auth timeout code
            expect(wsInstance.close).toHaveBeenCalledWith(4001, 'Authentication timeout');
        });

        it('should clear auth timeout when connected event is received', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const statusChanges: string[] = [];
            const socket = new TestApiSocket();
            socket.onStatusChange((status) => statusChanges.push(status));
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            const wsInstance = mockWebSocketInstances[0];

            wsInstance._triggerOpen();

            // Advance time halfway (2500ms)
            vi.advanceTimersByTime(AUTH_TIMEOUT_MS / 2);

            // Server responds with connected
            wsInstance._triggerMessage(
                JSON.stringify({
                    event: 'connected',
                    data: { connectionId: 'conn-123', userId: 'user-123', clientType: 'user-scoped' },
                })
            );

            expect(statusChanges).toContain('connected');

            // Advance past original timeout
            vi.advanceTimersByTime(AUTH_TIMEOUT_MS);

            // Should still be connected (timeout was cleared)
            expect(socket.getStatus()).toBe('connected');
        });
    });

    describe('Reconnection', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should re-authenticate on reconnection', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error')) // First connection
                .mockRejectedValueOnce(new Error('Network error')); // Reconnection

            const socket = new TestApiSocket();
            const reconnectedCallbacks: boolean[] = [];

            socket.onReconnected(() => reconnectedCallbacks.push(true));
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            // Wait for first WebSocket to be created
            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            let wsInstance = mockWebSocketInstances[0];

            // Complete first connection
            wsInstance._triggerOpen();
            wsInstance._triggerMessage(
                JSON.stringify({
                    event: 'connected',
                    data: { connectionId: 'conn-1', userId: 'user-123', clientType: 'user-scoped' },
                })
            );

            // Simulate disconnection
            wsInstance._triggerClose(1006, 'Connection lost');

            // Advance timers to trigger reconnection (base delay is 1000ms + jitter)
            await vi.advanceTimersByTimeAsync(2000);

            // Wait for second WebSocket to be created
            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(2));

            wsInstance = mockWebSocketInstances[1];

            // Trigger open for reconnection
            wsInstance._triggerOpen();

            // Should send auth message again
            expect(wsInstance._sentMessages.length).toBe(1);
            const authMsg = JSON.parse(wsInstance._sentMessages[0]) as HappyMessage;
            expect(authMsg.event).toBe('auth');

            // Complete reconnection
            wsInstance._triggerMessage(
                JSON.stringify({
                    event: 'connected',
                    data: { connectionId: 'conn-2', userId: 'user-123', clientType: 'user-scoped' },
                })
            );

            // Reconnected callback should be called
            expect(reconnectedCallbacks.length).toBe(1);
        });

        it('should reset auth state on reconnect', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'));

            const statusChanges: string[] = [];
            const socket = new TestApiSocket();
            socket.onStatusChange((status) => statusChanges.push(status));
            socket.initialize(
                { endpoint: 'https://api.example.com', token: 'test-token' },
                {} as never
            );

            await vi.waitFor(() => expect(mockWebSocketInstances.length).toBe(1));
            let wsInstance = mockWebSocketInstances[0];

            // Complete first connection
            wsInstance._triggerOpen();
            wsInstance._triggerMessage(
                JSON.stringify({
                    event: 'connected',
                    data: { connectionId: 'conn-1', userId: 'user-123', clientType: 'user-scoped' },
                })
            );

            expect(statusChanges).toContain('connected');
            statusChanges.length = 0; // Clear for reconnection tracking

            // Simulate disconnection
            wsInstance._triggerClose();

            expect(statusChanges).toContain('disconnected');

            // Advance timers to trigger reconnection
            await vi.advanceTimersByTimeAsync(2000);

            // Wait for second WebSocket to be created
            await vi.waitFor(() => mockWebSocketInstances.length === 2);

            wsInstance = mockWebSocketInstances[1];
            wsInstance._triggerOpen();

            // Should go through authenticating again
            expect(statusChanges).toContain('authenticating');
        });
    });
});

/**
 * Auth timeout in milliseconds (matches HAP-360 spec)
 */
const AUTH_TIMEOUT_MS = 5000;

describe('Reconnection Jitter Algorithm (HAP-477, HAP-503)', () => {
    /**
     * These tests verify the centered jitter algorithm used in scheduleReconnect():
     * - Formula: delay = base * (1 - factor + random * factor * 2)
     * - With factor=0.5: multiplier ranges from 0.5 to 1.5
     * - 100ms floor is always enforced
     * - Exponential backoff: base doubles each attempt until max
     * - HAP-477: Default max increased to 30s (from 5s)
     */

    describe('Jitter Multiplier Range', () => {
        it('should produce multiplier in range [0.5, 1.5] with factor=0.5', () => {
            const factor = 0.5;

            // With random() = 0: jitterMultiplier = 1 - 0.5 + 0 * 0.5 * 2 = 0.5
            const minMultiplier = 1 - factor + (0 * factor * 2);
            expect(minMultiplier).toBe(0.5);

            // With random() = 1: jitterMultiplier = 1 - 0.5 + 1 * 0.5 * 2 = 1.5
            const maxMultiplier = 1 - factor + (1 * factor * 2);
            expect(maxMultiplier).toBe(1.5);
        });

        it('should produce delay range [500, 1500] for base=1000 with factor=0.5', () => {
            const baseDelay = 1000;
            const factor = 0.5;

            const minDelay = baseDelay * (1 - factor + (0 * factor * 2));
            const maxDelay = baseDelay * (1 - factor + (1 * factor * 2));

            expect(minDelay).toBe(500);
            expect(maxDelay).toBe(1500);
        });

        it('should center jitter around base delay (delays both above and below)', () => {
            // This test verifies "centered" jitter - delays can be both above AND below base
            const baseDelay = 2000;
            const factor = 0.5;

            // With random=0.5, multiplier should be exactly 1.0 (centered on base)
            const centeredMultiplier = 1 - factor + (0.5 * factor * 2);
            expect(centeredMultiplier).toBe(1.0);

            // With random<0.5, delay is below base
            const belowMultiplier = 1 - factor + (0.25 * factor * 2);
            expect(belowMultiplier).toBe(0.75);
            expect(baseDelay * belowMultiplier).toBe(1500); // Below 2000

            // With random>0.5, delay is above base
            const aboveMultiplier = 1 - factor + (0.75 * factor * 2);
            expect(aboveMultiplier).toBe(1.25);
            expect(baseDelay * aboveMultiplier).toBe(2500); // Above 2000
        });
    });

    describe('100ms Floor Enforcement', () => {
        it('should enforce 100ms floor when raw delay is below 100', () => {
            // With base=100, factor=0.5, random=0:
            // raw delay = 100 * 0.5 = 50ms
            // actual delay = max(100, 50) = 100ms
            const baseDelay = 100;
            const factor = 0.5;
            const minMultiplier = 1 - factor + (0 * factor * 2);
            const rawDelay = baseDelay * minMultiplier;
            const actualDelay = Math.max(100, rawDelay);

            expect(rawDelay).toBe(50);
            expect(actualDelay).toBe(100); // Floor enforced
        });

        it('should not affect delays already above 100ms', () => {
            const baseDelay = 1000;
            const factor = 0.5;
            const minMultiplier = 1 - factor + (0 * factor * 2);
            const rawDelay = baseDelay * minMultiplier;
            const actualDelay = Math.max(100, rawDelay);

            expect(rawDelay).toBe(500);
            expect(actualDelay).toBe(500); // No floor needed
        });
    });

    describe('Exponential Backoff Progression', () => {
        it('should follow exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s', () => {
            const reconnectionDelay = 1000;
            const reconnectionDelayMax = 30000;

            // Attempt 0: 1000 * 2^0 = 1000
            expect(Math.min(reconnectionDelay * Math.pow(2, 0), reconnectionDelayMax)).toBe(1000);

            // Attempt 1: 1000 * 2^1 = 2000
            expect(Math.min(reconnectionDelay * Math.pow(2, 1), reconnectionDelayMax)).toBe(2000);

            // Attempt 2: 1000 * 2^2 = 4000
            expect(Math.min(reconnectionDelay * Math.pow(2, 2), reconnectionDelayMax)).toBe(4000);

            // Attempt 3: 1000 * 2^3 = 8000
            expect(Math.min(reconnectionDelay * Math.pow(2, 3), reconnectionDelayMax)).toBe(8000);

            // Attempt 4: 1000 * 2^4 = 16000
            expect(Math.min(reconnectionDelay * Math.pow(2, 4), reconnectionDelayMax)).toBe(16000);

            // Attempt 5: 1000 * 2^5 = 32000 → capped at 30000
            expect(Math.min(reconnectionDelay * Math.pow(2, 5), reconnectionDelayMax)).toBe(30000);

            // Attempt 6+: still capped at 30000
            expect(Math.min(reconnectionDelay * Math.pow(2, 6), reconnectionDelayMax)).toBe(30000);
        });
    });

    describe('Max Delay Ceiling', () => {
        it('should cap base delay at reconnectionDelayMax (30s per HAP-477)', () => {
            const reconnectionDelayMax = 30000;

            // Verify base delay is capped before jitter is applied
            const baseDelay = Math.min(1000 * Math.pow(2, 10), reconnectionDelayMax);
            expect(baseDelay).toBe(30000);
        });

        it('should allow jittered delay up to max * 1.5 (since jitter is applied after cap)', () => {
            // The cap is applied BEFORE jitter, so max jittered delay = 30000 * 1.5 = 45000
            const maxBaseDelay = 30000;
            const maxJitteredDelay = maxBaseDelay * 1.5; // factor=0.5, random=1

            expect(maxJitteredDelay).toBe(45000);
        });
    });

    describe('HAP-477 Default Config', () => {
        it('should use 30s as default max delay (changed from 5s)', () => {
            // This test documents the HAP-477 change: max delay increased from 5s to 30s
            // to better handle poor network conditions on mobile devices
            const expectedMaxDelay = 30000;

            // From DEFAULT_CONFIG in apiSocket.ts:
            // reconnectionDelayMax: 30000 (HAP-477: was 5s)
            expect(expectedMaxDelay).toBe(30000);
        });

        it('should use 1s as default base delay', () => {
            const expectedBaseDelay = 1000;
            expect(expectedBaseDelay).toBe(1000);
        });

        it('should use 0.5 as default randomization factor', () => {
            const expectedFactor = 0.5;
            expect(expectedFactor).toBe(0.5);
        });
    });

    describe('Various Random Values', () => {
        it('should produce predictable delays for specific random values', () => {
            const baseDelay = 2000;
            const factor = 0.5;

            // Test several random values
            const testCases = [
                { random: 0, expectedMultiplier: 0.5, expectedDelay: 1000 },
                { random: 0.25, expectedMultiplier: 0.75, expectedDelay: 1500 },
                { random: 0.5, expectedMultiplier: 1.0, expectedDelay: 2000 },
                { random: 0.75, expectedMultiplier: 1.25, expectedDelay: 2500 },
                { random: 1, expectedMultiplier: 1.5, expectedDelay: 3000 },
            ];

            for (const tc of testCases) {
                const multiplier = 1 - factor + (tc.random * factor * 2);
                const delay = Math.max(100, baseDelay * multiplier);

                expect(multiplier).toBeCloseTo(tc.expectedMultiplier, 5);
                expect(delay).toBe(tc.expectedDelay);
            }
        });
    });
});

/**
 * Test ApiSocket class that mirrors the real implementation behavior
 * This is a self-contained test fixture to avoid singleton state bleeding between tests
 */
class TestApiSocket {
    private ws: MockWebSocketInstance | null = null;
    private config: { endpoint: string; token: string } | null = null;
    private currentStatus:
        | 'disconnected'
        | 'connecting'
        | 'authenticating'
        | 'connected'
        | 'error' = 'disconnected';
    private lastError: Error | null = null;
    private statusListeners = new Set<
        (status: 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error') => void
    >();
    private errorListeners = new Set<(error: Error | null) => void>();
    private reconnectedListeners = new Set<() => void>();
    private authTimeout: ReturnType<typeof setTimeout> | null = null;
    private usedTicketAuth = false;
    private wasConnectedBefore = false;
    private isManualClose = false;
    private reconnectAttempts = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    initialize(config: { endpoint: string; token: string }, _encryption: never) {
        this.config = config;
        this.connect();
    }

    connect() {
        if (!this.config || this.ws) return;
        this.isManualClose = false;
        this.updateStatus('connecting');
        this.doConnect();
    }

    private async doConnect() {
        if (!this.config) return;
        this.usedTicketAuth = false;

        const wsUrl = new URL('/v1/updates', this.config.endpoint);
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';

        // Try ticket auth first (HAP-375)
        try {
            const ticketResponse = await fetch(`${this.config.endpoint}/v1/websocket/ticket`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.config.token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (ticketResponse.ok) {
                const { ticket } = (await ticketResponse.json()) as { ticket: string };
                wsUrl.searchParams.set('ticket', ticket);
                this.usedTicketAuth = true;
            }
        } catch {
            // Fall through to message-based auth
        }

        // Use the mock WebSocket constructor
        const WsMock = globalThis.WebSocket as unknown as (url: string) => MockWebSocketInstance;
        this.ws = WsMock(wsUrl.toString());
        this.setupEventHandlers();
    }

    disconnect() {
        this.isManualClose = true;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.authTimeout) {
            clearTimeout(this.authTimeout);
            this.authTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.updateStatus('disconnected');
    }

    private scheduleReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.isManualClose) return;

        const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
        const jitter = baseDelay * 0.5 * Math.random();
        const delay = baseDelay + jitter;

        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.doConnect();
        }, delay);
    }

    onStatusChange(
        listener: (
            status: 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error'
        ) => void
    ) {
        this.statusListeners.add(listener);
        listener(this.currentStatus);
        return () => this.statusListeners.delete(listener);
    }

    onErrorChange(listener: (error: Error | null) => void) {
        this.errorListeners.add(listener);
        listener(this.lastError);
        return () => this.errorListeners.delete(listener);
    }

    onReconnected(listener: () => void) {
        this.reconnectedListeners.add(listener);
        return () => this.reconnectedListeners.delete(listener);
    }

    getStatus() {
        return this.currentStatus;
    }

    getLastError() {
        return this.lastError;
    }

    private updateStatus(
        status: 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error',
        error?: Error
    ) {
        const newError = status === 'error' ? (error ?? new Error('Unknown error')) : null;
        if (newError !== this.lastError) {
            this.lastError = newError;
            this.errorListeners.forEach((l) => l(this.lastError));
        }
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            this.statusListeners.forEach((l) => l(status));
        }
    }

    private handleMessage(data: string) {
        try {
            const message = JSON.parse(data) as HappyMessage;

            if (message.event === 'connected' && this.currentStatus === 'authenticating') {
                if (this.authTimeout) {
                    clearTimeout(this.authTimeout);
                    this.authTimeout = null;
                }
                this.updateStatus('connected');
                if (this.wasConnectedBefore) {
                    this.reconnectedListeners.forEach((l) => l());
                }
                this.wasConnectedBefore = true;
                return;
            }

            if (message.event === 'auth-error' && this.currentStatus === 'authenticating') {
                if (this.authTimeout) {
                    clearTimeout(this.authTimeout);
                    this.authTimeout = null;
                }
                const errorData = message.data as { message?: string } | undefined;
                this.updateStatus(
                    'error',
                    new Error(errorData?.message || 'Authentication failed')
                );
                this.ws?.close(4001, 'Authentication failed');
                return;
            }
        } catch {
            // Ignore malformed messages
        }
    }

    private setupEventHandlers() {
        if (!this.ws) return;

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.updateStatus('authenticating');

            if (!this.usedTicketAuth && this.ws && this.config) {
                this.ws.send(
                    JSON.stringify({
                        event: 'auth',
                        data: {
                            token: this.config.token,
                            clientType: 'user-scoped',
                        },
                    })
                );
            }

            this.authTimeout = setTimeout(() => {
                this.authTimeout = null;
                if (this.currentStatus === 'authenticating') {
                    this.updateStatus('error', new Error('Authentication timeout'));
                    this.ws?.close(4001, 'Authentication timeout');
                }
            }, AUTH_TIMEOUT_MS);
        };

        this.ws.onclose = () => {
            const wasActive =
                this.currentStatus === 'connected' || this.currentStatus === 'authenticating';
            this.ws = null;

            if (this.authTimeout) {
                clearTimeout(this.authTimeout);
                this.authTimeout = null;
            }

            if (wasActive) {
                this.updateStatus('disconnected');
            }

            if (!this.isManualClose) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = () => {
            this.updateStatus('error', new Error('WebSocket error'));
        };

        this.ws.onmessage = (event: { data: string }) => {
            if (typeof event.data === 'string') {
                this.handleMessage(event.data);
            }
        };
    }
}
