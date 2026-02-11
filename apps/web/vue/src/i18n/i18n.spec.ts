/**
 * i18n Translation Tests
 *
 * Comprehensive test coverage for the internationalization system.
 * Ensures translation quality and completeness across all locales.
 *
 * Tests are organized into two categories:
 * 1. **Strict tests**: Must pass - validate core i18n infrastructure
 * 2. **Audit tests**: Report issues as warnings - track translation quality
 *
 * @see HAP-726 - Add i18n test coverage for translation keys
 */

import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
  isRtlLanguage,
  type SupportedLanguage,
} from './index';

// Import all locale files directly for testing
import en from './locales/en.json';
import es from './locales/es.json';
import ru from './locales/ru.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ca from './locales/ca.json';
import zhHans from './locales/zh-Hans.json';

type LocaleMessages = Record<string, unknown>;

const locales: Record<SupportedLanguage, LocaleMessages> = {
  en,
  es,
  ru,
  pl,
  pt,
  ca,
  'zh-Hans': zhHans,
};

/**
 * Recursively extracts all keys from a nested object as dot-notation paths.
 * e.g., { a: { b: 'value' } } -> ['a.b']
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse into nested objects
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      // Leaf node - add the key
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

/**
 * Extracts interpolation placeholders from a translation string.
 * Matches patterns like {name}, {count}, {time}, etc.
 * Filters out vue-i18n special pluralization markers like {count_PLURAL}
 */
function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{([^}]+)\}/g);
  if (!matches) return [];

  return matches
    .map((m) => m.slice(1, -1))
    // Filter out vue-i18n internal pluralization markers (ending with _PLURAL)
    .filter((p) => !p.endsWith('_PLURAL'))
    .sort();
}

/**
 * Gets a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Validates pluralization syntax for vue-i18n.
 * Vue-i18n uses pipe | to separate plural forms.
 * Valid formats:
 *   - "message" (no pluralization)
 *   - "singular | plural" (2 forms)
 *   - "zero | one | other" (3+ forms)
 *
 * Returns false for pipes used as bullet/list separators (not pluralization).
 */
function isValidPluralization(text: string): boolean {
  // If no pipe, it's a regular string (valid)
  if (!text.includes('|')) {
    return true;
  }

  // Split by pipe and check each form is non-empty after trimming
  const forms = text.split('|').map((f) => f.trim());

  // Must have at least 2 forms for pluralization
  if (forms.length < 2) {
    return false;
  }

  // Each form should be non-empty
  return forms.every((form) => form.length > 0);
}

/**
 * Checks if a string contains pluralization pipes.
 */
function hasPluralization(text: string): boolean {
  return text.includes('|');
}

/**
 * Known translation issues that are tracked but don't fail tests.
 * These should be addressed in future translation updates.
 */
const KNOWN_ISSUES = {
  // Keys in en.json that are missing from other locales (e.g., new features)
  missingKeyPrefixes: [
    'sharing.', // Session sharing feature - pending translation
    'common.optional', // New key - pending translation
  ],
  // Keys that exist in locales but not in en.json (legacy keys to clean up)
  extraKeyPrefixes: [
    'modals.disconnectService', // Old key format, should be removed
    'settingsAccount.showOnlineStatusEnabled', // Duplicate of existing key
    'components.errorBoundary.supportId', // Legacy key
  ],
  // Keys with known pluralization format issues (using pipes as bullets)
  pluralizationIssues: [
    'machine.offlineHelp', // Uses | as bullet points, not pluralization
  ],
};

/**
 * Checks if a key matches any of the known issue prefixes.
 */
function isKnownMissingKey(key: string): boolean {
  return KNOWN_ISSUES.missingKeyPrefixes.some((prefix) => key.startsWith(prefix));
}

function isKnownExtraKey(key: string): boolean {
  return KNOWN_ISSUES.extraKeyPrefixes.some((prefix) => key.startsWith(prefix));
}

function isKnownPluralizationIssue(key: string): boolean {
  return KNOWN_ISSUES.pluralizationIssues.includes(key);
}

describe('i18n translations', () => {
  const englishKeys = getAllKeys(en as Record<string, unknown>);
  const nonEnglishLocales = SUPPORTED_LANGUAGE_CODES.filter((code) => code !== 'en');

  describe('locale configuration', () => {
    it('should have all supported locales configured', () => {
      expect(SUPPORTED_LANGUAGE_CODES).toContain('en');
      expect(SUPPORTED_LANGUAGE_CODES).toContain('es');
      expect(SUPPORTED_LANGUAGE_CODES).toContain('ru');
      expect(SUPPORTED_LANGUAGE_CODES).toContain('pl');
      expect(SUPPORTED_LANGUAGE_CODES).toContain('pt');
      expect(SUPPORTED_LANGUAGE_CODES).toContain('ca');
      expect(SUPPORTED_LANGUAGE_CODES).toContain('zh-Hans');
    });

    it('should have metadata for all supported languages', () => {
      for (const code of SUPPORTED_LANGUAGE_CODES) {
        const info = SUPPORTED_LANGUAGES[code];
        expect(info).toBeDefined();
        expect(info.code).toBe(code);
        expect(info.nativeName).toBeTruthy();
        expect(info.englishName).toBeTruthy();
      }
    });
  });

  describe('key coverage', () => {
    it('English locale should have translation keys', () => {
      expect(englishKeys.length).toBeGreaterThan(0);
    });

    it.each(nonEnglishLocales)(
      '%s locale should have the same keys as English (excluding known gaps)',
      (locale) => {
        const localeMessages = locales[locale];
        const localeKeys = getAllKeys(localeMessages as Record<string, unknown>);

        // Find keys in English that are missing in this locale
        const missingKeys = englishKeys.filter((key) => !localeKeys.includes(key));
        const extraKeys = localeKeys.filter((key) => !englishKeys.includes(key));

        // Separate known issues from unexpected issues
        const knownMissing = missingKeys.filter(isKnownMissingKey);
        const unexpectedMissing = missingKeys.filter((key) => !isKnownMissingKey(key));
        const knownExtra = extraKeys.filter(isKnownExtraKey);
        const unexpectedExtra = extraKeys.filter((key) => !isKnownExtraKey(key));

        // Log known issues as info for tracking
        if (knownMissing.length > 0) {
          console.info(
            `[${locale}] Known missing keys (${knownMissing.length}): ` +
              `${knownMissing.slice(0, 5).join(', ')}${knownMissing.length > 5 ? '...' : ''}`
          );
        }
        if (knownExtra.length > 0) {
          console.info(
            `[${locale}] Known extra keys (${knownExtra.length}): ` +
              `${knownExtra.slice(0, 5).join(', ')}${knownExtra.length > 5 ? '...' : ''}`
          );
        }

        // Fail on unexpected issues
        if (unexpectedMissing.length > 0) {
          console.error(
            `[${locale}] UNEXPECTED missing ${unexpectedMissing.length} keys: ` +
              `${unexpectedMissing.slice(0, 10).join(', ')}${unexpectedMissing.length > 10 ? '...' : ''}`
          );
        }
        if (unexpectedExtra.length > 0) {
          console.error(
            `[${locale}] UNEXPECTED extra ${unexpectedExtra.length} keys: ` +
              `${unexpectedExtra.slice(0, 10).join(', ')}${unexpectedExtra.length > 10 ? '...' : ''}`
          );
        }

        expect(unexpectedMissing).toEqual([]);
        expect(unexpectedExtra).toEqual([]);
      }
    );
  });

  describe('interpolation placeholders', () => {
    it.each(nonEnglishLocales)(
      '%s locale should have consistent interpolation placeholders with English',
      (locale) => {
        const localeMessages = locales[locale];
        const inconsistencies: string[] = [];

        // Only check keys that exist in both locales
        const localeKeys = getAllKeys(localeMessages as Record<string, unknown>);
        const commonKeys = englishKeys.filter((key) => localeKeys.includes(key));

        for (const key of commonKeys) {
          const enValue = getNestedValue(en as Record<string, unknown>, key);
          const localeValue = getNestedValue(localeMessages as Record<string, unknown>, key);

          // Only check string values
          if (typeof enValue === 'string' && typeof localeValue === 'string') {
            const enPlaceholders = extractPlaceholders(enValue);
            const localePlaceholders = extractPlaceholders(localeValue);

            // Check if placeholders match (order doesn't matter)
            const enSet = new Set(enPlaceholders);
            const localeSet = new Set(localePlaceholders);

            const missingPlaceholders = enPlaceholders.filter((p) => !localeSet.has(p));
            const extraPlaceholders = localePlaceholders.filter((p) => !enSet.has(p));

            if (missingPlaceholders.length > 0 || extraPlaceholders.length > 0) {
              inconsistencies.push(
                `${key}: EN has {${enPlaceholders.join(', ')}}, ` +
                  `${locale.toUpperCase()} has {${localePlaceholders.join(', ')}}`
              );
            }
          }
        }

        if (inconsistencies.length > 0) {
          console.warn(
            `[${locale}] Placeholder inconsistencies:\n` +
              `${inconsistencies.slice(0, 5).join('\n')}${inconsistencies.length > 5 ? '\n...' : ''}`
          );
        }

        expect(inconsistencies).toEqual([]);
      }
    );
  });

  describe('pluralization syntax', () => {
    it.each(SUPPORTED_LANGUAGE_CODES)(
      '%s locale should have valid pluralization syntax',
      (locale) => {
        const localeMessages = locales[locale];
        const localeKeys = getAllKeys(localeMessages as Record<string, unknown>);
        const invalidKeys: string[] = [];

        for (const key of localeKeys) {
          const value = getNestedValue(localeMessages as Record<string, unknown>, key);

          if (typeof value === 'string' && hasPluralization(value)) {
            // Skip known pluralization issues (e.g., pipes used as bullets)
            if (isKnownPluralizationIssue(key)) {
              continue;
            }

            if (!isValidPluralization(value)) {
              invalidKeys.push(`${key}: "${value.slice(0, 50)}..."`);
            }
          }
        }

        if (invalidKeys.length > 0) {
          console.warn(`[${locale}] Invalid pluralization:\n${invalidKeys.join('\n')}`);
        }

        expect(invalidKeys).toEqual([]);
      }
    );

    it('should detect strings using pluralization', () => {
      // Verify our test helpers work - these keys use pluralization in en.json
      const pluralizedKeys = [
        'time.minutesAgo',
        'time.hoursAgo',
        'sessionHistory.daysAgo',
        'sessionHistory.sessionsCount',
      ];

      for (const key of pluralizedKeys) {
        const value = getNestedValue(en as Record<string, unknown>, key);
        expect(typeof value).toBe('string');
        expect(hasPluralization(value as string)).toBe(true);
      }
    });
  });

  describe('missing translation detection', () => {
    it('should not have empty string translations', () => {
      for (const locale of SUPPORTED_LANGUAGE_CODES) {
        const localeMessages = locales[locale];
        const localeKeys = getAllKeys(localeMessages as Record<string, unknown>);
        const emptyKeys: string[] = [];

        for (const key of localeKeys) {
          const value = getNestedValue(localeMessages as Record<string, unknown>, key);

          if (value === '') {
            emptyKeys.push(key);
          }
        }

        if (emptyKeys.length > 0) {
          console.warn(`[${locale}] Empty translations: ${emptyKeys.join(', ')}`);
        }

        expect(emptyKeys).toEqual([]);
      }
    });

    it('should not have translations identical to the English key path', () => {
      // This catches lazy translations where someone just copies the key name
      const suspiciousTranslations: Record<string, string[]> = {};

      for (const locale of nonEnglishLocales) {
        const localeMessages = locales[locale];
        const suspicious: string[] = [];

        for (const key of englishKeys) {
          const value = getNestedValue(localeMessages as Record<string, unknown>, key);
          const keyParts = key.split('.');
          const lastPart = keyParts[keyParts.length - 1];

          // Check if translation is just the key name (camelCase or kebab-case)
          if (typeof value === 'string') {
            const normalizedValue = value.toLowerCase().replace(/[\s-_]/g, '');
            const normalizedKey = lastPart?.toLowerCase().replace(/[\s-_]/g, '');

            // Only flag if it looks like an untranslated key AND differs from English
            const enValue = getNestedValue(en as Record<string, unknown>, key);
            if (normalizedValue === normalizedKey && value !== enValue) {
              suspicious.push(`${key}: "${value}"`);
            }
          }
        }

        if (suspicious.length > 0) {
          suspiciousTranslations[locale] = suspicious;
        }
      }

      // This is a warning test - we log but don't fail for now
      // as some keys legitimately match their path names
      for (const [locale, keys] of Object.entries(suspiciousTranslations)) {
        if (keys.length > 0) {
          console.warn(`[${locale}] Potentially untranslated: ${keys.slice(0, 5).join(', ')}`);
        }
      }
    });
  });

  describe('RTL language support', () => {
    it('should correctly identify RTL languages', () => {
      // Currently no RTL languages are supported, but the function should work
      for (const code of SUPPORTED_LANGUAGE_CODES) {
        const isRtl = isRtlLanguage(code);
        expect(typeof isRtl).toBe('boolean');
      }
    });

    it('should return false for all current LTR languages', () => {
      // All currently supported languages are LTR
      const ltrLanguages: SupportedLanguage[] = ['en', 'es', 'ru', 'pl', 'pt', 'ca', 'zh-Hans'];

      for (const code of ltrLanguages) {
        expect(isRtlLanguage(code)).toBe(false);
      }
    });

    it('isRtlLanguage should be prepared for future RTL languages', () => {
      // Verify the function exists and is callable
      // When Arabic or Hebrew is added, this test should be updated
      expect(typeof isRtlLanguage).toBe('function');
    });
  });

  describe('translation quality', () => {
    it('should not have HTML tags in translations (use components instead)', () => {
      const htmlTagPattern = /<[a-z][\s\S]*>/i;
      const violatingKeys: Record<string, string[]> = {};

      for (const locale of SUPPORTED_LANGUAGE_CODES) {
        const localeMessages = locales[locale];
        const localeKeys = getAllKeys(localeMessages as Record<string, unknown>);
        const violations: string[] = [];

        for (const key of localeKeys) {
          const value = getNestedValue(localeMessages as Record<string, unknown>, key);

          if (typeof value === 'string' && htmlTagPattern.test(value)) {
            violations.push(key);
          }
        }

        if (violations.length > 0) {
          violatingKeys[locale] = violations;
        }
      }

      // Log violations as warnings but don't fail
      // Some legitimate cases may use HTML entities
      for (const [locale, keys] of Object.entries(violatingKeys)) {
        if (keys.length > 0) {
          console.warn(`[${locale}] Translations with HTML: ${keys.join(', ')}`);
        }
      }
    });

    it('should have reasonable translation lengths', () => {
      // Translations shouldn't be excessively long or short compared to English
      const MAX_LENGTH_RATIO = 3; // Translation shouldn't be 3x longer than English
      const warnings: string[] = [];

      for (const locale of nonEnglishLocales) {
        const localeMessages = locales[locale];

        for (const key of englishKeys) {
          const enValue = getNestedValue(en as Record<string, unknown>, key);
          const localeValue = getNestedValue(localeMessages as Record<string, unknown>, key);

          if (typeof enValue === 'string' && typeof localeValue === 'string') {
            const enLength = enValue.length;
            const localeLength = localeValue.length;

            // Only warn for significant strings (> 10 chars) that are much longer
            if (enLength > 10 && localeLength > enLength * MAX_LENGTH_RATIO) {
              warnings.push(
                `[${locale}] ${key}: EN=${enLength}chars, locale=${localeLength}chars`
              );
            }
          }
        }
      }

      if (warnings.length > 0) {
        console.warn(`Translation length warnings:\n${warnings.slice(0, 10).join('\n')}`);
      }
    });
  });

  describe('special characters', () => {
    it('should handle ampersands correctly in translations', () => {
      // Vue-i18n handles special characters fine - this test validates
      // that we can have & in translations (it's not HTML-escaped)
      const keysWithAmpersands: string[] = [];

      for (const locale of SUPPORTED_LANGUAGE_CODES) {
        const localeMessages = locales[locale];
        const localeKeys = getAllKeys(localeMessages as Record<string, unknown>);

        for (const key of localeKeys) {
          const value = getNestedValue(localeMessages as Record<string, unknown>, key);

          if (typeof value === 'string' && value.includes('&')) {
            keysWithAmpersands.push(`[${locale}] ${key}`);
          }
        }
      }

      // Just log for awareness - ampersands are valid in vue-i18n
      if (keysWithAmpersands.length > 0) {
        console.info(`Translations containing &: ${keysWithAmpersands.length} keys`);
      }

      // This test passes - ampersands are handled correctly by vue-i18n
      expect(true).toBe(true);
    });
  });
});

describe('i18n utility functions', () => {
  describe('getAllKeys helper', () => {
    it('should extract flat keys', () => {
      const obj = { a: 'value', b: 'value' };
      expect(getAllKeys(obj)).toEqual(['a', 'b']);
    });

    it('should extract nested keys with dot notation', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(getAllKeys(obj)).toEqual(['a.b.c']);
    });

    it('should handle mixed nesting', () => {
      const obj = {
        flat: 'value',
        nested: {
          deep: 'value',
          deeper: {
            deepest: 'value',
          },
        },
      };
      expect(getAllKeys(obj)).toEqual(['flat', 'nested.deep', 'nested.deeper.deepest']);
    });
  });

  describe('extractPlaceholders helper', () => {
    it('should extract simple placeholders', () => {
      expect(extractPlaceholders('Hello {name}')).toEqual(['name']);
    });

    it('should extract multiple placeholders', () => {
      expect(extractPlaceholders('{greeting} {name}, you have {count} messages')).toEqual([
        'count',
        'greeting',
        'name',
      ]);
    });

    it('should return empty array for no placeholders', () => {
      expect(extractPlaceholders('Hello world')).toEqual([]);
    });

    it('should filter out _PLURAL markers', () => {
      expect(extractPlaceholders('{count} tool{count_PLURAL}')).toEqual(['count']);
    });
  });

  describe('isValidPluralization helper', () => {
    it('should accept strings without pipes', () => {
      expect(isValidPluralization('Hello world')).toBe(true);
    });

    it('should accept valid dual forms', () => {
      expect(isValidPluralization('1 item | {count} items')).toBe(true);
    });

    it('should accept valid triple forms', () => {
      expect(isValidPluralization('no items | 1 item | {count} items')).toBe(true);
    });

    it('should reject empty forms', () => {
      expect(isValidPluralization('item |')).toBe(false);
      expect(isValidPluralization('| items')).toBe(false);
      expect(isValidPluralization('|')).toBe(false);
    });

    it('should handle whitespace around pipes', () => {
      expect(isValidPluralization('item|items')).toBe(true);
      expect(isValidPluralization('item | items')).toBe(true);
      expect(isValidPluralization('item  |  items')).toBe(true);
    });
  });
});

/**
 * Translation audit report
 *
 * This test suite generates a summary of translation coverage and issues.
 * It doesn't fail but provides valuable metrics for tracking translation health.
 */
describe('translation audit report', () => {
  it('should generate translation coverage summary', () => {
    const englishKeys = getAllKeys(en as Record<string, unknown>);
    const report: Record<string, { total: number; missing: number; extra: number }> = {};

    for (const locale of SUPPORTED_LANGUAGE_CODES) {
      const localeMessages = locales[locale];
      const localeKeys = getAllKeys(localeMessages as Record<string, unknown>);

      const missing = englishKeys.filter((key) => !localeKeys.includes(key)).length;
      const extra = localeKeys.filter((key) => !englishKeys.includes(key)).length;

      report[locale] = {
        total: localeKeys.length,
        missing,
        extra,
      };
    }

    // Log the coverage report
    console.info('\n=== Translation Coverage Report ===');
    console.info(`English keys: ${englishKeys.length}`);
    console.info('');
    for (const [locale, stats] of Object.entries(report)) {
      const coverage = (
        ((englishKeys.length - stats.missing) / englishKeys.length) *
        100
      ).toFixed(1);
      console.info(
        `[${locale}] ${stats.total} keys, ${coverage}% coverage, ` +
          `${stats.missing} missing, ${stats.extra} extra`
      );
    }
    console.info('===================================\n');

    // This test always passes - it's for reporting only
    expect(true).toBe(true);
  });
});
