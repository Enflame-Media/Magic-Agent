//
//  Artifact.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Represents an artifact generated during a Claude Code session.
///
/// Artifacts are files, code snippets, or documents created by Claude Code
/// during a session. They can be source code, configuration files, images,
/// or documentation.
struct Artifact: Identifiable, Codable, Hashable {
    let id: String
    let sessionId: String
    var title: String
    var content: String
    var type: ArtifactType
    var language: ArtifactLanguage?
    var filePath: String?
    var createdAt: Date
    var updatedAt: Date
    var sizeBytes: Int?

    /// Display name for the artifact, derived from filePath or title.
    var displayName: String {
        if let filePath = filePath {
            return (filePath as NSString).lastPathComponent
        }
        return title
    }

    /// File extension derived from the file path, if available.
    var fileExtension: String? {
        guard let filePath = filePath else { return nil }
        let ext = (filePath as NSString).pathExtension
        return ext.isEmpty ? nil : ext
    }

    /// Human-readable size string.
    var formattedSize: String? {
        guard let bytes = sizeBytes else { return nil }
        if bytes < 1024 {
            return "\(bytes) B"
        } else if bytes < 1024 * 1024 {
            return String(format: "%.1f KB", Double(bytes) / 1024.0)
        } else {
            return String(format: "%.1f MB", Double(bytes) / (1024.0 * 1024.0))
        }
    }

    /// The number of lines in the content.
    var lineCount: Int {
        content.components(separatedBy: "\n").count
    }
}

// MARK: - ArtifactType

/// The type of an artifact.
enum ArtifactType: String, Codable, Hashable, CaseIterable {
    case code
    case document
    case image
    case config
    case unknown

    /// SF Symbol name for this artifact type.
    var iconName: String {
        switch self {
        case .code:
            return "chevron.left.forwardslash.chevron.right"
        case .document:
            return "doc.text"
        case .image:
            return "photo"
        case .config:
            return "gearshape"
        case .unknown:
            return "doc"
        }
    }

    /// Human-readable label for the type.
    var label: String {
        switch self {
        case .code:
            return "Code"
        case .document:
            return "Document"
        case .image:
            return "Image"
        case .config:
            return "Config"
        case .unknown:
            return "File"
        }
    }
}

// MARK: - ArtifactLanguage

/// Programming language of a code artifact.
enum ArtifactLanguage: String, Codable, Hashable, CaseIterable {
    case swift
    case python
    case javascript
    case typescript
    case json
    case html
    case css
    case bash
    case markdown
    case yaml
    case toml
    case xml
    case sql
    case ruby
    case go
    case rust
    case java
    case kotlin
    case csharp
    case cpp
    case unknown

    /// Human-readable display name.
    var displayName: String {
        switch self {
        case .swift: return "Swift"
        case .python: return "Python"
        case .javascript: return "JavaScript"
        case .typescript: return "TypeScript"
        case .json: return "JSON"
        case .html: return "HTML"
        case .css: return "CSS"
        case .bash: return "Bash"
        case .markdown: return "Markdown"
        case .yaml: return "YAML"
        case .toml: return "TOML"
        case .xml: return "XML"
        case .sql: return "SQL"
        case .ruby: return "Ruby"
        case .go: return "Go"
        case .rust: return "Rust"
        case .java: return "Java"
        case .kotlin: return "Kotlin"
        case .csharp: return "C#"
        case .cpp: return "C++"
        case .unknown: return "Plain Text"
        }
    }

    /// Infer the language from a file extension.
    ///
    /// - Parameter extension: The file extension (without the leading dot).
    /// - Returns: The inferred language, or `.unknown` if not recognized.
    static func from(fileExtension ext: String) -> ArtifactLanguage {
        switch ext.lowercased() {
        case "swift":
            return .swift
        case "py", "pyw":
            return .python
        case "js", "mjs", "cjs", "jsx":
            return .javascript
        case "ts", "tsx", "mts", "cts":
            return .typescript
        case "json", "jsonc":
            return .json
        case "html", "htm":
            return .html
        case "css", "scss", "less":
            return .css
        case "sh", "bash", "zsh":
            return .bash
        case "md", "markdown":
            return .markdown
        case "yaml", "yml":
            return .yaml
        case "toml":
            return .toml
        case "xml", "plist":
            return .xml
        case "sql":
            return .sql
        case "rb":
            return .ruby
        case "go":
            return .go
        case "rs":
            return .rust
        case "java":
            return .java
        case "kt", "kts":
            return .kotlin
        case "cs":
            return .csharp
        case "cpp", "cc", "cxx", "c", "h", "hpp":
            return .cpp
        default:
            return .unknown
        }
    }
}

// MARK: - Sample Data

extension Artifact {
    static let sampleCode = Artifact(
        id: "artifact-001",
        sessionId: "sample-123",
        title: "Authentication Service",
        content: """
        import Foundation
        import CryptoKit

        struct AuthService {
            static func authenticate(token: String) async throws -> Bool {
                guard !token.isEmpty else {
                    throw AuthError.invalidToken
                }
                // Verify the token with the server
                let result = try await verifyToken(token)
                return result.isValid
            }
        }
        """,
        type: .code,
        language: .swift,
        filePath: "Sources/Services/AuthService.swift",
        createdAt: Date(),
        updatedAt: Date(),
        sizeBytes: 342
    )

    static let sampleJSON = Artifact(
        id: "artifact-002",
        sessionId: "sample-123",
        title: "Package Configuration",
        content: """
        {
            "name": "happy-ios",
            "version": "1.0.0",
            "dependencies": {
                "swift-crypto": "^3.0.0"
            }
        }
        """,
        type: .config,
        language: .json,
        filePath: "package.json",
        createdAt: Date(),
        updatedAt: Date(),
        sizeBytes: 128
    )

    static let sampleDocument = Artifact(
        id: "artifact-003",
        sessionId: "sample-123",
        title: "Setup Guide",
        content: """
        # Setup Guide

        ## Prerequisites

        - Xcode 15.0+
        - iOS 16.0+ deployment target
        - Swift 5.9+

        ## Installation

        1. Clone the repository
        2. Open `Happy.xcodeproj`
        3. Build and run
        """,
        type: .document,
        language: .markdown,
        filePath: "docs/SETUP.md",
        createdAt: Date(),
        updatedAt: Date(),
        sizeBytes: 215
    )

    static let samples: [Artifact] = [sampleCode, sampleJSON, sampleDocument]
}
