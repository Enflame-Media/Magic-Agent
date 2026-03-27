//
//  AcpImageView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays an image content block from an ACP session.
///
/// Handles base64-encoded image data with support for various
/// MIME types. Shows a placeholder if the image cannot be decoded.
struct AcpImageView: View {

    let content: String
    let mimeType: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "photo")
                    .font(.caption)
                    .foregroundStyle(.purple)

                Text("acp.image".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                if let mimeType = mimeType {
                    Text(mimeType)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            // Image content
            if let data = Data(base64Encoded: content),
               let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .cornerRadius(8)
                    .frame(maxHeight: 300)
            } else {
                // Placeholder for non-decodable images
                VStack(spacing: 8) {
                    Image(systemName: "photo.badge.exclamationmark")
                        .font(.title2)
                        .foregroundStyle(.secondary)

                    Text("acp.imageNotAvailable".localized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, minHeight: 100)
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
        }
        .padding(12)
        .background(Color.purple.opacity(0.06))
        .cornerRadius(12)
    }
}

// MARK: - Preview

#Preview {
    AcpImageView(content: "", mimeType: "image/png")
        .padding()
}
