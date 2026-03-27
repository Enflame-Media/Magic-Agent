package com.enflame.happy.ui.components.acp

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Create
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpToolCall
import com.enflame.happy.domain.model.acp.AcpToolCallStatus
import com.enflame.happy.domain.model.acp.AcpToolKind

/**
 * Displays a tool call made by the agent.
 *
 * Shows the tool kind icon, name, status chip with appropriate color,
 * and an expandable section with file locations and output. The status
 * chip uses MaterialTheme.colorScheme tokens for consistent theming.
 *
 * @param toolCall The tool call data to display.
 * @param modifier Optional modifier for the composable.
 */
@Composable
fun AcpToolCallView(
    toolCall: AcpToolCall,
    modifier: Modifier = Modifier
) {
    var isExpanded by remember { mutableStateOf(false) }
    val kindIcon = toolKindIcon(toolCall.kind)
    val (statusLabel, statusColor) = toolCallStatusVisuals(toolCall.status)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "Tool call: ${toolCall.name}. " +
                    "Status: ${statusLabel}."
            },
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            // Header: icon, name, status chip, expand button
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = kindIcon,
                    contentDescription = toolCall.kind.name.lowercase(),
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = toolCall.name,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(6.dp))
                SuggestionChip(
                    onClick = {},
                    label = {
                        Text(
                            text = statusLabel,
                            style = MaterialTheme.typography.labelSmall
                        )
                    },
                    colors = SuggestionChipDefaults.suggestionChipColors(
                        containerColor = statusColor.copy(alpha = 0.15f),
                        labelColor = statusColor
                    )
                )
                if (toolCall.locations.isNotEmpty() || !toolCall.output.isNullOrBlank()) {
                    IconButton(
                        onClick = { isExpanded = !isExpanded },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = if (isExpanded) {
                                Icons.Default.ExpandLess
                            } else {
                                Icons.Default.ExpandMore
                            },
                            contentDescription = if (isExpanded) "Collapse" else "Expand",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Duration
            toolCall.durationMs?.let { ms ->
                Text(
                    text = formatDuration(ms),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.padding(top = 2.dp, start = 22.dp)
                )
            }

            // Expandable details
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                Column(
                    modifier = Modifier.padding(top = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // File locations
                    if (toolCall.locations.isNotEmpty()) {
                        Text(
                            text = "Locations:",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        toolCall.locations.forEach { location ->
                            val locationText = buildString {
                                append(location.path)
                                location.line?.let { append(":$it") }
                                location.column?.let { append(":$it") }
                            }
                            Text(
                                text = locationText,
                                style = MaterialTheme.typography.bodySmall,
                                fontFamily = FontFamily.Monospace,
                                color = MaterialTheme.colorScheme.primary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // Output preview
                    if (!toolCall.output.isNullOrBlank()) {
                        Text(
                            text = "Output:",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                        Text(
                            text = toolCall.output,
                            style = MaterialTheme.typography.bodySmall,
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 8
                        )
                    }
                }
            }
        }
    }
}

/**
 * Returns the icon for a tool kind.
 */
private fun toolKindIcon(kind: AcpToolKind): ImageVector {
    return when (kind) {
        AcpToolKind.READ -> Icons.Default.Description
        AcpToolKind.WRITE -> Icons.Default.Create
        AcpToolKind.EDIT -> Icons.Default.Code
        AcpToolKind.BASH -> Icons.Default.Terminal
        AcpToolKind.SEARCH -> Icons.Default.Search
        AcpToolKind.BROWSER -> Icons.Default.Language
        AcpToolKind.MCP -> Icons.Default.Extension
        AcpToolKind.OTHER -> Icons.Default.Build
    }
}

/**
 * Returns the label and color for a tool call status.
 */
@Composable
private fun toolCallStatusVisuals(status: AcpToolCallStatus): Pair<String, Color> {
    return when (status) {
        AcpToolCallStatus.PENDING -> "Pending" to MaterialTheme.colorScheme.outline
        AcpToolCallStatus.RUNNING -> "Running" to MaterialTheme.colorScheme.primary
        AcpToolCallStatus.COMPLETED -> "Done" to MaterialTheme.colorScheme.primary
        AcpToolCallStatus.FAILED -> "Failed" to MaterialTheme.colorScheme.error
    }
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 */
private fun formatDuration(ms: Long): String {
    return when {
        ms < 1000 -> "${ms}ms"
        ms < 60_000 -> "${ms / 1000}.${(ms % 1000) / 100}s"
        else -> "${ms / 60_000}m ${(ms % 60_000) / 1000}s"
    }
}
