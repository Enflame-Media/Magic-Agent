package com.enflame.happy.data.acp

import com.enflame.happy.domain.model.acp.AcpCommand
import com.enflame.happy.domain.model.acp.AcpConfig
import com.enflame.happy.domain.model.acp.AcpConfigField
import com.enflame.happy.domain.model.acp.AcpSessionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository managing ACP session state.
 *
 * Provides reactive [StateFlow] access to the current ACP session state
 * and methods to update it from WebSocket sync events. Components observe
 * the state flow to reactively update the UI.
 */
@Singleton
class AcpRepository @Inject constructor() {

    private val _sessionState = MutableStateFlow<AcpSessionState?>(null)

    /**
     * The current ACP session state, or null if no session is active.
     */
    val sessionState: StateFlow<AcpSessionState?> = _sessionState.asStateFlow()

    /**
     * Updates the entire session state (typically from a full sync).
     */
    fun updateSessionState(state: AcpSessionState) {
        _sessionState.value = state
    }

    /**
     * Clears the current session state.
     */
    fun clearSession() {
        _sessionState.value = null
    }

    /**
     * Filters the command list based on a search query.
     */
    fun filterCommands(query: String): List<AcpCommand> {
        val currentState = _sessionState.value ?: return emptyList()
        if (query.isBlank()) return currentState.commands

        val lowerQuery = query.lowercase()
        return currentState.commands.filter { command ->
            command.name.lowercase().contains(lowerQuery) ||
                command.description?.lowercase()?.contains(lowerQuery) == true ||
                command.category?.lowercase()?.contains(lowerQuery) == true
        }
    }

    /**
     * Updates a configuration field value.
     */
    fun updateConfigField(fieldId: String, newValue: String) {
        _sessionState.update { state ->
            state?.copy(
                config = state.config?.copy(
                    fields = state.config.fields.map { field ->
                        if (field.id == fieldId) field.copy(value = newValue) else field
                    }
                )
            )
        }
    }

    /**
     * Toggles a thought's collapsed state.
     */
    fun toggleThought(thoughtId: String) {
        _sessionState.update { state ->
            state?.copy(
                thoughts = state.thoughts.map { thought ->
                    if (thought.id == thoughtId) {
                        thought.copy(isCollapsed = !thought.isCollapsed)
                    } else {
                        thought
                    }
                }
            )
        }
    }
}
