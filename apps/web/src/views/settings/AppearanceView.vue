<script setup lang="ts">
/**
 * Appearance Settings - Theme and Display Preferences
 *
 * Allows users to customize the app's visual appearance:
 * - Theme: Light, Dark, System
 * - (Future) Font size, compact mode, etc.
 */

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const router = useRouter();

// Theme state
type Theme = 'light' | 'dark' | 'system';
const currentTheme = ref<Theme>('system');

// Theme options
const themeOptions: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

// Load theme from localStorage on mount
onMounted(() => {
  const stored = globalThis.localStorage.getItem('theme') as Theme | null;
  if (stored) {
    currentTheme.value = stored;
  }
  applyTheme(currentTheme.value);
});

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = globalThis.document.documentElement;

  if (theme === 'system') {
    const prefersDark = globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Handle theme selection
function selectTheme(theme: Theme) {
  currentTheme.value = theme;
  globalThis.localStorage.setItem('theme', theme);
  applyTheme(theme);
}

function goBack() {
  router.push('/settings');
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>
      <h1 class="text-2xl font-semibold">Appearance</h1>
    </header>

    <!-- Theme Selection -->
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            :class="[
              'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors',
              currentTheme === option.value
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-muted-foreground/30',
            ]"
            @click="selectTheme(option.value)"
          >
            <span class="text-2xl mb-2">{{ option.icon }}</span>
            <span class="text-sm font-medium">{{ option.label }}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
