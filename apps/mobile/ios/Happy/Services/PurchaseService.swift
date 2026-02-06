//
//  PurchaseService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import StoreKit

// MARK: - PurchaseProviding Protocol

/// Protocol defining the purchase service interface.
///
/// This abstraction allows swapping between StoreKit 2 (native) and
/// RevenueCat implementations. The default implementation uses StoreKit 2
/// directly. When RevenueCat SDK is integrated, create a conforming
/// `RevenueCatPurchaseService` class that wraps the RC SDK calls.
protocol PurchaseProviding: AnyObject {
    /// The current subscription status.
    var subscriptionStatus: SubscriptionStatus { get }

    /// Available subscription plans loaded from StoreKit.
    var availablePlans: [SubscriptionPlan] { get }

    /// Load available products from the App Store.
    func loadProducts() async throws

    /// Purchase a subscription plan.
    /// - Parameter plan: The plan to purchase.
    /// - Returns: Whether the purchase was successful.
    @discardableResult
    func purchase(_ plan: SubscriptionPlan) async throws -> Bool

    /// Restore previously purchased subscriptions.
    func restorePurchases() async throws

    /// Check and update the current subscription status.
    func refreshSubscriptionStatus() async

    /// Whether a purchase is currently in progress.
    var isPurchasing: Bool { get }
}

// MARK: - Purchase Errors

/// Errors that can occur during purchase operations.
enum PurchaseError: LocalizedError, Equatable {
    case productNotFound(String)
    case purchaseFailed(String)
    case purchaseCancelled
    case verificationFailed
    case networkError(String)
    case storeKitError(String)
    case notAvailable
    case pendingTransaction

    var errorDescription: String? {
        switch self {
        case .productNotFound(let id):
            return "Product '\(id)' not found in the App Store."
        case .purchaseFailed(let reason):
            return "Purchase failed: \(reason)"
        case .purchaseCancelled:
            return "Purchase was cancelled."
        case .verificationFailed:
            return "Transaction verification failed. Please try again."
        case .networkError(let reason):
            return "Network error during purchase: \(reason)"
        case .storeKitError(let reason):
            return "App Store error: \(reason)"
        case .notAvailable:
            return "In-app purchases are not available on this device."
        case .pendingTransaction:
            return "A transaction is pending approval (e.g., Ask to Buy)."
        }
    }
}

// MARK: - PurchaseService (StoreKit 2 Implementation)

/// Native StoreKit 2 purchase service for managing subscriptions.
///
/// Uses async/await APIs from StoreKit 2 to handle product loading,
/// purchasing, and subscription status tracking. Conforms to `PurchaseProviding`
/// for easy swapping with a RevenueCat-backed implementation later.
///
/// Uses `ObservableObject` for iOS 16 compatibility.
final class PurchaseService: ObservableObject, PurchaseProviding {

    // MARK: - Singleton

    static let shared = PurchaseService()

    // MARK: - Published Properties

    @Published private(set) var subscriptionStatus: SubscriptionStatus = .loading
    @Published private(set) var availablePlans: [SubscriptionPlan] = []
    @Published private(set) var isPurchasing: Bool = false

    // MARK: - Private Properties

    /// Cached StoreKit products keyed by product identifier.
    private var products: [String: Product] = [:]

    /// Task for observing transaction updates.
    private var transactionListenerTask: Task<Void, Never>?

    // MARK: - Initialization

    init() {
        startTransactionListener()
    }

    deinit {
        transactionListenerTask?.cancel()
    }

    // MARK: - Transaction Listener

    /// Listens for transaction updates from StoreKit (e.g., renewals, revocations).
    ///
    /// This runs for the lifetime of the service and handles:
    /// - Automatic renewals
    /// - Subscription revocations
    /// - Pending transactions completing
    private func startTransactionListener() {
        transactionListenerTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                do {
                    let transaction = try self.verifyTransaction(result)
                    await transaction.finish()
                    await self.refreshSubscriptionStatus()
                } catch {
                    #if DEBUG
                    print("[PurchaseService] Transaction update verification failed: \(error)")
                    #endif
                }
            }
        }
    }

    // MARK: - Load Products

    /// Loads available subscription products from the App Store.
    ///
    /// Fetches products for all known identifiers and converts them
    /// into `SubscriptionPlan` models with localized pricing.
    func loadProducts() async throws {
        let storeProducts: [Product]
        do {
            storeProducts = try await Product.products(for: ProductIdentifier.allSubscriptions)
        } catch {
            throw PurchaseError.storeKitError(error.localizedDescription)
        }

        guard !storeProducts.isEmpty else {
            throw PurchaseError.notAvailable
        }

        var loadedProducts: [String: Product] = [:]
        var plans: [SubscriptionPlan] = []

        for product in storeProducts {
            loadedProducts[product.id] = product

            let tier = ProductIdentifier.tier(for: product.id)
            let billingPeriod = ProductIdentifier.billingPeriod(for: product.id)
            let features = Self.features(for: tier)

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

        // Sort: Pro before Team, Monthly before Annual
        plans.sort { lhs, rhs in
            if lhs.tier != rhs.tier {
                return lhs.tier == .pro
            }
            return lhs.billingPeriod == .monthly
        }

        await MainActor.run {
            self.products = loadedProducts
            self.availablePlans = plans
        }
    }

    // MARK: - Purchase

    /// Purchases a subscription plan.
    ///
    /// - Parameter plan: The subscription plan to purchase.
    /// - Returns: `true` if the purchase completed successfully.
    /// - Throws: `PurchaseError` if the purchase fails.
    @discardableResult
    func purchase(_ plan: SubscriptionPlan) async throws -> Bool {
        guard let product = products[plan.id] else {
            throw PurchaseError.productNotFound(plan.id)
        }

        await MainActor.run {
            self.isPurchasing = true
        }

        defer {
            Task { @MainActor in
                self.isPurchasing = false
            }
        }

        let result: Product.PurchaseResult
        do {
            result = try await product.purchase()
        } catch let error as StoreKitError {
            throw PurchaseError.storeKitError(error.localizedDescription)
        } catch {
            throw PurchaseError.purchaseFailed(error.localizedDescription)
        }

        switch result {
        case .success(let verification):
            let transaction = try verifyTransaction(verification)
            await transaction.finish()
            await refreshSubscriptionStatus()
            return true

        case .pending:
            throw PurchaseError.pendingTransaction

        case .userCancelled:
            throw PurchaseError.purchaseCancelled

        @unknown default:
            throw PurchaseError.purchaseFailed("Unknown purchase result.")
        }
    }

    // MARK: - Restore Purchases

    /// Restores previously purchased subscriptions.
    ///
    /// Calls `AppStore.sync()` which forces StoreKit to check
    /// the user's current entitlements with the App Store server.
    func restorePurchases() async throws {
        do {
            try await AppStore.sync()
        } catch {
            throw PurchaseError.storeKitError(error.localizedDescription)
        }

        await refreshSubscriptionStatus()
    }

    // MARK: - Subscription Status

    /// Refreshes the current subscription status by checking active entitlements.
    ///
    /// Iterates through `Transaction.currentEntitlements` to find the
    /// most recent verified subscription transaction.
    func refreshSubscriptionStatus() async {
        var latestTransaction: Transaction?
        var latestProductId: String?

        for await result in Transaction.currentEntitlements {
            guard let transaction = try? verifyTransaction(result) else { continue }

            // Only consider subscription-type transactions
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

            // Check subscription status details
            let statuses: [Product.SubscriptionInfo.Status]
            if let product = products[productId] {
                statuses = (try? await product.subscription?.status) ?? []
            } else {
                // Product not loaded yet, try loading it
                if let loadedProducts = try? await Product.products(for: [productId]),
                   let product = loadedProducts.first {
                    statuses = (try? await product.subscription?.status) ?? []
                } else {
                    statuses = []
                }
            }

            let willAutoRenew = statuses.first(where: { status in
                status.state == .subscribed || status.state == .inGracePeriod
            }).flatMap { status -> Bool? in
                guard case .verified(let renewalInfo) = status.renewalInfo else { return nil }
                return renewalInfo.willAutoRenew
            } ?? true

            let info = SubscriptionInfo(
                tier: tier,
                productId: productId,
                purchaseDate: transaction.purchaseDate,
                expirationDate: transaction.expirationDate,
                willAutoRenew: willAutoRenew,
                billingPeriod: billingPeriod
            )

            if let expirationDate = transaction.expirationDate, expirationDate < Date() {
                if transaction.revocationDate != nil {
                    newStatus = .revoked
                } else {
                    newStatus = .expired(info)
                }
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

    // MARK: - Transaction Verification

    /// Verifies a transaction result from StoreKit.
    ///
    /// - Parameter result: The verification result from StoreKit.
    /// - Returns: The verified transaction.
    /// - Throws: `PurchaseError.verificationFailed` if verification fails.
    private func verifyTransaction(_ result: VerificationResult<Transaction>) throws -> Transaction {
        switch result {
        case .verified(let transaction):
            return transaction
        case .unverified(_, let error):
            #if DEBUG
            print("[PurchaseService] Transaction verification failed: \(error)")
            #endif
            throw PurchaseError.verificationFailed
        }
    }

    // MARK: - Feature Definitions

    /// Returns the features for a given subscription tier.
    ///
    /// - Parameter tier: The subscription tier.
    /// - Returns: An array of `PlanFeature` describing what the tier includes.
    static func features(for tier: SubscriptionTier) -> [PlanFeature] {
        switch tier {
        case .free:
            return [
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.basicAccess", comment: ""),
                    iconName: "person.fill"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.singleDevice", comment: ""),
                    iconName: "iphone"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.limitedSessions", comment: ""),
                    iconName: "clock"
                )
            ]
        case .pro:
            return [
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.unlimitedSessions", comment: ""),
                    iconName: "infinity"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.multiDevice", comment: ""),
                    iconName: "laptopcomputer.and.iphone"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.prioritySupport", comment: ""),
                    iconName: "star.fill"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.advancedAnalytics", comment: ""),
                    iconName: "chart.bar.fill"
                )
            ]
        case .team:
            return [
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.everythingInPro", comment: ""),
                    iconName: "checkmark.seal.fill"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.teamManagement", comment: ""),
                    iconName: "person.3.fill"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.sharedSessions", comment: ""),
                    iconName: "shared.with.you"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.adminControls", comment: ""),
                    iconName: "gearshape.2.fill"
                ),
                PlanFeature(
                    title: NSLocalizedString("subscription.feature.dedicatedSupport", comment: ""),
                    iconName: "headset.circle.fill"
                )
            ]
        }
    }
}
