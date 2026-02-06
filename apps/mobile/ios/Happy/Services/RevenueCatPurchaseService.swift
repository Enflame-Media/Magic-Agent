//
//  RevenueCatPurchaseService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import StoreKit

#if canImport(RevenueCat)
import RevenueCat
#endif

// MARK: - RevenueCat Configuration

/// Configuration for RevenueCat SDK initialization.
struct RevenueCatConfiguration {
    /// The RevenueCat API key for iOS.
    let apiKey: String

    /// Optional user ID for identifying the customer.
    let appUserID: String?

    /// Whether to enable debug logging.
    let debugLogsEnabled: Bool

    /// Default configuration using environment variable.
    static var `default`: RevenueCatConfiguration {
        RevenueCatConfiguration(
            apiKey: ProcessInfo.processInfo.environment["REVENUECAT_IOS_KEY"] ?? "",
            appUserID: nil,
            debugLogsEnabled: {
                #if DEBUG
                return true
                #else
                return false
                #endif
            }()
        )
    }
}

// MARK: - RevenueCat Purchase Service

/// RevenueCat-backed implementation of `PurchaseProviding`.
///
/// Routes all purchase operations through RevenueCat SDK v5+, providing:
/// - Server-side receipt validation
/// - Cross-platform entitlement management
/// - Subscription analytics and metrics
/// - Automatic subscription status syncing
///
/// Uses `#if canImport(RevenueCat)` for graceful fallback when SDK is not installed,
/// enabling development without the SDK dependency.
///
/// Uses `ObservableObject` for iOS 16 compatibility.
final class RevenueCatPurchaseService: ObservableObject, PurchaseProviding {

    // MARK: - Singleton

    static let shared = RevenueCatPurchaseService()

    // MARK: - Published Properties

    @Published private(set) var subscriptionStatus: SubscriptionStatus = .loading
    @Published private(set) var availablePlans: [SubscriptionPlan] = []
    @Published private(set) var isPurchasing: Bool = false

    // MARK: - Configuration State

    /// Whether the RevenueCat SDK has been configured.
    private(set) var isConfigured: Bool = false

    // MARK: - Entitlements

    /// The set of currently active entitlement identifiers.
    @Published private(set) var activeEntitlements: Set<String> = []

    // MARK: - Initialization

    init() {}

    // MARK: - Configuration

    /// Configures the RevenueCat SDK with the provided configuration.
    ///
    /// Must be called before any purchase operations. Typically called
    /// in `HappyApp.init()` or on first launch.
    ///
    /// - Parameter config: The RevenueCat configuration. Defaults to `.default`.
    func configure(with config: RevenueCatConfiguration = .default) {
        guard !config.apiKey.isEmpty else {
            #if DEBUG
            print("[RevenueCatPurchaseService] No API key provided. Falling back to StoreKit 2.")
            #endif
            return
        }

        #if canImport(RevenueCat)
        Purchases.logLevel = config.debugLogsEnabled ? .debug : .warn
        Purchases.configure(
            with: .init(withAPIKey: config.apiKey)
                .with(appUserID: config.appUserID)
        )
        isConfigured = true

        // Listen for customer info updates
        Purchases.shared.delegate = self

        Task {
            await refreshSubscriptionStatus()
        }
        #else
        #if DEBUG
        print("[RevenueCatPurchaseService] RevenueCat SDK not available. Using StoreKit 2 fallback.")
        #endif
        #endif
    }

    /// Identifies a user with RevenueCat for cross-device entitlement syncing.
    ///
    /// - Parameter userId: The user identifier (e.g., account ID from Keychain).
    func identify(userId: String) async {
        #if canImport(RevenueCat)
        guard isConfigured else { return }
        do {
            let (customerInfo, _) = try await Purchases.shared.logIn(userId)
            await updateFromCustomerInfo(customerInfo)
        } catch {
            #if DEBUG
            print("[RevenueCatPurchaseService] Login failed: \(error)")
            #endif
        }
        #endif
    }

    /// Logs out the current user from RevenueCat.
    func logout() async {
        #if canImport(RevenueCat)
        guard isConfigured else { return }
        do {
            let customerInfo = try await Purchases.shared.logOut()
            await updateFromCustomerInfo(customerInfo)
        } catch {
            #if DEBUG
            print("[RevenueCatPurchaseService] Logout failed: \(error)")
            #endif
        }
        #endif
    }

    // MARK: - PurchaseProviding

    /// Loads available products from RevenueCat offerings.
    func loadProducts() async throws {
        #if canImport(RevenueCat)
        guard isConfigured else {
            throw PurchaseError.notAvailable
        }

        do {
            let offerings = try await Purchases.shared.offerings()

            guard let currentOffering = offerings.current else {
                throw PurchaseError.notAvailable
            }

            var plans: [SubscriptionPlan] = []

            for package in currentOffering.availablePackages {
                let product = package.storeProduct
                let tier = ProductIdentifier.tier(for: product.productIdentifier)
                let billingPeriod = ProductIdentifier.billingPeriod(for: product.productIdentifier)
                let features = PurchaseService.features(for: tier)

                let plan = SubscriptionPlan(
                    id: product.productIdentifier,
                    tier: tier,
                    billingPeriod: billingPeriod,
                    displayPrice: product.localizedPriceString,
                    price: product.price,
                    features: features,
                    isRecommended: product.productIdentifier == ProductIdentifier.proMonthly
                )
                plans.append(plan)
            }

            // Sort: Pro before Team, Monthly before Annual
            plans.sort { lhs, rhs in
                if lhs.tier != rhs.tier {
                    return lhs.tier == .pro
                }
                return lhs.billingPeriod == .monthly
            }

            await MainActor.run {
                self.availablePlans = plans
            }
        } catch let error as PurchaseError {
            throw error
        } catch {
            throw PurchaseError.storeKitError(error.localizedDescription)
        }
        #else
        // Fallback: load from StoreKit 2 directly
        try await loadProductsFromStoreKit()
        #endif
    }

    /// Purchases a subscription plan via RevenueCat.
    @discardableResult
    func purchase(_ plan: SubscriptionPlan) async throws -> Bool {
        await MainActor.run {
            self.isPurchasing = true
        }

        defer {
            Task { @MainActor in
                self.isPurchasing = false
            }
        }

        #if canImport(RevenueCat)
        guard isConfigured else {
            throw PurchaseError.notAvailable
        }

        do {
            // Get the offerings to find the matching package
            let offerings = try await Purchases.shared.offerings()
            guard let currentOffering = offerings.current else {
                throw PurchaseError.notAvailable
            }

            guard let package = currentOffering.availablePackages.first(where: {
                $0.storeProduct.productIdentifier == plan.id
            }) else {
                throw PurchaseError.productNotFound(plan.id)
            }

            let result = try await Purchases.shared.purchase(package: package)

            if result.userCancelled {
                throw PurchaseError.purchaseCancelled
            }

            await updateFromCustomerInfo(result.customerInfo)
            return true
        } catch let error as PurchaseError {
            throw error
        } catch {
            let nsError = error as NSError
            if nsError.domain == "RevenueCat.ErrorCode" {
                switch nsError.code {
                case 1: // purchaseCancelledError
                    throw PurchaseError.purchaseCancelled
                case 2: // storeProblemError
                    throw PurchaseError.storeKitError(error.localizedDescription)
                case 3: // purchaseNotAllowedError
                    throw PurchaseError.notAvailable
                case 21: // paymentPendingError
                    throw PurchaseError.pendingTransaction
                default:
                    throw PurchaseError.purchaseFailed(error.localizedDescription)
                }
            }
            throw PurchaseError.purchaseFailed(error.localizedDescription)
        }
        #else
        throw PurchaseError.notAvailable
        #endif
    }

    /// Restores previously purchased subscriptions via RevenueCat.
    func restorePurchases() async throws {
        #if canImport(RevenueCat)
        guard isConfigured else {
            throw PurchaseError.notAvailable
        }

        do {
            let customerInfo = try await Purchases.shared.restorePurchases()
            await updateFromCustomerInfo(customerInfo)
        } catch {
            throw PurchaseError.storeKitError(error.localizedDescription)
        }
        #else
        // Fallback: use StoreKit 2 restore
        do {
            try await AppStore.sync()
        } catch {
            throw PurchaseError.storeKitError(error.localizedDescription)
        }
        await refreshSubscriptionStatus()
        #endif
    }

    /// Refreshes the current subscription status from RevenueCat.
    func refreshSubscriptionStatus() async {
        #if canImport(RevenueCat)
        guard isConfigured else {
            await MainActor.run {
                self.subscriptionStatus = .notSubscribed
            }
            return
        }

        do {
            let customerInfo = try await Purchases.shared.customerInfo()
            await updateFromCustomerInfo(customerInfo)
        } catch {
            #if DEBUG
            print("[RevenueCatPurchaseService] Failed to refresh status: \(error)")
            #endif
            await MainActor.run {
                self.subscriptionStatus = .error(error.localizedDescription)
            }
        }
        #else
        await refreshStatusFromStoreKit()
        #endif
    }

    // MARK: - Entitlement Checking

    /// Checks whether a specific entitlement is currently active.
    ///
    /// - Parameter entitlementId: The entitlement identifier (e.g., "pro", "team").
    /// - Returns: Whether the entitlement is active.
    func hasEntitlement(_ entitlementId: String) -> Bool {
        activeEntitlements.contains(entitlementId)
    }

    /// Checks whether the user has Pro-tier access.
    var isPro: Bool {
        hasEntitlement(Entitlement.pro) || hasEntitlement(Entitlement.team)
    }

    /// Checks whether the user has Team-tier access.
    var isTeam: Bool {
        hasEntitlement(Entitlement.team)
    }

    // MARK: - Private Helpers

    #if canImport(RevenueCat)
    /// Updates local state from RevenueCat CustomerInfo.
    @MainActor
    private func updateFromCustomerInfo(_ customerInfo: CustomerInfo) {
        // Update active entitlements
        let activeIds = Set(customerInfo.entitlements.active.keys)
        self.activeEntitlements = activeIds

        // Determine subscription status
        if let proEntitlement = customerInfo.entitlements["pro"] ?? customerInfo.entitlements["team"],
           proEntitlement.isActive {

            let productId = proEntitlement.productIdentifier
            let tier = ProductIdentifier.tier(for: productId)
            let billingPeriod = ProductIdentifier.billingPeriod(for: productId)

            let info = SubscriptionInfo(
                tier: tier,
                productId: productId,
                purchaseDate: proEntitlement.originalPurchaseDate ?? Date(),
                expirationDate: proEntitlement.expirationDate,
                willAutoRenew: proEntitlement.willRenew,
                billingPeriod: billingPeriod
            )

            if let expirationDate = proEntitlement.expirationDate, expirationDate < Date() {
                self.subscriptionStatus = .expired(info)
            } else {
                self.subscriptionStatus = .subscribed(info)
            }
        } else if !customerInfo.activeSubscriptions.isEmpty {
            // Has active subscriptions but no recognized entitlement
            let productId = customerInfo.activeSubscriptions.first ?? ""
            let tier = ProductIdentifier.tier(for: productId)
            let billingPeriod = ProductIdentifier.billingPeriod(for: productId)

            let info = SubscriptionInfo(
                tier: tier,
                productId: productId,
                purchaseDate: Date(),
                expirationDate: nil,
                willAutoRenew: true,
                billingPeriod: billingPeriod
            )
            self.subscriptionStatus = .subscribed(info)
        } else {
            self.subscriptionStatus = .notSubscribed
        }
    }
    #endif

    /// Fallback: loads products from StoreKit 2 when RevenueCat is not available.
    private func loadProductsFromStoreKit() async throws {
        let storeProducts: [Product]
        do {
            storeProducts = try await Product.products(for: ProductIdentifier.allSubscriptions)
        } catch {
            throw PurchaseError.storeKitError(error.localizedDescription)
        }

        guard !storeProducts.isEmpty else {
            throw PurchaseError.notAvailable
        }

        var plans: [SubscriptionPlan] = []
        for product in storeProducts {
            let tier = ProductIdentifier.tier(for: product.id)
            let billingPeriod = ProductIdentifier.billingPeriod(for: product.id)
            let features = PurchaseService.features(for: tier)

            let plan = SubscriptionPlan(
                id: product.id,
                tier: tier,
                billingPeriod: billingPeriod,
                displayPrice: product.displayPrice,
                price: product.price,
                features: features,
                isRecommended: product.id == ProductIdentifier.proMonthly
            )
            plans.append(plan)
        }

        plans.sort { lhs, rhs in
            if lhs.tier != rhs.tier { return lhs.tier == .pro }
            return lhs.billingPeriod == .monthly
        }

        await MainActor.run {
            self.availablePlans = plans
        }
    }

    /// Fallback: refreshes status from StoreKit 2 when RevenueCat is not available.
    private func refreshStatusFromStoreKit() async {
        var latestTransaction: Transaction?
        var latestProductId: String?

        for await result in Transaction.currentEntitlements {
            guard let transaction = try? checkVerification(result) else { continue }
            guard transaction.productType == .autoRenewable else { continue }

            if let existing = latestTransaction {
                if transaction.purchaseDate > existing.purchaseDate {
                    latestTransaction = transaction
                    latestProductId = transaction.productID
                }
            } else {
                latestTransaction = transaction
                latestProductId = transaction.productID
            }
        }

        let newStatus: SubscriptionStatus

        if let transaction = latestTransaction, let productId = latestProductId {
            let tier = ProductIdentifier.tier(for: productId)
            let billingPeriod = ProductIdentifier.billingPeriod(for: productId)

            let info = SubscriptionInfo(
                tier: tier,
                productId: productId,
                purchaseDate: transaction.purchaseDate,
                expirationDate: transaction.expirationDate,
                willAutoRenew: true,
                billingPeriod: billingPeriod
            )

            if let expirationDate = transaction.expirationDate, expirationDate < Date() {
                newStatus = transaction.revocationDate != nil ? .revoked : .expired(info)
            } else {
                newStatus = .subscribed(info)
            }
        } else {
            newStatus = .notSubscribed
        }

        await MainActor.run {
            self.subscriptionStatus = newStatus
        }
    }

    /// Verifies a StoreKit transaction result.
    private func checkVerification(_ result: VerificationResult<Transaction>) throws -> Transaction {
        switch result {
        case .verified(let transaction):
            return transaction
        case .unverified(_, let error):
            throw PurchaseError.verificationFailed
        }
    }
}

// MARK: - RevenueCat Delegate

#if canImport(RevenueCat)
extension RevenueCatPurchaseService: PurchasesDelegate {
    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        Task { @MainActor in
            self.updateFromCustomerInfo(customerInfo)
        }
    }
}
#endif

// MARK: - Entitlement Constants

/// Known entitlement identifiers configured in RevenueCat.
enum Entitlement {
    /// Pro tier entitlement.
    static let pro = "pro"

    /// Team tier entitlement.
    static let team = "team"

    /// All known entitlement identifiers.
    static let all: Set<String> = [pro, team]
}
