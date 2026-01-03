<script setup lang="ts">
/**
 * Session Error Dialog
 *
 * Modal dialog displayed when a session revival fails.
 * Shows the session ID with copy button and archive option.
 *
 * @see HAP-736 - Handle "Method not found" errors with session revival flow
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { TriangleAlertIcon, CopyIcon } from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { RevivalFailedState } from '@/composables/useSessionRevival';

const props = defineProps<{
  /** Revival failure state, or null if no error */
  revivalFailed: RevivalFailedState | null;
}>();

const emit = defineEmits<{
  /** Emitted when the user clicks the copy button */
  copy: [];
  /** Emitted when the user clicks the archive button */
  archive: [];
  /** Emitted when the dialog is dismissed */
  dismiss: [];
}>();

const { t } = useI18n();

/** Whether the dialog should be open */
const isOpen = computed(() => props.revivalFailed !== null);

/** Truncate session ID for display if too long */
const displaySessionId = computed(() => {
  if (!props.revivalFailed) return '';
  const id = props.revivalFailed.sessionId;
  // Show full ID if short enough, otherwise truncate middle
  if (id.length <= 24) return id;
  return `${id.slice(0, 10)}...${id.slice(-10)}`;
});

function handleCopy(): void {
  emit('copy');
}

function handleArchive(): void {
  emit('archive');
}

function handleOpenChange(open: boolean): void {
  if (!open) {
    emit('dismiss');
  }
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent :show-close-button="true" class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <TriangleAlertIcon class="size-5 text-destructive" />
          {{ t('sessionRevival.failedTitle') }}
        </DialogTitle>
        <DialogDescription>
          {{ t('sessionRevival.failedDescription') }}
        </DialogDescription>
      </DialogHeader>

      <!-- Session ID display with copy button -->
      <div class="flex items-center justify-between gap-2 rounded-md bg-muted p-3">
        <code class="font-mono text-sm break-all" :title="revivalFailed?.sessionId">
          {{ displaySessionId }}
        </code>
        <Button
          variant="ghost"
          size="icon-sm"
          :title="t('common.copy')"
          @click="handleCopy"
        >
          <CopyIcon class="size-4" />
          <span class="sr-only">{{ t('common.copy') }}</span>
        </Button>
      </div>

      <!-- Error message if present -->
      <p v-if="revivalFailed?.error" class="text-sm text-muted-foreground">
        {{ revivalFailed.error }}
      </p>

      <DialogFooter class="flex-col gap-2 sm:flex-row">
        <Button variant="outline" @click="handleOpenChange(false)">
          {{ t('sessionRevival.dismiss') }}
        </Button>
        <Button variant="destructive" @click="handleArchive">
          {{ t('sessionRevival.archiveSession') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
