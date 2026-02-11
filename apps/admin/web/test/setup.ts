/**
 * Vitest Setup File for Happy Admin Dashboard
 *
 * This file runs before all tests and sets up the testing environment.
 * It configures:
 * - Browser API mocks (fetch, localStorage, etc.)
 * - Vue Test Utils global configuration
 * - Common test utilities
 *
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 */
import { vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock browser APIs that aren't available in happy-dom

// Mock console.warn to avoid noisy test output (can be spied in tests)
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock fetch API with a default implementation that returns empty data
// Individual tests can override this mock
global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
        text: () => Promise.resolve(''),
        status: 200,
        headers: new Headers(),
    } as Response)
);

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(() => null),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', { value: localStorageMock });

// Configure Vue Test Utils global options
config.global.stubs = {
    // Stub router-link and router-view by default
    'router-link': true,
    'router-view': true,
    // Stub chart components that require canvas
    Bar: true,
    Line: true,
    Doughnut: true,
};

// Add global mocks for vue-i18n
config.global.mocks = {
    $t: (key: string) => key,
    $tc: (key: string) => key,
    $te: (key: string) => true,
    $d: (date: Date) => date.toISOString(),
    $n: (num: number) => num.toString(),
};

// Reset all mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
    vi.restoreAllMocks();
});
