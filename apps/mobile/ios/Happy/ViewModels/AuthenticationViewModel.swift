//
//  AuthenticationViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// ViewModel for managing authentication state and UI transitions.
final class AuthenticationViewModel: ObservableObject {

    @Published private(set) var authState: AuthState = .unauthenticated
    @Published private(set) var isPairing: Bool = false
    @Published var errorMessage: String?
    @Published var showError: Bool = false
    @Published var isAuthenticated: Bool = false

    private let authService: AuthService

    init(authService: AuthService = .shared) {
        self.authService = authService
        self.authState = authService.state
        self.isAuthenticated = authService.isAuthenticated
    }

    @MainActor
    func startPairing(with payload: QRCodePayload) async {
        isPairing = true
        errorMessage = nil
        showError = false

        do {
            try await authService.startPairing(with: payload)
            authState = authService.state
            isAuthenticated = true
        } catch {
            authState = authService.state
            errorMessage = error.localizedDescription
            showError = true
            isAuthenticated = false
        }
        isPairing = false
    }

    @MainActor
    func checkExistingAuth() async {
        guard authService.hasStoredCredentials() else {
            authState = .unauthenticated
            isAuthenticated = false
            return
        }

        do {
            try await authService.validateToken()
            authState = authService.state
            isAuthenticated = authService.isAuthenticated
        } catch {
            authState = .unauthenticated
            isAuthenticated = false
        }
    }

    @MainActor
    func logout() {
        authService.logout()
        authState = .unauthenticated
        isAuthenticated = false
        errorMessage = nil
        showError = false
    }

    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    var machineName: String? { authService.machine?.name }
    var connectedServerUrl: String? { authService.serverUrl }
}
