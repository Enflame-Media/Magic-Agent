/**
 * Unit Tests for Durable Objects Types
 *
 * Tests utility functions from the types module:
 * - isClientMessage - Type guard for client messages
 * - isServerMessage - Type guard for server messages
 * - normalizeMessage - Message format normalizer
 * - calculateBackoffDelay - Exponential backoff with jitter (HAP-479)
 *
 * @module __tests__/durable-objects-types.spec
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

import {
    isClientMessage,
    isServerMessage,
    normalizeMessage,
    CloseCode,
    DEFAULT_CONFIG,
    DEFAULT_ALARM_RETRY_CONFIG,
    calculateBackoffDelay,
    type ClientMessage,
    type WebSocketMessage,
    type ClientType,
    type AlarmRetryConfig,
    type AlarmRetryState,
    type AlarmDeadLetterEntry,
} from '@/durable-objects/types';

describe('Durable Objects Types', () => {
    describe('isClientMessage', () => {
        it('should return true for valid client message', () => {
            const msg: ClientMessage = {
                event: 'sessionUpdate',
                data: { sessionId: '123' },
            };
            expect(isClientMessage(msg)).toBe(true);
        });

        it('should return true for client message with ackId', () => {
            const msg: ClientMessage = {
                event: 'rpc-call',
                data: { method: 'test' },
                ackId: 'uuid-123',
            };
            expect(isClientMessage(msg)).toBe(true);
        });

        it('should return true for client message with ack response', () => {
            const msg: ClientMessage = {
                event: 'rpc-response',
                ack: { result: 'success' },
            };
            expect(isClientMessage(msg)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isClientMessage(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isClientMessage(undefined)).toBe(false);
        });

        it('should return false for primitive types', () => {
            expect(isClientMessage('string')).toBe(false);
            expect(isClientMessage(123)).toBe(false);
            expect(isClientMessage(true)).toBe(false);
        });

        it('should return false for object without event field', () => {
            expect(isClientMessage({ data: 'test' })).toBe(false);
        });

        it('should return false for object with non-string event', () => {
            expect(isClientMessage({ event: 123 })).toBe(false);
            expect(isClientMessage({ event: null })).toBe(false);
            expect(isClientMessage({ event: {} })).toBe(false);
        });

        it('should return false for server message format', () => {
            const serverMsg: WebSocketMessage = {
                type: 'broadcast',
                payload: { test: true },
                timestamp: Date.now(),
            };
            expect(isClientMessage(serverMsg)).toBe(false);
        });
    });

    describe('isServerMessage', () => {
        it('should return true for valid server message', () => {
            const msg: WebSocketMessage = {
                type: 'broadcast',
                payload: { test: true },
                timestamp: Date.now(),
            };
            expect(isServerMessage(msg)).toBe(true);
        });

        it('should return true for server message with messageId', () => {
            const msg: WebSocketMessage = {
                type: 'rpc-request',
                payload: { method: 'test' },
                timestamp: Date.now(),
                messageId: 'msg-123',
            };
            expect(isServerMessage(msg)).toBe(true);
        });

        it('should return true for server message without payload', () => {
            const msg: WebSocketMessage = {
                type: 'ping',
                timestamp: Date.now(),
            };
            expect(isServerMessage(msg)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isServerMessage(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isServerMessage(undefined)).toBe(false);
        });

        it('should return false for primitive types', () => {
            expect(isServerMessage('string')).toBe(false);
            expect(isServerMessage(123)).toBe(false);
            expect(isServerMessage(true)).toBe(false);
        });

        it('should return false for object without type field', () => {
            expect(isServerMessage({ payload: 'test' })).toBe(false);
        });

        it('should return false for object with non-string type', () => {
            expect(isServerMessage({ type: 123 })).toBe(false);
            expect(isServerMessage({ type: null })).toBe(false);
            expect(isServerMessage({ type: {} })).toBe(false);
        });
    });

    describe('normalizeMessage', () => {
        it('should normalize client message to unified format', () => {
            const clientMsg: ClientMessage = {
                event: 'sessionUpdate',
                data: { sessionId: '123' },
                ackId: 'ack-uuid',
            };

            const normalized = normalizeMessage(clientMsg);
            expect(normalized).toEqual({
                type: 'sessionUpdate',
                payload: { sessionId: '123' },
                messageId: 'ack-uuid',
                ack: undefined,
            });
        });

        it('should normalize client message with ack response', () => {
            const clientMsg: ClientMessage = {
                event: 'rpc-response',
                ack: { result: 'success' },
            };

            const normalized = normalizeMessage(clientMsg);
            expect(normalized).toEqual({
                type: 'rpc-response',
                payload: undefined,
                messageId: undefined,
                ack: { result: 'success' },
            });
        });

        it('should normalize server message to unified format', () => {
            const now = Date.now();
            const serverMsg: WebSocketMessage = {
                type: 'broadcast',
                payload: { test: true },
                timestamp: now,
                messageId: 'msg-123',
            };

            const normalized = normalizeMessage(serverMsg);
            expect(normalized).toEqual({
                type: 'broadcast',
                payload: { test: true },
                timestamp: now,
                messageId: 'msg-123',
            });
        });

        it('should normalize server message without optional fields', () => {
            const now = Date.now();
            const serverMsg: WebSocketMessage = {
                type: 'ping',
                timestamp: now,
            };

            const normalized = normalizeMessage(serverMsg);
            expect(normalized).toEqual({
                type: 'ping',
                payload: undefined,
                timestamp: now,
                messageId: undefined,
            });
        });

        it('should return null for invalid message format', () => {
            expect(normalizeMessage(null)).toBeNull();
            expect(normalizeMessage(undefined)).toBeNull();
            expect(normalizeMessage('string')).toBeNull();
            expect(normalizeMessage(123)).toBeNull();
            expect(normalizeMessage({})).toBeNull();
            expect(normalizeMessage({ data: 'test' })).toBeNull();
        });

        it('should handle message with both event and type (client wins)', () => {
            // If a message has both, isClientMessage checks event first
            const ambiguousMsg = {
                event: 'clientEvent',
                type: 'serverType',
                data: 'clientData',
                payload: 'serverPayload',
            };

            const normalized = normalizeMessage(ambiguousMsg);
            // Should normalize as client message since event exists
            expect(normalized?.type).toBe('clientEvent');
            expect(normalized?.payload).toBe('clientData');
        });
    });

    describe('CloseCode constants', () => {
        it('should have standard WebSocket close codes', () => {
            expect(CloseCode.NORMAL).toBe(1000);
            expect(CloseCode.GOING_AWAY).toBe(1001);
            expect(CloseCode.PROTOCOL_ERROR).toBe(1002);
            expect(CloseCode.UNSUPPORTED_DATA).toBe(1003);
            expect(CloseCode.POLICY_VIOLATION).toBe(1008);
            expect(CloseCode.MESSAGE_TOO_BIG).toBe(1009);
            expect(CloseCode.INTERNAL_ERROR).toBe(1011);
        });

        it('should have custom application close codes in 4xxx range', () => {
            expect(CloseCode.AUTH_FAILED).toBe(4001);
            expect(CloseCode.INVALID_HANDSHAKE).toBe(4002);
            expect(CloseCode.MISSING_SESSION_ID).toBe(4003);
            expect(CloseCode.MISSING_MACHINE_ID).toBe(4004);
            expect(CloseCode.CONNECTION_LIMIT_EXCEEDED).toBe(4005);
            expect(CloseCode.DUPLICATE_CONNECTION).toBe(4006);
        });
    });

    describe('DEFAULT_CONFIG', () => {
        it('should have default max connections per user', () => {
            expect(DEFAULT_CONFIG.maxConnectionsPerUser).toBe(100);
        });

        it('should have default connection timeout of 5 minutes', () => {
            expect(DEFAULT_CONFIG.connectionTimeoutMs).toBe(5 * 60 * 1000);
        });

        it('should enable auto response by default', () => {
            expect(DEFAULT_CONFIG.enableAutoResponse).toBe(true);
        });

        it('should have default max message size of 1MB', () => {
            expect(DEFAULT_CONFIG.maxMessageSize).toBe(1024 * 1024);
        });
    });

    describe('Type definitions', () => {
        it('should support all ClientType values', () => {
            const types: ClientType[] = ['user-scoped', 'session-scoped', 'machine-scoped'];
            expect(types).toHaveLength(3);
        });
    });

    // =========================================================================
    // ALARM RETRY TESTS (HAP-479, HAP-500)
    // =========================================================================

    describe('DEFAULT_ALARM_RETRY_CONFIG', () => {
        it('should have default max retries of 3', () => {
            expect(DEFAULT_ALARM_RETRY_CONFIG.maxRetries).toBe(3);
        });

        it('should have default base delay of 1 second', () => {
            expect(DEFAULT_ALARM_RETRY_CONFIG.baseDelayMs).toBe(1000);
        });

        it('should have default max delay of 30 seconds', () => {
            expect(DEFAULT_ALARM_RETRY_CONFIG.maxDelayMs).toBe(30000);
        });

        it('should have default jitter factor of 0.2 (20%)', () => {
            expect(DEFAULT_ALARM_RETRY_CONFIG.jitterFactor).toBe(0.2);
        });
    });

    describe('calculateBackoffDelay', () => {
        describe('exponential growth', () => {
            it('should return base delay for attempt 0 (plus jitter)', () => {
                // With attempt 0: baseDelay * 2^0 = 1000 * 1 = 1000ms
                // With 20% jitter: 1000 to 1200ms range
                const delay = calculateBackoffDelay(0);
                expect(delay).toBeGreaterThanOrEqual(1000);
                expect(delay).toBeLessThanOrEqual(1200);
            });

            it('should double delay for each attempt', () => {
                // Use custom config with 0 jitter for deterministic testing
                const noJitterConfig: AlarmRetryConfig = {
                    maxRetries: 5,
                    baseDelayMs: 1000,
                    maxDelayMs: 100000, // High cap to not interfere
                    jitterFactor: 0, // No jitter for exact values
                };

                expect(calculateBackoffDelay(0, noJitterConfig)).toBe(1000);  // 1000 * 2^0 = 1000
                expect(calculateBackoffDelay(1, noJitterConfig)).toBe(2000);  // 1000 * 2^1 = 2000
                expect(calculateBackoffDelay(2, noJitterConfig)).toBe(4000);  // 1000 * 2^2 = 4000
                expect(calculateBackoffDelay(3, noJitterConfig)).toBe(8000);  // 1000 * 2^3 = 8000
                expect(calculateBackoffDelay(4, noJitterConfig)).toBe(16000); // 1000 * 2^4 = 16000
            });

            it('should use default config when not provided', () => {
                // Default: baseDelayMs=1000, jitterFactor=0.2, maxDelayMs=30000
                const delay = calculateBackoffDelay(2);
                // 1000 * 2^2 = 4000, with up to 20% jitter = 4000-4800
                expect(delay).toBeGreaterThanOrEqual(4000);
                expect(delay).toBeLessThanOrEqual(4800);
            });
        });

        describe('capping at maxDelayMs', () => {
            it('should cap exponential growth at maxDelayMs', () => {
                const config: AlarmRetryConfig = {
                    maxRetries: 10,
                    baseDelayMs: 1000,
                    maxDelayMs: 5000, // Low cap for testing
                    jitterFactor: 0,
                };

                // Attempt 3: 1000 * 2^3 = 8000 → capped to 5000
                expect(calculateBackoffDelay(3, config)).toBe(5000);

                // Attempt 10: 1000 * 2^10 = 1024000 → capped to 5000
                expect(calculateBackoffDelay(10, config)).toBe(5000);
            });

            it('should apply jitter after capping', () => {
                const config: AlarmRetryConfig = {
                    maxRetries: 10,
                    baseDelayMs: 1000,
                    maxDelayMs: 5000,
                    jitterFactor: 0.2, // 20% jitter
                };

                // Attempt 10 is way over cap: capped to 5000, then jitter adds 0-1000
                const delay = calculateBackoffDelay(10, config);
                expect(delay).toBeGreaterThanOrEqual(5000);
                expect(delay).toBeLessThanOrEqual(6000); // 5000 + 20% = 6000 max
            });
        });

        describe('jitter behavior', () => {
            it('should add jitter within expected range', () => {
                const config: AlarmRetryConfig = {
                    maxRetries: 3,
                    baseDelayMs: 1000,
                    maxDelayMs: 30000,
                    jitterFactor: 0.5, // 50% jitter for clearer testing
                };

                // Run multiple times to statistically validate jitter
                const delays: number[] = [];
                for (let i = 0; i < 100; i++) {
                    delays.push(calculateBackoffDelay(1, config));
                }

                // Attempt 1: base delay = 1000 * 2^1 = 2000
                // With 50% jitter: 2000 to 3000ms range
                const min = Math.min(...delays);
                const max = Math.max(...delays);

                expect(min).toBeGreaterThanOrEqual(2000);
                expect(max).toBeLessThanOrEqual(3000);

                // Verify there's actually some variance (jitter is working)
                const hasVariance = max > min;
                expect(hasVariance).toBe(true);
            });

            it('should have no jitter when jitterFactor is 0', () => {
                const config: AlarmRetryConfig = {
                    maxRetries: 3,
                    baseDelayMs: 1000,
                    maxDelayMs: 30000,
                    jitterFactor: 0,
                };

                // Multiple calls should all return the same value
                const delays = [
                    calculateBackoffDelay(2, config),
                    calculateBackoffDelay(2, config),
                    calculateBackoffDelay(2, config),
                ];

                expect(delays[0]).toBe(4000); // 1000 * 2^2
                expect(delays[1]).toBe(4000);
                expect(delays[2]).toBe(4000);
            });

            it('should return integer values (floor applied)', () => {
                // The function uses Math.floor, so results should always be integers
                for (let i = 0; i < 50; i++) {
                    const delay = calculateBackoffDelay(Math.floor(Math.random() * 5));
                    expect(Number.isInteger(delay)).toBe(true);
                }
            });
        });

        describe('edge cases', () => {
            it('should handle attempt 0 correctly', () => {
                const config: AlarmRetryConfig = {
                    maxRetries: 3,
                    baseDelayMs: 500,
                    maxDelayMs: 30000,
                    jitterFactor: 0,
                };

                // 500 * 2^0 = 500
                expect(calculateBackoffDelay(0, config)).toBe(500);
            });

            it('should handle very large attempt numbers', () => {
                const config: AlarmRetryConfig = {
                    maxRetries: 100,
                    baseDelayMs: 1000,
                    maxDelayMs: 30000,
                    jitterFactor: 0,
                };

                // Any large attempt should cap at maxDelayMs
                expect(calculateBackoffDelay(50, config)).toBe(30000);
                expect(calculateBackoffDelay(100, config)).toBe(30000);
            });

            it('should handle custom base delay', () => {
                const config: AlarmRetryConfig = {
                    maxRetries: 3,
                    baseDelayMs: 100, // 100ms base
                    maxDelayMs: 30000,
                    jitterFactor: 0,
                };

                expect(calculateBackoffDelay(0, config)).toBe(100);  // 100 * 2^0
                expect(calculateBackoffDelay(1, config)).toBe(200);  // 100 * 2^1
                expect(calculateBackoffDelay(2, config)).toBe(400);  // 100 * 2^2
            });
        });
    });

    describe('AlarmRetryState type', () => {
        it('should support all required fields', () => {
            const state: AlarmRetryState = {
                attempt: 2,
                originalScheduledAt: Date.now(),
                context: 'auth-timeout',
            };
            expect(state.attempt).toBe(2);
            expect(state.context).toBe('auth-timeout');
            expect(state.originalScheduledAt).toBeGreaterThan(0);
        });

        it('should support optional lastError field', () => {
            const state: AlarmRetryState = {
                attempt: 1,
                originalScheduledAt: Date.now(),
                context: 'cleanup',
                lastError: 'Network timeout',
            };
            expect(state.lastError).toBe('Network timeout');
        });
    });

    describe('AlarmDeadLetterEntry type', () => {
        it('should support all required fields', () => {
            const entry: AlarmDeadLetterEntry = {
                id: 'dl-123',
                originalScheduledAt: Date.now() - 60000,
                deadLetteredAt: Date.now(),
                attempts: 3,
                finalError: 'Max retries exceeded',
                context: 'auth-timeout',
            };
            expect(entry.id).toBe('dl-123');
            expect(entry.attempts).toBe(3);
            expect(entry.finalError).toBe('Max retries exceeded');
            expect(entry.deadLetteredAt).toBeGreaterThan(entry.originalScheduledAt);
        });

        it('should support optional stack field', () => {
            const entry: AlarmDeadLetterEntry = {
                id: 'dl-456',
                originalScheduledAt: Date.now(),
                deadLetteredAt: Date.now(),
                attempts: 2,
                finalError: 'Storage unavailable',
                context: 'cleanup',
                stack: 'Error: Storage unavailable\n    at ConnectionManager.alarm',
            };
            expect(entry.stack).toContain('Error: Storage unavailable');
        });
    });
});
