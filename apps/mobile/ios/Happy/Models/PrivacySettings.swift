//
//  PrivacySettings.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// User privacy settings for controlling social feature visibility.
///
/// Controls who can see the user's profile, send friend requests,
/// and view shared sessions. Persisted both locally (for immediate
/// UI responsiveness) and on the server (for enforcement).
struct PrivacySettings: Codable, Equatable {

    /// Who can see the user's online status.
    var onlineStatusVisibility: Visibility

    /// Who can send friend requests to the user.
    var friendRequestPolicy: FriendRequestPolicy

    /// Who can see sessions shared with the user.
    var sharedSessionVisibility: Visibility

    /// Whether the user's profile appears in search results.
    var profileDiscoverable: Bool

    /// Whether to show the user's email to friends.
    var showEmailToFriends: Bool

    /// Default privacy settings (most permissive).
    static let `default` = PrivacySettings(
        onlineStatusVisibility: .friends,
        friendRequestPolicy: .everyone,
        sharedSessionVisibility: .friends,
        profileDiscoverable: true,
        showEmailToFriends: true
    )
}

// MARK: - Visibility

/// Visibility level for social features.
enum Visibility: String, Codable, CaseIterable, Identifiable, Hashable {
    /// Visible to everyone.
    case everyone

    /// Visible only to friends.
    case friends

    /// Hidden from everyone.
    case nobody

    var id: String { rawValue }

    /// Display text for the visibility level.
    var displayText: String {
        switch self {
        case .everyone: return "Everyone"
        case .friends: return "Friends Only"
        case .nobody: return "Nobody"
        }
    }

    /// System image name for the visibility level.
    var systemImageName: String {
        switch self {
        case .everyone: return "globe"
        case .friends: return "person.2"
        case .nobody: return "eye.slash"
        }
    }
}

// MARK: - Friend Request Policy

/// Policy for who can send friend requests.
enum FriendRequestPolicy: String, Codable, CaseIterable, Identifiable, Hashable {
    /// Anyone can send a friend request.
    case everyone

    /// Only friends of friends can send a request.
    case friendsOfFriends = "friends_of_friends"

    /// Nobody can send friend requests (effectively closed).
    case nobody

    var id: String { rawValue }

    /// Display text for the friend request policy.
    var displayText: String {
        switch self {
        case .everyone: return "Everyone"
        case .friendsOfFriends: return "Friends of Friends"
        case .nobody: return "Nobody"
        }
    }

    /// System image name for the policy.
    var systemImageName: String {
        switch self {
        case .everyone: return "globe"
        case .friendsOfFriends: return "person.3"
        case .nobody: return "hand.raised"
        }
    }
}
