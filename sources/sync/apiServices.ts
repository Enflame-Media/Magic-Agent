import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';
import { AppError, ErrorCodes } from '@/utils/errors';
import { authenticatedFetch } from './apiHelper';
import { ClaudeAuthTokens, ClaudeOAuthTokenResponse } from '@/utils/oauth';

/**
 * Connect a service to the user's account
 */
export async function connectService(
    credentials: AuthCredentials,
    service: string,
    token: any
): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        // HAP-529: Use authenticatedFetch for automatic 401 retry after token refresh
        const response = await authenticatedFetch(
            `${API_ENDPOINT}/v1/connect/${service}/register`,
            credentials,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: JSON.stringify(token) })
            },
            `connecting ${service}`
        );

        if (!response.ok) {
            throw new AppError(ErrorCodes.SERVICE_ERROR, `Failed to connect ${service}: ${response.status}`);
        }

        const data = await response.json() as { success: true };
        if (!data.success) {
            throw new AppError(ErrorCodes.SERVICE_ERROR, `Failed to connect ${service} account`);
        }
    });
}

/**
 * Disconnect a connected service from the user's account
 */
export async function disconnectService(credentials: AuthCredentials, service: string): Promise<void> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        // HAP-529: Use authenticatedFetch for automatic 401 retry after token refresh
        const response = await authenticatedFetch(
            `${API_ENDPOINT}/v1/connect/${service}`,
            credentials,
            { method: 'DELETE' },
            `disconnecting ${service}`
        );

        if (!response.ok) {
            if (response.status === 404) {
                const error = await response.json();
                throw new AppError(ErrorCodes.SERVICE_NOT_CONNECTED, error.error || `${service} account not connected`);
            }
            throw new AppError(ErrorCodes.SERVICE_ERROR, `Failed to disconnect ${service}: ${response.status}`);
        }

        const data = await response.json() as { success: true };
        if (!data.success) {
            throw new AppError(ErrorCodes.SERVICE_ERROR, `Failed to disconnect ${service} account`);
        }
    });
}

/**
 * Fetch stored Claude OAuth tokens from the server.
 *
 * The server stores encrypted tokens from the OAuth flow. This function
 * retrieves and decrypts them for use in Claude API calls.
 *
 * @param credentials - Auth credentials for the API request
 * @returns ClaudeAuthTokens if found, null if not connected
 * @throws AppError on network or server errors
 *
 * @example
 * ```typescript
 * const tokens = await fetchClaudeToken(auth.credentials);
 * if (tokens) {
 *   // Use tokens.token for API calls
 * }
 * ```
 */
export async function fetchClaudeToken(
    credentials: AuthCredentials
): Promise<ClaudeAuthTokens | null> {
    const API_ENDPOINT = getServerUrl();

    return await backoff(async () => {
        const response = await authenticatedFetch(
            `${API_ENDPOINT}/v1/connect/anthropic/token`,
            credentials,
            { useDedupe: true },
            'fetching Claude token'
        );

        if (!response.ok) {
            throw new AppError(
                ErrorCodes.SERVICE_ERROR,
                `Failed to fetch Claude token: ${response.status}`
            );
        }

        const data = await response.json() as { token: string | null };

        if (!data.token) {
            return null;
        }

        // Parse the stored token JSON
        // The server stores the full token response as a JSON string
        const tokenData = JSON.parse(data.token) as ClaudeOAuthTokenResponse;

        return {
            raw: tokenData,
            token: tokenData.access_token,
            // Use stored expiration or default to 1 hour from now
            expires: tokenData.expires_in
                ? Date.now() + tokenData.expires_in * 1000
                : Date.now() + 3600 * 1000,
        };
    });
}