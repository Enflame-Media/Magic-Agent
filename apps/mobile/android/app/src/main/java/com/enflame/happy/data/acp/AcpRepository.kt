package com.enflame.happy.data.acp

import android.util.Log
import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.sync.SyncService
import com.enflame.happy.domain.model.acp.AcpAgent
import com.enflame.happy.domain.model.acp.AcpAgentSwitchRequest
import com.enflame.happy.domain.model.acp.AcpAgentSwitchResponse
import com.enflame.happy.domain.model.acp.AcpPermission
import com.enflame.happy.domain.model.acp.AcpPermissionDecision
import com.enflame.happy.domain.model.acp.AcpPermissionResponse
import com.enflame.happy.domain.model.acp.AcpPermissionStatus
import com.enflame.happy.domain.model.acp.AcpSession
import com.enflame.happy.domain.model.acp.AcpSessionAction
import com.enflame.happy.domain.model.acp.AcpSessionActionType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for managing ACP (Agent Control Protocol) state and communication.
 *
 * Coordinates between the sync service (WebSocket) and the UI layer for:
 * - **Permission requests**: Queuing incoming requests and sending encrypted responses
 * - **Session browsing**: Maintaining a list of available ACP sessions
 * - **Agent management**: Tracking available agents and handling agent switches
 *
 * All outgoing messages are E2E encrypted before being sent through the relay.
 *
 * ## Architecture
 * - Singleton (Hilt) to maintain state across screen transitions
 * - Uses Kotlin Flow for reactive UI updates
 * - Integrates with [SyncService] for WebSocket communication
 * - Uses [EncryptionService] for E2E encrypted responses
 */
@Singleton
class AcpRepository @Inject constructor(
    private val syncService: SyncService,
    private val encryptionService: EncryptionService,
    private val tokenStorage: TokenStorage,
    private val json: Json,
    private val coroutineScope: CoroutineScope
) {

    // ========================================================================
    // Permission State
    // ========================================================================

    private val _pendingPermissions = MutableStateFlow<List<AcpPermission>>(emptyList())

    /** Flow of pending permission requests, ordered by creation time. */
    val pendingPermissions: StateFlow<List<AcpPermission>> = _pendingPermissions.asStateFlow()

    private val _permissionHistory = MutableStateFlow<List<AcpPermission>>(emptyList())

    /** Flow of resolved permission requests for history display. */
    val permissionHistory: StateFlow<List<AcpPermission>> = _permissionHistory.asStateFlow()

    // ========================================================================
    // Session State
    // ========================================================================

    private val _sessions = MutableStateFlow<List<AcpSession>>(emptyList())

    /** Flow of available ACP sessions. */
    val sessions: StateFlow<List<AcpSession>> = _sessions.asStateFlow()

    private val _isRefreshingSessions = MutableStateFlow(false)

    /** Whether sessions are currently being refreshed. */
    val isRefreshingSessions: StateFlow<Boolean> = _isRefreshingSessions.asStateFlow()

    // ========================================================================
    // Agent State
    // ========================================================================

    private val _agents = MutableStateFlow<List<AcpAgent>>(emptyList())

    /** Flow of available ACP agents. */
    val agents: StateFlow<List<AcpAgent>> = _agents.asStateFlow()

    private val _isSwitchingAgent = MutableStateFlow(false)

    /** Whether an agent switch is in progress. */
    val isSwitchingAgent: StateFlow<Boolean> = _isSwitchingAgent.asStateFlow()

    private val _agentSwitchError = MutableStateFlow<String?>(null)

    /** Error message from the last agent switch attempt, if any. */
    val agentSwitchError: StateFlow<String?> = _agentSwitchError.asStateFlow()

    // ========================================================================
    // Expiry Management
    // ========================================================================

    /** Active timeout jobs keyed by permission ID. */
    private val expiryJobs = mutableMapOf<String, Job>()

    // ========================================================================
    // Permission Management
    // ========================================================================

    /**
     * Add a new permission request to the pending queue.
     *
     * Called by the sync message handler when an `acp-permission-request`
     * message is received and decrypted.
     *
     * Starts an expiry timer that will automatically remove the request
     * from the queue when it times out.
     *
     * @param permission The permission request to add.
     */
    fun addPermissionRequest(permission: AcpPermission) {
        if (permission.isExpired) {
            Log.d(TAG, "Dropping expired permission request: ${permission.id}")
            return
        }

        _pendingPermissions.update { current ->
            // Avoid duplicates
            if (current.any { it.id == permission.id }) {
                current
            } else {
                current + permission
            }
        }

        // Schedule expiry
        scheduleExpiry(permission)
    }

    /**
     * Respond to a permission request with the user's decision.
     *
     * Sends an encrypted response through the relay and moves the request
     * from the pending queue to the history.
     *
     * @param permissionId The permission request ID to respond to.
     * @param decision The user's decision (allow/reject once/always).
     * @return true if the response was sent successfully.
     */
    fun respondToPermission(permissionId: String, decision: AcpPermissionDecision): Boolean {
        val permission = _pendingPermissions.value.find { it.id == permissionId }
            ?: return false

        // Build response
        val response = AcpPermissionResponse(
            permissionId = permissionId,
            sessionId = permission.sessionId,
            decision = decision
        )

        // Send encrypted response through the relay
        val sent = sendEncryptedMessage(
            type = "acp-permission-response",
            payload = json.encodeToString(response)
        )

        if (sent) {
            // Move from pending to history with updated status
            val resolvedStatus = when (decision) {
                AcpPermissionDecision.ALLOW_ONCE -> AcpPermissionStatus.ALLOWED_ONCE
                AcpPermissionDecision.ALLOW_ALWAYS -> AcpPermissionStatus.ALLOWED_ALWAYS
                AcpPermissionDecision.REJECT_ONCE -> AcpPermissionStatus.REJECTED_ONCE
                AcpPermissionDecision.REJECT_ALWAYS -> AcpPermissionStatus.REJECTED_ALWAYS
            }
            val resolved = permission.copy(status = resolvedStatus)

            _pendingPermissions.update { it.filter { p -> p.id != permissionId } }
            _permissionHistory.update { (listOf(resolved) + it).take(MAX_HISTORY_SIZE) }

            // Cancel the expiry timer
            expiryJobs.remove(permissionId)?.cancel()
        }

        return sent
    }

    /**
     * Remove an expired permission from the pending queue.
     */
    private fun expirePermission(permissionId: String) {
        val permission = _pendingPermissions.value.find { it.id == permissionId }
            ?: return

        val expired = permission.copy(status = AcpPermissionStatus.EXPIRED)
        _pendingPermissions.update { it.filter { p -> p.id != permissionId } }
        _permissionHistory.update { (listOf(expired) + it).take(MAX_HISTORY_SIZE) }
        expiryJobs.remove(permissionId)
    }

    /**
     * Schedule an expiry timer for a permission request.
     */
    private fun scheduleExpiry(permission: AcpPermission) {
        expiryJobs[permission.id]?.cancel()
        expiryJobs[permission.id] = coroutineScope.launch {
            delay(permission.remainingMs)
            expirePermission(permission.id)
        }
    }

    // ========================================================================
    // Session Management
    // ========================================================================

    /**
     * Update the list of available ACP sessions.
     *
     * Called when session list data arrives from the sync service.
     *
     * @param sessions The updated session list.
     */
    fun updateSessions(sessions: List<AcpSession>) {
        _sessions.value = sessions
        _isRefreshingSessions.value = false
    }

    /**
     * Request a session refresh from the relay.
     *
     * Sends an encrypted request to list available sessions.
     */
    fun refreshSessions() {
        _isRefreshingSessions.value = true
        sendEncryptedMessage(
            type = "acp-session-list-request",
            payload = "{}"
        )

        // Auto-reset loading after timeout
        coroutineScope.launch {
            delay(REFRESH_TIMEOUT_MS)
            _isRefreshingSessions.value = false
        }
    }

    /**
     * Perform an action on an ACP session (load, resume, fork).
     *
     * @param sessionId The target session ID.
     * @param action The action to perform.
     * @return true if the action request was sent successfully.
     */
    fun performSessionAction(sessionId: String, action: AcpSessionActionType): Boolean {
        val request = AcpSessionAction(
            sessionId = sessionId,
            action = action
        )

        return sendEncryptedMessage(
            type = "acp-session-action",
            payload = json.encodeToString(request)
        )
    }

    // ========================================================================
    // Agent Management
    // ========================================================================

    /**
     * Update the list of available agents.
     *
     * Called when agent list data arrives from the sync service.
     *
     * @param agents The updated agent list.
     */
    fun updateAgents(agents: List<AcpAgent>) {
        _agents.value = agents
    }

    /**
     * Get the currently active agent.
     *
     * @return The active agent, or null if no agent is active.
     */
    fun getActiveAgent(): AcpAgent? {
        return _agents.value.find { it.isActive }
    }

    /**
     * Request an agent switch.
     *
     * Sends an encrypted switch request through the relay. The result
     * is received asynchronously via [handleAgentSwitchResponse].
     *
     * @param sessionId The session to switch agents in.
     * @param agentId The agent ID to switch to.
     */
    fun switchAgent(sessionId: String, agentId: String) {
        _isSwitchingAgent.value = true
        _agentSwitchError.value = null

        val request = AcpAgentSwitchRequest(
            sessionId = sessionId,
            agentId = agentId
        )

        val sent = sendEncryptedMessage(
            type = "acp-agent-switch",
            payload = json.encodeToString(request)
        )

        if (!sent) {
            _isSwitchingAgent.value = false
            _agentSwitchError.value = "Failed to send agent switch request"
        }

        // Auto-reset after timeout
        coroutineScope.launch {
            delay(AGENT_SWITCH_TIMEOUT_MS)
            if (_isSwitchingAgent.value) {
                _isSwitchingAgent.value = false
                _agentSwitchError.value = "Agent switch timed out"
            }
        }
    }

    /**
     * Handle an agent switch response from the relay.
     *
     * @param response The switch response.
     */
    fun handleAgentSwitchResponse(response: AcpAgentSwitchResponse) {
        _isSwitchingAgent.value = false

        if (response.success && response.activeAgentId != null) {
            // Update agent active state
            _agents.update { agents ->
                agents.map { agent ->
                    agent.copy(isActive = agent.id == response.activeAgentId)
                }
            }
            _agentSwitchError.value = null
        } else {
            _agentSwitchError.value = response.error ?: "Agent switch failed"
        }
    }

    /**
     * Clear the agent switch error.
     */
    fun clearAgentSwitchError() {
        _agentSwitchError.value = null
    }

    // ========================================================================
    // Encrypted Communication
    // ========================================================================

    /**
     * Send an E2E encrypted message through the sync service WebSocket.
     *
     * Encrypts the message payload using the shared secret derived from
     * stored key material, then sends it as a binary WebSocket message.
     *
     * @param type The message type identifier.
     * @param payload The JSON payload to encrypt and send.
     * @return true if the message was sent successfully.
     */
    private fun sendEncryptedMessage(type: String, payload: String): Boolean {
        if (!syncService.isConnected) {
            Log.w(TAG, "Cannot send ACP message: not connected")
            return false
        }

        val encryptionKey = loadEncryptionKey()
        if (encryptionKey == null) {
            Log.w(TAG, "Cannot send ACP message: encryption key not available")
            return false
        }

        return try {
            val envelope = json.encodeToString(
                AcpMessageEnvelope(type = type, payload = payload)
            )
            val encrypted = encryptionService.encrypt(
                envelope.toByteArray(Charsets.UTF_8),
                encryptionKey
            )

            syncService.sendEncryptedBytes(encrypted)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send encrypted ACP message", e)
            false
        }
    }

    /**
     * Load the encryption key from stored key material.
     */
    private fun loadEncryptionKey(): ByteArray? {
        val privateKey = tokenStorage.privateKeyBytes ?: return null
        val peerPublicKey = tokenStorage.peerPublicKeyBytes ?: return null

        return try {
            encryptionService.deriveSharedSecret(privateKey, peerPublicKey)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to derive encryption key", e)
            null
        }
    }

    companion object {
        private const val TAG = "AcpRepository"

        /** Maximum number of permission history entries to keep. */
        private const val MAX_HISTORY_SIZE = 50

        /** Timeout for session refresh requests. */
        private const val REFRESH_TIMEOUT_MS = 10_000L

        /** Timeout for agent switch requests. */
        private const val AGENT_SWITCH_TIMEOUT_MS = 15_000L
    }
}

/**
 * Wire format for ACP messages sent through the relay.
 */
@kotlinx.serialization.Serializable
internal data class AcpMessageEnvelope(
    val type: String,
    val payload: String
)
