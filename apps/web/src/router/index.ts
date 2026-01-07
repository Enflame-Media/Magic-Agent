/**
 * Vue Router configuration for Happy web application
 *
 * Uses HTML5 history mode for clean URLs.
 * Routes are lazy-loaded for optimal bundle splitting.
 *
 * Route structure:
 * - / - Home (sessions list) - requires auth
 * - /session/:id - Session detail - requires auth
 * - /session/:id/info - Session info - requires auth
 * - /session/:id/artifacts - Session artifacts - requires auth
 * - /artifacts - All artifacts - requires auth
 * - /friends - Friends list and search - requires auth
 * - /friends/:id - Friend profile - requires auth
 * - /settings - Settings main - requires auth
 * - /settings/account - Account settings - requires auth
 * - /settings/appearance - Appearance settings - requires auth
 * - /settings/language - Language settings - requires auth
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
    {
      path: '/new',
      name: 'new-session',
      component: () => import('@/views/NewSessionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/session/:id',
      name: 'session',
      component: () => import('@/views/SessionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/session/:id/message/:messageId',
      name: 'session-message',
      component: () => import('@/views/ToolMessageView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/session/:id/info',
      name: 'session-info',
      component: () => import('@/views/SessionInfoView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/session/:id/artifacts',
      name: 'session-artifacts',
      component: () => import('@/views/ArtifactsView.vue'),
      meta: { requiresAuth: true },
    },

    // ─────────────────────────────────────────────────────────────────────
    // Artifacts Routes (require authentication)
    // ─────────────────────────────────────────────────────────────────────
    {
      path: '/artifacts',
      name: 'artifacts',
      component: () => import('@/views/ArtifactsView.vue'),
      meta: { requiresAuth: true },
    },

    // ─────────────────────────────────────────────────────────────────────
    // Friends Routes (require authentication)
    // ─────────────────────────────────────────────────────────────────────
    {
      path: '/friends',
      name: 'friends',
      component: () => import('@/views/FriendsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/friends/:id',
      name: 'friend-profile',
      component: () => import('@/views/FriendProfileView.vue'),
      meta: { requiresAuth: true },
    },

    // ─────────────────────────────────────────────────────────────────────
    // Settings Routes (require authentication)
    // ─────────────────────────────────────────────────────────────────────
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/account',
      name: 'settings-account',
      component: () => import('@/views/settings/AccountView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/appearance',
      name: 'settings-appearance',
      component: () => import('@/views/settings/AppearanceView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/language',
      name: 'settings-language',
      component: () => import('@/views/settings/LanguageView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/notifications',
      name: 'settings-notifications',
      component: () => import('@/views/settings/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/privacy',
      name: 'settings-privacy',
      component: () => import('@/views/settings/PrivacyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings/voice',
      name: 'settings-voice',
      component: () => import('@/views/settings/VoiceView.vue'),
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
  async (
    to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const authStore = useAuthStore();

    if (!authStore.isHydrated) {
      await authStore.initialize();
    }

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
