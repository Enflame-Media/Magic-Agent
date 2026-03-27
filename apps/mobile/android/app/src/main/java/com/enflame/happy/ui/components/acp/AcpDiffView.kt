package com.enflame.happy.ui.components.acp

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.enflame.happy.domain.model.acp.AcpDiff
import com.enflame.happy.domain.model.acp.AcpDiffLine
import com.enflame.happy.domain.model.acp.AcpDiffLineType

/**
 * Displays a unified diff with syntax coloring for added/removed lines.
 *
 * Uses monospace Text with AnnotatedString for line-by-line coloring:
 * - Added lines: green background
 * - Removed lines: red background
 * - Context lines: default background
 *
 * Supports horizontal scrolling for wide lines and collapse/expand
 * for large diffs via AnimatedVisibility.
 *
 * @param diff The diff data to display.
 * @param modifier Optional modifier for the composable.
 */
@Composable
fun AcpDiffView(
    diff: AcpDiff,
    modifier: Modifier = Modifier
) {
    val totalLines = diff.hunks.sumOf { it.lines.size }
    val isLargeDiff = totalLines > 20
    var isExpanded by remember { mutableStateOf(!isLargeDiff) }

    val addedCount = diff.hunks.sumOf { hunk ->
        hunk.lines.count { it.type == AcpDiffLineType.ADDED }
    }
    val removedCount = diff.hunks.sumOf { hunk ->
        hunk.lines.count { it.type == AcpDiffLineType.REMOVED }
    }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .semantics {
                contentDescription = "Diff for ${diff.filePath}. " +
                    "$addedCount additions, $removedCount removals."
            },
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
        tonalElevation = 1.dp
    ) {
        Column {
            // Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Code,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = diff.filePath,
                    style = MaterialTheme.typography.labelMedium,
                    fontFamily = FontFamily.Monospace,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f)
                )

                // Change stats
                if (addedCount > 0) {
                    Text(
                        text = "+$addedCount",
                        style = MaterialTheme.typography.labelSmall,
                        color = DIFF_ADDED_TEXT
                    )
                }
                if (removedCount > 0) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "-$removedCount",
                        style = MaterialTheme.typography.labelSmall,
                        color = DIFF_REMOVED_TEXT
                    )
                }

                if (isLargeDiff) {
                    IconButton(
                        onClick = { isExpanded = !isExpanded },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = if (isExpanded) {
                                Icons.Default.ExpandLess
                            } else {
                                Icons.Default.ExpandMore
                            },
                            contentDescription = if (isExpanded) "Collapse diff" else "Expand diff",
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Diff content
            AnimatedVisibility(
                visible = isExpanded,
                enter = expandVertically(),
                exit = shrinkVertically()
            ) {
                val horizontalScrollState = rememberScrollState()

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(horizontalScrollState)
                        .padding(bottom = 4.dp)
                ) {
                    diff.hunks.forEach { hunk ->
                        hunk.lines.forEach { line ->
                            DiffLineRow(line = line)
                        }
                    }
                }
            }

            // Collapsed summary
            if (!isExpanded && isLargeDiff) {
                Text(
                    text = "$totalLines lines. Tap to expand.",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }
    }
}

/**
 * Renders a single diff line with appropriate background color and prefix.
 */
@Composable
private fun DiffLineRow(
    line: AcpDiffLine,
    modifier: Modifier = Modifier
) {
    val backgroundColor = when (line.type) {
        AcpDiffLineType.ADDED -> DIFF_ADDED_BG
        AcpDiffLineType.REMOVED -> DIFF_REMOVED_BG
        AcpDiffLineType.CONTEXT -> Color.Transparent
    }
    val prefix = when (line.type) {
        AcpDiffLineType.ADDED -> "+"
        AcpDiffLineType.REMOVED -> "-"
        AcpDiffLineType.CONTEXT -> " "
    }
    val textColor = when (line.type) {
        AcpDiffLineType.ADDED -> DIFF_ADDED_TEXT
        AcpDiffLineType.REMOVED -> DIFF_REMOVED_TEXT
        AcpDiffLineType.CONTEXT -> MaterialTheme.colorScheme.onSurface
    }

    Text(
        text = buildAnnotatedString {
            withStyle(SpanStyle(color = textColor)) {
                append(prefix)
                append(line.content)
            }
        },
        style = MaterialTheme.typography.bodySmall,
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        modifier = modifier
            .fillMaxWidth()
            .background(backgroundColor)
            .padding(horizontal = 10.dp, vertical = 1.dp)
    )
}

// Diff colors
private val DIFF_ADDED_BG = Color(0x1A34C759)
private val DIFF_REMOVED_BG = Color(0x1AFF3B30)
private val DIFF_ADDED_TEXT = Color(0xFF34C759)
private val DIFF_REMOVED_TEXT = Color(0xFFFF3B30)
