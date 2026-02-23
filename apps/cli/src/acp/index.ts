/**
 * ACP (Agent Client Protocol) transport layer for happy-cli
 *
 * Provides subprocess lifecycle management and typed JSON-RPC 2.0
 * communication with ACP-compatible agent binaries over stdio.
 *
 * Uses @agentclientprotocol/sdk for the protocol implementation and
 * @magic-agent/protocol for typed Zod schemas.
 *
 * @example
 * ```typescript
 * import { AcpTransport, type AcpTransportConfig } from '@/acp';
 * import { ClientSideConnection } from '@agentclientprotocol/sdk';
 *
 * const transport = new AcpTransport({
 *     command: 'claude',
 *     args: ['code', '--acp'],
 * });
 *
 * const connection = transport.spawn((agent) => ({
 *     requestPermission: async (params) => { ... },
 *     sessionUpdate: async (params) => { ... },
 * }));
 *
 * // Use the connection for ACP communication
 * const initResult = await transport.request(
 *     (conn) => conn.initialize({ protocolVersion: 1, clientCapabilities: {} }),
 * );
 * ```
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

export { AcpTransport } from './transport';

export type {
    AcpTransportConfig,
    AcpTransportEvents,
    AcpTransportListener,
    AcpClientFactory,
} from './types';

// Re-export key SDK types for convenience
export {
    ClientSideConnection,
    RequestError,
    PROTOCOL_VERSION,
} from '@agentclientprotocol/sdk';

export type {
    Client,
    Agent,
    AnyMessage,
} from '@agentclientprotocol/sdk';
