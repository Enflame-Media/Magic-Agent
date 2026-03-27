package com.enflame.happy.ui.components.acp

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.enflame.happy.domain.model.acp.AcpContentBlock
import com.enflame.happy.domain.model.acp.AcpContentBlockType

/**
 * Dispatches rendering of a content block to the appropriate component
 * based on the block's [AcpContentBlockType].
 *
 * Acts as a when()-based router for content block types:
 * - TEXT -> AcpStreamingText (Markwon markdown rendering)
 * - CODE -> AcpTerminalOutput (monospace with syntax highlighting)
 * - IMAGE -> AcpImageBlock (Coil async loading with zoom)
 * - DIFF -> AcpDiffView (AnnotatedString add/remove coloring)
 * - TERMINAL -> AcpTerminalOutput (ANSI color support)
 * - RESOURCE -> AcpResourceBlock (icon, name, URI with Intent)
 *
 * @param block The content block to render.
 * @param modifier Optional modifier for the composable.
 */
@Composable
fun AcpContentBlockRenderer(
    block: AcpContentBlock,
    modifier: Modifier = Modifier
) {
    when (block.type) {
        AcpContentBlockType.TEXT -> {
            AcpStreamingText(
                markdown = block.content,
                modifier = modifier
            )
        }

        AcpContentBlockType.CODE -> {
            AcpTerminalOutput(
                content = block.content,
                modifier = modifier
            )
        }

        AcpContentBlockType.IMAGE -> {
            block.imageUrl?.let { url ->
                AcpImageBlock(
                    imageUrl = url,
                    contentDescription = block.content.ifBlank { null },
                    modifier = modifier
                )
            }
        }

        AcpContentBlockType.DIFF -> {
            block.diff?.let { diff ->
                AcpDiffView(
                    diff = diff,
                    modifier = modifier
                )
            }
        }

        AcpContentBlockType.TERMINAL -> {
            AcpTerminalOutput(
                content = block.content,
                modifier = modifier
            )
        }

        AcpContentBlockType.RESOURCE -> {
            val resourceName = block.resourceName ?: block.content
            val resourceUri = block.resourceUri ?: return
            AcpResourceBlock(
                name = resourceName,
                uri = resourceUri,
                mimeType = block.mimeType,
                modifier = modifier
            )
        }
    }
}
