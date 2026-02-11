/**
 * Vitest setup file for test environment configuration.
 *
 * Note: React Native and Expo modules are mocked via Vite aliases
 * in vitest.config.ts to prevent Rollup from trying to parse their
 * Flow syntax. See the `__mocks__/` directory for those mocks.
 *
 * This file is for runtime mocks and global test configuration.
 *
 * @see https://vitest.dev/config/#setupfiles
 */

import { vi } from 'vitest';

// Mock the AuthContext's getCurrentAuth function since it's used by authenticatedFetch
vi.mock('@/auth/AuthContext', () => ({
    getCurrentAuth: vi.fn(() => null),
    AuthProvider: vi.fn(({ children }: { children: unknown }) => children),
    useAuth: vi.fn(() => ({
        isAuthenticated: false,
        credentials: null,
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
    })),
}));
