<script setup lang="ts">
/**
 * Privacy Settings View
 *
 * Allows users to control their privacy settings including:
 * - Online status visibility to friends
 *
 * @see HAP-727 - Add privacy setting to hide online status from friends
 */

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPrivacySettings, updatePrivacySettings } from '@/services/privacy';

const router = useRouter();

// Privacy settings state
const showOnlineStatus = ref(true);
const isLoading = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);

// Load privacy settings on mount
onMounted(async () => {
  isLoading.value = true;
  try {
    const settings = await getPrivacySettings();
    showOnlineStatus.value = settings.showOnlineStatus;
  } catch (err) {
    console.error('Failed to load privacy settings:', err);
    error.value = 'Failed to load privacy settings';
  } finally {
    isLoading.value = false;
  }
});

// Handle toggle change
async function handleToggle() {
  const newValue = !showOnlineStatus.value;
  isSaving.value = true;
  error.value = null;

  try {
    const updated = await updatePrivacySettings({ showOnlineStatus: newValue });
    showOnlineStatus.value = updated.showOnlineStatus;
  } catch (err) {
    console.error('Failed to update privacy settings:', err);
    error.value = 'Failed to save settings';
    // Revert on error (value wasn't changed yet since we update after success)
  } finally {
    isSaving.value = false;
  }
}

function goBack() {
  router.push('/settings');
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
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
      <h1 class="text-2xl font-semibold">Privacy</h1>
    </header>

    <div class="space-y-6">
      <!-- Online Status Section -->
      <Card>
        <CardHeader>
          <CardTitle>Online Status</CardTitle>
          <CardDescription>
            Control who can see when you're online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Loading State -->
          <div v-if="isLoading" class="space-y-3 py-2">
            <div class="flex items-center justify-between p-3 rounded-lg border">
              <div class="flex items-center gap-3">
                <Skeleton class="w-10 h-10 rounded-lg" />
                <div class="space-y-2">
                  <Skeleton class="h-4 w-32" />
                  <Skeleton class="h-3 w-48" />
                </div>
              </div>
              <Skeleton class="h-6 w-11 rounded-full" />
            </div>
          </div>

          <!-- Toggle -->
          <div v-else class="flex items-center justify-between p-3 rounded-lg border">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    v-if="showOnlineStatus"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    v-if="showOnlineStatus"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                  <path
                    v-else
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </div>
              <div>
                <p class="font-medium">Show Online Status</p>
                <p class="text-sm text-muted-foreground">
                  {{ showOnlineStatus ? 'Friends can see when you\'re online' : 'You appear offline to all friends' }}
                </p>
              </div>
            </div>

            <!-- Toggle Button (using a styled checkbox until Switch is available) -->
            <button
              type="button"
              role="switch"
              :aria-checked="showOnlineStatus"
              :disabled="isSaving"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="showOnlineStatus ? 'bg-green-500' : 'bg-gray-400'"
              @click="handleToggle"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="showOnlineStatus ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Error Message -->
          <p v-if="error" class="mt-3 text-sm text-red-500">
            {{ error }}
          </p>

          <!-- Info Text -->
          <p class="mt-4 text-sm text-muted-foreground">
            When disabled, you'll appear offline to all friends, but you can still see when they're online.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
