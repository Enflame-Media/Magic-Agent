package com.enflame.happy.domain.model.acp

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * A file location being accessed or modified by a tool.
 *
 * Enables "follow-along" features in clients.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/tool-calls#following-the-agent">Following the Agent</a>
 */
@Serializable
data class AcpToolCallLocation(
    val path: String,
    val line: Int? = null,
)

/**
 * Content produced by a tool call.
 *
 * Discriminated on [type]: "content" | "diff" | "terminal"
 *
 * @see <a href="https://agentclientprotocol.com/protocol/tool-calls#content">Tool Call Content</a>
 */
@Serializable
sealed class AcpToolCallContent {

    abstract val type: String

    /** Standard content within a tool call. */
    @Serializable
    @SerialName("content")
    data class Content(
        override val type: String = "content",
        val content: AcpContentBlock,
    ) : AcpToolCallContent()

    /** Diff content showing file modifications. */
    @Serializable
    @SerialName("diff")
    data class Diff(
        override val type: String = "diff",
        val path: String,
        val newText: String,
        val oldText: String? = null,
    ) : AcpToolCallContent()

    /** Terminal content embedding a created terminal. */
    @Serializable
    @SerialName("terminal")
    data class Terminal(
        override val type: String = "terminal",
        val terminalId: String,
    ) : AcpToolCallContent()
}

/**
 * Represents a tool call that the language model has requested.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/tool-calls">ACP Tool Calls</a>
 */
@Serializable
data class AcpToolCall(
    val toolCallId: String,
    val title: String,
    val kind: AcpToolKind? = null,
    val status: AcpToolCallStatus? = null,
    val rawInput: JsonElement? = null,
    val rawOutput: JsonElement? = null,
    val content: List<AcpToolCallContent>? = null,
    val locations: List<AcpToolCallLocation>? = null,
)

/**
 * An update to an existing tool call.
 *
 * All fields except toolCallId are optional - only changed fields are included.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/tool-calls#updating">Tool Call Updates</a>
 */
@Serializable
data class AcpToolCallUpdate(
    val toolCallId: String,
    val title: String? = null,
    val kind: AcpToolKind? = null,
    val status: AcpToolCallStatus? = null,
    val rawInput: JsonElement? = null,
    val rawOutput: JsonElement? = null,
    val content: List<AcpToolCallContent>? = null,
    val locations: List<AcpToolCallLocation>? = null,
)
