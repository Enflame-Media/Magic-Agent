/**
 * MCP List Command
 *
 * Lists all configured MCP servers from the Happy configuration.
 *
 * @module mcp/commands/list
 */

import chalk from 'chalk';

/**
 * Execute the 'happy mcp list' command
 *
 * Lists all configured MCP servers with their status and metadata.
 * This is a stub implementation that will be completed in a follow-up issue.
 */
export async function listCommand(): Promise<void> {
    console.log(chalk.blue('📦 MCP Servers'));
    console.log(chalk.gray('No MCP servers configured yet.'));
    console.log();
    console.log(chalk.gray('Add a server with:'));
    console.log(chalk.gray('  happy mcp add <name> <command> [args...]'));
}
