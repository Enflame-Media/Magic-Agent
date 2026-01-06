/**
 * Voice API Client
 *
 * Handles server communication for voice assistant functionality:
 * - Token fetching for ElevenLabs authentication
 * - Subscription/entitlement verification
 *
 * The server endpoint validates subscriptions via RevenueCat before
 * issuing ElevenLabs conversation tokens.
 *
 * @example
 * ```typescript
 * import { fetchVoiceToken } from '@/services/apiVoice';
 *
 * // Get a voice token for starting a conversation
 * const result = await fetchVoiceToken({
 *   sessionId: 'session-123',
 *   agentId: 'agent_xxx'
 * });
 *
 * if (result.allowed && result.token) {
 *   // Start voice session with token
 * } else {
 *   // Show paywall or error
 * }
 * ```
 */

import { useAuthStore } from '@/stores/auth';
import { ELEVENLABS_CONFIG } from '@/services/voice/config';

/**
 * Voice token response from server
 */
export interface VoiceTokenResponse {
  /** Whether voice access is allowed */
  allowed: boolean;
  /** ElevenLabs conversation token (if allowed) */
  token?: string;
  /** Agent ID used for the conversation */
  agentId?: string;
  /** Error message (if not allowed) */
  error?: string;
}

/**
 * Options for fetching a voice token
 */
export interface FetchVoiceTokenOptions {
  /** Session ID for context */
  sessionId: string;
  /** Optional agent ID override */
  agentId?: string;
  /** RevenueCat public key for subscription verification */
  revenueCatPublicKey?: string;
}

/**
 * Get the server URL from environment
 */
function getServerUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'https://api.happy.engineering';
}

/**
 * Fetch a voice conversation token from the server
 *
 * The server validates subscriptions and returns an ElevenLabs token
 * that can be used to start a voice conversation.
 *
 * @param options - Token fetch options
 * @returns Voice token response
 */
export async function fetchVoiceToken(
  options: FetchVoiceTokenOptions
): Promise<VoiceTokenResponse> {
  const authStore = useAuthStore();

  if (!authStore.isAuthenticated || !authStore.token) {
    return {
      allowed: false,
      error: 'Not authenticated',
    };
  }

  const serverUrl = getServerUrl();
  const agentId = options.agentId ?? ELEVENLABS_CONFIG.agentId;

  try {
    const response = await fetch(`${serverUrl}/v1/voice/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        revenueCatPublicKey: options.revenueCatPublicKey,
      }),
    });

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 400) {
        const errorData = (await response.json()) as VoiceTokenResponse;
        return {
          allowed: false,
          error: errorData.error ?? 'Voice token request failed',
        };
      }

      if (response.status === 401) {
        return {
          allowed: false,
          error: 'Authentication expired',
        };
      }

      return {
        allowed: false,
        error: `Voice token request failed: ${response.status}`,
      };
    }

    const data = (await response.json()) as VoiceTokenResponse;
    return data;
  } catch (error) {
    console.error('[apiVoice] Failed to fetch voice token:', error);
    return {
      allowed: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check if the user has voice access (without getting a token)
 *
 * This is a lightweight check that doesn't consume an ElevenLabs token.
 * Useful for showing/hiding voice UI elements.
 *
 * @returns Whether voice access is allowed
 */
export async function checkVoiceAccess(): Promise<boolean> {
  // In development, always allow
  if (import.meta.env.DEV) {
    return true;
  }

  // TODO: Implement lightweight subscription check
  // For now, attempt token fetch (will be rate limited)
  const result = await fetchVoiceToken({ sessionId: 'check' });
  return result.allowed;
}
