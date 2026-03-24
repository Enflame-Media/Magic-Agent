import { defineConfig } from 'vite-plus';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

/**
 * Vite+ configuration for Happy Admin Vue.js SPA
 *
 * Unified config for build, test, lint, and dev server.
 * The Vue.js frontend is served as static assets by the Cloudflare Worker.
 * Built files go to ./dist (configured as the static site bucket in wrangler.toml).
 */
export default defineConfig({
    plugins: [vue()],
    root: './src/app',
    base: '/',
    build: {
        outDir: '../../dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/app/index.html'),
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@app': resolve(__dirname, 'src/app'),
            '@worker': resolve(__dirname, 'src/worker'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
    test: {
        // Override root for tests (project root is ./src/app for Vite build)
        root: '.',

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
