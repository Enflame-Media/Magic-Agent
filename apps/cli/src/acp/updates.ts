/**
 * ACP Session Update Router
 *
 * Processes incoming session update notifications and dispatches them to
 * typed event listeners. Maintains internal state for accumulated messages,
 * plan entries, available commands, and mode changes.
 *
 * Handles all 11 ACP session update kinds via the discriminated union on
 * the `sessionUpdate` field.
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output
 */

import type {
    AcpSessionNotification,
    AcpSessionUpdate,
    AcpContentBlock,
    AcpToolCall,
    AcpToolCallUpdate,
    AcpPlanEntry,
    AcpAvailableCommand,
    AcpSessionModeId,
    AcpSessionConfigOption,
    AcpCost,
} from '@magic-agent/protocol';
import { logger } from '@/ui/logger';
import { MessageAccumulator } from './accumulator';

// ─── Event Types ────────────────────────────────────────────────────────────

/** Events emitted by the UpdateRouter during a prompt turn */
export interface UpdateEvents {
    /** Agent text/image/resource content chunk received */
    'message:chunk': AcpContentBlock;

    /** User message chunk received (during session load replay) */
    'user:chunk': AcpContentBlock;

    /** Agent thinking/reasoning chunk received */
    'thought:chunk': AcpContentBlock;

    /** New tool call initiated by the agent */
    'tool:call': AcpToolCall;

    /** Status or content update for an existing tool call */
    'tool:update': AcpToolCallUpdate;

    /** Execution plan replaced with new entries */
    'plan:update': AcpPlanEntry[];

    /** Available slash commands list updated */
    'commands:update': AcpAvailableCommand[];

    /** Session mode changed */
    'mode:update': AcpSessionModeId;

    /** Session configuration options updated */
    'config:update': AcpSessionConfigOption[];

    /** Session title or metadata updated */
    'session:info': { title: string | null; updatedAt: string | null };

    /** Context window usage and cost updated */
    'usage:update': { used: number; size: number; cost: AcpCost | null };
}

/** Listener function type for update events */
export type UpdateListener<K extends keyof UpdateEvents> = (
    data: UpdateEvents[K],
) => void;

// ─── UpdateRouter ───────────────────────────────────────────────────────────

/**
 * Routes ACP session update notifications to typed event listeners.
 *
 * Maintains three MessageAccumulator instances for agent messages,
 * user messages, and agent thoughts. Also tracks current plan state,
 * available commands, and active mode.
 *
 * @example
 * ```typescript
 * const router = new UpdateRouter();
 *
 * router.on('message:chunk', (content) => {
 *     console.log('Agent says:', content);
 * });
 *
 * router.on('tool:call', (toolCall) => {
 *     console.log('Tool called:', toolCall.title);
 * });
 *
 * // Process incoming notification
 * router.processNotification(notification);
 * ```
 */
export class UpdateRouter {
    /** Accumulator for agent message chunks */
    readonly agentMessages = new MessageAccumulator();

    /** Accumulator for user message chunks (session load replay) */
    readonly userMessages = new MessageAccumulator();

    /** Accumulator for agent thought/reasoning chunks */
    readonly agentThoughts = new MessageAccumulator();

    /** Current plan entries (replaced on each plan update) */
    private currentPlan: AcpPlanEntry[] = [];

    /** Currently available commands */
    private currentCommands: AcpAvailableCommand[] = [];

    /** Current mode ID */
    private currentModeId: AcpSessionModeId | null = null;

    /** Current config options */
    private currentConfigOptions: AcpSessionConfigOption[] = [];

    /** Current usage state */
    private currentUsage: { used: number; size: number; cost: AcpCost | null } | null = null;

    private listeners: {
        [K in keyof UpdateEvents]?: Set<UpdateListener<K>>;
    } = {};

    /**
     * Process a session update notification, dispatching to appropriate handlers.
     *
     * @param notification - The full session notification including sessionId and update
     */
    processNotification(notification: AcpSessionNotification): void {
        this.processUpdate(notification.update);
    }

    /**
     * Process a session update, dispatching based on the discriminated union tag.
     *
     * @param update - The session update discriminated on `sessionUpdate`
     */
    processUpdate(update: AcpSessionUpdate): void {
        switch (update.sessionUpdate) {
            case 'agent_message_chunk':
                this.agentMessages.addChunk(update.content);
                this.emit('message:chunk', update.content);
                break;

            case 'user_message_chunk':
                this.userMessages.addChunk(update.content);
                this.emit('user:chunk', update.content);
                break;

            case 'agent_thought_chunk':
                this.agentThoughts.addChunk(update.content);
                this.emit('thought:chunk', update.content);
                break;

            case 'tool_call':
                this.emit('tool:call', update);
                break;

            case 'tool_call_update':
                this.emit('tool:update', update);
                break;

            case 'plan':
                this.currentPlan = update.entries;
                this.emit('plan:update', update.entries);
                break;

            case 'available_commands_update':
                this.currentCommands = update.availableCommands;
                this.emit('commands:update', update.availableCommands);
                break;

            case 'current_mode_update':
                this.currentModeId = update.currentModeId;
                this.emit('mode:update', update.currentModeId);
                break;

            case 'config_option_update':
                this.currentConfigOptions = update.configOptions;
                this.emit('config:update', update.configOptions);
                break;

            case 'session_info_update':
                this.emit('session:info', {
                    title: update.title ?? null,
                    updatedAt: update.updatedAt ?? null,
                });
                break;

            case 'usage_update':
                this.currentUsage = {
                    used: update.used,
                    size: update.size,
                    cost: update.cost ?? null,
                };
                this.emit('usage:update', this.currentUsage);
                break;

            default:
                logger.warn('[UpdateRouter] Unknown session update kind:', (update as { sessionUpdate: string }).sessionUpdate);
        }
    }

    /** Register an event listener */
    on<K extends keyof UpdateEvents>(
        event: K,
        listener: UpdateListener<K>,
    ): void {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set() as never;
        }
        (this.listeners[event] as Set<UpdateListener<K>>).add(listener);
    }

    /** Remove an event listener */
    off<K extends keyof UpdateEvents>(
        event: K,
        listener: UpdateListener<K>,
    ): void {
        const set = this.listeners[event] as Set<UpdateListener<K>> | undefined;
        if (set) {
            set.delete(listener);
        }
    }

    /** Get the current plan entries */
    getPlan(): ReadonlyArray<AcpPlanEntry> {
        return this.currentPlan;
    }

    /** Get the current available commands */
    getCommands(): ReadonlyArray<AcpAvailableCommand> {
        return this.currentCommands;
    }

    /** Get the current mode ID, or null if not set */
    getModeId(): AcpSessionModeId | null {
        return this.currentModeId;
    }

    /** Get the current config options */
    getConfigOptions(): ReadonlyArray<AcpSessionConfigOption> {
        return this.currentConfigOptions;
    }

    /** Get the current usage state, or null if not reported */
    getUsage(): { used: number; size: number; cost: AcpCost | null } | null {
        return this.currentUsage;
    }

    /**
     * Reset all accumulators and state for a new prompt turn.
     *
     * Clears message/thought accumulators but preserves plan, commands,
     * mode, config, and usage state since those persist across turns.
     */
    resetForNewTurn(): void {
        this.agentMessages.reset();
        this.userMessages.reset();
        this.agentThoughts.reset();
    }

    /** Remove all event listeners */
    removeAllListeners(): void {
        this.listeners = {};
    }

    private emit<K extends keyof UpdateEvents>(
        event: K,
        data: UpdateEvents[K],
    ): void {
        const set = this.listeners[event] as Set<UpdateListener<K>> | undefined;
        if (set) {
            for (const listener of set) {
                try {
                    listener(data);
                } catch (err) {
                    logger.error(`[UpdateRouter] Error in '${event}' listener:`, err);
                }
            }
        }
    }
}
