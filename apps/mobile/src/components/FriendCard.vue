<script setup lang="ts">
/**
 * FriendCard Component - Display a single friend/user in a list
 *
 * Shows user avatar, name, username, and action buttons based on
 * relationship status.
 */

import { computed } from 'vue';
import { type UserProfile, getDisplayName, isPendingRequest, isFriend } from '@/services/friends';

const props = defineProps<{
  user: UserProfile;
  isProcessing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'tap'): void;
  (e: 'accept'): void;
  (e: 'reject'): void;
  (e: 'block'): void;
}>();

const displayName = computed(() => getDisplayName(props.user));
const isPending = computed(() => isPendingRequest(props.user.status));
const isAcceptedFriend = computed(() => isFriend(props.user.status));
const avatarUrl = computed(() => props.user.avatar?.url ?? '');

function onTap() {
  emit('tap');
}

function onAccept() {
  emit('accept');
}

function onReject() {
  emit('reject');
}

function onBlock() {
  emit('block');
}
</script>

<template>
  <GridLayout
    rows="auto"
    columns="48, *, auto"
    class="friend-card"
    @tap="onTap"
    @longPress="isAcceptedFriend ? onBlock() : undefined"
  >
    <!-- Avatar -->
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
      :text="displayName.charAt(0).toUpperCase()"
      class="avatar-placeholder"
    />

    <!-- Name and username -->
    <StackLayout col="1" class="info">
      <Label :text="displayName" class="name" />
      <Label :text="'@' + user.username" class="username" />
    </StackLayout>

    <!-- Action buttons for pending requests -->
    <StackLayout
      v-if="isPending"
      col="2"
      orientation="horizontal"
      class="actions"
    >
      <Button
        text="Accept"
        class="btn-accept"
        :isEnabled="!isProcessing"
        @tap="onAccept"
      />
      <Button
        text="Decline"
        class="btn-reject"
        :isEnabled="!isProcessing"
        @tap="onReject"
      />
    </StackLayout>

    <!-- Activity indicator when processing -->
    <ActivityIndicator
      v-if="isProcessing"
      col="2"
      :busy="true"
      class="activity"
    />
  </GridLayout>
</template>

<style scoped>
.friend-card {
  padding: 12;
  background-color: #ffffff;
  margin-bottom: 1;
}

.avatar {
  width: 48;
  height: 48;
  border-radius: 24;
  background-color: #e0e0e0;
}

.avatar-placeholder {
  width: 48;
  height: 48;
  border-radius: 24;
  background-color: #6366f1;
  color: #ffffff;
  font-size: 20;
  font-weight: bold;
  text-align: center;
  vertical-align: middle;
}

.info {
  margin-left: 12;
  vertical-align: center;
}

.name {
  font-size: 16;
  font-weight: 600;
  color: #1f2937;
}

.username {
  font-size: 14;
  color: #6b7280;
  margin-top: 2;
}

.actions {
  vertical-align: center;
}

.btn-accept {
  background-color: #10b981;
  color: #ffffff;
  font-size: 14;
  padding: 8 16;
  border-radius: 8;
  margin-right: 8;
}

.btn-reject {
  background-color: #ef4444;
  color: #ffffff;
  font-size: 14;
  padding: 8 16;
  border-radius: 8;
}

.activity {
  width: 24;
  height: 24;
}
</style>
