/**
 * Unit tests for MCP Config File Management
 *
 * Tests file operations, config loading/saving, and merge strategies.
 * Uses real filesystem operations with temp directories.
 *
 * @module mcp/config.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Variables for per-test directories
let testDir: string;
let fakeHome: string;
let fakeProject: string;

// Mock the configuration module
// We need to create temp directories at mock time to handle module initialization
vi.mock('@/configuration', () => {
    const { join: joinPath } = require('path');
    const { mkdtempSync, mkdirSync: mkdirSyncFs } = require('fs');
    const { tmpdir: tmpdirFn } = require('os');

    // Create a temp directory immediately for initial module load
    const initialTempDir = mkdtempSync(joinPath(tmpdirFn(), 'happy-mcp-test-'));
    const initialLogsDir = joinPath(initialTempDir, 'logs');
    mkdirSyncFs(initialLogsDir, { recursive: true });

    // Store the current home directory in a mutable object
    // Tests can update this via globalThis.__mcpTestConfig
    const config = {
        _fakeHome: initialTempDir,
    };

    // Make config accessible to tests
    (globalThis as unknown as { __mcpTestConfig: typeof config }).__mcpTestConfig = config;

    return {
        configuration: {
            get happyHomeDir() {
                return config._fakeHome;
            },
            get logsDir() {
                return joinPath(config._fakeHome, 'logs');
            },
            get settingsFile() {
                return joinPath(config._fakeHome, 'settings.json');
            },
            get privateKeyFile() {
                return joinPath(config._fakeHome, 'access.key');
            },
            get daemonStateFile() {
                return joinPath(config._fakeHome, 'daemon.state.json');
            },
            get daemonLockFile() {
                return joinPath(config._fakeHome, 'daemon.state.json.lock');
            },
            get daemonAuthTokenFile() {
                return joinPath(config._fakeHome, '.daemon-token');
            },
            isDaemonProcess: false,
            serverUrl: 'http://localhost:3005',
            webAppUrl: 'http://localhost:3000',
            isExperimentalEnabled: false,
            disableCaffeinate: true,
            currentCliVersion: '0.0.0-test',
            ensureSetup() { /* no-op */ }
        }
    };
});

// Type declaration for the global config
declare global {
    // eslint-disable-next-line no-var
    var __mcpTestConfig: { _fakeHome: string };
}

import {
    findProjectRoot,
    getMcpConfigPath,
    loadMcpConfig,
    saveMcpConfig,
    getMergedMcpServers,
    getEnabledMcpServers,
    hasMcpConfig,
    buildMcpSyncState,
} from './config';
import { DEFAULT_MCP_CONFIG, type HappyMcpConfig } from './types';

// Sample valid configs for testing
const sampleUserConfig: HappyMcpConfig = {
    version: 1,
    mcpServers: {
        'user-server': {
            command: 'node',
            args: ['user-server.js'],
            disabled: false,
            disabledTools: [],
            autoApprove: [],
            timeout: 5000,
            metadata: {
                addedAt: '2024-12-28T00:00:00.000Z',
                description: 'User-level server',
            },
        },
        'shared-server': {
            command: 'npx',
            args: ['shared-server'],
            disabled: false,
            disabledTools: [],
            autoApprove: [],
            timeout: 5000,
        },
    },
};

const sampleProjectConfig: HappyMcpConfig = {
    version: 1,
    mcpServers: {
        'project-server': {
            command: 'python',
            args: ['project-server.py'],
            disabled: false,
            disabledTools: [],
            autoApprove: [],
            timeout: 3000,
        },
        'shared-server': {
            // Overrides user config
            command: 'npx',
            args: ['project-version'],
            disabled: true, // Disabled at project level
            disabledTools: [],
            autoApprove: [],
            timeout: 8000,
        },
    },
    agentOverrides: {
        claude: {
            disabled: ['project-server'],
        },
    },
};

describe('MCP Config Module', () => {
    beforeEach(() => {
        // Create fresh unique temp directories for each test
        testDir = join(tmpdir(), `happy-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fakeHome = join(testDir, 'home');
        fakeProject = join(testDir, 'project');

        mkdirSync(fakeHome, { recursive: true });
        mkdirSync(join(fakeHome, 'logs'), { recursive: true }); // Create logs dir for Logger
        mkdirSync(fakeProject, { recursive: true });

        // Update the mock configuration to use this test's fakeHome
        globalThis.__mcpTestConfig._fakeHome = fakeHome;

        // Create a package.json to mark project root
        writeFileSync(join(fakeProject, 'package.json'), '{}');
    });

    afterEach(() => {
        // Clean up test directories
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }

        // Clear all mocks
        vi.restoreAllMocks();
    });

    describe('findProjectRoot', () => {
        it('should find project root by package.json', () => {
            // Create a nested subdirectory
            const subDir = join(fakeProject, 'src', 'utils');
            mkdirSync(subDir, { recursive: true });

            // Mock cwd to return the nested directory
            vi.spyOn(process, 'cwd').mockReturnValue(subDir);

            const result = findProjectRoot();
            expect(result).toBe(fakeProject);
        });

        it('should find project root by .git directory', () => {
            // Create a different project with only .git
            const gitProject = join(testDir, 'git-project');
            const gitSubDir = join(gitProject, 'packages', 'core');
            mkdirSync(gitSubDir, { recursive: true });
            mkdirSync(join(gitProject, '.git'), { recursive: true });

            vi.spyOn(process, 'cwd').mockReturnValue(gitSubDir);

            const result = findProjectRoot();
            expect(result).toBe(gitProject);
        });

        it('should return cwd if no project markers found', () => {
            const noProjectDir = join(testDir, 'no-project', 'deep', 'nested');
            mkdirSync(noProjectDir, { recursive: true });

            vi.spyOn(process, 'cwd').mockReturnValue(noProjectDir);

            const result = findProjectRoot();
            expect(result).toBe(noProjectDir);
        });
    });

    describe('getMcpConfigPath', () => {
        it('should return user config path for user scope', () => {
            const result = getMcpConfigPath('user');
            expect(result).toContain('config');
            expect(result).toContain('mcp.json');
            // fakeHome is used as happyHomeDir, so path is fakeHome/config/mcp.json
            expect(result).toBe(join(fakeHome, 'config', 'mcp.json'));
        });

        it('should return project config path for project scope', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const result = getMcpConfigPath('project');
            expect(result).toBe(join(fakeProject, '.enfm-happy', 'mcp.json'));
        });

        it('should default to user scope', () => {
            const defaultResult = getMcpConfigPath();
            const userResult = getMcpConfigPath('user');
            expect(defaultResult).toBe(userResult);
        });
    });

    describe('loadMcpConfig', () => {
        it('should return default config when file does not exist', () => {
            const result = loadMcpConfig('user');
            expect(result).toEqual(DEFAULT_MCP_CONFIG);
        });

        it('should load and parse valid config file', () => {
            // Create config directory and file
            const configDir = join(fakeHome, 'config');
            mkdirSync(configDir, { recursive: true });
            writeFileSync(
                join(configDir, 'mcp.json'),
                JSON.stringify(sampleUserConfig, null, 2)
            );

            const result = loadMcpConfig('user');
            expect(result.version).toBe(1);
            expect(result.mcpServers['user-server']?.command).toBe('node');
            expect(result.mcpServers['user-server']?.metadata?.description).toBe('User-level server');
        });

        it('should return default config for invalid JSON', () => {
            const configDir = join(fakeHome, 'config');
            mkdirSync(configDir, { recursive: true });
            writeFileSync(join(configDir, 'mcp.json'), '{ invalid json }');

            const result = loadMcpConfig('user');
            expect(result).toEqual(DEFAULT_MCP_CONFIG);
        });

        it('should return default config for invalid schema', () => {
            const configDir = join(fakeHome, 'config');
            mkdirSync(configDir, { recursive: true });
            // Missing required version field
            writeFileSync(join(configDir, 'mcp.json'), '{ "mcpServers": {} }');

            const result = loadMcpConfig('user');
            expect(result).toEqual(DEFAULT_MCP_CONFIG);
        });

        it('should load project config from project scope', () => {
            const projectConfigDir = join(fakeProject, '.enfm-happy');
            mkdirSync(projectConfigDir, { recursive: true });
            writeFileSync(
                join(projectConfigDir, 'mcp.json'),
                JSON.stringify(sampleProjectConfig, null, 2)
            );

            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const result = loadMcpConfig('project');
            expect(result.mcpServers['project-server']?.command).toBe('python');
        });
    });

    describe('saveMcpConfig', () => {
        it('should create directories and save valid config', () => {
            const config: HappyMcpConfig = {
                version: 1,
                mcpServers: {
                    'new-server': {
                        command: 'test',
                        disabled: false,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                },
            };

            saveMcpConfig(config, 'user');

            const savedPath = join(fakeHome, 'config', 'mcp.json');
            expect(existsSync(savedPath)).toBe(true);

            const savedContent = JSON.parse(readFileSync(savedPath, 'utf-8'));
            expect(savedContent.version).toBe(1);
            expect(savedContent.mcpServers['new-server'].command).toBe('test');
        });

        it('should create backup before overwriting', () => {
            const configDir = join(fakeHome, 'config');
            mkdirSync(configDir, { recursive: true });
            const configPath = join(configDir, 'mcp.json');
            const backupPath = configPath + '.bak';

            // Write initial config
            const initialConfig = { version: 1, mcpServers: { old: { command: 'old' } } };
            writeFileSync(configPath, JSON.stringify(initialConfig));

            // Save new config
            const newConfig: HappyMcpConfig = {
                version: 1,
                mcpServers: {
                    new: {
                        command: 'new',
                        disabled: false,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                },
            };
            saveMcpConfig(newConfig, 'user');

            // Verify backup was created
            expect(existsSync(backupPath)).toBe(true);
            const backupContent = JSON.parse(readFileSync(backupPath, 'utf-8'));
            expect(backupContent.mcpServers.old.command).toBe('old');

            // Verify new config was saved
            const savedContent = JSON.parse(readFileSync(configPath, 'utf-8'));
            expect(savedContent.mcpServers.new.command).toBe('new');
        });

        it('should throw on invalid config (validation failure)', () => {
            const invalidConfig = {
                version: 2, // Invalid version
                mcpServers: {},
            } as unknown as HappyMcpConfig;

            expect(() => saveMcpConfig(invalidConfig, 'user')).toThrow(/expected 1/i);
        });

        it('should save project config to project directory', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const config: HappyMcpConfig = {
                version: 1,
                mcpServers: {
                    'project-only': {
                        command: 'project-cmd',
                        disabled: false,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                },
            };

            saveMcpConfig(config, 'project');

            const savedPath = join(fakeProject, '.enfm-happy', 'mcp.json');
            expect(existsSync(savedPath)).toBe(true);
        });
    });

    describe('getMergedMcpServers', () => {
        beforeEach(() => {
            // Setup cwd for project scope
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const userConfigDir = join(fakeHome, 'config');
            const projectConfigDir = join(fakeProject, '.enfm-happy');

            mkdirSync(userConfigDir, { recursive: true });
            mkdirSync(projectConfigDir, { recursive: true });

            writeFileSync(
                join(userConfigDir, 'mcp.json'),
                JSON.stringify(sampleUserConfig, null, 2)
            );
            writeFileSync(
                join(projectConfigDir, 'mcp.json'),
                JSON.stringify(sampleProjectConfig, null, 2)
            );
        });

        it('should merge user and project servers', () => {
            const merged = getMergedMcpServers();

            // User-only server should be present
            expect(merged['user-server']).toBeDefined();
            expect(merged['user-server'].command).toBe('node');

            // Project-only server should be present
            expect(merged['project-server']).toBeDefined();
            expect(merged['project-server'].command).toBe('python');
        });

        it('should let project config override user config for same server name', () => {
            const merged = getMergedMcpServers();

            // shared-server exists in both - project should win
            expect(merged['shared-server']).toBeDefined();
            expect(merged['shared-server'].args).toEqual(['project-version']);
            expect(merged['shared-server'].disabled).toBe(true);
            expect(merged['shared-server'].timeout).toBe(8000);
        });

        it('should apply agent-specific overrides when agent name provided', () => {
            const merged = getMergedMcpServers('claude');

            // project-server should be disabled for claude
            expect(merged['project-server']).toBeDefined();
            expect(merged['project-server'].disabled).toBe(true);
        });

        it('should not apply agent overrides when no agent name provided', () => {
            const merged = getMergedMcpServers();

            // project-server should NOT be disabled without agent context
            expect(merged['project-server'].disabled).toBe(false);
        });

        it('should handle missing project config gracefully', () => {
            // Remove project config
            rmSync(join(fakeProject, '.enfm-happy', 'mcp.json'));

            const merged = getMergedMcpServers();

            // Should still have user servers
            expect(merged['user-server']).toBeDefined();
            expect(merged['shared-server']).toBeDefined();

            // Should not have project servers
            expect(merged['project-server']).toBeUndefined();
        });

        it('should handle missing user config gracefully', () => {
            // Remove user config
            rmSync(join(fakeHome, 'config', 'mcp.json'));

            const merged = getMergedMcpServers();

            // Should still have project servers
            expect(merged['project-server']).toBeDefined();
        });
    });

    describe('getEnabledMcpServers', () => {
        beforeEach(() => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const userConfigDir = join(fakeHome, 'config');
            mkdirSync(userConfigDir, { recursive: true });

            const configWithDisabled: HappyMcpConfig = {
                version: 1,
                mcpServers: {
                    enabled: {
                        command: 'enabled-cmd',
                        disabled: false,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                    disabled: {
                        command: 'disabled-cmd',
                        disabled: true,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                },
            };

            writeFileSync(
                join(userConfigDir, 'mcp.json'),
                JSON.stringify(configWithDisabled, null, 2)
            );
        });

        it('should filter out disabled servers', () => {
            const enabled = getEnabledMcpServers();

            expect(enabled['enabled']).toBeDefined();
            expect(enabled['disabled']).toBeUndefined();
            expect(Object.keys(enabled).length).toBe(1);
        });
    });

    describe('hasMcpConfig', () => {
        it('should return false when no config exists', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            expect(hasMcpConfig()).toBe(false);
        });

        it('should return true when user config exists', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const configDir = join(fakeHome, 'config');
            mkdirSync(configDir, { recursive: true });
            writeFileSync(join(configDir, 'mcp.json'), '{}');

            expect(hasMcpConfig()).toBe(true);
        });

        it('should return true when project config exists', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const projectConfigDir = join(fakeProject, '.enfm-happy');
            mkdirSync(projectConfigDir, { recursive: true });
            writeFileSync(join(projectConfigDir, 'mcp.json'), '{}');

            expect(hasMcpConfig()).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty mcpServers in both configs', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const emptyConfig: HappyMcpConfig = {
                version: 1,
                mcpServers: {},
            };

            const userConfigDir = join(fakeHome, 'config');
            const projectConfigDir = join(fakeProject, '.enfm-happy');

            mkdirSync(userConfigDir, { recursive: true });
            mkdirSync(projectConfigDir, { recursive: true });

            writeFileSync(join(userConfigDir, 'mcp.json'), JSON.stringify(emptyConfig));
            writeFileSync(join(projectConfigDir, 'mcp.json'), JSON.stringify(emptyConfig));

            const merged = getMergedMcpServers();
            expect(Object.keys(merged).length).toBe(0);
        });

        it('should apply agent overrides from both user and project configs', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const userWithOverrides: HappyMcpConfig = {
                version: 1,
                mcpServers: {
                    'server-a': {
                        command: 'a',
                        disabled: false,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                    'server-b': {
                        command: 'b',
                        disabled: false,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                },
                agentOverrides: {
                    claude: {
                        disabled: ['server-a'], // User disables server-a for claude
                    },
                },
            };

            const projectWithOverrides: HappyMcpConfig = {
                version: 1,
                mcpServers: {},
                agentOverrides: {
                    claude: {
                        disabled: ['server-b'], // Project disables server-b for claude
                    },
                },
            };

            const userConfigDir = join(fakeHome, 'config');
            const projectConfigDir = join(fakeProject, '.enfm-happy');

            mkdirSync(userConfigDir, { recursive: true });
            mkdirSync(projectConfigDir, { recursive: true });

            writeFileSync(join(userConfigDir, 'mcp.json'), JSON.stringify(userWithOverrides));
            writeFileSync(join(projectConfigDir, 'mcp.json'), JSON.stringify(projectWithOverrides));

            const merged = getMergedMcpServers('claude');

            // Both servers should be disabled for claude
            expect(merged['server-a'].disabled).toBe(true);
            expect(merged['server-b'].disabled).toBe(true);
        });

        it('should handle agent overrides adding new servers', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const userConfig: HappyMcpConfig = {
                version: 1,
                mcpServers: {},
                agentOverrides: {
                    codex: {
                        mcpServers: {
                            'codex-only': {
                                command: 'codex-server',
                                disabled: false,
                                disabledTools: [],
                                autoApprove: [],
                                timeout: 5000,
                            },
                        },
                    },
                },
            };

            const userConfigDir = join(fakeHome, 'config');
            mkdirSync(userConfigDir, { recursive: true });
            writeFileSync(join(userConfigDir, 'mcp.json'), JSON.stringify(userConfig));

            const merged = getMergedMcpServers('codex');

            // codex-only server should be present for codex agent
            expect(merged['codex-only']).toBeDefined();
            expect(merged['codex-only'].command).toBe('codex-server');
        });
    });

    describe('buildMcpSyncState', () => {
        it('should return undefined when no MCP config exists', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const syncState = buildMcpSyncState();
            expect(syncState).toBeUndefined();
        });

        it('should return undefined when config exists but has no servers', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const emptyConfig: HappyMcpConfig = {
                version: 1,
                mcpServers: {},
            };

            const userConfigDir = join(fakeHome, 'config');
            mkdirSync(userConfigDir, { recursive: true });
            writeFileSync(join(userConfigDir, 'mcp.json'), JSON.stringify(emptyConfig));

            const syncState = buildMcpSyncState();
            expect(syncState).toBeUndefined();
        });

        it('should build sync state with server info', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const configWithServers: HappyMcpConfig = {
                version: 1,
                mcpServers: {
                    'test-server': {
                        command: 'test',
                        disabled: false,
                        disabledTools: ['tool1', 'tool2'],
                        autoApprove: [],
                        timeout: 5000,
                        metadata: {
                            addedAt: '2024-12-28T00:00:00.000Z',
                            toolCount: 10,
                            lastValidated: '2024-12-28T01:00:00.000Z',
                        },
                    },
                    'disabled-server': {
                        command: 'disabled',
                        disabled: true,
                        disabledTools: [],
                        autoApprove: [],
                        timeout: 5000,
                    },
                },
            };

            const userConfigDir = join(fakeHome, 'config');
            mkdirSync(userConfigDir, { recursive: true });
            writeFileSync(join(userConfigDir, 'mcp.json'), JSON.stringify(configWithServers));

            const syncState = buildMcpSyncState();

            expect(syncState).toBeDefined();
            expect(syncState!.servers['test-server']).toEqual({
                disabled: false,
                toolCount: 10,
                lastValidated: '2024-12-28T01:00:00.000Z',
                disabledTools: ['tool1', 'tool2'],
            });
            expect(syncState!.servers['disabled-server']).toEqual({
                disabled: true,
                toolCount: undefined,
                lastValidated: undefined,
                disabledTools: undefined,
            });
        });

        it('should not include empty disabledTools array', () => {
            vi.spyOn(process, 'cwd').mockReturnValue(fakeProject);

            const config: HappyMcpConfig = {
                version: 1,
                mcpServers: {
                    'server': {
                        command: 'test',
                        disabled: false,
                        disabledTools: [], // Empty array
                        autoApprove: [],
                        timeout: 5000,
                    },
                },
            };

            const userConfigDir = join(fakeHome, 'config');
            mkdirSync(userConfigDir, { recursive: true });
            writeFileSync(join(userConfigDir, 'mcp.json'), JSON.stringify(config));

            const syncState = buildMcpSyncState();

            expect(syncState).toBeDefined();
            expect(syncState!.servers['server'].disabledTools).toBeUndefined();
        });
    });
});
