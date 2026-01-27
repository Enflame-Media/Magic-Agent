import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vite configuration for Happy Vue.js web application
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
 */
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/*.png',
        'splash/*.png',
        'screenshots/*.png',
        'og-image.png',
      ],
      // Use existing manifest.json from public folder
      manifest: false,
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          // API calls: NetworkFirst with fallback to cache
          {
            urlPattern: /^https:\/\/api\.happy\.theking\.sh\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'happy-api-cache',
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
            handler: 'NetworkOnly',
          },
          // Images: StaleWhileRevalidate for fast display
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'happy-image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Fonts: CacheFirst for performance
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'happy-font-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Google Fonts webfonts
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
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
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['reka-ui', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'i18n-vendor': ['vue-i18n'],
        },
      },
    },
  },
});
