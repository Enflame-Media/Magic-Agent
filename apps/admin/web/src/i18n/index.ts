/**
 * Internationalization (i18n) configuration for Happy Admin
 *
 * Uses vue-i18n@9 with Composition API mode.
 * Supports 7 languages matching happy-app:
 * - English (en) - default
 * - Spanish (es)
 * - Russian (ru)
 * - Polish (pl)
 * - Portuguese (pt)
 * - Catalan (ca)
 * - Chinese Simplified (zh-Hans)
 */
import { createI18n } from 'vue-i18n';
import en from './locales/en';
import es from './locales/es';
import ru from './locales/ru';
import pl from './locales/pl';
import pt from './locales/pt';
import ca from './locales/ca';
import zhHans from './locales/zh-Hans';
import type { AdminTranslations } from './locales/en';

/**
 * Message schema type for vue-i18n
 */
type MessageSchema = AdminTranslations;

/**
 * Supported locale codes matching happy-app's language support
 */
export const SUPPORTED_LOCALES = ['en', 'es', 'ru', 'pl', 'pt', 'ca', 'zh-Hans'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Human-readable language names for each locale (in their native language)
 */
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
    en: 'English',
    es: 'Español',
    ru: 'Русский',
    pl: 'Polski',
    pt: 'Português',
    ca: 'Català',
    'zh-Hans': '简体中文',
};

/**
 * Type-safe check if a string is a supported locale
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
    return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Vue I18n instance configured for Composition API
 */
export const i18n = createI18n<[MessageSchema], SupportedLocale>({
    legacy: false, // Use Composition API
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
        en,
        es,
        ru,
        pl,
        pt,
        ca,
        'zh-Hans': zhHans,
    },
});

/**
 * Set the active locale and persist to localStorage
 * Also updates the HTML lang attribute for accessibility
 */
export function setLocale(locale: SupportedLocale): void {
    // Cast to handle vue-i18n's complex type system
    (i18n.global.locale as unknown as { value: string }).value = locale;
    document.documentElement.lang = locale;
    localStorage.setItem('happy_locale', locale);
}

/**
 * Get the stored locale from localStorage, falling back to browser detection
 */
export function getStoredLocale(): SupportedLocale {
    // Check localStorage first
    const stored = localStorage.getItem('happy_locale');
    if (stored && isSupportedLocale(stored)) {
        return stored;
    }

    // Detect from browser language
    const browserLang = navigator.language.split('-')[0] ?? 'en';
    if (isSupportedLocale(browserLang)) {
        return browserLang;
    }

    // Special handling for Chinese variants
    if (navigator.language.startsWith('zh')) {
        return 'zh-Hans';
    }

    // Default to English
    return 'en';
}
