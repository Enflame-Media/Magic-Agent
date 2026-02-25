//
//  AcpContentBlockRenderer.swift
//  Happy
//
//  ViewBuilder dispatcher for AcpContentBlock variants.
//

import SwiftUI

/// Dispatches rendering for each AcpContentBlock type to the appropriate view.
struct AcpContentBlockRenderer: View {

    let block: AcpContentBlock

    // MARK: - Body

    var body: some View {
        switch block {
        case .text(let content):
            AcpStreamingTextView(text: content.text)

        case .image(let content):
            AcpImageView(imageContent: content)

        case .audio:
            Label("acp.content.audioPlaceholder".localized, systemImage: "waveform")
                .font(.callout)
                .foregroundColor(.secondary)

        case .resourceLink(let content):
            AcpResourceView(name: content.name, title: content.title, uri: content.uri)

        case .resource(let content):
            AcpResourceView(
                name: "acp.content.resource".localized,
                title: nil,
                uri: content.resource.resourceUri
            )

        case .unknown:
            EmptyView()
        }
    }
}
