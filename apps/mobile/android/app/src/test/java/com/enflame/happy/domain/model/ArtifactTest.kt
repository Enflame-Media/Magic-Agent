package com.enflame.happy.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ArtifactTest {

    private val now = System.currentTimeMillis()

    // --- Artifact displayName ---

    @Test
    fun `displayName returns filename from filePath`() {
        val artifact = createArtifact(
            title = "Auth Service",
            filePath = "src/main/java/AuthService.kt"
        )
        assertEquals("AuthService.kt", artifact.displayName)
    }

    @Test
    fun `displayName returns title when filePath is null`() {
        val artifact = createArtifact(
            title = "Auth Service",
            filePath = null
        )
        assertEquals("Auth Service", artifact.displayName)
    }

    @Test
    fun `displayName handles filePath without directory`() {
        val artifact = createArtifact(
            title = "Config",
            filePath = "package.json"
        )
        assertEquals("package.json", artifact.displayName)
    }

    // --- Artifact fileExtension ---

    @Test
    fun `fileExtension returns extension from filePath`() {
        val artifact = createArtifact(filePath = "src/main/AuthService.kt")
        assertEquals("kt", artifact.fileExtension)
    }

    @Test
    fun `fileExtension returns null when filePath is null`() {
        val artifact = createArtifact(filePath = null)
        assertNull(artifact.fileExtension)
    }

    @Test
    fun `fileExtension handles files with multiple dots`() {
        val artifact = createArtifact(filePath = "src/test.config.json")
        assertEquals("json", artifact.fileExtension)
    }

    @Test
    fun `fileExtension returns null for file without extension`() {
        val artifact = createArtifact(filePath = "Makefile")
        assertNull(artifact.fileExtension)
    }

    // --- Artifact formattedSize ---

    @Test
    fun `formattedSize returns bytes for small files`() {
        val artifact = createArtifact(sizeBytes = 500)
        assertEquals("500 B", artifact.formattedSize)
    }

    @Test
    fun `formattedSize returns KB for medium files`() {
        val artifact = createArtifact(sizeBytes = 2048)
        assertEquals("2.0 KB", artifact.formattedSize)
    }

    @Test
    fun `formattedSize returns MB for large files`() {
        val artifact = createArtifact(sizeBytes = 1_500_000)
        assertEquals("1.4 MB", artifact.formattedSize)
    }

    @Test
    fun `formattedSize returns null when sizeBytes is null`() {
        val artifact = createArtifact(sizeBytes = null)
        assertNull(artifact.formattedSize)
    }

    // --- Artifact lineCount ---

    @Test
    fun `lineCount returns correct count for single line`() {
        val artifact = createArtifact(content = "hello")
        assertEquals(1, artifact.lineCount)
    }

    @Test
    fun `lineCount returns correct count for multiple lines`() {
        val artifact = createArtifact(content = "line1\nline2\nline3")
        assertEquals(3, artifact.lineCount)
    }

    @Test
    fun `lineCount handles empty content`() {
        val artifact = createArtifact(content = "")
        assertEquals(1, artifact.lineCount)
    }

    @Test
    fun `lineCount handles trailing newline`() {
        val artifact = createArtifact(content = "line1\nline2\n")
        assertEquals(3, artifact.lineCount)
    }

    // --- ArtifactType ---

    @Test
    fun `ArtifactType has correct labels`() {
        assertEquals("Code", ArtifactType.CODE.label)
        assertEquals("Document", ArtifactType.DOCUMENT.label)
        assertEquals("Config", ArtifactType.CONFIG.label)
        assertEquals("Image", ArtifactType.IMAGE.label)
    }

    // --- ArtifactLanguage ---

    @Test
    fun `ArtifactLanguage has correct display names`() {
        assertEquals("Kotlin", ArtifactLanguage.KOTLIN.displayName)
        assertEquals("Java", ArtifactLanguage.JAVA.displayName)
        assertEquals("Python", ArtifactLanguage.PYTHON.displayName)
        assertEquals("JavaScript", ArtifactLanguage.JAVASCRIPT.displayName)
        assertEquals("TypeScript", ArtifactLanguage.TYPESCRIPT.displayName)
        assertEquals("Swift", ArtifactLanguage.SWIFT.displayName)
        assertEquals("HTML", ArtifactLanguage.HTML.displayName)
        assertEquals("CSS", ArtifactLanguage.CSS.displayName)
        assertEquals("JSON", ArtifactLanguage.JSON.displayName)
        assertEquals("YAML", ArtifactLanguage.YAML.displayName)
        assertEquals("Bash", ArtifactLanguage.BASH.displayName)
        assertEquals("C#", ArtifactLanguage.CSHARP.displayName)
        assertEquals("C++", ArtifactLanguage.CPP.displayName)
        assertEquals("Plain Text", ArtifactLanguage.UNKNOWN.displayName)
    }

    // --- ArtifactLanguage.fromFileExtension ---

    @Test
    fun `fromFileExtension detects Kotlin`() {
        assertEquals(ArtifactLanguage.KOTLIN, ArtifactLanguage.fromFileExtension("kt"))
        assertEquals(ArtifactLanguage.KOTLIN, ArtifactLanguage.fromFileExtension("kts"))
    }

    @Test
    fun `fromFileExtension detects Java`() {
        assertEquals(ArtifactLanguage.JAVA, ArtifactLanguage.fromFileExtension("java"))
    }

    @Test
    fun `fromFileExtension detects Python`() {
        assertEquals(ArtifactLanguage.PYTHON, ArtifactLanguage.fromFileExtension("py"))
        assertEquals(ArtifactLanguage.PYTHON, ArtifactLanguage.fromFileExtension("pyw"))
    }

    @Test
    fun `fromFileExtension detects JavaScript`() {
        assertEquals(ArtifactLanguage.JAVASCRIPT, ArtifactLanguage.fromFileExtension("js"))
        assertEquals(ArtifactLanguage.JAVASCRIPT, ArtifactLanguage.fromFileExtension("mjs"))
        assertEquals(ArtifactLanguage.JAVASCRIPT, ArtifactLanguage.fromFileExtension("jsx"))
    }

    @Test
    fun `fromFileExtension detects TypeScript`() {
        assertEquals(ArtifactLanguage.TYPESCRIPT, ArtifactLanguage.fromFileExtension("ts"))
        assertEquals(ArtifactLanguage.TYPESCRIPT, ArtifactLanguage.fromFileExtension("tsx"))
    }

    @Test
    fun `fromFileExtension detects Swift`() {
        assertEquals(ArtifactLanguage.SWIFT, ArtifactLanguage.fromFileExtension("swift"))
    }

    @Test
    fun `fromFileExtension detects HTML`() {
        assertEquals(ArtifactLanguage.HTML, ArtifactLanguage.fromFileExtension("html"))
        assertEquals(ArtifactLanguage.HTML, ArtifactLanguage.fromFileExtension("htm"))
    }

    @Test
    fun `fromFileExtension detects CSS`() {
        assertEquals(ArtifactLanguage.CSS, ArtifactLanguage.fromFileExtension("css"))
        assertEquals(ArtifactLanguage.CSS, ArtifactLanguage.fromFileExtension("scss"))
    }

    @Test
    fun `fromFileExtension detects JSON`() {
        assertEquals(ArtifactLanguage.JSON, ArtifactLanguage.fromFileExtension("json"))
        assertEquals(ArtifactLanguage.JSON, ArtifactLanguage.fromFileExtension("jsonc"))
    }

    @Test
    fun `fromFileExtension detects YAML`() {
        assertEquals(ArtifactLanguage.YAML, ArtifactLanguage.fromFileExtension("yaml"))
        assertEquals(ArtifactLanguage.YAML, ArtifactLanguage.fromFileExtension("yml"))
    }

    @Test
    fun `fromFileExtension detects Bash`() {
        assertEquals(ArtifactLanguage.BASH, ArtifactLanguage.fromFileExtension("sh"))
        assertEquals(ArtifactLanguage.BASH, ArtifactLanguage.fromFileExtension("bash"))
    }

    @Test
    fun `fromFileExtension detects Markdown`() {
        assertEquals(ArtifactLanguage.MARKDOWN, ArtifactLanguage.fromFileExtension("md"))
        assertEquals(ArtifactLanguage.MARKDOWN, ArtifactLanguage.fromFileExtension("markdown"))
    }

    @Test
    fun `fromFileExtension detects C++ variants`() {
        assertEquals(ArtifactLanguage.CPP, ArtifactLanguage.fromFileExtension("cpp"))
        assertEquals(ArtifactLanguage.CPP, ArtifactLanguage.fromFileExtension("cc"))
        assertEquals(ArtifactLanguage.CPP, ArtifactLanguage.fromFileExtension("h"))
        assertEquals(ArtifactLanguage.CPP, ArtifactLanguage.fromFileExtension("hpp"))
    }

    @Test
    fun `fromFileExtension returns UNKNOWN for unrecognized extension`() {
        assertEquals(ArtifactLanguage.UNKNOWN, ArtifactLanguage.fromFileExtension("xyz"))
        assertEquals(ArtifactLanguage.UNKNOWN, ArtifactLanguage.fromFileExtension(""))
    }

    @Test
    fun `fromFileExtension is case insensitive`() {
        assertEquals(ArtifactLanguage.KOTLIN, ArtifactLanguage.fromFileExtension("KT"))
        assertEquals(ArtifactLanguage.PYTHON, ArtifactLanguage.fromFileExtension("PY"))
        assertEquals(ArtifactLanguage.JSON, ArtifactLanguage.fromFileExtension("JSON"))
    }

    // --- Sample Data ---

    @Test
    fun `sample artifacts are valid`() {
        assertEquals(3, Artifact.samples.size)
        assertEquals("artifact-001", Artifact.sampleCode.id)
        assertEquals(ArtifactType.CODE, Artifact.sampleCode.type)
        assertEquals(ArtifactType.CONFIG, Artifact.sampleJson.type)
        assertEquals(ArtifactType.DOCUMENT, Artifact.sampleDocument.type)
    }

    // --- Helper ---

    private fun createArtifact(
        id: String = "test-id",
        sessionId: String = "session-123",
        type: ArtifactType = ArtifactType.CODE,
        title: String = "Test",
        content: String = "content",
        language: ArtifactLanguage? = null,
        filePath: String? = null,
        sizeBytes: Int? = null
    ): Artifact = Artifact(
        id = id,
        sessionId = sessionId,
        type = type,
        title = title,
        content = content,
        language = language,
        filePath = filePath,
        createdAt = now,
        updatedAt = now,
        sizeBytes = sizeBytes
    )
}
