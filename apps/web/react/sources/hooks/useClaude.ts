/**
 * High-level hook for Claude API integration.
 *
 * This hook wraps useClaudeAuth and the Claude API client to provide
 * a simple interface for making Claude API calls with automatic
 * token management and error handling.
 *
 * @module hooks/useClaude
 *
 * @example Basic usage
 * ```typescript
 * function MyComponent() {
 *   const { isConnected, isLoading, sendMessage } = useClaude();
 *
 *   const handleAnalyze = async () => {
 *     const response = await sendMessage([
 *       { role: 'user', content: 'Analyze this code...' }
 *     ], { system: 'You are a code review expert.' });
 *
 *     console.log(response.content[0].text);
 *   };
 * }
 * ```
 */

import * as React from 'react';
import { useClaudeAuth } from './useClaudeAuth';
import {
    sendClaudeMessage,
    ClaudeMessage,
    ClaudeMessageOptions,
    ClaudeResponse,
    extractTextContent,
} from '@/utils/claudeApi';
import { AppError, ErrorCodes } from '@/utils/errors';

// Re-export types for convenience
export type { ClaudeMessage, ClaudeResponse, ClaudeMessageOptions };
export { extractTextContent };

/**
 * Return type for the useClaude hook.
 */
export interface UseClaudeReturn {
    /** Whether user has connected Claude account */
    isConnected: boolean;
    /** Whether a request is in progress (includes token refresh) */
    isLoading: boolean;
    /** Send a message to Claude. Throws if not connected or token unavailable. */
    sendMessage: (
        messages: ClaudeMessage[],
        options?: ClaudeMessageOptions
    ) => Promise<ClaudeResponse>;
}

/**
 * High-level hook for Claude API integration.
 *
 * Provides a simple interface for sending messages to Claude with:
 * - Automatic token retrieval and refresh
 * - Loading state management
 * - Typed error handling
 *
 * @returns Hook return object with connection status, loading state, and sendMessage function
 *
 * @example Session analysis
 * ```typescript
 * const { isConnected, sendMessage } = useClaude();
 *
 * if (isConnected) {
 *   const summary = await sendMessage([
 *     { role: 'user', content: `Summarize this session:\n${sessionTranscript}` }
 *   ], {
 *     system: 'Create a concise summary of the coding session.',
 *     maxTokens: 500
 *   });
 * }
 * ```
 */
export function useClaude(): UseClaudeReturn {
    const { isConnected, getAccessToken, isRefreshing } = useClaudeAuth();
    const [isLoading, setIsLoading] = React.useState(false);

    /**
     * Send a message to Claude API.
     *
     * @param messages - Conversation messages
     * @param options - Optional configuration (model, maxTokens, system, timeoutMs)
     * @returns Claude response
     * @throws AppError if not connected or unable to get access token
     */
    const sendMessage = React.useCallback(
        async (
            messages: ClaudeMessage[],
            options?: ClaudeMessageOptions
        ): Promise<ClaudeResponse> => {
            if (!isConnected) {
                throw new AppError(
                    ErrorCodes.SERVICE_NOT_CONNECTED,
                    'Claude account not connected. Go to Settings to connect your Claude account.',
                    { canTryAgain: false }
                );
            }

            setIsLoading(true);
            try {
                const token = await getAccessToken();
                if (!token) {
                    throw new AppError(
                        ErrorCodes.TOKEN_EXPIRED,
                        'Unable to get Claude access token. Please reconnect your Claude account.',
                        { canTryAgain: false }
                    );
                }

                return await sendClaudeMessage(token, messages, options);
            } finally {
                setIsLoading(false);
            }
        },
        [isConnected, getAccessToken]
    );

    return {
        isConnected,
        isLoading: isLoading || isRefreshing,
        sendMessage,
    };
}
