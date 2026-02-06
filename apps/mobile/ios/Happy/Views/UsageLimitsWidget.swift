//
//  UsageLimitsWidget.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A compact widget showing Claude Code plan usage limits.
///
/// Displays session limits, weekly limits with progress bars, and a "last updated"
/// timestamp. Designed to be embedded in the session list as a card/banner at the top.
///
/// Usage:
/// ```swift
/// UsageLimitsWidget()
///     .padding(.horizontal)
/// ```
struct UsageLimitsWidget: View {

    @StateObject private var viewModel: UsageLimitsViewModel

    /// Whether to show the expanded detail view.
    @State private var showDetail: Bool = false

    init(viewModel: UsageLimitsViewModel? = nil) {
        _viewModel = StateObject(wrappedValue: viewModel ?? UsageLimitsViewModel())
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.limitsData == nil {
                loadingView
            } else if let errorMessage = viewModel.errorMessage, viewModel.limitsData == nil {
                errorView(message: errorMessage)
            } else if viewModel.isUnavailable {
                // Limits not available from provider - don't show anything
                EmptyView()
            } else if viewModel.hasLimits {
                limitsCard
            }
        }
        .task {
            await viewModel.loadLimits()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 8) {
            ProgressView()
            Text("usageLimits.loading".localized)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Error View

    private func errorView(message: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)

            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                Task { await viewModel.refresh() }
            } label: {
                Text("common.retry".localized)
                    .font(.caption)
                    .fontWeight(.medium)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Limits Card

    private var limitsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Label("usageLimits.title".localized, systemImage: "chart.bar.fill")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                Button {
                    showDetail = true
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Session Limit
            if let sessionLimit = viewModel.sessionLimit {
                UsageLimitRow(limit: sessionLimit)
            }

            // Weekly Limits (show first 2 in compact mode)
            let displayLimits = Array(viewModel.weeklyLimits.prefix(2))
            ForEach(displayLimits) { limit in
                UsageLimitRow(limit: limit)
            }

            // Show "N more" if there are additional limits
            if viewModel.weeklyLimits.count > 2 {
                Text(String(format: "usageLimits.moreCount".localized, viewModel.weeklyLimits.count - 2))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Footer
            HStack(spacing: 6) {
                if let lastUpdated = viewModel.lastUpdatedText {
                    Text(String(format: "usageLimits.lastUpdated".localized, lastUpdated))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                Spacer()

                if viewModel.isRefreshing {
                    ProgressView()
                        .scaleEffect(0.6)
                } else {
                    Button {
                        Task { await viewModel.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .sheet(isPresented: $showDetail) {
            NavigationStack {
                UsageLimitsDetailView(viewModel: viewModel)
            }
        }
    }
}

// MARK: - Usage Limit Row

/// A single row displaying a usage limit with a progress bar.
struct UsageLimitRow: View {

    let limit: UsageLimit

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(limit.label)
                    .font(.caption)
                    .foregroundStyle(.primary)

                Spacer()

                Text("\(Int(limit.percentageUsed))%")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(colorForUsage(limit.usageColor))
            }

            // Progress bar
            UsageProgressBar(
                value: limit.percentageUsed / 100,
                color: colorForUsage(limit.usageColor)
            )

            // Reset time
            if let resetText = formattedResetText {
                Text(resetText)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
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

// MARK: - Usage Progress Bar

/// A custom progress bar that shows usage with color-coded fill.
struct UsageProgressBar: View {

    /// Progress value between 0 and 1.
    let value: Double

    /// Fill color for the progress bar.
    let color: Color

    /// Height of the progress bar.
    var height: CGFloat = 6

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background track
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(Color(.systemGray5))
                    .frame(height: height)

                // Filled portion
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(color)
                    .frame(width: max(0, min(geometry.size.width, geometry.size.width * CGFloat(value))), height: height)
            }
        }
        .frame(height: height)
    }
}

// MARK: - Preview

#Preview("Usage Limits Widget") {
    VStack(spacing: 16) {
        UsageLimitsWidget(
            viewModel: {
                let vm = UsageLimitsViewModel(provider: MockUsageLimitsProvider())
                return vm
            }()
        )
    }
    .padding()
    .background(Color(.systemGroupedBackground))
}

#Preview("Usage Limit Row - Low") {
    UsageLimitRow(limit: .sampleLow)
        .padding()
}

#Preview("Usage Limit Row - High") {
    UsageLimitRow(limit: .sampleHigh)
        .padding()
}
