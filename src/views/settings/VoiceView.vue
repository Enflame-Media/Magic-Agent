<script setup lang="ts">
/**
 * Voice Settings - Voice Assistant Language Configuration & Access Status
 *
 * Displays voice trial/subscription status and allows users to select
 * their preferred language for voice assistant interactions.
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

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronLeft, Check, Mic, AlertCircle, CheckCircle2, XCircle, Sparkles } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useVoice } from '@/composables/useVoice';
import { useVoiceAccess } from '@/composables/useVoiceAccess';
import { usePurchases } from '@/composables/usePurchases';
import { useLocale } from '@/composables/useLocale';
import { VOICE_LANGUAGES } from '@/services/voice/config';

const router = useRouter();
const { voiceLanguage, setVoiceLanguage, voiceAssistantEnabled, setVoiceAssistantEnabled } = useVoice();
const { hasAccess, isLoading: isCheckingAccess, error: accessError, checkAccess } = useVoiceAccess();
const { showPaywall, isPro } = usePurchases();
const { t } = useLocale();

// Track if we've attempted to check access
const hasCheckedAccess = ref(false);

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

/**
 * Computed status for display
 */
const accessStatus = computed(() => {
  if (isCheckingAccess.value) {
    return 'loading';
  }
  if (accessError.value) {
    return 'error';
  }
  if (hasAccess.value) {
    return 'active';
  }
  return 'inactive';
});

function goBack() {
  router.push('/settings');
}

function selectLanguage(code: string) {
  setVoiceLanguage(code);
}

function handleUpgrade() {
  showPaywall('voice_settings');
}

async function retryAccessCheck() {
  await checkAccess();
}

// Check access status on mount
onMounted(async () => {
  if (!hasCheckedAccess.value) {
    hasCheckedAccess.value = true;
    await checkAccess();
  }
});
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

    <!-- Voice Assistant Enable/Disable Toggle -->
    <Card class="mb-4">
      <CardHeader>
        <CardTitle class="text-base font-medium">
          {{ t('settingsVoice.voiceAssistantTitle') }}
        </CardTitle>
        <CardDescription>
          {{ t('settingsVoice.voiceAssistantDescription') }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-between rounded-lg border p-3">
          <div class="flex items-center gap-3">
            <Mic class="h-5 w-5 text-primary" />
            <div>
              <p class="font-medium">{{ t('settingsVoice.enableVoiceAssistant') }}</p>
              <p class="text-sm text-muted-foreground">
                {{ voiceAssistantEnabled ? t('settingsVoice.voiceAssistantEnabledSubtitle') : t('settingsVoice.voiceAssistantDisabledSubtitle') }}
              </p>
            </div>
          </div>
          <Switch
            :checked="voiceAssistantEnabled"
            @update:checked="setVoiceAssistantEnabled"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Voice Access Status Card -->
    <Card class="mb-4">
      <CardHeader>
        <CardTitle class="text-base font-medium flex items-center gap-2">
          {{ t('settingsVoice.accessStatus.title') }}
        </CardTitle>
        <CardDescription>
          {{ t('settingsVoice.accessStatus.description') }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Loading State -->
        <div
          v-if="accessStatus === 'loading'"
          class="p-3 rounded-lg bg-muted/50"
        >
          <div class="flex items-center gap-3">
            <Skeleton class="h-5 w-5 rounded-full" />
            <div class="space-y-2 flex-1">
              <Skeleton class="h-4 w-24" />
              <Skeleton class="h-3 w-40" />
            </div>
          </div>
        </div>

        <!-- Active State -->
        <div
          v-else-if="accessStatus === 'active'"
          class="flex items-center justify-between p-3 rounded-lg bg-green-500/10 dark:bg-green-500/20"
        >
          <div class="flex items-center gap-3">
            <CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p class="font-medium text-green-700 dark:text-green-300">
                {{ t('settingsVoice.accessStatus.active') }}
              </p>
              <p class="text-sm text-green-600/80 dark:text-green-400/80">
                {{ isPro ? t('settingsVoice.accessStatus.proSubscription') : t('settingsVoice.accessStatus.trialActive') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Inactive State -->
        <div
          v-else-if="accessStatus === 'inactive'"
          class="space-y-3"
        >
          <div class="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
            <XCircle class="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div class="flex-1">
              <p class="font-medium text-amber-700 dark:text-amber-300">
                {{ t('settingsVoice.accessStatus.inactive') }}
              </p>
              <p class="text-sm text-amber-600/80 dark:text-amber-400/80">
                {{ t('settingsVoice.accessStatus.upgradePrompt') }}
              </p>
            </div>
          </div>
          <Button
            class="w-full"
            @click="handleUpgrade"
          >
            <Sparkles class="h-4 w-4 mr-2" />
            {{ t('settingsVoice.accessStatus.upgradeButton') }}
          </Button>
        </div>

        <!-- Error State -->
        <div
          v-else-if="accessStatus === 'error'"
          class="space-y-3"
        >
          <div class="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
            <AlertCircle class="h-5 w-5 text-destructive" />
            <div class="flex-1">
              <p class="font-medium text-destructive">
                {{ t('settingsVoice.accessStatus.error') }}
              </p>
              <p class="text-sm text-destructive/80">
                {{ accessError }}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            class="w-full"
            @click="retryAccessCheck"
          >
            {{ t('common.retry') }}
          </Button>
        </div>
      </CardContent>
    </Card>

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
