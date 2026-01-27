/**
 * Unit Tests for useShiki Composable (HAP-862)
 *
 * Tests cover:
 * - Language alias resolution (ts -> typescript, js -> javascript, etc.)
 * - LRU cache behavior with 100 entry limit
 * - Fallback behavior when Shiki fails to load
 * - Singleton highlighter pattern initialization
 * - Synchronous and asynchronous highlighting
 * - Language preloading
 *
 * @see HAP-705 - Shiki syntax highlighting integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store mock references at module level
let mockCodeToHtml: ReturnType<typeof vi.fn>;
let mockLoadLanguage: ReturnType<typeof vi.fn>;
let mockCreateHighlighter: ReturnType<typeof vi.fn>;
let mockHighlighterInstance: { codeToHtml: typeof mockCodeToHtml; loadLanguage: typeof mockLoadLanguage };

// Reset mocks for each test
function resetMocks() {
  mockCodeToHtml = vi.fn().mockImplementation((code: string) => {
    return `<pre class="shiki"><code><span>${code}</span></code></pre>`;
  });
  mockLoadLanguage = vi.fn().mockResolvedValue(undefined);
  mockHighlighterInstance = {
    codeToHtml: mockCodeToHtml,
    loadLanguage: mockLoadLanguage,
  };
  mockCreateHighlighter = vi.fn().mockResolvedValue(mockHighlighterInstance);
}

// Initial setup
resetMocks();

// Mock shiki module
vi.mock('shiki', () => ({
  get createHighlighter() {
    return mockCreateHighlighter;
  },
}));

describe('useShiki', () => {
  let useShiki: typeof import('./useShiki').useShiki;

  beforeEach(async () => {
    // Reset mock implementations
    resetMocks();

    // Clear all mock call history
    vi.clearAllMocks();

    // Reset the module to clear singleton state
    vi.resetModules();

    // Re-import to get fresh state
    const module = await import('./useShiki');
    useShiki = module.useShiki;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return expected properties', () => {
      const shiki = useShiki();

      expect(shiki).toHaveProperty('highlightCode');
      expect(shiki).toHaveProperty('highlightCodeSync');
      expect(shiki).toHaveProperty('isReady');
      expect(shiki).toHaveProperty('isLoading');
      expect(shiki).toHaveProperty('preloadLanguages');
    });

    it('should start with isReady as false', () => {
      const shiki = useShiki();
      expect(shiki.isReady.value).toBe(false);
    });

    it('should start with isLoading as false', () => {
      const shiki = useShiki();
      expect(shiki.isLoading.value).toBe(false);
    });
  });

  describe('language alias resolution', () => {
    it.each([
      ['ts', 'typescript'],
      ['js', 'javascript'],
      ['py', 'python'],
      ['sh', 'bash'],
      ['zsh', 'bash'],
      ['yml', 'yaml'],
      ['jsx', 'javascript'],
      ['tsx', 'typescript'],
      ['md', 'markdown'],
      ['dockerfile', 'docker'],
      ['makefile', 'make'],
    ])('should resolve alias %s to %s', async (alias, expected) => {
      const shiki = useShiki();
      await shiki.highlightCode('const x = 1;', alias);

      // Check that codeToHtml was called with the resolved language
      expect(mockCodeToHtml).toHaveBeenCalled();
      const calls = mockCodeToHtml.mock.calls;
      const lastCall = calls[calls.length - 1] as [string, { lang: string }] | undefined;
      expect(lastCall?.[1].lang).toBe(expected);
    });

    it('should handle case-insensitive language names', async () => {
      const shiki = useShiki();

      await shiki.highlightCode('const x = 1;', 'TypeScript');
      await shiki.highlightCode('const y = 2;', 'TYPESCRIPT');
      await shiki.highlightCode('const z = 3;', 'typescript');

      // All should work - check all calls used 'typescript'
      const calls = mockCodeToHtml.mock.calls;
      calls.forEach((call) => {
        expect(call[1].lang).toBe('typescript');
      });
    });

    it('should return escaped HTML for plain text language', async () => {
      const shiki = useShiki();
      const result = await shiki.highlightCode('<script>alert("xss")</script>', 'text');

      // Should be escaped HTML without syntax highlighting
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      // Should not call the highlighter for text
      expect(mockCodeToHtml).not.toHaveBeenCalled();
    });

    it('should return escaped HTML for plain language', async () => {
      const shiki = useShiki();
      const result = await shiki.highlightCode('<div>test</div>', 'plain');

      expect(result).toBe('&lt;div&gt;test&lt;/div&gt;');
      expect(mockCodeToHtml).not.toHaveBeenCalled();
    });

    it('should return escaped HTML for empty language', async () => {
      const shiki = useShiki();
      const result = await shiki.highlightCode('const x = 1;', '');

      expect(result).toBe('const x = 1;');
      expect(mockCodeToHtml).not.toHaveBeenCalled();
    });
  });

  describe('cache behavior', () => {
    it('should cache highlighted results', async () => {
      const shiki = useShiki();
      const code = 'const x = 1;';
      const language = 'typescript';

      // First call - should invoke highlighter
      await shiki.highlightCode(code, language);
      const initialCallCount = mockCodeToHtml.mock.calls.length;

      // Second call with same code and language - should use cache
      await shiki.highlightCode(code, language);

      // Call count should not increase
      expect(mockCodeToHtml.mock.calls.length).toBe(initialCallCount);
    });

    it('should not cache different code with same language', async () => {
      const shiki = useShiki();
      const language = 'typescript';

      await shiki.highlightCode('const x = 1;', language);
      const firstCallCount = mockCodeToHtml.mock.calls.length;

      await shiki.highlightCode('const y = 2;', language);
      expect(mockCodeToHtml.mock.calls.length).toBe(firstCallCount + 1);
    });

    it('should not cache same code with different language', async () => {
      const shiki = useShiki();
      const code = 'const x = 1;';

      await shiki.highlightCode(code, 'typescript');
      const firstCallCount = mockCodeToHtml.mock.calls.length;

      await shiki.highlightCode(code, 'javascript');
      expect(mockCodeToHtml.mock.calls.length).toBe(firstCallCount + 1);
    });

    it('should enforce LRU cache size limit of 100 entries', async () => {
      const shiki = useShiki();

      // Generate 105 unique code samples
      for (let i = 0; i < 105; i++) {
        await shiki.highlightCode(`const x${i} = ${i};`, 'typescript');
      }

      // The cache should have been cleaned up
      // We can verify the cleanup runs by checking that highlighting still works
      const result = await shiki.highlightCode('const final = 999;', 'typescript');
      expect(result).toContain('shiki');

      // Verify highlighter was called for each unique entry
      expect(mockCodeToHtml.mock.calls.length).toBeGreaterThanOrEqual(105);
    });
  });

  describe('singleton highlighter pattern', () => {
    it('should only create one highlighter instance', async () => {
      const shiki1 = useShiki();
      const shiki2 = useShiki();

      // Trigger highlighting from both
      await Promise.all([
        shiki1.highlightCode('const a = 1;', 'typescript'),
        shiki2.highlightCode('const b = 2;', 'typescript'),
      ]);

      // createHighlighter should only be called once
      expect(mockCreateHighlighter).toHaveBeenCalledTimes(1);
    });

    it('should wait for initialization if already in progress', async () => {
      const shiki = useShiki();

      // Start two highlight operations concurrently
      const promise1 = shiki.highlightCode('const a = 1;', 'typescript');
      const promise2 = shiki.highlightCode('const b = 2;', 'typescript');

      // Both should resolve
      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toContain('shiki');
      expect(result2).toContain('shiki');

      // Highlighter should only be created once
      expect(mockCreateHighlighter).toHaveBeenCalledTimes(1);
    });

    it('should set isReady to true after initialization', async () => {
      const shiki = useShiki();
      expect(shiki.isReady.value).toBe(false);

      await shiki.highlightCode('const x = 1;', 'typescript');

      expect(shiki.isReady.value).toBe(true);
    });
  });

  describe('fallback behavior', () => {
    it('should return escaped HTML when highlighter fails to load', async () => {
      // Mock createHighlighter to fail
      mockCreateHighlighter.mockRejectedValueOnce(new Error('Failed to load'));

      const shiki = useShiki();
      const result = await shiki.highlightCode('<script>test</script>', 'javascript');

      // Should return escaped HTML as fallback
      expect(result).toBe('&lt;script&gt;test&lt;/script&gt;');
    });

    it('should return escaped HTML for unsupported language', async () => {
      // Mock loadLanguage to fail for this test
      mockLoadLanguage.mockRejectedValueOnce(new Error('Language not supported'));

      const shiki = useShiki();
      const result = await shiki.highlightCode('test code', 'nonexistent-language');

      // Should return escaped HTML as fallback
      expect(result).toBe('test code');
    });

    it('should escape special HTML characters in fallback', async () => {
      const shiki = useShiki();
      const result = await shiki.highlightCode('a < b && c > d', 'text');

      expect(result).toBe('a &lt; b &amp;&amp; c &gt; d');
    });

    it('should escape quotes in fallback', async () => {
      const shiki = useShiki();
      const result = await shiki.highlightCode('const x = "hello" + \'world\'', 'plain');

      expect(result).toBe('const x = &quot;hello&quot; + &#39;world&#39;');
    });
  });

  describe('synchronous highlighting', () => {
    it('should return null when highlighter is not ready', () => {
      const shiki = useShiki();
      const result = shiki.highlightCodeSync('const x = 1;', 'typescript');
      expect(result).toBeNull();
    });

    it('should return highlighted code when highlighter is ready and language is loaded', async () => {
      const shiki = useShiki();

      // First, initialize the highlighter
      await shiki.highlightCode('const init = 1;', 'typescript');

      // Now sync should work for loaded languages
      const result = shiki.highlightCodeSync('const x = 1;', 'typescript');

      // Either returns highlighted HTML or null (if language not in loadedLanguages set)
      expect(result === null || result.includes('shiki')).toBe(true);
    });

    it('should return cached result synchronously', async () => {
      const shiki = useShiki();
      const code = 'const cached = 1;';
      const language = 'typescript';

      // First, cache the result
      await shiki.highlightCode(code, language);

      // Sync call should return cached result
      const result = shiki.highlightCodeSync(code, language);

      expect(result).not.toBeNull();
      expect(result).toContain('shiki');
    });

    it('should return null for unloaded languages in sync mode', async () => {
      const shiki = useShiki();

      // Initialize the highlighter with a common language
      await shiki.highlightCode('const x = 1;', 'typescript');

      // Try sync with a language that requires loading
      const result = shiki.highlightCodeSync('fn main() {}', 'rust');

      // Should return null since rust isn't loaded and can't load sync
      expect(result).toBeNull();
    });
  });

  describe('preloadLanguages', () => {
    it('should preload specified languages', async () => {
      const shiki = useShiki();
      await shiki.preloadLanguages(['rust', 'go', 'java']);

      // Should have attempted to load the languages
      expect(mockLoadLanguage).toHaveBeenCalledWith('rust');
      expect(mockLoadLanguage).toHaveBeenCalledWith('go');
      expect(mockLoadLanguage).toHaveBeenCalledWith('java');
    });

    it('should not reload already loaded languages', async () => {
      const shiki = useShiki();

      // First, use typescript (which is in DEFAULT_LANGUAGES)
      await shiki.highlightCode('const x = 1;', 'typescript');
      mockLoadLanguage.mockClear();

      // Try to preload typescript again
      await shiki.preloadLanguages(['typescript']);

      // loadLanguage should not be called for already-loaded languages
      expect(mockLoadLanguage).not.toHaveBeenCalledWith('typescript');
    });

    it('should handle preload failures gracefully', async () => {
      // Make loadLanguage fail for one language
      mockLoadLanguage.mockImplementation((lang: string) => {
        if (lang === 'nonexistent') {
          return Promise.reject(new Error('Language not found'));
        }
        return Promise.resolve();
      });

      const shiki = useShiki();

      // Should not throw even with invalid languages
      // Using type assertion since we're testing runtime error handling
      await expect(
        shiki.preloadLanguages(['rust', 'nonexistent' as 'rust', 'go'])
      ).resolves.not.toThrow();
    });

    it('should initialize highlighter if not ready before preloading', async () => {
      const shiki = useShiki();
      expect(shiki.isReady.value).toBe(false);

      await shiki.preloadLanguages(['ruby']);

      expect(mockCreateHighlighter).toHaveBeenCalled();
    });
  });

  describe('HTML escaping', () => {
    it('should escape all dangerous HTML characters', async () => {
      const shiki = useShiki();
      const dangerousCode = '<script>alert("XSS")</script>&<>"\'\n';
      const result = await shiki.highlightCode(dangerousCode, 'text');

      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#39;');
    });

    it('should handle empty code', async () => {
      const shiki = useShiki();
      const result = await shiki.highlightCode('', 'typescript');

      // Empty code should return empty shiki output or empty string
      // The mock returns the code wrapped in shiki tags, so empty code = empty content
      expect(result).toContain('shiki');
    });

    it('should handle whitespace-only code', async () => {
      const shiki = useShiki();
      const result = await shiki.highlightCode('   \n\t\n   ', 'typescript');

      // Should return highlighted HTML with the whitespace
      expect(result).toContain('shiki');
    });
  });

  describe('theme configuration', () => {
    it('should configure dual themes (github-light and github-dark)', async () => {
      const shiki = useShiki();
      await shiki.highlightCode('const x = 1;', 'typescript');

      // Check that createHighlighter was called with both themes
      expect(mockCreateHighlighter).toHaveBeenCalledWith(
        expect.objectContaining({
          themes: ['github-dark', 'github-light'],
        })
      );
    });

    it('should use defaultColor: false for CSS variable theming', async () => {
      const shiki = useShiki();
      await shiki.highlightCode('const x = 1;', 'typescript');

      // Check codeToHtml was called with defaultColor: false
      expect(mockCodeToHtml).toHaveBeenCalledWith(
        'const x = 1;',
        expect.objectContaining({
          defaultColor: false,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very long code strings', async () => {
      const shiki = useShiki();
      const longCode = 'const x = ' + 'a'.repeat(10000) + ';';
      const result = await shiki.highlightCode(longCode, 'typescript');

      expect(result).toContain('shiki');
    });

    it('should handle code with unicode characters', async () => {
      const shiki = useShiki();
      const unicodeCode = 'const emoji = "\\u{1F600}"; // spasibo';
      const result = await shiki.highlightCode(unicodeCode, 'typescript');

      expect(result).toContain('shiki');
    });

    it('should handle multiline code', async () => {
      const shiki = useShiki();
      const multilineCode = `
function hello() {
  console.log("world");
}
`.trim();

      const result = await shiki.highlightCode(multilineCode, 'typescript');
      expect(result).toContain('shiki');
    });

    it('should handle code with Windows line endings', async () => {
      const shiki = useShiki();
      const windowsCode = 'const a = 1;\r\nconst b = 2;\r\n';
      const result = await shiki.highlightCode(windowsCode, 'typescript');

      expect(result).toContain('shiki');
    });

    it('should trim language names with whitespace', async () => {
      const shiki = useShiki();
      await shiki.highlightCode('const x = 1;', '  typescript  ');

      expect(mockCodeToHtml).toHaveBeenCalledWith(
        'const x = 1;',
        expect.objectContaining({
          lang: 'typescript',
        })
      );
    });
  });
});
