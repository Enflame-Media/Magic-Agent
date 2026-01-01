<script setup lang="ts">
/**
 * Language Settings - App Localization
 *
 * Allows users to select their preferred language for the app interface.
 * Currently supports: English (default)
 * Future: Multi-language support via i18n
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const router = useRouter();

// Language state
type Language = 'en' | 'es' | 'fr' | 'de' | 'zh';
const currentLanguage = ref<Language>('en');

// Language options
const languageOptions: { value: Language; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'es', label: 'Spanish', native: 'Español' },
  { value: 'fr', label: 'French', native: 'Français' },
  { value: 'de', label: 'German', native: 'Deutsch' },
  { value: 'zh', label: 'Chinese', native: '中文' },
];

function selectLanguage(lang: Language) {
  currentLanguage.value = lang;
  // In production, this would trigger i18n locale change
  globalThis.localStorage.setItem('language', lang);
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
      <h1 class="text-2xl font-semibold">Language</h1>
    </header>

    <!-- Language Selection -->
    <Card>
      <CardHeader>
        <CardTitle>App Language</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y">
          <button
            v-for="option in languageOptions"
            :key="option.value"
            :class="[
              'w-full flex items-center justify-between p-4 hover:bg-accent transition-colors',
            ]"
            @click="selectLanguage(option.value)"
          >
            <div class="text-left">
              <p class="font-medium">{{ option.label }}</p>
              <p class="text-sm text-muted-foreground">{{ option.native }}</p>
            </div>
            <svg
              v-if="currentLanguage === option.value"
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        </div>
      </CardContent>
    </Card>

    <p class="text-sm text-muted-foreground mt-4 text-center">
      More languages coming soon!
    </p>
  </div>
</template>
