/**
 * Unit Tests for Analytics Routes (HAP-911)
 *
 * Tests for routes/analytics.ts covering:
 * - POST /v1/analytics/sync - Sync metrics ingestion
 * - Rate limiting (HAP-826)
 * - Analytics Engine binding handling (HAP-827)
 * - Error handling
 *
 * @module routes/analytics.spec
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
import analyticsRoutes, { ANALYTICS_RATE_LIMIT } from './analytics';

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
    SYNC_METRICS?: {
        writeDataPoint: ReturnType<typeof vi.fn>;
    };
    RATE_LIMIT_KV?: KVNamespace;
}

/**
 * Response body types
 */
interface SuccessResponse {
    success: boolean;
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
function createMockAnalyticsEngine(): NonNullable<MockEnv['SYNC_METRICS']> {
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
        limit: 100,
        remaining: 99,
        retryAfter: 60,
    } satisfies RateLimitResult);
}

/**
 * Helper to set up rate limiter to block requests
 */
function blockRateLimitedRequests(): void {
    mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        count: 100,
        limit: 100,
        remaining: 0,
        retryAfter: 30,
    } satisfies RateLimitResult);
}

describe('analytics routes (HAP-911)', () => {
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

    describe('ANALYTICS_RATE_LIMIT config', () => {
        it('should have correct rate limit configuration', () => {
            expect(ANALYTICS_RATE_LIMIT).toEqual({
                maxRequests: 100,
                windowMs: 60_000,
                expirationTtl: 120,
            });
        });
    });

    describe('POST /v1/analytics/sync', () => {
        /**
         * Create test app and make sync request
         */
        async function makeSyncRequest(
            mockEnv: MockEnv,
            body: Record<string, unknown>
        ): Promise<Response> {
            const app = new OpenAPIHono<{ Bindings: MockEnv }>();
            app.route('/', analyticsRoutes);
            return app.request(
                '/v1/analytics/sync',
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
            type: 'messages',
            mode: 'incremental',
            bytesReceived: 15360,
            itemsReceived: 42,
            itemsSkipped: 5,
            durationMs: 1250,
        };

        describe('successful ingestion', () => {
            it('should return 200 when metrics are ingested', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.status).toBe(200);
            });

            it('should return success: true', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const response = await makeSyncRequest(mockEnv, validPayload);
                const body = (await response.json()) as SuccessResponse;

                expect(body.success).toBe(true);
            });

            it('should call writeDataPoint with correct structure', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                await makeSyncRequest(mockEnv, validPayload);

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
                    blobs: ['messages', 'incremental', '', ''],
                    doubles: [15360, 42, 5, 1250],
                    indexes: ['test-user-id'],
                });
            });

            it('should include sessionId when provided', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, sessionId: 'sess_abc123' };
                await makeSyncRequest(mockEnv, payload);

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: ['messages', 'incremental', 'sess_abc123', ''],
                    })
                );
            });

            it('should include cacheStatus when provided (HAP-808)', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, cacheStatus: 'hit' };
                await makeSyncRequest(mockEnv, payload);

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: ['messages', 'incremental', '', 'hit'],
                    })
                );
            });

            it('should include userId in indexes', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                await makeSyncRequest(mockEnv, validPayload);

                const call = mockAnalytics.writeDataPoint.mock.calls[0] as
                    | AnalyticsDataPoint[]
                    | undefined;
                expect(call).toBeDefined();
                expect(call![0]!.indexes).toContain('test-user-id');
            });
        });

        describe('sync type variations', () => {
            it('should accept messages sync type', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, type: 'messages' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
            });

            it('should accept profile sync type', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, type: 'profile' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: expect.arrayContaining(['profile']),
                    })
                );
            });

            it('should accept artifacts sync type', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, type: 'artifacts' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: expect.arrayContaining(['artifacts']),
                    })
                );
            });
        });

        describe('sync mode variations', () => {
            it('should accept full sync mode', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, mode: 'full' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: expect.arrayContaining(['full']),
                    })
                );
            });

            it('should accept incremental sync mode', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, mode: 'incremental' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
            });

            it('should accept cached sync mode', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, mode: 'cached' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: expect.arrayContaining(['cached']),
                    })
                );
            });
        });

        describe('cache status variations (HAP-808)', () => {
            it('should accept hit cache status', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, cacheStatus: 'hit' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
            });

            it('should accept miss cache status', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = { ...validPayload, cacheStatus: 'miss' };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: ['messages', 'incremental', '', 'miss'],
                    })
                );
            });

            it('should handle missing cache status for backward compatibility', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                // No cacheStatus in payload
                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: ['messages', 'incremental', '', ''],
                    })
                );
            });
        });

        describe('Analytics Engine not configured (HAP-827)', () => {
            it('should return 200 when SYNC_METRICS binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    // SYNC_METRICS intentionally not set
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.status).toBe(200);
            });

            it('should return ingested: false when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);
                const body = (await response.json()) as SuccessResponse;

                expect(body.success).toBe(true);
                expect(body.ingested).toBe(false);
            });

            it('should include warning message when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);
                const body = (await response.json()) as SuccessResponse;

                expect(body.warning).toBe('Analytics Engine binding not configured');
            });

            it('should set X-Ingested: false header when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.headers.get('X-Ingested')).toBe('false');
            });

            it('should log warning when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                };

                await makeSyncRequest(mockEnv, validPayload);

                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('SYNC_METRICS binding not configured')
                );
            });
        });

        describe('rate limiting (HAP-826)', () => {
            it('should return 429 when rate limit is exceeded', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.status).toBe(429);
            });

            it('should include Retry-After header when rate limited', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.headers.get('Retry-After')).toBe('30');
            });

            it('should include X-RateLimit-Limit header when rate limited', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
            });

            it('should include X-RateLimit-Remaining header when rate limited', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
            });

            it('should return rate limit error body', async () => {
                blockRateLimitedRequests();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: createMockAnalyticsEngine(),
                };

                const response = await makeSyncRequest(mockEnv, validPayload);
                const body = (await response.json()) as ErrorResponse;

                expect(body.error).toBe('Rate limit exceeded');
                expect(body.retryAfter).toBe(30);
            });

            it('should call checkRateLimit with correct parameters', async () => {
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: createMockAnalyticsEngine(),
                    RATE_LIMIT_KV: {} as KVNamespace,
                };

                await makeSyncRequest(mockEnv, validPayload);

                expect(mockCheckRateLimit).toHaveBeenCalledWith(
                    mockEnv.RATE_LIMIT_KV,
                    'analytics-sync',
                    'test-user-id',
                    ANALYTICS_RATE_LIMIT
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
                    SYNC_METRICS: mockAnalytics,
                };

                const response = await makeSyncRequest(mockEnv, validPayload);

                expect(response.status).toBe(500);
            });

            it('should return error message on 500', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const response = await makeSyncRequest(mockEnv, validPayload);
                const body = (await response.json()) as ErrorResponse;

                expect(body.error).toBe('Failed to ingest metric');
            });

            it('should log error when ingestion fails', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                await makeSyncRequest(mockEnv, validPayload);

                expect(console.error).toHaveBeenCalledWith(
                    '[Analytics] Failed to ingest sync metric:',
                    expect.any(Error)
                );
            });
        });

        describe('numeric field handling', () => {
            it('should accept zero values for all numeric fields', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = {
                    ...validPayload,
                    bytesReceived: 0,
                    itemsReceived: 0,
                    itemsSkipped: 0,
                    durationMs: 0,
                };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        doubles: [0, 0, 0, 0],
                    })
                );
            });

            it('should handle large numeric values', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    DB: createMockDb(),
                    SYNC_METRICS: mockAnalytics,
                };

                const payload = {
                    ...validPayload,
                    bytesReceived: 1_000_000_000, // 1GB
                    itemsReceived: 100_000,
                    itemsSkipped: 50_000,
                    durationMs: 300_000, // 5 minutes
                };
                const response = await makeSyncRequest(mockEnv, payload);

                expect(response.status).toBe(200);
            });
        });
    });
});
