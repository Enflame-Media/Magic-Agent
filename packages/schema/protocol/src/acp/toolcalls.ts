/**
 * ACP tool call and permission types
 *
 * These schemas define tool call lifecycle, content, locations,
 * and the permission request/response flow.
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';
import {
    AcpToolCallIdSchema,
    AcpSessionIdSchema,
    AcpPermissionOptionIdSchema,
    AcpContentBlockSchema,
} from './common';

// ─── Tool Kind ───────────────────────────────────────────────────────────────

/**
 * Categories of tools that can be invoked
 *
 * Helps clients choose appropriate icons and UI treatment.
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls#creating
 */
export const AcpToolKindSchema = z.enum([
    'read',
    'edit',
    'delete',
    'move',
    'search',
    'execute',
    'think',
    'fetch',
    'switch_mode',
    'other',
]);

export type AcpToolKind = z.infer<typeof AcpToolKindSchema>;

// ─── Tool Call Status ────────────────────────────────────────────────────────

/**
 * Execution status of a tool call
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls#status
 */
export const AcpToolCallStatusSchema = z.enum([
    'pending',
    'in_progress',
    'completed',
    'failed',
]);

export type AcpToolCallStatus = z.infer<typeof AcpToolCallStatusSchema>;

// ─── Tool Call Location ──────────────────────────────────────────────────────

/**
 * A file location being accessed or modified by a tool
 *
 * Enables "follow-along" features in clients.
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls#following-the-agent
 */
export const AcpToolCallLocationSchema = z.object({
    _meta: AcpMetaSchema,
    path: z.string(),
    line: z.number().int().min(0).nullable().optional(),
});

export type AcpToolCallLocation = z.infer<typeof AcpToolCallLocationSchema>;

// ─── Tool Call Content ───────────────────────────────────────────────────────

/** Standard content within a tool call */
export const AcpToolCallContentContentSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('content'),
    content: AcpContentBlockSchema,
});

export type AcpToolCallContentContent = z.infer<typeof AcpToolCallContentContentSchema>;

/** Diff content showing file modifications */
export const AcpToolCallContentDiffSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('diff'),
    path: z.string(),
    newText: z.string(),
    oldText: z.string().nullable().optional(),
});

export type AcpToolCallContentDiff = z.infer<typeof AcpToolCallContentDiffSchema>;

/** Terminal content embedding a created terminal */
export const AcpToolCallContentTerminalSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('terminal'),
    terminalId: z.string(),
});

export type AcpToolCallContentTerminal = z.infer<typeof AcpToolCallContentTerminalSchema>;

/**
 * Content produced by a tool call - discriminated union on `type`
 *
 * Discriminated on `type`: "content" | "diff" | "terminal"
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls#content
 */
export const AcpToolCallContentSchema = z.discriminatedUnion('type', [
    AcpToolCallContentContentSchema,
    AcpToolCallContentDiffSchema,
    AcpToolCallContentTerminalSchema,
]);

export type AcpToolCallContent = z.infer<typeof AcpToolCallContentSchema>;

// ─── Tool Call ───────────────────────────────────────────────────────────────

/**
 * Represents a tool call that the language model has requested
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls
 */
export const AcpToolCallSchema = z.object({
    _meta: AcpMetaSchema,
    toolCallId: AcpToolCallIdSchema,
    title: z.string(),
    kind: AcpToolKindSchema.optional(),
    status: AcpToolCallStatusSchema.optional(),
    rawInput: z.unknown().optional(),
    rawOutput: z.unknown().optional(),
    content: z.array(AcpToolCallContentSchema).optional(),
    locations: z.array(AcpToolCallLocationSchema).optional(),
});

export type AcpToolCall = z.infer<typeof AcpToolCallSchema>;

// ─── Tool Call Update ────────────────────────────────────────────────────────

/**
 * An update to an existing tool call
 *
 * All fields except toolCallId are optional - only changed fields need to be included.
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls#updating
 */
export const AcpToolCallUpdateSchema = z.object({
    _meta: AcpMetaSchema,
    toolCallId: AcpToolCallIdSchema,
    title: z.string().nullable().optional(),
    kind: AcpToolKindSchema.nullable().optional(),
    status: AcpToolCallStatusSchema.nullable().optional(),
    rawInput: z.unknown().optional(),
    rawOutput: z.unknown().optional(),
    content: z.array(AcpToolCallContentSchema).nullable().optional(),
    locations: z.array(AcpToolCallLocationSchema).nullable().optional(),
});

export type AcpToolCallUpdate = z.infer<typeof AcpToolCallUpdateSchema>;

// ─── Permission ──────────────────────────────────────────────────────────────

/**
 * The type of permission option being presented to the user
 *
 * Helps clients choose appropriate icons and UI treatment.
 */
export const AcpPermissionOptionKindSchema = z.enum([
    'allow_once',
    'allow_always',
    'reject_once',
    'reject_always',
]);

export type AcpPermissionOptionKind = z.infer<typeof AcpPermissionOptionKindSchema>;

/** An option presented to the user when requesting permission */
export const AcpPermissionOptionSchema = z.object({
    _meta: AcpMetaSchema,
    optionId: AcpPermissionOptionIdSchema,
    name: z.string(),
    kind: AcpPermissionOptionKindSchema,
});

export type AcpPermissionOption = z.infer<typeof AcpPermissionOptionSchema>;

/** The user selected one of the provided options */
export const AcpSelectedPermissionOutcomeSchema = z.object({
    _meta: AcpMetaSchema,
    outcome: z.literal('selected'),
    optionId: AcpPermissionOptionIdSchema,
});

export type AcpSelectedPermissionOutcome = z.infer<typeof AcpSelectedPermissionOutcomeSchema>;

/** The prompt turn was cancelled before the user responded */
export const AcpCancelledPermissionOutcomeSchema = z.object({
    outcome: z.literal('cancelled'),
});

export type AcpCancelledPermissionOutcome = z.infer<typeof AcpCancelledPermissionOutcomeSchema>;

/**
 * The outcome of a permission request - discriminated union on `outcome`
 *
 * Discriminated on `outcome`: "selected" | "cancelled"
 */
export const AcpRequestPermissionOutcomeSchema = z.discriminatedUnion('outcome', [
    AcpSelectedPermissionOutcomeSchema,
    AcpCancelledPermissionOutcomeSchema,
]);

export type AcpRequestPermissionOutcome = z.infer<typeof AcpRequestPermissionOutcomeSchema>;

/**
 * Request for user permission to execute a tool call
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls#requesting-permission
 */
export const AcpRequestPermissionRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    toolCall: AcpToolCallUpdateSchema,
    options: z.array(AcpPermissionOptionSchema),
});

export type AcpRequestPermissionRequest = z.infer<typeof AcpRequestPermissionRequestSchema>;

/** Response to a permission request */
export const AcpRequestPermissionResponseSchema = z.object({
    _meta: AcpMetaSchema,
    outcome: AcpRequestPermissionOutcomeSchema,
});

export type AcpRequestPermissionResponse = z.infer<typeof AcpRequestPermissionResponseSchema>;
