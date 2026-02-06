package com.enflame.happy.domain.repository

import com.enflame.happy.domain.model.AuthResponse

/**
 * Repository interface for authentication operations.
 *
 * Defines the contract for the pairing challenge-response flow
 * and credential management.
 */
interface AuthRepository {

    /**
     * Performs the full pairing flow: keypair generation, challenge-response,
     * and token storage.
     *
     * @param peerPublicKey Base64-encoded public key from the scanned QR code (CLI's key).
     * @return The authentication response from the server.
     * @throws AuthException if any step of the pairing flow fails.
     */
    suspend fun performPairing(peerPublicKey: String): AuthResponse

    /**
     * Returns true if stored credentials exist (auth token + keys).
     */
    fun hasStoredCredentials(): Boolean

    /**
     * Returns the stored auth token, or null if not authenticated.
     */
    fun getAuthToken(): String?

    /**
     * Clears all stored credentials and authentication state.
     */
    fun logout()
}

/**
 * Errors that can occur during authentication.
 */
sealed class AuthException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    /** Failed to generate the X25519 keypair. */
    class KeypairGenerationFailed(cause: Throwable) :
        AuthException("Failed to generate keypair: ${cause.message}", cause)

    /** The peer's public key from the QR code is invalid. */
    class InvalidPeerPublicKey(message: String = "Invalid peer public key") :
        AuthException(message)

    /** The pairing request to the server failed. */
    class PairingRequestFailed(message: String, cause: Throwable? = null) :
        AuthException("Pairing request failed: $message", cause)

    /** The challenge signing step failed. */
    class ChallengeSigningFailed(message: String, cause: Throwable? = null) :
        AuthException("Challenge signing failed: $message", cause)

    /** The verification request to the server failed. */
    class VerificationFailed(message: String, cause: Throwable? = null) :
        AuthException("Verification failed: $message", cause)

    /** A network error occurred during authentication. */
    class NetworkError(message: String, cause: Throwable? = null) :
        AuthException("Network error: $message", cause)
}
