<script setup lang="ts">
/**
 * Friend Profile View (Mobile)
 *
 * Shows a lightweight profile for a friend using existing friends services.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { Frame } from '@nativescript/core';
import { useFriends } from '@/composables/useFriends';
import { friendsService, type UserProfile, getDisplayName } from '@/services/friends';

const props = defineProps<{
  userId?: string;
}>();

const { getFriend } = useFriends();

const profile = ref<UserProfile | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);

const displayName = computed(() => (profile.value ? getDisplayName(profile.value) : 'Profile'));
const avatarUrl = computed(() => profile.value?.avatar?.url ?? '');
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

const statusClass = computed(() => {
  if (!profile.value) return '';
  switch (profile.value.status) {
    case 'friend':
      return 'status-friend';
    case 'pending':
      return 'status-pending';
    case 'requested':
      return 'status-requested';
    case 'rejected':
      return 'status-blocked';
    default:
      return 'status-none';
  }
});

function navigateBack(): void {
  const frame = Frame.topmost();
  if (frame?.canGoBack()) {
    frame.goBack();
  }
}

async function loadProfile(): Promise<void> {
  if (!props.userId) {
    errorMessage.value = 'Profile not found.';
    profile.value = null;
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  const cached = getFriend(props.userId);
  if (cached) {
    profile.value = cached;
    isLoading.value = false;
    return;
  }

  try {
    const fetched = await friendsService.getUserProfile(props.userId);
    if (!fetched) {
      errorMessage.value = 'This profile is unavailable or you no longer have access.';
      profile.value = null;
    } else {
      profile.value = fetched;
    }
  } catch (error) {
    errorMessage.value = 'Unable to load profile right now.';
    profile.value = null;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadProfile();
});

watch(
  () => props.userId,
  () => {
    void loadProfile();
  }
);
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar :title="displayName">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" @tap="navigateBack" />
    </ActionBar>

    <GridLayout rows="*" class="profile-container">
      <ActivityIndicator v-if="isLoading" :busy="true" class="loading" />

      <StackLayout v-else-if="errorMessage" class="error-state">
        <Label :text="errorMessage" class="error-title" textWrap="true" />
        <Button text="Back to Friends" class="btn-back" @tap="navigateBack" />
      </StackLayout>

      <StackLayout v-else-if="profile" class="profile-card">
        <GridLayout columns="72, *" class="profile-header">
          <Image
            v-if="avatarUrl"
            col="0"
            :src="avatarUrl"
            class="avatar"
            stretch="aspectFill"
          />
          <Label
            v-else
            col="0"
            :text="initials"
            class="avatar-placeholder"
          />
          <StackLayout col="1" class="profile-info">
            <Label :text="displayName" class="profile-name" />
            <Label :text="'@' + profile.username" class="profile-username" />
            <Label
              v-if="statusLabel"
              :text="statusLabel"
              :class="['status-pill', statusClass]"
            />
          </StackLayout>
        </GridLayout>

        <Label
          v-if="profile.bio"
          :text="profile.bio"
          class="profile-bio"
          textWrap="true"
        />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<style scoped>
.profile-container {
  padding: 16;
}

.loading {
  width: 48;
  height: 48;
  horizontal-align: center;
  vertical-align: center;
}

.profile-card {
  padding: 16;
  background-color: #ffffff;
  border-radius: 12;
  box-shadow: 0 4 16 rgba(0, 0, 0, 0.06);
}

.profile-header {
  margin-bottom: 16;
}

.avatar {
  width: 64;
  height: 64;
  border-radius: 32;
  background-color: #e5e7eb;
}

.avatar-placeholder {
  width: 64;
  height: 64;
  border-radius: 32;
  background-color: #6366f1;
  color: #ffffff;
  font-size: 24;
  font-weight: 600;
  text-align: center;
  vertical-align: middle;
}

.profile-info {
  margin-left: 12;
  vertical-align: center;
}

.profile-name {
  font-size: 20;
  font-weight: 600;
  color: #111827;
}

.profile-username {
  font-size: 14;
  color: #6b7280;
  margin-top: 4;
}

.status-pill {
  margin-top: 8;
  font-size: 12;
  padding: 4 10;
  border-radius: 999;
  text-transform: uppercase;
  letter-spacing: 0.5;
  width: fit-content;
}

.status-friend {
  background-color: #d1fae5;
  color: #065f46;
}

.status-pending {
  background-color: #fef3c7;
  color: #92400e;
}

.status-requested {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-blocked {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-none {
  background-color: #e5e7eb;
  color: #374151;
}

.profile-bio {
  font-size: 14;
  color: #374151;
  line-height: 20;
}

.error-state {
  padding: 24;
  horizontal-align: center;
  vertical-align: center;
}

.error-title {
  font-size: 16;
  font-weight: 600;
  color: #ef4444;
  text-align: center;
  margin-bottom: 12;
}

.btn-back {
  background-color: #6366f1;
  color: #ffffff;
  padding: 12 20;
  border-radius: 8;
}
</style>
