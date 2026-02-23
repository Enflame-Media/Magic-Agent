/**
 * ACP Tool Call Registry
 *
 * Tracks all tool calls and their lifecycle state during a session.
 * Tool calls arrive as `tool_call` session updates (initial registration)
 * and `tool_call_update` session updates (status changes, content additions).
 *
 * The registry maintains a map of active tool calls keyed by toolCallId,
 * emits typed events for state changes, and provides query methods for
 * downstream consumers (server relay, mobile app UI).
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls
 */

import type {
    AcpToolCall,
    AcpToolCallUpdate,
    AcpToolCallStatus,
    AcpToolKind,
    AcpToolCallContent,
    AcpToolCallLocation,
    AcpRequestPermissionRequest,
} from '@magic-agent/protocol';
import { logger } from '@/ui/logger';

// ─── Tool Call State ─────────────────────────────────────────────────────────

/** Extended status that includes permission-pending state */
export type ToolCallTrackedStatus = AcpToolCallStatus | 'pending_permission';

/** Internal state representation of a tracked tool call */
export interface ToolCallState {
    /** Unique tool call identifier */
    toolCallId: string;

    /** Human-readable title (e.g., "Read file src/index.ts") */
    title: string;

    /** Tool category for UI rendering (e.g., "read", "edit", "execute") */
    kind: AcpToolKind | null;

    /** Current lifecycle status */
    status: ToolCallTrackedStatus;

    /** Rich content produced by the tool call */
    content: AcpToolCallContent[];

    /** File locations affected by this tool call */
    locations: AcpToolCallLocation[];

    /** Raw input passed to the tool */
    rawInput: unknown | undefined;

    /** Raw output from the tool */
    rawOutput: unknown | undefined;

    /** Pending permission request, if any */
    permissionRequest: AcpRequestPermissionRequest | null;

    /** Timestamp when the tool call was first registered */
    registeredAt: number;

    /** Timestamp of the last status update */
    updatedAt: number;
}

// ─── Registry Events ─────────────────────────────────────────────────────────

/** Events emitted by the ToolCallRegistry */
export interface ToolCallRegistryEvents {
    /** A new tool call has been registered */
    'registered': ToolCallState;

    /** An existing tool call's state has changed */
    'updated': ToolCallState;

    /** A tool call has completed (status = completed) */
    'completed': ToolCallState;

    /** A tool call has failed (status = failed) */
    'failed': ToolCallState;

    /** A tool call is awaiting permission */
    'permission_pending': ToolCallState;
}

/** Listener function type for registry events */
export type ToolCallRegistryListener<K extends keyof ToolCallRegistryEvents> = (
    data: ToolCallRegistryEvents[K],
) => void;

// ─── ToolCallRegistry ────────────────────────────────────────────────────────

/**
 * Tracks all tool calls within a session and emits typed events for
 * state changes.
 *
 * Designed to be connected to the UpdateRouter's `tool:call` and
 * `tool:update` events, and to the permission handler for tracking
 * permission-pending state.
 *
 * @example
 * ```typescript
 * const registry = new ToolCallRegistry();
 *
 * // Connect to UpdateRouter events
 * router.on('tool:call', (tc) => registry.register(tc));
 * router.on('tool:update', (update) => registry.update(update));
 *
 * // Listen for tool call events
 * registry.on('registered', (state) => {
 *     console.log(`Tool call started: ${state.title}`);
 * });
 *
 * registry.on('completed', (state) => {
 *     console.log(`Tool call done: ${state.title}`);
 * });
 *
 * // Query active tool calls
 * const active = registry.getActiveCalls();
 * ```
 */
export class ToolCallRegistry {
    private readonly calls = new Map<string, ToolCallState>();
    private listeners: {
        [K in keyof ToolCallRegistryEvents]?: Set<ToolCallRegistryListener<K>>;
    } = {};

    /**
     * Register a new tool call from a `tool_call` session update.
     *
     * Creates a new ToolCallState entry in the registry and emits
     * the 'registered' event.
     *
     * @param toolCall - The initial tool call notification
     */
    register(toolCall: AcpToolCall): void {
        const now = Date.now();
        const state: ToolCallState = {
            toolCallId: toolCall.toolCallId,
            title: toolCall.title,
            kind: toolCall.kind ?? null,
            status: toolCall.status ?? 'pending',
            content: toolCall.content ?? [],
            locations: toolCall.locations ?? [],
            rawInput: toolCall.rawInput,
            rawOutput: toolCall.rawOutput,
            permissionRequest: null,
            registeredAt: now,
            updatedAt: now,
        };

        this.calls.set(toolCall.toolCallId, state);
        logger.debug(`[ToolCallRegistry] Registered tool call: ${toolCall.toolCallId} (${toolCall.title})`);
        this.emit('registered', state);
    }

    /**
     * Apply an update to an existing tool call from a `tool_call_update`
     * session update.
     *
     * Only fields present in the update are applied (partial update).
     * Emits appropriate events based on the new status.
     *
     * If the tool call is not found in the registry, it is auto-registered
     * with default values to handle out-of-order delivery.
     *
     * @param update - The tool call update notification
     */
    update(update: AcpToolCallUpdate): void {
        let state = this.calls.get(update.toolCallId);

        if (!state) {
            // Auto-register unknown tool calls to handle out-of-order delivery
            logger.debug(`[ToolCallRegistry] Auto-registering unknown tool call: ${update.toolCallId}`);
            const now = Date.now();
            state = {
                toolCallId: update.toolCallId,
                title: update.title ?? 'Unknown tool call',
                kind: update.kind ?? null,
                status: update.status ?? 'pending',
                content: update.content ?? [],
                locations: update.locations ?? [],
                rawInput: update.rawInput,
                rawOutput: update.rawOutput,
                permissionRequest: null,
                registeredAt: now,
                updatedAt: now,
            };
            this.calls.set(update.toolCallId, state);
            this.emit('registered', state);
            return;
        }

        // Apply partial update — only override fields that are explicitly provided
        if (update.title !== undefined && update.title !== null) {
            state.title = update.title;
        }
        if (update.kind !== undefined && update.kind !== null) {
            state.kind = update.kind;
        }
        if (update.status !== undefined && update.status !== null) {
            state.status = update.status;
        }
        if (update.content !== undefined && update.content !== null) {
            state.content = update.content;
        }
        if (update.locations !== undefined && update.locations !== null) {
            state.locations = update.locations;
        }
        if (update.rawInput !== undefined) {
            state.rawInput = update.rawInput;
        }
        if (update.rawOutput !== undefined) {
            state.rawOutput = update.rawOutput;
        }

        state.updatedAt = Date.now();

        this.emit('updated', state);

        if (state.status === 'completed') {
            this.emit('completed', state);
        } else if (state.status === 'failed') {
            this.emit('failed', state);
        }
    }

    /**
     * Mark a tool call as awaiting permission.
     *
     * Called by the permission handler when a `session/request_permission`
     * request arrives. Updates the tool call's status to 'pending_permission'
     * and stores the permission request for query access.
     *
     * @param request - The permission request from the agent
     */
    setPermissionPending(request: AcpRequestPermissionRequest): void {
        const state = this.calls.get(request.toolCall.toolCallId);
        if (!state) {
            logger.warn(`[ToolCallRegistry] Permission request for unknown tool call: ${request.toolCall.toolCallId}`);
            return;
        }

        state.status = 'pending_permission';
        state.permissionRequest = request;
        state.updatedAt = Date.now();

        this.emit('permission_pending', state);
    }

    /**
     * Clear the permission request from a tool call after the user responds.
     *
     * The tool call's status will be updated by the next `tool_call_update`
     * from the agent (typically back to 'in_progress' or 'failed').
     *
     * @param toolCallId - The tool call to clear permission state from
     */
    clearPermission(toolCallId: string): void {
        const state = this.calls.get(toolCallId);
        if (state) {
            state.permissionRequest = null;
            state.updatedAt = Date.now();
        }
    }

    /** Get a specific tool call by ID */
    getCall(toolCallId: string): ToolCallState | undefined {
        return this.calls.get(toolCallId);
    }

    /** Get all tracked tool calls */
    getAllCalls(): ReadonlyArray<ToolCallState> {
        return Array.from(this.calls.values());
    }

    /** Get tool calls that are currently active (not completed or failed) */
    getActiveCalls(): ReadonlyArray<ToolCallState> {
        return Array.from(this.calls.values()).filter(
            (c) => c.status !== 'completed' && c.status !== 'failed',
        );
    }

    /** Get tool calls that are awaiting permission */
    getPendingPermissions(): ReadonlyArray<ToolCallState> {
        return Array.from(this.calls.values()).filter(
            (c) => c.status === 'pending_permission',
        );
    }

    /** Get the total number of tracked tool calls */
    get size(): number {
        return this.calls.size;
    }

    /**
     * Reset the registry for a new prompt turn.
     *
     * Clears all tracked tool calls. Call this when starting a new
     * prompt turn to avoid stale state from previous turns.
     */
    reset(): void {
        this.calls.clear();
    }

    /** Register an event listener */
    on<K extends keyof ToolCallRegistryEvents>(
        event: K,
        listener: ToolCallRegistryListener<K>,
    ): void {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set() as never;
        }
        (this.listeners[event] as Set<ToolCallRegistryListener<K>>).add(listener);
    }

    /** Remove an event listener */
    off<K extends keyof ToolCallRegistryEvents>(
        event: K,
        listener: ToolCallRegistryListener<K>,
    ): void {
        const set = this.listeners[event] as Set<ToolCallRegistryListener<K>> | undefined;
        if (set) {
            set.delete(listener);
        }
    }

    /** Remove all event listeners */
    removeAllListeners(): void {
        this.listeners = {};
    }

    private emit<K extends keyof ToolCallRegistryEvents>(
        event: K,
        data: ToolCallRegistryEvents[K],
    ): void {
        const set = this.listeners[event] as Set<ToolCallRegistryListener<K>> | undefined;
        if (set) {
            for (const listener of set) {
                try {
                    listener(data);
                } catch (err) {
                    logger.error(`[ToolCallRegistry] Error in '${event}' listener:`, err);
                }
            }
        }
    }
}
