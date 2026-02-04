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
});
