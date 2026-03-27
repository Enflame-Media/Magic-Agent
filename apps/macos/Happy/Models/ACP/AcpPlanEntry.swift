//
//  AcpPlanEntry.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Plan Entry Status

/// Status of a plan entry.
///
/// - SeeAlso: `AcpPlanEntryStatusSchema` in `@magic-agent/protocol`
enum AcpPlanEntryStatus: String, Codable, Hashable {
    case pending
    case inProgress = "in_progress"
    case completed
}

// MARK: - Plan Entry Priority

/// Priority levels for plan entries.
///
/// - SeeAlso: `AcpPlanEntryPrioritySchema` in `@magic-agent/protocol`
enum AcpPlanEntryPriority: String, Codable, Hashable {
    case high
    case medium
    case low
}

// MARK: - Plan Entry

/// A single entry in the execution plan.
///
/// - SeeAlso: `AcpPlanEntrySchema` in `@magic-agent/protocol`
struct AcpPlanEntry: Codable, Hashable, Identifiable {
    let content: String
    let priority: AcpPlanEntryPriority
    let status: AcpPlanEntryStatus

    /// Synthesized identifier for SwiftUI list usage.
    var id: String {
        content
    }
}
