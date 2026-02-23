/**
 * ACP Agent Registry
 *
 * Manages agent configurations, binary discovery, authentication state,
 * and capability caching. Persists agent configs to ~/.happy/agents.json
 * for cross-restart persistence.
 *
 * Supports PATH scanning for known ACP-compatible agent binaries and
 * manual agent addition for custom or unlisted agents.
 *
 * @see https://agentclientprotocol.com/protocol/overview
 */

import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as z from 'zod';
import type { AcpAgentCapabilities, AcpAuthMethod } from '@magic-agent/protocol';
import { configuration } from '@/configuration';
import { logger } from '@/ui/logger';

const execFileAsync = promisify(execFile);

// ─── Types ───────────────────────────────────────────────────────────────────

/** Persisted authentication state for an agent */
export type AgentAuthState =
    | { status: 'none' }
    | { status: 'required'; methods: AcpAuthMethod[] }
    | { status: 'authenticated'; expiresAt?: number };

/** Configuration for a single ACP agent */
export interface AgentConfig {
    /** Unique agent identifier (e.g., 'claude-code') */
    id: string;

    /** Human-readable display name (e.g., 'Claude Code') */
    displayName: string;

    /** Full path to the agent binary */
    binaryPath: string;

    /** Arguments to start ACP mode (e.g., ['code', '--acp']) */
    args: string[];

    /** Environment variables to pass to the agent process */
    env?: Record<string, string>;

    /** Authentication state tracked from last initialization */
    authState: AgentAuthState;

    /** Cached agent capabilities from last initialization */
    capabilities?: AcpAgentCapabilities;

    /** Timestamp (ms since epoch) when this agent was last used */
    lastUsed?: number;
}

/** Definition of a known ACP agent for PATH discovery */
export interface KnownAgentDefinition {
    /** Unique agent identifier */
    id: string;

    /** Binary name to search for in PATH (e.g., 'claude') */
    binary: string;

    /** Arguments to start ACP mode */
    args: string[];

    /** Human-readable display name */
    displayName: string;
}

/** Result of a single agent discovery attempt */
export interface DiscoveryResult {
    /** Agent definition that was checked */
    agent: KnownAgentDefinition;

    /** Whether the binary was found */
    found: boolean;

    /** Full path to the binary, if found */
    binaryPath?: string;
}

// ─── Known Agent Definitions ─────────────────────────────────────────────────

/**
 * Known ACP-compatible agents and their binary/arguments.
 *
 * These are used for PATH scanning during agent discovery.
 * Users can also add custom agents not in this list.
 */
export const KNOWN_AGENTS: KnownAgentDefinition[] = [
    { id: 'claude-code', binary: 'claude', args: ['code', '--acp'], displayName: 'Claude Code' },
    { id: 'gemini-cli', binary: 'gemini', args: ['acp'], displayName: 'Gemini CLI' },
    { id: 'codex-cli', binary: 'codex', args: ['--acp'], displayName: 'Codex CLI' },
    { id: 'goose', binary: 'goose', args: ['acp'], displayName: 'Goose' },
    { id: 'kiro-cli', binary: 'kiro-cli', args: ['acp'], displayName: 'Kiro' },
    { id: 'qwen-code', binary: 'qwen', args: ['code', '--acp'], displayName: 'Qwen Code' },
    { id: 'stackpack', binary: 'stackpack', args: ['--acp'], displayName: 'StackPack' },
];

// ─── Persistence Schema ──────────────────────────────────────────────────────

const AgentAuthStateSchema = z.discriminatedUnion('status', [
    z.object({ status: z.literal('none') }),
    z.object({
        status: z.literal('required'),
        methods: z.array(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().nullable().optional(),
            _meta: z.record(z.string(), z.unknown()).nullable().optional(),
        })),
    }),
    z.object({
        status: z.literal('authenticated'),
        expiresAt: z.number().optional(),
    }),
]);

const AgentConfigSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    binaryPath: z.string(),
    args: z.array(z.string()),
    env: z.record(z.string(), z.string()).optional(),
    authState: AgentAuthStateSchema,
    capabilities: z.record(z.string(), z.unknown()).optional(),
    lastUsed: z.number().optional(),
});

const AgentRegistryFileSchema = z.object({
    version: z.literal(1),
    activeAgentId: z.string().nullable(),
    agents: z.array(AgentConfigSchema),
});

type AgentRegistryFile = z.infer<typeof AgentRegistryFileSchema>;

// ─── Errors ──────────────────────────────────────────────────────────────────

/** Thrown when attempting to operate on an agent that is not in the registry */
export class AgentNotFoundError extends Error {
    readonly agentId: string;

    constructor(agentId: string) {
        super(`Agent '${agentId}' not found in the registry`);
        this.name = 'AgentNotFoundError';
        this.agentId = agentId;
    }
}

/** Thrown when attempting to add an agent with a duplicate ID */
export class DuplicateAgentError extends Error {
    readonly agentId: string;

    constructor(agentId: string) {
        super(`Agent '${agentId}' already exists in the registry`);
        this.name = 'DuplicateAgentError';
        this.agentId = agentId;
    }
}

/** Thrown when an agent binary is not found at the expected path */
export class AgentBinaryNotFoundError extends Error {
    readonly agentId: string;
    readonly binaryPath: string;

    constructor(agentId: string, binaryPath: string) {
        super(
            `Agent '${agentId}' binary not found at '${binaryPath}'. ` +
            'Please verify the agent is installed and the path is correct.',
        );
        this.name = 'AgentBinaryNotFoundError';
        this.agentId = agentId;
        this.binaryPath = binaryPath;
    }
}

// ─── AgentRegistry ───────────────────────────────────────────────────────────

/**
 * Manages ACP agent configurations with persistence to disk.
 *
 * Provides CRUD operations for agent configs, PATH-based discovery of
 * known agents, active agent tracking, and atomic persistence to
 * `~/.happy/agents.json`.
 *
 * @example
 * ```typescript
 * const registry = new AgentRegistry();
 * await registry.load();
 *
 * const discovered = await registry.discoverAgents();
 * console.log(`Found ${discovered.length} agents`);
 *
 * const active = registry.getActiveAgent();
 * if (active) {
 *     console.log(`Active agent: ${active.displayName}`);
 * }
 * ```
 */
export class AgentRegistry {
    private agents = new Map<string, AgentConfig>();
    private activeAgentId: string | null = null;
    private loaded = false;

    /** Path to the agents.json configuration file */
    readonly configPath: string;

    constructor(configPath?: string) {
        this.configPath = configPath ?? join(configuration.happyHomeDir, 'agents.json');
    }

    // ─── Persistence ─────────────────────────────────────────────────────

    /**
     * Load agent configurations from disk.
     *
     * Reads and validates `~/.happy/agents.json`. If the file doesn't exist
     * or is corrupted, starts with an empty registry.
     */
    async load(): Promise<void> {
        if (!existsSync(this.configPath)) {
            logger.info('[AgentRegistry] No agents.json found, starting with empty registry');
            this.loaded = true;
            return;
        }

        try {
            const content = await readFile(this.configPath, 'utf-8');
            const parsed = JSON.parse(content);
            const result = AgentRegistryFileSchema.safeParse(parsed);

            if (!result.success) {
                logger.warn('[AgentRegistry] agents.json validation failed, starting fresh');
                logger.debug('[AgentRegistry] Parse errors:', JSON.stringify(result.error.issues));
                this.loaded = true;
                return;
            }

            this.agents.clear();
            for (const agent of result.data.agents) {
                this.agents.set(agent.id, agent as AgentConfig);
            }
            this.activeAgentId = result.data.activeAgentId;

            logger.info(`[AgentRegistry] Loaded ${this.agents.size} agents from disk`);
        } catch (error) {
            logger.warn('[AgentRegistry] Failed to read agents.json:', error);
        }

        this.loaded = true;
    }

    /**
     * Save agent configurations to disk atomically.
     *
     * Uses a temp-file + rename pattern to prevent corruption from
     * crashes or concurrent writes.
     */
    async save(): Promise<void> {
        const dir = dirname(this.configPath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        const data: AgentRegistryFile = {
            version: 1,
            activeAgentId: this.activeAgentId,
            agents: Array.from(this.agents.values()),
        };

        const content = JSON.stringify(data, null, 2);
        const tempPath = `${this.configPath}.${randomUUID()}.tmp`;

        try {
            await writeFile(tempPath, content, 'utf-8');
            await rename(tempPath, this.configPath);
            logger.info(`[AgentRegistry] Saved ${this.agents.size} agents to disk`);
        } catch (error) {
            try {
                if (existsSync(tempPath)) {
                    await unlink(tempPath);
                }
            } catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }

    // ─── Agent CRUD ──────────────────────────────────────────────────────

    /**
     * Add a new agent configuration to the registry.
     *
     * @throws DuplicateAgentError if an agent with the same ID already exists
     */
    addAgent(config: AgentConfig): void {
        if (this.agents.has(config.id)) {
            throw new DuplicateAgentError(config.id);
        }

        this.agents.set(config.id, { ...config });
        logger.info(`[AgentRegistry] Added agent: ${config.displayName} (${config.id})`);
    }

    /**
     * Remove an agent from the registry.
     *
     * If the removed agent was active, the active agent is cleared.
     *
     * @throws AgentNotFoundError if the agent is not in the registry
     */
    removeAgent(id: string): void {
        if (!this.agents.has(id)) {
            throw new AgentNotFoundError(id);
        }

        this.agents.delete(id);
        if (this.activeAgentId === id) {
            this.activeAgentId = null;
        }

        logger.info(`[AgentRegistry] Removed agent: ${id}`);
    }

    /**
     * Update an existing agent's configuration (partial update).
     *
     * @throws AgentNotFoundError if the agent is not in the registry
     */
    updateAgent(id: string, partial: Partial<Omit<AgentConfig, 'id'>>): void {
        const existing = this.agents.get(id);
        if (!existing) {
            throw new AgentNotFoundError(id);
        }

        const updated: AgentConfig = { ...existing, ...partial, id };
        this.agents.set(id, updated);

        logger.info(`[AgentRegistry] Updated agent: ${id}`);
    }

    /** Get a specific agent configuration by ID */
    getAgent(id: string): AgentConfig | undefined {
        return this.agents.get(id);
    }

    /** Get all configured agents, sorted by last used (most recent first) */
    getConfiguredAgents(): AgentConfig[] {
        return Array.from(this.agents.values()).sort((a, b) => {
            const aTime = a.lastUsed ?? 0;
            const bTime = b.lastUsed ?? 0;
            return bTime - aTime;
        });
    }

    /** Whether the registry has any agents configured */
    hasAgents(): boolean {
        return this.agents.size > 0;
    }

    /** Whether the registry has been loaded from disk */
    isLoaded(): boolean {
        return this.loaded;
    }

    // ─── Active Agent ────────────────────────────────────────────────────

    /** Get the currently active agent, or null if none is active */
    getActiveAgent(): AgentConfig | null {
        if (!this.activeAgentId) return null;
        return this.agents.get(this.activeAgentId) ?? null;
    }

    /** Get the active agent ID, or null */
    getActiveAgentId(): string | null {
        return this.activeAgentId;
    }

    /**
     * Set the active agent by ID.
     *
     * @throws AgentNotFoundError if the agent is not in the registry
     */
    setActiveAgent(id: string): void {
        if (!this.agents.has(id)) {
            throw new AgentNotFoundError(id);
        }

        this.activeAgentId = id;
        this.updateAgent(id, { lastUsed: Date.now() });
        logger.info(`[AgentRegistry] Active agent set to: ${id}`);
    }

    /** Clear the active agent selection */
    clearActiveAgent(): void {
        this.activeAgentId = null;
    }

    // ─── Discovery ───────────────────────────────────────────────────────

    /**
     * Discover ACP agent binaries on the system by scanning PATH.
     *
     * Checks each known agent definition to see if its binary exists in
     * the system PATH. Found agents are automatically added to the registry
     * if not already present.
     *
     * @returns Array of discovery results showing what was found/not found
     */
    async discoverAgents(): Promise<DiscoveryResult[]> {
        logger.info('[AgentRegistry] Starting agent discovery (scanning PATH)');

        const results: DiscoveryResult[] = [];

        for (const known of KNOWN_AGENTS) {
            const binaryPath = await resolveBinaryPath(known.binary);

            const result: DiscoveryResult = {
                agent: known,
                found: binaryPath !== null,
                binaryPath: binaryPath ?? undefined,
            };

            results.push(result);

            if (binaryPath && !this.agents.has(known.id)) {
                const config: AgentConfig = {
                    id: known.id,
                    displayName: known.displayName,
                    binaryPath,
                    args: known.args,
                    authState: { status: 'none' },
                };

                this.agents.set(known.id, config);
                logger.info(`[AgentRegistry] Discovered: ${known.displayName} at ${binaryPath}`);
            } else if (binaryPath && this.agents.has(known.id)) {
                // Update the binary path in case it moved
                const existing = this.agents.get(known.id)!;
                if (existing.binaryPath !== binaryPath) {
                    existing.binaryPath = binaryPath;
                    logger.info(`[AgentRegistry] Updated path for ${known.displayName}: ${binaryPath}`);
                }
            }
        }

        const foundCount = results.filter((r) => r.found).length;
        logger.info(`[AgentRegistry] Discovery complete: ${foundCount}/${results.length} agents found`);

        return results;
    }

    /**
     * Verify that an agent's binary still exists at its configured path.
     *
     * @returns true if the binary exists, false otherwise
     */
    async verifyAgentBinary(id: string): Promise<boolean> {
        const agent = this.agents.get(id);
        if (!agent) return false;

        return existsSync(agent.binaryPath);
    }
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Resolve a binary name to its full path using `which` (Unix) or `where` (Windows).
 *
 * @param binary - Binary name to search for
 * @returns Full path to the binary, or null if not found
 */
async function resolveBinaryPath(binary: string): Promise<string | null> {
    const command = process.platform === 'win32' ? 'where' : 'which';

    try {
        const { stdout } = await execFileAsync(command, [binary], {
            timeout: 5_000,
        });

        const path = stdout.trim().split('\n')[0]?.trim();
        return path || null;
    } catch {
        return null;
    }
}
