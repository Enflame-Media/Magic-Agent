/**
 * Shared ACP types used across multiple schema modules
 *
 * These are foundational types referenced by initialization, sessions,
 * updates, tool calls, and resource schemas.
 *
 * @see https://agentclientprotocol.com/protocol/schema
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';

// ─── Identifiers ─────────────────────────────────────────────────────────────

/** Unique identifier for a conversation session */
export const AcpSessionIdSchema = z.string();
export type AcpSessionId = z.infer<typeof AcpSessionIdSchema>;

/** Unique identifier for a tool call within a session */
export const AcpToolCallIdSchema = z.string();
export type AcpToolCallId = z.infer<typeof AcpToolCallIdSchema>;

/** Unique identifier for a session mode */
export const AcpSessionModeIdSchema = z.string();
export type AcpSessionModeId = z.infer<typeof AcpSessionModeIdSchema>;

/** Unique identifier for a session configuration option */
export const AcpSessionConfigIdSchema = z.string();
export type AcpSessionConfigId = z.infer<typeof AcpSessionConfigIdSchema>;

/** Unique identifier for a session configuration option value */
export const AcpSessionConfigValueIdSchema = z.string();
export type AcpSessionConfigValueId = z.infer<typeof AcpSessionConfigValueIdSchema>;

/** Unique identifier for a session configuration option value group */
export const AcpSessionConfigGroupIdSchema = z.string();
export type AcpSessionConfigGroupId = z.infer<typeof AcpSessionConfigGroupIdSchema>;

/** Unique identifier for a permission option */
export const AcpPermissionOptionIdSchema = z.string();
export type AcpPermissionOptionId = z.infer<typeof AcpPermissionOptionIdSchema>;

/** Unique identifier for a model (UNSTABLE) */
export const AcpModelIdSchema = z.string();
export type AcpModelId = z.infer<typeof AcpModelIdSchema>;

/**
 * Protocol version identifier
 *
 * Only bumped for breaking changes. Non-breaking changes use capabilities.
 * Unsigned 16-bit integer (0-65535).
 */
export const AcpProtocolVersionSchema = z.number().int().min(0).max(65535);
export type AcpProtocolVersion = z.infer<typeof AcpProtocolVersionSchema>;

// ─── Implementation Info ─────────────────────────────────────────────────────

/**
 * Metadata about the implementation of the client or agent
 *
 * Describes the name and version with an optional title for UI representation.
 */
export const AcpImplementationSchema = z.object({
    _meta: AcpMetaSchema,
    name: z.string(),
    title: z.string().nullable().optional(),
    version: z.string(),
});

export type AcpImplementation = z.infer<typeof AcpImplementationSchema>;

// ─── Environment & HTTP ──────────────────────────────────────────────────────

/** An environment variable for MCP server or terminal processes */
export const AcpEnvVariableSchema = z.object({
    _meta: AcpMetaSchema,
    name: z.string(),
    value: z.string(),
});

export type AcpEnvVariable = z.infer<typeof AcpEnvVariableSchema>;

/** An HTTP header for MCP server connections */
export const AcpHttpHeaderSchema = z.object({
    _meta: AcpMetaSchema,
    name: z.string(),
    value: z.string(),
});

export type AcpHttpHeader = z.infer<typeof AcpHttpHeaderSchema>;

// ─── Annotations ─────────────────────────────────────────────────────────────

/** Role in a conversation */
export const AcpRoleSchema = z.enum(['assistant', 'user']);
export type AcpRole = z.infer<typeof AcpRoleSchema>;

/**
 * Optional annotations for the client
 *
 * Used to inform how objects are used or displayed.
 */
export const AcpAnnotationsSchema = z.object({
    _meta: AcpMetaSchema,
    audience: z.array(AcpRoleSchema).nullable().optional(),
    lastModified: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
});

export type AcpAnnotations = z.infer<typeof AcpAnnotationsSchema>;

// ─── Resource Contents ───────────────────────────────────────────────────────

/** Text-based resource contents */
export const AcpTextResourceContentsSchema = z.object({
    _meta: AcpMetaSchema,
    mimeType: z.string().nullable().optional(),
    text: z.string(),
    uri: z.string(),
});

export type AcpTextResourceContents = z.infer<typeof AcpTextResourceContentsSchema>;

/** Binary resource contents (base64 encoded) */
export const AcpBlobResourceContentsSchema = z.object({
    _meta: AcpMetaSchema,
    blob: z.string(),
    mimeType: z.string().nullable().optional(),
    uri: z.string(),
});

export type AcpBlobResourceContents = z.infer<typeof AcpBlobResourceContentsSchema>;

/** Resource content that can be embedded in a message */
export const AcpEmbeddedResourceResourceSchema = z.union([
    AcpTextResourceContentsSchema,
    AcpBlobResourceContentsSchema,
]);

export type AcpEmbeddedResourceResource = z.infer<typeof AcpEmbeddedResourceResourceSchema>;

// ─── Content Blocks ──────────────────────────────────────────────────────────

/** Text content block */
export const AcpTextContentSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('text'),
    annotations: AcpAnnotationsSchema.nullable().optional(),
    text: z.string(),
});

export type AcpTextContent = z.infer<typeof AcpTextContentSchema>;

/** Image content block */
export const AcpImageContentSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('image'),
    annotations: AcpAnnotationsSchema.nullable().optional(),
    data: z.string(),
    mimeType: z.string(),
    uri: z.string().nullable().optional(),
});

export type AcpImageContent = z.infer<typeof AcpImageContentSchema>;

/** Audio content block */
export const AcpAudioContentSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('audio'),
    annotations: AcpAnnotationsSchema.nullable().optional(),
    data: z.string(),
    mimeType: z.string(),
});

export type AcpAudioContent = z.infer<typeof AcpAudioContentSchema>;

/** Resource link content block */
export const AcpResourceLinkSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('resource_link'),
    annotations: AcpAnnotationsSchema.nullable().optional(),
    description: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    name: z.string(),
    size: z.number().int().nullable().optional(),
    title: z.string().nullable().optional(),
    uri: z.string(),
});

export type AcpResourceLink = z.infer<typeof AcpResourceLinkSchema>;

/** Embedded resource content block */
export const AcpEmbeddedResourceSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('resource'),
    annotations: AcpAnnotationsSchema.nullable().optional(),
    resource: AcpEmbeddedResourceResourceSchema,
});

export type AcpEmbeddedResource = z.infer<typeof AcpEmbeddedResourceSchema>;

/**
 * Content block - discriminated union on `type` field
 *
 * Content blocks represent displayable information in the Agent Client Protocol.
 * They appear in user prompts, agent output, and tool call results.
 *
 * Discriminated on `type`: "text" | "image" | "audio" | "resource_link" | "resource"
 *
 * @see https://agentclientprotocol.com/protocol/content
 */
export const AcpContentBlockSchema = z.discriminatedUnion('type', [
    AcpTextContentSchema,
    AcpImageContentSchema,
    AcpAudioContentSchema,
    AcpResourceLinkSchema,
    AcpEmbeddedResourceSchema,
]);

export type AcpContentBlock = z.infer<typeof AcpContentBlockSchema>;

// ─── Session Modes ───────────────────────────────────────────────────────────

/**
 * A mode the agent can operate in
 *
 * @see https://agentclientprotocol.com/protocol/session-modes
 */
export const AcpSessionModeSchema = z.object({
    _meta: AcpMetaSchema,
    id: AcpSessionModeIdSchema,
    name: z.string(),
    description: z.string().nullable().optional(),
});

export type AcpSessionMode = z.infer<typeof AcpSessionModeSchema>;

/** The set of modes and the one currently active */
export const AcpSessionModeStateSchema = z.object({
    _meta: AcpMetaSchema,
    availableModes: z.array(AcpSessionModeSchema),
    currentModeId: AcpSessionModeIdSchema,
});

export type AcpSessionModeState = z.infer<typeof AcpSessionModeStateSchema>;

// ─── Session Config ──────────────────────────────────────────────────────────

/** A possible value for a session configuration option */
export const AcpSessionConfigSelectOptionSchema = z.object({
    _meta: AcpMetaSchema,
    description: z.string().nullable().optional(),
    name: z.string(),
    value: AcpSessionConfigValueIdSchema,
});

export type AcpSessionConfigSelectOption = z.infer<typeof AcpSessionConfigSelectOptionSchema>;

/** A group of possible values for a session configuration option */
export const AcpSessionConfigSelectGroupSchema = z.object({
    _meta: AcpMetaSchema,
    group: AcpSessionConfigGroupIdSchema,
    name: z.string(),
    options: z.array(AcpSessionConfigSelectOptionSchema),
});

export type AcpSessionConfigSelectGroup = z.infer<typeof AcpSessionConfigSelectGroupSchema>;

/** Possible values for a session configuration option (flat or grouped) */
export const AcpSessionConfigSelectOptionsSchema = z.union([
    z.array(AcpSessionConfigSelectOptionSchema),
    z.array(AcpSessionConfigSelectGroupSchema),
]);

export type AcpSessionConfigSelectOptions = z.infer<typeof AcpSessionConfigSelectOptionsSchema>;

/** Semantic category for a session configuration option */
export const AcpSessionConfigOptionCategorySchema = z.string();
export type AcpSessionConfigOptionCategory = z.infer<typeof AcpSessionConfigOptionCategorySchema>;

/**
 * A session configuration option selector and its current state
 *
 * Discriminated on `type`: currently only "select" is defined.
 *
 * @see https://agentclientprotocol.com/protocol/schema
 */
export const AcpSessionConfigOptionSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('select'),
    id: AcpSessionConfigIdSchema,
    name: z.string(),
    description: z.string().nullable().optional(),
    category: AcpSessionConfigOptionCategorySchema.nullable().optional(),
    currentValue: AcpSessionConfigValueIdSchema,
    options: AcpSessionConfigSelectOptionsSchema,
});

export type AcpSessionConfigOption = z.infer<typeof AcpSessionConfigOptionSchema>;

// ─── Model Info (UNSTABLE) ───────────────────────────────────────────────────

/** Information about a selectable model (UNSTABLE) */
export const AcpModelInfoSchema = z.object({
    _meta: AcpMetaSchema,
    modelId: AcpModelIdSchema,
    name: z.string(),
    description: z.string().nullable().optional(),
});

export type AcpModelInfo = z.infer<typeof AcpModelInfoSchema>;

/** The set of models and the one currently active (UNSTABLE) */
export const AcpSessionModelStateSchema = z.object({
    _meta: AcpMetaSchema,
    availableModels: z.array(AcpModelInfoSchema),
    currentModelId: AcpModelIdSchema,
});

export type AcpSessionModelState = z.infer<typeof AcpSessionModelStateSchema>;

// ─── Session Info ────────────────────────────────────────────────────────────

/** Information about a session returned by session/list (UNSTABLE) */
export const AcpSessionInfoSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    cwd: z.string(),
    title: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
});

export type AcpSessionInfo = z.infer<typeof AcpSessionInfoSchema>;

// ─── MCP Server ──────────────────────────────────────────────────────────────

/** Stdio transport configuration for MCP */
export const AcpMcpServerStdioSchema = z.object({
    _meta: AcpMetaSchema,
    name: z.string(),
    command: z.string(),
    args: z.array(z.string()),
    env: z.array(AcpEnvVariableSchema),
});

export type AcpMcpServerStdio = z.infer<typeof AcpMcpServerStdioSchema>;

/** HTTP transport configuration for MCP */
export const AcpMcpServerHttpSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('http'),
    name: z.string(),
    url: z.string(),
    headers: z.array(AcpHttpHeaderSchema),
});

export type AcpMcpServerHttp = z.infer<typeof AcpMcpServerHttpSchema>;

/** SSE transport configuration for MCP */
export const AcpMcpServerSseSchema = z.object({
    _meta: AcpMetaSchema,
    type: z.literal('sse'),
    name: z.string(),
    url: z.string(),
    headers: z.array(AcpHttpHeaderSchema),
});

export type AcpMcpServerSse = z.infer<typeof AcpMcpServerSseSchema>;

/**
 * Configuration for connecting to an MCP server
 *
 * The schema uses `type` as discriminator for http/sse variants.
 * The stdio variant does not include a `type` field (it is the default transport).
 *
 * @see https://agentclientprotocol.com/protocol/session-setup#mcp-servers
 */
export const AcpMcpServerSchema = z.union([
    AcpMcpServerHttpSchema,
    AcpMcpServerSseSchema,
    AcpMcpServerStdioSchema,
]);

export type AcpMcpServer = z.infer<typeof AcpMcpServerSchema>;
