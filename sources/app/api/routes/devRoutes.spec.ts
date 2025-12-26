import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { createTestApp } from './__test__/testUtils';
import { devRoutes } from './devRoutes';
import type { Fastify } from '../types';

// Use vi.hoisted to define mocks that will be available when vi.mock is hoisted
const { mockFileConsolidatedLogger } = vi.hoisted(() => ({
    mockFileConsolidatedLogger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('@/utils/log', () => ({
    log: vi.fn(),
    fileConsolidatedLogger: mockFileConsolidatedLogger,
}));

/**
 * Integration tests for devRoutes
 *
 * Tests the /logs-combined-from-cli-and-mobile-for-simple-ai-debugging endpoint
 * which is conditionally registered only when DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING
 * environment variable is set.
 *
 * The endpoint logs messages from CLI and mobile clients for debugging purposes.
 */
describe('devRoutes', () => {
    describe('with DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING enabled', () => {
        let app: Fastify;
        const originalEnv = process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING;

        beforeAll(() => {
            process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING = 'true';
        });

        afterAll(() => {
            if (originalEnv === undefined) {
                delete process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING;
            } else {
                process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING = originalEnv;
            }
        });

        beforeEach(async () => {
            app = createTestApp();
            devRoutes(app);
            await app.ready();
            vi.clearAllMocks();
        });

        afterEach(async () => {
            await app.close();
        });

        it('should accept valid log message from mobile', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Test log message from mobile',
                    source: 'mobile',
                    platform: 'ios'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(mockFileConsolidatedLogger.info).toHaveBeenCalled();
        });

        it('should accept valid log message from cli', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Test log message from CLI',
                    source: 'cli'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
        });

        it('should route error level to error logger', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Error from mobile',
                    source: 'mobile'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockFileConsolidatedLogger.error).toHaveBeenCalled();
        });

        it('should route warn level to warn logger', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'Warning from CLI',
                    source: 'cli'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockFileConsolidatedLogger.warn).toHaveBeenCalled();
        });

        it('should route warning level to warn logger', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'warning',
                    message: 'Warning from mobile',
                    source: 'mobile'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockFileConsolidatedLogger.warn).toHaveBeenCalled();
        });

        it('should route debug level to debug logger', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'debug',
                    message: 'Debug from CLI',
                    source: 'cli'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockFileConsolidatedLogger.debug).toHaveBeenCalled();
        });

        it('should default to info logger for unknown levels', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'trace',
                    message: 'Trace from mobile',
                    source: 'mobile'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockFileConsolidatedLogger.info).toHaveBeenCalled();
        });

        it('should accept messageRawObject when provided', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Test with raw object',
                    messageRawObject: { foo: 'bar', nested: { value: 123 } },
                    source: 'mobile'
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
        });

        describe('Validation', () => {
            it('should return 400 for missing timestamp', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        level: 'info',
                        message: 'Test message',
                        source: 'mobile'
                    }
                });

                expect(response.statusCode).toBe(400);
            });

            it('should return 400 for missing level', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        timestamp: new Date().toISOString(),
                        message: 'Test message',
                        source: 'mobile'
                    }
                });

                expect(response.statusCode).toBe(400);
            });

            it('should return 400 for missing message', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        timestamp: new Date().toISOString(),
                        level: 'info',
                        source: 'mobile'
                    }
                });

                expect(response.statusCode).toBe(400);
            });

            it('should return 400 for missing source', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        timestamp: new Date().toISOString(),
                        level: 'info',
                        message: 'Test message'
                    }
                });

                expect(response.statusCode).toBe(400);
            });

            it('should return 400 for invalid source enum', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        timestamp: new Date().toISOString(),
                        level: 'info',
                        message: 'Test message',
                        source: 'invalid-source'
                    }
                });

                expect(response.statusCode).toBe(400);
            });
        });
    });

    describe('without DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING', () => {
        let app: Fastify;
        const originalEnv = process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING;

        beforeAll(() => {
            delete process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING;
        });

        afterAll(() => {
            if (originalEnv !== undefined) {
                process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING = originalEnv;
            }
        });

        beforeEach(async () => {
            app = createTestApp();
            devRoutes(app);
            await app.ready();
        });

        afterEach(async () => {
            await app.close();
        });

        it('should return 404 when env var is not set', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
                headers: { 'Content-Type': 'application/json' },
                payload: {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Test message',
                    source: 'mobile'
                }
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
