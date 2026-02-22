/**
 * JSON-RPC 2.0 base types for the Agent Client Protocol
 *
 * These schemas define the foundational message structure used by ACP.
 * All ACP communication follows JSON-RPC 2.0 with optional `_meta` extensions.
 *
 * @see https://www.jsonrpc.org/specification
 * @see https://agentclientprotocol.com/protocol/schema
 */

import { z } from 'zod';

// ─── Identifiers ─────────────────────────────────────────────────────────────

/**
 * JSON-RPC request ID
 *
 * An identifier established by the client. Must contain a String, Number, or NULL value.
 * The server MUST reply with the same value in the Response object.
 */
export const AcpRequestIdSchema = z.union([
    z.null(),
    z.number().int(),
    z.string(),
]);

export type AcpRequestId = z.infer<typeof AcpRequestIdSchema>;

// ─── Meta ────────────────────────────────────────────────────────────────────

/**
 * ACP extensibility metadata
 *
 * Reserved by ACP for client and agent metadata. Implementations MUST NOT
 * make assumptions about values at these keys.
 *
 * @see https://agentclientprotocol.com/protocol/extensibility
 */
export const AcpMetaSchema = z.record(z.string(), z.unknown()).nullable().optional();

export type AcpMeta = z.infer<typeof AcpMetaSchema>;

// ─── Error Codes ─────────────────────────────────────────────────────────────

/**
 * Predefined JSON-RPC and ACP-specific error codes
 *
 * Standard JSON-RPC codes plus ACP-specific codes in the reserved range.
 */
export const AcpErrorCodeSchema = z.number().int();

export type AcpErrorCode = z.infer<typeof AcpErrorCodeSchema>;

/** Well-known error code constants */
export const ACP_ERROR_CODES = {
    /** Invalid JSON was received */
    PARSE_ERROR: -32700,
    /** The JSON sent is not a valid Request object */
    INVALID_REQUEST: -32600,
    /** The method does not exist or is not available */
    METHOD_NOT_FOUND: -32601,
    /** Invalid method parameter(s) */
    INVALID_PARAMS: -32602,
    /** Internal JSON-RPC error */
    INTERNAL_ERROR: -32603,
    /** Request cancelled (UNSTABLE) */
    REQUEST_CANCELLED: -32800,
    /** Authentication is required before this operation */
    AUTH_REQUIRED: -32000,
    /** A given resource was not found */
    RESOURCE_NOT_FOUND: -32002,
} as const;

// ─── Error Object ────────────────────────────────────────────────────────────

/**
 * JSON-RPC error object
 *
 * Represents an error that occurred during method execution.
 *
 * @see https://www.jsonrpc.org/specification#error_object
 */
export const AcpErrorSchema = z.object({
    code: AcpErrorCodeSchema,
    message: z.string(),
    data: z.unknown().optional(),
});

export type AcpError = z.infer<typeof AcpErrorSchema>;

// ─── JSON-RPC Messages ──────────────────────────────────────────────────────

/**
 * JSON-RPC 2.0 request
 */
export const AcpJsonRpcRequestSchema = z.object({
    jsonrpc: z.literal('2.0').optional(),
    id: AcpRequestIdSchema,
    method: z.string(),
    params: z.unknown().optional(),
});

export type AcpJsonRpcRequest = z.infer<typeof AcpJsonRpcRequestSchema>;

/**
 * JSON-RPC 2.0 successful response
 */
export const AcpJsonRpcResponseSchema = z.object({
    jsonrpc: z.literal('2.0').optional(),
    id: AcpRequestIdSchema,
    result: z.unknown(),
});

export type AcpJsonRpcResponse = z.infer<typeof AcpJsonRpcResponseSchema>;

/**
 * JSON-RPC 2.0 error response
 */
export const AcpJsonRpcErrorResponseSchema = z.object({
    jsonrpc: z.literal('2.0').optional(),
    id: AcpRequestIdSchema,
    error: AcpErrorSchema,
});

export type AcpJsonRpcErrorResponse = z.infer<typeof AcpJsonRpcErrorResponseSchema>;

/**
 * JSON-RPC 2.0 notification (no id, no response expected)
 */
export const AcpJsonRpcNotificationSchema = z.object({
    jsonrpc: z.literal('2.0').optional(),
    method: z.string(),
    params: z.unknown().optional(),
});

export type AcpJsonRpcNotification = z.infer<typeof AcpJsonRpcNotificationSchema>;
