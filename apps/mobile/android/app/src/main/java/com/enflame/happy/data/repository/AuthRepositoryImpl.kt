package com.enflame.happy.data.repository

import android.os.Build
import android.util.Base64
import android.util.Log
import com.enflame.happy.data.api.AuthApiService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.domain.model.AuthResponse
import com.enflame.happy.domain.model.PairRequest
import com.enflame.happy.domain.model.VerifyRequest
import com.enflame.happy.domain.repository.AuthException
import com.enflame.happy.domain.repository.AuthRepository
import java.security.KeyPair
import java.security.KeyPairGenerator
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of [AuthRepository] that performs the challenge-response
 * pairing flow matching the iOS AuthService implementation.
 *
 * Flow:
 * 1. Generate an X25519 keypair for this device
 * 2. POST /v1/auth/pair with our public key + the CLI's peer public key
 * 3. Receive a challenge from the server
 * 4. Sign the challenge using HMAC-SHA256 with our private key
 * 5. POST /v1/auth/verify with the signed challenge
 * 6. Receive and store the auth token
 */
@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApiService: AuthApiService,
    private val tokenStorage: TokenStorage
) : AuthRepository {

    override suspend fun performPairing(peerPublicKey: String): AuthResponse {
        // Validate peer public key
        val peerKeyBytes = try {
            Base64.decode(peerPublicKey, Base64.DEFAULT)
        } catch (e: IllegalArgumentException) {
            throw AuthException.InvalidPeerPublicKey("Peer public key is not valid base64")
        }

        if (peerKeyBytes.size != PUBLIC_KEY_SIZE_BYTES) {
            throw AuthException.InvalidPeerPublicKey(
                "Peer public key has invalid size: ${peerKeyBytes.size} bytes (expected $PUBLIC_KEY_SIZE_BYTES)"
            )
        }

        // Step 1: Generate our keypair
        val keypair: KeyPair
        val ourPublicKeyBase64: String
        try {
            keypair = generateX25519Keypair()
            val ourPublicKeyBytes = keypair.public.encoded.takeLast(PUBLIC_KEY_SIZE_BYTES).toByteArray()
            ourPublicKeyBase64 = Base64.encodeToString(ourPublicKeyBytes, Base64.NO_WRAP)

            // Store our private key
            tokenStorage.privateKeyBytes = keypair.private.encoded
            // Store the peer's public key
            tokenStorage.peerPublicKeyBytes = peerKeyBytes
        } catch (e: AuthException) {
            throw e
        } catch (e: Exception) {
            throw AuthException.KeypairGenerationFailed(e)
        }

        // Step 2: Request challenge from server
        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"
        val pairRequest = PairRequest(
            publicKey = ourPublicKeyBase64,
            peerPublicKey = peerPublicKey,
            deviceName = deviceName,
            platform = "android"
        )

        val challengeResponse = try {
            authApiService.pair(pairRequest)
        } catch (e: Exception) {
            Log.e(TAG, "Pairing request failed", e)
            throw AuthException.PairingRequestFailed(
                e.message ?: "Unknown error",
                e
            )
        }

        // Step 3: Sign the challenge using HMAC-SHA256 with our private key raw bytes
        val signedChallenge = try {
            signChallenge(
                challenge = challengeResponse.challenge,
                privateKeyBytes = keypair.private.encoded.takeLast(PUBLIC_KEY_SIZE_BYTES).toByteArray()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Challenge signing failed", e)
            throw AuthException.ChallengeSigningFailed(
                e.message ?: "Unknown error",
                e
            )
        }

        // Step 4: Verify with server
        val verifyRequest = VerifyRequest(
            challengeResponse = signedChallenge,
            publicKey = ourPublicKeyBase64,
            deviceName = deviceName,
            platform = "android"
        )

        val authResponse = try {
            authApiService.verify(verifyRequest)
        } catch (e: Exception) {
            Log.e(TAG, "Verification failed", e)
            throw AuthException.VerificationFailed(
                e.message ?: "Unknown error",
                e
            )
        }

        // Step 5: Store credentials
        tokenStorage.authToken = authResponse.token
        tokenStorage.refreshToken = authResponse.refreshToken
        tokenStorage.accountId = authResponse.accountId
        tokenStorage.machineId = authResponse.machineId

        Log.d(TAG, "Pairing completed successfully for account: ${authResponse.accountId}")
        return authResponse
    }

    override fun hasStoredCredentials(): Boolean {
        return tokenStorage.hasStoredCredentials()
    }

    override fun getAuthToken(): String? {
        return tokenStorage.authToken
    }

    override fun logout() {
        tokenStorage.clearAll()
    }

    /**
     * Generates an X25519 keypair for key agreement.
     */
    private fun generateX25519Keypair(): KeyPair {
        val keyPairGenerator = KeyPairGenerator.getInstance("X25519")
        return keyPairGenerator.generateKeyPair()
    }

    /**
     * Signs the challenge using HMAC-SHA256 with the private key bytes,
     * matching the iOS implementation.
     *
     * @param challenge Base64-encoded challenge from the server.
     * @param privateKeyBytes Raw private key bytes (32 bytes) used as HMAC key.
     * @return Base64-encoded HMAC signature.
     */
    private fun signChallenge(challenge: String, privateKeyBytes: ByteArray): String {
        val challengeData = Base64.decode(challenge, Base64.DEFAULT)

        val mac = Mac.getInstance("HmacSHA256")
        val secretKeySpec = SecretKeySpec(privateKeyBytes, "HmacSHA256")
        mac.init(secretKeySpec)

        val signature = mac.doFinal(challengeData)
        return Base64.encodeToString(signature, Base64.NO_WRAP)
    }

    companion object {
        private const val TAG = "AuthRepositoryImpl"
        /** X25519 public key size in bytes. */
        private const val PUBLIC_KEY_SIZE_BYTES = 32
    }
}
