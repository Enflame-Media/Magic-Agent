//
//  PaywallView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Native paywall view for presenting subscription options.
///
/// Displays available subscription packages with:
/// - Package details (price, period, savings)
/// - Purchase buttons
/// - Restore purchases option
/// - Error and success handling
///
/// ## Usage
/// ```swift
/// .sheet(isPresented: $showingPaywall) {
///     PaywallView()
/// }
/// ```
struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = PurchaseViewModel()

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            Divider()

            // Content
            ScrollView {
                VStack(spacing: 24) {
                    // Features
                    featuresSection

                    // Packages
                    if viewModel.packages.isEmpty {
                        loadingView
                    } else {
                        packagesSection
                    }

                    // Restore
                    restoreSection
                }
                .padding(24)
            }

            Divider()

            // Footer
            footer
        }
        .frame(width: 480, height: 600)
        .task {
            // Track paywall presented event
            AnalyticsService.shared.trackPurchaseEvent(
                .paywallPresented,
                properties: .paywall(offeringId: viewModel.offering?.identifier, source: "paywall_sheet")
            )

            await viewModel.loadOfferings()
        }
        .alert("Error", isPresented: $viewModel.showingError) {
            Button("OK") {
                viewModel.clearError()
            }
        } message: {
            Text(viewModel.errorMessage ?? "An error occurred")
        }
        .alert("Success", isPresented: $viewModel.showingSuccess) {
            Button("OK") {
                viewModel.clearSuccess()
                dismiss()
            }
        } message: {
            Text(viewModel.successMessage ?? "Purchase successful!")
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var header: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)

            Spacer()

            Text("Happy Pro")
                .font(.headline)

            Spacer()

            // Spacer to balance the close button
            Image(systemName: "xmark.circle.fill")
                .font(.title2)
                .opacity(0)
        }
        .padding()
    }

    // MARK: - Features

    @ViewBuilder
    private var featuresSection: some View {
        VStack(spacing: 20) {
            // Icon and title
            VStack(spacing: 12) {
                Image(systemName: "sparkles")
                    .font(.system(size: 48))
                    .foregroundStyle(.blue.gradient)

                Text("Upgrade to Pro")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Unlock all features and get the most out of Happy")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Feature list
            VStack(alignment: .leading, spacing: 12) {
                FeatureRow(icon: "bolt.fill", title: "Unlimited Sessions", color: .yellow)
                FeatureRow(icon: "person.2.fill", title: "Friend Sharing", color: .blue)
                FeatureRow(icon: "waveform", title: "Voice Features", color: .purple)
                FeatureRow(icon: "bell.badge.fill", title: "Push Notifications", color: .red)
                FeatureRow(icon: "icloud.fill", title: "Cloud Sync", color: .cyan)
            }
            .frame(maxWidth: 280)
        }
    }

    // MARK: - Packages

    @ViewBuilder
    private var packagesSection: some View {
        VStack(spacing: 12) {
            // Annual (recommended)
            if let annual = viewModel.annualPackage {
                PackageCard(
                    package: annual,
                    isSelected: viewModel.selectedPackage?.id == annual.id,
                    isRecommended: true,
                    savingsPercent: viewModel.annualSavingsPercent,
                    isLoading: viewModel.isLoading && viewModel.selectedPackage?.id == annual.id
                ) {
                    Task {
                        await viewModel.purchase(annual)
                    }
                }
            }

            // Monthly
            if let monthly = viewModel.monthlyPackage {
                PackageCard(
                    package: monthly,
                    isSelected: viewModel.selectedPackage?.id == monthly.id,
                    isRecommended: false,
                    savingsPercent: nil,
                    isLoading: viewModel.isLoading && viewModel.selectedPackage?.id == monthly.id
                ) {
                    Task {
                        await viewModel.purchase(monthly)
                    }
                }
            }

            // Other packages
            ForEach(viewModel.packages.filter { pkg in
                pkg.packageType != .monthly && pkg.packageType != .annual
            }) { package in
                PackageCard(
                    package: package,
                    isSelected: viewModel.selectedPackage?.id == package.id,
                    isRecommended: false,
                    savingsPercent: nil,
                    isLoading: viewModel.isLoading && viewModel.selectedPackage?.id == package.id
                ) {
                    Task {
                        await viewModel.purchase(package)
                    }
                }
            }
        }
    }

    // MARK: - Loading

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading subscription options...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(height: 150)
    }

    // MARK: - Restore

    @ViewBuilder
    private var restoreSection: some View {
        Button {
            Task {
                await viewModel.restore()
            }
        } label: {
            if viewModel.isRestoring {
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.small)
                    Text("Restoring...")
                }
            } else {
                Text("Restore Purchases")
            }
        }
        .buttonStyle(.plain)
        .foregroundStyle(.blue)
        .font(.subheadline)
        .disabled(viewModel.isRestoring)
    }

    // MARK: - Footer

    @ViewBuilder
    private var footer: some View {
        VStack(spacing: 8) {
            Text("Subscriptions will be charged to your Apple ID account.")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: 16) {
                Link("Terms of Service", destination: URL(string: "https://happy.engineering/terms")!)
                Link("Privacy Policy", destination: URL(string: "https://happy.engineering/privacy")!)
            }
            .font(.caption)
        }
        .padding()
    }
}

// MARK: - Feature Row

/// A row displaying a single feature.
struct FeatureRow: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color)
                .frame(width: 24)

            Text(title)
                .font(.subheadline)

            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        }
    }
}

// MARK: - Package Card

/// A card displaying a subscription package option.
struct PackageCard: View {
    let package: Package
    let isSelected: Bool
    let isRecommended: Bool
    let savingsPercent: Int?
    let isLoading: Bool
    let onPurchase: () -> Void

    var body: some View {
        Button(action: onPurchase) {
            VStack(spacing: 0) {
                // Recommended badge
                if isRecommended {
                    HStack {
                        Text("BEST VALUE")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.blue)
                            .clipShape(Capsule())

                        Spacer()

                        if let savings = savingsPercent {
                            Text("Save \(savings)%")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(.green)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                }

                // Package details
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(packageTitle)
                            .font(.headline)
                            .foregroundStyle(.primary)

                        if let monthly = package.monthlyEquivalentString {
                            Text("\(monthly)/month")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 4) {
                        Text(package.product.priceString)
                            .font(.title3)
                            .fontWeight(.semibold)
                            .foregroundStyle(.primary)

                        Text("per \(package.periodDescription)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(16)
            }
            .background {
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.accentColor.opacity(0.1) : Color(nsColor: .controlBackgroundColor))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(
                                isRecommended ? Color.accentColor : Color.secondary.opacity(0.3),
                                lineWidth: isRecommended ? 2 : 1
                            )
                    }
            }
            .overlay {
                if isLoading {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(.ultraThinMaterial)
                        .overlay {
                            ProgressView()
                        }
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
    }

    private var packageTitle: String {
        switch package.packageType {
        case .monthly:
            return "Monthly"
        case .annual:
            return "Annual"
        case .weekly:
            return "Weekly"
        case .lifetime:
            return "Lifetime"
        case .custom:
            return package.product.title
        }
    }
}

// MARK: - Preview

#Preview {
    PaywallView()
}

// MARK: - Paywall Modifier

/// View modifier for presenting paywall when needed.
struct PaywallModifier: ViewModifier {
    @Binding var isPresented: Bool
    let entitlementId: String
    let onResult: ((PaywallResult) -> Void)?

    @State private var viewModel = PurchaseViewModel()

    func body(content: Content) -> some View {
        content
            .sheet(isPresented: $isPresented) {
                PaywallView()
            }
    }
}

extension View {
    /// Present a paywall sheet.
    /// - Parameters:
    ///   - isPresented: Binding to control presentation.
    ///   - entitlementId: The entitlement to check (for conditional presentation).
    ///   - onResult: Callback with the result of the paywall.
    func paywall(
        isPresented: Binding<Bool>,
        entitlementId: String = "pro",
        onResult: ((PaywallResult) -> Void)? = nil
    ) -> some View {
        modifier(PaywallModifier(
            isPresented: isPresented,
            entitlementId: entitlementId,
            onResult: onResult
        ))
    }
}
