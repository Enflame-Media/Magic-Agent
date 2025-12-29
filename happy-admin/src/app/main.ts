import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';
import { API_BASE_URL } from './lib/api';
import { isValidRedirect } from './lib/security';

/**
 * Vue Router configuration
 *
 * Routes:
 * - / - Dashboard (protected, requires auth)
 * - /login - Login page (public)
 */
const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'dashboard',
            component: () => import('./views/Dashboard.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/admin/users',
            name: 'admin-users',
            component: () => import('./views/AdminUsers.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('./views/Login.vue'),
        },
    ],
});

/**
 * Navigation guard for authentication
 * Redirects to login if user is not authenticated
 */
router.beforeEach(async (to, _from, next) => {
    if (to.meta.requiresAuth) {
        // Check session with Better-Auth on the API worker
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
                credentials: 'include',
            });
            if (!response.ok) {
                // SECURITY FIX (HAP-625): Validate redirect path before setting
                const redirectPath = to.fullPath;
                const query = isValidRedirect(redirectPath) ? { redirect: redirectPath } : undefined;
                next({ name: 'login', query });
                return;
            }
        } catch {
            // SECURITY FIX (HAP-625): Validate redirect path before setting
            const redirectPath = to.fullPath;
            const query = isValidRedirect(redirectPath) ? { redirect: redirectPath } : undefined;
            next({ name: 'login', query });
            return;
        }
    }
    next();
});

/**
 * Create and mount Vue application
 */
const app = createApp(App);
app.use(router);
app.mount('#app');
