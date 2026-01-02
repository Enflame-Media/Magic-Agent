<script setup lang="ts">
/**
 * DateRangeSelector Component
 *
 * Dropdown selector for filtering metrics by time range.
 * Supports 1h, 6h, 24h, and 7d options.
 *
 * @see HAP-697 - i18n migration
 */
import { computed } from 'vue';
import type { TimeRange } from '../lib/api';
import { useTranslation } from '@/composables/useTranslation';

interface Props {
    modelValue: TimeRange;
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
});

const emit = defineEmits<{
    'update:modelValue': [value: TimeRange];
}>();

const { t } = useTranslation();

// Computed options to enable reactive i18n labels
const options = computed<{ value: TimeRange; label: string }[]>(() => [
    { value: '1h', label: t('time.lastHour') },
    { value: '6h', label: t('time.last6Hours') },
    { value: '24h', label: t('time.last24Hours') },
    { value: '7d', label: t('analytics.last7Days') },
]);

function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value as TimeRange);
}
</script>

<template>
    <div class="inline-flex items-center gap-2">
        <label for="time-range" class="text-sm font-medium text-gray-600 dark:text-gray-400">
            {{ t('time.timeRange') }}:
        </label>
        <select
            id="time-range"
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
