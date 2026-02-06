package com.enflame.happy.ui.screens.artifacts

import android.content.Context
import android.graphics.Color as AndroidColor
import android.text.method.LinkMovementMethod
import android.util.TypedValue
import android.widget.TextView
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.enflame.happy.ui.theme.HappyTheme
import io.noties.markwon.Markwon
import io.noties.markwon.ext.strikethrough.StrikethroughPlugin
import io.noties.markwon.ext.tables.TablePlugin
import io.noties.markwon.html.HtmlPlugin
import io.noties.markwon.linkify.LinkifyPlugin

/**
 * Composable that renders markdown content using Markwon.
 *
 * Uses an [AndroidView] wrapper around a [TextView] configured with
 * the Markwon library for full markdown rendering support including:
 * - Headings (h1-h6)
 * - Bold, italic, strikethrough
 * - Ordered and unordered lists
 * - Code blocks and inline code
 * - Links (clickable)
 * - Tables
 * - HTML elements
 * - Block quotes
 *
 * Supports dark mode by adjusting text and link colors based on the
 * current system theme.
 *
 * @param markdown The raw markdown string to render.
 * @param modifier Optional modifier for the composable.
 * @param isDarkMode Whether dark mode is active. Defaults to system setting.
 */
@Composable
fun MarkdownRenderer(
    markdown: String,
    modifier: Modifier = Modifier,
    isDarkMode: Boolean = isSystemInDarkTheme()
) {
    val context = LocalContext.current
    val markwon = remember(context) { createMarkwon(context) }

    AndroidView(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        factory = { ctx ->
            TextView(ctx).apply {
                // Enable link clicking
                movementMethod = LinkMovementMethod.getInstance()

                // Text size
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)

                // Line spacing for readability
                setLineSpacing(
                    TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP,
                        4f,
                        ctx.resources.displayMetrics
                    ),
                    1f
                )
            }
        },
        update = { textView ->
            // Apply theme colors
            if (isDarkMode) {
                textView.setTextColor(DARK_MODE_TEXT_COLOR)
                textView.setLinkTextColor(DARK_MODE_LINK_COLOR)
            } else {
                textView.setTextColor(LIGHT_MODE_TEXT_COLOR)
                textView.setLinkTextColor(LIGHT_MODE_LINK_COLOR)
            }

            // Render the markdown
            markwon.setMarkdown(textView, markdown)
        }
    )
}

/**
 * Creates a Markwon instance configured with all necessary plugins.
 *
 * Plugins enabled:
 * - [StrikethroughPlugin]: ~~strikethrough~~ support
 * - [TablePlugin]: Markdown table rendering
 * - [HtmlPlugin]: Inline HTML rendering
 * - [LinkifyPlugin]: Auto-detection of URLs, emails, phone numbers
 */
private fun createMarkwon(context: Context): Markwon {
    return Markwon.builder(context)
        .usePlugin(StrikethroughPlugin.create())
        .usePlugin(TablePlugin.create(context))
        .usePlugin(HtmlPlugin.create())
        .usePlugin(LinkifyPlugin.create())
        .build()
}

// Color constants for theme-aware rendering
private val DARK_MODE_TEXT_COLOR = AndroidColor.parseColor("#E0E0E0")
private val DARK_MODE_LINK_COLOR = AndroidColor.parseColor("#82B1FF")
private val LIGHT_MODE_TEXT_COLOR = AndroidColor.parseColor("#1C1B1F")
private val LIGHT_MODE_LINK_COLOR = AndroidColor.parseColor("#1565C0")

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun MarkdownRendererLightPreview() {
    HappyTheme(darkTheme = false) {
        MarkdownRenderer(
            markdown = SAMPLE_MARKDOWN,
            isDarkMode = false
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF1C1B1F)
@Composable
private fun MarkdownRendererDarkPreview() {
    HappyTheme(darkTheme = true) {
        MarkdownRenderer(
            markdown = SAMPLE_MARKDOWN,
            isDarkMode = true
        )
    }
}

/**
 * Sample markdown text for preview purposes.
 */
private val SAMPLE_MARKDOWN = """
# Setup Guide

## Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- Kotlin 1.9.22+
- JDK 17

## Installation

1. Clone the repository
2. Open in Android Studio
3. Build and run

### Code Example

```kotlin
fun main() {
    println("Hello, World!")
}
```

**Bold text**, *italic text*, and ~~strikethrough~~.

Visit [Happy](https://example.com) for more information.

> This is a block quote with important information.

| Feature | Status |
|---------|--------|
| Image viewer | Complete |
| Markdown | Complete |
""".trimIndent()
