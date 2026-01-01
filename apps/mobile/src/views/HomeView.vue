<script setup lang="ts">
/**
 * Home View - Main Dashboard Screen
 *
 * Displays the list of connected Claude Code sessions
 * using native ListView for smooth scrolling performance.
 * Provides navigation to session details and QR scanner.
 */
import { computed, onMounted } from 'vue';
import { Frame } from '@nativescript/core';
import { useSessionsStore, type Session } from '../stores/sessions';
import SessionCard from '../components/SessionCard.vue';
import SessionView from './SessionView.vue';
import SettingsView from './SettingsView.vue';
import ScannerView from './auth/ScannerView.vue';

const sessionsStore = useSessionsStore();

const sessions = computed(() => sessionsStore.sessionsList);
const activeCount = computed(() => sessionsStore.activeSessionsCount);
const hasNoSessions = computed(() => sessions.value.length === 0);

/**
 * Navigate to session detail
 */
function navigateToSession(session: Session) {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => SessionView,
    context: { sessionId: session.id },
  });
}

/**
 * Navigate to settings
 */
function navigateToSettings() {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => SettingsView,
  });
}

/**
 * Navigate to QR scanner
 */
function navigateToScanner() {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => ScannerView,
  });
}

/**
 * Handle pull-to-refresh
 */
function onRefresh(args: { object: { refreshing: boolean } }) {
  // Simulate refresh
  setTimeout(() => {
    args.object.refreshing = false;
  }, 1500);
}

// Load mock sessions for development
onMounted(() => {
  if (sessions.value.length === 0) {
    sessionsStore.addMockSessions();
  }
});
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar title="Happy">
      <ActionItem
        text="Scan"
        ios.position="left"
        android.position="actionBar"
        @tap="navigateToScanner"
      />
      <ActionItem
        text="Settings"
        ios.position="right"
        android.position="popup"
        @tap="navigateToSettings"
      />
    </ActionBar>

    <GridLayout rows="auto, *">
      <!-- Header -->
      <StackLayout row="0" class="header">
        <GridLayout columns="*, auto">
          <StackLayout col="0">
            <Label text="Your Sessions" class="title" />
            <Label
              :text="`${activeCount} active session${activeCount !== 1 ? 's' : ''}`"
              class="subtitle"
            />
          </StackLayout>
          <!-- Quick scan button -->
          <Button
            col="1"
            text="+ Connect"
            @tap="navigateToScanner"
            class="btn-connect"
          />
        </GridLayout>
      </StackLayout>

      <!-- Session List -->
      <ListView
        v-if="!hasNoSessions"
        row="1"
        :items="sessions"
        class="session-list"
        @itemTap="navigateToSession($event.item)"
        pullToRefreshEnabled="true"
        @pullToRefreshInitiated="onRefresh"
      >
        <template #default="{ item }">
          <SessionCard :session="item" @tap="navigateToSession" />
        </template>
      </ListView>

      <!-- Empty State -->
      <StackLayout v-else row="1" class="empty-state" verticalAlignment="center">
        <Label text="📱" class="empty-icon" />
        <Label text="No sessions yet" class="empty-title" />
        <Label
          text="Scan the QR code from your Claude Code CLI to connect your first session."
          class="empty-description"
          textWrap="true"
        />
        <Button
          text="Scan QR Code"
          @tap="navigateToScanner"
          class="btn-primary"
        />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<style scoped>
.header {
  padding: 16;
  background-color: #ffffff;
  border-bottom-width: 1;
  border-bottom-color: #e5e7eb;
}

.title {
  font-size: 24;
  font-weight: bold;
  color: #1f2937;
}

.subtitle {
  font-size: 14;
  color: #6b7280;
  margin-top: 4;
}

.btn-connect {
  background-color: #6366f1;
  color: #ffffff;
  font-size: 14;
  font-weight: 600;
  padding: 8 16;
  border-radius: 8;
}

.session-list {
  background-color: #f9fafb;
  separator-color: transparent;
}

/* Empty State */
.empty-state {
  padding: 32;
  text-align: center;
}

.empty-icon {
  font-size: 64;
  margin-bottom: 16;
}

.empty-title {
  font-size: 22;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 8;
}

.empty-description {
  font-size: 16;
  color: #6b7280;
  line-height: 24;
  margin-bottom: 24;
  padding: 0 16;
}

.btn-primary {
  background-color: #6366f1;
  color: #ffffff;
  font-size: 16;
  font-weight: 600;
  padding: 14 28;
  border-radius: 10;
}
</style>
