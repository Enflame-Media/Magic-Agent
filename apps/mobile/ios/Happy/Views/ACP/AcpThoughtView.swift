//
//  AcpThoughtView.swift
//  Happy
//
//  Collapsible agent thought display with preview.
//

import SwiftUI

/// Displays agent thinking/reasoning in a collapsible section.
struct AcpThoughtView: View {

    let thought: String

    @State private var isExpanded = false

    // MARK: - Body

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            AcpStreamingTextView(text: thought)
                .font(.callout)
                .foregroundColor(.secondary)
                .padding(.top, 4)
        } label: {
            Label {
                if isExpanded {
                    Text("acp.thought.title".localized)
                        .font(.subheadline)
                        .fontWeight(.medium)
                } else {
                    Text(previewText)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            } icon: {
                Image(systemName: "brain.head.profile")
                    .foregroundColor(.purple)
                    .accessibilityLabel("acp.thought.icon".localized)
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    // MARK: - Preview Text

    private var previewText: String {
        let cleaned = thought.replacingOccurrences(of: "\n", with: " ")
        if cleaned.count > 100 {
            return String(cleaned.prefix(100)) + "..."
        }
        return cleaned
    }
}
