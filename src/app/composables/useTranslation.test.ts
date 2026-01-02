/**
 * Tests for useTranslation Composable
 *
 * Tests the translation wrapper composable including:
 * - Translation function access
 * - Locale management
 * - Supported locales
 *
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Constants for mocking (must be defined before vi.mock calls are hoisted)
const MOCK_SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de'] as const;
const MOCK_LOCALE_NAMES = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
};

// Mock vue-i18n with factory function
vi.mock('vue-i18n', () => {
    const mockLocale = { value: 'en' };
    return {
        useI18n: () => ({
            t: vi.fn((key: string) => key),
            locale: mockLocale,
        }),
    };
});

// Mock the i18n module with factory function
vi.mock('../../i18n', () => ({
    setLocale: vi.fn(),
    SUPPORTED_LOCALES: ['en', 'es', 'fr', 'de'],
    LOCALE_NAMES: {
        en: 'English',
        es: 'Español',
        fr: 'Français',
        de: 'Deutsch',
    },
}));

// Import after mocks are set up
import { useTranslation } from './useTranslation';

describe('useTranslation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('t function', () => {
        it('should expose the translation function', () => {
            const { t } = useTranslation();

            expect(t).toBeDefined();
            expect(typeof t).toBe('function');
        });

        it('should return key when translation called', () => {
            const { t } = useTranslation();

            // The mock returns the key itself
            const result = t('common.loading');

            expect(result).toBe('common.loading');
        });
    });

    describe('locale', () => {
        it('should expose the current locale', () => {
            const { locale } = useTranslation();

            expect(locale).toBeDefined();
            expect(locale.value).toBe('en');
        });
    });

    describe('setLocale', () => {
        it('should be a function', () => {
            const { setLocale } = useTranslation();

            expect(typeof setLocale).toBe('function');
        });

        it('should accept valid locale string', () => {
            const { setLocale } = useTranslation();

            // Should not throw
            expect(() => setLocale('es')).not.toThrow();
        });

        it('should accept invalid locale without throwing', () => {
            const { setLocale } = useTranslation();

            // Should not throw even for invalid
            expect(() => setLocale('invalid-locale')).not.toThrow();
        });
    });

    describe('supportedLocales', () => {
        it('should expose list of supported locales', () => {
            const { supportedLocales } = useTranslation();

            expect(supportedLocales).toBeDefined();
            expect(Array.isArray(supportedLocales)).toBe(true);
        });

        it('should include common locales', () => {
            const { supportedLocales } = useTranslation();

            expect(supportedLocales).toContain('en');
            expect(supportedLocales).toContain('es');
        });

        it('should have expected locale count', () => {
            const { supportedLocales } = useTranslation();

            expect(supportedLocales.length).toBe(4);
        });
    });

    describe('localeNames', () => {
        it('should expose locale names map', () => {
            const { localeNames } = useTranslation();

            expect(localeNames).toBeDefined();
            expect(typeof localeNames).toBe('object');
        });

        it('should map locale codes to human-readable names', () => {
            const { localeNames } = useTranslation();

            expect(localeNames.en).toBe('English');
            expect(localeNames.es).toBe('Español');
        });
    });

    describe('composable return shape', () => {
        it('should return all expected properties', () => {
            const result = useTranslation();

            expect(result).toHaveProperty('t');
            expect(result).toHaveProperty('locale');
            expect(result).toHaveProperty('setLocale');
            expect(result).toHaveProperty('supportedLocales');
            expect(result).toHaveProperty('localeNames');
        });
    });
});
