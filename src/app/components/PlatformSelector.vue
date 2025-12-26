<script setup lang="ts">
/**
 * PlatformSelector Component
 *
 * Dropdown selector for filtering bundle metrics by platform.
 * Follows DateRangeSelector.vue pattern.
 *
 * @see HAP-571 - Add platform filter selector to bundle size dashboard
 */

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

const options: { value: Platform; label: string }[] = [
    { value: 'all', label: 'All Platforms' },
    { value: 'web', label: 'Web' },
    { value: 'ios', label: 'iOS' },
    { value: 'android', label: 'Android' },
];

function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value as Platform);
}
</script>

<template>
    <div class="inline-flex items-center gap-2">
        <label for="platform" class="text-sm font-medium text-gray-600 dark:text-gray-400">
            Platform:
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
