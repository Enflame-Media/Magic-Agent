/**
 * Happy Vue.js Web Application Entry Point
 *
 * Bootstraps the Vue 3 application with:
 * - Vue Router for client-side routing
 * - Pinia for state management
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// Install plugins
app.use(createPinia());
app.use(router);

// Mount the application
app.mount('#app');
