<script setup lang="ts">
/**
 * Share Session Modal Component
 *
 * Main modal for managing session sharing. Provides a complete interface for:
 * - Viewing and managing current shares
 * - Configuring URL sharing with optional password
 * - Adding friends or sending email invitations
 * - Managing pending invitations
 *
 * @example
 * ```vue
 * <ShareSessionModal
 *   v-model:open="isShareModalOpen"
 *   :session-id="currentSessionId"
 * />
 * ```
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Share2, Loader2 } from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import ShareList from './ShareList.vue';
import UrlSharingSection from './UrlSharingSection.vue';
import AddPeopleSection from './AddPeopleSection.vue';
import InvitationList from './InvitationList.vue';
import { useSessionSharing } from '@/composables/useSessionSharing';
import type { SessionSharePermission } from '@happy-vue/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Whether the modal is open */
  open: boolean;
  /** The session ID to manage sharing for */
  sessionId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const { t } = useI18n();

const sessionIdRef = computed(() => props.sessionId);
const {
  shares,
  urlConfig,
  invitations,
  isLoading,
  isAdding,
  isUpdatingUrl,
  shareableUrl,
  loadSharing,
  addShare,
  updatePermission,
  removeShare,
  configureUrlSharing,
  sendInvitation,
  revokeInvitation,
  resendInvitation,
  copyShareableUrl,
} = useSessionSharing(sessionIdRef);

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

/** User IDs of people who already have access */
const existingUserIds = computed(() =>
  shares.value.map((share) => share.userId)
);

/** Whether any operation is in progress */
const isBusy = computed(() => isLoading.value || isAdding.value || isUpdatingUrl.value);

// ─────────────────────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────────────────────

// Load sharing when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.sessionId) {
      void loadSharing();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleOpenChange(open: boolean): void {
  emit('update:open', open);
}

async function handleUpdatePermission(
  shareId: string,
  permission: SessionSharePermission
): Promise<void> {
  await updatePermission(shareId, permission);
}

async function handleRemoveShare(shareId: string): Promise<void> {
  await removeShare(shareId);
}

async function handleUrlConfigUpdate(
  enabled: boolean,
  password: string | null,
  permission: SessionSharePermission
): Promise<void> {
  await configureUrlSharing(enabled, password, permission);
}

async function handleCopyUrl(): Promise<void> {
  await copyShareableUrl();
}

async function handleAddFriend(
  userId: string,
  permission: SessionSharePermission
): Promise<void> {
  await addShare(userId, permission);
}

async function handleSendInvitation(
  email: string,
  permission: SessionSharePermission
): Promise<void> {
  await sendInvitation(email, permission);
}

async function handleRevokeInvitation(invitationId: string): Promise<void> {
  await revokeInvitation(invitationId);
}

async function handleResendInvitation(invitationId: string): Promise<void> {
  await resendInvitation(invitationId);
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-md max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Share2 class="size-5" />
          {{ t('sharing.modal.title') }}
        </DialogTitle>
        <DialogDescription>
          {{ t('sharing.modal.description') }}
        </DialogDescription>
      </DialogHeader>

      <!-- Loading Skeleton -->
      <div v-if="isLoading && shares.length === 0" class="space-y-4 py-4">
        <Skeleton class="h-12 w-full" />
        <Skeleton class="h-12 w-full" />
        <Skeleton class="h-24 w-full" />
      </div>

      <!-- Content -->
      <ScrollArea v-else class="flex-1 -mx-6 px-6">
        <div class="space-y-6 py-4">
          <!-- Current Shares -->
          <ShareList
            :shares="shares"
            :is-loading="isBusy"
            @update:permission="handleUpdatePermission"
            @remove="handleRemoveShare"
          />

          <Separator />

          <!-- Pending Invitations -->
          <InvitationList
            :invitations="invitations"
            :is-loading="isBusy"
            @revoke="handleRevokeInvitation"
            @resend="handleResendInvitation"
          />

          <Separator v-if="invitations.length > 0" />

          <!-- URL Sharing -->
          <UrlSharingSection
            :url-config="urlConfig"
            :shareable-url="shareableUrl"
            :is-loading="isBusy"
            @update:config="handleUrlConfigUpdate"
            @copy-url="handleCopyUrl"
          />

          <Separator />

          <!-- Add People -->
          <AddPeopleSection
            :exclude-user-ids="existingUserIds"
            :is-loading="isBusy"
            @add-friend="handleAddFriend"
            @send-invitation="handleSendInvitation"
          />
        </div>
      </ScrollArea>

      <!-- Loading Indicator -->
      <div
        v-if="isBusy && !isLoading"
        class="absolute bottom-4 right-4"
      >
        <Loader2 class="size-5 animate-spin text-muted-foreground" />
      </div>
    </DialogContent>
  </Dialog>
</template>
