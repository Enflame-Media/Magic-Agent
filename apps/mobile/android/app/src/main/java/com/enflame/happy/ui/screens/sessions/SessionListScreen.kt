package com.enflame.happy.ui.screens.sessions

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.ConnectionStatus
import com.enflame.happy.ui.viewmodel.SessionFilter
import com.enflame.happy.ui.viewmodel.SessionListUiState
import kotlinx.coroutines.flow.StateFlow

/**
 * Sessions list screen displaying all Claude Code sessions.
 *
 * Features:
 * - LazyColumn with session cards sorted by most recent activity
 * - Pull-to-refresh for manual sync
 * - Search bar for filtering by title
 * - Status filter chips (All, Active, Completed, Error)
 * - Loading state with shimmer skeleton
 * - Empty state when no sessions exist
 * - Error state with retry via snackbar
 * - Connection status indicator in toolbar
 *
 * @param uiState StateFlow of [SessionListUiState] from the ViewModel.
 * @param filteredSessions StateFlow of filtered sessions from the ViewModel.
 * @param onSearchQueryChanged Callback when the search query changes.
 * @param onFilterChanged Callback when the status filter changes.
 * @param onRefresh Callback for pull-to-refresh.
 * @param onSessionClick Callback when a session card is tapped.
 * @param onDismissError Callback to dismiss the error message.
 * @param onNavigateBack Callback for the back navigation button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionListScreen(
    uiState: StateFlow<SessionListUiState>,
    filteredSessions: StateFlow<List<Session>>,
    onSearchQueryChanged: (String) -> Unit,
    onFilterChanged: (SessionFilter) -> Unit,
    onRefresh: () -> Unit,
    onSessionClick: (Session) -> Unit,
    onDismissError: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by uiState.collectAsState()
    val sessions by filteredSessions.collectAsState()
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

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.sessions)) },
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
                    // Connection status indicator
                    ConnectionStatusIndicator(status = state.connectionStatus)

                    // Search toggle
                    IconButton(onClick = {
                        isSearchVisible = !isSearchVisible
                        if (!isSearchVisible) {
                            onSearchQueryChanged("")
                        }
                    }) {
                        Icon(
                            imageVector = if (isSearchVisible) Icons.Filled.SearchOff else Icons.Filled.Search,
                            contentDescription = stringResource(R.string.session_search)
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
            // Search bar
            AnimatedVisibility(visible = isSearchVisible) {
                SearchBar(
                    query = state.searchQuery,
                    onQueryChanged = onSearchQueryChanged,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            // Filter chips
            FilterChipRow(
                selectedFilter = state.filter,
                onFilterSelected = onFilterChanged,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            )

            // Content
            when {
                state.isLoading && !state.hasLoaded -> {
                    ShimmerLoadingList()
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
                        if (sessions.isEmpty() && state.hasLoaded) {
                            EmptyState(
                                hasFilters = state.searchQuery.isNotBlank() || state.filter != SessionFilter.ALL
                            )
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(
                                    horizontal = 16.dp,
                                    vertical = 8.dp
                                ),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(
                                    items = sessions,
                                    key = { it.id }
                                ) { session ->
                                    SessionCard(
                                        session = session,
                                        onClick = { onSessionClick(session) }
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
 * Search bar for filtering sessions by title or machine name.
 */
@Composable
private fun SearchBar(
    query: String,
    onQueryChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    TextField(
        value = query,
        onValueChange = onQueryChanged,
        modifier = modifier,
        placeholder = { Text(stringResource(R.string.session_search_placeholder)) },
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
 * Horizontal row of filter chips for session status filtering.
 */
@Composable
private fun FilterChipRow(
    selectedFilter: SessionFilter,
    onFilterSelected: (SessionFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        SessionFilter.entries.forEach { filter ->
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
 * Connection status indicator in the toolbar.
 */
@Composable
private fun ConnectionStatusIndicator(
    status: ConnectionStatus,
    modifier: Modifier = Modifier
) {
    when (status) {
        ConnectionStatus.CONNECTED -> {
            Icon(
                imageVector = Icons.Filled.Wifi,
                contentDescription = stringResource(R.string.session_connection_connected),
                tint = Color(0xFF4CAF50),
                modifier = modifier
                    .padding(horizontal = 4.dp)
                    .size(18.dp)
            )
        }
        ConnectionStatus.CONNECTING -> {
            CircularProgressIndicator(
                modifier = modifier
                    .padding(horizontal = 4.dp)
                    .size(16.dp),
                strokeWidth = 2.dp
            )
        }
        ConnectionStatus.DISCONNECTED -> {
            Icon(
                imageVector = Icons.Filled.WifiOff,
                contentDescription = stringResource(R.string.session_connection_disconnected),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = modifier
                    .padding(horizontal = 4.dp)
                    .size(18.dp)
            )
        }
        ConnectionStatus.RECONNECTING -> {
            Icon(
                imageVector = Icons.Filled.Refresh,
                contentDescription = stringResource(R.string.session_connection_reconnecting),
                tint = Color(0xFFFF9800),
                modifier = modifier
                    .padding(horizontal = 4.dp)
                    .size(18.dp)
            )
        }
    }
}

/**
 * Empty state displayed when no sessions match the current filters.
 */
@Composable
private fun EmptyState(
    hasFilters: Boolean,
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
                stringResource(R.string.session_no_matching)
            } else {
                stringResource(R.string.no_sessions)
            },
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (hasFilters) {
                stringResource(R.string.session_no_matching_description)
            } else {
                stringResource(R.string.no_sessions_description)
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

/**
 * Shimmer loading skeleton shown during initial load.
 *
 * Displays placeholder cards with a shimmer animation to indicate
 * content is loading.
 */
@Composable
private fun ShimmerLoadingList(
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
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(5) {
            ShimmerSessionCard(brush = shimmerBrush)
        }
    }
}

/**
 * Shimmer placeholder for a single session card.
 */
@Composable
private fun ShimmerSessionCard(
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
        // Status badge placeholder
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(brush)
        )

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            // Title placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.7f)
                    .height(16.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Subtitle placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.5f)
                    .height(12.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )
        }
    }
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun EmptyStatePreview() {
    HappyTheme {
        EmptyState(hasFilters = false)
    }
}

@Preview(showBackground = true)
@Composable
private fun EmptyStateWithFiltersPreview() {
    HappyTheme {
        EmptyState(hasFilters = true)
    }
}

@Preview(showBackground = true)
@Composable
private fun ShimmerLoadingPreview() {
    HappyTheme {
        ShimmerLoadingList()
    }
}

@Preview(showBackground = true)
@Composable
private fun FilterChipRowPreview() {
    HappyTheme {
        FilterChipRow(
            selectedFilter = SessionFilter.ALL,
            onFilterSelected = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SearchBarPreview() {
    HappyTheme {
        SearchBar(
            query = "",
            onQueryChanged = {}
        )
    }
}
