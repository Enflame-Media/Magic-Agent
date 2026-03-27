package com.enflame.happy.ui.screens.acp

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpMessage
import com.enflame.happy.domain.model.acp.AcpRole
import com.enflame.happy.domain.model.acp.AcpSessionState
import com.enflame.happy.ui.components.acp.AcpCommandPalette
import com.enflame.happy.ui.components.acp.AcpConfigPanel
import com.enflame.happy.ui.components.acp.AcpContentBlockRenderer
import com.enflame.happy.ui.components.acp.AcpModeIndicator
import com.enflame.happy.ui.components.acp.AcpPlanView
import com.enflame.happy.ui.components.acp.AcpStreamingText
import com.enflame.happy.ui.components.acp.AcpThoughtView
import com.enflame.happy.ui.components.acp.AcpToolCallView
import com.enflame.happy.ui.components.acp.AcpUsageWidget
import com.enflame.happy.ui.viewmodel.AcpSessionUiState
import com.enflame.happy.ui.viewmodel.AcpSessionViewModel

/**
 * ACP session detail screen composing all ACP components into a Scaffold.
 *
 * Displays the full ACP session with messages, thoughts, plan, tool calls,
 * usage widget, and content blocks. Provides access to the command palette
 * and config panel via the top bar menu.
 *
 * @param viewModel The ACP session ViewModel.
 * @param onNavigateBack Callback when the back button is pressed.
 */
@Composable
fun AcpSessionScreen(
    viewModel: AcpSessionViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val sessionState by viewModel.sessionState.collectAsState()

    AcpSessionContent(
        uiState = uiState,
        sessionState = sessionState,
        onNavigateBack = onNavigateBack,
        onToggleCommandPalette = viewModel::toggleCommandPalette,
        onDismissCommandPalette = viewModel::dismissCommandPalette,
        onCommandSearchQueryChanged = viewModel::onCommandSearchQueryChanged,
        onCommandSelected = { /* Execute command */ },
        onToggleConfigPanel = viewModel::toggleConfigPanel,
        onDismissConfigPanel = viewModel::dismissConfigPanel,
        onConfigFieldChanged = viewModel::updateConfigField,
        onToggleThought = viewModel::toggleThought
    )
}

/**
 * Stateless content composable for the ACP session screen.
 *
 * Separated from [AcpSessionScreen] for preview and testing purposes.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AcpSessionContent(
    uiState: AcpSessionUiState,
    sessionState: AcpSessionState?,
    onNavigateBack: () -> Unit,
    onToggleCommandPalette: () -> Unit,
    onDismissCommandPalette: () -> Unit,
    onCommandSearchQueryChanged: (String) -> Unit,
    onCommandSelected: (com.enflame.happy.domain.model.acp.AcpCommand) -> Unit,
    onToggleConfigPanel: () -> Unit,
    onDismissConfigPanel: () -> Unit,
    onConfigFieldChanged: (String, String) -> Unit,
    onToggleThought: (String) -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "ACP Session",
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        sessionState?.let { state ->
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                AcpModeIndicator(mode = state.mode)
                                if (state.isStreaming) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(12.dp),
                                        strokeWidth = 2.dp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Navigate back"
                        )
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(
                                imageVector = Icons.Default.MoreVert,
                                contentDescription = "More options"
                            )
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Command Palette") },
                                leadingIcon = {
                                    Icon(Icons.Default.Terminal, contentDescription = null)
                                },
                                onClick = {
                                    showMenu = false
                                    onToggleCommandPalette()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Configuration") },
                                leadingIcon = {
                                    Icon(Icons.Default.Settings, contentDescription = null)
                                },
                                onClick = {
                                    showMenu = false
                                    onToggleConfigPanel()
                                }
                            )
                        }
                    }
                }
            )
        }
    ) { innerPadding ->
        when {
            // Loading state
            sessionState == null -> {
                AcpLoadingContent(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                )
            }
            // Session content
            else -> {
                AcpSessionBody(
                    sessionState = sessionState,
                    onToggleThought = onToggleThought,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                )
            }
        }
    }

    // Command palette bottom sheet
    if (uiState.isCommandPaletteVisible) {
        AcpCommandPalette(
            commands = uiState.filteredCommands,
            searchQuery = uiState.commandSearchQuery,
            onSearchQueryChanged = onCommandSearchQueryChanged,
            onCommandSelected = onCommandSelected,
            onDismiss = onDismissCommandPalette
        )
    }

    // Config panel bottom sheet
    if (uiState.isConfigPanelVisible && sessionState?.config != null) {
        AcpConfigPanel(
            config = sessionState.config,
            onFieldChanged = onConfigFieldChanged,
            onDismiss = onDismissConfigPanel
        )
    }
}

/**
 * The main scrollable body of the ACP session screen.
 *
 * Composes all session components in a LazyColumn:
 * 1. Usage widget (if available)
 * 2. Plan view (if available)
 * 3. Interleaved messages, thoughts, tool calls, and content blocks
 */
@Composable
private fun AcpSessionBody(
    sessionState: AcpSessionState,
    onToggleThought: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    // Auto-scroll when new messages arrive
    val messageCount = sessionState.messages.size
    LaunchedEffect(messageCount) {
        if (messageCount > 0) {
            listState.animateScrollToItem(listState.layoutInfo.totalItemsCount - 1)
        }
    }

    LazyColumn(
        modifier = modifier,
        state = listState,
        contentPadding = PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Usage widget
        sessionState.usage?.let { usage ->
            item(key = "usage") {
                AcpUsageWidget(usage = usage)
            }
        }

        // Plan view
        sessionState.plan?.let { plan ->
            item(key = "plan-${plan.id}") {
                AcpPlanView(plan = plan)
            }
        }

        // Thoughts
        if (sessionState.thoughts.isNotEmpty()) {
            items(
                items = sessionState.thoughts,
                key = { "thought-${it.id}" }
            ) { thought ->
                AcpThoughtView(
                    thought = thought,
                    onToggle = onToggleThought
                )
            }
        }

        // Messages with their content blocks
        items(
            items = sessionState.messages,
            key = { "msg-${it.id}" }
        ) { message ->
            AcpMessageItem(message = message)
        }

        // Tool calls
        items(
            items = sessionState.toolCalls,
            key = { "tool-${it.id}" }
        ) { toolCall ->
            AcpToolCallView(toolCall = toolCall)
        }

        // Standalone content blocks (not attached to messages)
        items(
            items = sessionState.contentBlocks,
            key = { "block-${it.id}" }
        ) { block ->
            AcpContentBlockRenderer(block = block)
        }

        // Streaming indicator
        if (sessionState.isStreaming) {
            item(key = "streaming-indicator") {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Agent is working...",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * Renders a single ACP message with its inline content blocks.
 */
@Composable
private fun AcpMessageItem(
    message: AcpMessage,
    modifier: Modifier = Modifier
) {
    val roleLabel = when (message.role) {
        AcpRole.USER -> "You"
        AcpRole.ASSISTANT -> "Claude"
        AcpRole.SYSTEM -> "System"
        AcpRole.TOOL -> "Tool"
    }
    val roleColor = when (message.role) {
        AcpRole.USER -> MaterialTheme.colorScheme.primary
        AcpRole.ASSISTANT -> MaterialTheme.colorScheme.tertiary
        AcpRole.SYSTEM -> MaterialTheme.colorScheme.outline
        AcpRole.TOOL -> MaterialTheme.colorScheme.secondary
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "$roleLabel message"
            }
    ) {
        // Role label
        Text(
            text = roleLabel,
            style = MaterialTheme.typography.labelSmall,
            color = roleColor,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
        )

        // Message text content
        if (message.content.isNotBlank()) {
            AcpStreamingText(
                markdown = message.content,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }

        // Inline content blocks
        if (message.contentBlocks.isNotEmpty()) {
            Spacer(modifier = Modifier.height(4.dp))
            message.contentBlocks.forEach { block ->
                AcpContentBlockRenderer(
                    block = block,
                    modifier = Modifier.padding(vertical = 2.dp)
                )
            }
        }
    }
}

/**
 * Loading state displayed while ACP session data is being fetched.
 */
@Composable
private fun AcpLoadingContent(
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(modifier = Modifier.size(48.dp))
            Text(
                text = "Connecting to session...",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}
