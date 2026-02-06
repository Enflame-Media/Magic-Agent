package com.enflame.happy.ui.screens.sessions

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.ToolUse
import com.enflame.happy.domain.model.ToolUseStatus
import com.enflame.happy.ui.theme.HappyTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Displays a single message in the conversation as a styled bubble.
 *
 * Features:
 * - Different visual styles for user, assistant, and system messages
 * - Basic markdown rendering (bold, italic, inline code, code blocks)
 * - Timestamp display
 * - Collapsible tool use indicators
 * - Long-press to copy message content
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MessageBubble(
    message: Message,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val screenWidth = LocalConfiguration.current.screenWidthDp.dp
    val maxBubbleWidth = screenWidth * 0.85f

    val isUserMessage = message.role == MessageRole.USER
    val alignment = if (isUserMessage) Alignment.End else Alignment.Start
    val horizontalArrangement = if (isUserMessage) Arrangement.End else Arrangement.Start

    val roleConfig = rememberRoleConfig(message.role)

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = alignment
    ) {
        // Role label
        Row(
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Icon(
                imageVector = roleConfig.icon,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = roleConfig.labelColor
            )
            Text(
                text = roleConfig.label,
                style = MaterialTheme.typography.labelSmall,
                color = roleConfig.labelColor
            )
        }

        // Message bubble
        Column(
            modifier = Modifier
                .widthIn(max = maxBubbleWidth)
                .clip(RoundedCornerShape(12.dp))
                .background(roleConfig.backgroundColor)
                .combinedClickable(
                    onClick = {},
                    onLongClick = {
                        copyToClipboard(context, message.content)
                    }
                )
                .padding(12.dp)
        ) {
            // Rendered message content with basic markdown
            Text(
                text = renderBasicMarkdown(message.content),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        // Tool uses (collapsible)
        if (!message.toolUses.isNullOrEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            ToolUseSection(toolUses = message.toolUses)
        }

        // Timestamp
        Text(
            text = formatMessageTimestamp(message.createdAt),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
        )
    }
}

/**
 * Configuration for the visual style of each message role.
 */
private data class RoleConfig(
    val label: String,
    val icon: ImageVector,
    val labelColor: Color,
    val backgroundColor: Color
)

/**
 * Returns the visual configuration for a given message role,
 * using Material Theme colors.
 */
@Composable
private fun rememberRoleConfig(role: MessageRole): RoleConfig {
    val primaryColor = MaterialTheme.colorScheme.primary
    val tertiaryColor = MaterialTheme.colorScheme.tertiary
    val outlineColor = MaterialTheme.colorScheme.outline
    val primaryContainerColor = MaterialTheme.colorScheme.primaryContainer
    val tertiaryContainerColor = MaterialTheme.colorScheme.tertiaryContainer
    val surfaceVariantColor = MaterialTheme.colorScheme.surfaceVariant

    return remember(role, primaryColor, tertiaryColor, outlineColor) {
        when (role) {
            MessageRole.USER -> RoleConfig(
                label = "You",
                icon = Icons.Default.Person,
                labelColor = primaryColor,
                backgroundColor = primaryContainerColor
            )
            MessageRole.ASSISTANT -> RoleConfig(
                label = "Claude",
                icon = Icons.Default.Build,
                labelColor = tertiaryColor,
                backgroundColor = tertiaryContainerColor
            )
            MessageRole.SYSTEM -> RoleConfig(
                label = "System",
                icon = Icons.Default.Settings,
                labelColor = outlineColor,
                backgroundColor = surfaceVariantColor
            )
        }
    }
}

/**
 * Collapsible section displaying tool uses within a message.
 */
@Composable
private fun ToolUseSection(
    toolUses: List<ToolUse>,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }

    Column(modifier = modifier) {
        // Toggle header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Build,
                contentDescription = null,
                modifier = Modifier.size(14.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = stringResource(R.string.session_detail_tool_uses, toolUses.size),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )
            IconButton(
                onClick = { isExpanded = !isExpanded },
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (isExpanded) {
                        stringResource(R.string.session_detail_collapse)
                    } else {
                        stringResource(R.string.session_detail_expand)
                    },
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Expandable tool use details
        AnimatedVisibility(
            visible = isExpanded,
            enter = expandVertically(),
            exit = shrinkVertically()
        ) {
            Column(
                modifier = Modifier.padding(top = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                toolUses.forEach { toolUse ->
                    ToolUseItem(toolUse = toolUse)
                }
            }
        }
    }
}

/**
 * Displays a single tool use with its name, status, and optional output.
 */
@Composable
private fun ToolUseItem(
    toolUse: ToolUse,
    modifier: Modifier = Modifier
) {
    val (statusIcon, statusColor) = when (toolUse.status) {
        ToolUseStatus.PENDING -> Icons.Default.HourglassEmpty to MaterialTheme.colorScheme.outline
        ToolUseStatus.RUNNING -> Icons.Default.Sync to MaterialTheme.colorScheme.primary
        ToolUseStatus.COMPLETED -> Icons.Default.CheckCircle to MaterialTheme.colorScheme.primary
        ToolUseStatus.FAILED -> Icons.Default.Error to MaterialTheme.colorScheme.error
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(8.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = statusIcon,
                contentDescription = toolUse.status.name.lowercase(),
                modifier = Modifier.size(14.dp),
                tint = statusColor
            )
            Text(
                text = toolUse.name,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = toolUse.status.name.lowercase().replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.labelSmall,
                color = statusColor
            )
        }

        if (!toolUse.output.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = toolUse.output,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

// --- Markdown Rendering ---

/**
 * Renders basic markdown formatting into an [AnnotatedString].
 *
 * Supports:
 * - **Bold** text (`**text**` or `__text__`)
 * - *Italic* text (`*text*` or `_text_`)
 * - `Inline code` (`` `text` ``)
 * - Code blocks (``` ``` ```) rendered in monospace
 */
@Composable
internal fun renderBasicMarkdown(text: String): AnnotatedString {
    val codeColor = MaterialTheme.colorScheme.onSurfaceVariant
    val codeBackground = MaterialTheme.colorScheme.surfaceVariant

    return remember(text, codeColor, codeBackground) {
        buildAnnotatedString {
            var i = 0
            val chars = text.toCharArray()
            val len = chars.size

            while (i < len) {
                when {
                    // Code block: ```...```
                    i + 2 < len && chars[i] == '`' && chars[i + 1] == '`' && chars[i + 2] == '`' -> {
                        val endIdx = text.indexOf("```", i + 3)
                        if (endIdx != -1) {
                            // Skip optional language identifier on the first line
                            val codeStart = text.indexOf('\n', i + 3).let {
                                if (it != -1 && it < endIdx) it + 1 else i + 3
                            }
                            withStyle(SpanStyle(
                                fontFamily = FontFamily.Monospace,
                                color = codeColor,
                                background = codeBackground
                            )) {
                                append(text.substring(codeStart, endIdx).trimEnd())
                            }
                            i = endIdx + 3
                        } else {
                            append(chars[i])
                            i++
                        }
                    }

                    // Inline code: `...`
                    chars[i] == '`' -> {
                        val endIdx = text.indexOf('`', i + 1)
                        if (endIdx != -1) {
                            withStyle(SpanStyle(
                                fontFamily = FontFamily.Monospace,
                                color = codeColor,
                                background = codeBackground
                            )) {
                                append(text.substring(i + 1, endIdx))
                            }
                            i = endIdx + 1
                        } else {
                            append(chars[i])
                            i++
                        }
                    }

                    // Bold: **...**
                    i + 1 < len && chars[i] == '*' && chars[i + 1] == '*' -> {
                        val endIdx = text.indexOf("**", i + 2)
                        if (endIdx != -1) {
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
                                append(text.substring(i + 2, endIdx))
                            }
                            i = endIdx + 2
                        } else {
                            append(chars[i])
                            i++
                        }
                    }

                    // Italic: *...*
                    chars[i] == '*' -> {
                        val endIdx = text.indexOf('*', i + 1)
                        if (endIdx != -1 && endIdx > i + 1) {
                            withStyle(SpanStyle(fontStyle = FontStyle.Italic)) {
                                append(text.substring(i + 1, endIdx))
                            }
                            i = endIdx + 1
                        } else {
                            append(chars[i])
                            i++
                        }
                    }

                    else -> {
                        append(chars[i])
                        i++
                    }
                }
            }
        }
    }
}

// --- Utility Functions ---

/**
 * Copies text to the system clipboard and shows a toast notification.
 */
private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText("Message", text)
    clipboard.setPrimaryClip(clip)
    Toast.makeText(context, R.string.session_detail_copied, Toast.LENGTH_SHORT).show()
}

/**
 * Formats a message timestamp into a short time string.
 */
private fun formatMessageTimestamp(timestamp: Long): String {
    val dateFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
    return dateFormat.format(Date(timestamp))
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun UserMessageBubblePreview() {
    HappyTheme {
        MessageBubble(
            message = Message(
                id = "msg-1",
                sessionId = "session-1",
                role = MessageRole.USER,
                content = "Can you help me refactor the authentication module?",
                createdAt = System.currentTimeMillis()
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun AssistantMessageBubblePreview() {
    HappyTheme {
        MessageBubble(
            message = Message(
                id = "msg-2",
                sessionId = "session-1",
                role = MessageRole.ASSISTANT,
                content = "I'll help you refactor the auth module. Let me look at the **current implementation** first.\n\nHere's what I found in `AuthService.kt`:\n\n```kotlin\nclass AuthService {\n    fun authenticate() { }\n}\n```",
                createdAt = System.currentTimeMillis()
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun AssistantMessageWithToolsPreview() {
    HappyTheme {
        MessageBubble(
            message = Message(
                id = "msg-3",
                sessionId = "session-1",
                role = MessageRole.ASSISTANT,
                content = "Let me read the file to understand the current structure.",
                createdAt = System.currentTimeMillis(),
                toolUses = listOf(
                    ToolUse(
                        id = "tool-1",
                        name = "Read",
                        input = "src/auth/AuthService.kt",
                        output = "File contents loaded (42 lines)",
                        status = ToolUseStatus.COMPLETED
                    ),
                    ToolUse(
                        id = "tool-2",
                        name = "Edit",
                        input = "src/auth/AuthService.kt",
                        status = ToolUseStatus.RUNNING
                    )
                )
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SystemMessageBubblePreview() {
    HappyTheme {
        MessageBubble(
            message = Message(
                id = "msg-4",
                sessionId = "session-1",
                role = MessageRole.SYSTEM,
                content = "Session started. Claude Code is connected.",
                createdAt = System.currentTimeMillis()
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}
