import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestApp, authHeader, TEST_USER_ID, createMockSession, createMockMachine, createMockAccessKey } from './__test__/testUtils';
import { accessKeysRoutes } from './accessKeysRoutes';
import type { Fastify } from '../types';

// Mock external dependencies
vi.mock('@/storage/db', () => ({
    db: {
        session: {
            findFirst: vi.fn(),
        },
        machine: {
            findFirst: vi.fn(),
        },
        accessKey: {
            findUnique: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn(),
        },
    },
}));

vi.mock('@/utils/log', () => ({
    log: vi.fn(),
}));

import { db } from '@/storage/db';

describe('accessKeysRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        accessKeysRoutes(app);
        await app.ready();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('GET /v1/access-keys/:sessionId/:machineId', () => {
        it('should return access key for valid session and machine', async () => {
            const session = createMockSession({ id: 'sess-123' });
            const machine = createMockMachine({ id: 'machine-456' });
            const accessKey = createMockAccessKey({
                sessionId: 'sess-123',
                machineId: 'machine-456',
            });

            vi.mocked(db.session.findFirst).mockResolvedValue(session as any);
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);
            vi.mocked(db.accessKey.findUnique).mockResolvedValue(accessKey as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.accessKey).toBeDefined();
            expect(body.accessKey.data).toBe(accessKey.data);
            expect(body.accessKey.dataVersion).toBe(accessKey.dataVersion);
        });

        it('should return null accessKey when no access key exists', async () => {
            const session = createMockSession({ id: 'sess-123' });
            const machine = createMockMachine({ id: 'machine-456' });

            vi.mocked(db.session.findFirst).mockResolvedValue(session as any);
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);
            vi.mocked(db.accessKey.findUnique).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.accessKey).toBeNull();
        });

        it('should return 404 when session not found', async () => {
            vi.mocked(db.session.findFirst).mockResolvedValue(null);
            vi.mocked(db.machine.findFirst).mockResolvedValue(createMockMachine() as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/access-keys/non-existent/machine-456',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Session or machine not found');
        });

        it('should return 404 when machine not found', async () => {
            vi.mocked(db.session.findFirst).mockResolvedValue(createMockSession() as any);
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/access-keys/sess-123/non-existent',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Session or machine not found');
        });

        it('should not return access key for another users resources', async () => {
            // Both session and machine return null because they don't belong to the user
            vi.mocked(db.session.findFirst).mockResolvedValue(null);
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/access-keys/other-user-session/other-user-machine',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/access-keys/sess-123/machine-456',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.session.findFirst).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'GET',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to get access key');
        });
    });

    describe('POST /v1/access-keys/:sessionId/:machineId', () => {
        it('should create a new access key', async () => {
            const session = createMockSession({ id: 'sess-123' });
            const machine = createMockMachine({ id: 'machine-456' });
            const newAccessKey = createMockAccessKey({
                sessionId: 'sess-123',
                machineId: 'machine-456',
                data: '{"encrypted": "data"}',
            });

            vi.mocked(db.session.findFirst).mockResolvedValue(session as any);
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);
            vi.mocked(db.accessKey.findUnique).mockResolvedValue(null);
            vi.mocked(db.accessKey.create).mockResolvedValue(newAccessKey as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"encrypted": "data"}',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.accessKey).toBeDefined();
            expect(body.accessKey.data).toBe('{"encrypted": "data"}');
        });

        it('should return 409 when access key already exists', async () => {
            const session = createMockSession({ id: 'sess-123' });
            const machine = createMockMachine({ id: 'machine-456' });
            const existingAccessKey = createMockAccessKey({
                sessionId: 'sess-123',
                machineId: 'machine-456',
            });

            vi.mocked(db.session.findFirst).mockResolvedValue(session as any);
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);
            vi.mocked(db.accessKey.findUnique).mockResolvedValue(existingAccessKey as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"new": "data"}',
                },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Access key already exists');
        });

        it('should return 404 when session not found', async () => {
            vi.mocked(db.session.findFirst).mockResolvedValue(null);
            vi.mocked(db.machine.findFirst).mockResolvedValue(createMockMachine() as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/access-keys/non-existent/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"test": "data"}',
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Session or machine not found');
        });

        it('should return 404 when machine not found', async () => {
            vi.mocked(db.session.findFirst).mockResolvedValue(createMockSession() as any);
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/access-keys/sess-123/non-existent',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"test": "data"}',
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Session or machine not found');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"test": "data"}',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return validation error when data is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {},
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.session.findFirst).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'POST',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"test": "data"}',
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to create access key');
        });
    });

    describe('PUT /v1/access-keys/:sessionId/:machineId', () => {
        it('should update access key with correct version', async () => {
            const existingAccessKey = createMockAccessKey({
                sessionId: 'sess-123',
                machineId: 'machine-456',
                dataVersion: 1,
            });

            vi.mocked(db.accessKey.findUnique).mockResolvedValue(existingAccessKey as any);
            vi.mocked(db.accessKey.updateMany).mockResolvedValue({ count: 1 });

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"updated": "data"}',
                    expectedVersion: 1,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.version).toBe(2);
        });

        it('should return version mismatch error when version conflicts', async () => {
            const existingAccessKey = createMockAccessKey({
                sessionId: 'sess-123',
                machineId: 'machine-456',
                dataVersion: 3, // Current version is 3
            });

            vi.mocked(db.accessKey.findUnique).mockResolvedValue(existingAccessKey as any);

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"updated": "data"}',
                    expectedVersion: 1, // Expecting version 1, but current is 3
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toBe('version-mismatch');
            expect(body.currentVersion).toBe(3);
            expect(body.currentData).toBe(existingAccessKey.data);
        });

        it('should handle race condition where version changes during update', async () => {
            const existingAccessKey = createMockAccessKey({
                sessionId: 'sess-123',
                machineId: 'machine-456',
                dataVersion: 1,
            });

            vi.mocked(db.accessKey.findUnique)
                .mockResolvedValueOnce(existingAccessKey as any) // First check
                .mockResolvedValueOnce({ ...existingAccessKey, dataVersion: 2, data: 'changed' } as any); // After failed update

            vi.mocked(db.accessKey.updateMany).mockResolvedValue({ count: 0 }); // No rows updated

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"updated": "data"}',
                    expectedVersion: 1,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toBe('version-mismatch');
            expect(body.currentVersion).toBe(2);
        });

        it('should return 404 when access key not found', async () => {
            vi.mocked(db.accessKey.findUnique).mockResolvedValue(null);

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/access-keys/non-existent-sess/non-existent-machine',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"updated": "data"}',
                    expectedVersion: 1,
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Access key not found');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"updated": "data"}',
                    expectedVersion: 1,
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return validation error when required fields are missing', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"updated": "data"}',
                    // Missing expectedVersion
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.accessKey.findUnique).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/access-keys/sess-123/machine-456',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    data: '{"updated": "data"}',
                    expectedVersion: 1,
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to update access key');
        });
    });
});
