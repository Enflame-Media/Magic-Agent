package com.enflame.happy.ui.screens.artifacts

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import com.enflame.happy.domain.model.ArtifactLanguage

/**
 * Token types for syntax highlighting.
 */
enum class SyntaxTokenType {
    KEYWORD,
    STRING,
    NUMBER,
    COMMENT,
    TYPE,
    FUNCTION,
    PROPERTY,
    ATTRIBUTE,
    OPERATOR,
    PUNCTUATION,
    PLAIN;

    /**
     * Light mode color for this token type.
     */
    val lightColor: Color
        get() = when (this) {
            KEYWORD -> Color(0xFFC84E9C)     // Pink/Magenta
            STRING -> Color(0xFFC44230)       // Red
            NUMBER -> Color(0xFF1C6EB0)       // Blue
            COMMENT -> Color(0xFF6B787F)      // Gray
            TYPE -> Color(0xFF2991AE)         // Teal
            FUNCTION -> Color(0xFF2970B3)     // Dark Blue
            PROPERTY -> Color(0xFF2991AE)     // Teal
            ATTRIBUTE -> Color(0xFFC84E9C)    // Pink
            OPERATOR -> Color(0xFF6B787F)     // Gray
            PUNCTUATION -> Color(0xFF6B787F)  // Gray
            PLAIN -> Color(0xFF1E1E1E)        // Near black
        }

    /**
     * Dark mode color for this token type.
     */
    val darkColor: Color
        get() = when (this) {
            KEYWORD -> Color(0xFFFD6BB8)      // Pink
            STRING -> Color(0xFFFD8570)       // Orange-Red
            NUMBER -> Color(0xFF8CC0FD)       // Light Blue
            COMMENT -> Color(0xFF8C999A)      // Gray
            TYPE -> Color(0xFF66D9D2)         // Cyan
            FUNCTION -> Color(0xFF8CC0FD)     // Light Blue
            PROPERTY -> Color(0xFF66D9D2)     // Cyan
            ATTRIBUTE -> Color(0xFFFD6BB8)    // Pink
            OPERATOR -> Color(0xFFB3BAC2)     // Light Gray
            PUNCTUATION -> Color(0xFFB3BAC2)  // Light Gray
            PLAIN -> Color(0xFFE6E8EB)        // Near white
        }
}

/**
 * A tokenization rule consisting of a regex pattern and the token type.
 */
data class TokenRule(
    val pattern: Regex,
    val type: SyntaxTokenType
)

/**
 * Represents a match found by the tokenizer.
 */
data class TokenMatch(
    val range: IntRange,
    val type: SyntaxTokenType,
    val text: String
)

/**
 * A regex-based syntax highlighter for common programming languages.
 *
 * This is intentionally a simple highlighter that uses regular expressions
 * for tokenization rather than a full AST parser. It provides "good enough"
 * highlighting for code viewing purposes.
 *
 * Supports Kotlin, Java, Python, JavaScript, TypeScript, Swift, HTML, CSS,
 * JSON, YAML, Bash, and a generic fallback for other languages.
 */
object SyntaxHighlighter {

    /**
     * Highlights source code and returns an [AnnotatedString].
     *
     * @param source The source code text to highlight.
     * @param language The programming language for syntax rules.
     * @param isDarkMode Whether to use dark mode colors.
     * @return An [AnnotatedString] with syntax highlighting applied.
     */
    fun highlight(
        source: String,
        language: ArtifactLanguage,
        isDarkMode: Boolean = false
    ): AnnotatedString {
        val matches = tokenize(source, language)
        return buildHighlightedString(source, matches, isDarkMode)
    }

    /**
     * Tokenizes source code into matched token regions.
     *
     * Rules are applied in order. Earlier rules take precedence over later ones
     * for overlapping matches. Unmatched regions are left as plain text.
     *
     * @param source The source code to tokenize.
     * @param language The programming language for syntax rules.
     * @return A list of non-overlapping [TokenMatch] values.
     */
    fun tokenize(source: String, language: ArtifactLanguage): List<TokenMatch> {
        if (source.isEmpty()) return emptyList()

        val rules = languageRules(language)
        return applyRules(rules, source)
    }

    /**
     * Returns the tokenization rules for the given language.
     */
    internal fun languageRules(language: ArtifactLanguage): List<TokenRule> {
        return when (language) {
            ArtifactLanguage.KOTLIN -> kotlinRules
            ArtifactLanguage.JAVA -> javaRules
            ArtifactLanguage.PYTHON -> pythonRules
            ArtifactLanguage.JAVASCRIPT, ArtifactLanguage.TYPESCRIPT -> javaScriptRules
            ArtifactLanguage.SWIFT -> swiftRules
            ArtifactLanguage.JSON -> jsonRules
            ArtifactLanguage.HTML, ArtifactLanguage.XML -> htmlRules
            ArtifactLanguage.CSS -> cssRules
            ArtifactLanguage.BASH -> bashRules
            ArtifactLanguage.YAML -> yamlRules
            else -> genericRules
        }
    }

    // --- Kotlin Rules ---

    private val kotlinRules: List<TokenRule> = listOf(
        // Line comments
        TokenRule(Regex("//[^\\n]*"), SyntaxTokenType.COMMENT),
        // Block comments
        TokenRule(Regex("/\\*[\\s\\S]*?\\*/"), SyntaxTokenType.COMMENT),
        // Triple-quoted strings
        TokenRule(Regex("\"\"\"[\\s\\S]*?\"\"\""), SyntaxTokenType.STRING),
        // Regular strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        // Character literals
        TokenRule(Regex("'(?:[^'\\\\]|\\\\.)*'"), SyntaxTokenType.STRING),
        // Annotations
        TokenRule(Regex("@\\w+"), SyntaxTokenType.ATTRIBUTE),
        // Numbers
        TokenRule(
            Regex("\\b(?:0x[0-9a-fA-F_]+|0b[01_]+|\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?[fFLl]?)\\b"),
            SyntaxTokenType.NUMBER
        ),
        // Keywords
        TokenRule(
            Regex(
                "\\b(?:package|import|fun|val|var|class|object|interface|enum|sealed|data|" +
                    "annotation|companion|abstract|open|override|final|inline|infix|operator|" +
                    "suspend|tailrec|reified|crossinline|noinline|if|else|when|for|while|do|" +
                    "return|throw|try|catch|finally|break|continue|in|out|is|as|this|super|" +
                    "null|true|false|it|by|init|where|constructor|get|set|field|" +
                    "private|protected|internal|public|lateinit|const|typealias|" +
                    "vararg|expect|actual|inner|external|value)\\b"
            ),
            SyntaxTokenType.KEYWORD
        ),
        // Types (capitalized identifiers)
        TokenRule(Regex("\\b[A-Z][a-zA-Z0-9]*\\b"), SyntaxTokenType.TYPE),
        // Function calls
        TokenRule(Regex("\\b[a-z_][a-zA-Z0-9_]*(?=\\s*[({])"), SyntaxTokenType.FUNCTION),
    )

    // --- Java Rules ---

    private val javaRules: List<TokenRule> = listOf(
        // Line comments
        TokenRule(Regex("//[^\\n]*"), SyntaxTokenType.COMMENT),
        // Block comments
        TokenRule(Regex("/\\*[\\s\\S]*?\\*/"), SyntaxTokenType.COMMENT),
        // Strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        // Character literals
        TokenRule(Regex("'(?:[^'\\\\]|\\\\.)*'"), SyntaxTokenType.STRING),
        // Annotations
        TokenRule(Regex("@\\w+"), SyntaxTokenType.ATTRIBUTE),
        // Numbers
        TokenRule(
            Regex("\\b(?:0x[0-9a-fA-F_]+|0b[01_]+|\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?[fFdDlL]?)\\b"),
            SyntaxTokenType.NUMBER
        ),
        // Keywords
        TokenRule(
            Regex(
                "\\b(?:package|import|class|interface|enum|extends|implements|abstract|" +
                    "final|static|public|private|protected|default|void|return|throw|throws|" +
                    "new|try|catch|finally|if|else|for|while|do|switch|case|break|continue|" +
                    "synchronized|volatile|transient|native|strictfp|assert|instanceof|" +
                    "this|super|null|true|false|boolean|byte|char|short|int|long|float|double)\\b"
            ),
            SyntaxTokenType.KEYWORD
        ),
        // Types (capitalized identifiers)
        TokenRule(Regex("\\b[A-Z][a-zA-Z0-9]*\\b"), SyntaxTokenType.TYPE),
        // Function calls
        TokenRule(Regex("\\b[a-z_][a-zA-Z0-9_]*(?=\\s*\\()"), SyntaxTokenType.FUNCTION),
    )

    // --- Python Rules ---

    private val pythonRules: List<TokenRule> = listOf(
        // Line comments
        TokenRule(Regex("#[^\\n]*"), SyntaxTokenType.COMMENT),
        // Triple-quoted strings
        TokenRule(Regex("\"\"\"[\\s\\S]*?\"\"\""), SyntaxTokenType.STRING),
        TokenRule(Regex("'''[\\s\\S]*?'''"), SyntaxTokenType.STRING),
        // Regular strings
        TokenRule(Regex("f?\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        TokenRule(Regex("f?'(?:[^'\\\\]|\\\\.)*'"), SyntaxTokenType.STRING),
        // Decorators
        TokenRule(Regex("@\\w+"), SyntaxTokenType.ATTRIBUTE),
        // Numbers
        TokenRule(
            Regex("\\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\\d+\\.?\\d*(?:[eE][+-]?\\d+)?j?)\\b"),
            SyntaxTokenType.NUMBER
        ),
        // Keywords
        TokenRule(
            Regex(
                "\\b(?:import|from|def|class|if|elif|else|for|while|return|yield|" +
                    "try|except|finally|raise|with|as|pass|break|continue|and|or|not|" +
                    "is|in|lambda|global|nonlocal|del|assert|async|await|" +
                    "True|False|None|self|cls)\\b"
            ),
            SyntaxTokenType.KEYWORD
        ),
        // Types (capitalized identifiers)
        TokenRule(Regex("\\b[A-Z][a-zA-Z0-9_]*\\b"), SyntaxTokenType.TYPE),
        // Function calls
        TokenRule(Regex("\\b[a-z_][a-zA-Z0-9_]*(?=\\s*\\()"), SyntaxTokenType.FUNCTION),
    )

    // --- JavaScript / TypeScript Rules ---

    private val javaScriptRules: List<TokenRule> = listOf(
        // Line comments
        TokenRule(Regex("//[^\\n]*"), SyntaxTokenType.COMMENT),
        // Block comments
        TokenRule(Regex("/\\*[\\s\\S]*?\\*/"), SyntaxTokenType.COMMENT),
        // Template literals
        TokenRule(Regex("`(?:[^`\\\\]|\\\\.)*`"), SyntaxTokenType.STRING),
        // Strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        TokenRule(Regex("'(?:[^'\\\\]|\\\\.)*'"), SyntaxTokenType.STRING),
        // Numbers
        TokenRule(
            Regex("\\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\\d+\\.?\\d*(?:[eE][+-]?\\d+)?n?)\\b"),
            SyntaxTokenType.NUMBER
        ),
        // Keywords
        TokenRule(
            Regex(
                "\\b(?:import|export|from|default|function|const|let|var|class|extends|" +
                    "implements|interface|type|enum|if|else|for|while|do|return|throw|" +
                    "try|catch|finally|switch|case|break|continue|new|delete|typeof|" +
                    "instanceof|in|of|void|this|super|async|await|yield|null|undefined|" +
                    "true|false|static|get|set|public|private|protected|readonly|abstract|" +
                    "as|is|keyof|infer|declare|module|namespace|require)\\b"
            ),
            SyntaxTokenType.KEYWORD
        ),
        // Types (capitalized identifiers)
        TokenRule(Regex("\\b[A-Z][a-zA-Z0-9]*\\b"), SyntaxTokenType.TYPE),
        // Function calls
        TokenRule(Regex("\\b[a-z_$][a-zA-Z0-9_$]*(?=\\s*\\()"), SyntaxTokenType.FUNCTION),
    )

    // --- Swift Rules ---

    private val swiftRules: List<TokenRule> = listOf(
        // Line comments
        TokenRule(Regex("//[^\\n]*"), SyntaxTokenType.COMMENT),
        // Block comments
        TokenRule(Regex("/\\*[\\s\\S]*?\\*/"), SyntaxTokenType.COMMENT),
        // Triple-quoted strings
        TokenRule(Regex("\"\"\"[\\s\\S]*?\"\"\""), SyntaxTokenType.STRING),
        // Regular strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        // Attributes
        TokenRule(Regex("@\\w+"), SyntaxTokenType.ATTRIBUTE),
        // Numbers
        TokenRule(
            Regex("\\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\\d+\\.?\\d*(?:[eE][+-]?\\d+)?)\\b"),
            SyntaxTokenType.NUMBER
        ),
        // Keywords
        TokenRule(
            Regex(
                "\\b(?:import|func|var|let|class|struct|enum|protocol|extension|" +
                    "if|else|guard|switch|case|default|for|while|repeat|return|throw|throws|" +
                    "try|catch|do|break|continue|in|where|as|is|self|Self|super|init|deinit|" +
                    "subscript|typealias|associatedtype|static|private|fileprivate|internal|" +
                    "public|open|override|final|lazy|weak|unowned|mutating|nonmutating|" +
                    "async|await|actor|some|any|nil|true|false|defer|inout|operator)\\b"
            ),
            SyntaxTokenType.KEYWORD
        ),
        // Types (capitalized identifiers)
        TokenRule(Regex("\\b[A-Z][a-zA-Z0-9]*\\b"), SyntaxTokenType.TYPE),
        // Function calls
        TokenRule(Regex("\\b[a-z_][a-zA-Z0-9_]*(?=\\s*\\()"), SyntaxTokenType.FUNCTION),
    )

    // --- JSON Rules ---

    private val jsonRules: List<TokenRule> = listOf(
        // Keys (strings followed by colon)
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\"\\s*(?=:)"), SyntaxTokenType.PROPERTY),
        // String values
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        // Numbers
        TokenRule(Regex("-?\\d+\\.?\\d*(?:[eE][+-]?\\d+)?"), SyntaxTokenType.NUMBER),
        // Keywords
        TokenRule(Regex("\\b(?:true|false|null)\\b"), SyntaxTokenType.KEYWORD),
    )

    // --- HTML / XML Rules ---

    private val htmlRules: List<TokenRule> = listOf(
        // Comments
        TokenRule(Regex("<!--[\\s\\S]*?-->"), SyntaxTokenType.COMMENT),
        // Tags
        TokenRule(Regex("</?[a-zA-Z][a-zA-Z0-9-]*"), SyntaxTokenType.KEYWORD),
        TokenRule(Regex("/?\\s*>"), SyntaxTokenType.KEYWORD),
        // Attribute names
        TokenRule(Regex("\\b[a-zA-Z-]+(?=\\s*=)"), SyntaxTokenType.ATTRIBUTE),
        // Attribute values (strings)
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        TokenRule(Regex("'(?:[^'\\\\]|\\\\.)*'"), SyntaxTokenType.STRING),
    )

    // --- CSS Rules ---

    private val cssRules: List<TokenRule> = listOf(
        // Comments
        TokenRule(Regex("/\\*[\\s\\S]*?\\*/"), SyntaxTokenType.COMMENT),
        // Strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        TokenRule(Regex("'(?:[^'\\\\]|\\\\.)*'"), SyntaxTokenType.STRING),
        // Numbers with units
        TokenRule(Regex("-?\\d+\\.?\\d*(?:px|em|rem|%|vh|vw|deg|s|ms)?\\b"), SyntaxTokenType.NUMBER),
        // Colors
        TokenRule(Regex("#[0-9a-fA-F]{3,8}\\b"), SyntaxTokenType.NUMBER),
        // Properties (before colon)
        TokenRule(Regex("[a-z-]+(?=\\s*:)"), SyntaxTokenType.PROPERTY),
        // Selectors
        TokenRule(Regex("[.#][a-zA-Z_-][a-zA-Z0-9_-]*"), SyntaxTokenType.TYPE),
        // At-rules
        TokenRule(Regex("@[a-zA-Z-]+"), SyntaxTokenType.KEYWORD),
        // Important
        TokenRule(Regex("!important"), SyntaxTokenType.KEYWORD),
    )

    // --- Bash Rules ---

    private val bashRules: List<TokenRule> = listOf(
        // Comments
        TokenRule(Regex("#[^\\n]*"), SyntaxTokenType.COMMENT),
        // Strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        TokenRule(Regex("'[^']*'"), SyntaxTokenType.STRING),
        // Variables
        TokenRule(Regex("\\$\\{?[a-zA-Z_][a-zA-Z0-9_]*}?"), SyntaxTokenType.PROPERTY),
        // Numbers
        TokenRule(Regex("\\b\\d+\\b"), SyntaxTokenType.NUMBER),
        // Keywords
        TokenRule(
            Regex(
                "\\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|" +
                    "return|exit|local|export|source|alias|unalias|readonly|declare|" +
                    "typeset|set|unset|shift|eval|exec|trap|wait|cd|echo|printf|read|test)\\b"
            ),
            SyntaxTokenType.KEYWORD
        ),
        // Common commands
        TokenRule(
            Regex(
                "\\b(?:grep|sed|awk|find|sort|uniq|wc|cat|head|tail|cut|tr|xargs|" +
                    "curl|wget|git|npm|yarn|docker|make|mkdir|rm|cp|mv|ls|chmod|chown)\\b"
            ),
            SyntaxTokenType.FUNCTION
        ),
    )

    // --- YAML Rules ---

    private val yamlRules: List<TokenRule> = listOf(
        // Comments
        TokenRule(Regex("#[^\\n]*"), SyntaxTokenType.COMMENT),
        // Strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        TokenRule(Regex("'[^']*'"), SyntaxTokenType.STRING),
        // Keys (before colon)
        TokenRule(Regex("[a-zA-Z_][a-zA-Z0-9_-]*(?=\\s*:)"), SyntaxTokenType.PROPERTY),
        // Boolean and null values
        TokenRule(Regex("\\b(?:true|false|yes|no|null|~)\\b"), SyntaxTokenType.KEYWORD),
        // Numbers
        TokenRule(Regex("\\b\\d+\\.?\\d*\\b"), SyntaxTokenType.NUMBER),
    )

    // --- Generic Rules ---

    private val genericRules: List<TokenRule> = listOf(
        // Line comments (// or #)
        TokenRule(Regex("//[^\\n]*|#[^\\n]*"), SyntaxTokenType.COMMENT),
        // Block comments
        TokenRule(Regex("/\\*[\\s\\S]*?\\*/"), SyntaxTokenType.COMMENT),
        // Strings
        TokenRule(Regex("\"(?:[^\"\\\\]|\\\\.)*\""), SyntaxTokenType.STRING),
        TokenRule(Regex("'(?:[^'\\\\]|\\\\.)*'"), SyntaxTokenType.STRING),
        // Numbers
        TokenRule(Regex("\\b\\d+\\.?\\d*\\b"), SyntaxTokenType.NUMBER),
    )

    // --- Tokenization Engine ---

    /**
     * Applies the given token rules to the source string.
     *
     * Rules are applied in order. Earlier rules take precedence over later ones
     * for overlapping matches. Returns a list of non-overlapping matched tokens.
     */
    private fun applyRules(rules: List<TokenRule>, source: String): List<TokenMatch> {
        // Collect all matches from all rules
        val allMatches = mutableListOf<TokenMatch>()

        for (rule in rules) {
            val results = rule.pattern.findAll(source)
            for (result in results) {
                allMatches.add(
                    TokenMatch(
                        range = result.range,
                        type = rule.type,
                        text = result.value
                    )
                )
            }
        }

        // Sort matches by start position, then by length (longer matches first)
        allMatches.sortWith(compareBy<TokenMatch> { it.range.first }
            .thenByDescending { it.range.last - it.range.first })

        // Remove overlapping matches (earlier rules / longer matches win)
        val usedMatches = mutableListOf<TokenMatch>()
        for (match in allMatches) {
            val overlaps = usedMatches.any { used ->
                used.range.first <= match.range.last && match.range.first <= used.range.last
            }
            if (!overlaps) {
                usedMatches.add(match)
            }
        }

        // Sort by position
        usedMatches.sortBy { it.range.first }

        return usedMatches
    }

    /**
     * Builds an [AnnotatedString] from the source text and token matches.
     *
     * Applies syntax colors from the matched tokens and uses the monospaced
     * font family throughout. Unmatched regions use the plain text color.
     */
    private fun buildHighlightedString(
        source: String,
        matches: List<TokenMatch>,
        isDarkMode: Boolean
    ): AnnotatedString {
        val plainColor = if (isDarkMode) {
            SyntaxTokenType.PLAIN.darkColor
        } else {
            SyntaxTokenType.PLAIN.lightColor
        }

        return buildAnnotatedString {
            var currentIndex = 0

            for (match in matches) {
                // Add plain text before this match
                if (currentIndex < match.range.first) {
                    val plainText = source.substring(currentIndex, match.range.first)
                    append(plainText)
                    addStyle(
                        SpanStyle(
                            color = plainColor,
                            fontFamily = FontFamily.Monospace
                        ),
                        length - plainText.length,
                        length
                    )
                }

                // Add the highlighted match
                val color = if (isDarkMode) match.type.darkColor else match.type.lightColor
                val style = SpanStyle(
                    color = color,
                    fontFamily = FontFamily.Monospace,
                    fontStyle = if (match.type == SyntaxTokenType.COMMENT) {
                        FontStyle.Italic
                    } else {
                        FontStyle.Normal
                    }
                )

                append(match.text)
                addStyle(style, length - match.text.length, length)

                currentIndex = match.range.last + 1
            }

            // Add trailing plain text
            if (currentIndex < source.length) {
                val trailingText = source.substring(currentIndex)
                append(trailingText)
                addStyle(
                    SpanStyle(
                        color = plainColor,
                        fontFamily = FontFamily.Monospace
                    ),
                    length - trailingText.length,
                    length
                )
            }
        }
    }
}
