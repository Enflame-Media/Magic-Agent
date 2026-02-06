package com.enflame.happy.data.repository

import android.os.Build
import android.util.Base64
import com.enflame.happy.data.api.AuthApiService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.domain.model.AuthResponse
import com.enflame.happy.domain.model.ChallengeResponse
import com.enflame.happy.domain.repository.AuthException
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.lang.reflect.Field
import java.lang.reflect.Modifier

class AuthRepositoryImplTest {

    private lateinit var repository: AuthRepositoryImpl
    private lateinit var mockAuthApiService: AuthApiService
    private lateinit var mockTokenStorage: TokenStorage

    // A valid 32-byte key encoded as base64
    private val validPeerPublicKey: String = java.util.Base64.getEncoder()
        .encodeToString(ByteArray(32) { it.toByte() })

    private val testChallengeResponse = ChallengeResponse(
        challenge = java.util.Base64.getEncoder().encodeToString("test-challenge".toByteArray()),
        machineId = "machine-123",
        token = "temp-token"
    )

    private val testAuthResponse = AuthResponse(
        token = "auth-token-xyz",
        refreshToken = "refresh-token-xyz",
        accountId = "account-123",
        machineId = "machine-123"
    )

    @Before
    fun setUp() {
        // Mock android.util.Base64 since it's not available in unit tests
        mockkStatic(Base64::class)
        every { Base64.decode(any<String>(), any()) } answers {
            java.util.Base64.getDecoder().decode(firstArg<String>())
        }
        every { Base64.encodeToString(any<ByteArray>(), any()) } answers {
            java.util.Base64.getEncoder().encodeToString(firstArg<ByteArray>())
        }
        every { Base64.encode(any<ByteArray>(), any()) } answers {
            java.util.Base64.getEncoder().encode(firstArg<ByteArray>())
        }

        // Set Build fields for unit tests (android.os.Build fields are empty in JVM tests)
        setStaticField(Build::class.java.getField("MANUFACTURER"), "Test")
        setStaticField(Build::class.java.getField("MODEL"), "TestDevice")

        mockAuthApiService = mockk()
        mockTokenStorage = mockk(relaxed = true)

        repository = AuthRepositoryImpl(mockAuthApiService, mockTokenStorage)
    }

    @After
    fun tearDown() {
        unmockkStatic(Base64::class)
    }

    /**
     * Sets a static final field value via reflection for unit testing.
     */
    private fun setStaticField(field: Field, value: Any) {
        field.isAccessible = true
        // Remove final modifier
        val modifiersField = try {
            Field::class.java.getDeclaredField("modifiers")
        } catch (e: NoSuchFieldException) {
            // Java 12+ removed the modifiers field, skip
            return
        }
        modifiersField.isAccessible = true
        modifiersField.setInt(field, field.modifiers and Modifier.FINAL.inv())
        field.set(null, value)
    }

    @Test
    fun `performPairing throws InvalidPeerPublicKey for non-base64 key`() = runTest {
        // Non-base64 string will throw on decode
        every { Base64.decode("not-valid!!!", any()) } throws IllegalArgumentException("bad base64")

        try {
            repository.performPairing("not-valid!!!")
            fail("Expected AuthException.InvalidPeerPublicKey")
        } catch (e: AuthException.InvalidPeerPublicKey) {
            assertTrue(e.message!!.contains("not valid base64"))
        }
    }

    @Test
    fun `performPairing throws InvalidPeerPublicKey for wrong-sized key`() = runTest {
        val shortKey = java.util.Base64.getEncoder().encodeToString(ByteArray(16))

        try {
            repository.performPairing(shortKey)
            fail("Expected AuthException.InvalidPeerPublicKey")
        } catch (e: AuthException.InvalidPeerPublicKey) {
            assertTrue(e.message!!.contains("invalid size"))
        }
    }

    @Test
    fun `performPairing stores credentials on success`() = runTest {
        coEvery { mockAuthApiService.pair(any()) } returns testChallengeResponse
        coEvery { mockAuthApiService.verify(any()) } returns testAuthResponse

        val result = repository.performPairing(validPeerPublicKey)

        assertEquals(testAuthResponse.token, result.token)
        assertEquals(testAuthResponse.accountId, result.accountId)
        assertEquals(testAuthResponse.machineId, result.machineId)

        // Verify credentials were stored
        verify { mockTokenStorage.authToken = testAuthResponse.token }
        verify { mockTokenStorage.refreshToken = testAuthResponse.refreshToken }
        verify { mockTokenStorage.accountId = testAuthResponse.accountId }
        verify { mockTokenStorage.machineId = testAuthResponse.machineId }
    }

    @Test
    fun `performPairing stores private and peer public keys`() = runTest {
        coEvery { mockAuthApiService.pair(any()) } returns testChallengeResponse
        coEvery { mockAuthApiService.verify(any()) } returns testAuthResponse

        repository.performPairing(validPeerPublicKey)

        // Verify key material was stored
        verify { mockTokenStorage.privateKeyBytes = any() }
        verify { mockTokenStorage.peerPublicKeyBytes = any() }
    }

    @Test
    fun `performPairing throws PairingRequestFailed on API pair error`() = runTest {
        coEvery { mockAuthApiService.pair(any()) } throws RuntimeException("Connection refused")

        try {
            repository.performPairing(validPeerPublicKey)
            fail("Expected AuthException.PairingRequestFailed")
        } catch (e: AuthException.PairingRequestFailed) {
            assertTrue(e.message!!.contains("Connection refused"))
        }
    }

    @Test
    fun `performPairing throws VerificationFailed on API verify error`() = runTest {
        coEvery { mockAuthApiService.pair(any()) } returns testChallengeResponse
        coEvery { mockAuthApiService.verify(any()) } throws RuntimeException("Server error")

        try {
            repository.performPairing(validPeerPublicKey)
            fail("Expected AuthException.VerificationFailed")
        } catch (e: AuthException.VerificationFailed) {
            assertTrue(e.message!!.contains("Server error"))
        }
    }

    @Test
    fun `performPairing sends android platform in pair request`() = runTest {
        coEvery { mockAuthApiService.pair(any()) } returns testChallengeResponse
        coEvery { mockAuthApiService.verify(any()) } returns testAuthResponse

        repository.performPairing(validPeerPublicKey)

        coVerify { mockAuthApiService.pair(match { it.platform == "android" }) }
    }

    @Test
    fun `performPairing sends peer public key in pair request`() = runTest {
        coEvery { mockAuthApiService.pair(any()) } returns testChallengeResponse
        coEvery { mockAuthApiService.verify(any()) } returns testAuthResponse

        repository.performPairing(validPeerPublicKey)

        coVerify { mockAuthApiService.pair(match { it.peerPublicKey == validPeerPublicKey }) }
    }

    @Test
    fun `hasStoredCredentials delegates to token storage`() {
        every { mockTokenStorage.hasStoredCredentials() } returns true
        assertTrue(repository.hasStoredCredentials())

        every { mockTokenStorage.hasStoredCredentials() } returns false
        assertTrue(!repository.hasStoredCredentials())
    }

    @Test
    fun `getAuthToken delegates to token storage`() {
        every { mockTokenStorage.authToken } returns "my-token"
        assertEquals("my-token", repository.getAuthToken())

        every { mockTokenStorage.authToken } returns null
        assertEquals(null, repository.getAuthToken())
    }

    @Test
    fun `logout clears token storage`() {
        repository.logout()
        verify { mockTokenStorage.clearAll() }
    }
}
