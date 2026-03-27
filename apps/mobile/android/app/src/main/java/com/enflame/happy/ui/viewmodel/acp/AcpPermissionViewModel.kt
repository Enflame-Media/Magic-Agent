package com.enflame.happy.ui.viewmodel.acp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.acp.AcpRepository
import com.enflame.happy.data.notifications.NotificationHelper
import com.enflame.happy.data.sync.SyncMessage
import com.enflame.happy.data.sync.SyncService
import com.enflame.happy.domain.model.acp.AcpPermission
import com.enflame.happy.domain.model.acp.AcpPermissionDecision
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the ACP permission request screen.
 *
 * Manages the permission request queue, handles user decisions,
 * and coordinates with the [AcpRepository] for sending encrypted
 * responses through the relay.
 *
 * ## Responsibilities
 * - Observe incoming permission requests from the sync service
 * - Present the current permission request with timeout countdown
 * - Send encrypted permission responses (allow/reject)
 * - Track permission history
 * - Manage haptic feedback triggers
 */
@HiltViewModel
class AcpPermissionViewModel @Inject constructor(
    private val acpRepository: AcpRepository,
    private val syncService: SyncService,
    private val notificationHelper: NotificationHelper
) : ViewModel() {

    /** Pending permission requests queue. */
    val pendingPermissions: StateFlow<List<AcpPermission>> = acpRepository.pendingPermissions

    /** Resolved permission history. */
    val permissionHistory: StateFlow<List<AcpPermission>> = acpRepository.permissionHistory

    private val _showHapticTrigger = MutableStateFlow(false)

    /** Trigger for haptic feedback when a new permission arrives. */
    val showHapticTrigger: StateFlow<Boolean> = _showHapticTrigger.asStateFlow()

    private val _showHistory = MutableStateFlow(false)

    /** Whether to show the permission history view. */
    val showHistory: StateFlow<Boolean> = _showHistory.asStateFlow()

    init {
        // Listen for incoming ACP permission requests from sync service
        viewModelScope.launch {
            syncService.incomingMessages
                .filterIsInstance<SyncMessage.AcpPermissionRequest>()
                .collect { message ->
                    acpRepository.addPermissionRequest(message.permission)
                    // Trigger haptic feedback
                    _showHapticTrigger.value = true
                }
        }
    }

    /**
     * Respond to a permission request.
     *
     * @param permissionId The permission request ID.
     * @param decision The user's decision.
     */
    fun respond(permissionId: String, decision: AcpPermissionDecision) {
        acpRepository.respondToPermission(permissionId, decision)
        // Cancel the notification if it was shown
        notificationHelper.cancelAcpPermissionNotification(permissionId)
    }

    /**
     * Reset the haptic feedback trigger after it has been consumed.
     */
    fun consumeHapticTrigger() {
        _showHapticTrigger.value = false
    }

    /**
     * Toggle the permission history view.
     */
    fun toggleHistory() {
        _showHistory.value = !_showHistory.value
    }
}
