package com.enflame.happy.ui.util

import android.app.LocaleManager
import android.content.Context
import android.os.Build
import android.os.LocaleList
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

/**
 * Supported languages in the Happy Android app.
 *
 * Each entry maps a locale tag to its native display name.
 * The native name is always the same regardless of the current app language,
 * so users can identify their language even if the UI is in a foreign language.
 *
 * @property tag The BCP 47 locale tag (e.g., "en", "zh-CN").
 * @property nativeDisplayName The language name in its own script.
 */
enum class SupportedLanguage(val tag: String, val nativeDisplayName: String) {
    ENGLISH("en", "English"),
    SPANISH("es", "Espa\u00f1ol"),
    FRENCH("fr", "Fran\u00e7ais"),
    GERMAN("de", "Deutsch"),
    JAPANESE("ja", "\u65e5\u672c\u8a9e"),
    CHINESE_SIMPLIFIED("zh-CN", "\u7b80\u4f53\u4e2d\u6587"),
    KOREAN("ko", "\ud55c\uad6d\uc5b4");

    companion object {
        /**
         * Find a [SupportedLanguage] by its BCP 47 tag, or null if not supported.
         */
        fun fromTag(tag: String): SupportedLanguage? =
            entries.find { it.tag.equals(tag, ignoreCase = true) }
    }
}

/**
 * Manages per-app language preferences using Android's AppCompat locale APIs.
 *
 * On Android 13+ (API 33), this delegates to the system's [LocaleManager].
 * On older versions, it uses [AppCompatDelegate.setApplicationLocales] which
 * persists the selection automatically via AndroidX.
 *
 * ## Usage
 *
 * ```kotlin
 * // Set language to French
 * LocaleHelper.setAppLocale("fr")
 *
 * // Reset to system default
 * LocaleHelper.setAppLocale(null)
 *
 * // Get current selection
 * val currentTag = LocaleHelper.getSelectedLocaleTag(context)
 * ```
 */
object LocaleHelper {

    /**
     * Set the app's locale to the given BCP 47 language tag.
     *
     * Pass `null` or an empty string to reset to the system default.
     *
     * This uses [AppCompatDelegate.setApplicationLocales] which handles
     * both API 33+ (system per-app language) and older versions (in-process
     * locale override with auto-persistence).
     *
     * @param languageTag BCP 47 tag like "en", "fr", "zh-CN", or null for system default.
     */
    fun setAppLocale(languageTag: String?) {
        val localeList = if (languageTag.isNullOrEmpty()) {
            LocaleListCompat.getEmptyLocaleList()
        } else {
            LocaleListCompat.forLanguageTags(languageTag)
        }
        AppCompatDelegate.setApplicationLocales(localeList)
    }

    /**
     * Get the currently selected locale tag, or null if using system default.
     *
     * On API 33+, queries the system [LocaleManager].
     * On older versions, queries [AppCompatDelegate.getApplicationLocales].
     *
     * @param context Application or Activity context.
     * @return BCP 47 language tag (e.g., "fr") or null if system default.
     */
    fun getSelectedLocaleTag(context: Context): String? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val localeManager = context.getSystemService(LocaleManager::class.java)
            val appLocales = localeManager?.applicationLocales ?: LocaleList.getEmptyLocaleList()
            if (appLocales.isEmpty) null else appLocales[0]?.toLanguageTag()
        } else {
            val locales = AppCompatDelegate.getApplicationLocales()
            if (locales.isEmpty) null else locales[0]?.toLanguageTag()
        }
    }

    /**
     * Get all supported languages as an ordered list.
     *
     * @return List of [SupportedLanguage] entries.
     */
    fun getSupportedLanguages(): List<SupportedLanguage> = SupportedLanguage.entries
}
