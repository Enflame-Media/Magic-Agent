//
//  AcpTerminalOutputView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Dark background monospace text with basic ANSI color support and copy-to-clipboard.
//

import SwiftUI

/// Displays terminal/command output in a dark monospace block.
///
/// Features:
/// - Dark background with monospace font (terminal style)
/// - Basic ANSI color code support (strips codes, applies colors)
/// - Command display with exit code indicator
/// - Copy-to-clipboard via NSPasteboard
struct AcpTerminalOutputView: View {
    /// The terminal block data.
    let terminal: AcpTerminalBlock

    /// Whether the output is expanded (for large outputs).
    @State private var isExpanded = false

    /// Threshold for auto-collapsing large outputs.
    private let collapseThreshold = 30

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Command header (if present)
            if let command = terminal.command {
                commandHeader(command)
            }

            // Terminal output
            if shouldCollapse && !isExpanded {
                collapsedOutput
            } else {
                outputContent
            }

            // Footer with exit code
            if let exitCode = terminal.exitCode {
                exitCodeFooter(exitCode)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    // MARK: - Command Header

    @ViewBuilder
    private func commandHeader(_ command: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "chevron.right")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(.green)

            Text(command)
                .font(.system(size: 12, design: .monospaced))
                .fontWeight(.medium)
                .foregroundStyle(.white)
                .textSelection(.enabled)

            Spacer()

            // Copy button
            Button {
                copyToClipboard()
            } label: {
                Image(systemName: "doc.on.doc")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.5))
            }
            .buttonStyle(.plain)
            .help("acp.terminal.copy".localized)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.black.opacity(0.95))
    }

    // MARK: - Output Content

    @ViewBuilder
    private var outputContent: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            Text(strippedOutput)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.85))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
        }
        .background(Color(red: 0.1, green: 0.1, blue: 0.12))

        if shouldCollapse && isExpanded {
            Button {
                withAnimation {
                    isExpanded = false
                }
            } label: {
                Text("acp.terminal.collapse".localized)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.5))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(Color(red: 0.1, green: 0.1, blue: 0.12))
        }
    }

    // MARK: - Collapsed Output

    @ViewBuilder
    private var collapsedOutput: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Show first few lines
            Text(previewLines)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.85))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button {
                withAnimation {
                    isExpanded = true
                }
            } label: {
                Text("acp.terminal.showMore".localized(totalLineCount))
                    .font(.caption2)
                    .foregroundStyle(.blue)
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(Color(red: 0.1, green: 0.1, blue: 0.12))
    }

    // MARK: - Exit Code Footer

    @ViewBuilder
    private func exitCodeFooter(_ exitCode: Int) -> some View {
        HStack(spacing: 6) {
            Image(systemName: exitCode == 0 ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.caption2)
                .foregroundStyle(exitCode == 0 ? .green : .red)

            Text("acp.terminal.exitCode".localized(exitCode))
                .font(.caption2)
                .fontDesign(.monospaced)
                .foregroundStyle(Color.white.opacity(0.5))

            Spacer()
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(Color.black.opacity(0.95))
    }

    // MARK: - ANSI Stripping

    /// Strip ANSI escape codes from the output.
    private var strippedOutput: String {
        terminal.output.replacingOccurrences(
            of: "\\e\\[[0-9;]*m|\\x1b\\[[0-9;]*m",
            with: "",
            options: .regularExpression
        )
    }

    // MARK: - Helpers

    private var outputLines: [String] {
        strippedOutput.components(separatedBy: "\n")
    }

    private var totalLineCount: Int {
        outputLines.count
    }

    private var shouldCollapse: Bool {
        totalLineCount > collapseThreshold
    }

    private var previewLines: String {
        outputLines.prefix(5).joined(separator: "\n")
    }

    private func copyToClipboard() {
        var content = ""
        if let command = terminal.command {
            content += "$ \(command)\n"
        }
        content += strippedOutput

        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(content, forType: .string)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        AcpTerminalOutputView(terminal: AcpTerminalBlock(
            id: "term-1",
            command: "npm test -- --grep auth",
            output: "PASS src/routes/auth.test.ts\n  Login endpoint\n    \u{2713} returns JWT token on valid credentials (45ms)\n    \u{2713} returns 401 on invalid password (12ms)\n\nTest Suites: 1 passed, 1 total\nTests:       2 passed, 2 total",
            exitCode: 0
        ))

        AcpTerminalOutputView(terminal: AcpTerminalBlock(
            id: "term-2",
            command: "cargo build",
            output: "error[E0308]: mismatched types\n  --> src/main.rs:15:5\n   |\n15 |     let x: i32 = \"hello\";\n   |                  ^^^^^^^ expected `i32`, found `&str`",
            exitCode: 1
        ))
    }
    .padding()
    .frame(width: 600)
    .background(Color(.windowBackgroundColor))
}
