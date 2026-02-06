//
//  PaywallView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// The paywall view presenting subscription plans to the user.
///
/// Displays available subscription tiers with pricing, features,
/// and purchase/restore options. Supports monthly and annual billing
/// period toggling. Tracks purchase funnel analytics events.
struct PaywallView: View {

    /// The view model managing purchase state.
    @StateObject private var viewModel = PurchaseViewModel()

    /// Environment dismiss action for closing the paywall.
    @Environment(\.dismiss) private var dismiss

    /// The analytics service for tracking paywall events.
    private let analytics = PurchaseAnalyticsService.shared

    /// The source that triggered this paywall display.
    var source: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    paywallHeader

                    // Billing period selector
                    billingPeriodPicker

                    // Plans
                    if viewModel.showLoadingSkeleton {
                        loadingSkeleton
                    } else {
                        plansSection
                    }

                    // Restore purchases
                    restoreButton

                    // Manage subscription (for existing subscribers)
                    if viewModel.isSubscribed {
                        manageSubscriptionButton
                    }

                    // Legal text
                    legalFooter
                }
                .padding()
            }
            .navigationTitle("subscription.paywall.title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.close".localized) {
                        analytics.trackPaywallDismissed()
                        dismiss()
                    }
                }
            }
            .task {
                analytics.trackPaywallPresented(source: source)
                await viewModel.loadProducts()
            }
            .alert("subscription.purchaseSuccess.title".localized, isPresented: $viewModel.showPurchaseSuccess) {
                Button("common.ok".localized) {
                    dismiss()
                }
            } message: {
                Text("subscription.purchaseSuccess.message".localized)
            }
            .alert("subscription.restoreSuccess.title".localized, isPresented: $viewModel.showRestoreSuccess) {
                Button("common.ok".localized) {
                    dismiss()
                }
            } message: {
                Text("subscription.restoreSuccess.message".localized)
            }
            .alert("common.error".localized, isPresented: $viewModel.showError) {
                Button("common.ok".localized) {
                    viewModel.dismissError()
                }
            } message: {
                Text(viewModel.errorMessage ?? "error.unknown".localized)
            }
        }
    }

    // MARK: - Subviews

    /// The paywall header with branding and value proposition.
    private var paywallHeader: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(.blue.gradient)

            Text("subscription.paywall.headline".localized)
                .font(.title2)
                .fontWeight(.bold)
                .multilineTextAlignment(.center)

            Text("subscription.paywall.subheadline".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 16)
    }

    /// Picker for switching between monthly and annual billing.
    private var billingPeriodPicker: some View {
        Picker("subscription.billingPeriod".localized, selection: Binding(
            get: { viewModel.selectedBillingPeriod },
            set: { viewModel.billingPeriodDidChange(to: $0) }
        )) {
            ForEach(BillingPeriod.allCases) { period in
                Text(period.displayName).tag(period)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 16)
    }

    /// The section displaying available subscription plans.
    private var plansSection: some View {
        VStack(spacing: 16) {
            ForEach(viewModel.filteredPlans) { plan in
                PlanCardView(
                    plan: plan,
                    isCurrentPlan: viewModel.currentTier == plan.tier,
                    isPurchasing: viewModel.isPurchasing,
                    onPurchase: {
                        Task {
                            await viewModel.purchase(plan)
                        }
                    }
                )
            }
        }
    }

    /// Loading skeleton while products are being fetched.
    private var loadingSkeleton: some View {
        VStack(spacing: 16) {
            ForEach(0..<2, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.systemGray6))
                    .frame(height: 200)
                    .overlay {
                        ProgressView()
                    }
            }
        }
    }

    /// Restore purchases button.
    private var restoreButton: some View {
        Button {
            Task {
                await viewModel.restorePurchases()
            }
        } label: {
            if viewModel.isRestoring {
                ProgressView()
                    .padding(.horizontal)
            } else {
                Text("subscription.restore".localized)
                    .font(.subheadline)
            }
        }
        .disabled(viewModel.isRestoring)
        .padding(.top, 8)
    }

    /// Button to manage existing subscription in Apple Settings.
    private var manageSubscriptionButton: some View {
        Button {
            viewModel.openSubscriptionManagement()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "gear")
                    .font(.caption)
                Text("subscription.action.manage".localized)
                    .font(.subheadline)
            }
            .foregroundStyle(.secondary)
        }
    }

    /// Legal and terms of service footer.
    private var legalFooter: some View {
        VStack(spacing: 4) {
            Text("subscription.legal.autoRenew".localized)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            HStack(spacing: 16) {
                Button("subscription.legal.terms".localized) {
                    if let url = URL(string: "https://happy.engineering/terms") {
                        UIApplication.shared.open(url)
                    }
                }
                .font(.caption2)

                Button("subscription.legal.privacy".localized) {
                    if let url = URL(string: "https://happy.engineering/privacy") {
                        UIApplication.shared.open(url)
                    }
                }
                .font(.caption2)
            }
        }
        .padding(.bottom, 16)
    }
}

// MARK: - Plan Card View

/// A card displaying a single subscription plan with its features and purchase button.
struct PlanCardView: View {

    /// The subscription plan to display.
    let plan: SubscriptionPlan

    /// Whether this is the user's current active plan.
    let isCurrentPlan: Bool

    /// Whether a purchase is in progress.
    let isPurchasing: Bool

    /// Callback when the user taps the purchase button.
    let onPurchase: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Plan header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(plan.tier.displayName)
                            .font(.title3)
                            .fontWeight(.bold)

                        if plan.isRecommended {
                            Text("subscription.recommended".localized)
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(.blue)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                    }

                    Text(plan.displayPrice)
                        .font(.headline)
                        .foregroundStyle(.primary)
                }

                Spacer()

                if isCurrentPlan {
                    Label("subscription.currentPlan".localized, systemImage: "checkmark.seal.fill")
                        .font(.caption)
                        .foregroundStyle(.green)
                }
            }

            // Divider
            Divider()

            // Features list
            VStack(alignment: .leading, spacing: 8) {
                ForEach(plan.features) { feature in
                    HStack(spacing: 10) {
                        Image(systemName: feature.iconName)
                            .font(.caption)
                            .foregroundStyle(.blue)
                            .frame(width: 20)

                        Text(feature.title)
                            .font(.subheadline)
                    }
                }
            }

            // Purchase button
            if !isCurrentPlan {
                Button {
                    onPurchase()
                } label: {
                    Group {
                        if isPurchasing {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("subscription.subscribe".localized)
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(isPurchasing)
            }
        }
        .padding(20)
        .background {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemBackground))
                .shadow(color: plan.isRecommended ? .blue.opacity(0.2) : .clear, radius: 8, y: 2)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    plan.isRecommended ? Color.blue : Color(.systemGray4),
                    lineWidth: plan.isRecommended ? 2 : 1
                )
        }
    }
}

// MARK: - Preview

#Preview {
    PaywallView()
}
