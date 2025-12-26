<script setup lang="ts">
/**
 * Login View
 *
 * Admin login page with email/password authentication
 * powered by Better-Auth.
 *
 * Note: Auth requests go to the happy-admin-api worker.
 */
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { API_BASE_URL } from '../lib/api';

const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

/**
 * Handle login form submission
 * Authenticates with Better-Auth and redirects to dashboard
 */
async function handleLogin() {
    error.value = '';
    loading.value = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: email.value,
                password: password.value,
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            error.value = data.message || 'Invalid credentials';
            return;
        }

        // Redirect to original destination or dashboard
        const redirect = route.query.redirect as string | undefined;
        await router.push(redirect || '/');
    } catch (err) {
        error.value = 'An error occurred. Please try again.';
        console.error('Login error:', err);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center px-4">
        <div class="card max-w-md w-full">
            <div class="text-center mb-8">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                    Happy Admin
                </h1>
                <p class="text-gray-600 dark:text-gray-400 mt-2">
                    Sign in to access the dashboard
                </p>
            </div>

            <form @submit.prevent="handleLogin" class="space-y-6">
                <div>
                    <label for="email" class="label">Email</label>
                    <input
                        id="email"
                        v-model="email"
                        type="email"
                        required
                        class="input"
                        placeholder="admin@example.com"
                        :disabled="loading"
                    />
                </div>

                <div>
                    <label for="password" class="label">Password</label>
                    <input
                        id="password"
                        v-model="password"
                        type="password"
                        required
                        class="input"
                        placeholder="••••••••"
                        :disabled="loading"
                    />
                </div>

                <div v-if="error" class="text-red-600 text-sm">
                    {{ error }}
                </div>

                <button
                    type="submit"
                    class="btn-primary w-full"
                    :disabled="loading"
                >
                    <span v-if="loading">Signing in...</span>
                    <span v-else>Sign In</span>
                </button>
            </form>
        </div>
    </div>
</template>
