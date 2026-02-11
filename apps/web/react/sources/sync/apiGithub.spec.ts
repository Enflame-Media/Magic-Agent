import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { disconnectGitHub, getGitHubOAuthParams, getAccountProfile } from './apiGithub';
import type { AuthCredentials } from '@/auth/tokenStorage';

// Mock the serverConfig
vi.mock('./serverConfig', () => ({
    getServerUrl: () => 'https://api.test.com'
}));

// Mock backoff utility to execute immediately
vi.mock('@/utils/time', () => ({
    backoff: vi.fn((fn) => fn())
}));

// Mock authenticatedFetch - this is what apiGithub now uses after HAP-529
const mockAuthenticatedFetch = vi.fn();
vi.mock('./apiHelper', () => ({
    authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}));

describe('apiGithub', () => {
    const mockCredentials: AuthCredentials = {
        token: 'test-token',
        secret: 'test-secret'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('disconnectGitHub', () => {
        it('should successfully disconnect GitHub account', async () => {
            // Mock successful response
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({ success: true })
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            await expect(disconnectGitHub(mockCredentials)).resolves.toBeUndefined();

            // Verify authenticatedFetch was called with correct arguments
            expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(1);
            expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
                'https://api.test.com/v1/connect/github',
                mockCredentials,
                { method: 'DELETE' },
                'disconnecting GitHub'
            );
        });

        it('should throw error when GitHub account is not connected', async () => {
            // Mock 404 response
            const mockResponse = {
                ok: false,
                status: 404,
                json: vi.fn().mockResolvedValue({ error: 'GitHub account not connected' })
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            await expect(disconnectGitHub(mockCredentials))
                .rejects.toThrow('GitHub account not connected');
        });

        it('should throw error when server returns non-success response', async () => {
            // Mock successful HTTP response but unsuccessful operation
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({ success: false })
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            await expect(disconnectGitHub(mockCredentials))
                .rejects.toThrow('Failed to disconnect GitHub account');
        });

        it('should throw generic error for other HTTP errors', async () => {
            // Mock 500 response
            const mockResponse = {
                ok: false,
                status: 500,
                json: vi.fn().mockResolvedValue({ error: 'Internal server error' })
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            await expect(disconnectGitHub(mockCredentials))
                .rejects.toThrow('Failed to disconnect GitHub: 500');
        });
    });

    describe('getGitHubOAuthParams', () => {
        it('should return OAuth URL on success', async () => {
            const mockOAuthParams = { url: 'https://github.com/login/oauth/authorize?client_id=xxx' };
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockOAuthParams)
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            const result = await getGitHubOAuthParams(mockCredentials);

            expect(result).toEqual(mockOAuthParams);
            expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
                'https://api.test.com/v1/connect/github/params',
                mockCredentials,
                { useDedupe: true, headers: { 'Content-Type': 'application/json' } },
                'fetching GitHub OAuth params'
            );
        });

        it('should throw NOT_CONFIGURED error when GitHub OAuth is not configured', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                json: vi.fn().mockResolvedValue({ error: 'GitHub OAuth not configured' })
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            await expect(getGitHubOAuthParams(mockCredentials))
                .rejects.toThrow('GitHub OAuth not configured');
        });

        it('should throw FETCH_FAILED error for other HTTP errors', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                json: vi.fn().mockResolvedValue({ error: 'Internal server error' })
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            await expect(getGitHubOAuthParams(mockCredentials))
                .rejects.toThrow('Failed to get GitHub OAuth params: 500');
        });
    });

    describe('getAccountProfile', () => {
        it('should return account profile on success', async () => {
            const mockProfile = {
                id: 'user-123',
                timestamp: Date.now(),
                github: {
                    id: 12345,
                    login: 'testuser',
                    name: 'Test User',
                    avatar_url: 'https://avatars.githubusercontent.com/u/12345'
                }
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockProfile)
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            const result = await getAccountProfile(mockCredentials);

            expect(result).toEqual(mockProfile);
            expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
                'https://api.test.com/v1/account/profile',
                mockCredentials,
                { useDedupe: true, headers: { 'Content-Type': 'application/json' } },
                'fetching account profile'
            );
        });

        it('should return profile with null github when not connected', async () => {
            const mockProfile = {
                id: 'user-123',
                timestamp: Date.now(),
                github: null
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue(mockProfile)
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            const result = await getAccountProfile(mockCredentials);

            expect(result.github).toBeNull();
        });

        it('should throw FETCH_FAILED error for HTTP errors', async () => {
            const mockResponse = {
                ok: false,
                status: 401,
                json: vi.fn().mockResolvedValue({ error: 'Unauthorized' })
            };
            mockAuthenticatedFetch.mockResolvedValue(mockResponse);

            await expect(getAccountProfile(mockCredentials))
                .rejects.toThrow('Failed to get account profile: 401');
        });
    });
});
