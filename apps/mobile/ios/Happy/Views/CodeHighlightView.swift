//
//  CodeHighlightView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A view that displays syntax-highlighted source code with optional line numbers.
///
/// Uses `SyntaxHighlighter` to tokenize and colorize source code, then renders
/// it using SwiftUI `Text` views with `AttributedString`.
///
/// Features:
/// - Syntax highlighting for multiple languages
/// - Optional line numbers with separator
/// - Horizontal scrolling for long lines
/// - Dark/light mode adaptive colors
/// - Text selection support
struct CodeHighlightView: View {

    let source: String
    let language: ArtifactLanguage
    var showLineNumbers: Bool = true

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            HStack(alignment: .top, spacing: 0) {
                // Line numbers
                if showLineNumbers {
                    lineNumbersColumn
                }

                // Highlighted code
                codeColumn
            }
        }
        .background(codeBackgroundColor)
    }

    // MARK: - Line Numbers Column

    private var lineNumbersColumn: some View {
        let lines = source.components(separatedBy: "\n")
        let maxDigits = String(lines.count).count

        return VStack(alignment: .trailing, spacing: 0) {
            ForEach(Array(lines.enumerated()), id: \.offset) { index, _ in
                Text("\(index + 1)")
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(lineNumberColor)
                    .frame(minWidth: CGFloat(maxDigits * 10 + 8), alignment: .trailing)
                    .padding(.trailing, 8)
                    .padding(.vertical, 1)
            }
        }
        .padding(.leading, 8)
        .padding(.vertical, 12)
        .background(lineNumberBackgroundColor)
        .overlay(alignment: .trailing) {
            Rectangle()
                .fill(separatorColor)
                .frame(width: 1)
        }
    }

    // MARK: - Code Column

    private var codeColumn: some View {
        let highlightedCode = SyntaxHighlighter.highlight(
            source: source,
            language: language,
            isDarkMode: colorScheme == .dark
        )

        return VStack(alignment: .leading, spacing: 0) {
            Text(highlightedCode)
                .textSelection(.enabled)
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
        }
    }

    // MARK: - Colors

    private var codeBackgroundColor: Color {
        colorScheme == .dark
            ? Color(red: 0.11, green: 0.12, blue: 0.14)
            : Color(red: 0.98, green: 0.98, blue: 0.99)
    }

    private var lineNumberBackgroundColor: Color {
        colorScheme == .dark
            ? Color(red: 0.09, green: 0.10, blue: 0.12)
            : Color(red: 0.95, green: 0.96, blue: 0.97)
    }

    private var lineNumberColor: Color {
        colorScheme == .dark
            ? Color(red: 0.40, green: 0.43, blue: 0.46)
            : Color(red: 0.60, green: 0.63, blue: 0.66)
    }

    private var separatorColor: Color {
        colorScheme == .dark
            ? Color(red: 0.20, green: 0.22, blue: 0.24)
            : Color(red: 0.88, green: 0.89, blue: 0.90)
    }
}

// MARK: - Preview

#Preview("Swift Code") {
    ScrollView {
        CodeHighlightView(
            source: """
            import Foundation
            import CryptoKit

            /// A service for authentication.
            struct AuthService {
                static let shared = AuthService()

                func authenticate(token: String) async throws -> Bool {
                    guard !token.isEmpty else {
                        throw AuthError.invalidToken
                    }
                    // Verify the token with the server
                    let result = try await verifyToken(token)
                    return result.isValid
                }

                private func verifyToken(_ token: String) async throws -> TokenResult {
                    let url = URL(string: "https://api.example.com/verify")!
                    let (data, _) = try await URLSession.shared.data(from: url)
                    return try JSONDecoder().decode(TokenResult.self, from: data)
                }
            }
            """,
            language: .swift
        )
    }
}

#Preview("JSON") {
    ScrollView {
        CodeHighlightView(
            source: """
            {
                "name": "happy-ios",
                "version": "1.0.0",
                "description": "Happy iOS Client",
                "dependencies": {
                    "swift-crypto": "^3.0.0"
                },
                "scripts": {
                    "build": "xcodebuild build",
                    "test": "xcodebuild test"
                },
                "isPublic": true,
                "downloads": 42000
            }
            """,
            language: .json
        )
    }
}

#Preview("No Line Numbers") {
    ScrollView {
        CodeHighlightView(
            source: "let greeting = \"Hello, World!\"\nprint(greeting)",
            language: .swift,
            showLineNumbers: false
        )
    }
}
