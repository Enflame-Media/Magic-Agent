//
//  AnalyticsService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// Analytics service for tracking purchase funnel events.
///
/// Provides type-safe analytics tracking matching the TypeScript implementation
/// in `@happy-vue/shared/analytics/types.ts`.
///
/// ## Usage
/// ```swift
/// AnalyticsService.shared.trackPurchaseEvent(.paywallPresented, properties: [
///     .platform: "macos",
///     .offeringId: "default"
/// ])
/// ```
///
/// ## Integration
/// Currently logs events for debugging. Can be extended to send to:
/// - Amplitude
/// - Mixpanel
/// - Firebase Analytics
/// - RevenueCat
@MainActor
final class AnalyticsService {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = AnalyticsService()

    // MARK: - Configuration

    /// Whether analytics logging is enabled.
    var isEnabled: Bool = true

    /// Whether to print events to console (for debugging).
    var debugLogging: Bool = true

    // MARK: - Initialization

    private init() {}

    // MARK: - Event Tracking

    /// Track a purchase analytics event.
    /// - Parameters:
    ///   - event: The event type to track.
    ///   - properties: Event properties and metadata.
    func trackPurchaseEvent(_ event: PurchaseAnalyticsEvent, properties: PurchaseEventProperties) {
        guard isEnabled else { return }

        // Add timestamp if not present
        var finalProperties = properties
        if finalProperties.timestamp == nil {
            finalProperties.timestamp = ISO8601DateFormatter().string(from: Date())
        }

        // Ensure platform is set to macOS
        if finalProperties.platform == nil {
            finalProperties.platform = .macos
        }

        if debugLogging {
            print("[Analytics] \(event.rawValue): \(finalProperties.toDictionary())")
        }

        // TODO: Send to analytics provider (Amplitude, Mixpanel, etc.)
        // This is where you would integrate with your analytics SDK:
        //
        // Amplitude.instance().logEvent(event.rawValue, withEventProperties: finalProperties.toDictionary())
        // or
        // Mixpanel.mainInstance().track(event: event.rawValue, properties: finalProperties.toDictionary())
    }

    /// Track a purchase analytics event with dictionary properties (convenience).
    /// - Parameters:
    ///   - event: The event type to track.
    ///   - properties: Dictionary of event properties.
    func trackPurchaseEvent(_ event: PurchaseAnalyticsEvent, properties: [PurchaseEventProperty: Any]) {
        let eventProperties = PurchaseEventProperties(from: properties)
        trackPurchaseEvent(event, properties: eventProperties)
    }
}

// MARK: - Purchase Analytics Events

/// Purchase funnel analytics events.
///
/// These events track the complete user journey through the purchase funnel.
/// Matches the TypeScript `PurchaseAnalyticsEvent` enum.
enum PurchaseAnalyticsEvent: String {
    /// Paywall was displayed to the user.
    case paywallPresented = "paywall_presented"

    /// User initiated a purchase.
    case purchaseStarted = "purchase_started"

    /// Purchase completed successfully.
    case purchaseCompleted = "purchase_completed"

    /// User cancelled the purchase.
    case purchaseCancelled = "purchase_cancelled"

    /// Purchase failed due to an error.
    case purchaseFailed = "purchase_failed"

    /// User initiated restore purchases.
    case restoreStarted = "restore_started"

    /// Restore purchases completed.
    case restoreCompleted = "restore_completed"
}

// MARK: - Analytics Platform

/// Platform identifier for analytics events.
enum AnalyticsPlatform: String {
    case web = "web"
    case mobile = "mobile"
    case macos = "macos"
}

// MARK: - Event Properties

/// Keys for purchase event properties.
enum PurchaseEventProperty: String {
    /// Platform where the event occurred.
    case platform

    /// ISO timestamp when the event occurred.
    case timestamp

    /// User ID if available.
    case userId

    /// Offering identifier that was displayed.
    case offeringId

    /// Source/trigger that caused paywall to appear.
    case source

    /// Package identifier (e.g., "$rc_monthly").
    case packageId

    /// Product identifier from the store.
    case productId

    /// Price amount in the user's currency.
    case price

    /// Currency code (e.g., "USD").
    case currency

    /// Error code from the purchase system.
    case errorCode

    /// Human-readable error message.
    case errorMessage

    /// Number of purchases restored (for completed events).
    case restoredCount

    /// Whether any pro entitlement was restored.
    case restoredPro
}

/// Properties for purchase analytics events.
///
/// Matches the TypeScript `PurchaseEventProperties_All` interface.
struct PurchaseEventProperties {
    // MARK: - Base Properties

    /// Platform where the event occurred.
    var platform: AnalyticsPlatform?

    /// ISO timestamp when the event occurred.
    var timestamp: String?

    /// User ID if available.
    var userId: String?

    // MARK: - Paywall Properties

    /// Offering identifier that was displayed.
    var offeringId: String?

    /// Source/trigger that caused paywall to appear.
    var source: String?

    // MARK: - Purchase Properties

    /// Package identifier (e.g., "$rc_monthly").
    var packageId: String?

    /// Product identifier from the store.
    var productId: String?

    /// Price amount in the user's currency.
    var price: Decimal?

    /// Currency code (e.g., "USD").
    var currency: String?

    // MARK: - Error Properties

    /// Error code from the purchase system.
    var errorCode: String?

    /// Human-readable error message.
    var errorMessage: String?

    // MARK: - Restore Properties

    /// Number of purchases restored (for completed events).
    var restoredCount: Int?

    /// Whether any pro entitlement was restored.
    var restoredPro: Bool?

    // MARK: - Initialization

    /// Create empty properties.
    init() {}

    /// Create properties from a dictionary.
    init(from dictionary: [PurchaseEventProperty: Any]) {
        if let platform = dictionary[.platform] as? AnalyticsPlatform {
            self.platform = platform
        } else if let platformString = dictionary[.platform] as? String {
            self.platform = AnalyticsPlatform(rawValue: platformString)
        }

        timestamp = dictionary[.timestamp] as? String
        userId = dictionary[.userId] as? String
        offeringId = dictionary[.offeringId] as? String
        source = dictionary[.source] as? String
        packageId = dictionary[.packageId] as? String
        productId = dictionary[.productId] as? String
        currency = dictionary[.currency] as? String
        errorCode = dictionary[.errorCode] as? String
        errorMessage = dictionary[.errorMessage] as? String
        restoredCount = dictionary[.restoredCount] as? Int
        restoredPro = dictionary[.restoredPro] as? Bool

        if let priceDecimal = dictionary[.price] as? Decimal {
            price = priceDecimal
        } else if let priceDouble = dictionary[.price] as? Double {
            price = Decimal(priceDouble)
        }
    }

    // MARK: - Conversion

    /// Convert to a dictionary for analytics providers.
    func toDictionary() -> [String: Any] {
        var result: [String: Any] = [:]

        if let platform = platform {
            result["platform"] = platform.rawValue
        }
        if let timestamp = timestamp {
            result["timestamp"] = timestamp
        }
        if let userId = userId {
            result["userId"] = userId
        }
        if let offeringId = offeringId {
            result["offeringId"] = offeringId
        }
        if let source = source {
            result["source"] = source
        }
        if let packageId = packageId {
            result["packageId"] = packageId
        }
        if let productId = productId {
            result["productId"] = productId
        }
        if let price = price {
            result["price"] = NSDecimalNumber(decimal: price).doubleValue
        }
        if let currency = currency {
            result["currency"] = currency
        }
        if let errorCode = errorCode {
            result["errorCode"] = errorCode
        }
        if let errorMessage = errorMessage {
            result["errorMessage"] = errorMessage
        }
        if let restoredCount = restoredCount {
            result["restoredCount"] = restoredCount
        }
        if let restoredPro = restoredPro {
            result["restoredPro"] = restoredPro
        }

        return result
    }
}

// MARK: - Convenience Builders

extension PurchaseEventProperties {
    /// Create properties for a paywall event.
    static func paywall(offeringId: String? = nil, source: String? = nil) -> PurchaseEventProperties {
        var props = PurchaseEventProperties()
        props.platform = .macos
        props.offeringId = offeringId
        props.source = source
        return props
    }

    /// Create properties for a purchase event.
    static func purchase(package: Package) -> PurchaseEventProperties {
        var props = PurchaseEventProperties()
        props.platform = .macos
        props.packageId = package.identifier
        props.productId = package.product.identifier
        props.price = package.product.price
        props.currency = package.product.currencyCode
        return props
    }

    /// Create properties for a purchase error event.
    static func purchaseError(package: Package?, error: PurchaseError) -> PurchaseEventProperties {
        var props = PurchaseEventProperties()
        props.platform = .macos

        if let package = package {
            props.packageId = package.identifier
            props.productId = package.product.identifier
            props.price = package.product.price
            props.currency = package.product.currencyCode
        }

        // Map error to code and message
        switch error {
        case .notConfigured:
            props.errorCode = "not_configured"
            props.errorMessage = error.errorDescription
        case .productNotFound(let id):
            props.errorCode = "product_not_found"
            props.errorMessage = "Product '\(id)' not found"
        case .cancelled:
            props.errorCode = "cancelled"
            props.errorMessage = "Purchase cancelled"
        case .networkError(let message):
            props.errorCode = "network_error"
            props.errorMessage = message
        case .restoreFailed(let message):
            props.errorCode = "restore_failed"
            props.errorMessage = message
        case .alreadyOwned:
            props.errorCode = "already_owned"
            props.errorMessage = error.errorDescription
        case .unknown(let message):
            props.errorCode = "unknown"
            props.errorMessage = message
        }

        return props
    }

    /// Create properties for a restore completed event.
    static func restoreCompleted(restoredCount: Int, restoredPro: Bool) -> PurchaseEventProperties {
        var props = PurchaseEventProperties()
        props.platform = .macos
        props.restoredCount = restoredCount
        props.restoredPro = restoredPro
        return props
    }
}
