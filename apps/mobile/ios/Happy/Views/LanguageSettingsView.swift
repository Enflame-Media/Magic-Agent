//
//  LanguageSettingsView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// In-app language selector allowing the user to override the system language.
///
/// Persists the selected language in `UserDefaults` under `AppleLanguages`,
/// which is the standard iOS mechanism for per-app language overrides.
/// The change takes effect after an app restart.
struct LanguageSettingsView: View {

    @Environment(\.dismiss) private var dismiss

    /// The currently selected language code, or `nil` for system default.
    @State private var selectedLanguage: String?

    /// Whether to show the restart alert.
    @State private var showRestartAlert: Bool = false

    /// All supported languages and their display names.
    private let supportedLanguages: [(code: String, name: String)] = [
        ("en", "English"),
        ("es", "Espanol"),
        ("fr", "Francais"),
        ("de", "Deutsch"),
        ("ja", "Japanese"),
        ("zh-Hans", "Chinese (Simplified)"),
        ("ko", "Korean")
    ]

    var body: some View {
        List {
            // System default option
            Section {
                Button {
                    selectLanguage(nil)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("language.system".localized)
                                .font(.body)
                                .foregroundStyle(.primary)
                            Text("language.systemDescription".localized)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if selectedLanguage == nil {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.blue)
                                .fontWeight(.semibold)
                        }
                    }
                }
            }

            // Language options
            Section {
                ForEach(supportedLanguages, id: \.code) { language in
                    Button {
                        selectLanguage(language.code)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(language.name)
                                    .font(.body)
                                    .foregroundStyle(.primary)
                                Text(nativeLanguageName(for: language.code))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if selectedLanguage == language.code {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.blue)
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                }
            } header: {
                Text("language.override".localized)
            } footer: {
                Text("language.overrideFooter".localized)
            }
        }
        .navigationTitle("language.title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadCurrentLanguage()
        }
        .alert("language.title".localized, isPresented: $showRestartAlert) {
            Button("common.ok".localized) {}
        } message: {
            Text("language.restartRequired".localized)
        }
    }

    // MARK: - Language Management

    /// Loads the current language override from UserDefaults.
    private func loadCurrentLanguage() {
        if let languages = UserDefaults.standard.array(forKey: "AppleLanguages") as? [String],
           let first = languages.first {
            // Check if this is a user override (not system default)
            let systemLanguage = Locale.preferredLanguages.first ?? "en"
            if first != systemLanguage {
                // Find the matching supported language
                for lang in supportedLanguages where first.hasPrefix(lang.code) {
                    selectedLanguage = lang.code
                    return
                }
            }
        }
        selectedLanguage = nil
    }

    /// Selects a language and persists the override.
    private func selectLanguage(_ code: String?) {
        let previousSelection = selectedLanguage
        selectedLanguage = code

        if let code = code {
            UserDefaults.standard.set([code], forKey: "AppleLanguages")
        } else {
            UserDefaults.standard.removeObject(forKey: "AppleLanguages")
        }
        UserDefaults.standard.synchronize()

        // Show restart alert if the language actually changed
        if previousSelection != code {
            showRestartAlert = true
        }
    }

    /// Returns the native name for a language code (e.g., "Deutsch" for "de").
    private func nativeLanguageName(for code: String) -> String {
        let locale = Locale(identifier: code)
        return locale.localizedString(forLanguageCode: code)?.capitalized ?? code
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        LanguageSettingsView()
    }
}
