//
//  FriendProfileView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Detail view for a friend's profile showing their status, shared sessions,
/// and actions like session sharing and unfriending.
struct FriendProfileView: View {

    let friend: Friend
    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var showRemoveConfirmation = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Profile header
                profileHeader

                // Status card
                statusCard

                // Statistics
                statisticsSection

                // Actions
                actionsSection

                // Danger zone
                dangerSection
            }
            .padding()
        }
        .navigationTitle(friend.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            "friends.removeConfirmTitle".localized,
            isPresented: $showRemoveConfirmation,
            titleVisibility: .visible
        ) {
            Button("friends.removeFriend".localized, role: .destructive) {
                Task {
                    await viewModel.removeFriend(friend)
                    dismiss()
                }
            }
            Button("common.cancel".localized, role: .cancel) {}
        } message: {
            Text("friends.removeConfirmMessage".localized)
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        VStack(spacing: 16) {
            // Large avatar
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.15))
                    .frame(width: 80, height: 80)

                Text(friend.displayName.prefix(1).uppercased())
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(.blue)
            }
            .overlay(alignment: .bottomTrailing) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 20, height: 20)
                    .overlay(
                        Circle()
                            .stroke(Color(.systemBackground), lineWidth: 3)
                    )
            }

            // Name and email
            VStack(spacing: 4) {
                Text(friend.displayName)
                    .font(.title2)
                    .fontWeight(.bold)

                if let email = friend.email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Status Card

    private var statusCard: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: friend.status.systemImageName)
                    .foregroundStyle(statusColor)
                Text(friend.status.displayText)
                    .font(.headline)
                    .foregroundStyle(statusColor)
                Spacer()
            }

            if friend.status == .offline, let lastSeen = friend.lastSeenAt {
                HStack {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("Last seen \(lastSeen, style: .relative) ago")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }

            if friend.status == .inSession {
                HStack {
                    Image(systemName: "terminal")
                        .font(.caption)
                        .foregroundStyle(.blue)
                    Text("friends.currentlyInSession".localized)
                        .font(.caption)
                        .foregroundStyle(.blue)
                    Spacer()
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Statistics Section

    private var statisticsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("friends.statistics".localized)
                .font(.headline)

            HStack(spacing: 16) {
                StatisticCard(
                    title: "friends.sharedSessions".localized,
                    value: "\(friend.sharedSessionCount)",
                    systemImage: "square.stack"
                )

                StatisticCard(
                    title: "friends.friendsSince".localized,
                    value: friendsSinceText,
                    systemImage: "calendar"
                )
            }
        }
    }

    // MARK: - Actions Section

    private var actionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("friends.actions".localized)
                .font(.headline)

            // Share session button (only available when friend is online)
            Button {
                #if DEBUG
                print("[FriendProfileView] Share session with \(friend.displayName)")
                #endif
            } label: {
                Label("friends.shareSession".localized, systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(friend.status == .offline)

            // View shared sessions
            if friend.sharedSessionCount > 0 {
                Button {
                    #if DEBUG
                    print("[FriendProfileView] View shared sessions with \(friend.displayName)")
                    #endif
                } label: {
                    Label("friends.viewSharedSessions".localized, systemImage: "list.bullet")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    // MARK: - Danger Section

    private var dangerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Divider()
                .padding(.vertical, 8)

            Button(role: .destructive) {
                showRemoveConfirmation = true
            } label: {
                Label("friends.removeFriend".localized, systemImage: "person.badge.minus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.red)
        }
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch friend.status {
        case .online: return .green
        case .away: return .orange
        case .inSession: return .blue
        case .offline: return .gray
        }
    }

    private var friendsSinceText: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: friend.friendsSince, relativeTo: Date())
    }
}

// MARK: - Statistic Card

/// A small card displaying a statistic with an icon, value, and title.
private struct StatisticCard: View {
    let title: String
    let value: String
    let systemImage: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: systemImage)
                .font(.title3)
                .foregroundStyle(.blue)

            Text(value)
                .font(.headline)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        FriendProfileView(friend: .sample, viewModel: FriendsViewModel())
    }
}
