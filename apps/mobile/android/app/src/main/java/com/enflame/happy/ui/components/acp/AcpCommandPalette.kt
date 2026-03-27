package com.enflame.happy.ui.components.acp

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SearchBar
import androidx.compose.material3.SearchBarDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.enflame.happy.domain.model.acp.AcpCommand

/**
 * Command palette presented in a ModalBottomSheet.
 *
 * Features a SearchBar at the top for filtering commands and a LazyColumn
 * of command items grouped by category. Each command shows its name,
 * description, and optional keyboard shortcut.
 *
 * @param commands The list of commands to display (already filtered).
 * @param searchQuery The current search query text.
 * @param onSearchQueryChanged Callback when the search query changes.
 * @param onCommandSelected Callback when a command is tapped.
 * @param onDismiss Callback when the bottom sheet is dismissed.
 * @param modifier Optional modifier for the composable.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcpCommandPalette(
    commands: List<AcpCommand>,
    searchQuery: String,
    onSearchQueryChanged: (String) -> Unit,
    onCommandSelected: (AcpCommand) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier.semantics {
            contentDescription = "Command palette. ${commands.size} commands available."
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Terminal,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Command Palette",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            // Search bar
            SearchBar(
                inputField = {
                    SearchBarDefaults.InputField(
                        query = searchQuery,
                        onQueryChange = onSearchQueryChanged,
                        onSearch = {},
                        expanded = false,
                        onExpandedChange = {},
                        placeholder = {
                            Text("Search commands...")
                        }
                    )
                },
                expanded = false,
                onExpandedChange = {},
                modifier = Modifier.fillMaxWidth()
            ) {}

            Spacer(modifier = Modifier.height(8.dp))

            // Command list
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(0.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false)
                    .padding(bottom = 16.dp)
            ) {
                items(
                    items = commands,
                    key = { it.id }
                ) { command ->
                    CommandItem(
                        command = command,
                        onClick = { onCommandSelected(command) }
                    )
                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)
                    )
                }

                if (commands.isEmpty()) {
                    item {
                        Text(
                            text = if (searchQuery.isBlank()) {
                                "No commands available"
                            } else {
                                "No commands matching \"$searchQuery\""
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(vertical = 24.dp, horizontal = 16.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * A single command item in the command palette list.
 */
@Composable
private fun CommandItem(
    command: AcpCommand,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    ListItem(
        headlineContent = {
            Text(
                text = command.name,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        },
        supportingContent = command.description?.let { desc ->
            {
                Text(
                    text = desc,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        },
        leadingContent = command.category?.let { category ->
            {
                Text(
                    text = category,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        },
        trailingContent = command.shortcut?.let { shortcut ->
            {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Keyboard,
                        contentDescription = null,
                        modifier = Modifier.height(12.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = shortcut,
                        style = MaterialTheme.typography.labelSmall,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        modifier = modifier
            .clickable(onClick = onClick)
            .semantics {
                contentDescription = buildString {
                    append("Command: ${command.name}")
                    command.description?.let { append(". $it") }
                    command.shortcut?.let { append(". Shortcut: $it") }
                }
            }
    )
}
