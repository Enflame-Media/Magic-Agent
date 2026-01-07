/**
 * Authentication service for Happy web application
 *
 * Handles the challenge-response authentication flow:
 * 1. Generate ephemeral keypair
 * 2. Send public key to server via /v1/auth/account/request
 * 3. Poll for authorization (when mobile app approves)
 * 4. Decrypt response to get shared secret
 * 5. Store credentials for future API calls
 *
 * Also handles CLI connection approval when web is already authenticated.
 */

import { encodeBase64, decodeBase64 } from './base64';
import {
  generateBoxKeyPair,
  decryptBox,
  generateSigningKeyPair,
  signDetached,
  randomBytes,
  type BoxKeyPair,
} from './encryption';
import { secureStorage, type StoredCredentials } from './storage';
import { getApiBaseUrl } from './apiBase';

const SERVER_URL = getApiBaseUrl();

/**
 * Connection info parsed from QR code
 */
export interface ConnectionInfo {
  publicKey: Uint8Array;
  isWebAuth: boolean;
}

/**
 * Auth request state from server
 */
type AuthState = 'pending' | 'authorized' | 'not_found';

interface AuthRequestResponse {
  state: AuthState;
  token?: string;
  response?: string;
}

interface AuthRequestStatus {
  status: AuthState;
  supportsV2: boolean;
}

/**
 * Parse QR code or manual entry data
 *
 * Supports two formats:
 * 1. Mobile QR: happy://terminal?BASE64URL_PUBLIC_KEY
 * 2. Web URL: https://webapp.url/terminal/connect#key=BASE64URL_PUBLIC_KEY
 */
export function parseConnectionCode(data: string): ConnectionInfo {
  // Check for web auth URL format
  const webUrlMatch = data.match(/terminal\/connect#key=([A-Za-z0-9_-]+)/);
  if (webUrlMatch?.[1]) {
    const publicKey = decodeBase64(webUrlMatch[1], 'base64url');
    return { publicKey, isWebAuth: true };
  }

  // Check for mobile QR format: happy://terminal?BASE64URL_PUBLIC_KEY
  const mobileMatch = data.match(/^happy:\/\/terminal\?([A-Za-z0-9_-]+)$/);
  if (mobileMatch?.[1]) {
    const publicKey = decodeBase64(mobileMatch[1], 'base64url');
    return { publicKey, isWebAuth: false };
  }

  // Try parsing as raw base64url public key
  try {
    const publicKey = decodeBase64(data.trim(), 'base64url');
    if (publicKey.length === 32) {
      return { publicKey, isWebAuth: false };
    }
  } catch {
    // Fall through to error
  }

  throw new Error('Invalid connection code format');
}

/**
 * Generate a QR code URL for web authentication
 * Mobile app will scan this to approve the web session
 */
export function generateWebAuthQRData(keypair: BoxKeyPair): string {
  const publicKeyBase64Url = encodeBase64(keypair.publicKey, 'base64url');
  return `happy://terminal?${publicKeyBase64Url}`;
}

/**
 * Start authentication request - sends public key to server
 */
async function startAuthRequest(publicKey: Uint8Array): Promise<void> {
  const response = await fetch(`${SERVER_URL}/v1/auth/account/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: encodeBase64(publicKey),
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth request failed: ${String(response.status)} ${response.statusText}`);
  }
}

/**
 * Check authentication status
 */
async function checkAuthStatus(
  publicKey: Uint8Array
): Promise<AuthRequestResponse> {
  const response = await fetch(`${SERVER_URL}/v1/auth/account/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: encodeBase64(publicKey),
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth status check failed: ${String(response.status)}`);
  }

  return response.json() as Promise<AuthRequestResponse>;
}

/**
 * Wait for authentication to complete
 *
 * @param keypair - The web app's keypair
 * @param onProgress - Progress callback (receives dot count)
 * @param shouldCancel - Function to check if we should cancel
 * @returns Credentials or null if cancelled/failed
 */
export async function waitForAuthentication(
  keypair: BoxKeyPair,
  onProgress?: (dots: number) => void,
  shouldCancel?: () => boolean
): Promise<StoredCredentials | null> {
  let dots = 0;

  // Start the auth request
  await startAuthRequest(keypair.publicKey);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    if (shouldCancel?.()) {
      return null;
    }

    try {
      const response = await checkAuthStatus(keypair.publicKey);

      if (response.state === 'authorized' && response.token && response.response) {
        // Decrypt the response
        const encryptedResponse = decodeBase64(response.response);
        const decrypted = decryptBox(encryptedResponse, keypair.secretKey);

        if (!decrypted) {
          // eslint-disable-next-line no-console
          console.error('[Auth] Failed to decrypt server response');
          return null;
        }

        // Secret is the decrypted bytes
        const secret = encodeBase64(decrypted);

        const credentials: StoredCredentials = {
          token: response.token,
          secret,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        };

        // Store credentials
        await secureStorage.setCredentials(credentials);

        return credentials;
      }
    } catch {
      // eslint-disable-next-line no-console
      console.error('[Auth] Failed to check auth status');
      return null;
    }

    onProgress?.(dots);
    dots++;

    // Wait 1 second before next check
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Get a new token using challenge-response authentication
 *
 * @param secret - The shared secret (base64 encoded)
 */
export async function refreshToken(secret: string): Promise<string | null> {
  try {
    const secretBytes = decodeBase64(secret);
    const signingKeypair = generateSigningKeyPair(secretBytes);

    const challenge = randomBytes(32);
    const signature = signDetached(challenge, signingKeypair.secretKey);

    const response = await fetch(`${SERVER_URL}/v1/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: encodeBase64(challenge),
        signature: encodeBase64(signature),
        publicKey: encodeBase64(signingKeypair.publicKey),
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${String(response.status)}`);
    }

    const data = (await response.json()) as { token: string };
    return data.token;
  } catch {
    // eslint-disable-next-line no-console
    console.error('[Auth] Token refresh failed');
    return null;
  }
}

/**
 * Approve a CLI connection request
 *
 * @param token - Current auth token
 * @param cliPublicKey - The CLI's public key (from QR code)
 * @param secret - The shared secret (base64 encoded)
 */
export async function approveCliConnection(
  token: string,
  cliPublicKey: Uint8Array,
  secret: string
): Promise<void> {
  const secretBytes = decodeBase64(secret);
  const publicKeyBase64 = encodeBase64(cliPublicKey);

  // Check auth request status
  const statusResponse = await fetch(
    `${SERVER_URL}/v1/auth/request/status?publicKey=${encodeURIComponent(publicKeyBase64)}`
  );

  if (!statusResponse.ok) {
    throw new Error(`Status check failed: ${String(statusResponse.status)}`);
  }

  const { status, supportsV2 } = (await statusResponse.json()) as AuthRequestStatus;

  if (status === 'not_found' || status === 'authorized') {
    // Already handled
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (status === 'pending') {
    // Create response using the secret
    // V1: just the secret, V2: version byte (0) + public key
    const answerV1 = secretBytes;
    const answerV2 = new Uint8Array(1 + 32);
    answerV2[0] = 0; // Version byte
    // In v2, we'd include the account's public key, but for simplicity use secret
    answerV2.set(secretBytes.slice(0, 32), 1);

    const answer = supportsV2 ? answerV2 : answerV1;

    const response = await fetch(`${SERVER_URL}/v1/auth/response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        publicKey: publicKeyBase64,
        response: encodeBase64(answer),
      }),
    });

    if (!response.ok) {
      throw new Error(`CLI approval failed: ${String(response.status)}`);
    }
  }
}

/**
 * Full authentication flow for web app
 *
 * 1. Generate keypair
 * 2. Return QR data for mobile to scan
 * 3. Wait for authorization
 */
interface AuthSession {
  keypair: BoxKeyPair;
  qrData: string;
  waitForAuth: (
    onProgress?: (dots: number) => void,
    shouldCancel?: () => boolean
  ) => Promise<StoredCredentials | null>;
}

export function createAuthSession(): AuthSession {
  const keypair = generateBoxKeyPair();
  const qrData = generateWebAuthQRData(keypair);

  return {
    keypair,
    qrData,
    waitForAuth: (
      onProgress?: (dots: number) => void,
      shouldCancel?: () => boolean
    ) => waitForAuthentication(keypair, onProgress, shouldCancel),
  };
}

/**
 * Load existing credentials and validate
 */
export async function loadCredentials(): Promise<StoredCredentials | null> {
  const credentials = await secureStorage.getCredentials();

  if (!credentials) {
    return null;
  }

  // Check if token is expired
  if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
    // Try to refresh
    const newToken = await refreshToken(credentials.secret);
    if (newToken) {
      credentials.token = newToken;
      credentials.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await secureStorage.setCredentials(credentials);
    } else {
      // Token refresh failed, clear credentials
      secureStorage.removeCredentials();
      return null;
    }
  }

  return credentials;
}

/**
 * Clear all authentication state
 */
export function logout(): void {
  secureStorage.removeCredentials();
}
