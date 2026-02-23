/**
 * Unit tests for AcpTransport
 *
 * Tests subprocess lifecycle, event handling, timeout behavior,
 * and graceful shutdown. Uses real child processes (no mocking)
 * following the project's testing conventions.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { AcpTransport } from './transport';
import type { AcpTransportConfig } from './types';

/** Track transports for cleanup */
const activeTransports: AcpTransport[] = [];

function createTransport(config: Partial<AcpTransportConfig> = {}): AcpTransport {
    const transport = new AcpTransport({
        command: 'node',
        args: ['-e', 'process.stdin.resume()'],
        requestTimeoutMs: 1000,
        shutdownGracePeriodMs: 1000,
        ...config,
    });
    activeTransports.push(transport);
    return transport;
}

/** Minimal Client factory for tests that don't test client callbacks */
const minimalClient = (_agent: unknown) => ({
    requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
    sessionUpdate: async () => {},
});

afterEach(async () => {
    for (const transport of activeTransports) {
        transport.kill();
    }
    activeTransports.length = 0;
    // Brief delay for process cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));
});

describe('AcpTransport', () => {
    describe('constructor', () => {
        it('creates a transport with default config values', () => {
            const transport = new AcpTransport({ command: 'node' });
            activeTransports.push(transport);
            expect(transport.isConnected).toBe(false);
            expect(transport.pid).toBeNull();
            expect(transport.signal).toBeNull();
        });
    });

    describe('spawn', () => {
        it('spawns a child process and returns a connection', () => {
            const transport = createTransport();
            const connection = transport.spawn(minimalClient);

            expect(connection).toBeDefined();
            expect(transport.isConnected).toBe(true);
            expect(transport.pid).toBeTypeOf('number');
            expect(transport.signal).toBeDefined();
        });

        it('throws if spawn is called twice', () => {
            const transport = createTransport();
            transport.spawn(minimalClient);

            expect(() => transport.spawn(minimalClient)).toThrow('already spawned');
        });

        it('throws if spawn is called after kill', () => {
            const transport = createTransport();
            transport.spawn(minimalClient);
            transport.kill();

            expect(() => transport.spawn(minimalClient)).toThrow('has been closed');
        });

        it('passes environment variables to the child process', () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'process.stdout.write(process.env.ACP_TEST_VAR || ""); process.stdin.resume()'],
                env: { ACP_TEST_VAR: 'hello_acp' },
            });

            const connection = transport.spawn(minimalClient);
            expect(connection).toBeDefined();
            expect(transport.isConnected).toBe(true);
        });
    });

    describe('events', () => {
        it('emits stderr events from agent process', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'process.stderr.write("agent error output"); setTimeout(() => {}, 500)'],
            });

            const stderrChunks: string[] = [];
            transport.on('stderr', (data) => stderrChunks.push(data));
            transport.spawn(minimalClient);

            await new Promise((resolve) => setTimeout(resolve, 300));
            expect(stderrChunks.join('')).toContain('agent error output');
        });

        it('emits close event when process exits with exit code', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'setTimeout(() => process.exit(0), 50)'],
            });

            const closePromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
                transport.on('close', resolve);
            });

            transport.spawn(minimalClient);

            const closeEvent = await closePromise;
            expect(closeEvent.code).toBe(0);
        });

        it('emits error event when process fails to spawn', async () => {
            const transport = createTransport({
                command: 'nonexistent-binary-that-should-not-exist',
                args: [],
            });

            const errorPromise = new Promise<Error>((resolve) => {
                transport.on('error', resolve);
            });

            transport.spawn(minimalClient);

            const error = await errorPromise;
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toContain('ENOENT');
        });

        it('supports removing event listeners', () => {
            const transport = createTransport();
            const listener = () => {};

            transport.on('stderr', listener);
            transport.off('stderr', listener);

            const connection = transport.spawn(minimalClient);
            expect(connection).toBeDefined();
        });
    });

    describe('request', () => {
        it('throws if not connected', async () => {
            const transport = createTransport();

            await expect(
                transport.request((conn) => conn.initialize({
                    protocolVersion: 1,
                    clientCapabilities: {},
                })),
            ).rejects.toThrow('not connected');
        });

        it('times out pending requests', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'process.stdin.resume()'],
                requestTimeoutMs: 100,
            });

            transport.spawn(minimalClient);

            await expect(
                transport.request((conn) => conn.initialize({
                    protocolVersion: 1,
                    clientCapabilities: {},
                })),
            ).rejects.toThrow('timed out');
        });

        it('allows overriding timeout per request', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'process.stdin.resume()'],
                requestTimeoutMs: 10_000,
            });

            transport.spawn(minimalClient);

            // Override with a shorter timeout
            await expect(
                transport.request(
                    (conn) => conn.initialize({
                        protocolVersion: 1,
                        clientCapabilities: {},
                    }),
                    100,
                ),
            ).rejects.toThrow('timed out');
        });
    });

    describe('getConnection', () => {
        it('throws if not connected', () => {
            const transport = createTransport();
            expect(() => transport.getConnection()).toThrow('not connected');
        });

        it('returns the connection after spawn', () => {
            const transport = createTransport();
            transport.spawn(minimalClient);
            expect(transport.getConnection()).toBeDefined();
        });
    });

    describe('close', () => {
        it('sends SIGTERM and waits for exit', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', `
                    process.on('SIGTERM', () => process.exit(0));
                    process.stdin.resume();
                `],
                shutdownGracePeriodMs: 2000,
            });

            transport.spawn(minimalClient);
            await new Promise((resolve) => setTimeout(resolve, 100));

            await transport.close();
            expect(transport.isConnected).toBe(false);
        });

        it('sends SIGKILL after grace period if process does not exit', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', `
                    process.on('SIGTERM', () => { /* ignore SIGTERM */ });
                    process.stdin.resume();
                `],
                shutdownGracePeriodMs: 100,
            });

            transport.spawn(minimalClient);
            await new Promise((resolve) => setTimeout(resolve, 100));

            await transport.close();
            // After close resolves, the process was killed
            expect(transport.isConnected).toBe(false);
        });

        it('is idempotent - calling close multiple times is safe', async () => {
            const transport = createTransport();
            transport.spawn(minimalClient);

            await transport.close();
            await transport.close();
            expect(transport.isConnected).toBe(false);
        });

        it('resolves immediately if process already exited', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'process.exit(0)'],
            });

            transport.spawn(minimalClient);
            await new Promise((resolve) => setTimeout(resolve, 200));

            await transport.close();
            expect(transport.isConnected).toBe(false);
        });
    });

    describe('kill', () => {
        it('immediately kills the process', () => {
            const transport = createTransport();
            transport.spawn(minimalClient);

            transport.kill();
            expect(transport.isConnected).toBe(false);
        });

        it('is safe to call when not spawned', () => {
            const transport = createTransport();
            transport.kill();
            expect(transport.isConnected).toBe(false);
        });
    });

    describe('ndjson message serialization', () => {
        it('sends ndjson messages to agent stdin and receives responses', async () => {
            const echoScript = `
                const readline = require('readline');
                const rl = readline.createInterface({ input: process.stdin });
                rl.on('line', (line) => {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.method === 'initialize') {
                            const response = JSON.stringify({
                                jsonrpc: '2.0',
                                id: msg.id,
                                result: {
                                    protocolVersion: 1,
                                    agentCapabilities: {},
                                    agentInfo: { name: 'test-agent', version: '1.0.0' }
                                }
                            });
                            process.stdout.write(response + '\\n');
                        }
                    } catch (e) {}
                });
            `;

            const transport = createTransport({
                command: 'node',
                args: ['-e', echoScript],
                requestTimeoutMs: 5000,
            });

            const connection = transport.spawn(minimalClient);

            const result = await connection.initialize({
                protocolVersion: 1,
                clientCapabilities: {},
            });

            expect(result.protocolVersion).toBe(1);
            expect(result.agentInfo?.name).toBe('test-agent');
        });

        it('handles notifications from agent', async () => {
            const sessionUpdates: unknown[] = [];

            const agentScript = `
                const readline = require('readline');
                const rl = readline.createInterface({ input: process.stdin });
                rl.on('line', (line) => {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.method === 'initialize') {
                            const notification = JSON.stringify({
                                jsonrpc: '2.0',
                                method: 'session/update',
                                params: {
                                    sessionId: 'test-session',
                                    update: {
                                        sessionUpdate: 'agent_message_chunk',
                                        content: { type: 'text', text: 'Hello from agent' },
                                        messageId: 'msg-1',
                                        role: 'assistant'
                                    }
                                }
                            });
                            process.stdout.write(notification + '\\n');

                            const response = JSON.stringify({
                                jsonrpc: '2.0',
                                id: msg.id,
                                result: {
                                    protocolVersion: 1,
                                    agentCapabilities: {},
                                    agentInfo: { name: 'test-agent', version: '1.0.0' }
                                }
                            });
                            process.stdout.write(response + '\\n');
                        }
                    } catch (e) {}
                });
            `;

            const transport = createTransport({
                command: 'node',
                args: ['-e', agentScript],
                requestTimeoutMs: 5000,
            });

            const connection = transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params) => {
                    sessionUpdates.push(params);
                },
            }));

            await connection.initialize({
                protocolVersion: 1,
                clientCapabilities: {},
            });

            await new Promise((resolve) => setTimeout(resolve, 200));
            expect(sessionUpdates.length).toBeGreaterThanOrEqual(1);
        });

        it('handles agent-to-client requests (reverse direction)', async () => {
            // The SDK validates permission request params with Zod,
            // so we need to use correct ACP enum values for kind
            const agentScript = `
                const readline = require('readline');
                const rl = readline.createInterface({ input: process.stdin });
                rl.on('line', (line) => {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.method === 'initialize') {
                            // Send a request_permission request to the client
                            const request = JSON.stringify({
                                jsonrpc: '2.0',
                                id: 999,
                                method: 'session/request_permission',
                                params: {
                                    sessionId: 'test-session',
                                    toolCall: {
                                        toolCallId: 'tc-1',
                                        title: 'Run test command',
                                        status: 'pending',
                                        content: [],
                                        toolKind: 'bash'
                                    },
                                    options: [
                                        { optionId: 'opt-allow', name: 'Allow', kind: 'allow_once' },
                                        { optionId: 'opt-deny', name: 'Deny', kind: 'reject_once' }
                                    ]
                                }
                            });
                            process.stdout.write(request + '\\n');

                            // Then read the response from client before responding to initialize
                            rl.on('line', (responseLine) => {
                                try {
                                    const responseMsg = JSON.parse(responseLine);
                                    // Check if this is the permission response (id=999)
                                    if (responseMsg.id === 999 && responseMsg.result) {
                                        // Now respond to initialize
                                        const initResponse = JSON.stringify({
                                            jsonrpc: '2.0',
                                            id: msg.id,
                                            result: {
                                                protocolVersion: 1,
                                                agentCapabilities: {},
                                                agentInfo: { name: 'test-agent', version: '1.0.0' }
                                            }
                                        });
                                        process.stdout.write(initResponse + '\\n');
                                    }
                                } catch (e) {}
                            });
                        }
                    } catch (e) {}
                });
            `;

            let permissionRequested = false;

            const transport = createTransport({
                command: 'node',
                args: ['-e', agentScript],
                requestTimeoutMs: 5000,
            });

            const connection = transport.spawn((_agent) => ({
                requestPermission: async (params) => {
                    permissionRequested = true;
                    expect(params.toolCall.title).toBe('Run test command');
                    return { outcome: { outcome: 'selected' as const, optionId: 'opt-allow' } };
                },
                sessionUpdate: async () => {},
            }));

            await connection.initialize({
                protocolVersion: 1,
                clientCapabilities: {},
            });

            await new Promise((resolve) => setTimeout(resolve, 300));
            expect(permissionRequested).toBe(true);
        });

        it('handles partial ndjson lines across chunks', async () => {
            const agentScript = `
                const readline = require('readline');
                const rl = readline.createInterface({ input: process.stdin });
                rl.on('line', (line) => {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.method === 'initialize') {
                            const largeTitle = 'x'.repeat(10000);
                            const response = JSON.stringify({
                                jsonrpc: '2.0',
                                id: msg.id,
                                result: {
                                    protocolVersion: 1,
                                    agentCapabilities: {},
                                    agentInfo: { name: largeTitle, version: '1.0.0' }
                                }
                            });
                            process.stdout.write(response + '\\n');
                        }
                    } catch (e) {}
                });
            `;

            const transport = createTransport({
                command: 'node',
                args: ['-e', agentScript],
                requestTimeoutMs: 5000,
            });

            const connection = transport.spawn(minimalClient);

            const result = await connection.initialize({
                protocolVersion: 1,
                clientCapabilities: {},
            });

            expect(result.agentInfo?.name).toHaveLength(10000);
        });

        it('handles multiple messages in a single chunk', async () => {
            const agentScript = `
                const readline = require('readline');
                const rl = readline.createInterface({ input: process.stdin });
                rl.on('line', (line) => {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.method === 'initialize') {
                            const n1 = JSON.stringify({
                                jsonrpc: '2.0',
                                method: 'session/update',
                                params: {
                                    sessionId: 's1',
                                    update: {
                                        sessionUpdate: 'agent_message_chunk',
                                        content: { type: 'text', text: 'chunk1' },
                                        messageId: 'msg-1',
                                        role: 'assistant'
                                    }
                                }
                            });
                            const n2 = JSON.stringify({
                                jsonrpc: '2.0',
                                method: 'session/update',
                                params: {
                                    sessionId: 's1',
                                    update: {
                                        sessionUpdate: 'agent_message_chunk',
                                        content: { type: 'text', text: 'chunk2' },
                                        messageId: 'msg-2',
                                        role: 'assistant'
                                    }
                                }
                            });
                            const response = JSON.stringify({
                                jsonrpc: '2.0',
                                id: msg.id,
                                result: {
                                    protocolVersion: 1,
                                    agentCapabilities: {},
                                    agentInfo: { name: 'test', version: '1.0.0' }
                                }
                            });
                            process.stdout.write(n1 + '\\n' + n2 + '\\n' + response + '\\n');
                        }
                    } catch (e) {}
                });
            `;

            const updates: unknown[] = [];

            const transport = createTransport({
                command: 'node',
                args: ['-e', agentScript],
                requestTimeoutMs: 5000,
            });

            const connection = transport.spawn((_agent) => ({
                requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
                sessionUpdate: async (params) => {
                    updates.push(params);
                },
            }));

            await connection.initialize({
                protocolVersion: 1,
                clientCapabilities: {},
            });

            await new Promise((resolve) => setTimeout(resolve, 200));
            expect(updates.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('JSON-RPC error handling', () => {
        it('surfaces JSON-RPC error responses', async () => {
            const agentScript = `
                const readline = require('readline');
                const rl = readline.createInterface({ input: process.stdin });
                rl.on('line', (line) => {
                    try {
                        const msg = JSON.parse(line);
                        if (msg.method === 'initialize') {
                            const response = JSON.stringify({
                                jsonrpc: '2.0',
                                id: msg.id,
                                error: {
                                    code: -32601,
                                    message: 'Method not found',
                                    data: { method: 'initialize' }
                                }
                            });
                            process.stdout.write(response + '\\n');
                        }
                    } catch (e) {}
                });
            `;

            const transport = createTransport({
                command: 'node',
                args: ['-e', agentScript],
                requestTimeoutMs: 5000,
            });

            const connection = transport.spawn(minimalClient);

            await expect(
                connection.initialize({
                    protocolVersion: 1,
                    clientCapabilities: {},
                }),
            ).rejects.toBeDefined();
        });
    });

    describe('process lifecycle', () => {
        it('handles process crash without hanging', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'setTimeout(() => process.exit(1), 100); process.stdin.resume()'],
            });

            const closePromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
                transport.on('close', resolve);
            });

            transport.spawn(minimalClient);

            const closeEvent = await closePromise;
            expect(closeEvent.code).toBe(1);
            expect(transport.isConnected).toBe(false);
        });

        it('handles process exit with non-zero code', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'setTimeout(() => process.exit(42), 50)'],
            });

            const closePromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
                transport.on('close', resolve);
            });

            transport.spawn(minimalClient);

            const closeEvent = await closePromise;
            expect(closeEvent.code).toBe(42);
        });

        it('transitions isConnected to false after process exit', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', 'setTimeout(() => process.exit(0), 50)'],
            });

            const closePromise = new Promise<void>((resolve) => {
                transport.on('close', () => resolve());
            });

            transport.spawn(minimalClient);
            expect(transport.isConnected).toBe(true);

            await closePromise;
            expect(transport.isConnected).toBe(false);
        });
    });
});
