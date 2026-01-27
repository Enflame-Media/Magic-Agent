<script setup lang="ts">
/**
 * VoiceButton - Toggle Button for Voice Assistant
 *
 * A toggle button to start/stop voice sessions with loading states
 * and mute/unmute capability.
 *
 * Features:
 * - Start/stop voice session toggle
 * - Loading state during connection
 * - Mute/unmute capability
 * - Visual feedback for all states
 * - Accessible with ARIA attributes
 *
 * @see HAP-701 - Create voice UI components
 */

import { computed, type HTMLAttributes } from 'vue';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-vue-next';
import { useVoice } from '@/composables/useVoice';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import VoiceBars from './VoiceBars.vue';

interface Props {
  /** Session ID to start voice for */
  sessionId: string;
  /** Initial context for voice session */
  initialContext?: string;
  /** Button size variant */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Whether to show voice bars when active */
  showBars?: boolean;
  /** Whether to show mute button when active */
  showMuteButton?: boolean;
  /** Additional classes */
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  variant: 'outline',
  showBars: false,
  showMuteButton: false,
});

const {
  isActive,
  isConnecting,
  isSpeaking,
  isMuted,
  statusMessage,
  startSession,
  endSession,
  toggleMute,
} = useVoice();

// Determine button state
const isLoading = computed(() => isConnecting.value);

// Button icon based on state
const MainIcon = computed(() => {
  if (isLoading.value) return Loader2;
  if (isActive.value) return PhoneOff;
  return Phone;
});

// Mute button icon
const MuteIcon = computed(() => (isMuted.value ? MicOff : Mic));

// Button label for accessibility
const buttonLabel = computed(() => {
  if (isLoading.value) return 'Connecting voice...';
  if (isActive.value) return 'End voice session';
  return 'Start voice session';
});

// Mute button label
const muteLabel = computed(() =>
  isMuted.value ? 'Unmute microphone' : 'Mute microphone'
);

// Handle main button click
async function handleToggleVoice() {
  if (isLoading.value) return;

  if (isActive.value) {
    await endSession();
  } else {
    await startSession(props.sessionId, props.initialContext);
  }
}

// Handle mute button click
function handleToggleMute() {
  toggleMute();
}
</script>

<template>
  <div :class="cn('voice-button-container', props.class)">
    <!-- Main voice toggle button -->
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          :variant="isActive ? 'destructive' : variant"
          :size="size"
          :disabled="isLoading"
          :aria-label="buttonLabel"
          :aria-pressed="isActive"
          @click="handleToggleVoice"
        >
          <component
            :is="MainIcon"
            :class="[
              'h-4 w-4',
              isLoading && 'animate-spin',
              size !== 'icon' && 'mr-2',
            ]"
          />
          <template v-if="size !== 'icon'">
            {{ isActive ? 'End' : 'Voice' }}
          </template>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{{ statusMessage }}</p>
      </TooltipContent>
    </Tooltip>

    <!-- Voice bars indicator (optional) -->
    <VoiceBars
      v-if="showBars && isActive"
      :is-active="isSpeaking"
      size="small"
      class="ml-2"
    />

    <!-- Mute button (optional, shown when active) -->
    <Tooltip v-if="showMuteButton && isActive">
      <TooltipTrigger as-child>
        <Button
          :variant="isMuted ? 'secondary' : 'ghost'"
          size="icon"
          :aria-label="muteLabel"
          :aria-pressed="isMuted"
          @click="handleToggleMute"
          class="ml-1"
        >
          <component :is="MuteIcon" class="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{{ muteLabel }}</p>
      </TooltipContent>
    </Tooltip>
  </div>
</template>

<style scoped>
.voice-button-container {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
