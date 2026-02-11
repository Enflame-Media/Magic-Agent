/**
 * Locale Management Composable
 *
 * Provides reactive locale management with:
 * - Dynamic language switching
 * - System language detection
 * - Persistent preferences (localStorage)
 * - RTL support preparation
 * - Date/time/number formatting per locale
 *
 * Usage:
 *   const { locale, setLocale, t, formatDate, formatNumber } = useLocale();
 */

import { computed, watch, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  type SupportedLanguage,
  type LanguageInfo,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  DEFAULT_LANGUAGE,
  detectSystemLocale,
  persistLocale,
  isRtlLanguage,
  getLanguageInfo,
  isSupportedLanguage,
} from '@/i18n';

/**
 * Date/time format options for different display contexts
 */
export interface DateTimeFormatOptions {
  /** Short date: 1/15/24 */
  short: Intl.DateTimeFormatOptions;
  /** Medium date: Jan 15, 2024 */
  medium: Intl.DateTimeFormatOptions;
  /** Long date: January 15, 2024 */
  long: Intl.DateTimeFormatOptions;
  /** Full date with day: Monday, January 15, 2024 */
  full: Intl.DateTimeFormatOptions;
  /** Time only: 3:45 PM */
  time: Intl.DateTimeFormatOptions;
  /** Date and time: Jan 15, 2024, 3:45 PM */
  dateTime: Intl.DateTimeFormatOptions;
  /** Relative time description */
  relative: Intl.RelativeTimeFormatOptions;
}

/**
 * Number format options for different display contexts
 */
export interface NumberFormatOptions {
  /** Standard decimal: 1,234.56 */
  decimal: Intl.NumberFormatOptions;
  /** Currency: $1,234.56 */
  currency: Intl.NumberFormatOptions;
  /** Percentage: 45% */
  percent: Intl.NumberFormatOptions;
  /** Compact: 1.2K, 3.4M */
  compact: Intl.NumberFormatOptions;
}

/**
 * Return type for useLocale composable
 */
export interface UseLocaleReturn {
  locale: ComputedRef<SupportedLanguage>;
  t: ReturnType<typeof useI18n>['t'];
  n: ReturnType<typeof useI18n>['n'];
  d: ReturnType<typeof useI18n>['d'];
  currentLanguageInfo: ComputedRef<LanguageInfo>;
  availableLanguages: ComputedRef<LanguageInfo[]>;
  setLocale: (newLocale: SupportedLanguage) => void;
  resetToSystemLocale: () => void;
  detectSystemLocale: () => SupportedLanguage;
  isRtl: ComputedRef<boolean>;
  formatDate: (date: Date | number | string, style?: 'short' | 'medium' | 'long' | 'full') => string;
  formatTime: (date: Date | number | string, includeSeconds?: boolean) => string;
  formatDateTime: (
    date: Date | number | string,
    dateStyle?: 'short' | 'medium' | 'long',
    timeStyle?: 'short' | 'medium'
  ) => string;
  formatRelativeTime: (date: Date | number | string) => string;
  formatNumber: (value: number, style?: 'decimal' | 'percent' | 'compact') => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatBytes: (bytes: number, decimals?: number) => string;
  isSupportedLanguage: typeof isSupportedLanguage;
  getLanguageInfo: typeof getLanguageInfo;
  SUPPORTED_LANGUAGES: typeof SUPPORTED_LANGUAGES;
  SUPPORTED_LANGUAGE_CODES: typeof SUPPORTED_LANGUAGE_CODES;
  DEFAULT_LANGUAGE: typeof DEFAULT_LANGUAGE;
}

/**
 * Locale composable for managing internationalization
 */
export function useLocale(): UseLocaleReturn {
  const { locale, t, n, d } = useI18n();

  /**
   * Current locale as a typed SupportedLanguage
   */
  const currentLocale = computed<SupportedLanguage>(() => {
    const current = locale.value;
    return isSupportedLanguage(current) ? current : DEFAULT_LANGUAGE;
  });

  /**
   * Current language info (native name, English name, etc.)
   */
  const currentLanguageInfo = computed(() => {
    return getLanguageInfo(currentLocale.value);
  });

  /**
   * Whether the current locale uses RTL text direction
   */
  const isRtl = computed(() => isRtlLanguage(currentLocale.value));

  /**
   * List of all available languages for language selector
   */
  const availableLanguages = computed(() => {
    return SUPPORTED_LANGUAGE_CODES.map((code) => SUPPORTED_LANGUAGES[code]);
  });

  /**
   * Set the locale and persist the preference
   */
  function setLocale(newLocale: SupportedLanguage): void {
    locale.value = newLocale;
    persistLocale(newLocale);

    // Update document attributes for RTL and lang
    updateDocumentAttributes(newLocale);
  }

  /**
   * Reset to system-detected locale
   */
  function resetToSystemLocale(): void {
    const systemLocale = detectSystemLocale();
    setLocale(systemLocale);
  }

  /**
   * Update HTML document attributes (lang, dir)
   */
  function updateDocumentAttributes(loc: SupportedLanguage): void {
    if (typeof document !== 'undefined') {
      // Map locale to BCP 47 language tag
      const langTag = loc === 'zh-Hans' ? 'zh-Hans' : loc;
      document.documentElement.lang = langTag;
      document.documentElement.dir = isRtlLanguage(loc) ? 'rtl' : 'ltr';
    }
  }

  // Initialize document attributes on mount
  updateDocumentAttributes(currentLocale.value);

  // Watch for locale changes to update document
  watch(currentLocale, (newLocale) => {
    updateDocumentAttributes(newLocale);
  });

  // ============================================
  // Date/Time Formatting
  // ============================================

  /**
   * Get the Intl locale string for the current locale
   */
  function getIntlLocale(): string {
    // Map our locale codes to Intl-compatible codes
    const localeMap: Record<SupportedLanguage, string> = {
      en: 'en-US',
      es: 'es-ES',
      ru: 'ru-RU',
      pl: 'pl-PL',
      pt: 'pt-BR',
      ca: 'ca-ES',
      'zh-Hans': 'zh-CN',
    };
    return localeMap[currentLocale.value] || 'en-US';
  }

  /**
   * Format a date according to the current locale
   */
  function formatDate(
    date: Date | number | string,
    style: 'short' | 'medium' | 'long' | 'full' = 'medium'
  ): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    const intlLocale = getIntlLocale();

    const options: Record<string, Intl.DateTimeFormatOptions> = {
      short: { dateStyle: 'short' },
      medium: { dateStyle: 'medium' },
      long: { dateStyle: 'long' },
      full: { dateStyle: 'full' },
    };

    return new Intl.DateTimeFormat(intlLocale, options[style]).format(dateObj);
  }

  /**
   * Format a time according to the current locale
   */
  function formatTime(date: Date | number | string, includeSeconds = false): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    const intlLocale = getIntlLocale();

    const options: Intl.DateTimeFormatOptions = {
      timeStyle: includeSeconds ? 'medium' : 'short',
    };

    return new Intl.DateTimeFormat(intlLocale, options).format(dateObj);
  }

  /**
   * Format a date and time according to the current locale
   */
  function formatDateTime(
    date: Date | number | string,
    dateStyle: 'short' | 'medium' | 'long' = 'medium',
    timeStyle: 'short' | 'medium' = 'short'
  ): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    const intlLocale = getIntlLocale();

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle,
      timeStyle,
    }).format(dateObj);
  }

  /**
   * Format a relative time (e.g., "2 hours ago", "in 3 days")
   */
  function formatRelativeTime(date: Date | number | string): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    const diffWeeks = Math.round(diffDays / 7);
    const diffMonths = Math.round(diffDays / 30);
    const diffYears = Math.round(diffDays / 365);

    const intlLocale = getIntlLocale();
    const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' });

    // Choose the most appropriate unit
    if (Math.abs(diffSecs) < 60) {
      return rtf.format(diffSecs, 'second');
    } else if (Math.abs(diffMins) < 60) {
      return rtf.format(diffMins, 'minute');
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    } else if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day');
    } else if (Math.abs(diffWeeks) < 4) {
      return rtf.format(diffWeeks, 'week');
    } else if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, 'month');
    } else {
      return rtf.format(diffYears, 'year');
    }
  }

  // ============================================
  // Number Formatting
  // ============================================

  /**
   * Format a number according to the current locale
   */
  function formatNumber(value: number, style: 'decimal' | 'percent' | 'compact' = 'decimal'): string {
    const intlLocale = getIntlLocale();

    const options: Record<string, Intl.NumberFormatOptions> = {
      decimal: { style: 'decimal' },
      percent: { style: 'percent' },
      compact: { notation: 'compact', compactDisplay: 'short' },
    };

    return new Intl.NumberFormat(intlLocale, options[style]).format(value);
  }

  /**
   * Format a currency value according to the current locale
   */
  function formatCurrency(value: number, currency = 'USD'): string {
    const intlLocale = getIntlLocale();

    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
    }).format(value);
  }

  /**
   * Format bytes into human-readable string (e.g., "1.5 MB")
   */
  function formatBytes(bytes: number, _decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes: readonly string[] = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const value = bytes / Math.pow(k, i);
    const unit = sizes[i] ?? 'Bytes';

    return `${formatNumber(value, 'decimal')} ${unit}`;
  }

  return {
    // Core i18n
    locale: currentLocale,
    t,
    n,
    d,

    // Language management
    currentLanguageInfo,
    availableLanguages,
    setLocale,
    resetToSystemLocale,
    detectSystemLocale,

    // RTL support
    isRtl,

    // Date/time formatting
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,

    // Number formatting
    formatNumber,
    formatCurrency,
    formatBytes,

    // Utilities
    isSupportedLanguage,
    getLanguageInfo,
    SUPPORTED_LANGUAGES,
    SUPPORTED_LANGUAGE_CODES,
    DEFAULT_LANGUAGE,
  };
}

export default useLocale;
