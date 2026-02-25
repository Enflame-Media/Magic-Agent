//
//  AcpResourceView.swift
//  Happy
//
//  Resource link display with icon, name, and tap-to-open.
//

import SwiftUI

/// Displays a resource link or embedded resource with appropriate icon and tap action.
struct AcpResourceView: View {

    let name: String
    let title: String?
    let uri: String

    // MARK: - Body

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: resourceIcon)
                .font(.title3)
                .foregroundColor(.accentColor)
                .frame(width: 28, height: 28)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(title ?? name)
                    .font(.callout)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text(name)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if isWebURL {
                Image(systemName: "arrow.up.right.square")
                    .font(.callout)
                    .foregroundColor(.secondary)
            }
        }
        .padding(10)
        .background(Color(.systemGray6))
        .cornerRadius(8)
        .contentShape(Rectangle())
        .onTapGesture {
            openResource()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title ?? name), \(name)")
        .accessibilityHint(isWebURL ? "acp.resource.tapToOpen".localized : "")
    }

    // MARK: - Icon

    private var resourceIcon: String {
        if uri.hasSuffix(".swift") || uri.hasSuffix(".ts") || uri.hasSuffix(".js") {
            return "doc.text"
        } else if uri.hasSuffix(".json") || uri.hasSuffix(".yaml") || uri.hasSuffix(".yml") {
            return "doc.badge.gearshape"
        } else if uri.hasSuffix(".md") || uri.hasSuffix(".txt") {
            return "doc.plaintext"
        } else if uri.hasPrefix("http") {
            return "globe"
        } else if uri.hasPrefix("file://") {
            return "folder"
        }
        return "doc"
    }

    // MARK: - Actions

    private var isWebURL: Bool {
        uri.hasPrefix("http://") || uri.hasPrefix("https://")
    }

    private func openResource() {
        guard isWebURL, let url = URL(string: uri) else { return }
        UIApplication.shared.open(url)
    }
}
