<script setup lang="ts">
/**
 * Language Selector Component
 *
 * A dropdown menu for selecting the application language.
 * Shows the native name of each language for easy identification.
 * Persists the selection to localStorage and updates the app locale.
 *
 * Features:
 * - Shows current language with native name
 * - Dropdown with all 7 supported languages
 * - Visual indicator for selected language
 * - Integrates with vue-i18n via useLocale composable
 */
import { Check, Globe } from 'lucide-vue-next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/composables/useLocale';

withDefaults(
  defineProps<{
    /** Show as icon-only button */
    iconOnly?: boolean;
    /** Button variant */
    variant?: 'default' | 'outline' | 'ghost' | 'secondary';
    /** Button size */
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }>(),
  {
    iconOnly: false,
    variant: 'outline',
    size: 'default',
  }
);

const { locale, currentLanguageInfo, availableLanguages, setLocale, t } = useLocale();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button :variant="variant" :size="iconOnly ? 'icon' : size">
        <Globe class="size-4" :class="{ 'mr-2': !iconOnly }" />
        <span v-if="!iconOnly">{{ currentLanguageInfo.nativeName }}</span>
        <span v-else class="sr-only">{{ t('languageSelector.title') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuLabel>{{ t('languageSelector.title') }}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="lang in availableLanguages"
        :key="lang.code"
        class="flex items-center justify-between cursor-pointer"
        @click="setLocale(lang.code)"
      >
        <span class="flex flex-col">
          <span class="font-medium">{{ lang.nativeName }}</span>
          <span class="text-xs text-muted-foreground">{{ lang.englishName }}</span>
        </span>
        <Check v-if="locale === lang.code" class="size-4 text-primary" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
