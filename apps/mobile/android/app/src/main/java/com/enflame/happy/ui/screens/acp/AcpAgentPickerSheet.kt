package com.enflame.happy.ui.screens.acp

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpAgent
import com.enflame.happy.domain.model.acp.AcpAgentStatus
import com.enflame.happy.ui.viewmodel.acp.AcpAgentPickerViewModel

/**
 * Modal bottom sheet for selecting and switching ACP agents.
 *
 * Displays available agents with their status, version, and active state.
 * Tapping a non-active agent shows a confirmation dialog before switching.
 * A Snackbar shows error/rollback information on switch failure.
 *
 * @param viewModel The agent picker ViewModel.
 * @param sessionId The current session ID for agent switch requests.
 * @param onDismiss Callback when the sheet is dismissed.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcpAgentPickerSheet(
    viewModel: AcpAgentPickerViewModel,
    sessionId: String,
    onDismiss: () -> Unit
) {
    val agents by viewModel.agents.collectAsState()
    val isSwitching by viewModel.isSwitching.collectAsState()
    val switchError by viewModel.switchError.collectAsState()
    val confirmSwitch by viewModel.confirmSwitch.collectAsState()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val snackbarHostState = remember { SnackbarHostState() }

    // Show error in snackbar
    LaunchedEffect(switchError) {
        switchError?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    // Confirmation dialog
    confirmSwitch?.let { agent ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissConfirmation() },
            title = { Text("Switch Agent") },
            text = {
                Text("Switch to ${agent.name}?${agent.version?.let { "\nVersion: $it" } ?: ""}")
            },
            confirmButton = {
                TextButton(onClick = { viewModel.confirmSwitch(sessionId) }) {
                    Text("Switch")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.dismissConfirmation() }) {
                    Text("Cancel")
                }
            }
        )
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.padding(bottom = 16.dp)) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Agents",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                if (isSwitching) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Agent list
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(agents) { agent ->
                    AgentRow(
                        agent = agent,
                        onClick = {
                            if (!isSwitching) {
                                viewModel.requestSwitch(agent)
                            }
                        }
                    )
                }
            }

            SnackbarHost(snackbarHostState)
        }
    }
}

/**
 * A single agent row in the picker list.
 */
@Composable
private fun AgentRow(
    agent: AcpAgent,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(enabled = !agent.isActive, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Agent icon
        Icon(
            Icons.Default.SmartToy,
            contentDescription = null,
            modifier = Modifier.size(32.dp),
            tint = if (agent.isActive) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            }
        )

        Spacer(modifier = Modifier.width(12.dp))

        // Name and version
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = agent.name,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = if (agent.isActive) FontWeight.Bold else FontWeight.Normal,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.width(8.dp))
                // Status dot
                AgentStatusDot(status = agent.status)
            }
            if (agent.version != null) {
                Text(
                    text = agent.version,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Active check
        if (agent.isActive) {
            Icon(
                Icons.Default.CheckCircle,
                contentDescription = "Active",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

/**
 * Small colored circle indicating agent status.
 */
@Composable
private fun AgentStatusDot(status: AcpAgentStatus) {
    val color = when (status) {
        AcpAgentStatus.AVAILABLE -> MaterialTheme.colorScheme.primary
        AcpAgentStatus.BUSY -> MaterialTheme.colorScheme.tertiary
        AcpAgentStatus.OFFLINE -> MaterialTheme.colorScheme.outline
        AcpAgentStatus.ERROR -> MaterialTheme.colorScheme.error
    }

    Box(
        modifier = Modifier
            .size(8.dp)
            .clip(CircleShape)
            .background(color)
    )
}

/**
 * Compact chip for displaying the active agent in a top bar.
 *
 * Shows the agent name with an icon. Tapping opens the agent picker.
 *
 * @param agent The currently active agent, or null if none.
 * @param onClick Callback when the chip is tapped.
 */
@Composable
fun AcpAgentChip(
    agent: AcpAgent?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    AssistChip(
        onClick = onClick,
        label = {
            Text(
                text = agent?.name ?: "No Agent",
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.labelMedium
            )
        },
        leadingIcon = {
            Icon(
                Icons.Default.SmartToy,
                contentDescription = null,
                modifier = Modifier.size(AssistChipDefaults.IconSize)
            )
        },
        modifier = modifier
    )
}
