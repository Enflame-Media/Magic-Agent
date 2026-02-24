/**
 * ACP Session State Types
 *
 * Types for managing ACP (Agent Client Protocol) session update state
 * in the Vue web app. These represent the accumulated real-time state
 * from ACP session updates received via the server relay.
 *
 * Mirrors the React implementation at apps/web/react/sources/sync/acpTypes.ts.
 *
 * @see HAP-1046 - Build Vue ACP foundation
 * @see HAP-1036 - Adapt happy-server relay and happy-app display for ACP session updates
 */

import type {
  AcpSessionUpdate,
  AcpPlanEntry,
  AcpAvailableCommand,
  AcpToolCall,
  AcpSessionConfigOption,
  AcpContentBlock,
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

  /** Timestamp of last ACP update received */
  lastUpdateAt: number;
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
