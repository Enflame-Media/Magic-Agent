//
//  MainView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI
import Combine

/// The main authenticated view with sidebar navigation between Sessions and Friends.
///
/// Uses a three-column NavigationSplitView pattern:
/// - Source list: Navigation between Sessions/Friends
/// - Content: List of items (sessions or friends)
/// - Detail: Selected item details
struct MainView: View {
    @State private var selectedSection: SidebarSection = .sessions
    @State private var cancellables = Set<AnyCancellable>()

    var body: some View {
        NavigationSplitView {
            sidebarContent
        } detail: {
            detailContent
        }
        .navigationSplitViewStyle(.balanced)
        .onAppear {
            setupNotificationHandlers()
            requestNotificationPermission()
        }
    }

    // MARK: - Sidebar

    @ViewBuilder
    private var sidebarContent: some View {
        List(selection: $selectedSection) {
            Section("Happy") {
                Label("Sessions", systemImage: "terminal")
                    .tag(SidebarSection.sessions)

                Label("Artifacts", systemImage: "doc.text.magnifyingglass")
                    .tag(SidebarSection.artifacts)

                Label {
                    HStack {
                        Text("Friends")
                        Spacer()
                        if FriendsService.shared.pendingCount > 0 {
                            Text("\(FriendsService.shared.pendingCount)")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.red)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                    }
                } icon: {
                    Image(systemName: "person.2")
                }
                .tag(SidebarSection.friends)
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("Happy")
        .frame(minWidth: 150, idealWidth: 180)
    }

    // MARK: - Detail Content

    @ViewBuilder
    private var detailContent: some View {
        switch selectedSection {
        case .sessions:
            SessionsView()
        case .artifacts:
            ArtifactBrowser()
        case .friends:
            FriendsView()
        }
    }

    // MARK: - Notification Handlers

    private func setupNotificationHandlers() {
        // Handle show friends notification (from keyboard shortcut)
        NotificationCenter.default.publisher(for: .showFriends)
            .receive(on: DispatchQueue.main)
            .sink { _ in
                selectedSection = .friends
            }
            .store(in: &cancellables)

        // Handle show artifacts notification (from keyboard shortcut)
        NotificationCenter.default.publisher(for: .showArtifacts)
            .receive(on: DispatchQueue.main)
            .sink { _ in
                selectedSection = .artifacts
            }
            .store(in: &cancellables)
    }

    // MARK: - Permissions

    private func requestNotificationPermission() {
        Task {
            await FriendNotificationService.shared.requestPermission()
        }
    }
}

// MARK: - Sidebar Section

/// Sections available in the main sidebar.
enum SidebarSection: String, Hashable, CaseIterable {
    case sessions
    case artifacts
    case friends
}

// MARK: - Preview

#Preview {
    MainView()
}
