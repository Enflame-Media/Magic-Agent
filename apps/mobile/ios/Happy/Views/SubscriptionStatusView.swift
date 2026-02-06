//
//  SubscriptionStatusView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View displaying the user's current subscription status and management options.
///
/// Shows subscription details including tier, expiration date, renewal status,
/// and provides actions for managing or upgrading the subscription.
struct SubscriptionStatusView: View {

    /// The view model managing purchase state.
    @StateObject private var viewModel = PurchaseViewModel()

    /// Whether to present the paywall sheet.
    @State private var showPaywall: Bool = false

    var body: some View {
        List {
            // Current plan section
            Section {
                currentPlanRow
            } header: {
                Text("subscription.status.currentPlan".localized)
            }

            // Subscription details (when subscribed)
            if case .subscribed(let info) = viewModel.subscriptionStatus {
                Section {
                    subscriptionDetailsRows(info: info)
                } header: {
                    Text("subscription.status.details".localized)
                }
            }

            // Expired notice
            if case .expired(let info) = viewModel.subscriptionStatus {
                Section {
                    expiredNotice(info: info)
                } header: {
                    Text("subscription.status.expired".localized)
                }
            }

            // Actions section
            Section {
                actionsSection
            } header: {
                Text("subscription.status.actions".localized)
            }

            // Manage subscription
            Section {
                manageSubscriptionRow
            } footer: {
                Text("subscription.status.manageFooter".localized)
            }
        }
        .navigationTitle("subscription.status.title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.refreshStatus()
        }
        .refreshable {
            await viewModel.refreshStatus()
        }
        .sheet(isPresented: $showPaywall) {
            PaywallView()
        }
        .alert("common.error".localized, isPresented: $viewModel.showError) {
            Button("common.ok".localized) {
                viewModel.dismissError()
            }
        } message: {
            Text(viewModel.errorMessage ?? "error.unknown".localized)
        }
    }

    // MARK: - Subviews

    /// Row displaying the current plan tier and status badge.
    private var currentPlanRow: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(currentTierName)
                    .font(.headline)

                Text(currentTierDescription)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            statusBadge
        }
        .padding(.vertical, 4)
    }

    /// The name of the current tier.
    private var currentTierName: String {
        switch viewModel.subscriptionStatus {
        case .subscribed(let info):
            return info.tier.displayName
        case .expired(let info):
            return info.tier.displayName
        default:
            return SubscriptionTier.free.displayName
        }
    }

    /// Description of the current tier.
    private var currentTierDescription: String {
        switch viewModel.subscriptionStatus {
        case .subscribed(let info):
            return info.tier.tierDescription
        case .expired(let info):
            return info.tier.tierDescription
        default:
            return SubscriptionTier.free.tierDescription
        }
    }

    /// Status badge showing the current subscription state.
    @ViewBuilder
    private var statusBadge: some View {
        switch viewModel.subscriptionStatus {
        case .subscribed(let info):
            if info.isInGracePeriod {
                Label("subscription.status.gracePeriod".localized, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption2)
                    .foregroundStyle(.orange)
            } else {
                Label("subscription.status.active".localized, systemImage: "checkmark.circle.fill")
                    .font(.caption2)
                    .foregroundStyle(.green)
            }
        case .expired:
            Label("subscription.status.expired".localized, systemImage: "xmark.circle.fill")
                .font(.caption2)
                .foregroundStyle(.red)
        case .revoked:
            Label("subscription.status.revoked".localized, systemImage: "xmark.circle.fill")
                .font(.caption2)
                .foregroundStyle(.red)
        case .loading:
            ProgressView()
        case .notSubscribed:
            Label("subscription.status.free".localized, systemImage: "circle")
                .font(.caption2)
                .foregroundStyle(.secondary)
        case .error:
            Label("subscription.status.error".localized, systemImage: "exclamationmark.circle.fill")
                .font(.caption2)
                .foregroundStyle(.red)
        }
    }

    /// Rows showing subscription details like billing period and renewal date.
    @ViewBuilder
    private func subscriptionDetailsRows(info: SubscriptionInfo) -> some View {
        // Billing period
        HStack {
            Label("subscription.detail.billingPeriod".localized, systemImage: "calendar")
            Spacer()
            Text(info.billingPeriod.displayName)
                .foregroundStyle(.secondary)
        }

        // Purchase date
        HStack {
            Label("subscription.detail.purchaseDate".localized, systemImage: "cart.fill")
            Spacer()
            Text(info.purchaseDate, style: .date)
                .foregroundStyle(.secondary)
        }

        // Expiration date
        if let expirationDate = info.expirationDate {
            HStack {
                Label("subscription.detail.renewalDate".localized, systemImage: "arrow.clockwise")
                Spacer()
                Text(expirationDate, style: .date)
                    .foregroundStyle(.secondary)
            }
        }

        // Days remaining
        if let days = info.daysRemaining {
            HStack {
                Label("subscription.detail.daysRemaining".localized, systemImage: "hourglass")
                Spacer()
                Text("\(days)")
                    .foregroundStyle(days <= 7 ? .orange : .secondary)
            }
        }

        // Auto-renewal status
        HStack {
            Label("subscription.detail.autoRenew".localized, systemImage: "arrow.triangle.2.circlepath")
            Spacer()
            Text(info.willAutoRenew
                ? "common.enabled".localized
                : "common.disabled".localized)
                .foregroundStyle(info.willAutoRenew ? .green : .orange)
        }
    }

    /// Notice shown when the subscription has expired.
    @ViewBuilder
    private func expiredNotice(info: SubscriptionInfo) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text("subscription.expired.notice".localized)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Text("subscription.expired.description".localized)
                .font(.caption)
                .foregroundStyle(.secondary)

            Button {
                showPaywall = true
            } label: {
                Text("subscription.expired.renew".localized)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.regular)
            .padding(.top, 4)
        }
        .padding(.vertical, 4)
    }

    /// Actions section with upgrade and restore options.
    @ViewBuilder
    private var actionsSection: some View {
        if !viewModel.isSubscribed {
            // Upgrade button
            Button {
                showPaywall = true
            } label: {
                HStack {
                    Label("subscription.action.upgrade".localized, systemImage: "arrow.up.circle.fill")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }

        // Restore purchases
        Button {
            Task {
                await viewModel.restorePurchases()
            }
        } label: {
            HStack {
                Label("subscription.action.restore".localized, systemImage: "arrow.counterclockwise")
                Spacer()
                if viewModel.isRestoring {
                    ProgressView()
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .disabled(viewModel.isRestoring)
    }

    /// Row linking to the App Store subscription management page.
    private var manageSubscriptionRow: some View {
        Button {
            viewModel.openSubscriptionManagement()
        } label: {
            HStack {
                Label("subscription.action.manage".localized, systemImage: "gear")
                Spacer()
                Image(systemName: "arrow.up.forward.app")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SubscriptionStatusView()
    }
}
