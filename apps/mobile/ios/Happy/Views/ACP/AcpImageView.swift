//
//  AcpImageView.swift
//  Happy
//
//  Image display with pinch-to-zoom and share sheet.
//

import SwiftUI
import UIKit

/// Displays an ACP image with pinch-to-zoom and share functionality.
struct AcpImageView: View {

    let imageContent: AcpImageContent

    @State private var scale: CGFloat = 1.0
    @State private var showShareSheet = false

    // MARK: - Body

    var body: some View {
        VStack(spacing: 8) {
            if let uiImage = decodedImage {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .scaleEffect(scale)
                    .gesture(
                        MagnificationGesture()
                            .onChanged { value in
                                scale = max(1.0, min(value, 4.0))
                            }
                            .onEnded { _ in
                                withAnimation(.spring()) {
                                    scale = max(1.0, scale)
                                }
                            }
                    )
                    .onTapGesture(count: 2) {
                        withAnimation(.spring()) {
                            scale = scale > 1.0 ? 1.0 : 2.0
                        }
                    }
                    .cornerRadius(8)
                    .accessibilityLabel("acp.image.label".localized)

                HStack {
                    Text(imageContent.mimeType)
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    Spacer()

                    Button {
                        showShareSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.callout)
                    }
                    .accessibilityLabel("acp.image.share".localized)
                }
                .sheet(isPresented: $showShareSheet) {
                    ShareSheet(items: [uiImage])
                }
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "photo")
                        .font(.title)
                        .foregroundColor(.secondary)
                    Text("acp.image.loadError".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(height: 120)
                .frame(maxWidth: .infinity)
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
        }
    }

    // MARK: - Decode

    private var decodedImage: UIImage? {
        guard let data = Data(base64Encoded: imageContent.data) else { return nil }
        return UIImage(data: data)
    }
}

// MARK: - Share Sheet

/// UIKit share sheet wrapper for SwiftUI.
private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
