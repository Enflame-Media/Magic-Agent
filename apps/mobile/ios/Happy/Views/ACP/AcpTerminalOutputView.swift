//
//  AcpTerminalOutputView.swift
//  Happy
//
//  Terminal-style monospace output with dark background and copy support.
//

import SwiftUI
import UIKit

/// Displays terminal output with dark background, monospace font, and long-press to copy.
struct AcpTerminalOutputView: View {

    let text: String

    @State private var showCopied = false

    // MARK: - Body

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            Text(stripAnsiCodes(text))
                .font(.system(.caption, design: .monospaced))
                .foregroundColor(.green)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color(red: 0.08, green: 0.08, blue: 0.1))
        .cornerRadius(8)
        .overlay(alignment: .topTrailing) {
            if showCopied {
                Text("acp.terminal.copied".localized)
                    .font(.caption2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.green.opacity(0.2))
                    .cornerRadius(4)
                    .padding(6)
                    .transition(.opacity)
            }
        }
        .onLongPressGesture {
            UIPasteboard.general.string = stripAnsiCodes(text)
            withAnimation {
                showCopied = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                withAnimation {
                    showCopied = false
                }
            }
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        }
        .accessibilityLabel("acp.terminal.output".localized)
        .accessibilityAction(named: "acp.terminal.copy".localized) {
            UIPasteboard.general.string = stripAnsiCodes(text)
        }
    }

    // MARK: - ANSI Stripping

    /// Strips ANSI escape codes from terminal output.
    private func stripAnsiCodes(_ input: String) -> String {
        // Match ANSI escape sequences: ESC[ ... m and ESC[ ... other letters
        guard let regex = try? NSRegularExpression(pattern: "\\x1B\\[[0-9;]*[A-Za-z]") else {
            return input
        }
        let range = NSRange(input.startIndex..<input.endIndex, in: input)
        return regex.stringByReplacingMatches(in: input, range: range, withTemplate: "")
    }
}
