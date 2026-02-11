<script setup lang="ts">
/**
 * Notifications Settings
 *
 * Configure notification preferences for the web app.
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore, type NotificationSettings } from '@/stores/settings';
import { useLocale } from '@/composables/useLocale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

const router = useRouter();
const settingsStore = useSettingsStore();
const { t } = useLocale();

const notifications = computed(() => settingsStore.notifications);
const notificationsEnabled = computed(() => notifications.value.enabled);

function goBack() {
  router.push('/settings');
}

function toggleSetting(key: keyof NotificationSettings) {
  const currentValue = settingsStore.notifications[key];
  settingsStore.updateNotifications({ [key]: !currentValue } as Partial<NotificationSettings>);
}
</script>

<template>
  <ResponsiveContainer size="narrow" padding="default">
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
      <h1 class="text-2xl font-semibold">{{ t('settingsNotifications.title') }}</h1>
    </header>

    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{{ t('settingsNotifications.alertsTitle') }}</CardTitle>
          <CardDescription>{{ t('settingsNotifications.alertsDescription') }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="font-medium">{{ t('settingsNotifications.enableTitle') }}</p>
              <p class="text-sm text-muted-foreground">
                {{ t('settingsNotifications.enableDescription') }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="notificationsEnabled"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              :class="notificationsEnabled ? 'bg-green-500' : 'bg-gray-400'"
              @click="toggleSetting('enabled')"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="notificationsEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="font-medium">{{ t('settingsNotifications.messagesTitle') }}</p>
              <p class="text-sm text-muted-foreground">
                {{ t('settingsNotifications.messagesDescription') }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="notifications.messages"
              :disabled="!notificationsEnabled"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="notifications.messages && notificationsEnabled ? 'bg-green-500' : 'bg-gray-400'"
              @click="toggleSetting('messages')"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="notifications.messages && notificationsEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="font-medium">{{ t('settingsNotifications.sessionActivityTitle') }}</p>
              <p class="text-sm text-muted-foreground">
                {{ t('settingsNotifications.sessionActivityDescription') }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="notifications.sessionActivity"
              :disabled="!notificationsEnabled"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="notifications.sessionActivity && notificationsEnabled ? 'bg-green-500' : 'bg-gray-400'"
              @click="toggleSetting('sessionActivity')"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="notifications.sessionActivity && notificationsEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="font-medium">{{ t('settingsNotifications.machineStatusTitle') }}</p>
              <p class="text-sm text-muted-foreground">
                {{ t('settingsNotifications.machineStatusDescription') }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="notifications.machineStatus"
              :disabled="!notificationsEnabled"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="notifications.machineStatus && notificationsEnabled ? 'bg-green-500' : 'bg-gray-400'"
              @click="toggleSetting('machineStatus')"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="notifications.machineStatus && notificationsEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="font-medium">{{ t('settingsNotifications.soundsTitle') }}</p>
              <p class="text-sm text-muted-foreground">
                {{ t('settingsNotifications.soundsDescription') }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="notifications.sounds"
              :disabled="!notificationsEnabled"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="notifications.sounds && notificationsEnabled ? 'bg-green-500' : 'bg-gray-400'"
              @click="toggleSetting('sounds')"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="notifications.sounds && notificationsEnabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  </ResponsiveContainer>
</template>
