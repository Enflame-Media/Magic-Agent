<script setup lang="ts">
/**
 * Session View - Individual Claude Code Session
 *
 * Displays real-time session output from Claude Code
 * with encrypted message display and input capabilities.
 */
import { ref, onMounted } from 'vue';

const props = defineProps<{
  sessionId?: string;
}>();

const messages = ref<{ id: string; role: string; content: string }[]>([]);
const inputText = ref('');
const isLoading = ref(false);

onMounted(() => {
  // Load session data
  // TODO: Implement real session loading from API
  messages.value = [
    { id: '1', role: 'assistant', content: 'Hello! How can I help you today?' },
    { id: '2', role: 'user', content: 'Can you help me with this code?' },
  ];
});

const sendMessage = () => {
  if (!inputText.value.trim()) return;

  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    content: inputText.value,
  });
  inputText.value = '';
  isLoading.value = true;

  // TODO: Send message to session
  setTimeout(() => {
    isLoading.value = false;
  }, 1000);
};
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar :title="`Session ${sessionId || 'Unknown'}`">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" />
    </ActionBar>

    <GridLayout rows="*, auto">
      <!-- Messages -->
      <ScrollView row="0">
        <StackLayout class="p-4">
          <StackLayout
            v-for="message in messages"
            :key="message.id"
            :class="['message', message.role === 'user' ? 'message-user' : 'message-assistant']"
          >
            <Label
              :text="message.content"
              textWrap="true"
              class="message-text"
            />
          </StackLayout>
          <ActivityIndicator v-if="isLoading" busy="true" class="m-4" />
        </StackLayout>
      </ScrollView>

      <!-- Input -->
      <GridLayout row="1" columns="*, auto" class="input-container">
        <TextField
          col="0"
          v-model="inputText"
          hint="Type a message..."
          returnKeyType="send"
          @returnPress="sendMessage"
          class="input-field"
        />
        <Button
          col="1"
          text="Send"
          @tap="sendMessage"
          class="send-button"
        />
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<style scoped>
.message {
  padding: 12;
  margin-bottom: 8;
  border-radius: 12;
  max-width: 80%;
}

.message-user {
  background-color: #6366f1;
  align-self: flex-end;
  margin-left: 50;
}

.message-assistant {
  background-color: #f3f4f6;
  align-self: flex-start;
  margin-right: 50;
}

.message-user .message-text {
  color: #ffffff;
}

.message-assistant .message-text {
  color: #1f2937;
}

.p-4 {
  padding: 16;
}

.m-4 {
  margin: 16;
}

.input-container {
  padding: 12;
  background-color: #f9fafb;
  border-top-width: 1;
  border-top-color: #e5e7eb;
}

.input-field {
  padding: 12;
  background-color: #ffffff;
  border-radius: 8;
  border-width: 1;
  border-color: #d1d5db;
}

.send-button {
  margin-left: 8;
  background-color: #6366f1;
  color: #ffffff;
  border-radius: 8;
  padding: 12;
}
</style>
