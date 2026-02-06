//
//  UsageLimitsDetailView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Expanded detail view showing all usage limits with full information.
///
/// Presented as a sheet from the `UsageLimitsWidget` when the user taps
/// to see more details. Shows all limits with progress bars, reset times,
/// and descriptions.
struct UsageLimitsDetailView: View {

    @ObservedObject var viewModel: UsageLimitsViewModel

    /// Whether to present the paywall sheet for upgrading.
    @State private var showPaywall: Bool = false

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            // Session Limit Section
            if let sessionLimit = viewModel.sessionLimit {
                Section {
                    UsageLimitDetailRow(limit: sessionLimit)
                } header: {
                    Text("usageLimits.detail.sessionLimit".localized)
                }
            }

            // Weekly Limits Section
            if !viewModel.weeklyLimits.isEmpty {
                Section {
                    ForEach(viewModel.weeklyLimits) { limit in
                        UsageLimitDetailRow(limit: limit)
                    }
                } header: {
                    Text("usageLimits.detail.weeklyLimits".localized)
                }
            }

            // Provider Info Section
            if let data = viewModel.limitsData {
                Section {
                    // Provider
                    if let provider = data.provider {
                        HStack {
                            Label("usageLimits.detail.provider".localized, systemImage: "server.rack")
                            Spacer()
                            Text(provider.capitalized)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Last Updated
                    HStack {
                        Label("usageLimits.detail.lastUpdated".localized, systemImage: "clock")
                        Spacer()
                        if let lastUpdated = viewModel.lastUpdatedText {
                            Text(lastUpdated)
                                .foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Text("usageLimits.detail.info".localized)
                }
            }

            // Upgrade Section
            Section {
                Button {
                    showPaywall = true
                } label: {
                    HStack {
                        Label("usageLimits.detail.upgradePlan".localized, systemImage: "arrow.up.circle.fill")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            } footer: {
                Text("usageLimits.detail.upgradeFooter".localized)
            }
        }
        .navigationTitle("usageLimits.detail.title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("common.done".localized) {
                    dismiss()
                }
            }
        }
        .refreshable {
            await viewModel.refresh()
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
    }
}

// MARK: - Usage Limit Detail Row

/// A detailed row for a single usage limit, showing full information.
struct UsageLimitDetailRow: View {

    let limit: UsageLimit

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title and percentage
            HStack {
                Text(limit.label)
                    .font(.body)
                    .fontWeight(.medium)

                Spacer()

                Text("\(Int(limit.percentageUsed))% " + "usageLimits.used".localized)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(colorForUsage(limit.usageColor))
            }

            // Progress bar
            UsageProgressBar(
                value: limit.percentageUsed / 100,
                color: colorForUsage(limit.usageColor),
                height: 8
            )

            // Description
            if let description = limit.description {
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Reset time
            if let resetText = formattedResetText {
                HStack(spacing: 4) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(resetText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Usage warning
            if limit.percentageUsed >= 80 {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                    Text("usageLimits.detail.nearLimit".localized)
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }
        }
        .padding(.vertical, 4)
    }

    /// Formatted reset time text for display.
    private var formattedResetText: String? {
        switch limit.resetDisplayType {
        case .countdown:
            guard let countdown = UsageFormatting.formatResetCountdown(limit.resetsAt) else { return nil }
            return String(format: "usageLimits.resetsIn".localized, countdown)
        case .datetime:
            guard let datetime = UsageFormatting.formatResetDatetime(limit.resetsAt) else { return nil }
            return String(format: "usageLimits.resetsAt".localized, datetime)
        }
    }

    /// Returns the SwiftUI Color for a given usage color category.
    private func colorForUsage(_ usageColor: UsageColor) -> Color {
        switch usageColor {
        case .normal:
            return .green
        case .warning:
            return .orange
        case .critical:
            return .red
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        UsageLimitsDetailView(
            viewModel: {
                let vm = UsageLimitsViewModel(provider: MockUsageLimitsProvider())
                return vm
            }()
        )
    }
}
