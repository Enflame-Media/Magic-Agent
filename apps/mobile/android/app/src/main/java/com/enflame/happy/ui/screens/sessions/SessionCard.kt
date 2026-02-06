package com.enflame.happy.ui.screens.sessions

import android.text.format.DateUtils
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.Message
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.ui.theme.HappyTheme

/**
 * Card composable displaying a session summary in the sessions list.
 *
 * Shows the session title, status badge, machine name, relative timestamp,
 * and message count. Follows the iOS SessionRowView layout for feature parity.
 *
 * @param session The session data to display.
 * @param messageCount Number of messages in this session.
 * @param onClick Callback when the card is tapped.
 * @param modifier Modifier for customizing the card layout.
 */
@Composable
fun SessionCard(
    session: Session,
    messageCount: Int = 0,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status badge
            SessionStatusBadge(status = session.status)

            Spacer(modifier = Modifier.width(12.dp))

            // Session info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                // Title
                Text(
                    text = session.title?.takeIf { it.isNotBlank() }
                        ?: stringResource(R.string.session_untitled),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Machine name and timestamp row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Machine name
                    if (session.machineName != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f, fill = false)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Computer,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = session.machineName,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Relative timestamp
                    val timestamp = session.updatedAt ?: session.createdAt
                    Text(
                        text = formatRelativeTime(timestamp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                // Message count
                if (messageCount > 0) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Message,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = stringResource(R.string.session_message_count, messageCount),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

/**
 * Formats a timestamp as a relative time string (e.g., "2 min ago", "1 hour ago").
 *
 * Uses Android's [DateUtils.getRelativeTimeSpanString] for localized output.
 */
private fun formatRelativeTime(timestampMillis: Long): String {
    val now = System.currentTimeMillis()
    return DateUtils.getRelativeTimeSpanString(
        timestampMillis,
        now,
        DateUtils.MINUTE_IN_MILLIS,
        DateUtils.FORMAT_ABBREV_RELATIVE
    ).toString()
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun SessionCardActivePreview() {
    HappyTheme {
        SessionCard(
            session = Session(
                id = "1",
                title = "Fix authentication bug",
                status = SessionStatus.ACTIVE,
                createdAt = System.currentTimeMillis() - 3_600_000,
                updatedAt = System.currentTimeMillis() - 120_000,
                machineId = "macbook-pro",
                machineName = "MacBook Pro"
            ),
            messageCount = 12,
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionCardCompletedPreview() {
    HappyTheme {
        SessionCard(
            session = Session(
                id = "2",
                title = "Implement session list view",
                status = SessionStatus.COMPLETED,
                createdAt = System.currentTimeMillis() - 7_200_000,
                updatedAt = System.currentTimeMillis() - 1_800_000,
                machineId = "dev-server",
                machineName = "Dev Server"
            ),
            messageCount = 45,
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionCardUntitledPreview() {
    HappyTheme {
        SessionCard(
            session = Session(
                id = "3",
                title = null,
                status = SessionStatus.DISCONNECTED,
                createdAt = System.currentTimeMillis() - 86_400_000,
                updatedAt = System.currentTimeMillis() - 3_600_000,
                machineId = "ci-runner",
                machineName = "CI Runner"
            ),
            messageCount = 0,
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionCardIdlePreview() {
    HappyTheme {
        SessionCard(
            session = Session(
                id = "4",
                title = "Review pull request #142 with a very long title that should truncate",
                status = SessionStatus.IDLE,
                createdAt = System.currentTimeMillis() - 14_400_000,
                updatedAt = System.currentTimeMillis() - 600_000,
                machineId = "workstation",
                machineName = "Workstation"
            ),
            messageCount = 3,
            onClick = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionCardNoMachinePreview() {
    HappyTheme {
        SessionCard(
            session = Session(
                id = "5",
                title = "Session without machine name",
                status = SessionStatus.ACTIVE,
                createdAt = System.currentTimeMillis() - 300_000,
                updatedAt = System.currentTimeMillis() - 60_000,
                machineId = null,
                machineName = null
            ),
            messageCount = 7,
            onClick = {}
        )
    }
}
