package com.enflame.happy.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.acp.AcpRepository
import com.enflame.happy.domain.model.acp.AcpCommand
import com.enflame.happy.domain.model.acp.AcpSessionState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the ACP session screen.
 */
data class AcpSessionUiState(
    val sessionState: AcpSessionState? = null,
    val isCommandPaletteVisible: Boolean = false,
    val isConfigPanelVisible: Boolean = false,
    val commandSearchQuery: String = "",
    val filteredCommands: List<AcpCommand> = emptyList(),
    val isLoading: Boolean = true,
    val errorMessage: String? = null
)

/**
 * ViewModel for the ACP session display screen.
 *
 * Coordinates between the [AcpRepository] and the Compose UI layer,
 * exposing session state as a reactive [StateFlow] and providing
 * actions for user interaction (command palette, config panel, etc.).
 */
@HiltViewModel
class AcpSessionViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val acpRepository: AcpRepository
) : ViewModel() {

    /**
     * Session ID from navigation argument.
     */
    val sessionId: String = checkNotNull(savedStateHandle["sessionId"]) {
        "sessionId navigation argument is required"
    }

    private val _uiState = MutableStateFlow(AcpSessionUiState())
    val uiState: StateFlow<AcpSessionUiState> = _uiState.asStateFlow()

    /**
     * The ACP session state from the repository, filtered to the current session.
     */
    val sessionState: StateFlow<AcpSessionState?> = acpRepository.sessionState
        .map { state ->
            state?.takeIf { it.sessionId == sessionId }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    init {
        observeSessionState()
    }

    private fun observeSessionState() {
        viewModelScope.launch {
            sessionState.collect { state ->
                _uiState.value = _uiState.value.copy(
                    sessionState = state,
                    isLoading = state == null,
                    filteredCommands = state?.commands ?: emptyList()
                )
            }
        }
    }

    /**
     * Show or hide the command palette bottom sheet.
     */
    fun toggleCommandPalette() {
        _uiState.value = _uiState.value.copy(
            isCommandPaletteVisible = !_uiState.value.isCommandPaletteVisible,
            commandSearchQuery = ""
        )
    }

    /**
     * Dismiss the command palette.
     */
    fun dismissCommandPalette() {
        _uiState.value = _uiState.value.copy(
            isCommandPaletteVisible = false,
            commandSearchQuery = ""
        )
    }

    /**
     * Update the command search query and filter results.
     */
    fun onCommandSearchQueryChanged(query: String) {
        val filtered = acpRepository.filterCommands(query)
        _uiState.value = _uiState.value.copy(
            commandSearchQuery = query,
            filteredCommands = filtered
        )
    }

    /**
     * Show or hide the config panel bottom sheet.
     */
    fun toggleConfigPanel() {
        _uiState.value = _uiState.value.copy(
            isConfigPanelVisible = !_uiState.value.isConfigPanelVisible
        )
    }

    /**
     * Dismiss the config panel.
     */
    fun dismissConfigPanel() {
        _uiState.value = _uiState.value.copy(isConfigPanelVisible = false)
    }

    /**
     * Update a configuration field value.
     */
    fun updateConfigField(fieldId: String, newValue: String) {
        acpRepository.updateConfigField(fieldId, newValue)
    }

    /**
     * Toggle a thought's expanded/collapsed state.
     */
    fun toggleThought(thoughtId: String) {
        acpRepository.toggleThought(thoughtId)
    }

    /**
     * Dismiss the current error message.
     */
    fun dismissError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
