import { getRandomBytes } from 'expo-crypto';
import * as Crypto from 'expo-crypto';
import { AppError, ErrorCodes } from '@/utils/errors';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

// OAuth Configuration for Claude.ai
export const CLAUDE_OAUTH_CONFIG = {
    CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
    AUTHORIZE_URL: 'https://claude.ai/oauth/authorize',
    TOKEN_URL: 'https://console.anthropic.com/v1/oauth/token',
    REDIRECT_URI: 'http://localhost:54545/callback',
    SCOPE: 'user:inference',
};

export interface PKCECodes {
    verifier: string;
    challenge: string;
}

/**
 * Raw OAuth token response from Claude's OAuth server.
 * This matches the structure returned by the token endpoint.
 */
export interface ClaudeOAuthTokenResponse {
    /** The access token (sk-ant-oat01-*) */
    access_token: string;
    /** The refresh token (sk-ant-ort01-*), if provided */
    refresh_token?: string;
    /** Seconds until the access token expires */
    expires_in: number;
    /** Token type, always 'Bearer' */
    token_type: 'Bearer';
    /** OAuth scope granted */
    scope: string;
}

/**
 * Structured Claude auth tokens with computed expiration.
 */
export interface ClaudeAuthTokens {
    /** Raw OAuth response data */
    raw: ClaudeOAuthTokenResponse;
    /** Shorthand for access_token */
    token: string;
    /** Expiration timestamp in milliseconds */
    expires: number;
}

/**
 * Convert Uint8Array to base64url string
 */
function base64urlEncode(buffer: Uint8Array): string {
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...buffer));

    // Convert to base64url
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * Generate PKCE codes for OAuth flow
 */
export async function generatePKCE(): Promise<PKCECodes> {
    // Generate code verifier (43-128 characters, base64url)
    const verifierBytes = getRandomBytes(32);
    const verifier = base64urlEncode(verifierBytes);

    // Generate code challenge (SHA256 of verifier, base64url encoded)
    const challengeBytes = await Crypto.digest(
        Crypto.CryptoDigestAlgorithm.SHA256,
        new TextEncoder().encode(verifier)
    );
    const challenge = base64urlEncode(new Uint8Array(challengeBytes));

    return { verifier, challenge };
}

/**
 * Generate random state for OAuth security
 */
export function generateState(): string {
    const stateBytes = getRandomBytes(32);
    return base64urlEncode(stateBytes);
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(challenge: string, state: string): string {
    const params = new URLSearchParams({
        code: 'true',  // This tells Claude.ai to show the code AND redirect
        client_id: CLAUDE_OAUTH_CONFIG.CLIENT_ID,
        response_type: 'code',
        redirect_uri: CLAUDE_OAUTH_CONFIG.REDIRECT_URI,
        scope: CLAUDE_OAUTH_CONFIG.SCOPE,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: state,
    });

    return `${CLAUDE_OAUTH_CONFIG.AUTHORIZE_URL}?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
    code: string,
    verifier: string,
    state: string
): Promise<ClaudeAuthTokens> {
    const tokenResponse = await fetchWithTimeout(CLAUDE_OAUTH_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: CLAUDE_OAUTH_CONFIG.REDIRECT_URI,
            client_id: CLAUDE_OAUTH_CONFIG.CLIENT_ID,
            code_verifier: verifier,
            state: state,
        }),
        timeoutMs: 30000, // 30s - OAuth servers can be slow
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new AppError(ErrorCodes.AUTH_FAILED, `Token exchange failed: ${tokenResponse.statusText} - ${errorText}`, { canTryAgain: true });
    }

    const tokenData = await tokenResponse.json() as any;

    return {
        raw: tokenData,
        token: tokenData.access_token,
        expires: Date.now() + tokenData.expires_in * 1000,
    };
}

/**
 * Parse authorization code from callback URL
 */
export function parseCallbackUrl(url: string): { code?: string; state?: string; error?: string } {
    try {
        const urlObj = new URL(url);

        // Check if this is our callback URL
        if (!url.includes('localhost') || !urlObj.pathname.includes('/callback')) {
            return {};
        }

        const code = urlObj.searchParams.get('code');
        const state = urlObj.searchParams.get('state');
        const error = urlObj.searchParams.get('error');

        return {
            code: code || undefined,
            state: state || undefined,
            error: error || undefined,
        };
    } catch {
        return {};
    }
}

/**
 * Refresh an expired Claude OAuth access token using the refresh token.
 *
 * Claude OAuth tokens have the following format:
 * - Access tokens: `sk-ant-oat01-*` (short-lived, ~1 hour - 1 day)
 * - Refresh tokens: `sk-ant-ort01-*` (long-lived)
 *
 * @param refreshToken - The refresh token (sk-ant-ort01-*)
 * @returns Fresh access token and new expiration
 * @throws AppError with TOKEN_EXPIRED if refresh fails
 *
 * @example
 * ```typescript
 * const newTokens = await refreshClaudeToken(tokens.raw.refresh_token);
 * // newTokens.token contains the fresh access token
 * ```
 */
export async function refreshClaudeToken(refreshToken: string): Promise<ClaudeAuthTokens> {
    const response = await fetchWithTimeout(CLAUDE_OAUTH_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: CLAUDE_OAUTH_CONFIG.CLIENT_ID,
        }),
        timeoutMs: 30000, // 30s - OAuth servers can be slow
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(
            ErrorCodes.TOKEN_EXPIRED,
            `Token refresh failed: ${response.statusText} - ${errorText}`,
            { canTryAgain: false }
        );
    }

    const tokenData = await response.json() as ClaudeOAuthTokenResponse;

    return {
        raw: tokenData,
        token: tokenData.access_token,
        expires: Date.now() + tokenData.expires_in * 1000,
    };
}