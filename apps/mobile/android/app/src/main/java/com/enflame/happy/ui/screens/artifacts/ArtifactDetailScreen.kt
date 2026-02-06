package com.enflame.happy.ui.screens.artifacts

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.FormatListNumbered
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.ArtifactLanguage
import com.enflame.happy.domain.model.ArtifactType
import com.enflame.happy.ui.theme.HappyTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Artifact detail screen displaying the contents of a single artifact.
 *
 * For code and config artifacts, the content is displayed with syntax highlighting
 * using [SyntaxHighlighter]. For other types, plain monospaced text is shown.
 *
 * Features:
 * - Syntax-highlighted code display
 * - Line numbers (toggleable)
 * - Copy to clipboard button
 * - Share action
 * - File path display
 * - Language indicator
 * - Metadata header with type, language, size, and line count
 *
 * @param artifact The artifact to display.
 * @param onNavigateBack Callback for the back navigation button.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArtifactDetailScreen(
    artifact: Artifact,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    var showCopiedIcon by remember { mutableStateOf(false) }
    var showLineNumbers by rememberSaveable { mutableStateOf(true) }
    val isDarkMode = isSystemInDarkTheme()

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = artifact.displayName,
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
                            contentDescription = stringResource(R.string.close)
                        )
                    }
                },
                actions = {
                    // Toggle line numbers (only for code/config)
                    if (artifact.type == ArtifactType.CODE || artifact.type == ArtifactType.CONFIG) {
                        IconButton(onClick = { showLineNumbers = !showLineNumbers }) {
                            Icon(
                                imageVector = Icons.Filled.FormatListNumbered,
                                contentDescription = stringResource(R.string.artifacts_toggle_line_numbers),
                                tint = if (showLineNumbers) {
                                    MaterialTheme.colorScheme.onPrimaryContainer
                                } else {
                                    MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.5f)
                                }
                            )
                        }
                    }

                    // Copy button
                    IconButton(onClick = {
                        copyToClipboard(context, artifact.content)
                        showCopiedIcon = true
                        scope.launch {
                            delay(2000)
                            showCopiedIcon = false
                        }
                    }) {
                        Icon(
                            imageVector = if (showCopiedIcon) Icons.Filled.Check else Icons.Filled.ContentCopy,
                            contentDescription = stringResource(R.string.artifacts_copy)
                        )
                    }

                    // Share button
                    IconButton(onClick = {
                        shareContent(context, artifact.title, artifact.content)
                    }) {
                        Icon(
                            imageVector = Icons.Filled.Share,
                            contentDescription = stringResource(R.string.artifacts_share)
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
        ) {
            // Metadata header
            MetadataHeader(artifact = artifact)

            HorizontalDivider()

            // Content
            ArtifactContentView(
                artifact = artifact,
                showLineNumbers = showLineNumbers,
                isDarkMode = isDarkMode
            )
        }
    }
}

/**
 * Metadata header showing artifact information.
 */
@Composable
private fun MetadataHeader(
    artifact: Artifact,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Title
        Text(
            text = artifact.title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold
        )

        // File path
        if (artifact.filePath != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Folder,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = artifact.filePath,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        // Metadata row
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Type badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Icon(
                    imageVector = artifactTypeIcon(artifact.type),
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = artifact.type.label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Language badge
            val language = artifact.language
            if (language != null && language != ArtifactLanguage.UNKNOWN) {
                Text(
                    text = language.displayName,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }

            Spacer(modifier = Modifier.weight(1f))

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
}

/**
 * Displays the artifact content based on its type.
 *
 * Code and config artifacts get syntax highlighting with line numbers.
 * Documents and other types show plain monospaced text.
 */
@Composable
private fun ArtifactContentView(
    artifact: Artifact,
    showLineNumbers: Boolean,
    isDarkMode: Boolean,
    modifier: Modifier = Modifier
) {
    when (artifact.type) {
        ArtifactType.CODE, ArtifactType.CONFIG -> {
            CodeContentView(
                source = artifact.content,
                language = artifact.language ?: ArtifactLanguage.UNKNOWN,
                showLineNumbers = showLineNumbers,
                isDarkMode = isDarkMode,
                modifier = modifier
            )
        }
        ArtifactType.DOCUMENT -> {
            Text(
                text = artifact.content,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontFamily = FontFamily.Monospace
                ),
                modifier = modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(16.dp)
            )
        }
        ArtifactType.IMAGE -> {
            // Placeholder for image support
            Column(
                modifier = modifier
                    .fillMaxWidth()
                    .padding(vertical = 40.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Image,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = stringResource(R.string.artifacts_image_not_supported),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * Syntax-highlighted code view with optional line numbers.
 *
 * Displays source code with syntax highlighting via [SyntaxHighlighter]
 * and a line number gutter along the left side.
 */
@Composable
private fun CodeContentView(
    source: String,
    language: ArtifactLanguage,
    showLineNumbers: Boolean,
    isDarkMode: Boolean,
    modifier: Modifier = Modifier
) {
    val lines = source.split("\n")
    val maxDigits = lines.size.toString().length
    val lineNumberWidth = (maxDigits * 10 + 16).dp

    val codeBackground = if (isDarkMode) {
        Color(0xFF1C1E22)
    } else {
        Color(0xFFFAFAFC)
    }

    val lineNumberBackground = if (isDarkMode) {
        Color(0xFF17191D)
    } else {
        Color(0xFFF2F3F5)
    }

    val lineNumberColor = if (isDarkMode) {
        Color(0xFF666E78)
    } else {
        Color(0xFF99A1AA)
    }

    val separatorColor = if (isDarkMode) {
        Color(0xFF333840)
    } else {
        Color(0xFFE0E3E6)
    }

    val highlightedText = remember(source, language, isDarkMode) {
        SyntaxHighlighter.highlight(source, language, isDarkMode)
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(codeBackground)
    ) {
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState())
        ) {
            // Line numbers column
            if (showLineNumbers) {
                Column(
                    modifier = Modifier
                        .background(lineNumberBackground)
                        .padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.End
                ) {
                    lines.forEachIndexed { index, _ ->
                        Text(
                            text = "${index + 1}",
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                lineHeight = 20.sp
                            ),
                            color = lineNumberColor,
                            textAlign = TextAlign.End,
                            modifier = Modifier
                                .width(lineNumberWidth)
                                .padding(end = 8.dp)
                        )
                    }
                }

                // Separator line
                Box(
                    modifier = Modifier
                        .width(1.dp)
                        .height(((lines.size * 20) + 24).dp)
                        .background(separatorColor)
                )
            }

            // Code column
            Text(
                text = highlightedText,
                style = MaterialTheme.typography.bodySmall.copy(
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    lineHeight = 20.sp
                ),
                modifier = Modifier
                    .padding(horizontal = 12.dp, vertical = 12.dp)
            )
        }
    }
}

/**
 * Copies the given text to the system clipboard.
 */
private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText("Artifact content", text)
    clipboard.setPrimaryClip(clip)
}

/**
 * Shares the given text via the Android share sheet.
 */
private fun shareContent(context: Context, title: String, content: String) {
    val sendIntent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_SUBJECT, title)
        putExtra(Intent.EXTRA_TEXT, content)
        type = "text/plain"
    }
    val shareIntent = Intent.createChooser(sendIntent, null)
    context.startActivity(shareIntent)
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun ArtifactDetailCodePreview() {
    HappyTheme {
        ArtifactDetailScreen(
            artifact = Artifact.sampleCode,
            onNavigateBack = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ArtifactDetailDocumentPreview() {
    HappyTheme {
        ArtifactDetailScreen(
            artifact = Artifact.sampleDocument,
            onNavigateBack = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun ArtifactDetailConfigPreview() {
    HappyTheme {
        ArtifactDetailScreen(
            artifact = Artifact.sampleJson,
            onNavigateBack = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun MetadataHeaderPreview() {
    HappyTheme {
        MetadataHeader(artifact = Artifact.sampleCode)
    }
}
