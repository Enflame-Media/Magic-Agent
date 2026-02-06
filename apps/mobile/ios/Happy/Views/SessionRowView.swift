//
//  SessionRowView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A row component for displaying a session in the session list.
///
/// Shows the session title, status indicator, machine info, and
/// relative timestamp.
struct SessionRowView: View {
    let session: Session

    var body: some View {
        HStack(spacing: 12) {
            // Status indicator
            statusIndicator

            // Session info
            VStack(alignment: .leading, spacing: 4) {
                // Title
                Text(session.title.isEmpty ? "sessionDetail.untitledSession".localized : session.title)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)

                // Machine ID and time
                HStack(spacing: 8) {
                    Label {
                        Text(session.machineId)
                            .lineLimit(1)
                    } icon: {
                        Image(systemName: "desktopcomputer")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)

                    Spacer()

                    Text(session.updatedAt, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Status Indicator

    private var statusIndicator: some View {
        VStack {
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 36, height: 36)

                Image(systemName: statusIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(statusColor)
            }
        }
    }

    private var statusColor: Color {
        switch session.status {
        case .active:
            return .green
        case .paused:
            return .orange
        case .completed:
            return .blue
        case .error:
            return .red
        }
    }

    private var statusIcon: String {
        switch session.status {
        case .active:
            return "play.circle.fill"
        case .paused:
            return "pause.circle.fill"
        case .completed:
            return "checkmark.circle.fill"
        case .error:
            return "exclamationmark.circle.fill"
        }
    }
}

// MARK: - Preview

#Preview {
    List {
        SessionRowView(session: Session(
            id: "1",
            title: "Fix authentication bug",
            status: .active,
            machineId: "macbook-pro",
            createdAt: Date().addingTimeInterval(-3600),
            updatedAt: Date().addingTimeInterval(-120)
        ))

        SessionRowView(session: Session(
            id: "2",
            title: "Implement session list view",
            status: .completed,
            machineId: "dev-server",
            createdAt: Date().addingTimeInterval(-7200),
            updatedAt: Date().addingTimeInterval(-1800)
        ))

        SessionRowView(session: Session(
            id: "3",
            title: "",
            status: .error,
            machineId: "ci-runner-01",
            createdAt: Date().addingTimeInterval(-86400),
            updatedAt: Date().addingTimeInterval(-3600)
        ))

        SessionRowView(session: Session(
            id: "4",
            title: "Review pull request #142",
            status: .paused,
            machineId: "workstation",
            createdAt: Date().addingTimeInterval(-14400),
            updatedAt: Date().addingTimeInterval(-600)
        ))
    }
}
