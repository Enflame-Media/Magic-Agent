/**
 * MCP Subcommand Entry Point
 *
 * Provides CLI commands for managing Model Context Protocol (MCP) servers.
 * Uses Commander.js for structured argument parsing within the mcp subcommand.
 *
 * @module mcp
 * @example
 * ```bash
 * happy mcp              # Show help
 * happy mcp --help       # Show help
 * happy mcp list         # List configured servers
 * happy mcp add <name>   # Add a new server (coming soon)
 * ```
 */

import { Command } from 'commander';
import packageJson from '../../package.json';

const program = new Command('mcp')
    .description('Manage MCP servers and tools')
    .version(packageJson.version);

program
    .command('list')
    .description('List all configured MCP servers')
    .action(async () => {
        const { listCommand } = await import('./commands/list.js');
        await listCommand();
    });

program
    .command('add <name>')
    .description('Add a new MCP server')
    .option('--scope <scope>', 'Config scope (user|project)', 'user')
    .option('--env <env...>', 'Environment variables (KEY=VALUE)')
    .action(async (name: string, options: { scope: string; env?: string[] }) => {
        // Stub for future implementation
        console.log(`Adding MCP server '${name}' with scope '${options.scope}'`);
        console.log('This feature is coming soon.');
    });

program
    .command('remove <name>')
    .description('Remove an MCP server')
    .action(async (name: string) => {
        // Stub for future implementation
        console.log(`Removing MCP server '${name}'`);
        console.log('This feature is coming soon.');
    });

program
    .command('enable <name>')
    .description('Enable a disabled MCP server')
    .action(async (name: string) => {
        // Stub for future implementation
        console.log(`Enabling MCP server '${name}'`);
        console.log('This feature is coming soon.');
    });

program
    .command('disable <name>')
    .description('Disable an MCP server without removing it')
    .action(async (name: string) => {
        // Stub for future implementation
        console.log(`Disabling MCP server '${name}'`);
        console.log('This feature is coming soon.');
    });

program
    .command('validate [name]')
    .description('Validate MCP server configuration and connectivity')
    .action(async (name?: string) => {
        // Stub for future implementation
        if (name) {
            console.log(`Validating MCP server '${name}'`);
        } else {
            console.log('Validating all MCP servers');
        }
        console.log('This feature is coming soon.');
    });

/**
 * Main entry point for the mcp subcommand
 *
 * Called from the main CLI router when 'happy mcp [...]' is invoked.
 *
 * @param args - Arguments after 'happy mcp' (e.g., ['list'] for 'happy mcp list')
 */
export default async function main(args: string[]): Promise<void> {
    await program.parseAsync(args, { from: 'user' });
}
