/**
 * Tests for ACP Agent Registry
 *
 * Covers: CRUD operations, persistence, discovery, active agent tracking,
 * error cases, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    AgentRegistry,
    AgentNotFoundError,
    DuplicateAgentError,
    KNOWN_AGENTS,
    type AgentConfig,
} from './registry';

function createTestConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
    return {
        id: 'test-agent',
        displayName: 'Test Agent',
        binaryPath: '/usr/bin/test-agent',
        args: ['--acp'],
        authState: { status: 'none' },
        ...overrides,
    };
}

describe('AgentRegistry', () => {
    let tempDir: string;
    let registry: AgentRegistry;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'happy-registry-test-'));
        registry = new AgentRegistry(join(tempDir, 'agents.json'));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    // ─── CRUD Operations ─────────────────────────────────────────────

    describe('addAgent', () => {
        it('should add an agent to the registry', () => {
            const config = createTestConfig();
            registry.addAgent(config);

            expect(registry.getAgent('test-agent')).toEqual(config);
            expect(registry.hasAgents()).toBe(true);
        });

        it('should throw DuplicateAgentError for duplicate IDs', () => {
            const config = createTestConfig();
            registry.addAgent(config);

            expect(() => registry.addAgent(config)).toThrow(DuplicateAgentError);
        });

        it('should store a copy, not a reference', () => {
            const config = createTestConfig();
            registry.addAgent(config);

            config.displayName = 'Modified';
            expect(registry.getAgent('test-agent')?.displayName).toBe('Test Agent');
        });
    });

    describe('removeAgent', () => {
        it('should remove an existing agent', () => {
            registry.addAgent(createTestConfig());
            registry.removeAgent('test-agent');

            expect(registry.getAgent('test-agent')).toBeUndefined();
            expect(registry.hasAgents()).toBe(false);
        });

        it('should throw AgentNotFoundError for missing agent', () => {
            expect(() => registry.removeAgent('nonexistent')).toThrow(AgentNotFoundError);
        });

        it('should clear active agent if removing the active one', () => {
            registry.addAgent(createTestConfig());
            registry.setActiveAgent('test-agent');
            registry.removeAgent('test-agent');

            expect(registry.getActiveAgent()).toBeNull();
        });
    });

    describe('updateAgent', () => {
        it('should partially update an agent config', () => {
            registry.addAgent(createTestConfig());
            registry.updateAgent('test-agent', { displayName: 'Updated Agent' });

            const agent = registry.getAgent('test-agent');
            expect(agent?.displayName).toBe('Updated Agent');
            expect(agent?.binaryPath).toBe('/usr/bin/test-agent');
        });

        it('should not change the agent ID', () => {
            registry.addAgent(createTestConfig());
            // Even if partial includes id-like fields, the original id is preserved
            registry.updateAgent('test-agent', { displayName: 'New Name' });

            expect(registry.getAgent('test-agent')?.id).toBe('test-agent');
        });

        it('should throw AgentNotFoundError for missing agent', () => {
            expect(() => registry.updateAgent('nonexistent', {})).toThrow(AgentNotFoundError);
        });

        it('should update auth state', () => {
            registry.addAgent(createTestConfig());
            registry.updateAgent('test-agent', {
                authState: { status: 'authenticated', expiresAt: Date.now() + 3600_000 },
            });

            const agent = registry.getAgent('test-agent');
            expect(agent?.authState.status).toBe('authenticated');
        });
    });

    describe('getConfiguredAgents', () => {
        it('should return empty array when no agents', () => {
            expect(registry.getConfiguredAgents()).toEqual([]);
        });

        it('should sort agents by lastUsed (most recent first)', () => {
            registry.addAgent(createTestConfig({ id: 'old', displayName: 'Old', lastUsed: 1000 }));
            registry.addAgent(createTestConfig({ id: 'new', displayName: 'New', lastUsed: 2000 }));
            registry.addAgent(createTestConfig({ id: 'newest', displayName: 'Newest', lastUsed: 3000 }));

            const agents = registry.getConfiguredAgents();
            expect(agents.map((a) => a.id)).toEqual(['newest', 'new', 'old']);
        });

        it('should put agents without lastUsed at the end', () => {
            registry.addAgent(createTestConfig({ id: 'used', displayName: 'Used', lastUsed: 1000 }));
            registry.addAgent(createTestConfig({ id: 'never-used', displayName: 'Never Used' }));

            const agents = registry.getConfiguredAgents();
            expect(agents[0].id).toBe('used');
            expect(agents[1].id).toBe('never-used');
        });
    });

    // ─── Active Agent ────────────────────────────────────────────────

    describe('active agent', () => {
        it('should return null when no active agent', () => {
            expect(registry.getActiveAgent()).toBeNull();
            expect(registry.getActiveAgentId()).toBeNull();
        });

        it('should set and get active agent', () => {
            registry.addAgent(createTestConfig());
            registry.setActiveAgent('test-agent');

            expect(registry.getActiveAgentId()).toBe('test-agent');
            expect(registry.getActiveAgent()?.id).toBe('test-agent');
        });

        it('should throw AgentNotFoundError when setting nonexistent agent as active', () => {
            expect(() => registry.setActiveAgent('nonexistent')).toThrow(AgentNotFoundError);
        });

        it('should update lastUsed when setting active', () => {
            const now = Date.now();
            registry.addAgent(createTestConfig());
            registry.setActiveAgent('test-agent');

            const agent = registry.getAgent('test-agent');
            expect(agent?.lastUsed).toBeGreaterThanOrEqual(now);
        });

        it('should clear active agent', () => {
            registry.addAgent(createTestConfig());
            registry.setActiveAgent('test-agent');
            registry.clearActiveAgent();

            expect(registry.getActiveAgent()).toBeNull();
        });
    });

    // ─── Persistence ─────────────────────────────────────────────────

    describe('persistence', () => {
        it('should load from empty state when no file exists', async () => {
            await registry.load();

            expect(registry.hasAgents()).toBe(false);
            expect(registry.isLoaded()).toBe(true);
        });

        it('should save and load agents', async () => {
            registry.addAgent(createTestConfig({ id: 'agent-1', displayName: 'Agent 1' }));
            registry.addAgent(createTestConfig({ id: 'agent-2', displayName: 'Agent 2' }));
            registry.setActiveAgent('agent-1');

            await registry.save();

            // Create new registry and load
            const newRegistry = new AgentRegistry(join(tempDir, 'agents.json'));
            await newRegistry.load();

            expect(newRegistry.getConfiguredAgents()).toHaveLength(2);
            expect(newRegistry.getAgent('agent-1')?.displayName).toBe('Agent 1');
            expect(newRegistry.getAgent('agent-2')?.displayName).toBe('Agent 2');
            expect(newRegistry.getActiveAgentId()).toBe('agent-1');
        });

        it('should persist auth state', async () => {
            registry.addAgent(createTestConfig({
                authState: { status: 'authenticated', expiresAt: 9999999 },
            }));
            await registry.save();

            const newRegistry = new AgentRegistry(join(tempDir, 'agents.json'));
            await newRegistry.load();

            const agent = newRegistry.getAgent('test-agent');
            expect(agent?.authState.status).toBe('authenticated');
            if (agent?.authState.status === 'authenticated') {
                expect(agent.authState.expiresAt).toBe(9999999);
            }
        });

        it('should create directory if it does not exist', async () => {
            const deepPath = join(tempDir, 'nested', 'dir', 'agents.json');
            const deepRegistry = new AgentRegistry(deepPath);
            deepRegistry.addAgent(createTestConfig());

            await deepRegistry.save();

            expect(existsSync(deepPath)).toBe(true);
        });

        it('should handle corrupted file gracefully', async () => {
            const configPath = join(tempDir, 'agents.json');
            const { writeFileSync } = await import('node:fs');
            writeFileSync(configPath, 'NOT VALID JSON!!!', 'utf-8');

            const corruptedRegistry = new AgentRegistry(configPath);
            await corruptedRegistry.load();

            expect(corruptedRegistry.hasAgents()).toBe(false);
            expect(corruptedRegistry.isLoaded()).toBe(true);
        });

        it('should handle invalid schema gracefully', async () => {
            const configPath = join(tempDir, 'agents.json');
            const { writeFileSync } = await import('node:fs');
            writeFileSync(configPath, JSON.stringify({ version: 99, bad: true }), 'utf-8');

            const badRegistry = new AgentRegistry(configPath);
            await badRegistry.load();

            expect(badRegistry.hasAgents()).toBe(false);
        });

        it('should write valid JSON to disk', async () => {
            registry.addAgent(createTestConfig());
            await registry.save();

            const content = readFileSync(join(tempDir, 'agents.json'), 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.version).toBe(1);
            expect(parsed.agents).toHaveLength(1);
            expect(parsed.agents[0].id).toBe('test-agent');
        });
    });

    // ─── Discovery ───────────────────────────────────────────────────

    describe('discoverAgents', () => {
        it('should return results for all known agents', async () => {
            await registry.load();
            const results = await registry.discoverAgents();

            expect(results.length).toBe(KNOWN_AGENTS.length);
            for (const result of results) {
                expect(result.agent).toBeDefined();
                expect(typeof result.found).toBe('boolean');
            }
        });

        it('should not duplicate already-configured agents', async () => {
            // Pre-add an agent that might be discovered
            registry.addAgent(createTestConfig({
                id: 'claude-code',
                displayName: 'Claude Code',
                binaryPath: '/custom/path/claude',
            }));

            await registry.discoverAgents();

            // Should still have exactly one claude-code entry
            const agents = registry.getConfiguredAgents().filter((a) => a.id === 'claude-code');
            expect(agents).toHaveLength(1);
        });
    });

    // ─── Known Agents ────────────────────────────────────────────────

    describe('KNOWN_AGENTS', () => {
        it('should include Claude Code', () => {
            const claude = KNOWN_AGENTS.find((a) => a.id === 'claude-code');
            expect(claude).toBeDefined();
            expect(claude?.binary).toBe('claude');
            expect(claude?.args).toContain('--acp');
        });

        it('should include at least 5 agents', () => {
            expect(KNOWN_AGENTS.length).toBeGreaterThanOrEqual(5);
        });

        it('should have unique IDs', () => {
            const ids = KNOWN_AGENTS.map((a) => a.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    // ─── Edge Cases ──────────────────────────────────────────────────

    describe('edge cases', () => {
        it('should handle loading when not loaded yet', () => {
            expect(registry.isLoaded()).toBe(false);
            expect(registry.hasAgents()).toBe(false);
        });

        it('should handle getAgent for nonexistent agent', () => {
            expect(registry.getAgent('nonexistent')).toBeUndefined();
        });

        it('should handle verifyAgentBinary for nonexistent agent', async () => {
            expect(await registry.verifyAgentBinary('nonexistent')).toBe(false);
        });

        it('should handle verifyAgentBinary for agent with missing binary', async () => {
            registry.addAgent(createTestConfig({ binaryPath: '/nonexistent/path/agent' }));
            expect(await registry.verifyAgentBinary('test-agent')).toBe(false);
        });
    });
});
