package com.enflame.happy.ui.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/**
 * Localization completeness tests.
 *
 * These tests parse the Android string resource XML files and verify that
 * every key defined in the default `values/strings.xml` is also defined
 * in each translated `values-{locale}/strings.xml`. This prevents shipping
 * an app with missing translations that would silently fall back to English.
 *
 * Similarly, it verifies that `plurals.xml` entries are consistent.
 */
class LocalizationCompletenessTest {

    companion object {
        /**
         * All locale qualifiers that should have complete translations.
         */
        private val EXPECTED_LOCALES = listOf("es", "fr", "de", "ja", "zh-rCN", "ko")

        /**
         * Path to the resource directory, relative to the project root.
         * Gradle runs tests from the module root (`app/`), so we navigate
         * to `src/main/res/`.
         */
        private const val RES_DIR = "src/main/res"
    }

    /**
     * Extract all `<string name="...">` keys from a strings.xml file.
     */
    private fun extractStringKeys(file: File): Set<String> {
        if (!file.exists()) return emptySet()

        val factory = DocumentBuilderFactory.newInstance()
        val builder = factory.newDocumentBuilder()
        val document = builder.parse(file)
        val elements = document.getElementsByTagName("string")
        val keys = mutableSetOf<String>()

        for (i in 0 until elements.length) {
            val name = elements.item(i).attributes.getNamedItem("name")?.nodeValue
            if (name != null) keys.add(name)
        }
        return keys
    }

    /**
     * Extract all `<plurals name="...">` keys from a plurals.xml file.
     */
    private fun extractPluralKeys(file: File): Set<String> {
        if (!file.exists()) return emptySet()

        val factory = DocumentBuilderFactory.newInstance()
        val builder = factory.newDocumentBuilder()
        val document = builder.parse(file)
        val elements = document.getElementsByTagName("plurals")
        val keys = mutableSetOf<String>()

        for (i in 0 until elements.length) {
            val name = elements.item(i).attributes.getNamedItem("name")?.nodeValue
            if (name != null) keys.add(name)
        }
        return keys
    }

    @Test
    fun `all locale directories exist`() {
        val resDir = File(RES_DIR)
        if (!resDir.exists()) {
            // Test might be running from a different working directory;
            // skip rather than fail in that case.
            println("WARN: $RES_DIR not found from ${System.getProperty("user.dir")}; skipping directory existence test")
            return
        }

        EXPECTED_LOCALES.forEach { locale ->
            val dir = File(resDir, "values-$locale")
            assertTrue(
                "Missing locale directory: values-$locale",
                dir.exists() && dir.isDirectory
            )
        }
    }

    @Test
    fun `all locales have complete string translations`() {
        val resDir = File(RES_DIR)
        if (!resDir.exists()) {
            println("WARN: $RES_DIR not found from ${System.getProperty("user.dir")}; skipping completeness test")
            return
        }

        val defaultStrings = File(resDir, "values/strings.xml")
        assertTrue("Default strings.xml not found", defaultStrings.exists())

        val defaultKeys = extractStringKeys(defaultStrings)
        assertTrue("Default strings.xml has no keys", defaultKeys.isNotEmpty())

        val missingReport = mutableListOf<String>()

        EXPECTED_LOCALES.forEach { locale ->
            val localeStrings = File(resDir, "values-$locale/strings.xml")
            if (!localeStrings.exists()) {
                missingReport.add("[$locale] strings.xml file is missing entirely")
                return@forEach
            }

            val localeKeys = extractStringKeys(localeStrings)
            val missing = defaultKeys - localeKeys

            if (missing.isNotEmpty()) {
                missingReport.add(
                    "[$locale] Missing ${missing.size} string(s): ${missing.sorted().joinToString(", ")}"
                )
            }
        }

        if (missingReport.isNotEmpty()) {
            fail(
                "Localization completeness check failed:\n" +
                    missingReport.joinToString("\n")
            )
        }
    }

    @Test
    fun `all locales have complete plural translations`() {
        val resDir = File(RES_DIR)
        if (!resDir.exists()) {
            println("WARN: $RES_DIR not found from ${System.getProperty("user.dir")}; skipping plurals test")
            return
        }

        val defaultPlurals = File(resDir, "values/plurals.xml")
        if (!defaultPlurals.exists()) {
            println("WARN: Default plurals.xml not found; skipping plurals test")
            return
        }

        val defaultKeys = extractPluralKeys(defaultPlurals)
        if (defaultKeys.isEmpty()) return

        val missingReport = mutableListOf<String>()

        EXPECTED_LOCALES.forEach { locale ->
            val localePlurals = File(resDir, "values-$locale/plurals.xml")
            if (!localePlurals.exists()) {
                missingReport.add("[$locale] plurals.xml file is missing entirely")
                return@forEach
            }

            val localeKeys = extractPluralKeys(localePlurals)
            val missing = defaultKeys - localeKeys

            if (missing.isNotEmpty()) {
                missingReport.add(
                    "[$locale] Missing ${missing.size} plural(s): ${missing.sorted().joinToString(", ")}"
                )
            }
        }

        if (missingReport.isNotEmpty()) {
            fail(
                "Plural completeness check failed:\n" +
                    missingReport.joinToString("\n")
            )
        }
    }

    @Test
    fun `no locale has extra keys not in default`() {
        val resDir = File(RES_DIR)
        if (!resDir.exists()) {
            println("WARN: $RES_DIR not found from ${System.getProperty("user.dir")}; skipping extra keys test")
            return
        }

        val defaultStrings = File(resDir, "values/strings.xml")
        if (!defaultStrings.exists()) return

        val defaultKeys = extractStringKeys(defaultStrings)
        val extraReport = mutableListOf<String>()

        EXPECTED_LOCALES.forEach { locale ->
            val localeStrings = File(resDir, "values-$locale/strings.xml")
            if (!localeStrings.exists()) return@forEach

            val localeKeys = extractStringKeys(localeStrings)
            val extra = localeKeys - defaultKeys

            if (extra.isNotEmpty()) {
                extraReport.add(
                    "[$locale] Has ${extra.size} extra key(s) not in default: ${extra.sorted().joinToString(", ")}"
                )
            }
        }

        if (extraReport.isNotEmpty()) {
            fail(
                "Locale files have extra keys not in default strings.xml:\n" +
                    extraReport.joinToString("\n")
            )
        }
    }

    @Test
    fun `supported language count matches locale directories`() {
        assertEquals(
            "Number of supported languages should match number of translation locales (plus English default)",
            SupportedLanguage.entries.size,
            EXPECTED_LOCALES.size + 1 // +1 for English (default)
        )
    }
}
