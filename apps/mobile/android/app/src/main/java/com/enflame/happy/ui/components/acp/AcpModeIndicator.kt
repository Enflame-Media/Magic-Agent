package com.enflame.happy.ui.components.acp

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Architecture
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpMode

/**
 * Displays the current agent operating mode as a Material 3 AssistChip.
 *
 * Shows an icon and label for the mode (Agent, Plan, Edit, Chat).
 * Uses MaterialTheme.colorScheme tokens for consistent theming.
 *
 * @param mode The current ACP operating mode.
 * @param modifier Optional modifier for the composable.
 */
@Composable
fun AcpModeIndicator(
    mode: AcpMode,
    modifier: Modifier = Modifier
) {
    val (label, icon) = modeVisuals(mode)

    AssistChip(
        onClick = {},
        label = {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium
            )
        },
        leadingIcon = {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp)
            )
        },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            labelColor = MaterialTheme.colorScheme.onSecondaryContainer,
            leadingIconContentColor = MaterialTheme.colorScheme.onSecondaryContainer
        ),
        modifier = modifier.semantics {
            contentDescription = "Current mode: $label"
        }
    )
}

/**
 * Returns the label and icon for an ACP mode.
 */
private fun modeVisuals(mode: AcpMode): Pair<String, ImageVector> {
    return when (mode) {
        AcpMode.AGENT -> "Agent" to Icons.Default.SmartToy
        AcpMode.PLAN -> "Plan" to Icons.Default.Architecture
        AcpMode.EDIT -> "Edit" to Icons.Default.Edit
        AcpMode.CHAT -> "Chat" to Icons.Default.Chat
    }
}
