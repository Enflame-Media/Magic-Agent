/**
 * Unit Tests for Health Routes (HAP-912)
 *
 * Tests for routes/health.ts covering:
 * - GET /health/messages endpoint
 * - Database connectivity checks
 * - Schema validation checks
 * - Healthy and unhealthy responses
 * - Error handling
 *
 * @module routes/health.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import healthRoutes from './health';

// Type for mock environment
interface MockEnv {
    DB: {
        prepare: ReturnType<typeof vi.fn>;
    };
}

// Health response types
interface HealthyResponse {
    status: 'healthy';
    checks: {
        database: 'ok' | 'error';
        schema: 'ok' | 'error';
    };
    timestamp: string;
    latencyMs?: number;
}

interface UnhealthyResponse {
    status: 'unhealthy';
    checks: {
        database: 'ok' | 'error';
        schema: 'ok' | 'error';
    };
    error: string;
    timestamp: string;
}

type HealthResponse = HealthyResponse | UnhealthyResponse;

describe('health routes (HAP-912)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Suppress console output in tests
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Create mock D1 database
     */
    function createMockDb(options: {
        querySuccess?: boolean;
        queryError?: Error | string;
    } = {}): MockEnv['DB'] {
        const { querySuccess = true, queryError } = options;

        return {
            prepare: vi.fn(() => ({
                first: vi.fn(async () => {
                    if (queryError) {
                        if (typeof queryError === 'string') {
                            throw queryError;
                        }
                        throw queryError;
                    }
                    return querySuccess ? { health_check: 1 } : null;
                }),
            })),
        };
    }

    /**
     * Create test app and make requests
     */
    async function makeRequest(mockDb: MockEnv['DB']): Promise<Response> {
        const app = new OpenAPIHono<{ Bindings: MockEnv }>();
        app.route('/', healthRoutes);
        return app.request('/health/messages', {}, { DB: mockDb });
    }

    describe('GET /health/messages', () => {
        describe('healthy responses', () => {
            it('should return 200 when all checks pass', async () => {
                const mockDb = createMockDb({ querySuccess: true });
                const response = await makeRequest(mockDb);

                expect(response.status).toBe(200);
                const body = await response.json() as HealthResponse;
                expect(body.status).toBe('healthy');
            });

            it('should return all checks as ok', async () => {
                const mockDb = createMockDb({ querySuccess: true });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthResponse;

                expect(body.checks.database).toBe('ok');
                expect(body.checks.schema).toBe('ok');
            });

            it('should include timestamp in response', async () => {
                const mockDb = createMockDb({ querySuccess: true });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthResponse;

                expect(body.timestamp).toBeDefined();
                expect(new Date(body.timestamp).getTime()).not.toBeNaN();
            });

            it('should include latencyMs in healthy response', async () => {
                const mockDb = createMockDb({ querySuccess: true });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthyResponse;

                expect(body.latencyMs).toBeDefined();
                expect(typeof body.latencyMs).toBe('number');
                expect(body.latencyMs).toBeGreaterThanOrEqual(0);
            });

            it('should execute database health check query', async () => {
                const mockDb = createMockDb({ querySuccess: true });
                await makeRequest(mockDb);

                expect(mockDb.prepare).toHaveBeenCalledWith('SELECT 1 as health_check');
            });
        });

        describe('database failure', () => {
            it('should return 503 when database check fails', async () => {
                const mockDb = createMockDb({
                    queryError: new Error('Database connection timeout'),
                });
                const response = await makeRequest(mockDb);

                expect(response.status).toBe(503);
            });

            it('should return unhealthy status on database error', async () => {
                const mockDb = createMockDb({
                    queryError: new Error('Connection refused'),
                });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthResponse;

                expect(body.status).toBe('unhealthy');
                expect(body.checks.database).toBe('error');
            });

            it('should include error message in response', async () => {
                const mockDb = createMockDb({
                    queryError: new Error('no such table: sessions'),
                });
                const response = await makeRequest(mockDb);
                const body = await response.json() as UnhealthyResponse;

                expect(body.error).toContain('Database');
                expect(body.error).toContain('no such table: sessions');
            });

            it('should handle unknown database errors', async () => {
                const mockDb = createMockDb({
                    queryError: 'Non-Error exception',
                });
                const response = await makeRequest(mockDb);
                const body = await response.json() as UnhealthyResponse;

                expect(body.status).toBe('unhealthy');
                expect(body.error).toContain('Unknown database error');
            });

            it('should still check schema even if database fails', async () => {
                const mockDb = createMockDb({
                    queryError: new Error('DB error'),
                });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthResponse;

                // Schema check should still pass
                expect(body.checks.schema).toBe('ok');
            });
        });

        describe('schema validation', () => {
            it('should validate message schema parsing', async () => {
                const mockDb = createMockDb({ querySuccess: true });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthResponse;

                expect(body.checks.schema).toBe('ok');
            });
        });

        describe('response timing', () => {
            it('should complete within reasonable time', async () => {
                const mockDb = createMockDb({ querySuccess: true });

                const startTime = Date.now();
                await makeRequest(mockDb);
                const duration = Date.now() - startTime;

                // Should complete within 5 seconds as per API spec
                expect(duration).toBeLessThan(5000);
            });
        });

        describe('timestamp format', () => {
            it('should return ISO 8601 formatted timestamp', async () => {
                const mockDb = createMockDb({ querySuccess: true });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthResponse;

                // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
                const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
                expect(body.timestamp).toMatch(isoRegex);
            });
        });

        describe('unhealthy response format', () => {
            it('should not include latencyMs in unhealthy response', async () => {
                const mockDb = createMockDb({
                    queryError: new Error('DB error'),
                });
                const response = await makeRequest(mockDb);
                const body = await response.json() as UnhealthyResponse;

                // Per schema, unhealthy responses don't include latencyMs
                expect((body as unknown as HealthyResponse).latencyMs).toBeUndefined();
            });

            it('should always include timestamp in unhealthy response', async () => {
                const mockDb = createMockDb({
                    queryError: new Error('DB error'),
                });
                const response = await makeRequest(mockDb);
                const body = await response.json() as HealthResponse;

                expect(body.timestamp).toBeDefined();
            });
        });
    });
});
