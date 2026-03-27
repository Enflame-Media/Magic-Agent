package com.enflame.happy.ui.components.acp

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.DataObject
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Link
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

/**
 * Displays a resource reference block with an icon, name, and URI.
 *
 * Tapping the item launches an Intent.ACTION_VIEW to open the resource
 * in an appropriate external application.
 *
 * @param name The display name of the resource.
 * @param uri The URI of the resource.
 * @param mimeType Optional MIME type to determine the icon.
 * @param modifier Optional modifier for the composable.
 */
@Composable
fun AcpResourceBlock(
    name: String,
    uri: String,
    mimeType: String? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val icon = resourceIcon(mimeType, uri)

    ListItem(
        headlineContent = {
            Text(
                text = name,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodyMedium
            )
        },
        supportingContent = {
            Text(
                text = uri,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary
            )
        },
        leadingContent = {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = MaterialTheme.colorScheme.primary
            )
        },
        trailingContent = {
            Icon(
                imageVector = Icons.Default.Link,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
            )
        },
        colors = ListItemDefaults.colors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        ),
        modifier = modifier
            .clickable {
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
                    context.startActivity(intent)
                } catch (_: Exception) {
                    // URI could not be opened
                }
            }
            .semantics {
                contentDescription = "Resource: $name. Tap to open."
            }
    )
}

/**
 * Returns an icon based on the MIME type or URI extension.
 */
private fun resourceIcon(mimeType: String?, uri: String): ImageVector {
    // Check MIME type first
    when {
        mimeType?.startsWith("image/") == true -> return Icons.Default.Image
        mimeType?.startsWith("text/html") == true -> return Icons.Default.Article
        mimeType?.contains("json") == true -> return Icons.Default.DataObject
        mimeType?.startsWith("text/") == true -> return Icons.Default.Description
    }

    // Fall back to URI extension
    val extension = uri.substringAfterLast('.', "").lowercase()
    return when (extension) {
        "png", "jpg", "jpeg", "gif", "webp", "svg" -> Icons.Default.Image
        "html", "htm" -> Icons.Default.Article
        "json", "xml", "yaml", "yml" -> Icons.Default.DataObject
        "kt", "java", "py", "js", "ts", "swift", "rs", "go" -> Icons.Default.Code
        "md", "txt", "csv" -> Icons.Default.Description
        else -> Icons.Default.InsertDriveFile
    }
}
