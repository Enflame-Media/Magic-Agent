//
//  FriendRequest.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a pending friend request between two Happy users.
///
/// Friend requests can be sent via QR code scanning or username lookup.
/// The request includes the sender's information and can be accepted or
/// declined by the receiver.
struct FriendRequest: Identifiable, Codable, Hashable {
    /// Unique identifier for the friend request.
    let id: String

    /// The user ID of the person who sent the request.
    let fromUserId: String

    /// The display name of the person who sent the request.
    let fromDisplayName: String

    /// The email of the person who sent the request, if available.
    let fromEmail: String?

    /// The avatar URL of the person who sent the request, if available.
    let fromAvatarUrl: String?

    /// The user ID of the person who received the request.
    let toUserId: String

    /// The current status of the request.
    var status: FriendRequestStatus

    /// When the request was created.
    let createdAt: Date

    /// When the request was last updated (accepted/declined).
    var updatedAt: Date

    /// Optional message sent with the request.
    let message: String?
}

// MARK: - Friend Request Status

/// The status of a friend request.
enum FriendRequestStatus: String, Codable, Hashable {
    /// The request is pending and awaiting a response.
    case pending

    /// The request was accepted.
    case accepted

    /// The request was declined.
    case declined

    /// The request was cancelled by the sender.
    case cancelled

    /// The request expired without a response.
    case expired
}

// MARK: - Direction

extension FriendRequest {
    /// Determines the direction of the request relative to the current user.
    enum Direction {
        /// The current user sent this request.
        case sent

        /// The current user received this request.
        case received
    }

    /// Returns the direction of this request relative to the given user ID.
    ///
    /// - Parameter currentUserId: The current user's ID.
    /// - Returns: Whether this request was sent or received by the current user.
    func direction(for currentUserId: String) -> Direction {
        fromUserId == currentUserId ? .sent : .received
    }
}

// MARK: - Sample Data

extension FriendRequest {
    static let sampleIncoming = FriendRequest(
        id: "req-001",
        fromUserId: "user-other-1",
        fromDisplayName: "Dave Developer",
        fromEmail: "dave@example.com",
        fromAvatarUrl: nil,
        toUserId: "user-me",
        status: .pending,
        createdAt: Date().addingTimeInterval(-3600),
        updatedAt: Date().addingTimeInterval(-3600),
        message: "Hey, let's collaborate on the project!"
    )

    static let sampleOutgoing = FriendRequest(
        id: "req-002",
        fromUserId: "user-me",
        fromDisplayName: "Me",
        fromEmail: "me@example.com",
        fromAvatarUrl: nil,
        toUserId: "user-other-2",
        status: .pending,
        createdAt: Date().addingTimeInterval(-7200),
        updatedAt: Date().addingTimeInterval(-7200),
        message: nil
    )

    static let samples: [FriendRequest] = [sampleIncoming, sampleOutgoing]
}
