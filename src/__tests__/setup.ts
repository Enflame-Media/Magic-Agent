/**
 * Vitest test setup
 *
 * Configures global mocks and test environment.
 * @see HAP-863 - Add unit tests for artifact sync encryption
 */

import { vi, beforeEach } from 'vitest';

// Mock crypto.subtle for tests that require Web Crypto API
// happy-dom doesn't provide a complete crypto.subtle implementation
if (!globalThis.crypto?.subtle) {
  // Only mock if not already provided (node >= 20 has it)
  const { webcrypto } = await import('node:crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
  });
}

// Mock console methods to reduce noise during tests (optional)
// Uncomment if needed:
// vi.spyOn(console, 'debug').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// Global test cleanup
beforeEach(() => {
  // Reset any module-level state between tests if needed
  vi.clearAllMocks();
});
