import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestApp, authHeader, TEST_USER_ID, TEST_USER_ID_2, createMockMachine } from './__test__/testUtils';
import { machinesRoutes } from './machinesRoutes';
import type { Fastify } from '../types';

// Mock external dependencies
vi.mock('@/storage/db', () => ({
    db: {
        machine: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('@/app/events/eventRouter', () => ({
    eventRouter: {
        emitUpdate: vi.fn(),
        emitEphemeral: vi.fn(),
    },
    buildNewMachineUpdate: vi.fn().mockReturnValue({ type: 'new-machine', data: {} }),
    buildUpdateMachineUpdate: vi.fn().mockReturnValue({ type: 'update-machine', data: {} }),
    buildMachineStatusEphemeral: vi.fn().mockReturnValue({ type: 'machine-status', machineId: 'test', online: true }),
}));

vi.mock('@/storage/seq', () => ({
    allocateUserSeq: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/utils/log', () => ({
    log: vi.fn(),
}));

vi.mock('@/utils/randomKeyNaked', () => ({
    randomKeyNaked: vi.fn().mockReturnValue('random123'),
}));

import { db } from '@/storage/db';

describe('machinesRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        machinesRoutes(app);
        await app.ready();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('POST /v1/machines', () => {
        it('should create a new machine when ID does not exist', async () => {
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);
            const newMachine = createMockMachine({ id: 'new-machine-id' });
            vi.mocked(db.machine.create).mockResolvedValue(newMachine as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/machines',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: 'new-machine-id',
                    metadata: '{"name": "My Machine"}',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine).toBeDefined();
            expect(body.machine.id).toBe('new-machine-id');
            expect(vi.mocked(db.machine.create)).toHaveBeenCalled();
        });

        it('should return existing machine when ID already exists', async () => {
            const existingMachine = createMockMachine({ id: 'existing-machine' });
            vi.mocked(db.machine.findFirst).mockResolvedValue(existingMachine as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/machines',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: 'existing-machine',
                    metadata: '{"name": "My Machine"}',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine.id).toBe('existing-machine');
            // Should not have called create
            expect(vi.mocked(db.machine.create)).not.toHaveBeenCalled();
        });

        it('should include daemonState when provided', async () => {
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);
            const newMachine = createMockMachine({
                id: 'new-machine',
                daemonState: '{"status": "running"}',
                daemonStateVersion: 1,
            });
            vi.mocked(db.machine.create).mockResolvedValue(newMachine as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/machines',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: 'new-machine',
                    metadata: '{"name": "My Machine"}',
                    daemonState: '{"status": "running"}',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine.daemonState).toBe('{"status": "running"}');
        });

        it('should include dataEncryptionKey when provided', async () => {
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);
            const newMachine = createMockMachine({
                id: 'new-machine',
                dataEncryptionKey: new Uint8Array([1, 2, 3, 4]),
            });
            vi.mocked(db.machine.create).mockResolvedValue(newMachine as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/machines',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: 'new-machine',
                    metadata: '{"name": "My Machine"}',
                    dataEncryptionKey: 'AQIDBA==',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine.dataEncryptionKey).toBeDefined();
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/machines',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: 'machine-id',
                    metadata: '{}',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return validation error for missing required fields', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/machines',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    // Missing id and metadata
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe('GET /v1/machines', () => {
        it('should return all machines for authenticated user', async () => {
            const mockMachines = [
                createMockMachine({ id: 'machine-1' }),
                createMockMachine({ id: 'machine-2' }),
            ];
            vi.mocked(db.machine.findMany).mockResolvedValue(mockMachines as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body).toHaveLength(2);
            expect(body[0].id).toBe('machine-1');
            expect(body[1].id).toBe('machine-2');
        });

        it('should return empty array when user has no machines', async () => {
            vi.mocked(db.machine.findMany).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body).toHaveLength(0);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return 401 with invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines',
                headers: authHeader('invalid-token'),
            });

            expect(response.statusCode).toBe(401);
        });

        it('should only return machines for the authenticated user', async () => {
            // Verify the findMany is called with the correct accountId filter
            vi.mocked(db.machine.findMany).mockResolvedValue([]);

            await app.inject({
                method: 'GET',
                url: '/v1/machines',
                headers: authHeader(),
            });

            expect(vi.mocked(db.machine.findMany)).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { accountId: TEST_USER_ID },
                })
            );
        });
    });

    describe('GET /v1/machines/:id', () => {
        it('should return a specific machine by ID', async () => {
            const machine = createMockMachine({ id: 'machine-123' });
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines/machine-123',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine).toBeDefined();
            expect(body.machine.id).toBe('machine-123');
        });

        it('should return 404 for non-existent machine', async () => {
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines/non-existent',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Machine not found');
        });

        it('should not return another users machine', async () => {
            // findFirst returns null because accountId filter doesn't match
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines/other-user-machine',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            expect(vi.mocked(db.machine.findFirst)).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        accountId: TEST_USER_ID,
                        id: 'other-user-machine',
                    },
                })
            );
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines/machine-123',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should include all machine fields in response', async () => {
            const now = new Date();
            const machine = createMockMachine({
                id: 'machine-full',
                metadata: '{"name": "Test"}',
                metadataVersion: 2,
                daemonState: '{"status": "active"}',
                daemonStateVersion: 3,
                dataEncryptionKey: new Uint8Array([1, 2, 3]),
                seq: 5,
                active: true,
                lastActiveAt: now,
                createdAt: now,
                updatedAt: now,
            });
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/machines/machine-full',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine.id).toBe('machine-full');
            expect(body.machine.metadata).toBe('{"name": "Test"}');
            expect(body.machine.metadataVersion).toBe(2);
            expect(body.machine.daemonState).toBe('{"status": "active"}');
            expect(body.machine.daemonStateVersion).toBe(3);
            expect(body.machine.seq).toBe(5);
            expect(body.machine.active).toBe(true);
            expect(body.machine.activeAt).toBe(now.getTime());
            expect(body.machine.createdAt).toBe(now.getTime());
            expect(body.machine.updatedAt).toBe(now.getTime());
        });
    });

    describe('PUT /v1/machines/:id/status', () => {
        it('should update machine status to active', async () => {
            const machine = createMockMachine({ id: 'machine-123', active: false });
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);

            const updatedMachine = createMockMachine({ id: 'machine-123', active: true });
            vi.mocked(db.machine.update).mockResolvedValue(updatedMachine as any);

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/machine-123/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: true,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine).toBeDefined();
            expect(body.machine.id).toBe('machine-123');
            expect(body.machine.active).toBe(true);
            expect(vi.mocked(db.machine.update)).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'machine-123' },
                    data: expect.objectContaining({
                        active: true,
                    }),
                })
            );
        });

        it('should update machine status to inactive', async () => {
            const machine = createMockMachine({ id: 'machine-123', active: true });
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);

            const updatedMachine = createMockMachine({ id: 'machine-123', active: false });
            vi.mocked(db.machine.update).mockResolvedValue(updatedMachine as any);

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/machine-123/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: false,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine.active).toBe(false);
        });

        it('should return 404 for non-existent machine', async () => {
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/non-existent/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: true,
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Machine not found');
            expect(vi.mocked(db.machine.update)).not.toHaveBeenCalled();
        });

        it('should not update another users machine', async () => {
            // findFirst returns null because accountId filter doesn't match
            vi.mocked(db.machine.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/other-user-machine/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: true,
                },
            });

            expect(response.statusCode).toBe(404);
            expect(vi.mocked(db.machine.findFirst)).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        accountId: TEST_USER_ID,
                        id: 'other-user-machine',
                    },
                })
            );
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/machine-123/status',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: true,
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return validation error for missing active field', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/machine-123/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {},
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return validation error for invalid active field type', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/machine-123/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: 'not-a-boolean',
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should emit ephemeral event on status update', async () => {
            const { eventRouter } = await import('@/app/events/eventRouter');

            const machine = createMockMachine({ id: 'machine-123', active: false });
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);

            const updatedMachine = createMockMachine({ id: 'machine-123', active: true });
            vi.mocked(db.machine.update).mockResolvedValue(updatedMachine as any);

            await app.inject({
                method: 'PUT',
                url: '/v1/machines/machine-123/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: true,
                },
            });

            expect(eventRouter.emitEphemeral).toHaveBeenCalled();
        });

        it('should include all machine fields in response', async () => {
            const now = new Date();
            const machine = createMockMachine({
                id: 'machine-full',
                metadata: '{"name": "Test"}',
                metadataVersion: 2,
                daemonState: '{"status": "active"}',
                daemonStateVersion: 3,
                dataEncryptionKey: new Uint8Array([1, 2, 3]),
                seq: 5,
                active: false,
                lastActiveAt: now,
                createdAt: now,
                updatedAt: now,
            });
            vi.mocked(db.machine.findFirst).mockResolvedValue(machine as any);

            const updatedMachine = createMockMachine({
                ...machine,
                active: true,
                lastActiveAt: new Date(),
            });
            vi.mocked(db.machine.update).mockResolvedValue(updatedMachine as any);

            const response = await app.inject({
                method: 'PUT',
                url: '/v1/machines/machine-full/status',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    active: true,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.machine.id).toBe('machine-full');
            expect(body.machine.metadata).toBe('{"name": "Test"}');
            expect(body.machine.metadataVersion).toBe(2);
            expect(body.machine.daemonState).toBe('{"status": "active"}');
            expect(body.machine.daemonStateVersion).toBe(3);
            expect(body.machine.seq).toBe(5);
            expect(body.machine.active).toBe(true);
            expect(body.machine.activeAt).toBeDefined();
            expect(body.machine.createdAt).toBeDefined();
            expect(body.machine.updatedAt).toBeDefined();
        });
    });
});
