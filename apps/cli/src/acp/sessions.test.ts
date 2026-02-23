/**
 * Unit tests for ACP SessionManager
 *
 * Tests all session lifecycle methods including capability gating,
 * session registry tracking, and auth retry flow. Uses real child
 * processes following the project's testing conventions.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import { ACP_ERROR_CODES } from '@magic-agent/protocol';
import { AcpTransport } from './transport';
import type { AcpTransportConfig } from './types';
import { initializeConnection } from './initialization';
import {
    createAgentConnection,
    HAPPY_CLIENT_CAPABILITIES,
    type AgentConnection,
} from './capabilities';
import {
    SessionManager,
    SessionCapabilityError,
    SessionNotFoundError,
} from './sessions';

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

/** Create a Node.js script that acts as a mock ACP agent with session support */
function createSessionAgentScript(options: {
    initResponse?: Record<string, unknown>;
    sessionId?: string;
    forkSessionId?: string;
    sessions?: Array<Record<string, unknown>>;
    configOptions?: Array<Record<string, unknown>>;
    modes?: Record<string, unknown>;
    models?: Record<string, unknown>;
    authRequired?: boolean;
}): string {
    const {
        initResponse,
        sessionId = 'test-session-001',
        forkSessionId = 'fork-session-001',
        sessions = [],
        configOptions = null,
        modes = null,
        models = null,
        authRequired = false,
    } = options;

    const defaultInitResponse = {
        protocolVersion: PROTOCOL_VERSION,
        agentCapabilities: {
            loadSession: true,
            sessionCapabilities: {
                list: {},
                resume: {},
                fork: {},
            },
        },
        authMethods: [],
    };

    const finalInitResponse = initResponse ?? defaultInitResponse;
    const responseStr = JSON.stringify(finalInitResponse);
    const sessionsStr = JSON.stringify(sessions);
    const configStr = JSON.stringify(configOptions);
    const modesStr = JSON.stringify(modes);
    const modelsStr = JSON.stringify(models);

    return `
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin });
        let authenticated = false;
        rl.on('line', (line) => {
            try {
                const msg = JSON.parse(line);

                if (msg.method === 'initialize') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: ${responseStr}
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'authenticate') {
                    authenticated = true;
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {}
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/new') {
                    if (${authRequired} && !authenticated) {
                        process.stdout.write(JSON.stringify({
                            jsonrpc: '2.0',
                            id: msg.id,
                            error: { code: ${ACP_ERROR_CODES.AUTH_REQUIRED}, message: 'auth_required' }
                        }) + '\\n');
                        return;
                    }
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {
                            sessionId: '${sessionId}',
                            configOptions: ${configStr},
                            modes: ${modesStr},
                            models: ${modelsStr},
                        }
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/load') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {
                            configOptions: ${configStr},
                            modes: ${modesStr},
                            models: ${modelsStr},
                        }
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/resume') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {
                            configOptions: ${configStr},
                            modes: ${modesStr},
                            models: ${modelsStr},
                        }
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/fork') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {
                            sessionId: '${forkSessionId}',
                            configOptions: ${configStr},
                            modes: ${modesStr},
                            models: ${modelsStr},
                        }
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/list') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {
                            sessions: ${sessionsStr},
                            nextCursor: null,
                        }
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/set_mode') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {}
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/set_model') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {}
                    }) + '\\n');
                    return;
                }

                if (msg.method === 'session/set_config_option') {
                    process.stdout.write(JSON.stringify({
                        jsonrpc: '2.0',
                        id: msg.id,
                        result: {
                            configOptions: ${configStr} || [],
                        }
                    }) + '\\n');
                    return;
                }
            } catch (e) {}
        });
    `;
}

/** Create a SessionManager connected to a mock agent */
async function createTestManager(
    agentOptions: Parameters<typeof createSessionAgentScript>[0] = {},
): Promise<{ manager: SessionManager; transport: AcpTransport }> {
    const transport = createTransport({
        command: 'node',
        args: ['-e', createSessionAgentScript(agentOptions)],
    });

    transport.spawn(minimalClient);

    const connection = await initializeConnection(transport, {
        autoAuthenticate: false,
    });

    const manager = new SessionManager(transport, connection);
    return { manager, transport };
}

/** Create a SessionManager with a manually crafted AgentConnection (for capability gating tests) */
function createManagerWithCapabilities(
    transport: AcpTransport,
    capabilities: Partial<AgentConnection['capabilities']> = {},
): SessionManager {
    const connection = createAgentConnection(
        {
            protocolVersion: PROTOCOL_VERSION,
            agentCapabilities: {
                loadSession: false,
                mcpCapabilities: { http: false, sse: false },
                promptCapabilities: { audio: false, embeddedContext: false, image: false },
                sessionCapabilities: {},
                ...capabilities,
            },
        },
        HAPPY_CLIENT_CAPABILITIES,
    );
    return new SessionManager(transport, connection);
}

afterEach(async () => {
    for (const transport of activeTransports) {
        transport.kill();
    }
    activeTransports.length = 0;
    await new Promise((resolve) => setTimeout(resolve, 50));
});

// ─── Session Creation ────────────────────────────────────────────────────────

describe('SessionManager', () => {
    describe('createSession', () => {
        it('creates a new session and returns the session ID', async () => {
            const { manager } = await createTestManager({
                sessionId: 'abc-123',
            });

            const sessionId = await manager.createSession('/tmp/project');

            expect(sessionId).toBe('abc-123');
        });

        it('tracks the created session in the registry', async () => {
            const { manager } = await createTestManager({
                sessionId: 'abc-123',
            });

            await manager.createSession('/tmp/project');

            const session = manager.getSession('abc-123');
            expect(session).toBeDefined();
            expect(session!.sessionId).toBe('abc-123');
            expect(session!.cwd).toBe('/tmp/project');
            expect(session!.createdAt).toBeInstanceOf(Date);
        });

        it('sets the created session as active', async () => {
            const { manager } = await createTestManager({
                sessionId: 'abc-123',
            });

            await manager.createSession('/tmp/project');

            expect(manager.getActiveSessionId()).toBe('abc-123');
        });

        it('stores modes from the response', async () => {
            const modes = {
                availableModes: [
                    { id: 'code', name: 'Code' },
                    { id: 'architect', name: 'Architect' },
                ],
                currentModeId: 'code',
            };

            const { manager } = await createTestManager({
                sessionId: 'abc-123',
                modes,
            });

            await manager.createSession('/tmp/project');

            const session = manager.getSession('abc-123');
            expect(session!.modes).toBeDefined();
            expect(session!.modes!.currentModeId).toBe('code');
            expect(session!.modes!.availableModes).toHaveLength(2);
        });

        it('stores models from the response', async () => {
            const models = {
                availableModels: [
                    { modelId: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
                    { modelId: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
                ],
                currentModelId: 'claude-opus-4-6',
            };

            const { manager } = await createTestManager({
                sessionId: 'abc-123',
                models,
            });

            await manager.createSession('/tmp/project');

            const session = manager.getSession('abc-123');
            expect(session!.models).toBeDefined();
            expect(session!.models!.currentModelId).toBe('claude-opus-4-6');
            expect(session!.models!.availableModels).toHaveLength(2);
        });

        it('stores config options from the response', async () => {
            const configOptions = [
                {
                    type: 'select',
                    id: 'theme',
                    name: 'Theme',
                    currentValue: 'dark',
                    options: [
                        { name: 'Dark', value: 'dark' },
                        { name: 'Light', value: 'light' },
                    ],
                },
            ];

            const { manager } = await createTestManager({
                sessionId: 'abc-123',
                configOptions,
            });

            await manager.createSession('/tmp/project');

            const session = manager.getSession('abc-123');
            expect(session!.configOptions).toHaveLength(1);
            expect(session!.configOptions![0].id).toBe('theme');
        });

        it('retries with authentication when auth_required error is returned', async () => {
            const { manager } = await createTestManager({
                sessionId: 'auth-session-001',
                authRequired: true,
                initResponse: {
                    protocolVersion: PROTOCOL_VERSION,
                    agentCapabilities: { loadSession: true },
                    authMethods: [{ id: 'agent_auth', name: 'Agent Auth' }],
                },
            });

            const sessionId = await manager.createSession('/tmp/project');

            expect(sessionId).toBe('auth-session-001');
        });

        it('supports multiple concurrent sessions', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', `
                    const readline = require('readline');
                    const rl = readline.createInterface({ input: process.stdin });
                    let counter = 0;
                    rl.on('line', (line) => {
                        try {
                            const msg = JSON.parse(line);
                            if (msg.method === 'initialize') {
                                process.stdout.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: msg.id,
                                    result: {
                                        protocolVersion: ${PROTOCOL_VERSION},
                                        agentCapabilities: {},
                                        authMethods: [],
                                    }
                                }) + '\\n');
                            }
                            if (msg.method === 'session/new') {
                                counter++;
                                process.stdout.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: msg.id,
                                    result: { sessionId: 'session-' + counter }
                                }) + '\\n');
                            }
                        } catch (e) {}
                    });
                `],
            });

            transport.spawn(minimalClient);
            const connection = await initializeConnection(transport, { autoAuthenticate: false });
            const manager = new SessionManager(transport, connection);

            const id1 = await manager.createSession('/tmp/project1');
            const id2 = await manager.createSession('/tmp/project2');
            const id3 = await manager.createSession('/tmp/project3');

            expect(id1).toBe('session-1');
            expect(id2).toBe('session-2');
            expect(id3).toBe('session-3');

            expect(manager.getAllSessions().size).toBe(3);
            // Last created session should be active
            expect(manager.getActiveSessionId()).toBe('session-3');
        });
    });

    // ─── Session Loading ─────────────────────────────────────────────────

    describe('loadSession', () => {
        it('loads an existing session and tracks it', async () => {
            const { manager } = await createTestManager();

            await manager.loadSession('existing-session', '/tmp/project');

            const session = manager.getSession('existing-session');
            expect(session).toBeDefined();
            expect(session!.sessionId).toBe('existing-session');
            expect(session!.cwd).toBe('/tmp/project');
            expect(manager.getActiveSessionId()).toBe('existing-session');
        });

        it('throws SessionCapabilityError when loadSession is not supported', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createSessionAgentScript({
                    initResponse: {
                        protocolVersion: PROTOCOL_VERSION,
                        agentCapabilities: { loadSession: false },
                        authMethods: [],
                    },
                })],
            });

            transport.spawn(minimalClient);
            const connection = await initializeConnection(transport, { autoAuthenticate: false });
            const manager = new SessionManager(transport, connection);

            await expect(
                manager.loadSession('some-session', '/tmp'),
            ).rejects.toThrow(SessionCapabilityError);
        });
    });

    // ─── Session Resume ──────────────────────────────────────────────────

    describe('resumeSession', () => {
        it('resumes a session and tracks it', async () => {
            const { manager } = await createTestManager();

            await manager.resumeSession('resume-session', '/tmp/project');

            const session = manager.getSession('resume-session');
            expect(session).toBeDefined();
            expect(session!.sessionId).toBe('resume-session');
            expect(manager.getActiveSessionId()).toBe('resume-session');
        });

        it('throws SessionCapabilityError when resume is not supported', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createSessionAgentScript({
                    initResponse: {
                        protocolVersion: PROTOCOL_VERSION,
                        agentCapabilities: {
                            loadSession: true,
                            sessionCapabilities: {},
                        },
                        authMethods: [],
                    },
                })],
            });

            transport.spawn(minimalClient);
            const connection = await initializeConnection(transport, { autoAuthenticate: false });
            const manager = new SessionManager(transport, connection);

            await expect(
                manager.resumeSession('some-session', '/tmp'),
            ).rejects.toThrow(SessionCapabilityError);
        });
    });

    // ─── Session Fork ────────────────────────────────────────────────────

    describe('forkSession', () => {
        it('forks a session and returns the new session ID', async () => {
            const { manager } = await createTestManager({
                forkSessionId: 'forked-001',
            });

            const newId = await manager.forkSession('original-session', '/tmp/project');

            expect(newId).toBe('forked-001');
        });

        it('tracks the forked session and sets it as active', async () => {
            const { manager } = await createTestManager({
                forkSessionId: 'forked-001',
            });

            await manager.forkSession('original-session', '/tmp/project');

            const session = manager.getSession('forked-001');
            expect(session).toBeDefined();
            expect(session!.cwd).toBe('/tmp/project');
            expect(manager.getActiveSessionId()).toBe('forked-001');
        });

        it('throws SessionCapabilityError when fork is not supported', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createSessionAgentScript({
                    initResponse: {
                        protocolVersion: PROTOCOL_VERSION,
                        agentCapabilities: {
                            loadSession: true,
                            sessionCapabilities: { resume: {} },
                        },
                        authMethods: [],
                    },
                })],
            });

            transport.spawn(minimalClient);
            const connection = await initializeConnection(transport, { autoAuthenticate: false });
            const manager = new SessionManager(transport, connection);

            await expect(
                manager.forkSession('some-session', '/tmp'),
            ).rejects.toThrow(SessionCapabilityError);
        });
    });

    // ─── Session Config ──────────────────────────────────────────────────

    describe('configSession', () => {
        it('sets a configuration option and returns updated config', async () => {
            const configOptions = [
                {
                    type: 'select',
                    id: 'theme',
                    name: 'Theme',
                    currentValue: 'dark',
                    options: [
                        { name: 'Dark', value: 'dark' },
                        { name: 'Light', value: 'light' },
                    ],
                },
            ];

            const { manager } = await createTestManager({
                sessionId: 'config-session',
                configOptions,
            });

            await manager.createSession('/tmp/project');

            const result = await manager.configSession('config-session', 'theme', 'light');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('theme');
        });

        it('updates the tracked session state with new config', async () => {
            const configOptions = [
                {
                    type: 'select',
                    id: 'lang',
                    name: 'Language',
                    currentValue: 'en',
                    options: [
                        { name: 'English', value: 'en' },
                        { name: 'Spanish', value: 'es' },
                    ],
                },
            ];

            const { manager } = await createTestManager({
                sessionId: 'config-session',
                configOptions,
            });

            await manager.createSession('/tmp/project');
            await manager.configSession('config-session', 'lang', 'es');

            const session = manager.getSession('config-session');
            expect(session!.configOptions).toHaveLength(1);
        });
    });

    // ─── Session Mode ────────────────────────────────────────────────────

    describe('setMode', () => {
        it('sets the mode on a session', async () => {
            const modes = {
                availableModes: [
                    { id: 'code', name: 'Code' },
                    { id: 'architect', name: 'Architect' },
                ],
                currentModeId: 'code',
            };

            const { manager } = await createTestManager({
                sessionId: 'mode-session',
                modes,
            });

            await manager.createSession('/tmp/project');

            await expect(
                manager.setMode('mode-session', 'architect'),
            ).resolves.toBeUndefined();
        });

        it('updates the tracked mode in session state', async () => {
            const modes = {
                availableModes: [
                    { id: 'code', name: 'Code' },
                    { id: 'architect', name: 'Architect' },
                ],
                currentModeId: 'code',
            };

            const { manager } = await createTestManager({
                sessionId: 'mode-session',
                modes,
            });

            await manager.createSession('/tmp/project');
            await manager.setMode('mode-session', 'architect');

            const session = manager.getSession('mode-session');
            expect(session!.modes!.currentModeId).toBe('architect');
        });
    });

    // ─── Session Model ───────────────────────────────────────────────────

    describe('setModel', () => {
        it('sets the model on a session', async () => {
            const models = {
                availableModels: [
                    { modelId: 'claude-opus-4-6', name: 'Opus' },
                    { modelId: 'claude-sonnet-4-6', name: 'Sonnet' },
                ],
                currentModelId: 'claude-opus-4-6',
            };

            const { manager } = await createTestManager({
                sessionId: 'model-session',
                models,
            });

            await manager.createSession('/tmp/project');

            await expect(
                manager.setModel('model-session', 'claude-sonnet-4-6'),
            ).resolves.toBeUndefined();
        });

        it('updates the tracked model in session state', async () => {
            const models = {
                availableModels: [
                    { modelId: 'claude-opus-4-6', name: 'Opus' },
                    { modelId: 'claude-sonnet-4-6', name: 'Sonnet' },
                ],
                currentModelId: 'claude-opus-4-6',
            };

            const { manager } = await createTestManager({
                sessionId: 'model-session',
                models,
            });

            await manager.createSession('/tmp/project');
            await manager.setModel('model-session', 'claude-sonnet-4-6');

            const session = manager.getSession('model-session');
            expect(session!.models!.currentModelId).toBe('claude-sonnet-4-6');
        });
    });

    // ─── Session Listing ─────────────────────────────────────────────────

    describe('listSessions', () => {
        it('lists sessions from the agent', async () => {
            const sessions = [
                { sessionId: 'session-1', cwd: '/tmp/a', title: 'First' },
                { sessionId: 'session-2', cwd: '/tmp/b', title: 'Second' },
            ];

            const { manager } = await createTestManager({ sessions });

            const result = await manager.listSessions();

            expect(result.sessions).toHaveLength(2);
            expect(result.sessions[0].sessionId).toBe('session-1');
            expect(result.sessions[1].sessionId).toBe('session-2');
            expect(result.nextCursor).toBeNull();
        });

        it('throws SessionCapabilityError when listSessions is not supported', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', createSessionAgentScript({
                    initResponse: {
                        protocolVersion: PROTOCOL_VERSION,
                        agentCapabilities: {
                            loadSession: true,
                            sessionCapabilities: { resume: {} },
                        },
                        authMethods: [],
                    },
                })],
            });

            transport.spawn(minimalClient);
            const connection = await initializeConnection(transport, { autoAuthenticate: false });
            const manager = new SessionManager(transport, connection);

            await expect(
                manager.listSessions(),
            ).rejects.toThrow(SessionCapabilityError);
        });

        it('passes pagination cursor', async () => {
            const { manager } = await createTestManager({
                sessions: [
                    { sessionId: 'session-3', cwd: '/tmp/c' },
                ],
            });

            const result = await manager.listSessions({ cursor: 'page-2-cursor' });

            expect(result.sessions).toHaveLength(1);
        });
    });

    // ─── Capability Checks ───────────────────────────────────────────────

    describe('capability checks', () => {
        it('canLoad returns true when loadSession capability is present', async () => {
            const { manager } = await createTestManager();
            expect(manager.canLoad()).toBe(true);
        });

        it('canResume returns true when session.resume capability is present', async () => {
            const { manager } = await createTestManager();
            expect(manager.canResume()).toBe(true);
        });

        it('canFork returns true when session.fork capability is present', async () => {
            const { manager } = await createTestManager();
            expect(manager.canFork()).toBe(true);
        });

        it('canList returns true when listSessions capability is present', async () => {
            const { manager } = await createTestManager();
            expect(manager.canList()).toBe(true);
        });

        it('returns false for capabilities that are not supported', () => {
            const transport = createTransport();
            const manager = createManagerWithCapabilities(transport);

            expect(manager.canLoad()).toBe(false);
            expect(manager.canResume()).toBe(false);
            expect(manager.canFork()).toBe(false);
            expect(manager.canList()).toBe(false);
        });
    });

    // ─── Session Registry ────────────────────────────────────────────────

    describe('session registry', () => {
        it('getActiveSessionId returns null when no session is active', async () => {
            const transport = createTransport();
            const manager = createManagerWithCapabilities(transport);

            expect(manager.getActiveSessionId()).toBeNull();
        });

        it('setActiveSessionId switches the active session', async () => {
            const { manager } = await createTestManager({
                sessionId: 'session-a',
            });

            await manager.createSession('/tmp/a');

            // Manually add a second session to the registry
            const transport = createTransport({
                command: 'node',
                args: ['-e', `
                    const readline = require('readline');
                    const rl = readline.createInterface({ input: process.stdin });
                    let counter = 0;
                    rl.on('line', (line) => {
                        try {
                            const msg = JSON.parse(line);
                            if (msg.method === 'initialize') {
                                process.stdout.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: msg.id,
                                    result: {
                                        protocolVersion: ${PROTOCOL_VERSION},
                                        agentCapabilities: {},
                                        authMethods: [],
                                    }
                                }) + '\\n');
                            }
                            if (msg.method === 'session/new') {
                                counter++;
                                process.stdout.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: msg.id,
                                    result: { sessionId: 'session-' + String.fromCharCode(96 + counter) }
                                }) + '\\n');
                            }
                        } catch (e) {}
                    });
                `],
            });

            transport.spawn(minimalClient);
            const connection = await initializeConnection(transport, { autoAuthenticate: false });
            const manager2 = new SessionManager(transport, connection);

            const idA = await manager2.createSession('/tmp/a');
            const idB = await manager2.createSession('/tmp/b');

            expect(manager2.getActiveSessionId()).toBe(idB);

            manager2.setActiveSessionId(idA);
            expect(manager2.getActiveSessionId()).toBe(idA);
        });

        it('setActiveSessionId throws SessionNotFoundError for unknown session', async () => {
            const transport = createTransport();
            const manager = createManagerWithCapabilities(transport);

            expect(() => manager.setActiveSessionId('nonexistent')).toThrow(SessionNotFoundError);
        });

        it('getAllSessions returns a copy of the session map', async () => {
            const { manager } = await createTestManager({
                sessionId: 'session-1',
            });

            await manager.createSession('/tmp/project');

            const sessions = manager.getAllSessions();
            expect(sessions.size).toBe(1);
            expect(sessions.get('session-1')).toBeDefined();

            // Verify it's a copy (mutations don't affect internal state)
            sessions.delete('session-1');
            expect(manager.getSession('session-1')).toBeDefined();
        });

        it('removeSession removes the session and clears active if necessary', async () => {
            const { manager } = await createTestManager({
                sessionId: 'session-1',
            });

            await manager.createSession('/tmp/project');
            expect(manager.getActiveSessionId()).toBe('session-1');

            manager.removeSession('session-1');

            expect(manager.getSession('session-1')).toBeUndefined();
            expect(manager.getActiveSessionId()).toBeNull();
        });

        it('removeSession does not clear active if a different session is active', async () => {
            const transport = createTransport({
                command: 'node',
                args: ['-e', `
                    const readline = require('readline');
                    const rl = readline.createInterface({ input: process.stdin });
                    let counter = 0;
                    rl.on('line', (line) => {
                        try {
                            const msg = JSON.parse(line);
                            if (msg.method === 'initialize') {
                                process.stdout.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: msg.id,
                                    result: {
                                        protocolVersion: ${PROTOCOL_VERSION},
                                        agentCapabilities: {},
                                        authMethods: [],
                                    }
                                }) + '\\n');
                            }
                            if (msg.method === 'session/new') {
                                counter++;
                                process.stdout.write(JSON.stringify({
                                    jsonrpc: '2.0',
                                    id: msg.id,
                                    result: { sessionId: 'session-' + counter }
                                }) + '\\n');
                            }
                        } catch (e) {}
                    });
                `],
            });

            transport.spawn(minimalClient);
            const connection = await initializeConnection(transport, { autoAuthenticate: false });
            const manager = new SessionManager(transport, connection);

            await manager.createSession('/tmp/a');
            await manager.createSession('/tmp/b');

            expect(manager.getActiveSessionId()).toBe('session-2');

            manager.removeSession('session-1');

            expect(manager.getActiveSessionId()).toBe('session-2');
        });

        it('getConnection returns the current agent connection', async () => {
            const { manager } = await createTestManager();

            const conn = manager.getConnection();
            expect(conn.protocolVersion).toBe(PROTOCOL_VERSION);
        });
    });

    // ─── Error Types ─────────────────────────────────────────────────────

    describe('error types', () => {
        it('SessionCapabilityError has correct properties', () => {
            const error = new SessionCapabilityError('session/load', 'loadSession');
            expect(error.name).toBe('SessionCapabilityError');
            expect(error.method).toBe('session/load');
            expect(error.capability).toBe('loadSession');
            expect(error.message).toContain('session/load');
            expect(error.message).toContain('loadSession');
        });

        it('SessionNotFoundError has correct properties', () => {
            const error = new SessionNotFoundError('missing-id');
            expect(error.name).toBe('SessionNotFoundError');
            expect(error.sessionId).toBe('missing-id');
            expect(error.message).toContain('missing-id');
        });
    });
});
