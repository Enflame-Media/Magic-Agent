//
//  LocalizationManager.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import SwiftUI

/// Manages app localization with support for dynamic language switching.
///
/// The LocalizationManager handles:
/// - System language detection
/// - User language preference storage
/// - Dynamic language switching at runtime
/// - Date/time and number formatting per locale
///
/// ## Supported Languages
/// - English (en) - Default
/// - Spanish (es)
/// - Russian (ru)
/// - Polish (pl)
/// - Portuguese (pt)
/// - Catalan (ca)
/// - Chinese Simplified (zh-Hans)
@Observable
final class LocalizationManager {
    /// Shared singleton instance.
    static let shared = LocalizationManager()

    /// List of supported locale identifiers.
    static let supportedLocales: [String] = [
        "en",       // English
        "es",       // Spanish
        "ru",       // Russian
        "pl",       // Polish
        "pt",       // Portuguese
        "ca",       // Catalan
        "zh-Hans"   // Chinese Simplified
    ]

    /// Human-readable names for supported languages.
    static let localeDisplayNames: [String: String] = [
        "en": "English",
        "es": "Español",
        "ru": "Русский",
        "pl": "Polski",
        "pt": "Português",
        "ca": "Català",
        "zh-Hans": "简体中文"
    ]

    /// The current locale being used for localization.
    private(set) var currentLocale: Locale

    /// The current language code.
    var currentLanguage: String {
        get {
            // Check for user override first
            if let override = UserDefaults.standard.string(forKey: "preferredLanguage"),
               !override.isEmpty,
               override != "auto" {
                return override
            }
            // Fall back to system preferred language
            return Locale.current.language.languageCode?.identifier ?? "en"
        }
        set {
            if newValue == "auto" {
                // Remove override to use system language
                UserDefaults.standard.removeObject(forKey: "preferredLanguage")
                UserDefaults.standard.removeObject(forKey: "AppleLanguages")
            } else {
                UserDefaults.standard.set(newValue, forKey: "preferredLanguage")
                UserDefaults.standard.set([newValue], forKey: "AppleLanguages")
            }
            // Update current locale
            updateCurrentLocale()
            // Post notification for views to refresh
            NotificationCenter.default.post(name: .languageDidChange, object: nil)
        }
    }

    /// Whether the user has set a specific language preference (not using auto/system).
    var hasLanguageOverride: Bool {
        guard let override = UserDefaults.standard.string(forKey: "preferredLanguage") else {
            return false
        }
        return !override.isEmpty && override != "auto"
    }

    /// Date formatter configured for the current locale.
    private(set) var dateFormatter: DateFormatter

    /// Number formatter configured for the current locale.
    private(set) var numberFormatter: NumberFormatter

    /// The bundle to use for localized strings.
    private var localizedBundle: Bundle = .main

    // MARK: - Initialization

    private init() {
        // Initialize with default locale
        self.currentLocale = Locale.current
        self.dateFormatter = DateFormatter()
        self.numberFormatter = NumberFormatter()

        // Set up formatters
        updateCurrentLocale()
    }

    // MARK: - Public Methods

    /// Get a localized string for the given key.
    ///
    /// - Parameters:
    ///   - key: The localization key.
    ///   - comment: A comment describing the string's context.
    /// - Returns: The localized string, or the key if not found.
    func localizedString(_ key: String, comment: String = "") -> String {
        return NSLocalizedString(key, bundle: localizedBundle, comment: comment)
    }

    /// Get a localized string with format arguments.
    ///
    /// - Parameters:
    ///   - format: The localization key for the format string.
    ///   - arguments: The arguments to insert into the format string.
    /// - Returns: The formatted localized string.
    func localizedString(format: String, _ arguments: CVarArg...) -> String {
        let formatString = localizedString(format)
        return String(format: formatString, arguments: arguments)
    }

    /// Format a date using the current locale.
    ///
    /// - Parameters:
    ///   - date: The date to format.
    ///   - style: The date formatter style.
    /// - Returns: The formatted date string.
    func formatDate(_ date: Date, style: DateFormatter.Style = .medium) -> String {
        dateFormatter.dateStyle = style
        dateFormatter.timeStyle = .none
        return dateFormatter.string(from: date)
    }

    /// Format a date and time using the current locale.
    ///
    /// - Parameters:
    ///   - date: The date to format.
    ///   - dateStyle: The date formatter style.
    ///   - timeStyle: The time formatter style.
    /// - Returns: The formatted date/time string.
    func formatDateTime(_ date: Date, dateStyle: DateFormatter.Style = .medium, timeStyle: DateFormatter.Style = .short) -> String {
        dateFormatter.dateStyle = dateStyle
        dateFormatter.timeStyle = timeStyle
        return dateFormatter.string(from: date)
    }

    /// Format a relative date (e.g., "2 hours ago", "yesterday").
    ///
    /// - Parameter date: The date to format.
    /// - Returns: A relative date string.
    func formatRelativeDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = currentLocale
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }

    /// Format a number using the current locale.
    ///
    /// - Parameter number: The number to format.
    /// - Returns: The formatted number string.
    func formatNumber(_ number: Int) -> String {
        numberFormatter.numberStyle = .decimal
        return numberFormatter.string(from: NSNumber(value: number)) ?? "\(number)"
    }

    /// Format a number as currency using the current locale.
    ///
    /// - Parameters:
    ///   - number: The number to format.
    ///   - currencyCode: The ISO 4217 currency code (e.g., "USD").
    /// - Returns: The formatted currency string.
    func formatCurrency(_ number: Double, currencyCode: String = "USD") -> String {
        numberFormatter.numberStyle = .currency
        numberFormatter.currencyCode = currencyCode
        return numberFormatter.string(from: NSNumber(value: number)) ?? "\(number)"
    }

    /// Format a number as a percentage.
    ///
    /// - Parameter number: The number to format (0.0 to 1.0).
    /// - Returns: The formatted percentage string.
    func formatPercent(_ number: Double) -> String {
        numberFormatter.numberStyle = .percent
        return numberFormatter.string(from: NSNumber(value: number)) ?? "\(Int(number * 100))%"
    }

    /// Get the display name for a locale identifier.
    ///
    /// - Parameter identifier: The locale identifier (e.g., "en", "es").
    /// - Returns: The localized display name.
    func displayName(for identifier: String) -> String {
        return Self.localeDisplayNames[identifier] ?? identifier
    }

    /// Check if a locale identifier is supported.
    ///
    /// - Parameter identifier: The locale identifier to check.
    /// - Returns: `true` if the locale is supported.
    func isSupported(_ identifier: String) -> Bool {
        return Self.supportedLocales.contains(identifier)
    }

    // MARK: - Private Methods

    /// Update the current locale and formatters.
    private func updateCurrentLocale() {
        let languageCode = currentLanguage

        // Create locale with the language code
        currentLocale = Locale(identifier: languageCode)

        // Update formatters
        dateFormatter.locale = currentLocale
        numberFormatter.locale = currentLocale

        // Update the bundle for localized strings
        if let bundlePath = Bundle.main.path(forResource: languageCode, ofType: "lproj"),
           let bundle = Bundle(path: bundlePath) {
            localizedBundle = bundle
        } else {
            // Fall back to main bundle
            localizedBundle = .main
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when the app language changes.
    static let languageDidChange = Notification.Name("languageDidChange")
}

// MARK: - String Extension for Localization

extension String {
    /// Returns the localized version of this string.
    var localized: String {
        return LocalizationManager.shared.localizedString(self)
    }

    /// Returns the localized version of this string with format arguments.
    func localized(_ arguments: CVarArg...) -> String {
        let formatString = LocalizationManager.shared.localizedString(self)
        return String(format: formatString, arguments: arguments)
    }
}

// MARK: - Environment Key

/// Environment key for accessing the LocalizationManager.
private struct LocalizationManagerKey: EnvironmentKey {
    static let defaultValue = LocalizationManager.shared
}

extension EnvironmentValues {
    /// The localization manager for the current environment.
    var localizationManager: LocalizationManager {
        get { self[LocalizationManagerKey.self] }
        set { self[LocalizationManagerKey.self] = newValue }
    }
}

// MARK: - SwiftUI View Extension

extension View {
    /// Refreshes this view when the language changes.
    func refreshOnLanguageChange() -> some View {
        self.onReceive(NotificationCenter.default.publisher(for: .languageDidChange)) { _ in
            // The view will re-render when observed values change
        }
    }
}
