//
//  SubscriptionPlan.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Subscription Tier

/// The tier of a subscription plan, defining the level of access.
enum SubscriptionTier: String, Codable, CaseIterable, Identifiable {
    case free
    case pro
    case team

    var id: String { rawValue }

    /// Human-readable display name for the tier.
    var displayName: String {
        switch self {
        case .free:
            return NSLocalizedString("subscription.tier.free", comment: "Free tier name")
        case .pro:
            return NSLocalizedString("subscription.tier.pro", comment: "Pro tier name")
        case .team:
            return NSLocalizedString("subscription.tier.team", comment: "Team tier name")
        }
    }

    /// Short description of tier benefits.
    var tierDescription: String {
        switch self {
        case .free:
            return NSLocalizedString("subscription.tier.free.description", comment: "Free tier description")
        case .pro:
            return NSLocalizedString("subscription.tier.pro.description", comment: "Pro tier description")
        case .team:
            return NSLocalizedString("subscription.tier.team.description", comment: "Team tier description")
        }
    }
}

// MARK: - Billing Period

/// The billing period for a subscription plan.
enum BillingPeriod: String, Codable, CaseIterable, Identifiable {
    case monthly
    case annual

    var id: String { rawValue }

    /// Human-readable display name for the billing period.
    var displayName: String {
        switch self {
        case .monthly:
            return NSLocalizedString("subscription.billing.monthly", comment: "Monthly billing")
        case .annual:
            return NSLocalizedString("subscription.billing.annual", comment: "Annual billing")
        }
    }
}

// MARK: - Subscription Plan

/// Represents a subscription plan available for purchase.
struct SubscriptionPlan: Identifiable, Equatable, Hashable {
    /// The StoreKit product identifier.
    let id: String

    /// The tier this plan belongs to.
    let tier: SubscriptionTier

    /// The billing period for this plan.
    let billingPeriod: BillingPeriod

    /// The display price string (e.g., "$9.99/mo").
    var displayPrice: String

    /// The raw price value in the local currency.
    var price: Decimal

    /// Features included in this plan.
    let features: [PlanFeature]

    /// Whether this plan is currently being offered as the recommended option.
    var isRecommended: Bool

    static func == (lhs: SubscriptionPlan, rhs: SubscriptionPlan) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Plan Feature

/// A feature included in a subscription plan.
struct PlanFeature: Identifiable, Equatable, Hashable {
    let id: String
    let title: String
    let description: String?
    let iconName: String

    init(id: String = UUID().uuidString, title: String, description: String? = nil, iconName: String = "checkmark.circle.fill") {
        self.id = id
        self.title = title
        self.description = description
        self.iconName = iconName
    }
}

// MARK: - Subscription Status

/// The current subscription status for the user.
enum SubscriptionStatus: Equatable {
    case notSubscribed
    case subscribed(SubscriptionInfo)
    case expired(SubscriptionInfo)
    case revoked
    case loading
    case error(String)

    /// Whether the user has an active subscription.
    var isActive: Bool {
        if case .subscribed = self { return true }
        return false
    }

    /// The current tier, if subscribed.
    var currentTier: SubscriptionTier? {
        switch self {
        case .subscribed(let info):
            return info.tier
        case .expired(let info):
            return info.tier
        default:
            return nil
        }
    }
}

// MARK: - Subscription Info

/// Detailed information about an active or expired subscription.
struct SubscriptionInfo: Equatable {
    /// The tier of the subscription.
    let tier: SubscriptionTier

    /// The product identifier.
    let productId: String

    /// When the subscription was originally purchased.
    let purchaseDate: Date

    /// When the current subscription period expires.
    let expirationDate: Date?

    /// Whether the subscription will auto-renew.
    let willAutoRenew: Bool

    /// The billing period.
    let billingPeriod: BillingPeriod

    /// Whether the subscription is in a grace period.
    var isInGracePeriod: Bool {
        guard let expirationDate = expirationDate else { return false }
        return expirationDate < Date() && willAutoRenew
    }

    /// Whether the subscription has expired.
    var isExpired: Bool {
        guard let expirationDate = expirationDate else { return false }
        return expirationDate < Date() && !willAutoRenew
    }

    /// Days remaining in the current subscription period.
    var daysRemaining: Int? {
        guard let expirationDate = expirationDate else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: Date(), to: expirationDate)
        return max(0, components.day ?? 0)
    }
}

// MARK: - Product Identifiers

/// StoreKit product identifiers for Happy subscriptions.
enum ProductIdentifier {
    /// Bundle identifier prefix for all product identifiers.
    static let prefix = "media.enflame.happy.ios"

    /// Monthly Pro subscription product identifier.
    static let proMonthly = "\(prefix).pro.monthly"

    /// Annual Pro subscription product identifier.
    static let proAnnual = "\(prefix).pro.annual"

    /// Monthly Team subscription product identifier.
    static let teamMonthly = "\(prefix).team.monthly"

    /// Annual Team subscription product identifier.
    static let teamAnnual = "\(prefix).team.annual"

    /// All subscription product identifiers.
    static let allSubscriptions: Set<String> = [
        proMonthly,
        proAnnual,
        teamMonthly,
        teamAnnual
    ]

    /// Determine the tier for a given product identifier.
    static func tier(for productId: String) -> SubscriptionTier {
        if productId.contains("team") {
            return .team
        } else if productId.contains("pro") {
            return .pro
        }
        return .free
    }

    /// Determine the billing period for a given product identifier.
    static func billingPeriod(for productId: String) -> BillingPeriod {
        if productId.contains("annual") {
            return .annual
        }
        return .monthly
    }
}

// MARK: - Sample Data

extension SubscriptionPlan {
    /// Sample free plan for previews and testing.
    static let sampleFree = SubscriptionPlan(
        id: "free",
        tier: .free,
        billingPeriod: .monthly,
        displayPrice: NSLocalizedString("subscription.price.free", comment: "Free price"),
        price: 0,
        features: [
            PlanFeature(title: NSLocalizedString("subscription.feature.basicAccess", comment: ""), iconName: "person.fill"),
            PlanFeature(title: NSLocalizedString("subscription.feature.singleDevice", comment: ""), iconName: "iphone"),
            PlanFeature(title: NSLocalizedString("subscription.feature.limitedSessions", comment: ""), iconName: "clock")
        ],
        isRecommended: false
    )

    /// Sample Pro monthly plan for previews and testing.
    static let sampleProMonthly = SubscriptionPlan(
        id: ProductIdentifier.proMonthly,
        tier: .pro,
        billingPeriod: .monthly,
        displayPrice: "$9.99/mo",
        price: 9.99,
        features: [
            PlanFeature(title: NSLocalizedString("subscription.feature.unlimitedSessions", comment: ""), iconName: "infinity"),
            PlanFeature(title: NSLocalizedString("subscription.feature.multiDevice", comment: ""), iconName: "laptopcomputer.and.iphone"),
            PlanFeature(title: NSLocalizedString("subscription.feature.prioritySupport", comment: ""), iconName: "star.fill"),
            PlanFeature(title: NSLocalizedString("subscription.feature.advancedAnalytics", comment: ""), iconName: "chart.bar.fill")
        ],
        isRecommended: true
    )

    /// Sample Pro annual plan for previews and testing.
    static let sampleProAnnual = SubscriptionPlan(
        id: ProductIdentifier.proAnnual,
        tier: .pro,
        billingPeriod: .annual,
        displayPrice: "$99.99/yr",
        price: 99.99,
        features: SubscriptionPlan.sampleProMonthly.features,
        isRecommended: false
    )
}

extension SubscriptionInfo {
    /// Sample subscription info for previews and testing.
    static let sampleActive = SubscriptionInfo(
        tier: .pro,
        productId: ProductIdentifier.proMonthly,
        purchaseDate: Calendar.current.date(byAdding: .month, value: -3, to: Date()) ?? Date(),
        expirationDate: Calendar.current.date(byAdding: .month, value: 1, to: Date()),
        willAutoRenew: true,
        billingPeriod: .monthly
    )
}
