/**
 * Unit Tests for Client Metrics Routes (HAP-911)
 *
 * Tests for routes/clientMetrics.ts covering:
 * - POST /v1/analytics/client/validation - Validation metrics ingestion
 * - POST /v1/analytics/client/restore - Restore metrics ingestion
 * - Rate limiting (HAP-826)
 * - Analytics Engine binding handling (HAP-827)
 * - Error handling
 *
 * @module routes/clientMetrics.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { RateLimitResult } from '@/lib/rate-limit';

// Mock auth middleware
vi.mock('@/middleware/auth', () => ({
    authMiddleware: () => {
        return async (c: { set: (key: string, value: string) => void }, next: () => Promise<void>) => {
            c.set('userId', 'test-user-id');
            await next();
        };
    },
}));

// Mock rate limiter - use vi.hoisted to ensure mock function is available for factory
const { mockCheckRateLimit } = vi.hoisted(() => ({
    mockCheckRateLimit: vi.fn(),
}));

vi.mock('@/lib/rate-limit', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/rate-limit')>();
    return {
        ...original,
        checkRateLimit: mockCheckRateLimit,
    };
});

// Import after mocks are set up
import clientMetricsRoutes, { CLIENT_METRICS_RATE_LIMIT } from './clientMetrics';

/**
 * Analytics Engine data point type
 */
interface AnalyticsDataPoint {
    blobs: string[];
    doubles: number[];
    indexes: string[];
}

/**
 * Type for mock environment
 */
interface MockEnv {
    DB: D1Database;
    CLIENT_METRICS?: {
        writeDataPoint: ReturnType<typeof vi.fn>;
    };
    RATE_LIMIT_KV?: KVNamespace;
}

/**
 * Response body types
 */
interface SuccessResponse {
    success: boolean;
    dataPointsWritten?: number;
    ingested?: boolean;
    warning?: string;
}

interface ErrorResponse {
    error: string;
    retryAfter?: number;
}

/**
 * Create mock Analytics Engine binding
 */
function createMockAnalyticsEngine(): NonNullable<MockEnv['CLIENT_METRICS']> {
    return {
        writeDataPoint: vi.fn(),
    };
}

/**
 * Create mock D1 Database (not used by these routes but required by type)
 */
function createMockDb(): MockEnv['DB'] {
    return {} as MockEnv['DB'];
}

/**
 * Helper to set up rate limiter to allow requests
 */
function allowRateLimitedRequests(): void {
    mockCheckRateLimit.mockResolvedValue({
        allowed: true,
        count: 1,
        limit: 50,
        remaining: 49,
        retryAfter: 60,
    } satisfies RateLimitResult);
}

/**
 * Helper to set up rate limiter to block requests
 */
function blockRateLimitedRequests(): void {
    mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        count: 50,
        limit: 50,
        remaining: 0,
        retryAfter: 45,
    } satisfies RateLimitResult);
}

describe('clientMetrics routes (HAP-911)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console output in tests
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        // Default: allow rate-limited requests
        allowRateLimitedRequests();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('CLIENT_METRICS_RATE_LIMIT config', () => {
        it('should have correct rate limit configuration', () => {
            expect(CLIENT_METRICS_RATE_LIMIT).toEqual({
                maxRequests: 50,
                windowMs: 60_000,
                expirationTtl: 120,
            });
        });
    });

    describe('POST /v1/analytics/client/validation', () => {
        /**
         * Create test app and make validation request
         */
        async function makeValidationRequest(
            mockEnv: MockEnv,
            body: Record<string, unknown>
        ): Promise<Response> {
            const app = new OpenAPIHono<{ Bindings: MockEnv }>();
            app.route('/', clientMetricsRoutes);
            return app.request(
                '/v1/analytics/client/validation',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer test-token',
                    },
                    body: JSON.stringify(body),
                },
                mockEnv
            );
        }

        const validPayload = {
            schemaFailures: 2,
            unknownTypes: 5,
            strictValidationFailures: 1,
            unknownTypeBreakdown: [
                { typeName: 'thinking', count: 3 },
                { typeName: 'status', count: 2 },
            ],
            sessionDurationMs: 300000,
        };

        describe('successful ingestion', () => {
            it('should return 200 when metrics are successfully ingested', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.status).toBe(200);
                const body = (await response.json()) as SuccessResponse;
                expect(body.success).toBe(true);
            });

            it('should return dataPointsWritten count', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeValidationRequest(mockEnv, validPayload);
                const body = (await response.json()) as SuccessResponse;

                // 1 summary + 1 schema + 1 strict + 2 unknown types = 5
                expect(body.dataPointsWritten).toBe(5);
            });

            it('should write summary data point to Analytics Engine', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeValidationRequest(mockEnv, validPayload);

                // Check that writeDataPoint was called with summary
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalled();
                const calls = mockAnalytics.writeDataPoint.mock.calls as AnalyticsDataPoint[][];
                const summaryCall = calls.find(
                    (call) =>
                        call[0]?.blobs[0] === 'validation' && call[0]?.blobs[1] === 'summary'
                );
                expect(summaryCall).toBeDefined();
            });

            it('should write individual data points for each failure type', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeValidationRequest(mockEnv, validPayload);

                const calls = mockAnalytics.writeDataPoint.mock.calls as AnalyticsDataPoint[][];

                // Check for schema failure data point
                const schemaCall = calls.find(
                    (call) =>
                        call[0]?.blobs[0] === 'validation' && call[0]?.blobs[1] === 'schema'
                );
                expect(schemaCall).toBeDefined();

                // Check for strict failure data point
                const strictCall = calls.find(
                    (call) =>
                        call[0]?.blobs[0] === 'validation' && call[0]?.blobs[1] === 'strict'
                );
                expect(strictCall).toBeDefined();
            });

            it('should write data points for each unknown type', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeValidationRequest(mockEnv, validPayload);

                const calls = mockAnalytics.writeDataPoint.mock.calls as AnalyticsDataPoint[][];

                // Check for 'thinking' unknown type
                const thinkingCall = calls.find(
                    (call) =>
                        call[0]?.blobs[0] === 'validation' &&
                        call[0]?.blobs[1] === 'unknown' &&
                        call[0]?.blobs[2] === 'thinking'
                );
                expect(thinkingCall).toBeDefined();

                // Check for 'status' unknown type
                const statusCall = calls.find(
                    (call) =>
                        call[0]?.blobs[0] === 'validation' &&
                        call[0]?.blobs[1] === 'unknown' &&
                        call[0]?.blobs[2] === 'status'
                );
                expect(statusCall).toBeDefined();
            });

            it('should skip schema data point when schemaFailures is 0', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, schemaFailures: 0 };
                await makeValidationRequest(mockEnv, payload);

                const calls = mockAnalytics.writeDataPoint.mock.calls as AnalyticsDataPoint[][];
                const schemaCall = calls.find(
                    (call) =>
                        call[0]?.blobs[0] === 'validation' && call[0]?.blobs[1] === 'schema'
                );
                expect(schemaCall).toBeUndefined();
            });

            it('should skip strict data point when strictValidationFailures is 0', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, strictValidationFailures: 0 };
                await makeValidationRequest(mockEnv, payload);

                const calls = mockAnalytics.writeDataPoint.mock.calls as AnalyticsDataPoint[][];
                const strictCall = calls.find(
                    (call) =>
                        call[0]?.blobs[0] === 'validation' && call[0]?.blobs[1] === 'strict'
                );
                expect(strictCall).toBeUndefined();
            });

            it('should include userId in index field', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeValidationRequest(mockEnv, validPayload);

                const firstCall = mockAnalytics.writeDataPoint.mock.calls[0] as
                    | AnalyticsDataPoint[]
                    | undefined;
                expect(firstCall).toBeDefined();
                expect(firstCall![0]!.indexes).toContain('test-user-id');
            });
        });

        describe('Analytics Engine not configured (HAP-827)', () => {
            it('should return 200 when CLIENT_METRICS binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    // CLIENT_METRICS intentionally not set
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.status).toBe(200);
            });

            it('should return ingested: false when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);
                const body = (await response.json()) as SuccessResponse;

                expect(body.success).toBe(true);
                expect(body.ingested).toBe(false);
                expect(body.dataPointsWritten).toBe(0);
            });

            it('should include warning message when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);
                const body = (await response.json()) as SuccessResponse;

                expect(body.warning).toBe('Analytics Engine binding not configured');
            });

            it('should set X-Ingested: false header when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.headers.get('X-Ingested')).toBe('false');
            });

            it('should log warning when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                await makeValidationRequest(mockEnv, validPayload);

                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('CLIENT_METRICS binding not configured')
                );
            });
        });

        describe('rate limiting (HAP-826)', () => {
            it('should return 429 when rate limit is exceeded', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.status).toBe(429);
            });

            it('should include Retry-After header when rate limited', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.headers.get('Retry-After')).toBe('45');
            });

            it('should include X-RateLimit-Limit header when rate limited', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.headers.get('X-RateLimit-Limit')).toBe('50');
            });

            it('should include X-RateLimit-Remaining header when rate limited', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
            });

            it('should return rate limit error body', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeValidationRequest(mockEnv, validPayload);
                const body = (await response.json()) as ErrorResponse;

                expect(body.error).toBe('Rate limit exceeded');
                expect(body.retryAfter).toBe(45);
            });

            it('should call checkRateLimit with correct parameters', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                    RATE_LIMIT_KV: {} as KVNamespace,
                };

                await makeValidationRequest(mockEnv, validPayload);

                expect(mockCheckRateLimit).toHaveBeenCalledWith(
                    mockEnv.RATE_LIMIT_KV,
                    'client-metrics-validation',
                    'test-user-id',
                    CLIENT_METRICS_RATE_LIMIT
                );
            });
        });

        describe('error handling', () => {
            it('should return 500 when writeDataPoint throws', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeValidationRequest(mockEnv, validPayload);

                expect(response.status).toBe(500);
            });

            it('should return error message on 500', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeValidationRequest(mockEnv, validPayload);
                const body = (await response.json()) as ErrorResponse;

                expect(body.error).toBe('Failed to ingest metrics');
            });

            it('should log error when writeDataPoint fails', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeValidationRequest(mockEnv, validPayload);

                expect(console.error).toHaveBeenCalledWith(
                    '[ClientMetrics] Failed to ingest validation metrics:',
                    expect.any(Error)
                );
            });
        });
    });

    describe('POST /v1/analytics/client/restore', () => {
        /**
         * Create test app and make restore request
         */
        async function makeRestoreRequest(
            mockEnv: MockEnv,
            body: Record<string, unknown>
        ): Promise<Response> {
            const app = new OpenAPIHono<{ Bindings: MockEnv }>();
            app.route('/', clientMetricsRoutes);
            return app.request(
                '/v1/analytics/client/restore',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer test-token',
                    },
                    body: JSON.stringify(body),
                },
                mockEnv
            );
        }

        const successPayload = {
            sessionId: 'sess_abc123',
            machineId: 'mach_xyz789',
            success: true,
            timedOut: false,
            durationMs: 45000,
            newSessionId: 'sess_def456',
        };

        describe('successful ingestion', () => {
            it('should return 200 when restore metrics are ingested', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeRestoreRequest(mockEnv, successPayload);

                expect(response.status).toBe(200);
                const body = (await response.json()) as SuccessResponse;
                expect(body.success).toBe(true);
            });

            it('should return dataPointsWritten: 1', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeRestoreRequest(mockEnv, successPayload);
                const body = (await response.json()) as SuccessResponse;

                expect(body.dataPointsWritten).toBe(1);
            });

            it('should write data point with success outcome', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeRestoreRequest(mockEnv, successPayload);

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: ['restore', 'success', expect.stringContaining('sess_abc')],
                    })
                );
            });

            it('should write data point with timeout outcome', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const timeoutPayload = {
                    ...successPayload,
                    success: false,
                    timedOut: true,
                };
                await makeRestoreRequest(mockEnv, timeoutPayload);

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: ['restore', 'timeout', expect.any(String)],
                    })
                );
            });

            it('should write data point with failure outcome', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const failurePayload = {
                    ...successPayload,
                    success: false,
                    timedOut: false,
                };
                await makeRestoreRequest(mockEnv, failurePayload);

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: ['restore', 'failure', expect.any(String)],
                    })
                );
            });

            it('should truncate sessionId for privacy', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeRestoreRequest(mockEnv, successPayload);

                const call = mockAnalytics.writeDataPoint.mock.calls[0] as
                    | AnalyticsDataPoint[]
                    | undefined;
                expect(call).toBeDefined();
                // sessionId is truncated to first 8 characters
                expect(call![0]!.blobs[2]).toBe('sess_abc');
                expect(call![0]!.blobs[2]!.length).toBe(8);
            });

            it('should include duration and flags in doubles', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeRestoreRequest(mockEnv, successPayload);

                const call = mockAnalytics.writeDataPoint.mock.calls[0] as
                    | AnalyticsDataPoint[]
                    | undefined;
                expect(call).toBeDefined();
                expect(call![0]!.doubles[0]).toBe(45000); // durationMs
                expect(call![0]!.doubles[1]).toBe(0); // timedOut flag
                expect(call![0]!.doubles[2]).toBe(1); // success flag
            });

            it('should include userId in indexes', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeRestoreRequest(mockEnv, successPayload);

                const call = mockAnalytics.writeDataPoint.mock.calls[0] as
                    | AnalyticsDataPoint[]
                    | undefined;
                expect(call).toBeDefined();
                expect(call![0]!.indexes).toContain('test-user-id');
            });
        });

        describe('Analytics Engine not configured', () => {
            it('should return 200 when CLIENT_METRICS binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeRestoreRequest(mockEnv, successPayload);

                expect(response.status).toBe(200);
            });

            it('should return ingested: false when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeRestoreRequest(mockEnv, successPayload);
                const body = (await response.json()) as SuccessResponse;

                expect(body.ingested).toBe(false);
                expect(body.dataPointsWritten).toBe(0);
            });

            it('should log warning when restore metrics binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                await makeRestoreRequest(mockEnv, successPayload);

                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('restore metrics dropped')
                );
            });
        });

        describe('rate limiting', () => {
            it('should return 429 when rate limit is exceeded', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeRestoreRequest(mockEnv, successPayload);

                expect(response.status).toBe(429);
            });

            it('should call checkRateLimit with restore prefix', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: createMockAnalyticsEngine(),
                    RATE_LIMIT_KV: {} as KVNamespace,
                };

                await makeRestoreRequest(mockEnv, successPayload);

                expect(mockCheckRateLimit).toHaveBeenCalledWith(
                    mockEnv.RATE_LIMIT_KV,
                    'client-metrics-restore',
                    'test-user-id',
                    CLIENT_METRICS_RATE_LIMIT
                );
            });
        });

        describe('error handling', () => {
            it('should return 500 when writeDataPoint throws', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeRestoreRequest(mockEnv, successPayload);

                expect(response.status).toBe(500);
            });

            it('should return error message on 500', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                const response = await makeRestoreRequest(mockEnv, successPayload);
                const body = (await response.json()) as ErrorResponse;

                expect(body.error).toBe('Failed to ingest metrics');
            });

            it('should log error when restore ingestion fails', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    CLIENT_METRICS: mockAnalytics,
                };

                await makeRestoreRequest(mockEnv, successPayload);

                expect(console.error).toHaveBeenCalledWith(
                    '[ClientMetrics] Failed to ingest restore metrics:',
                    expect.any(Error)
                );
            });
        });
    });
});
