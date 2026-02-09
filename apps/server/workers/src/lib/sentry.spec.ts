/**
 * Unit Tests for Sentry Module (HAP-912)
 *
 * Tests for sentry.ts covering:
 * - buildSentryOptions configuration
 * - User context management
 * - Tag and context management
 * - Exception and message capture
 * - Breadcrumb filtering
 * - Performance spans
 *
 * @module lib/sentry.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Breadcrumb } from '@sentry/cloudflare';

// Mock @sentry/cloudflare with inline implementations
vi.mock('@sentry/cloudflare', () => {
    const mockSetUser = vi.fn();
    const mockSetContext = vi.fn();
    const mockSetTag = vi.fn();
    const mockCaptureException = vi.fn().mockReturnValue('event-id-exception');
    const mockCaptureMessage = vi.fn().mockReturnValue('event-id-message');
    const mockAddBreadcrumb = vi.fn();
    const mockFlush = vi.fn().mockResolvedValue(true);
    const mockStartSpan = vi.fn().mockImplementation((_opts, callback) => callback());
    const mockConsoleIntegration = vi.fn().mockReturnValue({ name: 'Console' });

    return {
        setUser: mockSetUser,
        setContext: mockSetContext,
        setTag: mockSetTag,
        captureException: mockCaptureException,
        captureMessage: mockCaptureMessage,
        addBreadcrumb: mockAddBreadcrumb,
        flush: mockFlush,
        startSpan: mockStartSpan,
        consoleIntegration: mockConsoleIntegration,
    };
});

// Import after mocks
import * as Sentry from '@sentry/cloudflare';
import {
    buildSentryOptions,
    setSentryUser,
    clearSentryUser,
    setSentryContext,
    setSentryTag,
    captureException,
    captureMessage,
    addBreadcrumb,
    flushSentry,
    startSpan,
    type SentryEnv,
    type SentryConfig,
} from './sentry';

describe('sentry module (HAP-912)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('buildSentryOptions', () => {
        /**
         * Create test environment
         */
        function createTestEnv(overrides: Partial<SentryEnv> = {}): SentryEnv {
            return {
                SENTRY_DSN: 'https://key@sentry.io/123',
                ENVIRONMENT: 'production',
                CF_VERSION_METADATA: { id: 'v1.2.3' },
                ...overrides,
            };
        }

        describe('basic configuration', () => {
            it('should return options with DSN from environment', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                expect(options.dsn).toBe('https://key@sentry.io/123');
            });

            it('should set environment from env', () => {
                const env = createTestEnv({ ENVIRONMENT: 'staging' });
                const options = buildSentryOptions(env);

                expect(options.environment).toBe('staging');
            });

            it('should default environment to production when not set', () => {
                const env = createTestEnv({ ENVIRONMENT: undefined });
                const options = buildSentryOptions(env);

                expect(options.environment).toBe('production');
            });

            it('should set release from CF_VERSION_METADATA', () => {
                const env = createTestEnv({ CF_VERSION_METADATA: { id: 'abc123' } });
                const options = buildSentryOptions(env);

                expect(options.release).toBe('abc123');
            });

            it('should handle missing CF_VERSION_METADATA', () => {
                const env = createTestEnv({ CF_VERSION_METADATA: undefined });
                const options = buildSentryOptions(env);

                expect(options.release).toBeUndefined();
            });
        });

        describe('sample rates', () => {
            it('should set default sample rate to 1.0', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                expect(options.sampleRate).toBe(1.0);
            });

            it('should set traces sample rate to 0.1 in production', () => {
                const env = createTestEnv({ ENVIRONMENT: 'production' });
                const options = buildSentryOptions(env);

                expect(options.tracesSampleRate).toBe(0.1);
            });

            it('should set traces sample rate to 1.0 in development', () => {
                const env = createTestEnv({ ENVIRONMENT: 'development' });
                const options = buildSentryOptions(env);

                expect(options.tracesSampleRate).toBe(1.0);
            });

            it('should allow overriding sample rate', () => {
                const env = createTestEnv();
                const config: SentryConfig = { sampleRate: 0.5 };
                const options = buildSentryOptions(env, config);

                expect(options.sampleRate).toBe(0.5);
            });

            it('should allow overriding traces sample rate', () => {
                const env = createTestEnv();
                const config: SentryConfig = { tracesSampleRate: 0.25 };
                const options = buildSentryOptions(env, config);

                expect(options.tracesSampleRate).toBe(0.25);
            });
        });

        describe('debug mode', () => {
            it('should enable debug in development', () => {
                const env = createTestEnv({ ENVIRONMENT: 'development' });
                const options = buildSentryOptions(env);

                expect(options.debug).toBe(true);
            });

            it('should disable debug in production', () => {
                const env = createTestEnv({ ENVIRONMENT: 'production' });
                const options = buildSentryOptions(env);

                expect(options.debug).toBe(false);
            });

            it('should allow overriding debug mode', () => {
                const env = createTestEnv({ ENVIRONMENT: 'production' });
                const config: SentryConfig = { debug: true };
                const options = buildSentryOptions(env, config);

                expect(options.debug).toBe(true);
            });
        });

        describe('stack trace and normalization', () => {
            it('should enable attachStacktrace', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                expect(options.attachStacktrace).toBe(true);
            });

            it('should set normalizeDepth to 10', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                expect(options.normalizeDepth).toBe(10);
            });
        });

        describe('integrations', () => {
            it('should include integrations array', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                expect(options.integrations).toBeDefined();
                expect(Array.isArray(options.integrations)).toBe(true);
            });
        });

        describe('beforeSend hook', () => {
            it('should filter WebSocket closing errors in production', () => {
                const env = createTestEnv({ ENVIRONMENT: 'production' });
                const options = buildSentryOptions(env);

                const event = { message: 'Test' } as Parameters<NonNullable<ReturnType<typeof buildSentryOptions>['beforeSend']>>[0];
                const hint = {
                    originalException: new Error('WebSocket is already in CLOSING state'),
                };

                const result = options.beforeSend?.(event, hint);

                expect(result).toBeNull();
            });

            it('should not filter WebSocket errors in development', () => {
                const env = createTestEnv({ ENVIRONMENT: 'development' });
                const options = buildSentryOptions(env);

                const event = { message: 'Test' } as Parameters<NonNullable<ReturnType<typeof buildSentryOptions>['beforeSend']>>[0];
                const hint = {
                    originalException: new Error('WebSocket is already in CLOSING state'),
                };

                const result = options.beforeSend?.(event, hint);

                expect(result).not.toBeNull();
            });

            it('should scrub authorization header', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const event = {
                    request: {
                        headers: {
                            authorization: 'Bearer secret-token',
                            'content-type': 'application/json',
                        },
                    },
                } as unknown as Parameters<NonNullable<ReturnType<typeof buildSentryOptions>['beforeSend']>>[0];

                const result = options.beforeSend?.(event, {}) as { request?: { headers?: Record<string, string> } } | null;

                expect(result?.request?.headers?.['authorization']).toBe('[Filtered]');
                expect(result?.request?.headers?.['content-type']).toBe('application/json');
            });

            it('should scrub cookie header', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const event = {
                    request: {
                        headers: {
                            cookie: 'session=abc123',
                        },
                    },
                } as unknown as Parameters<NonNullable<ReturnType<typeof buildSentryOptions>['beforeSend']>>[0];

                const result = options.beforeSend?.(event, {}) as { request?: { headers?: Record<string, string> } } | null;

                expect(result?.request?.headers?.['cookie']).toBe('[Filtered]');
            });

            it('should scrub x-auth-token header', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const event = {
                    request: {
                        headers: {
                            'x-auth-token': 'my-token',
                        },
                    },
                } as unknown as Parameters<NonNullable<ReturnType<typeof buildSentryOptions>['beforeSend']>>[0];

                const result = options.beforeSend?.(event, {}) as { request?: { headers?: Record<string, string> } } | null;

                expect(result?.request?.headers?.['x-auth-token']).toBe('[Filtered]');
            });

            it('should handle events without request headers', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const event = { message: 'Test event' } as Parameters<NonNullable<ReturnType<typeof buildSentryOptions>['beforeSend']>>[0];

                const result = options.beforeSend?.(event, {});

                expect(result).toEqual(event);
            });

            it('should pass through normal errors', () => {
                const env = createTestEnv({ ENVIRONMENT: 'production' });
                const options = buildSentryOptions(env);

                const event = { message: 'Normal error' } as Parameters<NonNullable<ReturnType<typeof buildSentryOptions>['beforeSend']>>[0];
                const hint = {
                    originalException: new Error('Database connection failed'),
                };

                const result = options.beforeSend?.(event, hint);

                expect(result).toEqual(event);
            });
        });

        describe('beforeBreadcrumb hook', () => {
            it('should filter auth URLs in fetch breadcrumbs', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const breadcrumb: Breadcrumb = {
                    category: 'fetch',
                    data: {
                        url: 'https://api.example.com/auth/login',
                    },
                };

                const result = options.beforeBreadcrumb?.(breadcrumb, {});

                expect(result?.data?.url).toBe('[Filtered Auth URL]');
            });

            it('should filter token URLs in fetch breadcrumbs', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const breadcrumb: Breadcrumb = {
                    category: 'fetch',
                    data: {
                        url: 'https://api.example.com/refresh-token',
                    },
                };

                const result = options.beforeBreadcrumb?.(breadcrumb, {});

                expect(result?.data?.url).toBe('[Filtered Auth URL]');
            });

            it('should not filter non-auth URLs', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const breadcrumb: Breadcrumb = {
                    category: 'fetch',
                    data: {
                        url: 'https://api.example.com/sessions',
                    },
                };

                const result = options.beforeBreadcrumb?.(breadcrumb, {});

                expect(result?.data?.url).toBe('https://api.example.com/sessions');
            });

            it('should handle non-fetch breadcrumbs', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const breadcrumb: Breadcrumb = {
                    category: 'console',
                    message: 'Log message',
                };

                const result = options.beforeBreadcrumb?.(breadcrumb, {});

                expect(result).toEqual(breadcrumb);
            });

            it('should handle fetch breadcrumbs without url', () => {
                const env = createTestEnv();
                const options = buildSentryOptions(env);

                const breadcrumb: Breadcrumb = {
                    category: 'fetch',
                    data: {},
                };

                const result = options.beforeBreadcrumb?.(breadcrumb, {});

                expect(result).toEqual(breadcrumb);
            });
        });
    });

    describe('setSentryUser', () => {
        it('should set user with id', () => {
            setSentryUser('user-123');

            expect(Sentry.setUser).toHaveBeenCalledWith({
                id: 'user-123',
            });
        });

        it('should set user with extras', () => {
            setSentryUser('user-456', { clientType: 'mobile', version: '1.0' });

            expect(Sentry.setUser).toHaveBeenCalledWith({
                id: 'user-456',
                clientType: 'mobile',
                version: '1.0',
            });
        });
    });

    describe('clearSentryUser', () => {
        it('should clear user by setting to null', () => {
            clearSentryUser();

            expect(Sentry.setUser).toHaveBeenCalledWith(null);
        });
    });

    describe('setSentryContext', () => {
        it('should set context with name and data', () => {
            setSentryContext('request', {
                requestId: '123',
                path: '/v1/sessions',
            });

            expect(Sentry.setContext).toHaveBeenCalledWith('request', {
                requestId: '123',
                path: '/v1/sessions',
            });
        });
    });

    describe('setSentryTag', () => {
        it('should set tag with key and value', () => {
            setSentryTag('error.code', 'AUTH_FAILED');

            expect(Sentry.setTag).toHaveBeenCalledWith('error.code', 'AUTH_FAILED');
        });
    });

    describe('captureException', () => {
        it('should capture exception and return event id', () => {
            const error = new Error('Test error');
            const result = captureException(error);

            expect(Sentry.captureException).toHaveBeenCalledWith(error, {
                tags: undefined,
                extra: undefined,
                level: undefined,
            });
            expect(result).toBe('event-id-exception');
        });

        it('should capture exception with context', () => {
            const error = new Error('Test error');
            const context = {
                tags: { operation: 'test' },
                extra: { attemptNumber: 3 },
                level: 'error' as const,
            };

            captureException(error, context);

            expect(Sentry.captureException).toHaveBeenCalledWith(error, {
                tags: { operation: 'test' },
                extra: { attemptNumber: 3 },
                level: 'error',
            });
        });

        it('should capture non-Error exceptions', () => {
            captureException('string error');

            expect(Sentry.captureException).toHaveBeenCalledWith('string error', expect.any(Object));
        });
    });

    describe('captureMessage', () => {
        it('should capture message with default level', () => {
            const result = captureMessage('Test message');

            expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info');
            expect(result).toBe('event-id-message');
        });

        it('should capture message with custom level', () => {
            captureMessage('Warning message', 'warning');

            expect(Sentry.captureMessage).toHaveBeenCalledWith('Warning message', 'warning');
        });

        it('should support all severity levels', () => {
            const levels = ['fatal', 'error', 'warning', 'log', 'info', 'debug'] as const;

            for (const level of levels) {
                captureMessage(`Message with ${level}`, level);
                expect(Sentry.captureMessage).toHaveBeenLastCalledWith(
                    `Message with ${level}`,
                    level
                );
            }
        });
    });

    describe('addBreadcrumb', () => {
        it('should add breadcrumb', () => {
            const breadcrumb: Breadcrumb = {
                category: 'websocket',
                message: 'Connection established',
                level: 'info',
                data: { connectionId: '123' },
            };

            addBreadcrumb(breadcrumb);

            expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(breadcrumb);
        });
    });

    describe('flushSentry', () => {
        it('should flush with default timeout', async () => {
            const result = await flushSentry();

            expect(Sentry.flush).toHaveBeenCalledWith(2000);
            expect(result).toBe(true);
        });

        it('should flush with custom timeout', async () => {
            await flushSentry(5000);

            expect(Sentry.flush).toHaveBeenCalledWith(5000);
        });
    });

    describe('startSpan', () => {
        it('should execute callback within span', async () => {
            const callback = vi.fn().mockResolvedValue('result');

            const result = await startSpan(
                { op: 'db.query', name: 'Fetch sessions' },
                callback
            );

            expect(Sentry.startSpan).toHaveBeenCalledWith(
                { op: 'db.query', name: 'Fetch sessions' },
                callback
            );
            expect(callback).toHaveBeenCalled();
            expect(result).toBe('result');
        });

        it('should pass attributes to span', async () => {
            const callback = vi.fn().mockReturnValue('sync-result');

            await startSpan(
                {
                    op: 'http.request',
                    name: 'API call',
                    attributes: { url: 'https://api.example.com', method: 'GET' },
                },
                callback
            );

            expect(Sentry.startSpan).toHaveBeenCalledWith(
                {
                    op: 'http.request',
                    name: 'API call',
                    attributes: { url: 'https://api.example.com', method: 'GET' },
                },
                callback
            );
        });

        it('should support synchronous callbacks', async () => {
            const callback = vi.fn().mockReturnValue(42);

            const result = await startSpan(
                { op: 'compute', name: 'Calculate' },
                callback
            );

            expect(result).toBe(42);
        });
    });
});
