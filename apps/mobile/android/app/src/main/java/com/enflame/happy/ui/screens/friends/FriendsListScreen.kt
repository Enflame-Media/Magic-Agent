package com.enflame.happy.ui.screens.friends

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshContainer
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendStatus
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.FriendFilter
import com.enflame.happy.ui.viewmodel.FriendsUiState
import kotlinx.coroutines.flow.StateFlow

/**
 * Friends list screen displaying all connected friends with their online status.
 *
 * Features:
 * - LazyColumn with friend rows sorted by online status then name
 * - Pull-to-refresh for manual sync
 * - Search bar for filtering by name or username
 * - Status filter chips (All, Online, In Session)
 * - Loading state with shimmer skeleton
 * - Empty state when no friends exist
 * - Error state with retry via snackbar
 * - Online count indicator
 * - Add Friend FAB
 *
 * @param uiState StateFlow of [FriendsUiState] from the ViewModel.
 * @param filteredFriends StateFlow of filtered friends from the ViewModel.
 * @param onSearchQueryChanged Callback when the search query changes.
 * @param onFilterChanged Callback when the status filter changes.
 * @param onRefresh Callback for pull-to-refresh.
 * @param onFriendClick Callback when a friend row is tapped.
 * @param onAddFriendClick Callback when the Add Friend FAB is tapped.
 * @param onDismissError Callback to dismiss the error message.
 * @param onDismissSuccess Callback to dismiss the success message.
 * @param onNavigateBack Callback for the back navigation button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendsListScreen(
    uiState: StateFlow<FriendsUiState>,
    filteredFriends: StateFlow<List<Friend>>,
    onSearchQueryChanged: (String) -> Unit,
    onFilterChanged: (FriendFilter) -> Unit,
    onRefresh: () -> Unit,
    onFriendClick: (Friend) -> Unit,
    onAddFriendClick: () -> Unit,
    onDismissError: () -> Unit,
    onDismissSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by uiState.collectAsState()
    val friends by filteredFriends.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var isSearchVisible by rememberSaveable { mutableStateOf(false) }

    // Show error as snackbar
    val errorMessage = state.errorMessage
    val retryLabel = stringResource(R.string.retry)
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            val result = snackbarHostState.showSnackbar(
                message = errorMessage,
                actionLabel = retryLabel,
                duration = SnackbarDuration.Long
            )
            if (result == SnackbarResult.ActionPerformed) {
                onRefresh()
            }
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

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.friends_title)) },
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
                },
                actions = {
                    // Search toggle
                    IconButton(onClick = {
                        isSearchVisible = !isSearchVisible
                        if (!isSearchVisible) {
                            onSearchQueryChanged("")
                        }
                    }) {
                        Icon(
                            imageVector = if (isSearchVisible) Icons.Filled.SearchOff else Icons.Filled.Search,
                            contentDescription = stringResource(R.string.friends_search)
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddFriendClick,
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(
                    imageVector = Icons.Filled.PersonAdd,
                    contentDescription = stringResource(R.string.friends_add_friend)
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Search bar
            AnimatedVisibility(visible = isSearchVisible) {
                FriendsSearchBar(
                    query = state.searchQuery,
                    onQueryChanged = onSearchQueryChanged,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            // Filter chips
            FriendFilterChipRow(
                selectedFilter = state.filter,
                onFilterSelected = onFilterChanged,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            )

            // Online count header
            if (state.onlineFriendCount > 0 && state.hasLoaded) {
                OnlineCountHeader(
                    count = state.onlineFriendCount,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                )
            }

            // Content
            when {
                state.isLoading && !state.hasLoaded -> {
                    FriendShimmerLoadingList()
                }
                else -> {
                    val pullToRefreshState = rememberPullToRefreshState()
                    if (pullToRefreshState.isRefreshing) {
                        LaunchedEffect(true) {
                            onRefresh()
                        }
                    }
                    LaunchedEffect(state.isRefreshing) {
                        if (!state.isRefreshing) {
                            pullToRefreshState.endRefresh()
                        }
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .nestedScroll(pullToRefreshState.nestedScrollConnection)
                    ) {
                        if (friends.isEmpty() && state.hasLoaded) {
                            FriendsEmptyState(
                                hasFilters = state.searchQuery.isNotBlank() || state.filter != FriendFilter.ALL,
                                onAddFriendClick = onAddFriendClick
                            )
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(
                                    horizontal = 16.dp,
                                    vertical = 8.dp
                                ),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                items(
                                    items = friends,
                                    key = { it.id }
                                ) { friend ->
                                    FriendRow(
                                        friend = friend,
                                        onClick = { onFriendClick(friend) }
                                    )
                                }
                            }
                        }

                        PullToRefreshContainer(
                            state = pullToRefreshState,
                            modifier = Modifier.align(Alignment.TopCenter)
                        )
                    }
                }
            }
        }
    }
}

/**
 * A single row in the friends list showing the friend's name and online status.
 */
@Composable
fun FriendRow(
    friend: Friend,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar with status indicator
        Box {
            // Avatar placeholder
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = friend.displayName.take(1).uppercase(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }

            // Status indicator dot
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .size(14.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(2.dp)
                    .clip(CircleShape)
                    .background(friendStatusColor(friend.status))
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Name and status text
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = friend.displayName,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = friendStatusDisplayText(friend.status),
                    style = MaterialTheme.typography.bodySmall,
                    color = friendStatusColor(friend.status)
                )

                if (friend.status == FriendStatus.OFFLINE && friend.lastSeen != null) {
                    Text(
                        text = stringResource(R.string.friends_last_seen_prefix),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Shared session count badge
        if (friend.sharedSessionCount > 0) {
            Text(
                text = "${friend.sharedSessionCount}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }
    }
}

/**
 * Search bar for filtering friends by name or username.
 */
@Composable
private fun FriendsSearchBar(
    query: String,
    onQueryChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    TextField(
        value = query,
        onValueChange = onQueryChanged,
        modifier = modifier,
        placeholder = { Text(stringResource(R.string.friends_search_placeholder)) },
        leadingIcon = {
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = null
            )
        },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = TextFieldDefaults.colors(
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent,
            disabledIndicatorColor = Color.Transparent,
            focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
            unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    )
}

/**
 * Horizontal row of filter chips for friend status filtering.
 */
@Composable
private fun FriendFilterChipRow(
    selectedFilter: FriendFilter,
    onFilterSelected: (FriendFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FriendFilter.entries.forEach { filter ->
            FilterChip(
                selected = filter == selectedFilter,
                onClick = { onFilterSelected(filter) },
                label = { Text(filter.label) },
                leadingIcon = if (filter == selectedFilter) {
                    {
                        Icon(
                            imageVector = Icons.Filled.FilterList,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                } else {
                    null
                }
            )
        }
    }
}

/**
 * Online count header showing how many friends are online.
 */
@Composable
private fun OnlineCountHeader(
    count: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(Color(0xFF4CAF50))
        )
        Text(
            text = stringResource(R.string.friends_online_count, count),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * Empty state displayed when no friends match the current filters.
 */
@Composable
private fun FriendsEmptyState(
    hasFilters: Boolean,
    onAddFriendClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Filled.Inbox,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = if (hasFilters) {
                stringResource(R.string.friends_no_matching)
            } else {
                stringResource(R.string.friends_no_friends)
            },
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (hasFilters) {
                stringResource(R.string.friends_no_matching_description)
            } else {
                stringResource(R.string.friends_no_friends_description)
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

/**
 * Shimmer loading skeleton shown during initial load.
 */
@Composable
private fun FriendShimmerLoadingList(
    modifier: Modifier = Modifier
) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer_translate"
    )

    val shimmerBrush = Brush.linearGradient(
        colors = listOf(
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f),
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
        ),
        start = Offset(translateAnim - 200f, translateAnim - 200f),
        end = Offset(translateAnim, translateAnim)
    )

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        items(6) {
            ShimmerFriendRow(brush = shimmerBrush)
        }
    }
}

/**
 * Shimmer placeholder for a single friend row.
 */
@Composable
private fun ShimmerFriendRow(
    brush: Brush,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar placeholder
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(brush)
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            // Name placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.6f)
                    .height(16.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Status placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.3f)
                    .height(12.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )
        }
    }
}

/**
 * Returns the display color for a friend status.
 */
@Composable
fun friendStatusColor(status: FriendStatus): Color {
    return when (status) {
        FriendStatus.ONLINE -> Color(0xFF4CAF50)
        FriendStatus.AWAY -> Color(0xFFFF9800)
        FriendStatus.IN_SESSION -> MaterialTheme.colorScheme.primary
        FriendStatus.OFFLINE -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
    }
}

/**
 * Returns the display text for a friend status.
 */
@Composable
fun friendStatusDisplayText(status: FriendStatus): String {
    return when (status) {
        FriendStatus.ONLINE -> stringResource(R.string.friends_status_online)
        FriendStatus.AWAY -> stringResource(R.string.friends_status_away)
        FriendStatus.IN_SESSION -> stringResource(R.string.friends_status_in_session)
        FriendStatus.OFFLINE -> stringResource(R.string.friends_status_offline)
    }
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun FriendRowOnlinePreview() {
    HappyTheme {
        FriendRow(
            friend = Friend(
                id = "1",
                displayName = "Alice Developer",
                username = "alice",
                status = FriendStatus.ONLINE,
                addedAt = System.currentTimeMillis(),
                sharedSessionCount = 5
            ),
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun FriendRowOfflinePreview() {
    HappyTheme {
        FriendRow(
            friend = Friend(
                id = "2",
                displayName = "Bob Engineer",
                username = "bob",
                status = FriendStatus.OFFLINE,
                lastSeen = System.currentTimeMillis() - 3_600_000,
                addedAt = System.currentTimeMillis(),
                sharedSessionCount = 0
            ),
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun FriendsEmptyStatePreview() {
    HappyTheme {
        FriendsEmptyState(hasFilters = false, onAddFriendClick = {})
    }
}

@Preview(showBackground = true)
@Composable
private fun FriendShimmerPreview() {
    HappyTheme {
        FriendShimmerLoadingList()
    }
}
