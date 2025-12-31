/**
 * Vue Router configuration for Happy web application
 *
 * Uses HTML5 history mode for clean URLs.
 * Routes are lazy-loaded for optimal bundle splitting.
 *
 * Authentication routes:
 * - /auth - Login options (QR scan, mobile auth, manual entry)
 * - /auth/scan - Camera-based QR scanning
 * - /auth/manual - Manual code entry
 * - /auth/connect - Initial auth via mobile app
 * - /terminal/connect - CLI web auth callback (with #key=...)
 */

import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type NavigationGuardNext,
} from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import './types'; // Route meta type augmentation

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ─────────────────────────────────────────────────────────────────────
    // Main Routes (require authentication)
    // ─────────────────────────────────────────────────────────────────────
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },

    // ─────────────────────────────────────────────────────────────────────
    // Auth Routes (public)
    // ─────────────────────────────────────────────────────────────────────
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/auth/scan',
      name: 'auth-scan',
      component: () => import('@/views/auth/QRScannerView.vue'),
    },
    {
      path: '/auth/manual',
      name: 'auth-manual',
      component: () => import('@/views/auth/ManualEntryView.vue'),
    },
    {
      path: '/auth/connect',
      name: 'auth-connect',
      component: () => import('@/views/auth/ConnectingView.vue'),
      meta: { guest: true },
    },

    // ─────────────────────────────────────────────────────────────────────
    // CLI Web Auth Callback
    // ─────────────────────────────────────────────────────────────────────
    // When CLI opens browser with /terminal/connect#key=..., we handle it here
    {
      path: '/terminal/connect',
      name: 'terminal-connect',
      component: () => import('@/views/auth/QRScannerView.vue'),
      meta: { requiresAuth: true },
      beforeEnter: (to: RouteLocationNormalized) => {
        // Extract key from hash and pass as query param
        if (to.hash.startsWith('#key=')) {
          const key = to.hash.slice(5);
          return { name: 'auth-manual', query: { code: key } };
        }
        return true;
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // Catch-all
    // ─────────────────────────────────────────────────────────────────────
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────
// Navigation Guards
// ─────────────────────────────────────────────────────────────────────────

router.beforeEach(
  (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const authStore = useAuthStore();

    // Routes that require authentication
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      // Save intended destination
      next({
        name: 'auth',
        query: { redirect: to.fullPath },
      });
      return;
    }

    // Routes only for guests (redirect to home if authenticated)
    if (to.meta.guest && authStore.isAuthenticated) {
      next({ name: 'home' });
      return;
    }

    next();
  }
);

export default router;
