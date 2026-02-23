/**
 * ACP Initialization and Connection Handshake
 *
 * Orchestrates the ACP initialize → authenticate → ready flow.
 * Sends an InitializeRequest with Happy's client info and capabilities,
 * validates the response, handles version negotiation, and performs
 * authentication if required by the agent.
 *
 * @see https://agentclientprotocol.com/protocol/initialization
 */

import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import {
    AcpInitializeResponseSchema,
    type AcpInitializeResponse,
} from '@magic-agent/protocol';
import { logger } from '@/ui/logger';
import type { AcpTransport } from './transport';
import {
    HAPPY_CLIENT_CAPABILITIES,
    createAgentConnection,
    type AgentConnection,
} from './capabilities';
import type { AcpClientCapabilities } from '@magic-agent/protocol';
import { handleAuthIfRequired } from './auth';

/** happy-cli version loaded from package.json at build time */
const CLIENT_VERSION = '0.12.0';

/** Client info sent to agents during initialization */
const HAPPY_CLIENT_INFO = {
    name: 'happy-cli',
    version: CLIENT_VERSION,
} as const;

/**
 * ACP protocol version mismatch error.
 *
 * Thrown when the agent responds with a protocol version that
 * differs from what the client requested.
 */
export class ProtocolVersionMismatchError extends Error {
    readonly requestedVersion: number;
    readonly agentVersion: number;

    constructor(requested: number, agent: number) {
        super(
            `ACP protocol version mismatch: requested v${requested}, agent supports v${agent}. ` +
            'The agent may need to be updated.',
        );
        this.name = 'ProtocolVersionMismatchError';
        this.requestedVersion = requested;
        this.agentVersion = agent;
    }
}

/** Options for the initialization flow */
export interface InitializeOptions {
    /** Override client capabilities (defaults to HAPPY_CLIENT_CAPABILITIES) */
    clientCapabilities?: AcpClientCapabilities;

    /** Whether to automatically authenticate if the agent requires it (default: true) */
    autoAuthenticate?: boolean;

    /** Timeout for the initialize request in milliseconds (default: transport default) */
    timeoutMs?: number;
}

/**
 * Perform the ACP initialization handshake with an agent.
 *
 * Sends an InitializeRequest with Happy's client info and capabilities,
 * validates the response (including protocol version), and optionally
 * handles authentication if the agent requires it.
 *
 * @param transport - The ACP transport with a spawned agent process
 * @param options - Optional initialization configuration
 * @returns An AgentConnection representing the negotiated state
 * @throws ProtocolVersionMismatchError if the agent's protocol version differs
 * @throws Error if the initialization request fails
 *
 * @example
 * ```typescript
 * const transport = new AcpTransport({ command: 'claude', args: ['code', '--acp'] });
 * transport.spawn((agent) => ({ ... }));
 *
 * const connection = await initializeConnection(transport);
 *
 * if (canLoadSession(connection)) {
 *     // Agent supports session loading
 * }
 * ```
 */
export async function initializeConnection(
    transport: AcpTransport,
    options: InitializeOptions = {},
): Promise<AgentConnection> {
    const {
        clientCapabilities = HAPPY_CLIENT_CAPABILITIES,
        autoAuthenticate = true,
        timeoutMs,
    } = options;

    logger.info('[AcpInit] Sending initialize request');
    logger.info(`[AcpInit] Client: ${HAPPY_CLIENT_INFO.name} v${HAPPY_CLIENT_INFO.version}`);
    logger.info(`[AcpInit] Protocol version: ${PROTOCOL_VERSION}`);

    const rawResponse = await transport.request(
        (conn) => conn.initialize({
            protocolVersion: PROTOCOL_VERSION,
            clientInfo: HAPPY_CLIENT_INFO,
            clientCapabilities,
        }),
        timeoutMs,
    );

    // Validate the response with our Zod schemas for type safety
    const parseResult = AcpInitializeResponseSchema.safeParse(rawResponse);
    let response: AcpInitializeResponse;

    if (parseResult.success) {
        response = parseResult.data;
    } else {
        // Fall back to the raw SDK response if Zod parsing fails —
        // the SDK already validated the JSON-RPC structure
        logger.warn('[AcpInit] Zod validation of InitializeResponse had issues, using raw response');
        logger.warn('[AcpInit] Parse errors:', JSON.stringify(parseResult.error.issues));
        response = rawResponse as unknown as AcpInitializeResponse;
    }

    // Validate protocol version
    if (response.protocolVersion !== PROTOCOL_VERSION) {
        logger.error(
            `[AcpInit] Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${response.protocolVersion}`,
        );
        await transport.close();
        throw new ProtocolVersionMismatchError(PROTOCOL_VERSION, response.protocolVersion);
    }

    // Log agent info
    if (response.agentInfo) {
        const title = response.agentInfo.title
            ? ` (${response.agentInfo.title})`
            : '';
        logger.info(
            `[AcpInit] Connected to agent: ${response.agentInfo.name} v${response.agentInfo.version}${title}`,
        );
    }

    // Build the AgentConnection
    let connection = createAgentConnection(response, clientCapabilities);

    // Log capabilities
    logCapabilities(connection);

    // Handle authentication if required
    if (autoAuthenticate && connection.authState === 'required') {
        logger.info(`[AcpInit] Agent requires authentication (${connection.authMethods.length} method(s) available)`);
        connection = await handleAuthIfRequired(transport, connection);
    } else if (connection.authState === 'required') {
        logger.info('[AcpInit] Agent requires authentication (auto-authenticate disabled)');
    }

    logger.info(`[AcpInit] Initialization complete. Auth state: ${connection.authState}`);

    return connection;
}

/**
 * Log discovered agent capabilities for debugging.
 */
function logCapabilities(connection: AgentConnection): void {
    const caps = connection.capabilities;
    const features: string[] = [];

    if (caps.loadSession) features.push('loadSession');
    if (caps.sessionCapabilities?.list) features.push('listSessions');
    if (caps.sessionCapabilities?.resume) features.push('resumeSession');
    if (caps.sessionCapabilities?.fork) features.push('forkSession');
    if (caps.promptCapabilities?.image) features.push('image');
    if (caps.promptCapabilities?.audio) features.push('audio');
    if (caps.promptCapabilities?.embeddedContext) features.push('embeddedContext');
    if (caps.mcpCapabilities?.http) features.push('mcp:http');
    if (caps.mcpCapabilities?.sse) features.push('mcp:sse');

    if (features.length > 0) {
        logger.info(`[AcpInit] Agent capabilities: ${features.join(', ')}`);
    } else {
        logger.info('[AcpInit] Agent has no optional capabilities');
    }
}
