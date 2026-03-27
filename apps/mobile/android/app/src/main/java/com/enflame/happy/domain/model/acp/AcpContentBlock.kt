package com.enflame.happy.domain.model.acp

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/**
 * Content block representing displayable information in the ACP protocol.
 *
 * Appears in user prompts, agent output, and tool call results.
 * Discriminated on [type]: "text" | "image" | "audio" | "resource_link" | "resource"
 *
 * @see <a href="https://agentclientprotocol.com/protocol/content">ACP Content</a>
 */
@Serializable
sealed class AcpContentBlock {

    abstract val type: String

    /** Text content block. */
    @Serializable
    @SerialName("text")
    data class Text(
        override val type: String = "text",
        val text: String,
        val annotations: JsonObject? = null,
    ) : AcpContentBlock()

    /** Image content block. */
    @Serializable
    @SerialName("image")
    data class Image(
        override val type: String = "image",
        val data: String,
        val mimeType: String,
        val uri: String? = null,
        val annotations: JsonObject? = null,
    ) : AcpContentBlock()

    /** Audio content block. */
    @Serializable
    @SerialName("audio")
    data class Audio(
        override val type: String = "audio",
        val data: String,
        val mimeType: String,
        val annotations: JsonObject? = null,
    ) : AcpContentBlock()

    /** Resource link content block. */
    @Serializable
    @SerialName("resource_link")
    data class ResourceLink(
        override val type: String = "resource_link",
        val name: String,
        val uri: String,
        val title: String? = null,
        val description: String? = null,
        val mimeType: String? = null,
        val size: Int? = null,
        val annotations: JsonObject? = null,
    ) : AcpContentBlock()

    /** Embedded resource content block. */
    @Serializable
    @SerialName("resource")
    data class Resource(
        override val type: String = "resource",
        val resource: JsonObject,
        val annotations: JsonObject? = null,
    ) : AcpContentBlock()
}

/**
 * Extract text from an ACP content block.
 * Returns the text content or empty string for non-text blocks.
 */
fun AcpContentBlock.extractText(): String {
    return when (this) {
        is AcpContentBlock.Text -> text
        else -> ""
    }
}
