//
//  AcpToolCallView.swift
//  Happy
//
//  Card displaying a single ACP tool call with status and content.
//

import SwiftUI

/// Displays a tool call card with kind icon, status, locations, and expandable content.
struct AcpToolCallView: View {

    let toolCall: AcpToolCall

    @State private var isExpanded = false

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack(spacing: 8) {
                kindIcon
                    .frame(width: 20, height: 20)

                Text(toolCall.title)
                    .font(.callout)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Spacer()

                statusIndicator
            }

            // Locations
            if let locations = toolCall.locations, !locations.isEmpty {
                locationsList(locations)
            }

            // Expandable content
            if let content = toolCall.content, !content.isEmpty {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.caption)
                        Text(isExpanded ? "acp.toolCall.hideContent".localized : "acp.toolCall.showContent".localized)
                            .font(.caption)
                    }
                    .foregroundColor(.accentColor)
                }
                .buttonStyle(.plain)

                if isExpanded {
                    ForEach(Array(content.enumerated()), id: \.offset) { _, item in
                        toolCallContentView(item)
                    }
                }
            }
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    // MARK: - Kind Icon

    private var kindIcon: some View {
        Image(systemName: kindIconName)
            .foregroundColor(kindIconColor)
            .accessibilityLabel(toolCall.kind?.rawValue ?? "tool")
    }

    private var kindIconName: String {
        guard let kind = toolCall.kind else { return "wrench" }
        switch kind {
        case .read: return "doc.text.magnifyingglass"
        case .edit: return "pencil.and.outline"
        case .delete: return "trash"
        case .search: return "magnifyingglass"
        case .execute: return "terminal"
        case .think: return "brain"
        case .fetch: return "globe"
        case .switchMode: return "arrow.triangle.swap"
        case .move: return "arrow.right.arrow.left"
        case .other: return "wrench"
        }
    }

    private var kindIconColor: Color {
        guard let kind = toolCall.kind else { return .gray }
        switch kind {
        case .read: return .blue
        case .edit: return .orange
        case .delete: return .red
        case .search: return .purple
        case .execute: return .green
        case .think: return .indigo
        case .fetch: return .cyan
        case .switchMode: return .mint
        case .move: return .teal
        case .other: return .gray
        }
    }

    // MARK: - Status Indicator

    @ViewBuilder
    private var statusIndicator: some View {
        switch toolCall.status {
        case .pending:
            Image(systemName: "clock")
                .foregroundColor(.orange)
                .font(.caption)
        case .inProgress:
            ProgressView()
                .scaleEffect(0.7)
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .font(.caption)
        case .failed:
            Image(systemName: "xmark.circle.fill")
                .foregroundColor(.red)
                .font(.caption)
        case .none:
            EmptyView()
        }
    }

    // MARK: - Tool Call Content

    @ViewBuilder
    private func toolCallContentView(_ item: AcpToolCallContent) -> some View {
        switch item {
        case .content(let block):
            AcpContentBlockRenderer(block: block)
        case .diff(let path, let newText, let oldText):
            AcpDiffView(path: path, newText: newText, oldText: oldText)
        case .terminal(let terminalId):
            AcpTerminalOutputView(text: terminalId)
        case .unknown:
            EmptyView()
        }
    }

    // MARK: - Locations

    private func locationsList(_ locations: [AcpToolCallLocation]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(Array(locations.prefix(5).enumerated()), id: \.offset) { _, loc in
                HStack(spacing: 4) {
                    Image(systemName: "mappin.circle")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(loc.path + (loc.line.map { ":\($0)" } ?? ""))
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            if locations.count > 5 {
                Text("+\(locations.count - 5) more")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}
