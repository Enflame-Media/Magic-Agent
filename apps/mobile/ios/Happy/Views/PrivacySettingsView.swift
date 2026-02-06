//
//  PrivacySettingsView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View for managing privacy settings for social features.
///
/// Allows users to control:
/// - Online status visibility (everyone/friends/nobody)
/// - Who can send friend requests (everyone/friends-of-friends/nobody)
/// - Shared session visibility (everyone/friends/nobody)
/// - Profile discoverability in search
/// - Email visibility to friends
struct PrivacySettingsView: View {

    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            // Online Status
            Section {
                Picker("privacy.onlineStatus".localized, selection: $viewModel.privacySettings.onlineStatusVisibility) {
                    ForEach(Visibility.allCases) { visibility in
                        Label(visibility.displayText, systemImage: visibility.systemImageName)
                            .tag(visibility)
                    }
                }
            } header: {
                Text("privacy.onlineStatusHeader".localized)
            } footer: {
                Text("privacy.onlineStatusFooter".localized)
            }

            // Friend Requests
            Section {
                Picker("privacy.friendRequests".localized, selection: $viewModel.privacySettings.friendRequestPolicy) {
                    ForEach(FriendRequestPolicy.allCases) { policy in
                        Label(policy.displayText, systemImage: policy.systemImageName)
                            .tag(policy)
                    }
                }
            } header: {
                Text("privacy.friendRequestsHeader".localized)
            } footer: {
                Text("privacy.friendRequestsFooter".localized)
            }

            // Shared Sessions
            Section {
                Picker("privacy.sharedSessions".localized, selection: $viewModel.privacySettings.sharedSessionVisibility) {
                    ForEach(Visibility.allCases) { visibility in
                        Label(visibility.displayText, systemImage: visibility.systemImageName)
                            .tag(visibility)
                    }
                }
            } header: {
                Text("privacy.sharedSessionsHeader".localized)
            } footer: {
                Text("privacy.sharedSessionsFooter".localized)
            }

            // Profile Discovery
            Section {
                Toggle("privacy.discoverable".localized, isOn: $viewModel.privacySettings.profileDiscoverable)

                Toggle("privacy.showEmail".localized, isOn: $viewModel.privacySettings.showEmailToFriends)
            } header: {
                Text("privacy.profileHeader".localized)
            } footer: {
                Text("privacy.profileFooter".localized)
            }
        }
        .navigationTitle("privacy.title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("common.save".localized) {
                    Task {
                        await viewModel.savePrivacySettings()
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        PrivacySettingsView(viewModel: FriendsViewModel())
    }
}
