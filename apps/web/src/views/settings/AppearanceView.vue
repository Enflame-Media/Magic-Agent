<script setup lang="ts">
/**
 * Appearance Settings - Theme and Display Preferences
 *
 * Allows users to customize the app's visual appearance:
 * - Theme: Light, Dark, System (auto)
 *
 * Uses the useDarkMode composable for consistent dark mode behavior
 * across the app, with proper system preference detection.
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDarkMode, type ColorMode } from '@/composables/useDarkMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IconSun, IconMoon, IconDeviceDesktop, IconChevronLeft } from '@tabler/icons-vue';

const router = useRouter();

// Dark mode state from composable
const { mode, isDark, isAuto, systemPrefersDark, setMode } = useDarkMode();

// Theme options
const themeOptions: { value: ColorMode; label: string; description: string }[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Always use light mode',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always use dark mode',
  },
  {
    value: 'auto',
    label: 'System',
    description: 'Follow your device settings',
  },
];

// Get icon component for each theme option
function getThemeIcon(value: ColorMode) {
  switch (value) {
    case 'light':
      return IconSun;
    case 'dark':
      return IconMoon;
    case 'auto':
      return IconDeviceDesktop;
    default:
      return IconSun;
  }
}

// Current theme preview text
const currentThemeText = computed(() => {
  if (isAuto.value) {
    return systemPrefersDark.value ? 'Currently using dark mode (from system)' : 'Currently using light mode (from system)';
  }
  return isDark.value ? 'Dark mode active' : 'Light mode active';
});

function selectTheme(theme: ColorMode) {
  setMode(theme);
}

function goBack() {
  router.push('/settings');
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" class="touch-target" @click="goBack">
        <IconChevronLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold">Appearance</h1>
        <p class="text-sm text-muted-foreground">{{ currentThemeText }}</p>
      </div>
    </header>

    <!-- Theme Selection -->
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose how Happy looks to you. Select a theme or let it follow your system settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            :class="[
              'relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200',
              'hover:border-primary/50 hover:bg-accent/50',
              mode === option.value
                ? 'border-primary bg-accent ring-2 ring-primary/20'
                : 'border-border bg-card',
            ]"
            @click="selectTheme(option.value)"
          >
            <!-- Selected indicator -->
            <div
              v-if="mode === option.value"
              class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
            />

            <!-- Icon -->
            <component
              :is="getThemeIcon(option.value)"
              :class="[
                'h-8 w-8 mb-3 transition-colors',
                mode === option.value ? 'text-primary' : 'text-muted-foreground',
              ]"
            />

            <!-- Label -->
            <span
              :class="[
                'text-sm font-medium',
                mode === option.value ? 'text-foreground' : 'text-muted-foreground',
              ]"
            >
              {{ option.label }}
            </span>

            <!-- Description (visible on larger screens) -->
            <span class="hidden sm:block text-xs text-muted-foreground mt-1 text-center">
              {{ option.description }}
            </span>
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Preview Card -->
    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-base">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- Color swatches -->
          <div class="flex flex-wrap gap-2">
            <div class="flex flex-col items-center gap-1">
              <div class="w-10 h-10 rounded-lg bg-primary" />
              <span class="text-xs text-muted-foreground">Primary</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-10 h-10 rounded-lg bg-secondary" />
              <span class="text-xs text-muted-foreground">Secondary</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-10 h-10 rounded-lg bg-accent" />
              <span class="text-xs text-muted-foreground">Accent</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-10 h-10 rounded-lg bg-success" />
              <span class="text-xs text-muted-foreground">Success</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-10 h-10 rounded-lg bg-warning" />
              <span class="text-xs text-muted-foreground">Warning</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <div class="w-10 h-10 rounded-lg bg-destructive" />
              <span class="text-xs text-muted-foreground">Error</span>
            </div>
          </div>

          <!-- Sample buttons -->
          <div class="flex flex-wrap gap-2 pt-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="secondary">Secondary</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Button size="sm" variant="ghost">Ghost</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
