/**
 * Tests for PromptHandler
 *
 * Tests prompt turn lifecycle, session update processing, cancellation,
 * event routing, and stop reason handling. Uses real child processes
 * following the project's testing conventions.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import { AcpTransport } from './transport';
import type { AcpTransportConfig } from './types';
import { initializeConnection } from './initialization';
import { PromptHandler } from './prompt';

/** Track transports for cleanup */
const activeTransports: AcpTransport[] = [];

function createTransport(config: Partial<AcpTransportConfig> = {}): AcpTransport {
    const transport = new AcpTransport({
        command: 'node',
        args: ['-e', 'process.stdin.resume()'],
        requestTimeoutMs: 5000,
        shutdownGracePeriodMs: 1000,
        ...config,
    });
    activeTransports.push(transport);
    return transport;
}

afterEach(async () => {
    for (const transport of activeTransports) {
        transport.kill();
    }
    activeTransports.length = 0;
});

/**
 * Create a Node.js script that acts as a mock ACP agent with prompt support.
 *
 * The agent handles initialize, session/new, and session/prompt methods.
 * During prompt processing, it sends session/update notifications for
 * various update kinds before responding.
 */
function createPromptAgentScript(options: {
    stopReason?: string;
    updates?: Array<Record<string, unknown>>;
    usage?: Record<string, unknown> | null;
    delayMs?: number;
}): string {
    const {
        stopReason = 'end_turn',
        updates = [],
        usage = null,
        delayMs = 0,
    } = options;

    const updatesStr = JSON.stringify(updates);
    const usageStr = JSON.stringify(usage);

    return `
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin });
        let sessionId = 'prompt-test-session';

        rl.on('line', (line) => {
            try {
                const msg = JSON.parse(line);

                if (msg.method === 'initialize') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {
                            protocolVersion: ${PROTOCOL_VERSION},
                            agentCapabilities: { loadSession: false },
                            authMethods: [],
                        },
                    }) + '\\n');
                }
                else if (msg.method === 'session/new') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: { sessionId },
                    }) + '\\n');
                }
                else if (msg.method === 'session/prompt') {
                    const updates = ${updatesStr};
                    const sendUpdates = () => {
                        // Send session/update notifications
                        for (const update of updates) {
                            process.stdout.write(JSON.stringify({
                                jsonrpc: '2.0',
                                method: 'session/update',
                                params: {
                                    sessionId: msg.params.sessionId,
                                    update,
                                },
                            }) + '\\n');
                        }

                        // Send prompt response
                        process.stdout.write(JSON.stringify({
                            jsonrpc: '2.0',
                            id: msg.id,
                            result: {
                                stopReason: '${stopReason}',
                                usage: ${usageStr},
                            },
                        }) + '\\n');
                    };

                    if (${delayMs} > 0) {
                        setTimeout(sendUpdates, ${delayMs});
                    } else {
                        sendUpdates();
                    }
                }
                else if (msg.method === 'session/cancel') {
                    // Cancel is a notification - no response needed
                }
            } catch (e) {
                // Ignore parse errors
            }
        });
    `;
}

describe('PromptHandler', () => {
    // ─── sendPrompt ─────────────────────────────────────────────────────

    describe('sendPrompt', () => {
        it('should send prompt and receive response with end_turn stop reason', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                    usage: {
                        totalTokens: 100,
                        inputTokens: 50,
                        outputTokens: 50,
                    },
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            const result = await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Hello agent' },
            ]);

            expect(result.stopReason).toBe('end_turn');
            expect(result.usage).toBeDefined();
        });

        it('should handle cancelled stop reason', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'cancelled',
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            const result = await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Cancel test' },
            ]);

            expect(result.stopReason).toBe('cancelled');
        });

        it('should handle max_tokens stop reason', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'max_tokens',
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            const result = await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Long prompt' },
            ]);

            expect(result.stopReason).toBe('max_tokens');
        });

        it('should handle refusal stop reason', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'refusal',
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            const result = await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Refused prompt' },
            ]);

            expect(result.stopReason).toBe('refusal');
        });

        it('should process streaming session updates during prompt', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                    updates: [
                        {
                            sessionUpdate: 'agent_message_chunk',
                            content: { type: 'text', text: 'Hello ' },
                        },
                        {
                            sessionUpdate: 'agent_message_chunk',
                            content: { type: 'text', text: 'world!' },
                        },
                        {
                            sessionUpdate: 'agent_thought_chunk',
                            content: { type: 'text', text: 'Thinking...' },
                        },
                    ],
                })],
            });

            const promptHandler = new PromptHandler(transport);
            const chunks: unknown[] = [];

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            promptHandler.on('message:chunk', (content) => {
                chunks.push(content);
            });

            await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Test' },
            ]);

            expect(chunks).toHaveLength(2);
            expect(promptHandler.agentMessages.getFullText()).toBe('Hello world!');
            expect(promptHandler.agentThoughts.getFullText()).toBe('Thinking...');
        });

        it('should process tool call updates during prompt', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                    updates: [
                        {
                            sessionUpdate: 'tool_call',
                            toolCallId: 'tc-1',
                            title: 'Read file.ts',
                            kind: 'read',
                            status: 'in_progress',
                        },
                        {
                            sessionUpdate: 'tool_call_update',
                            toolCallId: 'tc-1',
                            status: 'completed',
                        },
                    ],
                })],
            });

            const promptHandler = new PromptHandler(transport);
            const toolCalls: unknown[] = [];
            const toolUpdates: unknown[] = [];

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            promptHandler.on('tool:call', (tc) => toolCalls.push(tc));
            promptHandler.on('tool:update', (tu) => toolUpdates.push(tu));

            await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Tool test' },
            ]);

            expect(toolCalls).toHaveLength(1);
            expect(toolUpdates).toHaveLength(1);
        });

        it('should process plan updates during prompt', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                    updates: [
                        {
                            sessionUpdate: 'plan',
                            entries: [
                                { content: 'Step 1: Analyze', priority: 'high', status: 'completed' },
                                { content: 'Step 2: Implement', priority: 'high', status: 'in_progress' },
                            ],
                        },
                    ],
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            const plans: unknown[] = [];
            promptHandler.on('plan:update', (entries) => plans.push(entries));

            await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Plan test' },
            ]);

            expect(plans).toHaveLength(1);
            expect(promptHandler.updates.getPlan()).toHaveLength(2);
        });

        it('should emit complete event when prompt finishes', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                })],
            });

            const promptHandler = new PromptHandler(transport);
            let completeResult: unknown = null;

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            promptHandler.on('complete', (result) => {
                completeResult = result;
            });

            await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Complete test' },
            ]);

            expect(completeResult).toBeDefined();
            expect((completeResult as { stopReason: string }).stopReason).toBe('end_turn');
        });

        it('should throw if a prompt is already in progress', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                    delayMs: 500,
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            // Start first prompt (delayed response)
            const firstPrompt = promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'First prompt' },
            ]);

            // Try to send second prompt while first is in progress
            await expect(
                promptHandler.sendPrompt('prompt-test-session', [
                    { type: 'text', text: 'Second prompt' },
                ]),
            ).rejects.toThrow('already in progress');

            // Wait for first prompt to complete
            await firstPrompt;
        });

        it('should reset accumulators between turns', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                    updates: [
                        {
                            sessionUpdate: 'agent_message_chunk',
                            content: { type: 'text', text: 'Response' },
                        },
                    ],
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            // First turn
            await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Turn 1' },
            ]);

            expect(promptHandler.agentMessages.getFullText()).toBe('Response');

            // Second turn - accumulator should reset
            await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Turn 2' },
            ]);

            // Should have "Response" from the new turn only, not "ResponseResponse"
            expect(promptHandler.agentMessages.getFullText()).toBe('Response');
        });
    });

    // ─── cancelPrompt ───────────────────────────────────────────────────

    describe('cancelPrompt', () => {
        it('should send cancel notification without throwing', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                })],
            });

            const promptHandler = new PromptHandler(transport);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            // cancelPrompt should not throw even when no prompt is in progress
            await expect(
                promptHandler.cancelPrompt('prompt-test-session'),
            ).resolves.toBeUndefined();
        });
    });

    // ─── State accessors ────────────────────────────────────────────────

    describe('state accessors', () => {
        it('should report isPromptInProgress correctly', async () => {
            const transport = createTransport({
                args: ['-e', createPromptAgentScript({
                    stopReason: 'end_turn',
                })],
            });

            const promptHandler = new PromptHandler(transport);

            expect(promptHandler.isPromptInProgress).toBe(false);

            transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params: unknown) => promptHandler.handleSessionUpdate(params),
            }));

            await initializeConnection(transport);

            await promptHandler.sendPrompt('prompt-test-session', [
                { type: 'text', text: 'Test' },
            ]);

            expect(promptHandler.isPromptInProgress).toBe(false);
            expect(promptHandler.currentSessionId).toBe('prompt-test-session');
        });

        it('should provide access to UpdateRouter', () => {
            const transport = createTransport();
            const promptHandler = new PromptHandler(transport);

            expect(promptHandler.updates).toBeDefined();
            expect(promptHandler.agentMessages).toBeDefined();
            expect(promptHandler.agentThoughts).toBeDefined();
            expect(promptHandler.userMessages).toBeDefined();
        });
    });

    // ─── Event management ───────────────────────────────────────────────

    describe('event management', () => {
        it('should forward update events to the UpdateRouter', () => {
            const transport = createTransport();
            const promptHandler = new PromptHandler(transport);

            let received = false;
            const listener = () => { received = true; };

            promptHandler.on('message:chunk', listener);

            // Directly inject a notification
            promptHandler.handleSessionUpdate({
                sessionId: 'test',
                update: {
                    sessionUpdate: 'agent_message_chunk',
                    content: { type: 'text', text: 'Direct test' },
                },
            });

            expect(received).toBe(true);
        });

        it('should remove update event listeners', () => {
            const transport = createTransport();
            const promptHandler = new PromptHandler(transport);

            let callCount = 0;
            const listener = () => { callCount++; };

            promptHandler.on('message:chunk', listener);
            promptHandler.off('message:chunk', listener);

            promptHandler.handleSessionUpdate({
                sessionId: 'test',
                update: {
                    sessionUpdate: 'agent_message_chunk',
                    content: { type: 'text', text: 'Should not fire' },
                },
            });

            expect(callCount).toBe(0);
        });

        it('should clear all listeners with removeAllListeners', () => {
            const transport = createTransport();
            const promptHandler = new PromptHandler(transport);

            let callCount = 0;
            promptHandler.on('message:chunk', () => { callCount++; });
            promptHandler.on('tool:call', () => { callCount++; });

            promptHandler.removeAllListeners();

            promptHandler.handleSessionUpdate({
                sessionId: 'test',
                update: {
                    sessionUpdate: 'agent_message_chunk',
                    content: { type: 'text', text: 'test' },
                },
            });

            expect(callCount).toBe(0);
        });
    });

    // ─── handleSessionUpdate ────────────────────────────────────────────

    describe('handleSessionUpdate', () => {
        it('should handle valid session notifications', () => {
            const transport = createTransport();
            const promptHandler = new PromptHandler(transport);

            let received = false;
            promptHandler.on('mode:update', () => { received = true; });

            promptHandler.handleSessionUpdate({
                sessionId: 'test',
                update: {
                    sessionUpdate: 'current_mode_update',
                    currentModeId: 'architect',
                },
            });

            expect(received).toBe(true);
        });

        it('should silently ignore invalid notifications', () => {
            const transport = createTransport();
            const promptHandler = new PromptHandler(transport);

            // Should not throw
            promptHandler.handleSessionUpdate({ invalid: 'data' });
            promptHandler.handleSessionUpdate(null);
            promptHandler.handleSessionUpdate(undefined);
        });
    });
});
