import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutgoingMessageQueue } from './OutgoingMessageQueue';
import type { RawJSONLines } from '@/claude/types';

// Mock logger
vi.mock('@/ui/logger', () => ({
    logger: {
        debug: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    }
}));

// Mock SocketDisconnectedError
vi.mock('@/api/socketUtils', () => ({
    SocketDisconnectedError: class SocketDisconnectedError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'SocketDisconnectedError';
        }
    }
}));

// Helper to create valid LogMessage objects (RawJSONLines & Record<string, unknown>)
function createAssistantMessage(id: string): RawJSONLines & Record<string, unknown> {
    return {
        type: 'assistant' as const,
        uuid: `uuid-${id}`,
        message: {
            content: [{ type: 'text', text: `Message ${id}` }],
        },
        testId: id, // For tracking in tests
    };
}

function createUserMessage(id: string): RawJSONLines & Record<string, unknown> {
    return {
        type: 'user' as const,
        uuid: `uuid-${id}`,
        message: {
            content: `User message ${id}`,
        },
        testId: id,
    };
}

function createSystemMessage(id: string): RawJSONLines & Record<string, unknown> {
    return {
        type: 'system' as const,
        uuid: `uuid-${id}`,
        testId: id,
    };
}

// Type for the LogMessage used by the queue
type LogMessage = RawJSONLines & Record<string, unknown>;

describe('OutgoingMessageQueue', () => {
    let sendFn: (message: LogMessage) => void;
    let queue: OutgoingMessageQueue;

    beforeEach(() => {
        vi.useFakeTimers();
        sendFn = vi.fn();
        queue = new OutgoingMessageQueue(sendFn);
    });

    afterEach(() => {
        queue.destroy();
        vi.useRealTimers();
    });

    describe('basic operations', () => {
        it('should enqueue and send messages in order', async () => {
            const msg1 = createAssistantMessage('1');
            const msg2 = createAssistantMessage('2');
            const msg3 = createAssistantMessage('3');

            queue.enqueue(msg1);
            queue.enqueue(msg2);
            queue.enqueue(msg3);

            await vi.runAllTimersAsync();

            expect(sendFn).toHaveBeenCalledTimes(3);
            expect(sendFn).toHaveBeenNthCalledWith(1, msg1);
            expect(sendFn).toHaveBeenNthCalledWith(2, msg2);
            expect(sendFn).toHaveBeenNthCalledWith(3, msg3);
        });

        it('should not send system messages', async () => {
            queue.enqueue(createSystemMessage('1'));

            await vi.runAllTimersAsync();

            expect(sendFn).not.toHaveBeenCalled();
        });

        it('should start not disabled', () => {
            expect(queue.isDisabled()).toBe(false);
        });
    });

    describe('delayed messages', () => {
        it('should delay messages when delay option is provided', async () => {
            const msg = createAssistantMessage('1');
            queue.enqueue(msg, { delay: 250 });

            await vi.advanceTimersByTimeAsync(100);
            expect(sendFn).not.toHaveBeenCalled();

            await vi.advanceTimersByTimeAsync(200);
            expect(sendFn).toHaveBeenCalledWith(msg);
        });

        it('should release delayed messages on tool call release', async () => {
            const msg = createAssistantMessage('1');
            queue.enqueue(msg, {
                delay: 250,
                toolCallIds: ['tool-1']
            });

            await vi.advanceTimersByTimeAsync(50);
            expect(sendFn).not.toHaveBeenCalled();

            // Release the tool call
            await queue.releaseToolCall('tool-1');
            await vi.runAllTimersAsync();

            expect(sendFn).toHaveBeenCalledWith(msg);
        });
    });

    describe('disable/enable cycle (HAP-944)', () => {
        it('should disable queue when SocketDisconnectedError is thrown', async () => {
            // Import the actual error class
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            // Create a new queue with a send function that throws on second call
            let callCount = 0;
            const throwingSendFn = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    throw new SocketDisconnectedError('Socket disconnected');
                }
            });

            const testQueue = new OutgoingMessageQueue(throwingSendFn);

            testQueue.enqueue(createAssistantMessage('1'));
            testQueue.enqueue(createAssistantMessage('2'));
            testQueue.enqueue(createAssistantMessage('3'));

            await vi.runAllTimersAsync();

            // First message should be sent, second throws
            expect(throwingSendFn).toHaveBeenCalledTimes(2);
            // Queue should be disabled after the error
            expect(testQueue.isDisabled()).toBe(true);

            testQueue.destroy();
        });

        it('should not process messages while disabled', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const throwingSendFn = vi.fn().mockImplementation(() => {
                throw new SocketDisconnectedError('Socket disconnected');
            });

            const testQueue = new OutgoingMessageQueue(throwingSendFn);

            // First message will disable the queue
            testQueue.enqueue(createAssistantMessage('1'));
            await vi.runAllTimersAsync();

            expect(testQueue.isDisabled()).toBe(true);
            throwingSendFn.mockClear();

            // Second message should not be sent because queue is disabled
            testQueue.enqueue(createAssistantMessage('2'));
            await vi.runAllTimersAsync();

            expect(throwingSendFn).not.toHaveBeenCalled();

            testQueue.destroy();
        });

        it('should re-enable queue when enable() is called', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            let shouldThrow = true;
            const conditionalSendFn = vi.fn().mockImplementation(() => {
                if (shouldThrow) {
                    shouldThrow = false;
                    throw new SocketDisconnectedError('Socket disconnected');
                }
            });

            const testQueue = new OutgoingMessageQueue(conditionalSendFn);

            // First message will disable the queue
            testQueue.enqueue(createAssistantMessage('1'));
            await vi.runAllTimersAsync();

            expect(testQueue.isDisabled()).toBe(true);

            // Re-enable the queue
            testQueue.enable();

            expect(testQueue.isDisabled()).toBe(false);

            testQueue.destroy();
        });

        it('should process queued messages after re-enabling', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            let shouldThrow = true;
            const conditionalSendFn = vi.fn().mockImplementation(() => {
                if (shouldThrow) {
                    throw new SocketDisconnectedError('Socket disconnected');
                }
            });

            const testQueue = new OutgoingMessageQueue(conditionalSendFn);

            // First message will disable the queue (message stays in queue, not marked as sent)
            const msg1 = createAssistantMessage('1');
            testQueue.enqueue(msg1);
            await vi.runAllTimersAsync();

            expect(testQueue.isDisabled()).toBe(true);
            expect(conditionalSendFn).toHaveBeenCalledTimes(1);
            conditionalSendFn.mockClear();

            // Queue more messages while disabled
            const msg2 = createAssistantMessage('2');
            const msg3 = createAssistantMessage('3');
            testQueue.enqueue(msg2);
            testQueue.enqueue(msg3);
            await vi.runAllTimersAsync();

            // Nothing should be sent yet
            expect(conditionalSendFn).not.toHaveBeenCalled();

            // Stop throwing and re-enable
            shouldThrow = false;
            testQueue.enable();
            await vi.runAllTimersAsync();

            // All queued messages should be processed (including msg1 that failed before)
            expect(conditionalSendFn).toHaveBeenCalledTimes(3);
            expect(conditionalSendFn).toHaveBeenNthCalledWith(1, msg1);
            expect(conditionalSendFn).toHaveBeenNthCalledWith(2, msg2);
            expect(conditionalSendFn).toHaveBeenNthCalledWith(3, msg3);

            testQueue.destroy();
        });

        it('should emit sendError event when disabling', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const throwingSendFn = vi.fn().mockImplementation(() => {
                throw new SocketDisconnectedError('Socket disconnected');
            });

            const testQueue = new OutgoingMessageQueue(throwingSendFn);
            const sendErrorHandler = vi.fn();
            testQueue.on('sendError', sendErrorHandler);

            testQueue.enqueue(createAssistantMessage('1'));
            await vi.runAllTimersAsync();

            expect(sendErrorHandler).toHaveBeenCalledTimes(1);
            expect(sendErrorHandler).toHaveBeenCalledWith(expect.any(SocketDisconnectedError));

            testQueue.destroy();
        });

        it('should not emit event if enable() called when already enabled', async () => {
            // Queue is already enabled by default
            expect(queue.isDisabled()).toBe(false);

            // enable() should be a no-op
            queue.enable();

            expect(queue.isDisabled()).toBe(false);
            // No additional processing should be scheduled since queue was never disabled
        });

        it('should handle full disable → reconnect → enable → process flow', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            // Simulate a sequence of events:
            // 1. Messages being sent normally
            // 2. Socket disconnection (SocketDisconnectedError)
            // 3. More messages queued while disconnected
            // 4. Socket reconnection (enable() called)
            // 5. Queued messages processed (including the one that failed)

            let connectionAlive = true;
            const sendFn = vi.fn().mockImplementation(() => {
                if (!connectionAlive) {
                    throw new SocketDisconnectedError('Socket disconnected');
                }
            });

            const testQueue = new OutgoingMessageQueue(sendFn);

            // Step 1: Normal message sending
            const firstMsg = createAssistantMessage('first');
            testQueue.enqueue(firstMsg);
            await vi.runAllTimersAsync();
            expect(sendFn).toHaveBeenCalledWith(firstMsg);
            sendFn.mockClear();

            // Step 2: Socket disconnects - message stays in queue (not marked as sent)
            connectionAlive = false;
            const duringDisconnect = createAssistantMessage('during-disconnect');
            testQueue.enqueue(duringDisconnect);
            await vi.runAllTimersAsync();
            expect(testQueue.isDisabled()).toBe(true);
            sendFn.mockClear();

            // Step 3: More messages while disconnected
            const queued1 = createAssistantMessage('queued-1');
            const queued2 = createAssistantMessage('queued-2');
            testQueue.enqueue(queued1);
            testQueue.enqueue(queued2);
            await vi.runAllTimersAsync();
            expect(sendFn).not.toHaveBeenCalled();

            // Step 4: Socket reconnects
            connectionAlive = true;
            testQueue.enable();

            // Step 5: All queued messages should be processed (including duringDisconnect that failed)
            await vi.runAllTimersAsync();
            expect(sendFn).toHaveBeenCalledTimes(3);
            expect(sendFn).toHaveBeenNthCalledWith(1, duringDisconnect);
            expect(sendFn).toHaveBeenNthCalledWith(2, queued1);
            expect(sendFn).toHaveBeenNthCalledWith(3, queued2);
            expect(testQueue.isDisabled()).toBe(false);

            testQueue.destroy();
        });
    });

    describe('flush', () => {
        it('should flush all messages immediately', async () => {
            // Use real timers for flush test since it uses async locks
            vi.useRealTimers();

            const flushSendFn = vi.fn();
            const flushQueue = new OutgoingMessageQueue(flushSendFn);

            flushQueue.enqueue(createAssistantMessage('1'), { delay: 1000 });
            flushQueue.enqueue(createAssistantMessage('2'), { delay: 1000 });

            await flushQueue.flush();

            expect(flushSendFn).toHaveBeenCalledTimes(2);
            flushQueue.destroy();
        });

        it('should handle flush when queue is disabled', async () => {
            // Use real timers for flush test since it uses async locks
            vi.useRealTimers();

            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const throwingSendFn = vi.fn().mockImplementation(() => {
                throw new SocketDisconnectedError('Socket disconnected');
            });

            const testQueue = new OutgoingMessageQueue(throwingSendFn);

            // Disable the queue by sending a message
            testQueue.enqueue(createAssistantMessage('1'));

            // Wait for the async processing to complete
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(testQueue.isDisabled()).toBe(true);

            // Queue more messages
            testQueue.enqueue(createAssistantMessage('2'));

            // Flush should handle the error gracefully (no throw)
            await testQueue.flush();

            testQueue.destroy();
        });
    });

    describe('scheduleProcessing race condition fix (HAP-941)', () => {
        it('should coalesce rapid sequential calls to scheduleProcessing', async () => {
            const messages: (RawJSONLines & Record<string, unknown>)[] = [];
            const trackingSendFn = vi.fn().mockImplementation((msg) => {
                messages.push(msg);
            });

            const testQueue = new OutgoingMessageQueue(trackingSendFn);

            // Enqueue multiple messages rapidly - each enqueue calls scheduleProcessing
            testQueue.enqueue(createAssistantMessage('1'));
            testQueue.enqueue(createAssistantMessage('2'));
            testQueue.enqueue(createAssistantMessage('3'));
            testQueue.enqueue(createAssistantMessage('4'));
            testQueue.enqueue(createAssistantMessage('5'));

            // Run all timers (setImmediate + setTimeout)
            await vi.runAllTimersAsync();

            // All messages should be sent in order
            expect(trackingSendFn).toHaveBeenCalledTimes(5);
            expect(messages.map((m) => (m as unknown as { testId: string }).testId)).toEqual(['1', '2', '3', '4', '5']);

            testQueue.destroy();
        });

        it('should not create orphaned timers under concurrent calls', async () => {
            const testQueue = new OutgoingMessageQueue(vi.fn());

            // Simulate concurrent scheduling calls
            // In the old implementation, this could create orphaned timers
            testQueue.enqueue(createAssistantMessage('1'));
            testQueue.enqueue(createAssistantMessage('2'));

            // Access private processTimer to verify only one timer exists
            // @ts-expect-error - accessing private property for testing
            const _timerAfterEnqueue = testQueue.processTimer;

            // Wait for setImmediate to run
            await vi.advanceTimersByTimeAsync(0);

            // @ts-expect-error - accessing private property for testing
            const timerAfterImmediate = testQueue.processTimer;

            // There should be exactly one timer reference
            expect(timerAfterImmediate).toBeDefined();

            // Run all timers to completion
            await vi.runAllTimersAsync();

            // After processing, timer should be cleared
            // @ts-expect-error - accessing private property for testing
            expect(testQueue.processTimer).toBeUndefined();

            testQueue.destroy();
        });

        it('should handle interleaved enqueue and releaseToolCall', async () => {
            // Use real timers for this test because releaseToolCall uses async locks
            // which don't work well with fake timers
            vi.useRealTimers();

            const messages: (RawJSONLines & Record<string, unknown>)[] = [];
            const trackingSendFn = vi.fn().mockImplementation((msg) => {
                messages.push(msg);
            });

            const testQueue = new OutgoingMessageQueue(trackingSendFn);

            // Enqueue delayed message with tool call
            testQueue.enqueue(createAssistantMessage('delayed'), {
                delay: 500,
                toolCallIds: ['tool-1']
            });

            // Enqueue regular message
            testQueue.enqueue(createAssistantMessage('regular'));

            // Immediately release the tool call (this also calls scheduleProcessing)
            await testQueue.releaseToolCall('tool-1');

            // Wait for async processing to complete
            await new Promise(resolve => setTimeout(resolve, 50));

            // Both messages should be sent (delayed first because it has lower ID)
            expect(trackingSendFn).toHaveBeenCalledTimes(2);
            expect(messages.map((m) => (m as unknown as { testId: string }).testId)).toEqual(['delayed', 'regular']);

            testQueue.destroy();
        });

        it('should maintain message ordering despite rapid scheduling', async () => {
            const messages: (RawJSONLines & Record<string, unknown>)[] = [];
            const trackingSendFn = vi.fn().mockImplementation((msg) => {
                messages.push(msg);
            });

            const testQueue = new OutgoingMessageQueue(trackingSendFn);

            // Enqueue messages with various delays
            testQueue.enqueue(createAssistantMessage('1'));
            testQueue.enqueue(createAssistantMessage('2'), { delay: 100 });
            testQueue.enqueue(createAssistantMessage('3'));
            testQueue.enqueue(createAssistantMessage('4'), { delay: 50 });
            testQueue.enqueue(createAssistantMessage('5'));

            // Run immediate timers first
            await vi.runAllTimersAsync();

            // Messages 1, 3, 5 should be sent (no delay)
            // Messages 2, 4 are still delayed (blocking subsequent messages from being sent is by design)
            // But since 2 comes before 3, and 2 is delayed, 3 can't be sent until 2 is released

            // After all timers (including delays), all should be sent in ID order
            expect(trackingSendFn).toHaveBeenCalledTimes(5);
            expect(messages.map((m) => (m as unknown as { testId: string }).testId)).toEqual(['1', '2', '3', '4', '5']);

            testQueue.destroy();
        });

        it('should handle schedulingPending flag correctly', async () => {
            const testQueue = new OutgoingMessageQueue(vi.fn());

            // @ts-expect-error - accessing private property for testing
            expect(testQueue.schedulingPending).toBe(false);

            testQueue.enqueue(createAssistantMessage('1'));

            // Flag should be set after enqueue but before setImmediate runs
            // @ts-expect-error - accessing private property for testing
            expect(testQueue.schedulingPending).toBe(true);

            // After setImmediate runs, flag should be cleared
            await vi.advanceTimersByTimeAsync(0);

            // @ts-expect-error - accessing private property for testing
            expect(testQueue.schedulingPending).toBe(false);

            testQueue.destroy();
        });
    });

    describe('queue size limit (HAP-955)', () => {
        it('should accept custom maxQueueSize via constructor options', () => {
            const testQueue = new OutgoingMessageQueue(vi.fn(), { maxQueueSize: 5 });

            // @ts-expect-error - accessing private property for testing
            expect(testQueue.maxQueueSize).toBe(5);

            testQueue.destroy();
        });

        it('should use default maxQueueSize of 1000 when not specified', () => {
            const testQueue = new OutgoingMessageQueue(vi.fn());

            // @ts-expect-error - accessing private property for testing
            expect(testQueue.maxQueueSize).toBe(1000);

            testQueue.destroy();
        });

        it('should evict oldest message when queue is disabled and exceeds limit', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            // Create queue with small max size for testing
            const throwingSendFn = vi.fn().mockImplementation(() => {
                throw new SocketDisconnectedError('Socket disconnected');
            });
            const testQueue = new OutgoingMessageQueue(throwingSendFn, { maxQueueSize: 3 });

            // First message will disable the queue (message stays in queue, not marked as sent)
            testQueue.enqueue(createAssistantMessage('1'));
            await vi.runAllTimersAsync();

            expect(testQueue.isDisabled()).toBe(true);
            expect(testQueue.getEvictedCount()).toBe(0);
            expect(testQueue.getQueueSize()).toBe(1);

            // Queue more messages while disabled (up to limit)
            testQueue.enqueue(createAssistantMessage('2'));
            testQueue.enqueue(createAssistantMessage('3'));
            await vi.runAllTimersAsync();

            expect(testQueue.getQueueSize()).toBe(3);
            expect(testQueue.getEvictedCount()).toBe(0);

            // Adding one more should evict the oldest
            testQueue.enqueue(createAssistantMessage('4'));
            await vi.runAllTimersAsync();

            expect(testQueue.getQueueSize()).toBe(3); // Still at limit
            expect(testQueue.getEvictedCount()).toBe(1);

            testQueue.destroy();
        });

        it('should not evict messages when queue is enabled', async () => {
            const messages: (RawJSONLines & Record<string, unknown>)[] = [];
            const trackingSendFn = vi.fn().mockImplementation((msg) => {
                messages.push(msg);
            });
            const testQueue = new OutgoingMessageQueue(trackingSendFn, { maxQueueSize: 2 });

            // Queue more messages than limit while enabled
            testQueue.enqueue(createAssistantMessage('1'));
            testQueue.enqueue(createAssistantMessage('2'));
            testQueue.enqueue(createAssistantMessage('3'));
            testQueue.enqueue(createAssistantMessage('4'));

            await vi.runAllTimersAsync();

            // All messages should be sent (no eviction when enabled)
            expect(trackingSendFn).toHaveBeenCalledTimes(4);
            expect(testQueue.getEvictedCount()).toBe(0);

            testQueue.destroy();
        });

        it('should evict multiple messages when many are added at once while disabled', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const throwingSendFn = vi.fn().mockImplementation(() => {
                throw new SocketDisconnectedError('Socket disconnected');
            });
            const testQueue = new OutgoingMessageQueue(throwingSendFn, { maxQueueSize: 3 });

            // Disable the queue
            testQueue.enqueue(createAssistantMessage('1'));
            await vi.runAllTimersAsync();
            expect(testQueue.isDisabled()).toBe(true);

            // Add many messages while disabled
            for (let i = 2; i <= 10; i++) {
                testQueue.enqueue(createAssistantMessage(String(i)));
            }
            await vi.runAllTimersAsync();

            // Queue should be at limit, with oldest evicted
            expect(testQueue.getQueueSize()).toBe(3);
            expect(testQueue.getEvictedCount()).toBe(7); // 10 - 3 = 7 evicted

            testQueue.destroy();
        });

        it('should preserve newest messages after eviction and process them on reconnect', async () => {
            vi.useRealTimers(); // Need real timers for reconnection flow

            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            let shouldThrow = true;
            const messages: (RawJSONLines & Record<string, unknown>)[] = [];
            const conditionalSendFn = vi.fn().mockImplementation((msg) => {
                if (shouldThrow) {
                    throw new SocketDisconnectedError('Socket disconnected');
                }
                messages.push(msg);
            });

            const testQueue = new OutgoingMessageQueue(conditionalSendFn, { maxQueueSize: 3 });

            // First message will disable the queue
            testQueue.enqueue(createAssistantMessage('1'));
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(testQueue.isDisabled()).toBe(true);

            // Queue messages while disabled (message 1 is still in queue + 2,3,4,5)
            testQueue.enqueue(createAssistantMessage('2'));
            testQueue.enqueue(createAssistantMessage('3'));
            testQueue.enqueue(createAssistantMessage('4'));
            testQueue.enqueue(createAssistantMessage('5'));
            await new Promise(resolve => setTimeout(resolve, 50));

            // Messages 1, 2 should be evicted (oldest), keeping 3, 4, 5
            expect(testQueue.getQueueSize()).toBe(3);
            expect(testQueue.getEvictedCount()).toBe(2);

            // Reconnect
            shouldThrow = false;
            testQueue.enable();
            await new Promise(resolve => setTimeout(resolve, 100));

            // Only messages 3, 4, 5 should be sent (the newest ones)
            expect(messages.length).toBe(3);
            expect(messages.map((m) => (m as unknown as { testId: string }).testId)).toEqual(['3', '4', '5']);

            testQueue.destroy();
        });

        it('should clear delay timer when evicting a delayed message', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const throwingSendFn = vi.fn().mockImplementation(() => {
                throw new SocketDisconnectedError('Socket disconnected');
            });
            const testQueue = new OutgoingMessageQueue(throwingSendFn, { maxQueueSize: 2 });

            // Disable the queue
            testQueue.enqueue(createAssistantMessage('1'));
            await vi.runAllTimersAsync();
            expect(testQueue.isDisabled()).toBe(true);

            // Add a delayed message
            testQueue.enqueue(createAssistantMessage('2'), { delay: 10000, toolCallIds: ['tool-1'] });
            await vi.runAllTimersAsync();

            // Add another message, which should evict message 1
            testQueue.enqueue(createAssistantMessage('3'));
            await vi.runAllTimersAsync();

            expect(testQueue.getQueueSize()).toBe(2);
            expect(testQueue.getEvictedCount()).toBe(1);

            // Now add one more to evict the delayed message
            testQueue.enqueue(createAssistantMessage('4'));
            await vi.runAllTimersAsync();

            expect(testQueue.getQueueSize()).toBe(2);
            expect(testQueue.getEvictedCount()).toBe(2);

            // @ts-expect-error - accessing private property for testing
            // Verify no orphaned timers for the evicted delayed message
            expect(testQueue.delayTimers.size).toBeLessThanOrEqual(1);

            testQueue.destroy();
        });

        it('should log warning when evicting messages', async () => {
            const { logger } = await import('@/ui/logger');
            const warnSpy = vi.spyOn(logger, 'warn');

            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const throwingSendFn = vi.fn().mockImplementation(() => {
                throw new SocketDisconnectedError('Socket disconnected');
            });
            const testQueue = new OutgoingMessageQueue(throwingSendFn, { maxQueueSize: 2 });

            // Disable the queue
            testQueue.enqueue(createAssistantMessage('1'));
            await vi.runAllTimersAsync();

            warnSpy.mockClear();

            // Add messages to trigger eviction
            testQueue.enqueue(createAssistantMessage('2'));
            testQueue.enqueue(createAssistantMessage('3'));
            await vi.runAllTimersAsync();

            // Should have logged warning about eviction
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Queue size limit (2) reached while disabled')
            );

            testQueue.destroy();
        });

        it('should expose queue size via getQueueSize()', async () => {
            const testQueue = new OutgoingMessageQueue(vi.fn());

            expect(testQueue.getQueueSize()).toBe(0);

            testQueue.enqueue(createAssistantMessage('1'));
            // Before processing, queue has item
            // Note: Due to async lock, we need to verify differently
            // Just verify the method exists and returns a number
            expect(typeof testQueue.getQueueSize()).toBe('number');

            testQueue.destroy();
        });

        it('should expose evicted count via getEvictedCount()', () => {
            const testQueue = new OutgoingMessageQueue(vi.fn());

            expect(testQueue.getEvictedCount()).toBe(0);

            testQueue.destroy();
        });
    });

    /**
     * Integration tests for OutgoingMessageQueue reconnection flow (HAP-956)
     *
     * These tests verify the complete disconnect → reconnect cycle including:
     * - Message delivery before disconnection
     * - Queue disabling on network error
     * - Message queueing while disconnected
     * - Automatic retry and ordering preservation on reconnection
     * - Event emission for error handling
     */
    describe('integration: reconnection flow (HAP-956)', () => {
        // Use real timers for integration tests to simulate realistic async behavior
        beforeEach(() => {
            vi.useRealTimers();
        });

        /**
         * Helper to wait for async queue processing
         */
        const waitForProcessing = (ms = 100): Promise<void> =>
            new Promise(resolve => setTimeout(resolve, ms));

        it('should complete full reconnection flow with message ordering preserved', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            // Track all delivered messages in order
            const deliveredMessages: string[] = [];

            // Simulated network state
            let networkConnected = true;

            // Send function that simulates network behavior
            const networkSendFn = vi.fn().mockImplementation((msg: LogMessage) => {
                if (!networkConnected) {
                    throw new SocketDisconnectedError('Network connection lost');
                }
                deliveredMessages.push((msg as unknown as { testId: string }).testId);
            });

            const testQueue = new OutgoingMessageQueue(networkSendFn);

            // Track sendError events
            const sendErrorHandler = vi.fn();
            testQueue.on('sendError', sendErrorHandler);

            // ═══════════════════════════════════════════════════════════════
            // Phase 1: Normal operation - messages sent successfully
            // ═══════════════════════════════════════════════════════════════
            testQueue.enqueue(createAssistantMessage('msg-1'));
            testQueue.enqueue(createAssistantMessage('msg-2'));
            testQueue.enqueue(createAssistantMessage('msg-3'));

            await waitForProcessing();

            expect(deliveredMessages).toEqual(['msg-1', 'msg-2', 'msg-3']);
            expect(testQueue.isDisabled()).toBe(false);
            expect(sendErrorHandler).not.toHaveBeenCalled();

            // ═══════════════════════════════════════════════════════════════
            // Phase 2: Network disconnection - queue becomes disabled
            // ═══════════════════════════════════════════════════════════════
            networkConnected = false;
            networkSendFn.mockClear();

            // This message will trigger the disconnection error
            testQueue.enqueue(createAssistantMessage('msg-4'));

            await waitForProcessing();

            // Queue should be disabled
            expect(testQueue.isDisabled()).toBe(true);
            // sendError event should have been emitted
            expect(sendErrorHandler).toHaveBeenCalledTimes(1);
            expect(sendErrorHandler).toHaveBeenCalledWith(expect.any(SocketDisconnectedError));
            // Message was attempted but not delivered
            expect(deliveredMessages).toEqual(['msg-1', 'msg-2', 'msg-3']);

            // ═══════════════════════════════════════════════════════════════
            // Phase 3: Queue messages while disconnected
            // ═══════════════════════════════════════════════════════════════
            testQueue.enqueue(createAssistantMessage('msg-5'));
            testQueue.enqueue(createAssistantMessage('msg-6'));
            testQueue.enqueue(createUserMessage('user-msg-7'));
            testQueue.enqueue(createAssistantMessage('msg-8'));

            await waitForProcessing();

            // Messages should NOT be delivered while disconnected
            expect(deliveredMessages).toEqual(['msg-1', 'msg-2', 'msg-3']);
            // Queue should still be disabled
            expect(testQueue.isDisabled()).toBe(true);
            // No additional errors should be emitted (queue is disabled, not trying to send)
            expect(sendErrorHandler).toHaveBeenCalledTimes(1);

            // ═══════════════════════════════════════════════════════════════
            // Phase 4: Network reconnects - enable queue
            // ═══════════════════════════════════════════════════════════════
            networkConnected = true;
            testQueue.enable();

            await waitForProcessing();

            // Queue should be re-enabled
            expect(testQueue.isDisabled()).toBe(false);

            // All queued messages should be delivered in order
            // msg-4 was the one that failed, so it should be retried first
            expect(deliveredMessages).toEqual([
                'msg-1', 'msg-2', 'msg-3',  // Pre-disconnect
                'msg-4',                     // Failed during disconnect, retried
                'msg-5', 'msg-6', 'user-msg-7', 'msg-8'  // Queued while disconnected
            ]);

            testQueue.destroy();
        });

        it('should handle multiple disconnect/reconnect cycles', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const deliveredMessages: string[] = [];
            let networkConnected = true;

            const networkSendFn = vi.fn().mockImplementation((msg: LogMessage) => {
                if (!networkConnected) {
                    throw new SocketDisconnectedError('Network connection lost');
                }
                deliveredMessages.push((msg as unknown as { testId: string }).testId);
            });

            const testQueue = new OutgoingMessageQueue(networkSendFn);

            // ═══════════════════════════════════════════════════════════════
            // Cycle 1: Connect → Send → Disconnect → Reconnect
            // ═══════════════════════════════════════════════════════════════
            testQueue.enqueue(createAssistantMessage('cycle1-msg1'));
            await waitForProcessing();
            expect(deliveredMessages).toEqual(['cycle1-msg1']);

            // Disconnect
            networkConnected = false;
            testQueue.enqueue(createAssistantMessage('cycle1-msg2'));
            await waitForProcessing();
            expect(testQueue.isDisabled()).toBe(true);

            // Reconnect
            networkConnected = true;
            testQueue.enable();
            await waitForProcessing();
            expect(deliveredMessages).toEqual(['cycle1-msg1', 'cycle1-msg2']);
            expect(testQueue.isDisabled()).toBe(false);

            // ═══════════════════════════════════════════════════════════════
            // Cycle 2: Send → Disconnect → Queue multiple → Reconnect
            // ═══════════════════════════════════════════════════════════════
            testQueue.enqueue(createAssistantMessage('cycle2-msg1'));
            await waitForProcessing();
            expect(deliveredMessages).toContain('cycle2-msg1');

            // Disconnect again
            networkConnected = false;
            testQueue.enqueue(createAssistantMessage('cycle2-msg2'));
            testQueue.enqueue(createAssistantMessage('cycle2-msg3'));
            await waitForProcessing();
            expect(testQueue.isDisabled()).toBe(true);

            // Queue more while disconnected
            testQueue.enqueue(createAssistantMessage('cycle2-msg4'));
            await waitForProcessing();

            // Reconnect
            networkConnected = true;
            testQueue.enable();
            await waitForProcessing();

            expect(deliveredMessages).toEqual([
                'cycle1-msg1', 'cycle1-msg2',
                'cycle2-msg1', 'cycle2-msg2', 'cycle2-msg3', 'cycle2-msg4'
            ]);
            expect(testQueue.isDisabled()).toBe(false);

            testQueue.destroy();
        });

        it('should preserve message ordering with delayed messages during reconnection', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const deliveredMessages: string[] = [];
            let networkConnected = true;

            const networkSendFn = vi.fn().mockImplementation((msg: LogMessage) => {
                if (!networkConnected) {
                    throw new SocketDisconnectedError('Network connection lost');
                }
                deliveredMessages.push((msg as unknown as { testId: string }).testId);
            });

            const testQueue = new OutgoingMessageQueue(networkSendFn);

            // Send some initial messages
            testQueue.enqueue(createAssistantMessage('initial-1'));
            testQueue.enqueue(createAssistantMessage('initial-2'));
            await waitForProcessing();

            // Disconnect
            networkConnected = false;
            testQueue.enqueue(createAssistantMessage('trigger-disconnect'));
            await waitForProcessing();
            expect(testQueue.isDisabled()).toBe(true);

            // Queue messages with delays while disconnected
            testQueue.enqueue(createAssistantMessage('delayed-1'), {
                delay: 50,
                toolCallIds: ['tool-1']
            });
            testQueue.enqueue(createAssistantMessage('immediate-1'));
            testQueue.enqueue(createAssistantMessage('delayed-2'), {
                delay: 100,
                toolCallIds: ['tool-2']
            });
            testQueue.enqueue(createAssistantMessage('immediate-2'));

            // Reconnect
            networkConnected = true;
            testQueue.enable();

            // Wait for delays to expire
            await waitForProcessing(150);

            // All messages should be delivered in their queue order (by ID)
            expect(deliveredMessages).toEqual([
                'initial-1', 'initial-2',
                'trigger-disconnect',
                'delayed-1', 'immediate-1', 'delayed-2', 'immediate-2'
            ]);

            testQueue.destroy();
        });

        it('should emit sendError event only on disconnect, not on queued messages', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            let networkConnected = true;

            const networkSendFn = vi.fn().mockImplementation(() => {
                if (!networkConnected) {
                    throw new SocketDisconnectedError('Network connection lost');
                }
            });

            const testQueue = new OutgoingMessageQueue(networkSendFn);
            const sendErrorHandler = vi.fn();
            testQueue.on('sendError', sendErrorHandler);

            // Disconnect
            networkConnected = false;
            testQueue.enqueue(createAssistantMessage('trigger-disconnect'));
            await waitForProcessing();

            // Only one error event for the disconnect
            expect(sendErrorHandler).toHaveBeenCalledTimes(1);

            // Queue multiple messages while disconnected
            testQueue.enqueue(createAssistantMessage('queued-1'));
            testQueue.enqueue(createAssistantMessage('queued-2'));
            testQueue.enqueue(createAssistantMessage('queued-3'));
            await waitForProcessing();

            // No additional error events - queue is disabled, not attempting sends
            expect(sendErrorHandler).toHaveBeenCalledTimes(1);

            // Reconnect and verify no errors during delivery
            networkConnected = true;
            testQueue.enable();
            await waitForProcessing();

            expect(sendErrorHandler).toHaveBeenCalledTimes(1);
            expect(testQueue.isDisabled()).toBe(false);

            testQueue.destroy();
        });

        it('should handle system messages during reconnection flow', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const deliveredMessages: string[] = [];
            let networkConnected = true;

            const networkSendFn = vi.fn().mockImplementation((msg: LogMessage) => {
                if (!networkConnected) {
                    throw new SocketDisconnectedError('Network connection lost');
                }
                deliveredMessages.push((msg as unknown as { testId: string }).testId);
            });

            const testQueue = new OutgoingMessageQueue(networkSendFn);

            // Disconnect
            networkConnected = false;
            testQueue.enqueue(createAssistantMessage('trigger-disconnect'));
            await waitForProcessing();

            // Queue mix of system and non-system messages
            testQueue.enqueue(createSystemMessage('system-1'));
            testQueue.enqueue(createAssistantMessage('assistant-1'));
            testQueue.enqueue(createSystemMessage('system-2'));
            testQueue.enqueue(createUserMessage('user-1'));

            // Reconnect
            networkConnected = true;
            testQueue.enable();
            await waitForProcessing();

            // System messages should NOT be in delivered (they are filtered out)
            expect(deliveredMessages).toEqual([
                'trigger-disconnect',
                'assistant-1',
                'user-1'
            ]);

            testQueue.destroy();
        });

        it('should handle rapid reconnection attempts gracefully', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const deliveredMessages: string[] = [];
            let networkConnected = true;

            const networkSendFn = vi.fn().mockImplementation((msg: LogMessage) => {
                if (!networkConnected) {
                    throw new SocketDisconnectedError('Network connection lost');
                }
                deliveredMessages.push((msg as unknown as { testId: string }).testId);
            });

            const testQueue = new OutgoingMessageQueue(networkSendFn);

            // Disconnect
            networkConnected = false;
            testQueue.enqueue(createAssistantMessage('trigger'));
            await waitForProcessing();
            expect(testQueue.isDisabled()).toBe(true);

            // Queue some messages
            testQueue.enqueue(createAssistantMessage('queued-1'));
            testQueue.enqueue(createAssistantMessage('queued-2'));

            // Rapidly call enable() multiple times (simulating flaky reconnection detection)
            networkConnected = true;
            testQueue.enable();
            testQueue.enable(); // Should be no-op if already enabled
            testQueue.enable(); // Should be no-op if already enabled

            await waitForProcessing();

            // Messages should be delivered exactly once, in order
            expect(deliveredMessages).toEqual(['trigger', 'queued-1', 'queued-2']);
            expect(testQueue.isDisabled()).toBe(false);

            testQueue.destroy();
        });

        it('should handle reconnection with tool call release', async () => {
            const { SocketDisconnectedError } = await import('@/api/socketUtils');

            const deliveredMessages: string[] = [];
            let networkConnected = true;

            const networkSendFn = vi.fn().mockImplementation((msg: LogMessage) => {
                if (!networkConnected) {
                    throw new SocketDisconnectedError('Network connection lost');
                }
                deliveredMessages.push((msg as unknown as { testId: string }).testId);
            });

            const testQueue = new OutgoingMessageQueue(networkSendFn);

            // Send initial message
            testQueue.enqueue(createAssistantMessage('initial'));
            await waitForProcessing();

            // Disconnect
            networkConnected = false;
            testQueue.enqueue(createAssistantMessage('trigger-disconnect'));
            await waitForProcessing();
            expect(testQueue.isDisabled()).toBe(true);

            // Queue delayed message with tool call while disconnected
            testQueue.enqueue(createAssistantMessage('delayed-with-tool'), {
                delay: 5000, // Long delay
                toolCallIds: ['tool-xyz']
            });
            testQueue.enqueue(createAssistantMessage('after-delayed'));

            // Reconnect
            networkConnected = true;
            testQueue.enable();

            // Release the tool call to trigger immediate processing
            await testQueue.releaseToolCall('tool-xyz');
            await waitForProcessing();

            // All messages should be delivered in queue order
            expect(deliveredMessages).toEqual([
                'initial',
                'trigger-disconnect',
                'delayed-with-tool',
                'after-delayed'
            ]);

            testQueue.destroy();
        });
    });
});
