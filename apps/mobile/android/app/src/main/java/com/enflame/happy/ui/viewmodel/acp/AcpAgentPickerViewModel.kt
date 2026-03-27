package com.enflame.happy.ui.viewmodel.acp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.acp.AcpRepository
import com.enflame.happy.data.sync.SyncMessage
import com.enflame.happy.data.sync.SyncService
import com.enflame.happy.domain.model.acp.AcpAgent
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the ACP agent picker bottom sheet.
 *
 * Manages the list of available agents and handles agent switching
 * through encrypted relay communication with rollback on failure.
 */
@HiltViewModel
class AcpAgentPickerViewModel @Inject constructor(
    private val acpRepository: AcpRepository,
    private val syncService: SyncService
) : ViewModel() {

    /** Available ACP agents. */
    val agents: StateFlow<List<AcpAgent>> = acpRepository.agents

    /** Whether an agent switch is in progress. */
    val isSwitching: StateFlow<Boolean> = acpRepository.isSwitchingAgent

    /** Error message from the last switch attempt. */
    val switchError: StateFlow<String?> = acpRepository.agentSwitchError

    private val _confirmSwitch = MutableStateFlow<AcpAgent?>(null)

    /** Agent pending switch confirmation. */
    val confirmSwitch: StateFlow<AcpAgent?> = _confirmSwitch.asStateFlow()

    init {
        // Listen for agent list updates
        viewModelScope.launch {
            syncService.incomingMessages
                .filterIsInstance<SyncMessage.AcpAgentList>()
                .collect { message ->
                    acpRepository.updateAgents(message.agents)
                }
        }

        // Listen for agent switch responses
        viewModelScope.launch {
            syncService.incomingMessages
                .filterIsInstance<SyncMessage.AcpAgentSwitchResult>()
                .collect { message ->
                    acpRepository.handleAgentSwitchResponse(message.response)
                }
        }
    }

    /**
     * Get the currently active agent.
     */
    fun getActiveAgent(): AcpAgent? = acpRepository.getActiveAgent()

    /**
     * Request confirmation to switch to an agent.
     *
     * @param agent The agent to switch to.
     */
    fun requestSwitch(agent: AcpAgent) {
        if (agent.isActive) return // Already active, no-op
        _confirmSwitch.value = agent
    }

    /**
     * Confirm and execute the agent switch.
     *
     * @param sessionId The session to switch agents in.
     */
    fun confirmSwitch(sessionId: String) {
        val agent = _confirmSwitch.value ?: return
        _confirmSwitch.value = null
        acpRepository.switchAgent(sessionId, agent.id)
    }

    /**
     * Cancel the agent switch confirmation.
     */
    fun dismissConfirmation() {
        _confirmSwitch.value = null
    }

    /**
     * Clear the switch error (for Snackbar dismissal).
     */
    fun clearError() {
        acpRepository.clearAgentSwitchError()
    }
}
