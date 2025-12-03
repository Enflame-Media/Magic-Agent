import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestApp } from './__test__/testUtils';
import { versionRoutes } from './versionRoutes';
import type { Fastify } from '../types';

/**
 * Integration tests for versionRoutes
 *
 * Tests the /v1/version endpoint which checks if client app versions
 * are up-to-date and returns store URLs for updates if needed.
 *
 * The endpoint uses semver comparison:
 * - iOS: satisfies '>=1.4.1' → null (up-to-date)
 * - Android: satisfies '>=1.4.1' → null (up-to-date)
 * - Below minimum → returns appropriate store URL
 * - Unknown platform → null (no update required)
 */
describe('versionRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        versionRoutes(app);
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /v1/version', () => {
        describe('iOS platform', () => {
            it('should return null updateUrl when iOS version satisfies minimum', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'ios',
                        version: '1.4.1',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBeNull();
            });

            it('should return null updateUrl when iOS version is above minimum', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'ios',
                        version: '2.0.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBeNull();
            });

            it('should return App Store URL when iOS version is below minimum', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'ios',
                        version: '1.4.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBe('https://apps.apple.com/us/app/happy-claude-code-client/id6748571505');
            });

            it('should return App Store URL for very old iOS version', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'ios',
                        version: '1.0.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBe('https://apps.apple.com/us/app/happy-claude-code-client/id6748571505');
            });

            it('should handle uppercase iOS platform', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'iOS',
                        version: '1.4.1',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBeNull();
            });
        });

        describe('Android platform', () => {
            it('should return null updateUrl when Android version satisfies minimum', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'android',
                        version: '1.4.1',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBeNull();
            });

            it('should return null updateUrl when Android version is above minimum', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'android',
                        version: '1.5.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBeNull();
            });

            it('should return Play Store URL when Android version is below minimum', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'android',
                        version: '1.3.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBe('https://play.google.com/store/apps/details?id=com.ex3ndr.happy');
            });

            it('should handle uppercase ANDROID platform', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'ANDROID',
                        version: '1.4.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBe('https://play.google.com/store/apps/details?id=com.ex3ndr.happy');
            });
        });

        describe('Unknown platform', () => {
            it('should return null updateUrl for unknown platform', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'windows',
                        version: '1.0.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBeNull();
            });

            it('should return null updateUrl for web platform', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'web',
                        version: '0.1.0',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(200);
                const body = JSON.parse(response.payload);
                expect(body.updateUrl).toBeNull();
            });
        });

        describe('Validation', () => {
            it('should return 400 for missing platform', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        version: '1.4.1',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(400);
            });

            it('should return 400 for missing version', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'ios',
                        app_id: 'com.ex3ndr.happy'
                    }
                });

                expect(response.statusCode).toBe(400);
            });

            it('should return 400 for missing app_id', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {
                        platform: 'ios',
                        version: '1.4.1'
                    }
                });

                expect(response.statusCode).toBe(400);
            });

            it('should return 400 for empty payload', async () => {
                const response = await app.inject({
                    method: 'POST',
                    url: '/v1/version',
                    headers: { 'Content-Type': 'application/json' },
                    payload: {}
                });

                expect(response.statusCode).toBe(400);
            });
        });
    });
});
