<!--
  HAP-1048: ACP Permission Dialog Component

  Modal dialog displaying a permission request from the CLI agent.
  Shows tool details, file locations, and 4 action buttons
  (allow once, allow always, reject once, reject always).
  Includes timeout countdown and expired state handling.
  Requests browser notification permission for incoming requests.
-->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AcpPermissionRequestState, AcpPermissionDecision } from '@/stores/acpTypes';
import type { AcpPermissionOptionKind } from '@magic-agent/protocol';

const props = defineProps<{
  /** The current pending permission request, or null when none */
  request: AcpPermissionRequestState | null;
  /** Total number of pending requests in the queue */
  queueCount: number;
  /** History of resolved permission decisions */
  history: AcpPermissionDecision[];
}>();

const emit = defineEmits<{
  selectOption: [requestId: string, optionId: string];
}>();

const { t } = useI18n();

const showRawInput = ref(false);
const showHistory = ref(false);

// ─── Timeout Countdown ─────────────────────────────────────────────────────

const secondsLeft = ref<number | null>(null);
let countdownInterval: ReturnType<typeof setInterval> | null = null;

function startCountdown(timeoutAt: number | null) {
  stopCountdown();
  if (timeoutAt == null) {
    secondsLeft.value = null;
    return;
  }
  const update = () => {
    secondsLeft.value = Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000));
  };
  update();
  countdownInterval = setInterval(update, 1000);
}

function stopCountdown() {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

watch(
  () => props.request?.requestId,
  () => {
    showRawInput.value = false;
    if (props.request) {
      startCountdown(props.request.timeoutAt);
      sendBrowserNotification(props.request.toolCall.title);
    } else {
      stopCountdown();
    }
  },
  { immediate: true }
);

onUnmounted(stopCountdown);

const isExpired = computed(() => {
  if (!props.request) return false;
  return props.request.status === 'expired' || (secondsLeft.value !== null && secondsLeft.value <= 0);
});

const isOpen = computed(() => props.request !== null);

// ─── Browser Notifications ──────────────────────────────────────────────────

function sendBrowserNotification(toolTitle: string) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    new Notification(t('acp.permission.title'), {
      body: toolTitle,
      tag: 'acp-permission',
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isAllowOption(kind: AcpPermissionOptionKind): boolean {
  return kind === 'allow_once' || kind === 'allow_always';
}

function formatRawInput(rawInput: unknown): string | null {
  if (rawInput == null) return null;
  if (typeof rawInput === 'string') return rawInput;
  try {
    return JSON.stringify(rawInput, null, 2);
  } catch {
    return String(rawInput);
  }
}

function sortedOptions() {
  if (!props.request) return [];
  const order: Record<string, number> = {
    allow_once: 0,
    allow_always: 1,
    reject_once: 2,
    reject_always: 3,
  };
  return [...props.request.options].sort(
    (a, b) => (order[a.kind] ?? 4) - (order[b.kind] ?? 4)
  );
}

function handleSelectOption(optionId: string) {
  if (!props.request || isExpired.value) return;
  emit('selectOption', props.request.requestId, optionId);
}

function formatDecisionTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <Dialog :open="isOpen">
    <DialogContent
      class="sm:max-w-lg"
      @pointer-down-outside="(e: Event) => e.preventDefault()"
      @escape-key-down="(e: Event) => e.preventDefault()"
    >
      <DialogHeader>
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <svg class="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 12 15 15 9" />
            </svg>
          </div>
          <div class="flex flex-1 items-center gap-2">
            <DialogTitle>{{ t('acp.permission.title') }}</DialogTitle>
            <Badge v-if="queueCount > 1" variant="secondary" class="text-xs">
              {{ t('acp.permission.queueCount', { count: queueCount }) }}
            </Badge>
          </div>
          <Badge
            v-if="secondsLeft !== null && !isExpired"
            :variant="secondsLeft <= 10 ? 'destructive' : 'outline'"
            class="tabular-nums"
          >
            {{ secondsLeft }}s
          </Badge>
        </div>
        <DialogDescription>
          {{ t('acp.permission.description') }}
        </DialogDescription>
      </DialogHeader>

      <!-- Expired banner -->
      <div
        v-if="isExpired"
        class="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <svg class="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        {{ t('acp.permission.expired') }}
      </div>

      <!-- Tool details -->
      <div v-if="request" class="rounded-lg border bg-muted/50 p-3">
        <div class="flex items-start gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background">
            <svg class="h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium leading-snug">{{ request.toolCall.title }}</p>
            <p v-if="request.toolCall.kind" class="text-xs text-muted-foreground capitalize mt-0.5">
              {{ request.toolCall.kind }}
            </p>
          </div>
        </div>

        <!-- File locations -->
        <div
          v-if="request.toolCall.locations && request.toolCall.locations.length > 0"
          class="mt-2 space-y-1"
        >
          <div
            v-for="(loc, idx) in request.toolCall.locations"
            :key="idx"
            class="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <svg class="h-3 w-3 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span class="truncate font-mono">
              {{ loc.path }}{{ loc.line != null ? `:${loc.line}` : '' }}
            </span>
          </div>
        </div>

        <!-- Raw input (collapsible) -->
        <button
          v-if="formatRawInput(request.toolCall.rawInput)"
          class="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          @click="showRawInput = !showRawInput"
        >
          <svg
            class="h-3 w-3 transition-transform"
            :class="showRawInput ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          {{ t('acp.permission.rawInput') }}
        </button>
        <ScrollArea v-if="showRawInput" class="mt-1 max-h-28 rounded-md bg-background p-2">
          <pre class="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-all">{{ formatRawInput(request.toolCall.rawInput) }}</pre>
        </ScrollArea>
      </div>

      <!-- Permission option buttons -->
      <div v-if="request && !isExpired" class="grid grid-cols-2 gap-2">
        <Button
          v-for="option in sortedOptions()"
          :key="option.optionId"
          :variant="isAllowOption(option.kind) ? 'default' : 'outline'"
          :class="[
            !isAllowOption(option.kind) && 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive',
          ]"
          size="sm"
          @click="handleSelectOption(option.optionId)"
        >
          {{ option.name }}
        </Button>
      </div>

      <!-- Permission history toggle -->
      <div v-if="history.length > 0" class="border-t pt-3">
        <button
          class="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          @click="showHistory = !showHistory"
        >
          <span>{{ t('acp.permission.historyTitle', { count: history.length }) }}</span>
          <svg
            class="h-3 w-3 transition-transform"
            :class="showHistory ? 'rotate-180' : ''"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <ScrollArea v-if="showHistory" class="mt-2 max-h-40">
          <div class="space-y-1.5">
            <div
              v-for="decision in history"
              :key="decision.requestId"
              class="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-xs"
            >
              <div class="flex items-center gap-2 min-w-0">
                <Badge
                  :variant="decision.outcome === 'selected' && decision.selectedOption && isAllowOption(decision.selectedOption.kind) ? 'default' : 'destructive'"
                  class="text-[10px] px-1.5 py-0"
                >
                  {{ decision.selectedOption?.name ?? decision.outcome }}
                </Badge>
                <span class="truncate text-muted-foreground">{{ decision.toolTitle }}</span>
              </div>
              <span class="text-muted-foreground shrink-0 ml-2">
                {{ formatDecisionTime(decision.decidedAt) }}
              </span>
            </div>
          </div>
        </ScrollArea>
      </div>

      <DialogFooter v-if="isExpired">
        <p class="text-xs text-muted-foreground">
          {{ t('acp.permission.expiredHint') }}
        </p>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
