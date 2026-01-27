<script setup lang="ts">
/**
 * Invitation List Component
 *
 * Displays pending email invitations with the ability to revoke or resend.
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Mail, Clock, X, RotateCw, Loader2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SessionShareInvitation, SessionSharePermission } from '@happy/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Props & Emits
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** List of invitations to display */
  invitations: SessionShareInvitation[];
  /** Whether the list is in a loading state */
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  'revoke': [invitationId: string];
  'resend': [invitationId: string];
}>();

// ─────────────────────────────────────────────────────────────────────────────
// Composables
// ─────────────────────────────────────────────────────────────────────────────

const { t, d } = useI18n();

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

/** Only show pending invitations */
const pendingInvitations = computed(() =>
  props.invitations.filter((inv) => inv.status === 'pending')
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPermissionLabel(permission: SessionSharePermission): string {
  return permission === 'view_and_chat'
    ? t('sharing.permission.viewAndChat')
    : t('sharing.permission.viewOnly');
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return d(date, 'short');
  } catch {
    return dateString;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleRevoke(invitationId: string): void {
  emit('revoke', invitationId);
}

function handleResend(invitationId: string): void {
  emit('resend', invitationId);
}
</script>

<template>
  <div v-if="pendingInvitations.length > 0" class="space-y-2">
    <!-- Section Header -->
    <div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      <Mail class="size-4" />
      <span>{{ t('sharing.invitations.title') }}</span>
      <span class="text-xs">({{ pendingInvitations.length }})</span>
    </div>

    <!-- Invitations List -->
    <div class="divide-y">
      <div
        v-for="invitation in pendingInvitations"
        :key="invitation.id"
        class="flex items-center gap-3 py-2"
      >
        <!-- Email Icon -->
        <div class="flex size-10 items-center justify-center rounded-full bg-muted">
          <Mail class="size-5 text-muted-foreground" />
        </div>

        <!-- Invitation Info -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">{{ invitation.email }}</p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" class="text-xs">
              {{ getPermissionLabel(invitation.permission) }}
            </Badge>
            <span class="flex items-center gap-1">
              <Clock class="size-3" />
              {{ t('sharing.invitations.expires', { date: formatDate(invitation.expiresAt) }) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <!-- Resend Button -->
          <Button
            variant="ghost"
            size="icon"
            class="size-8 text-muted-foreground hover:text-primary"
            :disabled="isLoading"
            @click="handleResend(invitation.id)"
          >
            <RotateCw class="size-4" />
            <span class="sr-only">{{ t('sharing.invitations.resend') }}</span>
          </Button>

          <!-- Revoke Button -->
          <Button
            variant="ghost"
            size="icon"
            class="size-8 text-muted-foreground hover:text-destructive"
            :disabled="isLoading"
            @click="handleRevoke(invitation.id)"
          >
            <X class="size-4" />
            <span class="sr-only">{{ t('sharing.invitations.revoke') }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
