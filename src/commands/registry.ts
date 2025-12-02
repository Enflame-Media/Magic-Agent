/**
 * Command Registry - Centralized command definitions for auto-generated help
 *
 * This module provides typed command definitions that are used to:
 * 1. Generate consistent help text automatically
 * 2. Document all available commands, options, and examples
 * 3. Ensure help text stays in sync with actual functionality
 */

import chalk from 'chalk'

/**
 * Padding widths for consistent help text formatting
 */
const PADDING = {
  COMMAND_NAME: 18,
  OPTION_FLAGS: 22,
  SUBCOMMAND_USAGE: 40,
  SUBCOMMAND_OPTION_FLAGS: 20
} as const

/**
 * Represents a command-line option with its description
 */
export interface CommandOption {
  /** The option flag(s), e.g., "--force" or "-p <message>" */
  flags: string
  /** Description of what the option does */
  description: string
}

/**
 * Represents a subcommand within a parent command
 */
export interface SubCommand {
  /** Subcommand name */
  name: string
  /** Brief description */
  description: string
  /** Options specific to this subcommand */
  options?: CommandOption[]
}

/**
 * Represents a CLI command with all its metadata
 */
export interface CommandDefinition {
  /** Command name (e.g., "auth", "daemon") */
  name: string
  /** Brief description shown in main help */
  description: string
  /** Detailed description for command-specific help */
  detailedDescription?: string
  /** Available subcommands */
  subcommands?: SubCommand[]
  /** Command-level options */
  options?: CommandOption[]
  /** Usage examples */
  examples?: string[]
  /** Additional notes shown at the end of help */
  notes?: string[]
  /** Whether this command is deprecated */
  deprecated?: boolean
  /** Deprecation message if deprecated */
  deprecationMessage?: string
}

/**
 * All CLI commands with their complete definitions
 */
export const commands: Record<string, CommandDefinition> = {
  auth: {
    name: 'auth',
    description: 'Manage authentication',
    detailedDescription: 'Authentication management for Happy services',
    subcommands: [
      { name: 'login', description: 'Authenticate with Happy', options: [{ flags: '--force', description: 'Clear credentials, machine ID, and stop daemon before re-auth' }] },
      { name: 'logout', description: 'Remove authentication and machine data' },
      { name: 'status', description: 'Show authentication status', options: [{ flags: '--show-token', description: 'Display the full auth token (use with caution)' }] },
      { name: 'help', description: 'Show help message' },
    ],
    examples: [
      'happy auth login',
      'happy auth login --force',
      'happy auth status',
      'happy auth logout',
    ],
  },

  codex: {
    name: 'codex',
    description: 'Start Codex mode',
    detailedDescription: 'Start an interactive Codex session with mobile control',
    options: [
      { flags: '--started-by <mode>', description: 'Specify how session was started (daemon|terminal)' },
    ],
    examples: [
      'happy codex',
    ],
  },

  connect: {
    name: 'connect',
    description: 'Connect AI vendor API keys',
    detailedDescription: 'Store your AI vendor API keys securely in Happy cloud',
    subcommands: [
      { name: 'codex', description: 'Store your OpenAI API key in Happy cloud' },
      { name: 'claude', description: 'Store your Anthropic API key in Happy cloud' },
      { name: 'gemini', description: 'Store your Gemini API key in Happy cloud' },
      { name: 'help', description: 'Show help message' },
    ],
    examples: [
      'happy connect codex',
      'happy connect claude',
      'happy connect gemini',
    ],
    notes: [
      'You must be authenticated first (run \'happy auth login\')',
      'API keys are encrypted and stored securely in Happy cloud',
      'Manage your stored keys at app.happy.engineering',
    ],
  },

  notify: {
    name: 'notify',
    description: 'Send push notification',
    detailedDescription: 'Send a push notification to your connected mobile devices',
    options: [
      { flags: '-p <message>', description: 'Notification message (required)' },
      { flags: '-t <title>', description: 'Notification title (optional, defaults to "Happy")' },
      { flags: '-h, --help', description: 'Show help message' },
    ],
    examples: [
      'happy notify -p "Deployment complete!"',
      'happy notify -p "System update complete" -t "Server Status"',
      'happy notify -t "Alert" -p "Database connection restored"',
    ],
  },

  daemon: {
    name: 'daemon',
    description: 'Manage background service',
    detailedDescription: 'Manage the Happy background service that enables spawning new sessions remotely',
    subcommands: [
      { name: 'start', description: 'Start the daemon (detached)' },
      { name: 'stop', description: 'Stop the daemon (sessions stay alive)' },
      { name: 'status', description: 'Show daemon status', options: [{ flags: '--json', description: 'Output in JSON format for scripting' }] },
      { name: 'health', description: 'Show daemon health metrics', options: [{ flags: '--json', description: 'Output in JSON format for scripting' }] },
      { name: 'list', description: 'List active sessions' },
      { name: 'stop-session <session-id>', description: 'Stop a specific session by UUID' },
      { name: 'logs', description: 'Show path to latest daemon log file' },
      { name: 'install', description: 'Install daemon as system service' },
      { name: 'uninstall', description: 'Uninstall daemon system service' },
    ],
    examples: [
      'happy daemon start',
      'happy daemon status',
      'happy daemon status --json',
      'happy daemon health',
      'happy daemon list',
      'happy daemon stop-session <session-id>',
      'happy daemon logs',
    ],
    notes: [
      'Exit codes for "daemon status --json": 0=running, 1=not running, 2=stale state',
      'Exit codes for "daemon health": 0=healthy, 1=degraded, 2=unhealthy',
      'To clean up runaway processes: happy doctor clean',
    ],
  },

  doctor: {
    name: 'doctor',
    description: 'System diagnostics & troubleshooting',
    detailedDescription: 'Run system diagnostics and troubleshoot Happy installation',
    subcommands: [
      { name: '(no subcommand)', description: 'Run full system diagnostics' },
      { name: 'clean', description: 'Kill runaway Happy processes and orphaned caffeinate' },
    ],
    examples: [
      'happy doctor',
      'happy doctor clean',
    ],
  },

  logout: {
    name: 'logout',
    description: 'Remove authentication (deprecated)',
    deprecated: true,
    deprecationMessage: 'Use "happy auth logout" instead',
    examples: [
      'happy auth logout',
    ],
  },
}

/**
 * Default command (when no subcommand is specified)
 */
export const defaultCommand: CommandDefinition = {
  name: '',
  description: 'Start Claude with mobile control',
  detailedDescription: 'Start an interactive Claude session with Happy mobile control enabled',
  options: [
    { flags: '--yolo', description: 'Bypass permissions (sugar for --dangerously-skip-permissions)' },
    { flags: '--resume [session]', description: 'Resume a previous session' },
    { flags: '--verbose', description: 'Enable verbose output (equivalent to DEBUG=1)' },
    { flags: '--version', description: 'Show version information' },
    { flags: '--help, -h', description: 'Show help message' },
  ],
  examples: [
    'happy',
    'happy --yolo',
    'happy --resume',
  ],
  notes: [
    'Happy supports ALL Claude Code options!',
    'Use any claude flag with happy as you would with claude.',
  ],
}

/**
 * Generate the main help text from command definitions
 *
 * Creates formatted help output showing all available commands, options, and examples.
 * The help text is divided into sections:
 * - Usage: Basic command syntax
 * - Commands: All available subcommands (excluding deprecated ones)
 * - Options: Flags available for the default command
 * - Examples: Common usage patterns from the registry
 * - Notes: Special compatibility information about Claude options
 *
 * @returns Formatted help text ready for console output
 */
export function generateMainHelp(): string {
  const lines: string[] = []

  // Header
  lines.push('')
  lines.push(`${chalk.bold('happy')} - Claude Code On the Go`)
  lines.push('')

  // Usage section
  lines.push(`${chalk.bold('Usage:')}`)
  lines.push('  happy [options]         Start Claude with mobile control')

  // Commands section - only non-deprecated commands
  const visibleCommands = Object.values(commands).filter(cmd => !cmd.deprecated)
  for (const cmd of visibleCommands) {
    const paddedName = cmd.name.padEnd(PADDING.COMMAND_NAME)
    lines.push(`  happy ${paddedName}${cmd.description}`)
  }
  lines.push('')

  // Default options
  lines.push(`${chalk.bold('Options:')}`)
  for (const opt of defaultCommand.options ?? []) {
    const paddedFlags = opt.flags.padEnd(PADDING.OPTION_FLAGS)
    lines.push(`  ${paddedFlags}${opt.description}`)
  }
  lines.push('')

  // Examples - use examples from registry
  lines.push(`${chalk.bold('Examples:')}`)
  for (const example of defaultCommand.examples ?? []) {
    lines.push(`  ${example}`)
  }
  // Add a few popular command examples
  lines.push('  happy auth login --force Authenticate')
  lines.push('  happy doctor             Run diagnostics')
  lines.push('')

  // Notes
  if (defaultCommand.notes && defaultCommand.notes.length > 0) {
    for (const note of defaultCommand.notes) {
      lines.push(`${chalk.bold(note)}`)
    }
    lines.push('  Use any claude flag with happy as you would with claude. Our favorite:')
    lines.push('')
    lines.push('  happy --resume')
    lines.push('')
  }

  // Separator for Claude help
  lines.push(chalk.gray('─'.repeat(60)))
  lines.push(`${chalk.bold.cyan('Claude Code Options (from `claude --help`):')}`)

  return lines.join('\n')
}

/**
 * Generate help text for a specific command
 *
 * Creates formatted help output for a single command including:
 * - Header with command name and description
 * - Usage patterns for all subcommands
 * - Available options with descriptions
 * - Examples of common usage
 * - Important notes and caveats
 * - Deprecation warnings if applicable
 *
 * The function handles different command structures:
 * - Commands with subcommands (e.g., auth, daemon)
 * - Commands with options only (e.g., notify)
 * - Simple commands with no options
 *
 * @param commandName - The name of the command to generate help for
 * @returns Formatted help text, or null if command not found
 */
export function generateCommandHelp(commandName: string): string | null {
  const cmd = commands[commandName]
  if (!cmd) return null

  const lines: string[] = []

  // Header
  lines.push('')
  lines.push(`${chalk.bold(`happy ${cmd.name}`)} - ${cmd.detailedDescription ?? cmd.description}`)
  lines.push('')

  // Usage section
  lines.push(`${chalk.bold('Usage:')}`)
  if (cmd.subcommands && cmd.subcommands.length > 0) {
    for (const sub of cmd.subcommands) {
      const subOptions = sub.options?.map(o => ` [${o.flags}]`).join('') ?? ''
      const paddedUsage = `happy ${cmd.name} ${sub.name}${subOptions}`.padEnd(PADDING.SUBCOMMAND_USAGE)
      lines.push(`  ${paddedUsage}${sub.description}`)
    }
  } else if (cmd.options && cmd.options.length > 0) {
    lines.push(`  happy ${cmd.name} [options]`)
  } else {
    lines.push(`  happy ${cmd.name}`)
  }
  lines.push('')

  // Options section (command-level options)
  if (cmd.options && cmd.options.length > 0) {
    lines.push(`${chalk.bold('Options:')}`)
    for (const opt of cmd.options) {
      const paddedFlags = opt.flags.padEnd(PADDING.SUBCOMMAND_OPTION_FLAGS)
      lines.push(`  ${paddedFlags}${opt.description}`)
    }
    lines.push('')
  }

  // Examples section
  if (cmd.examples && cmd.examples.length > 0) {
    lines.push(`${chalk.bold('Examples:')}`)
    for (const example of cmd.examples) {
      lines.push(`  ${example}`)
    }
    lines.push('')
  }

  // Notes section
  if (cmd.notes && cmd.notes.length > 0) {
    lines.push(`${chalk.bold('Notes:')}`)
    for (const note of cmd.notes) {
      lines.push(`  • ${note}`)
    }
    lines.push('')
  }

  // Deprecation warning
  if (cmd.deprecated && cmd.deprecationMessage) {
    lines.push(chalk.yellow(`Note: "${cmd.name}" is deprecated. ${cmd.deprecationMessage}`))
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Get all command names for validation
 */
export function getCommandNames(): string[] {
  return Object.keys(commands)
}

/**
 * Check if a command exists
 */
export function isValidCommand(name: string): boolean {
  return name in commands
}
