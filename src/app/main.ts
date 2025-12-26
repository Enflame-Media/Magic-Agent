import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';
import { API_BASE_URL } from './lib/api';

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
            const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
                credentials: 'include',
            });
            if (!response.ok) {
                next({ name: 'login', query: { redirect: to.fullPath } });
                return;
            }
        } catch {
            next({ name: 'login', query: { redirect: to.fullPath } });
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
