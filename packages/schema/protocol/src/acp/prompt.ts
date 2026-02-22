/**
 * ACP prompt turn types
 *
 * These schemas define the prompt request/response flow and related types
 * like stop reasons and cancellation.
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';
import { AcpSessionIdSchema, AcpContentBlockSchema } from './common';

// ─── Stop Reason ─────────────────────────────────────────────────────────────

/**
 * Reasons why an agent stops processing a prompt turn
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#stop-reasons
 */
export const AcpStopReasonSchema = z.enum([
    'end_turn',
    'max_tokens',
    'max_turn_requests',
    'refusal',
    'cancelled',
]);

export type AcpStopReason = z.infer<typeof AcpStopReasonSchema>;

// ─── Usage (UNSTABLE) ────────────────────────────────────────────────────────

/** Token usage information for a prompt turn (UNSTABLE) */
export const AcpUsageSchema = z.object({
    totalTokens: z.number().int().min(0),
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
    cachedReadTokens: z.number().int().min(0).nullable().optional(),
    cachedWriteTokens: z.number().int().min(0).nullable().optional(),
    thoughtTokens: z.number().int().min(0).nullable().optional(),
});

export type AcpUsage = z.infer<typeof AcpUsageSchema>;

// ─── Prompt Request ──────────────────────────────────────────────────────────

/**
 * Request parameters for sending a user prompt to the agent
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#1-user-message
 */
export const AcpPromptRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    prompt: z.array(AcpContentBlockSchema),
});

export type AcpPromptRequest = z.infer<typeof AcpPromptRequestSchema>;

/**
 * Response from processing a user prompt
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#4-check-for-completion
 */
export const AcpPromptResponseSchema = z.object({
    _meta: AcpMetaSchema,
    stopReason: AcpStopReasonSchema,
    usage: AcpUsageSchema.nullable().optional(),
});

export type AcpPromptResponse = z.infer<typeof AcpPromptResponseSchema>;

// ─── Cancel ──────────────────────────────────────────────────────────────────

/**
 * Notification to cancel ongoing operations for a session
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#cancellation
 */
export const AcpCancelNotificationSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
});

export type AcpCancelNotification = z.infer<typeof AcpCancelNotificationSchema>;
