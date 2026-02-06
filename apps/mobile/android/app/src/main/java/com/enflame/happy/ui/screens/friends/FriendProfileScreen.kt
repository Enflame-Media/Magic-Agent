package com.enflame.happy.ui.screens.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendStatus
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionShare
import com.enflame.happy.domain.model.SharePermission
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.FriendsUiState
import kotlinx.coroutines.flow.StateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Friend profile screen showing detailed information about a friend.
 *
 * Features:
 * - Large avatar with status indicator
 * - Name, username, and status display
 * - Last seen time for offline friends
 * - Statistics (shared sessions, friends since)
 * - Session sharing with permission selection dialog
 * - Shared session history with revoke capability
 * - Remove friend with confirmation dialog
 *
 * @param friend The friend to display.
 * @param uiState StateFlow of [FriendsUiState] from the ViewModel.
 * @param onRemoveFriend Callback to remove the friend.
 * @param onShowShareDialog Callback to show the session sharing dialog.
 * @param onDismissShareDialog Callback to dismiss the session sharing dialog.
 * @param onShareSession Callback to share a session (sessionId, friendId, permission).
 * @param onLoadSharedSessions Callback to load shared sessions for this friend.
 * @param onRevokeSessionShare Callback to revoke a session share (sessionId, shareId, friendId).
 * @param onDismissError Callback to dismiss error messages.
 * @param onDismissSuccess Callback to dismiss success messages.
 * @param onNavigateBack Callback for the back navigation button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendProfileScreen(
    friend: Friend,
    uiState: StateFlow<FriendsUiState>,
    onRemoveFriend: (String) -> Unit,
    onShowShareDialog: (String) -> Unit,
    onDismissShareDialog: () -> Unit,
    onShareSession: (sessionId: String, friendId: String, permission: SharePermission) -> Unit,
    onLoadSharedSessions: (String) -> Unit,
    onRevokeSessionShare: (sessionId: String, shareId: String, friendId: String) -> Unit,
    onDismissError: () -> Unit,
    onDismissSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showRemoveConfirmation by rememberSaveable { mutableStateOf(false) }
    var showSharedSessionsHistory by rememberSaveable { mutableStateOf(false) }

    // Load shared sessions when screen opens
    LaunchedEffect(friend.id) {
        onLoadSharedSessions(friend.id)
    }

    // Show error as snackbar
    val errorMessage = state.errorMessage
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            snackbarHostState.showSnackbar(
                message = errorMessage,
                duration = SnackbarDuration.Long
            )
            onDismissError()
        }
    }

    // Show success as snackbar and navigate back after removal
    val successMessage = state.successMessage
    LaunchedEffect(successMessage) {
        if (successMessage != null) {
            snackbarHostState.showSnackbar(
                message = successMessage,
                duration = SnackbarDuration.Short
            )
            onDismissSuccess()
            if (successMessage.contains("removed", ignoreCase = true)) {
                onNavigateBack()
            }
        }
    }

    // Remove confirmation dialog
    if (showRemoveConfirmation) {
        AlertDialog(
            onDismissRequest = { showRemoveConfirmation = false },
            title = { Text(stringResource(R.string.friends_remove_confirm_title)) },
            text = {
                Text(
                    stringResource(
                        R.string.friends_remove_confirm_message,
                        friend.displayName
                    )
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRemoveConfirmation = false
                        onRemoveFriend(friend.id)
                    },
                    colors = ButtonDefaults.textButtonColors(
                        contentColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text(stringResource(R.string.friends_remove_friend))
                }
            },
            dismissButton = {
                TextButton(onClick = { showRemoveConfirmation = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }

    // Session sharing dialog
    if (state.isShareDialogVisible) {
        ShareSessionDialog(
            availableSessions = state.availableSessions,
            isSharingSession = state.isSharingSession,
            friendName = friend.displayName,
            onShareSession = { sessionId, permission ->
                onShareSession(sessionId, friend.id, permission)
            },
            onDismiss = onDismissShareDialog
        )
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(friend.displayName) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Profile header
            ProfileHeader(friend = friend)

            // Status card
            StatusCard(friend = friend)

            // Statistics
            StatisticsSection(friend = friend)

            // Actions
            ActionsSection(
                friend = friend,
                onShareSession = { onShowShareDialog(friend.id) },
                onViewSharedSessions = {
                    showSharedSessionsHistory = !showSharedSessionsHistory
                }
            )

            // Shared sessions history (collapsible)
            if (showSharedSessionsHistory) {
                SharedSessionsHistorySection(
                    sharedSessions = state.sharedSessions,
                    isLoading = state.isLoadingSharedSessions,
                    onRevoke = { sessionId, shareId ->
                        onRevokeSessionShare(sessionId, shareId, friend.id)
                    }
                )
            }

            // Danger zone - remove friend
            DangerSection(
                onRemoveClick = { showRemoveConfirmation = true }
            )
        }
    }
}

/**
 * Profile header with large avatar and name/username.
 */
@Composable
private fun ProfileHeader(
    friend: Friend,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Large avatar with status indicator
        Box {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = friend.displayName.take(1).uppercase(),
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }

            // Status indicator
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(3.dp)
                    .clip(CircleShape)
                    .background(friendStatusColor(friend.status))
            )
        }

        // Name and username
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = friend.displayName,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Text(
                text = "@${friend.username}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Card displaying the friend's current status and last seen time.
 */
@Composable
private fun StatusCard(
    friend: Friend,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Status row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(friendStatusColor(friend.status))
                )
                Text(
                    text = friendStatusDisplayText(friend.status),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Medium,
                    color = friendStatusColor(friend.status)
                )
            }

            // Last seen for offline friends
            if (friend.status == FriendStatus.OFFLINE && friend.lastSeen != null) {
                Text(
                    text = stringResource(
                        R.string.friends_last_seen_time,
                        formatTimestamp(friend.lastSeen)
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // In session indicator
            if (friend.status == FriendStatus.IN_SESSION) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.Terminal,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = stringResource(R.string.friends_currently_in_session),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

/**
 * Statistics section showing shared sessions and friendship duration.
 */
@Composable
private fun StatisticsSection(
    friend: Friend,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = stringResource(R.string.friends_statistics),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Shared sessions card
            StatisticCard(
                title = stringResource(R.string.friends_shared_sessions),
                value = "${friend.sharedSessionCount}",
                icon = Icons.Filled.ViewList,
                modifier = Modifier.weight(1f)
            )

            // Friends since card
            StatisticCard(
                title = stringResource(R.string.friends_friends_since),
                value = formatDate(friend.addedAt),
                icon = Icons.Filled.CalendarToday,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

/**
 * A small card displaying a single statistic with an icon.
 */
@Composable
private fun StatisticCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = MaterialTheme.colorScheme.primary
            )

            Text(
                text = value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Text(
                text = title,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}

/**
 * Actions section with share session and view shared sessions buttons.
 */
@Composable
private fun ActionsSection(
    friend: Friend,
    onShareSession: () -> Unit,
    onViewSharedSessions: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = stringResource(R.string.friends_actions),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        // Share session button
        Button(
            onClick = onShareSession,
            modifier = Modifier.fillMaxWidth(),
            enabled = friend.status != FriendStatus.OFFLINE,
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Share,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.friends_share_session))
        }

        // View shared sessions button
        if (friend.sharedSessionCount > 0) {
            FilledTonalButton(
                onClick = onViewSharedSessions,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.ViewList,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.friends_view_shared_sessions))
            }
        }
    }
}

/**
 * Danger zone section with the remove friend button.
 */
@Composable
private fun DangerSection(
    onRemoveClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

        OutlinedButton(
            onClick = onRemoveClick,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.error
            )
        ) {
            Icon(
                imageVector = Icons.Filled.PersonRemove,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.friends_remove_friend))
        }
    }
}

/**
 * Dialog for selecting a session to share with a friend.
 * Shows available sessions with permission level selection.
 */
@Composable
private fun ShareSessionDialog(
    availableSessions: List<Session>,
    isSharingSession: Boolean,
    friendName: String,
    onShareSession: (sessionId: String, permission: SharePermission) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedSessionId by rememberSaveable { mutableStateOf<String?>(null) }
    var selectedPermission by rememberSaveable { mutableStateOf(SharePermission.VIEW) }

    AlertDialog(
        onDismissRequest = { if (!isSharingSession) onDismiss() },
        title = {
            Text(stringResource(R.string.share_session_dialog_title, friendName))
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (availableSessions.isEmpty()) {
                    Text(
                        text = stringResource(R.string.share_session_no_sessions),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    Text(
                        text = stringResource(R.string.share_session_select_session),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // Session list
                    availableSessions.forEach { session ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { selectedSessionId = session.id }
                                .padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedSessionId == session.id,
                                onClick = { selectedSessionId = session.id }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = session.title
                                        ?: stringResource(R.string.session_untitled),
                                    style = MaterialTheme.typography.bodyMedium,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = session.machineName ?: session.machineId ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    HorizontalDivider()

                    // Permission selection
                    Text(
                        text = stringResource(R.string.share_session_permission_label),
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedPermission = SharePermission.VIEW }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedPermission == SharePermission.VIEW,
                            onClick = { selectedPermission = SharePermission.VIEW }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text(
                                text = stringResource(R.string.share_session_permission_view),
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = stringResource(R.string.share_session_permission_view_description),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedPermission = SharePermission.INTERACT }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedPermission == SharePermission.INTERACT,
                            onClick = { selectedPermission = SharePermission.INTERACT }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Column {
                            Text(
                                text = stringResource(R.string.share_session_permission_interact),
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = stringResource(R.string.share_session_permission_interact_description),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (availableSessions.isNotEmpty()) {
                TextButton(
                    onClick = {
                        selectedSessionId?.let { sessionId ->
                            onShareSession(sessionId, selectedPermission)
                        }
                    },
                    enabled = selectedSessionId != null && !isSharingSession
                ) {
                    if (isSharingSession) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(stringResource(R.string.share_session_confirm))
                }
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                enabled = !isSharingSession
            ) {
                Text(stringResource(R.string.cancel))
            }
        }
    )
}

/**
 * Section showing the history of sessions shared with this friend.
 */
@Composable
private fun SharedSessionsHistorySection(
    sharedSessions: List<SessionShare>,
    isLoading: Boolean,
    onRevoke: (sessionId: String, shareId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = stringResource(R.string.shared_sessions_history_title),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
            }
        } else if (sharedSessions.isEmpty()) {
            Text(
                text = stringResource(R.string.shared_sessions_empty),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(8.dp)
            )
        } else {
            sharedSessions.forEach { share ->
                SharedSessionRow(
                    share = share,
                    onRevoke = { onRevoke(share.sessionId, share.id) }
                )
            }
        }
    }
}

/**
 * A single row in the shared sessions history.
 */
@Composable
private fun SharedSessionRow(
    share: SessionShare,
    onRevoke: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
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
                imageVector = Icons.Filled.Terminal,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = share.sessionTitle ?: stringResource(R.string.session_untitled),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = stringResource(
                        R.string.shared_session_permission_label,
                        if (share.permission == SharePermission.VIEW) {
                            stringResource(R.string.share_session_permission_view)
                        } else {
                            stringResource(R.string.share_session_permission_interact)
                        }
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = stringResource(
                        R.string.shared_session_shared_at,
                        formatDate(share.sharedAt)
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(onClick = onRevoke) {
                Icon(
                    imageVector = Icons.Filled.Delete,
                    contentDescription = stringResource(R.string.shared_session_revoke),
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

/**
 * Formats a timestamp into a human-readable date string.
 */
private fun formatDate(timestamp: Long): String {
    val formatter = SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
    return formatter.format(Date(timestamp))
}

/**
 * Formats a timestamp into a relative or absolute time string.
 */
private fun formatTimestamp(timestamp: Long): String {
    val now = System.currentTimeMillis()
    val diff = now - timestamp

    return when {
        diff < 60_000 -> "just now"
        diff < 3_600_000 -> "${diff / 60_000}m ago"
        diff < 86_400_000 -> "${diff / 3_600_000}h ago"
        else -> {
            val formatter = SimpleDateFormat("MMM d", Locale.getDefault())
            formatter.format(Date(timestamp))
        }
    }
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun ProfileHeaderPreview() {
    HappyTheme {
        ProfileHeader(
            friend = Friend(
                id = "1",
                displayName = "Alice Developer",
                username = "alice",
                status = FriendStatus.ONLINE,
                addedAt = System.currentTimeMillis() - 86_400_000L * 30,
                sharedSessionCount = 5
            )
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun StatusCardOnlinePreview() {
    HappyTheme {
        StatusCard(
            friend = Friend(
                id = "1",
                displayName = "Alice",
                username = "alice",
                status = FriendStatus.ONLINE,
                addedAt = System.currentTimeMillis()
            )
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun StatusCardOfflinePreview() {
    HappyTheme {
        StatusCard(
            friend = Friend(
                id = "1",
                displayName = "Bob",
                username = "bob",
                status = FriendStatus.OFFLINE,
                lastSeen = System.currentTimeMillis() - 3_600_000,
                addedAt = System.currentTimeMillis()
            )
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun StatisticsSectionPreview() {
    HappyTheme {
        StatisticsSection(
            friend = Friend(
                id = "1",
                displayName = "Alice",
                username = "alice",
                status = FriendStatus.ONLINE,
                addedAt = System.currentTimeMillis() - 86_400_000L * 30,
                sharedSessionCount = 5
            )
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun DangerSectionPreview() {
    HappyTheme {
        DangerSection(onRemoveClick = {})
    }
}
