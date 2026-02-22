/**
 * Agent Client Protocol (ACP) Zod schemas
 *
 * Comprehensive Zod schemas matching the ACP protocol v1 specification.
 * These schemas provide runtime validation and TypeScript types for all
 * ACP message types across JSON-RPC requests, responses, notifications,
 * content blocks, tool calls, plans, capabilities, and authentication.
 *
 * @see https://agentclientprotocol.com/protocol/schema
 *
 * @example
 * ```typescript
 * import {
 *     AcpSessionUpdateSchema,
 *     AcpContentBlockSchema,
 *     type AcpSessionUpdate,
 *     type AcpContentBlock,
 * } from '@magic-agent/protocol';
 *
 * // Validate a session update
 * const result = AcpSessionUpdateSchema.safeParse(data);
 * if (result.success) {
 *     switch (result.data.sessionUpdate) {
 *         case 'agent_message_chunk':
 *             console.log('Content:', result.data.content);
 *             break;
 *         case 'tool_call':
 *             console.log('Tool:', result.data.title);
 *             break;
 *     }
 * }
 * ```
 */

// JSON-RPC 2.0 base types
export * from './jsonrpc';

// Shared ACP types (identifiers, content blocks, MCP server config, etc.)
export * from './common';

// Capability negotiation types
export * from './capabilities';

// Initialization and authentication
export * from './initialization';

// Session management types
export * from './sessions';

// Session update notification types
export * from './updates';

// Tool call and permission types
export * from './toolcalls';

// Prompt turn types (request, response, stop reason, cancel)
export * from './prompt';

// Client-side resource method types (fs, terminal)
export * from './resources';
