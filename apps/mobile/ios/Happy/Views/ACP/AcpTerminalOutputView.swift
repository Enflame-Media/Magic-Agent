//
//  AcpTerminalOutputView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays terminal/command output from an ACP tool execution.
///
/// Renders command output in a monospaced font with a terminal-style
/// dark background. Shows the exit code if available.
struct AcpTerminalOutputView: View {

    let content: String
    let exitCode: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "terminal.fill")
                    .font(.caption)
                    .foregroundStyle(.green)

                Text("acp.terminalOutput".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                Spacer()

                if let exitCode = exitCode {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(exitCode == 0 ? Color.green : Color.red)
                            .frame(width: 6, height: 6)

                        Text("exit \(exitCode)")
                            .font(.caption2)
                            .foregroundStyle(exitCode == 0 ? .green : .red)
                    }
                }
            }

            // Terminal content
            ScrollView(.horizontal, showsIndicators: false) {
                Text(content)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(Color.green.opacity(0.9))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
            }
            .background(Color.black.opacity(0.85))
            .cornerRadius(8)
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Preview

#Preview {
    AcpTerminalOutputView(
        content: """
        $ npm test
        PASS src/auth/service.test.ts
          Authentication Service
            ✓ validates token correctly (5ms)
            ✓ rejects expired tokens (3ms)
        Tests: 2 passed, 2 total
        """,
        exitCode: 0
    )
    .padding()
}
