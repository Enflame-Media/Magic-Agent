//
//  AcpImageView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  AsyncImage with loading state, zoom (MagnificationGesture), and save-to-file via NSSavePanel.
//

import SwiftUI
import UniformTypeIdentifiers

/// Displays an image from an ACP content block with zoom and save support.
///
/// Features:
/// - AsyncImage with loading and error states
/// - MagnificationGesture for zoom in/out
/// - Save to file via NSSavePanel
/// - Alt text display
struct AcpImageView: View {
    /// The image block data.
    let image: AcpImageBlock

    /// Current zoom scale.
    @State private var scale: CGFloat = 1.0

    /// Steady-state zoom scale (before gesture starts).
    @State private var steadyScale: CGFloat = 1.0

    /// Whether the image is in error state.
    @State private var loadError = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Image
            if let url = URL(string: image.url) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let loadedImage):
                        loadedImage
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .scaleEffect(scale)
                            .gesture(magnificationGesture)
                            .onTapGesture(count: 2) {
                                withAnimation {
                                    if scale > 1.0 {
                                        scale = 1.0
                                        steadyScale = 1.0
                                    } else {
                                        scale = 2.0
                                        steadyScale = 2.0
                                    }
                                }
                            }
                            .contextMenu {
                                Button {
                                    saveImage(url: url)
                                } label: {
                                    Label("acp.image.save".localized, systemImage: "square.and.arrow.down")
                                }

                                Button {
                                    copyImageURL()
                                } label: {
                                    Label("acp.image.copyUrl".localized, systemImage: "doc.on.doc")
                                }

                                Divider()

                                Button {
                                    withAnimation {
                                        scale = 1.0
                                        steadyScale = 1.0
                                    }
                                } label: {
                                    Label("acp.image.resetZoom".localized, systemImage: "arrow.counterclockwise")
                                }
                            }

                    case .failure:
                        errorView

                    case .empty:
                        loadingView

                    @unknown default:
                        loadingView
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(maxHeight: 400)
                .clipped()
            } else {
                errorView
            }

            // Alt text
            if let altText = image.altText, !altText.isEmpty {
                Text(altText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
            }
        }
        .padding(8)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Gestures

    private var magnificationGesture: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                scale = steadyScale * value
            }
            .onEnded { value in
                steadyScale *= value
                scale = steadyScale
                // Clamp scale
                if steadyScale < 0.5 {
                    withAnimation {
                        steadyScale = 0.5
                        scale = 0.5
                    }
                } else if steadyScale > 5.0 {
                    withAnimation {
                        steadyScale = 5.0
                        scale = 5.0
                    }
                }
            }
    }

    // MARK: - Loading / Error Views

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 8) {
            ProgressView()
            Text("acp.image.loading".localized)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
    }

    @ViewBuilder
    private var errorView: some View {
        VStack(spacing: 8) {
            Image(systemName: "photo.badge.exclamationmark")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
            Text("acp.image.error".localized)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
    }

    // MARK: - Actions

    private func saveImage(url: URL) {
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.png, .jpeg]
        panel.nameFieldStringValue = url.lastPathComponent.isEmpty ? "image.png" : url.lastPathComponent

        panel.begin { result in
            guard result == .OK, let saveURL = panel.url else { return }

            Task {
                do {
                    let (data, _) = try await URLSession.shared.data(from: url)
                    try data.write(to: saveURL)
                } catch {
                    // Save failed silently - could show alert in future
                }
            }
        }
    }

    private func copyImageURL() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(image.url, forType: .string)
    }
}

// MARK: - Preview

#Preview {
    AcpImageView(image: AcpImageBlock(
        id: "img-1",
        url: "https://via.placeholder.com/600x400",
        altText: "Sample placeholder image",
        width: 600,
        height: 400
    ))
    .padding()
    .frame(width: 500)
}
