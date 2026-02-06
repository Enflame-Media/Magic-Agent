package com.enflame.happy.ui.viewmodel

import com.enflame.happy.domain.model.AuthResponse
import com.enflame.happy.domain.model.AuthState
import com.enflame.happy.domain.repository.AuthException
import com.enflame.happy.domain.repository.AuthRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PairingViewModelTest {

    private lateinit var viewModel: PairingViewModel
    private lateinit var mockAuthRepository: AuthRepository

    private val testDispatcher = StandardTestDispatcher()

    private val validPublicKey = "dGVzdHB1YmxpY2tleXRoYXRpc2V4YWN0bHkzMmJ5dGVz"

    private val successAuthResponse = AuthResponse(
        token = "test-token-123",
        refreshToken = "test-refresh-token",
        accountId = "account-456",
        machineId = "machine-789"
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockAuthRepository = mockk()
        viewModel = PairingViewModel(mockAuthRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is not pairing with no error`() = runTest {
        val state = viewModel.uiState.first()
        assertFalse(state.isPairing)
        assertNull(state.errorMessage)
        assertTrue(state.authState is AuthState.Unauthenticated)
    }

    @Test
    fun `confirmPairing sets authenticated state on success`() = runTest {
        coEvery { mockAuthRepository.performPairing(validPublicKey) } returns successAuthResponse
        var successCalled = false

        viewModel.confirmPairing(validPublicKey) { successCalled = true }
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isPairing)
        assertNull(state.errorMessage)
        assertTrue(state.authState is AuthState.Authenticated)
        assertTrue(successCalled)
        coVerify(exactly = 1) { mockAuthRepository.performPairing(validPublicKey) }
    }

    @Test
    fun `confirmPairing sets error state on AuthException`() = runTest {
        val exception = AuthException.PairingRequestFailed("Connection refused")
        coEvery { mockAuthRepository.performPairing(validPublicKey) } throws exception

        viewModel.confirmPairing(validPublicKey) {}
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isPairing)
        assertTrue(state.errorMessage != null)
        assertTrue(state.errorMessage!!.contains("Connection refused"))
        assertTrue(state.authState is AuthState.Error)
    }

    @Test
    fun `confirmPairing sets error state on unexpected exception`() = runTest {
        coEvery { mockAuthRepository.performPairing(validPublicKey) } throws RuntimeException("Unexpected")

        viewModel.confirmPairing(validPublicKey) {}
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isPairing)
        assertTrue(state.errorMessage != null)
        assertTrue(state.authState is AuthState.Error)
    }

    @Test
    fun `confirmPairing does not call repository if already pairing`() = runTest {
        coEvery { mockAuthRepository.performPairing(validPublicKey) } coAnswers {
            // Simulate slow response
            kotlinx.coroutines.delay(1000)
            successAuthResponse
        }

        // Start first pairing
        viewModel.confirmPairing(validPublicKey) {}
        // Try to start second pairing immediately (should be ignored)
        viewModel.confirmPairing(validPublicKey) {}

        advanceUntilIdle()

        coVerify(exactly = 1) { mockAuthRepository.performPairing(validPublicKey) }
    }

    @Test
    fun `dismissError clears error message`() = runTest {
        coEvery { mockAuthRepository.performPairing(validPublicKey) } throws
            AuthException.NetworkError("timeout")

        viewModel.confirmPairing(validPublicKey) {}
        advanceUntilIdle()

        assertTrue(viewModel.uiState.first().errorMessage != null)

        viewModel.dismissError()

        assertNull(viewModel.uiState.first().errorMessage)
    }

    @Test
    fun `confirmPairing handles invalid peer key error`() = runTest {
        coEvery { mockAuthRepository.performPairing(any()) } throws
            AuthException.InvalidPeerPublicKey("Invalid base64")

        viewModel.confirmPairing("bad-key") {}
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.errorMessage!!.contains("Invalid"))
        assertTrue(state.authState is AuthState.Error)
    }

    @Test
    fun `confirmPairing handles verification failed error`() = runTest {
        coEvery { mockAuthRepository.performPairing(validPublicKey) } throws
            AuthException.VerificationFailed("Server rejected challenge")

        viewModel.confirmPairing(validPublicKey) {}
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.errorMessage!!.contains("Verification failed"))
    }

    @Test
    fun `success callback is not called on failure`() = runTest {
        coEvery { mockAuthRepository.performPairing(validPublicKey) } throws
            AuthException.NetworkError("offline")

        var successCalled = false
        viewModel.confirmPairing(validPublicKey) { successCalled = true }
        advanceUntilIdle()

        assertFalse(successCalled)
    }
}
