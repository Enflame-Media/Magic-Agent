<script setup lang="ts">
/**
 * Voice Settings - Voice Assistant Language Configuration
 *
 * Allows users to select their preferred language for voice assistant interactions.
 * Integrates with the voice store to persist preferences.
 *
 * Supported languages match ElevenLabs Conversational AI:
 * - English (en)
 * - Spanish (es)
 * - Russian (ru)
 * - Polish (pl)
 * - Portuguese (pt)
 * - Catalan (ca)
 * - Chinese Simplified (zh-Hans)
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronLeft, Check, Mic } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoice } from '@/composables/useVoice';
import { useLocale } from '@/composables/useLocale';
import { VOICE_LANGUAGES } from '@/services/voice/config';

const router = useRouter();
const { voiceLanguage, setVoiceLanguage } = useVoice();
const { t } = useLocale();

/**
 * Voice language options with display names
 * Maps to ElevenLabs supported languages
 */
interface VoiceLanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
}

const voiceLanguages = computed<VoiceLanguageOption[]>(() => {
  // Build language list from VOICE_LANGUAGES config
  const languageInfo: Record<string, { nativeName: string; englishName: string }> = {
    en: { nativeName: 'English', englishName: 'English' },
    es: { nativeName: 'Español', englishName: 'Spanish' },
    ru: { nativeName: 'Русский', englishName: 'Russian' },
    pl: { nativeName: 'Polski', englishName: 'Polish' },
    pt: { nativeName: 'Português', englishName: 'Portuguese' },
    ca: { nativeName: 'Català', englishName: 'Catalan' },
    'zh-Hans': { nativeName: '简体中文', englishName: 'Chinese (Simplified)' },
  };

  return Object.keys(VOICE_LANGUAGES).map((code) => ({
    code,
    nativeName: languageInfo[code]?.nativeName ?? code,
    englishName: languageInfo[code]?.englishName ?? code,
  }));
});

function goBack() {
  router.push('/settings');
}

function selectLanguage(code: string) {
  setVoiceLanguage(code);
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" @click="goBack">
        <ChevronLeft class="h-5 w-5" />
      </Button>
      <div class="flex items-center gap-2">
        <Mic class="h-5 w-5 text-primary" />
        <h1 class="text-2xl font-semibold">{{ t('settings.voiceAssistant') }}</h1>
      </div>
    </header>

    <!-- Language Selection -->
    <Card>
      <CardHeader>
        <CardTitle class="text-base font-medium">
          {{ t('settingsVoice.languageTitle') }}
        </CardTitle>
        <p class="text-sm text-muted-foreground mt-1">
          {{ t('settingsVoice.languageDescription') }}
        </p>
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y">
          <button
            v-for="lang in voiceLanguages"
            :key="lang.code"
            class="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors"
            @click="selectLanguage(lang.code)"
          >
            <div class="text-left">
              <p class="font-medium">{{ lang.nativeName }}</p>
              <p class="text-sm text-muted-foreground">{{ lang.englishName }}</p>
            </div>
            <Check
              v-if="voiceLanguage === lang.code"
              class="h-5 w-5 text-primary"
            />
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- Info Footer -->
    <p class="text-sm text-muted-foreground mt-4 px-1">
      {{ t('settingsVoice.language.footer', { count: voiceLanguages.length }, voiceLanguages.length) }}
    </p>
  </div>
</template>
