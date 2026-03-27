package com.enflame.happy.data.acp

import android.util.Log
import com.enflame.happy.domain.model.acp.AcpAvailableCommand
import com.enflame.happy.domain.model.acp.AcpCommandInput
import com.enflame.happy.domain.model.acp.AcpConfigOption
import com.enflame.happy.domain.model.acp.AcpContentBlock
import com.enflame.happy.domain.model.acp.AcpCost
import com.enflame.happy.domain.model.acp.AcpPlanEntry
import com.enflame.happy.domain.model.acp.AcpPlanEntryPriority
import com.enflame.happy.domain.model.acp.AcpPlanEntryStatus
import com.enflame.happy.domain.model.acp.AcpSessionUpdate
import com.enflame.happy.domain.model.acp.AcpToolCall
import com.enflame.happy.domain.model.acp.AcpToolCallContent
import com.enflame.happy.domain.model.acp.AcpToolCallLocation
import com.enflame.happy.domain.model.acp.AcpToolCallStatus
import com.enflame.happy.domain.model.acp.AcpToolCallUpdate
import com.enflame.happy.domain.model.acp.AcpToolKind
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Parser for ACP session update JSON payloads.
 *
 * Converts raw JSON (as [JsonObject] or [String]) into typed [AcpSessionUpdate] instances.
 * Uses kotlinx.serialization for JSON handling, matching the existing app pattern.
 *
 * Handles all 11 ACP session update kinds and gracefully falls back to [AcpSessionUpdate.Unknown]
 * for unrecognized update types.
 */
@Singleton
class AcpJsonParser @Inject constructor(
    private val json: Json,
) {

    /**
     * Parse a JSON string into an [AcpSessionUpdate].
     *
     * @param jsonString The raw JSON string.
     * @return The parsed update, or [AcpSessionUpdate.Unknown] if parsing fails.
     */
    fun parseSessionUpdate(jsonString: String): AcpSessionUpdate {
        return try {
            val jsonObject = json.parseToJsonElement(jsonString).jsonObject
            parseSessionUpdate(jsonObject)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse ACP session update JSON", e)
            AcpSessionUpdate.Unknown(kind = "parse_error")
        }
    }

    /**
     * Parse a [JsonObject] into an [AcpSessionUpdate].
     *
     * @param obj The JSON object to parse.
     * @return The parsed update, or [AcpSessionUpdate.Unknown] for unrecognized types.
     */
    fun parseSessionUpdate(obj: JsonObject): AcpSessionUpdate {
        val kind = obj["sessionUpdate"]?.jsonPrimitive?.contentOrNull
            ?: return AcpSessionUpdate.Unknown(kind = "missing_sessionUpdate")

        return try {
            when (kind) {
                "agent_message_chunk" -> parseContentChunk(obj) { content ->
                    AcpSessionUpdate.AgentMessageChunk(content = content)
                }

                "user_message_chunk" -> parseContentChunk(obj) { content ->
                    AcpSessionUpdate.UserMessageChunk(content = content)
                }

                "agent_thought_chunk" -> parseContentChunk(obj) { content ->
                    AcpSessionUpdate.AgentThoughtChunk(content = content)
                }

                "tool_call" -> {
                    val toolCall = parseToolCall(obj)
                    AcpSessionUpdate.ToolCallNotification(toolCall = toolCall)
                }

                "tool_call_update" -> {
                    val toolCallUpdate = parseToolCallUpdate(obj)
                    AcpSessionUpdate.ToolCallStatusUpdate(toolCallUpdate = toolCallUpdate)
                }

                "plan" -> {
                    val entries = obj["entries"]?.jsonArray?.map { parsePlanEntry(it.jsonObject) }
                        ?: emptyList()
                    AcpSessionUpdate.PlanUpdate(entries = entries)
                }

                "available_commands_update" -> {
                    val commands = obj["availableCommands"]?.jsonArray
                        ?.map { parseAvailableCommand(it.jsonObject) }
                        ?: emptyList()
                    AcpSessionUpdate.AvailableCommandsUpdate(availableCommands = commands)
                }

                "current_mode_update" -> {
                    val modeId = obj["currentModeId"]?.jsonPrimitive?.contentOrNull ?: ""
                    AcpSessionUpdate.CurrentModeUpdate(currentModeId = modeId)
                }

                "config_option_update" -> {
                    val options = obj["configOptions"]?.jsonArray
                        ?.map { parseConfigOption(it.jsonObject) }
                        ?: emptyList()
                    AcpSessionUpdate.ConfigOptionUpdate(configOptions = options)
                }

                "session_info_update" -> {
                    val title = obj["title"]?.jsonPrimitive?.contentOrNull
                    val updatedAt = obj["updatedAt"]?.jsonPrimitive?.contentOrNull
                    AcpSessionUpdate.SessionInfoUpdate(title = title, updatedAt = updatedAt)
                }

                "usage_update" -> {
                    val used = obj["used"]?.jsonPrimitive?.intOrNull ?: 0
                    val size = obj["size"]?.jsonPrimitive?.intOrNull ?: 0
                    val cost = obj["cost"]?.jsonObject?.let { parseCost(it) }
                    AcpSessionUpdate.UsageUpdate(used = used, size = size, cost = cost)
                }

                else -> AcpSessionUpdate.Unknown(kind = kind)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse ACP update of kind '$kind'", e)
            AcpSessionUpdate.Unknown(kind = kind)
        }
    }

    // ========================================================================
    // Content Block Parsing
    // ========================================================================

    private inline fun parseContentChunk(
        obj: JsonObject,
        create: (AcpContentBlock) -> AcpSessionUpdate,
    ): AcpSessionUpdate {
        val contentObj = obj["content"]?.jsonObject
            ?: return AcpSessionUpdate.Unknown(kind = "missing_content")
        val content = parseContentBlock(contentObj)
        return create(content)
    }

    internal fun parseContentBlock(obj: JsonObject): AcpContentBlock {
        val type = obj["type"]?.jsonPrimitive?.contentOrNull ?: "text"
        return when (type) {
            "text" -> AcpContentBlock.Text(
                text = obj["text"]?.jsonPrimitive?.contentOrNull ?: "",
                annotations = obj["annotations"]?.jsonObject,
            )

            "image" -> AcpContentBlock.Image(
                data = obj["data"]?.jsonPrimitive?.contentOrNull ?: "",
                mimeType = obj["mimeType"]?.jsonPrimitive?.contentOrNull ?: "",
                uri = obj["uri"]?.jsonPrimitive?.contentOrNull,
                annotations = obj["annotations"]?.jsonObject,
            )

            "audio" -> AcpContentBlock.Audio(
                data = obj["data"]?.jsonPrimitive?.contentOrNull ?: "",
                mimeType = obj["mimeType"]?.jsonPrimitive?.contentOrNull ?: "",
                annotations = obj["annotations"]?.jsonObject,
            )

            "resource_link" -> AcpContentBlock.ResourceLink(
                name = obj["name"]?.jsonPrimitive?.contentOrNull ?: "",
                uri = obj["uri"]?.jsonPrimitive?.contentOrNull ?: "",
                title = obj["title"]?.jsonPrimitive?.contentOrNull,
                description = obj["description"]?.jsonPrimitive?.contentOrNull,
                mimeType = obj["mimeType"]?.jsonPrimitive?.contentOrNull,
                size = obj["size"]?.jsonPrimitive?.intOrNull,
                annotations = obj["annotations"]?.jsonObject,
            )

            "resource" -> AcpContentBlock.Resource(
                resource = obj["resource"]?.jsonObject ?: JsonObject(emptyMap()),
                annotations = obj["annotations"]?.jsonObject,
            )

            else -> AcpContentBlock.Text(text = "")
        }
    }

    // ========================================================================
    // Tool Call Parsing
    // ========================================================================

    internal fun parseToolCall(obj: JsonObject): AcpToolCall {
        return AcpToolCall(
            toolCallId = obj["toolCallId"]?.jsonPrimitive?.contentOrNull ?: "",
            title = obj["title"]?.jsonPrimitive?.contentOrNull ?: "",
            kind = obj["kind"]?.jsonPrimitive?.contentOrNull?.let { parseToolKind(it) },
            status = obj["status"]?.jsonPrimitive?.contentOrNull?.let { parseToolCallStatus(it) },
            rawInput = obj["rawInput"],
            rawOutput = obj["rawOutput"],
            content = obj["content"]?.jsonArray?.map { parseToolCallContent(it.jsonObject) },
            locations = obj["locations"]?.jsonArray?.map { parseToolCallLocation(it.jsonObject) },
        )
    }

    private fun parseToolCallUpdate(obj: JsonObject): AcpToolCallUpdate {
        return AcpToolCallUpdate(
            toolCallId = obj["toolCallId"]?.jsonPrimitive?.contentOrNull ?: "",
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            kind = obj["kind"]?.jsonPrimitive?.contentOrNull?.let { parseToolKind(it) },
            status = obj["status"]?.jsonPrimitive?.contentOrNull?.let { parseToolCallStatus(it) },
            rawInput = obj["rawInput"],
            rawOutput = obj["rawOutput"],
            content = obj["content"]?.let { element ->
                if (element is JsonArray) element.map { parseToolCallContent(it.jsonObject) }
                else null
            },
            locations = obj["locations"]?.let { element ->
                if (element is JsonArray) element.map { parseToolCallLocation(it.jsonObject) }
                else null
            },
        )
    }

    internal fun parseToolCallContent(obj: JsonObject): AcpToolCallContent {
        val type = obj["type"]?.jsonPrimitive?.contentOrNull ?: "content"
        return when (type) {
            "content" -> {
                val contentObj = obj["content"]?.jsonObject
                    ?: return AcpToolCallContent.Content(
                        content = AcpContentBlock.Text(text = ""),
                    )
                AcpToolCallContent.Content(content = parseContentBlock(contentObj))
            }

            "diff" -> AcpToolCallContent.Diff(
                path = obj["path"]?.jsonPrimitive?.contentOrNull ?: "",
                newText = obj["newText"]?.jsonPrimitive?.contentOrNull ?: "",
                oldText = obj["oldText"]?.jsonPrimitive?.contentOrNull,
            )

            "terminal" -> AcpToolCallContent.Terminal(
                terminalId = obj["terminalId"]?.jsonPrimitive?.contentOrNull ?: "",
            )

            else -> AcpToolCallContent.Content(
                content = AcpContentBlock.Text(text = ""),
            )
        }
    }

    private fun parseToolCallLocation(obj: JsonObject): AcpToolCallLocation {
        return AcpToolCallLocation(
            path = obj["path"]?.jsonPrimitive?.contentOrNull ?: "",
            line = obj["line"]?.jsonPrimitive?.intOrNull,
        )
    }

    private fun parseToolKind(value: String): AcpToolKind? {
        return try {
            json.decodeFromString(AcpToolKind.serializer(), "\"$value\"")
        } catch (_: Exception) {
            null
        }
    }

    private fun parseToolCallStatus(value: String): AcpToolCallStatus? {
        return try {
            json.decodeFromString(AcpToolCallStatus.serializer(), "\"$value\"")
        } catch (_: Exception) {
            null
        }
    }

    // ========================================================================
    // Plan Parsing
    // ========================================================================

    private fun parsePlanEntry(obj: JsonObject): AcpPlanEntry {
        return AcpPlanEntry(
            content = obj["content"]?.jsonPrimitive?.contentOrNull ?: "",
            priority = obj["priority"]?.jsonPrimitive?.contentOrNull?.let {
                parsePlanEntryPriority(it)
            } ?: AcpPlanEntryPriority.MEDIUM,
            status = obj["status"]?.jsonPrimitive?.contentOrNull?.let {
                parsePlanEntryStatus(it)
            } ?: AcpPlanEntryStatus.PENDING,
        )
    }

    private fun parsePlanEntryPriority(value: String): AcpPlanEntryPriority {
        return try {
            json.decodeFromString(AcpPlanEntryPriority.serializer(), "\"$value\"")
        } catch (_: Exception) {
            AcpPlanEntryPriority.MEDIUM
        }
    }

    private fun parsePlanEntryStatus(value: String): AcpPlanEntryStatus {
        return try {
            json.decodeFromString(AcpPlanEntryStatus.serializer(), "\"$value\"")
        } catch (_: Exception) {
            AcpPlanEntryStatus.PENDING
        }
    }

    // ========================================================================
    // Command Parsing
    // ========================================================================

    private fun parseAvailableCommand(obj: JsonObject): AcpAvailableCommand {
        return AcpAvailableCommand(
            name = obj["name"]?.jsonPrimitive?.contentOrNull ?: "",
            description = obj["description"]?.jsonPrimitive?.contentOrNull ?: "",
            input = obj["input"]?.jsonObject?.let { parseCommandInput(it) },
        )
    }

    private fun parseCommandInput(obj: JsonObject): AcpCommandInput {
        return AcpCommandInput(
            type = obj["type"]?.jsonPrimitive?.contentOrNull ?: "unstructured",
            hint = obj["hint"]?.jsonPrimitive?.contentOrNull ?: "",
        )
    }

    // ========================================================================
    // Config Option Parsing
    // ========================================================================

    private fun parseConfigOption(obj: JsonObject): AcpConfigOption {
        return AcpConfigOption(
            type = obj["type"]?.jsonPrimitive?.contentOrNull ?: "select",
            id = obj["id"]?.jsonPrimitive?.contentOrNull ?: "",
            name = obj["name"]?.jsonPrimitive?.contentOrNull ?: "",
            description = obj["description"]?.jsonPrimitive?.contentOrNull,
            category = obj["category"]?.jsonPrimitive?.contentOrNull,
            currentValue = obj["currentValue"]?.jsonPrimitive?.contentOrNull ?: "",
            options = obj["options"] ?: JsonObject(emptyMap()),
        )
    }

    // ========================================================================
    // Usage / Cost Parsing
    // ========================================================================

    private fun parseCost(obj: JsonObject): AcpCost {
        return AcpCost(
            amount = obj["amount"]?.jsonPrimitive?.doubleOrNull ?: 0.0,
            currency = obj["currency"]?.jsonPrimitive?.contentOrNull ?: "USD",
        )
    }

    companion object {
        private const val TAG = "AcpJsonParser"
    }
}
