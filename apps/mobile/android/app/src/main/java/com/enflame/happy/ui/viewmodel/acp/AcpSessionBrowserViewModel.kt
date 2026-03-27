package com.enflame.happy.ui.viewmodel.acp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.acp.AcpRepository
import com.enflame.happy.data.sync.SyncMessage
import com.enflame.happy.data.sync.SyncService
import com.enflame.happy.domain.model.acp.AcpSession
import com.enflame.happy.domain.model.acp.AcpSessionActionType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the ACP session browser screen.
 *
 * Manages the list of available ACP sessions and handles session
 * actions (load, resume, fork) through encrypted relay communication.
 */
@HiltViewModel
class AcpSessionBrowserViewModel @Inject constructor(
    private val acpRepository: AcpRepository,
    private val syncService: SyncService
) : ViewModel() {

    /** Available ACP sessions. */
    val sessions: StateFlow<List<AcpSession>> = acpRepository.sessions

    /** Whether a refresh is in progress. */
    val isRefreshing: StateFlow<Boolean> = acpRepository.isRefreshingSessions

    private val _confirmAction = MutableStateFlow<PendingAction?>(null)

    /** Action pending user confirmation. */
    val confirmAction: StateFlow<PendingAction?> = _confirmAction.asStateFlow()

    private val _actionError = MutableStateFlow<String?>(null)

    /** Error from the last session action, if any. */
    val actionError: StateFlow<String?> = _actionError.asStateFlow()

    init {
        // Listen for ACP session list updates
        viewModelScope.launch {
            syncService.incomingMessages
                .filterIsInstance<SyncMessage.AcpSessionList>()
                .collect { message ->
                    acpRepository.updateSessions(message.sessions)
                }
        }

        // Request initial session list
        refreshSessions()
    }

    /**
     * Refresh the session list from the relay.
     */
    fun refreshSessions() {
        acpRepository.refreshSessions()
    }

    /**
     * Request confirmation for a session action.
     *
     * @param session The target session.
     * @param action The action to perform.
     */
    fun requestAction(session: AcpSession, action: AcpSessionActionType) {
        _confirmAction.value = PendingAction(session = session, action = action)
    }

    /**
     * Confirm and execute the pending session action.
     */
    fun confirmAction() {
        val pending = _confirmAction.value ?: return
        _confirmAction.value = null

        val success = acpRepository.performSessionAction(pending.session.id, pending.action)
        if (!success) {
            _actionError.value = "Failed to send ${pending.action.name.lowercase()} request"
        }
    }

    /**
     * Cancel the pending session action confirmation.
     */
    fun dismissConfirmation() {
        _confirmAction.value = null
    }

    /**
     * Dismiss the action error.
     */
    fun dismissError() {
        _actionError.value = null
    }

    /**
     * Represents a session action pending user confirmation.
     */
    data class PendingAction(
        val session: AcpSession,
        val action: AcpSessionActionType
    )
}
