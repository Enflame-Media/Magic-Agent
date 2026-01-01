<script setup lang="ts">
/**
 * Settings View - App Configuration
 *
 * Provides access to user preferences, account settings,
 * and connected machine management.
 */
import { ref } from 'vue';

const darkModeEnabled = ref(false);
const notificationsEnabled = ref(true);
const version = ref('0.0.1');

const toggleDarkMode = () => {
  darkModeEnabled.value = !darkModeEnabled.value;
  // TODO: Implement dark mode toggle
};

const toggleNotifications = () => {
  notificationsEnabled.value = !notificationsEnabled.value;
  // TODO: Implement notifications toggle
};

const signOut = () => {
  // TODO: Implement sign out
  console.log('Sign out pressed');
};
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar title="Settings">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" />
    </ActionBar>

    <ScrollView>
      <StackLayout class="settings-container">
        <!-- Appearance Section -->
        <Label text="Appearance" class="section-header" />
        <GridLayout columns="*, auto" class="setting-item" @tap="toggleDarkMode">
          <StackLayout col="0">
            <Label text="Dark Mode" class="setting-title" />
            <Label text="Use dark theme throughout the app" class="setting-subtitle" />
          </StackLayout>
          <Switch col="1" :checked="darkModeEnabled" />
        </GridLayout>

        <!-- Notifications Section -->
        <Label text="Notifications" class="section-header" />
        <GridLayout columns="*, auto" class="setting-item" @tap="toggleNotifications">
          <StackLayout col="0">
            <Label text="Push Notifications" class="setting-title" />
            <Label text="Receive alerts for session activity" class="setting-subtitle" />
          </StackLayout>
          <Switch col="1" :checked="notificationsEnabled" />
        </GridLayout>

        <!-- Account Section -->
        <Label text="Account" class="section-header" />
        <StackLayout class="setting-item" @tap="signOut">
          <Label text="Sign Out" class="setting-title text-danger" />
          <Label text="Disconnect from all sessions" class="setting-subtitle" />
        </StackLayout>

        <!-- About Section -->
        <Label text="About" class="section-header" />
        <StackLayout class="setting-item">
          <Label text="Version" class="setting-title" />
          <Label :text="version" class="setting-subtitle" />
        </StackLayout>
      </StackLayout>
    </ScrollView>
  </Page>
</template>

<style scoped>
.settings-container {
  padding: 0;
}

.section-header {
  font-size: 14;
  font-weight: bold;
  color: #6b7280;
  text-transform: uppercase;
  padding: 16;
  padding-bottom: 8;
  background-color: #f9fafb;
}

.setting-item {
  padding: 16;
  background-color: #ffffff;
  border-bottom-width: 1;
  border-bottom-color: #e5e7eb;
}

.setting-title {
  font-size: 16;
  color: #1f2937;
}

.setting-subtitle {
  font-size: 14;
  color: #6b7280;
  margin-top: 4;
}

.text-danger {
  color: #ef4444;
}
</style>
