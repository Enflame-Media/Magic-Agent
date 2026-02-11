/**
 * Translation composable wrapper for vue-i18n
 *
 * Provides a convenient interface to access translations and locale management
 * in Vue components using the Composition API.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useTranslation } from '@/composables/useTranslation';
 *
 * const { t, locale, setLocale, supportedLocales } = useTranslation();
 * </script>
 *
 * <template>
 *   <p>{{ t('common.loading') }}</p>
 *   <select :value="locale" @change="setLocale($event.target.value)">
 *     <option v-for="loc in supportedLocales" :key="loc" :value="loc">
 *       {{ loc }}
 *     </option>
 *   </select>
 * </template>
 * ```
 */
import { useI18n } from 'vue-i18n';
import {
    setLocale as setGlobalLocale,
    SUPPORTED_LOCALES,
    LOCALE_NAMES,
    type SupportedLocale,
} from '../../i18n';

/**
 * Composable for accessing translations and locale management
 */
export function useTranslation() {
    const { t, locale } = useI18n();

    /**
     * Set the active locale
     * This will update the global i18n instance, persist to localStorage,
     * and update the HTML lang attribute
     */
    function setLocale(newLocale: SupportedLocale | string) {
        if (SUPPORTED_LOCALES.includes(newLocale as SupportedLocale)) {
            setGlobalLocale(newLocale as SupportedLocale);
        }
    }

    return {
        /** Translation function - use to translate keys */
        t,
        /** Current locale (reactive) */
        locale,
        /** Set the active locale */
        setLocale,
        /** List of supported locale codes */
        supportedLocales: SUPPORTED_LOCALES,
        /** Map of locale codes to human-readable names */
        localeNames: LOCALE_NAMES,
    };
}
