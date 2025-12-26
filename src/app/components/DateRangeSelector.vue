<script setup lang="ts">
/**
 * DateRangeSelector Component
 *
 * Dropdown selector for filtering metrics by time range.
 * Supports 1h, 6h, 24h, and 7d options.
 */
import type { TimeRange } from '../lib/api';

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

const options: { value: TimeRange; label: string }[] = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
];

function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value as TimeRange);
}
</script>

<template>
    <div class="inline-flex items-center gap-2">
        <label for="time-range" class="text-sm font-medium text-gray-600 dark:text-gray-400">
            Time Range:
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
