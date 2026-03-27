package com.enflame.happy.ui.components.acp

import android.content.Context
import android.text.method.LinkMovementMethod
import android.util.TypedValue
import android.widget.TextView
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.viewinterop.AndroidView
import io.noties.markwon.Markwon
import io.noties.markwon.ext.strikethrough.StrikethroughPlugin
import io.noties.markwon.ext.tables.TablePlugin
import io.noties.markwon.html.HtmlPlugin
import io.noties.markwon.linkify.LinkifyPlugin
import android.graphics.Color as AndroidColor

/**
 * Renders streaming markdown text content from an ACP session.
 *
 * Uses Markwon (via AndroidView wrapping a TextView) for full markdown
 * rendering support including headings, lists, code blocks, links,
 * tables, and inline HTML. Adapts text and link colors for dark mode.
 *
 * @param markdown The raw markdown string to render.
 * @param modifier Optional modifier for the composable.
 * @param isDarkMode Whether dark mode is active. Defaults to system setting.
 */
@Composable
fun AcpStreamingText(
    markdown: String,
    modifier: Modifier = Modifier,
    isDarkMode: Boolean = isSystemInDarkTheme()
) {
    val context = LocalContext.current
    val markwon = remember(context) { createAcpMarkwon(context) }

    AndroidView(
        modifier = modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = "Agent message content"
            },
        factory = { ctx ->
            TextView(ctx).apply {
                movementMethod = LinkMovementMethod.getInstance()
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
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
            if (isDarkMode) {
                textView.setTextColor(DARK_TEXT_COLOR)
                textView.setLinkTextColor(DARK_LINK_COLOR)
            } else {
                textView.setTextColor(LIGHT_TEXT_COLOR)
                textView.setLinkTextColor(LIGHT_LINK_COLOR)
            }
            markwon.setMarkdown(textView, markdown)
        }
    )
}

/**
 * Creates a Markwon instance with ACP-appropriate plugins.
 */
private fun createAcpMarkwon(context: Context): Markwon {
    return Markwon.builder(context)
        .usePlugin(StrikethroughPlugin.create())
        .usePlugin(TablePlugin.create(context))
        .usePlugin(HtmlPlugin.create())
        .usePlugin(LinkifyPlugin.create())
        .build()
}

private val DARK_TEXT_COLOR = AndroidColor.parseColor("#E0E0E0")
private val DARK_LINK_COLOR = AndroidColor.parseColor("#82B1FF")
private val LIGHT_TEXT_COLOR = AndroidColor.parseColor("#1C1B1F")
private val LIGHT_LINK_COLOR = AndroidColor.parseColor("#1565C0")
