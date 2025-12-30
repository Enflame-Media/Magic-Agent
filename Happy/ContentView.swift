//
//  ContentView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// The root view of the Happy application.
///
/// This view serves as the main container and will be replaced with
/// proper navigation and content views as the app develops.
struct ContentView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "sparkles")
                .font(.system(size: 60))
                .foregroundStyle(.blue.gradient)

            Text("Happy")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Remote control for Claude Code")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()
                .frame(height: 40)

            Text("Setup Required")
                .font(.headline)

            Text("Scan the QR code from Claude Code CLI to connect")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(minWidth: 400, minHeight: 300)
    }
}

#Preview {
    ContentView()
}
