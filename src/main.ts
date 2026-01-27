/**
 * Happy Vue.js Web Application Entry Point
 *
 * Bootstraps the Vue 3 application with:
 * - Vue Router for client-side routing
 * - Pinia for state management
 * - Vue I18n for internationalization (7 languages)
 * - Tailwind CSS with ShadCN-Vue theme
 * - PWA with service worker for offline support
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import { useAuthStore } from './stores/auth';

// Import global styles (Tailwind CSS + ShadCN-Vue variables)
import './assets/index.css';

const app = createApp(App);
const pinia = createPinia();

// Install plugins
app.use(pinia);
app.use(router);
app.use(i18n);

// Initialize auth state from persisted credentials before mounting
// This runs async but we don't block - router guards will handle auth checks
const authStore = useAuthStore(pinia);
void authStore.initialize();

// Mount the application
app.mount('#app');

// Register service worker for PWA support
// Uses vite-plugin-pwa with autoUpdate strategy
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // New content available - auto-update is enabled
        // so this will reload automatically
        console.log('[PWA] New content available, updating...');
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      },
      onRegistered(registration) {
        if (registration) {
          console.log('[PWA] Service worker registered');
        }
      },
      onRegisterError(error) {
        console.error('[PWA] Service worker registration failed:', error);
      },
    });
  }).catch((error: unknown) => {
    console.warn('[PWA] Failed to load PWA module:', error);
  });
}
