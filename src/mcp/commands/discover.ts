/**
 * MCP Discover Command
 *
 * Scans known MCP configuration locations (Claude Code, project .mcp.json) and
 * optionally imports discovered servers into Happy's MCP configuration.
 *
 * This enables easy onboarding for existing Claude Code users by discovering
 * and importing their existing MCP server configurations.
 *
 * @module mcp/commands/discover
 *
 * @example
 * ```bash
 * # Scan and display found servers
 * happy mcp discover
 *
 * # Scan and import to user config
 * happy mcp discover --import
 *
 * # Scan and import to project config
 * happy mcp discover --import --scope project
 * ```
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import type { z } from 'zod';
import { loadMcpConfig, saveMcpConfig, type ConfigScope } from '../config.js';
import { HappyMcpServerConfigSchema } from '../types.js';

/**
 * Input type for server config (allows optional fields that have defaults)
 */
type HappyMcpServerConfigInput = z.input<typeof HappyMcpServerConfigSchema>;

/**
 * Options for the discover command
 */
export interface DiscoverOptions {
    /** Whether to import discovered servers into Happy config */
    import?: boolean;
    /** Config scope for import: 'user' (global) or 'project' (local) */
    scope: ConfigScope;
}

/**
 * Represents an MCP server configuration discovered from an external source.
 * This is intentionally loosely typed since external configs may vary.
 */
interface ExternalMcpServerConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    [key: string]: unknown;
}

/**
 * Known MCP configuration locations to scan
 */
interface ConfigLocation {
    /** Human-readable name for display */
    name: string;
    /** Path to the config file (can be relative or absolute) */
    path: string;
    /** Whether the path is relative to project root */
    isProjectRelative?: boolean;
}

/**
 * Get the list of known configuration locations to scan.
 *
 * @returns Array of config locations with resolved absolute paths
 */
function getConfigLocations(): ConfigLocation[] {
    const home = homedir();

    return [
        {
            name: 'Claude Code (user)',
            path: join(home, '.claude.json'),
        },
        {
            name: 'Claude Code (settings)',
            path: join(home, '.claude', 'settings.json'),
        },
        {
            name: 'Project .mcp.json',
            path: '.mcp.json',
            isProjectRelative: true,
        },
    ];
}

/**
 * Parse MCP servers from a config file content.
 *
 * Handles different config structures used by various tools:
 * - Direct mcpServers object (Claude Code .claude.json)
 * - Nested under projects['*'].mcpServers (Claude Code settings.json)
 * - Nested under projects['<path>'].mcpServers (project-specific)
 *
 * @param content - Raw JSON content of the config file
 * @returns Record of server name to config, or empty object if none found
 */
function parseServersFromConfig(content: string): Record<string, ExternalMcpServerConfig> {
    const parsed = JSON.parse(content);

    // Direct mcpServers (most common in .claude.json)
    if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        return parsed.mcpServers as Record<string, ExternalMcpServerConfig>;
    }

    // Nested under projects (settings.json pattern)
    if (parsed.projects && typeof parsed.projects === 'object') {
        // First check for wildcard '*' which applies to all projects
        if (parsed.projects['*']?.mcpServers) {
            return parsed.projects['*'].mcpServers as Record<string, ExternalMcpServerConfig>;
        }

        // Collect servers from all project-specific configs
        const allServers: Record<string, ExternalMcpServerConfig> = {};
        for (const projectKey of Object.keys(parsed.projects)) {
            const projectConfig = parsed.projects[projectKey];
            if (projectConfig?.mcpServers) {
                Object.assign(allServers, projectConfig.mcpServers);
            }
        }
        if (Object.keys(allServers).length > 0) {
            return allServers;
        }
    }

    return {};
}

/**
 * Discovered servers grouped by source
 */
interface DiscoveredSource {
    /** Name of the config source */
    source: string;
    /** Path to the config file */
    path: string;
    /** Servers found in this source */
    servers: Record<string, ExternalMcpServerConfig>;
}

/**
 * Scan all known config locations for MCP servers.
 *
 * @returns Array of discovered sources with their servers
 */
function scanConfigLocations(): DiscoveredSource[] {
    const locations = getConfigLocations();
    const discovered: DiscoveredSource[] = [];

    for (const location of locations) {
        // Resolve path - project-relative paths need to resolve from cwd
        const resolvedPath = location.isProjectRelative
            ? join(process.cwd(), location.path)
            : location.path;

        if (!existsSync(resolvedPath)) {
            continue;
        }

        try {
            const content = readFileSync(resolvedPath, 'utf-8');
            const servers = parseServersFromConfig(content);

            if (Object.keys(servers).length > 0) {
                discovered.push({
                    source: location.name,
                    path: resolvedPath,
                    servers,
                });
            }
        } catch {
            // Skip files that can't be read or parsed - this is expected for
            // non-existent or malformed config files
        }
    }

    return discovered;
}

/**
 * Convert an external MCP server config to Happy's format.
 *
 * Filters out unknown fields and adds Happy-specific metadata.
 *
 * @param config - External server configuration
 * @param sourceName - Name of the source for metadata
 * @returns Server config in Happy's format
 */
function toHappyServerConfig(
    config: ExternalMcpServerConfig,
    sourceName: string
): HappyMcpServerConfigInput {
    return {
        command: config.command,
        args: config.args,
        env: config.env,
        metadata: {
            addedAt: new Date().toISOString(),
            description: `Imported from ${sourceName}`,
        },
    };
}

/**
 * Execute the 'happy mcp discover' command
 *
 * Scans known MCP configuration locations and displays found servers.
 * Optionally imports discovered servers into Happy's configuration.
 *
 * @param options - Command options
 *
 * @example
 * ```typescript
 * // Just scan and display
 * await discoverCommand({ scope: 'user' });
 *
 * // Scan and import to user config
 * await discoverCommand({ import: true, scope: 'user' });
 * ```
 */
export async function discoverCommand(options: DiscoverOptions): Promise<void> {
    console.log(chalk.bold('Scanning for MCP configurations...\n'));

    const discovered = scanConfigLocations();

    if (discovered.length === 0) {
        console.log(chalk.yellow('No MCP configurations found.'));
        console.log();
        console.log(chalk.gray('Looked in:'));
        for (const location of getConfigLocations()) {
            console.log(chalk.gray(`  - ${location.name}`));
        }
        return;
    }

    // Display discovered servers grouped by source
    for (const { source, servers } of discovered) {
        console.log(chalk.green(`✓ ${source}`));
        for (const name of Object.keys(servers)) {
            const config = servers[name];
            const commandPreview = config.args?.length
                ? `${config.command} ${config.args[0]}...`
                : config.command;
            console.log(chalk.gray(`    - ${name} (${commandPreview})`));
        }
    }

    // Calculate totals
    const totalServers = discovered.reduce((sum, d) => sum + Object.keys(d.servers).length, 0);

    console.log();
    console.log(
        `${chalk.bold('Found')} ${totalServers} server${totalServers !== 1 ? 's' : ''} ` +
            `from ${discovered.length} source${discovered.length !== 1 ? 's' : ''}.`
    );

    // Handle import
    if (options.import) {
        console.log();
        await importDiscoveredServers(discovered, options.scope);
    } else {
        console.log();
        console.log(chalk.gray('Run with --import to add these to your Happy config.'));
        console.log(chalk.gray('Example: happy mcp discover --import'));
    }
}

/**
 * Import discovered servers into Happy's MCP configuration.
 *
 * @param discovered - Array of discovered sources with servers
 * @param scope - Config scope to import into
 */
async function importDiscoveredServers(
    discovered: DiscoveredSource[],
    scope: ConfigScope
): Promise<void> {
    const config = loadMcpConfig(scope);
    let imported = 0;
    let skipped = 0;

    for (const { source, servers } of discovered) {
        for (const [name, serverConfig] of Object.entries(servers)) {
            if (config.mcpServers[name]) {
                console.log(chalk.yellow(`  Skipped "${name}" (already exists)`));
                skipped++;
            } else {
                const happyConfig = toHappyServerConfig(serverConfig, source);
                // Type assertion is safe because saveMcpConfig calls schema.parse()
                config.mcpServers[name] = happyConfig as typeof config.mcpServers[string];
                imported++;
            }
        }
    }

    saveMcpConfig(config, scope);

    console.log(chalk.green(`✓ Imported ${imported} server${imported !== 1 ? 's' : ''}`));
    if (skipped > 0) {
        console.log(chalk.gray(`  (${skipped} skipped - already exist)`));
    }

    // Suggest validation
    if (imported > 0) {
        console.log();
        console.log(chalk.gray('Run `happy mcp validate` to test the imported servers.'));
    }
}
