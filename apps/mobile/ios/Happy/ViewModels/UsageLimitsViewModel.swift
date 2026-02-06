//
//  UsageLimitsViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// Protocol for the usage limits data provider, enabling dependency injection and testing.
protocol UsageLimitsProviding {
    /// Fetches plan usage limits from the server.
    func fetchPlanLimits() async throws -> PlanLimitsResponse
}

/// ViewModel for managing usage limits state and data fetching.
///
/// Fetches plan usage limits from the API and manages loading, error, and refresh states.
/// Uses `ObservableObject` for iOS 16 compatibility.
///
/// Usage:
/// ```swift
/// @StateObject private var viewModel = UsageLimitsViewModel()
///
/// // In view body
/// UsageLimitsWidget(viewModel: viewModel)
///     .task { await viewModel.loadLimits() }
/// ```
final class UsageLimitsViewModel: ObservableObject {

    // MARK: - Published Properties

    /// The fetched plan limits data.
    @Published private(set) var limitsData: PlanLimitsResponse?

    /// Whether the initial load is in progress.
    @Published private(set) var isLoading: Bool = false

    /// Whether a refresh operation is in progress.
    @Published private(set) var isRefreshing: Bool = false

    /// Error message to display, if any.
    @Published private(set) var errorMessage: String?

    /// Tick counter for updating countdown timers.
    @Published private(set) var timerTick: Int = 0

    // MARK: - Computed Properties

    /// Whether limits data is available and has limits to show.
    var hasLimits: Bool {
        guard let data = limitsData, data.limitsAvailable else { return false }
        return data.sessionLimit != nil || !data.weeklyLimits.isEmpty
    }

    /// Whether limits are reported as unavailable from the provider.
    var isUnavailable: Bool {
        guard let data = limitsData else { return false }
        return !data.limitsAvailable
    }

    /// The session limit, if available.
    var sessionLimit: UsageLimit? {
        limitsData?.sessionLimit
    }

    /// The weekly limits array.
    var weeklyLimits: [UsageLimit] {
        limitsData?.weeklyLimits ?? []
    }

    /// Formatted "last updated" text.
    var lastUpdatedText: String? {
        guard let data = limitsData else { return nil }
        // Reference timerTick to trigger re-computation on timer updates
        _ = timerTick
        return UsageFormatting.formatLastUpdated(data.lastUpdatedAt)
    }

    // MARK: - Dependencies

    private let provider: UsageLimitsProviding
    private var timerTask: Task<Void, Never>?

    // MARK: - Initialization

    /// Creates a new usage limits view model.
    ///
    /// - Parameter provider: The data provider for fetching limits. Defaults to
    ///   the API-backed provider using `APIService.shared`.
    init(provider: UsageLimitsProviding = APIUsageLimitsProvider()) {
        self.provider = provider
        startTimer()
    }

    deinit {
        timerTask?.cancel()
    }

    // MARK: - Public Methods

    /// Loads plan limits from the server.
    ///
    /// Sets `isLoading` during the initial fetch. On failure, sets `errorMessage`.
    @MainActor
    func loadLimits() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        do {
            let response = try await provider.fetchPlanLimits()
            limitsData = response
        } catch {
            errorMessage = error.localizedDescription
            #if DEBUG
            print("[UsageLimitsViewModel] Failed to load limits: \(error)")
            #endif
        }

        isLoading = false
    }

    /// Refreshes plan limits from the server (user-initiated).
    ///
    /// Sets `isRefreshing` during the operation, preserving existing data.
    @MainActor
    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        errorMessage = nil

        do {
            let response = try await provider.fetchPlanLimits()
            limitsData = response
        } catch {
            errorMessage = error.localizedDescription
            #if DEBUG
            print("[UsageLimitsViewModel] Failed to refresh limits: \(error)")
            #endif
        }

        isRefreshing = false
    }

    // MARK: - Private Methods

    /// Starts a timer to update countdown displays every minute.
    private func startTimer() {
        timerTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 60_000_000_000) // 60 seconds
                guard !Task.isCancelled, let self = self else { return }
                self.timerTick += 1
            }
        }
    }
}

// MARK: - API-Backed Provider

/// Default provider that fetches usage limits from the Happy API.
struct APIUsageLimitsProvider: UsageLimitsProviding {

    private let apiService: APIService

    init(apiService: APIService = .shared) {
        self.apiService = apiService
    }

    func fetchPlanLimits() async throws -> PlanLimitsResponse {
        do {
            let response: PlanLimitsResponse = try await apiService.fetch("/v1/usage/limits")
            return response
        } catch let error as APIError where error == .notFound {
            // Endpoint not implemented yet - return empty state
            return PlanLimitsResponse(
                sessionLimit: nil,
                weeklyLimits: [],
                lastUpdatedAt: Date().timeIntervalSince1970 * 1000,
                limitsAvailable: false,
                provider: nil
            )
        }
    }
}

// MARK: - Mock Provider for Previews

/// Mock provider returning sample data for SwiftUI previews and testing.
struct MockUsageLimitsProvider: UsageLimitsProviding {

    let response: PlanLimitsResponse
    let shouldFail: Bool
    let delay: TimeInterval

    init(
        response: PlanLimitsResponse = .sample,
        shouldFail: Bool = false,
        delay: TimeInterval = 0.5
    ) {
        self.response = response
        self.shouldFail = shouldFail
        self.delay = delay
    }

    func fetchPlanLimits() async throws -> PlanLimitsResponse {
        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

        if shouldFail {
            throw APIError.serverError(statusCode: 500)
        }

        return response
    }
}
