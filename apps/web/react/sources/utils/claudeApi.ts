/**
 * Claude API client for making authenticated requests to Anthropic's Messages API.
 *
 * This module provides typed functions for interacting with Claude's API
 * using OAuth tokens obtained through the useClaudeAuth hook.
 *
 * @module utils/claudeApi
 *
 * @example Basic usage
 * ```typescript
 * import { sendClaudeMessage } from '@/utils/claudeApi';
 *
 * const response = await sendClaudeMessage(accessToken, [
 *   { role: 'user', content: 'Hello Claude!' }
 * ]);
 * console.log(response.content[0].text);
 * ```
 */

import { AppError, ErrorCodes } from '@/utils/errors';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

/** Claude API base URL */
const CLAUDE_API_URL = 'https://api.anthropic.com/v1';

/** Default model to use for messages */
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

/** Default max tokens for responses */
const DEFAULT_MAX_TOKENS = 1024;

/** API version header value */
const ANTHROPIC_API_VERSION = '2023-06-01';

/**
 * A message in a Claude conversation.
 */
export interface ClaudeMessage {
    /** Message role: 'user' for human messages, 'assistant' for Claude responses */
    role: 'user' | 'assistant';
    /** Message content as text */
    content: string;
}

/**
 * Content block types in Claude responses.
 */
export interface ClaudeTextContent {
    type: 'text';
    text: string;
}

/**
 * Token usage information from Claude API.
 */
export interface ClaudeUsage {
    /** Number of input tokens consumed */
    input_tokens: number;
    /** Number of output tokens generated */
    output_tokens: number;
}

/**
 * Response from Claude Messages API.
 */
export interface ClaudeResponse {
    /** Unique message ID */
    id: string;
    /** Response type, always 'message' */
    type: 'message';
    /** Role, always 'assistant' for responses */
    role: 'assistant';
    /** Content blocks (text, tool_use, etc.) */
    content: ClaudeTextContent[];
    /** Model used for generation */
    model: string;
    /** Reason generation stopped ('end_turn', 'max_tokens', 'stop_sequence') */
    stop_reason: string;
    /** Token usage statistics */
    usage: ClaudeUsage;
}

/**
 * Options for sendClaudeMessage.
 */
export interface ClaudeMessageOptions {
    /** Model to use (default: claude-sonnet-4-5-20250929) */
    model?: string;
    /** Maximum tokens to generate (default: 1024) */
    maxTokens?: number;
    /** System prompt to set context for the conversation */
    system?: string;
    /** Request timeout in milliseconds (default: 60000) */
    timeoutMs?: number;
}

/**
 * Error response from Claude API.
 */
interface ClaudeErrorResponse {
    type: 'error';
    error: {
        type: string;
        message: string;
    };
}

/**
 * Make a request to Claude Messages API.
 *
 * @param accessToken - OAuth access token (sk-ant-oat01-*)
 * @param messages - Array of conversation messages
 * @param options - Optional configuration for the request
 * @returns Claude response with generated content
 * @throws AppError with TOKEN_EXPIRED if authentication fails
 * @throws AppError with SERVICE_ERROR for other API errors
 *
 * @example Simple message
 * ```typescript
 * const response = await sendClaudeMessage(token, [
 *   { role: 'user', content: 'What is 2+2?' }
 * ]);
 * ```
 *
 * @example With system prompt
 * ```typescript
 * const response = await sendClaudeMessage(
 *   token,
 *   [{ role: 'user', content: 'Analyze this code...' }],
 *   { system: 'You are a code review expert.' }
 * );
 * ```
 */
export async function sendClaudeMessage(
    accessToken: string,
    messages: ClaudeMessage[],
    options?: ClaudeMessageOptions
): Promise<ClaudeResponse> {
    const {
        model = DEFAULT_MODEL,
        maxTokens = DEFAULT_MAX_TOKENS,
        system,
        timeoutMs = 60000, // 60 second default for AI responses
    } = options ?? {};

    const response = await fetchWithTimeout(`${CLAUDE_API_URL}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'anthropic-version': ANTHROPIC_API_VERSION,
        },
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            ...(system && { system }),
            messages,
        }),
        timeoutMs,
    });

    if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
            throw new AppError(
                ErrorCodes.TOKEN_EXPIRED,
                'Claude authentication expired. Please reconnect your account.',
                { canTryAgain: false }
            );
        }

        // Parse error response for better error messages
        let errorMessage = `Claude API request failed with status ${response.status}`;
        try {
            const errorData = await response.json() as ClaudeErrorResponse;
            if (errorData.error?.message) {
                errorMessage = errorData.error.message;
            }
        } catch {
            // Use generic error message if parsing fails
        }

        throw new AppError(
            ErrorCodes.SERVICE_ERROR,
            errorMessage,
            { canTryAgain: response.status >= 500 } // Retry on server errors
        );
    }

    return response.json() as Promise<ClaudeResponse>;
}

/**
 * Extract text content from a Claude response.
 *
 * @param response - Claude API response
 * @returns Combined text from all text content blocks
 *
 * @example
 * ```typescript
 * const response = await sendClaudeMessage(token, messages);
 * const text = extractTextContent(response);
 * console.log(text);
 * ```
 */
export function extractTextContent(response: ClaudeResponse): string {
    return response.content
        .filter((block): block is ClaudeTextContent => block.type === 'text')
        .map(block => block.text)
        .join('');
}
