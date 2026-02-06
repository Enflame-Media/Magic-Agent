package com.enflame.happy.ui.screens.sessions

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.SessionDetailUiState
import com.enflame.happy.ui.viewmodel.SessionDetailViewModel
import kotlinx.coroutines.launch

/**
 * Session detail screen displaying the message history for a specific session.
 *
 * Shows a session header with metadata, followed by a scrollable list of messages
 * in chronological order. Supports pull-to-refresh for manual sync and subscribes
 * to real-time WebSocket updates while visible.
 *
 * Navigation: Receives sessionId as a navigation argument and provides
 * a back button to return to the session list.
 */
@Composable
fun SessionDetailScreen(
    viewModel: SessionDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    // Subscribe to real-time updates when the screen is visible
    DisposableEffect(viewModel.sessionId) {
        viewModel.subscribeToUpdates()
        onDispose {
            viewModel.unsubscribeFromUpdates()
        }
    }

    SessionDetailContent(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onRefresh = { viewModel.refresh() },
        onDeleteSession = { viewModel.deleteSession(onNavigateBack) },
        onDismissError = { viewModel.dismissError() }
    )
}

/**
 * Stateless content composable for the session detail screen.
 *
 * Separated from [SessionDetailScreen] for preview and testing purposes.
 * Accepts a [StateFlow] of [SessionDetailUiState] and action callbacks.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun SessionDetailContent(
    uiState: SessionDetailUiState,
    onNavigateBack: () -> Unit,
    onRefresh: () -> Unit,
    onDeleteSession: () -> Unit,
    onDismissError: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Show error as snackbar
    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let { message ->
            scope.launch {
                snackbarHostState.showSnackbar(message)
                onDismissError()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.session?.title
                            ?: stringResource(R.string.session_detail),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.session_detail_back)
                        )
                    }
                },
                actions = {
                    // Status label
                    if (uiState.session != null) {
                        SessionStatusLabel(
                            status = uiState.session.status,
                            modifier = Modifier.padding(end = 4.dp)
                        )
                    }

                    // Action menu
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(
                                imageVector = Icons.Default.MoreVert,
                                contentDescription = stringResource(R.string.session_detail_more_options)
                            )
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text(stringResource(R.string.session_detail_share)) },
                                leadingIcon = {
                                    Icon(Icons.Default.Share, contentDescription = null)
                                },
                                onClick = {
                                    showMenu = false
                                    // Share functionality to be implemented
                                }
                            )
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        stringResource(R.string.session_detail_delete),
                                        color = MaterialTheme.colorScheme.error
                                    )
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                },
                                onClick = {
                                    showMenu = false
                                    showDeleteDialog = true
                                }
                            )
                        }
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when {
                // Loading state
                uiState.isLoading && !uiState.hasLoaded -> {
                    LoadingContent()
                }
                // Empty messages state
                uiState.hasLoaded && uiState.messages.isEmpty() -> {
                    EmptyMessagesContent(
                        isActive = uiState.session?.status == SessionStatus.ACTIVE
                    )
                }
                // Message list
                else -> {
                    MessageListContent(
                        session = uiState.session,
                        messages = uiState.messages
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    if (showDeleteDialog) {
        DeleteSessionDialog(
            onConfirm = {
                showDeleteDialog = false
                onDeleteSession()
            },
            onDismiss = { showDeleteDialog = false }
        )
    }
}

/**
 * Message list content with session header and chronological messages.
 */
@Composable
private fun MessageListContent(
    session: Session?,
    messages: List<Message>,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    // Auto-scroll to bottom when new messages arrive
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            // +1 for the header item
            listState.animateScrollToItem(messages.size)
        }
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        state = listState,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Session info header
        if (session != null) {
            item(key = "header") {
                SessionHeader(session = session)
                Spacer(modifier = Modifier.height(8.dp))
            }
        }

        // Messages
        items(
            items = messages,
            key = { it.id }
        ) { message ->
            MessageBubble(message = message)
        }
    }
}

/**
 * Loading state displayed while session data is being fetched.
 */
@Composable
private fun LoadingContent(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(modifier = Modifier.size(48.dp))
            Text(
                text = stringResource(R.string.session_detail_loading),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Empty state displayed when the session has no messages yet.
 */
@Composable
private fun EmptyMessagesContent(
    isActive: Boolean,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.padding(horizontal = 40.dp)
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.Message,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Text(
                text = stringResource(R.string.session_detail_no_messages),
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center
            )

            Text(
                text = stringResource(R.string.session_detail_no_messages_description),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            if (isActive) {
                Spacer(modifier = Modifier.height(8.dp))
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                Text(
                    text = stringResource(R.string.session_detail_waiting),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * Confirmation dialog for deleting a session.
 */
@Composable
private fun DeleteSessionDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.session_detail_delete_title)) },
        text = { Text(stringResource(R.string.session_detail_delete_message)) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    text = stringResource(R.string.session_detail_delete),
                    color = MaterialTheme.colorScheme.error
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun SessionDetailLoadingPreview() {
    HappyTheme {
        SessionDetailContent(
            uiState = SessionDetailUiState(isLoading = true),
            onNavigateBack = {},
            onRefresh = {},
            onDeleteSession = {},
            onDismissError = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionDetailEmptyPreview() {
    HappyTheme {
        SessionDetailContent(
            uiState = SessionDetailUiState(
                session = Session(
                    id = "session-1",
                    title = "New Session",
                    status = SessionStatus.ACTIVE,
                    createdAt = System.currentTimeMillis()
                ),
                isLoading = false,
                hasLoaded = true,
                messages = emptyList()
            ),
            onNavigateBack = {},
            onRefresh = {},
            onDeleteSession = {},
            onDismissError = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionDetailWithMessagesPreview() {
    HappyTheme {
        SessionDetailContent(
            uiState = SessionDetailUiState(
                session = Session(
                    id = "session-1",
                    title = "Refactoring auth module",
                    status = SessionStatus.ACTIVE,
                    createdAt = System.currentTimeMillis() - 3600000,
                    updatedAt = System.currentTimeMillis(),
                    machineId = "machine-1",
                    machineName = "Ryan's MacBook Pro"
                ),
                messages = listOf(
                    Message(
                        id = "msg-1",
                        sessionId = "session-1",
                        role = MessageRole.USER,
                        content = "Can you help me refactor the authentication module?",
                        createdAt = System.currentTimeMillis() - 300000
                    ),
                    Message(
                        id = "msg-2",
                        sessionId = "session-1",
                        role = MessageRole.ASSISTANT,
                        content = "I'll help you refactor the auth module. Let me look at the **current implementation** first.\n\nI'll read the relevant files.",
                        createdAt = System.currentTimeMillis() - 240000
                    ),
                    Message(
                        id = "msg-3",
                        sessionId = "session-1",
                        role = MessageRole.SYSTEM,
                        content = "Tool execution completed.",
                        createdAt = System.currentTimeMillis() - 180000
                    )
                ),
                isLoading = false,
                hasLoaded = true
            ),
            onNavigateBack = {},
            onRefresh = {},
            onDeleteSession = {},
            onDismissError = {}
        )
    }
}
