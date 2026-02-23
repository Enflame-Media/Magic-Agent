/**
 * ACP (Agent Client Protocol) module for happy-cli
 *
 * Provides:
 * - Transport layer: Subprocess lifecycle and JSON-RPC 2.0 communication
 * - Initialization: Protocol handshake with version and capability negotiation
 * - Authentication: Agent Auth (OAuth) and Terminal Auth flows
 * - Capability querying: Runtime feature-gating based on agent capabilities
 * - Session management: Full session lifecycle (create, load, resume, fork, config, mode, model, list)
 * - Resource handlers: Client-side fs and terminal operations
 * - Prompt handling: Full prompt turn lifecycle with streaming updates
 * - Message accumulation: Streaming content chunk aggregation
 *
 * Uses @agentclientprotocol/sdk for the protocol implementation and
 * @magic-agent/protocol for typed Zod schemas.
 *
 * @example
 * ```typescript
 * import {
 *     AcpTransport,
 *     initializeConnection,
 *     createResourceHandlers,
 *     canLoadSession,
 *     type AgentConnection,
 * } from '@/acp';
 *
 * const transport = new AcpTransport({
 *     command: 'claude',
 *     args: ['code', '--acp'],
 * });
 *
 * const resources = createResourceHandlers();
 *
 * transport.spawn((agent) => ({
 *     requestPermission: async (params) => { ... },
 *     sessionUpdate: async (params) => promptHandler.handleSessionUpdate(params),
 *     readTextFile: resources.readTextFile,
 *     writeTextFile: resources.writeTextFile,
 *     createTerminal: resources.createTerminal,
 *     terminalOutput: resources.terminalOutput,
 *     waitForTerminalExit: resources.waitForTerminalExit,
 *     killTerminal: resources.killTerminal,
 *     releaseTerminal: resources.releaseTerminal,
 * }));
 *
 * const connection = await initializeConnection(transport);
 *
 * if (canLoadSession(connection)) {
 *     // Agent supports session loading
 * }
 *
 * // Cleanup on disconnect
 * resources.releaseAllTerminals();
 * ```
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

// Transport layer
export { AcpTransport } from './transport';

export type {
    AcpTransportConfig,
    AcpTransportEvents,
    AcpTransportListener,
    AcpClientFactory,
} from './types';

// Initialization
export {
    initializeConnection,
    ProtocolVersionMismatchError,
    type InitializeOptions,
} from './initialization';

// Capabilities
export {
    HAPPY_CLIENT_CAPABILITIES,
    createAgentConnection,
    canLoadSession,
    canListSessions,
    canResumeSession,
    canForkSession,
    canPromptWithImages,
    canPromptWithAudio,
    canPromptWithEmbeddedContext,
    canMcpHttp,
    canMcpSse,
    isAuthRequired,
    isAuthenticated,
    isReady,
    type AgentConnection,
    type AcpAuthState,
} from './capabilities';

// Authentication
export {
    selectAuthMethod,
    authenticate,
    handleAuthIfRequired,
    isAuthRequiredError,
} from './auth';

// Session lifecycle management
export {
    SessionManager,
    SessionCapabilityError,
    SessionNotFoundError,
    type SessionState,
    type ListSessionsParams,
    type SessionListResult,
} from './sessions';

// Resource handlers for client-side fs and terminal operations
export { createResourceHandlers, TerminalRegistry } from './resources';
export type { AcpResourceHandlers } from './resources';

// Prompt turn lifecycle and streaming updates
export {
    PromptHandler,
    type PromptResult,
    type PromptHandlerEvents,
    type PromptHandlerListener,
} from './prompt';

// Message accumulation for streaming content chunks
export { MessageAccumulator } from './accumulator';

// Session update routing and typed events
export {
    UpdateRouter,
    type UpdateEvents,
    type UpdateListener,
} from './updates';

// Tool call lifecycle tracking
export {
    ToolCallRegistry,
    type ToolCallState,
    type ToolCallTrackedStatus,
    type ToolCallRegistryEvents,
    type ToolCallRegistryListener,
} from './toolcalls';

// Permission handling and policy store
export {
    PermissionHandler,
    PermissionPolicyStore,
    type PendingPermission,
    type PermissionPolicy,
    type PermissionHandlerEvents,
    type PermissionHandlerListener,
} from './permissions';

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
