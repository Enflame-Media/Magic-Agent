//
//  ImageViewerView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI
import UIKit

/// A view that displays an image artifact with pinch-to-zoom and pan gestures.
///
/// Supports:
/// - Rendering image data from Base64-encoded artifact content
/// - Pinch-to-zoom with configurable min/max scale
/// - Pan/drag to navigate zoomed images
/// - Double-tap to toggle between fit and 2x zoom
/// - Reset button to return to original scale
struct ImageViewerView: View {

    /// The raw content string of the image artifact (Base64-encoded or URL).
    let content: String

    /// Optional title for the image.
    let title: String?

    @State private var scale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var offset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var uiImage: UIImage?
    @State private var loadError: Bool = false

    private let minScale: CGFloat = 1.0
    private let maxScale: CGFloat = 5.0

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                if let image = uiImage {
                    imageContent(image: image, geometry: geometry)
                } else if loadError {
                    errorView
                } else {
                    loadingView
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.systemBackground))
        }
        .onAppear {
            loadImage()
        }
    }

    // MARK: - Image Content

    private func imageContent(image: UIImage, geometry: GeometryProxy) -> some View {
        Image(uiImage: image)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .scaleEffect(scale)
            .offset(offset)
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        let newScale = lastScale * value
                        scale = min(max(newScale, minScale), maxScale)
                    }
                    .onEnded { _ in
                        lastScale = scale
                        if scale <= minScale {
                            withAnimation(.spring(response: 0.3)) {
                                offset = .zero
                                lastOffset = .zero
                            }
                        }
                    }
            )
            .simultaneousGesture(
                DragGesture()
                    .onChanged { value in
                        guard scale > minScale else { return }
                        offset = CGSize(
                            width: lastOffset.width + value.translation.width,
                            height: lastOffset.height + value.translation.height
                        )
                    }
                    .onEnded { _ in
                        lastOffset = offset
                    }
            )
            .onTapGesture(count: 2) {
                withAnimation(.spring(response: 0.3)) {
                    if scale > minScale {
                        scale = minScale
                        lastScale = minScale
                        offset = .zero
                        lastOffset = .zero
                    } else {
                        scale = 2.0
                        lastScale = 2.0
                    }
                }
            }
            .overlay(alignment: .bottomTrailing) {
                if scale > minScale {
                    resetButton
                }
            }
    }

    // MARK: - Reset Button

    private var resetButton: some View {
        Button {
            withAnimation(.spring(response: 0.3)) {
                scale = minScale
                lastScale = minScale
                offset = .zero
                lastOffset = .zero
            }
        } label: {
            Image(systemName: "arrow.counterclockwise")
                .font(.body)
                .foregroundStyle(.white)
                .padding(10)
                .background(Color.black.opacity(0.6))
                .clipShape(Circle())
        }
        .padding()
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("artifacts.imageLoading".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Error View

    private var errorView: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("artifacts.imageLoadError".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button {
                loadImage()
            } label: {
                Label("common.retry".localized, systemImage: "arrow.clockwise")
                    .font(.subheadline)
            }
            .buttonStyle(.bordered)
        }
    }

    // MARK: - Image Loading

    /// Attempts to load the image from the artifact content.
    ///
    /// Supports Base64-encoded image data (with or without data URI prefix)
    /// and raw Base64 strings.
    private func loadImage() {
        loadError = false
        uiImage = nil

        // Try to decode as Base64
        var base64String = content

        // Strip data URI prefix if present (e.g., "data:image/png;base64,...")
        if let commaIndex = base64String.firstIndex(of: ","),
           base64String.hasPrefix("data:image") {
            base64String = String(base64String[base64String.index(after: commaIndex)...])
        }

        // Remove whitespace and newlines from Base64 string
        base64String = base64String
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\n", with: "")
            .replacingOccurrences(of: "\r", with: "")
            .replacingOccurrences(of: " ", with: "")

        if let data = Data(base64Encoded: base64String),
           let image = UIImage(data: data) {
            uiImage = image
        } else {
            // Try treating the whole content as raw data
            if let data = content.data(using: .utf8),
               let image = UIImage(data: data) {
                uiImage = image
            } else {
                loadError = true
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ImageViewerView(
        content: "",
        title: "Sample Image"
    )
}
