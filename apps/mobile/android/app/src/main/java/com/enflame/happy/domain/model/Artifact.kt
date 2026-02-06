package com.enflame.happy.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for an artifact generated during a Claude Code session.
 *
 * Artifacts are files, code snippets, or documents created by Claude Code
 * during a session. They can be source code, configuration files, images,
 * or documentation.
 */
@Serializable
data class Artifact(
    val id: String,
    val sessionId: String,
    val type: ArtifactType = ArtifactType.CODE,
    val title: String,
    val content: String,
    val language: ArtifactLanguage? = null,
    val filePath: String? = null,
    val createdAt: Long,
    val updatedAt: Long? = null,
    val sizeBytes: Int? = null
) {

    /**
     * Display name for the artifact, derived from filePath or title.
     */
    val displayName: String
        get() {
            if (filePath != null) {
                return filePath.substringAfterLast('/')
            }
            return title
        }

    /**
     * File extension derived from the file path, if available.
     */
    val fileExtension: String?
        get() {
            val path = filePath ?: return null
            val ext = path.substringAfterLast('.', "")
            return ext.ifEmpty { null }
        }

    /**
     * Human-readable size string.
     */
    val formattedSize: String?
        get() {
            val bytes = sizeBytes ?: return null
            return when {
                bytes < 1024 -> "$bytes B"
                bytes < 1024 * 1024 -> String.format("%.1f KB", bytes / 1024.0)
                else -> String.format("%.1f MB", bytes / (1024.0 * 1024.0))
            }
        }

    /**
     * The number of lines in the content.
     */
    val lineCount: Int
        get() = content.split("\n").size

    companion object {
        /**
         * Sample code artifact for previews and testing.
         */
        val sampleCode = Artifact(
            id = "artifact-001",
            sessionId = "sample-123",
            type = ArtifactType.CODE,
            title = "Authentication Service",
            content = """
                |package com.example.auth
                |
                |import javax.inject.Inject
                |
                |/**
                | * Service for handling authentication.
                | */
                |class AuthService @Inject constructor() {
                |    fun authenticate(token: String): Boolean {
                |        require(token.isNotEmpty()) { "Token must not be empty" }
                |        // Verify the token with the server
                |        val result = verifyToken(token)
                |        return result.isValid
                |    }
                |}
            """.trimMargin(),
            language = ArtifactLanguage.KOTLIN,
            filePath = "src/main/java/com/example/AuthService.kt",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            sizeBytes = 342
        )

        /**
         * Sample JSON artifact for previews and testing.
         */
        val sampleJson = Artifact(
            id = "artifact-002",
            sessionId = "sample-123",
            type = ArtifactType.CONFIG,
            title = "Package Configuration",
            content = """
                |{
                |    "name": "happy-android",
                |    "version": "1.0.0",
                |    "dependencies": {
                |        "kotlin-stdlib": "1.9.22"
                |    }
                |}
            """.trimMargin(),
            language = ArtifactLanguage.JSON,
            filePath = "package.json",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            sizeBytes = 128
        )

        /**
         * Sample document artifact for previews and testing.
         */
        val sampleDocument = Artifact(
            id = "artifact-003",
            sessionId = "sample-123",
            type = ArtifactType.DOCUMENT,
            title = "Setup Guide",
            content = """
                |# Setup Guide
                |
                |## Prerequisites
                |
                |- Android Studio Hedgehog (2023.1.1) or later
                |- Kotlin 1.9.22+
                |- JDK 17
                |
                |## Installation
                |
                |1. Clone the repository
                |2. Open in Android Studio
                |3. Build and run
            """.trimMargin(),
            language = ArtifactLanguage.MARKDOWN,
            filePath = "docs/SETUP.md",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            sizeBytes = 215
        )

        /**
         * Sample image artifact for previews and testing.
         */
        val sampleImage = Artifact(
            id = "artifact-004",
            sessionId = "sample-123",
            type = ArtifactType.IMAGE,
            title = "Architecture Diagram",
            content = "https://example.com/images/architecture-diagram.png",
            language = null,
            filePath = "docs/architecture.png",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            sizeBytes = 48576
        )

        /**
         * Collection of sample artifacts for previews and testing.
         */
        val samples: List<Artifact> = listOf(sampleCode, sampleJson, sampleDocument, sampleImage)
    }
}

/**
 * The type of an artifact.
 */
@Serializable
enum class ArtifactType {
    CODE,
    DOCUMENT,
    CONFIG,
    IMAGE;

    /**
     * Human-readable label for the type.
     */
    val label: String
        get() = when (this) {
            CODE -> "Code"
            DOCUMENT -> "Document"
            CONFIG -> "Config"
            IMAGE -> "Image"
        }
}

/**
 * Programming language of a code artifact.
 *
 * Supports inference from file extensions and provides display names
 * for each supported language.
 */
@Serializable
enum class ArtifactLanguage {
    KOTLIN,
    JAVA,
    PYTHON,
    JAVASCRIPT,
    TYPESCRIPT,
    SWIFT,
    HTML,
    CSS,
    JSON,
    YAML,
    BASH,
    MARKDOWN,
    TOML,
    XML,
    SQL,
    RUBY,
    GO,
    RUST,
    CSHARP,
    CPP,
    UNKNOWN;

    /**
     * Human-readable display name for the language.
     */
    val displayName: String
        get() = when (this) {
            KOTLIN -> "Kotlin"
            JAVA -> "Java"
            PYTHON -> "Python"
            JAVASCRIPT -> "JavaScript"
            TYPESCRIPT -> "TypeScript"
            SWIFT -> "Swift"
            HTML -> "HTML"
            CSS -> "CSS"
            JSON -> "JSON"
            YAML -> "YAML"
            BASH -> "Bash"
            MARKDOWN -> "Markdown"
            TOML -> "TOML"
            XML -> "XML"
            SQL -> "SQL"
            RUBY -> "Ruby"
            GO -> "Go"
            RUST -> "Rust"
            CSHARP -> "C#"
            CPP -> "C++"
            UNKNOWN -> "Plain Text"
        }

    companion object {
        /**
         * Infer the language from a file extension.
         *
         * @param extension The file extension (without the leading dot).
         * @return The inferred language, or [UNKNOWN] if not recognized.
         */
        fun fromFileExtension(extension: String): ArtifactLanguage {
            return when (extension.lowercase()) {
                "kt", "kts" -> KOTLIN
                "java" -> JAVA
                "py", "pyw" -> PYTHON
                "js", "mjs", "cjs", "jsx" -> JAVASCRIPT
                "ts", "tsx", "mts", "cts" -> TYPESCRIPT
                "swift" -> SWIFT
                "html", "htm" -> HTML
                "css", "scss", "less" -> CSS
                "json", "jsonc" -> JSON
                "yaml", "yml" -> YAML
                "sh", "bash", "zsh" -> BASH
                "md", "markdown" -> MARKDOWN
                "toml" -> TOML
                "xml", "plist" -> XML
                "sql" -> SQL
                "rb" -> RUBY
                "go" -> GO
                "rs" -> RUST
                "cs" -> CSHARP
                "cpp", "cc", "cxx", "c", "h", "hpp" -> CPP
                else -> UNKNOWN
            }
        }
    }
}
