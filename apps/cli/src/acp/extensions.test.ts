/**
 * Tests for Happy ACP Extension Methods
 *
 * Covers: extension method constants, types, and error handling.
 */

import { describe, it, expect } from 'vitest';
import {
    EXTENSION_PREFIX,
    EXTENSION_METHODS,
    ExtensionMethodClient,
} from './extensions';

describe('Extension Methods', () => {
    // ─── Constants ───────────────────────────────────────────────────

    describe('constants', () => {
        it('should use _happy.app/ prefix', () => {
            expect(EXTENSION_PREFIX).toBe('_happy.app/');
        });

        it('should define all extension methods with the correct prefix', () => {
            expect(EXTENSION_METHODS.SESSION_INFO).toBe('_happy.app/session-info');
            expect(EXTENSION_METHODS.ENCRYPTION_KEYS).toBe('_happy.app/encryption-keys');
            expect(EXTENSION_METHODS.REMOTE_PROMPT).toBe('_happy.app/remote-prompt');
            expect(EXTENSION_METHODS.REMOTE_CANCEL).toBe('_happy.app/remote-cancel');
        });

        it('should have all methods start with the extension prefix', () => {
            for (const method of Object.values(EXTENSION_METHODS)) {
                expect(method.startsWith(EXTENSION_PREFIX)).toBe(true);
            }
        });
    });

    // ─── ExtensionMethodClient ───────────────────────────────────────

    describe('ExtensionMethodClient', () => {
        it('should construct with a transport', () => {
            // Create a minimal mock transport
            const mockTransport = {
                request: async () => null,
            } as never;

            const client = new ExtensionMethodClient(mockTransport);
            expect(client).toBeDefined();
        });

        it('should return null when agent does not support extension', async () => {
            // Mock transport that throws MethodNotFound
            const mockTransport = {
                request: async () => {
                    const error = new Error('Method not found');
                    (error as unknown as { code: number }).code = -32601;
                    throw error;
                },
            } as never;

            const client = new ExtensionMethodClient(mockTransport);
            const result = await client.getSessionInfo({ sessionId: 'test' });
            expect(result).toBeNull();
        });

        it('should throw for non-MethodNotFound errors', async () => {
            const mockTransport = {
                request: async () => {
                    throw new Error('Connection lost');
                },
            } as never;

            const client = new ExtensionMethodClient(mockTransport);
            await expect(
                client.getSessionInfo({ sessionId: 'test' }),
            ).rejects.toThrow('Connection lost');
        });

        it('should return response data on success', async () => {
            const mockResponse = {
                sessionId: 'test',
                agentName: 'Claude Code',
                agentVersion: '1.0.0',
                cwd: '/tmp',
                startedAt: '2026-01-01T00:00:00Z',
                isActive: true,
            };

            const mockTransport = {
                request: async (operation: (conn: unknown) => Promise<unknown>) => {
                    // Simulate calling the operation with a mock connection
                    // that has sendRequest
                    const mockConn = {
                        sendRequest: async () => mockResponse,
                    };
                    return operation(mockConn);
                },
            } as never;

            const client = new ExtensionMethodClient(mockTransport);
            const result = await client.getSessionInfo({ sessionId: 'test' });
            expect(result).toEqual(mockResponse);
        });
    });
});
