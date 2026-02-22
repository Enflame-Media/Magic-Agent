/**
 * ACP capability negotiation types
 *
 * Capabilities are exchanged during initialization to determine which
 * features are available for the connection.
 *
 * @see https://agentclientprotocol.com/protocol/initialization
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';

// ─── Client Capabilities ─────────────────────────────────────────────────────

/**
 * File system capabilities supported by the client
 *
 * @see https://agentclientprotocol.com/protocol/initialization#filesystem
 */
export const AcpFileSystemCapabilitySchema = z.object({
    _meta: AcpMetaSchema,
    readTextFile: z.boolean().default(false),
    writeTextFile: z.boolean().default(false),
});

export type AcpFileSystemCapability = z.infer<typeof AcpFileSystemCapabilitySchema>;

/**
 * Capabilities supported by the client
 *
 * Advertised during initialization to inform the agent about available features.
 *
 * @see https://agentclientprotocol.com/protocol/initialization#client-capabilities
 */
export const AcpClientCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
    fs: AcpFileSystemCapabilitySchema.default({ readTextFile: false, writeTextFile: false }),
    terminal: z.boolean().default(false),
});

export type AcpClientCapabilities = z.infer<typeof AcpClientCapabilitiesSchema>;

// ─── Agent Capabilities ──────────────────────────────────────────────────────

/** MCP capabilities supported by the agent */
export const AcpMcpCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
    http: z.boolean().default(false),
    sse: z.boolean().default(false),
});

export type AcpMcpCapabilities = z.infer<typeof AcpMcpCapabilitiesSchema>;

/**
 * Prompt capabilities supported by the agent
 *
 * Baseline support requires text and resource_link. Other types must be opted in.
 *
 * @see https://agentclientprotocol.com/protocol/initialization#prompt-capabilities
 */
export const AcpPromptCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
    audio: z.boolean().default(false),
    embeddedContext: z.boolean().default(false),
    image: z.boolean().default(false),
});

export type AcpPromptCapabilities = z.infer<typeof AcpPromptCapabilitiesSchema>;

/** Capabilities for session/fork (UNSTABLE) */
export const AcpSessionForkCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpSessionForkCapabilities = z.infer<typeof AcpSessionForkCapabilitiesSchema>;

/** Capabilities for session/list (UNSTABLE) */
export const AcpSessionListCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpSessionListCapabilities = z.infer<typeof AcpSessionListCapabilitiesSchema>;

/** Capabilities for session/resume (UNSTABLE) */
export const AcpSessionResumeCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpSessionResumeCapabilities = z.infer<typeof AcpSessionResumeCapabilitiesSchema>;

/**
 * Session capabilities supported by the agent
 *
 * @see https://agentclientprotocol.com/protocol/initialization#session-capabilities
 */
export const AcpSessionCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
    fork: AcpSessionForkCapabilitiesSchema.nullable().optional(),
    list: AcpSessionListCapabilitiesSchema.nullable().optional(),
    resume: AcpSessionResumeCapabilitiesSchema.nullable().optional(),
});

export type AcpSessionCapabilities = z.infer<typeof AcpSessionCapabilitiesSchema>;

/**
 * Capabilities supported by the agent
 *
 * Advertised during initialization to inform the client about available features.
 *
 * @see https://agentclientprotocol.com/protocol/initialization#agent-capabilities
 */
export const AcpAgentCapabilitiesSchema = z.object({
    _meta: AcpMetaSchema,
    loadSession: z.boolean().default(false),
    mcpCapabilities: AcpMcpCapabilitiesSchema.default({ http: false, sse: false }),
    promptCapabilities: AcpPromptCapabilitiesSchema.default({
        audio: false,
        embeddedContext: false,
        image: false,
    }),
    sessionCapabilities: AcpSessionCapabilitiesSchema.default({}),
});

export type AcpAgentCapabilities = z.infer<typeof AcpAgentCapabilitiesSchema>;
