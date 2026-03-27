/**
 * Tests for ACP session command/response ephemeral event schemas (HAP-1072)
 */

import { describe, it, expect } from 'vitest';
import {
    ApiEphemeralAcpSessionCommandSchema,
    ApiEphemeralAcpSessionCommandResponseSchema,
    ApiEphemeralUpdateSchema,
} from './events';

describe('ApiEphemeralAcpSessionCommandSchema', () => {
    it('validates a well-formed list command', () => {
        const command = {
            type: 'acp-session-command',
            sid: 'session-123',
            command: 'list',
            payload: 'encrypted-payload-base64',
            requestId: 'req-001',
        };
        const result = ApiEphemeralAcpSessionCommandSchema.safeParse(command);
        expect(result.success).toBe(true);
    });

    it('validates all supported command types', () => {
        for (const cmd of ['list', 'load', 'resume', 'fork']) {
            const result = ApiEphemeralAcpSessionCommandSchema.safeParse({
                type: 'acp-session-command',
                sid: 'session-123',
                command: cmd,
                payload: '',
                requestId: 'req-002',
            });
            expect(result.success).toBe(true);
        }
    });

    it('rejects unsupported command types', () => {
        const result = ApiEphemeralAcpSessionCommandSchema.safeParse({
            type: 'acp-session-command',
            sid: 'session-123',
            command: 'delete',
            payload: '',
            requestId: 'req-003',
        });
        expect(result.success).toBe(false);
    });

    it('rejects missing sid', () => {
        const result = ApiEphemeralAcpSessionCommandSchema.safeParse({
            type: 'acp-session-command',
            command: 'list',
            payload: '',
            requestId: 'req-004',
        });
        expect(result.success).toBe(false);
    });

    it('rejects empty sid', () => {
        const result = ApiEphemeralAcpSessionCommandSchema.safeParse({
            type: 'acp-session-command',
            sid: '',
            command: 'list',
            payload: '',
            requestId: 'req-005',
        });
        expect(result.success).toBe(false);
    });

    it('rejects missing requestId', () => {
        const result = ApiEphemeralAcpSessionCommandSchema.safeParse({
            type: 'acp-session-command',
            sid: 'session-123',
            command: 'list',
            payload: '',
        });
        expect(result.success).toBe(false);
    });

    it('allows empty payload string', () => {
        const result = ApiEphemeralAcpSessionCommandSchema.safeParse({
            type: 'acp-session-command',
            sid: 'session-123',
            command: 'list',
            payload: '',
            requestId: 'req-006',
        });
        expect(result.success).toBe(true);
    });

    it('is included in the ApiEphemeralUpdateSchema union', () => {
        const command = {
            type: 'acp-session-command',
            sid: 'session-123',
            command: 'list',
            payload: 'encrypted-payload',
            requestId: 'req-007',
        };
        const result = ApiEphemeralUpdateSchema.safeParse(command);
        expect(result.success).toBe(true);
    });
});

describe('ApiEphemeralAcpSessionCommandResponseSchema', () => {
    it('validates a successful response', () => {
        const response = {
            type: 'acp-session-command-response',
            sid: 'session-123',
            command: 'list',
            payload: 'encrypted-response-base64',
            requestId: 'req-001',
            success: true,
        };
        const result = ApiEphemeralAcpSessionCommandResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
    });

    it('validates a failed response', () => {
        const response = {
            type: 'acp-session-command-response',
            sid: 'session-123',
            command: 'list',
            payload: 'encrypted-error-payload',
            requestId: 'req-001',
            success: false,
        };
        const result = ApiEphemeralAcpSessionCommandResponseSchema.safeParse(response);
        expect(result.success).toBe(true);
    });

    it('rejects missing success field', () => {
        const result = ApiEphemeralAcpSessionCommandResponseSchema.safeParse({
            type: 'acp-session-command-response',
            sid: 'session-123',
            command: 'list',
            payload: 'encrypted-payload',
            requestId: 'req-002',
        });
        expect(result.success).toBe(false);
    });

    it('rejects empty payload', () => {
        const result = ApiEphemeralAcpSessionCommandResponseSchema.safeParse({
            type: 'acp-session-command-response',
            sid: 'session-123',
            command: 'list',
            payload: '',
            requestId: 'req-003',
            success: true,
        });
        expect(result.success).toBe(false);
    });

    it('rejects non-boolean success', () => {
        const result = ApiEphemeralAcpSessionCommandResponseSchema.safeParse({
            type: 'acp-session-command-response',
            sid: 'session-123',
            command: 'list',
            payload: 'encrypted-payload',
            requestId: 'req-004',
            success: 'true',
        });
        expect(result.success).toBe(false);
    });

    it('is included in the ApiEphemeralUpdateSchema union', () => {
        const response = {
            type: 'acp-session-command-response',
            sid: 'session-123',
            command: 'list',
            payload: 'encrypted-response',
            requestId: 'req-005',
            success: true,
        };
        const result = ApiEphemeralUpdateSchema.safeParse(response);
        expect(result.success).toBe(true);
    });
});
