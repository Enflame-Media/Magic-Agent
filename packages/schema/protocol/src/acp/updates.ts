/**
 * ACP session update notification types
 *
 * These schemas define the real-time session updates streamed from agent to client
 * during prompt processing, including message chunks, tool calls, plans, and more.
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';
import {
    AcpSessionIdSchema,
    AcpSessionModeIdSchema,
    AcpContentBlockSchema,
    AcpSessionConfigOptionSchema,
} from './common';
import {
    AcpToolCallSchema,
    AcpToolCallUpdateSchema,
} from './toolcalls';

// ─── Content Chunk ───────────────────────────────────────────────────────────

/** A streamed item of content */
const AcpContentChunkBaseSchema = z.object({
    _meta: AcpMetaSchema,
    content: AcpContentBlockSchema,
});

// ─── Message Chunk Variants ──────────────────────────────────────────────────

/** User message chunk */
export const AcpUserMessageChunkSchema = AcpContentChunkBaseSchema.extend({
    sessionUpdate: z.literal('user_message_chunk'),
});

export type AcpUserMessageChunk = z.infer<typeof AcpUserMessageChunkSchema>;

/** Agent message chunk */
export const AcpAgentMessageChunkSchema = AcpContentChunkBaseSchema.extend({
    sessionUpdate: z.literal('agent_message_chunk'),
});

export type AcpAgentMessageChunk = z.infer<typeof AcpAgentMessageChunkSchema>;

/** Agent thought chunk (internal reasoning) */
export const AcpAgentThoughtChunkSchema = AcpContentChunkBaseSchema.extend({
    sessionUpdate: z.literal('agent_thought_chunk'),
});

export type AcpAgentThoughtChunk = z.infer<typeof AcpAgentThoughtChunkSchema>;

// ─── Tool Call Updates ───────────────────────────────────────────────────────

/** Notification that a new tool call has been initiated */
export const AcpToolCallUpdateNotificationSchema = AcpToolCallSchema.extend({
    sessionUpdate: z.literal('tool_call'),
});

export type AcpToolCallUpdateNotification = z.infer<typeof AcpToolCallUpdateNotificationSchema>;

/** Update on the status or results of a tool call */
export const AcpToolCallStatusUpdateSchema = AcpToolCallUpdateSchema.extend({
    sessionUpdate: z.literal('tool_call_update'),
});

export type AcpToolCallStatusUpdate = z.infer<typeof AcpToolCallStatusUpdateSchema>;

// ─── Plan ────────────────────────────────────────────────────────────────────

/**
 * Status of a plan entry
 *
 * @see https://agentclientprotocol.com/protocol/agent-plan#plan-entries
 */
export const AcpPlanEntryStatusSchema = z.enum([
    'pending',
    'in_progress',
    'completed',
]);

export type AcpPlanEntryStatus = z.infer<typeof AcpPlanEntryStatusSchema>;

/**
 * Priority levels for plan entries
 *
 * @see https://agentclientprotocol.com/protocol/agent-plan#plan-entries
 */
export const AcpPlanEntryPrioritySchema = z.enum([
    'high',
    'medium',
    'low',
]);

export type AcpPlanEntryPriority = z.infer<typeof AcpPlanEntryPrioritySchema>;

/**
 * A single entry in the execution plan
 *
 * @see https://agentclientprotocol.com/protocol/agent-plan#plan-entries
 */
export const AcpPlanEntrySchema = z.object({
    _meta: AcpMetaSchema,
    content: z.string(),
    priority: AcpPlanEntryPrioritySchema,
    status: AcpPlanEntryStatusSchema,
});

export type AcpPlanEntry = z.infer<typeof AcpPlanEntrySchema>;

/**
 * An execution plan for accomplishing complex tasks
 *
 * @see https://agentclientprotocol.com/protocol/agent-plan
 */
export const AcpPlanUpdateSchema = z.object({
    _meta: AcpMetaSchema,
    sessionUpdate: z.literal('plan'),
    entries: z.array(AcpPlanEntrySchema),
});

export type AcpPlanUpdate = z.infer<typeof AcpPlanUpdateSchema>;

// ─── Available Commands ──────────────────────────────────────────────────────

/** Unstructured command input */
export const AcpUnstructuredCommandInputSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('unstructured'),
    hint: z.string(),
});

export type AcpUnstructuredCommandInput = z.infer<typeof AcpUnstructuredCommandInputSchema>;

/** The input specification for a command */
export const AcpAvailableCommandInputSchema = AcpUnstructuredCommandInputSchema;

export type AcpAvailableCommandInput = z.infer<typeof AcpAvailableCommandInputSchema>;

/** Information about a command */
export const AcpAvailableCommandSchema = z.object({
    _meta: AcpMetaSchema,
    name: z.string(),
    description: z.string(),
    input: AcpAvailableCommandInputSchema.nullable().optional(),
});

export type AcpAvailableCommand = z.infer<typeof AcpAvailableCommandSchema>;

/** Available commands are ready or have changed */
export const AcpAvailableCommandsUpdateSchema = z.object({
    _meta: AcpMetaSchema,
    sessionUpdate: z.literal('available_commands_update'),
    availableCommands: z.array(AcpAvailableCommandSchema),
});

export type AcpAvailableCommandsUpdate = z.infer<typeof AcpAvailableCommandsUpdateSchema>;

// ─── Mode Update ─────────────────────────────────────────────────────────────

/**
 * The current mode of the session has changed
 *
 * @see https://agentclientprotocol.com/protocol/session-modes
 */
export const AcpCurrentModeUpdateSchema = z.object({
    _meta: AcpMetaSchema,
    sessionUpdate: z.literal('current_mode_update'),
    currentModeId: AcpSessionModeIdSchema,
});

export type AcpCurrentModeUpdate = z.infer<typeof AcpCurrentModeUpdateSchema>;

// ─── Config Option Update ────────────────────────────────────────────────────

/** Session configuration options have been updated */
export const AcpConfigOptionUpdateSchema = z.object({
    _meta: AcpMetaSchema,
    sessionUpdate: z.literal('config_option_update'),
    configOptions: z.array(AcpSessionConfigOptionSchema),
});

export type AcpConfigOptionUpdate = z.infer<typeof AcpConfigOptionUpdateSchema>;

// ─── Session Info Update ─────────────────────────────────────────────────────

/** Session metadata has been updated */
export const AcpSessionInfoUpdateSchema = z.object({
    _meta: AcpMetaSchema,
    sessionUpdate: z.literal('session_info_update'),
    title: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
});

export type AcpSessionInfoUpdate = z.infer<typeof AcpSessionInfoUpdateSchema>;

// ─── Usage Update (UNSTABLE) ────────────────────────────────────────────────

/** Cost information for a session (UNSTABLE) */
export const AcpCostSchema = z.object({
    amount: z.number(),
    currency: z.string(),
});

export type AcpCost = z.infer<typeof AcpCostSchema>;

/** Context window and cost update for a session (UNSTABLE) */
export const AcpUsageUpdateSchema = z.object({
    _meta: AcpMetaSchema,
    sessionUpdate: z.literal('usage_update'),
    used: z.number().int().min(0),
    size: z.number().int().min(0),
    cost: AcpCostSchema.nullable().optional(),
});

export type AcpUsageUpdate = z.infer<typeof AcpUsageUpdateSchema>;

// ─── Session Update Union ────────────────────────────────────────────────────

/**
 * Session update - discriminated union on `sessionUpdate` field
 *
 * Different types of updates streamed during session processing.
 * Discriminated on `sessionUpdate`: 11 variants.
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output
 */
export const AcpSessionUpdateSchema = z.discriminatedUnion('sessionUpdate', [
    AcpUserMessageChunkSchema,
    AcpAgentMessageChunkSchema,
    AcpAgentThoughtChunkSchema,
    AcpToolCallUpdateNotificationSchema,
    AcpToolCallStatusUpdateSchema,
    AcpPlanUpdateSchema,
    AcpAvailableCommandsUpdateSchema,
    AcpCurrentModeUpdateSchema,
    AcpConfigOptionUpdateSchema,
    AcpSessionInfoUpdateSchema,
    AcpUsageUpdateSchema,
]);

export type AcpSessionUpdate = z.infer<typeof AcpSessionUpdateSchema>;

// ─── Session Notification ────────────────────────────────────────────────────

/**
 * Notification containing a session update from the agent
 *
 * Wraps a SessionUpdate with the session ID it pertains to.
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output
 */
export const AcpSessionNotificationSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    update: AcpSessionUpdateSchema,
});

export type AcpSessionNotification = z.infer<typeof AcpSessionNotificationSchema>;
