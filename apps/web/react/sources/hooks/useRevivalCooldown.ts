/**
 * Hook for managing session revival cooldown state.
 *
 * HAP-867: This hook provides:
 * - Real-time countdown display for circuit breaker cooldown
 * - WebSocket event listener for 'session-revival-paused' events
 * - Auto-clear when cooldown expires or on 'session-revived' event
 * - State accessible from any component that needs cooldown info
 *
 * @module hooks/useRevivalCooldown
 *
 * @example
 * ```typescript
 * function SessionComponent() {
 *     const { cooldown, clearCooldown } = useRevivalCooldown();
 *
 *     if (cooldown) {
 *         return (
 *             <RevivalCooldownBanner
 *                 remainingSeconds={cooldown.remainingSeconds}
 *                 onDismiss={clearCooldown}
 *             />
 *         );
 *     }
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiSocket } from '@/sync/apiSocket';

/**
 * Cooldown state representing an active circuit breaker pause.
 */
export interface RevivalCooldownState {
    /** Reason for the cooldown (currently only 'circuit_breaker') */
    reason: 'circuit_breaker';
    /** Remaining time in seconds (updated every second) */
    remainingSeconds: number;
    /** Timestamp when cooldown will expire */
    resumesAt: number;
    /** Machine ID this cooldown originated from */
    machineId: string;
}

/**
 * Payload structure for the session-revival-paused WebSocket event.
 * This matches the CLI's event emission format from HAP-784.
 */
interface SessionRevivalPausedPayload {
    reason: 'circuit_breaker';
    remainingMs: number;
    resumesAt: number;
    machineId: string;
}

/**
 * Payload structure for the session-revived WebSocket event.
 * Used to clear cooldown state when a session is successfully revived.
 */
interface SessionRevivedPayload {
    originalSessionId: string;
    newSessionId: string;
    machineId: string;
}

/**
 * Return type for the useRevivalCooldown hook.
 */
export interface RevivalCooldownHandler {
    /**
     * Current cooldown state, or null if no cooldown is active.
     */
    cooldown: RevivalCooldownState | null;

    /**
     * Manually clear the cooldown state.
     * Called when user dismisses the banner or cooldown expires.
     */
    clearCooldown: () => void;
}

/**
 * Hook for managing session revival cooldown state.
 *
 * Listens for 'session-revival-paused' WebSocket events and maintains
 * a countdown timer that updates every second. Automatically clears
 * when the cooldown expires or when a 'session-revived' event is received.
 *
 * @returns Cooldown state and control functions
 */
export function useRevivalCooldown(): RevivalCooldownHandler {
    const [cooldown, setCooldown] = useState<RevivalCooldownState | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * Clear any existing countdown timer.
     */
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    /**
     * Clear the cooldown state and timer.
     */
    const clearCooldown = useCallback(() => {
        clearTimer();
        setCooldown(null);
    }, [clearTimer]);

    /**
     * Start a countdown timer that updates remaining seconds every second.
     */
    const startCountdown = useCallback((resumesAt: number) => {
        clearTimer();

        const updateRemaining = () => {
            const remaining = Math.max(0, Math.ceil((resumesAt - Date.now()) / 1000));
            if (remaining <= 0) {
                clearCooldown();
            } else {
                setCooldown(prev => prev ? { ...prev, remainingSeconds: remaining } : null);
            }
        };

        // Update immediately
        updateRemaining();

        // Then update every second
        timerRef.current = setInterval(updateRemaining, 1000);
    }, [clearTimer, clearCooldown]);

    /**
     * Handle session-revival-paused event from WebSocket.
     */
    const handleRevivalPaused = useCallback((data: unknown) => {
        const payload = data as SessionRevivalPausedPayload;

        // Validate payload structure
        if (
            typeof payload !== 'object' ||
            payload === null ||
            payload.reason !== 'circuit_breaker' ||
            typeof payload.remainingMs !== 'number' ||
            typeof payload.resumesAt !== 'number' ||
            typeof payload.machineId !== 'string'
        ) {
            console.warn('[HAP-867] Invalid session-revival-paused payload:', data);
            return;
        }

        const remainingSeconds = Math.ceil(payload.remainingMs / 1000);

        setCooldown({
            reason: payload.reason,
            remainingSeconds,
            resumesAt: payload.resumesAt,
            machineId: payload.machineId,
        });

        // Start countdown timer
        startCountdown(payload.resumesAt);
    }, [startCountdown]);

    /**
     * Handle session-revived event from WebSocket.
     * Clears cooldown when a session is successfully revived.
     */
    const handleSessionRevived = useCallback((data: unknown) => {
        const payload = data as SessionRevivedPayload;

        // Validate it's a valid session-revived event
        if (
            typeof payload !== 'object' ||
            payload === null ||
            typeof payload.machineId !== 'string'
        ) {
            return;
        }

        // Clear cooldown for this machine when session is revived
        setCooldown(prev => {
            if (prev && prev.machineId === payload.machineId) {
                clearTimer();
                return null;
            }
            return prev;
        });
    }, [clearTimer]);

    // Subscribe to WebSocket events
    useEffect(() => {
        const unsubscribePaused = apiSocket.onMessage('session-revival-paused', handleRevivalPaused);
        const unsubscribeRevived = apiSocket.onMessage('session-revived', handleSessionRevived);

        return () => {
            unsubscribePaused();
            unsubscribeRevived();
            clearTimer();
        };
    }, [handleRevivalPaused, handleSessionRevived, clearTimer]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            clearTimer();
        };
    }, [clearTimer]);

    return {
        cooldown,
        clearCooldown,
    };
}
