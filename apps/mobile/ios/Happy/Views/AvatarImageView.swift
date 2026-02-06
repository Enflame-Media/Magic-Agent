//
//  AvatarImageView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A reusable avatar view that loads images from a URL with a fallback placeholder.
///
/// Shows the user's initials on a colored circle as a placeholder while loading,
/// and displays the loaded image when available. Uses `AsyncImage` for
/// native SwiftUI async image loading.
struct AvatarImageView: View {

    /// The URL string of the avatar image. Nil shows only the placeholder.
    let avatarUrl: String?

    /// The display name used for the initials placeholder.
    let displayName: String

    /// The diameter of the avatar circle.
    let size: CGFloat

    /// The accent color for the placeholder background.
    var accentColor: Color = .blue

    var body: some View {
        if let urlString = avatarUrl, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    placeholderView
                        .overlay {
                            ProgressView()
                                .scaleEffect(size > 60 ? 0.8 : 0.5)
                        }
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                case .failure:
                    placeholderView
                @unknown default:
                    placeholderView
                }
            }
        } else {
            placeholderView
        }
    }

    private var placeholderView: some View {
        ZStack {
            Circle()
                .fill(accentColor.opacity(0.15))
                .frame(width: size, height: size)

            Text(initials)
                .font(fontSize)
                .fontWeight(.bold)
                .foregroundStyle(accentColor)
        }
    }

    private var initials: String {
        String(displayName.prefix(1)).uppercased()
    }

    private var fontSize: Font {
        if size >= 80 {
            return .largeTitle
        } else if size >= 44 {
            return .headline
        } else {
            return .caption
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 20) {
        AvatarImageView(avatarUrl: nil, displayName: "Alice", size: 80)
        AvatarImageView(avatarUrl: nil, displayName: "Bob", size: 44)
        AvatarImageView(avatarUrl: "https://example.com/avatar.jpg", displayName: "Carol", size: 60)
    }
}
