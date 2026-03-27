//
//  AcpThoughtView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Collapsible DisclosureGroup for agent reasoning with preview text.
//

import SwiftUI

/// Displays an agent reasoning thought in a collapsible DisclosureGroup.
///
/// Shows a preview of the thought text when collapsed, and the full
/// reasoning text when expanded. Uses the native macOS DisclosureGroup pattern.
struct AcpThoughtView: View {
    /// The thought to display.
    let thought: AcpThought

    /// Whether the disclosure group is expanded.
    @State private var isExpanded = false

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            Text(thought.text)
                .font(.callout)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
                .padding(.top, 4)
                .frame(maxWidth: .infinity, alignment: .leading)
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "brain")
                    .font(.caption)
                    .foregroundStyle(.purple)

                Text("acp.thought.label".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.purple)

                Text(thought.preview)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.tail)
            }
        }
        .padding(8)
        .background(Color.purple.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Thought List

/// Displays a list of agent thoughts.
struct AcpThoughtListView: View {
    /// The thoughts to display.
    let thoughts: [AcpThought]

    var body: some View {
        if !thoughts.isEmpty {
            VStack(spacing: 4) {
                ForEach(thoughts) { thought in
                    AcpThoughtView(thought: thought)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 12) {
        AcpThoughtView(thought: AcpThought(
            id: "t1",
            text: "The user wants JWT authentication. I should check if jsonwebtoken is already installed as a dependency, then look at the existing route structure to maintain consistency. I need to handle both successful login and error cases properly."
        ))

        AcpThoughtView(thought: AcpThought(
            id: "t2",
            text: "Short thought."
        ))
    }
    .padding()
    .frame(width: 500)
}
