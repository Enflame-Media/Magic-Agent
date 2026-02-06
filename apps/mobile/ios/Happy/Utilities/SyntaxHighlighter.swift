//
//  SyntaxHighlighter.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

// MARK: - Token Types

/// Represents a type of syntax token for highlighting.
enum SyntaxTokenType {
    case keyword
    case string
    case number
    case comment
    case type
    case function
    case property
    case attribute
    case `operator`
    case punctuation
    case plain

    /// The color used to render this token type.
    var color: Color {
        switch self {
        case .keyword:
            return Color(red: 0.78, green: 0.31, blue: 0.60)  // Pink/Magenta
        case .string:
            return Color(red: 0.77, green: 0.26, blue: 0.18)  // Red
        case .number:
            return Color(red: 0.11, green: 0.43, blue: 0.69)  // Blue
        case .comment:
            return Color(red: 0.42, green: 0.47, blue: 0.52)  // Gray
        case .type:
            return Color(red: 0.16, green: 0.57, blue: 0.68)  // Teal
        case .function:
            return Color(red: 0.16, green: 0.44, blue: 0.70)  // Dark Blue
        case .property:
            return Color(red: 0.16, green: 0.57, blue: 0.68)  // Teal
        case .attribute:
            return Color(red: 0.78, green: 0.31, blue: 0.60)  // Pink
        case .operator:
            return Color(red: 0.42, green: 0.47, blue: 0.52)  // Gray
        case .punctuation:
            return Color(red: 0.42, green: 0.47, blue: 0.52)  // Gray
        case .plain:
            return Color.primary
        }
    }

    /// The color used to render this token in dark mode.
    var darkColor: Color {
        switch self {
        case .keyword:
            return Color(red: 0.99, green: 0.42, blue: 0.72)  // Pink
        case .string:
            return Color(red: 0.99, green: 0.52, blue: 0.44)  // Orange-Red
        case .number:
            return Color(red: 0.55, green: 0.75, blue: 0.99)  // Light Blue
        case .comment:
            return Color(red: 0.55, green: 0.60, blue: 0.65)  // Gray
        case .type:
            return Color(red: 0.40, green: 0.85, blue: 0.82)  // Cyan
        case .function:
            return Color(red: 0.55, green: 0.75, blue: 0.99)  // Light Blue
        case .property:
            return Color(red: 0.40, green: 0.85, blue: 0.82)  // Cyan
        case .attribute:
            return Color(red: 0.99, green: 0.42, blue: 0.72)  // Pink
        case .operator:
            return Color(red: 0.70, green: 0.73, blue: 0.76)  // Light Gray
        case .punctuation:
            return Color(red: 0.70, green: 0.73, blue: 0.76)  // Light Gray
        case .plain:
            return Color(red: 0.90, green: 0.91, blue: 0.92)  // Near White
        }
    }
}

// MARK: - Syntax Token

/// A single token from the syntax highlighting tokenizer.
struct SyntaxToken: Equatable {
    let text: String
    let type: SyntaxTokenType
    let range: Range<String.Index>
}

// MARK: - SyntaxHighlighter

/// A regex-based syntax highlighter for common programming languages.
///
/// This is intentionally a simple highlighter that uses regular expressions
/// for tokenization rather than a full AST parser. It provides "good enough"
/// highlighting for code viewing purposes.
struct SyntaxHighlighter {

    // MARK: - Public API

    /// Highlights source code and returns an `AttributedString`.
    ///
    /// - Parameters:
    ///   - source: The source code text to highlight.
    ///   - language: The programming language for syntax rules.
    ///   - isDarkMode: Whether to use dark mode colors.
    /// - Returns: An `AttributedString` with syntax highlighting applied.
    static func highlight(
        source: String,
        language: ArtifactLanguage,
        isDarkMode: Bool = false
    ) -> AttributedString {
        let tokens = tokenize(source: source, language: language)
        return buildAttributedString(from: tokens, source: source, isDarkMode: isDarkMode)
    }

    /// Tokenizes source code into syntax tokens.
    ///
    /// - Parameters:
    ///   - source: The source code text to tokenize.
    ///   - language: The programming language for syntax rules.
    /// - Returns: An array of `SyntaxToken` values covering the source text.
    static func tokenize(source: String, language: ArtifactLanguage) -> [SyntaxToken] {
        let rules = languageRules(for: language)
        return applyRules(rules, to: source)
    }

    // MARK: - Language Rules

    /// A tokenization rule consisting of a regex pattern and the token type.
    struct TokenRule {
        let pattern: String
        let type: SyntaxTokenType
    }

    /// Returns the tokenization rules for the given language.
    static func languageRules(for language: ArtifactLanguage) -> [TokenRule] {
        switch language {
        case .swift:
            return swiftRules
        case .python:
            return pythonRules
        case .javascript, .typescript:
            return javaScriptRules
        case .json:
            return jsonRules
        case .html, .xml:
            return htmlRules
        case .css:
            return cssRules
        case .bash:
            return bashRules
        default:
            return genericRules
        }
    }

    // MARK: - Swift Rules

    private static let swiftRules: [TokenRule] = [
        // Line comments
        TokenRule(pattern: #"//[^\n]*"#, type: .comment),
        // Block comments
        TokenRule(pattern: #"/\*[\s\S]*?\*/"#, type: .comment),
        // Strings (double-quoted)
        TokenRule(pattern: #""""[\s\S]*?""""#, type: .string),  // Triple-quoted
        TokenRule(pattern: #""(?:[^"\\]|\\.)*""#, type: .string),
        // Attributes
        TokenRule(pattern: #"@\w+"#, type: .attribute),
        // Numbers
        TokenRule(pattern: #"\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)\b"#, type: .number),
        // Keywords
        TokenRule(pattern: #"\b(?:import|func|var|let|class|struct|enum|protocol|extension|if|else|guard|switch|case|default|for|while|repeat|return|throw|throws|try|catch|do|break|continue|in|where|as|is|self|Self|super|init|deinit|subscript|typealias|associatedtype|static|private|fileprivate|internal|public|open|override|final|lazy|weak|unowned|mutating|nonmutating|async|await|actor|some|any|nil|true|false|defer|inout|operator|precedencegroup)\b"#, type: .keyword),
        // Types (capitalized identifiers)
        TokenRule(pattern: #"\b[A-Z][a-zA-Z0-9]*\b"#, type: .type),
        // Function calls
        TokenRule(pattern: #"\b[a-z_][a-zA-Z0-9_]*(?=\s*\()"#, type: .function),
    ]

    // MARK: - Python Rules

    private static let pythonRules: [TokenRule] = [
        // Line comments
        TokenRule(pattern: #"#[^\n]*"#, type: .comment),
        // Triple-quoted strings
        TokenRule(pattern: #"\"\"\"[\s\S]*?\"\"\""#, type: .string),
        TokenRule(pattern: #"'''[\s\S]*?'''"#, type: .string),
        // Regular strings
        TokenRule(pattern: #"f?"(?:[^"\\]|\\.)*""#, type: .string),
        TokenRule(pattern: #"f?'(?:[^'\\]|\\.)*'"#, type: .string),
        // Decorators
        TokenRule(pattern: #"@\w+"#, type: .attribute),
        // Numbers
        TokenRule(pattern: #"\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?j?)\b"#, type: .number),
        // Keywords
        TokenRule(pattern: #"\b(?:import|from|def|class|if|elif|else|for|while|return|yield|try|except|finally|raise|with|as|pass|break|continue|and|or|not|is|in|lambda|global|nonlocal|del|assert|async|await|True|False|None|self|cls)\b"#, type: .keyword),
        // Types (capitalized identifiers)
        TokenRule(pattern: #"\b[A-Z][a-zA-Z0-9_]*\b"#, type: .type),
        // Function calls
        TokenRule(pattern: #"\b[a-z_][a-zA-Z0-9_]*(?=\s*\()"#, type: .function),
    ]

    // MARK: - JavaScript / TypeScript Rules

    private static let javaScriptRules: [TokenRule] = [
        // Line comments
        TokenRule(pattern: #"//[^\n]*"#, type: .comment),
        // Block comments
        TokenRule(pattern: #"/\*[\s\S]*?\*/"#, type: .comment),
        // Template literals
        TokenRule(pattern: #"`(?:[^`\\]|\\.)*`"#, type: .string),
        // Strings
        TokenRule(pattern: #""(?:[^"\\]|\\.)*""#, type: .string),
        TokenRule(pattern: #"'(?:[^'\\]|\\.)*'"#, type: .string),
        // Numbers
        TokenRule(pattern: #"\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?n?)\b"#, type: .number),
        // Keywords
        TokenRule(pattern: #"\b(?:import|export|from|default|function|const|let|var|class|extends|implements|interface|type|enum|if|else|for|while|do|return|throw|try|catch|finally|switch|case|break|continue|new|delete|typeof|instanceof|in|of|void|this|super|async|await|yield|null|undefined|true|false|static|get|set|public|private|protected|readonly|abstract|as|is|keyof|infer|declare|module|namespace|require)\b"#, type: .keyword),
        // Types (capitalized identifiers)
        TokenRule(pattern: #"\b[A-Z][a-zA-Z0-9]*\b"#, type: .type),
        // Function calls
        TokenRule(pattern: #"\b[a-z_$][a-zA-Z0-9_$]*(?=\s*\()"#, type: .function),
        // Properties after dot
        TokenRule(pattern: #"(?<=\.)[a-zA-Z_$][a-zA-Z0-9_$]*"#, type: .property),
    ]

    // MARK: - JSON Rules

    private static let jsonRules: [TokenRule] = [
        // Strings (keys and values)
        TokenRule(pattern: #""(?:[^"\\]|\\.)*"\s*(?=:)"#, type: .property),
        TokenRule(pattern: #""(?:[^"\\]|\\.)*""#, type: .string),
        // Numbers
        TokenRule(pattern: #"-?\d+\.?\d*(?:e[+-]?\d+)?"#, type: .number),
        // Keywords
        TokenRule(pattern: #"\b(?:true|false|null)\b"#, type: .keyword),
    ]

    // MARK: - HTML Rules

    private static let htmlRules: [TokenRule] = [
        // Comments
        TokenRule(pattern: #"<!--[\s\S]*?-->"#, type: .comment),
        // Tags
        TokenRule(pattern: #"</?[a-zA-Z][a-zA-Z0-9-]*"#, type: .keyword),
        TokenRule(pattern: #"/?\s*>"#, type: .keyword),
        // Attribute names
        TokenRule(pattern: #"\b[a-zA-Z-]+(?=\s*=)"#, type: .attribute),
        // Attribute values (strings)
        TokenRule(pattern: #""(?:[^"\\]|\\.)*""#, type: .string),
        TokenRule(pattern: #"'(?:[^'\\]|\\.)*'"#, type: .string),
    ]

    // MARK: - CSS Rules

    private static let cssRules: [TokenRule] = [
        // Comments
        TokenRule(pattern: #"/\*[\s\S]*?\*/"#, type: .comment),
        // Strings
        TokenRule(pattern: #""(?:[^"\\]|\\.)*""#, type: .string),
        TokenRule(pattern: #"'(?:[^'\\]|\\.)*'"#, type: .string),
        // Numbers with units
        TokenRule(pattern: #"-?\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms)?\b"#, type: .number),
        // Colors
        TokenRule(pattern: #"#[0-9a-fA-F]{3,8}\b"#, type: .number),
        // Properties (before colon)
        TokenRule(pattern: #"[a-z-]+(?=\s*:)"#, type: .property),
        // Selectors
        TokenRule(pattern: #"[.#][a-zA-Z_-][a-zA-Z0-9_-]*"#, type: .type),
        // At-rules
        TokenRule(pattern: #"@[a-zA-Z-]+"#, type: .keyword),
        // Important
        TokenRule(pattern: #"!important"#, type: .keyword),
    ]

    // MARK: - Bash Rules

    private static let bashRules: [TokenRule] = [
        // Comments
        TokenRule(pattern: #"#[^\n]*"#, type: .comment),
        // Strings
        TokenRule(pattern: #""(?:[^"\\]|\\.)*""#, type: .string),
        TokenRule(pattern: #"'[^']*'"#, type: .string),
        // Variables
        TokenRule(pattern: #"\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?"#, type: .property),
        // Numbers
        TokenRule(pattern: #"\b\d+\b"#, type: .number),
        // Keywords
        TokenRule(pattern: #"\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|exit|local|export|source|alias|unalias|readonly|declare|typeset|set|unset|shift|eval|exec|trap|wait|cd|echo|printf|read|test)\b"#, type: .keyword),
        // Commands at start of line or after pipe/semicolon
        TokenRule(pattern: #"\b(?:grep|sed|awk|find|sort|uniq|wc|cat|head|tail|cut|tr|xargs|curl|wget|git|npm|yarn|docker|make|mkdir|rm|cp|mv|ls|chmod|chown)\b"#, type: .function),
    ]

    // MARK: - Generic Rules

    private static let genericRules: [TokenRule] = [
        // Line comments (// or #)
        TokenRule(pattern: #"//[^\n]*|#[^\n]*"#, type: .comment),
        // Block comments
        TokenRule(pattern: #"/\*[\s\S]*?\*/"#, type: .comment),
        // Strings
        TokenRule(pattern: #""(?:[^"\\]|\\.)*""#, type: .string),
        TokenRule(pattern: #"'(?:[^'\\]|\\.)*'"#, type: .string),
        // Numbers
        TokenRule(pattern: #"\b\d+\.?\d*\b"#, type: .number),
    ]

    // MARK: - Tokenization Engine

    /// Applies the given token rules to the source string.
    ///
    /// Rules are applied in order. Earlier rules take precedence over later ones
    /// for overlapping matches. Unmatched regions become `.plain` tokens.
    ///
    /// - Parameters:
    ///   - rules: The tokenization rules to apply.
    ///   - source: The source text to tokenize.
    /// - Returns: An array of non-overlapping tokens covering the entire source.
    private static func applyRules(_ rules: [TokenRule], to source: String) -> [SyntaxToken] {
        guard !source.isEmpty else { return [] }

        // Collect all matches from all rules
        var allMatches: [(range: Range<String.Index>, type: SyntaxTokenType)] = []

        for rule in rules {
            guard let regex = try? NSRegularExpression(pattern: rule.pattern, options: [.dotMatchesLineSeparators]) else {
                continue
            }

            let nsRange = NSRange(source.startIndex..., in: source)
            let matches = regex.matches(in: source, options: [], range: nsRange)

            for match in matches {
                guard let range = Range(match.range, in: source) else { continue }
                allMatches.append((range: range, type: rule.type))
            }
        }

        // Sort matches by start position, then by length (longer matches first)
        allMatches.sort { lhs, rhs in
            if lhs.range.lowerBound == rhs.range.lowerBound {
                return source.distance(from: lhs.range.lowerBound, to: lhs.range.upperBound) >
                       source.distance(from: rhs.range.lowerBound, to: rhs.range.upperBound)
            }
            return lhs.range.lowerBound < rhs.range.lowerBound
        }

        // Remove overlapping matches (earlier rules / longer matches win)
        var usedMatches: [(range: Range<String.Index>, type: SyntaxTokenType)] = []
        for match in allMatches {
            let overlaps = usedMatches.contains { used in
                used.range.overlaps(match.range)
            }
            if !overlaps {
                usedMatches.append(match)
            }
        }

        // Sort by position
        usedMatches.sort { $0.range.lowerBound < $1.range.lowerBound }

        // Build final token list, filling gaps with plain tokens
        var tokens: [SyntaxToken] = []
        var currentIndex = source.startIndex

        for match in usedMatches {
            // Add plain token for gap before this match
            if currentIndex < match.range.lowerBound {
                let text = String(source[currentIndex..<match.range.lowerBound])
                tokens.append(SyntaxToken(
                    text: text,
                    type: .plain,
                    range: currentIndex..<match.range.lowerBound
                ))
            }

            // Add the matched token
            let text = String(source[match.range])
            tokens.append(SyntaxToken(
                text: text,
                type: match.type,
                range: match.range
            ))

            currentIndex = match.range.upperBound
        }

        // Add trailing plain token
        if currentIndex < source.endIndex {
            let text = String(source[currentIndex..<source.endIndex])
            tokens.append(SyntaxToken(
                text: text,
                type: .plain,
                range: currentIndex..<source.endIndex
            ))
        }

        return tokens
    }

    // MARK: - AttributedString Builder

    /// Builds an `AttributedString` from syntax tokens.
    ///
    /// - Parameters:
    ///   - tokens: The syntax tokens to render.
    ///   - source: The original source text (used as fallback).
    ///   - isDarkMode: Whether to use dark mode colors.
    /// - Returns: An `AttributedString` with syntax highlighting colors applied.
    private static func buildAttributedString(
        from tokens: [SyntaxToken],
        source: String,
        isDarkMode: Bool
    ) -> AttributedString {
        guard !tokens.isEmpty else {
            return AttributedString(source)
        }

        var result = AttributedString()

        for token in tokens {
            var attributed = AttributedString(token.text)
            let color = isDarkMode ? token.type.darkColor : token.type.color
            attributed.foregroundColor = color

            // Use monospaced font
            attributed.font = .system(.body, design: .monospaced)

            result.append(attributed)
        }

        return result
    }
}
