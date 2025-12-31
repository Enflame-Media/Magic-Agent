/**
 * Happy Vue.js Web Application Entry Point
 *
 * Bootstraps the Vue 3 application with:
 * - Vue Router for client-side routing
 * - Pinia for state management
 * - Tailwind CSS with ShadCN-Vue theme
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';

// Import global styles (Tailwind CSS + ShadCN-Vue variables)
import './assets/index.css';

const app = createApp(App);
const pinia = createPinia();

// Install plugins
app.use(pinia);
app.use(router);

// Initialize auth state from persisted credentials before mounting
// This runs async but we don't block - router guards will handle auth checks
const authStore = useAuthStore(pinia);
void authStore.initialize();

// Mount the application
app.mount('#app');
