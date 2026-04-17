import { defineConfig } from "vite-plus";
import vue from "@vitejs/plugin-vue";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";

/**
 * Vite+ unified configuration for Happy Vue.js web application
 *
 * Merged build + test config using vite-plus defineConfig.
 *
 * Uses @cloudflare/vite-plugin to integrate with Cloudflare Workers
 * for both development and production deployment.
 *
 * Tailwind CSS is integrated via @tailwindcss/vite plugin.
 *
 * PWA support via vite-plugin-pwa with Workbox for:
 * - Offline support with service worker
 * - Asset caching for performance
 * - Runtime caching for API calls
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
 * @see HAP-983 - Integration tests for responsive components
 * @see https://vitejs.dev/config/shared-options.html#resolve-dedupe
 */

// Root monorepo node_modules for Vue deduplication
// Use import.meta.url for ESM-compatible path resolution (project has "type": "module")
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootNodeModules = path.resolve(__dirname, "../../../node_modules");

/**
 * WORKAROUND: Cloudflare plugin conditional exclusion (HAP-1082, HAP-1089)
 *
 * The cloudflare() and VitePWA() plugins set `resolve.external` and workbox
 * configuration that conflicts with vite-plus's integrated vitest runner.
 * When these plugins are active during test mode, the vitest environment
 * cannot resolve modules correctly because the Cloudflare plugin assumes
 * a Workers runtime context.
 *
 * Fix: Detect test mode via the VITEST env var (set automatically by vitest)
 * or NODE_ENV=test, and exclude these build-only plugins during test runs.
 *
 * This is a TEMPORARY workaround. Monitor vite-plus releases for native
 * Cloudflare plugin compatibility. When vite-plus reaches stable and
 * @cloudflare/vite-plugin supports the unified config natively, this
 * conditional can be removed.
 *
 * @see HAP-1082 - Vite+ migration
 * @see HAP-1089 - Workaround documentation
 * @see https://github.com/nicolo-ribaudo/vite-plus (track stable release)
 */
const isTest = process.env["VITEST"] === "true" || process.env["NODE_ENV"] === "test";

/**
 * Build-only plugins: cloudflare() and VitePWA()
 * Excluded during test runs to avoid resolve.external conflicts.
 * See WORKAROUND note above for details.
 */
const buildPlugins = isTest
  ? []
  : [
      cloudflare(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/*.png", "splash/*.png", "screenshots/*.png", "og-image.png"],
        // Use existing manifest.json from public folder
        manifest: false,
        workbox: {
          // Cache all static assets
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          // Runtime caching strategies
          runtimeCaching: [
            // API calls: NetworkFirst with fallback to cache
            {
              urlPattern: /^https:\/\/api\.happy\.theking\.sh\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "happy-api-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                networkTimeoutSeconds: 10,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // WebSocket upgrade requests: NetworkOnly (can't cache)
            {
              urlPattern: /^wss?:\/\/.*/i,
              handler: "NetworkOnly",
            },
            // Images: StaleWhileRevalidate for fast display
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "happy-image-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            // Fonts: CacheFirst for performance
            {
              urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "happy-font-cache",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            // Google Fonts stylesheets
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts-stylesheets",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            // Google Fonts webfonts
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
          // Skip waiting for immediate activation
          skipWaiting: true,
          clientsClaim: true,
          // Don't cache opaque responses that might be errors
          cleanupOutdatedCaches: true,
        },
        // Development options
        devOptions: {
          enabled: false, // Disable in dev to avoid caching issues
        },
      }),
    ];

export default defineConfig({
  plugins: [vue(), tailwindcss(), ...buildPlugins],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Force Vue packages to resolve from root monorepo node_modules
      // to prevent duplicate module instances (HAP-983)
      vue: path.resolve(rootNodeModules, "vue"),
      "@vue/runtime-core": path.resolve(rootNodeModules, "@vue/runtime-core"),
      "@vue/runtime-dom": path.resolve(rootNodeModules, "@vue/runtime-dom"),
      "@vue/reactivity": path.resolve(rootNodeModules, "@vue/reactivity"),
      "@vue/shared": path.resolve(rootNodeModules, "@vue/shared"),
    },
    dedupe: ["vue", "@vue/runtime-core", "@vue/runtime-dom", "@vue/reactivity", "@vue/shared"],
  },
  build: {
    target: "esnext",
    sourcemap: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        /**
         * WORKAROUND: Rolldown manualChunks function format (HAP-1082, HAP-1089)
         *
         * Rolldown (the bundler used internally by vite-plus) requires
         * manualChunks to be a function, not an object. The previous Vite/Rollup
         * object format:
         *
         *   manualChunks: {
         *     'vue-vendor': ['vue', 'vue-router', 'pinia'],
         *   }
         *
         * does not work with Rolldown and produces a build error. The function
         * form works with BOTH Rolldown and Rollup, so this is a permanent
         * change that is forward-compatible regardless of which bundler is used.
         *
         * @see HAP-1082 - Vite+ migration
         * @see HAP-1089 - Workaround documentation
         */
        manualChunks(id: string): string | undefined {
          // Separate vendor chunks for better caching
          if (
            id.includes("node_modules/vue/") ||
            id.includes("node_modules/vue-router/") ||
            id.includes("node_modules/pinia/")
          ) {
            return "vue-vendor";
          }
          if (
            id.includes("node_modules/reka-ui/") ||
            id.includes("node_modules/class-variance-authority/") ||
            id.includes("node_modules/clsx/") ||
            id.includes("node_modules/tailwind-merge/")
          ) {
            return "ui-vendor";
          }
          if (id.includes("node_modules/vue-i18n/")) {
            return "i18n-vendor";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**/*", "node_modules/**/*"],
    // Set up mocks for browser APIs that happy-dom doesn't provide
    setupFiles: ["./src/__tests__/setup.ts"],
    // Test isolation and performance
    isolate: true,
    pool: "threads",
    // Reporting
    reporters: ["verbose", "json"],
    outputFile: {
      json: "./test-results/vitest-results.json",
    },
    // Coverage configuration
    // @see HAP-877 - Increase test coverage to 80% for business logic
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: [
        "src/**/*.{test,spec}.ts",
        "src/**/*.d.ts",
        "src/main.ts",
        "src/App.vue",
        "src/vite-env.d.ts",
        "src/__tests__/**/*",
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
        "src/services/encryption.ts": {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        // Pinia stores: High coverage for business logic
        "src/stores/**/*.ts": {
          lines: 65,
          functions: 65,
          branches: 55,
          statements: 65,
        },
        // Utility libraries: High coverage (pure functions)
        "src/lib/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 60,
          statements: 80,
        },
        // Composables: Medium coverage (some require Vue runtime)
        "src/composables/**/*.ts": {
          lines: 12,
          functions: 10,
          branches: 12,
          statements: 12,
        },
        // UI components: Low thresholds (visual regression tests handle UI)
        "src/components/**/*.vue": {
          lines: 2,
          functions: 1,
          branches: 2,
          statements: 2,
        },
        // Views: Minimal (primarily E2E tested)
        "src/views/**/*.vue": {
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
