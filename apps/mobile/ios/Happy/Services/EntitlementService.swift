//
//  EntitlementService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Gated Feature

/// Features that require specific entitlements to access.
///
/// Each case defines a premium feature and the minimum subscription
/// tier required to unlock it.
enum GatedFeature: String, CaseIterable, Identifiable {
    /// Unlimited concurrent sessions.
    case unlimitedSessions = "unlimited_sessions"

    /// Multi-device synchronization.
    case multiDevice = "multi_device"

    /// Priority customer support.
    case prioritySupport = "priority_support"

    /// Advanced session analytics.
    case advancedAnalytics = "advanced_analytics"

    /// Voice assistant features (ElevenLabs TTS).
    case voiceFeatures = "voice_features"

    /// Team management and shared sessions.
    case teamManagement = "team_management"

    /// Shared sessions with team members.
    case sharedSessions = "shared_sessions"

    /// Admin controls for team settings.
    case adminControls = "admin_controls"

    /// Dedicated customer support.
    case dedicatedSupport = "dedicated_support"

    /// Artifact code viewer with syntax highlighting.
    case artifactViewer = "artifact_viewer"

    var id: String { rawValue }

    /// The minimum subscription tier required for this feature.
    var requiredTier: SubscriptionTier {
        switch self {
        case .unlimitedSessions, .multiDevice, .prioritySupport,
             .advancedAnalytics, .voiceFeatures, .artifactViewer:
            return .pro
        case .teamManagement, .sharedSessions, .adminControls,
             .dedicatedSupport:
            return .team
        }
    }

    /// Human-readable display name for the feature.
    var displayName: String {
        switch self {
        case .unlimitedSessions:
            return NSLocalizedString("entitlement.feature.unlimitedSessions", comment: "Unlimited sessions feature")
        case .multiDevice:
            return NSLocalizedString("entitlement.feature.multiDevice", comment: "Multi-device sync feature")
        case .prioritySupport:
            return NSLocalizedString("entitlement.feature.prioritySupport", comment: "Priority support feature")
        case .advancedAnalytics:
            return NSLocalizedString("entitlement.feature.advancedAnalytics", comment: "Advanced analytics feature")
        case .voiceFeatures:
            return NSLocalizedString("entitlement.feature.voiceFeatures", comment: "Voice features")
        case .teamManagement:
            return NSLocalizedString("entitlement.feature.teamManagement", comment: "Team management feature")
        case .sharedSessions:
            return NSLocalizedString("entitlement.feature.sharedSessions", comment: "Shared sessions feature")
        case .adminControls:
            return NSLocalizedString("entitlement.feature.adminControls", comment: "Admin controls feature")
        case .dedicatedSupport:
            return NSLocalizedString("entitlement.feature.dedicatedSupport", comment: "Dedicated support feature")
        case .artifactViewer:
            return NSLocalizedString("entitlement.feature.artifactViewer", comment: "Artifact viewer feature")
        }
    }

    /// The required entitlement ID in RevenueCat for this feature.
    var requiredEntitlement: String {
        switch requiredTier {
        case .free:
            return ""
        case .pro:
            return Entitlement.pro
        case .team:
            return Entitlement.team
        }
    }
}

// MARK: - Entitlement Service

/// Service for checking feature entitlements and gating access to premium features.
///
/// Works with `RevenueCatPurchaseService` to determine which features
/// the current user can access based on their subscription status.
///
/// ## Usage
/// ```swift
/// let entitlementService = EntitlementService.shared
///
/// if entitlementService.canAccess(.voiceFeatures) {
///     // Show voice controls
/// } else {
///     // Show upgrade prompt
/// }
/// ```
final class EntitlementService: ObservableObject {

    // MARK: - Singleton

    static let shared = EntitlementService()

    // MARK: - Dependencies

    private let purchaseService: PurchaseProviding

    // MARK: - Initialization

    /// Creates an entitlement service backed by the given purchase service.
    ///
    /// - Parameter purchaseService: The purchase service providing subscription status.
    ///   Defaults to `RevenueCatPurchaseService.shared`.
    init(purchaseService: PurchaseProviding = RevenueCatPurchaseService.shared) {
        self.purchaseService = purchaseService
    }

    // MARK: - Feature Access

    /// Checks whether the current user can access a gated feature.
    ///
    /// - Parameter feature: The feature to check access for.
    /// - Returns: `true` if the user's subscription meets the minimum tier requirement.
    func canAccess(_ feature: GatedFeature) -> Bool {
        let currentTier = currentSubscriptionTier

        switch feature.requiredTier {
        case .free:
            return true
        case .pro:
            return currentTier == .pro || currentTier == .team
        case .team:
            return currentTier == .team
        }
    }

    /// Returns all features accessible to the current user.
    var accessibleFeatures: [GatedFeature] {
        GatedFeature.allCases.filter { canAccess($0) }
    }

    /// Returns all features that require an upgrade.
    var lockedFeatures: [GatedFeature] {
        GatedFeature.allCases.filter { !canAccess($0) }
    }

    /// The current user's subscription tier based on subscription status.
    var currentSubscriptionTier: SubscriptionTier {
        // If using RevenueCatPurchaseService, check entitlements directly
        if let rcService = purchaseService as? RevenueCatPurchaseService {
            if rcService.isTeam { return .team }
            if rcService.isPro { return .pro }
            return .free
        }

        // Fallback: check subscription status
        return purchaseService.subscriptionStatus.currentTier ?? .free
    }

    /// Whether the user has any premium subscription.
    var isPremium: Bool {
        currentSubscriptionTier != .free
    }

    // MARK: - Feature Gating Helpers

    /// Returns the upgrade tier needed to access a locked feature.
    ///
    /// - Parameter feature: The gated feature.
    /// - Returns: The tier needed, or `nil` if already accessible.
    func tierNeeded(for feature: GatedFeature) -> SubscriptionTier? {
        guard !canAccess(feature) else { return nil }
        return feature.requiredTier
    }

    /// Returns a human-readable message for a locked feature.
    ///
    /// - Parameter feature: The gated feature.
    /// - Returns: A localized string describing the upgrade needed.
    func upgradeMessage(for feature: GatedFeature) -> String {
        let tierName = feature.requiredTier.displayName
        return String(
            format: NSLocalizedString(
                "entitlement.upgradeRequired",
                comment: "Upgrade message format"
            ),
            feature.displayName,
            tierName
        )
    }
}
