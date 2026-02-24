<!--
  HAP-1048: ACP Session Browser Component

  Panel listing available ACP sessions with load, resume, and fork actions.
  Actions are gated by agent capabilities. The active session is visually
  distinguished. Supports loading/empty states and confirmation before
  switching away from an active session.
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AcpBrowserSession, AcpSessionBrowserCapabilities } from '@/stores/acpTypes';

const props = defineProps<{
  sessions: AcpBrowserSession[];
  capabilities: AcpSessionBrowserCapabilities;
  activeSessionId: string | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  load: [sessionId: string];
  resume: [sessionId: string];
  fork: [sessionId: string];
}>();

const { t } = useI18n();

// ─── Confirmation Dialog ────────────────────────────────────────────────────

const confirmOpen = ref(false);
const confirmAction = ref<{ type: 'load' | 'resume'; sessionId: string } | null>(null);

function requestAction(type: 'load' | 'resume', sessionId: string) {
  if (props.activeSessionId && props.activeSessionId !== sessionId) {
    confirmAction.value = { type, sessionId };
    confirmOpen.value = true;
  } else {
    performAction(type, sessionId);
  }
}

function performAction(type: 'load' | 'resume', sessionId: string) {
  if (type === 'load') emit('load', sessionId);
  else emit('resume', sessionId);
}

function handleConfirm() {
  if (confirmAction.value) {
    performAction(confirmAction.value.type, confirmAction.value.sessionId);
  }
  confirmOpen.value = false;
  confirmAction.value = null;
}

function handleCancel() {
  confirmOpen.value = false;
  confirmAction.value = null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSessionDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('acp.sessionBrowser.justNow');
    if (diffMins < 60) return t('acp.sessionBrowser.minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t('acp.sessionBrowser.hoursAgo', { count: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    return t('acp.sessionBrowser.daysAgo', { count: diffDays });
  } catch {
    return '';
  }
}

const hasActions = computed(() =>
  props.capabilities.canLoadSession ||
  props.capabilities.canResumeSession ||
  props.capabilities.canForkSession
);
</script>

<template>
  <div class="flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 pt-4 pb-3">
      <h3 class="text-lg font-bold">{{ t('acp.sessionBrowser.title') }}</h3>
      <Button
        variant="ghost"
        size="sm"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <svg
          class="h-4 w-4"
          :class="loading ? 'animate-spin' : ''"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 16h5v5"/>
        </svg>
      </Button>
    </div>

    <!-- Loading state -->
    <div v-if="loading && sessions.length === 0" class="flex items-center justify-center py-10">
      <svg class="h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="sessions.length === 0"
      class="flex flex-col items-center justify-center py-10 px-8 text-center"
    >
      <svg class="h-12 w-12 text-muted-foreground/50 mb-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M2 8h20"/>
        <path d="M2 12h20"/>
      </svg>
      <p class="font-medium">{{ t('acp.sessionBrowser.emptyTitle') }}</p>
      <p class="text-sm text-muted-foreground mt-1">
        {{ t('acp.sessionBrowser.emptyDescription') }}
      </p>
    </div>

    <!-- Session list -->
    <ScrollArea v-else class="px-4 pb-4">
      <div class="space-y-2">
        <div
          v-for="session in sessions"
          :key="session.sessionId"
          class="rounded-xl border bg-card p-3.5 transition-colors"
          :class="session.isActive ? 'border-primary' : 'border-border'"
        >
          <div class="space-y-0.5">
            <div class="flex items-center justify-between">
              <p class="font-medium truncate mr-2">{{ session.title }}</p>
              <Badge
                v-if="session.isActive"
                variant="default"
                class="shrink-0 text-[10px] px-1.5 py-0"
              >
                <span class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                {{ t('acp.sessionBrowser.active') }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground font-mono truncate">
              {{ session.cwd }}
            </p>
            <p v-if="session.updatedAt" class="text-[11px] text-muted-foreground">
              {{ formatSessionDate(session.updatedAt) }}
            </p>
          </div>

          <!-- Actions -->
          <div
            v-if="hasActions && !session.isActive"
            class="flex gap-2 mt-2.5 pt-2.5 border-t"
          >
            <Button
              v-if="capabilities.canLoadSession"
              variant="ghost"
              size="sm"
              class="h-7 text-xs"
              @click="requestAction('load', session.sessionId)"
            >
              <svg class="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {{ t('acp.sessionBrowser.load') }}
            </Button>
            <Button
              v-if="capabilities.canResumeSession"
              variant="ghost"
              size="sm"
              class="h-7 text-xs"
              @click="requestAction('resume', session.sessionId)"
            >
              <svg class="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {{ t('acp.sessionBrowser.resume') }}
            </Button>
            <Button
              v-if="capabilities.canForkSession"
              variant="ghost"
              size="sm"
              class="h-7 text-xs"
              @click="emit('fork', session.sessionId)"
            >
              <svg class="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="18" r="3"/>
                <circle cx="6" cy="6" r="3"/>
                <circle cx="18" cy="6" r="3"/>
                <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/>
                <path d="M12 12v3"/>
              </svg>
              {{ t('acp.sessionBrowser.fork') }}
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>

    <!-- Confirmation dialog -->
    <AlertDialog :open="confirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('acp.sessionBrowser.switchSessionTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('acp.sessionBrowser.switchSessionMessage') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="handleCancel">
            {{ t('common.cancel') }}
          </AlertDialogCancel>
          <AlertDialogAction @click="handleConfirm">
            {{ t('common.continue') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
