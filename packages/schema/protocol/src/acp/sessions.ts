/**
 * ACP session management types
 *
 * These schemas define session lifecycle operations: creation, loading,
 * resuming, forking, listing, mode switching, and model selection.
 *
 * @see https://agentclientprotocol.com/protocol/session-setup
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';
import {
    AcpSessionIdSchema,
    AcpSessionModeIdSchema,
    AcpSessionModeStateSchema,
    AcpSessionModelStateSchema,
    AcpSessionConfigOptionSchema,
    AcpSessionConfigIdSchema,
    AcpSessionConfigValueIdSchema,
    AcpMcpServerSchema,
    AcpModelIdSchema,
    AcpSessionInfoSchema,
} from './common';

// ─── New Session ─────────────────────────────────────────────────────────────

/**
 * Request parameters for creating a new session
 *
 * @see https://agentclientprotocol.com/protocol/session-setup#creating-a-session
 */
export const AcpNewSessionRequestSchema = z.object({
    _meta: AcpMetaSchema,
    cwd: z.string(),
    mcpServers: z.array(AcpMcpServerSchema),
});

export type AcpNewSessionRequest = z.infer<typeof AcpNewSessionRequestSchema>;

/**
 * Response from creating a new session
 *
 * @see https://agentclientprotocol.com/protocol/session-setup#creating-a-session
 */
export const AcpNewSessionResponseSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    configOptions: z.array(AcpSessionConfigOptionSchema).nullable().optional(),
    modes: AcpSessionModeStateSchema.nullable().optional(),
    models: AcpSessionModelStateSchema.nullable().optional(),
});

export type AcpNewSessionResponse = z.infer<typeof AcpNewSessionResponseSchema>;

// ─── Load Session ────────────────────────────────────────────────────────────

/**
 * Request parameters for loading an existing session
 *
 * Only available if the agent advertises the `loadSession` capability.
 *
 * @see https://agentclientprotocol.com/protocol/session-setup#loading-sessions
 */
export const AcpLoadSessionRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    cwd: z.string(),
    mcpServers: z.array(AcpMcpServerSchema),
});

export type AcpLoadSessionRequest = z.infer<typeof AcpLoadSessionRequestSchema>;

/** Response from loading an existing session */
export const AcpLoadSessionResponseSchema = z.object({
    _meta: AcpMetaSchema,
    configOptions: z.array(AcpSessionConfigOptionSchema).nullable().optional(),
    modes: AcpSessionModeStateSchema.nullable().optional(),
    models: AcpSessionModelStateSchema.nullable().optional(),
});

export type AcpLoadSessionResponse = z.infer<typeof AcpLoadSessionResponseSchema>;

// ─── Resume Session (UNSTABLE) ──────────────────────────────────────────────

/**
 * Request parameters for resuming an existing session (UNSTABLE)
 *
 * Resumes without returning previous messages (unlike session/load).
 * Only available if the agent supports the `session.resume` capability.
 */
export const AcpResumeSessionRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    cwd: z.string(),
    mcpServers: z.array(AcpMcpServerSchema).optional(),
});

export type AcpResumeSessionRequest = z.infer<typeof AcpResumeSessionRequestSchema>;

/** Response from resuming an existing session (UNSTABLE) */
export const AcpResumeSessionResponseSchema = z.object({
    _meta: AcpMetaSchema,
    configOptions: z.array(AcpSessionConfigOptionSchema).nullable().optional(),
    modes: AcpSessionModeStateSchema.nullable().optional(),
    models: AcpSessionModelStateSchema.nullable().optional(),
});

export type AcpResumeSessionResponse = z.infer<typeof AcpResumeSessionResponseSchema>;

// ─── Fork Session (UNSTABLE) ────────────────────────────────────────────────

/**
 * Request parameters for forking an existing session (UNSTABLE)
 *
 * Creates a new session based on the context of an existing one.
 * Only available if the agent supports the `session.fork` capability.
 */
export const AcpForkSessionRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    cwd: z.string(),
    mcpServers: z.array(AcpMcpServerSchema).optional(),
});

export type AcpForkSessionRequest = z.infer<typeof AcpForkSessionRequestSchema>;

/** Response from forking an existing session (UNSTABLE) */
export const AcpForkSessionResponseSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    configOptions: z.array(AcpSessionConfigOptionSchema).nullable().optional(),
    modes: AcpSessionModeStateSchema.nullable().optional(),
    models: AcpSessionModelStateSchema.nullable().optional(),
});

export type AcpForkSessionResponse = z.infer<typeof AcpForkSessionResponseSchema>;

// ─── List Sessions (UNSTABLE) ───────────────────────────────────────────────

/**
 * Request parameters for listing existing sessions (UNSTABLE)
 *
 * Only available if the agent supports the `listSessions` capability.
 */
export const AcpListSessionsRequestSchema = z.object({
    _meta: AcpMetaSchema,
    cursor: z.string().nullable().optional(),
    cwd: z.string().nullable().optional(),
});

export type AcpListSessionsRequest = z.infer<typeof AcpListSessionsRequestSchema>;

/** Response from listing sessions (UNSTABLE) */
export const AcpListSessionsResponseSchema = z.object({
    _meta: AcpMetaSchema,
    sessions: z.array(AcpSessionInfoSchema),
    nextCursor: z.string().nullable().optional(),
});

export type AcpListSessionsResponse = z.infer<typeof AcpListSessionsResponseSchema>;

// ─── Set Mode ────────────────────────────────────────────────────────────────

/**
 * Request parameters for setting a session mode
 *
 * @see https://agentclientprotocol.com/protocol/session-modes
 */
export const AcpSetSessionModeRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    modeId: AcpSessionModeIdSchema,
});

export type AcpSetSessionModeRequest = z.infer<typeof AcpSetSessionModeRequestSchema>;

/** Response to session/set_mode */
export const AcpSetSessionModeResponseSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpSetSessionModeResponse = z.infer<typeof AcpSetSessionModeResponseSchema>;

// ─── Set Config Option ───────────────────────────────────────────────────────

/** Request parameters for setting a session configuration option */
export const AcpSetSessionConfigOptionRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    configId: AcpSessionConfigIdSchema,
    value: AcpSessionConfigValueIdSchema,
});

export type AcpSetSessionConfigOptionRequest = z.infer<typeof AcpSetSessionConfigOptionRequestSchema>;

/** Response to session/set_config_option */
export const AcpSetSessionConfigOptionResponseSchema = z.object({
    _meta: AcpMetaSchema,
    configOptions: z.array(AcpSessionConfigOptionSchema),
});

export type AcpSetSessionConfigOptionResponse = z.infer<typeof AcpSetSessionConfigOptionResponseSchema>;

// ─── Set Model (UNSTABLE) ───────────────────────────────────────────────────

/** Request parameters for setting a session model (UNSTABLE) */
export const AcpSetSessionModelRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    modelId: AcpModelIdSchema,
});

export type AcpSetSessionModelRequest = z.infer<typeof AcpSetSessionModelRequestSchema>;

/** Response to session/set_model (UNSTABLE) */
export const AcpSetSessionModelResponseSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpSetSessionModelResponse = z.infer<typeof AcpSetSessionModelResponseSchema>;
