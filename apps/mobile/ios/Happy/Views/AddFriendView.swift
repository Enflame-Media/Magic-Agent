//
//  AddFriendView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI
import UIKit

/// View for adding a friend via username search or QR code scanning.
///
/// Provides two methods for adding friends:
/// 1. Username search - Type a username and send a request
/// 2. QR code scanning - Scan a friend's QR code (reuses existing QR infrastructure)
struct AddFriendView: View {

    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var username: String = ""
    @State private var message: String = ""
    @State private var showQRScanner = false
    @State private var showShareSheet = false
    @State private var selectedTab: AddFriendMethod = .username
    @State private var qrCodeImage: UIImage?

    var body: some View {
        VStack(spacing: 0) {
            // Method picker
            Picker("friends.addMethod".localized, selection: $selectedTab) {
                ForEach(AddFriendMethod.allCases) { method in
                    Label(method.title, systemImage: method.iconName)
                        .tag(method)
                }
            }
            .pickerStyle(.segmented)
            .padding()

            switch selectedTab {
            case .username:
                usernameSearchView
            case .qrCode:
                qrCodeView
            }
        }
        .navigationTitle("friends.addFriend".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("common.cancel".localized) {
                    dismiss()
                }
            }
        }
        .alert("common.error".localized, isPresented: $viewModel.showError) {
            Button("common.ok".localized) {
                viewModel.dismissError()
            }
        } message: {
            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
            }
        }
        .alert("friends.success".localized, isPresented: $viewModel.showConfirmation) {
            Button("common.ok".localized) {
                viewModel.dismissConfirmation()
                dismiss()
            }
        } message: {
            if let msg = viewModel.confirmationMessage {
                Text(msg)
            }
        }
    }

    // MARK: - Username Search View

    private var usernameSearchView: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Instructions
                VStack(spacing: 8) {
                    Image(systemName: "person.text.rectangle")
                        .font(.system(size: 40))
                        .foregroundStyle(.blue)

                    Text("friends.usernameInstructions".localized)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 16)

                // Username field
                VStack(alignment: .leading, spacing: 8) {
                    Text("friends.username".localized)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("friends.usernamePlaceholder".localized, text: $username)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textContentType(.username)
                }

                // Optional message field
                VStack(alignment: .leading, spacing: 8) {
                    Text("friends.messageOptional".localized)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("friends.messagePlaceholder".localized, text: $message, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3)
                }

                // Send button
                Button {
                    Task {
                        await viewModel.sendFriendRequest(
                            toUsername: username,
                            message: message.isEmpty ? nil : message
                        )
                    }
                } label: {
                    if viewModel.isSendingRequest {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Label("friends.sendRequest".localized, systemImage: "paperplane")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(username.trimmingCharacters(in: .whitespaces).isEmpty || viewModel.isSendingRequest)

                Spacer()
            }
            .padding(.horizontal)
        }
    }

    // MARK: - QR Code View

    private var qrCodeView: some View {
        VStack(spacing: 24) {
            Spacer()

            // QR code display - show the user's own QR code
            VStack(spacing: 16) {
                if let qrImage = qrCodeImage {
                    Image(uiImage: qrImage)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 200, height: 200)
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.blue.opacity(0.3), lineWidth: 2)
                        )
                } else {
                    Image(systemName: "qrcode.viewfinder")
                        .font(.system(size: 64))
                        .foregroundStyle(.blue)
                }

                Text("friends.qrInstructions".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            // Scan button
            Button {
                showQRScanner = true
            } label: {
                Label("friends.scanQRCode".localized, systemImage: "camera.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 40)

            // Share my QR code section
            VStack(spacing: 12) {
                Divider()
                    .padding(.horizontal)

                Text("friends.shareYourCode".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Button {
                    shareQRCode()
                } label: {
                    Label("friends.shareQRCode".localized, systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
                .padding(.horizontal, 40)
                .disabled(qrCodeImage == nil)
            }

            Spacer()
        }
        .fullScreenCover(isPresented: $showQRScanner) {
            NavigationStack {
                FriendQRScannerView(viewModel: viewModel, onDismiss: {
                    showQRScanner = false
                })
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let qrImage = qrCodeImage {
                ShareSheetView(activityItems: [qrImage])
            }
        }
        .onAppear {
            qrCodeImage = viewModel.generateFriendQRCode()
        }
    }

    /// Triggers the native share sheet with the generated QR code image.
    private func shareQRCode() {
        guard qrCodeImage != nil else { return }
        showShareSheet = true
    }
}

// MARK: - Add Friend Method

/// The method for adding a friend.
enum AddFriendMethod: String, CaseIterable, Identifiable {
    case username
    case qrCode

    var id: String { rawValue }

    var title: String {
        switch self {
        case .username: return "friends.addMethod.username".localized
        case .qrCode: return "friends.addMethod.qrCode".localized
        }
    }

    var iconName: String {
        switch self {
        case .username: return "person.text.rectangle"
        case .qrCode: return "qrcode"
        }
    }
}

// MARK: - Friend QR Scanner View

/// A simplified QR scanner specifically for friend code scanning.
///
/// Reuses the existing camera infrastructure from `QRScannerView` but
/// parses friend-specific QR payloads instead of pairing payloads.
struct FriendQRScannerView: View {

    @ObservedObject var viewModel: FriendsViewModel
    let onDismiss: () -> Void

    private let cameraPermission = CameraPermissionService()
    @State private var isScanning = true
    @State private var hasScanned = false
    @State private var permissionState: PermissionState = .checking

    /// Camera permission state for the scanner view.
    private enum PermissionState {
        case checking
        case authorized
        case denied
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch permissionState {
            case .authorized:
                CameraPreviewView(
                    onQRCodeDetected: { value in
                        handleQRCode(value)
                    },
                    isScanning: isScanning
                )
                .ignoresSafeArea()

                // Overlay with instruction
                VStack {
                    Spacer()
                    Text("friends.scanFriendCode".localized)
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .padding()
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.bottom, 48)
                }
            case .denied:
                CameraPermissionDeniedView()
            case .checking:
                ProgressView("scanner.checkingPermission".localized)
                    .foregroundColor(.white)
            }
        }
        .navigationTitle("friends.scanFriend".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("common.cancel".localized) {
                    onDismiss()
                }
                .foregroundColor(.white)
            }
        }
        .task {
            if cameraPermission.isAuthorized {
                permissionState = .authorized
            } else if cameraPermission.isDenied {
                permissionState = .denied
            } else if cameraPermission.isNotDetermined {
                let granted = await cameraPermission.requestPermission()
                permissionState = granted ? .authorized : .denied
            } else {
                permissionState = .denied
            }
        }
    }

    private func handleQRCode(_ rawValue: String) {
        guard !hasScanned else { return }
        hasScanned = true
        isScanning = false

        // Try to parse as a friend QR code
        // Expected format: {"userId": "...", "publicKey": "...", "type": "friend"}
        guard let data = rawValue.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let userId = json["userId"] as? String,
              let publicKey = json["publicKey"] as? String else {
            // Reset and continue scanning if not a valid friend QR
            hasScanned = false
            isScanning = true
            return
        }

        Task {
            await viewModel.sendFriendRequestByQR(userId: userId, publicKey: publicKey)
            onDismiss()
        }
    }
}

// MARK: - Share Sheet

/// A UIKit wrapper for `UIActivityViewController` to present the system share sheet.
///
/// Used to share QR code images via Messages, AirDrop, email, etc.
struct ShareSheetView: UIViewControllerRepresentable {
    let activityItems: [Any]
    var excludedActivityTypes: [UIActivity.ActivityType]? = nil

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: nil
        )
        controller.excludedActivityTypes = excludedActivityTypes
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AddFriendView(viewModel: FriendsViewModel())
    }
}
