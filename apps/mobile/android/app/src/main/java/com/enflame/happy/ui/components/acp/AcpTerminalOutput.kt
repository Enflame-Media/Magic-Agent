package com.enflame.happy.ui.components.acp

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Displays terminal/command output with ANSI color support.
 *
 * Renders text in a dark surface with monospace font, parsing basic
 * ANSI escape sequences for colorization. Supports horizontal scrolling
 * for wide output and long-press to copy content to clipboard.
 *
 * @param content The terminal output text (may contain ANSI escape sequences).
 * @param modifier Optional modifier for the composable.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AcpTerminalOutput(
    content: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val annotatedContent = parseAnsiColors(content)
    val horizontalScrollState = rememberScrollState()

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "Terminal output. Long press to copy."
            },
        color = TERMINAL_BG,
        shape = RoundedCornerShape(8.dp),
        tonalElevation = 2.dp
    ) {
        Text(
            text = annotatedContent,
            style = MaterialTheme.typography.bodySmall,
            fontFamily = FontFamily.Monospace,
            fontSize = 12.sp,
            lineHeight = 18.sp,
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(horizontalScrollState)
                .combinedClickable(
                    onClick = {},
                    onLongClick = {
                        copyToClipboard(context, content)
                    }
                )
                .padding(12.dp)
        )
    }
}

/**
 * Parses basic ANSI escape sequences and returns an AnnotatedString
 * with appropriate colors applied.
 *
 * Supports the standard 8 foreground colors (30-37), bright colors (90-97),
 * bold (1), and reset (0).
 */
private fun parseAnsiColors(text: String): AnnotatedString {
    // Strip ANSI sequences and apply colors
    val ansiPattern = Regex("\u001B\\[(\\d+(?:;\\d+)*)m")
    val parts = mutableListOf<Pair<String, Color>>()
    var currentColor = TERMINAL_FG
    var lastEnd = 0

    ansiPattern.findAll(text).forEach { match ->
        // Add text before this escape sequence
        if (match.range.first > lastEnd) {
            parts.add(text.substring(lastEnd, match.range.first) to currentColor)
        }

        // Parse the ANSI code
        val codes = match.groupValues[1].split(";").mapNotNull { it.toIntOrNull() }
        for (code in codes) {
            currentColor = when (code) {
                0 -> TERMINAL_FG    // Reset
                1 -> currentColor   // Bold (keep color)
                30 -> ANSI_BLACK
                31 -> ANSI_RED
                32 -> ANSI_GREEN
                33 -> ANSI_YELLOW
                34 -> ANSI_BLUE
                35 -> ANSI_MAGENTA
                36 -> ANSI_CYAN
                37 -> ANSI_WHITE
                90 -> ANSI_BRIGHT_BLACK
                91 -> ANSI_BRIGHT_RED
                92 -> ANSI_BRIGHT_GREEN
                93 -> ANSI_BRIGHT_YELLOW
                94 -> ANSI_BRIGHT_BLUE
                95 -> ANSI_BRIGHT_MAGENTA
                96 -> ANSI_BRIGHT_CYAN
                97 -> ANSI_BRIGHT_WHITE
                else -> currentColor
            }
        }

        lastEnd = match.range.last + 1
    }

    // Add remaining text
    if (lastEnd < text.length) {
        parts.add(text.substring(lastEnd) to currentColor)
    }

    // If no ANSI codes found, return plain text
    if (parts.isEmpty()) {
        return buildAnnotatedString {
            withStyle(SpanStyle(color = TERMINAL_FG)) {
                append(text)
            }
        }
    }

    return buildAnnotatedString {
        parts.forEach { (segment, color) ->
            withStyle(SpanStyle(color = color)) {
                append(segment)
            }
        }
    }
}

/**
 * Copies text to the system clipboard and shows a toast notification.
 */
private fun copyToClipboard(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText("Terminal Output", text)
    clipboard.setPrimaryClip(clip)
    Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
}

// Terminal colors
private val TERMINAL_BG = Color(0xFF1E1E1E)
private val TERMINAL_FG = Color(0xFFD4D4D4)

// Standard ANSI colors (bright variants for dark background)
private val ANSI_BLACK = Color(0xFF555555)
private val ANSI_RED = Color(0xFFCD3131)
private val ANSI_GREEN = Color(0xFF0DBC79)
private val ANSI_YELLOW = Color(0xFFE5E510)
private val ANSI_BLUE = Color(0xFF2472C8)
private val ANSI_MAGENTA = Color(0xFFBC3FBC)
private val ANSI_CYAN = Color(0xFF11A8CD)
private val ANSI_WHITE = Color(0xFFE5E5E5)

// Bright ANSI colors
private val ANSI_BRIGHT_BLACK = Color(0xFF666666)
private val ANSI_BRIGHT_RED = Color(0xFFF14C4C)
private val ANSI_BRIGHT_GREEN = Color(0xFF23D18B)
private val ANSI_BRIGHT_YELLOW = Color(0xFFF5F543)
private val ANSI_BRIGHT_BLUE = Color(0xFF3B8EEA)
private val ANSI_BRIGHT_MAGENTA = Color(0xFFD670D6)
private val ANSI_BRIGHT_CYAN = Color(0xFF29B8DB)
private val ANSI_BRIGHT_WHITE = Color(0xFFF0F0F0)
