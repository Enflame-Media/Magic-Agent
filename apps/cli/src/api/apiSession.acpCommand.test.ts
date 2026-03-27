/**
 * Unit tests for ApiSessionClient ACP session command handling (HAP-1072)
 *
 * Tests verify that ACP session commands from mobile app are processed correctly:
 * 1. Commands are decrypted, dispatched to handler, and responses encrypted/sent
 * 2. Missing handler returns error response
 * 3. Decrypt failures return error response
 * 4. Handler errors are caught and return error response
 * 5. Multiple command types are supported
 *
 * Since ApiSessionClient requires a real WebSocket connection, we test the
 * command handling logic via a test harness that replicates the critical behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AcpSessionCommandHandler, ApiSessionClientEvents } from './apiSession';
import type { EphemeralAcpSessionCommand } from './types';

/**
 * Mock logger interface that matches the relevant logger methods
 */
interface MockLogger {
    debug: ReturnType<typeof vi.fn<(message: string, ...args: unknown[]) => void>>;
}

/**
 * Simulated response sent through the socket
 */
interface SentResponse {
    sid: string;
    command: string;
    payload: string;
    requestId: string;
    success: boolean;
}

/**
 * Test harness that replicates the ACP session command handling logic
 * from ApiSessionClient. Allows testing without WebSocket dependencies.
 *
 * The logic being tested:
 * - handleAcpSessionCommand: processes incoming encrypted commands
 * - sendAcpSessionCommandResponse: encrypts and sends responses
 * - setAcpSessionCommandHandler: registers the command processor
 */
class AcpSessionCommandManager {
    private logger: MockLogger;
    private acpSessionCommandHandler: AcpSessionCommandHandler | null = null;
    private connected = true;
    readonly sentResponses: SentResponse[] = [];

    /**
     * For testing, encryption/decryption is simulated with JSON.stringify/parse.
     * The real implementation uses AES-256-GCM.
     */
    private encrypt(data: Record<string, unknown>): string {
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }

    private decrypt(encoded: string): Record<string, unknown> | null {
        try {
            const json = Buffer.from(encoded, 'base64').toString('utf-8');
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    constructor(logger: MockLogger) {
        this.logger = logger;
    }

    setConnected(connected: boolean): void {
        this.connected = connected;
    }

    setAcpSessionCommandHandler(handler: AcpSessionCommandHandler | null): void {
        this.acpSessionCommandHandler = handler;
        if (handler) {
            this.logger.debug('[API] ACP session command handler registered');
        }
    }

    /**
     * Simulate receiving an ACP session command ephemeral event.
     * Replicates logic from ApiSessionClient.handleAcpSessionCommand
     */
    async handleAcpSessionCommand(data: EphemeralAcpSessionCommand): Promise<void> {
        const { command, payload, requestId, sid } = data;

        this.logger.debug(`[EPHEMERAL] ACP session command: ${command} (requestId=${requestId})`);

        if (!this.acpSessionCommandHandler) {
            this.logger.debug('[EPHEMERAL] No ACP session command handler registered - sending error response');
            this.sendAcpSessionCommandResponse(sid, command, requestId, false, {
                error: 'ACP session commands not available',
                code: 'NO_HANDLER',
            });
            return;
        }

        // Decrypt the command payload
        let decryptedPayload: Record<string, unknown>;
        if (payload) {
            const decoded = this.decrypt(payload);
            if (decoded === null) {
                this.logger.debug('[EPHEMERAL] Failed to decrypt ACP session command payload');
                this.sendAcpSessionCommandResponse(sid, command, requestId, false, {
                    error: 'Failed to decrypt command payload',
                    code: 'DECRYPT_ERROR',
                });
                return;
            }
            decryptedPayload = decoded;
        } else {
            decryptedPayload = {};
        }

        // Process the command
        const handler = this.acpSessionCommandHandler;
        try {
            const result = await handler(command, decryptedPayload, requestId);
            this.sendAcpSessionCommandResponse(sid, command, requestId, result.success, result.data);
        } catch (error) {
            this.logger.debug(`[EPHEMERAL] ACP session command '${command}' failed:`, error);
            this.sendAcpSessionCommandResponse(sid, command, requestId, false, {
                error: error instanceof Error ? error.message : 'Unknown error',
                code: 'HANDLER_ERROR',
            });
        }
    }

    /**
     * Simulate sending an ACP session command response.
     * Replicates logic from ApiSessionClient.sendAcpSessionCommandResponse
     */
    private sendAcpSessionCommandResponse(
        sid: string,
        command: string,
        requestId: string,
        success: boolean,
        responseData: Record<string, unknown>,
    ): void {
        if (!this.connected) {
            this.logger.debug('[EPHEMERAL] Cannot send ACP session command response - not connected');
            return;
        }

        const encryptedPayload = this.encrypt(responseData);

        this.sentResponses.push({
            sid,
            command,
            payload: encryptedPayload,
            requestId,
            success,
        });

        this.logger.debug(`[EPHEMERAL] Sent ACP session command response: ${command} success=${success} (requestId=${requestId})`);
    }

    /** Decrypt a sent response payload for test assertions */
    decryptSentPayload(index: number): Record<string, unknown> | null {
        const response = this.sentResponses[index];
        if (!response) return null;
        return this.decrypt(response.payload);
    }
}

describe('ACP Session Command Handling (HAP-1072)', () => {
    let manager: AcpSessionCommandManager;
    let mockLogger: MockLogger;

    beforeEach(() => {
        mockLogger = {
            debug: vi.fn(),
        };
        manager = new AcpSessionCommandManager(mockLogger);
    });

    // Helper to create encrypted payload for test commands
    function encryptPayload(data: Record<string, unknown>): string {
        return Buffer.from(JSON.stringify(data)).toString('base64');
    }

    describe('command dispatching', () => {
        it('dispatches list command to handler and sends encrypted response', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: true,
                data: {
                    sessions: [
                        { sessionId: 'sess-1', title: 'Session 1' },
                        { sessionId: 'sess-2', title: 'Session 2' },
                    ],
                    nextCursor: null,
                },
            });

            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: encryptPayload({ cursor: null, cwd: '/projects/my-app' }),
                requestId: 'req-001',
            });

            // Handler was called with decrypted payload
            expect(handler).toHaveBeenCalledWith(
                'list',
                { cursor: null, cwd: '/projects/my-app' },
                'req-001',
            );

            // Response was sent
            expect(manager.sentResponses).toHaveLength(1);
            expect(manager.sentResponses[0].sid).toBe('session-123');
            expect(manager.sentResponses[0].command).toBe('list');
            expect(manager.sentResponses[0].requestId).toBe('req-001');
            expect(manager.sentResponses[0].success).toBe(true);

            // Response payload is encrypted and contains session data
            const responsePayload = manager.decryptSentPayload(0);
            expect(responsePayload).toEqual({
                sessions: [
                    { sessionId: 'sess-1', title: 'Session 1' },
                    { sessionId: 'sess-2', title: 'Session 2' },
                ],
                nextCursor: null,
            });
        });

        it('dispatches load command to handler', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: true,
                data: { loaded: true },
            });

            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'load',
                payload: encryptPayload({ sessionId: 'target-session' }),
                requestId: 'req-002',
            });

            expect(handler).toHaveBeenCalledWith(
                'load',
                { sessionId: 'target-session' },
                'req-002',
            );

            expect(manager.sentResponses[0].command).toBe('load');
            expect(manager.sentResponses[0].success).toBe(true);
        });

        it('dispatches resume command to handler', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: true,
                data: { resumed: true },
            });

            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'resume',
                payload: encryptPayload({ sessionId: 'target-session', cwd: '/projects/my-app' }),
                requestId: 'req-003',
            });

            expect(handler).toHaveBeenCalledWith(
                'resume',
                { sessionId: 'target-session', cwd: '/projects/my-app' },
                'req-003',
            );

            expect(manager.sentResponses[0].command).toBe('resume');
            expect(manager.sentResponses[0].success).toBe(true);
        });

        it('dispatches fork command to handler', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: true,
                data: { sessionId: 'forked-session-id' },
            });

            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'fork',
                payload: encryptPayload({ sessionId: 'target-session', cwd: '/projects/my-app' }),
                requestId: 'req-004',
            });

            expect(handler).toHaveBeenCalledWith(
                'fork',
                { sessionId: 'target-session', cwd: '/projects/my-app' },
                'req-004',
            );

            expect(manager.sentResponses[0].command).toBe('fork');
            expect(manager.sentResponses[0].success).toBe(true);
        });

        it('handles empty payload as empty object', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: true,
                data: { sessions: [] },
            });

            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: '',
                requestId: 'req-005',
            });

            expect(handler).toHaveBeenCalledWith('list', {}, 'req-005');
        });
    });

    describe('error handling', () => {
        it('returns error when no handler is registered', async () => {
            // No handler set

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: encryptPayload({}),
                requestId: 'req-006',
            });

            expect(manager.sentResponses).toHaveLength(1);
            expect(manager.sentResponses[0].success).toBe(false);

            const responsePayload = manager.decryptSentPayload(0);
            expect(responsePayload).toEqual({
                error: 'ACP session commands not available',
                code: 'NO_HANDLER',
            });
        });

        it('returns error when payload decryption fails', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>();
            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: 'not-valid-base64-json!!!',
                requestId: 'req-007',
            });

            // Handler should not be called
            expect(handler).not.toHaveBeenCalled();

            expect(manager.sentResponses).toHaveLength(1);
            expect(manager.sentResponses[0].success).toBe(false);

            const responsePayload = manager.decryptSentPayload(0);
            expect(responsePayload).toEqual({
                error: 'Failed to decrypt command payload',
                code: 'DECRYPT_ERROR',
            });
        });

        it('returns error when handler throws', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>().mockRejectedValue(
                new Error('Session manager not initialized'),
            );

            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: encryptPayload({}),
                requestId: 'req-008',
            });

            expect(manager.sentResponses).toHaveLength(1);
            expect(manager.sentResponses[0].success).toBe(false);

            const responsePayload = manager.decryptSentPayload(0);
            expect(responsePayload).toEqual({
                error: 'Session manager not initialized',
                code: 'HANDLER_ERROR',
            });
        });

        it('returns error when handler returns failure', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: false,
                data: { error: 'Agent does not support listSessions', code: 'CAPABILITY_ERROR' },
            });

            manager.setAcpSessionCommandHandler(handler);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: encryptPayload({}),
                requestId: 'req-009',
            });

            expect(manager.sentResponses).toHaveLength(1);
            expect(manager.sentResponses[0].success).toBe(false);

            const responsePayload = manager.decryptSentPayload(0);
            expect(responsePayload).toEqual({
                error: 'Agent does not support listSessions',
                code: 'CAPABILITY_ERROR',
            });
        });
    });

    describe('socket disconnection', () => {
        it('does not send response when socket is disconnected', async () => {
            manager.setConnected(false);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: encryptPayload({}),
                requestId: 'req-010',
            });

            // No response sent because socket is disconnected
            expect(manager.sentResponses).toHaveLength(0);
        });
    });

    describe('handler registration', () => {
        it('logs when handler is registered', () => {
            const handler = vi.fn<AcpSessionCommandHandler>();
            manager.setAcpSessionCommandHandler(handler);

            expect(mockLogger.debug).toHaveBeenCalledWith('[API] ACP session command handler registered');
        });

        it('allows replacing handler', async () => {
            const handler1 = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: true,
                data: { from: 'handler1' },
            });
            const handler2 = vi.fn<AcpSessionCommandHandler>().mockResolvedValue({
                success: true,
                data: { from: 'handler2' },
            });

            manager.setAcpSessionCommandHandler(handler1);
            manager.setAcpSessionCommandHandler(handler2);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: encryptPayload({}),
                requestId: 'req-011',
            });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });

        it('allows clearing handler with null', async () => {
            const handler = vi.fn<AcpSessionCommandHandler>();
            manager.setAcpSessionCommandHandler(handler);
            manager.setAcpSessionCommandHandler(null);

            await manager.handleAcpSessionCommand({
                type: 'acp-session-command',
                sid: 'session-123',
                command: 'list',
                payload: encryptPayload({}),
                requestId: 'req-012',
            });

            expect(handler).not.toHaveBeenCalled();
            expect(manager.sentResponses[0].success).toBe(false);
        });
    });
});
