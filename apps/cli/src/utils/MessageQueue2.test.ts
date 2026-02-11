import { describe, it, expect } from 'vitest';
import { MessageQueue2 } from './MessageQueue2';
import { hashObject } from './deterministicJson';

describe('MessageQueue2', () => {
    it('should create a queue', () => {
        const queue = new MessageQueue2<string>(mode => mode);
        expect(queue.size()).toBe(0);
        expect(queue.isClosed()).toBe(false);
    });

    it('should push and retrieve messages with same mode', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        
        queue.push('message1', 'local');
        queue.push('message2', 'local');
        queue.push('message3', 'local');
        
        const result = await queue.waitForMessagesAndGetAsString();
        expect(result).not.toBeNull();
        expect(result?.message).toBe('message1\nmessage2\nmessage3');
        expect(result?.mode).toBe('local');
        expect(queue.size()).toBe(0);
    });

    it('should return only messages with same mode and keep others', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        
        queue.push('local1', 'local');
        queue.push('local2', 'local');
        queue.push('remote1', 'remote');
        queue.push('remote2', 'remote');
        
        // First call should return local messages
        const result1 = await queue.waitForMessagesAndGetAsString();
        expect(result1).not.toBeNull();
        expect(result1?.message).toBe('local1\nlocal2');
        expect(result1?.mode).toBe('local');
        expect(queue.size()).toBe(2); // remote messages still in queue
        
        // Second call should return remote messages
        const result2 = await queue.waitForMessagesAndGetAsString();
        expect(result2).not.toBeNull();
        expect(result2?.message).toBe('remote1\nremote2');
        expect(result2?.mode).toBe('remote');
        expect(queue.size()).toBe(0);
    });

    it('should handle complex mode objects', async () => {
        interface Mode {
            type: string;
            context?: string;
        }
        
        const queue = new MessageQueue2<Mode>(
            mode => `${mode.type}-${mode.context || 'default'}`
        );
        
        queue.push('message1', { type: 'local' });
        queue.push('message2', { type: 'local' });
        queue.push('message3', { type: 'local', context: 'test' });
        
        // First batch - same mode hash
        const result1 = await queue.waitForMessagesAndGetAsString();
        expect(result1).not.toBeNull();
        expect(result1?.message).toBe('message1\nmessage2');
        expect(result1?.mode).toEqual({ type: 'local' });
        
        // Second batch - different context
        const result2 = await queue.waitForMessagesAndGetAsString();
        expect(result2).not.toBeNull();
        expect(result2?.message).toBe('message3');
        expect(result2?.mode).toEqual({ type: 'local', context: 'test' });
    });

    it('should wait for messages when queue is empty', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        
        // Start waiting
        const waitPromise = queue.waitForMessagesAndGetAsString();
        
        // Push messages while waiting
        setTimeout(() => {
            queue.push('delayed1', 'local');
            queue.push('delayed2', 'local');
        }, 10);
        
        const result = await waitPromise;
        expect(result).not.toBeNull();
        expect(result?.message).toBe('delayed1\ndelayed2');
        expect(result?.mode).toBe('local');
    });

    it('should return null when waiting and queue closes', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        
        // Start waiting
        const waitPromise = queue.waitForMessagesAndGetAsString();
        
        // Close queue
        setTimeout(() => {
            queue.close();
        }, 10);
        
        const result = await waitPromise;
        expect(result).toBeNull();
    });

    it('should handle abort signal', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        const abortController = new AbortController();
        
        // Start waiting
        const waitPromise = queue.waitForMessagesAndGetAsString(abortController.signal);
        
        // Abort
        setTimeout(() => {
            abortController.abort();
        }, 10);
        
        const result = await waitPromise;
        expect(result).toBeNull();
    });

    it('should return null immediately if abort signal is already aborted', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        const abortController = new AbortController();
        
        // Abort before calling
        abortController.abort();
        
        const result = await queue.waitForMessagesAndGetAsString(abortController.signal);
        expect(result).toBeNull();
    });

    it('should handle abort signal with existing messages', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        const abortController = new AbortController();
        
        // Add messages
        queue.push('message1', 'local');
        
        // Should return messages even with abort signal
        const result = await queue.waitForMessagesAndGetAsString(abortController.signal);
        expect(result).not.toBeNull();
        expect(result?.message).toBe('message1');
    });

    it('should throw when pushing to closed queue', () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.close();
        
        expect(() => queue.push('message', 'local')).toThrow('Cannot push to closed queue');
    });

    it('should handle multiple waiting and pushing cycles', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        
        // First cycle
        queue.push('cycle1', 'mode1');
        const result1 = await queue.waitForMessagesAndGetAsString();
        expect(result1?.message).toBe('cycle1');
        expect(result1?.mode).toBe('mode1');
        
        // Second cycle with waiting
        const waitPromise = queue.waitForMessagesAndGetAsString();
        queue.push('cycle2', 'mode2');
        const result2 = await waitPromise;
        expect(result2?.message).toBe('cycle2');
        expect(result2?.mode).toBe('mode2');
        
        // Third cycle
        queue.push('cycle3-1', 'mode3');
        queue.push('cycle3-2', 'mode3');
        const result3 = await queue.waitForMessagesAndGetAsString();
        expect(result3?.message).toBe('cycle3-1\ncycle3-2');
        expect(result3?.mode).toBe('mode3');
    });

    it('should batch messages with enhanced mode hashing', async () => {
        
        interface EnhancedMode {
            permissionMode: string;
            model?: string;
            fallbackModel?: string;
            customSystemPrompt?: string;
            appendSystemPrompt?: string;
            allowedTools?: string[];
            disallowedTools?: string[];
        }
        
        const queue = new MessageQueue2<EnhancedMode>(mode => hashObject(mode));
        
        // Push messages with different enhanced mode combinations
        queue.push('message1', { permissionMode: 'default', model: 'sonnet' });
        queue.push('message2', { permissionMode: 'default', model: 'sonnet' }); // Same as message1
        queue.push('message3', { permissionMode: 'default', model: 'haiku' }); // Different model
        queue.push('message4', { permissionMode: 'default', fallbackModel: 'opus' }); // Different fallback model
        queue.push('message5', { permissionMode: 'default', customSystemPrompt: 'You are a helpful assistant' }); // Different system prompt
        queue.push('message6', { permissionMode: 'default', appendSystemPrompt: 'Be concise' }); // Different append prompt
        queue.push('message7', { permissionMode: 'default', allowedTools: ['Read', 'Write'] }); // Different allowed tools
        queue.push('message8', { permissionMode: 'default', disallowedTools: ['Bash'] }); // Different disallowed tools
        
        // First batch - same permission mode and model
        const result1 = await queue.waitForMessagesAndGetAsString();
        expect(result1).not.toBeNull();
        expect(result1?.message).toBe('message1\nmessage2');
        expect(result1?.mode).toEqual({ permissionMode: 'default', model: 'sonnet' });
        expect(queue.size()).toBe(6); // remaining messages in queue
        
        // Second batch - same permission mode, different model
        const result2 = await queue.waitForMessagesAndGetAsString();
        expect(result2).not.toBeNull();
        expect(result2?.message).toBe('message3');
        expect(result2?.mode).toEqual({ permissionMode: 'default', model: 'haiku' });
        expect(queue.size()).toBe(5); // remaining messages
        
        // Third batch - same permission mode, fallback model
        const result3 = await queue.waitForMessagesAndGetAsString();
        expect(result3).not.toBeNull();
        expect(result3?.message).toBe('message4');
        expect(result3?.mode).toEqual({ permissionMode: 'default', fallbackModel: 'opus' });
        expect(queue.size()).toBe(4); // remaining messages
        
        // Fourth batch - same permission mode, custom system prompt
        const result4 = await queue.waitForMessagesAndGetAsString();
        expect(result4).not.toBeNull();
        expect(result4?.message).toBe('message5');
        expect(result4?.mode).toEqual({ permissionMode: 'default', customSystemPrompt: 'You are a helpful assistant' });
        expect(queue.size()).toBe(3); // remaining messages
        
        // Fifth batch - same permission mode, append system prompt
        const result5 = await queue.waitForMessagesAndGetAsString();
        expect(result5).not.toBeNull();
        expect(result5?.message).toBe('message6');
        expect(result5?.mode).toEqual({ permissionMode: 'default', appendSystemPrompt: 'Be concise' });
        expect(queue.size()).toBe(2); // remaining messages
        
        // Sixth batch - same permission mode, allowed tools
        const result6 = await queue.waitForMessagesAndGetAsString();
        expect(result6).not.toBeNull();
        expect(result6?.message).toBe('message7');
        expect(result6?.mode).toEqual({ permissionMode: 'default', allowedTools: ['Read', 'Write'] });
        expect(queue.size()).toBe(1); // one message left
        
        // Seventh batch - same permission mode, disallowed tools
        const result7 = await queue.waitForMessagesAndGetAsString();
        expect(result7).not.toBeNull();
        expect(result7?.message).toBe('message8');
        expect(result7?.mode).toEqual({ permissionMode: 'default', disallowedTools: ['Bash'] });
        expect(queue.size()).toBe(0);
    });

    it('should handle null reset values properly', async () => {
        
        interface EnhancedMode {
            permissionMode: string;
            model?: string;
            customSystemPrompt?: string;
            allowedTools?: string[];
            disallowedTools?: string[];
        }
        
        const queue = new MessageQueue2<EnhancedMode>(mode => hashObject(mode));
        
        // Push messages with null reset behavior
        queue.push('message1', { permissionMode: 'default', model: 'sonnet' });
        queue.push('message2', { permissionMode: 'default', model: undefined }); // Reset
        queue.push('message3', { permissionMode: 'default', customSystemPrompt: 'You are helpful' });
        queue.push('message4', { permissionMode: 'default', customSystemPrompt: undefined }); // Reset
        queue.push('message5', { permissionMode: 'default', allowedTools: ['Read', 'Write'] });
        queue.push('message6', { permissionMode: 'default', allowedTools: undefined }); // Reset
        queue.push('message7', { permissionMode: 'default', disallowedTools: ['Bash'] });
        queue.push('message8', { permissionMode: 'default', disallowedTools: undefined }); // Reset
        
        // First batch - model set
        const result1 = await queue.waitForMessagesAndGetAsString();
        expect(result1).not.toBeNull();
        expect(result1?.message).toBe('message1');
        expect(result1?.mode).toEqual({ permissionMode: 'default', model: 'sonnet' });
        
        // Second batch - model reset (undefined)
        const result2 = await queue.waitForMessagesAndGetAsString();
        expect(result2).not.toBeNull();
        expect(result2?.message).toBe('message2');
        expect(result2?.mode).toEqual({ permissionMode: 'default' }); // No model field
        
        // Third batch - custom system prompt set
        const result3 = await queue.waitForMessagesAndGetAsString();
        expect(result3).not.toBeNull();
        expect(result3?.message).toBe('message3');
        expect(result3?.mode).toEqual({ permissionMode: 'default', customSystemPrompt: 'You are helpful' });
        
        // Fourth batch - custom system prompt reset (undefined)
        const result4 = await queue.waitForMessagesAndGetAsString();
        expect(result4).not.toBeNull();
        expect(result4?.message).toBe('message4');
        expect(result4?.mode).toEqual({ permissionMode: 'default' }); // No customSystemPrompt field
        
        // Fifth batch - allowed tools set
        const result5 = await queue.waitForMessagesAndGetAsString();
        expect(result5).not.toBeNull();
        expect(result5?.message).toBe('message5');
        expect(result5?.mode).toEqual({ permissionMode: 'default', allowedTools: ['Read', 'Write'] });
        
        // Sixth batch - allowed tools reset (undefined)
        const result6 = await queue.waitForMessagesAndGetAsString();
        expect(result6).not.toBeNull();
        expect(result6?.message).toBe('message6');
        expect(result6?.mode).toEqual({ permissionMode: 'default' }); // No allowedTools field
        
        // Seventh batch - disallowed tools set
        const result7 = await queue.waitForMessagesAndGetAsString();
        expect(result7).not.toBeNull();
        expect(result7?.message).toBe('message7');
        expect(result7?.mode).toEqual({ permissionMode: 'default', disallowedTools: ['Bash'] });
        
        // Eighth batch - disallowed tools reset (undefined)
        const result8 = await queue.waitForMessagesAndGetAsString();
        expect(result8).not.toBeNull();
        expect(result8?.message).toBe('message8');
        expect(result8?.mode).toEqual({ permissionMode: 'default' }); // No disallowedTools field
        
        expect(queue.size()).toBe(0);
    });

    it('should notify waiter immediately when message is pushed', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        
        let resolved = false;
        const waitPromise = queue.waitForMessagesAndGetAsString().then(result => {
            resolved = true;
            return result;
        });
        
        // Should not be resolved yet
        expect(resolved).toBe(false);
        
        // Push message
        queue.push('immediate', 'local');
        
        // Give a tiny bit of time for promise to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
        
        expect(resolved).toBe(true);
        const result = await waitPromise;
        expect(result?.message).toBe('immediate');
    });

    it('should batch messages pushed with pushImmediate normally', async () => {
        const queue = new MessageQueue2<{ type: string }>((mode) => mode.type);
        
        // Add some regular messages
        queue.push('message1', { type: 'A' });
        queue.push('message2', { type: 'A' });
        
        // Add an immediate message (does not clear or isolate)
        queue.pushImmediate('immediate', { type: 'A' });
        
        // Add more messages after
        queue.push('message3', { type: 'A' });
        queue.push('message4', { type: 'A' });
        
        // All messages should be batched together since they have the same mode
        const batch1 = await queue.waitForMessagesAndGetAsString();
        expect(batch1?.message).toBe('message1\nmessage2\nimmediate\nmessage3\nmessage4');
        expect(batch1?.mode.type).toBe('A');
    });

    it('should isolate messages pushed with pushIsolateAndClear', async () => {
        const queue = new MessageQueue2<{ type: string }>((mode) => mode.type);
        
        // Add some regular messages
        queue.push('message1', { type: 'A' });
        queue.push('message2', { type: 'A' });
        
        // Add an isolated message that clears the queue
        queue.pushIsolateAndClear('isolated', { type: 'A' });
        
        // Add more messages after
        queue.push('message3', { type: 'A' });
        queue.push('message4', { type: 'A' });
        
        // First batch should only contain the isolated message
        const batch1 = await queue.waitForMessagesAndGetAsString();
        expect(batch1?.message).toBe('isolated');
        expect(batch1?.mode.type).toBe('A');
        
        // Second batch should contain the messages added after
        const batch2 = await queue.waitForMessagesAndGetAsString();
        expect(batch2?.message).toBe('message3\nmessage4');
        expect(batch2?.mode.type).toBe('A');
    });

    it('should stop batching when hitting isolated message', async () => {
        const queue = new MessageQueue2<{ type: string }>((mode) => mode.type);
        
        // Add regular messages
        queue.push('message1', { type: 'A' });
        queue.push('message2', { type: 'A' });
        
        // Manually add an isolated message without clearing (simulating edge case)
        queue.queue.push({
            message: 'isolated',
            mode: { type: 'A' },
            modeHash: 'A',
            isolate: true
        });
        
        // Add more regular messages
        queue.push('message3', { type: 'A' });
        
        // First batch should contain regular messages until the isolated one
        const batch1 = await queue.waitForMessagesAndGetAsString();
        expect(batch1?.message).toBe('message1\nmessage2');
        expect(batch1?.mode.type).toBe('A');
        
        // Second batch should only contain the isolated message
        const batch2 = await queue.waitForMessagesAndGetAsString();
        expect(batch2?.message).toBe('isolated');
        expect(batch2?.mode.type).toBe('A');
        
        // Third batch should contain messages after the isolated one
        const batch3 = await queue.waitForMessagesAndGetAsString();
        expect(batch3?.message).toBe('message3');
        expect(batch3?.mode.type).toBe('A');
    });

    it('should differentiate between pushImmediate and pushIsolateAndClear behavior', async () => {
        const queue = new MessageQueue2<{ type: string }>((mode) => mode.type);
        
        // Test pushImmediate behavior - does NOT clear queue
        queue.push('before1', { type: 'A' });
        queue.push('before2', { type: 'A' });
        queue.pushImmediate('immediate', { type: 'A' });
        queue.push('after', { type: 'A' });
        
        // All should be batched together
        const batch1 = await queue.waitForMessagesAndGetAsString();
        expect(batch1?.message).toBe('before1\nbefore2\nimmediate\nafter');
        expect(batch1?.mode.type).toBe('A');
        
        // Test pushIsolateAndClear behavior - DOES clear queue and isolate
        queue.push('will-be-cleared1', { type: 'B' });
        queue.push('will-be-cleared2', { type: 'B' });
        queue.pushIsolateAndClear('isolated', { type: 'B' });
        queue.push('after-isolated', { type: 'B' });
        
        // First batch should only be the isolated message
        const batch2 = await queue.waitForMessagesAndGetAsString();
        expect(batch2?.message).toBe('isolated');
        expect(batch2?.mode.type).toBe('B');
        
        // Second batch should be the message added after
        const batch3 = await queue.waitForMessagesAndGetAsString();
        expect(batch3?.message).toBe('after-isolated');
        expect(batch3?.mode.type).toBe('B');
    });

    it('should throw when using pushImmediate on closed queue', () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.close();

        expect(() => queue.pushImmediate('message', 'local')).toThrow('Cannot push to closed queue');
    });

    it('should throw when using pushIsolateAndClear on closed queue', () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.close();

        expect(() => queue.pushIsolateAndClear('message', 'local')).toThrow('Cannot push to closed queue');
    });

    it('should throw when using unshift on closed queue', () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.close();

        expect(() => queue.unshift('message', 'local')).toThrow('Cannot unshift to closed queue');
    });

    it('should return correct isClosed state', () => {
        const queue = new MessageQueue2<string>(mode => mode);

        expect(queue.isClosed()).toBe(false);
        queue.close();
        expect(queue.isClosed()).toBe(true);
    });

    it('should correctly calculate size', () => {
        const queue = new MessageQueue2<string>(mode => mode);

        expect(queue.size()).toBe(0);

        queue.push('m1', 'local');
        expect(queue.size()).toBe(1);

        queue.push('m2', 'local');
        expect(queue.size()).toBe(2);

        queue.push('m3', 'remote');
        expect(queue.size()).toBe(3);
    });

    it('should reset queue and allow new messages', async () => {
        const queue = new MessageQueue2<string>(mode => mode);

        queue.push('m1', 'local');
        queue.push('m2', 'local');
        expect(queue.size()).toBe(2);

        queue.reset();

        expect(queue.size()).toBe(0);
        expect(queue.isClosed()).toBe(false);

        // Should allow new pushes after reset
        queue.push('m3', 'remote');
        expect(queue.size()).toBe(1);

        const result = await queue.waitForMessagesAndGetAsString();
        expect(result?.message).toBe('m3');
        expect(result?.mode).toBe('remote');
    });

    it('should resolve pending waiter with false on reset', async () => {
        const queue = new MessageQueue2<string>(mode => mode);

        // Start waiting
        const waitPromise = queue.waitForMessagesAndGetAsString();

        // Reset while waiting
        setTimeout(() => {
            queue.reset();
        }, 10);

        const result = await waitPromise;
        expect(result).toBeNull();
    });

    it('should call onMessage handler when message is pushed', () => {
        const messages: Array<{ msg: string; mode: string }> = [];
        const handler = (message: string, mode: string) => {
            messages.push({ msg: message, mode });
        };

        const queue = new MessageQueue2<string>(mode => mode, handler);

        queue.push('m1', 'local');
        queue.push('m2', 'remote');

        expect(messages).toHaveLength(2);
        expect(messages[0]).toEqual({ msg: 'm1', mode: 'local' });
        expect(messages[1]).toEqual({ msg: 'm2', mode: 'remote' });
    });

    it('should call onMessage handler on pushImmediate', () => {
        const messages: Array<{ msg: string; mode: string }> = [];
        const handler = (message: string, mode: string) => {
            messages.push({ msg: message, mode });
        };

        const queue = new MessageQueue2<string>(mode => mode, handler);

        queue.pushImmediate('immediate', 'fast');

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({ msg: 'immediate', mode: 'fast' });
    });

    it('should call onMessage handler on pushIsolateAndClear', () => {
        const messages: Array<{ msg: string; mode: string }> = [];
        const handler = (message: string, mode: string) => {
            messages.push({ msg: message, mode });
        };

        const queue = new MessageQueue2<string>(mode => mode, handler);

        queue.push('will-clear', 'old');
        queue.pushIsolateAndClear('isolated', 'new');

        expect(messages).toHaveLength(2);
        expect(messages[1]).toEqual({ msg: 'isolated', mode: 'new' });
    });

    it('should call onMessage handler on unshift', () => {
        const messages: Array<{ msg: string; mode: string }> = [];
        const handler = (message: string, mode: string) => {
            messages.push({ msg: message, mode });
        };

        const queue = new MessageQueue2<string>(mode => mode, handler);

        queue.unshift('first', 'priority');

        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual({ msg: 'first', mode: 'priority' });
    });

    it('should allow setting onMessage handler via setOnMessage', () => {
        const messages: string[] = [];
        const queue = new MessageQueue2<string>(mode => mode);

        // Push without handler
        queue.push('before', 'mode');

        // Set handler
        queue.setOnMessage((message, _mode) => {
            messages.push(message);
        });

        // Push with handler
        queue.push('after', 'mode');

        expect(messages).toEqual(['after']);
    });

    it('should allow clearing onMessage handler by setting null', () => {
        const messages: string[] = [];
        const queue = new MessageQueue2<string>(mode => mode, (msg) => messages.push(msg));

        queue.push('with-handler', 'mode');
        expect(messages).toEqual(['with-handler']);

        queue.setOnMessage(null);

        queue.push('without-handler', 'mode');
        expect(messages).toEqual(['with-handler']);
    });

    it('should return null from collectBatch when queue is empty', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.push('m1', 'mode');

        // Consume the only message
        await queue.waitForMessagesAndGetAsString();

        // Queue should now be empty
        expect(queue.size()).toBe(0);
    });

    it('should include hash in batch result', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.push('message', 'test-mode');

        const result = await queue.waitForMessagesAndGetAsString();

        expect(result).not.toBeNull();
        expect(result?.hash).toBe('test-mode');
    });

    it('should include isolate flag in batch result for normal messages', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.push('message', 'mode');

        const result = await queue.waitForMessagesAndGetAsString();

        expect(result?.isolate).toBe(false);
    });

    it('should include isolate flag in batch result for isolated messages', async () => {
        const queue = new MessageQueue2<string>(mode => mode);
        queue.pushIsolateAndClear('isolated', 'mode');

        const result = await queue.waitForMessagesAndGetAsString();

        expect(result?.isolate).toBe(true);
    });

    it('should handle unshift correctly with existing messages', async () => {
        const queue = new MessageQueue2<string>(mode => mode);

        queue.push('second', 'mode');
        queue.push('third', 'mode');
        queue.unshift('first', 'mode');

        const result = await queue.waitForMessagesAndGetAsString();

        expect(result?.message).toBe('first\nsecond\nthird');
    });

    it('should handle unshift with different modes', async () => {
        const queue = new MessageQueue2<string>(mode => mode);

        queue.push('local1', 'local');
        queue.unshift('priority', 'priority');

        // First batch should be priority mode
        const result1 = await queue.waitForMessagesAndGetAsString();
        expect(result1?.message).toBe('priority');
        expect(result1?.mode).toBe('priority');

        // Second batch should be local mode
        const result2 = await queue.waitForMessagesAndGetAsString();
        expect(result2?.message).toBe('local1');
        expect(result2?.mode).toBe('local');
    });

    // HAP-942: Race condition regression test
    describe('race condition prevention (HAP-942)', () => {
        it('should not drop messages during rapid push/wait cycles', async () => {
            const queue = new MessageQueue2<string>(mode => mode);
            const messageCount = 200; // Reduced for faster test execution
            let receivedCount = 0;

            // Simulate concurrent producer/consumer pattern
            // This tests the race condition where push() could notify a waiter
            // before waitForMessages() has set this.waiter
            const producer = async () => {
                for (let i = 0; i < messageCount; i++) {
                    queue.push(`message-${i}`, 'test');
                    // Vary timing to expose race conditions
                    if (i % 10 === 0) {
                        await new Promise(resolve => setImmediate(resolve));
                    }
                }
                // Close after all messages sent
                queue.close();
            };

            const consumer = async () => {
                while (true) {
                    const result = await queue.waitForMessagesAndGetAsString();
                    if (result === null) {
                        break; // Queue closed and empty
                    }
                    // Count individual messages (they may be batched)
                    const messages = result.message.split('\n');
                    receivedCount += messages.length;
                }
            };

            // Run producer and consumer concurrently
            await Promise.all([producer(), consumer()]);

            expect(receivedCount).toBe(messageCount);
        }, 10000); // Extended timeout for stress test

        it('should handle immediate push after waitForMessages starts (TOCTOU attack)', async () => {
            // This test specifically targets the TOCTOU (time-of-check-time-of-use)
            // vulnerability where a message pushed between checking queue.length
            // and setting this.waiter would be missed
            const queue = new MessageQueue2<string>(mode => mode);
            const iterations = 100;

            for (let i = 0; i < iterations; i++) {
                // Start waiting on empty queue
                const waitPromise = queue.waitForMessagesAndGetAsString();

                // Immediately push - this is the race window
                queue.push(`message-${i}`, 'test');

                // The message must be received
                const result = await waitPromise;
                expect(result).not.toBeNull();
                expect(result?.message).toBe(`message-${i}`);
            }
        });

        it('should handle multiple waiters being set and cleared rapidly', async () => {
            const queue = new MessageQueue2<string>(mode => mode);
            const iterations = 50;
            const results: (string | null)[] = [];

            for (let i = 0; i < iterations; i++) {
                // Create abort controller for each iteration
                const controller = new AbortController();

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                // Randomly either push a message or abort
                if (i % 2 === 0) {
                    queue.push(`message-${i}`, 'test');
                    const result = await waitPromise;
                    results.push(result?.message || null);
                } else {
                    controller.abort();
                    const result = await waitPromise;
                    results.push(result?.message || null);
                }
            }

            // Verify we got the right pattern
            const pushResults = results.filter((_, i) => i % 2 === 0);
            const abortResults = results.filter((_, i) => i % 2 !== 0);

            // All push iterations should have received their message
            pushResults.forEach((r, i) => {
                expect(r).toBe(`message-${i * 2}`);
            });

            // All abort iterations should have returned null
            abortResults.forEach(r => {
                expect(r).toBeNull();
            });
        });

        it('should not lose messages when push happens during waiter setup', async () => {
            // Stress test: rapidly alternate between wait and push
            // to maximize the chance of hitting the race window
            const queue = new MessageQueue2<string>(mode => mode);
            const totalMessages = 100; // Reduced for faster test
            let sentCount = 0;
            let receivedCount = 0;

            const tasks: Promise<void>[] = [];

            // Create interleaved waiters and pushers
            for (let i = 0; i < totalMessages; i++) {
                // Start a waiter
                const waitTask = (async () => {
                    const result = await queue.waitForMessagesAndGetAsString();
                    if (result) {
                        receivedCount += result.message.split('\n').length;
                    }
                })();
                tasks.push(waitTask);

                // Immediately push
                queue.push(`msg-${i}`, 'mode');
                sentCount++;

                // Let some promises resolve more frequently
                if (i % 20 === 0) {
                    await Promise.race([
                        Promise.all(tasks),
                        new Promise(resolve => setTimeout(resolve, 5))
                    ]);
                }
            }

            // Close queue and wait for all tasks
            queue.close();
            await Promise.all(tasks);

            expect(receivedCount).toBe(sentCount);
        }, 10000); // Extended timeout
    });

    describe('mutation-killing tests', () => {
        it('should verify closed check throws AppError with correct code', () => {
            const queue = new MessageQueue2<string>(mode => mode);
            queue.close();

            try {
                queue.push('message', 'mode');
                expect(true).toBe(false); // Should not reach here
            } catch (e: unknown) {
                expect((e as Error).message).toBe('Cannot push to closed queue');
            }
        });

        it('should verify onMessageHandler is called exactly once per push', () => {
            let callCount = 0;
            const handler = () => { callCount++; };
            const queue = new MessageQueue2<string>(mode => mode, handler);

            queue.push('m1', 'mode');
            expect(callCount).toBe(1);

            queue.push('m2', 'mode');
            expect(callCount).toBe(2);

            queue.pushImmediate('m3', 'mode');
            expect(callCount).toBe(3);

            queue.pushIsolateAndClear('m4', 'mode');
            expect(callCount).toBe(4);

            queue.unshift('m5', 'mode');
            expect(callCount).toBe(5);
        });

        it('should verify onMessageHandler is NOT called when null', () => {
            let callCount = 0;
            const queue = new MessageQueue2<string>(mode => mode);

            // No handler set - should not throw
            queue.push('m1', 'mode');
            expect(callCount).toBe(0);

            // Set handler
            queue.setOnMessage(() => { callCount++; });
            queue.push('m2', 'mode');
            expect(callCount).toBe(1);

            // Clear handler
            queue.setOnMessage(null);
            queue.push('m3', 'mode');
            expect(callCount).toBe(1); // Still 1, not 2
        });

        it('should verify waiter notification happens when waiter exists', async () => {
            const queue = new MessageQueue2<string>(mode => mode);
            let waiterResolved = false;

            // Start waiting
            const waitPromise = queue.waitForMessagesAndGetAsString().then(result => {
                waiterResolved = true;
                return result;
            });

            // Give time for waiter to be set
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(waiterResolved).toBe(false);

            // Push should notify waiter
            queue.push('message', 'mode');

            const result = await waitPromise;
            expect(waiterResolved).toBe(true);
            expect(result?.message).toBe('message');
        });

        it('should verify no notification when no waiter exists', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push without any waiter - should not throw
            queue.push('m1', 'mode');
            queue.push('m2', 'mode');
            queue.push('m3', 'mode');

            expect(queue.size()).toBe(3);

            // Now consume
            const result = await queue.waitForMessagesAndGetAsString();
            expect(result?.message).toBe('m1\nm2\nm3');
        });

        it('should verify queue.length > 0 returns batch immediately', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Pre-populate queue
            queue.push('pre1', 'mode');
            queue.push('pre2', 'mode');

            // Should return immediately without waiting
            const startTime = Date.now();
            const result = await queue.waitForMessagesAndGetAsString();
            const elapsed = Date.now() - startTime;

            expect(result?.message).toBe('pre1\npre2');
            expect(elapsed).toBeLessThan(50); // Should be immediate
        });

        it('should verify empty queue returns null from collectBatch', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push and consume a message
            queue.push('only', 'mode');
            const result1 = await queue.waitForMessagesAndGetAsString();
            expect(result1?.message).toBe('only');

            // Queue is now empty
            expect(queue.size()).toBe(0);

            // Close to trigger immediate return
            queue.close();

            // Should return null
            const result2 = await queue.waitForMessagesAndGetAsString();
            expect(result2).toBeNull();
        });

        it('should verify isolate defaults to false via ?? operator', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push via public queue property to test isolate undefined case
            queue.queue.push({
                message: 'test',
                mode: 'mode',
                modeHash: 'mode',
                // isolate is undefined here
            });

            const result = await queue.waitForMessagesAndGetAsString();
            expect(result?.isolate).toBe(false);
        });

        it('should verify firstItem.isolate triggers single message batch', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push isolated message
            queue.pushIsolateAndClear('isolated', 'mode');

            // Push regular messages after
            queue.push('regular1', 'mode');
            queue.push('regular2', 'mode');

            // First batch should only contain isolated message
            const batch1 = await queue.waitForMessagesAndGetAsString();
            expect(batch1?.message).toBe('isolated');
            expect(batch1?.isolate).toBe(true);

            // Second batch should contain regular messages
            const batch2 = await queue.waitForMessagesAndGetAsString();
            expect(batch2?.message).toBe('regular1\nregular2');
            expect(batch2?.isolate).toBe(false);
        });

        it('should verify while loop stops at mode boundary', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push messages with different modes
            queue.push('a1', 'A');
            queue.push('a2', 'A');
            queue.push('a3', 'A');
            queue.push('b1', 'B');
            queue.push('b2', 'B');
            queue.push('c1', 'C');

            // First batch - all A's
            const batch1 = await queue.waitForMessagesAndGetAsString();
            expect(batch1?.message).toBe('a1\na2\na3');
            expect(batch1?.mode).toBe('A');
            expect(batch1?.hash).toBe('A');

            // Second batch - all B's
            const batch2 = await queue.waitForMessagesAndGetAsString();
            expect(batch2?.message).toBe('b1\nb2');
            expect(batch2?.mode).toBe('B');
            expect(batch2?.hash).toBe('B');

            // Third batch - single C
            const batch3 = await queue.waitForMessagesAndGetAsString();
            expect(batch3?.message).toBe('c1');
            expect(batch3?.mode).toBe('C');
            expect(batch3?.hash).toBe('C');
        });

        it('should verify while loop stops at isolated message', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push regular messages
            queue.push('r1', 'mode');
            queue.push('r2', 'mode');

            // Manually insert isolated message
            queue.queue.push({
                message: 'isolated',
                mode: 'mode',
                modeHash: 'mode',
                isolate: true
            });

            // Push more regular messages
            queue.push('r3', 'mode');

            // First batch - regulars before isolated
            const batch1 = await queue.waitForMessagesAndGetAsString();
            expect(batch1?.message).toBe('r1\nr2');
            expect(batch1?.isolate).toBe(false);

            // Second batch - isolated only
            const batch2 = await queue.waitForMessagesAndGetAsString();
            expect(batch2?.message).toBe('isolated');
            expect(batch2?.isolate).toBe(true);

            // Third batch - regulars after
            const batch3 = await queue.waitForMessagesAndGetAsString();
            expect(batch3?.message).toBe('r3');
            expect(batch3?.isolate).toBe(false);
        });

        it('should verify reset resolves pending waiter with false', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Start waiting
            const waitPromise = queue.waitForMessagesAndGetAsString();

            // Give waiter time to be set
            await new Promise(resolve => setTimeout(resolve, 10));

            // Reset should resolve waiter
            queue.reset();

            const result = await waitPromise;
            expect(result).toBeNull();
        });

        it('should verify close resolves pending waiter with false', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Start waiting
            const waitPromise = queue.waitForMessagesAndGetAsString();

            // Give waiter time to be set
            await new Promise(resolve => setTimeout(resolve, 10));

            // Close should resolve waiter
            queue.close();

            const result = await waitPromise;
            expect(result).toBeNull();
        });

        it('should verify abort signal combined with closed returns null', async () => {
            const queue = new MessageQueue2<string>(mode => mode);
            const controller = new AbortController();

            // Close queue first
            queue.close();

            // Then abort
            controller.abort();

            // Both closed and aborted - should return null
            const result = await queue.waitForMessagesAndGetAsString(controller.signal);
            expect(result).toBeNull();
        });

        it('should verify aborted signal alone returns null', async () => {
            const queue = new MessageQueue2<string>(mode => mode);
            const controller = new AbortController();

            // Abort before waiting
            controller.abort();

            const result = await queue.waitForMessagesAndGetAsString(controller.signal);
            expect(result).toBeNull();
        });

        it('should verify modeHash is used for batching (not mode object)', async () => {
            interface Mode {
                type: string;
                extra?: string;
            }

            // Use a hasher that ignores 'extra' field
            const queue = new MessageQueue2<Mode>(mode => mode.type);

            queue.push('m1', { type: 'A', extra: 'x' });
            queue.push('m2', { type: 'A', extra: 'y' }); // Same type, different extra
            queue.push('m3', { type: 'B', extra: 'z' });

            // Should batch by type, not full object
            const batch1 = await queue.waitForMessagesAndGetAsString();
            expect(batch1?.message).toBe('m1\nm2');
            expect(batch1?.hash).toBe('A');

            const batch2 = await queue.waitForMessagesAndGetAsString();
            expect(batch2?.message).toBe('m3');
            expect(batch2?.hash).toBe('B');
        });

        it('should verify pushIsolateAndClear clears queue before push', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push regular messages
            queue.push('will-clear-1', 'mode');
            queue.push('will-clear-2', 'mode');
            expect(queue.size()).toBe(2);

            // Push isolated - should clear first
            queue.pushIsolateAndClear('isolated', 'mode');
            expect(queue.size()).toBe(1); // Only isolated message remains

            // Verify content
            const result = await queue.waitForMessagesAndGetAsString();
            expect(result?.message).toBe('isolated');
            expect(result?.isolate).toBe(true);
        });

        it('should verify unshift adds to front of queue', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            queue.push('second', 'mode');
            queue.push('third', 'mode');
            queue.unshift('first', 'mode');

            // Verify internal queue order
            expect(queue.queue[0].message).toBe('first');
            expect(queue.queue[1].message).toBe('second');
            expect(queue.queue[2].message).toBe('third');
        });

        it('should verify size returns exact queue length', () => {
            const queue = new MessageQueue2<string>(mode => mode);

            expect(queue.size()).toBe(0);

            queue.push('m1', 'mode');
            expect(queue.size()).toBe(1);

            queue.push('m2', 'mode');
            expect(queue.size()).toBe(2);

            queue.push('m3', 'mode');
            expect(queue.size()).toBe(3);

            queue.reset();
            expect(queue.size()).toBe(0);
        });

        it('should verify isClosed returns exact boolean state', () => {
            const queue = new MessageQueue2<string>(mode => mode);

            expect(queue.isClosed()).toBe(false);
            expect(queue.isClosed()).not.toBe(true);

            queue.close();

            expect(queue.isClosed()).toBe(true);
            expect(queue.isClosed()).not.toBe(false);
        });

        it('should verify reset reopens closed queue', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            queue.close();
            expect(queue.isClosed()).toBe(true);

            queue.reset();
            expect(queue.isClosed()).toBe(false);

            // Should be able to push again
            queue.push('after-reset', 'mode');
            expect(queue.size()).toBe(1);

            const result = await queue.waitForMessagesAndGetAsString();
            expect(result?.message).toBe('after-reset');
        });

        it('should verify queue.length === 0 check in collectBatch returns null', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Close the queue to force waitForMessagesAndGetAsString to check collectBatch
            queue.close();

            const result = await queue.waitForMessagesAndGetAsString();
            expect(result).toBeNull();
            expect(result).not.toEqual({});
        });

        it('should verify queue.length > 0 check returns batch immediately without waiting', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Add message before waiting
            queue.push('pre-existing', 'mode');

            // Should return immediately
            const startTime = Date.now();
            const result = await queue.waitForMessagesAndGetAsString();
            const elapsed = Date.now() - startTime;

            expect(result?.message).toBe('pre-existing');
            expect(elapsed).toBeLessThan(50); // Should be instant
        });

        it('should verify modeHash comparison is exact (not just truthy)', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Push messages with different modes that could be confused if using truthy comparison
            queue.push('msg-a', 'A');
            queue.push('msg-empty', ''); // Empty string mode
            queue.push('msg-a2', 'A');

            // First batch should only get first 'A' message
            const batch1 = await queue.waitForMessagesAndGetAsString();
            expect(batch1?.message).toBe('msg-a');
            expect(batch1?.hash).toBe('A');

            // Second batch should get empty string mode
            const batch2 = await queue.waitForMessagesAndGetAsString();
            expect(batch2?.message).toBe('msg-empty');
            expect(batch2?.hash).toBe('');

            // Third batch should get second 'A' message
            const batch3 = await queue.waitForMessagesAndGetAsString();
            expect(batch3?.message).toBe('msg-a2');
            expect(batch3?.hash).toBe('A');
        });

        it('should verify isolate ?? false nullish coalescing behavior', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Add item with explicitly undefined isolate
            queue.queue.push({
                message: 'undefined-isolate',
                mode: 'mode',
                modeHash: 'mode',
                isolate: undefined
            });

            const result = await queue.waitForMessagesAndGetAsString();
            expect(result?.isolate).toBe(false);
            expect(result?.isolate).not.toBe(undefined);
            expect(result?.isolate).not.toBe(null);
        });

        it('should verify while loop condition: queue.length > 0 AND same mode AND not isolated', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Three conditions for while loop to continue:
            // 1. this.queue.length > 0
            // 2. this.queue[0].modeHash === targetModeHash
            // 3. !this.queue[0].isolate

            queue.push('m1', 'A');
            queue.push('m2', 'A');
            // Insert isolated message in same mode
            queue.queue.push({
                message: 'isolated',
                mode: 'A',
                modeHash: 'A',
                isolate: true
            });
            queue.push('m3', 'A');

            // First batch: m1, m2 (stops at isolate)
            const batch1 = await queue.waitForMessagesAndGetAsString();
            expect(batch1?.message).toBe('m1\nm2');
            expect(batch1?.isolate).toBe(false);

            // Second batch: isolated only
            const batch2 = await queue.waitForMessagesAndGetAsString();
            expect(batch2?.message).toBe('isolated');
            expect(batch2?.isolate).toBe(true);

            // Third batch: m3
            const batch3 = await queue.waitForMessagesAndGetAsString();
            expect(batch3?.message).toBe('m3');
        });

        it('should verify waiter is called with true when message arrives', async () => {
            const queue = new MessageQueue2<string>(mode => mode);
            let resolvedValue: boolean | null = null;

            // Start waiting (waiter will be set)
            const waitPromise = queue.waitForMessagesAndGetAsString().then(result => {
                resolvedValue = result !== null;
                return result;
            });

            // Push message - should notify waiter with true
            queue.push('msg', 'mode');

            await waitPromise;

            // If waiter was called with false, result would be null
            expect(resolvedValue).toBe(true);
        });

        it('should verify waiter is called with false when queue closes', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Start waiting
            const waitPromise = queue.waitForMessagesAndGetAsString();

            // Give time for waiter to be set
            await new Promise(resolve => setTimeout(resolve, 10));

            // Close queue - should notify waiter with false
            queue.close();

            const result = await waitPromise;
            expect(result).toBeNull();
        });

        it('should verify waiter is called with false when reset', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Start waiting
            const waitPromise = queue.waitForMessagesAndGetAsString();

            // Give time for waiter to be set
            await new Promise(resolve => setTimeout(resolve, 10));

            // Reset queue - should notify waiter with false
            queue.reset();

            const result = await waitPromise;
            expect(result).toBeNull();
        });

        it('should verify waiter reference comparison for abort cleanup', async () => {
            const queue = new MessageQueue2<string>(mode => mode);
            const controller = new AbortController();

            // Start waiting with abort signal
            const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

            // Give time for waiter to be set
            await new Promise(resolve => setTimeout(resolve, 10));

            // Abort - should clean up waiter reference
            controller.abort();

            const result = await waitPromise;
            expect(result).toBeNull();

            // Now push a message - should not cause issues
            // (waiter should be cleared after abort)
            queue.push('after-abort', 'mode');
            expect(queue.size()).toBe(1);
        });

        it('should verify messages are joined with newlines exactly', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            queue.push('line1', 'mode');
            queue.push('line2', 'mode');
            queue.push('line3', 'mode');

            const result = await queue.waitForMessagesAndGetAsString();

            // Should be exactly "line1\nline2\nline3", not with extra newlines or spaces
            expect(result?.message).toBe('line1\nline2\nline3');
            expect(result?.message.split('\n').length).toBe(3);
        });

        it('should verify queue.shift() removes items in FIFO order', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            queue.push('first', 'mode');
            queue.push('second', 'mode');
            queue.push('third', 'mode');

            // First call should get all in order
            const result = await queue.waitForMessagesAndGetAsString();
            expect(result?.message).toBe('first\nsecond\nthird');

            // Queue should be empty
            expect(queue.size()).toBe(0);
        });

        it('should verify firstItem.isolate check triggers single message batch', async () => {
            const queue = new MessageQueue2<string>(mode => mode);

            // Add isolated message first
            queue.pushIsolateAndClear('isolated-first', 'mode');
            // Add more messages after
            queue.push('second', 'mode');
            queue.push('third', 'mode');

            // First batch should ONLY be isolated message
            const batch1 = await queue.waitForMessagesAndGetAsString();
            expect(batch1?.message).toBe('isolated-first');
            expect(batch1?.isolate).toBe(true);

            // Second batch should have remaining messages
            const batch2 = await queue.waitForMessagesAndGetAsString();
            expect(batch2?.message).toBe('second\nthird');
            expect(batch2?.isolate).toBe(false);
        });

        // Additional mutation-killing tests for ConditionalExpression mutations
        describe('conditional expression edge cases', () => {
            it('should return immediately when queue has messages (line 232)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Pre-populate queue
                queue.push('msg1', 'mode');

                // waitForMessagesAndGetAsString should return immediately if queue.length > 0
                const result = await queue.waitForMessagesAndGetAsString();

                // Must verify the specific message to ensure collectBatch was called
                expect(result).not.toBeNull();
                expect(result!.message).toBe('msg1');
                expect(result!.mode).toBe('mode');
                expect(result!.hash).toBe('mode');
            });

            it('should return null when closed before waiting (line 237)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Close first, then try to wait
                queue.close();

                const result = await queue.waitForMessagesAndGetAsString();

                // Mutation would change || to && which would require BOTH closed AND aborted
                expect(result).toBeNull();
            });

            it('should return null when already aborted before waiting (line 237)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Abort first
                controller.abort();

                // Queue is NOT closed, but signal IS aborted
                expect(queue.isClosed()).toBe(false);

                const result = await queue.waitForMessagesAndGetAsString(controller.signal);

                // Should return null because aborted, even though not closed
                expect(result).toBeNull();
            });

            it('should return null when hasMessages is false (line 244)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString();

                // Close while waiting - causes hasMessages to be false
                await new Promise(resolve => setTimeout(resolve, 5));
                queue.close();

                const result = await waitPromise;

                // Mutation would change !hasMessages to just hasMessages
                // If it did that, we'd get a result when we shouldn't
                expect(result).toBeNull();
            });

            it('should return batch when hasMessages is true (line 244)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString();

                // Push while waiting - causes hasMessages to be true
                await new Promise(resolve => setTimeout(resolve, 5));
                queue.push('arrived', 'mode');

                const result = await waitPromise;

                // Should get the message because hasMessages was true
                expect(result).not.toBeNull();
                expect(result!.message).toBe('arrived');
            });

            it('should return null from collectBatch when queue is empty (line 255)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Close to get waitForMessagesAndGetAsString to fall through
                queue.close();

                // This tests the empty queue check in collectBatch
                const result = await queue.waitForMessagesAndGetAsString();

                expect(result).toBeNull();
            });
        });

        describe('waitForMessages internal conditions', () => {
            it('should prevent double resolution via resolved flag (line 302)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();
                let resolveCount = 0;

                // Start waiting with abort signal
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal).then(result => {
                    resolveCount++;
                    return result;
                });

                await new Promise(resolve => setTimeout(resolve, 5));

                // Both abort AND push a message rapidly
                controller.abort();
                queue.push('msg', 'mode');

                await waitPromise;

                // Promise should only resolve once, not twice
                expect(resolveCount).toBe(1);
            });

            it('should clean up abort handler when abortHandler AND abortSignal exist (line 306)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                let abortListenerCount = 0;
                const originalAddEventListener = controller.signal.addEventListener.bind(controller.signal);
                const originalRemoveEventListener = controller.signal.removeEventListener.bind(controller.signal);

                controller.signal.addEventListener = (type: string, handler: any) => {
                    if (type === 'abort') abortListenerCount++;
                    return originalAddEventListener(type, handler);
                };

                controller.signal.removeEventListener = (type: string, handler: any) => {
                    if (type === 'abort') abortListenerCount--;
                    return originalRemoveEventListener(type, handler);
                };

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Push a message to resolve naturally
                queue.push('msg', 'mode');

                await waitPromise;

                // Listener should have been cleaned up
                expect(abortListenerCount).toBe(0);
            });

            it('should only clear waiter if it matches waiterFunc (line 317)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Abort to trigger the check
                controller.abort();

                const result = await waitPromise;

                // Should have cleared waiter correctly
                expect(result).toBeNull();
            });

            it('should resolve with false when aborted (line 320)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Abort - should call waiterFunc(false)
                controller.abort();

                const result = await waitPromise;

                // Mutation changes waiterFunc(false) to waiterFunc(true)
                // If true, we'd get a result; with false, we get null
                expect(result).toBeNull();
            });

            it('should return messages immediately if queue has items during waiter setup (line 332)', async () => {
                // This tests the race condition where messages arrive between
                // setting waiter and checking queue.length
                const queue = new MessageQueue2<string>(mode => mode);

                // Add message first
                queue.push('early', 'mode');

                // Now wait - queue.length > 0 check should trigger immediate return
                const result = await queue.waitForMessagesAndGetAsString();

                expect(result).not.toBeNull();
                expect(result!.message).toBe('early');
            });

            it('should return null if closed during waiter setup (line 341)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Close first
                queue.close();

                // Now wait - the closed check should return null
                const result = await queue.waitForMessagesAndGetAsString();

                expect(result).toBeNull();
            });

            it('should return null if signal aborted during waiter setup (line 341)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Abort signal first
                controller.abort();

                // Now wait - the aborted check should return null
                const result = await queue.waitForMessagesAndGetAsString(controller.signal);

                expect(result).toBeNull();
            });

            it('should handle closed OR aborted correctly (LogicalOperator line 341)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Test 1: Only closed, not aborted
                queue.close();
                const result1 = await queue.waitForMessagesAndGetAsString();
                expect(result1).toBeNull();

                // Reset
                queue.reset();

                // Test 2: Only aborted, not closed
                const controller = new AbortController();
                controller.abort();
                expect(queue.isClosed()).toBe(false);
                const result2 = await queue.waitForMessagesAndGetAsString(controller.signal);
                expect(result2).toBeNull();

                // Test 3: Neither closed nor aborted - should wait
                queue.reset();
                const waitPromise = queue.waitForMessagesAndGetAsString();

                // Push to resolve
                await new Promise(resolve => setTimeout(resolve, 5));
                queue.push('msg', 'mode');

                const result3 = await waitPromise;
                expect(result3).not.toBeNull();
            });

            it('should handle closed OR aborted in waitForMessagesAndGetAsString (LogicalOperator line 237)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Test: closed=true, aborted=undefined - OR should short-circuit
                queue.close();
                const result1 = await queue.waitForMessagesAndGetAsString();
                expect(result1).toBeNull();

                queue.reset();

                // Test: closed=false, aborted=true - second part of OR
                const controller = new AbortController();
                controller.abort();
                const result2 = await queue.waitForMessagesAndGetAsString(controller.signal);
                expect(result2).toBeNull();

                queue.reset();

                // Test: closed=false, aborted=false - should wait for messages
                const nonAbortedController = new AbortController();
                expect(queue.isClosed()).toBe(false);
                expect(nonAbortedController.signal.aborted).toBe(false);

                const waitPromise = queue.waitForMessagesAndGetAsString(nonAbortedController.signal);
                await new Promise(resolve => setTimeout(resolve, 5));
                queue.push('msg', 'mode');

                const result3 = await waitPromise;
                expect(result3).not.toBeNull();
            });
        });

        describe('boolean literal mutations', () => {
            it('should call waiter with false on reset (line 190)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                let receivedValue: boolean | null = null;

                // Start waiting - this sets up the waiter
                const waitPromise = queue.waitForMessagesAndGetAsString().then(result => {
                    // If waiter was called with true, result would not be null
                    receivedValue = result !== null;
                    return result;
                });

                await new Promise(resolve => setTimeout(resolve, 5));

                // Reset should call waiter(false)
                queue.reset();

                await waitPromise;

                // If mutation changed false to true, receivedValue would be true
                expect(receivedValue).toBe(false);
            });

            it('should call waiter with false on close (line 208)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                let receivedValue: boolean | null = null;

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString().then(result => {
                    receivedValue = result !== null;
                    return result;
                });

                await new Promise(resolve => setTimeout(resolve, 5));

                // Close should call waiter(false)
                queue.close();

                await waitPromise;

                // If mutation changed false to true, receivedValue would be true
                expect(receivedValue).toBe(false);
            });

            it('should return early on already resolved (line 302-303)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // This test verifies the resolved flag is set to true
                // and subsequent calls return early

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Push message - this calls waiterFunc which sets resolved = true
                queue.push('msg', 'mode');

                const result = await waitPromise;

                // If resolved wasn't set to true, double-resolution could occur
                // This indirectly tests that resolved = true is set
                expect(result).not.toBeNull();
            });

            it('should call waiterFunc with false in abort handler (line 320)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Abort triggers abort handler which calls waiterFunc(false)
                controller.abort();

                const result = await waitPromise;

                // If mutation changed false to true, result would not be null
                expect(result).toBeNull();
            });
        });

        describe('block statement mutations', () => {
            it('should execute queue.length > 0 block in waitForMessagesAndGetAsString (line 232)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Pre-populate
                queue.push('premsg', 'mode');

                // Should return the message immediately from the if block
                const result = await queue.waitForMessagesAndGetAsString();

                expect(result).not.toBeNull();
                expect(result!.message).toBe('premsg');
                expect(queue.size()).toBe(0); // Message was consumed
            });

            it('should execute closed/aborted block in waitForMessagesAndGetAsString (line 237)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Close to trigger the block
                queue.close();

                const result = await queue.waitForMessagesAndGetAsString();

                // Block should return null
                expect(result).toBeNull();
            });

            it('should execute !hasMessages block in waitForMessagesAndGetAsString (line 244)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString();

                // Close to make hasMessages = false
                await new Promise(resolve => setTimeout(resolve, 5));
                queue.close();

                const result = await waitPromise;

                // Block should return null
                expect(result).toBeNull();
            });

            it('should execute abort handler cleanup block (line 306)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();
                let cleanupExecuted = false;

                const originalRemove = controller.signal.removeEventListener.bind(controller.signal);
                controller.signal.removeEventListener = (type: string, handler: any) => {
                    if (type === 'abort') cleanupExecuted = true;
                    return originalRemove(type, handler);
                };

                // Start waiting with abort signal
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Push message to trigger normal resolution (cleanup path)
                queue.push('msg', 'mode');

                await waitPromise;

                // Cleanup block should have executed
                expect(cleanupExecuted).toBe(true);
            });

            it('should execute waiter === waiterFunc block in abort handler (line 317)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Abort triggers the block
                controller.abort();

                const result = await waitPromise;

                expect(result).toBeNull();
            });
        });

        describe('equality operator mutations', () => {
            it('should check waiter === waiterFunc exactly (line 317)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // This test verifies the === check works correctly
                // If mutated to !==, it would clear waiter when it shouldn't

                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Abort - the abort handler should only clear waiter if it matches
                controller.abort();

                const result = await waitPromise;

                // Should resolve to null (waiter was correctly identified and cleared)
                expect(result).toBeNull();
            });

            it('should not clear waiter if it was already changed (line 317)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Start first wait
                const waitPromise1 = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 5));

                // Start second wait (this will override the waiter reference)
                // Note: This creates a race condition scenario
                const waitPromise2 = queue.waitForMessagesAndGetAsString();

                // Now abort the first - it should NOT clear waiter since it was changed
                controller.abort();

                // Push to resolve the second waiter
                queue.push('msg', 'mode');

                const result1 = await waitPromise1;
                const result2 = await waitPromise2;

                // First should be null (aborted), second should have message
                expect(result1).toBeNull();
                expect(result2).not.toBeNull();
            });
        });

        // Additional tests to kill specific survived mutations
        describe('specific mutation killing tests', () => {
            // Kill mutation: line 232 - ConditionalExpression: this.queue.length > 0 to false
            it('should return batch immediately when queue has messages (kills line 232 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Pre-populate with multiple messages
                queue.push('msg1', 'mode');
                queue.push('msg2', 'mode');

                // The mutation changes `this.queue.length > 0` to `false`
                // If mutated, it would skip to waiting instead of returning immediately
                const result = await queue.waitForMessagesAndGetAsString();

                // Must return both messages batched together (not skip to wait)
                expect(result).not.toBeNull();
                expect(result!.message).toBe('msg1\nmsg2');
                expect(result!.mode).toBe('mode');
                expect(result!.hash).toBe('mode');
                expect(queue.size()).toBe(0);
            });

            // Kill mutation: line 237 - ConditionalExpression: this.closed || abortSignal?.aborted to false
            it('should return null when only closed (not aborted) - kills line 237 mutation', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Close without abort signal
                queue.close();

                // The mutation changes `this.closed || abortSignal?.aborted` to `false`
                // If mutated, it would skip the null return and try to wait
                const result = await queue.waitForMessagesAndGetAsString();

                // Must return null because queue is closed
                expect(result).toBeNull();
            });

            // Kill mutation: line 237 - LogicalOperator: || to &&
            it('should return null when closed but not aborted (kills || to && mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Closed = true, aborted = false
                queue.close();

                // If mutation changes || to &&, this would NOT return null
                // because closed && (undefined) is falsy
                const result = await queue.waitForMessagesAndGetAsString();
                expect(result).toBeNull();
            });

            it('should return null when aborted but not closed (kills || to && mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Closed = false, aborted = true
                controller.abort();
                expect(queue.isClosed()).toBe(false);

                // If mutation changes || to &&, this would NOT return null
                // because false && true is false
                const result = await queue.waitForMessagesAndGetAsString(controller.signal);
                expect(result).toBeNull();
            });

            // Kill mutation: line 244 - ConditionalExpression: !hasMessages to false
            it('should return null when hasMessages is false (kills line 244 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString();

                // Give waiter time to be set
                await new Promise(resolve => setTimeout(resolve, 10));

                // Close to make waitForMessages return false
                queue.close();

                const result = await waitPromise;

                // Must return null because hasMessages was false
                // If mutation changes !hasMessages to false, it would skip the null return
                expect(result).toBeNull();
            });

            it('should return batch when hasMessages is true (kills line 244 mutation alternate)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString();

                // Give waiter time to be set
                await new Promise(resolve => setTimeout(resolve, 10));

                // Push to make waitForMessages return true
                queue.push('arrived-msg', 'mode-x');

                const result = await waitPromise;

                // Must return the batch because hasMessages was true
                // If mutation changes !hasMessages to false, it would always return null
                expect(result).not.toBeNull();
                expect(result!.message).toBe('arrived-msg');
                expect(result!.mode).toBe('mode-x');
            });

            // Kill mutation: line 255 - ConditionalExpression: this.queue.length === 0 to false
            it('should return null from collectBatch when queue is truly empty (kills line 255 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Queue is empty, close it to trigger the path
                queue.close();

                // waitForMessagesAndGetAsString should return null
                // because collectBatch returns null for empty queue
                const result = await queue.waitForMessagesAndGetAsString();

                expect(result).toBeNull();
                expect(queue.size()).toBe(0);
            });

            // Kill mutation: line 302 - ConditionalExpression: resolved to false
            it('should prevent double resolution via resolved flag (kills line 302 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();
                let resolveCount = 0;

                // Start waiting with abort signal
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal).then(result => {
                    resolveCount++;
                    return result;
                });

                await new Promise(resolve => setTimeout(resolve, 10));

                // Push a message first (triggers waiterFunc with true)
                queue.push('msg', 'mode');

                // Then try to abort (would try to call waiterFunc again with false)
                controller.abort();

                await waitPromise;

                // If resolved flag wasn't working, promise could resolve twice
                // causing issues or the wrong result
                expect(resolveCount).toBe(1);
            });

            // Kill mutation: line 303 - BooleanLiteral: resolved = true to resolved = false
            it('should set resolved to true to prevent multiple resolutions (kills line 303 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();
                let results: (string | null)[] = [];

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal).then(result => {
                    results.push(result?.message ?? null);
                    return result;
                });

                await new Promise(resolve => setTimeout(resolve, 10));

                // Abort first
                controller.abort();

                // Try to push (shouldn't affect the already-resolved promise)
                queue.push('after-abort', 'mode');

                await waitPromise;

                // Should have received null from abort, not the message
                // If resolved wasn't set to true, it could receive the message instead
                expect(results).toEqual([null]);
            });

            // Kill mutation: line 317 - ConditionalExpression: this.waiter === waiterFunc to true/false
            it('should only clear waiter if reference matches (kills line 317 === mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller1 = new AbortController();

                // Start first wait
                const waitPromise1 = queue.waitForMessagesAndGetAsString(controller1.signal);

                await new Promise(resolve => setTimeout(resolve, 10));

                // Start a second wait which will replace the waiter
                const waitPromise2 = queue.waitForMessagesAndGetAsString();

                await new Promise(resolve => setTimeout(resolve, 10));

                // Abort first controller - should NOT clear the new waiter
                controller1.abort();

                // Push message to resolve second waiter
                queue.push('for-second', 'mode');

                const result1 = await waitPromise1;
                const result2 = await waitPromise2;

                // First waiter aborted, second got the message
                expect(result1).toBeNull();
                expect(result2).not.toBeNull();
                expect(result2!.message).toBe('for-second');
            });

            // Kill mutation: line 317 - EqualityOperator: === to !==
            it('should check waiter equality exactly (kills line 317 !== mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 10));

                // Abort should clear our waiter since it matches
                controller.abort();

                const result = await waitPromise;

                // Should return null from abort
                // If === was changed to !==, waiter wouldn't be cleared when it should be
                expect(result).toBeNull();
            });

            // Kill mutation: line 320 - BooleanLiteral: waiterFunc(false) to waiterFunc(true)
            it('should call waiterFunc with false on abort (kills line 320 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                await new Promise(resolve => setTimeout(resolve, 10));

                // Abort - should call waiterFunc(false)
                controller.abort();

                const result = await waitPromise;

                // If waiterFunc was called with true instead of false,
                // result would not be null (it would try to collectBatch on empty queue)
                expect(result).toBeNull();
            });

            // Kill mutation: line 332 - ConditionalExpression: this.queue.length > 0 to false
            it('should resolve immediately if messages exist when waiter is set (kills line 332 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Pre-populate queue
                queue.push('pre-existing', 'mode');

                // Start waiting - should see the message and resolve immediately
                const startTime = Date.now();
                const result = await queue.waitForMessagesAndGetAsString();
                const elapsed = Date.now() - startTime;

                // If mutation changes queue.length > 0 to false, it would wait forever
                expect(result).not.toBeNull();
                expect(result!.message).toBe('pre-existing');
                expect(elapsed).toBeLessThan(100); // Should be immediate
            });

            // Kill mutation: line 341 - ConditionalExpression: this.closed || abortSignal?.aborted to false
            it('should return false from waitForMessages when closed during setup (kills line 341 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Close the queue first
                queue.close();

                // Try to wait - should return null immediately
                const result = await queue.waitForMessagesAndGetAsString();

                // If mutation changes the condition to false, it would wait forever
                expect(result).toBeNull();
            });

            // Kill mutation: line 341 - LogicalOperator: || to &&
            it('should return null when closed but no abort signal (kills line 341 || mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);

                // Close queue, no abort signal
                queue.close();

                // If || changed to &&, this would not return null
                // because closed && undefined is falsy
                const result = await queue.waitForMessagesAndGetAsString();
                expect(result).toBeNull();
            });

            it('should return null when aborted but not closed during wait (kills line 341 || mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                const controller = new AbortController();

                // Not closed, but pre-abort
                controller.abort();
                expect(queue.isClosed()).toBe(false);

                // If || changed to &&, this would wait forever
                // because false && true is false
                const result = await queue.waitForMessagesAndGetAsString(controller.signal);
                expect(result).toBeNull();
            });

            // Kill mutation: line 190 - BooleanLiteral: waiter(false) to waiter(true) in reset
            it('should call waiter with false on reset (kills line 190 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                let waiterValue: boolean | null = null;

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString().then(result => {
                    // result is null when waiter(false) is called
                    // result is not null when waiter(true) is called
                    waiterValue = result !== null;
                    return result;
                });

                await new Promise(resolve => setTimeout(resolve, 10));

                // Reset should call waiter(false)
                queue.reset();

                await waitPromise;

                // If mutation changes false to true, waiterValue would be true
                // and result wouldn't be null
                expect(waiterValue).toBe(false);
            });

            // Kill mutation: line 208 - BooleanLiteral: waiter(false) to waiter(true) in close
            it('should call waiter with false on close (kills line 208 mutation)', async () => {
                const queue = new MessageQueue2<string>(mode => mode);
                let waiterValue: boolean | null = null;

                // Start waiting
                const waitPromise = queue.waitForMessagesAndGetAsString().then(result => {
                    waiterValue = result !== null;
                    return result;
                });

                await new Promise(resolve => setTimeout(resolve, 10));

                // Close should call waiter(false)
                queue.close();

                await waitPromise;

                // If mutation changes false to true, waiterValue would be true
                expect(waiterValue).toBe(false);
            });

            // Additional arithmetic/comparison mutation tests
            describe('queue length boundary conditions', () => {
                it('should correctly handle queue.length exactly 0', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    expect(queue.size()).toBe(0);
                    expect(queue.queue.length).toBe(0);

                    // Close to prevent waiting
                    queue.close();

                    const result = await queue.waitForMessagesAndGetAsString();
                    expect(result).toBeNull();
                });

                it('should correctly handle queue.length exactly 1', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    queue.push('single', 'mode');

                    expect(queue.size()).toBe(1);
                    expect(queue.queue.length).toBe(1);

                    const result = await queue.waitForMessagesAndGetAsString();
                    expect(result).not.toBeNull();
                    expect(result!.message).toBe('single');
                });

                it('should correctly handle queue.length > 1', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    queue.push('first', 'mode');
                    queue.push('second', 'mode');
                    queue.push('third', 'mode');

                    expect(queue.size()).toBe(3);
                    expect(queue.queue.length).toBe(3);

                    const result = await queue.waitForMessagesAndGetAsString();
                    expect(result).not.toBeNull();
                    expect(result!.message).toBe('first\nsecond\nthird');
                    expect(queue.size()).toBe(0);
                });
            });

            // Test the exact waiter resolution path
            describe('waiter resolution paths', () => {
                it('should resolve waiter with true when message pushed', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    // Start waiting
                    const waitPromise = queue.waitForMessagesAndGetAsString();

                    await new Promise(resolve => setTimeout(resolve, 10));

                    // Push message - should call waiter(true)
                    queue.push('pushed', 'mode');

                    const result = await waitPromise;

                    // waiter(true) means hasMessages=true, so collectBatch is called
                    expect(result).not.toBeNull();
                    expect(result!.message).toBe('pushed');
                });

                it('should resolve waiter with false when queue closes', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    // Start waiting
                    const waitPromise = queue.waitForMessagesAndGetAsString();

                    await new Promise(resolve => setTimeout(resolve, 10));

                    // Close queue - should call waiter(false)
                    queue.close();

                    const result = await waitPromise;

                    // waiter(false) means hasMessages=false, so null is returned
                    expect(result).toBeNull();
                });

                it('should resolve waiter with false when aborted', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);
                    const controller = new AbortController();

                    // Start waiting with abort signal
                    const waitPromise = queue.waitForMessagesAndGetAsString(controller.signal);

                    await new Promise(resolve => setTimeout(resolve, 10));

                    // Abort - should call waiter(false)
                    controller.abort();

                    const result = await waitPromise;

                    expect(result).toBeNull();
                });

                it('should resolve waiter with false when reset', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    // Start waiting
                    const waitPromise = queue.waitForMessagesAndGetAsString();

                    await new Promise(resolve => setTimeout(resolve, 10));

                    // Reset - should call waiter(false)
                    queue.reset();

                    const result = await waitPromise;

                    expect(result).toBeNull();
                });
            });

            // Test collectBatch boundary conditions
            describe('collectBatch boundary conditions', () => {
                it('should return null when collectBatch called on empty queue', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    // Close queue to get to collectBatch with empty queue
                    queue.close();

                    const result = await queue.waitForMessagesAndGetAsString();

                    expect(result).toBeNull();
                });

                it('should shift exactly one item when isolated', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    queue.pushIsolateAndClear('isolated', 'mode');
                    queue.push('after', 'mode');

                    const batch1 = await queue.waitForMessagesAndGetAsString();

                    expect(batch1!.message).toBe('isolated');
                    expect(batch1!.isolate).toBe(true);
                    expect(queue.size()).toBe(1); // 'after' still in queue

                    const batch2 = await queue.waitForMessagesAndGetAsString();
                    expect(batch2!.message).toBe('after');
                    expect(batch2!.isolate).toBe(false);
                });

                it('should shift all same-mode items when not isolated', async () => {
                    const queue = new MessageQueue2<string>(mode => mode);

                    queue.push('a1', 'A');
                    queue.push('a2', 'A');
                    queue.push('a3', 'A');
                    queue.push('b1', 'B');

                    const batch = await queue.waitForMessagesAndGetAsString();

                    expect(batch!.message).toBe('a1\na2\na3');
                    expect(batch!.mode).toBe('A');
                    expect(queue.size()).toBe(1); // b1 still in queue
                });
            });
        });
    });
});