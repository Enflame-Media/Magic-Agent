<script setup lang="ts">
/**
 * DataUnavailableBanner Component (HAP-872)
 *
 * Displays an error banner when the dashboard cannot retrieve real data from
 * Analytics Engine. This alerts admins that the displayed metrics are empty
 * and helps them diagnose configuration issues.
 *
 * HAP-872: Renamed from MockDataBanner and updated to show error state
 * instead of demo data. Mock data fallbacks have been removed from the API.
 *
 * Possible causes for data unavailability:
 * - Analytics Engine datasets are empty (no data being collected)
 * - Secrets Store doesn't have ANALYTICS_ACCOUNT_ID or ANALYTICS_API_TOKEN
 * - happy-server-workers isn't writing metrics to Analytics Engine
 * - Analytics Engine SQL queries are failing
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
    /**
     * HAP-872: Whether data is unavailable from the API
     * (renamed from isMockData for clarity)
     */
    dataUnavailable: boolean;
    /**
     * Optional: Specify which data sources are unavailable
     */
    unavailableSources?: string[];
    /**
     * HAP-872: The reason why data is unavailable
     */
    reason?: 'not_configured' | 'empty_dataset' | 'query_failed' | null;
    /**
     * HAP-872: Detailed message from the API
     */
    message?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
    dataUnavailable: false,
    unavailableSources: () => [],
    reason: null,
    message: null,
});

const hasSpecificSources = computed(() => props.unavailableSources.length > 0);

/**
 * HAP-872: Get human-readable reason label
 */
const reasonLabel = computed(() => {
    switch (props.reason) {
        case 'not_configured':
            return t('dashboard.dataUnavailableBanner.reasonNotConfigured');
        case 'empty_dataset':
            return t('dashboard.dataUnavailableBanner.reasonEmptyDataset');
        case 'query_failed':
            return t('dashboard.dataUnavailableBanner.reasonQueryFailed');
        default:
            return t('dashboard.dataUnavailableBanner.reasonUnknown');
    }
});
</script>

<template>
    <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
    >
        <div
            v-if="props.dataUnavailable"
            class="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4 mb-6"
            role="alert"
        >
            <div class="flex items-start gap-3">
                <!-- Error Icon -->
                <div class="flex-shrink-0">
                    <svg
                        class="w-5 h-5 text-red-500 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold text-red-800 dark:text-red-200">
                        {{ t('dashboard.dataUnavailableBanner.title') }}
                    </h3>
                    <p class="mt-1 text-sm text-red-700 dark:text-red-300">
                        {{ t('dashboard.dataUnavailableBanner.description') }}
                    </p>

                    <!-- HAP-872: Show reason if available -->
                    <p
                        v-if="props.reason"
                        class="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                        {{ reasonLabel }}
                    </p>

                    <!-- Specific sources if provided -->
                    <ul
                        v-if="hasSpecificSources"
                        class="mt-2 text-xs text-red-600 dark:text-red-400 list-disc list-inside"
                    >
                        <li v-for="source in props.unavailableSources" :key="source">
                            {{ source }}
                        </li>
                    </ul>

                    <!-- Troubleshooting hint -->
                    <details class="mt-3 text-xs">
                        <summary
                            class="cursor-pointer text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                        >
                            {{ t('dashboard.dataUnavailableBanner.troubleshootingHint') }}
                        </summary>
                        <ul class="mt-2 ml-4 space-y-1 text-red-600 dark:text-red-400 list-disc">
                            <li>{{ t('dashboard.dataUnavailableBanner.checkSecrets') }}</li>
                            <li>{{ t('dashboard.dataUnavailableBanner.checkDatasets') }}</li>
                            <li>{{ t('dashboard.dataUnavailableBanner.checkIngestion') }}</li>
                            <li>{{ t('dashboard.dataUnavailableBanner.checkLogs') }}</li>
                        </ul>
                    </details>
                </div>

                <!-- Error badge -->
                <span
                    class="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200"
                >
                    {{ t('dashboard.dataUnavailableBanner.errorBadge') }}
                </span>
            </div>
        </div>
    </Transition>
</template>
