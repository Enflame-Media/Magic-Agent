package com.enflame.happy.ui.viewmodel

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.repository.LocalSessionRepository
import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the session detail screen.
 */
data class SessionDetailUiState(
    val session: Session? = null,
    val messages: List<Message> = emptyList(),
    val isLoading: Boolean = true,
    val hasLoaded: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

/**
 * ViewModel for the session detail screen.
 *
 * Manages loading a specific session and its messages, observing real-time
 * updates via Flow, and coordinating WebSocket subscription/unsubscription
 * for live session updates.
 *
 * The [sessionId] is extracted from the [SavedStateHandle] navigation argument.
 */
@HiltViewModel
class SessionDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val sessionRepository: SessionRepository,
    private val localSessionRepository: LocalSessionRepository,
    private val encryptionService: EncryptionService
) : ViewModel() {

    /**
     * The session ID extracted from the navigation argument.
     */
    val sessionId: String = checkNotNull(savedStateHandle["sessionId"]) {
        "sessionId navigation argument is required"
    }

    private val _uiState = MutableStateFlow(SessionDetailUiState())
    val uiState: StateFlow<SessionDetailUiState> = _uiState.asStateFlow()

    init {
        loadSession()
        observeMessages()
    }

    /**
     * Load the session metadata from the repository.
     */
    private fun loadSession() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            try {
                val session = sessionRepository.getSession(sessionId)
                _uiState.value = _uiState.value.copy(
                    session = session,
                    isLoading = false,
                    hasLoaded = true,
                    errorMessage = if (session == null) "Session not found" else null
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load session: $sessionId", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    hasLoaded = true,
                    errorMessage = e.message ?: "Failed to load session"
                )
            }
        }
    }

    /**
     * Observe messages for the session from the local database.
     * Messages are emitted reactively whenever the local data changes,
     * which includes updates from WebSocket sync.
     */
    private fun observeMessages() {
        viewModelScope.launch {
            localSessionRepository.getMessages(sessionId)
                .catch { e ->
                    Log.e(TAG, "Error observing messages for session: $sessionId", e)
                    _uiState.value = _uiState.value.copy(
                        errorMessage = e.message ?: "Failed to load messages"
                    )
                }
                .collect { messages ->
                    _uiState.value = _uiState.value.copy(
                        messages = messages,
                        hasLoaded = true
                    )
                }
        }
    }

    /**
     * Subscribe to real-time WebSocket updates for this session.
     * Called when the screen becomes visible.
     */
    fun subscribeToUpdates() {
        viewModelScope.launch {
            try {
                sessionRepository.subscribeToSession(sessionId)
                Log.d(TAG, "Subscribed to session updates: $sessionId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to subscribe to session: $sessionId", e)
            }
        }
    }

    /**
     * Unsubscribe from real-time WebSocket updates for this session.
     * Called when the screen is no longer visible.
     */
    fun unsubscribeFromUpdates() {
        viewModelScope.launch {
            try {
                sessionRepository.unsubscribeFromSession(sessionId)
                Log.d(TAG, "Unsubscribed from session updates: $sessionId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to unsubscribe from session: $sessionId", e)
            }
        }
    }

    /**
     * Refresh the session data and messages from the remote server.
     * Used for pull-to-refresh functionality.
     */
    fun refresh() {
        if (_uiState.value.isRefreshing) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true)

            try {
                // Reload session metadata
                val session = sessionRepository.getSession(sessionId)
                _uiState.value = _uiState.value.copy(
                    session = session,
                    isRefreshing = false,
                    errorMessage = null
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to refresh session: $sessionId", e)
                _uiState.value = _uiState.value.copy(
                    isRefreshing = false,
                    errorMessage = e.message ?: "Failed to refresh"
                )
            }
        }
    }

    /**
     * Delete the current session from local storage and remote.
     *
     * @param onSuccess Callback invoked after successful deletion.
     */
    fun deleteSession(onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                localSessionRepository.deleteSession(sessionId)
                Log.d(TAG, "Session deleted: $sessionId")
                onSuccess()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to delete session: $sessionId", e)
                _uiState.value = _uiState.value.copy(
                    errorMessage = e.message ?: "Failed to delete session"
                )
            }
        }
    }

    /**
     * Dismiss the current error message.
     */
    fun dismissError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    companion object {
        private const val TAG = "SessionDetailViewModel"
    }
}
