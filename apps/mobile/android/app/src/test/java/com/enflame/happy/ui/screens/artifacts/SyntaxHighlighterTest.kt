package com.enflame.happy.ui.screens.artifacts

import com.enflame.happy.domain.model.ArtifactLanguage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SyntaxHighlighterTest {

    // --- Tokenization Tests ---

    @Test
    fun `empty source returns empty tokens`() {
        val tokens = SyntaxHighlighter.tokenize("", ArtifactLanguage.KOTLIN)
        assertTrue(tokens.isEmpty())
    }

    @Test
    fun `plain text has no tokens`() {
        val tokens = SyntaxHighlighter.tokenize("hello world", ArtifactLanguage.KOTLIN)
        // Plain text should have no matched tokens (it becomes plain text in the output)
        assertTrue(tokens.isEmpty())
    }

    // --- Kotlin Highlighting ---

    @Test
    fun `kotlin keywords are detected`() {
        val source = "fun main() { val x = 42 }"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("fun" in keywordTexts)
        assertTrue("val" in keywordTexts)
    }

    @Test
    fun `kotlin string literals are detected`() {
        val source = """val name = "Hello World""""
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val strings = tokens.filter { it.type == SyntaxTokenType.STRING }
        assertTrue(strings.isNotEmpty())
        assertTrue(strings.any { it.text.contains("Hello World") })
    }

    @Test
    fun `kotlin line comments are detected`() {
        val source = "val x = 1 // this is a comment"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val comments = tokens.filter { it.type == SyntaxTokenType.COMMENT }
        assertTrue(comments.isNotEmpty())
        assertTrue(comments.any { it.text.contains("this is a comment") })
    }

    @Test
    fun `kotlin block comments are detected`() {
        val source = "/* block\ncomment */ val x = 1"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val comments = tokens.filter { it.type == SyntaxTokenType.COMMENT }
        assertTrue(comments.isNotEmpty())
        assertTrue(comments.any { it.text.contains("block") })
    }

    @Test
    fun `kotlin numbers are detected`() {
        val source = "val x = 42"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val numbers = tokens.filter { it.type == SyntaxTokenType.NUMBER }
        assertTrue(numbers.isNotEmpty())
        assertTrue(numbers.any { it.text == "42" })
    }

    @Test
    fun `kotlin annotations are detected`() {
        val source = "@Inject class MyClass"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val attributes = tokens.filter { it.type == SyntaxTokenType.ATTRIBUTE }
        assertTrue(attributes.isNotEmpty())
        assertTrue(attributes.any { it.text == "@Inject" })
    }

    @Test
    fun `kotlin types are detected`() {
        val source = "val list: List<String> = emptyList()"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val types = tokens.filter { it.type == SyntaxTokenType.TYPE }
        val typeTexts = types.map { it.text }
        assertTrue("List" in typeTexts)
        assertTrue("String" in typeTexts)
    }

    @Test
    fun `kotlin function calls are detected`() {
        val source = "println(\"hello\")"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        val functions = tokens.filter { it.type == SyntaxTokenType.FUNCTION }
        assertTrue(functions.any { it.text == "println" })
    }

    // --- Java Highlighting ---

    @Test
    fun `java keywords are detected`() {
        val source = "public class Main { public static void main(String[] args) {} }"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JAVA)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("public" in keywordTexts)
        assertTrue("class" in keywordTexts)
        assertTrue("static" in keywordTexts)
        assertTrue("void" in keywordTexts)
    }

    @Test
    fun `java annotations are detected`() {
        val source = "@Override public void toString() {}"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JAVA)

        val attributes = tokens.filter { it.type == SyntaxTokenType.ATTRIBUTE }
        assertTrue(attributes.any { it.text == "@Override" })
    }

    // --- Python Highlighting ---

    @Test
    fun `python keywords are detected`() {
        val source = "def hello():\n    if True:\n        return None"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.PYTHON)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("def" in keywordTexts)
        assertTrue("if" in keywordTexts)
        assertTrue("True" in keywordTexts)
        assertTrue("return" in keywordTexts)
        assertTrue("None" in keywordTexts)
    }

    @Test
    fun `python comments are detected`() {
        val source = "x = 1  # comment"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.PYTHON)

        val comments = tokens.filter { it.type == SyntaxTokenType.COMMENT }
        assertTrue(comments.isNotEmpty())
        assertTrue(comments.any { it.text.contains("comment") })
    }

    @Test
    fun `python decorators are detected`() {
        val source = "@staticmethod\ndef my_func(): pass"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.PYTHON)

        val attributes = tokens.filter { it.type == SyntaxTokenType.ATTRIBUTE }
        assertTrue(attributes.any { it.text == "@staticmethod" })
    }

    // --- JavaScript Highlighting ---

    @Test
    fun `javascript keywords are detected`() {
        val source = "const x = async () => { await fetch(url); return null; }"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JAVASCRIPT)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("const" in keywordTexts)
        assertTrue("async" in keywordTexts)
        assertTrue("await" in keywordTexts)
        assertTrue("return" in keywordTexts)
        assertTrue("null" in keywordTexts)
    }

    @Test
    fun `javascript template literals are detected`() {
        val source = "const msg = `hello \${name}`"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JAVASCRIPT)

        val strings = tokens.filter { it.type == SyntaxTokenType.STRING }
        assertTrue(strings.isNotEmpty())
    }

    // --- TypeScript uses same rules as JavaScript ---

    @Test
    fun `typescript keywords are detected`() {
        val source = "interface User { name: string; readonly id: number; }"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.TYPESCRIPT)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("interface" in keywordTexts)
        assertTrue("readonly" in keywordTexts)
    }

    // --- Swift Highlighting ---

    @Test
    fun `swift keywords are detected`() {
        val source = "func greet() -> String { let name = \"World\"; return name }"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.SWIFT)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("func" in keywordTexts)
        assertTrue("let" in keywordTexts)
        assertTrue("return" in keywordTexts)
    }

    @Test
    fun `swift attributes are detected`() {
        val source = "@Observable class ViewModel {}"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.SWIFT)

        val attributes = tokens.filter { it.type == SyntaxTokenType.ATTRIBUTE }
        assertTrue(attributes.any { it.text == "@Observable" })
    }

    // --- JSON Highlighting ---

    @Test
    fun `json keys are detected as properties`() {
        val source = """{"name": "value", "count": 42}"""
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JSON)

        val properties = tokens.filter { it.type == SyntaxTokenType.PROPERTY }
        assertTrue(properties.any { it.text.contains("name") })
        assertTrue(properties.any { it.text.contains("count") })
    }

    @Test
    fun `json string values are detected`() {
        val source = """{"key": "value"}"""
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JSON)

        val strings = tokens.filter { it.type == SyntaxTokenType.STRING }
        assertTrue(strings.any { it.text.contains("value") })
    }

    @Test
    fun `json numbers are detected`() {
        val source = """{"count": 42, "ratio": 3.14}"""
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JSON)

        val numbers = tokens.filter { it.type == SyntaxTokenType.NUMBER }
        assertTrue(numbers.any { it.text == "42" })
        assertTrue(numbers.any { it.text == "3.14" })
    }

    @Test
    fun `json booleans and null are detected`() {
        val source = """{"active": true, "deleted": false, "data": null}"""
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.JSON)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("true" in keywordTexts)
        assertTrue("false" in keywordTexts)
        assertTrue("null" in keywordTexts)
    }

    // --- HTML Highlighting ---

    @Test
    fun `html tags are detected`() {
        val source = "<div class=\"container\"><p>Hello</p></div>"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.HTML)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        assertTrue(keywords.any { it.text.contains("div") })
        assertTrue(keywords.any { it.text.contains("p") })
    }

    @Test
    fun `html comments are detected`() {
        val source = "<!-- This is a comment --><p>Text</p>"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.HTML)

        val comments = tokens.filter { it.type == SyntaxTokenType.COMMENT }
        assertTrue(comments.isNotEmpty())
    }

    // --- CSS Highlighting ---

    @Test
    fun `css properties are detected`() {
        val source = "body { color: red; font-size: 16px; }"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.CSS)

        val properties = tokens.filter { it.type == SyntaxTokenType.PROPERTY }
        assertTrue(properties.any { it.text == "color" })
        assertTrue(properties.any { it.text == "font-size" })
    }

    @Test
    fun `css numbers with units are detected`() {
        val source = "div { margin: 10px; width: 50%; }"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.CSS)

        val numbers = tokens.filter { it.type == SyntaxTokenType.NUMBER }
        assertTrue(numbers.any { it.text.contains("10px") })
        assertTrue(numbers.any { it.text.contains("50%") })
    }

    // --- Bash Highlighting ---

    @Test
    fun `bash keywords are detected`() {
        val source = "if [ -f file ]; then echo \"exists\"; fi"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.BASH)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        val keywordTexts = keywords.map { it.text }
        assertTrue("if" in keywordTexts)
        assertTrue("then" in keywordTexts)
        assertTrue("echo" in keywordTexts)
        assertTrue("fi" in keywordTexts)
    }

    @Test
    fun `bash variables are detected`() {
        val source = "echo \$HOME \${USER}"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.BASH)

        val properties = tokens.filter { it.type == SyntaxTokenType.PROPERTY }
        assertTrue(properties.isNotEmpty())
    }

    // --- AnnotatedString Output ---

    @Test
    fun `highlight returns non-empty AnnotatedString for code`() {
        val source = "val x = 42"
        val result = SyntaxHighlighter.highlight(source, ArtifactLanguage.KOTLIN)

        assertEquals(source, result.text)
    }

    @Test
    fun `highlight preserves full source text`() {
        val source = "fun main() {\n    println(\"Hello\")\n}"
        val result = SyntaxHighlighter.highlight(source, ArtifactLanguage.KOTLIN)

        assertEquals(source, result.text)
    }

    @Test
    fun `highlight works with dark mode`() {
        val source = "val x = 42"
        val lightResult = SyntaxHighlighter.highlight(source, ArtifactLanguage.KOTLIN, isDarkMode = false)
        val darkResult = SyntaxHighlighter.highlight(source, ArtifactLanguage.KOTLIN, isDarkMode = true)

        // Both should have the same text content
        assertEquals(lightResult.text, darkResult.text)
    }

    // --- Language Rule Coverage ---

    @Test
    fun `all supported languages have rules`() {
        val supportedLanguages = listOf(
            ArtifactLanguage.KOTLIN,
            ArtifactLanguage.JAVA,
            ArtifactLanguage.PYTHON,
            ArtifactLanguage.JAVASCRIPT,
            ArtifactLanguage.TYPESCRIPT,
            ArtifactLanguage.SWIFT,
            ArtifactLanguage.JSON,
            ArtifactLanguage.HTML,
            ArtifactLanguage.CSS,
            ArtifactLanguage.BASH,
            ArtifactLanguage.YAML,
            ArtifactLanguage.XML,
        )

        for (language in supportedLanguages) {
            val rules = SyntaxHighlighter.languageRules(language)
            assertTrue(
                "Language $language should have rules",
                rules.isNotEmpty()
            )
        }
    }

    @Test
    fun `unsupported languages fall back to generic rules`() {
        val rules = SyntaxHighlighter.languageRules(ArtifactLanguage.UNKNOWN)
        assertTrue(rules.isNotEmpty())

        // Generic rules should at least detect comments and strings
        val source = "// comment\nval x = \"string\""
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.UNKNOWN)
        assertTrue(tokens.any { it.type == SyntaxTokenType.COMMENT })
        assertTrue(tokens.any { it.type == SyntaxTokenType.STRING })
    }

    // --- Token Overlap Resolution ---

    @Test
    fun `tokens do not overlap`() {
        val source = """
            val x = "hello" // comment
            fun test() { }
        """.trimIndent()

        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        for (i in 0 until tokens.size - 1) {
            val current = tokens[i]
            val next = tokens[i + 1]
            assertTrue(
                "Token '${current.text}' (${current.range}) should not overlap with '${next.text}' (${next.range})",
                current.range.last < next.range.first
            )
        }
    }

    @Test
    fun `strings inside comments are not matched as strings`() {
        val source = "// this is a comment with \"a string\""
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.KOTLIN)

        // The entire line should be a single comment token
        val comments = tokens.filter { it.type == SyntaxTokenType.COMMENT }
        assertEquals(1, comments.size)
        assertTrue(comments[0].text.contains("a string"))

        // There should be no string tokens
        val strings = tokens.filter { it.type == SyntaxTokenType.STRING }
        assertTrue(strings.isEmpty())
    }

    // --- YAML Highlighting ---

    @Test
    fun `yaml keys are detected`() {
        val source = "name: value\ncount: 42"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.YAML)

        val properties = tokens.filter { it.type == SyntaxTokenType.PROPERTY }
        assertTrue(properties.any { it.text == "name" })
        assertTrue(properties.any { it.text == "count" })
    }

    @Test
    fun `yaml booleans are detected`() {
        val source = "active: true\ndeleted: false"
        val tokens = SyntaxHighlighter.tokenize(source, ArtifactLanguage.YAML)

        val keywords = tokens.filter { it.type == SyntaxTokenType.KEYWORD }
        assertTrue(keywords.any { it.text == "true" })
        assertTrue(keywords.any { it.text == "false" })
    }
}
