//
//  AcpUsageWidget.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  ProgressView-based context window bar with color transitions,
//  formatted token count, and optional cost display.
//

import SwiftUI

/// Displays context window usage with a color-coded progress bar and token count.
///
/// The progress bar transitions through colors based on fill percentage:
/// - Green: 0-60% usage
/// - Yellow/Orange: 60-85% usage
/// - Red: 85-100% usage
struct AcpUsageWidget: View {
    /// Context window usage data.
    let usage: AcpUsage

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "gauge.with.dots.needle.50percent")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text("acp.usage.title".localized)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)

                Spacer()

                Text(percentDisplay)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(barColor)
            }

            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(.separatorColor).opacity(0.3))
                        .frame(height: 6)

                    // Fill
                    RoundedRectangle(cornerRadius: 3)
                        .fill(barColor)
                        .frame(width: geometry.size.width * usage.percentage, height: 6)
                        .animation(.easeInOut(duration: 0.3), value: usage.percentage)
                }
            }
            .frame(height: 6)

            // Details
            HStack {
                Text("acp.usage.tokens".localized(
                    AcpSessionViewModel.formatTokens(usage.tokensUsed),
                    AcpSessionViewModel.formatTokens(usage.contextWindowSize)
                ))
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Spacer()

                if let cost = usage.cost {
                    Text(formattedCost(cost))
                        .font(.caption2)
                        .fontWeight(.semibold)
                }
            }
        }
        .padding(12)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Computed Properties

    private var percentDisplay: String {
        "\(Int(usage.percentage * 100))%"
    }

    /// Color based on usage percentage.
    private var barColor: Color {
        if usage.percentage >= 0.85 {
            return .red
        }
        if usage.percentage >= 0.60 {
            return .orange
        }
        return .green
    }

    /// Format cost with currency.
    private func formattedCost(_ cost: AcpCost) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = cost.currency
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 4
        return formatter.string(from: NSNumber(value: cost.amount)) ?? String(format: "$%.2f", cost.amount)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        AcpUsageWidget(usage: AcpUsage(
            tokensUsed: 42_500,
            contextWindowSize: 200_000,
            cost: AcpCost(amount: 0.15, currency: "USD")
        ))

        AcpUsageWidget(usage: AcpUsage(
            tokensUsed: 145_000,
            contextWindowSize: 200_000,
            cost: AcpCost(amount: 0.85, currency: "USD")
        ))

        AcpUsageWidget(usage: AcpUsage(
            tokensUsed: 185_000,
            contextWindowSize: 200_000,
            cost: nil
        ))
    }
    .padding()
    .frame(width: 400)
}
