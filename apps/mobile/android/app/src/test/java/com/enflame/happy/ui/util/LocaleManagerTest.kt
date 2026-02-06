package com.enflame.happy.ui.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Unit tests for [SupportedLanguage] and [LocaleHelper].
 *
 * Validates that:
 * - All 7 supported languages are defined
 * - Language tags resolve correctly via [SupportedLanguage.fromTag]
 * - The language list is stable and complete
 */
class LocaleManagerTest {

    @Test
    fun `supported languages contains exactly 7 entries`() {
        val languages = SupportedLanguage.entries
        assertEquals(
            "Expected exactly 7 supported languages",
            7,
            languages.size
        )
    }

    @Test
    fun `all expected language tags are present`() {
        val expectedTags = listOf("en", "es", "fr", "de", "ja", "zh-CN", "ko")
        val actualTags = SupportedLanguage.entries.map { it.tag }

        expectedTags.forEach { tag ->
            assert(tag in actualTags) {
                "Missing expected language tag: $tag. Present tags: $actualTags"
            }
        }
    }

    @Test
    fun `fromTag returns correct language for valid tags`() {
        assertEquals(SupportedLanguage.ENGLISH, SupportedLanguage.fromTag("en"))
        assertEquals(SupportedLanguage.SPANISH, SupportedLanguage.fromTag("es"))
        assertEquals(SupportedLanguage.FRENCH, SupportedLanguage.fromTag("fr"))
        assertEquals(SupportedLanguage.GERMAN, SupportedLanguage.fromTag("de"))
        assertEquals(SupportedLanguage.JAPANESE, SupportedLanguage.fromTag("ja"))
        assertEquals(SupportedLanguage.CHINESE_SIMPLIFIED, SupportedLanguage.fromTag("zh-CN"))
        assertEquals(SupportedLanguage.KOREAN, SupportedLanguage.fromTag("ko"))
    }

    @Test
    fun `fromTag is case insensitive`() {
        assertEquals(SupportedLanguage.ENGLISH, SupportedLanguage.fromTag("EN"))
        assertEquals(SupportedLanguage.CHINESE_SIMPLIFIED, SupportedLanguage.fromTag("ZH-CN"))
        assertEquals(SupportedLanguage.CHINESE_SIMPLIFIED, SupportedLanguage.fromTag("zh-cn"))
    }

    @Test
    fun `fromTag returns null for unsupported tags`() {
        assertNull(SupportedLanguage.fromTag("pt"))
        assertNull(SupportedLanguage.fromTag("ar"))
        assertNull(SupportedLanguage.fromTag("invalid"))
        assertNull(SupportedLanguage.fromTag(""))
    }

    @Test
    fun `all languages have non-empty native display names`() {
        SupportedLanguage.entries.forEach { language ->
            assert(language.nativeDisplayName.isNotBlank()) {
                "Language ${language.tag} has blank native display name"
            }
        }
    }

    @Test
    fun `all languages have non-empty tags`() {
        SupportedLanguage.entries.forEach { language ->
            assert(language.tag.isNotBlank()) {
                "Language ${language.name} has blank tag"
            }
        }
    }

    @Test
    fun `language tags are unique`() {
        val tags = SupportedLanguage.entries.map { it.tag }
        assertEquals(
            "Language tags must be unique",
            tags.size,
            tags.toSet().size
        )
    }

    @Test
    fun `getSupportedLanguages returns all entries`() {
        val result = LocaleHelper.getSupportedLanguages()
        assertEquals(SupportedLanguage.entries.size, result.size)
        assertEquals(SupportedLanguage.entries, result)
    }

    @Test
    fun `native display names match expected values`() {
        assertEquals("English", SupportedLanguage.ENGLISH.nativeDisplayName)
        assertEquals("Espa\u00f1ol", SupportedLanguage.SPANISH.nativeDisplayName)
        assertEquals("Fran\u00e7ais", SupportedLanguage.FRENCH.nativeDisplayName)
        assertEquals("Deutsch", SupportedLanguage.GERMAN.nativeDisplayName)
        assertEquals("\u65e5\u672c\u8a9e", SupportedLanguage.JAPANESE.nativeDisplayName)
        assertEquals("\u7b80\u4f53\u4e2d\u6587", SupportedLanguage.CHINESE_SIMPLIFIED.nativeDisplayName)
        assertEquals("\ud55c\uad6d\uc5b4", SupportedLanguage.KOREAN.nativeDisplayName)
    }
}
