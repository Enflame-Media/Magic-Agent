import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestApp, authHeader, TEST_USER_ID, createMockArtifact, randomId } from './__test__/testUtils';
import { artifactsRoutes } from './artifactsRoutes';
import type { Fastify } from '../types';

// Mock external dependencies
vi.mock('@/storage/db', () => ({
    db: {
        artifact: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    },
}));

vi.mock('@/app/events/eventRouter', () => ({
    eventRouter: {
        emitUpdate: vi.fn(),
    },
    buildNewArtifactUpdate: vi.fn().mockReturnValue({ type: 'new-artifact', data: {} }),
    buildUpdateArtifactUpdate: vi.fn().mockReturnValue({ type: 'update-artifact', data: {} }),
    buildDeleteArtifactUpdate: vi.fn().mockReturnValue({ type: 'delete-artifact', data: {} }),
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

describe('artifactsRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        artifactsRoutes(app);
        await app.ready();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('GET /v1/artifacts', () => {
        it('should return all artifacts for authenticated user', async () => {
            const mockArtifacts = [
                createMockArtifact({ id: 'artifact-1' }),
                createMockArtifact({ id: 'artifact-2' }),
            ];
            vi.mocked(db.artifact.findMany).mockResolvedValue(mockArtifacts as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body).toHaveLength(2);
            expect(body[0].id).toBe('artifact-1');
            expect(body[1].id).toBe('artifact-2');
        });

        it('should return empty array when user has no artifacts', async () => {
            vi.mocked(db.artifact.findMany).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body).toHaveLength(0);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should encode header and dataEncryptionKey as base64', async () => {
            const artifact = createMockArtifact({
                id: 'artifact-1',
                header: new Uint8Array([1, 2, 3, 4]),
                dataEncryptionKey: new Uint8Array([5, 6, 7, 8]),
            });
            vi.mocked(db.artifact.findMany).mockResolvedValue([artifact] as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body[0].header).toBeDefined();
            expect(body[0].dataEncryptionKey).toBeDefined();
            // These should be base64 encoded strings
            expect(typeof body[0].header).toBe('string');
            expect(typeof body[0].dataEncryptionKey).toBe('string');
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.artifact.findMany).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to get artifacts');
        });
    });

    describe('GET /v1/artifacts/:id', () => {
        it('should return a specific artifact by ID with full body', async () => {
            const artifact = createMockArtifact({ id: 'artifact-123' });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts/artifact-123',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.id).toBe('artifact-123');
            expect(body.body).toBeDefined();
            expect(body.bodyVersion).toBeDefined();
        });

        it('should return 404 for non-existent artifact', async () => {
            vi.mocked(db.artifact.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts/non-existent',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Artifact not found');
        });

        it('should not return another users artifact', async () => {
            vi.mocked(db.artifact.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts/other-user-artifact',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            expect(vi.mocked(db.artifact.findFirst)).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        id: 'other-user-artifact',
                        accountId: TEST_USER_ID,
                    },
                })
            );
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts/artifact-123',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.artifact.findFirst).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'GET',
                url: '/v1/artifacts/artifact-123',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to get artifact');
        });
    });

    describe('POST /v1/artifacts', () => {
        it('should create a new artifact', async () => {
            const artifactId = '123e4567-e89b-12d3-a456-426614174000';
            vi.mocked(db.artifact.findUnique).mockResolvedValue(null);
            const newArtifact = createMockArtifact({ id: artifactId });
            vi.mocked(db.artifact.create).mockResolvedValue(newArtifact as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: artifactId,
                    header: 'AQIDBA==', // base64
                    body: 'BQYHCA==', // base64
                    dataEncryptionKey: 'CQoLDA==', // base64
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.id).toBe(artifactId);
            expect(vi.mocked(db.artifact.create)).toHaveBeenCalled();
        });

        it('should return existing artifact if ID already exists for same user (idempotent)', async () => {
            const artifactId = '123e4567-e89b-12d3-a456-426614174000';
            const existingArtifact = createMockArtifact({
                id: artifactId,
                accountId: TEST_USER_ID,
            });
            vi.mocked(db.artifact.findUnique).mockResolvedValue(existingArtifact as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: artifactId,
                    header: 'AQIDBA==',
                    body: 'BQYHCA==',
                    dataEncryptionKey: 'CQoLDA==',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.id).toBe(artifactId);
            expect(vi.mocked(db.artifact.create)).not.toHaveBeenCalled();
        });

        it('should return 409 if ID exists for different user', async () => {
            const artifactId = '123e4567-e89b-12d3-a456-426614174000';
            const existingArtifact = createMockArtifact({
                id: artifactId,
                accountId: 'different-user',
            });
            vi.mocked(db.artifact.findUnique).mockResolvedValue(existingArtifact as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: artifactId,
                    header: 'AQIDBA==',
                    body: 'BQYHCA==',
                    dataEncryptionKey: 'CQoLDA==',
                },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Artifact with this ID already exists for another account');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    header: 'AQIDBA==',
                    body: 'BQYHCA==',
                    dataEncryptionKey: 'CQoLDA==',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return validation error for invalid UUID', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: 'not-a-uuid',
                    header: 'AQIDBA==',
                    body: 'BQYHCA==',
                    dataEncryptionKey: 'CQoLDA==',
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 500 on database error', async () => {
            vi.mocked(db.artifact.findUnique).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    header: 'AQIDBA==',
                    body: 'BQYHCA==',
                    dataEncryptionKey: 'CQoLDA==',
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to create artifact');
        });

        it('should emit update event when creating a new artifact', async () => {
            const { eventRouter } = await import('@/app/events/eventRouter');

            const artifactId = '123e4567-e89b-12d3-a456-426614174001';
            vi.mocked(db.artifact.findUnique).mockResolvedValue(null);
            const newArtifact = createMockArtifact({ id: artifactId });
            vi.mocked(db.artifact.create).mockResolvedValue(newArtifact as any);

            await app.inject({
                method: 'POST',
                url: '/v1/artifacts',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    id: artifactId,
                    header: 'AQIDBA==',
                    body: 'BQYHCA==',
                    dataEncryptionKey: 'CQoLDA==',
                },
            });

            expect(eventRouter.emitUpdate).toHaveBeenCalled();
        });
    });

    describe('POST /v1/artifacts/:id (update)', () => {
        it('should update artifact header with version control', async () => {
            const artifact = createMockArtifact({
                id: 'artifact-123',
                headerVersion: 1,
                bodyVersion: 1,
            });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);
            vi.mocked(db.artifact.update).mockResolvedValue({ ...artifact, headerVersion: 2 } as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts/artifact-123',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    header: 'TmV3SGVhZGVy', // base64 of "NewHeader"
                    expectedHeaderVersion: 1,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.headerVersion).toBe(2);
        });

        it('should update artifact body with version control', async () => {
            const artifact = createMockArtifact({
                id: 'artifact-123',
                headerVersion: 1,
                bodyVersion: 1,
            });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);
            vi.mocked(db.artifact.update).mockResolvedValue({ ...artifact, bodyVersion: 2 } as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts/artifact-123',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    body: 'TmV3Qm9keQ==', // base64 of "NewBody"
                    expectedBodyVersion: 1,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.bodyVersion).toBe(2);
        });

        it('should return version mismatch error when header version conflicts', async () => {
            const artifact = createMockArtifact({
                id: 'artifact-123',
                headerVersion: 2, // Current version is 2
            });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts/artifact-123',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    header: 'TmV3SGVhZGVy',
                    expectedHeaderVersion: 1, // Expecting version 1, but current is 2
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toBe('version-mismatch');
            expect(body.currentHeaderVersion).toBe(2);
        });

        it('should return version mismatch error when body version conflicts', async () => {
            const artifact = createMockArtifact({
                id: 'artifact-123',
                bodyVersion: 3, // Current version is 3
            });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts/artifact-123',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    body: 'TmV3Qm9keQ==',
                    expectedBodyVersion: 1, // Expecting version 1, but current is 3
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toBe('version-mismatch');
            expect(body.currentBodyVersion).toBe(3);
        });

        it('should return 404 for non-existent artifact', async () => {
            vi.mocked(db.artifact.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts/non-existent',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    header: 'TmV3SGVhZGVy',
                    expectedHeaderVersion: 1,
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Artifact not found');
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/artifacts/artifact-123',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    header: 'TmV3SGVhZGVy',
                    expectedHeaderVersion: 1,
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('should emit update event when updating an artifact', async () => {
            const { eventRouter } = await import('@/app/events/eventRouter');

            const artifact = createMockArtifact({
                id: 'artifact-123',
                headerVersion: 1,
                bodyVersion: 1,
            });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);
            vi.mocked(db.artifact.update).mockResolvedValue({ ...artifact, headerVersion: 2 } as any);

            await app.inject({
                method: 'POST',
                url: '/v1/artifacts/artifact-123',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    header: 'TmV3SGVhZGVy',
                    expectedHeaderVersion: 1,
                },
            });

            expect(eventRouter.emitUpdate).toHaveBeenCalled();
        });
    });

    describe('DELETE /v1/artifacts/:id', () => {
        it('should delete an existing artifact', async () => {
            const artifact = createMockArtifact({ id: 'artifact-to-delete' });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);
            vi.mocked(db.artifact.delete).mockResolvedValue(artifact as any);

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/artifacts/artifact-to-delete',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(vi.mocked(db.artifact.delete)).toHaveBeenCalledWith({
                where: { id: 'artifact-to-delete' },
            });
        });

        it('should return 404 for non-existent artifact', async () => {
            vi.mocked(db.artifact.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/artifacts/non-existent',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Artifact not found');
        });

        it('should not allow deleting another users artifact', async () => {
            vi.mocked(db.artifact.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/artifacts/other-user-artifact',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            expect(vi.mocked(db.artifact.findFirst)).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        id: 'other-user-artifact',
                        accountId: TEST_USER_ID,
                    },
                })
            );
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/artifacts/artifact-123',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return 500 on database error', async () => {
            const artifact = createMockArtifact({ id: 'artifact-123' });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);
            vi.mocked(db.artifact.delete).mockRejectedValue(new Error('Database error'));

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/artifacts/artifact-123',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Failed to delete artifact');
        });

        it('should emit update event when deleting an artifact', async () => {
            const { eventRouter } = await import('@/app/events/eventRouter');

            const artifact = createMockArtifact({ id: 'artifact-to-delete' });
            vi.mocked(db.artifact.findFirst).mockResolvedValue(artifact as any);
            vi.mocked(db.artifact.delete).mockResolvedValue(artifact as any);

            await app.inject({
                method: 'DELETE',
                url: '/v1/artifacts/artifact-to-delete',
                headers: authHeader(),
            });

            expect(eventRouter.emitUpdate).toHaveBeenCalled();
        });
    });
});
