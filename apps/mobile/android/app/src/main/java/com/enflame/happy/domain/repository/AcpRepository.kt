package com.enflame.happy.domain.repository

import com.enflame.happy.domain.model.acp.AcpAgentRegistryState
import com.enflame.happy.domain.model.acp.AcpPermissionRequestState
import com.enflame.happy.domain.model.acp.AcpSessionState
import com.enflame.happy.domain.model.acp.AcpSessionUpdate
import kotlinx.coroutines.flow.StateFlow

/**
 * Repository interface for ACP (Agent Client Protocol) session state.
 *
 * Provides reactive access to ACP session state via StateFlow and
 * operations for applying updates and managing permission requests.
 *
 * This follows the Clean Architecture pattern: domain layer defines the
 * interface, data layer provides the implementation.
 */
interface AcpRepository {

    /**
     * Get the accumulated ACP session state for a specific session.
     *
     * @param sessionId The session to observe.
     * @return A StateFlow emitting the current ACP state, or null if no state exists.
     */
    fun getSessionState(sessionId: String): StateFlow<AcpSessionState?>

    /**
     * Apply an ACP session update to the accumulated state.
     *
     * Thread-safe: updates are applied atomically to the internal MutableStateFlow.
     *
     * @param sessionId The session to update.
     * @param update The ACP session update to apply.
     */
    fun applyUpdate(sessionId: String, update: AcpSessionUpdate)

    /**
     * Add a permission request to the session state.
     *
     * @param sessionId The session this request belongs to.
     * @param request The permission request to add.
     */
    fun addPermissionRequest(sessionId: String, request: AcpPermissionRequestState)

    /**
     * Resolve a permission request (user responded or timeout expired).
     *
     * Moves the request from pending to history.
     *
     * @param sessionId The session containing the request.
     * @param requestId The request ID to resolve.
     * @param optionId The selected option ID, or null if expired/cancelled.
     */
    fun resolvePermissionRequest(sessionId: String, requestId: String, optionId: String?)

    /**
     * Get the agent registry state for a specific session.
     *
     * @param sessionId The session to observe.
     * @return A StateFlow emitting the current agent registry state, or null if none.
     */
    fun getAgentRegistry(sessionId: String): StateFlow<AcpAgentRegistryState?>

    /**
     * Clear all ACP state for a specific session.
     *
     * @param sessionId The session to clear.
     */
    fun clearSession(sessionId: String)

    /**
     * Clear all ACP state for all sessions.
     */
    fun clearAll()
}
