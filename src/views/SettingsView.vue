<script setup lang="ts">
/**
 * Settings View - Main Settings Screen
 *
 * Provides access to app settings organized into logical groups:
 * - Account: Profile, authentication
 * - Appearance: Theme, display preferences
 * - About: Version, links, legal
 *
 * Follows the same structure as apps/web/react/sources/components/SettingsView.tsx
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSyncStore } from '@/stores/sync';
import { useUiStore } from '@/stores/ui';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/composables/useLocale';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { openUrl } from '@/shared';

const router = useRouter();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const ui = useUiStore();
const { t } = useLocale();

// App version (would come from build config)
const appVersion = '0.1.0';

// User info
const displayName = computed(() => authStore.displayName || 'User');
const initials = computed(() => authStore.initials || 'U');
const isConnected = computed(() => syncStore.isConnected);

// Navigation handlers
function navigateToAccount() {
  router.push('/settings/account');
}

function navigateToAppearance() {
  router.push('/settings/appearance');
}

function navigateToLanguage() {
  router.push('/settings/language');
}

function navigateToPrivacy() {
  router.push('/settings/privacy');
}

function navigateToNotifications() {
  router.push('/settings/notifications');
}

function navigateToVoice() {
  router.push('/settings/voice/language');
}

function navigateToUsage() {
  router.push('/settings/usage');
}

function navigateToFeatures() {
  router.push('/settings/features');
}

function navigateToClaudeConnect() {
  router.push('/settings/connect/claude');
}

function navigateToServer() {
  router.push('/settings/server');
}

function navigateToStorage() {
  router.push('/settings/storage');
}

function navigateToMcp() {
  router.push('/settings/mcp');
}

function navigateToFriends() {
  router.push('/friends');
}

function handleLogout() {
  authStore.logout();
  router.push('/auth');
}

function goBack() {
  router.push('/');
}

// External links
async function handleOpenUrl(url: string) {
  const result = await openUrl(url);
  if (!result.success) {
    ui.error(result.error ?? 'Failed to open link');
  }
}

function openPrivacyPolicy() {
  void handleOpenUrl('https://happy.engineering/privacy/');
}

function openTerms() {
  void handleOpenUrl('https://github.com/slopus/happy/blob/main/TERMS.md');
}

function openGitHub() {
  void handleOpenUrl('https://github.com/slopus/happy');
}
</script>

<template>
  <ResponsiveContainer size="narrow" padding="default">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>
      <h1 class="text-2xl font-semibold">Settings</h1>
    </header>

    <!-- Profile Card -->
    <Card class="mb-6">
      <CardHeader>
        <div class="flex items-center gap-4">
          <Avatar class="h-16 w-16">
            <AvatarFallback class="text-lg bg-primary/10 text-primary">
              {{ initials }}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{{ displayName }}</CardTitle>
            <CardDescription class="flex items-center gap-2">
              <span
                :class="[
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-green-500' : 'bg-gray-400',
                ]"
              />
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>

    <!-- Settings Groups -->
    <div class="space-y-6">
      <!-- Account Group -->
      <section>
        <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
          Account
        </h2>
        <Card>
          <CardContent class="p-0">
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToAccount"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Account</p>
                  <p class="text-sm text-muted-foreground">Profile, connections</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
              @click="navigateToClaudeConnect"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-amber-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M8 9l4-4 4 4M16 15l-4 4-4-4M12 5v14"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Connect Claude</p>
                  <p class="text-sm text-muted-foreground">Link a CLI to this account</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </CardContent>
        </Card>
      </section>

      <!-- Social Group -->
      <section>
        <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
          Social
        </h2>
        <Card>
          <CardContent class="p-0">
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
              @click="navigateToFriends"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Friends</p>
                  <p class="text-sm text-muted-foreground">Manage friends</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </CardContent>
        </Card>
      </section>

      <!-- Preferences Group -->
      <section>
        <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
          Preferences
        </h2>
        <Card>
          <CardContent class="p-0">
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToAppearance"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Appearance</p>
                  <p class="text-sm text-muted-foreground">Theme, display</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToLanguage"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Language</p>
                  <p class="text-sm text-muted-foreground">App language</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToNotifications"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">{{ t('settings.notifications') }}</p>
                  <p class="text-sm text-muted-foreground">
                    {{ t('settings.notificationsSubtitle') }}
                  </p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToPrivacy"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Privacy</p>
                  <p class="text-sm text-muted-foreground">Online status, visibility</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToVoice"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-orange-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Voice Assistant</p>
                  <p class="text-sm text-muted-foreground">Voice language preferences</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToFeatures"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 3v4m0 10v4m9-9h-4M7 12H3m14.364-4.364l-2.828 2.828M9.464 16.536l-2.828 2.828m0-11.314l2.828 2.828m7.072 7.072l2.828 2.828"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Features</p>
                  <p class="text-sm text-muted-foreground">Experimental toggles</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToUsage"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-sky-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 3v18h18M7 15l3-3 4 4 6-6"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Usage</p>
                  <p class="text-sm text-muted-foreground">Plan limits and metrics</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToMcp"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10l-8-4m8 4V7m0 10l8-4"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">MCP Servers</p>
                  <p class="text-sm text-muted-foreground">Connected tool servers</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="navigateToServer"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5 12h14M5 6h14M5 18h14"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Server</p>
                  <p class="text-sm text-muted-foreground">API endpoint</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <!-- HAP-874: Storage settings for artifact cache -->
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
              @click="navigateToStorage"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-teal-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Storage</p>
                  <p class="text-sm text-muted-foreground">Offline cache, data</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </CardContent>
        </Card>
      </section>

      <!-- About Group -->
      <section>
        <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
          About
        </h2>
        <Card>
          <CardContent class="p-0">
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="openGitHub"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">GitHub</p>
                  <p class="text-sm text-muted-foreground">slopus/happy</p>
                </div>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="openPrivacyPolicy"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <span class="font-medium">Privacy Policy</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors border-b"
              @click="openTerms"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span class="font-medium">Terms of Service</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
            <div class="flex items-center justify-between p-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span class="font-medium">Version</span>
              </div>
              <span class="text-muted-foreground">{{ appVersion }}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Logout -->
      <section class="pt-4">
        <Button
          variant="destructive"
          class="w-full"
          @click="handleLogout"
        >
          Sign Out
        </Button>
      </section>
    </div>
  </ResponsiveContainer>
</template>
