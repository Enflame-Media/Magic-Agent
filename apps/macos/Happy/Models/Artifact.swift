//
//  Artifact.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import UniformTypeIdentifiers

// MARK: - Artifact Model

/// Represents an artifact (file/output) generated during Claude Code sessions.
///
/// Artifacts can be code files, images, documents, or other outputs created
/// during Claude's work. They are encrypted on the server and decrypted locally.
struct Artifact: Identifiable, Codable, Hashable {
    /// Unique identifier for the artifact.
    let id: String

    /// Display title/filename.
    var title: String?

    /// File path within session context.
    var filePath: String?

    /// MIME type if known.
    var mimeType: String?

    /// Programming language for syntax highlighting.
    var language: String?

    /// Associated session IDs.
    var sessions: [String]

    /// Decrypted body content (lazy loaded).
    var body: String?

    /// File type category for display.
    var fileType: ArtifactFileType

    /// Header version for optimistic concurrency.
    var headerVersion: Int

    /// Body version.
    var bodyVersion: Int?

    /// Sequence number for ordering.
    var seq: Int

    /// Creation timestamp.
    var createdAt: Date

    /// Last update timestamp.
    var updatedAt: Date

    /// Whether header content was successfully decrypted.
    var isDecrypted: Bool

    /// Whether body content is loaded.
    var isBodyLoaded: Bool

    // MARK: - Computed Properties

    /// The display name for the artifact.
    var displayName: String {
        if let title = title, !title.isEmpty {
            return title
        }
        if let filePath = filePath, !filePath.isEmpty {
            return (filePath as NSString).lastPathComponent
        }
        return "Untitled"
    }

    /// The file extension derived from path or title.
    var fileExtension: String? {
        let path = filePath ?? title ?? ""
        let ext = (path as NSString).pathExtension
        return ext.isEmpty ? nil : ext.lowercased()
    }

    /// The uniform type identifier for this artifact.
    var uniformTypeIdentifier: UTType? {
        if let mimeType = mimeType {
            return UTType(mimeType: mimeType)
        }
        if let ext = fileExtension {
            return UTType(filenameExtension: ext)
        }
        return nil
    }
}

// MARK: - Artifact File Type

/// Categories of artifact file types for display and handling.
enum ArtifactFileType: String, Codable, Hashable, CaseIterable {
    case code
    case image
    case document
    case data
    case unknown

    /// Human-readable description.
    var description: String {
        switch self {
        case .code: return "Code"
        case .image: return "Image"
        case .document: return "Document"
        case .data: return "Data"
        case .unknown: return "Unknown"
        }
    }

    /// System icon name for this file type.
    var systemImage: String {
        switch self {
        case .code: return "doc.text"
        case .image: return "photo"
        case .document: return "doc.richtext"
        case .data: return "tablecells"
        case .unknown: return "doc"
        }
    }
}

// MARK: - File Tree Node

/// A node in the file tree hierarchy for OutlineGroup display.
///
/// Used to build a hierarchical view of artifacts organized by their file paths.
struct FileTreeNode: Identifiable, Hashable {
    /// Unique identifier for SwiftUI.
    let id: String

    /// Node name (file or folder name).
    let name: String

    /// Full path from root.
    let path: String

    /// Whether this is a directory.
    let isDirectory: Bool

    /// Children nodes (for directories).
    var children: [FileTreeNode]?

    /// Associated artifact ID (for files).
    var artifactId: String?

    /// File extension (for files).
    var fileExtension: String?

    /// The file type for icon display.
    var fileType: ArtifactFileType?

    // MARK: - Computed Properties

    /// System icon name based on node type and extension.
    var systemImage: String {
        if isDirectory {
            return "folder"
        }

        if let fileType = fileType {
            return fileType.systemImage
        }

        // Infer from extension
        guard let ext = fileExtension?.lowercased() else {
            return "doc"
        }

        switch ext {
        // Code files
        case "swift", "ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java",
             "kt", "c", "cpp", "h", "hpp", "cs", "php", "sh", "bash", "zsh",
             "sql", "html", "css", "scss", "less", "vue":
            return "doc.text"

        // Images
        case "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "heic":
            return "photo"

        // Documents
        case "md", "txt", "rtf", "pdf", "doc", "docx":
            return "doc.richtext"

        // Data files
        case "json", "xml", "yaml", "yml", "toml", "csv", "tsv":
            return "tablecells"

        default:
            return "doc"
        }
    }
}

// MARK: - Artifact Header (Encrypted)

/// Decrypted artifact header structure.
///
/// The header is stored encrypted on the server; this is the decrypted form.
struct ArtifactHeader: Codable {
    /// Display title/filename.
    let title: String?

    /// MIME type if known.
    let mimeType: String?

    /// File path within session context.
    let filePath: String?

    /// Language for syntax highlighting.
    let language: String?

    /// Associated session IDs.
    let sessions: [String]?
}

// MARK: - API Response Types

/// API response for artifact list endpoint.
struct ArtifactsResponse: Codable {
    let artifacts: [ApiArtifact]
}

/// API representation of an artifact (encrypted).
struct ApiArtifact: Codable {
    let artifactId: String
    let encryptedHeader: String
    let headerVersion: Int
    let bodyVersion: Int?
    let seq: Int
    let createdAt: Date
    let updatedAt: Date
}

/// API response for artifact body endpoint.
struct ArtifactBodyResponse: Codable {
    let encryptedBody: String
}

// MARK: - File Type Inference

extension ArtifactFileType {
    /// Infer file type from MIME type or file path.
    static func infer(mimeType: String?, filePath: String?) -> ArtifactFileType {
        // Check MIME type first
        if let mimeType = mimeType {
            if mimeType.hasPrefix("image/") { return .image }
            if mimeType.hasPrefix("text/") { return .code }
            if mimeType.contains("json") || mimeType.contains("xml") { return .data }
            if mimeType.contains("pdf") || mimeType.contains("document") { return .document }
        }

        // Check file extension
        guard let path = filePath ?? nil,
              let ext = path.components(separatedBy: ".").last?.lowercased() else {
            return .unknown
        }

        // Code extensions
        let codeExtensions: Set<String> = [
            "ts", "tsx", "js", "jsx", "vue", "py", "rb", "go", "rs", "java",
            "kt", "swift", "c", "cpp", "h", "hpp", "cs", "php", "sh", "bash",
            "zsh", "fish", "ps1", "sql", "html", "css", "scss", "less", "sass"
        ]
        if codeExtensions.contains(ext) { return .code }

        // Image extensions
        let imageExtensions: Set<String> = [
            "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "heic", "tiff"
        ]
        if imageExtensions.contains(ext) { return .image }

        // Data extensions
        let dataExtensions: Set<String> = [
            "json", "xml", "yaml", "yml", "toml", "csv", "tsv"
        ]
        if dataExtensions.contains(ext) { return .data }

        // Document extensions
        let documentExtensions: Set<String> = [
            "md", "txt", "pdf", "doc", "docx", "rtf"
        ]
        if documentExtensions.contains(ext) { return .document }

        return .unknown
    }
}

// MARK: - Language Inference

extension Artifact {
    /// Infer programming language for syntax highlighting from file path.
    static func inferLanguage(from filePath: String?) -> String? {
        guard let path = filePath,
              let ext = path.components(separatedBy: ".").last?.lowercased() else {
            return nil
        }

        let languageMap: [String: String] = [
            "ts": "typescript",
            "tsx": "tsx",
            "js": "javascript",
            "jsx": "jsx",
            "vue": "vue",
            "py": "python",
            "rb": "ruby",
            "go": "go",
            "rs": "rust",
            "java": "java",
            "kt": "kotlin",
            "swift": "swift",
            "c": "c",
            "cpp": "cpp",
            "h": "c",
            "hpp": "cpp",
            "cs": "csharp",
            "php": "php",
            "sh": "bash",
            "bash": "bash",
            "zsh": "bash",
            "fish": "fish",
            "ps1": "powershell",
            "sql": "sql",
            "html": "html",
            "css": "css",
            "scss": "scss",
            "less": "less",
            "sass": "sass",
            "json": "json",
            "xml": "xml",
            "yaml": "yaml",
            "yml": "yaml",
            "toml": "toml",
            "md": "markdown",
            "txt": "plaintext"
        ]

        return languageMap[ext]
    }
}

// MARK: - Sample Data

extension Artifact {
    /// Empty artifact for previews and testing.
    static let empty = Artifact(
        id: "",
        title: nil,
        filePath: nil,
        mimeType: nil,
        language: nil,
        sessions: [],
        body: nil,
        fileType: .unknown,
        headerVersion: 0,
        bodyVersion: nil,
        seq: 0,
        createdAt: Date(),
        updatedAt: Date(),
        isDecrypted: false,
        isBodyLoaded: false
    )

    /// Sample code artifact for previews.
    static let sampleCode = Artifact(
        id: "artifact-code-1",
        title: "main.swift",
        filePath: "Sources/App/main.swift",
        mimeType: "text/x-swift",
        language: "swift",
        sessions: ["session-1"],
        body: """
        import Foundation

        @main
        struct App {
            static func main() {
                print("Hello, World!")
            }
        }
        """,
        fileType: .code,
        headerVersion: 1,
        bodyVersion: 1,
        seq: 1,
        createdAt: Date(),
        updatedAt: Date(),
        isDecrypted: true,
        isBodyLoaded: true
    )

    /// Sample image artifact for previews.
    static let sampleImage = Artifact(
        id: "artifact-image-1",
        title: "screenshot.png",
        filePath: "docs/images/screenshot.png",
        mimeType: "image/png",
        language: nil,
        sessions: ["session-1"],
        body: nil,
        fileType: .image,
        headerVersion: 1,
        bodyVersion: 1,
        seq: 2,
        createdAt: Date(),
        updatedAt: Date(),
        isDecrypted: true,
        isBodyLoaded: false
    )

    /// Sample data artifact for previews.
    static let sampleJson = Artifact(
        id: "artifact-json-1",
        title: "config.json",
        filePath: "config/settings.json",
        mimeType: "application/json",
        language: "json",
        sessions: ["session-1"],
        body: """
        {
            "name": "Happy",
            "version": "1.0.0",
            "features": ["sync", "encryption", "artifacts"]
        }
        """,
        fileType: .data,
        headerVersion: 1,
        bodyVersion: 1,
        seq: 3,
        createdAt: Date(),
        updatedAt: Date(),
        isDecrypted: true,
        isBodyLoaded: true
    )

    /// Sample artifacts array for previews.
    static let samples: [Artifact] = [
        sampleCode,
        sampleImage,
        sampleJson
    ]
}

// MARK: - File Tree Building

extension Array where Element == Artifact {
    /// Build a file tree from artifacts based on their file paths.
    func buildFileTree() -> [FileTreeNode] {
        var root: [FileTreeNode] = []
        var pathMap: [String: FileTreeNode] = [:]

        for artifact in self {
            let path = artifact.filePath ?? artifact.title ?? artifact.id
            let parts = path.components(separatedBy: "/").filter { !$0.isEmpty }

            var currentPath = ""
            var currentLevel = root

            for (index, part) in parts.enumerated() {
                let isLast = index == parts.count - 1
                currentPath = currentPath.isEmpty ? part : "\(currentPath)/\(part)"

                if let existingNode = pathMap[currentPath] {
                    // Node already exists
                    if !isLast, let children = existingNode.children {
                        currentLevel = children
                    }
                } else {
                    // Create new node
                    let node = FileTreeNode(
                        id: isLast ? artifact.id : currentPath,
                        name: part,
                        path: currentPath,
                        isDirectory: !isLast,
                        children: isLast ? nil : [],
                        artifactId: isLast ? artifact.id : nil,
                        fileExtension: isLast ? artifact.fileExtension : nil,
                        fileType: isLast ? artifact.fileType : nil
                    )

                    pathMap[currentPath] = node
                    currentLevel.append(node)

                    if !isLast {
                        currentLevel = []
                        // Update the children reference
                        pathMap[currentPath]?.children = currentLevel
                    }
                }
            }

            // Rebuild root from pathMap to include all updates
            root = rebuildTree(from: &pathMap)
        }

        return sortFileTree(root)
    }

    /// Rebuild tree structure from path map.
    private func rebuildTree(from pathMap: inout [String: FileTreeNode]) -> [FileTreeNode] {
        var root: [FileTreeNode] = []

        // Find all root-level nodes (no "/" in their path)
        for (path, node) in pathMap {
            if !path.contains("/") {
                root.append(node)
            } else {
                // Find parent and add as child
                let parentPath = path.components(separatedBy: "/").dropLast().joined(separator: "/")
                if var parent = pathMap[parentPath] {
                    var children = parent.children ?? []
                    if !children.contains(where: { $0.id == node.id }) {
                        children.append(node)
                        parent.children = children
                        pathMap[parentPath] = parent
                    }
                }
            }
        }

        return root
    }

    /// Sort file tree: directories first, then alphabetically.
    private func sortFileTree(_ nodes: [FileTreeNode]) -> [FileTreeNode] {
        return nodes
            .map { node in
                var sortedNode = node
                if let children = node.children {
                    sortedNode.children = sortFileTree(children)
                }
                return sortedNode
            }
            .sorted { a, b in
                if a.isDirectory != b.isDirectory {
                    return a.isDirectory
                }
                return a.name.localizedCompare(b.name) == .orderedAscending
            }
    }
}
