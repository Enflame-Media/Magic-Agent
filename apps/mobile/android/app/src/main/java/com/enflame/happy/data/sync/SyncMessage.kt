package com.enflame.happy.data.sync

import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.acp.AcpAgent
import com.enflame.happy.domain.model.acp.AcpAgentSwitchResponse
import com.enflame.happy.domain.model.acp.AcpPermission
import com.enflame.happy.domain.model.acp.AcpSession
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Sealed class representing all possible messages in the sync protocol.
 *
 * Incoming messages are parsed from the WebSocket and emitted via
 * [SyncService.incomingMessages]. Outgoing messages are sent by calling
 * methods on [SyncService] (e.g., [SyncService.subscribe]).
 *
 * ## Protocol
 * Messages use a typed envelope format matching the iOS `SyncUpdateEnvelope`:
 * - `session` / `message` - Data updates from the server
 * - `ping` / `pong` - Connection keepalive
 * - `subscribe` / `unsubscribe` - Session subscription management
 * - `session-revival-paused` / `session-revived` - Circuit breaker events
 */
sealed class SyncMessage {

    /** A session update received from the server. */
    data class SessionUpdate(val session: Session) : SyncMessage()

    /** A message update received from the server. */
    data class MessageUpdate(val message: Message) : SyncMessage()

    /** Server requests a pong response. */
    data object Ping : SyncMessage()

    /** Server acknowledged our ping - connection is alive. */
    data object Pong : SyncMessage()

    /**
     * Session revival paused due to circuit breaker cooldown (HAP-868).
     *
     * Emitted when the CLI's circuit breaker cooldown is active, meaning
     * automatic session revival attempts are temporarily paused.
     */
    data class SessionRevivalPaused(
        val reason: String,
        val remainingMs: Int,
        val resumesAt: Long,
        val machineId: String
    ) : SyncMessage()

    /**
     * Session was successfully revived (HAP-733).
     *
     * The app should clear any cooldown UI and update session references.
     */
    data class SessionRevived(
        val originalSessionId: String,
        val newSessionId: String,
        val machineId: String
    ) : SyncMessage()

    // ========================================================================
    // ACP Messages (HAP-1062)
    // ========================================================================

    /**
     * An ACP tool permission request from the agent.
     *
     * The user must approve or reject this within the timeout.
     */
    data class AcpPermissionRequest(val permission: AcpPermission) : SyncMessage()

    /**
     * Updated list of available ACP sessions.
     */
    data class AcpSessionList(val sessions: List<AcpSession>) : SyncMessage()

    /**
     * Updated list of available ACP agents.
     */
    data class AcpAgentList(val agents: List<AcpAgent>) : SyncMessage()

    /**
     * Response to an agent switch request.
     */
    data class AcpAgentSwitchResult(val response: AcpAgentSwitchResponse) : SyncMessage()
}

/**
 * Wire format for the sync protocol envelope.
 *
 * Used for deserializing incoming WebSocket messages from the server.
 * The [type] field determines which optional fields are populated.
 */
@Serializable
internal data class SyncUpdateEnvelope(
    val type: SyncMessageType,
    val session: Session? = null,
    val message: Message? = null,
    val sessionId: String? = null,
    val reason: String? = null,
    val remainingMs: Int? = null,
    val resumesAt: Long? = null,
    val machineId: String? = null,
    val originalSessionId: String? = null,
    val newSessionId: String? = null,
    // ACP fields (HAP-1062)
    val permission: AcpPermission? = null,
    val acpSessions: List<AcpSession>? = null,
    val agents: List<AcpAgent>? = null,
    val agentSwitchResponse: AcpAgentSwitchResponse? = null
)

/**
 * Types of messages in the sync protocol.
 *
 * Matches the iOS `SyncMessageType` enum for cross-platform parity.
 */
@Serializable
internal enum class SyncMessageType {
    @SerialName("subscribe")
    SUBSCRIBE,

    @SerialName("unsubscribe")
    UNSUBSCRIBE,

    @SerialName("update")
    UPDATE,

    @SerialName("ping")
    PING,

    @SerialName("pong")
    PONG,

    @SerialName("session")
    SESSION,

    @SerialName("message")
    MESSAGE,

    @SerialName("session-revival-paused")
    SESSION_REVIVAL_PAUSED,

    @SerialName("session-revived")
    SESSION_REVIVED,

    @SerialName("acp-permission-request")
    ACP_PERMISSION_REQUEST,

    @SerialName("acp-session-list")
    ACP_SESSION_LIST,

    @SerialName("acp-agent-list")
    ACP_AGENT_LIST,

    @SerialName("acp-agent-switch-response")
    ACP_AGENT_SWITCH_RESPONSE
}

/**
 * Wire format for outgoing sync messages (client-to-server).
 *
 * Used for subscribe, unsubscribe, and pong messages.
 */
@Serializable
internal data class SyncOutgoingMessage(
    val type: SyncMessageType,
    val sessionId: String? = null
)
