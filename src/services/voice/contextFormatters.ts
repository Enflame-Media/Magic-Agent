/**
 * Context Formatters
 *
 * Formats session data and messages for the voice assistant context.
 * These formatters convert structured data into natural language descriptions
 * that the voice AI can understand and relay to users.
 */

import { VOICE_CONFIG } from './config';

/**
 * Session metadata structure
 */
interface SessionMetadata {
    summary?: { text?: string };
    path?: string;
    machineId?: string;
    homeDir?: string;
    [key: string]: unknown;
}

/**
 * Session structure (simplified for voice context)
 */
interface Session {
    id: string;
    metadata?: SessionMetadata;
}

/**
 * Message structure (simplified for voice context)
 */
interface Message {
    id: string;
    kind: 'agent-text' | 'user-text' | 'tool-call' | 'tool-result' | 'system';
    text?: string;
    createdAt: number;
    tool?: {
        name: string;
        description?: string;
        input?: unknown;
    };
}

/**
 * Trim leading indentation from multi-line strings
 */
function trimIndent(text: string): string {
    const lines = text.split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    if (nonEmptyLines.length === 0) return '';

    const minIndent = Math.min(
        ...nonEmptyLines.map((line) => {
            const match = line.match(/^(\s*)/);
            if (match && match[1]) {
                return match[1].length;
            }
            return 0;
        })
    );

    return lines
        .map((line) => line.slice(minIndent))
        .join('\n')
        .trim();
}

/**
 * Format a permission request for natural language context
 */
export function formatPermissionRequest(
    sessionId: string,
    requestId: string,
    toolName: string,
    toolArgs: unknown
): string {
    return trimIndent(`
        Claude Code is requesting permission to use ${toolName} (session ${sessionId}):
        <request_id>${requestId}</request_id>
        <tool_name>${toolName}</tool_name>
        <tool_args>${JSON.stringify(toolArgs)}</tool_args>
    `);
}

/**
 * Format a single message for voice context
 */
export function formatMessage(message: Message): string | null {
    const lines: string[] = [];

    if (message.kind === 'agent-text' && message.text) {
        lines.push(`Claude Code: \n<text>${message.text}</text>`);
    } else if (message.kind === 'user-text' && message.text) {
        lines.push(`User sent message: \n<text>${message.text}</text>`);
    } else if (message.kind === 'tool-call' && !VOICE_CONFIG.DISABLE_TOOL_CALLS && message.tool) {
        const toolDescription = message.tool.description ? ` - ${message.tool.description}` : '';
        if (VOICE_CONFIG.LIMITED_TOOL_CALLS) {
            if (message.tool.description) {
                lines.push(`Claude Code is using ${message.tool.name}${toolDescription}`);
            }
        } else {
            lines.push(
                `Claude Code is using ${message.tool.name}${toolDescription} (tool_use_id: ${message.id}) with arguments: <arguments>${JSON.stringify(message.tool.input)}</arguments>`
            );
        }
    }

    if (lines.length === 0) {
        return null;
    }

    return lines.join('\n\n');
}

/**
 * Format a single new message with session context
 */
export function formatNewSingleMessage(sessionId: string, message: Message): string | null {
    const formatted = formatMessage(message);
    if (!formatted) {
        return null;
    }
    return `New message in session: ${sessionId}\n\n${formatted}`;
}

/**
 * Format multiple new messages with session context
 */
export function formatNewMessages(sessionId: string, messages: Message[]): string | null {
    const formatted = [...messages]
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(formatMessage)
        .filter(Boolean);

    if (formatted.length === 0) {
        return null;
    }

    return `New messages in session: ${sessionId}\n\n${formatted.join('\n\n')}`;
}

/**
 * Format message history for initial context
 */
export function formatHistory(sessionId: string, messages: Message[]): string {
    const messagesToFormat =
        VOICE_CONFIG.MAX_HISTORY_MESSAGES > 0
            ? messages.slice(0, VOICE_CONFIG.MAX_HISTORY_MESSAGES)
            : messages;

    const formatted = messagesToFormat.map(formatMessage).filter(Boolean);

    return `History of messages in session: ${sessionId}\n\n${formatted.join('\n\n')}`;
}

/**
 * Format full session context for voice initialization
 */
export function formatSessionFull(session: Session, messages: Message[]): string {
    const sessionName = session.metadata?.summary?.text;
    const sessionPath = session.metadata?.path;
    const lines: string[] = [];

    // Add session context
    lines.push(`# Session ID: ${session.id}`);
    lines.push(`# Project path: ${sessionPath ?? 'Unknown'}`);
    lines.push(`# Session summary:\n${sessionName ?? 'No summary available'}`);

    // Add session metadata if available
    if (session.metadata?.summary?.text) {
        lines.push('## Session Summary');
        lines.push(session.metadata.summary.text);
        lines.push('');
    }

    // Add history
    lines.push('## Our interaction history so far');
    lines.push('');
    lines.push(formatHistory(session.id, messages));

    return lines.join('\n\n');
}

/**
 * Format session offline notification
 */
export function formatSessionOffline(sessionId: string, _metadata?: SessionMetadata): string {
    return `Session went offline: ${sessionId}`;
}

/**
 * Format session online notification
 */
export function formatSessionOnline(sessionId: string, _metadata?: SessionMetadata): string {
    return `Session came online: ${sessionId}`;
}

/**
 * Format session focus notification
 */
export function formatSessionFocus(sessionId: string, _metadata?: SessionMetadata): string {
    return `Session became focused: ${sessionId}`;
}

/**
 * Format ready event notification
 */
export function formatReadyEvent(sessionId: string): string {
    return `Claude Code done working in session: ${sessionId}. The previous message(s) are the summary of the work done. Report this to the human immediately.`;
}
