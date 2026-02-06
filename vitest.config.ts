import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

/**
 * Vitest configuration for Happy Vue.js web application
 *
 * Uses happy-dom for DOM simulation and matches the Vite config aliases.
 *
 * Test organization:
 * - src/__tests__/services/   - Service layer unit tests
 * - src/__tests__/stores/     - Pinia store tests
 * - src/__tests__/components/ - Vue component tests
 * - src/__tests__/lib/        - Utility function tests
 * - e2e/                      - Playwright E2E tests (separate config)
 * - e2e/mobile/               - Appium mobile E2E tests
 *
 * ## Vue Module Deduplication (HAP-983)
 *
 * In yarn workspace monorepos, Vue and its internal packages can be installed
 * as duplicate copies (root hoisted + nested under apps/web/vue/node_modules/vue/).
 * This causes Vue Test Utils mount() to fail with `renderSlot` errors on components
 * that use `<slot />`, because `currentRenderingInstance` is module-scoped and the
 * two copies don't share state.
 *
 * The `resolve.dedupe` and explicit Vue aliases force all Vue imports to resolve
 * to the root monorepo copy, eliminating the duplicate module issue.
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 * @see HAP-983 - Integration tests for responsive components
 * @see https://vitejs.dev/config/shared-options.html#resolve-dedupe
 */

// Root monorepo node_modules for Vue deduplication
const rootNodeModules = path.resolve(__dirname, '../../../node_modules');

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Force Vue packages to resolve from root monorepo node_modules
      // to prevent duplicate module instances (HAP-983)
      'vue': path.resolve(rootNodeModules, 'vue'),
      '@vue/runtime-core': path.resolve(rootNodeModules, '@vue/runtime-core'),
      '@vue/runtime-dom': path.resolve(rootNodeModules, '@vue/runtime-dom'),
      '@vue/reactivity': path.resolve(rootNodeModules, '@vue/reactivity'),
      '@vue/shared': path.resolve(rootNodeModules, '@vue/shared'),
    },
    dedupe: [
      'vue',
      '@vue/runtime-core',
      '@vue/runtime-dom',
      '@vue/reactivity',
      '@vue/shared',
    ],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
    // Set up mocks for browser APIs that happy-dom doesn't provide
    setupFiles: ['./src/__tests__/setup.ts'],
    // Test isolation and performance
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    // Reporting
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/vitest-results.json',
    },
    // Coverage configuration
    // @see HAP-877 - Increase test coverage to 80% for business logic
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.ts',
        'src/**/*.vue',
      ],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/App.vue',
        'src/vite-env.d.ts',
        'src/__tests__/**/*',
      ],
      // Coverage thresholds for business logic (HAP-877)
      // @see https://linear.app/enflame-media/issue/HAP-877
      //
      // Strategy: Focus unit test coverage on pure business logic that doesn't
      // require complex mocking (WebSocket, IndexedDB, browser APIs).
      // - Core encryption: 80%+ target (security-critical, pure functions)
      // - Pinia stores: 65%+ target (state management, testable actions)
      // - Services with browser APIs: Lower thresholds (tested via E2E instead)
      // - UI components/views: Lower thresholds (visual regression tests)
      thresholds: {
        // Core encryption services: High coverage (security-critical)
        'src/services/encryption.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        // Pinia stores: High coverage for business logic
        'src/stores/**/*.ts': {
          lines: 65,
          functions: 65,
          branches: 55,
          statements: 65,
        },
        // Utility libraries: High coverage (pure functions)
        'src/lib/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 60,
          statements: 80,
        },
        // Composables: Medium coverage (some require Vue runtime)
        'src/composables/**/*.ts': {
          lines: 12,
          functions: 10,
          branches: 12,
          statements: 12,
        },
        // UI components: Low thresholds (visual regression tests handle UI)
        'src/components/**/*.vue': {
          lines: 2,
          functions: 1,
          branches: 2,
          statements: 2,
        },
        // Views: Minimal (primarily E2E tested)
        'src/views/**/*.vue': {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0,
        },
      },
    },
    // Snapshot configuration
    snapshotFormat: {
      printBasicPrototype: false,
    },
  },
});
