//
//  AcpResourceView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Resource link with SF Symbol icon, name, URI, and click-to-open via NSWorkspace.
//

import SwiftUI

/// Displays a resource reference with an icon, name, and clickable URI.
///
/// Resources are external references (files, URLs) that the agent has accessed
/// or referenced. Clicking opens the resource via NSWorkspace.
struct AcpResourceView: View {
    /// The resource block data.
    let resource: AcpResourceBlock

    /// Whether the user is hovering over this view.
    @State private var isHovered = false

    var body: some View {
        Button {
            openResource()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: resourceIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(.blue)
                    .frame(width: 20)

                VStack(alignment: .leading, spacing: 2) {
                    Text(resource.name)
                        .font(.callout)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)

                    Text(resource.uri)
                        .font(.caption)
                        .fontDesign(.monospaced)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }

                Spacer()

                Image(systemName: "arrow.up.right.square")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .opacity(isHovered ? 1 : 0)
            }
            .padding(8)
            .background(isHovered ? Color(.controlBackgroundColor) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(Color(.separatorColor).opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            isHovered = hovering
            if hovering {
                NSCursor.pointingHand.push()
            } else {
                NSCursor.pop()
            }
        }
    }

    // MARK: - Resource Icon

    private var resourceIcon: String {
        guard let mimeType = resource.mimeType else {
            return iconForURI()
        }

        if mimeType.hasPrefix("text/") { return "doc.text" }
        if mimeType.hasPrefix("image/") { return "photo" }
        if mimeType.hasPrefix("application/json") { return "curlybraces" }
        if mimeType.hasPrefix("application/pdf") { return "doc.richtext" }
        return iconForURI()
    }

    private func iconForURI() -> String {
        if resource.uri.hasPrefix("file://") { return "doc" }
        if resource.uri.hasPrefix("http") { return "globe" }
        return "link"
    }

    // MARK: - Actions

    private func openResource() {
        guard let url = URL(string: resource.uri) else { return }
        NSWorkspace.shared.open(url)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 8) {
        AcpResourceView(resource: AcpResourceBlock(
            id: "r1",
            name: "Authentication Guide",
            uri: "file:///docs/auth-guide.md",
            mimeType: "text/markdown"
        ))

        AcpResourceView(resource: AcpResourceBlock(
            id: "r2",
            name: "API Reference",
            uri: "https://docs.example.com/api",
            mimeType: nil
        ))

        AcpResourceView(resource: AcpResourceBlock(
            id: "r3",
            name: "config.json",
            uri: "file:///project/config.json",
            mimeType: "application/json"
        ))
    }
    .padding()
    .frame(width: 400)
}
