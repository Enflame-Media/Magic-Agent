/**
 * MCP List Command
 *
 * Lists all configured MCP servers from both user and project configurations,
 * displaying their status (enabled/disabled), tool count, and validation timestamp.
 *
 * @module mcp/commands/list
 */

import chalk from 'chalk';
import { getMergedMcpServers, hasMcpConfig } from '../config.js';
import type { HappyMcpServerConfig } from '../types.js';

/**
 * Options for the list command
 */
export interface ListCommandOptions {
    /** Filter servers by scope (user, project, or all) */
    scope?: 'user' | 'project' | 'all';
    /** Show only enabled or disabled servers */
    filter?: 'enabled' | 'disabled';
    /** Output format (table or json) */
    format?: 'table' | 'json';
}

/**
 * Format a table with automatic column width calculation
 *
 * @param headers - Column headers
 * @param rows - Data rows (each row is an array of cell values)
 * @returns Formatted table string
 */
function formatTable(headers: string[], rows: string[][]): string {
    // Calculate maximum width for each column
    const colWidths = headers.map((header, colIndex) => {
        const cellWidths = rows.map(row => stripAnsi(row[colIndex] || '').length);
        return Math.max(stripAnsi(header).length, ...cellWidths);
    });

    // Build the table
    const lines: string[] = [];

    // Header row
    const headerRow = headers
        .map((header, i) => padRight(header, colWidths[i]))
        .join('  ');
    lines.push(chalk.bold(headerRow));

    // Separator row using box-drawing characters
    const separator = colWidths.map(w => '─'.repeat(w)).join('  ');
    lines.push(chalk.gray(separator));

    // Data rows
    for (const row of rows) {
        const dataRow = row
            .map((cell, i) => padRight(cell, colWidths[i]))
            .join('  ');
        lines.push(dataRow);
    }

    return lines.join('\n');
}

/**
 * Strip ANSI color codes from a string for width calculation
 */
function stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pad a string to a target width, accounting for ANSI codes
 */
function padRight(str: string, targetWidth: number): string {
    const visibleLength = stripAnsi(str).length;
    const padding = Math.max(0, targetWidth - visibleLength);
    return str + ' '.repeat(padding);
}

/**
 * Format a date for display
 *
 * @param isoDate - ISO-8601 date string
 * @returns Human-readable date string
 */
function formatDate(isoDate: string | undefined): string {
    if (!isoDate) {
        return chalk.gray('never');
    }

    try {
        const date = new Date(isoDate);
        // Format as "Dec 27, 2025" style
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return chalk.gray('invalid');
    }
}

/**
 * Format status for display with color coding
 */
function formatStatus(disabled: boolean | undefined): string {
    return disabled ? chalk.red('disabled') : chalk.green('enabled');
}

/**
 * Format tool count for display
 */
function formatToolCount(count: number | undefined): string {
    if (count === undefined || count === null) {
        return chalk.gray('-');
    }
    return count.toString();
}

/**
 * Execute the 'happy mcp list' command
 *
 * Lists all configured MCP servers with their status and metadata.
 * Merges user-level and project-level configurations.
 *
 * @param options - Command options
 *
 * @example
 * ```bash
 * happy mcp list              # List all servers
 * happy mcp list --json       # Output as JSON
 * ```
 */
export async function listCommand(options: ListCommandOptions = {}): Promise<void> {
    const { format = 'table', filter } = options;

    // Check if any config exists
    if (!hasMcpConfig()) {
        console.log(chalk.yellow('No MCP servers configured.'));
        console.log();
        console.log(chalk.gray('Add a server with:'));
        console.log(chalk.gray('  happy mcp add <name> -- <command> [args...]'));
        return;
    }

    // Get merged servers from both user and project configs
    const servers = getMergedMcpServers();
    const serverEntries = Object.entries(servers);

    if (serverEntries.length === 0) {
        console.log(chalk.yellow('No MCP servers configured.'));
        console.log();
        console.log(chalk.gray('Add a server with:'));
        console.log(chalk.gray('  happy mcp add <name> -- <command> [args...]'));
        return;
    }

    // Apply filter if specified
    let filteredEntries = serverEntries;
    if (filter === 'enabled') {
        filteredEntries = serverEntries.filter(([, config]) => !config.disabled);
    } else if (filter === 'disabled') {
        filteredEntries = serverEntries.filter(([, config]) => config.disabled);
    }

    if (filteredEntries.length === 0) {
        console.log(chalk.yellow(`No ${filter} MCP servers found.`));
        return;
    }

    // JSON output format
    if (format === 'json') {
        const jsonOutput = Object.fromEntries(
            filteredEntries.map(([name, config]) => [
                name,
                {
                    command: config.command,
                    args: config.args,
                    disabled: config.disabled ?? false,
                    toolCount: config.metadata?.toolCount ?? null,
                    lastValidated: config.metadata?.lastValidated ?? null,
                    description: config.metadata?.description ?? null,
                },
            ])
        );
        console.log(JSON.stringify(jsonOutput, null, 2));
        return;
    }

    // Table output format
    console.log(chalk.bold('MCP Servers:'));
    console.log();

    const headers = ['Name', 'Status', 'Tools', 'Last Validated'];
    const rows = filteredEntries.map(([name, config]: [string, HappyMcpServerConfig]) => [
        name,
        formatStatus(config.disabled),
        formatToolCount(config.metadata?.toolCount),
        formatDate(config.metadata?.lastValidated),
    ]);

    console.log(formatTable(headers, rows));

    // Summary line
    const enabledCount = filteredEntries.filter(([, c]) => !c.disabled).length;
    const disabledCount = filteredEntries.length - enabledCount;

    console.log();
    console.log(
        chalk.gray(
            `${filteredEntries.length} server${filteredEntries.length !== 1 ? 's' : ''} ` +
                `(${enabledCount} enabled, ${disabledCount} disabled)`
        )
    );
}
