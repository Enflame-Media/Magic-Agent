/**
 * Unit tests for ApiSessionClient WebSocket connection notification logic
 *
 * These tests verify the user notification behavior added in HAP-124:
 * 1. Disconnection warnings are shown only once per disconnect cycle
 * 2. Reconnection messages are shown only after a disconnect warning was shown
 * 3. Initial connections don't trigger "reconnected" messages
 * 4. Rapid connect/disconnect cycles are handled correctly
 *
 * Since ApiSessionClient requires a real Socket.IO connection, we test the
 * notification logic via a test harness that replicates the critical behavior
 * from the connect/disconnect handlers (lines 125-156 in apiSession.ts).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Mock logger interface that matches the relevant logger methods
 */
interface MockLogger {
    debug: ReturnType<typeof vi.fn<(message: string, ...args: unknown[]) => void>>;
    info: ReturnType<typeof vi.fn<(message: string, ...args: unknown[]) => void>>;
    warn: ReturnType<typeof vi.fn<(message: string, ...args: unknown[]) => void>>;
}

/**
 * Test harness that replicates the connection notification logic from ApiSessionClient.
 * This allows us to test the notification behavior without Socket.IO dependencies.
 *
 * The logic being tested (from ApiSessionClient constructor):
 *
 * On 'connect':
 *   if (hasConnectedBefore && hasShownDisconnectWarning) {
 *       logger.info('[Happy] Reconnected to server');
 *       hasShownDisconnectWarning = false;
 *   }
 *   hasConnectedBefore = true;
 *
 * On 'disconnect':
 *   if (!hasShownDisconnectWarning && hasConnectedBefore) {
 *       logger.warn('[Happy] Disconnected from server, reconnecting...');
 *       hasShownDisconnectWarning = true;
 *   }
 */
class ConnectionNotificationManager {
    private hasConnectedBefore = false;
    private hasShownDisconnectWarning = false;
    private logger: MockLogger;

    constructor(logger: MockLogger) {
        this.logger = logger;
    }

    /**
     * Simulates the 'connect' event handler from ApiSessionClient
     * @see apiSession.ts:125-142
     */
    handleConnect(): void {
        this.logger.debug('Socket connected successfully');

        // On reconnection, check if we need to notify about successful reconnection
        if (this.hasConnectedBefore) {
            this.logger.debug('[API] Reconnected - requesting state reconciliation');
            // Notify user of successful reconnection (only if we had warned about disconnect)
            if (this.hasShownDisconnectWarning) {
                this.logger.info('[Happy] Reconnected to server');
                this.hasShownDisconnectWarning = false;
            }
        }
        this.hasConnectedBefore = true;
    }

    /**
     * Simulates the 'disconnect' event handler from ApiSessionClient
     * @see apiSession.ts:152-158
     */
    handleDisconnect(reason: string = 'transport close'): void {
        this.logger.debug('[API] Socket disconnected:', reason);
        // Notify user of disconnection (only once, avoid spam during reconnection attempts)
        if (!this.hasShownDisconnectWarning && this.hasConnectedBefore) {
            this.logger.warn('[Happy] Disconnected from server, reconnecting...');
            this.hasShownDisconnectWarning = true;
        }
    }

    /**
     * Expose internal state for testing flag transitions
     * (In production code, these are private - this is test-only access)
     */
    getState(): { hasConnectedBefore: boolean; hasShownDisconnectWarning: boolean } {
        return {
            hasConnectedBefore: this.hasConnectedBefore,
            hasShownDisconnectWarning: this.hasShownDisconnectWarning
        };
    }
}

describe('ApiSessionClient connection notifications', () => {
    let logger: MockLogger;
    let manager: ConnectionNotificationManager;

    beforeEach(() => {
        logger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn()
        };
        manager = new ConnectionNotificationManager(logger);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Disconnection warning behavior', () => {
        it('should show disconnection warning only once per disconnect cycle', () => {
            // First connect (initial connection)
            manager.handleConnect();

            // Multiple disconnects - only first should warn
            manager.handleDisconnect('transport close');
            manager.handleDisconnect('ping timeout');
            manager.handleDisconnect('transport error');

            // Verify warn() called exactly once
            const warnCalls = logger.warn.mock.calls.filter(
                call => call[0] === '[Happy] Disconnected from server, reconnecting...'
            );
            expect(warnCalls).toHaveLength(1);
        });

        it('should NOT show disconnection warning before first successful connection', () => {
            // Disconnect event fires before any connect (edge case during initial connection failure)
            manager.handleDisconnect('transport error');
            manager.handleDisconnect('connect timeout');

            // No warning should be shown since we never connected successfully
            const warnCalls = logger.warn.mock.calls.filter(
                call => call[0] === '[Happy] Disconnected from server, reconnecting...'
            );
            expect(warnCalls).toHaveLength(0);
        });

        it('should show warning after first successful connection then disconnect', () => {
            // Initial connection succeeds
            manager.handleConnect();
            expect(manager.getState().hasConnectedBefore).toBe(true);

            // Now disconnect - warning should be shown
            manager.handleDisconnect('transport close');

            const warnCalls = logger.warn.mock.calls.filter(
                call => call[0] === '[Happy] Disconnected from server, reconnecting...'
            );
            expect(warnCalls).toHaveLength(1);
        });
    });

    describe('Reconnection success message behavior', () => {
        it('should show "Reconnected" message only if disconnect warning was shown first', () => {
            // Initial connect
            manager.handleConnect();
            // Disconnect (triggers warning)
            manager.handleDisconnect('transport close');
            // Reconnect
            manager.handleConnect();

            // Verify info() called with reconnected message
            const infoCalls = logger.info.mock.calls.filter(
                call => call[0] === '[Happy] Reconnected to server'
            );
            expect(infoCalls).toHaveLength(1);
        });

        it('should NOT show "Reconnected" on initial connection', () => {
            // First connect event
            manager.handleConnect();

            // No reconnected message should be shown
            const infoCalls = logger.info.mock.calls.filter(
                call => call[0] === '[Happy] Reconnected to server'
            );
            expect(infoCalls).toHaveLength(0);
        });

        it('should NOT show "Reconnected" if disconnect warning was not shown', () => {
            // Simulate a scenario where hasConnectedBefore is true but
            // hasShownDisconnectWarning is false (shouldn't happen in practice,
            // but tests the guard condition)

            // Initial connect
            manager.handleConnect();

            // Simulate rapid reconnection where disconnect warning wasn't shown
            // (This tests the hasShownDisconnectWarning guard even if we try to reconnect)
            // In practice this happens if the connection bounces faster than the warning logic

            // Since we didn't disconnect, hasShownDisconnectWarning is false
            // Another connect should NOT show "Reconnected"
            manager.handleConnect();

            const infoCalls = logger.info.mock.calls.filter(
                call => call[0] === '[Happy] Reconnected to server'
            );
            expect(infoCalls).toHaveLength(0);
        });

        it('should properly reset flag after showing reconnection message', () => {
            // Initial connect
            manager.handleConnect();
            // Disconnect
            manager.handleDisconnect('transport close');

            expect(manager.getState().hasShownDisconnectWarning).toBe(true);

            // Reconnect - should show message and reset flag
            manager.handleConnect();

            expect(manager.getState().hasShownDisconnectWarning).toBe(false);
        });
    });

    describe('Flag state transitions', () => {
        it('should transition hasShownDisconnectWarning: false → disconnect → true', () => {
            // Initial state
            expect(manager.getState().hasShownDisconnectWarning).toBe(false);

            // Connect first (required for disconnect warning)
            manager.handleConnect();
            expect(manager.getState().hasShownDisconnectWarning).toBe(false);

            // Disconnect
            manager.handleDisconnect('transport close');
            expect(manager.getState().hasShownDisconnectWarning).toBe(true);
        });

        it('should transition hasShownDisconnectWarning: true → reconnect → false', () => {
            // Setup: connect then disconnect
            manager.handleConnect();
            manager.handleDisconnect('transport close');
            expect(manager.getState().hasShownDisconnectWarning).toBe(true);

            // Reconnect
            manager.handleConnect();
            expect(manager.getState().hasShownDisconnectWarning).toBe(false);
        });

        it('should keep hasShownDisconnectWarning true on multiple disconnects', () => {
            // Setup: connect then disconnect
            manager.handleConnect();
            manager.handleDisconnect('transport close');
            expect(manager.getState().hasShownDisconnectWarning).toBe(true);

            // Additional disconnects should not change the flag
            manager.handleDisconnect('ping timeout');
            expect(manager.getState().hasShownDisconnectWarning).toBe(true);

            manager.handleDisconnect('transport error');
            expect(manager.getState().hasShownDisconnectWarning).toBe(true);
        });

        it('should transition hasConnectedBefore: false → connect → true', () => {
            expect(manager.getState().hasConnectedBefore).toBe(false);

            manager.handleConnect();
            expect(manager.getState().hasConnectedBefore).toBe(true);
        });

        it('should keep hasConnectedBefore true after disconnect', () => {
            manager.handleConnect();
            expect(manager.getState().hasConnectedBefore).toBe(true);

            manager.handleDisconnect('transport close');
            expect(manager.getState().hasConnectedBefore).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('should handle rapid connect/disconnect cycles correctly', () => {
            // Cycle 1: connect → disconnect → reconnect
            manager.handleConnect();
            manager.handleDisconnect('transport close');
            manager.handleConnect();

            // Cycle 2: disconnect → reconnect
            manager.handleDisconnect('ping timeout');
            manager.handleConnect();

            // Verify: 2 warnings (one per disconnect after connection)
            const warnCalls = logger.warn.mock.calls.filter(
                call => call[0] === '[Happy] Disconnected from server, reconnecting...'
            );
            expect(warnCalls).toHaveLength(2);

            // Verify: 2 reconnected messages (one per reconnection after warning)
            const infoCalls = logger.info.mock.calls.filter(
                call => call[0] === '[Happy] Reconnected to server'
            );
            expect(infoCalls).toHaveLength(2);
        });

        it('should handle behavior when hasConnectedBefore is false (initial connection phase)', () => {
            // Simulate connection attempts during initial phase
            // Disconnect before first successful connect
            manager.handleDisconnect('connect_error');
            manager.handleDisconnect('timeout');

            // No warnings yet
            expect(logger.warn).not.toHaveBeenCalledWith('[Happy] Disconnected from server, reconnecting...');

            // First successful connect
            manager.handleConnect();
            expect(manager.getState().hasConnectedBefore).toBe(true);

            // No "Reconnected" message on first connection
            expect(logger.info).not.toHaveBeenCalledWith('[Happy] Reconnected to server');
        });

        it('should handle very rapid connect/disconnect/connect without warning (edge timing)', () => {
            // This simulates a scenario where socket briefly connects then disconnects
            // but the disconnect happens so fast that the first connect sets hasConnectedBefore
            // and then disconnect shows warning, and then immediate reconnect clears it

            manager.handleConnect();  // hasConnectedBefore = true
            manager.handleDisconnect('transport close');  // warning shown, flag = true
            manager.handleConnect();  // "Reconnected" shown, flag = false

            // Now if another disconnect happens, a NEW warning should be shown
            manager.handleDisconnect('ping timeout');

            const warnCalls = logger.warn.mock.calls.filter(
                call => call[0] === '[Happy] Disconnected from server, reconnecting...'
            );
            // Should have 2 warnings total (one per disconnect cycle)
            expect(warnCalls).toHaveLength(2);
        });

        it('should handle 5 complete connect/disconnect cycles', () => {
            for (let i = 0; i < 5; i++) {
                manager.handleConnect();
                manager.handleDisconnect('transport close');
            }
            // Final reconnect
            manager.handleConnect();

            // 5 disconnects after connections = 5 warnings
            const warnCalls = logger.warn.mock.calls.filter(
                call => call[0] === '[Happy] Disconnected from server, reconnecting...'
            );
            expect(warnCalls).toHaveLength(5);

            // 5 reconnects after warnings = 5 info messages
            // (cycles 2-5 reconnect after disconnect, plus final reconnect = 5)
            // Wait, let me recalculate:
            // Cycle 1: connect → disconnect (warn)
            // Cycle 2: connect (info) → disconnect (warn)
            // Cycle 3: connect (info) → disconnect (warn)
            // Cycle 4: connect (info) → disconnect (warn)
            // Cycle 5: connect (info) → disconnect (warn)
            // Final: connect (info)
            // So we have 5 info calls (cycles 2-5 reconnects + final)
            const infoCalls = logger.info.mock.calls.filter(
                call => call[0] === '[Happy] Reconnected to server'
            );
            expect(infoCalls).toHaveLength(5);
        });
    });

    describe('Integration with debug logging', () => {
        it('should always log debug messages regardless of notification state', () => {
            // Connect
            manager.handleConnect();
            expect(logger.debug).toHaveBeenCalledWith('Socket connected successfully');

            // Disconnect
            manager.handleDisconnect('transport close');
            expect(logger.debug).toHaveBeenCalledWith('[API] Socket disconnected:', 'transport close');

            // Reconnect
            manager.handleConnect();
            expect(logger.debug).toHaveBeenCalledWith('[API] Reconnected - requesting state reconciliation');
        });

        it('should log debug for disconnect reason', () => {
            manager.handleConnect();

            manager.handleDisconnect('io server disconnect');
            expect(logger.debug).toHaveBeenCalledWith('[API] Socket disconnected:', 'io server disconnect');

            manager.handleDisconnect('ping timeout');
            expect(logger.debug).toHaveBeenCalledWith('[API] Socket disconnected:', 'ping timeout');
        });
    });
});
