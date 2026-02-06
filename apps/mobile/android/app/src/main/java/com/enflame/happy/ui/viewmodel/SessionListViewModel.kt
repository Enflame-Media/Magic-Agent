package com.enflame.happy.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Filter options for the session list.
 */
enum class SessionFilter(val label: String) {
    ALL("All"),
    ACTIVE("Active"),
    COMPLETED("Completed"),
    ERROR("Error")
}

/**
 * Connection status for the sync service.
 */
enum class ConnectionStatus {
    CONNECTED,
    CONNECTING,
    DISCONNECTED,
    RECONNECTING
}

/**
 * UI state for the session list screen.
 */
data class SessionListUiState(
    val isLoading: Boolean = false,
    val hasLoaded: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val searchQuery: String = "",
    val filter: SessionFilter = SessionFilter.ALL,
    val connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED
)

/**
 * ViewModel for the Sessions List screen.
 *
 * Manages session loading, filtering, searching, and pull-to-refresh.
 * Observes sessions from the repository as a reactive Flow and combines
 * with UI state for filtered/searched results.
 */
@HiltViewModel
class SessionListViewModel @Inject constructor(
    private val sessionRepository: SessionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SessionListUiState())
    val uiState: StateFlow<SessionListUiState> = _uiState.asStateFlow()

    /**
     * Raw sessions from the repository, sorted by most recent activity.
     */
    private val allSessions: StateFlow<List<Session>> = sessionRepository.getSessions()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /**
     * Filtered and searched sessions for display.
     * Combines the raw session list with the current filter and search query.
     */
    val filteredSessions: StateFlow<List<Session>> = combine(
        allSessions,
        _uiState
    ) { sessions, state ->
        var result = sessions

        // Apply status filter
        result = when (state.filter) {
            SessionFilter.ALL -> result
            SessionFilter.ACTIVE -> result.filter {
                it.status == SessionStatus.ACTIVE || it.status == SessionStatus.IDLE
            }
            SessionFilter.COMPLETED -> result.filter {
                it.status == SessionStatus.COMPLETED
            }
            SessionFilter.ERROR -> result.filter {
                it.status == SessionStatus.DISCONNECTED
            }
        }

        // Apply search filter
        if (state.searchQuery.isNotBlank()) {
            val query = state.searchQuery.lowercase()
            result = result.filter { session ->
                (session.title?.lowercase()?.contains(query) == true) ||
                    (session.machineName?.lowercase()?.contains(query) == true) ||
                    session.id.lowercase().contains(query)
            }
        }

        // Sort by most recent activity
        result.sortedByDescending { it.updatedAt ?: it.createdAt }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        loadSessions()
    }

    /**
     * Initial load of sessions from the repository.
     */
    fun loadSessions() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                sessionRepository.refreshSessions()
                _uiState.update { it.copy(isLoading = false, hasLoaded = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        hasLoaded = true,
                        errorMessage = e.message ?: "Failed to load sessions"
                    )
                }
            }
        }
    }

    /**
     * Refresh sessions via pull-to-refresh.
     */
    fun refreshSessions() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            try {
                sessionRepository.refreshSessions()
                _uiState.update { it.copy(isRefreshing = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isRefreshing = false,
                        errorMessage = e.message ?: "Failed to refresh sessions"
                    )
                }
            }
        }
    }

    /**
     * Update the search query for filtering sessions.
     */
    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    /**
     * Update the status filter.
     */
    fun onFilterChanged(filter: SessionFilter) {
        _uiState.update { it.copy(filter = filter) }
    }

    /**
     * Dismiss the current error message.
     */
    fun dismissError() {
        _uiState.update { it.copy(errorMessage = null) }
    }
}
