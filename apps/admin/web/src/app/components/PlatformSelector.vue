<script setup lang="ts">
/**
 * PlatformSelector Component
 *
 * Dropdown selector for filtering bundle metrics by platform.
 * Follows DateRangeSelector.vue pattern.
 *
 * @see HAP-571 - Add platform filter selector to bundle size dashboard
 * @see HAP-697 - i18n migration
 */
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

export type Platform = 'all' | 'web' | 'ios' | 'android';

interface Props {
    modelValue: Platform;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
});

const emit = defineEmits<{
    'update:modelValue': [value: Platform];
}>();

const { t } = useTranslation();

// Computed options to enable reactive i18n labels
const options = computed<{ value: Platform; label: string }[]>(() => [
    { value: 'all', label: t('analytics.allPlatforms') },
    { value: 'web', label: t('analytics.web') },
    { value: 'ios', label: t('analytics.ios') },
    { value: 'android', label: t('analytics.android') },
]);

function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value as Platform);
}
</script>

<template>
    <div class="inline-flex items-center gap-2">
        <label for="platform" class="text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ t('analytics.platform') }}:
        </label>
        <select
            id="platform"
            :value="props.modelValue"
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
