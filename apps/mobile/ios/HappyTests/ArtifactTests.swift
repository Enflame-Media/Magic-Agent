//
//  ArtifactTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

final class ArtifactTests: XCTestCase {

    // MARK: - Artifact Model Tests

    func testArtifactDisplayNameUsesFilePathLastComponent() {
        let artifact = Artifact(
            id: "test-1",
            sessionId: "session-1",
            title: "My File",
            content: "content",
            type: .code,
            language: .swift,
            filePath: "Sources/Services/AuthService.swift",
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: nil
        )
        XCTAssertEqual(artifact.displayName, "AuthService.swift")
    }

    func testArtifactDisplayNameFallsBackToTitle() {
        let artifact = Artifact(
            id: "test-2",
            sessionId: "session-1",
            title: "My Document",
            content: "content",
            type: .document,
            language: nil,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: nil
        )
        XCTAssertEqual(artifact.displayName, "My Document")
    }

    func testArtifactFileExtraction() {
        let artifact = Artifact(
            id: "test-3",
            sessionId: "session-1",
            title: "Config",
            content: "{}",
            type: .config,
            language: .json,
            filePath: "config/settings.json",
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: nil
        )
        XCTAssertEqual(artifact.fileExtension, "json")
    }

    func testArtifactFileExtensionNilWithoutPath() {
        let artifact = Artifact(
            id: "test-4",
            sessionId: "session-1",
            title: "Test",
            content: "",
            type: .unknown,
            language: nil,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: nil
        )
        XCTAssertNil(artifact.fileExtension)
    }

    func testArtifactFormattedSizeBytes() {
        let artifact = Artifact(
            id: "test-5",
            sessionId: "session-1",
            title: "Small File",
            content: "",
            type: .code,
            language: nil,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: 512
        )
        XCTAssertEqual(artifact.formattedSize, "512 B")
    }

    func testArtifactFormattedSizeKilobytes() {
        let artifact = Artifact(
            id: "test-6",
            sessionId: "session-1",
            title: "Medium File",
            content: "",
            type: .code,
            language: nil,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: 2048
        )
        XCTAssertEqual(artifact.formattedSize, "2.0 KB")
    }

    func testArtifactFormattedSizeMegabytes() {
        let artifact = Artifact(
            id: "test-7",
            sessionId: "session-1",
            title: "Large File",
            content: "",
            type: .code,
            language: nil,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: 1_572_864
        )
        XCTAssertEqual(artifact.formattedSize, "1.5 MB")
    }

    func testArtifactFormattedSizeNilWithoutSize() {
        let artifact = Artifact(
            id: "test-8",
            sessionId: "session-1",
            title: "No Size",
            content: "",
            type: .code,
            language: nil,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: nil
        )
        XCTAssertNil(artifact.formattedSize)
    }

    func testArtifactLineCount() {
        let artifact = Artifact(
            id: "test-9",
            sessionId: "session-1",
            title: "Multi-line",
            content: "line1\nline2\nline3",
            type: .code,
            language: .swift,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: nil
        )
        XCTAssertEqual(artifact.lineCount, 3)
    }

    func testArtifactLineCountSingleLine() {
        let artifact = Artifact(
            id: "test-10",
            sessionId: "session-1",
            title: "Single Line",
            content: "hello world",
            type: .code,
            language: nil,
            filePath: nil,
            createdAt: Date(),
            updatedAt: Date(),
            sizeBytes: nil
        )
        XCTAssertEqual(artifact.lineCount, 1)
    }

    // MARK: - ArtifactType Tests

    func testArtifactTypeIconNames() {
        XCTAssertEqual(ArtifactType.code.iconName, "chevron.left.forwardslash.chevron.right")
        XCTAssertEqual(ArtifactType.document.iconName, "doc.text")
        XCTAssertEqual(ArtifactType.image.iconName, "photo")
        XCTAssertEqual(ArtifactType.config.iconName, "gearshape")
        XCTAssertEqual(ArtifactType.unknown.iconName, "doc")
    }

    func testArtifactTypeLabels() {
        XCTAssertEqual(ArtifactType.code.label, "Code")
        XCTAssertEqual(ArtifactType.document.label, "Document")
        XCTAssertEqual(ArtifactType.image.label, "Image")
        XCTAssertEqual(ArtifactType.config.label, "Config")
        XCTAssertEqual(ArtifactType.unknown.label, "File")
    }

    // MARK: - ArtifactLanguage Tests

    func testLanguageFromSwiftExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "swift"), .swift)
    }

    func testLanguageFromPythonExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "py"), .python)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "pyw"), .python)
    }

    func testLanguageFromJavaScriptExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "js"), .javascript)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "jsx"), .javascript)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "mjs"), .javascript)
    }

    func testLanguageFromTypeScriptExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "ts"), .typescript)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "tsx"), .typescript)
    }

    func testLanguageFromJSONExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "json"), .json)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "jsonc"), .json)
    }

    func testLanguageFromHTMLExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "html"), .html)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "htm"), .html)
    }

    func testLanguageFromCSSExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "css"), .css)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "scss"), .css)
    }

    func testLanguageFromBashExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "sh"), .bash)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "bash"), .bash)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "zsh"), .bash)
    }

    func testLanguageFromMarkdownExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "md"), .markdown)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "markdown"), .markdown)
    }

    func testLanguageFromYAMLExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "yaml"), .yaml)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "yml"), .yaml)
    }

    func testLanguageFromUnknownExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "xyz"), .unknown)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: ""), .unknown)
    }

    func testLanguageCaseInsensitiveExtension() {
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "SWIFT"), .swift)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "Py"), .python)
        XCTAssertEqual(ArtifactLanguage.from(fileExtension: "JSON"), .json)
    }

    func testLanguageDisplayNames() {
        XCTAssertEqual(ArtifactLanguage.swift.displayName, "Swift")
        XCTAssertEqual(ArtifactLanguage.python.displayName, "Python")
        XCTAssertEqual(ArtifactLanguage.javascript.displayName, "JavaScript")
        XCTAssertEqual(ArtifactLanguage.typescript.displayName, "TypeScript")
        XCTAssertEqual(ArtifactLanguage.json.displayName, "JSON")
        XCTAssertEqual(ArtifactLanguage.html.displayName, "HTML")
        XCTAssertEqual(ArtifactLanguage.css.displayName, "CSS")
        XCTAssertEqual(ArtifactLanguage.bash.displayName, "Bash")
        XCTAssertEqual(ArtifactLanguage.unknown.displayName, "Plain Text")
    }

    // MARK: - Codable Tests

    func testArtifactCodable() throws {
        let original = Artifact.sampleCode
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(Artifact.self, from: data)

        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.sessionId, original.sessionId)
        XCTAssertEqual(decoded.title, original.title)
        XCTAssertEqual(decoded.content, original.content)
        XCTAssertEqual(decoded.type, original.type)
        XCTAssertEqual(decoded.language, original.language)
        XCTAssertEqual(decoded.filePath, original.filePath)
    }

    func testArtifactTypeCodable() throws {
        for type in ArtifactType.allCases {
            let encoded = try JSONEncoder().encode(type)
            let decoded = try JSONDecoder().decode(ArtifactType.self, from: encoded)
            XCTAssertEqual(decoded, type)
        }
    }

    func testArtifactLanguageCodable() throws {
        for language in ArtifactLanguage.allCases {
            let encoded = try JSONEncoder().encode(language)
            let decoded = try JSONDecoder().decode(ArtifactLanguage.self, from: encoded)
            XCTAssertEqual(decoded, language)
        }
    }

    // MARK: - Sample Data Tests

    func testSampleDataExists() {
        XCTAssertFalse(Artifact.samples.isEmpty)
        XCTAssertEqual(Artifact.samples.count, 3)
    }

    func testSampleCodeArtifact() {
        let sample = Artifact.sampleCode
        XCTAssertEqual(sample.type, .code)
        XCTAssertEqual(sample.language, .swift)
        XCTAssertFalse(sample.content.isEmpty)
        XCTAssertNotNil(sample.filePath)
    }

    func testSampleDocumentArtifact() {
        let sample = Artifact.sampleDocument
        XCTAssertEqual(sample.type, .document)
        XCTAssertEqual(sample.language, .markdown)
        XCTAssertFalse(sample.content.isEmpty)
    }
}
