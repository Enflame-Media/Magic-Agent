<script setup lang="ts">
/**
 * Add People Section Component
 *
 * Provides friend search and email invitation functionality
 * for adding new people to share a session with.
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { UserPlus, Search, Mail, Loader2, Check } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import PermissionSelect from './PermissionSelect.vue';
import { useFriendSearch } from '@/composables/useFriendSearch';
import type { UserProfile, SessionSharePermission } from '@happy/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** User IDs to exclude from friend results (already shared) */
  excludeUserIds: string[];
  /** Whether the section is in a loading state */
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  'add-friend': [userId: string, permission: SessionSharePermission];
  'send-invitation': [email: string, permission: SessionSharePermission];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();

const excludeUserIdsRef = computed(() => props.excludeUserIds);
const {
  searchQuery,
  searchResults,
  isSearching,
  allFriends,
  loadFriends,
} = useFriendSearch(excludeUserIdsRef);

// ─────────────────────────────────────────────────────────────────────────────
// Local State
// ─────────────────────────────────────────────────────────────────────────────

const emailInput = ref('');
const selectedPermission = ref<SessionSharePermission>('view_only');
const showEmailInput = ref(false);
const addingUserId = ref<string | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

/** Whether the email is valid */
const isValidEmail = computed(() => {
  const email = emailInput.value.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
});

/** Whether we're showing search results vs all friends */
const isFiltering = computed(() => searchQuery.value.length > 0);

/** Friends to display (either search results or all) */
const displayFriends = computed(() => {
  return isFiltering.value ? searchResults.value : allFriends.value;
});

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

onMounted(() => {
  void loadFriends();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getDisplayName(friend: UserProfile): string {
  const fullName = [friend.firstName, friend.lastName].filter(Boolean).join(' ');
  return fullName || friend.username;
}

function getInitials(friend: UserProfile): string {
  if (friend.firstName && friend.lastName) {
    return `${friend.firstName[0]}${friend.lastName[0]}`.toUpperCase();
  }
  return friend.username.slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

async function handleAddFriend(friend: UserProfile): Promise<void> {
  addingUserId.value = friend.id;
  emit('add-friend', friend.id, selectedPermission.value);
  // Parent will handle the loading state
  setTimeout(() => {
    addingUserId.value = null;
  }, 500);
}

function handleSendInvitation(): void {
  if (!isValidEmail.value) return;

  emit('send-invitation', emailInput.value.trim(), selectedPermission.value);
  emailInput.value = '';
  showEmailInput.value = false;
}

function toggleEmailInput(): void {
  showEmailInput.value = !showEmailInput.value;
  if (!showEmailInput.value) {
    emailInput.value = '';
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Section Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UserPlus class="size-4 text-muted-foreground" />
        <Label class="font-medium">{{ t('sharing.addPeople.title') }}</Label>
      </div>
      <PermissionSelect
        v-model="selectedPermission"
        size="sm"
      />
    </div>

    <!-- Friend Search -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="searchQuery"
        :placeholder="t('sharing.addPeople.searchPlaceholder')"
        class="pl-9"
        :disabled="isLoading"
      />
      <Loader2
        v-if="isSearching"
        class="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
      />
    </div>

    <!-- Friends List -->
    <ScrollArea v-if="displayFriends.length > 0" class="h-48">
      <div class="space-y-1 pr-4">
        <button
          v-for="friend in displayFriends"
          :key="friend.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted"
          :disabled="isLoading || addingUserId === friend.id"
          @click="handleAddFriend(friend)"
        >
          <Avatar class="size-8">
            <AvatarImage
              v-if="friend.avatar?.url"
              :src="friend.avatar.url"
              :alt="getDisplayName(friend)"
            />
            <AvatarFallback>{{ getInitials(friend) }}</AvatarFallback>
          </Avatar>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ getDisplayName(friend) }}</p>
            <p class="text-xs text-muted-foreground truncate">@{{ friend.username }}</p>
          </div>
          <div v-if="addingUserId === friend.id" class="size-5">
            <Loader2 class="size-5 animate-spin text-primary" />
          </div>
          <Check
            v-else
            class="size-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
      </div>
    </ScrollArea>

    <!-- Empty State -->
    <div
      v-else-if="!isSearching && allFriends.length === 0"
      class="py-6 text-center text-sm text-muted-foreground"
    >
      {{ t('sharing.addPeople.noFriends') }}
    </div>

    <!-- No Search Results -->
    <div
      v-else-if="isFiltering && displayFriends.length === 0"
      class="py-6 text-center text-sm text-muted-foreground"
    >
      {{ t('sharing.addPeople.noResults') }}
    </div>

    <!-- Separator -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <span class="w-full border-t" />
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-background px-2 text-muted-foreground">
          {{ t('sharing.addPeople.or') }}
        </span>
      </div>
    </div>

    <!-- Email Invitation -->
    <div v-if="showEmailInput" class="space-y-3">
      <div class="flex gap-2">
        <Input
          v-model="emailInput"
          type="email"
          :placeholder="t('sharing.addPeople.emailPlaceholder')"
          :disabled="isLoading"
          @keyup.enter="handleSendInvitation"
        />
        <Button
          :disabled="!isValidEmail || isLoading"
          @click="handleSendInvitation"
        >
          {{ t('sharing.addPeople.sendInvite') }}
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground"
        @click="toggleEmailInput"
      >
        {{ t('common.cancel') }}
      </Button>
    </div>

    <!-- Invite by Email Button -->
    <Button
      v-else
      variant="outline"
      class="w-full"
      @click="toggleEmailInput"
    >
      <Mail class="mr-2 size-4" />
      {{ t('sharing.addPeople.inviteByEmail') }}
    </Button>
  </div>
</template>
