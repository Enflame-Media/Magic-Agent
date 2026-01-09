/**
 * MCP (Model Context Protocol) state schemas for sync
 *
 * These schemas define the structure for syncing MCP state from CLI to App.
 * The CLI tracks MCP server states and can send this information to connected
 * mobile apps for display.
 *
 * Security: All string fields have maximum length constraints.
 */

import { z } from 'zod';
import { STRING_LIMITS } from './constraints';

/**
 * Schema for MCP server state sent from CLI to App
 *
 * This represents the state of a single MCP server as tracked by the CLI.
 * The server name is used as the key in the parent record.
 *
 * @example
 * ```typescript
 * const serverState = McpServerStateSchema.parse({
 *     disabled: false,
 *     toolCount: 15,
 *     lastValidated: '2024-12-28T10:30:00.000Z',
 *     disabledTools: ['dangerous-tool']
 * });
 * ```
 */
export const McpServerStateSchema = z.object({
    disabled: z.boolean(),
    toolCount: z.number().optional(),
    lastValidated: z.string().datetime().max(STRING_LIMITS.LABEL_MAX).optional(),
    disabledTools: z.array(z.string().max(STRING_LIMITS.MCP_TOOL_NAME_MAX)).optional(),
});

export type McpServerState = z.infer<typeof McpServerStateSchema>;

/**
 * Schema for MCP tool info
 *
 * Minimal information about an MCP tool for display purposes.
 *
 * @example
 * ```typescript
 * const tool = McpToolInfoSchema.parse({
 *     name: 'search_codebase',
 *     description: 'Search for patterns in the codebase'
 * });
 * ```
 */
export const McpToolInfoSchema = z.object({
    name: z.string().min(1).max(STRING_LIMITS.MCP_TOOL_NAME_MAX),
    description: z.string().max(STRING_LIMITS.MCP_TOOL_DESCRIPTION_MAX).optional(),
});

export type McpToolInfo = z.infer<typeof McpToolInfoSchema>;

/**
 * Full MCP state for sync
 *
 * This is the top-level schema containing all MCP state that gets synced
 * from CLI to App. It's designed to be included in session update payloads.
 *
 * - `servers`: Record of server name -> state (always present)
 * - `tools`: Optional record of server name -> tool list (only if tools are fetched)
 *
 * @example
 * ```typescript
 * const mcpState = McpSyncStateSchema.parse({
 *     servers: {
 *         'github-mcp': { disabled: false, toolCount: 10 },
 *         'local-tools': { disabled: true }
 *     },
 *     tools: {
 *         'github-mcp': [
 *             { name: 'get_issues', description: 'Fetch GitHub issues' },
 *             { name: 'create_pr', description: 'Create a pull request' }
 *         ]
 *     }
 * });
 * ```
 */
export const McpSyncStateSchema = z.object({
    servers: z.record(z.string().max(STRING_LIMITS.MCP_SERVER_NAME_MAX), McpServerStateSchema),
    tools: z.record(z.string().max(STRING_LIMITS.MCP_SERVER_NAME_MAX), z.array(McpToolInfoSchema)).optional(),
});

export type McpSyncState = z.infer<typeof McpSyncStateSchema>;
