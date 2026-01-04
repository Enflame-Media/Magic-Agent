<script setup lang="ts">
/**
 * Settings View - App Configuration Hub
 *
 * Provides navigation to appearance, account settings,
 * and other app configuration options.
 */
import { ref, computed } from 'vue';
import { Frame } from '@nativescript/core';
import { useAuth } from '../composables/useAuth';
import { usePurchases } from '../composables/usePurchases';
import AppearanceView from './settings/AppearanceView.vue';
import AccountView from './settings/AccountView.vue';

const { machines } = useAuth();
const { isPro, showPaywall } = usePurchases();

// App version (would come from build config in production)
const version = ref('0.1.0');

// Connected machines count for badge
const machinesCount = computed(() => machines.value.length);

/**
 * Navigate back
 */
function navigateBack() {
  const frame = Frame.topmost();
  if (frame?.canGoBack()) {
    frame.goBack();
  }
}

/**
 * Navigate to appearance settings
 */
function navigateToAppearance() {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => AppearanceView,
  });
}

/**
 * Navigate to account settings
 */
function navigateToAccount() {
  const frame = Frame.topmost();
  frame?.navigate({
    create: () => AccountView,
  });
}

/**
 * Open external link (placeholder)
 */
function openLink(url: string) {
  // TODO: Implement with utils.openUrl
  console.log('Opening:', url);
}

/**
 * Show subscription paywall
 */
function navigateToSubscription(): void {
  showPaywall('settings');
}
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar title="Settings">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" @tap="navigateBack" />
    </ActionBar>

    <ScrollView>
      <StackLayout class="settings-container">
        <!-- Preferences Section -->
        <Label text="PREFERENCES" class="section-header" />

        <GridLayout columns="*, auto" class="setting-item" @tap="navigateToAppearance">
          <StackLayout col="0">
            <Label text="Appearance" class="setting-title" />
            <Label text="Theme, fonts, and display options" class="setting-subtitle" />
          </StackLayout>
          <Label col="1" text="›" class="chevron" />
        </GridLayout>

        <GridLayout columns="*, auto" class="setting-item">
          <StackLayout col="0">
            <Label text="Notifications" class="setting-title" />
            <Label text="Alerts and push notification settings" class="setting-subtitle" />
          </StackLayout>
          <Label col="1" text="›" class="chevron" />
        </GridLayout>

        <!-- Account Section -->
        <Label text="ACCOUNT" class="section-header" />

        <GridLayout columns="*, auto" class="setting-item" @tap="navigateToAccount">
          <StackLayout col="0">
            <Label text="Connected Machines" class="setting-title" />
            <Label
              :text="`${machinesCount} machine${machinesCount !== 1 ? 's' : ''} connected`"
              class="setting-subtitle"
            />
          </StackLayout>
          <StackLayout col="1" orientation="horizontal" verticalAlignment="center">
            <Label
              v-if="machinesCount > 0"
              :text="machinesCount.toString()"
              class="badge"
            />
            <Label text="›" class="chevron" />
          </StackLayout>
        </GridLayout>

        <GridLayout columns="*, auto" class="setting-item" @tap="navigateToSubscription">
          <StackLayout col="0">
            <Label text="Subscription" class="setting-title" />
            <Label
              :text="isPro ? 'Happy Pro' : 'Upgrade to Pro'"
              class="setting-subtitle"
            />
          </StackLayout>
          <StackLayout col="1" orientation="horizontal" vertical-alignment="center">
            <Label
              v-if="isPro"
              text="PRO"
              class="pro-badge"
            />
            <Label text="›" class="chevron" />
          </StackLayout>
        </GridLayout>

        <GridLayout columns="*, auto" class="setting-item">
          <StackLayout col="0">
            <Label text="Privacy & Security" class="setting-title" />
            <Label text="Encryption and data settings" class="setting-subtitle" />
          </StackLayout>
          <Label col="1" text="›" class="chevron" />
        </GridLayout>

        <!-- Support Section -->
        <Label text="SUPPORT" class="section-header" />

        <GridLayout columns="*, auto" class="setting-item" @tap="openLink('https://happy.engineering/help')">
          <StackLayout col="0">
            <Label text="Help Center" class="setting-title" />
            <Label text="FAQs and troubleshooting guides" class="setting-subtitle" />
          </StackLayout>
          <Label col="1" text="↗" class="external-icon" />
        </GridLayout>

        <GridLayout columns="*, auto" class="setting-item" @tap="openLink('https://happy.engineering/feedback')">
          <StackLayout col="0">
            <Label text="Send Feedback" class="setting-title" />
            <Label text="Report bugs or suggest features" class="setting-subtitle" />
          </StackLayout>
          <Label col="1" text="↗" class="external-icon" />
        </GridLayout>

        <!-- About Section -->
        <Label text="ABOUT" class="section-header" />

        <GridLayout columns="*, auto" class="setting-item">
          <Label col="0" text="Version" class="setting-title" />
          <Label col="1" :text="version" class="version-text" />
        </GridLayout>

        <GridLayout columns="*, auto" class="setting-item" @tap="openLink('https://happy.engineering/terms')">
          <Label col="0" text="Terms of Service" class="setting-title" />
          <Label col="1" text="↗" class="external-icon" />
        </GridLayout>

        <GridLayout columns="*, auto" class="setting-item" @tap="openLink('https://happy.engineering/privacy')">
          <Label col="0" text="Privacy Policy" class="setting-title" />
          <Label col="1" text="↗" class="external-icon" />
        </GridLayout>

        <!-- Footer -->
        <StackLayout class="footer">
          <Label text="Happy" class="footer-logo" />
          <Label text="Remote control for Claude Code" class="footer-tagline" />
          <Label text="Made with ♥ by Enflame Media" class="footer-credit" />
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
  font-size: 13;
  font-weight: bold;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5;
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
  font-size: 17;
  color: #1f2937;
}

.setting-subtitle {
  font-size: 14;
  color: #6b7280;
  margin-top: 4;
}

.chevron {
  font-size: 22;
  color: #d1d5db;
}

.external-icon {
  font-size: 16;
  color: #9ca3af;
}

.badge {
  background-color: #6366f1;
  color: #ffffff;
  font-size: 12;
  font-weight: bold;
  padding: 2 8;
  border-radius: 10;
  margin-right: 8;
}

.pro-badge {
  background-color: #10b981;
  color: #ffffff;
  font-size: 11;
  font-weight: bold;
  padding: 2 8;
  border-radius: 8;
  margin-right: 8;
}

.version-text {
  font-size: 16;
  color: #6b7280;
}

.footer {
  padding: 32;
  text-align: center;
  background-color: #f9fafb;
}

.footer-logo {
  font-size: 24;
  font-weight: bold;
  color: #6366f1;
  margin-bottom: 4;
}

.footer-tagline {
  font-size: 14;
  color: #6b7280;
  margin-bottom: 16;
}

.footer-credit {
  font-size: 12;
  color: #9ca3af;
}
</style>
