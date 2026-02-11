<script setup lang="ts">
/**
 * RevivalCooldownBanner - HAP-870
 *
 * Displays a banner when session revival is temporarily paused due to
 * circuit breaker cooldown. Shows a countdown timer indicating when
 * revival will be available again.
 *
 * This banner is shown when the CLI emits a 'session-revival-paused' event,
 * indicating that too many revival failures have occurred and the system
 * is in a cooldown period to prevent cascading failures.
 *
 * @see HAP-867 - React Native reference implementation
 * @see HAP-869 - useRevivalCooldown composable
 */
import { computed } from 'vue';
import { PauseCircle, X } from 'lucide-vue-next';

interface Props {
  /** Remaining seconds until cooldown expires */
  remainingSeconds: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  /** Called when user dismisses the banner */
  dismiss: [];
}>();

const description = computed(() =>
  `Revival paused for ${props.remainingSeconds} second${props.remainingSeconds === 1 ? '' : 's'}`
);
</script>

<template>
  <div
    class="w-full bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800"
  >
    <div class="max-w-4xl mx-auto px-4 py-3">
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center"
        >
          <PauseCircle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>

        <!-- Text content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-foreground">
            Revival Paused
          </p>
          <p class="text-sm text-muted-foreground">
            {{ description }}
          </p>
        </div>

        <!-- Dismiss button -->
        <button
          type="button"
          class="flex-shrink-0 p-1 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors"
          @click="emit('dismiss')"
        >
          <X class="w-4 h-4 text-muted-foreground" />
          <span class="sr-only">Dismiss</span>
        </button>
      </div>
    </div>
  </div>
</template>
