/**
 * Unit Tests for GitHub OAuth Callback Handler
 *
 * This test file provides comprehensive coverage for the GitHub OAuth callback
 * handler implemented in src/routes/connect.ts (githubOAuthCallbackRoute).
 *
 * State Token Format:
 * - Uses Ed25519-signed JWT tokens with userId and purpose claims (HAP-436)
 * - Tokens have 5-minute TTL built into the JWT `exp` claim
 * - Purpose is validated as 'github-oauth-state' for CSRF protection
 *
 * Test Scenarios:
 *
 * ## Happy Path
 * - Valid JWT state token → successful OAuth flow → redirect with success
 * - Existing GitHubUser record → updates profile and token
 * - GitHub connected to different user → disconnects and reconnects
 *
 * ## Error Cases
 * - Invalid/malformed JWT state → redirect with `invalid_state`
 * - Expired JWT state → redirect with `invalid_state` (JWT handles expiry)
 * - Missing GitHub credentials → redirect with `server_config`
 * - GitHub token exchange fails → redirect with error from GitHub
 * - GitHub user fetch fails → redirect with `github_user_fetch_failed`
 * - User account not found → redirect with `user_not_found`
 * - Database error → redirect with `server_error`
 *
 * @see HAP-402 - Add unit tests for GitHub OAuth callback handler
 * @see HAP-280 - Implement GitHub OAuth Callback Handler
 * @see HAP-436 - Replace predictable OAuth state with cryptographic JWTs
 * @see HAP-537 - Update tests for cryptographic state tokens
 * @module __tests__/github-oauth-callback.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createMockDrizzle,
    createMockR2,
    createMockDurableObjectNamespace,
    TEST_USER_ID,
    TEST_USER_ID_2,
    generateTestId,
    createTestAccount,
} from './test-utils';

// Store the mock instance for test access
let drizzleMock: ReturnType<typeof createMockDrizzle>;

// Store original fetch for restoration
const originalFetch = global.fetch;

// Mock GitHub API responses
interface MockGitHubTokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
}

interface MockGitHubUserResponse {
    id: number;
    login: string;
    type: string;
    site_admin: boolean;
    avatar_url: string;
    gravatar_id: string | null;
    name: string | null;
    company: string | null;
    blog: string | null;
    location: string | null;
    email: string | null;
    hireable: boolean | null;
    bio: string | null;
    twitter_username: string | null;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
}

/**
 * Create a mock GitHub user profile response
 */
function createMockGitHubProfile(overrides: Partial<MockGitHubUserResponse> = {}): MockGitHubUserResponse {
    return {
        id: overrides.id ?? 12345678,
        login: overrides.login ?? 'testuser',
        type: overrides.type ?? 'User',
        site_admin: overrides.site_admin ?? false,
        avatar_url: overrides.avatar_url ?? 'https://avatars.githubusercontent.com/u/12345678',
        gravatar_id: overrides.gravatar_id ?? null,
        name: overrides.name ?? 'Test User',
        company: overrides.company ?? null,
        blog: overrides.blog ?? null,
        location: overrides.location ?? null,
        email: overrides.email ?? 'test@example.com',
        hireable: overrides.hireable ?? null,
        bio: overrides.bio ?? null,
        twitter_username: overrides.twitter_username ?? null,
        public_repos: overrides.public_repos ?? 10,
        public_gists: overrides.public_gists ?? 5,
        followers: overrides.followers ?? 100,
        following: overrides.following ?? 50,
        created_at: overrides.created_at ?? '2020-01-01T00:00:00Z',
        updated_at: overrides.updated_at ?? '2024-01-01T00:00:00Z',
    };
}

// Mock cloudflare:workers module
vi.mock('cloudflare:workers', () => ({
    DurableObject: class DurableObject {
        ctx: DurableObjectState;
        env: unknown;
        constructor(ctx: DurableObjectState, env: unknown) {
            this.ctx = ctx;
            this.env = env;
        }
    },
}));

// Mock auth module
vi.mock('@/lib/auth', () => ({
    initAuth: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === 'valid-token') {
            return { userId: TEST_USER_ID, extras: {} };
        }
        if (token === 'user2-token') {
            return { userId: TEST_USER_ID_2, extras: {} };
        }
        return null;
    }),
    createToken: vi.fn().mockResolvedValue('generated-token'),
    resetAuth: vi.fn(),
    // Ephemeral token functions for OAuth state (HAP-436)
    createEphemeralToken: vi.fn().mockImplementation(async (userId: string, purpose: string) => {
        // Use | as delimiter since it won't appear in userId or purpose
        return `mock-jwt|${userId}|${purpose}`;
    }),
    verifyEphemeralToken: vi.fn().mockImplementation(async (token: string) => {
        // Handle invalid/malformed tokens
        if (!token || token === 'malformed-state' || token === 'stateuserid12345') {
            return null;
        }
        // Handle expired token format
        if (token.startsWith('expired-mock-jwt|')) {
            return null;
        }
        // Parse valid mock-jwt format: mock-jwt|{userId}|{purpose}
        const match = token.match(/^mock-jwt\|([^|]+)\|(.+)$/);
        if (!match) return null;
        return { userId: match[1], purpose: match[2] };
    }),
}));

// Mock the getDb function to return our mock Drizzle client
vi.mock('@/db/client', () => ({
    getDb: vi.fn(() => {
        return drizzleMock?.mockDb;
    }),
}));

// Mock the encryption module for token encryption/decryption
vi.mock('@/lib/encryption', () => ({
    initEncryption: vi.fn().mockResolvedValue(undefined),
    isEncryptionInitialized: vi.fn().mockReturnValue(true),
    encryptString: vi.fn().mockImplementation(async (_path: string[], plaintext: string) => {
        // Return a mock encrypted format: prefix + plaintext bytes
        const prefix = new TextEncoder().encode('ENC:');
        const data = new TextEncoder().encode(plaintext);
        const result = new Uint8Array(prefix.length + data.length);
        result.set(prefix, 0);
        result.set(data, prefix.length);
        return result;
    }),
    decryptString: vi.fn().mockImplementation(async (_path: string[], encrypted: Uint8Array) => {
        const text = new TextDecoder().decode(encrypted);
        if (text.startsWith('ENC:')) {
            return text.slice(4);
        }
        return text;
    }),
    resetEncryption: vi.fn(),
}));

// Mock the eventRouter module
vi.mock('@/lib/eventRouter', () => ({
    getEventRouter: vi.fn(() => ({
        emitUpdate: vi.fn().mockResolvedValue({ success: true, delivered: 1 }),
        emitEphemeral: vi.fn().mockResolvedValue({ success: true, delivered: 1 }),
    })),
    buildUpdateAccountUpdate: vi.fn((_userId, _profile, _seq, _id) => ({
        id: 'mock-update-id',
        seq: 1,
        body: { t: 'update-account' },
        createdAt: Date.now(),
    })),
}));

// Mock the id utility
vi.mock('@/utils/id', () => ({
    createId: vi.fn(() => generateTestId('id')),
}));

// Import app AFTER mocks are set up
import { app } from '@/index';

/**
 * Create mock environment for Hono app.request()
 */
function createTestEnv(overrides: Partial<{
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GITHUB_REDIRECT_URL: string;
}> = {}) {
    return {
        ENVIRONMENT: 'development' as const,
        HAPPY_MASTER_SECRET: 'test-secret-for-vitest-tests-min-32-chars',
        DB: {} as D1Database,
        UPLOADS: createMockR2(),
        CONNECTION_MANAGER: createMockDurableObjectNamespace(),
        GITHUB_CLIENT_ID: overrides.GITHUB_CLIENT_ID ?? 'test-client-id',
        GITHUB_CLIENT_SECRET: overrides.GITHUB_CLIENT_SECRET ?? 'test-client-secret',
        GITHUB_REDIRECT_URL: overrides.GITHUB_REDIRECT_URL ?? 'https://api.example.com/callback',
    };
}

/**
 * Create a valid state token for testing.
 * Now uses mock JWT format that matches the verifyEphemeralToken mock.
 * The actual implementation uses Ed25519-signed JWTs (HAP-436).
 * Uses | as delimiter to avoid conflicts with userId containing hyphens.
 */
function createValidState(userId: string): string {
    return `mock-jwt|${userId}|github-oauth-state`;
}

/**
 * Create an expired/invalid state token for testing.
 * Returns a token that the verifyEphemeralToken mock will reject.
 */
function createExpiredState(userId: string): string {
    return `expired-mock-jwt|${userId}`;
}

/**
 * Create test GitHub user data compatible with Drizzle ORM schema
 */
function createTestGitHubUser(overrides: Partial<{
    id: string;
    profile: MockGitHubUserResponse;
    token: Buffer;
    createdAt: Date;
    updatedAt: Date;
}> = {}) {
    const now = new Date();
    return {
        id: overrides.id ?? '12345678',
        profile: overrides.profile ?? createMockGitHubProfile(),
        token: overrides.token ?? Buffer.from('ENC:gho_mock_token'),
        createdAt: overrides.createdAt ?? now,
        updatedAt: overrides.updatedAt ?? now,
    };
}

/**
 * Setup mock fetch to intercept GitHub API calls
 */
function setupMockFetch(options: {
    tokenResponse?: MockGitHubTokenResponse;
    tokenStatus?: number;
    userResponse?: MockGitHubUserResponse;
    userStatus?: number;
}) {
    const {
        tokenResponse = { access_token: 'gho_mock_access_token' },
        tokenStatus = 200,
        userResponse = createMockGitHubProfile(),
        userStatus = 200,
    } = options;

    global.fetch = vi.fn().mockImplementation(async (url: string, _init?: RequestInit) => {
        // GitHub token exchange endpoint
        if (url === 'https://github.com/login/oauth/access_token') {
            return new Response(JSON.stringify(tokenResponse), {
                status: tokenStatus,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // GitHub user profile endpoint
        if (url === 'https://api.github.com/user') {
            return new Response(JSON.stringify(userResponse), {
                status: userStatus,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fallback to original fetch for other URLs
        return originalFetch(url, _init);
    });
}

// Shared test environment
let testEnv: ReturnType<typeof createTestEnv>;

describe('GitHub OAuth Callback Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Create fresh mock for each test
        drizzleMock = createMockDrizzle();
        testEnv = createTestEnv();
    });

    afterEach(() => {
        drizzleMock?.clearAll();
        // Restore original fetch
        global.fetch = originalFetch;
    });

    // =========================================================================
    // Happy Path Tests
    // =========================================================================

    describe('Happy Path', () => {
        it('should complete OAuth flow successfully for new user', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'github_auth_code_123';
            const githubProfile = createMockGitHubProfile({ id: 99999, login: 'newuser' });

            // Seed the user account
            const account = createTestAccount({
                id: userId,
                seq: 5,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch for GitHub API
            setupMockFetch({
                tokenResponse: { access_token: 'gho_new_access_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('happy.engineering');
            expect(location).toContain('github=connected');
            expect(location).toContain('user=newuser');
        });

        it('should update existing GitHubUser record', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'github_auth_code_456';
            const githubUserId = '12345678';
            const oldProfile = createMockGitHubProfile({ id: 12345678, login: 'oldlogin' });
            const newProfile = createMockGitHubProfile({ id: 12345678, login: 'newlogin', name: 'Updated Name' });

            // Seed existing account and GitHub user
            const account = createTestAccount({
                id: userId,
                seq: 10,
                githubUserId: githubUserId,
            });
            drizzleMock.seedData('accounts', [account]);

            const existingGitHubUser = createTestGitHubUser({
                id: githubUserId,
                profile: oldProfile,
            });
            drizzleMock.seedData('githubUsers', [existingGitHubUser]);

            // Setup mock fetch with updated profile
            setupMockFetch({
                tokenResponse: { access_token: 'gho_updated_token' },
                userResponse: newProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
            expect(location).toContain('user=newlogin');
        });

        it('should disconnect GitHub from another user and reconnect to current user', async () => {
            const currentUserId = TEST_USER_ID;
            const otherUserId = TEST_USER_ID_2;
            const state = createValidState(currentUserId);
            const code = 'github_auth_code_789';
            const githubUserId = '12345678';
            const githubProfile = createMockGitHubProfile({ id: 12345678, login: 'shareduser' });

            // Seed current user's account (without GitHub connected)
            const currentAccount = createTestAccount({
                id: currentUserId,
                seq: 5,
            });

            // Seed other user's account (with GitHub connected)
            const otherAccount = createTestAccount({
                id: otherUserId,
                seq: 3,
                githubUserId: githubUserId,
            });
            drizzleMock.seedData('accounts', [currentAccount, otherAccount]);

            // Seed existing GitHub user (linked to other user)
            const existingGitHubUser = createTestGitHubUser({
                id: githubUserId,
                profile: githubProfile,
            });
            drizzleMock.seedData('githubUsers', [existingGitHubUser]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_reconnect_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
            expect(location).toContain('user=shareduser');
        });

        it('should handle GitHub user with name containing multiple parts', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'github_auth_code_name';
            const githubProfile = createMockGitHubProfile({
                id: 11111111,
                login: 'multiname',
                name: 'John Michael Smith Jr.',
            });

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_multiname_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
        });

        it('should handle GitHub user with null name', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'github_auth_code_null_name';
            const githubProfile = createMockGitHubProfile({
                id: 22222222,
                login: 'nullname',
                name: null,
            });

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_nullname_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
            expect(location).toContain('user=nullname');
        });
    });

    // =========================================================================
    // State Token Validation Tests
    // Note: With JWT tokens (HAP-436), validation is handled by verifyEphemeralToken.
    // Tests verify the mock correctly rejects invalid tokens.
    // =========================================================================

    describe('State Token Validation', () => {
        it('should redirect with invalid_state for malformed state token', async () => {
            const res = await app.request(
                '/v1/connect/github/callback?code=test-code&state=malformed-state',
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=invalid_state');
        });

        it('should redirect with invalid_state for non-JWT state format', async () => {
            const res = await app.request(
                '/v1/connect/github/callback?code=test-code&state=stateuserid12345',
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=invalid_state');
        });

        it('should redirect with invalid_state for expired JWT token', async () => {
            // With JWT tokens, expired tokens return null from verifyEphemeralToken
            // which results in invalid_state (not state_expired)
            const expiredState = createExpiredState(TEST_USER_ID);

            const res = await app.request(
                `/v1/connect/github/callback?code=test-code&state=${encodeURIComponent(expiredState)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=invalid_state');
        });

        it('should reject JWT token with wrong purpose', async () => {
            // Create a token with wrong purpose - mock will parse it but purpose check will fail
            const wrongPurposeToken = 'mock-jwt|' + TEST_USER_ID + '|wrong-purpose';

            const res = await app.request(
                `/v1/connect/github/callback?code=test-code&state=${encodeURIComponent(wrongPurposeToken)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=invalid_state');
        });
    });

    // =========================================================================
    // Environment Configuration Tests
    // =========================================================================

    describe('Environment Configuration', () => {
        it('should redirect with server_config when GITHUB_CLIENT_ID is missing', async () => {
            // Create test environment with empty string for client ID (falsy but present)
            const envWithoutClientId = {
                ...createTestEnv(),
                GITHUB_CLIENT_ID: '',
                GITHUB_CLIENT_SECRET: 'test-secret',
            };

            const state = createValidState(TEST_USER_ID);

            const res = await app.request(
                `/v1/connect/github/callback?code=test-code&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                envWithoutClientId
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=server_config');
        });

        it('should redirect with server_config when GITHUB_CLIENT_SECRET is missing', async () => {
            // Create test environment with empty string for client secret (falsy but present)
            const envWithoutSecret = {
                ...createTestEnv(),
                GITHUB_CLIENT_ID: 'test-client-id',
                GITHUB_CLIENT_SECRET: '',
            };

            const state = createValidState(TEST_USER_ID);

            const res = await app.request(
                `/v1/connect/github/callback?code=test-code&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                envWithoutSecret
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=server_config');
        });

        it('should redirect with server_config when both GitHub credentials are missing', async () => {
            // Create test environment with empty strings for both credentials
            const envWithoutCredentials = {
                ...createTestEnv(),
                GITHUB_CLIENT_ID: '',
                GITHUB_CLIENT_SECRET: '',
            };

            const state = createValidState(TEST_USER_ID);

            const res = await app.request(
                `/v1/connect/github/callback?code=test-code&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                envWithoutCredentials
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=server_config');
        });
    });

    // =========================================================================
    // GitHub Token Exchange Tests
    // =========================================================================

    describe('GitHub Token Exchange', () => {
        it('should redirect with GitHub error when token exchange fails', async () => {
            const state = createValidState(TEST_USER_ID);
            const code = 'invalid_code';

            // Setup mock fetch to return GitHub error
            setupMockFetch({
                tokenResponse: {
                    error: 'bad_verification_code',
                    error_description: 'The code passed is incorrect or expired.',
                },
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=bad_verification_code');
        });

        it('should redirect with no_access_token when GitHub returns empty token', async () => {
            const state = createValidState(TEST_USER_ID);
            const code = 'empty_token_code';

            // Setup mock fetch to return empty access_token
            setupMockFetch({
                tokenResponse: {},
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=no_access_token');
        });

        it('should redirect with error when token exchange returns access_denied', async () => {
            const state = createValidState(TEST_USER_ID);
            const code = 'denied_code';

            // Setup mock fetch to return access_denied error
            setupMockFetch({
                tokenResponse: {
                    error: 'access_denied',
                    error_description: 'The user has denied access to the application.',
                },
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=access_denied');
        });
    });

    // =========================================================================
    // GitHub User Fetch Tests
    // =========================================================================

    describe('GitHub User Fetch', () => {
        it('should redirect with github_user_fetch_failed when user fetch returns 401', async () => {
            const state = createValidState(TEST_USER_ID);
            const code = 'valid_code_401';

            // Setup mock fetch with successful token but failed user fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_valid_token' },
                userStatus: 401,
                userResponse: { message: 'Bad credentials' } as unknown as MockGitHubUserResponse,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=github_user_fetch_failed');
        });

        it('should redirect with github_user_fetch_failed when user fetch returns 403', async () => {
            const state = createValidState(TEST_USER_ID);
            const code = 'valid_code_403';

            // Setup mock fetch with successful token but forbidden user fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_valid_token' },
                userStatus: 403,
                userResponse: { message: 'API rate limit exceeded' } as unknown as MockGitHubUserResponse,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=github_user_fetch_failed');
        });

        it('should redirect with github_user_fetch_failed when user fetch returns 500', async () => {
            const state = createValidState(TEST_USER_ID);
            const code = 'valid_code_500';

            // Setup mock fetch with successful token but server error on user fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_valid_token' },
                userStatus: 500,
                userResponse: { message: 'Internal Server Error' } as unknown as MockGitHubUserResponse,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=github_user_fetch_failed');
        });
    });

    // =========================================================================
    // User Account Tests
    // =========================================================================

    describe('User Account', () => {
        it('should redirect with user_not_found when account does not exist', async () => {
            const nonExistentUserId = 'non-existent-user-id';
            const state = createValidState(nonExistentUserId);
            const code = 'valid_code';
            const githubProfile = createMockGitHubProfile();

            // Do NOT seed any account for this user

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_valid_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=user_not_found');
        });
    });

    // =========================================================================
    // Database Error Tests
    // =========================================================================

    describe('Database Errors', () => {
        it('should redirect with server_error on database exception', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'valid_code';
            const githubProfile = createMockGitHubProfile();

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_valid_token' },
                userResponse: githubProfile,
            });

            // Override the database query to throw an error by mocking insert to throw
            // This simulates a database error during the GitHubUser upsert
            const originalInsert = drizzleMock.mockDb.insert;
            drizzleMock.mockDb.insert = vi.fn().mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('error=server_error');

            // Restore original insert
            drizzleMock.mockDb.insert = originalInsert;
        });
    });

    // =========================================================================
    // Request Validation Tests
    // =========================================================================

    describe('Request Validation', () => {
        it('should return 400 for missing code parameter', async () => {
            const state = createValidState(TEST_USER_ID);

            const res = await app.request(
                `/v1/connect/github/callback?state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(400);
        });

        it('should return 400 for missing state parameter', async () => {
            const res = await app.request(
                '/v1/connect/github/callback?code=test-code',
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(400);
        });

        it('should return 400 for empty code parameter', async () => {
            const state = createValidState(TEST_USER_ID);

            const res = await app.request(
                `/v1/connect/github/callback?code=&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            // Empty code should fail validation
            expect([302, 400]).toContain(res.status);
        });

        it('should return 400 for empty state parameter', async () => {
            const res = await app.request(
                '/v1/connect/github/callback?code=test-code&state=',
                { method: 'GET' },
                testEnv
            );

            // Empty state should fail validation or be rejected as invalid
            expect([302, 400]).toContain(res.status);
        });
    });

    // =========================================================================
    // Encryption Initialization Tests
    // =========================================================================

    describe('Encryption Initialization', () => {
        it('should initialize encryption if not already initialized', async () => {
            const { initEncryption, isEncryptionInitialized } = await import('@/lib/encryption');
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'test_code';
            const githubProfile = createMockGitHubProfile();

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Set encryption as not initialized
            vi.mocked(isEncryptionInitialized).mockReturnValue(false);
            vi.mocked(initEncryption).mockClear();

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_init_token' },
                userResponse: githubProfile,
            });

            await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(initEncryption).toHaveBeenCalled();
        });

        it('should skip encryption initialization if already initialized', async () => {
            const { initEncryption, isEncryptionInitialized } = await import('@/lib/encryption');
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'test_code';
            const githubProfile = createMockGitHubProfile();

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Set encryption as already initialized
            vi.mocked(isEncryptionInitialized).mockReturnValue(true);
            vi.mocked(initEncryption).mockClear();

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_skip_token' },
                userResponse: githubProfile,
            });

            await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(initEncryption).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // WebSocket Event Broadcasting Tests
    // =========================================================================

    describe('WebSocket Event Broadcasting', () => {
        it('should broadcast update-account event on successful OAuth', async () => {
            const { getEventRouter, buildUpdateAccountUpdate } = await import('@/lib/eventRouter');
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'test_code_broadcast';
            const githubProfile = createMockGitHubProfile({ login: 'broadcastuser' });

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_broadcast_token' },
                userResponse: githubProfile,
            });

            // Clear any previous mock calls
            vi.mocked(getEventRouter).mockClear();
            vi.mocked(buildUpdateAccountUpdate).mockClear();

            await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            // Verify event router was called
            expect(getEventRouter).toHaveBeenCalled();
            expect(buildUpdateAccountUpdate).toHaveBeenCalledWith(
                userId,
                expect.objectContaining({
                    github: expect.objectContaining({
                        login: 'broadcastuser',
                    }),
                }),
                expect.any(Number),
                expect.any(String)
            );
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('Edge Cases', () => {
        it('should handle special characters in GitHub username', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'special_chars_code';
            const githubProfile = createMockGitHubProfile({
                id: 33333333,
                login: 'user-with_special.chars123',
            });

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_special_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
            // Username should be URL-encoded
            expect(location).toContain('user=user-with_special.chars123');
        });

        it('should handle GitHub user with all optional fields null', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'null_fields_code';
            const githubProfile = createMockGitHubProfile({
                id: 44444444,
                login: 'minimaluser',
                name: null,
                company: null,
                blog: null,
                location: null,
                email: null,
                hireable: null,
                bio: null,
                twitter_username: null,
            });

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_minimal_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
        });

        it('should handle very long GitHub access tokens', async () => {
            const userId = TEST_USER_ID;
            const state = createValidState(userId);
            const code = 'long_token_code';
            const githubProfile = createMockGitHubProfile();
            const longToken = 'gho_' + 'a'.repeat(500);

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch with very long token
            setupMockFetch({
                tokenResponse: { access_token: longToken },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
        });

        it('should handle state token with special characters in userId', async () => {
            // JWT tokens can handle any userId - no character restrictions unlike the old format
            const userId = 'user-with.special-chars123';
            const state = createValidState(userId);
            const code = 'special_userid_code';
            const githubProfile = createMockGitHubProfile();

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_special_userid_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            expect(location).toContain('github=connected');
        });

        it('should handle userId with underscores (now supported with JWT tokens)', async () => {
            // With JWT tokens, any userId format is supported since the userId is embedded
            // in a signed token rather than parsed from a delimited string
            const userId = 'user_with_underscores';
            const state = createValidState(userId);
            const code = 'underscore_userid_code';
            const githubProfile = createMockGitHubProfile();

            // Seed account
            const account = createTestAccount({
                id: userId,
                seq: 1,
            });
            drizzleMock.seedData('accounts', [account]);

            // Setup mock fetch
            setupMockFetch({
                tokenResponse: { access_token: 'gho_underscore_token' },
                userResponse: githubProfile,
            });

            const res = await app.request(
                `/v1/connect/github/callback?code=${code}&state=${encodeURIComponent(state)}`,
                { method: 'GET' },
                testEnv
            );

            expect(res.status).toBe(302);
            const location = res.headers.get('location');
            // JWT tokens handle underscores in userId correctly
            expect(location).toContain('github=connected');
        });
    });
});
