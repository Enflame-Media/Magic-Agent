//
//  AcpPlanView.swift
//  Happy
//
//  Displays the agent execution plan with status indicators.
//

import SwiftUI

/// Vertical list of plan entries with status and priority indicators.
struct AcpPlanView: View {

    let entries: [AcpPlanEntry]

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("acp.plan.title".localized, systemImage: "list.bullet.clipboard")
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.bottom, 2)

            ForEach(Array(entries.enumerated()), id: \.offset) { _, entry in
                planEntryRow(entry)
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    // MARK: - Entry Row

    private func planEntryRow(_ entry: AcpPlanEntry) -> some View {
        HStack(alignment: .top, spacing: 8) {
            statusIcon(for: entry.status)
                .frame(width: 20, height: 20)

            Text(entry.content)
                .font(.callout)
                .strikethrough(entry.status == .completed, color: .secondary)
                .foregroundColor(entry.status == .completed ? .secondary : .primary)

            Spacer()

            priorityBadge(entry.priority)
        }
        .padding(.vertical, 2)
    }

    // MARK: - Status Icon

    @ViewBuilder
    private func statusIcon(for status: AcpPlanEntryStatus) -> some View {
        switch status {
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .accessibilityLabel("acp.plan.completed".localized)
        case .inProgress:
            Image(systemName: "circle.dotted")
                .foregroundColor(.orange)
                .accessibilityLabel("acp.plan.inProgress".localized)
        case .pending:
            Image(systemName: "circle")
                .foregroundColor(.gray)
                .accessibilityLabel("acp.plan.pending".localized)
        }
    }

    // MARK: - Priority Badge

    private func priorityBadge(_ priority: AcpPlanEntryPriority) -> some View {
        Text(priority.rawValue)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(priorityColor(priority).opacity(0.15))
            .foregroundColor(priorityColor(priority))
            .cornerRadius(4)
    }

    private func priorityColor(_ priority: AcpPlanEntryPriority) -> Color {
        switch priority {
        case .high: return .red
        case .medium: return .orange
        case .low: return .blue
        }
    }
}
