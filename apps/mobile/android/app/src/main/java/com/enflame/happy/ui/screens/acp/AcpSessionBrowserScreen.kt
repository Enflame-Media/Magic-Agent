package com.enflame.happy.ui.screens.acp

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.CallSplit
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpSession
import com.enflame.happy.domain.model.acp.AcpSessionActionType
import com.enflame.happy.domain.model.acp.AcpSessionCapability
import com.enflame.happy.domain.model.acp.AcpSessionStatus
import com.enflame.happy.ui.viewmodel.acp.AcpSessionBrowserViewModel

/**
 * Session browser screen for browsing and managing ACP sessions.
 *
 * Displays a list of sessions with swipe-to-action gestures for
 * loading, resuming, and forking sessions. Actions are capability-gated.
 *
 * @param viewModel The session browser ViewModel.
 * @param onNavigateBack Callback to navigate back.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcpSessionBrowserScreen(
    viewModel: AcpSessionBrowserViewModel,
    onNavigateBack: () -> Unit
) {
    val sessions by viewModel.sessions.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val confirmAction by viewModel.confirmAction.collectAsState()
    val actionError by viewModel.actionError.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // Show error in snackbar
    LaunchedEffect(actionError) {
        actionError?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.dismissError()
        }
    }

    // Confirmation dialog
    confirmAction?.let { pending ->
        AlertDialog(
            onDismissRequest = { viewModel.dismissConfirmation() },
            title = {
                Text("${pending.action.name} Session")
            },
            text = {
                Text(
                    "Are you sure you want to ${pending.action.name.lowercase()} " +
                        "\"${pending.session.title ?: "Untitled"}\"?"
                )
            },
            confirmButton = {
                TextButton(onClick = { viewModel.confirmAction() }) {
                    Text("Confirm")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.dismissConfirmation() }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sessions") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.refreshSessions() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (sessions.isEmpty() && !isRefreshing) {
                // Empty state
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Inbox,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "No sessions available",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            "Start a session on your CLI to see it here",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(
                        items = sessions,
                        key = { it.id }
                    ) { session ->
                        AcpSessionItem(
                            session = session,
                            onLoad = {
                                viewModel.requestAction(session, AcpSessionActionType.LOAD)
                            },
                            onResume = {
                                viewModel.requestAction(session, AcpSessionActionType.RESUME)
                            },
                            onFork = {
                                viewModel.requestAction(session, AcpSessionActionType.FORK)
                            }
                        )
                    }
                }
            }
        }
    }
}

/**
 * A single session item with swipe-to-dismiss actions.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AcpSessionItem(
    session: AcpSession,
    onLoad: () -> Unit,
    onResume: () -> Unit,
    onFork: () -> Unit,
    modifier: Modifier = Modifier
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { dismissValue ->
            when (dismissValue) {
                SwipeToDismissBoxValue.StartToEnd -> {
                    if (AcpSessionCapability.LOAD in session.capabilities) {
                        onLoad()
                    }
                    false // Don't remove the item
                }
                SwipeToDismissBoxValue.EndToStart -> {
                    if (AcpSessionCapability.RESUME in session.capabilities) {
                        onResume()
                    }
                    false
                }
                SwipeToDismissBoxValue.Settled -> false
            }
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Load action (swipe right)
                if (AcpSessionCapability.LOAD in session.capabilities) {
                    Box(
                        modifier = Modifier
                            .background(
                                MaterialTheme.colorScheme.primary,
                                MaterialTheme.shapes.small
                            )
                            .padding(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.CloudDownload,
                                contentDescription = "Load",
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Load",
                                color = MaterialTheme.colorScheme.onPrimary,
                                style = MaterialTheme.typography.labelMedium
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.weight(1f))
                // Resume action (swipe left)
                if (AcpSessionCapability.RESUME in session.capabilities) {
                    Box(
                        modifier = Modifier
                            .background(
                                MaterialTheme.colorScheme.tertiary,
                                MaterialTheme.shapes.small
                            )
                            .padding(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Resume",
                                color = MaterialTheme.colorScheme.onTertiary,
                                style = MaterialTheme.typography.labelMedium
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                Icons.Default.PlayArrow,
                                contentDescription = "Resume",
                                tint = MaterialTheme.colorScheme.onTertiary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        },
        modifier = modifier
    ) {
        AcpSessionCard(
            session = session,
            onFork = if (AcpSessionCapability.FORK in session.capabilities) onFork else null
        )
    }
}

/**
 * Card displaying session details with title, agent, status, and date.
 */
@Composable
private fun AcpSessionCard(
    session: AcpSession,
    onFork: (() -> Unit)?,
    modifier: Modifier = Modifier
) {
    val border = if (session.isActive) {
        BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
    } else {
        null
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        border = border,
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (session.isActive) 4.dp else 1.dp
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = session.title ?: "Untitled Session",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (session.agentName != null) {
                        Text(
                            text = session.agentName,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                SessionStatusChip(status = session.status)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (session.machineName != null) {
                    Text(
                        text = session.machineName,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (session.lastActivityAt != null) {
                    Text(
                        text = formatRelativeDate(session.lastActivityAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (onFork != null) {
                    IconButton(
                        onClick = onFork,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Default.CallSplit,
                            contentDescription = "Fork",
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.secondary
                        )
                    }
                }
            }
        }
    }
}

/**
 * Chip showing the session status with appropriate color.
 */
@Composable
private fun SessionStatusChip(status: AcpSessionStatus) {
    val (text, color) = when (status) {
        AcpSessionStatus.ACTIVE -> "Active" to MaterialTheme.colorScheme.primary
        AcpSessionStatus.IDLE -> "Idle" to MaterialTheme.colorScheme.secondary
        AcpSessionStatus.PAUSED -> "Paused" to MaterialTheme.colorScheme.tertiary
        AcpSessionStatus.COMPLETED -> "Done" to MaterialTheme.colorScheme.outline
        AcpSessionStatus.ERROR -> "Error" to MaterialTheme.colorScheme.error
    }

    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        color = color,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .background(
                color = color.copy(alpha = 0.12f),
                shape = MaterialTheme.shapes.small
            )
            .padding(horizontal = 8.dp, vertical = 2.dp)
    )
}

/**
 * Format a timestamp as a relative date string.
 */
private fun formatRelativeDate(epochMillis: Long): String {
    val now = System.currentTimeMillis()
    val diff = now - epochMillis
    return when {
        diff < 60_000 -> "Just now"
        diff < 3_600_000 -> "${diff / 60_000}m ago"
        diff < 86_400_000 -> "${diff / 3_600_000}h ago"
        diff < 604_800_000 -> "${diff / 86_400_000}d ago"
        else -> "${diff / 604_800_000}w ago"
    }
}
