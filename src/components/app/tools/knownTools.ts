import type { ToolCall } from '@/services/messages/types';

type KnownToolConfig = {
  title?: string | ((tool: ToolCall) => string);
  subtitle?: (tool: ToolCall) => string | null;
  minimal?: boolean;
  hideDefaultError?: boolean;
};

function extractPath(input: unknown): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.path === 'string') {
    return record.path;
  }
  if (typeof record.filePath === 'string') {
    return record.filePath;
  }
  return null;
}

function extractCommand(input: unknown): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (typeof record.command === 'string') {
    return record.command;
  }
  if (Array.isArray(record.parsed_cmd) && record.parsed_cmd.length > 0) {
    const parsed = record.parsed_cmd[0] as { cmd?: string };
    if (parsed?.cmd) {
      return parsed.cmd;
    }
  }
  return null;
}

function snakeToPascalWithSpaces(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatMcpTitle(toolName: string): string {
  const withoutPrefix = toolName.replace(/^mcp__/, '');
  const parts = withoutPrefix.split('__');
  if (parts.length >= 2) {
    const serverName = snakeToPascalWithSpaces(parts[0] ?? 'mcp');
    const toolNamePart = snakeToPascalWithSpaces(parts.slice(1).join('_'));
    return `MCP: ${serverName} ${toolNamePart}`;
  }
  return `MCP: ${snakeToPascalWithSpaces(withoutPrefix)}`;
}

export const knownTools: Record<string, KnownToolConfig> = {
  Task: {
    title: (tool) => {
      const input = tool.input as { description?: string } | null;
      return input?.description ?? 'Task';
    },
    minimal: false,
  },
  Bash: {
    title: 'Bash',
    subtitle: (tool) => extractCommand(tool.input),
    minimal: true,
    hideDefaultError: true,
  },
  CodexBash: {
    title: 'Codex Bash',
    subtitle: (tool) => extractCommand(tool.input),
    minimal: true,
    hideDefaultError: true,
  },
  Glob: {
    title: 'Search files',
    subtitle: (tool) => {
      const input = tool.input as { pattern?: string } | null;
      return input?.pattern ?? null;
    },
    minimal: true,
  },
  Grep: {
    title: 'Search content',
    subtitle: (tool) => {
      const input = tool.input as { pattern?: string } | null;
      return input?.pattern ?? null;
    },
    minimal: true,
  },
  LS: {
    title: 'List files',
    subtitle: (tool) => extractPath(tool.input),
    minimal: true,
  },
  Read: {
    title: 'Read',
    subtitle: (tool) => extractPath(tool.input),
    minimal: true,
  },
  Write: {
    title: 'Write',
    subtitle: (tool) => extractPath(tool.input),
  },
  Edit: {
    title: 'Edit',
    subtitle: (tool) => extractPath(tool.input),
  },
  MultiEdit: {
    title: 'Multi Edit',
    subtitle: (tool) => extractPath(tool.input),
  },
  TodoWrite: {
    title: 'Todo',
    minimal: true,
  },
  todo_write: {
    title: 'Todo',
    minimal: true,
  },
  ExitPlanMode: {
    title: 'Plan',
  },
  exit_plan_mode: {
    title: 'Plan',
  },
  CodexDiff: {
    title: 'Diff',
  },
  CodexPatch: {
    title: 'Patch',
  },
};

export function getToolConfig(tool: ToolCall): KnownToolConfig | null {
  if (tool.name.startsWith('mcp__')) {
    return {
      title: formatMcpTitle(tool.name),
      minimal: true,
    };
  }
  return knownTools[tool.name] ?? null;
}
