package com.enflame.happy.ui.screens.friends

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendStatus
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
 * - Action buttons (share session, view shared sessions)
 * - Remove friend with confirmation dialog
 *
 * @param friend The friend to display.
 * @param uiState StateFlow of [FriendsUiState] from the ViewModel.
 * @param onRemoveFriend Callback to remove the friend.
 * @param onShareSession Callback to share a session with this friend.
 * @param onViewSharedSessions Callback to view shared sessions.
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
    onShareSession: () -> Unit,
    onViewSharedSessions: () -> Unit,
    onDismissError: () -> Unit,
    onDismissSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showRemoveConfirmation by rememberSaveable { mutableStateOf(false) }

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
                onShareSession = onShareSession,
                onViewSharedSessions = onViewSharedSessions
            )

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
