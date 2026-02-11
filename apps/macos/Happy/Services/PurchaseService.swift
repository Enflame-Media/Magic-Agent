//
//  PurchaseService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import StoreKit

#if canImport(RevenueCat)
import RevenueCat
#endif

/// Service for managing in-app purchases and subscriptions using RevenueCat.
///
/// This service handles:
/// - RevenueCat SDK configuration
/// - Fetching offerings and products
/// - Processing purchases
/// - Restoring purchases
/// - Checking entitlements
/// - Subscription status sync across devices
///
/// ## Requirements
/// Add RevenueCat SDK via Swift Package Manager:
/// ```
/// https://github.com/RevenueCat/purchases-ios
/// ```
///
/// ## Usage
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

        #if canImport(RevenueCat)
        // Configure RevenueCat SDK
        Purchases.logLevel = .debug

        if let appUserID = appUserID {
            Purchases.configure(withAPIKey: apiKey, appUserID: appUserID)
        } else {
            Purchases.configure(withAPIKey: apiKey)
        }

        // Listen for customer info updates
        Purchases.shared.delegate = PurchaseDelegateHandler.shared

        print("[Purchases] Configured with apiKey, appUserID: \(appUserID ?? "anonymous")")
        #else
        print("[Purchases] RevenueCat SDK not available. Add via Swift Package Manager.")
        print("[Purchases] Would configure with apiKey, appUserID: \(appUserID ?? "nil")")
        #endif

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

        #if canImport(RevenueCat)
        do {
            let rcInfo = try await Purchases.shared.customerInfo()
            let info = transformCustomerInfo(rcInfo)
            customerInfo = info
            return info
        } catch {
            lastError = .networkError(error.localizedDescription)
            return nil
        }
        #else
        // Placeholder implementation when SDK not available
        let info = CustomerInfo(
            activeSubscriptions: [],
            entitlements: [:],
            originalAppUserId: "user-id",
            requestDate: Date()
        )
        customerInfo = info
        return info
        #endif
    }

    /// Fetch available offerings.
    @discardableResult
    func getOfferings() async -> Offerings? {
        guard isConfigured else {
            lastError = .notConfigured
            return nil
        }

        #if canImport(RevenueCat)
        do {
            let rcOfferings = try await Purchases.shared.offerings()
            let result = transformOfferings(rcOfferings)
            offerings = result
            return result
        } catch {
            lastError = .networkError(error.localizedDescription)
            return nil
        }
        #else
        // Placeholder implementation when SDK not available
        let result = Offerings(current: nil, all: [:])
        offerings = result
        return result
        #endif
    }

    /// Get specific products by their identifiers.
    /// - Parameter productIds: Array of product identifiers to fetch.
    /// - Returns: Array of matching products.
    func getProducts(productIds: [String]) async -> [Product] {
        guard isConfigured else {
            lastError = .notConfigured
            return []
        }

        #if canImport(RevenueCat)
        do {
            let rcProducts = await Purchases.shared.products(productIds)
            return rcProducts.map { transformProduct($0) }
        }
        #else
        return []
        #endif
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

        #if canImport(RevenueCat)
        do {
            // Get the native RevenueCat package
            guard let rcPackage = await findNativePackage(for: package) else {
                throw PurchaseError.productNotFound(package.identifier)
            }

            let (_, customerInfo, _) = try await Purchases.shared.purchase(package: rcPackage)
            let info = transformCustomerInfo(customerInfo)
            self.customerInfo = info
            status = .success

            // Post notification for analytics
            NotificationCenter.default.post(
                name: .purchaseCompleted,
                object: nil,
                userInfo: ["package": package.identifier]
            )

            return info
        } catch let error as RevenueCat.ErrorCode {
            status = .error
            let purchaseError = mapRevenueCatError(error)
            lastError = purchaseError
            throw purchaseError
        } catch {
            status = .error
            let purchaseError = mapStoreKitError(error)
            lastError = purchaseError
            throw purchaseError
        }
        #else
        print("[Purchases] Would purchase package: \(package.identifier)")

        // Simulate successful purchase for development
        let info = CustomerInfo(
            activeSubscriptions: [package.product.identifier],
            entitlements: ["pro": Entitlement(isActive: true, identifier: "pro")],
            originalAppUserId: "user-id",
            requestDate: Date()
        )

        customerInfo = info
        status = .success
        return info
        #endif
    }

    /// Purchase a product directly.
    /// - Parameter product: The product to purchase.
    /// - Returns: The updated customer info after purchase.
    func purchase(product: Product) async throws -> CustomerInfo {
        guard isConfigured else {
            throw PurchaseError.notConfigured
        }

        status = .purchasing

        #if canImport(RevenueCat)
        do {
            // Get the native StoreKit product
            let products = await Purchases.shared.products([product.identifier])
            guard let rcProduct = products.first else {
                throw PurchaseError.productNotFound(product.identifier)
            }

            let (_, customerInfo, _) = try await Purchases.shared.purchase(product: rcProduct)
            let info = transformCustomerInfo(customerInfo)
            self.customerInfo = info
            status = .success

            return info
        } catch {
            status = .error
            let purchaseError = mapStoreKitError(error)
            lastError = purchaseError
            throw purchaseError
        }
        #else
        print("[Purchases] Would purchase product: \(product.identifier)")

        let info = CustomerInfo(
            activeSubscriptions: [product.identifier],
            entitlements: ["pro": Entitlement(isActive: true, identifier: "pro")],
            originalAppUserId: "user-id",
            requestDate: Date()
        )

        customerInfo = info
        status = .success
        return info
        #endif
    }

    /// Restore previous purchases.
    /// - Returns: The restored customer info.
    func restorePurchases() async throws -> CustomerInfo {
        guard isConfigured else {
            throw PurchaseError.notConfigured
        }

        status = .restoring

        #if canImport(RevenueCat)
        do {
            let rcInfo = try await Purchases.shared.restorePurchases()
            let info = transformCustomerInfo(rcInfo)
            self.customerInfo = info
            status = .success

            // Post notification for analytics
            NotificationCenter.default.post(
                name: .purchaseRestored,
                object: nil
            )

            return info
        } catch {
            status = .error
            let purchaseError = PurchaseError.restoreFailed(error.localizedDescription)
            lastError = purchaseError
            throw purchaseError
        }
        #else
        let info = try await getCustomerInfo()
        status = .success
        return info ?? CustomerInfo(
            activeSubscriptions: [],
            entitlements: [:],
            originalAppUserId: "user-id",
            requestDate: Date()
        )
        #endif
    }

    /// Sync purchases with RevenueCat backend.
    /// Useful for ensuring subscription status is current across devices.
    func syncPurchases() async {
        #if canImport(RevenueCat)
        do {
            try await Purchases.shared.syncPurchases()
            _ = await getCustomerInfo()
        } catch {
            print("[Purchases] Sync failed: \(error.localizedDescription)")
        }
        #else
        _ = await getCustomerInfo()
        #endif
    }

    // MARK: - Entitlements

    /// Check if user has a specific entitlement.
    /// - Parameter entitlementId: The entitlement identifier to check.
    /// - Returns: Whether the entitlement is active.
    func hasEntitlement(_ entitlementId: String) -> Bool {
        customerInfo?.entitlements[entitlementId]?.isActive ?? false
    }

    /// Async check for entitlement (fetches fresh data).
    /// - Parameter entitlementId: The entitlement identifier to check.
    /// - Returns: Whether the entitlement is active.
    func checkEntitlement(_ entitlementId: String) async -> Bool {
        await getCustomerInfo()
        return hasEntitlement(entitlementId)
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

    // MARK: - User Management

    /// Log in a specific user to RevenueCat.
    /// - Parameter appUserID: The user ID to log in.
    func logIn(appUserID: String) async throws {
        #if canImport(RevenueCat)
        let (customerInfo, _) = try await Purchases.shared.logIn(appUserID)
        self.customerInfo = transformCustomerInfo(customerInfo)
        #endif
    }

    /// Log out the current user from RevenueCat.
    func logOut() async throws {
        #if canImport(RevenueCat)
        let customerInfo = try await Purchases.shared.logOut()
        self.customerInfo = transformCustomerInfo(customerInfo)
        #else
        self.customerInfo = nil
        #endif
    }

    // MARK: - Private Helpers

    #if canImport(RevenueCat)
    /// Transform RevenueCat CustomerInfo to our domain model.
    private func transformCustomerInfo(_ rcInfo: RevenueCat.CustomerInfo) -> CustomerInfo {
        var entitlements: [String: Entitlement] = [:]

        for (key, rcEntitlement) in rcInfo.entitlements.all {
            entitlements[key] = Entitlement(
                isActive: rcEntitlement.isActive,
                identifier: rcEntitlement.identifier
            )
        }

        return CustomerInfo(
            activeSubscriptions: Array(rcInfo.activeSubscriptions),
            entitlements: entitlements,
            originalAppUserId: rcInfo.originalAppUserId,
            requestDate: rcInfo.requestDate ?? Date()
        )
    }

    /// Transform RevenueCat Offerings to our domain model.
    private func transformOfferings(_ rcOfferings: RevenueCat.Offerings) -> Offerings {
        var all: [String: Offering] = [:]

        for (key, rcOffering) in rcOfferings.all {
            all[key] = transformOffering(rcOffering)
        }

        return Offerings(
            current: rcOfferings.current.map { transformOffering($0) },
            all: all
        )
    }

    /// Transform a single RevenueCat Offering to our domain model.
    private func transformOffering(_ rcOffering: RevenueCat.Offering) -> Offering {
        Offering(
            id: rcOffering.identifier,
            availablePackages: rcOffering.availablePackages.map { transformPackage($0) }
        )
    }

    /// Transform a RevenueCat Package to our domain model.
    private func transformPackage(_ rcPackage: RevenueCat.Package) -> Package {
        Package(
            id: rcPackage.identifier,
            packageType: transformPackageType(rcPackage.packageType),
            product: transformProduct(rcPackage.storeProduct)
        )
    }

    /// Transform a StoreProduct to our domain model.
    private func transformProduct(_ storeProduct: StoreProduct) -> Product {
        Product(
            id: storeProduct.productIdentifier,
            title: storeProduct.localizedTitle,
            description: storeProduct.localizedDescription,
            priceString: storeProduct.localizedPriceString,
            price: storeProduct.price,
            currencyCode: storeProduct.currencyCode ?? "USD"
        )
    }

    /// Transform RevenueCat PackageType to our domain model.
    private func transformPackageType(_ rcType: RevenueCat.PackageType) -> PackageType {
        switch rcType {
        case .monthly:
            return .monthly
        case .annual:
            return .annual
        case .weekly:
            return .weekly
        case .lifetime:
            return .lifetime
        default:
            return .custom
        }
    }

    /// Find the native RevenueCat package for our domain package.
    private func findNativePackage(for package: Package) async -> RevenueCat.Package? {
        guard let rcOfferings = try? await Purchases.shared.offerings() else {
            return nil
        }

        for rcOffering in rcOfferings.all.values {
            if let rcPackage = rcOffering.availablePackages.first(where: { $0.identifier == package.identifier }) {
                return rcPackage
            }
        }

        return nil
    }

    /// Map RevenueCat error codes to our domain errors.
    private func mapRevenueCatError(_ error: RevenueCat.ErrorCode) -> PurchaseError {
        switch error {
        case .purchaseCancelledError:
            return .cancelled
        case .productNotAvailableForPurchaseError:
            return .productNotFound("Product not available")
        case .networkError:
            return .networkError("Network connection error")
        case .purchaseNotAllowedError:
            return .notConfigured
        case .productAlreadyPurchasedError:
            return .alreadyOwned
        default:
            return .unknown(error.localizedDescription)
        }
    }
    #endif

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

// MARK: - RevenueCat Delegate Handler

#if canImport(RevenueCat)
/// Delegate handler for RevenueCat customer info updates.
@MainActor
final class PurchaseDelegateHandler: NSObject, PurchasesDelegate {
    static let shared = PurchaseDelegateHandler()

    nonisolated func purchases(_ purchases: Purchases, receivedUpdated customerInfo: RevenueCat.CustomerInfo) {
        Task { @MainActor in
            // Update the shared service with new customer info
            let info = CustomerInfo(
                activeSubscriptions: Array(customerInfo.activeSubscriptions),
                entitlements: customerInfo.entitlements.all.reduce(into: [:]) { result, pair in
                    result[pair.key] = Entitlement(
                        isActive: pair.value.isActive,
                        identifier: pair.value.identifier
                    )
                },
                originalAppUserId: customerInfo.originalAppUserId,
                requestDate: customerInfo.requestDate ?? Date()
            )
            PurchaseService.shared.customerInfo = info

            // Post notification for UI updates
            NotificationCenter.default.post(
                name: .customerInfoUpdated,
                object: nil,
                userInfo: ["customerInfo": info]
            )
        }
    }
}
#endif

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

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when a purchase is completed successfully.
    static let purchaseCompleted = Notification.Name("purchaseCompleted")

    /// Posted when purchases are restored successfully.
    static let purchaseRestored = Notification.Name("purchaseRestored")

    /// Posted when customer info is updated from RevenueCat.
    static let customerInfoUpdated = Notification.Name("customerInfoUpdated")
}
