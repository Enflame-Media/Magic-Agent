<script setup lang="ts">
/**
 * Appearance Settings View
 *
 * Controls for visual preferences like dark mode,
 * font size, and theme customization.
 */
import { ref } from 'vue';
import { Frame, Application } from '@nativescript/core';

// Settings state
const darkModeEnabled = ref(false);
const fontSizeOption = ref<'small' | 'medium' | 'large'>('medium');
const compactModeEnabled = ref(false);

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
 * Toggle dark mode
 */
function toggleDarkMode() {
  darkModeEnabled.value = !darkModeEnabled.value;
  // TODO: Apply theme change
  // Application.setSystemAppearance(darkModeEnabled.value ? 'dark' : 'light');
}

/**
 * Set font size
 */
function setFontSize(size: 'small' | 'medium' | 'large') {
  fontSizeOption.value = size;
  // TODO: Apply font size change
}

/**
 * Toggle compact mode
 */
function toggleCompactMode() {
  compactModeEnabled.value = !compactModeEnabled.value;
  // TODO: Apply compact mode
}

/**
 * Get selection style for font size buttons
 */
function getFontSizeClass(size: string): string {
  return fontSizeOption.value === size ? 'option-button option-selected' : 'option-button';
}
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar title="Appearance">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" @tap="navigateBack" />
    </ActionBar>

    <ScrollView>
      <StackLayout class="settings-container">
        <!-- Theme Section -->
        <Label text="THEME" class="section-header" />

        <GridLayout columns="*, auto" class="setting-item" @tap="toggleDarkMode">
          <StackLayout col="0">
            <Label text="Dark Mode" class="setting-title" />
            <Label text="Use dark theme throughout the app" class="setting-subtitle" />
          </StackLayout>
          <Switch col="1" :checked="darkModeEnabled" />
        </GridLayout>

        <!-- Font Size Section -->
        <Label text="FONT SIZE" class="section-header" />

        <StackLayout class="setting-item">
          <Label text="Text Size" class="setting-title" />
          <GridLayout columns="*, *, *" class="option-buttons">
            <Button
              col="0"
              text="Small"
              :class="getFontSizeClass('small')"
              @tap="setFontSize('small')"
            />
            <Button
              col="1"
              text="Medium"
              :class="getFontSizeClass('medium')"
              @tap="setFontSize('medium')"
            />
            <Button
              col="2"
              text="Large"
              :class="getFontSizeClass('large')"
              @tap="setFontSize('large')"
            />
          </GridLayout>
        </StackLayout>

        <!-- Display Section -->
        <Label text="DISPLAY" class="section-header" />

        <GridLayout columns="*, auto" class="setting-item" @tap="toggleCompactMode">
          <StackLayout col="0">
            <Label text="Compact Mode" class="setting-title" />
            <Label text="Show more content on screen" class="setting-subtitle" />
          </StackLayout>
          <Switch col="1" :checked="compactModeEnabled" />
        </GridLayout>

        <!-- Preview -->
        <Label text="PREVIEW" class="section-header" />
        <StackLayout class="preview-container">
          <Label text="Sample Message" class="preview-title" />
          <Label
            text="This is how your messages will look with the current settings."
            class="preview-text"
            textWrap="true"
          />
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
  font-weight: 500;
}

.setting-subtitle {
  font-size: 14;
  color: #6b7280;
  margin-top: 4;
}

.option-buttons {
  margin-top: 12;
}

.option-button {
  background-color: #f3f4f6;
  color: #374151;
  font-size: 14;
  padding: 10;
  margin: 0 4;
  border-radius: 8;
}

.option-selected {
  background-color: #6366f1;
  color: #ffffff;
}

.preview-container {
  margin: 16;
  padding: 16;
  background-color: #ffffff;
  border-radius: 12;
  border-width: 1;
  border-color: #e5e7eb;
}

.preview-title {
  font-size: 16;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8;
}

.preview-text {
  font-size: 15;
  color: #4b5563;
  line-height: 22;
}
</style>
