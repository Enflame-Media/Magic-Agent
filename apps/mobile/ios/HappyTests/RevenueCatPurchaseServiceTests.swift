//
//  RevenueCatPurchaseServiceTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

// MARK: - RevenueCat Purchase Service Tests

final class RevenueCatPurchaseServiceTests: XCTestCase {

    // MARK: - Initial State

    func testInitialState() {
        let service = RevenueCatPurchaseService()
        XCTAssertFalse(service.isConfigured)
        XCTAssertFalse(service.isPurchasing)
        XCTAssertTrue(service.activeEntitlements.isEmpty)
        XCTAssertFalse(service.isPro)
        XCTAssertFalse(service.isTeam)
    }

    func testInitialSubscriptionStatus() {
        let service = RevenueCatPurchaseService()
        // Before configuration, status is .loading
        if case .loading = service.subscriptionStatus {
            // Expected
        } else {
            XCTFail("Expected .loading status, got \(service.subscriptionStatus)")
        }
    }

    func testAvailablePlansInitiallyEmpty() {
        let service = RevenueCatPurchaseService()
        XCTAssertTrue(service.availablePlans.isEmpty)
    }

    // MARK: - Configuration

    func testConfigureWithEmptyApiKey() {
        let service = RevenueCatPurchaseService()
        let config = RevenueCatConfiguration(apiKey: "", appUserID: nil, debugLogsEnabled: false)
        service.configure(with: config)
        // Should not be configured with empty key
        XCTAssertFalse(service.isConfigured)
    }

    func testDefaultConfiguration() {
        let config = RevenueCatConfiguration.default
        // In test environment, env var is not set
        XCTAssertTrue(config.apiKey.isEmpty)
    }

    // MARK: - Entitlement Checking

    func testHasEntitlementWhenEmpty() {
        let service = RevenueCatPurchaseService()
        XCTAssertFalse(service.hasEntitlement("pro"))
        XCTAssertFalse(service.hasEntitlement("team"))
    }

    func testIsProWhenNotConfigured() {
        let service = RevenueCatPurchaseService()
        XCTAssertFalse(service.isPro)
    }

    func testIsTeamWhenNotConfigured() {
        let service = RevenueCatPurchaseService()
        XCTAssertFalse(service.isTeam)
    }

    // MARK: - Load Products Without Configuration

    func testLoadProductsWithoutConfiguration() async {
        let service = RevenueCatPurchaseService()
        // Without configuration, should throw or use StoreKit fallback
        do {
            try await service.loadProducts()
            // In test environment, StoreKit products won't be available
            // So either it throws or returns empty
        } catch {
            // Expected in test environment
            XCTAssertTrue(error is PurchaseError)
        }
    }

    // MARK: - Restore Without Configuration

    func testRestoreWithoutConfiguration() async {
        let service = RevenueCatPurchaseService()
        do {
            try await service.restorePurchases()
            // May succeed via StoreKit fallback (no-op in test)
        } catch {
            // Expected
            XCTAssertTrue(error is PurchaseError)
        }
    }
}

// MARK: - Entitlement Constants Tests

final class EntitlementConstantsTests: XCTestCase {

    func testEntitlementProConstant() {
        XCTAssertEqual(Entitlement.pro, "pro")
    }

    func testEntitlementTeamConstant() {
        XCTAssertEqual(Entitlement.team, "team")
    }

    func testEntitlementAllContainsBothTiers() {
        XCTAssertEqual(Entitlement.all.count, 2)
        XCTAssertTrue(Entitlement.all.contains(Entitlement.pro))
        XCTAssertTrue(Entitlement.all.contains(Entitlement.team))
    }
}

// MARK: - Entitlement Service Tests

final class EntitlementServiceTests: XCTestCase {

    private var mockService: MockPurchaseService!
    private var entitlementService: EntitlementService!

    override func setUp() {
        super.setUp()
        mockService = MockPurchaseService()
        entitlementService = EntitlementService(purchaseService: mockService)
    }

    override func tearDown() {
        entitlementService = nil
        mockService = nil
        super.tearDown()
    }

    // MARK: - Free Tier Access

    func testFreeUserCannotAccessProFeatures() {
        mockService.subscriptionStatus = .notSubscribed
        XCTAssertFalse(entitlementService.canAccess(.unlimitedSessions))
        XCTAssertFalse(entitlementService.canAccess(.multiDevice))
        XCTAssertFalse(entitlementService.canAccess(.voiceFeatures))
    }

    func testFreeUserCannotAccessTeamFeatures() {
        mockService.subscriptionStatus = .notSubscribed
        XCTAssertFalse(entitlementService.canAccess(.teamManagement))
        XCTAssertFalse(entitlementService.canAccess(.sharedSessions))
    }

    // MARK: - Pro Tier Access

    func testProUserCanAccessProFeatures() {
        mockService.subscriptionStatus = .subscribed(SubscriptionInfo(
            tier: .pro,
            productId: ProductIdentifier.proMonthly,
            purchaseDate: Date(),
            expirationDate: Date().addingTimeInterval(86400 * 30),
            willAutoRenew: true,
            billingPeriod: .monthly
        ))
        XCTAssertTrue(entitlementService.canAccess(.unlimitedSessions))
        XCTAssertTrue(entitlementService.canAccess(.multiDevice))
        XCTAssertTrue(entitlementService.canAccess(.voiceFeatures))
        XCTAssertTrue(entitlementService.canAccess(.artifactViewer))
    }

    func testProUserCannotAccessTeamFeatures() {
        mockService.subscriptionStatus = .subscribed(SubscriptionInfo(
            tier: .pro,
            productId: ProductIdentifier.proMonthly,
            purchaseDate: Date(),
            expirationDate: Date().addingTimeInterval(86400 * 30),
            willAutoRenew: true,
            billingPeriod: .monthly
        ))
        XCTAssertFalse(entitlementService.canAccess(.teamManagement))
        XCTAssertFalse(entitlementService.canAccess(.sharedSessions))
        XCTAssertFalse(entitlementService.canAccess(.adminControls))
    }

    // MARK: - Team Tier Access

    func testTeamUserCanAccessAllFeatures() {
        mockService.subscriptionStatus = .subscribed(SubscriptionInfo(
            tier: .team,
            productId: ProductIdentifier.teamMonthly,
            purchaseDate: Date(),
            expirationDate: Date().addingTimeInterval(86400 * 30),
            willAutoRenew: true,
            billingPeriod: .monthly
        ))

        for feature in GatedFeature.allCases {
            XCTAssertTrue(
                entitlementService.canAccess(feature),
                "Team user should access \(feature.rawValue)"
            )
        }
    }

    // MARK: - Accessible/Locked Features

    func testFreeUserLockedFeatures() {
        mockService.subscriptionStatus = .notSubscribed
        let locked = entitlementService.lockedFeatures
        XCTAssertEqual(locked.count, GatedFeature.allCases.count)
    }

    func testFreeUserAccessibleFeatures() {
        mockService.subscriptionStatus = .notSubscribed
        let accessible = entitlementService.accessibleFeatures
        XCTAssertTrue(accessible.isEmpty)
    }

    func testTeamUserAccessibleFeatures() {
        mockService.subscriptionStatus = .subscribed(SubscriptionInfo(
            tier: .team,
            productId: ProductIdentifier.teamMonthly,
            purchaseDate: Date(),
            expirationDate: Date().addingTimeInterval(86400 * 30),
            willAutoRenew: true,
            billingPeriod: .monthly
        ))
        let accessible = entitlementService.accessibleFeatures
        XCTAssertEqual(accessible.count, GatedFeature.allCases.count)
    }

    // MARK: - Premium Check

    func testIsPremiumWhenFree() {
        mockService.subscriptionStatus = .notSubscribed
        XCTAssertFalse(entitlementService.isPremium)
    }

    func testIsPremiumWhenSubscribed() {
        mockService.subscriptionStatus = .subscribed(SubscriptionInfo.sampleActive)
        XCTAssertTrue(entitlementService.isPremium)
    }

    // MARK: - Tier Needed

    func testTierNeededForLockedFeature() {
        mockService.subscriptionStatus = .notSubscribed
        let needed = entitlementService.tierNeeded(for: .unlimitedSessions)
        XCTAssertEqual(needed, .pro)
    }

    func testTierNeededForAccessibleFeature() {
        mockService.subscriptionStatus = .subscribed(SubscriptionInfo.sampleActive)
        let needed = entitlementService.tierNeeded(for: .unlimitedSessions)
        XCTAssertNil(needed)
    }

    func testTierNeededForTeamFeature() {
        mockService.subscriptionStatus = .notSubscribed
        let needed = entitlementService.tierNeeded(for: .teamManagement)
        XCTAssertEqual(needed, .team)
    }

    // MARK: - Upgrade Message

    func testUpgradeMessage() {
        mockService.subscriptionStatus = .notSubscribed
        let message = entitlementService.upgradeMessage(for: .voiceFeatures)
        XCTAssertFalse(message.isEmpty)
    }
}

// MARK: - GatedFeature Tests

final class GatedFeatureTests: XCTestCase {

    func testAllCasesHaveDisplayNames() {
        for feature in GatedFeature.allCases {
            XCTAssertFalse(feature.displayName.isEmpty, "\(feature.rawValue) has no display name")
        }
    }

    func testAllCasesHaveRequiredTier() {
        for feature in GatedFeature.allCases {
            // All gated features require at least .pro
            XCTAssertNotEqual(feature.requiredTier, .free, "\(feature.rawValue) should require pro or team")
        }
    }

    func testProFeaturesRequirePro() {
        let proFeatures: [GatedFeature] = [
            .unlimitedSessions, .multiDevice, .prioritySupport,
            .advancedAnalytics, .voiceFeatures, .artifactViewer
        ]
        for feature in proFeatures {
            XCTAssertEqual(feature.requiredTier, .pro, "\(feature.rawValue) should require pro")
        }
    }

    func testTeamFeaturesRequireTeam() {
        let teamFeatures: [GatedFeature] = [
            .teamManagement, .sharedSessions, .adminControls, .dedicatedSupport
        ]
        for feature in teamFeatures {
            XCTAssertEqual(feature.requiredTier, .team, "\(feature.rawValue) should require team")
        }
    }

    func testRequiredEntitlement() {
        XCTAssertEqual(GatedFeature.unlimitedSessions.requiredEntitlement, Entitlement.pro)
        XCTAssertEqual(GatedFeature.teamManagement.requiredEntitlement, Entitlement.team)
    }

    func testFeatureIdentifiable() {
        for feature in GatedFeature.allCases {
            XCTAssertEqual(feature.id, feature.rawValue)
        }
    }
}

// MARK: - Purchase Analytics Service Tests

final class PurchaseAnalyticsServiceTests: XCTestCase {

    func testSharedInstance() {
        let instance1 = PurchaseAnalyticsService.shared
        let instance2 = PurchaseAnalyticsService.shared
        XCTAssertTrue(instance1 === instance2)
    }

    func testDefaultEnabled() {
        XCTAssertTrue(PurchaseAnalyticsService.shared.isEnabled)
    }

    func testTrackDoesNotCrash() {
        let service = PurchaseAnalyticsService.shared
        service.track(.paywallPresented)
        service.track(.purchaseStarted, properties: .init(productId: "test", tier: "pro"))
        service.track(.purchaseCompleted, properties: .init(productId: "test"))
        service.track(.purchaseFailed, properties: .init(error: "test error"))
        service.track(.purchaseCancelled)
        service.track(.purchaseRestoreStarted)
        service.track(.purchaseRestored)
        service.track(.purchaseRestoreFailed, properties: .init(error: "restore error"))
        service.track(.billingPeriodChanged, properties: .init(billingPeriod: "monthly"))
        service.track(.subscriptionManagementOpened)
        service.track(.entitlementGateHit, properties: .init(feature: "voice_features"))
    }

    func testConvenienceMethodsDoNotCrash() {
        let service = PurchaseAnalyticsService.shared
        service.trackPaywallPresented(source: "settings")
        service.trackPaywallDismissed()
        service.trackPurchaseStarted(plan: .sampleProMonthly)
        service.trackPurchaseCompleted(plan: .sampleProMonthly)
        service.trackPurchaseFailed(plan: .sampleProMonthly, error: PurchaseError.purchaseFailed("test"))
        service.trackPurchaseCancelled(plan: .sampleProMonthly)
        service.trackRestoreStarted()
        service.trackRestoreCompleted()
        service.trackRestoreFailed(error: PurchaseError.storeKitError("test"))
        service.trackEntitlementGateHit(feature: .voiceFeatures, source: "session_detail")
        service.trackBillingPeriodChanged(to: .annual)
        service.trackSubscriptionManagementOpened()
    }

    func testDisabledAnalyticsDoesNotCrash() {
        let service = PurchaseAnalyticsService.shared
        let wasEnabled = service.isEnabled
        service.isEnabled = false
        service.track(.paywallPresented)
        service.isEnabled = wasEnabled
    }
}

// MARK: - Purchase Analytics Properties Tests

final class PurchaseAnalyticsPropertiesTests: XCTestCase {

    func testDefaultProperties() {
        let props = PurchaseAnalyticsProperties()
        XCTAssertEqual(props.platform, "ios")
        XCTAssertNil(props.timestamp)
        XCTAssertNil(props.productId)
    }

    func testToDictionaryWithAllProperties() {
        let props = PurchaseAnalyticsProperties(
            platform: "ios",
            timestamp: "2026-02-06T12:00:00Z",
            productId: "media.enflame.happy.ios.pro.monthly",
            tier: "pro",
            billingPeriod: "monthly",
            price: "$9.99",
            offeringId: "default",
            feature: "voice_features",
            error: nil,
            source: "settings"
        )
        let dict = props.toDictionary()
        XCTAssertEqual(dict["platform"] as? String, "ios")
        XCTAssertEqual(dict["timestamp"] as? String, "2026-02-06T12:00:00Z")
        XCTAssertEqual(dict["product_id"] as? String, "media.enflame.happy.ios.pro.monthly")
        XCTAssertEqual(dict["tier"] as? String, "pro")
        XCTAssertEqual(dict["billing_period"] as? String, "monthly")
        XCTAssertEqual(dict["price"] as? String, "$9.99")
        XCTAssertEqual(dict["offering_id"] as? String, "default")
        XCTAssertEqual(dict["feature"] as? String, "voice_features")
        XCTAssertNil(dict["error"])
        XCTAssertEqual(dict["source"] as? String, "settings")
    }

    func testToDictionaryOmitsNilValues() {
        let props = PurchaseAnalyticsProperties()
        let dict = props.toDictionary()
        XCTAssertEqual(dict.count, 1) // Only platform
        XCTAssertEqual(dict["platform"] as? String, "ios")
    }
}

// MARK: - Purchase Analytics Event Tests

final class PurchaseAnalyticsEventTests: XCTestCase {

    func testAllEventsHaveRawValues() {
        for event in PurchaseAnalyticsEvent.allCases {
            XCTAssertFalse(event.rawValue.isEmpty, "\(event) has empty raw value")
        }
    }

    func testEventRawValuesAreSnakeCase() {
        for event in PurchaseAnalyticsEvent.allCases {
            XCTAssertTrue(
                event.rawValue.allSatisfy { $0.isLowercase || $0 == "_" },
                "\(event.rawValue) is not snake_case"
            )
        }
    }

    func testExpectedEventNames() {
        XCTAssertEqual(PurchaseAnalyticsEvent.paywallPresented.rawValue, "paywall_presented")
        XCTAssertEqual(PurchaseAnalyticsEvent.purchaseStarted.rawValue, "purchase_started")
        XCTAssertEqual(PurchaseAnalyticsEvent.purchaseCompleted.rawValue, "purchase_completed")
        XCTAssertEqual(PurchaseAnalyticsEvent.purchaseFailed.rawValue, "purchase_failed")
        XCTAssertEqual(PurchaseAnalyticsEvent.purchaseRestored.rawValue, "purchase_restored")
    }
}

// MARK: - RevenueCat Configuration Tests

final class RevenueCatConfigurationTests: XCTestCase {

    func testDefaultConfigurationProperties() {
        let config = RevenueCatConfiguration.default
        XCTAssertNil(config.appUserID)
        // apiKey depends on environment
    }

    func testCustomConfiguration() {
        let config = RevenueCatConfiguration(
            apiKey: "test_api_key",
            appUserID: "user123",
            debugLogsEnabled: true
        )
        XCTAssertEqual(config.apiKey, "test_api_key")
        XCTAssertEqual(config.appUserID, "user123")
        XCTAssertTrue(config.debugLogsEnabled)
    }
}

// MARK: - Updated PurchaseViewModel Tests with Analytics

final class PurchaseViewModelAnalyticsTests: XCTestCase {

    private var mockService: MockPurchaseService!
    private var viewModel: PurchaseViewModel!

    override func setUp() {
        super.setUp()
        mockService = MockPurchaseService()
        viewModel = PurchaseViewModel(purchaseService: mockService)
    }

    override func tearDown() {
        viewModel = nil
        mockService = nil
        super.tearDown()
    }

    @MainActor
    func testPurchaseTracksAnalytics() async {
        let plan = SubscriptionPlan.sampleProMonthly
        // This should not crash and should track events
        await viewModel.purchase(plan)
        XCTAssertTrue(mockService.purchaseCalled)
    }

    @MainActor
    func testRestoreTracksAnalytics() async {
        await viewModel.restorePurchases()
        XCTAssertTrue(mockService.restorePurchasesCalled)
    }

    func testBillingPeriodChange() {
        viewModel.billingPeriodDidChange(to: .annual)
        XCTAssertEqual(viewModel.selectedBillingPeriod, .annual)
    }

    func testCanAccessDelegatesEntitlementService() {
        // With mock service at .notSubscribed, all features should be locked
        XCTAssertFalse(viewModel.canAccess(.voiceFeatures))
    }
}
