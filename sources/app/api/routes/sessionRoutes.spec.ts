import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createTestApp, authHeader, TEST_USER_ID, TEST_USER_ID_2, createMockSession, randomId } from './__test__/testUtils';
import { sessionRoutes } from './sessionRoutes';
import type { Fastify } from '../types';

// Mock external dependencies
vi.mock('@/storage/db', () => ({
    db: {
        session: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
        },
        sessionMessage: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('@/app/events/eventRouter', () => ({
    eventRouter: {
        emitUpdate: vi.fn(),
    },
    buildNewSessionUpdate: vi.fn().mockReturnValue({ type: 'new-session', data: {} }),
}));

vi.mock('@/storage/seq', () => ({
    allocateUserSeq: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/app/session/sessionDelete', () => ({
    sessionDelete: vi.fn(),
}));

vi.mock('@/utils/log', () => ({
    log: vi.fn(),
}));

vi.mock('@/utils/randomKeyNaked', () => ({
    randomKeyNaked: vi.fn().mockReturnValue('random123'),
}));

import { db } from '@/storage/db';
import { sessionDelete } from '@/app/session/sessionDelete';

describe('sessionRoutes', () => {
    let app: Fastify;

    beforeEach(async () => {
        app = createTestApp();
        sessionRoutes(app);
        await app.ready();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('GET /v1/sessions', () => {
        it('should return sessions for authenticated user', async () => {
            const mockSessions = [
                createMockSession({ id: 'sess-1', seq: 1 }),
                createMockSession({ id: 'sess-2', seq: 2 }),
            ];
            vi.mocked(db.session.findMany).mockResolvedValue(mockSessions as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.sessions).toHaveLength(2);
            expect(body.sessions[0].id).toBe('sess-1');
            expect(body.sessions[1].id).toBe('sess-2');
        });

        it('should return 401 without authorization header', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions',
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return 401 with invalid token', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions',
                headers: authHeader('invalid-token'),
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return empty array when user has no sessions', async () => {
            vi.mocked(db.session.findMany).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.sessions).toHaveLength(0);
        });
    });

    describe('GET /v2/sessions/active', () => {
        it('should return only active sessions', async () => {
            const mockSessions = [
                createMockSession({ id: 'active-sess-1', active: true }),
            ];
            vi.mocked(db.session.findMany).mockResolvedValue(mockSessions as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions/active',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.sessions).toHaveLength(1);
            expect(body.sessions[0].id).toBe('active-sess-1');
        });

        it('should accept limit parameter', async () => {
            vi.mocked(db.session.findMany).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions/active?limit=50',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            expect(vi.mocked(db.session.findMany)).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 50,
                })
            );
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions/active',
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('GET /v2/sessions', () => {
        it('should return paginated sessions', async () => {
            const mockSessions = [
                createMockSession({ id: 'sess-1' }),
                createMockSession({ id: 'sess-2' }),
            ];
            vi.mocked(db.session.findMany).mockResolvedValue(mockSessions as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.sessions).toBeDefined();
            expect(body.hasNext).toBe(false);
        });

        it('should return hasNext true when more results exist', async () => {
            // Create 51 sessions (more than default limit of 50)
            const mockSessions = Array(51).fill(null).map((_, i) =>
                createMockSession({ id: `sess-${i}` })
            );
            vi.mocked(db.session.findMany).mockResolvedValue(mockSessions as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.hasNext).toBe(true);
            expect(body.nextCursor).toBeDefined();
        });

        it('should accept cursor parameter for pagination', async () => {
            vi.mocked(db.session.findMany).mockResolvedValue([]);

            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions?cursor=cursor_v1_session123',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
        });

        it('should return 400 for invalid cursor format', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions?cursor=invalid_cursor',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Invalid cursor format');
        });

        it('should accept changedSince parameter', async () => {
            vi.mocked(db.session.findMany).mockResolvedValue([]);
            const changedSince = Date.now() - 3600000; // 1 hour ago

            const response = await app.inject({
                method: 'GET',
                url: `/v2/sessions?changedSince=${changedSince}`,
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v2/sessions',
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('POST /v1/sessions', () => {
        it('should create a new session when tag does not exist', async () => {
            vi.mocked(db.session.findFirst).mockResolvedValue(null);
            const newSession = createMockSession({ id: 'new-sess', tag: 'unique-tag' });
            vi.mocked(db.session.create).mockResolvedValue(newSession as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/sessions',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    tag: 'unique-tag',
                    metadata: '{"test": true}',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.session).toBeDefined();
            expect(body.session.id).toBe('new-sess');
        });

        it('should return existing session when tag already exists', async () => {
            const existingSession = createMockSession({ id: 'existing-sess', tag: 'existing-tag' });
            vi.mocked(db.session.findFirst).mockResolvedValue(existingSession as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/sessions',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    tag: 'existing-tag',
                    metadata: '{"test": true}',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.session.id).toBe('existing-sess');
            // Should not have called create
            expect(vi.mocked(db.session.create)).not.toHaveBeenCalled();
        });

        it('should include dataEncryptionKey when provided', async () => {
            vi.mocked(db.session.findFirst).mockResolvedValue(null);
            const newSession = createMockSession({
                id: 'new-sess',
                dataEncryptionKey: new Uint8Array([1, 2, 3, 4]),
            });
            vi.mocked(db.session.create).mockResolvedValue(newSession as any);

            const response = await app.inject({
                method: 'POST',
                url: '/v1/sessions',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    tag: 'unique-tag',
                    metadata: '{"test": true}',
                    dataEncryptionKey: 'AQIDBA==', // base64 of [1,2,3,4]
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.session.dataEncryptionKey).toBeDefined();
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/sessions',
                headers: {
                    'Content-Type': 'application/json',
                },
                payload: {
                    tag: 'test-tag',
                    metadata: '{}',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('should return validation error for missing required fields', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/v1/sessions',
                headers: {
                    ...authHeader(),
                    'Content-Type': 'application/json',
                },
                payload: {
                    // Missing tag and metadata
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe('GET /v1/sessions/:sessionId/messages', () => {
        it('should return messages for a valid session', async () => {
            const session = createMockSession({ id: 'sess-123' });
            vi.mocked(db.session.findFirst).mockResolvedValue(session as any);

            const mockMessages = [
                {
                    id: 'msg-1',
                    seq: 1,
                    localId: 'local-1',
                    content: { text: 'Hello' },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            vi.mocked(db.sessionMessage.findMany).mockResolvedValue(mockMessages as any);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions/sess-123/messages',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.messages).toHaveLength(1);
        });

        it('should return 404 for non-existent session', async () => {
            vi.mocked(db.session.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions/non-existent/messages',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Session not found');
        });

        it('should not return messages from another users session', async () => {
            // Session belongs to a different user
            const session = createMockSession({
                id: 'other-user-sess',
                accountId: TEST_USER_ID_2,
            });
            // findFirst returns null because accountId filter doesn't match
            vi.mocked(db.session.findFirst).mockResolvedValue(null);

            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions/other-user-sess/messages',
                headers: authHeader(), // Uses TEST_USER_ID
            });

            expect(response.statusCode).toBe(404);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/v1/sessions/sess-123/messages',
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('DELETE /v1/sessions/:sessionId', () => {
        it('should delete an existing session', async () => {
            vi.mocked(sessionDelete).mockResolvedValue(true);

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/sessions/sess-to-delete',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
        });

        it('should return 404 for non-existent session', async () => {
            vi.mocked(sessionDelete).mockResolvedValue(false);

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/sessions/non-existent',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Session not found or not owned by user');
        });

        it('should not allow deleting another users session', async () => {
            vi.mocked(sessionDelete).mockResolvedValue(false);

            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/sessions/other-user-session',
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
        });

        it('should return 401 without authorization', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/v1/sessions/sess-123',
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
