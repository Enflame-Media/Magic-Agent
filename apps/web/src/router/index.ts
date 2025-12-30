/**
 * Vue Router configuration for Happy web application
 *
 * Uses HTML5 history mode for clean URLs.
 * Routes are lazy-loaded for optimal bundle splitting.
 */

import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
});

export default router;
