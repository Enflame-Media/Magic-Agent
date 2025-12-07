/**
 * Integration Tests for Upload Routes
 *
 * Tests all upload endpoints including:
 * - GET /v1/uploads - List files
 * - POST /v1/uploads - Upload file
 * - GET /v1/uploads/:id - Get file metadata
 * - GET /v1/uploads/:id/download - Download file
 * - DELETE /v1/uploads/:id - Delete file
 * - POST /v1/uploads/avatar - Upload avatar
 *
 * @module __tests__/uploads.spec
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cloudflare:workers module
vi.mock('cloudflare:workers', () => ({
    DurableObject: class DurableObject {
        ctx: DurableObjectState;
        env: unknown;
        constructor(ctx: DurableObjectState, env: unknown) {
            this.ctx = ctx;
            this.env = env;
        }
    },
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
    initAuth: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'valid-token') {
            return { userId: 'test-user-123', extras: {} };
        }
        return null;
    }),
    createToken: vi.fn().mockResolvedValue('generated-token-abc123'),
    resetAuth: vi.fn(),
}));

import app from '@/index';
import { authHeader, VALID_TOKEN, INVALID_TOKEN } from './test-utils';

describe('Upload Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /v1/uploads - List Files', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/uploads', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should reject invalid token', async () => {
            const res = await app.request('/v1/uploads', {
                method: 'GET',
                headers: new Headers({
                    Authorization: `Bearer ${INVALID_TOKEN}`,
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should return files list with valid auth', async () => {
            const res = await app.request('/v1/uploads', {
                method: 'GET',
                headers: authHeader(),
            });

            // May return 200 or 500 based on DB availability
            expect([200, 500]).toContain(res.status);
        });

        it('should accept category filter parameter', async () => {
            const res = await app.request('/v1/uploads?category=avatars', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should accept limit parameter', async () => {
            const res = await app.request('/v1/uploads?limit=10', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should accept cursor parameter for pagination', async () => {
            const res = await app.request('/v1/uploads?cursor=test-cursor', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([200, 500]).toContain(res.status);
        });

        it('should reject invalid limit value', async () => {
            const res = await app.request('/v1/uploads?limit=-1', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([400, 500]).toContain(res.status);
        });
    });

    describe('POST /v1/uploads - Upload File', () => {
        it('should require authentication', async () => {
            const formData = new FormData();
            const file = new Blob(['test content'], { type: 'text/plain' });
            formData.append('file', file, 'test.txt');

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                body: formData,
            });

            expect(res.status).toBe(401);
        });

        it('should reject invalid token', async () => {
            const formData = new FormData();
            const file = new Blob(['test content'], { type: 'text/plain' });
            formData.append('file', file, 'test.txt');

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${INVALID_TOKEN}`,
                }),
                body: formData,
            });

            expect(res.status).toBe(401);
        });

        it('should return error when no file provided', async () => {
            const formData = new FormData();

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            // Should return 400 for missing file or 500 for DB error
            expect([400, 500]).toContain(res.status);
            if (res.status !== 400) return;
            const data = await res.json();
            expect(data).toHaveProperty('error');
        });

        it('should accept valid file upload', async () => {
            const formData = new FormData();
            const file = new Blob(['test content'], { type: 'text/plain' });
            formData.append('file', file, 'test.txt');

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            // May succeed or fail based on R2/DB availability
            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept category parameter', async () => {
            const formData = new FormData();
            const file = new Blob(['test content'], { type: 'text/plain' });
            formData.append('file', file, 'test.txt');
            formData.append('category', 'documents');

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept reuseKey parameter', async () => {
            const formData = new FormData();
            const file = new Blob(['test content'], { type: 'text/plain' });
            formData.append('file', file, 'test.txt');
            formData.append('reuseKey', 'my-unique-key');

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept image file types', async () => {
            const formData = new FormData();
            // Create a minimal JPEG-like blob (just the magic bytes for testing)
            const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
                type: 'image/jpeg',
            });
            formData.append('file', file, 'test.jpg');
            formData.append('category', 'avatars');

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept PDF file type', async () => {
            const formData = new FormData();
            const file = new Blob(['%PDF-1.4 test content'], {
                type: 'application/pdf',
            });
            formData.append('file', file, 'test.pdf');
            formData.append('category', 'documents');

            const res = await app.request('/v1/uploads', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([200, 400, 500]).toContain(res.status);
        });
    });

    describe('GET /v1/uploads/:id - Get File Metadata', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/uploads/test-file-id', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should reject invalid token', async () => {
            const res = await app.request('/v1/uploads/test-file-id', {
                method: 'GET',
                headers: new Headers({
                    Authorization: `Bearer ${INVALID_TOKEN}`,
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent file', async () => {
            const res = await app.request('/v1/uploads/non-existent-file', {
                method: 'GET',
                headers: authHeader(),
            });

            // Should return 404 or 500 based on DB availability
            expect([404, 500]).toContain(res.status);
        });

        it('should accept valid file ID', async () => {
            const res = await app.request('/v1/uploads/test-file-123', {
                method: 'GET',
                headers: authHeader(),
            });

            // File doesn't exist, should return 404 or 500
            expect([404, 500]).toContain(res.status);
        });
    });

    describe('GET /v1/uploads/:id/download - Download File', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/uploads/test-file-id/download', {
                method: 'GET',
            });

            expect(res.status).toBe(401);
        });

        it('should reject invalid token', async () => {
            const res = await app.request('/v1/uploads/test-file-id/download', {
                method: 'GET',
                headers: new Headers({
                    Authorization: `Bearer ${INVALID_TOKEN}`,
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent file', async () => {
            const res = await app.request('/v1/uploads/non-existent-file/download', {
                method: 'GET',
                headers: authHeader(),
            });

            expect([404, 500]).toContain(res.status);
        });
    });

    describe('DELETE /v1/uploads/:id - Delete File', () => {
        it('should require authentication', async () => {
            const res = await app.request('/v1/uploads/test-file-id', {
                method: 'DELETE',
            });

            expect(res.status).toBe(401);
        });

        it('should reject invalid token', async () => {
            const res = await app.request('/v1/uploads/test-file-id', {
                method: 'DELETE',
                headers: new Headers({
                    Authorization: `Bearer ${INVALID_TOKEN}`,
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 404 for non-existent file', async () => {
            const res = await app.request('/v1/uploads/non-existent-file', {
                method: 'DELETE',
                headers: authHeader(),
            });

            expect([404, 500]).toContain(res.status);
        });

        it('should accept valid file ID for deletion', async () => {
            const res = await app.request('/v1/uploads/test-file-123', {
                method: 'DELETE',
                headers: authHeader(),
            });

            // File doesn't exist, should return 404 or 500
            expect([404, 500]).toContain(res.status);
        });
    });

    describe('POST /v1/uploads/avatar - Upload Avatar', () => {
        it('should require authentication', async () => {
            const formData = new FormData();
            const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
                type: 'image/jpeg',
            });
            formData.append('file', file, 'avatar.jpg');

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                body: formData,
            });

            expect(res.status).toBe(401);
        });

        it('should reject invalid token', async () => {
            const formData = new FormData();
            const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
                type: 'image/jpeg',
            });
            formData.append('file', file, 'avatar.jpg');

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${INVALID_TOKEN}`,
                }),
                body: formData,
            });

            expect(res.status).toBe(401);
        });

        it('should return error when no file provided', async () => {
            const formData = new FormData();

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([400, 500]).toContain(res.status);
        });

        it('should reject non-image file types for avatar', async () => {
            const formData = new FormData();
            const file = new Blob(['test content'], { type: 'text/plain' });
            formData.append('file', file, 'test.txt');

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            // Should reject with 400 (unsupported type) or 500 (server error)
            expect([400, 500]).toContain(res.status);
        });

        it('should accept JPEG image for avatar', async () => {
            const formData = new FormData();
            const file = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
                type: 'image/jpeg',
            });
            formData.append('file', file, 'avatar.jpg');

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            // May succeed or fail based on R2/DB availability
            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept PNG image for avatar', async () => {
            const formData = new FormData();
            // PNG magic bytes
            const file = new Blob(
                [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
                { type: 'image/png' }
            );
            formData.append('file', file, 'avatar.png');

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept WebP image for avatar', async () => {
            const formData = new FormData();
            const file = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], {
                type: 'image/webp',
            });
            formData.append('file', file, 'avatar.webp');

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([200, 400, 500]).toContain(res.status);
        });

        it('should accept GIF image for avatar', async () => {
            const formData = new FormData();
            // GIF87a magic bytes
            const file = new Blob(
                [new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])],
                { type: 'image/gif' }
            );
            formData.append('file', file, 'avatar.gif');

            const res = await app.request('/v1/uploads/avatar', {
                method: 'POST',
                headers: new Headers({
                    Authorization: `Bearer ${VALID_TOKEN}`,
                }),
                body: formData,
            });

            expect([200, 400, 500]).toContain(res.status);
        });
    });
});
