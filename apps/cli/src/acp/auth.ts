/**
 * ACP Authentication Flow
 *
 * Handles the authentication handshake when an agent requires it.
 * Supports Agent Auth (agent-managed OAuth) and Terminal Auth
 * (interactive terminal setup).
 *
 * @see https://agentclientprotocol.com/protocol/initialization
 */

import type { AcpAuthMethod } from '@magic-agent/protocol';
import { ACP_ERROR_CODES } from '@magic-agent/protocol';
import { RequestError } from '@agentclientprotocol/sdk';
import { logger } from '@/ui/logger';
import type { AcpTransport } from './transport';
import type { AgentConnection } from './capabilities';

/** Well-known auth method IDs from the ACP registry */
const AUTH_METHOD_IDS = {
    AGENT_AUTH: 'agent_auth',
    TERMINAL_AUTH: 'terminal_auth',
    ENV_VARIABLE: 'env_variable',
} as const;

/** Preferred auth method order (first match wins) */
const AUTH_METHOD_PREFERENCE = [
    AUTH_METHOD_IDS.AGENT_AUTH,
    AUTH_METHOD_IDS.TERMINAL_AUTH,
    AUTH_METHOD_IDS.ENV_VARIABLE,
] as const;

/**
 * Select the best authentication method from the available options.
 *
 * Prefers Agent Auth (OAuth managed by agent) over Terminal Auth
 * (interactive terminal flow). Falls back to the first available
 * method if none of the preferred methods are available.
 *
 * @param authMethods - Available auth methods from InitializeResponse
 * @returns The selected auth method, or null if no methods available
 */
export function selectAuthMethod(authMethods: AcpAuthMethod[]): AcpAuthMethod | null {
    if (authMethods.length === 0) {
        return null;
    }

    for (const preferredId of AUTH_METHOD_PREFERENCE) {
        const method = authMethods.find((m) => m.id === preferredId);
        if (method) {
            return method;
        }
    }

    return authMethods[0];
}

/**
 * Perform authentication with the agent.
 *
 * Sends an authenticate request using the selected method. For Agent Auth,
 * the agent manages the OAuth flow (e.g., opening a browser) and the
 * authenticate call blocks until completion. For Terminal Auth, the agent
 * performs an interactive setup flow.
 *
 * @param transport - The ACP transport for communication
 * @param connection - The agent connection to update
 * @param method - The auth method to use (from selectAuthMethod)
 * @returns The updated AgentConnection with authState set to 'authenticated'
 * @throws Error if authentication fails
 */
export async function authenticate(
    transport: AcpTransport,
    connection: AgentConnection,
    method: AcpAuthMethod,
): Promise<AgentConnection> {
    logger.info(`[AcpAuth] Authenticating with method: ${method.name} (${method.id})`);

    if (method.description) {
        logger.info(`[AcpAuth] ${method.description}`);
    }

    try {
        await transport.request(
            (conn) => conn.authenticate({ methodId: method.id }),
            0, // No timeout — auth flows can involve user interaction
        );

        logger.info('[AcpAuth] Authentication successful');

        return {
            ...connection,
            authState: 'authenticated',
        };
    } catch (error: unknown) {
        logger.error('[AcpAuth] Authentication failed:', error);
        throw new Error(
            `Authentication failed using method "${method.name}": ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}

/**
 * Handle the full authentication flow for an agent connection.
 *
 * If the agent requires authentication (non-empty authMethods), selects
 * the best method and performs authentication. Returns the connection
 * unchanged if no authentication is needed.
 *
 * @param transport - The ACP transport for communication
 * @param connection - The agent connection (from initialization)
 * @returns The connection with updated auth state
 */
export async function handleAuthIfRequired(
    transport: AcpTransport,
    connection: AgentConnection,
): Promise<AgentConnection> {
    if (connection.authState !== 'required') {
        return connection;
    }

    const method = selectAuthMethod(connection.authMethods);
    if (!method) {
        logger.warn('[AcpAuth] Auth required but no methods available');
        return connection;
    }

    return authenticate(transport, connection, method);
}

/**
 * Check whether a request error indicates authentication is required.
 *
 * The ACP spec defines error code -32000 (AUTH_REQUIRED) to signal
 * that the client must authenticate before the operation can proceed.
 * This typically occurs when calling session/new without prior authentication.
 *
 * @param error - The error to check
 * @returns true if the error is an auth_required error
 */
export function isAuthRequiredError(error: unknown): boolean {
    if (error instanceof RequestError) {
        return error.code === ACP_ERROR_CODES.AUTH_REQUIRED;
    }
    // The SDK's Connection rejects with raw JSON-RPC error objects { code, message }
    // when the agent returns an error response, so also check plain objects
    if (error !== null && typeof error === 'object' && 'code' in error) {
        return (error as { code: number }).code === ACP_ERROR_CODES.AUTH_REQUIRED;
    }
    return false;
}
