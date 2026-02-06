package com.enflame.happy.ui.screens.artifacts

import android.text.format.DateUtils
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SearchOff
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.ArtifactLanguage
import com.enflame.happy.domain.model.ArtifactType
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.ArtifactListUiState
import com.enflame.happy.ui.viewmodel.ArtifactTypeFilter
import kotlinx.coroutines.flow.StateFlow

/**
 * Artifact list screen displaying all artifacts for a session.
 *
 * Features:
 * - LazyColumn with artifact cards
 * - Filter by type (All, Code, Documents, Config)
 * - Search by title/filename
 * - Artifact card with type icon, title, language badge, line count
 * - Loading and empty states
 * - Error handling with snackbar
 *
 * @param uiState StateFlow of [ArtifactListUiState] from the ViewModel.
 * @param filteredArtifacts StateFlow of filtered artifacts from the ViewModel.
 * @param onSearchQueryChanged Callback when the search query changes.
 * @param onFilterChanged Callback when the type filter changes.
 * @param onRefresh Callback for pull-to-refresh.
 * @param onArtifactClick Callback when an artifact card is tapped.
 * @param onDismissError Callback to dismiss the error message.
 * @param onNavigateBack Callback for the back navigation button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArtifactListScreen(
    uiState: StateFlow<ArtifactListUiState>,
    filteredArtifacts: StateFlow<List<Artifact>>,
    onSearchQueryChanged: (String) -> Unit,
    onFilterChanged: (ArtifactTypeFilter) -> Unit,
    onRefresh: () -> Unit,
    onArtifactClick: (Artifact) -> Unit,
    onDismissError: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by uiState.collectAsState()
    val artifacts by filteredArtifacts.collectAsState()
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
                title = { Text(stringResource(R.string.artifacts_title)) },
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
                    // Summary counts
                    if (state.hasLoaded && state.totalCount > 0) {
                        Text(
                            text = "${state.totalCount}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                            modifier = Modifier.padding(end = 4.dp)
                        )
                    }

                    // Search toggle
                    IconButton(onClick = {
                        isSearchVisible = !isSearchVisible
                        if (!isSearchVisible) {
                            onSearchQueryChanged("")
                        }
                    }) {
                        Icon(
                            imageVector = if (isSearchVisible) Icons.Filled.SearchOff else Icons.Filled.Search,
                            contentDescription = stringResource(R.string.artifacts_search)
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
                ArtifactSearchBar(
                    query = state.searchQuery,
                    onQueryChanged = onSearchQueryChanged,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }

            // Filter chips
            ArtifactFilterChipRow(
                selectedFilter = state.typeFilter,
                onFilterSelected = onFilterChanged,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
            )

            // Content
            when {
                state.isLoading && !state.hasLoaded -> {
                    ArtifactLoadingState()
                }
                state.hasLoaded && artifacts.isEmpty() -> {
                    ArtifactEmptyState(
                        hasFilters = state.searchQuery.isNotBlank() ||
                            state.typeFilter != ArtifactTypeFilter.ALL
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(
                            horizontal = 16.dp,
                            vertical = 8.dp
                        ),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(
                            items = artifacts,
                            key = { it.id }
                        ) { artifact ->
                            ArtifactCard(
                                artifact = artifact,
                                onClick = { onArtifactClick(artifact) }
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Search bar for filtering artifacts by title or filename.
 */
@Composable
private fun ArtifactSearchBar(
    query: String,
    onQueryChanged: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    TextField(
        value = query,
        onValueChange = onQueryChanged,
        modifier = modifier,
        placeholder = { Text(stringResource(R.string.artifacts_search_placeholder)) },
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
 * Horizontal row of filter chips for artifact type filtering.
 */
@Composable
private fun ArtifactFilterChipRow(
    selectedFilter: ArtifactTypeFilter,
    onFilterSelected: (ArtifactTypeFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        ArtifactTypeFilter.entries.forEach { filter ->
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
 * Card composable displaying an artifact summary in the artifacts list.
 *
 * Shows the artifact type icon, title, language badge, and line count.
 *
 * @param artifact The artifact data to display.
 * @param onClick Callback when the card is tapped.
 * @param modifier Modifier for customizing the card layout.
 */
@Composable
fun ArtifactCard(
    artifact: Artifact,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Type icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(artifactTypeColor(artifact.type).copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = artifactTypeIcon(artifact.type),
                    contentDescription = artifact.type.label,
                    tint = artifactTypeColor(artifact.type),
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Artifact info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                // Title
                Text(
                    text = artifact.displayName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Language badge + line count row
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Language badge
                    val language = artifact.language
                    if (language != null && language != ArtifactLanguage.UNKNOWN) {
                        Text(
                            text = language.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    // Size
                    val formattedSize = artifact.formattedSize
                    if (formattedSize != null) {
                        Text(
                            text = formattedSize,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Line count
                    Text(
                        text = stringResource(R.string.artifacts_line_count, artifact.lineCount),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Relative timestamp
            val timestamp = artifact.updatedAt ?: artifact.createdAt
            Text(
                text = formatRelativeTime(timestamp),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Loading state displayed while artifacts are being fetched.
 */
@Composable
private fun ArtifactLoadingState(
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
                text = stringResource(R.string.artifacts_loading),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Empty state displayed when no artifacts match the current filters.
 */
@Composable
private fun ArtifactEmptyState(
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
            imageVector = Icons.Filled.InsertDriveFile,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = if (hasFilters) {
                stringResource(R.string.artifacts_no_matching)
            } else {
                stringResource(R.string.artifacts_empty)
            },
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (hasFilters) {
                stringResource(R.string.artifacts_no_matching_description)
            } else {
                stringResource(R.string.artifacts_empty_description)
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

/**
 * Returns the Material icon for the given artifact type.
 */
fun artifactTypeIcon(type: ArtifactType): ImageVector {
    return when (type) {
        ArtifactType.CODE -> Icons.Filled.Code
        ArtifactType.DOCUMENT -> Icons.Filled.Description
        ArtifactType.CONFIG -> Icons.Filled.Settings
        ArtifactType.IMAGE -> Icons.Filled.Image
    }
}

/**
 * Returns the color for the given artifact type.
 */
fun artifactTypeColor(type: ArtifactType): Color {
    return when (type) {
        ArtifactType.CODE -> Color(0xFF2196F3)     // Blue
        ArtifactType.DOCUMENT -> Color(0xFF4CAF50)  // Green
        ArtifactType.CONFIG -> Color(0xFFFF9800)     // Orange
        ArtifactType.IMAGE -> Color(0xFF9C27B0)      // Purple
    }
}

/**
 * Formats a timestamp as a relative time string.
 */
private fun formatRelativeTime(timestampMillis: Long): String {
    val now = System.currentTimeMillis()
    return DateUtils.getRelativeTimeSpanString(
        timestampMillis,
        now,
        DateUtils.MINUTE_IN_MILLIS,
        DateUtils.FORMAT_ABBREV_RELATIVE
    ).toString()
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun ArtifactCardCodePreview() {
    HappyTheme {
        ArtifactCard(
            artifact = Artifact.sampleCode,
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ArtifactCardConfigPreview() {
    HappyTheme {
        ArtifactCard(
            artifact = Artifact.sampleJson,
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ArtifactCardDocumentPreview() {
    HappyTheme {
        ArtifactCard(
            artifact = Artifact.sampleDocument,
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ArtifactEmptyStatePreview() {
    HappyTheme {
        ArtifactEmptyState(hasFilters = false)
    }
}

@Preview(showBackground = true)
@Composable
private fun ArtifactEmptyStateWithFiltersPreview() {
    HappyTheme {
        ArtifactEmptyState(hasFilters = true)
    }
}

@Preview(showBackground = true)
@Composable
private fun ArtifactFilterChipRowPreview() {
    HappyTheme {
        ArtifactFilterChipRow(
            selectedFilter = ArtifactTypeFilter.ALL,
            onFilterSelected = {}
        )
    }
}
