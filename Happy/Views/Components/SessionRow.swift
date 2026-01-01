//
//  SessionRow.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// A row displaying a session in the sessions list.
struct SessionRow: View {
    let session: Session

    var body: some View {
        HStack(spacing: 12) {
            // Status indicator
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 4) {
                // Title
                Text(session.title.isEmpty ? "Untitled Session" : session.title)
                    .font(.body)
                    .lineLimit(1)

                // Subtitle with time
                HStack(spacing: 4) {
                    Text(formattedTime)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if session.isActive {
                        Text("•")
                            .foregroundStyle(.secondary)
                        Text("Active")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                }
            }

            Spacer()

            // Status badge
            StatusBadge(status: session.status)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch session.status {
        case .active: return .green
        case .paused: return .orange
        case .completed: return .blue
        case .error: return .red
        }
    }

    private var formattedTime: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: session.updatedAt, relativeTo: Date())
    }
}

/// A badge showing session status.
struct StatusBadge: View {
    let status: SessionStatus

    var body: some View {
        Text(statusText)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(Capsule())
    }

    private var statusText: String {
        switch status {
        case .active: return "ACTIVE"
        case .paused: return "PAUSED"
        case .completed: return "DONE"
        case .error: return "ERROR"
        }
    }

    private var backgroundColor: Color {
        switch status {
        case .active: return .green.opacity(0.15)
        case .paused: return .orange.opacity(0.15)
        case .completed: return .blue.opacity(0.15)
        case .error: return .red.opacity(0.15)
        }
    }

    private var foregroundColor: Color {
        switch status {
        case .active: return .green
        case .paused: return .orange
        case .completed: return .blue
        case .error: return .red
        }
    }
}

// MARK: - Preview

#Preview {
    List {
        SessionRow(session: .sample)
        SessionRow(session: Session(
            id: "2",
            title: "Fix authentication bug",
            status: .completed,
            machineId: "m1",
            createdAt: Date().addingTimeInterval(-3600),
            updatedAt: Date().addingTimeInterval(-1800)
        ))
        SessionRow(session: Session(
            id: "3",
            title: "",
            status: .paused,
            machineId: "m1",
            createdAt: Date().addingTimeInterval(-7200),
            updatedAt: Date().addingTimeInterval(-7200)
        ))
    }
    .listStyle(.sidebar)
    .frame(width: 300)
}
