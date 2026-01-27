<script setup lang="ts">
/**
 * Language Settings - App Localization
 *
 * Allows users to select their preferred language for the app interface.
 * Integrates with vue-i18n via the useLocale composable.
 *
 * Supported languages:
 * - English (en) - Default
 * - Spanish (es)
 * - Russian (ru)
 * - Polish (pl)
 * - Portuguese (pt)
 * - Catalan (ca)
 * - Chinese Simplified (zh-Hans)
 */

import { useRouter } from 'vue-router';
import { ChevronLeft, Check } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/composables/useLocale';

const router = useRouter();
const { locale, availableLanguages, setLocale, t } = useLocale();

function goBack() {
  router.push('/settings');
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" @click="goBack">
        <ChevronLeft class="h-5 w-5" />
      </Button>
      <h1 class="text-2xl font-semibold">{{ t('languageSelector.title') }}</h1>
    </header>

    <!-- Language Selection -->
    <Card>
      <CardHeader>
        <CardTitle>{{ t('languageSelector.description') }}</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y">
          <button
            v-for="lang in availableLanguages"
            :key="lang.code"
            class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
            @click="setLocale(lang.code)"
          >
            <div class="text-left">
              <p class="font-medium">{{ lang.nativeName }}</p>
              <p class="text-sm text-muted-foreground">{{ lang.englishName }}</p>
            </div>
            <Check
              v-if="locale === lang.code"
              class="h-5 w-5 text-primary"
            />
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
