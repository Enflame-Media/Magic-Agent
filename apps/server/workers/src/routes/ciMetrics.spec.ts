/**
 * Unit Tests for CI Metrics Routes (HAP-911)
 *
 * Tests for routes/ciMetrics.ts covering:
 * - POST /v1/ci/metrics - Bundle size metrics ingestion
 * - API key authentication (X-CI-API-Key header)
 * - Analytics Engine binding handling
 * - Error handling
 *
 * @module routes/ciMetrics.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';

// Import after any potential mocks
import ciMetricsRoutes from './ciMetrics';

/**
 * Type for mock environment
 */
interface MockEnv {
    BUNDLE_METRICS?: {
        writeDataPoint: ReturnType<typeof vi.fn>;
    };
    CI_METRICS_API_KEY?: string;
}

/**
 * Response body types
 */
interface SuccessResponse {
    success: boolean;
}

interface ErrorResponse {
    error: string;
}

/**
 * Create mock Analytics Engine binding
 */
function createMockAnalyticsEngine(): NonNullable<MockEnv['BUNDLE_METRICS']> {
    return {
        writeDataPoint: vi.fn(),
    };
}

describe('ciMetrics routes (HAP-911)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console output in tests
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('POST /v1/ci/metrics', () => {
        /**
         * Create test app and make CI metrics request
         */
        async function makeRequest(
            mockEnv: MockEnv,
            body: Record<string, unknown>,
            apiKey?: string
        ): Promise<Response> {
            const app = new OpenAPIHono<{ Bindings: MockEnv }>();
            app.route('/', ciMetricsRoutes);

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (apiKey) {
                headers['X-CI-API-Key'] = apiKey;
            }

            return app.request(
                '/v1/ci/metrics',
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                },
                mockEnv
            );
        }

        const validPayload = {
            platform: 'web',
            branch: 'main',
            commitHash: 'abc1234',
            jsBundleSize: 1048576,
            assetsSize: 524288,
            totalSize: 1572864,
            prNumber: null,
            buildId: '12345678-1',
        };

        describe('API key authentication', () => {
            it('should return 401 when CI_METRICS_API_KEY is not configured', async () => {
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: createMockAnalyticsEngine(),
                    // CI_METRICS_API_KEY not set
                };

                const response = await makeRequest(mockEnv, validPayload, 'any-key');

                expect(response.status).toBe(401);
            });

            it('should log warning when API key is not configured', async () => {
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: createMockAnalyticsEngine(),
                };

                await makeRequest(mockEnv, validPayload, 'any-key');

                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('CI_METRICS_API_KEY not configured')
                );
            });

            it('should return 401 when X-CI-API-Key header is missing', async () => {
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: createMockAnalyticsEngine(),
                    CI_METRICS_API_KEY: 'valid-secret-key',
                };

                const response = await makeRequest(mockEnv, validPayload);

                expect(response.status).toBe(401);
            });

            it('should log warning when API key header is missing', async () => {
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: createMockAnalyticsEngine(),
                    CI_METRICS_API_KEY: 'valid-secret-key',
                };

                await makeRequest(mockEnv, validPayload);

                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('Invalid or missing API key')
                );
            });

            it('should return 401 when API key is incorrect', async () => {
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: createMockAnalyticsEngine(),
                    CI_METRICS_API_KEY: 'valid-secret-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'wrong-key');

                expect(response.status).toBe(401);
            });

            it('should return error body for 401 responses', async () => {
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: createMockAnalyticsEngine(),
                    CI_METRICS_API_KEY: 'valid-secret-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'wrong-key');
                const body = (await response.json()) as ErrorResponse;

                expect(body.error).toBe('Unauthorized');
            });

            it('should accept valid API key', async () => {
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: createMockAnalyticsEngine(),
                    CI_METRICS_API_KEY: 'valid-secret-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'valid-secret-key');

                expect(response.status).toBe(200);
            });
        });

        describe('successful ingestion', () => {
            it('should return 200 when metrics are ingested', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'valid-key');

                expect(response.status).toBe(200);
            });

            it('should return success: true', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'valid-key');
                const body = (await response.json()) as SuccessResponse;

                expect(body.success).toBe(true);
            });

            it('should call writeDataPoint with correct structure', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                await makeRequest(mockEnv, validPayload, 'valid-key');

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith({
                    blobs: ['web', 'main', 'abc1234'],
                    doubles: [1048576, 524288, 1572864, 0],
                    indexes: ['12345678-1'],
                });
            });

            it('should include prNumber in doubles when provided', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const payloadWithPR = { ...validPayload, prNumber: 123 };
                await makeRequest(mockEnv, payloadWithPR, 'valid-key');

                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        doubles: [1048576, 524288, 1572864, 123],
                    })
                );
            });

            it('should use 0 for prNumber when null', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                await makeRequest(mockEnv, validPayload, 'valid-key');

                interface AnalyticsDataPoint {
                    blobs: string[];
                    doubles: number[];
                    indexes: string[];
                }
                const call = mockAnalytics.writeDataPoint.mock.calls[0] as
                    | AnalyticsDataPoint[]
                    | undefined;
                expect(call).toBeDefined();
                expect(call![0]!.doubles[3]).toBe(0);
            });

            it('should log success message', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                await makeRequest(mockEnv, validPayload, 'valid-key');

                expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Ingested'));
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining('platform=web'));
                expect(console.log).toHaveBeenCalledWith(expect.stringContaining('branch=main'));
            });

            it('should accept ios platform', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const iosPayload = { ...validPayload, platform: 'ios' };
                const response = await makeRequest(mockEnv, iosPayload, 'valid-key');

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: expect.arrayContaining(['ios']),
                    })
                );
            });

            it('should accept android platform', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const androidPayload = { ...validPayload, platform: 'android' };
                const response = await makeRequest(mockEnv, androidPayload, 'valid-key');

                expect(response.status).toBe(200);
                expect(mockAnalytics.writeDataPoint).toHaveBeenCalledWith(
                    expect.objectContaining({
                        blobs: expect.arrayContaining(['android']),
                    })
                );
            });
        });

        describe('Analytics Engine not configured', () => {
            it('should return 200 when BUNDLE_METRICS binding is missing', async () => {
                const mockEnv: MockEnv = {
                    CI_METRICS_API_KEY: 'valid-key',
                    // BUNDLE_METRICS intentionally not set
                };

                const response = await makeRequest(mockEnv, validPayload, 'valid-key');

                expect(response.status).toBe(200);
            });

            it('should return success: true even when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'valid-key');
                const body = (await response.json()) as SuccessResponse;

                expect(body.success).toBe(true);
            });

            it('should log warning when binding is missing', async () => {
                const mockEnv: MockEnv = {
                    CI_METRICS_API_KEY: 'valid-key',
                };

                await makeRequest(mockEnv, validPayload, 'valid-key');

                expect(console.warn).toHaveBeenCalledWith(
                    expect.stringContaining('BUNDLE_METRICS binding not configured')
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
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'valid-key');

                expect(response.status).toBe(500);
            });

            it('should return error message on 500', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const response = await makeRequest(mockEnv, validPayload, 'valid-key');
                const body = (await response.json()) as ErrorResponse;

                expect(body.error).toBe('Failed to ingest metric');
            });

            it('should log error when ingestion fails', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                mockAnalytics.writeDataPoint.mockImplementation(() => {
                    throw new Error('Analytics Engine error');
                });
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                await makeRequest(mockEnv, validPayload, 'valid-key');

                expect(console.error).toHaveBeenCalledWith(
                    '[CI Metrics] Failed to ingest metric:',
                    expect.any(Error)
                );
            });
        });

        describe('payload validation', () => {
            it('should accept valid short commit hash', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const payload = { ...validPayload, commitHash: 'abc1234' };
                const response = await makeRequest(mockEnv, payload, 'valid-key');

                expect(response.status).toBe(200);
            });

            it('should accept valid full commit hash', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const fullHash = 'abc1234567890abcdef1234567890abcdef1234';
                const payload = { ...validPayload, commitHash: fullHash };
                const response = await makeRequest(mockEnv, payload, 'valid-key');

                expect(response.status).toBe(200);
            });

            it('should accept zero for size values', async () => {
                const mockAnalytics = createMockAnalyticsEngine();
                const mockEnv: MockEnv = {
                    BUNDLE_METRICS: mockAnalytics,
                    CI_METRICS_API_KEY: 'valid-key',
                };

                const payload = {
                    ...validPayload,
                    jsBundleSize: 0,
                    assetsSize: 0,
                    totalSize: 0,
                };
                const response = await makeRequest(mockEnv, payload, 'valid-key');

                expect(response.status).toBe(200);
            });
        });
    });
});
