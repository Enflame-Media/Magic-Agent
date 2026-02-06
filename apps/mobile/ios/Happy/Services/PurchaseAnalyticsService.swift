//
//  PurchaseAnalyticsService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Purchase Analytics Events

/// Purchase funnel analytics events for tracking the complete user journey.
///
/// These events map to the purchase funnel used across all Happy platforms
/// (TypeScript, macOS, Vue.js) for consistent analytics reporting.
enum PurchaseAnalyticsEvent: String, CaseIterable {
    /// Paywall was displayed to the user.
    case paywallPresented = "paywall_presented"

    /// Paywall was dismissed without a purchase.
    case paywallDismissed = "paywall_dismissed"

    /// User initiated a purchase attempt.
    case purchaseStarted = "purchase_started"

    /// Purchase completed successfully.
    case purchaseCompleted = "purchase_completed"

    /// Purchase failed with an error.
    case purchaseFailed = "purchase_failed"

    /// User cancelled the purchase.
    case purchaseCancelled = "purchase_cancelled"

    /// User initiated a restore purchases flow.
    case purchaseRestoreStarted = "purchase_restore_started"

    /// Restore completed successfully.
    case purchaseRestored = "purchase_restored"

    /// Restore failed with an error.
    case purchaseRestoreFailed = "purchase_restore_failed"

    /// User changed the billing period selection.
    case billingPeriodChanged = "billing_period_changed"

    /// User tapped the subscription management link.
    case subscriptionManagementOpened = "subscription_management_opened"

    /// Entitlement gate was hit (user tried to access a locked feature).
    case entitlementGateHit = "entitlement_gate_hit"

    /// User upgraded from one tier to another.
    case subscriptionUpgraded = "subscription_upgraded"

    /// User downgraded from one tier to another.
    case subscriptionDowngraded = "subscription_downgraded"
}

// MARK: - Analytics Event Properties

/// Properties attached to purchase analytics events.
struct PurchaseAnalyticsProperties {
    /// The platform (always "ios").
    var platform: String = "ios"

    /// Timestamp of the event in ISO 8601 format.
    var timestamp: String?

    /// The product ID involved in the event.
    var productId: String?

    /// The subscription tier.
    var tier: String?

    /// The billing period (monthly/annual).
    var billingPeriod: String?

    /// The display price of the product.
    var price: String?

    /// The offering ID from RevenueCat.
    var offeringId: String?

    /// The gated feature that triggered the event.
    var feature: String?

    /// Error description if the event represents a failure.
    var error: String?

    /// The source that led to this event (e.g., "settings", "session_list", "voice_control").
    var source: String?

    /// Converts the properties to a dictionary for logging/sending.
    func toDictionary() -> [String: Any] {
        var dict: [String: Any] = ["platform": platform]
        if let timestamp = timestamp { dict["timestamp"] = timestamp }
        if let productId = productId { dict["product_id"] = productId }
        if let tier = tier { dict["tier"] = tier }
        if let billingPeriod = billingPeriod { dict["billing_period"] = billingPeriod }
        if let price = price { dict["price"] = price }
        if let offeringId = offeringId { dict["offering_id"] = offeringId }
        if let feature = feature { dict["feature"] = feature }
        if let error = error { dict["error"] = error }
        if let source = source { dict["source"] = source }
        return dict
    }
}

// MARK: - Purchase Analytics Service

/// Service for tracking purchase funnel analytics events.
///
/// Provides type-safe analytics tracking matching the cross-platform implementation
/// across TypeScript, macOS, and Vue.js clients for consistent funnel reporting.
///
/// ## Usage
/// ```swift
/// PurchaseAnalyticsService.shared.track(.paywallPresented, properties: .init(source: "settings"))
/// PurchaseAnalyticsService.shared.track(.purchaseStarted, properties: .init(
///     productId: "media.enflame.happy.ios.pro.monthly",
///     tier: "pro",
///     billingPeriod: "monthly"
/// ))
/// ```
final class PurchaseAnalyticsService {

    // MARK: - Singleton

    static let shared = PurchaseAnalyticsService()

    // MARK: - Configuration

    /// Whether analytics is enabled.
    var isEnabled: Bool = true

    /// Whether to print events to console (for debugging).
    var debugLogging: Bool = {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }()

    // MARK: - Initialization

    private init() {}

    // MARK: - Tracking

    /// Tracks a purchase analytics event with the given properties.
    ///
    /// - Parameters:
    ///   - event: The analytics event to track.
    ///   - properties: Event properties and metadata.
    func track(_ event: PurchaseAnalyticsEvent, properties: PurchaseAnalyticsProperties = PurchaseAnalyticsProperties()) {
        guard isEnabled else { return }

        var finalProperties = properties
        if finalProperties.timestamp == nil {
            finalProperties.timestamp = ISO8601DateFormatter().string(from: Date())
        }

        if debugLogging {
            print("[PurchaseAnalytics] \(event.rawValue): \(finalProperties.toDictionary())")
        }

        // TODO: Send to analytics provider (Amplitude, Mixpanel, etc.)
        // Amplitude.instance().logEvent(event.rawValue, withEventProperties: finalProperties.toDictionary())
    }

    // MARK: - Convenience Methods

    /// Tracks a paywall presented event.
    ///
    /// - Parameter source: Where the paywall was triggered from.
    func trackPaywallPresented(source: String? = nil) {
        track(.paywallPresented, properties: .init(source: source))
    }

    /// Tracks a paywall dismissed event.
    func trackPaywallDismissed() {
        track(.paywallDismissed)
    }

    /// Tracks a purchase started event for the given plan.
    ///
    /// - Parameter plan: The subscription plan being purchased.
    func trackPurchaseStarted(plan: SubscriptionPlan) {
        track(.purchaseStarted, properties: .init(
            productId: plan.id,
            tier: plan.tier.rawValue,
            billingPeriod: plan.billingPeriod.rawValue,
            price: plan.displayPrice
        ))
    }

    /// Tracks a purchase completed event for the given plan.
    ///
    /// - Parameter plan: The subscription plan that was purchased.
    func trackPurchaseCompleted(plan: SubscriptionPlan) {
        track(.purchaseCompleted, properties: .init(
            productId: plan.id,
            tier: plan.tier.rawValue,
            billingPeriod: plan.billingPeriod.rawValue,
            price: plan.displayPrice
        ))
    }

    /// Tracks a purchase failed event.
    ///
    /// - Parameters:
    ///   - plan: The subscription plan that failed to purchase.
    ///   - error: The error that caused the failure.
    func trackPurchaseFailed(plan: SubscriptionPlan, error: Error) {
        track(.purchaseFailed, properties: .init(
            productId: plan.id,
            tier: plan.tier.rawValue,
            billingPeriod: plan.billingPeriod.rawValue,
            error: error.localizedDescription
        ))
    }

    /// Tracks a purchase cancelled event.
    ///
    /// - Parameter plan: The subscription plan that was cancelled.
    func trackPurchaseCancelled(plan: SubscriptionPlan) {
        track(.purchaseCancelled, properties: .init(
            productId: plan.id,
            tier: plan.tier.rawValue,
            billingPeriod: plan.billingPeriod.rawValue
        ))
    }

    /// Tracks a restore purchases started event.
    func trackRestoreStarted() {
        track(.purchaseRestoreStarted)
    }

    /// Tracks a restore purchases completed event.
    func trackRestoreCompleted() {
        track(.purchaseRestored)
    }

    /// Tracks a restore purchases failed event.
    ///
    /// - Parameter error: The error that caused the failure.
    func trackRestoreFailed(error: Error) {
        track(.purchaseRestoreFailed, properties: .init(error: error.localizedDescription))
    }

    /// Tracks an entitlement gate hit event.
    ///
    /// - Parameters:
    ///   - feature: The gated feature the user tried to access.
    ///   - source: Where in the app the gate was encountered.
    func trackEntitlementGateHit(feature: GatedFeature, source: String? = nil) {
        track(.entitlementGateHit, properties: .init(
            tier: feature.requiredTier.rawValue,
            feature: feature.rawValue,
            source: source
        ))
    }

    /// Tracks a billing period change event.
    ///
    /// - Parameter newPeriod: The newly selected billing period.
    func trackBillingPeriodChanged(to newPeriod: BillingPeriod) {
        track(.billingPeriodChanged, properties: .init(
            billingPeriod: newPeriod.rawValue
        ))
    }

    /// Tracks when the user opens subscription management.
    func trackSubscriptionManagementOpened() {
        track(.subscriptionManagementOpened)
    }
}
