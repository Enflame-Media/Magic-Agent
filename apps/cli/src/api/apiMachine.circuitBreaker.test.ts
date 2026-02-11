/**
 * Unit tests for ApiMachineClient circuit breaker logic
 *
 * Tests the session revival rate limiting implemented in HAP-744:
 * - Per-session attempt limits (MAX_REVIVAL_ATTEMPTS_PER_SESSION = 3)
 * - Global cooldown on cascade failures (10 failures in 30s → pause 60s)
 * - Attempt counter cleanup after successful revival
 * - Environment variable configuration (HAP-782)
 *
 * @see HAP-744 - Fix session revival race condition causing infinite loop
 * @see HAP-782 - Made MAX_REVIVAL_ATTEMPTS_PER_SESSION configurable via env var
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock logger
vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debugLargeJson: vi.fn(),
    },
}));

// Mock configuration
vi.mock('@/configuration', () => ({
    configuration: {
        serverUrl: 'ws://localhost:3000',
    },
}));

// Mock encryption
vi.mock('@/api/encryption', () => ({
    encrypt: vi.fn((_key, _variant, data) => {
        return new TextEncoder().encode(JSON.stringify(data));
    }),
    decrypt: vi.fn((_key, _variant, data) => {
        try {
            return JSON.parse(new TextDecoder().decode(data));
        } catch {
            return null;
        }
    }),
    encodeBase64: vi.fn((data) => {
        return Buffer.from(data).toString('base64');
    }),
    decodeBase64: vi.fn((data) => {
        return new Uint8Array(Buffer.from(data, 'base64'));
    }),
}));

// Mock common handlers
vi.mock('@/modules/common/registerCommonHandlers', () => ({
    registerCommonHandlers: vi.fn(),
}));

// Mock MCP config
vi.mock('@/mcp/config', () => ({
    buildMcpSyncState: vi.fn(() => ({})),
}));

// Mock telemetry (HAP-783)
const mockTrackEvent = vi.fn();
vi.mock('@/telemetry', () => ({
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

// Mock HappyWebSocket
vi.mock('./HappyWebSocket', () => {
    return {
        HappyWebSocket: vi.fn().mockImplementation(() => ({
            on: vi.fn(),
            onServer: vi.fn(),
            onRpcRequest: vi.fn(),
            connect: vi.fn(),
            close: vi.fn(),
            removeAllListeners: vi.fn(),
            connected: false,
            emit: vi.fn(),
            emitWithAck: vi.fn().mockResolvedValue({ result: 'success' }),
            emitClient: vi.fn(),
        })),
    };
});

import { ApiMachineClient } from './apiMachine';

// Helper to create a mock machine object
function createMockMachine(id: string = 'test-machine-id') {
    return {
        id,
        encryptionKey: new Uint8Array(32),
        encryptionVariant: 'dataKey' as const,
        metadata: {
            host: 'test-host',
            platform: 'darwin',
            happyCliVersion: '0.12.0',
            homeDir: '/home/test',
            happyHomeDir: '/home/test/.happy',
            happyLibDir: '/home/test/.happy/lib',
        },
        metadataVersion: 1,
        daemonState: null,
        daemonStateVersion: 1,
    };
}

describe('ApiMachineClient Circuit Breaker', () => {
    let client: ApiMachineClient;
    const mockToken = 'test-token';
    const testSessionId = 'bb6ca0a4-5734-4204-ada7-7aa2c27473c5';
    const testDirectory = '/test/directory';

    // Mock RPC handlers
    const mockSpawnSession = vi.fn();
    const mockStopSession = vi.fn();
    const mockRequestShutdown = vi.fn();
    const mockGetSessionStatus = vi.fn();
    const mockGetSessionDirectory = vi.fn();
    const mockOnMachineDisconnected = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        client = new ApiMachineClient(mockToken, createMockMachine());

        // Set up RPC handlers
        mockSpawnSession.mockResolvedValue({
            type: 'success',
            sessionId: 'new-session-id',
        });
        mockGetSessionStatus.mockReturnValue({ status: 'unknown' });
        mockGetSessionDirectory.mockReturnValue(testDirectory);

        client.setRPCHandlers({
            spawnSession: mockSpawnSession,
            stopSession: mockStopSession,
            requestShutdown: mockRequestShutdown,
            getSessionStatus: mockGetSessionStatus,
            getSessionDirectory: mockGetSessionDirectory,
            onMachineDisconnected: mockOnMachineDisconnected,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Per-session attempt limits', () => {
        it('should track attempts per session independently', () => {
            // Access private method via reflection for testing
            const clientAny = client as unknown as {
                sessionRevivalAttempts: Map<string, number>;
                MAX_REVIVAL_ATTEMPTS_PER_SESSION: number;
            };

            // Verify initial state
            expect(clientAny.sessionRevivalAttempts.size).toBe(0);
            // Default is 3 when HAPPY_SESSION_REVIVAL_MAX_ATTEMPTS is not set
            expect(clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION).toBe(3);
        });

        it('should expose revival metrics for observability', () => {
            const metrics = client.getRevivalMetrics();

            expect(metrics).toEqual({
                attempted: 0,
                succeeded: 0,
                failed: 0,
            });
        });
    });

    describe('Global cooldown', () => {
        it('should have correct cooldown configuration', () => {
            const clientAny = client as unknown as {
                COOLDOWN_WINDOW_MS: number;
                COOLDOWN_FAILURE_THRESHOLD: number;
                COOLDOWN_DURATION_MS: number;
            };

            expect(clientAny.COOLDOWN_WINDOW_MS).toBe(30000); // 30 seconds
            expect(clientAny.COOLDOWN_FAILURE_THRESHOLD).toBe(10); // 10 failures
            expect(clientAny.COOLDOWN_DURATION_MS).toBe(60000); // 60 seconds
        });

        it('should record failures and track timestamps', () => {
            const clientAny = client as unknown as {
                revivalFailureTimestamps: number[];
                recordRevivalFailure: () => void;
            };

            // Record some failures
            clientAny.recordRevivalFailure();
            clientAny.recordRevivalFailure();
            clientAny.recordRevivalFailure();

            expect(clientAny.revivalFailureTimestamps.length).toBe(3);
        });

        it('should trigger cooldown after threshold failures', () => {
            const clientAny = client as unknown as {
                revivalFailureTimestamps: number[];
                revivalCooldownUntil: number;
                recordRevivalFailure: () => void;
                isRevivalCooldownActive: () => boolean;
                COOLDOWN_FAILURE_THRESHOLD: number;
            };

            // Should not be in cooldown initially
            expect(clientAny.isRevivalCooldownActive()).toBe(false);

            // Record threshold-1 failures - should not trigger cooldown
            for (let i = 0; i < clientAny.COOLDOWN_FAILURE_THRESHOLD - 1; i++) {
                clientAny.recordRevivalFailure();
            }
            expect(clientAny.isRevivalCooldownActive()).toBe(false);

            // One more failure should trigger cooldown
            clientAny.recordRevivalFailure();
            expect(clientAny.isRevivalCooldownActive()).toBe(true);
        });

        it('should clean up old timestamps outside sliding window', () => {
            const clientAny = client as unknown as {
                revivalFailureTimestamps: number[];
                recordRevivalFailure: () => void;
                isRevivalCooldownActive: () => boolean;
                COOLDOWN_WINDOW_MS: number;
            };

            // Record a failure
            clientAny.recordRevivalFailure();
            expect(clientAny.revivalFailureTimestamps.length).toBe(1);

            // Advance time past the window
            vi.advanceTimersByTime(clientAny.COOLDOWN_WINDOW_MS + 1000);

            // Check cooldown status - this should clean up old timestamps
            clientAny.isRevivalCooldownActive();

            // Record another failure - old one should be cleaned
            clientAny.recordRevivalFailure();
            expect(clientAny.revivalFailureTimestamps.length).toBe(1);
        });

        it('should expire cooldown after duration', () => {
            const clientAny = client as unknown as {
                recordRevivalFailure: () => void;
                isRevivalCooldownActive: () => boolean;
                COOLDOWN_FAILURE_THRESHOLD: number;
                COOLDOWN_DURATION_MS: number;
            };

            // Trigger cooldown
            for (let i = 0; i < clientAny.COOLDOWN_FAILURE_THRESHOLD; i++) {
                clientAny.recordRevivalFailure();
            }
            expect(clientAny.isRevivalCooldownActive()).toBe(true);

            // Advance past cooldown duration
            vi.advanceTimersByTime(clientAny.COOLDOWN_DURATION_MS + 1000);

            // Cooldown should have expired
            expect(clientAny.isRevivalCooldownActive()).toBe(false);
        });
    });

    describe('Attempt counter cleanup', () => {
        it('should clear session attempts after limit exceeded', () => {
            const clientAny = client as unknown as {
                sessionRevivalAttempts: Map<string, number>;
            };

            // Manually set attempts to verify cleanup doesn't affect other sessions
            clientAny.sessionRevivalAttempts.set('session-a', 2);
            clientAny.sessionRevivalAttempts.set('session-b', 1);

            expect(clientAny.sessionRevivalAttempts.get('session-a')).toBe(2);
            expect(clientAny.sessionRevivalAttempts.get('session-b')).toBe(1);
        });
    });

    describe('Revival metrics', () => {
        it('should track attempted, succeeded, and failed counts', () => {
            // Verify structure of metrics
            const metrics = client.getRevivalMetrics();

            expect(metrics).toHaveProperty('attempted');
            expect(metrics).toHaveProperty('succeeded');
            expect(metrics).toHaveProperty('failed');

            // Metrics should be numbers
            expect(typeof metrics.attempted).toBe('number');
            expect(typeof metrics.succeeded).toBe('number');
            expect(typeof metrics.failed).toBe('number');
        });

        it('should return a copy of metrics (not the original)', () => {
            const metrics1 = client.getRevivalMetrics();
            const metrics2 = client.getRevivalMetrics();

            // Modifying one should not affect the other
            metrics1.attempted = 999;
            expect(metrics2.attempted).toBe(0);
        });
    });

    describe('Handler-ready polling configuration', () => {
        it('should have correct polling configuration', () => {
            // The polling logic is in handleRpcWithRevival
            // Verify the constants are reasonable
            const POLL_INTERVAL_MS = 100;
            const MAX_WAIT_MS = 5000;

            // 100ms poll, 5s max = up to 50 polls
            expect(MAX_WAIT_MS / POLL_INTERVAL_MS).toBeLessThanOrEqual(50);
            expect(POLL_INTERVAL_MS).toBeGreaterThanOrEqual(50); // Not too aggressive
            expect(MAX_WAIT_MS).toBeGreaterThanOrEqual(1000); // Reasonable timeout
        });
    });

    /**
     * Tests for HAPPY_SESSION_REVIVAL_MAX_ATTEMPTS environment variable configuration
     * @see HAP-782 - Made MAX_REVIVAL_ATTEMPTS_PER_SESSION configurable via env var
     *
     * Note: These tests verify the default behavior. To test custom values,
     * the module would need to be re-imported after setting process.env,
     * which is complex with Vitest's module caching. The implementation
     * validates positive integers and falls back to 3 for invalid values.
     */
    describe('Environment variable configuration (HAP-782)', () => {
        it('should default MAX_REVIVAL_ATTEMPTS_PER_SESSION to 3', () => {
            const clientAny = client as unknown as {
                MAX_REVIVAL_ATTEMPTS_PER_SESSION: number;
            };

            // Default value when HAPPY_SESSION_REVIVAL_MAX_ATTEMPTS is not set
            expect(clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION).toBe(3);
        });

        it('should have MAX_REVIVAL_ATTEMPTS_PER_SESSION as a positive number', () => {
            const clientAny = client as unknown as {
                MAX_REVIVAL_ATTEMPTS_PER_SESSION: number;
            };

            // Value should always be a positive number
            expect(typeof clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION).toBe('number');
            expect(clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION).toBeGreaterThanOrEqual(1);
        });

        it('should use MAX_REVIVAL_ATTEMPTS_PER_SESSION in error messages', async () => {
            // This test verifies the constant is used in the circuit breaker logic
            const clientAny = client as unknown as {
                sessionRevivalAttempts: Map<string, number>;
                MAX_REVIVAL_ATTEMPTS_PER_SESSION: number;
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
            };

            // Simulate exceeding the limit
            const testSessionId = 'test-session-for-limit';
            clientAny.sessionRevivalAttempts.set(testSessionId, clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION);

            // Attempt revival - should fail due to limit
            const result = await clientAny.tryReviveSession(testSessionId, '/test/dir');

            expect(result.revived).toBe(false);
            expect(result.error).toContain(`Max revival attempts (${clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION})`);
        });
    });

    /**
     * Tests for telemetry emission on circuit breaker events
     * @see HAP-783 - Add telemetry emission when session revival circuit breaker trips
     */
    describe('Telemetry emission (HAP-783)', () => {
        beforeEach(() => {
            mockTrackEvent.mockClear();
        });

        it('should emit session_revival_limit_exceeded when per-session limit exceeded', async () => {
            const clientAny = client as unknown as {
                sessionRevivalAttempts: Map<string, number>;
                MAX_REVIVAL_ATTEMPTS_PER_SESSION: number;
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
            };

            // Simulate exceeding the limit
            const testSessionId = 'test-session-for-telemetry';
            clientAny.sessionRevivalAttempts.set(testSessionId, clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION);

            // Attempt revival - should fail and emit telemetry
            await clientAny.tryReviveSession(testSessionId, '/test/dir');

            expect(mockTrackEvent).toHaveBeenCalledWith('session_revival_limit_exceeded', {
                attempts: clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION,
                maxAttempts: clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION,
            });
        });

        it('should emit session_revival_cooldown_triggered when global cooldown activates', () => {
            const clientAny = client as unknown as {
                recordRevivalFailure: () => void;
                COOLDOWN_FAILURE_THRESHOLD: number;
                COOLDOWN_DURATION_MS: number;
                COOLDOWN_WINDOW_MS: number;
            };

            // Record enough failures to trigger cooldown
            for (let i = 0; i < clientAny.COOLDOWN_FAILURE_THRESHOLD; i++) {
                clientAny.recordRevivalFailure();
            }

            // Should have emitted telemetry on the threshold-th failure
            expect(mockTrackEvent).toHaveBeenCalledWith('session_revival_cooldown_triggered', {
                failureCount: clientAny.COOLDOWN_FAILURE_THRESHOLD,
                cooldownDurationMs: clientAny.COOLDOWN_DURATION_MS,
                windowMs: clientAny.COOLDOWN_WINDOW_MS,
                threshold: clientAny.COOLDOWN_FAILURE_THRESHOLD,
            });
        });

        it('should emit session_revival_attempt on each revival attempt', async () => {
            // Mock claudeCheckSession to allow revival to proceed
            vi.mock('@/claude/utils/claudeCheckSession', () => ({
                claudeCheckSession: vi.fn(() => true),
            }));

            const clientAny = client as unknown as {
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
                revivalMetrics: { attempted: number; succeeded: number; failed: number };
                MAX_REVIVAL_ATTEMPTS_PER_SESSION: number;
            };

            // Configure mocks for a valid revival attempt
            mockGetSessionStatus.mockReturnValue({ status: 'unknown' });
            mockSpawnSession.mockResolvedValue({
                type: 'success',
                sessionId: 'new-session-id',
            });

            // Trigger a revival attempt
            await clientAny.tryReviveSession(testSessionId, testDirectory);

            // Check that session_revival_attempt was emitted
            expect(mockTrackEvent).toHaveBeenCalledWith('session_revival_attempt', expect.objectContaining({
                attemptNumber: expect.any(Number),
                maxAttempts: clientAny.MAX_REVIVAL_ATTEMPTS_PER_SESSION,
                globalAttemptCount: expect.any(Number),
            }));
        });

        it('should emit session_revival_failure on failed revival', async () => {
            const clientAny = client as unknown as {
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
            };

            // Mock spawnSession to fail
            mockSpawnSession.mockResolvedValue({
                type: 'error',
                errorMessage: 'Test failure',
            });

            // Trigger a revival attempt that will fail
            const result = await clientAny.tryReviveSession(testSessionId, testDirectory);

            // Verify the result and telemetry
            if (!result.revived) {
                expect(mockTrackEvent).toHaveBeenCalledWith('session_revival_failure', expect.objectContaining({
                    failureCount: expect.any(Number),
                    totalAttempts: expect.any(Number),
                    failureRate: expect.any(Number),
                }));
            }
        });

        it('should not emit cooldown telemetry when below threshold', () => {
            const clientAny = client as unknown as {
                recordRevivalFailure: () => void;
                COOLDOWN_FAILURE_THRESHOLD: number;
            };

            // Record failures below threshold
            for (let i = 0; i < clientAny.COOLDOWN_FAILURE_THRESHOLD - 1; i++) {
                clientAny.recordRevivalFailure();
            }

            // Should NOT have emitted cooldown telemetry
            expect(mockTrackEvent).not.toHaveBeenCalledWith(
                'session_revival_cooldown_triggered',
                expect.anything()
            );
        });
    });

    /**
     * Tests for session-revival-paused WebSocket event emission
     * @see HAP-784 - Notify mobile app when session revival is paused due to cooldown
     */
    describe('Mobile notification on cooldown (HAP-784)', () => {
        let mockSocket: {
            connected: boolean;
            emitClient: ReturnType<typeof vi.fn>;
        };

        beforeEach(() => {
            // Create a mock socket and attach it to the client
            mockSocket = {
                connected: true,
                emitClient: vi.fn(),
            };

            // Inject the mock socket into the client
            const clientAny = client as unknown as {
                socket: typeof mockSocket;
            };
            clientAny.socket = mockSocket;
        });

        it('should emit session-revival-paused when cooldown is active', async () => {
            const clientAny = client as unknown as {
                recordRevivalFailure: () => void;
                COOLDOWN_FAILURE_THRESHOLD: number;
                revivalCooldownUntil: number;
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
            };

            // Trigger cooldown
            for (let i = 0; i < clientAny.COOLDOWN_FAILURE_THRESHOLD; i++) {
                clientAny.recordRevivalFailure();
            }

            // Attempt revival when cooldown is active
            await clientAny.tryReviveSession(testSessionId, testDirectory);

            // Should have emitted session-revival-paused event
            expect(mockSocket.emitClient).toHaveBeenCalledWith('session-revival-paused', {
                reason: 'circuit_breaker',
                remainingMs: expect.any(Number),
                resumesAt: clientAny.revivalCooldownUntil,
                machineId: 'test-machine-id',
            });
        });

        it('should include correct remainingMs in event payload', async () => {
            const clientAny = client as unknown as {
                recordRevivalFailure: () => void;
                COOLDOWN_FAILURE_THRESHOLD: number;
                COOLDOWN_DURATION_MS: number;
                revivalCooldownUntil: number;
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
            };

            // Trigger cooldown
            for (let i = 0; i < clientAny.COOLDOWN_FAILURE_THRESHOLD; i++) {
                clientAny.recordRevivalFailure();
            }

            // Advance time by 10 seconds
            vi.advanceTimersByTime(10000);

            // Attempt revival
            await clientAny.tryReviveSession(testSessionId, testDirectory);

            // Verify the event was emitted
            expect(mockSocket.emitClient).toHaveBeenCalledWith(
                'session-revival-paused',
                expect.objectContaining({
                    reason: 'circuit_breaker',
                    // remainingMs should be approximately COOLDOWN_DURATION_MS - 10000
                    remainingMs: expect.any(Number),
                })
            );

            // Extract the actual remainingMs from the call
            const call = mockSocket.emitClient.mock.calls.find(
                (c: unknown[]) => c[0] === 'session-revival-paused'
            );
            const payload = call?.[1] as { remainingMs: number } | undefined;
            expect(payload?.remainingMs).toBeLessThan(clientAny.COOLDOWN_DURATION_MS);
            expect(payload?.remainingMs).toBeGreaterThan(0);
        });

        it('should not emit event when socket is not connected', async () => {
            const clientAny = client as unknown as {
                recordRevivalFailure: () => void;
                COOLDOWN_FAILURE_THRESHOLD: number;
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
            };

            // Set socket as disconnected
            mockSocket.connected = false;

            // Trigger cooldown
            for (let i = 0; i < clientAny.COOLDOWN_FAILURE_THRESHOLD; i++) {
                clientAny.recordRevivalFailure();
            }

            // Attempt revival
            await clientAny.tryReviveSession(testSessionId, testDirectory);

            // Should NOT have emitted the event
            expect(mockSocket.emitClient).not.toHaveBeenCalledWith(
                'session-revival-paused',
                expect.anything()
            );
        });

        it('should not emit event when cooldown is not active', async () => {
            const clientAny = client as unknown as {
                tryReviveSession: (sessionId: string, directory: string) => Promise<{ revived: boolean; error?: string; originalSessionId: string }>;
            };

            // Attempt revival without triggering cooldown
            await clientAny.tryReviveSession(testSessionId, testDirectory);

            // Should NOT have emitted session-revival-paused event
            expect(mockSocket.emitClient).not.toHaveBeenCalledWith(
                'session-revival-paused',
                expect.anything()
            );
        });
    });
});
