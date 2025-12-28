/**
 * MCP (Model Context Protocol) Types and Config Schemas
 *
 * This module provides comprehensive TypeScript types and Zod schemas for MCP configuration
 * management within Happy CLI. These types extend the base `McpServerConfig` interface
 * from AgentBackend.ts with additional management fields for user-facing features.
 *
 * @module mcp/types
 * @see {@link ../agent/AgentBackend.ts} for base McpServerConfig interface
 */

import { z } from 'zod';

/**
 * Metadata about an MCP server configuration
 *
 * Tracks when servers were added, validated, and their current state.
 *
 * @example
 * ```typescript
 * const metadata = McpServerMetadataSchema.parse({
 *     addedAt: '2024-12-28T00:30:00.000Z',
 *     lastValidated: '2024-12-28T00:35:00.000Z',
 *     toolCount: 5,
 *     description: 'GitHub integration server'
 * });
 * ```
 */
export const McpServerMetadataSchema = z.object({
    /** ISO-8601 datetime when the server was added to configuration */
    addedAt: z.string().datetime(),
    /** ISO-8601 datetime when the server was last successfully validated */
    lastValidated: z.string().datetime().optional(),
    /** Number of tools discovered from this server */
    toolCount: z.number().int().nonnegative().optional(),
    /** Human-readable description of the server's purpose */
    description: z.string().optional(),
});

export type McpServerMetadata = z.infer<typeof McpServerMetadataSchema>;

/**
 * Extended MCP server configuration for Happy CLI management
 *
 * Extends the base McpServerConfig from AgentBackend.ts with additional fields
 * for user-facing management features like disabling servers, controlling
 * individual tools, and auto-approval settings.
 *
 * Fields `command`, `args`, and `env` match the base McpServerConfig interface
 * for backward compatibility.
 *
 * @example
 * ```typescript
 * const serverConfig = HappyMcpServerConfigSchema.parse({
 *     command: 'npx',
 *     args: ['-y', '@modelcontextprotocol/server-github'],
 *     env: { GITHUB_TOKEN: 'ghp_xxx' },
 *     disabled: false,
 *     disabledTools: ['dangerous_tool'],
 *     autoApprove: ['read_*', 'list_*'],
 *     timeout: 10000,
 *     metadata: {
 *         addedAt: '2024-12-28T00:30:00.000Z',
 *         description: 'GitHub MCP server'
 *     }
 * });
 * ```
 */
export const HappyMcpServerConfigSchema = z.object({
    // Base McpServerConfig fields (backward compatible)
    /** Command to execute to start the MCP server */
    command: z.string(),
    /** Arguments to pass to the command */
    args: z.array(z.string()).optional(),
    /** Environment variables for the server process */
    env: z.record(z.string(), z.string()).optional(),

    // Extended management fields
    /** Whether this server is disabled (won't be started) */
    disabled: z.boolean().optional().default(false),
    /** List of tool names that should not be made available */
    disabledTools: z.array(z.string()).optional().default([]),
    /** Tool patterns that should be auto-approved (glob-style matching) */
    autoApprove: z.array(z.string()).optional().default([]),
    /** Connection timeout in milliseconds */
    timeout: z.number().int().positive().optional().default(5000),
    /** Metadata about this server configuration */
    metadata: McpServerMetadataSchema.optional(),
});

export type HappyMcpServerConfig = z.infer<typeof HappyMcpServerConfigSchema>;

/**
 * Agent-specific MCP configuration overrides
 *
 * Allows different agents (claude, codex, etc.) to have customized MCP settings.
 *
 * @example
 * ```typescript
 * const agentOverride = AgentMcpOverrideSchema.parse({
 *     mcpServers: {
 *         'custom-server': {
 *             command: 'node',
 *             args: ['server.js']
 *         }
 *     },
 *     disabled: ['github-server', 'filesystem-server']
 * });
 * ```
 */
export const AgentMcpOverrideSchema = z.object({
    /** Agent-specific MCP server configurations */
    mcpServers: z.record(z.string(), HappyMcpServerConfigSchema).optional(),
    /** Names of servers to disable for this agent */
    disabled: z.array(z.string()).optional(),
});

export type AgentMcpOverride = z.infer<typeof AgentMcpOverrideSchema>;

/**
 * Full Happy MCP configuration file structure
 *
 * Represents the complete configuration stored in the user's Happy config directory.
 * Supports versioning for future schema migrations.
 *
 * @example
 * ```typescript
 * const config = HappyMcpConfigSchema.parse({
 *     version: 1,
 *     mcpServers: {
 *         'github': {
 *             command: 'npx',
 *             args: ['-y', '@modelcontextprotocol/server-github'],
 *             metadata: { addedAt: '2024-12-28T00:30:00.000Z' }
 *         }
 *     },
 *     agentOverrides: {
 *         'codex': {
 *             disabled: ['github']
 *         }
 *     }
 * });
 * ```
 */
export const HappyMcpConfigSchema = z.object({
    /** Schema version for future migrations */
    version: z.literal(1),
    /** Global MCP server configurations */
    mcpServers: z.record(z.string(), HappyMcpServerConfigSchema).default({}),
    /** Per-agent configuration overrides */
    agentOverrides: z.record(z.string(), AgentMcpOverrideSchema).optional(),
});

export type HappyMcpConfig = z.infer<typeof HappyMcpConfigSchema>;

/**
 * Tool information returned from an MCP server
 *
 * Represents a single tool exposed by an MCP server.
 *
 * @example
 * ```typescript
 * const tool: McpTool = {
 *     name: 'read_file',
 *     description: 'Read contents of a file from the repository'
 * };
 * ```
 */
export interface McpTool {
    /** Tool name as exposed by the MCP server */
    name: string;
    /** Human-readable description of what the tool does */
    description?: string;
}

/**
 * Result of validating an MCP server connection
 *
 * Contains information about whether the server started successfully,
 * what tools it provides, and any errors encountered.
 *
 * @example
 * ```typescript
 * // Successful validation
 * const success: McpValidationResult = {
 *     success: true,
 *     serverName: 'github-server',
 *     toolCount: 5,
 *     tools: [
 *         { name: 'read_file', description: 'Read a file' },
 *         { name: 'list_repos', description: 'List repositories' }
 *     ],
 *     validatedAt: '2024-12-28T00:30:00.000Z'
 * };
 *
 * // Failed validation
 * const failure: McpValidationResult = {
 *     success: false,
 *     serverName: 'broken-server',
 *     error: 'Connection timeout after 5000ms',
 *     validatedAt: '2024-12-28T00:30:00.000Z'
 * };
 * ```
 */
export interface McpValidationResult {
    /** Whether the server validated successfully */
    success: boolean;
    /** Name of the server being validated */
    serverName: string;
    /** Number of tools discovered (on success) */
    toolCount?: number;
    /** List of tools exposed by the server (on success) */
    tools?: McpTool[];
    /** Error message if validation failed */
    error?: string;
    /** ISO-8601 datetime when validation was performed */
    validatedAt: string;
}

/**
 * Default configuration for a new Happy MCP config file
 *
 * Use this when creating a fresh configuration.
 *
 * @example
 * ```typescript
 * import { DEFAULT_MCP_CONFIG } from './types';
 * const config = { ...DEFAULT_MCP_CONFIG };
 * ```
 */
export const DEFAULT_MCP_CONFIG: HappyMcpConfig = {
    version: 1,
    mcpServers: {},
};
