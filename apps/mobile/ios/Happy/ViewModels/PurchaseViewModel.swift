//
//  PurchaseViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for managing purchase state and coordinating between
/// the `PurchaseService` and purchase-related views.
///
/// Uses `ObservableObject` for iOS 16 compatibility.
final class PurchaseViewModel: ObservableObject {

    // MARK: - Published Properties

    /// Available subscription plans fetched from the App Store.
    @Published private(set) var plans: [SubscriptionPlan] = []

    /// The current subscription status.
    @Published private(set) var subscriptionStatus: SubscriptionStatus = .loading

    /// Whether products are currently being loaded.
    @Published private(set) var isLoading: Bool = false

    /// Whether a purchase is currently in progress.
    @Published private(set) var isPurchasing: Bool = false

    /// Whether a restore operation is in progress.
    @Published private(set) var isRestoring: Bool = false

    /// The currently selected billing period for the paywall.
    @Published var selectedBillingPeriod: BillingPeriod = .monthly

    /// Error message to display, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    /// Whether to show the success alert after a purchase.
    @Published var showPurchaseSuccess: Bool = false

    /// Whether to show the restore success alert.
    @Published var showRestoreSuccess: Bool = false

    // MARK: - Computed Properties

    /// Plans filtered by the currently selected billing period.
    var filteredPlans: [SubscriptionPlan] {
        plans.filter { $0.billingPeriod == selectedBillingPeriod }
    }

    /// The recommended plan for the current billing period.
    var recommendedPlan: SubscriptionPlan? {
        filteredPlans.first { $0.isRecommended } ?? filteredPlans.first
    }

    /// Whether the user currently has an active subscription.
    var isSubscribed: Bool {
        subscriptionStatus.isActive
    }

    /// The current subscription tier, if subscribed.
    var currentTier: SubscriptionTier? {
        subscriptionStatus.currentTier
    }

    /// Whether to show the loading skeleton.
    var showLoadingSkeleton: Bool {
        isLoading && plans.isEmpty
    }

    // MARK: - Dependencies

    private let purchaseService: PurchaseProviding
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    /// Creates a new purchase view model.
    ///
    /// - Parameter purchaseService: The purchase service to use.
    ///   Defaults to the shared singleton.
    init(purchaseService: PurchaseProviding = PurchaseService.shared) {
        self.purchaseService = purchaseService
        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Loads available products from the App Store and refreshes subscription status.
    ///
    /// Call this when the paywall view appears.
    @MainActor
    func loadProducts() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        do {
            try await purchaseService.loadProducts()
            plans = purchaseService.availablePlans
            await purchaseService.refreshSubscriptionStatus()
            subscriptionStatus = purchaseService.subscriptionStatus
        } catch let error as PurchaseError {
            // Don't show error for .notAvailable in simulator
            #if targetEnvironment(simulator)
            if error == .notAvailable {
                loadSamplePlans()
                isLoading = false
                return
            }
            #endif
            errorMessage = error.localizedDescription
            showError = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    /// Purchases the specified subscription plan.
    ///
    /// - Parameter plan: The subscription plan to purchase.
    @MainActor
    func purchase(_ plan: SubscriptionPlan) async {
        guard !isPurchasing else { return }
        isPurchasing = true
        errorMessage = nil

        do {
            let success = try await purchaseService.purchase(plan)
            if success {
                subscriptionStatus = purchaseService.subscriptionStatus
                showPurchaseSuccess = true
            }
        } catch PurchaseError.purchaseCancelled {
            // User cancelled, no error to show
            #if DEBUG
            print("[PurchaseViewModel] User cancelled purchase")
            #endif
        } catch PurchaseError.pendingTransaction {
            errorMessage = PurchaseError.pendingTransaction.localizedDescription
            showError = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isPurchasing = false
    }

    /// Restores previously purchased subscriptions.
    @MainActor
    func restorePurchases() async {
        guard !isRestoring else { return }
        isRestoring = true
        errorMessage = nil

        do {
            try await purchaseService.restorePurchases()
            subscriptionStatus = purchaseService.subscriptionStatus

            if subscriptionStatus.isActive {
                showRestoreSuccess = true
            } else {
                errorMessage = NSLocalizedString("subscription.restore.noPurchases", comment: "No purchases found to restore")
                showError = true
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isRestoring = false
    }

    /// Refreshes the current subscription status.
    @MainActor
    func refreshStatus() async {
        await purchaseService.refreshSubscriptionStatus()
        subscriptionStatus = purchaseService.subscriptionStatus
    }

    /// Dismisses the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    // MARK: - Private Methods

    /// Sets up Combine subscriptions to observe service state changes.
    private func setupSubscriptions() {
        // Observe the purchase service if it's a PurchaseService (ObservableObject)
        if let service = purchaseService as? PurchaseService {
            service.$subscriptionStatus
                .receive(on: DispatchQueue.main)
                .sink { [weak self] status in
                    self?.subscriptionStatus = status
                }
                .store(in: &cancellables)

            service.$availablePlans
                .receive(on: DispatchQueue.main)
                .sink { [weak self] plans in
                    self?.plans = plans
                }
                .store(in: &cancellables)

            service.$isPurchasing
                .receive(on: DispatchQueue.main)
                .sink { [weak self] purchasing in
                    self?.isPurchasing = purchasing
                }
                .store(in: &cancellables)
        }
    }

    /// Loads sample plans for use in simulator or preview mode.
    private func loadSamplePlans() {
        plans = [
            SubscriptionPlan.sampleProMonthly,
            SubscriptionPlan.sampleProAnnual
        ]
        subscriptionStatus = .notSubscribed
    }
}
