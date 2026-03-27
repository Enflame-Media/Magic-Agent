//
//  AcpPlanView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays an agent's plan with step-by-step progress.
///
/// Shows a list of plan steps with status indicators (pending,
/// in progress, completed, skipped, failed).
struct AcpPlanView: View {

    let block: AcpContentBlock

    private var steps: [AcpPlanStep] {
        block.metadata?.planSteps ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "list.clipboard.fill")
                    .font(.subheadline)
                    .foregroundStyle(.teal)

                Text(block.content.isEmpty ? "acp.plan".localized : block.content)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.teal)

                Spacer()

                if !steps.isEmpty {
                    let completed = steps.filter { $0.status == .completed }.count
                    Text("\(completed)/\(steps.count)")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                }
            }

            // Steps
            if !steps.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(steps) { step in
                        stepRow(step)
                    }
                }
            }
        }
        .padding(12)
        .background(Color.teal.opacity(0.08))
        .cornerRadius(12)
    }

    private func stepRow(_ step: AcpPlanStep) -> some View {
        HStack(spacing: 10) {
            // Status icon
            Image(systemName: stepIcon(for: step.status))
                .font(.system(size: 14))
                .foregroundStyle(stepColor(for: step.status))
                .frame(width: 20)

            // Step title
            Text(step.title)
                .font(.subheadline)
                .foregroundStyle(step.status == .completed ? .secondary : .primary)
                .strikethrough(step.status == .skipped)

            Spacer()
        }
    }

    private func stepIcon(for status: AcpPlanStepStatus) -> String {
        switch status {
        case .pending: return "circle"
        case .inProgress: return "circle.dashed"
        case .completed: return "checkmark.circle.fill"
        case .skipped: return "arrow.right.circle"
        case .failed: return "xmark.circle.fill"
        }
    }

    private func stepColor(for status: AcpPlanStepStatus) -> Color {
        switch status {
        case .pending: return .gray
        case .inProgress: return .blue
        case .completed: return .green
        case .skipped: return .orange
        case .failed: return .red
        }
    }
}

// MARK: - Preview

#Preview {
    AcpPlanView(block: AcpContentBlock.samples[3])
        .padding()
}
