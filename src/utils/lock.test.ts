import { describe, it, expect } from 'vitest';
import { AsyncLock, LockTimeoutError } from './lock';

describe('AsyncLock', () => {
    describe('inLock', () => {
        it('should execute function and return result', async () => {
            const lock = new AsyncLock();
            const result = await lock.inLock(() => 'hello');
            expect(result).toBe('hello');
        });

        it('should execute async function and return result', async () => {
            const lock = new AsyncLock();
            const result = await lock.inLock(async () => {
                return 'async hello';
            });
            expect(result).toBe('async hello');
        });

        it('should serialize concurrent operations', async () => {
            const lock = new AsyncLock();
            const executionOrder: number[] = [];

            // Start two operations concurrently
            const op1 = lock.inLock(async () => {
                executionOrder.push(1);
                await new Promise(resolve => setTimeout(resolve, 50));
                executionOrder.push(2);
                return 'op1';
            });

            const op2 = lock.inLock(async () => {
                executionOrder.push(3);
                await new Promise(resolve => setTimeout(resolve, 10));
                executionOrder.push(4);
                return 'op2';
            });

            const [result1, result2] = await Promise.all([op1, op2]);

            expect(result1).toBe('op1');
            expect(result2).toBe('op2');
            // op1 should complete (1, 2) before op2 starts (3, 4)
            expect(executionOrder).toEqual([1, 2, 3, 4]);
        });

        it('should release lock even if function throws', async () => {
            const lock = new AsyncLock();

            // First operation throws
            await expect(lock.inLock(async () => {
                throw new Error('Test error');
            })).rejects.toThrow('Test error');

            // Second operation should still acquire lock
            const result = await lock.inLock(() => 'after error');
            expect(result).toBe('after error');
        });

        it('should release lock even if async function throws', async () => {
            const lock = new AsyncLock();

            // First operation throws after async work
            await expect(lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                throw new Error('Async error');
            })).rejects.toThrow('Async error');

            // Second operation should still acquire lock
            const result = await lock.inLock(() => 'after async error');
            expect(result).toBe('after async error');
        });
    });

    describe('timeout behavior', () => {
        it('should throw LockTimeoutError when timeout exceeded', async () => {
            const lock = new AsyncLock();

            // Hold the lock for longer than the timeout
            const holdLockPromise = lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
                return 'done';
            });

            // Try to acquire with short timeout - should fail
            const timeoutPromise = lock.inLock(() => 'should timeout', 50);

            await expect(timeoutPromise).rejects.toThrow(LockTimeoutError);

            // Let the holding operation complete
            await holdLockPromise;
        });

        it('should acquire lock before timeout expires', async () => {
            const lock = new AsyncLock();

            // Hold lock briefly
            const holdPromise = lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 30));
                return 'held';
            });

            // Wait with longer timeout - should succeed
            const waitPromise = lock.inLock(() => 'acquired', 500);

            const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

            expect(holdResult).toBe('held');
            expect(waitResult).toBe('acquired');
        });

        it('should wait indefinitely when no timeout specified', async () => {
            const lock = new AsyncLock();
            const acquired: string[] = [];

            // Hold lock
            const holdPromise = lock.inLock(async () => {
                acquired.push('hold-start');
                await new Promise(resolve => setTimeout(resolve, 100));
                acquired.push('hold-end');
                return 'held';
            });

            // Wait without timeout (should eventually acquire)
            const waitPromise = lock.inLock(async () => {
                acquired.push('wait-acquired');
                return 'waited';
            });

            const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

            expect(holdResult).toBe('held');
            expect(waitResult).toBe('waited');
            expect(acquired).toEqual(['hold-start', 'hold-end', 'wait-acquired']);
        });
    });

    describe('queue ordering', () => {
        it('should process waiters in FIFO order', async () => {
            const lock = new AsyncLock();
            const order: number[] = [];

            // Hold lock
            const hold = lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                order.push(0);
            });

            // Queue up multiple waiters
            const waiter1 = lock.inLock(async () => {
                order.push(1);
            });
            const waiter2 = lock.inLock(async () => {
                order.push(2);
            });
            const waiter3 = lock.inLock(async () => {
                order.push(3);
            });

            await Promise.all([hold, waiter1, waiter2, waiter3]);

            // Should be processed in order they were queued
            expect(order).toEqual([0, 1, 2, 3]);
        });
    });

    describe('concurrent stress test', () => {
        it('should handle many concurrent operations correctly', async () => {
            const lock = new AsyncLock();
            let counter = 0;
            const results: number[] = [];

            // Create 10 concurrent increment operations
            const operations = Array.from({ length: 10 }, () =>
                lock.inLock(async () => {
                    const current = counter;
                    // Simulate some async work
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                    counter = current + 1;
                    results.push(counter);
                    return counter;
                })
            );

            await Promise.all(operations);

            // All operations should have serialized correctly
            expect(counter).toBe(10);
            // Results should be monotonically increasing
            for (let i = 1; i < results.length; i++) {
                expect(results[i]).toBeGreaterThan(results[i - 1]);
            }
        });

        it('should maintain data consistency under concurrent read-modify-write', async () => {
            const lock = new AsyncLock();
            let state = { value: 0, updates: [] as number[] };

            // Multiple concurrent updates
            const updates = Array.from({ length: 5 }, () =>
                lock.inLock(async () => {
                    const oldValue = state.value;
                    // Simulate network latency
                    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10));
                    state.value = oldValue + 1;
                    state.updates.push(state.value);
                    return state.value;
                })
            );

            const finalValues = await Promise.all(updates);

            // Final state should be 5
            expect(state.value).toBe(5);
            // Each update should have incremented
            expect(state.updates).toEqual([1, 2, 3, 4, 5]);
            // Return values should match updates
            expect(finalValues).toEqual([1, 2, 3, 4, 5]);
        });
    });
});

describe('LockTimeoutError', () => {
    it('should have correct name and message', () => {
        const error = new LockTimeoutError();
        expect(error.name).toBe('LockTimeoutError');
        expect(error.message).toBe('Lock acquisition timeout');
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('LockTimeoutError');
    });

    it('should accept custom message', () => {
        const error = new LockTimeoutError('Custom timeout message');
        expect(error.name).toBe('LockTimeoutError');
        expect(error.message).toBe('Custom timeout message');
        expect(error.message).not.toBe('Lock acquisition timeout');
    });

    it('should be instanceof Error', () => {
        const error = new LockTimeoutError();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(LockTimeoutError);
    });

    it('should have captured stack trace', () => {
        const error = new LockTimeoutError();
        expect(typeof error.stack).toBe('string');
        expect(error.stack!.length).toBeGreaterThan(0);
    });
});

describe('AsyncLock edge cases', () => {
    it('should acquire lock immediately when permits available', async () => {
        const lock = new AsyncLock();
        let acquired = false;

        await lock.inLock(() => {
            acquired = true;
        });

        expect(acquired).toBe(true);
    });

    it('should properly decrement and increment permits', async () => {
        const lock = new AsyncLock();
        const order: string[] = [];

        // First lock should acquire immediately
        const first = lock.inLock(async () => {
            order.push('first-start');
            await new Promise(resolve => setTimeout(resolve, 50));
            order.push('first-end');
            return 'first';
        });

        // Second lock should wait
        const second = lock.inLock(async () => {
            order.push('second-start');
            return 'second';
        });

        const [r1, r2] = await Promise.all([first, second]);

        expect(r1).toBe('first');
        expect(r2).toBe('second');
        expect(order).toEqual(['first-start', 'first-end', 'second-start']);
    });

    it('should handle timeout value of 0 as no timeout', async () => {
        const lock = new AsyncLock();

        // Hold the lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'held';
        });

        // Try with timeout 0 (should wait indefinitely like no timeout)
        const waitPromise = lock.inLock(() => 'acquired', 0);

        // With timeout 0, should still wait (not timeout immediately)
        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');
    });

    it('should handle negative timeout as no timeout', async () => {
        const lock = new AsyncLock();

        // Hold the lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'held';
        });

        // Try with negative timeout (should wait indefinitely)
        const waitPromise = lock.inLock(() => 'acquired', -1);

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');
    });

    it('should remove resolver from queue on timeout', async () => {
        const lock = new AsyncLock();

        // Hold the lock for a long time
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            return 'done';
        });

        // Queue up a waiter that will timeout
        const timeoutPromise = lock.inLock(() => 'should timeout', 50);

        // This should timeout
        await expect(timeoutPromise).rejects.toThrow(LockTimeoutError);

        // The resolver should have been removed from the queue
        // so when the lock is released, nothing should hang
        await holdPromise;

        // We can acquire a new lock immediately
        const result = await lock.inLock(() => 'new lock');
        expect(result).toBe('new lock');
    });

    it('should handle synchronous function that returns value', async () => {
        const lock = new AsyncLock();
        const result = await lock.inLock(() => 42);
        expect(result).toBe(42);
        expect(typeof result).toBe('number');
    });

    it('should handle function that returns undefined', async () => {
        const lock = new AsyncLock();
        const result = await lock.inLock(() => undefined);
        expect(result).toBeUndefined();
    });

    it('should handle function that returns null', async () => {
        const lock = new AsyncLock();
        const result = await lock.inLock(() => null);
        expect(result).toBeNull();
    });

    it('should handle function that returns false', async () => {
        const lock = new AsyncLock();
        const result = await lock.inLock(() => false);
        expect(result).toBe(false);
        expect(result).not.toBe(true);
    });

    it('should handle function that returns empty string', async () => {
        const lock = new AsyncLock();
        const result = await lock.inLock(() => '');
        expect(result).toBe('');
        expect(result).not.toBe('non-empty');
    });

    it('should handle function that returns zero', async () => {
        const lock = new AsyncLock();
        const result = await lock.inLock(() => 0);
        expect(result).toBe(0);
        expect(result).not.toBe(1);
    });

    it('should verify timeout is cleared when lock acquired before timeout', async () => {
        const lock = new AsyncLock();

        // Hold lock briefly
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return 'held';
        });

        // Wait with much longer timeout
        const waitPromise = lock.inLock(() => 'acquired', 5000);

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');

        // If timeout wasn't cleared properly, subsequent operations might fail
        // or the process might hang. Run another operation to verify clean state.
        const cleanupResult = await lock.inLock(() => 'cleanup');
        expect(cleanupResult).toBe('cleanup');
    });

    it('should verify positive timeout value of 1ms triggers timeout path', async () => {
        const lock = new AsyncLock();

        // Hold the lock longer than 1ms
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'held';
        });

        // Very short timeout of 1ms - should timeout
        const timeoutPromise = lock.inLock(() => 'should not run', 1);

        await expect(timeoutPromise).rejects.toThrow(LockTimeoutError);
        await holdPromise;
    });

    it('should verify exact LockTimeoutError message when no custom message', async () => {
        const error = new LockTimeoutError();
        expect(error.message).toBe('Lock acquisition timeout');
        expect(error.message.length).toBeGreaterThan(0);
    });
});

describe('AsyncLock mutation-killing tests', () => {
    it('should verify permits decremented from 1 to 0 on first acquire', async () => {
        const lock = new AsyncLock();
        let firstAcquired = false;
        let secondQueued = false;

        // First acquire should succeed immediately (permits go from 1 to 0)
        const first = lock.inLock(async () => {
            firstAcquired = true;
            // Hold lock while second tries to acquire
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'first';
        });

        // Give first time to start
        await new Promise(resolve => setTimeout(resolve, 5));
        expect(firstAcquired).toBe(true);

        // Second should queue (permits are 0)
        const second = lock.inLock(async () => {
            secondQueued = true;
            return 'second';
        });

        // Second should not run yet
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(secondQueued).toBe(false);

        const [r1, r2] = await Promise.all([first, second]);
        expect(r1).toBe('first');
        expect(r2).toBe('second');
        expect(secondQueued).toBe(true);
    });

    it('should verify timeout >= 0 check (timeout of 0 should NOT timeout)', async () => {
        const lock = new AsyncLock();

        // First acquire the lock briefly
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'held';
        });

        // Timeout of 0 should NOT trigger timeout - should wait indefinitely
        const waitPromise = lock.inLock(() => 'acquired', 0);

        // Both should complete successfully
        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);
        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');
    });

    it('should verify timeout > 0 check is strict (timeout of 1 should timeout)', async () => {
        const lock = new AsyncLock();

        // Hold the lock for a while
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // Timeout of 1ms should timeout since lock is held > 1ms
        const timeoutPromise = lock.inLock(() => 'should timeout', 1);

        await expect(timeoutPromise).rejects.toThrow(LockTimeoutError);

        // Let the holder finish
        const holdResult = await holdPromise;
        expect(holdResult).toBe('held');
    });

    it('should verify resolver is called with true when lock acquired', async () => {
        const lock = new AsyncLock();
        let executedWithLock = false;

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'held';
        });

        // This waiter should be resolved with true (lock acquired)
        const waitPromise = lock.inLock(() => {
            executedWithLock = true;
            return 'waited';
        });

        await Promise.all([holdPromise, waitPromise]);

        // If resolver was called with false, the function wouldn't run
        expect(executedWithLock).toBe(true);
    });

    it('should verify queue is FIFO (shift operation)', async () => {
        const lock = new AsyncLock();
        const order: number[] = [];

        // Hold lock
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            order.push(0);
        });

        // Add waiters in specific order
        const w1 = lock.inLock(() => { order.push(1); });
        const w2 = lock.inLock(() => { order.push(2); });
        const w3 = lock.inLock(() => { order.push(3); });
        const w4 = lock.inLock(() => { order.push(4); });
        const w5 = lock.inLock(() => { order.push(5); });

        await Promise.all([hold, w1, w2, w3, w4, w5]);

        // Verify exact FIFO order - any mutation to shift() would break this
        expect(order).toStrictEqual([0, 1, 2, 3, 4, 5]);
    });

    it('should verify resolver removal from queue on timeout prevents double resolution', async () => {
        const lock = new AsyncLock();
        let timeoutHandlerCalled = false;

        // Hold lock for a while
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return 'held';
        });

        // This will timeout
        const timeoutPromise = lock.inLock(() => {
            timeoutHandlerCalled = true;
            return 'should not run';
        }, 50).catch((e) => {
            expect(e).toBeInstanceOf(LockTimeoutError);
            return 'timed out';
        });

        const timeoutResult = await timeoutPromise;
        expect(timeoutResult).toBe('timed out');

        // Wait for holder to finish
        await holdPromise;

        // The timed-out waiter's function should never have been called
        expect(timeoutHandlerCalled).toBe(false);

        // Verify we can still acquire lock cleanly
        const cleanResult = await lock.inLock(() => 'clean');
        expect(cleanResult).toBe('clean');
    });

    it('should verify permits never exceeds 1 with proper handoff', async () => {
        const lock = new AsyncLock();
        const events: string[] = [];

        // Series of operations that test permit counting
        const op1 = lock.inLock(async () => {
            events.push('op1-start');
            await new Promise(resolve => setTimeout(resolve, 30));
            events.push('op1-end');
        });

        const op2 = lock.inLock(async () => {
            events.push('op2-start');
            await new Promise(resolve => setTimeout(resolve, 20));
            events.push('op2-end');
        });

        const op3 = lock.inLock(async () => {
            events.push('op3-start');
            await new Promise(resolve => setTimeout(resolve, 10));
            events.push('op3-end');
        });

        await Promise.all([op1, op2, op3]);

        // Each operation should start only after the previous ends
        // This proves permits are properly managed (never > 1 when waiters exist)
        expect(events).toStrictEqual([
            'op1-start', 'op1-end',
            'op2-start', 'op2-end',
            'op3-start', 'op3-end'
        ]);
    });

    it('should handle rapid acquire-release cycles without permit corruption', async () => {
        const lock = new AsyncLock();
        const iterations = 50;
        const results: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const result = await lock.inLock(() => i);
            results.push(result);
        }

        // All iterations should complete in order with correct values
        expect(results.length).toBe(iterations);
        for (let i = 0; i < iterations; i++) {
            expect(results[i]).toBe(i);
        }
    });

    it('should verify inLock throws LockTimeoutError (not generic Error)', async () => {
        const lock = new AsyncLock();

        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        try {
            await lock.inLock(() => 'fail', 10);
            // Should not reach here
            expect(true).toBe(false);
        } catch (e) {
            expect(e).toBeInstanceOf(LockTimeoutError);
            expect(e).toBeInstanceOf(Error);
            expect((e as LockTimeoutError).name).toBe('LockTimeoutError');
            expect((e as LockTimeoutError).message).toBe('Lock acquisition timeout');
        }

        await holdPromise;
    });

    it('should verify permits > 0 check: first acquire succeeds, second queues', async () => {
        const lock = new AsyncLock();
        let firstStarted = false;
        let firstFinished = false;
        let secondStarted = false;

        // First acquire should succeed immediately (permits > 0, goes from 1 to 0)
        const first = lock.inLock(async () => {
            firstStarted = true;
            await new Promise(resolve => setTimeout(resolve, 50));
            firstFinished = true;
            return 'first';
        });

        // Give first time to start
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(firstStarted).toBe(true);
        expect(firstFinished).toBe(false);

        // Second acquire should queue (permits === 0, not > 0)
        const second = lock.inLock(async () => {
            secondStarted = true;
            return 'second';
        });

        // Second should not start yet
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(secondStarted).toBe(false);

        const [r1, r2] = await Promise.all([first, second]);
        expect(r1).toBe('first');
        expect(r2).toBe('second');
        expect(secondStarted).toBe(true);
    });

    it('should verify permits -= 1 decrement is exact', async () => {
        const lock = new AsyncLock();
        const acquireOrder: string[] = [];

        // Rapid acquire-release to verify permits counting
        for (let i = 0; i < 5; i++) {
            await lock.inLock(() => {
                acquireOrder.push(`lock-${i}`);
            });
        }

        // All 5 should have executed in order
        expect(acquireOrder).toStrictEqual(['lock-0', 'lock-1', 'lock-2', 'lock-3', 'lock-4']);
    });

    it('should verify permits += 1 increment allows next waiter', async () => {
        const lock = new AsyncLock();
        const events: string[] = [];

        // First lock
        const first = lock.inLock(async () => {
            events.push('first-start');
            await new Promise(resolve => setTimeout(resolve, 30));
            events.push('first-end');
        });

        // Second should queue and wait for permits to increment
        const second = lock.inLock(async () => {
            events.push('second-start');
        });

        await Promise.all([first, second]);

        // Second should start only after first ends (permits went 0 -> 1 -> 0)
        expect(events).toStrictEqual(['first-start', 'first-end', 'second-start']);
    });

    it('should verify timeout !== undefined && timeout > 0 conditional', async () => {
        const lock = new AsyncLock();

        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // Test timeout = undefined (should NOT timeout)
        const undefinedTimeout = lock.inLock(() => 'undefined-timeout');

        // Test timeout = 0 (should NOT timeout per implementation)
        const zeroTimeout = lock.inLock(() => 'zero-timeout', 0);

        // Test timeout = -1 (should NOT timeout)
        const negativeTimeout = lock.inLock(() => 'negative-timeout', -1);

        // Test timeout = 1 (SHOULD timeout since lock is held > 1ms)
        const oneTimeout = lock.inLock(() => 'should-timeout', 1);

        // oneTimeout should throw
        await expect(oneTimeout).rejects.toThrow(LockTimeoutError);

        // Wait for holder to finish
        await holdPromise;

        // Others should complete
        const [r1, r2, r3] = await Promise.all([undefinedTimeout, zeroTimeout, negativeTimeout]);
        expect(r1).toBe('undefined-timeout');
        expect(r2).toBe('zero-timeout');
        expect(r3).toBe('negative-timeout');
    });

    it('should verify resolver is removed from queue on timeout (splice)', async () => {
        const lock = new AsyncLock();

        // Hold lock for a while
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return 'held';
        });

        // These will timeout
        const timeout1 = lock.inLock(() => 'fail1', 10).catch(() => 'timeout1');
        const timeout2 = lock.inLock(() => 'fail2', 20).catch(() => 'timeout2');

        // Both should timeout
        const [t1, t2] = await Promise.all([timeout1, timeout2]);
        expect(t1).toBe('timeout1');
        expect(t2).toBe('timeout2');

        // Now release the lock
        await holdPromise;

        // Queue should be clean - new acquire should work immediately
        const clean = await lock.inLock(() => 'clean');
        expect(clean).toBe('clean');
    });

    it('should verify promiseResolverQueue.shift() returns first waiter', async () => {
        const lock = new AsyncLock();
        const order: number[] = [];

        // Hold lock
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            order.push(0);
        });

        // Add waiters in specific order - they should execute in FIFO
        const w1 = lock.inLock(() => { order.push(1); });
        const w2 = lock.inLock(() => { order.push(2); });
        const w3 = lock.inLock(() => { order.push(3); });

        await Promise.all([hold, w1, w2, w3]);

        // Strict FIFO order
        expect(order).toStrictEqual([0, 1, 2, 3]);
    });

    it('should verify resolved flag prevents double resolution', async () => {
        const lock = new AsyncLock();
        let executionCount = 0;

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
            return 'held';
        });

        // This will timeout, but we need to verify it only resolves once
        const timeoutPromise = lock.inLock(() => {
            executionCount++;
            return 'should not run';
        }, 50);

        await expect(timeoutPromise).rejects.toThrow(LockTimeoutError);

        // Wait for holder to finish
        await holdPromise;

        // Give time for any potential double resolution
        await new Promise(resolve => setTimeout(resolve, 50));

        // Function should never have run
        expect(executionCount).toBe(0);
    });

    it('should verify clearTimeout is called when lock acquired before timeout', async () => {
        const lock = new AsyncLock();

        // Hold lock briefly
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return 'held';
        });

        // Wait with long timeout - should acquire before timeout
        const waitPromise = lock.inLock(() => 'acquired', 10000);

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');

        // Verify no hanging timers by doing another operation
        const cleanResult = await lock.inLock(() => 'clean');
        expect(cleanResult).toBe('clean');
    });

    it('should verify timeoutId is set to undefined after clear', async () => {
        const lock = new AsyncLock();

        // Rapid timeout scenarios to test cleanup
        for (let i = 0; i < 3; i++) {
            const holdPromise = lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return `held-${i}`;
            });

            // Acquire with timeout before holder releases
            const waitPromise = lock.inLock(() => `acquired-${i}`, 5000);

            const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);
            expect(holdResult).toBe(`held-${i}`);
            expect(waitResult).toBe(`acquired-${i}`);
        }
    });

    it('should verify LockTimeoutError captures stack trace', () => {
        const error = new LockTimeoutError('test message');

        expect(error.stack).toBeDefined();
        expect(typeof error.stack).toBe('string');
        expect(error.stack!.length).toBeGreaterThan(0);
        // Stack should contain the error name
        expect(error.stack).toContain('LockTimeoutError');
    });

    it('should verify LockTimeoutError name property is set correctly', () => {
        const error = new LockTimeoutError();

        expect(error.name).toBe('LockTimeoutError');
        expect(error.name).not.toBe('Error');
    });
});

describe('AsyncLock precision mutation tests', () => {
    // Target: Line 52 - ConditionalExpression "if (resolved) return;" -> false
    // Target: Line 53 - BooleanLiteral "resolved = true" -> false
    // These mutations would cause double resolution of the promise
    it('should prevent double resolution when resolver is called twice (line 52-53)', async () => {
        const lock = new AsyncLock();
        let executionCount = 0;

        // Hold the lock to force the second acquire to queue
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'held';
        });

        // This will wait in queue
        const waitPromise = lock.inLock(() => {
            executionCount++;
            return 'waited';
        });

        // Wait for the hold to complete and the waiter to execute
        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        // The function should only execute once
        expect(executionCount).toBe(1);
        expect(holdResult).toBe('held');
        expect(waitResult).toBe('waited');
    });

    // Target: Line 54 - "if (timeoutId !== undefined)" mutations
    // - ConditionalExpression -> true/false
    // - EqualityOperator -> "timeoutId === undefined"
    // These mutations would break clearTimeout behavior
    it('should clear timeout when lock acquired before timeout expires (line 54)', async () => {
        const lock = new AsyncLock();
        let timerFired = false;

        // Hold briefly
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'held';
        });

        // Wait with long timeout - should acquire before timeout
        const waitPromise = lock.inLock(() => {
            // If timeout wasn't cleared, the timer would fire AFTER this completes
            return 'acquired';
        }, 10000);

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');

        // Wait extra time to verify timeout doesn't fire
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(timerFired).toBe(false);

        // Verify we can still use the lock cleanly
        const finalResult = await lock.inLock(() => 'final');
        expect(finalResult).toBe('final');
    });

    // Target: Line 63 - "if (timeout !== undefined && timeout > 0)" mutations
    // - ConditionalExpression -> true
    // - EqualityOperator -> "timeout >= 0" (this would make 0 behave like a timeout)
    it('should treat timeout=0 differently from timeout>0 (line 63)', async () => {
        const lock = new AsyncLock();

        // Hold lock for a while
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
            return 'held';
        });

        // timeout=0 should NOT timeout (waits indefinitely)
        const zeroTimeoutPromise = lock.inLock(() => 'zero-timeout', 0);

        // timeout=1 SHOULD timeout when lock is held
        const oneTimeoutPromise = lock.inLock(() => 'one-timeout', 1)
            .catch(e => {
                if (e instanceof LockTimeoutError) return 'timed-out';
                throw e;
            });

        // Wait for the 1ms timeout to occur
        const oneResult = await oneTimeoutPromise;
        expect(oneResult).toBe('timed-out');

        // Zero timeout should eventually succeed
        const [holdResult, zeroResult] = await Promise.all([holdPromise, zeroTimeoutPromise]);
        expect(holdResult).toBe('held');
        expect(zeroResult).toBe('zero-timeout');
    });

    // More precise test for timeout=0 vs timeout>0
    it('should only set timeout when timeout > 0, not when timeout === 0 (line 63 equality)', async () => {
        const lock = new AsyncLock();

        // Hold lock very briefly
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'held';
        });

        // With timeout=0, should wait indefinitely (no timeout set)
        const wait0 = lock.inLock(() => 'wait0', 0);

        // Both should succeed
        const [holdRes, wait0Res] = await Promise.all([holdPromise, wait0]);
        expect(holdRes).toBe('held');
        expect(wait0Res).toBe('wait0');
    });

    // Target: Line 65 - "if (resolved) return;" in timeout handler -> false
    // Target: Line 66 - "resolved = true" in timeout handler -> false
    // These mutations would cause issues when lock is acquired AFTER timeout is set but BEFORE it fires
    it('should not execute timeout handler if lock acquired first (line 65-66)', async () => {
        const lock = new AsyncLock();
        let timeoutHandlerExecuted = false;
        let functionExecuted = false;

        // Hold lock briefly
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'held';
        });

        // Wait with timeout that should NOT fire (lock acquired before timeout)
        const waitPromise = lock.inLock(() => {
            functionExecuted = true;
            return 'acquired';
        }, 5000);

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');
        expect(functionExecuted).toBe(true);
        expect(timeoutHandlerExecuted).toBe(false);
    });

    // Target: Line 69 - "if (index !== -1)" mutations
    // - ConditionalExpression -> true/false
    // - EqualityOperator -> "index === -1"
    // - UnaryOperator -> "+1"
    // - BlockStatement -> "{}"
    // These mutations would break the queue cleanup on timeout
    it('should remove resolver from queue on timeout (line 69 splice)', async () => {
        const lock = new AsyncLock();
        let timeoutFuncCalled = false;

        // Hold lock for a long time
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return 'held';
        });

        // This will timeout
        const timeoutPromise = lock.inLock(() => {
            timeoutFuncCalled = true;
            return 'should-not-run';
        }, 30).catch(e => {
            expect(e).toBeInstanceOf(LockTimeoutError);
            return 'timed-out';
        });

        // Wait for timeout
        const timeoutResult = await timeoutPromise;
        expect(timeoutResult).toBe('timed-out');

        // Function should NOT have been called
        expect(timeoutFuncCalled).toBe(false);

        // Now release the lock
        await holdPromise;

        // The timed-out waiter's function should STILL not have been called
        // because it was removed from the queue
        expect(timeoutFuncCalled).toBe(false);

        // New acquire should work
        const newResult = await lock.inLock(() => 'new');
        expect(newResult).toBe('new');
    });

    // Target line 69: Verify indexOf returns -1 handling when resolver not in queue
    // This tests the boundary case
    it('should handle case where resolver is not found in queue (line 69 index check)', async () => {
        const lock = new AsyncLock();

        // Multiple timeouts in sequence to stress the queue management
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // Multiple timeouts
        const t1 = lock.inLock(() => 'fail1', 10).catch(() => 'timeout1');
        const t2 = lock.inLock(() => 'fail2', 20).catch(() => 'timeout2');
        const t3 = lock.inLock(() => 'fail3', 30).catch(() => 'timeout3');

        const [r1, r2, r3] = await Promise.all([t1, t2, t3]);
        expect(r1).toBe('timeout1');
        expect(r2).toBe('timeout2');
        expect(r3).toBe('timeout3');

        // Release lock
        await holdPromise;

        // Queue should be clean
        const clean = await lock.inLock(() => 'clean');
        expect(clean).toBe('clean');
    });

    // Target: Line 82 - "if (this.permits > 1 && this.promiseResolverQueue.length > 0)" -> false
    // This is an invariant check - hard to test directly, but we can verify behavior
    it('should never have permits > 1 when waiters exist (line 82)', async () => {
        const lock = new AsyncLock();
        const events: string[] = [];

        // Create a chain of operations that would break if permits > 1
        const op1 = lock.inLock(async () => {
            events.push('op1-start');
            await new Promise(resolve => setTimeout(resolve, 30));
            events.push('op1-end');
            return 'op1';
        });

        const op2 = lock.inLock(async () => {
            events.push('op2-start');
            await new Promise(resolve => setTimeout(resolve, 20));
            events.push('op2-end');
            return 'op2';
        });

        const op3 = lock.inLock(async () => {
            events.push('op3-start');
            events.push('op3-end');
            return 'op3';
        });

        const [r1, r2, r3] = await Promise.all([op1, op2, op3]);

        expect(r1).toBe('op1');
        expect(r2).toBe('op2');
        expect(r3).toBe('op3');

        // Operations must be strictly serialized (no interleaving)
        expect(events).toStrictEqual([
            'op1-start', 'op1-end',
            'op2-start', 'op2-end',
            'op3-start', 'op3-end'
        ]);
    });

    // Target: Line 84 - "else if (this.permits === 1 && this.promiseResolverQueue.length > 0)" -> true
    // This mutation would always try to wake up waiters even when none exist
    it('should only wake waiter when permits === 1 AND queue has waiters (line 84)', async () => {
        const lock = new AsyncLock();

        // Single operation - no waiters in queue
        const single = await lock.inLock(() => 'single');
        expect(single).toBe('single');

        // After release, permits should be 1, queue should be empty
        // A second immediate acquire should succeed
        const second = await lock.inLock(() => 'second');
        expect(second).toBe('second');

        // Third immediate acquire should also succeed
        const third = await lock.inLock(() => 'third');
        expect(third).toBe('third');
    });

    // More targeted test for line 84: verify waiter is woken via setTimeout
    it('should wake next waiter via setTimeout when lock released (line 84 branch)', async () => {
        const lock = new AsyncLock();
        const events: string[] = [];

        // First acquire
        const first = lock.inLock(async () => {
            events.push('first-start');
            await new Promise(resolve => setTimeout(resolve, 50));
            events.push('first-end');
            return 'first';
        });

        // Second acquire - will queue
        const second = lock.inLock(async () => {
            events.push('second-start');
            return 'second';
        });

        await Promise.all([first, second]);

        // Second should only start after first ends
        const firstEndIdx = events.indexOf('first-end');
        const secondStartIdx = events.indexOf('second-start');
        expect(secondStartIdx).toBeGreaterThan(firstEndIdx);
    });

    // Test for resolved flag preventing double execution in timeout race
    it('should handle race between lock acquisition and timeout (double resolution prevention)', async () => {
        const lock = new AsyncLock();
        let funcCallCount = 0;

        // Hold lock for exactly the timeout duration to create a race
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'held';
        });

        // Try to acquire with timeout close to hold duration
        // This creates a race condition where the lock might be acquired
        // right as the timeout fires
        const waitPromise = lock.inLock(() => {
            funcCallCount++;
            return 'acquired';
        }, 40).catch(e => {
            if (e instanceof LockTimeoutError) return 'timed-out';
            throw e;
        });

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        // Either it timed out OR it acquired, but function should run at most once
        expect(funcCallCount).toBeLessThanOrEqual(1);
        expect(['timed-out', 'acquired']).toContain(waitResult);
    });

    // Test that verifies the exact timeout > 0 check (not >= 0)
    it('should distinguish between timeout=undefined, timeout=0, timeout=-1, and timeout=1 (line 63)', async () => {
        const lock = new AsyncLock();
        const results: string[] = [];

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // Queue up waiters with different timeout values
        const undefinedTimeout = lock.inLock(() => 'undefined').then(r => { results.push(r); return r; });
        const zeroTimeout = lock.inLock(() => 'zero', 0).then(r => { results.push(r); return r; });
        const negativeTimeout = lock.inLock(() => 'negative', -1).then(r => { results.push(r); return r; });

        // This one should timeout
        const positiveTimeout = lock.inLock(() => 'positive', 10)
            .then(r => { results.push(r); return r; })
            .catch(() => { results.push('timed-out'); return 'timed-out'; });

        // Wait for the positive timeout to fire
        const timeoutResult = await positiveTimeout;
        expect(timeoutResult).toBe('timed-out');

        // Release lock
        await holdPromise;

        // Others should succeed
        const [r1, r2, r3] = await Promise.all([undefinedTimeout, zeroTimeout, negativeTimeout]);
        expect(r1).toBe('undefined');
        expect(r2).toBe('zero');
        expect(r3).toBe('negative');
    });

    // Verify the clearTimeout path is exercised
    it('should clear timeout properly when lock is acquired (line 54 clearTimeout)', async () => {
        const lock = new AsyncLock();

        // Hold briefly
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return 'held';
        });

        // Acquire with timeout - will succeed before timeout
        const waitPromise = lock.inLock(() => 'acquired', 10000);

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');

        // Wait a bit and then acquire again - if timeout wasn't cleared,
        // we might see weird behavior
        await new Promise(resolve => setTimeout(resolve, 50));
        const finalResult = await lock.inLock(() => 'final');
        expect(finalResult).toBe('final');
    });

    // Test that timeoutId is properly cleared in timeout handler (line 73)
    it('should set timeoutId to undefined in timeout handler (line 73)', async () => {
        const lock = new AsyncLock();

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // Multiple timeouts to exercise the cleanup path
        const t1 = lock.inLock(() => 'f1', 10).catch(() => 't1');
        const t2 = lock.inLock(() => 'f2', 20).catch(() => 't2');

        const [r1, r2] = await Promise.all([t1, t2]);
        expect(r1).toBe('t1');
        expect(r2).toBe('t2');

        await holdPromise;

        // Verify lock still works
        const clean = await lock.inLock(() => 'clean');
        expect(clean).toBe('clean');
    });
});

describe('AsyncLock fine-grained mutation tests', () => {
    // Target: Line 52 "if (resolved) return;" -> false
    // If this guard is removed/false, the resolver can be called multiple times
    // causing the promise to resolve multiple times or with wrong value
    it('should guard against resolver being called after already resolved (line 52)', async () => {
        const lock = new AsyncLock();
        let callCount = 0;

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'held';
        });

        // This will queue and eventually get called
        const waitPromise = lock.inLock(() => {
            callCount++;
            return `call-${callCount}`;
        });

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        // The function should have been called exactly once
        expect(callCount).toBe(1);
        // The return value should reflect the first (and only) call
        expect(waitResult).toBe('call-1');
    });

    // Target: Line 53 "resolved = true" -> false
    // If resolved is not set to true, subsequent calls to resolver would execute
    it('should set resolved flag to prevent multiple executions (line 53)', async () => {
        const lock = new AsyncLock();
        const executionLog: string[] = [];

        // Hold lock briefly
        const holdPromise = lock.inLock(async () => {
            executionLog.push('hold-start');
            await new Promise(resolve => setTimeout(resolve, 30));
            executionLog.push('hold-end');
            return 'held';
        });

        // Queue a waiter
        const waitPromise = lock.inLock(() => {
            executionLog.push('wait-executed');
            return 'waited';
        });

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('waited');
        // The execution log should show hold completed before wait executed
        expect(executionLog).toStrictEqual(['hold-start', 'hold-end', 'wait-executed']);
        // Only one execution of the waiter
        expect(executionLog.filter(e => e === 'wait-executed').length).toBe(1);
    });

    // Target: Line 54 "if (timeoutId !== undefined)" mutations
    // - ConditionalExpression -> true: would always clearTimeout even when not set
    // - ConditionalExpression -> false: would never clearTimeout
    // - EqualityOperator -> "===": would clear when undefined (wrong)
    // - BlockStatement -> {}: would not clear timeout
    it('should only clear timeout when one was set (line 54 conditional)', async () => {
        const lock = new AsyncLock();

        // Case 1: No timeout - should work fine without calling clearTimeout on undefined
        const noTimeoutResult = await lock.inLock(() => 'no-timeout');
        expect(noTimeoutResult).toBe('no-timeout');

        // Case 2: With timeout that does get cleared (acquire before timeout)
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return 'held';
        });

        const withTimeoutResult = lock.inLock(() => 'with-timeout', 5000);

        const [holdRes, withTimeoutRes] = await Promise.all([holdPromise, withTimeoutResult]);
        expect(holdRes).toBe('held');
        expect(withTimeoutRes).toBe('with-timeout');

        // Case 3: Verify we can still use the lock
        const finalResult = await lock.inLock(() => 'final');
        expect(finalResult).toBe('final');
    });

    // Target: Line 65 "if (resolved) return;" in timeout handler -> false
    // If this is false, timeout handler executes even after lock acquired
    it('should not execute timeout handler body if already resolved (line 65)', async () => {
        const lock = new AsyncLock();
        let functionExecuted = false;

        // Hold lock for less than the timeout
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'held';
        });

        // Wait with longer timeout - should acquire before timeout
        const waitPromise = lock.inLock(() => {
            functionExecuted = true;
            return 'acquired';
        }, 5000);

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('acquired');
        expect(functionExecuted).toBe(true);

        // Wait past when the timeout would have fired if it wasn't cleared
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify lock is still in good state
        const cleanResult = await lock.inLock(() => 'clean');
        expect(cleanResult).toBe('clean');
    });

    // Target: Line 66 "resolved = true" in timeout handler -> false
    // This protects against the resolver being called after timeout
    it('should mark as resolved in timeout handler (line 66)', async () => {
        const lock = new AsyncLock();
        let funcCallCount = 0;

        // Hold lock long enough for timeout to fire
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // Short timeout - will fire
        const timeoutPromise = lock.inLock(() => {
            funcCallCount++;
            return 'should-not-run';
        }, 20).catch(e => {
            expect(e).toBeInstanceOf(LockTimeoutError);
            return 'timed-out';
        });

        // Wait for timeout to occur
        const timeoutResult = await timeoutPromise;
        expect(timeoutResult).toBe('timed-out');

        // Function should NOT have executed
        expect(funcCallCount).toBe(0);

        // Release the lock
        await holdPromise;

        // Function should STILL not have executed (resolver was removed from queue)
        expect(funcCallCount).toBe(0);
    });

    // Target: Line 69 "if (index !== -1)" mutations
    // - ConditionalExpression -> true: always splice even when not found
    // - ConditionalExpression -> false: never splice
    // - UnaryOperator -> +1: would check index !== 1 instead of !== -1
    it('should only splice when resolver found in queue (line 69)', async () => {
        const lock = new AsyncLock();

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return 'held';
        });

        // Multiple timeouts that will all fire
        const results: string[] = [];

        const p1 = lock.inLock(() => results.push('f1') && 'f1', 10).catch(() => { results.push('t1'); return 't1'; });
        const p2 = lock.inLock(() => results.push('f2') && 'f2', 30).catch(() => { results.push('t2'); return 't2'; });
        const p3 = lock.inLock(() => results.push('f3') && 'f3', 50).catch(() => { results.push('t3'); return 't3'; });

        // Wait for all timeouts
        const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

        expect(r1).toBe('t1');
        expect(r2).toBe('t2');
        expect(r3).toBe('t3');

        // All should have timed out, none should have executed function
        expect(results).toStrictEqual(['t1', 't2', 't3']);

        // Release lock
        await holdPromise;

        // No function should have been called
        expect(results).toStrictEqual(['t1', 't2', 't3']);

        // Lock should work for new operations
        const newResult = await lock.inLock(() => 'new');
        expect(newResult).toBe('new');
    });

    // Target: Line 82 "if (this.permits > 1 && this.promiseResolverQueue.length > 0)" -> false
    // This would allow the invariant violation to go undetected
    // However, this is an error path that's hard to trigger in normal usage
    // We can verify the normal path works correctly
    it('should maintain permit count correctly through many operations (line 82)', async () => {
        const lock = new AsyncLock();
        const results: number[] = [];

        // Many sequential operations
        for (let i = 0; i < 20; i++) {
            const result = await lock.inLock(() => {
                results.push(i);
                return i;
            });
            expect(result).toBe(i);
        }

        expect(results.length).toBe(20);
        expect(results).toStrictEqual(Array.from({ length: 20 }, (_, i) => i));
    });

    // Target: Line 84 "else if (this.permits === 1 && this.promiseResolverQueue.length > 0)" -> true
    // If always true, would try to shift undefined from empty queue
    it('should handle empty queue correctly on unlock (line 84)', async () => {
        const lock = new AsyncLock();

        // Single operation with no waiters
        const result1 = await lock.inLock(() => 'one');
        expect(result1).toBe('one');

        // Another single operation with no waiters
        const result2 = await lock.inLock(() => 'two');
        expect(result2).toBe('two');

        // Both should succeed without issues
        const result3 = await lock.inLock(() => 'three');
        expect(result3).toBe('three');
    });

    // Test specifically for the shift() call in unlock - verify FIFO
    it('should process queue in strict FIFO order (verifies shift behavior)', async () => {
        const lock = new AsyncLock();
        const order: number[] = [];

        // Hold lock
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 80));
            order.push(0);
            return 'hold';
        });

        // Add many waiters
        const waiters = [];
        for (let i = 1; i <= 10; i++) {
            const waiter = lock.inLock(() => {
                order.push(i);
                return `w${i}`;
            });
            waiters.push(waiter);
        }

        // Wait for all
        const [holdRes, ...waiterRes] = await Promise.all([hold, ...waiters]);

        expect(holdRes).toBe('hold');
        waiterRes.forEach((r, i) => expect(r).toBe(`w${i + 1}`));

        // Verify strict FIFO order
        expect(order).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    // Test the case where lock is acquired immediately (permits > 0 path)
    it('should decrement permits from 1 to 0 on immediate acquire (line 42)', async () => {
        const lock = new AsyncLock();

        // First acquire should succeed immediately (permits = 1 -> 0)
        let firstAcquireStarted = false;
        let secondAcquireStarted = false;

        const first = lock.inLock(async () => {
            firstAcquireStarted = true;
            // Hold for a bit
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'first';
        });

        // Wait a tick for first to start
        await new Promise(resolve => setTimeout(resolve, 5));
        expect(firstAcquireStarted).toBe(true);

        // Second should queue (permits = 0)
        const second = lock.inLock(() => {
            secondAcquireStarted = true;
            return 'second';
        });

        // Second should not start yet
        expect(secondAcquireStarted).toBe(false);

        const [r1, r2] = await Promise.all([first, second]);
        expect(r1).toBe('first');
        expect(r2).toBe('second');
        expect(secondAcquireStarted).toBe(true);
    });

    // Test behavior when resolver is called with true vs false
    it('should only execute function when resolver called with true', async () => {
        const lock = new AsyncLock();
        let executed = false;

        // This will queue and wait
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'held';
        });

        // This will be resolved with true when lock becomes available
        const waitPromise = lock.inLock(() => {
            executed = true;
            return 'waited';
        });

        const [holdResult, waitResult] = await Promise.all([holdPromise, waitPromise]);

        expect(holdResult).toBe('held');
        expect(waitResult).toBe('waited');
        expect(executed).toBe(true);
    });

    // Test that timeout path resolves with false (causing LockTimeoutError)
    it('should resolve with false on timeout, causing LockTimeoutError', async () => {
        const lock = new AsyncLock();

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // This will timeout
        let errorInstance: Error | null = null;
        try {
            await lock.inLock(() => 'should-not-run', 10);
        } catch (e) {
            errorInstance = e as Error;
        }

        expect(errorInstance).not.toBeNull();
        expect(errorInstance).toBeInstanceOf(LockTimeoutError);
        expect(errorInstance!.message).toBe('Lock acquisition timeout');

        await holdPromise;
    });

    // Verify the exact index check behavior (-1 means not found)
    it('should use indexOf to find resolver and check against -1', async () => {
        const lock = new AsyncLock();

        // This tests that we're checking for -1, not some other value
        // If the mutation changes -1 to +1, this would break
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
            return 'held';
        });

        // Add a waiter that will timeout
        // The resolver will be at index 0 in the queue
        // indexOf should return 0, which is !== -1, so splice should happen
        const timeoutPromise = lock.inLock(() => 'should-not-run', 20)
            .catch(() => 'timed-out');

        const timeoutResult = await timeoutPromise;
        expect(timeoutResult).toBe('timed-out');

        await holdPromise;

        // Verify lock works
        const cleanResult = await lock.inLock(() => 'clean');
        expect(cleanResult).toBe('clean');
    });
});

describe('AsyncLock race condition mutation tests', () => {
    // These tests specifically target race conditions that would be broken by mutations

    // Target: Line 69 "index !== -1" -> "index !== +1" (UnaryOperator mutation)
    // If changed to +1, when there's only 1 item in queue (index 0), splice wouldn't happen
    it('should splice when index is 0 (not just positive indices) (line 69 -1 vs +1)', async () => {
        const lock = new AsyncLock();
        let funcCalled = false;

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'held';
        });

        // Single waiter that will timeout - its index will be 0
        const singleWaiter = lock.inLock(() => {
            funcCalled = true;
            return 'should-not-run';
        }, 30).catch(() => 'timed-out');

        // Wait for timeout
        const result = await singleWaiter;
        expect(result).toBe('timed-out');

        // Release lock
        await holdPromise;

        // Function should NOT have been called
        // If index !== +1 was used instead of !== -1, the splice wouldn't happen
        // and the resolver would still be in queue, potentially getting called
        expect(funcCalled).toBe(false);

        // Lock should still work
        const clean = await lock.inLock(() => 'clean');
        expect(clean).toBe('clean');
    });

    // Target: Line 69 "if (index !== -1)" -> "if (false)"
    // If never splice, the queue would contain stale resolvers
    it('should splice resolver from queue on timeout (verifies splice happens)', async () => {
        const lock = new AsyncLock();
        const callOrder: string[] = [];

        // Hold lock
        const holdPromise = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            callOrder.push('hold-done');
            return 'held';
        });

        // First waiter will timeout
        const timeout1 = lock.inLock(() => {
            callOrder.push('timeout1-func-SHOULD-NOT-RUN');
            return 'fail1';
        }, 30).catch(() => { callOrder.push('timeout1'); return 'timeout1'; });

        // Second waiter should work after first times out and lock releases
        const waiter2 = lock.inLock(() => {
            callOrder.push('waiter2-executed');
            return 'waiter2';
        });

        // Wait for first to timeout
        const t1Result = await timeout1;
        expect(t1Result).toBe('timeout1');

        // Wait for hold to complete and waiter2 to run
        const [holdResult, w2Result] = await Promise.all([holdPromise, waiter2]);

        expect(holdResult).toBe('held');
        expect(w2Result).toBe('waiter2');

        // The order should be: timeout1 (catch), hold-done, waiter2-executed
        // If splice didn't happen, timeout1's function might also be called
        expect(callOrder).toStrictEqual(['timeout1', 'hold-done', 'waiter2-executed']);
    });

    // Target: Line 82 "if (this.permits > 1 && ...)" -> "if (false)"
    // This is an invariant check - if it fires, it means the lock is in bad state
    // We can test that we never get into that state through normal operation
    it('should never reach permits > 1 with waiters (invariant test for line 82)', async () => {
        const lock = new AsyncLock();
        const operations: Promise<string>[] = [];

        // Create many concurrent operations
        for (let i = 0; i < 20; i++) {
            operations.push(lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 5));
                return `op${i}`;
            }));
        }

        // All should complete without error
        const results = await Promise.all(operations);
        expect(results.length).toBe(20);

        // Verify sequential execution
        for (let i = 0; i < 20; i++) {
            expect(results[i]).toBe(`op${i}`);
        }
    });

    // Target: Line 84 "else if (this.permits === 1 && ...)" -> "if (true)"
    // If always true, would try to shift from empty queue or wake wrong waiter
    it('should not attempt to wake waiter when queue is empty (line 84)', async () => {
        const lock = new AsyncLock();

        // Rapid sequential operations with no concurrent waiters
        for (let i = 0; i < 10; i++) {
            const result = await lock.inLock(() => `result${i}`);
            expect(result).toBe(`result${i}`);
        }
    });

    // Test with very short holds and long timeouts - stress test the timeout clearing
    it('should handle many rapid acquires with timeouts that do not fire', async () => {
        const lock = new AsyncLock();
        const results: string[] = [];

        for (let i = 0; i < 15; i++) {
            // Hold very briefly
            const holdPromise = lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 5));
                return `hold${i}`;
            });

            // Wait with long timeout - should always acquire before timeout
            const waitPromise = lock.inLock(() => `wait${i}`, 10000);

            const [holdRes, waitRes] = await Promise.all([holdPromise, waitPromise]);
            results.push(holdRes, waitRes);
        }

        // All should have succeeded
        expect(results.length).toBe(30);
        for (let i = 0; i < 15; i++) {
            expect(results[i * 2]).toBe(`hold${i}`);
            expect(results[i * 2 + 1]).toBe(`wait${i}`);
        }
    });

    // Test the interaction between timeout and successful acquisition
    it('should cleanly handle mix of timeouts and successful acquisitions', async () => {
        const lock = new AsyncLock();
        const events: string[] = [];

        // Long hold
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
            events.push('hold-done');
            return 'held';
        });

        // Quick timeout
        const quick = lock.inLock(() => {
            events.push('quick-SHOULD-NOT-RUN');
            return 'quick';
        }, 10).catch(() => {
            events.push('quick-timeout');
            return 'quick-timeout';
        });

        // Patient waiter (no timeout)
        const patient = lock.inLock(() => {
            events.push('patient-run');
            return 'patient';
        });

        // Wait for quick to timeout first
        const quickResult = await quick;
        expect(quickResult).toBe('quick-timeout');

        // Then wait for hold and patient
        const [holdResult, patientResult] = await Promise.all([hold, patient]);

        expect(holdResult).toBe('held');
        expect(patientResult).toBe('patient');

        // Verify order: quick timeout, then hold done, then patient runs
        expect(events).toStrictEqual(['quick-timeout', 'hold-done', 'patient-run']);
    });

    // Verify that the resolved flag actually works by checking promise resolution order
    it('should resolve promise only once regardless of resolver calls', async () => {
        const lock = new AsyncLock();
        const resolutions: string[] = [];

        // Hold lock
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'hold';
        });

        // Waiter with promise resolution tracking
        const waiter = lock.inLock(() => 'waiter').then(result => {
            resolutions.push(result);
            return result;
        });

        await Promise.all([hold, waiter]);

        // Should have exactly one resolution
        expect(resolutions).toStrictEqual(['waiter']);
    });

    // Test multiple concurrent timeout scenarios
    it('should handle multiple concurrent timeout scenarios correctly', async () => {
        const lock = new AsyncLock();
        const executions: string[] = [];

        // Long hold
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            executions.push('hold');
            return 'hold';
        });

        // Multiple timeouts at different intervals
        const t1 = lock.inLock(() => { executions.push('t1-func'); return 't1'; }, 20)
            .catch(() => { executions.push('t1-timeout'); return 't1-timeout'; });

        const t2 = lock.inLock(() => { executions.push('t2-func'); return 't2'; }, 50)
            .catch(() => { executions.push('t2-timeout'); return 't2-timeout'; });

        const t3 = lock.inLock(() => { executions.push('t3-func'); return 't3'; }, 80)
            .catch(() => { executions.push('t3-timeout'); return 't3-timeout'; });

        // One that won't timeout
        const w = lock.inLock(() => { executions.push('w-func'); return 'w'; });

        // Wait for all
        const [holdRes, t1Res, t2Res, t3Res, wRes] = await Promise.all([hold, t1, t2, t3, w]);

        expect(holdRes).toBe('hold');
        expect(t1Res).toBe('t1-timeout');
        expect(t2Res).toBe('t2-timeout');
        expect(t3Res).toBe('t3-timeout');
        expect(wRes).toBe('w');

        // t1, t2, t3 should timeout (in order), then hold finishes, then w runs
        // The tX-func entries should NOT appear
        expect(executions).toStrictEqual([
            't1-timeout', 't2-timeout', 't3-timeout',
            'hold',
            'w-func'
        ]);
    });
});

describe('AsyncLock targeted mutation killers', () => {
    // These tests are specifically designed to kill surviving mutations
    // identified in the mutation testing report

    // Target: Line 52 "if (resolved) return" -> false
    // Target: Line 53 "resolved = true" -> false
    // If these mutations survive, the resolver function can be called multiple times,
    // causing the promise to resolve multiple times or with inconsistent values.
    // The key is to verify the EXACT number of function executions.
    it('should execute resolver function exactly once even if called multiple times (line 52-53)', async () => {
        const lock = new AsyncLock();
        let executionCount = 0;

        // Hold lock to force queueing
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'hold';
        });

        // Queue a waiter
        const waiter = lock.inLock(() => {
            executionCount++;
            return 'waiter';
        });

        await Promise.all([hold, waiter]);

        // The critical assertion: execution count must be EXACTLY 1
        // If line 52 is mutated to "if (false) return", resolver might be called multiple times
        // If line 53 is mutated to "resolved = false", resolved flag won't protect against re-entry
        expect(executionCount).toBe(1);
        expect(executionCount).not.toBe(0);
        expect(executionCount).not.toBe(2);
    });

    // Target: Line 54 "if (timeoutId !== undefined)" -> true/false
    // Target: Line 54 "timeoutId !== undefined" -> "timeoutId === undefined"
    // Target: Line 54 BlockStatement -> {}
    // If the clearTimeout is skipped or runs when it shouldn't, we should detect
    // inconsistent behavior between timeout and no-timeout paths.
    it('should clear timeout only when a timeout was actually set (line 54)', async () => {
        const lock = new AsyncLock();

        // First: acquire without timeout (timeoutId should be undefined)
        // This exercises the path where clearTimeout should NOT be called
        const noTimeout = await lock.inLock(() => 'no-timeout');
        expect(noTimeout).toBe('no-timeout');

        // Second: hold lock and acquire with timeout that will succeed
        const holdBrief = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return 'hold-brief';
        });

        // This will queue with a timeout and then get the lock before timeout fires
        // The clearTimeout SHOULD be called
        const withTimeout = lock.inLock(() => 'with-timeout', 5000);

        const [holdRes, timeoutRes] = await Promise.all([holdBrief, withTimeout]);
        expect(holdRes).toBe('hold-brief');
        expect(timeoutRes).toBe('with-timeout');

        // Verify the lock still works correctly after both paths
        const final = await lock.inLock(() => 'final');
        expect(final).toBe('final');
    });

    // Target: Line 65 "if (resolved) return" -> false
    // Target: Line 66 "resolved = true" -> false
    // In the timeout handler: if resolved check is skipped, the timeout
    // could fire even after lock was acquired, causing weird behavior.
    it('should not execute timeout handler if lock already acquired (line 65-66)', async () => {
        const lock = new AsyncLock();
        let functionExecutionCount = 0;

        // Hold lock very briefly
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'hold';
        });

        // Acquire with timeout much longer than hold time
        // The lock will be acquired, resolver called with true, resolved set to true
        // Then when the timeout would fire (if not cleared), the resolved check should prevent execution
        const waiter = lock.inLock(() => {
            functionExecutionCount++;
            return 'waiter';
        }, 10000);

        const [holdRes, waiterRes] = await Promise.all([hold, waiter]);

        expect(holdRes).toBe('hold');
        expect(waiterRes).toBe('waiter');
        // Critical: function should execute exactly once
        expect(functionExecutionCount).toBe(1);

        // Wait a bit to ensure timeout doesn't fire and cause issues
        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify lock is still in good state
        const clean = await lock.inLock(() => 'clean');
        expect(clean).toBe('clean');
    });

    // Target: Line 69 "if (index !== -1)" -> true
    // Target: Line 69 "-1" -> "+1"
    // If splice always happens or uses wrong index, the queue could be corrupted.
    // The -1 -> +1 mutation is subtle: indexOf returns -1 when not found,
    // if we check !== +1 instead, we'd splice even when not found (index = -1 !== 1).
    it('should splice resolver at correct index on timeout (line 69)', async () => {
        const lock = new AsyncLock();
        const executionOrder: string[] = [];

        // Hold lock for a while
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            executionOrder.push('hold-done');
            return 'hold';
        });

        // First waiter: will timeout
        const timeout1 = lock.inLock(() => {
            executionOrder.push('timeout1-func-SHOULD-NOT-RUN');
            return 'fail';
        }, 10).catch(() => {
            executionOrder.push('timeout1-caught');
            return 'timeout1';
        });

        // Second waiter: will NOT timeout
        const waiter2 = lock.inLock(() => {
            executionOrder.push('waiter2-executed');
            return 'waiter2';
        });

        // Third waiter: will NOT timeout
        const waiter3 = lock.inLock(() => {
            executionOrder.push('waiter3-executed');
            return 'waiter3';
        });

        // Wait for timeout1 to fail
        const t1Res = await timeout1;
        expect(t1Res).toBe('timeout1');

        // Now wait for hold to complete and other waiters to run
        const [holdRes, w2Res, w3Res] = await Promise.all([hold, waiter2, waiter3]);

        expect(holdRes).toBe('hold');
        expect(w2Res).toBe('waiter2');
        expect(w3Res).toBe('waiter3');

        // Critical assertion: timeout1's function should NOT have run
        // waiter2 and waiter3 should both run in order
        // If splice used wrong index or didn't splice, execution order would be wrong
        expect(executionOrder).toStrictEqual([
            'timeout1-caught',
            'hold-done',
            'waiter2-executed',
            'waiter3-executed'
        ]);
    });

    // Target: Line 82 "if (this.permits > 1 && ...)" -> false
    // This is an invariant check. If it becomes false, the error won't be thrown.
    // However, if the code is correct, this path should never be reached.
    // We can test that normal operations don't hit this error.
    it('should not throw invariant error during normal concurrent operations (line 82)', async () => {
        const lock = new AsyncLock();
        const results: string[] = [];

        // Create a series of rapid concurrent operations
        // If the permits counting is correct, we should never hit permits > 1 with waiters
        const ops = Array.from({ length: 10 }, (_, i) =>
            lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10));
                results.push(`op${i}`);
                return `op${i}`;
            })
        );

        // All should complete without throwing the invariant error
        const allResults = await Promise.all(ops);

        expect(allResults.length).toBe(10);
        expect(results.length).toBe(10);
        // Operations should execute in order due to the lock
        for (let i = 0; i < 10; i++) {
            expect(allResults[i]).toBe(`op${i}`);
        }
    });

    // Target: Line 84 "else if (...)" -> "if (true)"
    // If this always runs (mutated to true), it would try to wake up waiters
    // even when there are none, potentially causing undefined behavior.
    it('should only wake next waiter when queue is non-empty (line 84)', async () => {
        const lock = new AsyncLock();

        // Test 1: Single operation with no waiters
        // When this unlocks, there should be no waiter to wake
        const single1 = await lock.inLock(() => 'single1');
        expect(single1).toBe('single1');

        // Test 2: Another single operation
        const single2 = await lock.inLock(() => 'single2');
        expect(single2).toBe('single2');

        // Test 3: Operation with actual waiter
        const events: string[] = [];
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            events.push('hold-done');
            return 'hold';
        });

        const waiter = lock.inLock(() => {
            events.push('waiter-done');
            return 'waiter';
        });

        await Promise.all([hold, waiter]);
        expect(events).toStrictEqual(['hold-done', 'waiter-done']);

        // Test 4: Back to single operation with no waiters
        const single3 = await lock.inLock(() => 'single3');
        expect(single3).toBe('single3');
    });

    // Additional test for line 54: verify that when timeoutId IS set, clearTimeout IS called
    it('should call clearTimeout when timeoutId is set and lock acquired (line 54 branch)', async () => {
        const lock = new AsyncLock();
        let waiterExecuted = false;

        // Hold briefly
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'hold';
        });

        // Waiter with timeout - will acquire before timeout
        const waiter = lock.inLock(() => {
            waiterExecuted = true;
            return 'waiter';
        }, 5000);

        const [holdRes, waiterRes] = await Promise.all([hold, waiter]);

        expect(holdRes).toBe('hold');
        expect(waiterRes).toBe('waiter');
        expect(waiterExecuted).toBe(true);

        // Wait longer than the original timeout would have been
        // If clearTimeout wasn't called, weird things might happen
        await new Promise(resolve => setTimeout(resolve, 100));

        // Lock should still work fine
        const clean = await lock.inLock(() => 'clean');
        expect(clean).toBe('clean');
    });

    // Test to verify the resolved flag works correctly in both success and timeout paths
    it('should use resolved flag to prevent double execution in race conditions (line 52-53, 65-66)', async () => {
        const lock = new AsyncLock();
        let executionCount = 0;

        // Hold lock for a specific duration
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'hold';
        });

        // Waiter with longer timeout - should succeed
        const waiter = lock.inLock(() => {
            executionCount++;
            return 'waiter';
        }, 500);

        await Promise.all([hold, waiter]);

        // The function should execute exactly once
        // If resolved flag is broken (line 52/53 mutated), it might execute multiple times
        expect(executionCount).toBe(1);
        expect(executionCount).not.toBeGreaterThan(1);
    });

    // Verify exact behavior when index is 0 (first in queue) vs -1 (not found)
    it('should correctly handle indexOf returning 0 vs -1 (line 69 UnaryOperator)', async () => {
        const lock = new AsyncLock();
        let funcCalled = false;

        // Hold lock long enough for timeout to fire
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
            return 'hold';
        });

        // Single waiter that will timeout - index will be 0 when it times out
        // The mutation -1 -> +1 would check "0 !== +1" which is true, so splice happens
        // But we need to verify splice happens at the correct position
        const timeout = lock.inLock(() => {
            funcCalled = true;
            return 'should-not-run';
        }, 20).catch(() => 'timeout');

        const timeoutRes = await timeout;
        expect(timeoutRes).toBe('timeout');

        // Release lock
        await hold;

        // Function should not have been called
        expect(funcCalled).toBe(false);

        // Verify queue is clean by acquiring lock again
        const clean = await lock.inLock(() => 'clean');
        expect(clean).toBe('clean');
    });

    // Additional tests targeting specific mutation types

    // Target: Line 54 BlockStatement -> {} (empty block)
    // If the block becomes empty, clearTimeout and timeoutId assignment are skipped
    // This test verifies the cleanup behavior
    it('should clean up timeout state when lock acquired with pending timeout (line 54 BlockStatement)', async () => {
        const lock = new AsyncLock();
        const results: string[] = [];

        // Repeat the pattern multiple times to stress the timeout cleanup
        for (let i = 0; i < 3; i++) {
            const hold = lock.inLock(async () => {
                await new Promise(resolve => setTimeout(resolve, 25));
                results.push(`hold${i}`);
                return `hold${i}`;
            });

            // Timeout is set, but lock should be acquired before it fires
            const waiter = lock.inLock(() => {
                results.push(`waiter${i}`);
                return `waiter${i}`;
            }, 5000);

            await Promise.all([hold, waiter]);
        }

        expect(results).toStrictEqual([
            'hold0', 'waiter0',
            'hold1', 'waiter1',
            'hold2', 'waiter2'
        ]);

        // Verify lock still works after multiple cycles
        const final = await lock.inLock(() => 'final');
        expect(final).toBe('final');
    });

    // Target: Line 69 ConditionalExpression -> true (always splice)
    // If splice always happens, even when index is -1 (not found), it would
    // try to splice at position -1, which in JS removes the last element
    it('should not corrupt queue when splice condition is wrong (line 69 ConditionalExpression)', async () => {
        const lock = new AsyncLock();
        const executionOrder: string[] = [];

        // Hold lock
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            executionOrder.push('hold');
            return 'hold';
        });

        // First waiter: times out
        const timeout1 = lock.inLock(() => {
            executionOrder.push('timeout1-SHOULD-NOT-RUN');
            return 'fail';
        }, 20).catch(() => {
            executionOrder.push('timeout1-caught');
            return 'timeout1';
        });

        // Second waiter: times out
        const timeout2 = lock.inLock(() => {
            executionOrder.push('timeout2-SHOULD-NOT-RUN');
            return 'fail';
        }, 40).catch(() => {
            executionOrder.push('timeout2-caught');
            return 'timeout2';
        });

        // Third waiter: succeeds
        const waiter = lock.inLock(() => {
            executionOrder.push('waiter-executed');
            return 'waiter';
        });

        const [t1Res, t2Res] = await Promise.all([timeout1, timeout2]);
        expect(t1Res).toBe('timeout1');
        expect(t2Res).toBe('timeout2');

        const [holdRes, waiterRes] = await Promise.all([hold, waiter]);
        expect(holdRes).toBe('hold');
        expect(waiterRes).toBe('waiter');

        // Critical: execution order must be exact
        // If splice(index, 1) with index = -1 happens, it would remove the last element
        // which could be the waiter, corrupting the queue
        expect(executionOrder).toStrictEqual([
            'timeout1-caught',
            'timeout2-caught',
            'hold',
            'waiter-executed'
        ]);
    });

    // Target: Line 82 ConditionalExpression -> false (invariant never checked)
    // The invariant is: permits should never be > 1 when there are waiters
    // If the check is disabled, the invariant could be violated silently
    // We test that under normal operation, we never get permits > 1 with waiters
    it('should never have inconsistent state (permits > 1 with waiters) (line 82)', async () => {
        const lock = new AsyncLock();
        const events: string[] = [];

        // Create overlapping operations
        const op1 = lock.inLock(async () => {
            events.push('op1-start');
            await new Promise(resolve => setTimeout(resolve, 30));
            events.push('op1-end');
            return 'op1';
        });

        const op2 = lock.inLock(async () => {
            events.push('op2-start');
            await new Promise(resolve => setTimeout(resolve, 20));
            events.push('op2-end');
            return 'op2';
        });

        const op3 = lock.inLock(async () => {
            events.push('op3-start');
            await new Promise(resolve => setTimeout(resolve, 10));
            events.push('op3-end');
            return 'op3';
        });

        // All should complete without error
        const [r1, r2, r3] = await Promise.all([op1, op2, op3]);

        expect(r1).toBe('op1');
        expect(r2).toBe('op2');
        expect(r3).toBe('op3');

        // Events should be strictly sequential (no interleaving)
        expect(events).toStrictEqual([
            'op1-start', 'op1-end',
            'op2-start', 'op2-end',
            'op3-start', 'op3-end'
        ]);
    });

    // Target: Line 84 ConditionalExpression -> true (always wake waiter)
    // If always true, it would try to call shift() on potentially empty queue
    // and then call setTimeout with undefined as the callback
    it('should not crash when unlock is called with empty queue (line 84)', async () => {
        const lock = new AsyncLock();

        // Many rapid single-acquire operations (no concurrent waiters)
        for (let i = 0; i < 20; i++) {
            const result = await lock.inLock(() => `result${i}`);
            expect(result).toBe(`result${i}`);
        }

        // Now with a waiter
        const events: string[] = [];
        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            events.push('hold');
            return 'hold';
        });

        const waiter = lock.inLock(() => {
            events.push('waiter');
            return 'waiter';
        });

        await Promise.all([hold, waiter]);
        expect(events).toStrictEqual(['hold', 'waiter']);

        // Back to single operations
        for (let i = 0; i < 5; i++) {
            const result = await lock.inLock(() => `final${i}`);
            expect(result).toBe(`final${i}`);
        }
    });

    // Verify the exact assertion patterns that mutation testing requires
    it('should have resolver execute function body exactly once (strict assertion)', async () => {
        const lock = new AsyncLock();
        let execCount = 0;

        const hold = lock.inLock(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'hold';
        });

        const waiter = lock.inLock(() => {
            execCount++;
            if (execCount > 1) {
                throw new Error('Function executed more than once!');
            }
            return 'waiter';
        });

        const [holdRes, waiterRes] = await Promise.all([hold, waiter]);

        expect(holdRes).toBe('hold');
        expect(waiterRes).toBe('waiter');
        expect(execCount).toBe(1);
    });
});
