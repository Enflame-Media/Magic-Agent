/**
 * ACP Prompt Handler
 *
 * Manages the full lifecycle of an ACP prompt turn: sending the prompt request
 * with typed content, processing streaming session update notifications via
 * the UpdateRouter, handling cancellation, and resolving the final response
 * with its stop reason.
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn
 */

import {
    AcpPromptResponseSchema,
    AcpSessionNotificationSchema,
    type AcpContentBlock,
    type AcpPromptResponse,
    type AcpStopReason,
} from '@magic-agent/protocol';
import { logger } from '@/ui/logger';
import type { AcpTransport } from './transport';
import { UpdateRouter, type UpdateEvents, type UpdateListener } from './updates';
import type { MessageAccumulator } from './accumulator';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Result of a completed prompt turn */
export interface PromptResult {
    /** Why the agent stopped processing */
    stopReason: AcpStopReason;

    /** Token usage information, if provided by the agent */
    usage: AcpPromptResponse['usage'];
}

/** Events emitted by the PromptHandler */
export interface PromptHandlerEvents extends UpdateEvents {
    /** Prompt turn completed with a stop reason */
    'complete': PromptResult;

    /** Error during prompt processing */
    'error': Error;
}

/** Listener function type for prompt handler events */
export type PromptHandlerListener<K extends keyof PromptHandlerEvents> = (
    data: PromptHandlerEvents[K],
) => void;

// ─── PromptHandler ──────────────────────────────────────────────────────────

/**
 * Manages the lifecycle of ACP prompt turns.
 *
 * Coordinates between the transport layer (for sending prompt requests and
 * cancel notifications) and the UpdateRouter (for processing streaming
 * session update notifications).
 *
 * The handler is designed to be reusable across multiple prompt turns within
 * a session. Call `sendPrompt()` for each turn — it resets the update router's
 * accumulators automatically.
 *
 * @example
 * ```typescript
 * const handler = new PromptHandler(transport);
 *
 * // Register event listeners
 * handler.on('message:chunk', (content) => {
 *     if (content.type === 'text') process.stdout.write(content.text);
 * });
 *
 * handler.on('tool:call', (toolCall) => {
 *     console.log(`Tool: ${toolCall.title}`);
 * });
 *
 * handler.on('complete', (result) => {
 *     console.log(`Done: ${result.stopReason}`);
 * });
 *
 * // Send a prompt
 * const result = await handler.sendPrompt('session-id', [
 *     { type: 'text', text: 'Refactor this function' },
 * ]);
 *
 * // Cancel if needed
 * await handler.cancelPrompt('session-id');
 * ```
 */
export class PromptHandler {
    private readonly transport: AcpTransport;
    private readonly updateRouter: UpdateRouter;
    private promptInProgress = false;
    private activeSessionId: string | null = null;
    private listeners: {
        [K in keyof PromptHandlerEvents]?: Set<PromptHandlerListener<K>>;
    } = {};

    constructor(transport: AcpTransport) {
        this.transport = transport;
        this.updateRouter = new UpdateRouter();
    }

    /**
     * Handle an incoming session update notification.
     *
     * This method should be called from the Client factory's `sessionUpdate`
     * handler. It validates and routes the notification through the UpdateRouter.
     *
     * @param params - The raw notification params from the Client interface
     */
    handleSessionUpdate(params: unknown): void {
        const parseResult = AcpSessionNotificationSchema.safeParse(params);

        if (!parseResult.success) {
            logger.warn('[PromptHandler] Failed to parse session notification:', parseResult.error.message);
            return;
        }

        const notification = parseResult.data;

        // Only process updates for the active session
        if (this.activeSessionId && notification.sessionId !== this.activeSessionId) {
            logger.debug(
                `[PromptHandler] Ignoring update for session ${notification.sessionId} (active: ${this.activeSessionId})`,
            );
            return;
        }

        this.updateRouter.processNotification(notification);
    }

    /**
     * Send a prompt to the agent and wait for the response.
     *
     * Resets accumulators from any previous turn, sends the prompt via the
     * transport layer with no timeout (prompts can run for minutes), and
     * returns the parsed response when the agent completes the turn.
     *
     * Session update notifications are processed concurrently via
     * `handleSessionUpdate()` and dispatched to event listeners.
     *
     * @param sessionId - The session to send the prompt to
     * @param content - Content blocks to send (text, image, resource, resource_link)
     * @returns The prompt result including stop reason and usage
     * @throws Error if a prompt is already in progress or the transport fails
     */
    async sendPrompt(sessionId: string, content: AcpContentBlock[]): Promise<PromptResult> {
        if (this.promptInProgress) {
            throw new Error('[PromptHandler] A prompt is already in progress');
        }

        this.promptInProgress = true;
        this.activeSessionId = sessionId;
        this.updateRouter.resetForNewTurn();

        logger.info(`[PromptHandler] Sending prompt to session: ${sessionId}`);

        try {
            const rawResponse = await this.transport.request(
                (conn) => conn.prompt({ sessionId, prompt: content }),
                0, // No timeout — prompts can run for a long time
            );

            const parseResult = AcpPromptResponseSchema.safeParse(rawResponse);

            let result: PromptResult;

            if (parseResult.success) {
                result = {
                    stopReason: parseResult.data.stopReason,
                    usage: parseResult.data.usage,
                };
            } else {
                // Fall back to raw response shape
                const raw = rawResponse as Record<string, unknown>;
                result = {
                    stopReason: raw.stopReason as AcpStopReason,
                    usage: (raw.usage as AcpPromptResponse['usage']) ?? null,
                };
            }

            logger.info(`[PromptHandler] Prompt completed: stopReason=${result.stopReason}`);
            this.emit('complete', result);

            return result;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('[PromptHandler] Prompt failed:', err.message);
            this.emit('error', err);
            throw err;
        } finally {
            this.promptInProgress = false;
        }
    }

    /**
     * Cancel an ongoing prompt turn for a session.
     *
     * Sends a `session/cancel` notification to the agent. The agent should
     * stop processing and respond to the pending `session/prompt` request
     * with `stopReason: 'cancelled'`.
     *
     * This is a fire-and-forget notification — it does not wait for the
     * cancellation to take effect. The pending `sendPrompt()` call will
     * resolve when the agent sends its prompt response.
     *
     * @param sessionId - The session to cancel
     */
    async cancelPrompt(sessionId: string): Promise<void> {
        logger.info(`[PromptHandler] Cancelling prompt for session: ${sessionId}`);

        const connection = this.transport.getConnection();
        await connection.cancel({ sessionId });

        logger.info(`[PromptHandler] Cancel notification sent for session: ${sessionId}`);
    }

    /** Whether a prompt is currently being processed */
    get isPromptInProgress(): boolean {
        return this.promptInProgress;
    }

    /** The session ID of the current or last prompt turn */
    get currentSessionId(): string | null {
        return this.activeSessionId;
    }

    // ─── Update Router Access ───────────────────────────────────────────

    /** Get the underlying UpdateRouter for direct state access */
    get updates(): UpdateRouter {
        return this.updateRouter;
    }

    /** Get the agent message accumulator */
    get agentMessages(): MessageAccumulator {
        return this.updateRouter.agentMessages;
    }

    /** Get the agent thought accumulator */
    get agentThoughts(): MessageAccumulator {
        return this.updateRouter.agentThoughts;
    }

    /** Get the user message accumulator */
    get userMessages(): MessageAccumulator {
        return this.updateRouter.userMessages;
    }

    // ─── Event Handling ─────────────────────────────────────────────────

    /**
     * Register an event listener.
     *
     * Listeners for update events ('message:chunk', 'tool:call', etc.) are
     * forwarded to the UpdateRouter. Listeners for 'complete' and 'error'
     * are handled directly by the PromptHandler.
     */
    on<K extends keyof PromptHandlerEvents>(
        event: K,
        listener: PromptHandlerListener<K>,
    ): void {
        if (this.isUpdateEvent(event)) {
            this.updateRouter.on(
                event as keyof UpdateEvents,
                listener as UpdateListener<keyof UpdateEvents>,
            );
            return;
        }

        if (!this.listeners[event]) {
            this.listeners[event] = new Set() as never;
        }
        (this.listeners[event] as Set<PromptHandlerListener<K>>).add(listener);
    }

    /**
     * Remove an event listener.
     */
    off<K extends keyof PromptHandlerEvents>(
        event: K,
        listener: PromptHandlerListener<K>,
    ): void {
        if (this.isUpdateEvent(event)) {
            this.updateRouter.off(
                event as keyof UpdateEvents,
                listener as UpdateListener<keyof UpdateEvents>,
            );
            return;
        }

        const set = this.listeners[event] as Set<PromptHandlerListener<K>> | undefined;
        if (set) {
            set.delete(listener);
        }
    }

    /** Remove all event listeners from both the handler and update router */
    removeAllListeners(): void {
        this.listeners = {};
        this.updateRouter.removeAllListeners();
    }

    // ─── Internal ───────────────────────────────────────────────────────

    private isUpdateEvent(event: string): event is keyof UpdateEvents {
        return event !== 'complete' && event !== 'error';
    }

    private emit<K extends keyof PromptHandlerEvents>(
        event: K,
        data: PromptHandlerEvents[K],
    ): void {
        const set = this.listeners[event] as Set<PromptHandlerListener<K>> | undefined;
        if (set) {
            for (const listener of set) {
                try {
                    listener(data);
                } catch (err) {
                    logger.error(`[PromptHandler] Error in '${event}' listener:`, err);
                }
            }
        }
    }
}
