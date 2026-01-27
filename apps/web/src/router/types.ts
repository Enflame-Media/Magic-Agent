/**
 * Vue Router type extensions
 *
 * This file augments the vue-router module to add custom
 * route meta types for authentication guards and breadcrumbs.
 *
 * @see HAP-918 - Desktop Enhancements - Breadcrumb Navigation
 */

import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires authentication */
    requiresAuth?: boolean;
    /** Route is only for guests (unauthenticated users) */
    guest?: boolean;
    /** Breadcrumb label for this route (uses route name if not provided) */
    breadcrumbLabel?: string;
    /** Parent route name for breadcrumb hierarchy (auto-detected if not provided) */
    breadcrumbParent?: string;
    /** Hide this route from breadcrumbs */
    hideBreadcrumb?: boolean;
  }
}
