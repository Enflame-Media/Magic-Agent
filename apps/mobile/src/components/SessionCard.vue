<script setup lang="ts">
/**
 * SessionCard Component - Display a session in the list
 *
 * Shows session title, project path, status, and last activity.
 * Tapping navigates to the session detail view.
 */
import { computed } from 'vue';
import { Frame } from '@nativescript/core';
import type { Session, SessionStatus } from '../stores/sessions';
import SessionView from '../views/SessionView.vue';

const props = defineProps<{
  session: Session;
}>();

const emit = defineEmits<{
  (e: 'tap', session: Session): void;
}>();

/**
 * Format the title, falling back to project name if no title
 */
const displayTitle = computed(() => {
  if (props.session.title) {
    return props.session.title;
  }
  // Extract project name from path
  const parts = props.session.projectPath.split('/');
  return parts[parts.length - 1] || 'Untitled Session';
});

/**
 * Get status color based on session status
 */
const statusColor = computed(() => {
  const colors: Record<SessionStatus, string> = {
    active: '#10b981', // green
    idle: '#f59e0b', // amber
    disconnected: '#9ca3af', // gray
    error: '#ef4444', // red
  };
  return colors[props.session.status];
});

/**
 * Get status text for display
 */
const statusText = computed(() => {
  const texts: Record<SessionStatus, string> = {
    active: 'Active',
    idle: 'Idle',
    disconnected: 'Disconnected',
    error: 'Error',
  };
  return texts[props.session.status];
});

/**
 * Format relative time for last activity
 */
const lastActivityText = computed(() => {
  const now = Date.now();
  const then = props.session.lastActivity.getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
});

/**
 * Navigate to session detail
 */
function openSession() {
  emit('tap', props.session);
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => SessionView,
    context: { sessionId: props.session.id },
  });
}
</script>

<template>
  <GridLayout
    columns="auto, *, auto"
    rows="auto, auto"
    class="session-card"
    @tap="openSession"
  >
    <!-- Status indicator -->
    <StackLayout col="0" rowSpan="2" class="status-indicator-container" verticalAlignment="center">
      <Label
        text="●"
        class="status-indicator"
        :style="{ color: statusColor }"
      />
    </StackLayout>

    <!-- Title and path -->
    <StackLayout col="1" row="0" class="content-container">
      <Label :text="displayTitle" class="session-title" />
      <Label :text="session.projectPath" class="session-path" />
    </StackLayout>

    <!-- Status and time -->
    <StackLayout col="1" row="1" orientation="horizontal" class="meta-container">
      <Label
        :text="statusText"
        class="status-badge"
        :style="{ backgroundColor: statusColor + '20', color: statusColor }"
      />
      <Label :text="lastActivityText" class="last-activity" />
      <Label v-if="session.messageCount > 0" :text="`${session.messageCount} msgs`" class="message-count" />
    </StackLayout>

    <!-- Chevron -->
    <Label
      col="2"
      rowSpan="2"
      text="›"
      class="chevron"
      verticalAlignment="center"
    />
  </GridLayout>
</template>

<style scoped>
.session-card {
  padding: 16;
  background-color: #ffffff;
  border-bottom-width: 1;
  border-bottom-color: #f3f4f6;
}

.status-indicator-container {
  width: 32;
  padding-right: 12;
}

.status-indicator {
  font-size: 12;
}

.content-container {
  padding-right: 8;
}

.session-title {
  font-size: 17;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2;
}

.session-path {
  font-size: 13;
  color: #6b7280;
}

.meta-container {
  margin-top: 8;
}

.status-badge {
  font-size: 11;
  font-weight: 500;
  padding: 2 8;
  border-radius: 4;
  margin-right: 8;
}

.last-activity {
  font-size: 12;
  color: #9ca3af;
  margin-right: 8;
}

.message-count {
  font-size: 12;
  color: #9ca3af;
}

.chevron {
  font-size: 24;
  color: #d1d5db;
  width: 24;
}
</style>
