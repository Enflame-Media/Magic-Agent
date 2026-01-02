/**
 * Vitest Configuration for Happy Admin Dashboard
 *
 * Configures Vue testing with:
 * - Vue Test Utils support
 * - happy-dom for fast DOM simulation
 * - Global test helpers (describe, it, expect)
 * - Coverage reporting with v8 provider
 *
 * @see https://vitest.dev/config/
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 */
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src/app'),
        },
    },
    test: {
        // Include test files in src/app (frontend) and src/worker (backend)
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

        // Use happy-dom for fast Vue component testing
        environment: 'happy-dom',

        // Enable global test functions (describe, it, expect)
        globals: true,

        // Setup file for mocking browser APIs and Vue Test Utils
        setupFiles: ['./test/setup.ts'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            include: ['src/app/**/*.ts', 'src/app/**/*.vue'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/**/*.d.ts',
                'src/app/main.ts',
                'node_modules/**',
            ],
            // Aim for 60% coverage initially, increase to 80% as tests grow
            thresholds: {
                statements: 60,
                branches: 60,
                functions: 60,
                lines: 60,
            },
        },

        // Improve test isolation
        clearMocks: true,
        restoreMocks: true,

        // Enable environment options
        environmentOptions: {
            happyDOM: {
                // Enable fetch API
                settings: {
                    disableCSSFileLoading: true,
                    disableJavaScriptFileLoading: true,
                },
            },
        },
    },
});
