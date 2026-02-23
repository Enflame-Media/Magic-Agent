/**
 * Happy ACP Extension Methods
 *
 * Custom ACP methods under the `_happy.app/` namespace for features
 * specific to Happy's remote session management. Extension methods
 * follow the ACP convention `_<vendor-domain>/<method-name>`.
 *
 * Extension methods are sent as JSON-RPC requests to the agent via
 * the existing transport layer. The agent may or may not support them;
 * unsupported methods return standard JSON-RPC MethodNotFound errors.
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

import { logger } from '@/ui/logger';
import type { AcpTransport } from './transport';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Vendor prefix for Happy extension methods */
export const EXTENSION_PREFIX = '_happy.app/' as const;

/** All Happy extension method names */
export const EXTENSION_METHODS = {
    SESSION_INFO: `${EXTENSION_PREFIX}session-info`,
    ENCRYPTION_KEYS: `${EXTENSION_PREFIX}encryption-keys`,
    REMOTE_PROMPT: `${EXTENSION_PREFIX}remote-prompt`,
    REMOTE_CANCEL: `${EXTENSION_PREFIX}remote-cancel`,
} as const;

// ─── Request/Response Types ──────────────────────────────────────────────────

/** Request for session metadata (for remote display) */
export interface SessionInfoRequest {
    sessionId: string;
}

/** Response with session metadata for remote display */
export interface SessionInfoResponse {
    sessionId: string;
    agentName: string;
    agentVersion: string;
    cwd: string;
    startedAt: string;
    isActive: boolean;
}

/** Request for E2E encryption key exchange */
export interface EncryptionKeysRequest {
    /** Client's public key for key exchange (base64) */
    clientPublicKey: string;
}

/** Response with agent's encryption keys */
export interface EncryptionKeysResponse {
    /** Agent's public key for key exchange (base64) */
    agentPublicKey: string;
    /** Key exchange protocol identifier */
    protocol: string;
}

/** Request to forward a prompt from mobile app to agent */
export interface RemotePromptRequest {
    sessionId: string;
    /** The prompt text from the remote client */
    prompt: string;
    /** Optional attached images (base64) */
    images?: string[];
}

/** Response acknowledging prompt receipt */
export interface RemotePromptResponse {
    /** Whether the prompt was accepted by the agent */
    accepted: boolean;
    /** Reason for rejection, if not accepted */
    reason?: string;
}

/** Request to cancel the current operation from mobile app */
export interface RemoteCancelRequest {
    sessionId: string;
}

/** Response acknowledging cancellation */
export interface RemoteCancelResponse {
    /** Whether cancellation was successful */
    cancelled: boolean;
}

// ─── Extension Method Client ─────────────────────────────────────────────────

/**
 * Client for invoking Happy extension methods on an ACP agent.
 *
 * Extension methods are best-effort: if the agent doesn't support them,
 * the transport will receive a JSON-RPC MethodNotFound error which is
 * caught and returned as null.
 *
 * @example
 * ```typescript
 * const extensions = new ExtensionMethodClient(transport);
 *
 * const info = await extensions.getSessionInfo({ sessionId: 'abc' });
 * if (info) {
 *     console.log(`Agent: ${info.agentName} v${info.agentVersion}`);
 * } else {
 *     console.log('Agent does not support _happy.app/session-info');
 * }
 * ```
 */
export class ExtensionMethodClient {
    private readonly transport: AcpTransport;

    constructor(transport: AcpTransport) {
        this.transport = transport;
    }

    /**
     * Get session metadata for remote display.
     *
     * @returns Session info or null if the agent doesn't support this extension
     */
    async getSessionInfo(params: SessionInfoRequest): Promise<SessionInfoResponse | null> {
        return this.callExtension<SessionInfoRequest, SessionInfoResponse>(
            EXTENSION_METHODS.SESSION_INFO,
            params,
        );
    }

    /**
     * Exchange encryption keys for E2E encryption setup.
     *
     * @returns Encryption keys or null if the agent doesn't support this extension
     */
    async exchangeEncryptionKeys(params: EncryptionKeysRequest): Promise<EncryptionKeysResponse | null> {
        return this.callExtension<EncryptionKeysRequest, EncryptionKeysResponse>(
            EXTENSION_METHODS.ENCRYPTION_KEYS,
            params,
        );
    }

    /**
     * Forward a prompt from the mobile app to the agent.
     *
     * @returns Prompt acceptance or null if the agent doesn't support this extension
     */
    async sendRemotePrompt(params: RemotePromptRequest): Promise<RemotePromptResponse | null> {
        return this.callExtension<RemotePromptRequest, RemotePromptResponse>(
            EXTENSION_METHODS.REMOTE_PROMPT,
            params,
        );
    }

    /**
     * Cancel the current agent operation from the mobile app.
     *
     * @returns Cancellation result or null if the agent doesn't support this extension
     */
    async sendRemoteCancel(params: RemoteCancelRequest): Promise<RemoteCancelResponse | null> {
        return this.callExtension<RemoteCancelRequest, RemoteCancelResponse>(
            EXTENSION_METHODS.REMOTE_CANCEL,
            params,
        );
    }

    /**
     * Check whether the agent supports a specific extension method.
     *
     * Sends a lightweight probe request. Returns true if the agent
     * responds without a MethodNotFound error.
     */
    async supportsExtension(method: string): Promise<boolean> {
        try {
            await this.transport.request(
                (conn) => (conn as unknown as Record<string, (params: unknown) => Promise<unknown>>)
                    [method]?.({}),
                5_000,
            );
            return true;
        } catch {
            return false;
        }
    }

    // ─── Internal ────────────────────────────────────────────────────────

    /**
     * Invoke an extension method on the agent via the transport.
     *
     * Extension methods use the ACP transport's JSON-RPC connection
     * with custom method names. If the agent returns a MethodNotFound
     * error (-32601), returns null instead of throwing.
     */
    private async callExtension<TReq, TRes>(
        method: string,
        params: TReq,
    ): Promise<TRes | null> {
        logger.info(`[Extensions] Calling ${method}`);

        try {
            const result = await this.transport.request(
                (conn) => {
                    // Use the underlying JSON-RPC connection to send custom methods.
                    // The ACP SDK's ClientSideConnection doesn't have built-in
                    // support for extension methods, so we access the raw send.
                    const raw = conn as unknown as {
                        sendRequest: (method: string, params: unknown) => Promise<unknown>;
                    };

                    if (typeof raw.sendRequest === 'function') {
                        return raw.sendRequest(method, params);
                    }

                    // Fallback: try calling as a dynamic method
                    const dynamic = conn as unknown as Record<string, (p: unknown) => Promise<unknown>>;
                    if (typeof dynamic[method] === 'function') {
                        return dynamic[method](params);
                    }

                    throw new Error(`Cannot invoke extension method '${method}': no compatible transport method`);
                },
            );

            return result as TRes;
        } catch (error: unknown) {
            if (isMethodNotFoundError(error)) {
                logger.info(`[Extensions] Agent does not support ${method}`);
                return null;
            }

            logger.error(`[Extensions] Error calling ${method}:`, error);
            throw error;
        }
    }
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/** JSON-RPC 2.0 Method Not Found error code */
const METHOD_NOT_FOUND_CODE = -32601;

/**
 * Check if an error is a JSON-RPC MethodNotFound error.
 */
function isMethodNotFoundError(error: unknown): boolean {
    if (error !== null && typeof error === 'object' && 'code' in error) {
        return (error as { code: number }).code === METHOD_NOT_FOUND_CODE;
    }
    return false;
}
