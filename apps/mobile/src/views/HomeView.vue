<script setup lang="ts">
/**
 * Home View - Main Dashboard Screen
 *
 * Displays the list of connected Claude Code sessions
 * and provides navigation to session details.
 */
import { ref } from 'vue';
import { Frame } from '@nativescript/core';
import SessionView from './SessionView.vue';
import SettingsView from './SettingsView.vue';

const sessions = ref<{ id: string; name: string; status: string }[]>([
  { id: '1', name: 'Project Alpha', status: 'active' },
  { id: '2', name: 'Debug Session', status: 'idle' },
]);

const navigateToSession = (sessionId: string) => {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => SessionView,
    context: { sessionId },
  });
};

const navigateToSettings = () => {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => SettingsView,
  });
};
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar title="Happy">
      <ActionItem
        text="Settings"
        ios.position="right"
        android.position="popup"
        @tap="navigateToSettings"
      />
    </ActionBar>

    <GridLayout rows="auto, *">
      <!-- Header -->
      <StackLayout row="0" class="p-4">
        <Label
          text="Your Sessions"
          class="text-xl font-bold text-primary"
        />
        <Label
          text="Connect to Claude Code remotely"
          class="text-sm text-secondary"
        />
      </StackLayout>

      <!-- Session List -->
      <ListView
        row="1"
        :items="sessions"
        class="list-group"
      >
        <template #default="{ item }">
          <GridLayout
            columns="*, auto"
            class="session-item p-4"
            @tap="navigateToSession(item.id)"
          >
            <StackLayout col="0">
              <Label
                :text="item.name"
                class="text-lg font-medium"
              />
              <Label
                :text="item.status"
                :class="['text-sm', item.status === 'active' ? 'text-green' : 'text-gray']"
              />
            </StackLayout>
            <Label
              col="1"
              text="›"
              class="text-2xl text-gray"
              verticalAlignment="center"
            />
          </GridLayout>
        </template>
      </ListView>
    </GridLayout>
  </Page>
</template>

<style scoped>
.text-primary {
  color: #6366f1;
}

.text-secondary {
  color: #6b7280;
}

.text-green {
  color: #10b981;
}

.text-gray {
  color: #9ca3af;
}

.session-item {
  background-color: #ffffff;
  border-bottom-width: 1;
  border-bottom-color: #e5e7eb;
}

.p-4 {
  padding: 16;
}

.text-xl {
  font-size: 20;
}

.text-lg {
  font-size: 18;
}

.text-sm {
  font-size: 14;
}

.text-2xl {
  font-size: 24;
}

.font-bold {
  font-weight: bold;
}

.font-medium {
  font-weight: 500;
}
</style>
