/**
 * Shiki Syntax Highlighter Composable
 *
 * Provides lazy-loaded syntax highlighting with:
 * - Singleton highlighter instance for performance
 * - Dark/light theme support via CSS variables
 * - On-demand language loading to optimize bundle size
 * - Graceful fallback for unsupported languages
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useShiki } from '@/composables/useShiki';
 *
 * const { highlightCode, isReady } = useShiki();
 * const html = await highlightCode('const x = 1;', 'typescript');
 * </script>
 * ```
 */

import { ref, shallowRef, type Ref, type ShallowRef } from 'vue';
import type { Highlighter, BundledLanguage, SpecialLanguage } from 'shiki';

/**
 * Languages to load by default for common code highlighting.
 * These are frequently used languages in Claude Code sessions.
 */
const DEFAULT_LANGUAGES: BundledLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'json',
  'html',
  'css',
  'bash',
  'shell',
  'markdown',
];

/**
 * Language aliases mapping common names to Shiki language IDs.
 */
const LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  sh: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  jsx: 'javascript',
  tsx: 'typescript',
  md: 'markdown',
  dockerfile: 'docker',
  makefile: 'make',
};

/**
 * Singleton highlighter state shared across all component instances.
 */
const highlighter: ShallowRef<Highlighter | null> = shallowRef(null);
const isLoading = ref(false);
const isReady = ref(false);
const loadedLanguages = new Set<string>(DEFAULT_LANGUAGES);
const highlightCache = new Map<string, string>();

/**
 * Maximum cache size before cleanup (in entries).
 */
const MAX_CACHE_SIZE = 100;

/**
 * Creates a cache key from code and language.
 */
function getCacheKey(code: string, language: string): string {
  return `${language}:${code}`;
}

/**
 * Cleans up the cache if it exceeds the maximum size.
 * Removes oldest entries first (simple FIFO).
 */
function cleanupCache(): void {
  if (highlightCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(highlightCache.keys()).slice(0, highlightCache.size - MAX_CACHE_SIZE);
    keysToDelete.forEach((key) => highlightCache.delete(key));
  }
}

/**
 * Resolves a language alias to its Shiki language ID.
 */
function resolveLanguage(language: string): BundledLanguage | SpecialLanguage | null {
  const normalized = language.toLowerCase().trim();

  // Check aliases first
  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }

  // Return as-is if it looks like a valid language
  if (normalized && normalized !== 'text' && normalized !== 'plain') {
    return normalized as BundledLanguage;
  }

  return null;
}

/**
 * Initializes the Shiki highlighter with default languages and themes.
 * Uses dynamic import for optimal bundle splitting.
 */
async function initializeHighlighter(): Promise<Highlighter> {
  if (highlighter.value) {
    return highlighter.value;
  }

  if (isLoading.value) {
    // Wait for existing initialization
    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (highlighter.value) {
          clearInterval(checkReady);
          resolve(highlighter.value);
        }
      }, 50);
    });
  }

  isLoading.value = true;

  try {
    const { createHighlighter } = await import('shiki');

    const instance = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: DEFAULT_LANGUAGES,
    });

    highlighter.value = instance;
    isReady.value = true;

    return instance;
  } finally {
    isLoading.value = false;
  }
}

/**
 * Loads a language into the highlighter if not already loaded.
 */
async function loadLanguage(language: BundledLanguage): Promise<boolean> {
  if (!highlighter.value) {
    return false;
  }

  if (loadedLanguages.has(language)) {
    return true;
  }

  try {
    await highlighter.value.loadLanguage(language);
    loadedLanguages.add(language);
    return true;
  } catch {
    // Language not supported
    return false;
  }
}

/**
 * Composable for syntax highlighting with Shiki.
 *
 * Features:
 * - Lazy initialization of the Shiki highlighter
 * - Singleton pattern for efficient resource usage
 * - On-demand language loading
 * - Dark/light theme support via CSS variables
 * - Caching of highlighted output
 * - Graceful fallback for unsupported languages
 */
export function useShiki(): {
  highlightCode: (code: string, language: string) => Promise<string>;
  highlightCodeSync: (code: string, language: string) => string | null;
  isReady: Ref<boolean>;
  isLoading: Ref<boolean>;
  preloadLanguages: (languages: BundledLanguage[]) => Promise<void>;
} {
  /**
   * Highlights code asynchronously using Shiki.
   * Returns highlighted HTML with dual-theme CSS variables.
   *
   * @param code - The code to highlight
   * @param language - The programming language
   * @returns HTML string with syntax highlighting
   */
  async function highlightCode(code: string, language: string): Promise<string> {
    const resolvedLang = resolveLanguage(language);
    const cacheKey = getCacheKey(code, resolvedLang || 'text');

    // Check cache first
    const cached = highlightCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fallback for empty language or plain text
    if (!resolvedLang) {
      return escapeHtml(code);
    }

    try {
      const instance = await initializeHighlighter();

      // Try to load the language if not already loaded
      const languageLoaded = await loadLanguage(resolvedLang as BundledLanguage);
      if (!languageLoaded) {
        // Fallback to escaped HTML for unsupported languages
        return escapeHtml(code);
      }

      const html = instance.codeToHtml(code, {
        lang: resolvedLang,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
        // Use CSS variables for dual-theme support
        defaultColor: false,
      });

      // Cache the result
      highlightCache.set(cacheKey, html);
      cleanupCache();

      return html;
    } catch {
      // Fallback to escaped HTML on error
      return escapeHtml(code);
    }
  }

  /**
   * Synchronously highlights code if the highlighter is ready.
   * Returns null if the highlighter is not initialized.
   *
   * @param code - The code to highlight
   * @param language - The programming language
   * @returns HTML string or null if not ready
   */
  function highlightCodeSync(code: string, language: string): string | null {
    if (!highlighter.value || !isReady.value) {
      return null;
    }

    const resolvedLang = resolveLanguage(language);
    const cacheKey = getCacheKey(code, resolvedLang || 'text');

    // Check cache first
    const cached = highlightCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Can't load languages synchronously, check if already loaded
    if (!resolvedLang || !loadedLanguages.has(resolvedLang)) {
      return null;
    }

    try {
      const html = highlighter.value.codeToHtml(code, {
        lang: resolvedLang,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
        defaultColor: false,
      });

      highlightCache.set(cacheKey, html);
      cleanupCache();

      return html;
    } catch {
      return null;
    }
  }

  /**
   * Preloads additional languages into the highlighter.
   * Useful for known upcoming code blocks.
   *
   * @param languages - Array of language IDs to preload
   */
  async function preloadLanguages(languages: BundledLanguage[]): Promise<void> {
    const instance = await initializeHighlighter();

    const toLoad = languages.filter((lang) => !loadedLanguages.has(lang));
    if (toLoad.length === 0) {
      return;
    }

    await Promise.all(
      toLoad.map(async (lang) => {
        try {
          await instance.loadLanguage(lang);
          loadedLanguages.add(lang);
        } catch {
          // Language not available, skip silently
        }
      })
    );
  }

  return {
    /** Highlights code asynchronously */
    highlightCode,
    /** Highlights code synchronously (returns null if not ready) */
    highlightCodeSync,
    /** Whether the highlighter is initialized and ready */
    isReady,
    /** Whether the highlighter is currently being initialized */
    isLoading,
    /** Preloads additional languages */
    preloadLanguages,
  };
}

/**
 * Escapes HTML entities for safe rendering.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
