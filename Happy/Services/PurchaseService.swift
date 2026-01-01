//
//  PurchaseService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import StoreKit

/// Service for managing in-app purchases and subscriptions using RevenueCat.
///
/// This service handles:
/// - RevenueCat SDK configuration
/// - Fetching offerings and products
/// - Processing purchases
/// - Restoring purchases
/// - Checking entitlements
///
/// Note: Requires RevenueCat SDK to be added via Swift Package Manager.
/// Add: https://github.com/RevenueCat/purchases-ios
///
/// @example
/// ```swift
/// let service = PurchaseService.shared
/// await service.configure(apiKey: "your_api_key")
///
/// if let offerings = await service.getOfferings() {
///     let package = offerings.current?.availablePackages.first
///     try await service.purchase(package: package!)
/// }
/// ```
@Observable
@MainActor
final class PurchaseService {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = PurchaseService()

    // MARK: - Published State

    /// Whether the service has been configured.
    var isConfigured: Bool = false

    /// Current operation status.
    var status: PurchaseStatus = .idle

    /// Customer subscription information.
    var customerInfo: CustomerInfo?

    /// Available purchase offerings.
    var offerings: Offerings?

    /// Last error that occurred.
    var lastError: PurchaseError?

    // MARK: - Computed Properties

    /// Whether the user has the "pro" entitlement.
    var isPro: Bool {
        customerInfo?.entitlements["pro"]?.isActive ?? false
    }

    /// Whether the user has any active subscription.
    var isSubscribed: Bool {
        !(customerInfo?.activeSubscriptions.isEmpty ?? true)
    }

    /// Current/default offering.
    var currentOffering: Offering? {
        offerings?.current
    }

    /// Available packages from current offering.
    var availablePackages: [Package] {
        currentOffering?.availablePackages ?? []
    }

    /// Monthly package if available.
    var monthlyPackage: Package? {
        availablePackages.first { pkg in
            pkg.packageType == .monthly ||
            pkg.identifier.lowercased().contains("month")
        }
    }

    /// Annual package if available.
    var annualPackage: Package? {
        availablePackages.first { pkg in
            pkg.packageType == .annual ||
            pkg.identifier.lowercased().contains("annual") ||
            pkg.identifier.lowercased().contains("year")
        }
    }

    // MARK: - Private Properties

    private var purchasesConfigured = false

    // MARK: - Initialization

    private init() {}

    // MARK: - Configuration

    /// Configure RevenueCat with the API key.
    /// - Parameters:
    ///   - apiKey: The RevenueCat API key for macOS.
    ///   - appUserID: Optional user ID to identify the customer.
    func configure(apiKey: String, appUserID: String? = nil) async {
        guard !purchasesConfigured else {
            print("[Purchases] Already configured")
            return
        }

        status = .loading

        // Note: In production with RevenueCat SDK installed:
        // Purchases.configure(withAPIKey: apiKey, appUserID: appUserID)
        // Purchases.shared.delegate = self

        print("[Purchases] Would configure with apiKey, appUserID: \(appUserID ?? "nil")")

        purchasesConfigured = true
        isConfigured = true
        status = .idle

        // Fetch initial data
        async let _ = getCustomerInfo()
        async let _ = getOfferings()
    }

    // MARK: - Data Fetching

    /// Fetch customer subscription info.
    @discardableResult
    func getCustomerInfo() async -> CustomerInfo? {
        guard isConfigured else {
            lastError = .notConfigured
            return nil
        }

        do {
            // Note: In production with RevenueCat SDK:
            // let info = try await Purchases.shared.customerInfo()
            // return transformCustomerInfo(info)

            // Placeholder implementation
            let info = CustomerInfo(
                activeSubscriptions: [],
                entitlements: [:],
                originalAppUserId: "user-id",
                requestDate: Date()
            )
            customerInfo = info
            return info
        } catch {
            lastError = .networkError(error.localizedDescription)
            return nil
        }
    }

    /// Fetch available offerings.
    @discardableResult
    func getOfferings() async -> Offerings? {
        guard isConfigured else {
            lastError = .notConfigured
            return nil
        }

        do {
            // Note: In production with RevenueCat SDK:
            // let offerings = try await Purchases.shared.offerings()
            // return transformOfferings(offerings)

            // Placeholder implementation
            let result = Offerings(current: nil, all: [:])
            offerings = result
            return result
        } catch {
            lastError = .networkError(error.localizedDescription)
            return nil
        }
    }

    // MARK: - Purchase Operations

    /// Purchase a package.
    /// - Parameter package: The package to purchase.
    /// - Returns: The updated customer info after purchase.
    func purchase(package: Package) async throws -> CustomerInfo {
        guard isConfigured else {
            throw PurchaseError.notConfigured
        }

        status = .purchasing

        do {
            // Note: In production with RevenueCat SDK:
            // let (_, customerInfo, _) = try await Purchases.shared.purchase(package: package.nativePackage)
            // self.customerInfo = transformCustomerInfo(customerInfo)
            // return self.customerInfo!

            print("[Purchases] Would purchase package: \(package.identifier)")

            // Simulate successful purchase
            let info = CustomerInfo(
                activeSubscriptions: [package.product.identifier],
                entitlements: ["pro": Entitlement(isActive: true, identifier: "pro")],
                originalAppUserId: "user-id",
                requestDate: Date()
            )

            customerInfo = info
            status = .success
            return info
        } catch {
            status = .error
            let purchaseError = mapStoreKitError(error)
            lastError = purchaseError
            throw purchaseError
        }
    }

    /// Restore previous purchases.
    /// - Returns: The restored customer info.
    func restorePurchases() async throws -> CustomerInfo {
        guard isConfigured else {
            throw PurchaseError.notConfigured
        }

        status = .restoring

        do {
            // Note: In production with RevenueCat SDK:
            // let customerInfo = try await Purchases.shared.restorePurchases()
            // self.customerInfo = transformCustomerInfo(customerInfo)
            // return self.customerInfo!

            let info = try await getCustomerInfo()
            status = .success
            return info ?? CustomerInfo(
                activeSubscriptions: [],
                entitlements: [:],
                originalAppUserId: "user-id",
                requestDate: Date()
            )
        } catch {
            status = .error
            let purchaseError = PurchaseError.restoreFailed(error.localizedDescription)
            lastError = purchaseError
            throw purchaseError
        }
    }

    /// Sync purchases with RevenueCat.
    func syncPurchases() async {
        _ = await getCustomerInfo()
    }

    // MARK: - Entitlements

    /// Check if user has a specific entitlement.
    /// - Parameter entitlementId: The entitlement identifier to check.
    /// - Returns: Whether the entitlement is active.
    func hasEntitlement(_ entitlementId: String) -> Bool {
        customerInfo?.entitlements[entitlementId]?.isActive ?? false
    }

    // MARK: - Error Handling

    /// Clear the last error.
    func clearError() {
        lastError = nil
        if status == .error {
            status = .idle
        }
    }

    /// Reset service state.
    func reset() {
        isConfigured = false
        purchasesConfigured = false
        status = .idle
        customerInfo = nil
        offerings = nil
        lastError = nil
    }

    // MARK: - Private Helpers

    private func mapStoreKitError(_ error: Error) -> PurchaseError {
        // Handle StoreKit-specific errors
        if let skError = error as? StoreKitError {
            switch skError {
            case .userCancelled:
                return .cancelled
            case .networkError:
                return .networkError("Network connection error")
            default:
                return .unknown(error.localizedDescription)
            }
        }

        return .unknown(error.localizedDescription)
    }
}

// MARK: - Supporting Types

/// Purchase operation status.
enum PurchaseStatus: Equatable {
    case idle
    case loading
    case purchasing
    case restoring
    case success
    case error
}

/// Customer subscription information.
struct CustomerInfo: Equatable {
    let activeSubscriptions: [String]
    let entitlements: [String: Entitlement]
    let originalAppUserId: String
    let requestDate: Date
}

/// Entitlement information.
struct Entitlement: Equatable {
    let isActive: Bool
    let identifier: String
}

/// Available offerings.
struct Offerings: Equatable {
    let current: Offering?
    let all: [String: Offering]
}

/// A product offering.
struct Offering: Equatable, Identifiable {
    let id: String
    var identifier: String { id }
    let availablePackages: [Package]
}

/// A purchasable package.
struct Package: Equatable, Identifiable {
    let id: String
    var identifier: String { id }
    let packageType: PackageType
    let product: Product
}

/// Package types.
enum PackageType: Equatable {
    case monthly
    case annual
    case weekly
    case lifetime
    case custom
}

/// Product information.
struct Product: Equatable, Identifiable {
    let id: String
    var identifier: String { id }
    let title: String
    let description: String
    let priceString: String
    let price: Decimal
    let currencyCode: String
}

// MARK: - Errors

/// Errors that can occur during purchase operations.
enum PurchaseError: LocalizedError, Equatable {
    case notConfigured
    case productNotFound(String)
    case cancelled
    case networkError(String)
    case restoreFailed(String)
    case alreadyOwned
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Purchases not configured. Please try again."
        case .productNotFound(let id):
            return "Product '\(id)' not found."
        case .cancelled:
            return "Purchase was cancelled."
        case .networkError(let message):
            return "Network error: \(message)"
        case .restoreFailed(let message):
            return "Failed to restore purchases: \(message)"
        case .alreadyOwned:
            return "You already own this item."
        case .unknown(let message):
            return "An error occurred: \(message)"
        }
    }
}

// MARK: - RevenueCat Keys

/// API keys for RevenueCat.
/// Note: In production, these should be loaded from secure configuration.
enum RevenueCatKeys {
    /// macOS API key.
    static var macOS: String {
        // Would load from Info.plist or secure configuration
        ProcessInfo.processInfo.environment["REVENUECAT_MACOS_KEY"] ?? ""
    }
}
