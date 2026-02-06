package com.enflame.happy.ui.screens.sessions

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.Update
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.ui.theme.HappyTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Session information header displayed at the top of the message list.
 *
 * Shows session metadata including machine name, creation time,
 * last update time, and current status.
 */
@Composable
fun SessionHeader(
    session: Session,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Machine info
            if (session.machineName != null || session.machineId != null) {
                SessionHeaderRow(
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Computer,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    },
                    label = stringResource(R.string.session_detail_machine),
                    value = session.machineName ?: session.machineId ?: ""
                )
            }

            // Created at
            SessionHeaderRow(
                icon = {
                    Icon(
                        imageVector = Icons.Default.AccessTime,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                label = stringResource(R.string.session_detail_started),
                value = formatTimestamp(session.createdAt)
            )

            // Updated at
            if (session.updatedAt != null) {
                SessionHeaderRow(
                    icon = {
                        Icon(
                            imageVector = Icons.Default.Update,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    },
                    label = stringResource(R.string.session_detail_updated),
                    value = formatTimestamp(session.updatedAt)
                )
            }
        }
    }
}

/**
 * A single row in the session header displaying a label-value pair with an icon.
 */
@Composable
private fun SessionHeaderRow(
    icon: @Composable () -> Unit,
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        icon()
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.weight(1f))
        Text(
            text = value,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * Compact status label showing the current session state with a colored dot and text.
 *
 * This is a compact variant suitable for toolbars and headers. For the full icon-in-circle
 * badge used in session list cards, see [SessionStatusBadge].
 */
@Composable
fun SessionStatusLabel(
    status: SessionStatus,
    modifier: Modifier = Modifier
) {
    val (label, color) = when (status) {
        SessionStatus.ACTIVE -> stringResource(R.string.session_status_active) to MaterialTheme.colorScheme.primary
        SessionStatus.IDLE -> stringResource(R.string.session_status_idle) to MaterialTheme.colorScheme.tertiary
        SessionStatus.DISCONNECTED -> stringResource(R.string.session_status_disconnected) to MaterialTheme.colorScheme.error
        SessionStatus.COMPLETED -> stringResource(R.string.session_status_completed) to MaterialTheme.colorScheme.outline
        SessionStatus.UNKNOWN -> stringResource(R.string.session_status_unknown) to MaterialTheme.colorScheme.outline
    }

    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        androidx.compose.foundation.Canvas(modifier = Modifier.size(8.dp)) {
            drawCircle(color = color)
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}

/**
 * Formats a Unix timestamp (milliseconds) into a human-readable date/time string.
 */
internal fun formatTimestamp(timestamp: Long): String {
    val dateFormat = SimpleDateFormat("MMM d, yyyy h:mm a", Locale.getDefault())
    return dateFormat.format(Date(timestamp))
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun SessionHeaderPreview() {
    HappyTheme {
        SessionHeader(
            session = Session(
                id = "session-1",
                title = "Refactoring auth module",
                status = SessionStatus.ACTIVE,
                createdAt = System.currentTimeMillis() - 3600000,
                updatedAt = System.currentTimeMillis(),
                machineId = "machine-123",
                machineName = "Ryan's MacBook Pro"
            ),
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionStatusLabelActivePreview() {
    HappyTheme {
        SessionStatusLabel(
            status = SessionStatus.ACTIVE,
            modifier = Modifier.padding(16.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionStatusLabelCompletedPreview() {
    HappyTheme {
        SessionStatusLabel(
            status = SessionStatus.COMPLETED,
            modifier = Modifier.padding(16.dp)
        )
    }
}
