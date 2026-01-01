/**
 * Happy Mobile App Entry Point
 *
 * NativeScript-Vue 3 application with Pinia state management
 * and Material Design components.
 */
import { createApp } from 'nativescript-vue';
import { createPinia } from 'pinia';
import { Application } from '@nativescript/core';

// Material Components setup
import { installMixins, themer } from '@nativescript-community/ui-material-core';

// Root component
import App from './app.vue';

// Install Material mixins for elevation and ripple effects
installMixins();

// Configure iOS theme colors programmatically
if (Application.ios) {
  themer.setPrimaryColor('#6366F1'); // Indigo-500
  themer.setAccentColor('#8B5CF6');  // Violet-500
  themer.setSecondaryColor('#EC4899'); // Pink-500
}

// Create the Vue application
const app = createApp(App);

// Install Pinia for state management
const pinia = createPinia();
app.use(pinia);

// Start the application
app.start();
