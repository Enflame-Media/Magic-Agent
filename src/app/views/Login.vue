<script setup lang="ts">
/**
 * Login View
 *
 * Admin login page with email/password authentication
 * powered by Better-Auth.
 */
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTranslation } from '@/composables/useTranslation';

const router = useRouter();
const route = useRoute();
const { t } = useTranslation();

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
        const response = await fetch('/api/auth/sign-in/email', {
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
            error.value = data.message || t('auth.loginFailed');
            return;
        }

        // Redirect to original destination or dashboard
        const redirect = route.query.redirect as string | undefined;
        await router.push(redirect || '/');
    } catch (err) {
        error.value = t('errors.unknownError');
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
                    {{ t('auth.happyAdmin') }}
                </h1>
                <p class="text-gray-600 dark:text-gray-400 mt-2">
                    {{ t('auth.signInSubtitle') }}
                </p>
            </div>

            <form @submit.prevent="handleLogin" class="space-y-6">
                <div>
                    <label for="email" class="label">{{ t('auth.email') }}</label>
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
                    <label for="password" class="label">{{ t('auth.password') }}</label>
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
                    <span v-if="loading">{{ t('auth.signingIn') }}</span>
                    <span v-else>{{ t('auth.signIn') }}</span>
                </button>
            </form>
        </div>
    </div>
</template>
