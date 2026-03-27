package com.enflame.happy.data.acp

import com.enflame.happy.domain.model.acp.AcpAgentRegistryState
import com.enflame.happy.domain.model.acp.AcpPermissionOutcome
import com.enflame.happy.domain.model.acp.AcpPermissionRequestState
import com.enflame.happy.domain.model.acp.AcpSessionState
import com.enflame.happy.domain.model.acp.AcpSessionUpdate
import com.enflame.happy.domain.repository.AcpRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of [AcpRepository] backed by in-memory [MutableStateFlow] maps.
 *
 * Provides reactive ACP session state to Compose UI via StateFlow.
 * All state mutations are thread-safe via MutableStateFlow.value assignment.
 *
 * This follows the same pattern as the existing [SessionRepositoryImpl]:
 * MutableStateFlow for internal state, exposed as read-only StateFlow.
 */
@Singleton
class AcpRepositoryImpl @Inject constructor() : AcpRepository {

    /** Session state flows, keyed by session ID. */
    private val sessionStates = mutableMapOf<String, MutableStateFlow<AcpSessionState?>>()

    /** Agent registry flows, keyed by session ID. */
    private val agentRegistries = mutableMapOf<String, MutableStateFlow<AcpAgentRegistryState?>>()

    /** Lock for map access to prevent concurrent modification. */
    private val lock = Any()

    override fun getSessionState(sessionId: String): StateFlow<AcpSessionState?> {
        return getOrCreateSessionFlow(sessionId).asStateFlow()
    }

    override fun applyUpdate(sessionId: String, update: AcpSessionUpdate) {
        val flow = getOrCreateSessionFlow(sessionId)
        val currentState = flow.value ?: AcpSessionState()
        flow.value = AcpUpdateApplier.apply(currentState, update)
    }

    override fun addPermissionRequest(sessionId: String, request: AcpPermissionRequestState) {
        val flow = getOrCreateSessionFlow(sessionId)
        val currentState = flow.value ?: AcpSessionState()
        flow.value = AcpUpdateApplier.addPermissionRequest(currentState, request)
    }

    override fun resolvePermissionRequest(
        sessionId: String,
        requestId: String,
        optionId: String?,
    ) {
        val flow = getOrCreateSessionFlow(sessionId)
        val currentState = flow.value ?: return

        val outcome = if (optionId != null) {
            AcpPermissionOutcome.SELECTED
        } else {
            AcpPermissionOutcome.CANCELLED
        }

        flow.value = AcpUpdateApplier.resolvePermissionRequest(
            state = currentState,
            requestId = requestId,
            outcome = outcome,
            selectedOptionId = optionId,
        )
    }

    override fun getAgentRegistry(sessionId: String): StateFlow<AcpAgentRegistryState?> {
        return getOrCreateAgentRegistryFlow(sessionId).asStateFlow()
    }

    override fun clearSession(sessionId: String) {
        synchronized(lock) {
            sessionStates[sessionId]?.value = null
            agentRegistries[sessionId]?.value = null
        }
    }

    override fun clearAll() {
        synchronized(lock) {
            sessionStates.values.forEach { it.value = null }
            agentRegistries.values.forEach { it.value = null }
            sessionStates.clear()
            agentRegistries.clear()
        }
    }

    // ========================================================================
    // Internal Helpers
    // ========================================================================

    private fun getOrCreateSessionFlow(sessionId: String): MutableStateFlow<AcpSessionState?> {
        return synchronized(lock) {
            sessionStates.getOrPut(sessionId) { MutableStateFlow(null) }
        }
    }

    private fun getOrCreateAgentRegistryFlow(
        sessionId: String,
    ): MutableStateFlow<AcpAgentRegistryState?> {
        return synchronized(lock) {
            agentRegistries.getOrPut(sessionId) { MutableStateFlow(null) }
        }
    }
}
