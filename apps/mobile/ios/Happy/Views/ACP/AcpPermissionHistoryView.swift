//
//  AcpPermissionHistoryView.swift
//  Happy
//
//  List of resolved ACP permission decisions.
//

import SwiftUI

/// Displays a list of resolved ACP permission decisions with outcome indicators.
struct AcpPermissionHistoryView: View {

    let history: [AcpPermissionDecision]

    // MARK: - Body

    var body: some View {
        if history.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "shield")
                    .font(.largeTitle)
                    .foregroundColor(.secondary)
                Text("acp.permissionHistory.empty".localized)
                    .font(.callout)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding()
        } else {
            List {
                ForEach(Array(history.enumerated()), id: \.offset) { _, decision in
                    decisionRow(decision)
                }
            }
            .navigationTitle("acp.permissionHistory.title".localized)
        }
    }

    // MARK: - Decision Row

    private func decisionRow(_ decision: AcpPermissionDecision) -> some View {
        HStack(spacing: 10) {
            outcomeIcon(decision.outcome)
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(decision.toolTitle)
                    .font(.callout)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    if let option = decision.selectedOption {
                        Text(option.name)
                            .font(.caption)
                            .foregroundColor(outcomeColor(decision.outcome))
                    } else {
                        Text(decision.outcome.rawValue.capitalized)
                            .font(.caption)
                            .foregroundColor(outcomeColor(decision.outcome))
                    }

                    Text(relativeTime(decision.decidedAt))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            if let kind = decision.toolKind {
                Text(kind)
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray5))
                    .cornerRadius(4)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Outcome Icon

    @ViewBuilder
    private func outcomeIcon(_ outcome: AcpPermissionOutcome) -> some View {
        switch outcome {
        case .selected:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
        case .expired:
            Image(systemName: "clock.badge.exclamationmark")
                .foregroundColor(.orange)
        case .cancelled:
            Image(systemName: "xmark.circle.fill")
                .foregroundColor(.red)
        }
    }

    private func outcomeColor(_ outcome: AcpPermissionOutcome) -> Color {
        switch outcome {
        case .selected: return .green
        case .expired: return .orange
        case .cancelled: return .red
        }
    }

    // MARK: - Relative Time

    private func relativeTime(_ timestamp: TimeInterval) -> String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
