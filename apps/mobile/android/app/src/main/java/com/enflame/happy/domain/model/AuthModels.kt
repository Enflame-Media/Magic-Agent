package com.enflame.happy.domain.model

import kotlinx.serialization.Serializable

/**
 * Represents the current authentication state in the pairing flow.
 */
sealed interface AuthState {
    /** No active authentication. */
    data object Unauthenticated : AuthState

    /** Pairing initiated, waiting for server challenge. */
    data object AwaitingPairing : AuthState

    /** Challenge received, performing challenge-response verification. */
    data object Authenticating : AuthState

    /** Successfully authenticated with the server. */
    data object Authenticated : AuthState

    /** Authentication failed with an error. */
    data class Error(val message: String) : AuthState
}

/**
 * Request body sent to POST /v1/auth/pair to initiate pairing.
 */
@Serializable
data class PairRequest(
    val publicKey: String,
    val peerPublicKey: String,
    val deviceName: String,
    val platform: String = "android",
    val machineId: String = ""
)

/**
 * Response from POST /v1/auth/pair containing the server challenge.
 */
@Serializable
data class ChallengeResponse(
    val challenge: String,
    val machineId: String,
    val token: String
)

/**
 * Request body sent to POST /v1/auth/verify with the signed challenge.
 */
@Serializable
data class VerifyRequest(
    val challengeResponse: String,
    val publicKey: String,
    val deviceName: String,
    val platform: String = "android"
)

/**
 * Response from POST /v1/auth/verify containing the auth token.
 */
@Serializable
data class AuthResponse(
    val token: String,
    val refreshToken: String? = null,
    val accountId: String,
    val machineId: String
)
