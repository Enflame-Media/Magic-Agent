<script setup lang="ts">
/**
 * Friend Profile View
 *
 * Displays a lightweight profile for a friend with basic details.
 * Uses cached friends data when available and falls back to refreshing the list.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { UserProfile } from '@happy/protocol';
import { useFriends, getDisplayName } from '@/composables/useFriends';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

const route = useRoute();
const router = useRouter();
const { getFriend, loadFriends } = useFriends();

const profile = ref<UserProfile | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

const userId = computed(() => String(route.params.id ?? ''));

const displayName = computed(() => (profile.value ? getDisplayName(profile.value) : 'Profile'));
const avatarUrl = computed(() => profile.value?.avatar?.url ?? profile.value?.avatar?.path ?? '');
const initials = computed(() => {
  if (!profile.value) return '?';
  const first = profile.value.firstName?.[0]?.toUpperCase() ?? '';
  const last = profile.value.lastName?.[0]?.toUpperCase() ?? '';
  return (first + last) || (profile.value.username[0]?.toUpperCase() ?? '?');
});

const statusLabel = computed(() => {
  if (!profile.value) return '';
  switch (profile.value.status) {
    case 'friend':
      return 'Friends';
    case 'pending':
      return 'Incoming Request';
    case 'requested':
      return 'Outgoing Request';
    case 'rejected':
      return 'Blocked';
    default:
      return 'Not Connected';
  }
});

const statusClasses = computed(() => {
  if (!profile.value) return '';
  switch (profile.value.status) {
    case 'friend':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'requested':
      return 'bg-blue-100 text-blue-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
});

function goBack() {
  router.push('/friends');
}

async function loadProfile(): Promise<void> {
  const id = userId.value;
  if (!id) {
    errorMessage.value = 'Profile not found.';
    profile.value = null;
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  const cached = getFriend(id);
  if (cached) {
    profile.value = cached;
    isLoading.value = false;
    return;
  }

  await loadFriends();

  const friend = getFriend(id);
  if (friend) {
    profile.value = friend;
  } else {
    profile.value = null;
    errorMessage.value = 'This profile is unavailable or you no longer have access.';
  }

  isLoading.value = false;
}

onMounted(() => {
  void loadProfile();
});

watch(userId, () => {
  void loadProfile();
});
</script>

<template>
  <div class="flex flex-col min-h-screen bg-background">
    <header class="flex items-center gap-4 px-4 py-3 border-b bg-background sticky top-0 z-10">
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
      <div class="flex-1 min-w-0">
        <h1 class="font-semibold truncate">{{ displayName }}</h1>
        <p class="text-sm text-muted-foreground">Friend profile</p>
      </div>
    </header>

    <ResponsiveContainer size="narrow" padding="default" class="flex-1">
      <div v-if="isLoading" class="space-y-4">
        <Skeleton class="h-8 w-1/2" />
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-24 w-full" />
      </div>

      <Card v-else-if="errorMessage" class="border-destructive/50">
        <CardContent class="py-8 text-center">
          <p class="text-destructive">{{ errorMessage }}</p>
          <Button variant="outline" class="mt-4" @click="goBack">
            Back to Friends
          </Button>
        </CardContent>
      </Card>

      <Card v-else-if="profile">
        <CardContent class="p-6 space-y-4">
          <div class="flex items-center gap-4">
            <Avatar class="h-16 w-16">
              <AvatarImage v-if="avatarUrl" :src="avatarUrl" :alt="displayName" />
              <AvatarFallback>{{ initials }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0">
              <h2 class="text-xl font-semibold truncate">{{ displayName }}</h2>
              <p class="text-sm text-muted-foreground">@{{ profile.username }}</p>
              <span
                v-if="statusLabel"
                :class="[
                  'mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  statusClasses,
                ]"
              >
                {{ statusLabel }}
              </span>
            </div>
          </div>

          <div v-if="profile.bio" class="text-sm text-muted-foreground">
            {{ profile.bio }}
          </div>
        </CardContent>
      </Card>
    </ResponsiveContainer>
  </div>
</template>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>
