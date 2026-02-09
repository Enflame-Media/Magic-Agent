//
//  UsageData.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Usage Limit

/// A single usage limit entry representing one limit category (e.g., tokens, requests).
///
/// Maps to the `UsageLimit` type from `@magic-agent/protocol` (Zod schema).
/// Contains percentage used and reset information for display.
struct UsageLimit: Identifiable, Codable, Equatable {
    /// Unique identifier for this limit type (e.g., "opus_tokens").
    let id: String

    /// Human-readable label for display (e.g., "Opus Tokens").
    let label: String

    /// Percentage of limit used (0-100).
    let percentageUsed: Double

    /// Unix timestamp (ms) when this limit resets, nil if no reset.
    let resetsAt: Double?

    /// How to display the reset time in UI: "countdown" or "datetime".
    let resetDisplayType: ResetDisplayType

    /// Optional description for additional context.
    let description: String?

    /// The color to use for the progress bar based on usage percentage.
    var usageColor: UsageColor {
        if percentageUsed >= 80 {
            return .critical
        } else if percentageUsed >= 50 {
            return .warning
        } else {
            return .normal
        }
    }
}

// MARK: - Reset Display Type

/// How to display the reset time in the UI.
enum ResetDisplayType: String, Codable {
    case countdown
    case datetime
}

// MARK: - Usage Color

/// Color category based on usage percentage thresholds.
enum UsageColor {
    /// Under 50% usage - green.
    case normal
    /// 50-80% usage - yellow/orange.
    case warning
    /// Over 80% usage - red.
    case critical
}

// MARK: - Plan Limits Response

/// Full plan limits response from the API.
///
/// Maps to the `PlanLimitsResponse` type from `@magic-agent/protocol` (Zod schema).
/// Contains session limit (if applicable), weekly limits array, and metadata.
struct PlanLimitsResponse: Codable, Equatable {
    /// Session limit if applicable (e.g., concurrent session count).
    let sessionLimit: UsageLimit?

    /// Weekly/rolling limits (tokens, requests, etc.).
    let weeklyLimits: [UsageLimit]

    /// Unix timestamp (ms) when limits were last fetched/updated.
    let lastUpdatedAt: Double

    /// Whether limit information is available from the provider.
    let limitsAvailable: Bool

    /// Optional provider identifier (e.g., "anthropic", "openai").
    let provider: String?
}

// MARK: - Formatting Helpers

/// Utility functions for formatting usage limit display values.
enum UsageFormatting {

    /// Formats a reset time as a countdown string (e.g., "4 hr 8 min").
    ///
    /// - Parameter resetsAt: Unix timestamp in milliseconds, or nil if no reset time.
    /// - Returns: A human-readable countdown string, or nil if resetsAt is nil.
    static func formatResetCountdown(_ resetsAt: Double?) -> String? {
        guard let resetsAt = resetsAt else { return nil }

        let now = Date().timeIntervalSince1970 * 1000
        let diffMs = resetsAt - now

        if diffMs <= 0 {
            return NSLocalizedString("usageLimits.resetsNow", comment: "Resets now")
        }

        let diffMinutes = Int(diffMs / (1000 * 60))
        let hours = diffMinutes / 60
        let minutes = diffMinutes % 60

        if hours > 0 && minutes > 0 {
            return String(format: NSLocalizedString("usageLimits.countdown.hoursMinutes", comment: "Hours and minutes countdown"), hours, minutes)
        } else if hours > 0 {
            return String(format: NSLocalizedString("usageLimits.countdown.hours", comment: "Hours countdown"), hours)
        } else {
            return String(format: NSLocalizedString("usageLimits.countdown.minutes", comment: "Minutes countdown"), minutes)
        }
    }

    /// Formats a reset time as a datetime string (e.g., "Thu 1:59 AM").
    ///
    /// - Parameter resetsAt: Unix timestamp in milliseconds, or nil if no reset time.
    /// - Returns: A formatted datetime string, or nil if resetsAt is nil.
    static func formatResetDatetime(_ resetsAt: Double?) -> String? {
        guard let resetsAt = resetsAt else { return nil }

        let date = Date(timeIntervalSince1970: resetsAt / 1000)
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE h:mm a"
        return formatter.string(from: date)
    }

    /// Formats a "last updated" timestamp as a relative time string.
    ///
    /// - Parameter timestamp: Unix timestamp in milliseconds.
    /// - Returns: A human-readable relative time string (e.g., "5 minutes ago").
    static func formatLastUpdated(_ timestamp: Double) -> String {
        let now = Date().timeIntervalSince1970 * 1000
        let diffMs = now - timestamp
        let diffMinutes = Int(diffMs / (1000 * 60))

        if diffMinutes < 1 {
            return NSLocalizedString("usageLimits.lastUpdated.lessThanMinute", comment: "Less than a minute ago")
        } else if diffMinutes == 1 {
            return NSLocalizedString("usageLimits.lastUpdated.oneMinute", comment: "1 minute ago")
        } else if diffMinutes < 60 {
            return String(format: NSLocalizedString("usageLimits.lastUpdated.minutes", comment: "N minutes ago"), diffMinutes)
        } else {
            let hours = diffMinutes / 60
            if hours == 1 {
                return NSLocalizedString("usageLimits.lastUpdated.oneHour", comment: "1 hour ago")
            } else {
                return String(format: NSLocalizedString("usageLimits.lastUpdated.hours", comment: "N hours ago"), hours)
            }
        }
    }
}

// MARK: - Sample Data

extension UsageLimit {
    /// Sample usage limit at low usage for previews and testing.
    static let sampleLow = UsageLimit(
        id: "opus_tokens",
        label: "Opus Tokens",
        percentageUsed: 25.0,
        resetsAt: Date().addingTimeInterval(3600 * 72).timeIntervalSince1970 * 1000,
        resetDisplayType: .countdown,
        description: "Weekly Opus token limit"
    )

    /// Sample usage limit at medium usage for previews and testing.
    static let sampleMedium = UsageLimit(
        id: "sonnet_tokens",
        label: "Sonnet Tokens",
        percentageUsed: 65.0,
        resetsAt: Date().addingTimeInterval(3600 * 48).timeIntervalSince1970 * 1000,
        resetDisplayType: .countdown,
        description: "Weekly Sonnet token limit"
    )

    /// Sample usage limit at high usage for previews and testing.
    static let sampleHigh = UsageLimit(
        id: "haiku_tokens",
        label: "Haiku Tokens",
        percentageUsed: 92.0,
        resetsAt: Date().addingTimeInterval(3600 * 24).timeIntervalSince1970 * 1000,
        resetDisplayType: .datetime,
        description: "Weekly Haiku token limit"
    )

    /// Sample session limit for previews and testing.
    static let sampleSession = UsageLimit(
        id: "session",
        label: "Session Limit",
        percentageUsed: 50.0,
        resetsAt: nil,
        resetDisplayType: .countdown,
        description: nil
    )
}

extension PlanLimitsResponse {
    /// Sample plan limits response for previews and testing.
    static let sample = PlanLimitsResponse(
        sessionLimit: .sampleSession,
        weeklyLimits: [.sampleLow, .sampleMedium, .sampleHigh],
        lastUpdatedAt: Date().timeIntervalSince1970 * 1000,
        limitsAvailable: true,
        provider: "anthropic"
    )

    /// Sample empty/unavailable plan limits response.
    static let unavailable = PlanLimitsResponse(
        sessionLimit: nil,
        weeklyLimits: [],
        lastUpdatedAt: Date().timeIntervalSince1970 * 1000,
        limitsAvailable: false,
        provider: nil
    )
}
