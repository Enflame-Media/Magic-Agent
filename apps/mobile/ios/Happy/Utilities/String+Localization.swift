//
//  String+Localization.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Extension providing convenient localization helpers for the Happy iOS app.
///
/// Uses `NSLocalizedString` under the hood to look up translations from
/// `Localizable.strings` / `.stringsdict` files in the main bundle.
///
/// Usage:
/// ```swift
/// // Simple lookup (key == English text)
/// Text("welcome.title".localized)
///
/// // Lookup with a developer comment
/// Text("welcome.subtitle".localized(comment: "Shown below app name"))
///
/// // Formatted localization (e.g., plurals or interpolation)
/// Text(String.localized("sessions.count", arguments: sessionCount))
/// ```
extension String {

    /// Returns the localized version of this string using `NSLocalizedString`.
    ///
    /// The receiver is used as both the key and the default value.
    /// A matching entry must exist in `Localizable.strings` for each supported locale.
    var localized: String {
        NSLocalizedString(self, comment: "")
    }

    /// Returns the localized version of this string with an optional developer comment.
    ///
    /// - Parameter comment: A note for translators describing context or usage.
    /// - Returns: The localized string for the current locale.
    func localized(comment: String) -> String {
        NSLocalizedString(self, comment: comment)
    }

    /// Returns a formatted localized string, useful for pluralization and interpolation.
    ///
    /// Looks up the key in `Localizable.strings` (or `.stringsdict` for plural rules),
    /// then applies `String(format:)` with the given arguments.
    ///
    /// - Parameters:
    ///   - key: The localization key.
    ///   - arguments: The values to substitute into the format string.
    /// - Returns: The formatted, localized string.
    static func localized(_ key: String, arguments: CVarArg...) -> String {
        let format = NSLocalizedString(key, comment: "")
        return String(format: format, arguments: arguments)
    }
}
