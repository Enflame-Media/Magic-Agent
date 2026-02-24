/**
 * ACP Session State Types
 *
 * Types for managing ACP (Agent Client Protocol) session update state
 * in the mobile app. These represent the accumulated real-time state
 * from ACP session updates received via the server relay.
 *
 * @see HAP-1036 - Adapt happy-server relay and happy-app display for ACP session updates
 */

import type {
    AcpSessionUpdate,
    AcpPlanEntry,
    AcpAvailableCommand,
    AcpToolCall,
    AcpToolCallUpdate,
    AcpSessionConfigOption,
    AcpContentBlock,
    AcpSessionInfo,
    AcpAgentCapabilities,
    AcpPermissionOption,
    AcpPermissionOptionKind,
    AcpToolCallLocation,
} from '@magic-agent/protocol';

/**
 * Accumulated ACP session state for a single session.
 *
 * Built up from streaming ACP session updates. Each update kind
 * mutates a specific part of this state.
 */
export interface AcpSessionState {
    /** Accumulated agent message text from agent_message_chunk updates */
    agentMessage: string;

    /** Accumulated user message text from user_message_chunk updates */
    userMessage: string;

    /** Accumulated agent thought text from agent_thought_chunk updates */
    agentThought: string;

    /** Active tool calls, keyed by toolCallId */
    toolCalls: Record<string, AcpToolCall>;

    /** Current execution plan entries (replaced entirely on each plan update) */
    plan: AcpPlanEntry[];

    /** Available slash commands */
    availableCommands: AcpAvailableCommand[];

    /** Current session mode ID (e.g., "code", "ask", "architect") */
    currentModeId: string | null;

    /** Session config options (e.g., model selection) */
    configOptions: AcpSessionConfigOption[];

    /** Session title from session_info_update */
    sessionTitle: string | null;

    /** Context window usage */
    usage: {
        used: number;
        size: number;
        cost: { amount: number; currency: string } | null;
    } | null;

    /** HAP-1043: Pending permission requests, keyed by requestId */
    permissionRequests: Record<string, AcpPermissionRequestState>;

    /** HAP-1043: History of resolved permission decisions */
    permissionHistory: AcpPermissionDecision[];

    /** Timestamp of last ACP update received */
    lastUpdateAt: number;
}

// ─── Permission Request Types (HAP-1043) ─────────────────────────────────────

/**
 * HAP-1043: Status of a permission request in the mobile app.
 */
export type AcpPermissionRequestStatus = 'pending' | 'responded' | 'expired';

/**
 * HAP-1043: A permission request received from the CLI agent.
 *
 * Contains the tool details and available options for user approval/denial.
 * Relayed from CLI through the server as an ACP session update.
 */
export interface AcpPermissionRequestState {
    /** Unique request ID for correlating response */
    requestId: string;
    /** Session ID this request belongs to */
    sessionId: string;
    /** Tool call that needs permission */
    toolCall: {
        toolCallId: string;
        title: string;
        kind?: string;
        rawInput?: unknown;
        locations?: AcpToolCallLocation[];
    };
    /** Available permission options */
    options: AcpPermissionOption[];
    /** When the request was received */
    receivedAt: number;
    /** Timeout deadline (timestamp), if specified by the agent */
    timeoutAt: number | null;
    /** Current status */
    status: AcpPermissionRequestStatus;
    /** Selected option ID, if responded */
    selectedOptionId: string | null;
}

/**
 * HAP-1043: A resolved permission decision for the history log.
 */
export interface AcpPermissionDecision {
    requestId: string;
    toolTitle: string;
    toolKind: string | null;
    selectedOption: {
        optionId: string;
        name: string;
        kind: AcpPermissionOptionKind;
    } | null;
    outcome: 'selected' | 'expired' | 'cancelled';
    decidedAt: number;
}

/**
 * Create a fresh ACP session state with defaults.
 */
export function createAcpSessionState(): AcpSessionState {
    return {
        agentMessage: '',
        userMessage: '',
        agentThought: '',
        toolCalls: {},
        plan: [],
        availableCommands: [],
        currentModeId: null,
        configOptions: [],
        sessionTitle: null,
        usage: null,
        permissionRequests: {},
        permissionHistory: [],
        lastUpdateAt: 0,
    };
}

/**
 * Extract text from an ACP content block.
 * Returns the text content or empty string for non-text blocks.
 */
export function extractTextFromContentBlock(content: AcpContentBlock): string {
    if (content.type === 'text') {
        return content.text;
    }
    return '';
}

// ─── Agent Registry Types (HAP-1045) ────────────────────────────────────────

/**
 * HAP-1045: Connection status for a registered ACP agent.
 */
export type AcpAgentStatus = 'connected' | 'available' | 'unavailable' | 'error';

/**
 * HAP-1045: A registered ACP agent in the agent registry.
 * Relayed from CLI's AgentRegistry to the mobile app.
 */
export interface AcpRegisteredAgent {
    /** Unique agent identifier (e.g., "claude-code", "gemini-cli") */
    id: string;
    /** Human-readable agent name */
    name: string;
    /** Optional description of the agent */
    description: string | null;
    /** Agent connection status */
    status: AcpAgentStatus;
    /** Agent version string */
    version: string | null;
    /** Capability summary from ACP initialization */
    capabilities: AcpAgentCapabilities | null;
}

/**
 * HAP-1045: Agent registry state relayed from CLI.
 * Contains all registered agents and which one is currently active.
 */
export interface AcpAgentRegistryState {
    /** All registered agents, keyed by agent ID */
    agents: Record<string, AcpRegisteredAgent>;
    /** ID of the currently active agent, or null if none */
    activeAgentId: string | null;
    /** Whether an agent switch is currently in progress */
    switching: boolean;
    /** Error message from last failed switch attempt */
    switchError: string | null;
}

/**
 * HAP-1045: Create a fresh agent registry state.
 */
export function createAcpAgentRegistryState(): AcpAgentRegistryState {
    return {
        agents: {},
        activeAgentId: null,
        switching: false,
        switchError: null,
    };
}

/**
 * HAP-1044: Session browser capability helpers.
 *
 * Derived from AcpAgentCapabilities to determine which session
 * actions (load, resume, fork, list) are available for the current agent.
 */
export interface AcpSessionBrowserCapabilities {
    canListSessions: boolean;
    canLoadSession: boolean;
    canResumeSession: boolean;
    canForkSession: boolean;
}

/**
 * Extract session browser capabilities from agent capabilities.
 */
export function getSessionBrowserCapabilities(
    capabilities: AcpAgentCapabilities | null
): AcpSessionBrowserCapabilities {
    if (!capabilities) {
        return {
            canListSessions: false,
            canLoadSession: false,
            canResumeSession: false,
            canForkSession: false,
        };
    }
    return {
        canListSessions: capabilities.sessionCapabilities?.list != null,
        canLoadSession: capabilities.loadSession === true,
        canResumeSession: capabilities.sessionCapabilities?.resume != null,
        canForkSession: capabilities.sessionCapabilities?.fork != null,
    };
}

/** Status of a session in the browser list */
export type AcpBrowserSessionStatus = 'active' | 'paused' | 'completed';

/**
 * Session item for the browser list, enriched from AcpSessionInfo.
 */
export interface AcpBrowserSession {
    sessionId: string;
    title: string;
    cwd: string;
    updatedAt: string | null;
    isActive: boolean;
}

/**
 * Convert AcpSessionInfo items to browser session items.
 */
export function toBrowserSessions(
    sessions: AcpSessionInfo[],
    activeSessionId: string | null
): AcpBrowserSession[] {
    return sessions.map((s) => ({
        sessionId: s.sessionId,
        title: s.title ?? s.cwd,
        cwd: s.cwd,
        updatedAt: s.updatedAt ?? null,
        isActive: s.sessionId === activeSessionId,
    }));
}

/** Maximum number of permission decisions to keep in history */
const PERMISSION_HISTORY_MAX = 50;

/**
 * HAP-1043: Add a permission request to the session state.
 */
export function addPermissionRequest(
    state: AcpSessionState,
    request: AcpPermissionRequestState
): AcpSessionState {
    return {
        ...state,
        permissionRequests: {
            ...state.permissionRequests,
            [request.requestId]: request,
        },
        lastUpdateAt: Date.now(),
    };
}

/**
 * HAP-1043: Resolve a permission request (user responded or timeout expired).
 * Moves the request to history and removes from pending.
 */
export function resolvePermissionRequest(
    state: AcpSessionState,
    requestId: string,
    outcome: 'selected' | 'expired' | 'cancelled',
    selectedOptionId: string | null
): AcpSessionState {
    const request = state.permissionRequests[requestId];
    if (!request) return state;

    const selectedOption = selectedOptionId
        ? request.options.find((o) => o.optionId === selectedOptionId)
        : null;

    const decision: AcpPermissionDecision = {
        requestId,
        toolTitle: request.toolCall.title,
        toolKind: request.toolCall.kind ?? null,
        selectedOption: selectedOption
            ? {
                optionId: selectedOption.optionId,
                name: selectedOption.name,
                kind: selectedOption.kind,
            }
            : null,
        outcome,
        decidedAt: Date.now(),
    };

    const { [requestId]: _, ...remainingRequests } = state.permissionRequests;
    const updatedHistory = [decision, ...state.permissionHistory].slice(0, PERMISSION_HISTORY_MAX);

    return {
        ...state,
        permissionRequests: remainingRequests,
        permissionHistory: updatedHistory,
        lastUpdateAt: Date.now(),
    };
}

/**
 * HAP-1043: Get the oldest pending permission request (first in queue).
 */
export function getNextPendingPermission(
    state: AcpSessionState
): AcpPermissionRequestState | null {
    const pending = Object.values(state.permissionRequests)
        .filter((r) => r.status === 'pending')
        .sort((a, b) => a.receivedAt - b.receivedAt);
    return pending[0] ?? null;
}

/**
 * Apply an ACP session update to the accumulated state.
 * Returns a new state object (immutable update).
 */
export function applyAcpSessionUpdate(
    state: AcpSessionState,
    update: AcpSessionUpdate
): AcpSessionState {
    const now = Date.now();

    switch (update.sessionUpdate) {
        case 'agent_message_chunk': {
            const text = extractTextFromContentBlock(update.content);
            return {
                ...state,
                agentMessage: state.agentMessage + text,
                lastUpdateAt: now,
            };
        }

        case 'user_message_chunk': {
            const text = extractTextFromContentBlock(update.content);
            return {
                ...state,
                userMessage: state.userMessage + text,
                lastUpdateAt: now,
            };
        }

        case 'agent_thought_chunk': {
            const text = extractTextFromContentBlock(update.content);
            return {
                ...state,
                agentThought: state.agentThought + text,
                lastUpdateAt: now,
            };
        }

        case 'tool_call': {
            return {
                ...state,
                toolCalls: {
                    ...state.toolCalls,
                    [update.toolCallId]: update,
                },
                lastUpdateAt: now,
            };
        }

        case 'tool_call_update': {
            const existing = state.toolCalls[update.toolCallId];
            if (!existing) {
                // Update for unknown tool call — create a minimal entry
                return {
                    ...state,
                    toolCalls: {
                        ...state.toolCalls,
                        [update.toolCallId]: {
                            _meta: update._meta,
                            toolCallId: update.toolCallId,
                            title: update.title ?? 'Unknown Tool',
                            kind: update.kind ?? undefined,
                            status: update.status ?? undefined,
                            content: update.content ?? undefined,
                            locations: update.locations ?? undefined,
                        },
                    },
                    lastUpdateAt: now,
                };
            }

            // Merge update into existing tool call
            const merged = { ...existing };
            if (update.title !== undefined && update.title !== null) merged.title = update.title;
            if (update.kind !== undefined && update.kind !== null) merged.kind = update.kind;
            if (update.status !== undefined && update.status !== null) merged.status = update.status;
            if (update.content !== undefined && update.content !== null) merged.content = update.content;
            if (update.locations !== undefined && update.locations !== null) merged.locations = update.locations;

            return {
                ...state,
                toolCalls: {
                    ...state.toolCalls,
                    [update.toolCallId]: merged,
                },
                lastUpdateAt: now,
            };
        }

        case 'plan': {
            // Plan updates replace the entire plan
            return {
                ...state,
                plan: update.entries,
                lastUpdateAt: now,
            };
        }

        case 'available_commands_update': {
            return {
                ...state,
                availableCommands: update.availableCommands,
                lastUpdateAt: now,
            };
        }

        case 'current_mode_update': {
            return {
                ...state,
                currentModeId: update.currentModeId,
                lastUpdateAt: now,
            };
        }

        case 'config_option_update': {
            return {
                ...state,
                configOptions: update.configOptions,
                lastUpdateAt: now,
            };
        }

        case 'session_info_update': {
            return {
                ...state,
                sessionTitle: update.title ?? state.sessionTitle,
                lastUpdateAt: now,
            };
        }

        case 'usage_update': {
            return {
                ...state,
                usage: {
                    used: update.used,
                    size: update.size,
                    cost: update.cost ?? null,
                },
                lastUpdateAt: now,
            };
        }

        default:
            // Unknown update type — ignore gracefully
            return state;
    }
}
