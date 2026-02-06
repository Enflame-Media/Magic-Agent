package com.enflame.happy.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.domain.model.AuthState
import com.enflame.happy.domain.repository.AuthException
import com.enflame.happy.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the pairing confirmation screen.
 */
data class PairingUiState(
    val authState: AuthState = AuthState.Unauthenticated,
    val isPairing: Boolean = false,
    val errorMessage: String? = null
)

/**
 * ViewModel for the pairing confirmation screen.
 *
 * Manages the pairing flow UI state and delegates to the [AuthRepository]
 * for the actual challenge-response authentication.
 *
 * Connected to the QR scanner flow: receives the scanned public key from
 * navigation arguments and initiates pairing when the user confirms.
 */
@HiltViewModel
class PairingViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PairingUiState())
    val uiState: StateFlow<PairingUiState> = _uiState.asStateFlow()

    /**
     * Initiates the pairing flow with the given peer public key from the QR code.
     *
     * @param peerPublicKey Base64-encoded public key from the scanned QR code.
     * @param onSuccess Callback invoked when pairing completes successfully.
     */
    fun confirmPairing(peerPublicKey: String, onSuccess: () -> Unit) {
        if (_uiState.value.isPairing) return

        viewModelScope.launch {
            _uiState.value = PairingUiState(
                authState = AuthState.AwaitingPairing,
                isPairing = true,
                errorMessage = null
            )

            try {
                _uiState.value = _uiState.value.copy(
                    authState = AuthState.Authenticating
                )

                authRepository.performPairing(peerPublicKey)

                _uiState.value = PairingUiState(
                    authState = AuthState.Authenticated,
                    isPairing = false,
                    errorMessage = null
                )

                Log.d(TAG, "Pairing completed successfully")
                onSuccess()
            } catch (e: AuthException) {
                Log.e(TAG, "Pairing failed", e)
                _uiState.value = PairingUiState(
                    authState = AuthState.Error(e.message ?: "Unknown error"),
                    isPairing = false,
                    errorMessage = e.message
                )
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected pairing error", e)
                _uiState.value = PairingUiState(
                    authState = AuthState.Error(e.message ?: "Unknown error"),
                    isPairing = false,
                    errorMessage = e.message ?: "An unexpected error occurred"
                )
            }
        }
    }

    /**
     * Dismisses the current error state.
     */
    fun dismissError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    companion object {
        private const val TAG = "PairingViewModel"
    }
}
