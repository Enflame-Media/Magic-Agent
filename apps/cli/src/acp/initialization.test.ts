/**
 * Unit tests for ACP initialization, capabilities, and authentication
 *
 * Tests the initialization handshake, capability querying, auth method
 * selection, and error handling. Uses real child processes (no mocking)
 * following the project's testing conventions.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { PROTOCOL_VERSION, RequestError } from '@agentclientprotocol/sdk';
import { ACP_ERROR_CODES } from '@magic-agent/protocol';
import { AcpTransport } from './transport';
import type { AcpTransportConfig } from './types';
import { initializeConnection, ProtocolVersionMismatchError } from './initialization';
import {
    createAgentConnection,
    canLoadSession,
    canListSessions,
    canResumeSession,
    canForkSession,
    canPromptWithImages,
    canPromptWithAudio,
    canPromptWithEmbeddedContext,
    canMcpHttp,
    canMcpSse,
    isAuthRequired,
    isAuthenticated,
    isReady,
    HAPPY_CLIENT_CAPABILITIES,
    type AgentConnection,
} from './capabilities';
import { selectAuthMethod, isAuthRequiredError } from './auth';

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

/** Minimal Client factory for tests */
const minimalClient = (_agent: unknown) => ({
    requestPermission: async () => ({ outcome: { outcome: 'cancelled' as const } }),
    sessionUpdate: async () => {},
});

/** Create a Node.js script that acts as a mock ACP agent */
function createAgentScript(initResponse: Record<string, unknown>): string {
    const responseJson = JSON.stringify(initResponse);
    return `
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin });
        rl.on('line', (line) => {
            try {
                const msg = JSON.parse(line);
                if (msg.method === 'initialize') {
                    const response = JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: ${responseJson}
                    });
                    process.stdout.write(response + '\\n');
                }
                if (msg.method === 'authenticate') {
                    const response = JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {}
                    });
                    process.stdout.write(response + '\\n');
                }
            } catch (e) {}
        });
    `;
}

afterEach(async () => {
    for (const transport of activeTransports) {
        transport.kill();
    }
    activeTransports.length = 0;
    await new Promise((resolve) => setTimeout(resolve, 50));
});

// ─── Capabilities ────────────────────────────────────────────────────────────

describe('capabilities', () => {
    describe('createAgentConnection', () => {
        it('creates a connection from a minimal response', () => {
            const conn = createAgentConnection(
                { protocolVersion: 1 },
                HAPPY_CLIENT_CAPABILITIES,
            );

            expect(conn.agentInfo).toBeNull();
            expect(conn.protocolVersion).toBe(1);
            expect(conn.authState).toBe('none');
            expect(conn.authMethods).toEqual([]);
            expect(conn.capabilities.loadSession).toBe(false);
        });

        it('creates a connection from a full response', () => {
            const conn = createAgentConnection(
                {
                    protocolVersion: 1,
                    agentInfo: { name: 'claude-code', version: '1.0.0' },
                    agentCapabilities: {
                        loadSession: true,
                        sessionCapabilities: {
                            list: {},
                            resume: {},
                            fork: {},
                        },
                        promptCapabilities: {
                            image: true,
                            audio: false,
                            embeddedContext: true,
                        },
                        mcpCapabilities: {
                            http: true,
                            sse: false,
                        },
                    },
                    authMethods: [],
                },
                HAPPY_CLIENT_CAPABILITIES,
            );

            expect(conn.agentInfo?.name).toBe('claude-code');
            expect(conn.capabilities.loadSession).toBe(true);
            expect(conn.authState).toBe('none');
        });

        it('sets authState to required when authMethods are present', () => {
            const conn = createAgentConnection(
                {
                    protocolVersion: 1,
                    authMethods: [
                        { id: 'agent_auth', name: 'Agent Auth' },
                    ],
                },
                HAPPY_CLIENT_CAPABILITIES,
            );

            expect(conn.authState).toBe('required');
            expect(conn.authMethods).toHaveLength(1);
        });
    });

    describe('capability helpers', () => {
        function makeConnection(caps: Partial<AgentConnection['capabilities']> = {}): AgentConnection {
            return createAgentConnection(
                {
                    protocolVersion: 1,
                    agentCapabilities: {
                        loadSession: false,
                        mcpCapabilities: { http: false, sse: false },
                        promptCapabilities: { audio: false, embeddedContext: false, image: false },
                        sessionCapabilities: {},
                        ...caps,
                    },
                },
                HAPPY_CLIENT_CAPABILITIES,
            );
        }

        it('canLoadSession returns true when loadSession is true', () => {
            expect(canLoadSession(makeConnection({ loadSession: true }))).toBe(true);
            expect(canLoadSession(makeConnection({ loadSession: false }))).toBe(false);
        });

        it('canListSessions returns true when list capability is present', () => {
            expect(canListSessions(makeConnection({ sessionCapabilities: { list: {} } }))).toBe(true);
            expect(canListSessions(makeConnection({ sessionCapabilities: {} }))).toBe(false);
        });

        it('canResumeSession returns true when resume capability is present', () => {
            expect(canResumeSession(makeConnection({ sessionCapabilities: { resume: {} } }))).toBe(true);
            expect(canResumeSession(makeConnection({ sessionCapabilities: {} }))).toBe(false);
        });

        it('canForkSession returns true when fork capability is present', () => {
            expect(canForkSession(makeConnection({ sessionCapabilities: { fork: {} } }))).toBe(true);
            expect(canForkSession(makeConnection({ sessionCapabilities: {} }))).toBe(false);
        });

        it('canPromptWithImages returns true when image capability is true', () => {
            expect(canPromptWithImages(makeConnection({ promptCapabilities: { image: true, audio: false, embeddedContext: false } }))).toBe(true);
            expect(canPromptWithImages(makeConnection({ promptCapabilities: { image: false, audio: false, embeddedContext: false } }))).toBe(false);
        });

        it('canPromptWithAudio returns true when audio capability is true', () => {
            expect(canPromptWithAudio(makeConnection({ promptCapabilities: { audio: true, image: false, embeddedContext: false } }))).toBe(true);
        });

        it('canPromptWithEmbeddedContext returns true when embeddedContext is true', () => {
            expect(canPromptWithEmbeddedContext(makeConnection({ promptCapabilities: { embeddedContext: true, image: false, audio: false } }))).toBe(true);
        });

        it('canMcpHttp returns true when http is true', () => {
            expect(canMcpHttp(makeConnection({ mcpCapabilities: { http: true, sse: false } }))).toBe(true);
            expect(canMcpHttp(makeConnection({ mcpCapabilities: { http: false, sse: false } }))).toBe(false);
        });

        it('canMcpSse returns true when sse is true', () => {
            expect(canMcpSse(makeConnection({ mcpCapabilities: { http: false, sse: true } }))).toBe(true);
        });
    });

    describe('auth state helpers', () => {
        it('isAuthRequired returns true for required state', () => {
            const conn = createAgentConnection(
                {
                    protocolVersion: 1,
                    authMethods: [{ id: 'agent_auth', name: 'Agent Auth' }],
                },
                HAPPY_CLIENT_CAPABILITIES,
            );
            expect(isAuthRequired(conn)).toBe(true);
        });

        it('isAuthenticated returns true for authenticated state', () => {
            const conn = createAgentConnection(
                { protocolVersion: 1 },
                HAPPY_CLIENT_CAPABILITIES,
            );
            const authed: AgentConnection = { ...conn, authState: 'authenticated' };
            expect(isAuthenticated(authed)).toBe(true);
        });

        it('isReady returns true for none or authenticated state', () => {
            const noAuth = createAgentConnection(
                { protocolVersion: 1 },
                HAPPY_CLIENT_CAPABILITIES,
            );
            expect(isReady(noAuth)).toBe(true);

            const authed: AgentConnection = { ...noAuth, authState: 'authenticated' };
            expect(isReady(authed)).toBe(true);

            const required: AgentConnection = { ...noAuth, authState: 'required' };
            expect(isReady(required)).toBe(false);
        });
    });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('auth', () => {
    describe('selectAuthMethod', () => {
        it('returns null for empty auth methods', () => {
            expect(selectAuthMethod([])).toBeNull();
        });

        it('prefers agent_auth over terminal_auth', () => {
            const methods = [
                { id: 'terminal_auth', name: 'Terminal Auth' },
                { id: 'agent_auth', name: 'Agent Auth' },
            ];
            const selected = selectAuthMethod(methods);
            expect(selected?.id).toBe('agent_auth');
        });

        it('prefers terminal_auth over env_variable', () => {
            const methods = [
                { id: 'env_variable', name: 'Env Variable' },
                { id: 'terminal_auth', name: 'Terminal Auth' },
            ];
            const selected = selectAuthMethod(methods);
            expect(selected?.id).toBe('terminal_auth');
        });

        it('falls back to first method if no preferred methods available', () => {
            const methods = [
                { id: 'custom_auth', name: 'Custom Auth' },
                { id: 'other_auth', name: 'Other Auth' },
            ];
            const selected = selectAuthMethod(methods);
            expect(selected?.id).toBe('custom_auth');
        });
    });

    describe('isAuthRequiredError', () => {
        it('returns true for RequestError with AUTH_REQUIRED code', () => {
            const error = new RequestError(ACP_ERROR_CODES.AUTH_REQUIRED, 'Auth required');
            expect(isAuthRequiredError(error)).toBe(true);
        });

        it('returns false for other error codes', () => {
            const error = new RequestError(ACP_ERROR_CODES.INTERNAL_ERROR, 'Internal error');
            expect(isAuthRequiredError(error)).toBe(false);
        });

        it('returns false for non-RequestError', () => {
            expect(isAuthRequiredError(new Error('random error'))).toBe(false);
            expect(isAuthRequiredError(null)).toBe(false);
            expect(isAuthRequiredError(undefined)).toBe(false);
        });
    });
});

// ─── Initialization ─────────────────────────────────────────────────────────

describe('initialization', () => {
    describe('initializeConnection', () => {
        it('performs a successful initialization handshake', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createAgentScript({
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: {
                        loadSession: true,
                        promptCapabilities: { image: true },
                    },
                    agentInfo: { name: 'test-agent', version: '2.0.0' },
                    authMethods: [],
                })],
            });

            transport.spawn(minimalClient);

            const connection = await initializeConnection(transport);

            expect(connection.protocolVersion).toBe(PROTOCOL_VERSION);
            expect(connection.agentInfo?.name).toBe('test-agent');
            expect(connection.agentInfo?.version).toBe('2.0.0');
            expect(connection.authState).toBe('none');
            expect(canLoadSession(connection)).toBe(true);
            expect(canPromptWithImages(connection)).toBe(true);
        });

        it('stores client capabilities from options', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createAgentScript({
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: {},
                    authMethods: [],
                })],
            });

            transport.spawn(minimalClient);

            const customCaps = {
                fs: { readTextFile: true, writeTextFile: false },
                terminal: false,
            };

            const connection = await initializeConnection(transport, {
                clientCapabilities: customCaps,
            });

            expect(connection.clientCapabilities.fs.readTextFile).toBe(true);
            expect(connection.clientCapabilities.fs.writeTextFile).toBe(false);
            expect(connection.clientCapabilities.terminal).toBe(false);
        });

        it('throws ProtocolVersionMismatchError on version mismatch', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createAgentScript({
                    protocolVersion: 999,
                    agentCapabilities: {},
                    authMethods: [],
                })],
            });

            transport.spawn(minimalClient);

            await expect(initializeConnection(transport)).rejects.toThrow(ProtocolVersionMismatchError);
        });

        it('auto-authenticates when authMethods are present', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createAgentScript({
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: {},
                    agentInfo: { name: 'auth-agent', version: '1.0.0' },
                    authMethods: [
                        { id: 'agent_auth', name: 'Agent Auth', description: 'OAuth via agent' },
                    ],
                })],
            });

            transport.spawn(minimalClient);

            const connection = await initializeConnection(transport);

            expect(connection.authState).toBe('authenticated');
            expect(connection.agentInfo?.name).toBe('auth-agent');
        });

        it('skips authentication when autoAuthenticate is false', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createAgentScript({
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: {},
                    authMethods: [
                        { id: 'agent_auth', name: 'Agent Auth' },
                    ],
                })],
            });

            transport.spawn(minimalClient);

            const connection = await initializeConnection(transport, {
                autoAuthenticate: false,
            });

            expect(connection.authState).toBe('required');
        });

        it('handles agent with no optional capabilities', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createAgentScript({
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: {},
                    authMethods: [],
                })],
            });

            transport.spawn(minimalClient);

            const connection = await initializeConnection(transport);

            expect(canLoadSession(connection)).toBe(false);
            expect(canListSessions(connection)).toBe(false);
            expect(canPromptWithImages(connection)).toBe(false);
            expect(isReady(connection)).toBe(true);
        });

        it('handles agent with all session capabilities', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createAgentScript({
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: {
                        loadSession: true,
                        sessionCapabilities: {
                            list: {},
                            resume: {},
                            fork: {},
                        },
                        mcpCapabilities: { http: true, sse: true },
                    },
                    authMethods: [],
                })],
            });

            transport.spawn(minimalClient);

            const connection = await initializeConnection(transport);

            expect(canLoadSession(connection)).toBe(true);
            expect(canListSessions(connection)).toBe(true);
            expect(canResumeSession(connection)).toBe(true);
            expect(canForkSession(connection)).toBe(true);
            expect(canMcpHttp(connection)).toBe(true);
            expect(canMcpSse(connection)).toBe(true);
        });

        it('handles authentication failure gracefully', async () => {
            const failAuthScript = `
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
                                    protocolVersion: ${PROTOCOL_VERSION},
                                    agentCapabilities: {},
                                    authMethods: [{ id: 'agent_auth', name: 'Agent Auth' }],
                                }
                            });
                            process.stdout.write(response + '\\n');
                        }
                        if (msg.method === 'authenticate') {
                            const response = JSON.stringify({
                                jsonrpc: '2.0',
                                id: msg.id,
                                error: {
                                    code: -32603,
                                    message: 'Authentication failed: invalid credentials'
                                }
                            });
                            process.stdout.write(response + '\\n');
                        }
                    } catch (e) {}
                });
            `;

            const transport = createTransport({
                command: 'node',
                args: ['-e', failAuthScript],
            });

            transport.spawn(minimalClient);

            await expect(initializeConnection(transport)).rejects.toThrow('Authentication failed');
        });
    });

    describe('ProtocolVersionMismatchError', () => {
        it('contains version information', () => {
            const error = new ProtocolVersionMismatchError(1, 42);
            expect(error.requestedVersion).toBe(1);
            expect(error.agentVersion).toBe(42);
            expect(error.message).toContain('v1');
            expect(error.message).toContain('v42');
            expect(error.name).toBe('ProtocolVersionMismatchError');
        });
    });

    describe('HAPPY_CLIENT_CAPABILITIES', () => {
        it('advertises fs read and write support', () => {
            expect(HAPPY_CLIENT_CAPABILITIES.fs.readTextFile).toBe(true);
            expect(HAPPY_CLIENT_CAPABILITIES.fs.writeTextFile).toBe(true);
        });

        it('advertises terminal support', () => {
            expect(HAPPY_CLIENT_CAPABILITIES.terminal).toBe(true);
        });
    });
});
