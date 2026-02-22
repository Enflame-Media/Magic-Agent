/**
 * ACP initialization and authentication types
 *
 * These schemas define the connection handshake between client and agent,
 * including capability negotiation and authentication.
 *
 * @see https://agentclientprotocol.com/protocol/initialization
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';
import { AcpImplementationSchema, AcpProtocolVersionSchema } from './common';
import { AcpAgentCapabilitiesSchema, AcpClientCapabilitiesSchema } from './capabilities';

// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Describes an available authentication method
 *
 * Agents advertise auth methods in the initialize response.
 */
export const AcpAuthMethodSchema = z.object({
    _meta: AcpMetaSchema,
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
});

export type AcpAuthMethod = z.infer<typeof AcpAuthMethodSchema>;

/**
 * Request parameters for the authenticate method
 *
 * Specifies which authentication method to use.
 */
export const AcpAuthenticateRequestSchema = z.object({
    _meta: AcpMetaSchema,
    methodId: z.string(),
});

export type AcpAuthenticateRequest = z.infer<typeof AcpAuthenticateRequestSchema>;

/** Response to the authenticate method */
export const AcpAuthenticateResponseSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpAuthenticateResponse = z.infer<typeof AcpAuthenticateResponseSchema>;

// ─── Initialize ──────────────────────────────────────────────────────────────

/**
 * Request parameters for the initialize method
 *
 * Sent by the client to establish connection and negotiate capabilities.
 *
 * @see https://agentclientprotocol.com/protocol/initialization
 */
export const AcpInitializeRequestSchema = z.object({
    _meta: AcpMetaSchema,
    clientCapabilities: AcpClientCapabilitiesSchema.default({
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
    }),
    clientInfo: AcpImplementationSchema.nullable().optional(),
    protocolVersion: AcpProtocolVersionSchema,
});

export type AcpInitializeRequest = z.infer<typeof AcpInitializeRequestSchema>;

/**
 * Response to the initialize method
 *
 * Contains the negotiated protocol version and agent capabilities.
 *
 * @see https://agentclientprotocol.com/protocol/initialization
 */
export const AcpInitializeResponseSchema = z.object({
    _meta: AcpMetaSchema,
    agentCapabilities: AcpAgentCapabilitiesSchema.default({
        loadSession: false,
        mcpCapabilities: { http: false, sse: false },
        promptCapabilities: { audio: false, embeddedContext: false, image: false },
        sessionCapabilities: {},
    }),
    agentInfo: AcpImplementationSchema.nullable().optional(),
    authMethods: z.array(AcpAuthMethodSchema).default([]),
    protocolVersion: AcpProtocolVersionSchema,
});

export type AcpInitializeResponse = z.infer<typeof AcpInitializeResponseSchema>;
