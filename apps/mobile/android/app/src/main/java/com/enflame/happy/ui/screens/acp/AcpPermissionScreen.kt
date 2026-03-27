package com.enflame.happy.ui.screens.acp

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpPermission
import com.enflame.happy.domain.model.acp.AcpPermissionDecision
import com.enflame.happy.domain.model.acp.AcpPermissionStatus
import com.enflame.happy.domain.model.acp.AcpToolKind
import com.enflame.happy.ui.viewmodel.acp.AcpPermissionViewModel
import kotlinx.coroutines.delay

/**
 * Full-screen composable for reviewing and responding to ACP tool permission requests.
 *
 * Displays the current permission request with tool details, file paths,
 * raw input preview, and four action buttons. Includes a circular timeout
 * countdown and queue indicator.
 *
 * @param viewModel The permission ViewModel (injected via Hilt).
 * @param onNavigateBack Callback to navigate back.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcpPermissionScreen(
    viewModel: AcpPermissionViewModel,
    onNavigateBack: () -> Unit
) {
    val pendingPermissions by viewModel.pendingPermissions.collectAsState()
    val permissionHistory by viewModel.permissionHistory.collectAsState()
    val showHaptic by viewModel.showHapticTrigger.collectAsState()
    val showHistory by viewModel.showHistory.collectAsState()
    val hapticFeedback = LocalHapticFeedback.current

    // Haptic feedback when new permission arrives
    LaunchedEffect(showHaptic) {
        if (showHaptic) {
            hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
            viewModel.consumeHapticTrigger()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Permissions") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.toggleHistory() }) {
                        Icon(Icons.Default.History, contentDescription = "History")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (showHistory) {
                // Permission history view
                PermissionHistoryList(
                    history = permissionHistory,
                    modifier = Modifier.fillMaxSize()
                )
            } else if (pendingPermissions.isEmpty()) {
                // Empty state
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Code,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "No pending permissions",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "Permission requests will appear here",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                // Queue indicator
                if (pendingPermissions.size > 1) {
                    Text(
                        text = "1 of ${pendingPermissions.size}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )
                }

                // Current permission request
                val currentPermission = pendingPermissions.first()
                PermissionRequestCard(
                    permission = currentPermission,
                    onDecision = { decision ->
                        hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                        viewModel.respond(currentPermission.id, decision)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(16.dp)
                )
            }
        }
    }
}

/**
 * Card displaying a single permission request with details and action buttons.
 */
@Composable
private fun PermissionRequestCard(
    permission: AcpPermission,
    onDecision: (AcpPermissionDecision) -> Unit,
    modifier: Modifier = Modifier
) {
    var showRawInput by remember { mutableStateOf(false) }
    var progress by remember { mutableFloatStateOf(1f) }

    // Countdown timer
    LaunchedEffect(permission.id) {
        val totalMs = permission.timeoutMs.toFloat()
        while (progress > 0f) {
            val remaining = permission.remainingMs
            progress = (remaining.toFloat() / totalMs).coerceIn(0f, 1f)
            delay(100)
        }
    }

    Card(
        modifier = modifier,
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Tool header with icon and countdown
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = toolKindIcon(permission.toolKind),
                        contentDescription = permission.toolKind.name,
                        modifier = Modifier.size(40.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = permission.toolName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = permission.toolKind.name.replace("_", " "),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    // Circular timeout countdown
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(
                            progress = { progress },
                            modifier = Modifier.size(40.dp),
                            strokeWidth = 3.dp,
                            color = if (progress < 0.25f) {
                                MaterialTheme.colorScheme.error
                            } else {
                                MaterialTheme.colorScheme.primary
                            }
                        )
                        Text(
                            text = "${(permission.remainingMs / 1000)}s",
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                }
            }

            // Description
            if (permission.description != null) {
                item {
                    Text(
                        text = permission.description,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            // File paths
            if (permission.filePaths.isNotEmpty()) {
                item {
                    Text(
                        text = "Affected Files",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                items(permission.filePaths) { path ->
                    Text(
                        text = path,
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Raw input (expandable)
            if (permission.rawInput != null) {
                item {
                    TextButton(onClick = { showRawInput = !showRawInput }) {
                        Text(if (showRawInput) "Hide Raw Input" else "Show Raw Input")
                    }
                    AnimatedVisibility(
                        visible = showRawInput,
                        enter = expandVertically(),
                        exit = shrinkVertically()
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        ) {
                            Text(
                                text = permission.rawInput,
                                style = MaterialTheme.typography.bodySmall,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(8.dp),
                                maxLines = 20,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }

            // Action buttons
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { onDecision(AcpPermissionDecision.ALLOW_ONCE) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary
                            )
                        ) {
                            Text("Allow Once")
                        }
                        Button(
                            onClick = { onDecision(AcpPermissionDecision.ALLOW_ALWAYS) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.tertiary
                            )
                        ) {
                            Text("Allow Always")
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { onDecision(AcpPermissionDecision.REJECT_ONCE) },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Reject Once")
                        }
                        OutlinedButton(
                            onClick = { onDecision(AcpPermissionDecision.REJECT_ALWAYS) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error
                            )
                        ) {
                            Text("Reject Always")
                        }
                    }
                }
            }
        }
    }
}

/**
 * Scrollable list of resolved permission history.
 */
@Composable
private fun PermissionHistoryList(
    history: List<AcpPermission>,
    modifier: Modifier = Modifier
) {
    if (history.isEmpty()) {
        Box(
            modifier = modifier,
            contentAlignment = Alignment.Center
        ) {
            Text(
                "No permission history",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    } else {
        LazyColumn(
            modifier = modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(history) { permission ->
                PermissionHistoryItem(permission = permission)
            }
        }
    }
}

/**
 * Single item in the permission history list.
 */
@Composable
private fun PermissionHistoryItem(permission: AcpPermission) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = toolKindIcon(permission.toolKind),
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = permission.toolName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
                if (permission.description != null) {
                    Text(
                        text = permission.description,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            PermissionStatusBadge(status = permission.status)
        }
    }
}

/**
 * Badge showing the resolution status of a permission.
 */
@Composable
private fun PermissionStatusBadge(status: AcpPermissionStatus) {
    val (text, color) = when (status) {
        AcpPermissionStatus.ALLOWED_ONCE -> "Allowed" to MaterialTheme.colorScheme.primary
        AcpPermissionStatus.ALLOWED_ALWAYS -> "Always" to MaterialTheme.colorScheme.tertiary
        AcpPermissionStatus.REJECTED_ONCE -> "Rejected" to MaterialTheme.colorScheme.error
        AcpPermissionStatus.REJECTED_ALWAYS -> "Blocked" to MaterialTheme.colorScheme.error
        AcpPermissionStatus.EXPIRED -> "Expired" to MaterialTheme.colorScheme.outline
        AcpPermissionStatus.PENDING -> "Pending" to MaterialTheme.colorScheme.secondary
    }

    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        fontWeight = FontWeight.Bold
    )
}

/**
 * Map tool kind to a Material Design icon.
 */
private fun toolKindIcon(kind: AcpToolKind): ImageVector {
    return when (kind) {
        AcpToolKind.FILE_READ -> Icons.Default.Description
        AcpToolKind.FILE_WRITE -> Icons.Default.Edit
        AcpToolKind.SHELL -> Icons.Default.Terminal
        AcpToolKind.BROWSER -> Icons.Default.Language
        AcpToolKind.NETWORK -> Icons.Default.Wifi
        AcpToolKind.OTHER -> Icons.Default.Code
    }
}
