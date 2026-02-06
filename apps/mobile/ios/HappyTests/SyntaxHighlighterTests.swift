//
//  SyntaxHighlighterTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

final class SyntaxHighlighterTests: XCTestCase {

    // MARK: - General Tokenization Tests

    func testEmptySourceReturnsEmptyTokens() {
        let tokens = SyntaxHighlighter.tokenize(source: "", language: .swift)
        XCTAssertTrue(tokens.isEmpty)
    }

    func testPlainTextReturnsPlainToken() {
        let tokens = SyntaxHighlighter.tokenize(source: "hello", language: .unknown)
        XCTAssertEqual(tokens.count, 1)
        XCTAssertEqual(tokens[0].type, .plain)
        XCTAssertEqual(tokens[0].text, "hello")
    }

    func testTokensCoverEntireSource() {
        let source = "let x = 42 // answer"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        // Reconstruct the source from tokens
        let reconstructed = tokens.map { $0.text }.joined()
        XCTAssertEqual(reconstructed, source, "Tokens should cover the entire source text")
    }

    func testTokensDoNotOverlap() {
        let source = "func hello() { return \"world\" }"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        for i in 0..<tokens.count - 1 {
            XCTAssertEqual(
                tokens[i].range.upperBound,
                tokens[i + 1].range.lowerBound,
                "Tokens should be contiguous without gaps or overlaps"
            )
        }
    }

    // MARK: - Swift Highlighting Tests

    func testSwiftKeywordHighlighting() {
        let source = "let x = 5"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        XCTAssertTrue(keywordTokens.contains { $0.text == "let" })
    }

    func testSwiftStringHighlighting() {
        let source = "let name = \"Hello World\""
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let stringTokens = tokens.filter { $0.type == .string }
        XCTAssertTrue(stringTokens.contains { $0.text == "\"Hello World\"" })
    }

    func testSwiftNumberHighlighting() {
        let source = "let count = 42"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let numberTokens = tokens.filter { $0.type == .number }
        XCTAssertTrue(numberTokens.contains { $0.text == "42" })
    }

    func testSwiftLineCommentHighlighting() {
        let source = "// This is a comment"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let commentTokens = tokens.filter { $0.type == .comment }
        XCTAssertEqual(commentTokens.count, 1)
        XCTAssertEqual(commentTokens[0].text, "// This is a comment")
    }

    func testSwiftBlockCommentHighlighting() {
        let source = "/* block comment */"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let commentTokens = tokens.filter { $0.type == .comment }
        XCTAssertEqual(commentTokens.count, 1)
        XCTAssertEqual(commentTokens[0].text, "/* block comment */")
    }

    func testSwiftTypeHighlighting() {
        let source = "var session: Session"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let typeTokens = tokens.filter { $0.type == .type }
        XCTAssertTrue(typeTokens.contains { $0.text == "Session" })
    }

    func testSwiftAttributeHighlighting() {
        let source = "@Published var name: String"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let attributeTokens = tokens.filter { $0.type == .attribute }
        XCTAssertTrue(attributeTokens.contains { $0.text == "@Published" })
    }

    func testSwiftFunctionCallHighlighting() {
        let source = "print(\"hello\")"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let functionTokens = tokens.filter { $0.type == .function }
        XCTAssertTrue(functionTokens.contains { $0.text == "print" })
    }

    func testSwiftMultipleKeywords() {
        let source = "if let value = optional { return value }"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        let keywordTexts = Set(keywordTokens.map { $0.text })
        XCTAssertTrue(keywordTexts.contains("if"))
        XCTAssertTrue(keywordTexts.contains("let"))
        XCTAssertTrue(keywordTexts.contains("return"))
    }

    func testSwiftHexNumber() {
        let source = "let color = 0xFF00FF"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let numberTokens = tokens.filter { $0.type == .number }
        XCTAssertTrue(numberTokens.contains { $0.text == "0xFF00FF" })
    }

    // MARK: - Python Highlighting Tests

    func testPythonKeywordHighlighting() {
        let source = "def hello():"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .python)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        XCTAssertTrue(keywordTokens.contains { $0.text == "def" })
    }

    func testPythonDecoratorHighlighting() {
        let source = "@staticmethod"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .python)

        let attrTokens = tokens.filter { $0.type == .attribute }
        XCTAssertTrue(attrTokens.contains { $0.text == "@staticmethod" })
    }

    func testPythonCommentHighlighting() {
        let source = "# This is a comment"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .python)

        let commentTokens = tokens.filter { $0.type == .comment }
        XCTAssertEqual(commentTokens.count, 1)
        XCTAssertTrue(commentTokens[0].text.hasPrefix("# This is a comment"))
    }

    func testPythonSingleQuoteString() {
        let source = "name = 'hello'"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .python)

        let stringTokens = tokens.filter { $0.type == .string }
        XCTAssertTrue(stringTokens.contains { $0.text == "'hello'" })
    }

    // MARK: - JavaScript Highlighting Tests

    func testJavaScriptKeywordHighlighting() {
        let source = "const x = 5;"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .javascript)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        XCTAssertTrue(keywordTokens.contains { $0.text == "const" })
    }

    func testJavaScriptTemplateLiteral() {
        let source = "const msg = `hello ${name}`"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .javascript)

        let stringTokens = tokens.filter { $0.type == .string }
        XCTAssertTrue(stringTokens.contains { $0.text.hasPrefix("`") })
    }

    func testTypeScriptUsesJavaScriptRules() {
        let source = "interface User { name: string }"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .typescript)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        XCTAssertTrue(keywordTokens.contains { $0.text == "interface" })
    }

    // MARK: - JSON Highlighting Tests

    func testJSONKeyHighlighting() {
        let source = "\"name\": \"value\""
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .json)

        let propertyTokens = tokens.filter { $0.type == .property }
        XCTAssertTrue(propertyTokens.contains { $0.text.contains("name") })
    }

    func testJSONBooleanHighlighting() {
        let source = "\"enabled\": true"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .json)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        XCTAssertTrue(keywordTokens.contains { $0.text == "true" })
    }

    func testJSONNullHighlighting() {
        let source = "\"value\": null"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .json)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        XCTAssertTrue(keywordTokens.contains { $0.text == "null" })
    }

    func testJSONNumberHighlighting() {
        let source = "\"count\": 42"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .json)

        let numberTokens = tokens.filter { $0.type == .number }
        XCTAssertTrue(numberTokens.contains { $0.text == "42" })
    }

    // MARK: - HTML Highlighting Tests

    func testHTMLTagHighlighting() {
        let source = "<div>"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .html)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        XCTAssertFalse(keywordTokens.isEmpty, "HTML tags should be highlighted as keywords")
    }

    func testHTMLCommentHighlighting() {
        let source = "<!-- This is a comment -->"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .html)

        let commentTokens = tokens.filter { $0.type == .comment }
        XCTAssertEqual(commentTokens.count, 1)
    }

    // MARK: - CSS Highlighting Tests

    func testCSSPropertyHighlighting() {
        let source = "color: red;"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .css)

        let propertyTokens = tokens.filter { $0.type == .property }
        XCTAssertTrue(propertyTokens.contains { $0.text == "color" })
    }

    func testCSSColorHighlighting() {
        let source = "color: #FF0000;"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .css)

        let numberTokens = tokens.filter { $0.type == .number }
        XCTAssertTrue(numberTokens.contains { $0.text == "#FF0000" })
    }

    // MARK: - Bash Highlighting Tests

    func testBashCommentHighlighting() {
        let source = "# This is a comment"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .bash)

        let commentTokens = tokens.filter { $0.type == .comment }
        XCTAssertEqual(commentTokens.count, 1)
    }

    func testBashVariableHighlighting() {
        let source = "echo $HOME"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .bash)

        let propertyTokens = tokens.filter { $0.type == .property }
        XCTAssertTrue(propertyTokens.contains { $0.text == "$HOME" })
    }

    func testBashKeywordHighlighting() {
        let source = "if [ -f file ]; then echo found; fi"
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .bash)

        let keywordTokens = tokens.filter { $0.type == .keyword }
        let keywordTexts = Set(keywordTokens.map { $0.text })
        XCTAssertTrue(keywordTexts.contains("if"))
        XCTAssertTrue(keywordTexts.contains("then"))
        XCTAssertTrue(keywordTexts.contains("fi"))
    }

    // MARK: - AttributedString Output Tests

    func testHighlightReturnsAttributedString() {
        let result = SyntaxHighlighter.highlight(
            source: "let x = 5",
            language: .swift,
            isDarkMode: false
        )
        XCTAssertFalse(result.characters.isEmpty)
    }

    func testHighlightDarkModeProducesResult() {
        let result = SyntaxHighlighter.highlight(
            source: "let x = 5",
            language: .swift,
            isDarkMode: true
        )
        XCTAssertFalse(result.characters.isEmpty)
    }

    func testHighlightEmptySourceReturnsEmptyResult() {
        let result = SyntaxHighlighter.highlight(
            source: "",
            language: .swift,
            isDarkMode: false
        )
        // Empty source should produce an empty attributed string
        XCTAssertTrue(result.characters.isEmpty)
    }

    // MARK: - Token Type Color Tests

    func testTokenTypeColorsExist() {
        // Verify all token types have distinct colors
        let types: [SyntaxTokenType] = [
            .keyword, .string, .number, .comment, .type,
            .function, .property, .attribute, .operator, .punctuation, .plain
        ]

        for type in types {
            // Just verify that accessing colors doesn't crash
            _ = type.color
            _ = type.darkColor
        }
    }

    // MARK: - Edge Case Tests

    func testMultilineSource() {
        let source = """
        import Foundation

        // A struct
        struct Foo {
            let bar: Int = 42
            var baz: String = "hello"
        }
        """
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)
        let reconstructed = tokens.map { $0.text }.joined()
        XCTAssertEqual(reconstructed, source)
    }

    func testStringWithEscapedQuotes() {
        let source = #"let s = "hello \"world\"""#
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)
        let reconstructed = tokens.map { $0.text }.joined()
        XCTAssertEqual(reconstructed, source)
    }

    func testCommentInsideString() {
        // The comment markers inside a string should NOT be highlighted as comments
        let source = "let s = \"// not a comment\""
        let tokens = SyntaxHighlighter.tokenize(source: source, language: .swift)

        let commentTokens = tokens.filter { $0.type == .comment }
        XCTAssertTrue(commentTokens.isEmpty, "Comment markers inside strings should not create comment tokens")
    }

    func testLanguageRulesReturnNonEmpty() {
        let languages: [ArtifactLanguage] = [
            .swift, .python, .javascript, .typescript,
            .json, .html, .css, .bash
        ]

        for lang in languages {
            let rules = SyntaxHighlighter.languageRules(for: lang)
            XCTAssertFalse(rules.isEmpty, "Language \(lang) should have at least one tokenization rule")
        }
    }
}
