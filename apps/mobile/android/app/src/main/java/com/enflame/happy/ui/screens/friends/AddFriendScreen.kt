package com.enflame.happy.ui.screens.friends

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Send
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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.FriendRequest
import com.enflame.happy.domain.model.FriendRequestStatus
import com.enflame.happy.domain.model.FriendRequestUser
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.FriendsUiState
import kotlinx.coroutines.flow.StateFlow

/**
 * Add Friend screen with tabs for adding by username, QR code,
 * and viewing pending friend requests.
 *
 * @param uiState StateFlow of [FriendsUiState] from the ViewModel.
 * @param friendRequests StateFlow of pending friend requests.
 * @param onSendRequest Callback to send a friend request by username.
 * @param onAcceptRequest Callback to accept a friend request.
 * @param onDeclineRequest Callback to decline a friend request.
 * @param onScanQrCode Callback to navigate to QR scanner.
 * @param onDismissError Callback to dismiss error messages.
 * @param onDismissSuccess Callback to dismiss success messages.
 * @param onNavigateBack Callback for the back navigation button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFriendScreen(
    uiState: StateFlow<FriendsUiState>,
    friendRequests: StateFlow<List<FriendRequest>>,
    onSendRequest: (username: String, message: String?) -> Unit,
    onAcceptRequest: (String) -> Unit,
    onDeclineRequest: (String) -> Unit,
    onScanQrCode: () -> Unit,
    onDismissError: () -> Unit,
    onDismissSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by uiState.collectAsState()
    val requests by friendRequests.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedTabIndex by rememberSaveable { mutableIntStateOf(0) }

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

    // Show success as snackbar
    val successMessage = state.successMessage
    LaunchedEffect(successMessage) {
        if (successMessage != null) {
            snackbarHostState.showSnackbar(
                message = successMessage,
                duration = SnackbarDuration.Short
            )
            onDismissSuccess()
        }
    }

    val tabs = listOf(
        stringResource(R.string.friends_tab_username),
        stringResource(R.string.friends_tab_qr_code),
        stringResource(R.string.friends_tab_requests)
    )

    // Count pending requests for tab badge
    val pendingCount = requests.count { it.status == FriendRequestStatus.PENDING }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.friends_add_friend)) },
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
        ) {
            // Tabs
            TabRow(selectedTabIndex = selectedTabIndex) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTabIndex == index,
                        onClick = { selectedTabIndex = index },
                        text = {
                            if (index == 2 && pendingCount > 0) {
                                Text("$title ($pendingCount)")
                            } else {
                                Text(title)
                            }
                        }
                    )
                }
            }

            // Tab content
            when (selectedTabIndex) {
                0 -> UsernameSearchTab(
                    isSending = state.isSendingRequest,
                    onSendRequest = onSendRequest
                )
                1 -> QrCodeTab(onScanQrCode = onScanQrCode)
                2 -> PendingRequestsTab(
                    requests = requests,
                    onAcceptRequest = onAcceptRequest,
                    onDeclineRequest = onDeclineRequest
                )
            }
        }
    }
}

/**
 * Tab content for adding a friend by username.
 */
@Composable
private fun UsernameSearchTab(
    isSending: Boolean,
    onSendRequest: (username: String, message: String?) -> Unit,
    modifier: Modifier = Modifier
) {
    var username by rememberSaveable { mutableStateOf("") }
    var message by rememberSaveable { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Icon and instructions
        Icon(
            imageVector = Icons.Filled.Person,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Text(
            text = stringResource(R.string.friends_username_instructions),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Username field
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text(stringResource(R.string.friends_username_label)) },
            placeholder = { Text(stringResource(R.string.friends_username_placeholder)) },
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )

        // Optional message field
        OutlinedTextField(
            value = message,
            onValueChange = { message = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text(stringResource(R.string.friends_message_label)) },
            placeholder = { Text(stringResource(R.string.friends_message_placeholder)) },
            maxLines = 3,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Send button
        Button(
            onClick = {
                onSendRequest(username.trim(), message.trim().ifEmpty { null })
                username = ""
                message = ""
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = username.trim().isNotEmpty() && !isSending,
            shape = RoundedCornerShape(12.dp)
        ) {
            if (isSending) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
                Spacer(modifier = Modifier.width(8.dp))
            } else {
                Icon(
                    imageVector = Icons.Filled.Send,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(stringResource(R.string.friends_send_request))
        }
    }
}

/**
 * Tab content for adding a friend via QR code.
 */
@Composable
private fun QrCodeTab(
    onScanQrCode: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Filled.QrCodeScanner,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = stringResource(R.string.friends_qr_instructions),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onScanQrCode,
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.QrCodeScanner,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(stringResource(R.string.friends_scan_qr_code))
        }
    }
}

/**
 * Tab content for viewing pending friend requests (sent and received).
 */
@Composable
private fun PendingRequestsTab(
    requests: List<FriendRequest>,
    onAcceptRequest: (String) -> Unit,
    onDeclineRequest: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val pendingRequests = requests.filter { it.status == FriendRequestStatus.PENDING }

    if (pendingRequests.isEmpty()) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Person,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = stringResource(R.string.friends_no_pending_requests),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(R.string.friends_no_pending_requests_description),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    } else {
        LazyColumn(
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(
                items = pendingRequests,
                key = { it.id }
            ) { request ->
                FriendRequestCard(
                    request = request,
                    onAccept = { onAcceptRequest(request.id) },
                    onDecline = { onDeclineRequest(request.id) }
                )
            }
        }
    }
}

/**
 * Card displaying a single friend request with accept/decline actions.
 */
@Composable
private fun FriendRequestCard(
    request: FriendRequest,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
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
            // User info
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = request.fromUser.displayName,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "@${request.fromUser.username}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Optional message
            if (!request.message.isNullOrBlank()) {
                Text(
                    text = request.message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End)
            ) {
                FilledTonalButton(
                    onClick = onDecline,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                        contentColor = MaterialTheme.colorScheme.onErrorContainer
                    )
                ) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(stringResource(R.string.friends_decline))
                }

                Button(onClick = onAccept) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(stringResource(R.string.friends_accept))
                }
            }
        }
    }
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun UsernameSearchTabPreview() {
    HappyTheme {
        UsernameSearchTab(
            isSending = false,
            onSendRequest = { _, _ -> }
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun QrCodeTabPreview() {
    HappyTheme {
        QrCodeTab(onScanQrCode = {})
    }
}

@Preview(showBackground = true)
@Composable
private fun FriendRequestCardPreview() {
    HappyTheme {
        FriendRequestCard(
            request = FriendRequest(
                id = "req-1",
                fromUser = FriendRequestUser(
                    id = "user-1",
                    displayName = "Alice Developer",
                    username = "alice"
                ),
                toUser = FriendRequestUser(
                    id = "user-2",
                    displayName = "Bob Engineer",
                    username = "bob"
                ),
                status = FriendRequestStatus.PENDING,
                message = "Hey, let's collaborate on some projects!",
                createdAt = System.currentTimeMillis()
            ),
            onAccept = {},
            onDecline = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PendingRequestsEmptyPreview() {
    HappyTheme {
        PendingRequestsTab(
            requests = emptyList(),
            onAcceptRequest = {},
            onDeclineRequest = {}
        )
    }
}
