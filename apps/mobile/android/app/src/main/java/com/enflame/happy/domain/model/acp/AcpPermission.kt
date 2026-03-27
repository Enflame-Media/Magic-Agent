package com.enflame.happy.domain.model.acp

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents an ACP tool permission request from the agent.
 *
 * When an agent needs to use a tool (e.g., file write, shell command),
 * it sends a permission request through the relay. The user can approve
 * or reject the request from the Android app.
 *
 * ## Wire Format
 * Permission requests arrive as encrypted sync messages with type
 * `acp-permission-request`. The response is sent back through the
 * same encrypted WebSocket channel.
 */
@Serializable
data class AcpPermission(
    /** Unique identifier for this permission request. */
    val id: String,
    /** The session this permission belongs to. */
    val sessionId: String,
    /** Machine ID of the CLI that sent the request. */
    val machineId: String,
    /** Name of the tool requesting permission (e.g., "write_file", "bash"). */
    val toolName: String,
    /** Category of the tool for icon selection. */
    val toolKind: AcpToolKind = AcpToolKind.OTHER,
    /** Human-readable description of what the tool will do. */
    val description: String? = null,
    /** File paths or locations affected by this tool use. */
    val filePaths: List<String> = emptyList(),
    /** Raw input that will be sent to the tool (e.g., command text, file content). */
    val rawInput: String? = null,
    /** Timestamp when the request was created (epoch millis). */
    val createdAt: Long = System.currentTimeMillis(),
    /** Timeout in milliseconds before the request expires. */
    val timeoutMs: Long = DEFAULT_TIMEOUT_MS,
    /** Current status of the permission request. */
    val status: AcpPermissionStatus = AcpPermissionStatus.PENDING
) {
    /** Whether this permission request has expired. */
    val isExpired: Boolean
        get() = System.currentTimeMillis() > createdAt + timeoutMs

    /** Remaining time in milliseconds before expiry. */
    val remainingMs: Long
        get() = (createdAt + timeoutMs - System.currentTimeMillis()).coerceAtLeast(0)

    companion object {
        /** Default timeout for permission requests: 60 seconds. */
        const val DEFAULT_TIMEOUT_MS = 60_000L
    }
}

/**
 * Categories of ACP tools for icon and display grouping.
 */
@Serializable
enum class AcpToolKind {
    @SerialName("file_read")
    FILE_READ,

    @SerialName("file_write")
    FILE_WRITE,

    @SerialName("shell")
    SHELL,

    @SerialName("browser")
    BROWSER,

    @SerialName("network")
    NETWORK,

    @SerialName("other")
    OTHER
}

/**
 * Status of a permission request.
 */
@Serializable
enum class AcpPermissionStatus {
    @SerialName("pending")
    PENDING,

    @SerialName("allowed_once")
    ALLOWED_ONCE,

    @SerialName("allowed_always")
    ALLOWED_ALWAYS,

    @SerialName("rejected_once")
    REJECTED_ONCE,

    @SerialName("rejected_always")
    REJECTED_ALWAYS,

    @SerialName("expired")
    EXPIRED
}

/**
 * Response sent back to the agent for a permission request.
 */
@Serializable
data class AcpPermissionResponse(
    /** The permission request ID being responded to. */
    val permissionId: String,
    /** The session this permission belongs to. */
    val sessionId: String,
    /** The decision made by the user. */
    val decision: AcpPermissionDecision
)

/**
 * User's decision on a permission request.
 */
@Serializable
enum class AcpPermissionDecision {
    @SerialName("allow_once")
    ALLOW_ONCE,

    @SerialName("allow_always")
    ALLOW_ALWAYS,

    @SerialName("reject_once")
    REJECT_ONCE,

    @SerialName("reject_always")
    REJECT_ALWAYS
}
