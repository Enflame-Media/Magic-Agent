//
//  AcpPlanView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Execution plan list with SF Symbol status indicators.
//

import SwiftUI

/// Displays an agent execution plan with step status indicators.
///
/// Shows each plan step with an SF Symbol indicating its status:
/// - circle: pending
/// - arrow.triangle.2.circlepath: in progress
/// - checkmark.circle.fill: completed
/// - xmark.circle.fill: failed
struct AcpPlanView: View {
    /// The execution plan to display.
    let plan: AcpPlan

    /// Whether the plan details are expanded.
    @State private var isExpanded = true

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(alignment: .leading, spacing: 2) {
                ForEach(plan.steps) { step in
                    stepRow(step)
                }
            }
            .padding(.top, 4)
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "list.clipboard")
                    .font(.caption)
                    .foregroundStyle(.blue)

                Text(plan.title)
                    .font(.caption)
                    .fontWeight(.medium)

                Spacer()

                // Progress indicator
                progressBadge
            }
        }
        .padding(10)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Step Row

    @ViewBuilder
    private func stepRow(_ step: AcpPlanStep) -> some View {
        HStack(spacing: 8) {
            Image(systemName: step.status.iconName)
                .font(.system(size: 12))
                .foregroundStyle(stepColor(for: step.status))
                .frame(width: 16)
                .symbolEffect(.pulse, isActive: step.status == .inProgress)

            Text(step.description)
                .font(.callout)
                .foregroundStyle(step.status == .pending ? .secondary : .primary)
                .strikethrough(step.status == .completed, color: .secondary.opacity(0.5))

            Spacer()
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 4)
    }

    // MARK: - Progress Badge

    @ViewBuilder
    private var progressBadge: some View {
        let completed = plan.steps.filter { $0.status == .completed }.count
        let total = plan.steps.count

        Text("\(completed)/\(total)")
            .font(.caption2)
            .fontWeight(.medium)
            .fontDesign(.monospaced)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(progressColor.opacity(0.15))
            .foregroundStyle(progressColor)
            .clipShape(Capsule())
    }

    // MARK: - Colors

    private func stepColor(for status: AcpPlanStepStatus) -> Color {
        switch status {
        case .pending: return .secondary
        case .inProgress: return .blue
        case .completed: return .green
        case .failed: return .red
        }
    }

    private var progressColor: Color {
        if plan.progress >= 1.0 { return .green }
        if plan.progress > 0 { return .blue }
        return .secondary
    }
}

// MARK: - Preview

#Preview {
    AcpPlanView(plan: .sample)
        .padding()
        .frame(width: 500)
}
