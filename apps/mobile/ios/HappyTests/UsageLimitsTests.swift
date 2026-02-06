//
//  UsageLimitsTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

/// Tests for usage data models, formatting helpers, and the usage limits view model.
final class UsageLimitsTests: XCTestCase {

    // MARK: - UsageLimit Model Tests

    func testUsageLimitUsageColorNormal() {
        let limit = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 25.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit.usageColor, .normal, "Under 50% should be normal/green")
    }

    func testUsageLimitUsageColorWarning() {
        let limit = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 65.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit.usageColor, .warning, "50-80% should be warning/yellow")
    }

    func testUsageLimitUsageColorCritical() {
        let limit = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 92.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit.usageColor, .critical, "Over 80% should be critical/red")
    }

    func testUsageLimitUsageColorBoundary50() {
        let limit = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 50.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit.usageColor, .warning, "Exactly 50% should be warning")
    }

    func testUsageLimitUsageColorBoundary80() {
        let limit = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 80.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit.usageColor, .critical, "Exactly 80% should be critical")
    }

    func testUsageLimitUsageColorZero() {
        let limit = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 0.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit.usageColor, .normal, "0% should be normal/green")
    }

    func testUsageLimitUsageColor100() {
        let limit = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 100.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit.usageColor, .critical, "100% should be critical/red")
    }

    // MARK: - UsageLimit Equatable Tests

    func testUsageLimitEquality() {
        let limit1 = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 50.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        let limit2 = UsageLimit(
            id: "test",
            label: "Test",
            percentageUsed: 50.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertEqual(limit1, limit2)
    }

    func testUsageLimitInequality() {
        let limit1 = UsageLimit(
            id: "test1",
            label: "Test 1",
            percentageUsed: 25.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        let limit2 = UsageLimit(
            id: "test2",
            label: "Test 2",
            percentageUsed: 75.0,
            resetsAt: nil,
            resetDisplayType: .countdown,
            description: nil
        )
        XCTAssertNotEqual(limit1, limit2)
    }

    // MARK: - UsageLimit Codable Tests

    func testUsageLimitDecoding() throws {
        let json = """
        {
            "id": "opus_tokens",
            "label": "Opus Tokens",
            "percentageUsed": 75.5,
            "resetsAt": 1735689600000,
            "resetDisplayType": "countdown",
            "description": "Weekly limit"
        }
        """
        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let limit = try decoder.decode(UsageLimit.self, from: data)

        XCTAssertEqual(limit.id, "opus_tokens")
        XCTAssertEqual(limit.label, "Opus Tokens")
        XCTAssertEqual(limit.percentageUsed, 75.5)
        XCTAssertEqual(limit.resetsAt, 1735689600000)
        XCTAssertEqual(limit.resetDisplayType, .countdown)
        XCTAssertEqual(limit.description, "Weekly limit")
    }

    func testUsageLimitDecodingWithNullResetsAt() throws {
        let json = """
        {
            "id": "session",
            "label": "Session Limit",
            "percentageUsed": 50.0,
            "resetsAt": null,
            "resetDisplayType": "datetime",
            "description": null
        }
        """
        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let limit = try decoder.decode(UsageLimit.self, from: data)

        XCTAssertEqual(limit.id, "session")
        XCTAssertNil(limit.resetsAt)
        XCTAssertNil(limit.description)
    }

    // MARK: - PlanLimitsResponse Codable Tests

    func testPlanLimitsResponseDecoding() throws {
        let json = """
        {
            "sessionLimit": {
                "id": "session",
                "label": "Session Limit",
                "percentageUsed": 50.0,
                "resetsAt": null,
                "resetDisplayType": "datetime",
                "description": null
            },
            "weeklyLimits": [
                {
                    "id": "opus_tokens",
                    "label": "Opus Tokens",
                    "percentageUsed": 25.0,
                    "resetsAt": 1735689600000,
                    "resetDisplayType": "countdown",
                    "description": null
                }
            ],
            "lastUpdatedAt": 1735600000000,
            "limitsAvailable": true,
            "provider": "anthropic"
        }
        """
        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let response = try decoder.decode(PlanLimitsResponse.self, from: data)

        XCTAssertNotNil(response.sessionLimit)
        XCTAssertEqual(response.sessionLimit?.id, "session")
        XCTAssertEqual(response.weeklyLimits.count, 1)
        XCTAssertEqual(response.weeklyLimits[0].id, "opus_tokens")
        XCTAssertEqual(response.lastUpdatedAt, 1735600000000)
        XCTAssertTrue(response.limitsAvailable)
        XCTAssertEqual(response.provider, "anthropic")
    }

    func testPlanLimitsResponseDecodingUnavailable() throws {
        let json = """
        {
            "weeklyLimits": [],
            "lastUpdatedAt": 1735600000000,
            "limitsAvailable": false
        }
        """
        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let response = try decoder.decode(PlanLimitsResponse.self, from: data)

        XCTAssertNil(response.sessionLimit)
        XCTAssertTrue(response.weeklyLimits.isEmpty)
        XCTAssertFalse(response.limitsAvailable)
        XCTAssertNil(response.provider)
    }

    // MARK: - UsageFormatting Tests

    func testFormatResetCountdownNil() {
        let result = UsageFormatting.formatResetCountdown(nil)
        XCTAssertNil(result, "Nil resetsAt should return nil")
    }

    func testFormatResetCountdownPast() {
        let pastTimestamp = (Date().timeIntervalSince1970 - 3600) * 1000
        let result = UsageFormatting.formatResetCountdown(pastTimestamp)
        XCTAssertNotNil(result, "Past timestamp should return 'now' string")
    }

    func testFormatResetCountdownFuture() {
        // 2 hours and 30 minutes from now
        let futureTimestamp = (Date().timeIntervalSince1970 + 2 * 3600 + 30 * 60) * 1000
        let result = UsageFormatting.formatResetCountdown(futureTimestamp)
        XCTAssertNotNil(result)
        // The result should contain hours and minutes
        XCTAssertTrue(result!.contains("2"), "Should contain hour count")
    }

    func testFormatResetCountdownMinutesOnly() {
        // 45 minutes from now
        let futureTimestamp = (Date().timeIntervalSince1970 + 45 * 60) * 1000
        let result = UsageFormatting.formatResetCountdown(futureTimestamp)
        XCTAssertNotNil(result)
    }

    func testFormatResetDatetimeNil() {
        let result = UsageFormatting.formatResetDatetime(nil)
        XCTAssertNil(result, "Nil resetsAt should return nil")
    }

    func testFormatResetDatetimeValid() {
        let timestamp = Date().timeIntervalSince1970 * 1000
        let result = UsageFormatting.formatResetDatetime(timestamp)
        XCTAssertNotNil(result, "Valid timestamp should return formatted string")
        // Should contain AM or PM
        XCTAssertTrue(result!.contains("AM") || result!.contains("PM"),
                       "Formatted datetime should contain AM or PM")
    }

    func testFormatLastUpdatedLessThanMinute() {
        let now = Date().timeIntervalSince1970 * 1000
        let result = UsageFormatting.formatLastUpdated(now)
        XCTAssertFalse(result.isEmpty, "Should return a non-empty string")
    }

    func testFormatLastUpdatedMinutesAgo() {
        let fiveMinutesAgo = (Date().timeIntervalSince1970 - 5 * 60) * 1000
        let result = UsageFormatting.formatLastUpdated(fiveMinutesAgo)
        XCTAssertTrue(result.contains("5"), "Should contain the minute count")
    }

    func testFormatLastUpdatedHoursAgo() {
        let twoHoursAgo = (Date().timeIntervalSince1970 - 2 * 3600) * 1000
        let result = UsageFormatting.formatLastUpdated(twoHoursAgo)
        XCTAssertTrue(result.contains("2"), "Should contain the hour count")
    }

    // MARK: - UsageLimitsViewModel Tests

    func testViewModelInitialState() {
        let viewModel = UsageLimitsViewModel(provider: MockUsageLimitsProvider(delay: 0))
        XCTAssertNil(viewModel.limitsData)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertFalse(viewModel.isRefreshing)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.hasLimits)
    }

    @MainActor
    func testViewModelLoadSuccess() async {
        let provider = MockUsageLimitsProvider(response: .sample, delay: 0)
        let viewModel = UsageLimitsViewModel(provider: provider)

        await viewModel.loadLimits()

        XCTAssertNotNil(viewModel.limitsData)
        XCTAssertTrue(viewModel.hasLimits)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.weeklyLimits.count, 3)
        XCTAssertNotNil(viewModel.sessionLimit)
    }

    @MainActor
    func testViewModelLoadFailure() async {
        let provider = MockUsageLimitsProvider(shouldFail: true, delay: 0)
        let viewModel = UsageLimitsViewModel(provider: provider)

        await viewModel.loadLimits()

        XCTAssertNil(viewModel.limitsData)
        XCTAssertFalse(viewModel.hasLimits)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    @MainActor
    func testViewModelLoadUnavailable() async {
        let provider = MockUsageLimitsProvider(response: .unavailable, delay: 0)
        let viewModel = UsageLimitsViewModel(provider: provider)

        await viewModel.loadLimits()

        XCTAssertNotNil(viewModel.limitsData)
        XCTAssertFalse(viewModel.hasLimits)
        XCTAssertTrue(viewModel.isUnavailable)
    }

    @MainActor
    func testViewModelRefresh() async {
        let provider = MockUsageLimitsProvider(response: .sample, delay: 0)
        let viewModel = UsageLimitsViewModel(provider: provider)

        await viewModel.loadLimits()
        XCTAssertNotNil(viewModel.limitsData)

        // Refresh should update data
        await viewModel.refresh()
        XCTAssertNotNil(viewModel.limitsData)
        XCTAssertFalse(viewModel.isRefreshing)
    }

    @MainActor
    func testViewModelLastUpdatedText() async {
        let provider = MockUsageLimitsProvider(response: .sample, delay: 0)
        let viewModel = UsageLimitsViewModel(provider: provider)

        await viewModel.loadLimits()
        XCTAssertNotNil(viewModel.lastUpdatedText)
    }

    @MainActor
    func testViewModelNoLimitsWhenEmpty() async {
        let emptyResponse = PlanLimitsResponse(
            sessionLimit: nil,
            weeklyLimits: [],
            lastUpdatedAt: Date().timeIntervalSince1970 * 1000,
            limitsAvailable: true,
            provider: "anthropic"
        )
        let provider = MockUsageLimitsProvider(response: emptyResponse, delay: 0)
        let viewModel = UsageLimitsViewModel(provider: provider)

        await viewModel.loadLimits()

        XCTAssertNotNil(viewModel.limitsData)
        XCTAssertFalse(viewModel.hasLimits, "No session or weekly limits should mean hasLimits is false")
    }

    // MARK: - Sample Data Tests

    func testSampleLimitValues() {
        XCTAssertEqual(UsageLimit.sampleLow.usageColor, .normal)
        XCTAssertEqual(UsageLimit.sampleMedium.usageColor, .warning)
        XCTAssertEqual(UsageLimit.sampleHigh.usageColor, .critical)
    }

    func testSamplePlanLimitsResponse() {
        let sample = PlanLimitsResponse.sample
        XCTAssertNotNil(sample.sessionLimit)
        XCTAssertEqual(sample.weeklyLimits.count, 3)
        XCTAssertTrue(sample.limitsAvailable)
        XCTAssertEqual(sample.provider, "anthropic")
    }

    func testSampleUnavailableResponse() {
        let unavailable = PlanLimitsResponse.unavailable
        XCTAssertNil(unavailable.sessionLimit)
        XCTAssertTrue(unavailable.weeklyLimits.isEmpty)
        XCTAssertFalse(unavailable.limitsAvailable)
    }
}
