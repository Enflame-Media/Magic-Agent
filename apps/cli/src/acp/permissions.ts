/**
 * ACP Permission Handler and Policy Store
 *
 * Handles the `session/request_permission` client method from ACP agents.
 * When an agent needs permission to execute a sensitive tool call (file write,
 * terminal command, etc.), it sends a permission request with options. This
 * module:
 *
 * 1. Checks the PermissionPolicyStore for "always" policies that can
 *    auto-respond without user interaction
 * 2. If no policy matches, emits an event for the UI/relay layer to present
 *    to the user
 * 3. Stores new policies when the user selects "allow_always" or "reject_always"
 * 4. Returns the selected option to the agent
 *
 * The PermissionPolicyStore is session-scoped by default — policies reset
 * when the session ends.
 *
 * @see https://agentclientprotocol.com/protocol/tool-calls#requesting-permission
 */

import type {
    AcpRequestPermissionRequest,
    AcpRequestPermissionResponse,
    AcpPermissionOption,
    AcpPermissionOptionKind,
    AcpToolKind,
} from '@magic-agent/protocol';
import { logger } from '@/ui/logger';
import type { ToolCallRegistry } from './toolcalls';

// ─── Permission Policy Store ─────────────────────────────────────────────────

/** A stored permission policy for a tool kind */
export interface PermissionPolicy {
    /** The tool kind this policy applies to */
    toolKind: string;

    /** Whether to allow or reject */
    action: 'allow' | 'reject';

    /** When the policy was created */
    createdAt: number;
}

/**
 * Session-scoped store for "always" permission policies.
 *
 * When a user selects "allow_always" or "reject_always" for a tool kind,
 * the policy is stored here. Future permission requests for the same tool
 * kind are auto-responded without user interaction.
 *
 * Policies are keyed by tool kind (e.g., "edit", "execute", "read").
 *
 * @example
 * ```typescript
 * const store = new PermissionPolicyStore();
 *
 * // User selected "Allow Always" for edit tools
 * store.setPolicy('edit', 'allow');
 *
 * // Future edit tool permission requests auto-resolve
 * const policy = store.getPolicy('edit');
 * // policy === 'allow'
 *
 * // Find matching option from request
 * const optionId = store.autoRespond(request);
 * // optionId matches the allow_once option (auto-respond with single-use approval)
 * ```
 */
export class PermissionPolicyStore {
    private readonly policies = new Map<string, PermissionPolicy>();

    /**
     * Set a permission policy for a tool kind.
     *
     * @param toolKind - The tool kind (e.g., "edit", "execute", "read")
     * @param action - Whether to "allow" or "reject" future requests
     */
    setPolicy(toolKind: string, action: 'allow' | 'reject'): void {
        this.policies.set(toolKind, {
            toolKind,
            action,
            createdAt: Date.now(),
        });
        logger.info(`[PermissionPolicyStore] Policy set: ${toolKind} → ${action}`);
    }

    /**
     * Get the policy for a tool kind, if one exists.
     *
     * @param toolKind - The tool kind to look up
     * @returns The policy action ('allow' or 'reject'), or undefined if no policy
     */
    getPolicy(toolKind: string): 'allow' | 'reject' | undefined {
        return this.policies.get(toolKind)?.action;
    }

    /**
     * Check if a policy exists for a tool kind.
     */
    hasPolicy(toolKind: string): boolean {
        return this.policies.has(toolKind);
    }

    /**
     * Try to auto-respond to a permission request based on stored policies.
     *
     * If a matching policy exists for the tool call's kind, finds the
     * appropriate option in the request's options list and returns its ID.
     *
     * For "allow" policies, selects the first `allow_once` option.
     * For "reject" policies, selects the first `reject_once` option.
     *
     * @param request - The permission request from the agent
     * @returns The optionId to auto-select, or null if no policy matches
     */
    autoRespond(request: AcpRequestPermissionRequest): string | null {
        const toolKind = request.toolCall.kind;
        if (!toolKind) {
            return null;
        }

        const policy = this.getPolicy(toolKind);
        if (!policy) {
            return null;
        }

        // Find matching option based on policy action
        const targetKind: AcpPermissionOptionKind = policy === 'allow' ? 'allow_once' : 'reject_once';
        const matchingOption = request.options.find((opt) => opt.kind === targetKind);

        if (matchingOption) {
            logger.debug(
                `[PermissionPolicyStore] Auto-responding to ${toolKind}: ` +
                `${matchingOption.name} (${matchingOption.optionId})`,
            );
            return matchingOption.optionId;
        }

        return null;
    }

    /** Get all stored policies */
    getAllPolicies(): ReadonlyArray<PermissionPolicy> {
        return Array.from(this.policies.values());
    }

    /** Clear all stored policies */
    clearPolicies(): void {
        this.policies.clear();
        logger.info('[PermissionPolicyStore] All policies cleared');
    }

    /** Get the number of stored policies */
    get size(): number {
        return this.policies.size;
    }
}

// ─── Permission Handler Events ───────────────────────────────────────────────

/** A pending permission request awaiting user decision */
export interface PendingPermission {
    /** The original permission request from the agent */
    request: AcpRequestPermissionRequest;

    /** The tool call ID this permission is for */
    toolCallId: string;

    /** Human-readable description from the tool call */
    description: string;

    /** Available options for the user */
    options: AcpPermissionOption[];

    /** The tool kind, for UI categorization */
    toolKind: AcpToolKind | null;

    /** Resolve function to respond to the agent */
    resolve: (optionId: string) => void;

    /** Cancel function for prompt cancellation */
    cancel: () => void;
}

/** Events emitted by the PermissionHandler */
export interface PermissionHandlerEvents {
    /** A permission request needs user decision (not auto-responded by policy) */
    'permission:request': PendingPermission;

    /** A permission was auto-responded by a stored policy */
    'permission:auto_responded': {
        toolCallId: string;
        toolKind: AcpToolKind | null;
        optionId: string;
        policyAction: 'allow' | 'reject';
    };

    /** A permission was responded to (by user or policy) */
    'permission:responded': {
        toolCallId: string;
        optionId: string;
        optionKind: AcpPermissionOptionKind;
    };
}

/** Listener function type for permission handler events */
export type PermissionHandlerListener<K extends keyof PermissionHandlerEvents> = (
    data: PermissionHandlerEvents[K],
) => void;

// ─── PermissionHandler ───────────────────────────────────────────────────────

/**
 * Handles ACP permission requests from agents.
 *
 * Integrates with:
 * - PermissionPolicyStore: For auto-responding based on stored policies
 * - ToolCallRegistry: For tracking permission state on tool calls
 * - UI/relay layer: Emits events when user decision is needed
 *
 * @example
 * ```typescript
 * const policyStore = new PermissionPolicyStore();
 * const registry = new ToolCallRegistry();
 * const handler = new PermissionHandler(policyStore, registry);
 *
 * // Listen for permission requests that need user interaction
 * handler.on('permission:request', (pending) => {
 *     // Present to user via mobile app relay
 *     showPermissionDialog(pending);
 * });
 *
 * // Use as the requestPermission handler in the ACP Client factory
 * transport.spawn((agent) => ({
 *     requestPermission: (params) => handler.handleRequest(params),
 *     sessionUpdate: (params) => promptHandler.handleSessionUpdate(params),
 * }));
 * ```
 */
export class PermissionHandler {
    private readonly policyStore: PermissionPolicyStore;
    private readonly registry: ToolCallRegistry | null;
    private listeners: {
        [K in keyof PermissionHandlerEvents]?: Set<PermissionHandlerListener<K>>;
    } = {};

    constructor(policyStore: PermissionPolicyStore, registry?: ToolCallRegistry) {
        this.policyStore = policyStore;
        this.registry = registry ?? null;
    }

    /**
     * Handle an incoming `session/request_permission` request from the agent.
     *
     * This is designed to be used directly as the `requestPermission` handler
     * in the ACP Client factory.
     *
     * Flow:
     * 1. Update the ToolCallRegistry to reflect permission-pending state
     * 2. Check PermissionPolicyStore for auto-respond policies
     * 3. If auto-responded: return immediately with the policy's option
     * 4. If not: emit 'permission:request' event and wait for user decision
     * 5. On user decision: apply "always" policies, return the response
     *
     * @param params - The permission request from the agent
     * @returns The permission response to send back to the agent
     */
    async handleRequest(params: AcpRequestPermissionRequest): Promise<AcpRequestPermissionResponse> {
        const toolCallId = params.toolCall.toolCallId;
        const toolKind = (params.toolCall.kind as AcpToolKind | undefined) ?? null;

        logger.debug(
            `[PermissionHandler] Permission request: toolCallId=${toolCallId}, ` +
            `kind=${toolKind ?? 'unknown'}, options=${params.options.length}`,
        );

        // Update registry with permission-pending state
        if (this.registry) {
            this.registry.setPermissionPending(params);
        }

        // Check policy store for auto-respond
        const autoOptionId = this.policyStore.autoRespond(params);
        if (autoOptionId !== null) {
            const policyAction = this.policyStore.getPolicy(toolKind!)!;

            this.emit('permission:auto_responded', {
                toolCallId,
                toolKind,
                optionId: autoOptionId,
                policyAction,
            });

            // Find the option to emit the responded event
            const option = params.options.find((o) => o.optionId === autoOptionId);
            if (option) {
                this.emit('permission:responded', {
                    toolCallId,
                    optionId: autoOptionId,
                    optionKind: option.kind,
                });
            }

            // Clear permission state from registry
            if (this.registry) {
                this.registry.clearPermission(toolCallId);
            }

            return {
                outcome: {
                    outcome: 'selected',
                    optionId: autoOptionId,
                },
            };
        }

        // No policy match — need user decision
        return new Promise<AcpRequestPermissionResponse>((resolve) => {
            const pending: PendingPermission = {
                request: params,
                toolCallId,
                description: params.toolCall.title ?? 'Tool call requires permission',
                options: params.options,
                toolKind,
                resolve: (optionId: string) => {
                    this.handleUserDecision(params, optionId);

                    // Clear permission state from registry
                    if (this.registry) {
                        this.registry.clearPermission(toolCallId);
                    }

                    resolve({
                        outcome: {
                            outcome: 'selected',
                            optionId,
                        },
                    });
                },
                cancel: () => {
                    // Clear permission state from registry
                    if (this.registry) {
                        this.registry.clearPermission(toolCallId);
                    }

                    resolve({
                        outcome: { outcome: 'cancelled' },
                    });
                },
            };

            this.emit('permission:request', pending);
        });
    }

    /** Get the underlying policy store */
    get policies(): PermissionPolicyStore {
        return this.policyStore;
    }

    /** Register an event listener */
    on<K extends keyof PermissionHandlerEvents>(
        event: K,
        listener: PermissionHandlerListener<K>,
    ): void {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set() as never;
        }
        (this.listeners[event] as Set<PermissionHandlerListener<K>>).add(listener);
    }

    /** Remove an event listener */
    off<K extends keyof PermissionHandlerEvents>(
        event: K,
        listener: PermissionHandlerListener<K>,
    ): void {
        const set = this.listeners[event] as Set<PermissionHandlerListener<K>> | undefined;
        if (set) {
            set.delete(listener);
        }
    }

    /** Remove all event listeners */
    removeAllListeners(): void {
        this.listeners = {};
    }

    // ─── Internal ────────────────────────────────────────────────────────

    /**
     * Process a user's permission decision.
     *
     * If the selected option is "allow_always" or "reject_always",
     * stores the policy for future auto-responses.
     */
    private handleUserDecision(
        request: AcpRequestPermissionRequest,
        selectedOptionId: string,
    ): void {
        const selectedOption = request.options.find((o) => o.optionId === selectedOptionId);
        if (!selectedOption) {
            logger.warn(
                `[PermissionHandler] Unknown option ID: ${selectedOptionId} ` +
                `for tool call ${request.toolCall.toolCallId}`,
            );
            return;
        }

        logger.debug(
            `[PermissionHandler] User selected: ${selectedOption.name} ` +
            `(${selectedOption.kind}) for ${request.toolCall.toolCallId}`,
        );

        // Store "always" policies
        const toolKind = request.toolCall.kind;
        if (toolKind) {
            if (selectedOption.kind === 'allow_always') {
                this.policyStore.setPolicy(toolKind, 'allow');
            } else if (selectedOption.kind === 'reject_always') {
                this.policyStore.setPolicy(toolKind, 'reject');
            }
        }

        this.emit('permission:responded', {
            toolCallId: request.toolCall.toolCallId,
            optionId: selectedOptionId,
            optionKind: selectedOption.kind,
        });
    }

    private emit<K extends keyof PermissionHandlerEvents>(
        event: K,
        data: PermissionHandlerEvents[K],
    ): void {
        const set = this.listeners[event] as Set<PermissionHandlerListener<K>> | undefined;
        if (set) {
            for (const listener of set) {
                try {
                    listener(data);
                } catch (err) {
                    logger.error(`[PermissionHandler] Error in '${event}' listener:`, err);
                }
            }
        }
    }
}
