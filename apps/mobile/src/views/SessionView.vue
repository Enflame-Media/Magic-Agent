<script setup lang="ts">
/**
 * Session View - Individual Claude Code Session
 *
 * Displays real-time session output from Claude Code
 * with encrypted message display and interactive capabilities.
 * Uses native ScrollView for smooth message scrolling.
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Frame, ScrollView as NSScrollView } from '@nativescript/core';
import { useSessionsStore, type SessionMessage } from '../stores/sessions';

const props = defineProps<{
  sessionId?: string;
}>();

const sessionsStore = useSessionsStore();

// Local state
const inputText = ref('');
const isLoading = ref(false);
const scrollViewRef = ref<NSScrollView | null>(null);

// Computed
const session = computed(() =>
  props.sessionId ? sessionsStore.sessions.get(props.sessionId) : null
);

const messages = computed(() =>
  props.sessionId ? sessionsStore.sessionMessages.get(props.sessionId) ?? [] : []
);

const sessionTitle = computed(() => {
  if (!session.value) return 'Session';
  if (session.value.title) return session.value.title;
  const parts = session.value.projectPath.split('/');
  return parts[parts.length - 1] || 'Session';
});

const statusColor = computed(() => {
  if (!session.value) return '#9ca3af';
  const colors: Record<string, string> = {
    active: '#10b981',
    idle: '#f59e0b',
    disconnected: '#9ca3af',
    error: '#ef4444',
  };
  return colors[session.value.status] ?? '#9ca3af';
});

/**
 * Navigate back to home
 */
function navigateBack() {
  const frame = Frame.topmost();
  if (frame?.canGoBack()) {
    frame.goBack();
  }
}

/**
 * Send a message (placeholder for future implementation)
 */
function sendMessage() {
  if (!inputText.value.trim() || !props.sessionId) return;

  const message: SessionMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: inputText.value,
    timestamp: new Date(),
  };

  sessionsStore.addMessage(props.sessionId, message);
  inputText.value = '';
  isLoading.value = true;

  // Simulate assistant response
  setTimeout(() => {
    if (props.sessionId) {
      sessionsStore.addMessage(props.sessionId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a simulated response. Real-time sync will be implemented in Phase 3.',
        timestamp: new Date(),
      });
    }
    isLoading.value = false;
    scrollToBottom();
  }, 1500);
}

/**
 * Scroll to bottom of messages
 */
function scrollToBottom() {
  nextTick(() => {
    if (scrollViewRef.value) {
      scrollViewRef.value.scrollToVerticalOffset(
        scrollViewRef.value.scrollableHeight,
        true
      );
    }
  });
}

/**
 * Format message timestamp
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get message style class based on role
 */
function getMessageClass(role: string): string {
  return role === 'user' ? 'message message-user' : 'message message-assistant';
}

// Load initial messages if none exist
onMounted(() => {
  if (props.sessionId && messages.value.length === 0) {
    // Add mock messages for development
    sessionsStore.addMessage(props.sessionId, {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m ready to help you with your code. What would you like to work on?',
      timestamp: new Date(Date.now() - 60000),
    });
    sessionsStore.addMessage(props.sessionId, {
      id: '2',
      role: 'user',
      content: 'Can you help me refactor this function?',
      timestamp: new Date(Date.now() - 30000),
    });
    sessionsStore.addMessage(props.sessionId, {
      id: '3',
      role: 'assistant',
      content: 'Of course! Please share the function you\'d like to refactor, and I\'ll provide suggestions.',
      timestamp: new Date(),
    });
  }
});

// Auto-scroll when messages change
watch(messages, () => {
  scrollToBottom();
});
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar :title="sessionTitle">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" @tap="navigateBack" />
      <ActionItem ios.position="right" android.position="actionBar">
        <StackLayout orientation="horizontal" verticalAlignment="center">
          <Label text="●" :style="{ color: statusColor, fontSize: 10, marginRight: 4 }" />
          <Label v-if="session" :text="session.status" class="status-text" />
        </StackLayout>
      </ActionItem>
    </ActionBar>

    <GridLayout rows="*, auto">
      <!-- Messages -->
      <ScrollView
        row="0"
        ref="scrollViewRef"
        class="messages-container"
      >
        <StackLayout class="messages-list">
          <StackLayout
            v-for="message in messages"
            :key="message.id"
            :class="getMessageClass(message.role)"
          >
            <Label
              :text="message.content"
              textWrap="true"
              class="message-text"
            />
            <Label
              :text="formatTime(message.timestamp)"
              class="message-time"
            />
          </StackLayout>

          <!-- Typing indicator -->
          <StackLayout v-if="isLoading" class="typing-indicator">
            <ActivityIndicator busy="true" class="typing-activity" />
            <Label text="Claude is thinking..." class="typing-text" />
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <!-- Input Area -->
      <GridLayout row="1" columns="*, auto" class="input-container">
        <TextField
          col="0"
          v-model="inputText"
          hint="Type a message..."
          returnKeyType="send"
          @returnPress="sendMessage"
          class="input-field"
          :isEnabled="!isLoading"
        />
        <Button
          col="1"
          text="Send"
          @tap="sendMessage"
          class="send-button"
          :isEnabled="!isLoading && inputText.trim().length > 0"
        />
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<style scoped>
.status-text {
  font-size: 12;
  color: #6b7280;
  text-transform: capitalize;
}

.messages-container {
  background-color: #f9fafb;
}

.messages-list {
  padding: 16;
}

.message {
  padding: 12 16;
  margin-bottom: 12;
  border-radius: 16;
  max-width: 85%;
}

.message-user {
  background-color: #6366f1;
  align-self: flex-end;
  margin-left: 40;
  border-bottom-right-radius: 4;
}

.message-assistant {
  background-color: #ffffff;
  align-self: flex-start;
  margin-right: 40;
  border-bottom-left-radius: 4;
  border-width: 1;
  border-color: #e5e7eb;
}

.message-user .message-text {
  color: #ffffff;
}

.message-assistant .message-text {
  color: #1f2937;
}

.message-text {
  font-size: 16;
  line-height: 22;
}

.message-time {
  font-size: 11;
  margin-top: 4;
}

.message-user .message-time {
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
}

.message-assistant .message-time {
  color: #9ca3af;
}

.typing-indicator {
  padding: 12;
  flex-direction: row;
  align-items: center;
}

.typing-activity {
  width: 20;
  height: 20;
  color: #6366f1;
}

.typing-text {
  font-size: 14;
  color: #6b7280;
  margin-left: 8;
  font-style: italic;
}

.input-container {
  padding: 12;
  background-color: #ffffff;
  border-top-width: 1;
  border-top-color: #e5e7eb;
}

.input-field {
  padding: 12 16;
  background-color: #f3f4f6;
  border-radius: 24;
  font-size: 16;
}

.send-button {
  margin-left: 8;
  background-color: #6366f1;
  color: #ffffff;
  border-radius: 24;
  padding: 12 20;
  font-weight: 600;
}

.send-button:disabled {
  background-color: #d1d5db;
}
</style>
