/**
 * Vue Router type extensions
 *
 * This file augments the vue-router module to add custom
 * route meta types for authentication guards.
 */

import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires authentication */
    requiresAuth?: boolean;
    /** Route is only for guests (unauthenticated users) */
    guest?: boolean;
  }
}
