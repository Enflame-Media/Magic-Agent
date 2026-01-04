//
//  PurchaseViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// ViewModel for managing purchase UI state.
///
/// Provides reactive state for purchase views including:
/// - Available packages and offerings
/// - Purchase and restore operations
/// - Subscription status
/// - Error handling and alerts
///
/// ## Usage
/// ```swift
/// struct PaywallView: View {
///     @State private var viewModel = PurchaseViewModel()
///
///     var body: some View {
///         ForEach(viewModel.packages) { package in
///             PackageRow(package: package) {
///                 viewModel.purchase(package)
///             }
///         }
///     }
/// }
/// ```
@Observable
@MainActor
final class PurchaseViewModel {
    // MARK: - Dependencies

    private let purchaseService: PurchaseService

    // MARK: - State

    /// Whether a purchase operation is in progress.
    var isLoading: Bool = false

    /// Whether the restore operation is in progress.
    var isRestoring: Bool = false

    /// Error message to display.
    var errorMessage: String?

    /// Whether to show the error alert.
    var showingError: Bool = false

    /// Success message after purchase.
    var successMessage: String?

    /// Whether to show the success alert.
    var showingSuccess: Bool = false

    /// Selected package for purchase.
    var selectedPackage: Package?

    /// Whether to show the paywall sheet.
    var showingPaywall: Bool = false

    // MARK: - Computed Properties

    /// Available packages from the current offering.
    var packages: [Package] {
        purchaseService.availablePackages
    }

    /// Current offering.
    var offering: Offering? {
        purchaseService.currentOffering
    }

    /// Monthly package if available.
    var monthlyPackage: Package? {
        purchaseService.monthlyPackage
    }

    /// Annual package if available.
    var annualPackage: Package? {
        purchaseService.annualPackage
    }

    /// Whether the user has a pro subscription.
    var isPro: Bool {
        purchaseService.isPro
    }

    /// Whether the user has any active subscription.
    var isSubscribed: Bool {
        purchaseService.isSubscribed
    }

    /// Customer info.
    var customerInfo: CustomerInfo? {
        purchaseService.customerInfo
    }

    /// Whether purchases have been configured.
    var isConfigured: Bool {
        purchaseService.isConfigured
    }

    /// Active subscription product IDs.
    var activeSubscriptions: [String] {
        customerInfo?.activeSubscriptions ?? []
    }

    /// Annual savings percentage compared to monthly.
    var annualSavingsPercent: Int? {
        guard let monthly = monthlyPackage,
              let annual = annualPackage else {
            return nil
        }

        let monthlyYearCost = monthly.product.price * 12
        let annualCost = annual.product.price

        guard monthlyYearCost > 0 else { return nil }

        let savings = ((monthlyYearCost - annualCost) / monthlyYearCost) * 100
        return Int(truncating: savings as NSDecimalNumber)
    }

    // MARK: - Initialization

    init(purchaseService: PurchaseService = .shared) {
        self.purchaseService = purchaseService
    }

    // MARK: - Actions

    /// Load offerings from RevenueCat.
    func loadOfferings() async {
        isLoading = true
        defer { isLoading = false }

        _ = await purchaseService.getOfferings()
    }

    /// Refresh customer info.
    func refreshCustomerInfo() async {
        _ = await purchaseService.getCustomerInfo()
    }

    /// Purchase a package.
    /// - Parameter package: The package to purchase.
    func purchase(_ package: Package) async {
        isLoading = true
        selectedPackage = package

        // Track purchase started
        AnalyticsService.shared.trackPurchaseEvent(
            .purchaseStarted,
            properties: .purchase(package: package)
        )

        do {
            _ = try await purchaseService.purchase(package: package)

            // Track purchase completed
            AnalyticsService.shared.trackPurchaseEvent(
                .purchaseCompleted,
                properties: .purchase(package: package)
            )

            successMessage = "Thank you for your purchase!"
            showingSuccess = true
        } catch let error as PurchaseError {
            if error == .cancelled {
                // Track purchase cancelled
                AnalyticsService.shared.trackPurchaseEvent(
                    .purchaseCancelled,
                    properties: .purchase(package: package)
                )
            } else {
                // Track purchase failed
                AnalyticsService.shared.trackPurchaseEvent(
                    .purchaseFailed,
                    properties: .purchaseError(package: package, error: error)
                )

                errorMessage = error.errorDescription
                showingError = true
            }
        } catch {
            // Track purchase failed (unknown error)
            AnalyticsService.shared.trackPurchaseEvent(
                .purchaseFailed,
                properties: .purchaseError(package: package, error: .unknown(error.localizedDescription))
            )

            errorMessage = error.localizedDescription
            showingError = true
        }

        isLoading = false
        selectedPackage = nil
    }

    /// Restore previous purchases.
    func restore() async {
        isRestoring = true

        // Track restore started
        AnalyticsService.shared.trackPurchaseEvent(
            .restoreStarted,
            properties: [.platform: AnalyticsPlatform.macos]
        )

        do {
            let info = try await purchaseService.restorePurchases()

            // Track restore completed
            let restoredCount = info.activeSubscriptions.count
            let restoredPro = info.entitlements["pro"]?.isActive ?? false
            AnalyticsService.shared.trackPurchaseEvent(
                .restoreCompleted,
                properties: .restoreCompleted(restoredCount: restoredCount, restoredPro: restoredPro)
            )

            if info.activeSubscriptions.isEmpty {
                errorMessage = "No active subscriptions found to restore."
                showingError = true
            } else {
                successMessage = "Purchases restored successfully!"
                showingSuccess = true
            }
        } catch let error as PurchaseError {
            errorMessage = error.errorDescription
            showingError = true
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }

        isRestoring = false
    }

    /// Check if user has a specific entitlement.
    /// - Parameter entitlementId: The entitlement to check.
    /// - Returns: Whether the entitlement is active.
    func hasEntitlement(_ entitlementId: String) -> Bool {
        purchaseService.hasEntitlement(entitlementId)
    }

    /// Clear error state.
    func clearError() {
        errorMessage = nil
        showingError = false
        purchaseService.clearError()
    }

    /// Clear success state.
    func clearSuccess() {
        successMessage = nil
        showingSuccess = false
    }

    /// Present the paywall if user doesn't have the required entitlement.
    /// - Parameter entitlementId: The entitlement to check.
    /// - Returns: Whether the paywall was presented.
    @discardableResult
    func presentPaywallIfNeeded(for entitlementId: String) async -> Bool {
        await refreshCustomerInfo()

        if hasEntitlement(entitlementId) {
            return false
        }

        showingPaywall = true
        return true
    }

    /// Dismiss the paywall.
    func dismissPaywall() {
        showingPaywall = false
    }

    /// Sync purchases across devices.
    func syncPurchases() async {
        await purchaseService.syncPurchases()
    }
}

// MARK: - Package Helpers

extension Package {
    /// Formatted period description.
    var periodDescription: String {
        switch packageType {
        case .monthly:
            return "month"
        case .annual:
            return "year"
        case .weekly:
            return "week"
        case .lifetime:
            return "lifetime"
        case .custom:
            return ""
        }
    }

    /// Monthly equivalent price for annual packages.
    var monthlyEquivalentPrice: Decimal? {
        guard packageType == .annual else { return nil }
        return product.price / 12
    }

    /// Formatted monthly equivalent price string.
    var monthlyEquivalentString: String? {
        guard let price = monthlyEquivalentPrice else { return nil }

        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = product.currencyCode

        return formatter.string(from: price as NSDecimalNumber)
    }
}

// MARK: - PaywallResult

/// Result of presenting a paywall.
enum PaywallResult {
    /// Paywall was not presented (user already has entitlement).
    case notPresented
    /// An error occurred.
    case error(String)
    /// User cancelled the paywall.
    case cancelled
    /// User successfully purchased.
    case purchased
    /// User successfully restored purchases.
    case restored
}
