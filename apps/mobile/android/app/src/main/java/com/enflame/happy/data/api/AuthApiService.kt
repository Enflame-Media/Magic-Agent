package com.enflame.happy.data.api

import com.enflame.happy.domain.model.AuthResponse
import com.enflame.happy.domain.model.ChallengeResponse
import com.enflame.happy.domain.model.PairRequest
import com.enflame.happy.domain.model.VerifyRequest
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Retrofit API service interface for authentication endpoints.
 *
 * Handles the challenge-response pairing flow:
 * 1. POST /v1/auth/pair - Initiate pairing and receive a challenge
 * 2. POST /v1/auth/verify - Submit signed challenge to complete auth
 */
interface AuthApiService {

    /**
     * Initiate pairing with the server.
     *
     * Sends the device's public key and the CLI peer's public key
     * to start the challenge-response authentication flow.
     *
     * @param request The pairing request with public keys and device info.
     * @return A challenge response containing the challenge to sign.
     */
    @POST("v1/auth/pair")
    suspend fun pair(@Body request: PairRequest): ChallengeResponse

    /**
     * Verify the signed challenge to complete authentication.
     *
     * @param request The verification request with the signed challenge.
     * @return The auth response containing the auth token and account info.
     */
    @POST("v1/auth/verify")
    suspend fun verify(@Body request: VerifyRequest): AuthResponse
}
