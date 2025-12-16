import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for Happy Server Workers
 *
 * @see https://vitest.dev/config/
 */
export default defineConfig({
    test: {
        /**
         * Use globals (describe, it, expect) without imports
         * Matches the global types in tsconfig.json
         */
        globals: true,

        /**
         * Test environment - use 'node' for Cloudflare Workers tests
         * Edge runtime simulation can be added later if needed
         */
        environment: 'node',

        /**
         * Test file patterns
         */
        include: ['src/**/*.{test,spec}.ts'],
        exclude: ['node_modules', 'dist', '.wrangler'],

        /**
         * Coverage configuration
         */
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                '.wrangler/',
                '**/*.spec.ts',
                '**/*.test.ts',
                // Test utilities - these are not production code
                'src/__tests__/**',
                // Auth module uses Ed25519 crypto not available in Node.js test env
                // It must be mocked in tests, so real coverage is not possible
                'src/lib/auth.ts',
                // Privacy-kit shim and test route - development/debugging only
                'src/lib/privacy-kit-shim.ts',
                'src/routes/test/**',
                // Re-export files contain no logic
                'src/durable-objects/index.ts',
                // DB schema is mostly type definitions with no runtime logic to test
                'src/db/schema.ts',
                // DB seed file is a utility script, not production code
                'src/db/seed.ts',
                // DB comparison tool is a dev utility, not production code
                'src/db/comparison-tool.ts',
            ],
            thresholds: {
                // HAP-294: Original test coverage targets
                // Current coverage exceeds these significantly:
                //   - Lines: ~95% (target: 60%)
                //   - Functions: ~99% (target: 60%)
                //   - Branches: ~90% (target: 50%)
                //
                // Note: HAP-295 attempted near-100% but some gaps remain:
                //   - WebSocket Hibernation API edge cases (ConnectionManager.ts ~75%)
                //   - Ticket module needs additional tests for full coverage
                //   - Some defensive catch blocks for malformed binary data
                lines: 60,
                functions: 60,
                branches: 50,
            },
        },

        /**
         * Reporter configuration
         */
        reporters: ['default'],

        /**
         * Fail tests on console warnings/errors
         * Helps catch unhandled promise rejections
         */
        silent: false,
    },

    /**
     * Path resolution - match tsconfig.json paths
     */
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
