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
            ],
            thresholds: {
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
