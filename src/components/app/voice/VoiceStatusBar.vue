<script setup lang="ts">
/**
 * VoiceStatusBar - Voice Assistant Status Indicator
 *
 * Displays the current state of the voice assistant.
 * Ported from happy-app VoiceAssistantStatusBar.tsx component.
 *
 * Features:
 * - Multiple display variants: floating, full, sidebar
 * - Status indicators for connecting, connected, error states
 * - Expandable floating pill with controls
 * - Accessible with ARIA attributes
 *
 * @see HAP-701 - Create voice UI components
 */

import { ref, computed, type HTMLAttributes } from 'vue';
import { Mic, MicOff, AlertCircle, X, XCircle } from 'lucide-vue-next';
import { useVoice } from '@/composables/useVoice';
import { cn } from '@/lib/utils';
import VoiceBars from './VoiceBars.vue';

interface Props {
  /**
   * Display variant:
   * - 'floating': Minimal floating pill indicator (default)
   * - 'full': Full-width status bar
   * - 'sidebar': Compact bar for sidebar
   */
  variant?: 'floating' | 'full' | 'sidebar';
  /** Additional classes */
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'floating',
});

const { isActive, isConnecting, isSpeaking, hasError, endSession } = useVoice();

// Expanded state for floating variant
const isExpanded = ref(false);

// Determine current status
type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
const currentStatus = computed<VoiceStatus>(() => {
  if (hasError.value) return 'error';
  if (isConnecting.value) return 'connecting';
  if (isActive.value) return 'connected';
  return 'disconnected';
});

// Status display configuration
interface StatusInfo {
  dotColor: string;
  bgColor: string;
  textColor: string;
  isPulsing: boolean;
  text: string;
  shortText: string;
  iconName: 'mic' | 'mic-outline' | 'alert-circle';
}

const statusInfo = computed<StatusInfo>(() => {
  switch (currentStatus.value) {
    case 'connecting':
      return {
        dotColor: 'bg-yellow-500',
        bgColor: 'bg-muted',
        textColor: 'text-foreground',
        isPulsing: true,
        text: 'Connecting...',
        shortText: '',
        iconName: 'mic-outline',
      };
    case 'connected':
      return {
        dotColor: 'bg-green-500',
        bgColor: 'bg-muted',
        textColor: 'text-foreground',
        isPulsing: false,
        text: 'Voice Active',
        shortText: 'Active',
        iconName: 'mic',
      };
    case 'error':
      return {
        dotColor: 'bg-red-500',
        bgColor: 'bg-muted',
        textColor: 'text-foreground',
        isPulsing: false,
        text: 'Connection Error',
        shortText: 'Error',
        iconName: 'alert-circle',
      };
    default:
      return {
        dotColor: 'bg-gray-400',
        bgColor: 'bg-muted',
        textColor: 'text-foreground',
        isPulsing: false,
        text: 'Disconnected',
        shortText: '',
        iconName: 'mic',
      };
  }
});

// Actions
async function handleStopVoice() {
  if (isActive.value || isConnecting.value) {
    try {
      await endSession();
    } catch (error) {
      console.error('Error stopping voice session:', error);
    }
  }
}

function handleToggleExpand() {
  isExpanded.value = !isExpanded.value;
}

function handleFloatingPress() {
  handleToggleExpand();
}

async function handleFloatingLongPress() {
  await handleStopVoice();
}

// Dynamic icon component based on status
const StatusIcon = computed(() => {
  switch (statusInfo.value.iconName) {
    case 'alert-circle':
      return AlertCircle;
    case 'mic-outline':
      return MicOff;
    default:
      return Mic;
  }
});
</script>

<template>
  <!-- Don't render if disconnected -->
  <template v-if="currentStatus !== 'disconnected'">
    <!-- Floating variant - minimal pill indicator -->
    <div
      v-if="variant === 'floating'"
      :class="cn('voice-status-floating-container', props.class)"
    >
      <button
        class="voice-status-floating-pill"
        :class="statusInfo.bgColor"
        @click="handleFloatingPress"
        @keydown.enter="handleFloatingLongPress"
        :aria-label="statusInfo.text"
        :aria-expanded="isExpanded"
        role="button"
      >
        <!-- Status dot -->
        <span
          :class="[
            'voice-status-dot',
            statusInfo.dotColor,
            statusInfo.isPulsing && 'animate-pulse',
          ]"
        />

        <!-- Icon -->
        <component
          :is="StatusIcon"
          :class="['voice-status-icon', statusInfo.textColor]"
        />

        <!-- Voice bars (shown when speaking) -->
        <VoiceBars
          v-if="isActive && isSpeaking"
          :is-active="isSpeaking"
          size="small"
          class="ml-1"
        />

        <!-- Expandable content -->
        <div
          class="voice-status-expanded-content"
          :class="{ 'voice-status-expanded': isExpanded }"
        >
          <span :class="['voice-status-text', statusInfo.textColor]">
            {{ statusInfo.shortText || statusInfo.text }}
          </span>
          <button
            class="voice-status-close-button"
            @click.stop="handleStopVoice"
            aria-label="End voice session"
          >
            <XCircle :class="['h-4 w-4', statusInfo.textColor]" />
          </button>
        </div>
      </button>
    </div>

    <!-- Full variant - legacy full-width version -->
    <div
      v-else-if="variant === 'full'"
      :class="cn('voice-status-full', statusInfo.bgColor, props.class)"
    >
      <button
        class="voice-status-full-pressable"
        @click="handleStopVoice"
        :aria-label="`${statusInfo.text}, Tap to end`"
      >
        <div class="voice-status-full-content">
          <div class="voice-status-full-left">
            <span
              :class="[
                'voice-status-dot',
                statusInfo.dotColor,
                statusInfo.isPulsing && 'animate-pulse',
              ]"
            />
            <component
              :is="StatusIcon"
              :class="['voice-status-icon', statusInfo.textColor]"
            />
            <span :class="['voice-status-text', statusInfo.textColor]">
              {{ statusInfo.text }}
            </span>
          </div>
          <div class="voice-status-full-right">
            <span :class="['voice-status-tap-text', statusInfo.textColor]">
              Tap to end
            </span>
          </div>
        </div>
      </button>
    </div>

    <!-- Sidebar variant -->
    <div
      v-else
      :class="cn('voice-status-sidebar', statusInfo.bgColor, props.class)"
    >
      <button
        class="voice-status-sidebar-pressable"
        @click="handleStopVoice"
        :aria-label="statusInfo.text"
      >
        <div class="voice-status-sidebar-content">
          <div class="voice-status-sidebar-left">
            <span
              :class="[
                'voice-status-dot',
                statusInfo.dotColor,
                statusInfo.isPulsing && 'animate-pulse',
              ]"
            />
            <component
              :is="StatusIcon"
              :class="['voice-status-icon-sm', statusInfo.textColor]"
            />
            <span :class="['voice-status-text-sm', statusInfo.textColor]">
              {{ statusInfo.text }}
            </span>
          </div>
          <X :class="['h-3.5 w-3.5', statusInfo.textColor]" />
        </div>
      </button>
    </div>
  </template>
</template>

<style scoped>
/* Floating variant styles */
.voice-status-floating-container {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 1000;
}

.voice-status-floating-pill {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 6px 10px;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.voice-status-floating-pill:hover {
  opacity: 0.9;
}

.voice-status-floating-pill:active {
  opacity: 0.8;
}

.voice-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.voice-status-icon {
  width: 16px;
  height: 16px;
}

.voice-status-icon-sm {
  width: 14px;
  height: 14px;
}

.voice-status-expanded-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  transition: max-width 0.2s ease, opacity 0.15s ease;
}

.voice-status-expanded {
  max-width: 150px;
  opacity: 1;
}

.voice-status-text {
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
  white-space: nowrap;
}

.voice-status-text-sm {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.voice-status-close-button {
  margin-left: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border-radius: 50%;
}

.voice-status-close-button:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Full variant styles */
.voice-status-full {
  height: 32px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 16px;
}

.voice-status-full-pressable {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.voice-status-full-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.voice-status-full-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
  gap: 6px;
}

.voice-status-full-right {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.voice-status-tap-text {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.8;
}

/* Sidebar variant styles */
.voice-status-sidebar {
  height: 32px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.voice-status-sidebar-pressable {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  padding: 0 12px;
}

.voice-status-sidebar-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.voice-status-sidebar-left {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
  gap: 4px;
}
</style>
