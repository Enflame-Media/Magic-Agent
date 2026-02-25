//
//  AcpUsageWidget.swift
//  Happy
//
//  Shows ACP context window usage with progress bar, token count, and cost.
//

import SwiftUI

/// Displays context window usage as a progress bar with token count and optional cost.
struct AcpUsageWidget: View {

    let usage: AcpUsage

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Progress bar
            ProgressView(value: progress)
                .tint(progressColor)
                .accessibilityLabel(String.localized("acp.usage.progress", arguments: Int(progress * 100)))

            // Token count and cost
            HStack {
                Text(tokenText)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if let cost = usage.cost {
                    Text(costText(cost))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(10)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    // MARK: - Computed

    private var progress: Double {
        guard usage.size > 0 else { return 0 }
        return min(Double(usage.used) / Double(usage.size), 1.0)
    }

    private var progressColor: Color {
        if progress > 0.9 { return .red }
        if progress > 0.7 { return .orange }
        return .blue
    }

    private var tokenText: String {
        "\(formatTokens(usage.used)) / \(formatTokens(usage.size)) tokens"
    }

    private func costText(_ cost: AcpCost) -> String {
        String(format: "$%.2f %@", cost.amount, cost.currency)
    }

    private func formatTokens(_ count: Int) -> String {
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.0fK", Double(count) / 1_000)
        }
        return "\(count)"
    }
}
