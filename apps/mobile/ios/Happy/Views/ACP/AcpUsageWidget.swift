//
//  AcpUsageWidget.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Compact widget displaying ACP session usage statistics.
///
/// Shows token counts, cost, and cache usage in a compact
/// horizontal layout suitable for embedding in session views.
struct AcpUsageWidget: View {

    let usage: AcpUsage

    var body: some View {
        HStack(spacing: 16) {
            // Cost
            usageStat(
                label: "acp.cost".localized,
                value: usage.formattedCost,
                icon: "dollarsign.circle"
            )

            Divider()
                .frame(height: 24)

            // Input tokens
            usageStat(
                label: "acp.input".localized,
                value: formatTokens(usage.inputTokens),
                icon: "arrow.down.circle"
            )

            Divider()
                .frame(height: 24)

            // Output tokens
            usageStat(
                label: "acp.output".localized,
                value: formatTokens(usage.outputTokens),
                icon: "arrow.up.circle"
            )

            if let cacheRead = usage.cacheReadTokens, cacheRead > 0 {
                Divider()
                    .frame(height: 24)

                usageStat(
                    label: "acp.cached".localized,
                    value: formatTokens(cacheRead),
                    icon: "memorychip"
                )
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }

    private func usageStat(label: String, value: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.caption)
                .fontWeight(.semibold)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private func formatTokens(_ count: Int) -> String {
        if count >= 1_000_000 {
            return String(format: "%.1fM", Double(count) / 1_000_000)
        } else if count >= 1_000 {
            return String(format: "%.1fK", Double(count) / 1_000)
        }
        return "\(count)"
    }
}

// MARK: - Preview

#Preview {
    AcpUsageWidget(usage: AcpUsage(
        inputTokens: 15000,
        outputTokens: 8500,
        totalCostUSD: 0.0425,
        cacheReadTokens: 3000,
        cacheWriteTokens: 1500
    ))
    .padding()
}
