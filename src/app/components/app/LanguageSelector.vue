<script setup lang="ts">
/**
 * LanguageSelector Component
 *
 * Dropdown selector for changing the application language.
 * Supports all 7 languages matching happy-app.
 *
 * Uses vue-i18n for internationalization and persists
 * the user's preference to localStorage.
 *
 * @see HAP-675 - Implement i18n with vue-i18n for web app
 */
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';
import type { SupportedLocale } from '@/i18n';

interface Props {
    disabled?: boolean;
    showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    showLabel: true,
});

const { t, locale, setLocale, supportedLocales, localeNames } = useTranslation();

/**
 * Options for the language selector dropdown
 * Each option shows the language name in its native script
 */
const options = computed(() =>
    supportedLocales.map((loc) => ({
        value: loc,
        label: localeNames[loc],
    }))
);

function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    setLocale(target.value as SupportedLocale);
}
</script>

<template>
    <div class="inline-flex items-center gap-2">
        <label
            v-if="props.showLabel"
            for="language-selector"
            class="text-sm font-medium text-gray-600 dark:text-gray-400"
        >
            {{ t('settings.language') }}:
        </label>
        <select
            id="language-selector"
            :value="locale"
            :disabled="props.disabled"
            class="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300
                   dark:border-gray-600 rounded-lg text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-happy-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed"
            @change="handleChange"
        >
            <option
                v-for="option in options"
                :key="option.value"
                :value="option.value"
            >
                {{ option.label }}
            </option>
        </select>
    </div>
</template>
