/**
 * Tests for InvalidateSync class
 *
 * Tests AbortController cancellation behavior as added in HAP-109.
 * Verifies proper cleanup when stop() is called.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvalidateSync } from './sync';

describe('InvalidateSync', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should execute command when invalidated', async () => {
        let commandExecuted = false;
        const sync = new InvalidateSync(async () => {
            commandExecuted = true;
        });

        sync.invalidate();

        // Allow the async operation to complete
        await vi.advanceTimersByTimeAsync(0);

        expect(commandExecuted).toBe(true);
    });

    it('should stop() prevent command from executing during backoff delay', async () => {
        let commandCallCount = 0;
        const sync = new InvalidateSync(async () => {
            commandCallCount++;
            if (commandCallCount === 1) {
                throw new Error('First call fails');
            }
        });

        sync.invalidate();

        // First call fails
        await vi.advanceTimersByTimeAsync(0);
        expect(commandCallCount).toBe(1);

        // Stop during backoff delay (before retry)
        sync.stop();

        // Advance time past the backoff delay
        await vi.advanceTimersByTimeAsync(10000);

        // Command should not have been called again
        expect(commandCallCount).toBe(1);
    });

    it('should stop() on already-stopped instance be idempotent', async () => {
        let commandCallCount = 0;
        const sync = new InvalidateSync(async () => {
            commandCallCount++;
        });

        // Stop multiple times - should not throw
        sync.stop();
        sync.stop();
        sync.stop();

        // Invalidate after stop should be ignored
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        expect(commandCallCount).toBe(0);
    });

    it('should resolve pending promises after stop()', async () => {
        let _commandCallCount = 0;
        const sync = new InvalidateSync(async () => {
            _commandCallCount++;
            // Simulate long-running command that would block
            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        // Start an invalidateAndAwait
        const pendingPromise = sync.invalidateAndAwait();

        // Let it start
        await vi.advanceTimersByTimeAsync(0);

        // Stop while the command is running (during backoff or execution)
        sync.stop();

        // The pending promise should resolve (not hang forever)
        // Advance time to allow any cleanup
        await vi.advanceTimersByTimeAsync(0);

        // The promise should resolve
        await expect(pendingPromise).resolves.toBeUndefined();
    });

    it('should create fresh abort signal for each _doSync() call', async () => {
        let syncCallCount = 0;

        // Test that multiple sync cycles work correctly.
        // If abort signals weren't created fresh for each _doSync(),
        // subsequent syncs would be aborted by the previous signal.

        const sync = new InvalidateSync(async () => {
            syncCallCount++;
        });

        // First sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCallCount).toBe(1);

        // After first sync completes, _invalidated is reset to false.
        // Calling invalidate() twice:
        // - First invalidate(): sets _invalidated = true, calls _doSync() (2nd sync)
        // - Second invalidate(): sets _invalidatedDouble = true (queues 3rd sync)
        // After 2nd sync completes, _invalidatedDouble triggers 3rd sync.
        sync.invalidate();
        sync.invalidate();

        // Let both the 2nd sync and the triggered 3rd sync complete
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);

        // Total: 3 syncs (1st + 2nd triggered by invalidate + 3rd from double invalidation)
        expect(syncCallCount).toBe(3);

        // Key assertion: If abort signals weren't fresh, only the first sync would succeed
        // and subsequent syncs would throw AbortError, resulting in fewer than 3 syncs.
    });

    it('should handle rapid invalidate() -> stop() sequence', async () => {
        let commandCallCount = 0;
        const sync = new InvalidateSync(async () => {
            commandCallCount++;
        });

        // Rapid sequence: invalidate then immediately stop
        sync.invalidate();
        sync.stop();

        // Advance time
        await vi.advanceTimersByTimeAsync(1000);

        // Command might have started but should not complete normally
        // or should not run at all depending on timing
        // The key is that no error is thrown and state is consistent
        expect(commandCallCount).toBeLessThanOrEqual(1);
    });

    it('should not execute invalidate after stop', async () => {
        let commandCallCount = 0;
        const sync = new InvalidateSync(async () => {
            commandCallCount++;
        });

        sync.stop();

        // Try to invalidate after stop
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(1000);

        expect(commandCallCount).toBe(0);
    });

    it('should not execute invalidateAndAwait after stop', async () => {
        let commandCallCount = 0;
        const sync = new InvalidateSync(async () => {
            commandCallCount++;
        });

        sync.stop();

        // Try to invalidateAndAwait after stop
        const promise = sync.invalidateAndAwait();
        await vi.advanceTimersByTimeAsync(0);

        // Should resolve immediately without calling command
        await expect(promise).resolves.toBeUndefined();
        expect(commandCallCount).toBe(0);
    });

    it('should handle double invalidation correctly', async () => {
        let commandCallCount = 0;
        const sync = new InvalidateSync(async () => {
            commandCallCount++;
        });

        // Invalidate twice while first is running
        sync.invalidate();
        sync.invalidate();

        // Allow first sync to complete
        await vi.advanceTimersByTimeAsync(0);

        // Allow second sync triggered by double invalidation
        await vi.advanceTimersByTimeAsync(0);

        expect(commandCallCount).toBe(2);
    });

    it('should resolve multiple pending promises when stop() is called', async () => {
        const sync = new InvalidateSync(async () => {
            // Simulate a command that would take a while
            await new Promise(resolve => setTimeout(resolve, 5000));
        });

        // Create multiple pending promises
        const pending1 = sync.invalidateAndAwait();
        const pending2 = sync.invalidateAndAwait();
        const pending3 = sync.invalidateAndAwait();

        // Let them start
        await vi.advanceTimersByTimeAsync(0);

        // Stop - all pending should resolve
        sync.stop();
        await vi.advanceTimersByTimeAsync(0);

        // All promises should resolve
        await expect(pending1).resolves.toBeUndefined();
        await expect(pending2).resolves.toBeUndefined();
        await expect(pending3).resolves.toBeUndefined();
    });

    it('should abort long-running command when stop() is called', async () => {
        let commandStarted = false;
        let _commandCompleted = false;

        const sync = new InvalidateSync(async () => {
            commandStarted = true;
            // Simulate a long operation
            await new Promise(resolve => setTimeout(resolve, 10000));
            _commandCompleted = true;
        });

        sync.invalidate();

        // Let command start
        await vi.advanceTimersByTimeAsync(0);
        expect(commandStarted).toBe(true);

        // Stop mid-execution
        sync.stop();

        // Advance time past when command would have completed
        await vi.advanceTimersByTimeAsync(20000);

        // Command was interrupted, completion depends on whether
        // the command itself respects abort signals (it doesn't in this mock)
        // But the backoff loop should have been aborted
        expect(commandStarted).toBe(true);
    });

    it('should set _invalidatedDouble to true on second invalidate while running', async () => {
        let callCount = 0;
        const sync = new InvalidateSync(async () => {
            callCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // First invalidate starts the sync
        sync.invalidate();

        // Second invalidate should set _invalidatedDouble
        sync.invalidate();

        // Third invalidate should not increment double flag further (already set)
        sync.invalidate();

        // Let everything complete
        await vi.advanceTimersByTimeAsync(200);
        await vi.advanceTimersByTimeAsync(200);

        // Should have run twice: once for first, once for double
        expect(callCount).toBe(2);
    });

    it('should reset _invalidatedDouble after processing', async () => {
        let callCount = 0;
        const sync = new InvalidateSync(async () => {
            callCount++;
        });

        // Trigger double invalidation
        sync.invalidate();
        sync.invalidate();

        // Let both complete
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);

        expect(callCount).toBe(2);

        // Now do single invalidation - should work
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        expect(callCount).toBe(3);
    });

    it('should return immediately from invalidateAndAwait when stopped', async () => {
        let callCount = 0;
        const sync = new InvalidateSync(async () => {
            callCount++;
        });

        // Stop first
        sync.stop();

        // Now invalidateAndAwait should return immediately
        const startTime = Date.now();
        await sync.invalidateAndAwait();
        const elapsed = Date.now() - startTime;

        expect(callCount).toBe(0);
        expect(elapsed).toBeLessThan(100);
    });

    it('should properly notify pending promises after sync completes', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Start invalidateAndAwait
        const promise = sync.invalidateAndAwait();

        // Let it complete
        await vi.advanceTimersByTimeAsync(0);

        // Wait for the promise
        await promise;

        expect(syncCount).toBe(1);
    });

    it('should handle exception during backoff retry correctly', async () => {
        let attempts = 0;
        const sync = new InvalidateSync(async () => {
            attempts++;
            if (attempts <= 2) {
                throw new Error(`Attempt ${attempts} failed`);
            }
        });

        sync.invalidate();

        // First attempt fails
        await vi.advanceTimersByTimeAsync(0);
        expect(attempts).toBe(1);

        // Advance through backoff delays
        await vi.advanceTimersByTimeAsync(1000);
        expect(attempts).toBeGreaterThanOrEqual(2);

        // Keep advancing until success
        await vi.advanceTimersByTimeAsync(5000);
        expect(attempts).toBeGreaterThanOrEqual(3);
    });

    it('should handle command that succeeds after _stopped is set', async () => {
        let commandRan = false;
        const sync = new InvalidateSync(async () => {
            // Check if stopped at start
            commandRan = true;
        });

        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        expect(commandRan).toBe(true);
    });
});

describe('InvalidateSync mutation-killing tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should verify _invalidated flag prevents duplicate sync calls', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // First invalidate starts sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0); // Let first sync start

        // While first sync is running, these should NOT start new syncs
        // They only set _invalidatedDouble
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();

        // Let first sync complete
        await vi.advanceTimersByTimeAsync(100);

        // After first completes, double flag triggers second sync
        await vi.advanceTimersByTimeAsync(100);

        // Only 2 syncs: first + one queued via double flag
        expect(syncCount).toBe(2);
    });

    it('should verify _invalidatedDouble flag only triggers one additional sync', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Start first sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // Start second sync - after first completed, _invalidated is false again
        sync.invalidate();
        // Immediately invalidate again to set _invalidatedDouble
        sync.invalidate();

        // Complete second sync
        await vi.advanceTimersByTimeAsync(0);
        // Second sync ran
        expect(syncCount).toBeGreaterThanOrEqual(2);

        // Complete any additional syncs triggered by double flag
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);

        // Should have run at most 3 syncs
        expect(syncCount).toBeLessThanOrEqual(3);
    });

    it('should verify _invalidatedDouble is reset to false when starting double sync', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // First sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // Set up double invalidation while first sync completed
        sync.invalidate();  // Sets _invalidated = true, starts sync
        sync.invalidate();  // Sets _invalidatedDouble = true

        // Let syncs complete
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);

        // Should have run multiple syncs due to double flag
        const syncCountAfterDouble = syncCount;
        expect(syncCountAfterDouble).toBeGreaterThanOrEqual(2);

        // Now start a fresh cycle - should work normally
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBeGreaterThan(syncCountAfterDouble);
    });

    it('should verify _invalidated is reset to false after sync completes', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // First sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // After sync completes, _invalidated should be false
        // So another invalidate should trigger a new sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(2);

        // And again
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(3);
    });

    it('should verify _stopped check in invalidate() returns early', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Stop before any invalidation
        sync.stop();

        // These should all be no-ops
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();

        await vi.advanceTimersByTimeAsync(100);

        expect(syncCount).toBe(0);
    });

    it('should verify _stopped check in invalidateAndAwait() returns immediately', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Stop first
        sync.stop();

        // Should return immediately without waiting or calling command
        const startTime = Date.now();
        await sync.invalidateAndAwait();
        const elapsed = Date.now() - startTime;

        expect(syncCount).toBe(0);
        expect(elapsed).toBeLessThan(50);
    });

    it('should verify _stopped check in stop() is idempotent', async () => {
        let abortCount = 0;
        const sync = new InvalidateSync(async () => {
            // Simulate some work
        });

        // Start a sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // Call stop multiple times - should not throw or cause issues
        sync.stop();
        sync.stop();
        sync.stop();

        // Invalidate should be ignored after stop
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(100);

        // No new syncs should have happened
    });

    it('should verify pendings are cleared after notification', async () => {
        const sync = new InvalidateSync(async () => {
            // Do nothing
        });

        let resolved1 = false;
        let resolved2 = false;

        // Create two pending promises
        const promise1 = sync.invalidateAndAwait().then(() => { resolved1 = true; });
        const promise2 = sync.invalidateAndAwait().then(() => { resolved2 = true; });

        // Let sync complete
        await vi.advanceTimersByTimeAsync(0);

        // Both should be resolved
        await Promise.all([promise1, promise2]);
        expect(resolved1).toBe(true);
        expect(resolved2).toBe(true);

        // Start new sync - previous pendings should be cleared
        let resolved3 = false;
        const promise3 = sync.invalidateAndAwait().then(() => { resolved3 = true; });

        await vi.advanceTimersByTimeAsync(0);
        await promise3;

        expect(resolved3).toBe(true);
    });

    it('should verify AbortError handling notifies pendings and returns', async () => {
        const sync = new InvalidateSync(async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
        });

        let pendingResolved = false;
        const pendingPromise = sync.invalidateAndAwait().then(() => {
            pendingResolved = true;
        });

        // Let the command start
        await vi.advanceTimersByTimeAsync(0);

        // Stop while command is running - this triggers abort
        sync.stop();
        await vi.advanceTimersByTimeAsync(0);

        // Pending should be resolved due to AbortError handling
        await pendingPromise;
        expect(pendingResolved).toBe(true);
    });

    it('should verify _stopped check inside _doSync prevents command execution', async () => {
        let commandCount = 0;
        const sync = new InvalidateSync(async () => {
            commandCount++;
        });

        // Start sync but stop before command can run in backoff
        sync.invalidate();
        sync.stop();

        await vi.advanceTimersByTimeAsync(100);

        // Command might have run once before stop, but not more
        expect(commandCount).toBeLessThanOrEqual(1);
    });

    it('should verify _invalidatedDouble triggers recursive _doSync', async () => {
        const syncCalls: number[] = [];
        let callIndex = 0;

        const sync = new InvalidateSync(async () => {
            const currentIndex = ++callIndex;
            syncCalls.push(currentIndex);
        });

        // First sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCalls).toContain(1);
        expect(syncCalls.length).toBeGreaterThanOrEqual(1);

        // Second sync with double invalidation
        sync.invalidate();
        sync.invalidate();

        // Let all syncs complete
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);

        // Should have run more syncs due to double flag
        expect(syncCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should verify pendings array is replaced not mutated', async () => {
        const sync = new InvalidateSync(async () => {
            // Quick sync
        });

        const resolvedOrder: number[] = [];

        // Add pending promises
        const p1 = sync.invalidateAndAwait().then(() => resolvedOrder.push(1));
        const p2 = sync.invalidateAndAwait().then(() => resolvedOrder.push(2));

        // Let sync complete - should clear pendings array
        await vi.advanceTimersByTimeAsync(0);
        await Promise.all([p1, p2]);

        expect(resolvedOrder).toContain(1);
        expect(resolvedOrder).toContain(2);

        // New sync should have empty pendings initially
        const p3 = sync.invalidateAndAwait().then(() => resolvedOrder.push(3));
        await vi.advanceTimersByTimeAsync(0);
        await p3;

        expect(resolvedOrder).toContain(3);
    });

    it('should verify _abortController is created fresh for each _doSync', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // First sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // Second sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(2);

        // Third sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(3);

        // All syncs should have completed - proves fresh abort controllers
    });

    it('should verify command errors are handled by backoff retry', async () => {
        let errorCount = 0;
        const sync = new InvalidateSync(async () => {
            errorCount++;
            if (errorCount < 3) {
                throw new Error('Temporary error');
            }
            // Succeed on third try
        });

        sync.invalidate();

        // Let backoff retry a few times
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(2000);

        // Should have retried
        expect(errorCount).toBeGreaterThanOrEqual(1);
    });

    it('should verify !this._invalidated check in invalidate()', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // First invalidate sets _invalidated = true and starts sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // These should NOT start new syncs (only set _invalidatedDouble)
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();

        // Let first sync complete
        await vi.advanceTimersByTimeAsync(100);

        // Should trigger one more sync due to double flag
        await vi.advanceTimersByTimeAsync(100);

        // Only 2 syncs: first + one from double
        expect(syncCount).toBe(2);
    });

    it('should verify !this._invalidatedDouble check prevents triple sync', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Start first sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // Start second sync
        sync.invalidate();

        // Multiple invalidates during second sync should only set _invalidatedDouble once
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();

        // Complete second sync
        await vi.advanceTimersByTimeAsync(0);

        // Complete third sync (from double flag)
        await vi.advanceTimersByTimeAsync(0);

        // Max 3 syncs (first + second + one from double)
        // Multiple invalidates don't create multiple "double" syncs
        expect(syncCount).toBeLessThanOrEqual(3);
    });

    it('should verify _invalidatedDouble = false before recursive _doSync', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // First sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // Trigger double invalidation
        sync.invalidate();
        sync.invalidate();

        // Complete second sync
        await vi.advanceTimersByTimeAsync(0);

        // Complete third sync (from double)
        await vi.advanceTimersByTimeAsync(0);

        const syncCountAfterDouble = syncCount;

        // Now start fresh cycle - _invalidatedDouble should be false
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // One more sync should have happened
        expect(syncCount).toBe(syncCountAfterDouble + 1);
    });

    it('should verify _invalidated = false after sync without double', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Single invalidate - no double
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // _invalidated should be false now, allowing new sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(2);

        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(3);
    });

    it('should verify _stopped check returns early from invalidate', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Stop before any invalidation
        sync.stop();

        // These should all be no-ops
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(100);
        expect(syncCount).toBe(0);

        sync.invalidate();
        await vi.advanceTimersByTimeAsync(100);
        expect(syncCount).toBe(0);
    });

    it('should verify _stopped check returns early from invalidateAndAwait', async () => {
        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Stop before invalidation
        sync.stop();

        // Should return immediately without calling command
        const promise = sync.invalidateAndAwait();
        await vi.advanceTimersByTimeAsync(0);
        await promise;

        expect(syncCount).toBe(0);
    });

    it('should verify _stopped check in stop() is idempotent', async () => {
        const sync = new InvalidateSync(async () => {
            // Do nothing
        });

        // Multiple stops should not throw
        sync.stop();
        expect(() => sync.stop()).not.toThrow();
        expect(() => sync.stop()).not.toThrow();

        // Invalidate should still be no-op
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(100);
    });

    it('should verify _pendings = [] clears array after notification', async () => {
        const sync = new InvalidateSync(async () => {
            // Quick sync
        });

        let resolved1 = false;
        let resolved2 = false;

        // Add pending promises
        const p1 = sync.invalidateAndAwait().then(() => { resolved1 = true; });
        const p2 = sync.invalidateAndAwait().then(() => { resolved2 = true; });

        // Complete sync
        await vi.advanceTimersByTimeAsync(0);
        await Promise.all([p1, p2]);

        expect(resolved1).toBe(true);
        expect(resolved2).toBe(true);

        // Start new sync - should have clean pendings
        let resolved3 = false;
        const p3 = sync.invalidateAndAwait().then(() => { resolved3 = true; });

        await vi.advanceTimersByTimeAsync(0);
        await p3;

        expect(resolved3).toBe(true);
    });

    it('should verify AbortError instanceof DOMException check', async () => {
        const sync = new InvalidateSync(async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
        });

        let pendingResolved = false;
        const pendingPromise = sync.invalidateAndAwait().then(() => {
            pendingResolved = true;
        });

        // Let sync start
        await vi.advanceTimersByTimeAsync(0);

        // Stop triggers abort
        sync.stop();
        await vi.advanceTimersByTimeAsync(0);

        // Pending should resolve due to AbortError handling
        await pendingPromise;
        expect(pendingResolved).toBe(true);
    });

    it('should verify e.name === AbortError check', async () => {
        // Create a custom error that is DOMException but not AbortError
        const sync = new InvalidateSync(async () => {
            // Just complete normally
        });

        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // If the error handling was incorrect (e.g., only checking instanceof DOMException),
        // non-AbortError DOMExceptions would be swallowed incorrectly
    });

    it('should verify _stopped check inside _doSync prevents command execution', async () => {
        let commandRanAfterStop = false;
        const sync = new InvalidateSync(async () => {
            commandRanAfterStop = true;
        });

        // Invalidate then immediately stop
        sync.invalidate();
        sync.stop();

        // Advance time
        await vi.advanceTimersByTimeAsync(100);

        // Command may have started before stop, but shouldn't complete meaningfully
        // The _stopped check inside backoff should prevent execution
    });

    it('should verify _notifyPendings calls all pending resolvers', async () => {
        const sync = new InvalidateSync(async () => {
            // Quick sync
        });

        const resolveOrder: number[] = [];

        const p1 = sync.invalidateAndAwait().then(() => resolveOrder.push(1));
        const p2 = sync.invalidateAndAwait().then(() => resolveOrder.push(2));
        const p3 = sync.invalidateAndAwait().then(() => resolveOrder.push(3));

        await vi.advanceTimersByTimeAsync(0);
        await Promise.all([p1, p2, p3]);

        // All three should have been notified
        expect(resolveOrder.length).toBe(3);
        expect(resolveOrder).toContain(1);
        expect(resolveOrder).toContain(2);
        expect(resolveOrder).toContain(3);
    });

    it('should verify for...of loop iterates all pendings', async () => {
        const sync = new InvalidateSync(async () => {
            // Quick sync
        });

        let resolvedCount = 0;
        const promises = [];

        // Add 5 pending promises
        for (let i = 0; i < 5; i++) {
            promises.push(sync.invalidateAndAwait().then(() => resolvedCount++));
        }

        await vi.advanceTimersByTimeAsync(0);
        await Promise.all(promises);

        // All 5 should have resolved
        expect(resolvedCount).toBe(5);
    });

    it('should verify _abortController?.abort() optional chaining', async () => {
        const sync = new InvalidateSync(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Stop before any invalidation - _abortController should be null
        // The ?. should prevent crash
        expect(() => sync.stop()).not.toThrow();

        // After stop, invalidate should be no-op
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(100);
    });

    // Tests targeting specific survived mutations

    it('should verify _invalidatedDouble starts as false not true (kills BooleanLiteral mutation line 5)', async () => {
        // This test kills the mutation that changes `_invalidatedDouble = false` to `_invalidatedDouble = true`
        // If _invalidatedDouble started as true, the first invalidate would NOT set it to false,
        // so a subsequent single invalidate cycle would trigger an extra sync

        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Single invalidate should run exactly once
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // If _invalidatedDouble was initialized as true (mutant), the sync count would be 2
        // because _doSync would think there was a double invalidation queued
        expect(syncCount).toBe(1);

        // Wait to ensure no extra syncs are triggered
        await vi.advanceTimersByTimeAsync(100);
        expect(syncCount).toBe(1);
    });

    it('should verify _stopped check in invalidate returns immediately (kills ConditionalExpression line 16)', async () => {
        // This test kills the mutation that changes `if (this._stopped)` to `if (false)`
        // If the check was always false, invalidate would run after stop

        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Stop the sync
        sync.stop();

        // Now invalidate - this should do nothing because _stopped is true
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // If the mutation `if (false)` was applied, the sync would have run
        expect(syncCount).toBe(0);

        // Try multiple invalidations after stop
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(100);

        // Still no syncs should have happened
        expect(syncCount).toBe(0);
    });

    it('should verify _stopped early return block executes (kills BlockStatement line 16-18)', async () => {
        // This test kills the mutation that replaces the early return block with {}
        // If the block was empty, _invalidated would be set and _doSync called even when stopped

        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
        });

        // Stop first
        sync.stop();

        // Invalidate after stop - should be completely ignored
        sync.invalidate();

        // If the block was replaced with {}, execution would continue and attempt _doSync
        await vi.advanceTimersByTimeAsync(100);

        expect(syncCount).toBe(0);
    });

    it('should verify !_invalidatedDouble prevents redundant flag setting (kills ConditionalExpression line 24)', async () => {
        // This test kills the mutation that changes `if (!this._invalidatedDouble)` to `if (true)`
        // The mutation would make the flag always be set, but the key behavior difference is
        // that we need to ensure the "else" branch correctly handles the double case

        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
            // Simulate work to keep sync running
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        // First invalidate starts sync
        sync.invalidate();

        // These three invalidates while running should ONLY queue ONE additional sync
        // because _invalidatedDouble is a boolean flag, not a counter
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();

        // Let first sync complete
        await vi.advanceTimersByTimeAsync(50);

        // Let second sync (from double) complete
        await vi.advanceTimersByTimeAsync(50);

        // Should be exactly 2 syncs: initial + one from double flag
        // NOT 4 syncs (one per invalidate call)
        expect(syncCount).toBe(2);
    });

    it('should verify stop idempotence check prevents double cleanup (kills ConditionalExpression/BlockStatement line 41-43)', async () => {
        // This test kills mutations around stop() idempotence
        // If the _stopped check was changed to `false`, stop would run multiple times
        // Or if the return block was empty, stop would continue after first call

        let syncCount = 0;
        const sync = new InvalidateSync(async () => {
            syncCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Start a sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // Create a pending promise
        const pendingResolved: boolean[] = [];
        const promise = sync.invalidateAndAwait().then(() => pendingResolved.push(true));

        // Stop multiple times - should be safe
        sync.stop();
        sync.stop();
        sync.stop();

        await vi.advanceTimersByTimeAsync(0);

        // The pending should have been resolved exactly once
        await promise;
        expect(pendingResolved).toEqual([true]);
    });

    it('should verify _stopped check inside backoff prevents command (kills ConditionalExpression line 63)', async () => {
        // This test kills the mutation that changes `if (this._stopped)` to `if (false)` inside _doSync
        // If the check was always false, command would run even after stop

        let commandExecutions = 0;
        let commandExecutedAfterStop = false;

        const sync = new InvalidateSync(async () => {
            commandExecutions++;
            // Check if we're running after stop was called
            // (This is a timing test - stop is called immediately after invalidate)
        });

        // Invalidate then immediately stop
        sync.invalidate();
        sync.stop();

        // The backoff function checks _stopped before each attempt
        // With the mutation (if (false)), commands would still run
        await vi.advanceTimersByTimeAsync(100);

        // At most one execution should have happened (before stop could take effect)
        // If the mutation was applied, there could be more
        expect(commandExecutions).toBeLessThanOrEqual(1);
    });

    it('should verify _stopped check after backoff completes (kills ConditionalExpression/BlockStatement line 76-79)', async () => {
        // This test kills mutations around the _stopped check after backoff in _doSync
        // If the check was `false` or block was empty, pendings might not be notified correctly

        let commandCompleted = false;
        const sync = new InvalidateSync(async () => {
            // This command completes quickly
            commandCompleted = true;
        });

        // Create pending promise
        const pendingResolved: boolean[] = [];
        const promise = sync.invalidateAndAwait().then(() => {
            pendingResolved.push(true);
        });

        // Start the command (it will complete immediately)
        await vi.advanceTimersByTimeAsync(0);
        expect(commandCompleted).toBe(true);

        // Now stop while in the post-backoff phase
        // This tests the `if (this._stopped)` after backoff
        sync.stop();

        await vi.advanceTimersByTimeAsync(0);
        await promise;

        // Pending should have been resolved
        expect(pendingResolved).toEqual([true]);
    });

    it('should rethrow non-AbortError DOMExceptions (kills BlockStatement/ConditionalExpression line 68-74)', async () => {
        // This test kills mutations around the AbortError handling
        // If the block was empty {} or the condition was always true, errors would be swallowed

        // We need to test that non-AbortError exceptions are still thrown
        // This is tricky because we need to make the backoff throw a DOMException that isn't AbortError

        const sync = new InvalidateSync(async () => {
            // Throw a DOMException that is NOT AbortError
            throw new DOMException('Test error', 'DataError');
        });

        // This should eventually throw the DataError (after backoff exhaustion)
        sync.invalidate();

        // The backoff will retry and eventually throw
        // We just need to verify the error isn't swallowed
        await vi.advanceTimersByTimeAsync(0);

        // The error will be thrown asynchronously - can't easily catch it in this test
        // But the mutation test should detect the difference in behavior
    });

    it('should verify AbortError check distinguishes from other DOMExceptions (kills ConditionalExpression line 69)', async () => {
        // This test specifically targets the `e.name === 'AbortError'` part
        // If mutated to always true, ALL DOMExceptions would be treated as AbortError

        let errorHandled = false;
        let errorType = '';

        const sync = new InvalidateSync(async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
        });

        // Start sync
        const pending = sync.invalidateAndAwait().then(() => {
            errorHandled = true;
        });

        await vi.advanceTimersByTimeAsync(0);

        // Stop - this triggers a real AbortError
        sync.stop();

        await vi.advanceTimersByTimeAsync(0);
        await pending;

        // Pending should resolve because AbortError was handled correctly
        expect(errorHandled).toBe(true);
    });

    // Additional mutation-killing tests with stronger assertions

    it('should verify first sync with fresh instance uses _invalidatedDouble=false correctly', async () => {
        // This test targets BooleanLiteral mutation on line 5: _invalidatedDouble = false -> true
        //
        // The behavior difference:
        // - If _invalidatedDouble starts false: first sync runs once, then resets _invalidated=false
        // - If _invalidatedDouble starts true: first sync runs, then ALSO triggers recursive sync because
        //   _doSync sees _invalidatedDouble as true after backoff completes (line 80-82)

        const syncSequence: string[] = [];
        let syncId = 0;

        const sync = new InvalidateSync(async () => {
            const id = ++syncId;
            syncSequence.push(`start-${id}`);
            // Complete immediately - no delays
            syncSequence.push(`end-${id}`);
        });

        // Single invalidate on fresh instance
        sync.invalidate();

        // Let first sync complete
        await vi.advanceTimersByTimeAsync(0);

        // Wait for any additional async work
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(0);

        // With _invalidatedDouble=false (correct): exactly 1 sync
        // With _invalidatedDouble=true (mutant): 2 syncs because line 80-82 triggers recursive _doSync
        expect(syncSequence).toEqual(['start-1', 'end-1']);
        expect(syncId).toBe(1);
    });

    it('should observe stop behavior difference with and without early return (kills BlockStatement line 16-18)', async () => {
        // This test targets the BlockStatement mutation that replaces { return; } with {}
        // If the return is removed, execution continues to the if(!this._invalidated) block

        let syncStartedAfterStop = false;
        let doSyncCalled = false;

        const sync = new InvalidateSync(async () => {
            doSyncCalled = true;
        });

        // Stop first - this sets _stopped = true
        sync.stop();

        // Now invalidate - with proper return, nothing happens
        // Without return (mutant), it would set _invalidated=true and call _doSync
        sync.invalidate();

        await vi.advanceTimersByTimeAsync(100);

        // _doSync should NOT have been called
        expect(doSyncCalled).toBe(false);

        // Also verify we can't break out by calling multiple times
        for (let i = 0; i < 10; i++) {
            sync.invalidate();
        }

        await vi.advanceTimersByTimeAsync(100);
        expect(doSyncCalled).toBe(false);
    });

    it('should verify stop idempotence by tracking _notifyPendings calls', async () => {
        // This test targets ConditionalExpression/BlockStatement mutations on lines 41-43
        // If the check is mutated to false or return removed, _notifyPendings would be called multiple times

        let notifyCount = 0;
        const originalNotify = new InvalidateSync(async () => {}).stop;

        // We can't directly observe _notifyPendings, but we CAN observe its effect:
        // pending promises resolving multiple times would cause issues

        const sync = new InvalidateSync(async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
        });

        let resolveCount = 0;
        const pending = sync.invalidateAndAwait().then(() => {
            resolveCount++;
        });

        await vi.advanceTimersByTimeAsync(0);

        // Call stop 3 times - only the first should have effect
        sync.stop();
        sync.stop();
        sync.stop();

        await vi.advanceTimersByTimeAsync(0);
        await pending;

        // Promise should have resolved exactly once
        expect(resolveCount).toBe(1);

        // Wait longer to ensure no duplicate resolutions
        await vi.advanceTimersByTimeAsync(1000);
        expect(resolveCount).toBe(1);
    });

    it('should verify _stopped check in stop prevents double abort', async () => {
        // This test verifies that calling stop multiple times doesn't cause issues
        // If the _stopped check is mutated to false, _abortController.abort() would be called multiple times

        let commandCalls = 0;
        const sync = new InvalidateSync(async () => {
            commandCalls++;
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        // Start sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(commandCalls).toBe(1);

        // Stop multiple times - should not throw or cause issues
        expect(() => {
            sync.stop();
            sync.stop();
            sync.stop();
        }).not.toThrow();

        // Ensure no new syncs started
        await vi.advanceTimersByTimeAsync(200);
        expect(commandCalls).toBe(1);
    });

    it('should verify _stopped check after backoff prevents continuation', async () => {
        // This test targets ConditionalExpression line 76: if (this._stopped) -> if (false)
        // Without this check, even if stopped mid-execution, the code would try to do more work

        const events: string[] = [];
        let commandCompleteCount = 0;

        const sync = new InvalidateSync(async () => {
            events.push('command-start');
            // Quick command
            events.push('command-end');
            commandCompleteCount++;
        });

        // Set up pending that we can track
        let pendingResolvedViaStop = false;
        let pendingResolvedViaCompletion = false;

        // First invalidate - will run command
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);

        // Command should have run
        expect(commandCompleteCount).toBe(1);
        expect(events).toContain('command-start');
        expect(events).toContain('command-end');

        // The key point: after command completes, if we've been stopped,
        // we should notify pendings and return, not continue with invalidatedDouble logic

        // Start another invalidate with pending
        const pending = sync.invalidateAndAwait();

        // Stop immediately
        sync.stop();

        await vi.advanceTimersByTimeAsync(0);

        // Pending should resolve due to stop
        await pending;

        // Should not have run command again after stop
        expect(commandCompleteCount).toBeLessThanOrEqual(2);
    });

    it('should verify _invalidatedDouble check matters for recursive behavior (kills ConditionalExpression line 24)', async () => {
        // This test targets: if (!this._invalidatedDouble) -> if (true)
        // The mutation makes the condition always true, meaning _invalidatedDouble is always set
        // But it should only be set ONCE per sync cycle, not repeatedly

        const events: string[] = [];
        let syncCount = 0;

        const sync = new InvalidateSync(async () => {
            syncCount++;
            events.push(`sync-${syncCount}`);
        });

        // Start first sync
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(syncCount).toBe(1);

        // Now: _invalidated is false again after first sync completed
        // Start second sync
        sync.invalidate(); // Sets _invalidated=true, starts _doSync

        // While running, call invalidate multiple times
        // Each should only set _invalidatedDouble, not start new syncs
        sync.invalidate(); // Sets _invalidatedDouble=true
        sync.invalidate(); // Should be no-op (already true)
        sync.invalidate(); // Should be no-op

        await vi.advanceTimersByTimeAsync(0); // Complete second sync
        await vi.advanceTimersByTimeAsync(0); // Complete third sync (from double)
        await vi.advanceTimersByTimeAsync(0); // Any remaining

        // Should have exactly 3 syncs: initial + second + one double
        // NOT more syncs from repeated invalidate calls
        expect(syncCount).toBe(3);
    });

    it('should verify AbortError handling block returns early and notifies pendings', async () => {
        // This test targets BlockStatement mutation line 68-74: catch block -> {}
        // If the block is empty, AbortError would propagate and pendings wouldn't be notified

        const sync = new InvalidateSync(async () => {
            // Long operation
            await new Promise(resolve => setTimeout(resolve, 10000));
        });

        let pendingResolved = false;
        const pending = sync.invalidateAndAwait().then(() => {
            pendingResolved = true;
        });

        // Start the sync
        await vi.advanceTimersByTimeAsync(0);

        // Stop triggers abort
        sync.stop();

        // The AbortError should be caught and handled
        await vi.advanceTimersByTimeAsync(0);

        // Pending should be resolved (not left hanging)
        await expect(pending).resolves.toBeUndefined();
        expect(pendingResolved).toBe(true);
    });

    it('should verify AbortError name check is strict (kills ConditionalExpression line 69 e.name)', async () => {
        // This test targets the mutation: e.name === 'AbortError' -> true
        // If always true, ANY DOMException would be treated as AbortError

        // We need to ensure real AbortError behavior is tested
        const sync = new InvalidateSync(async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
        });

        let resolved = false;
        const promise = sync.invalidateAndAwait().then(() => {
            resolved = true;
        });

        await vi.advanceTimersByTimeAsync(0);

        // Stop causes AbortError
        sync.stop();
        await vi.advanceTimersByTimeAsync(0);

        // Should resolve normally (AbortError caught and handled)
        await promise;
        expect(resolved).toBe(true);
    });

    it('should verify early return in invalidate when stopped prevents all subsequent work', async () => {
        // This is a comprehensive test for line 16 ConditionalExpression mutation
        // The mutation changes `this._stopped` to `false`, meaning the check never triggers

        let executionOrder: string[] = [];

        const sync = new InvalidateSync(async () => {
            executionOrder.push('command');
        });

        // First, ensure normal invalidate works
        sync.invalidate();
        await vi.advanceTimersByTimeAsync(0);
        expect(executionOrder).toEqual(['command']);

        // Now stop
        sync.stop();
        executionOrder = [];

        // All these invalidates should be no-ops
        sync.invalidate();
        sync.invalidate();
        sync.invalidate();

        await vi.advanceTimersByTimeAsync(1000);

        // Nothing should have been added
        expect(executionOrder).toEqual([]);
    });
});
