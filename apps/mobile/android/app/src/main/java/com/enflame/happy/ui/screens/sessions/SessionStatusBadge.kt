package com.enflame.happy.ui.screens.sessions

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.QuestionMark
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.ui.theme.HappyTheme

/**
 * Color-coded status badge for a session.
 *
 * Displays an icon inside a tinted circle indicating the session's current
 * status. Colors follow Material Design 3 conventions:
 * - Active = Green
 * - Idle = Orange
 * - Completed = Blue
 * - Disconnected/Error = Red
 * - Unknown = Gray
 */
@Composable
fun SessionStatusBadge(
    status: SessionStatus,
    modifier: Modifier = Modifier
) {
    val statusColor = status.toColor()
    val statusIcon = status.toIcon()
    val statusDescription = status.toContentDescription()

    Box(
        modifier = modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(statusColor.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = statusIcon,
            contentDescription = statusDescription,
            tint = statusColor,
            modifier = Modifier.size(20.dp)
        )
    }
}

/**
 * Maps a [SessionStatus] to its display color.
 */
private fun SessionStatus.toColor(): Color = when (this) {
    SessionStatus.ACTIVE -> Color(0xFF4CAF50) // Green
    SessionStatus.IDLE -> Color(0xFFFF9800) // Orange
    SessionStatus.COMPLETED -> Color(0xFF2196F3) // Blue
    SessionStatus.DISCONNECTED -> Color(0xFFF44336) // Red
    SessionStatus.UNKNOWN -> Color(0xFF9E9E9E) // Gray
}

/**
 * Maps a [SessionStatus] to its icon.
 */
private fun SessionStatus.toIcon(): ImageVector = when (this) {
    SessionStatus.ACTIVE -> Icons.Filled.PlayCircle
    SessionStatus.IDLE -> Icons.Filled.PauseCircle
    SessionStatus.COMPLETED -> Icons.Filled.CheckCircle
    SessionStatus.DISCONNECTED -> Icons.Filled.Error
    SessionStatus.UNKNOWN -> Icons.Filled.QuestionMark
}

/**
 * Maps a [SessionStatus] to its content description string.
 */
@Composable
private fun SessionStatus.toContentDescription(): String = when (this) {
    SessionStatus.ACTIVE -> stringResource(R.string.session_status_active)
    SessionStatus.IDLE -> stringResource(R.string.session_status_idle)
    SessionStatus.COMPLETED -> stringResource(R.string.session_status_completed)
    SessionStatus.DISCONNECTED -> stringResource(R.string.session_status_disconnected)
    SessionStatus.UNKNOWN -> stringResource(R.string.session_status_unknown)
}

/**
 * Returns a user-facing label for the status.
 */
@Composable
fun SessionStatus.toLabel(): String = when (this) {
    SessionStatus.ACTIVE -> stringResource(R.string.session_status_active)
    SessionStatus.IDLE -> stringResource(R.string.session_status_idle)
    SessionStatus.COMPLETED -> stringResource(R.string.session_status_completed)
    SessionStatus.DISCONNECTED -> stringResource(R.string.session_status_disconnected)
    SessionStatus.UNKNOWN -> stringResource(R.string.session_status_unknown)
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun SessionStatusBadgeActivePreview() {
    HappyTheme {
        SessionStatusBadge(status = SessionStatus.ACTIVE)
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionStatusBadgeIdlePreview() {
    HappyTheme {
        SessionStatusBadge(status = SessionStatus.IDLE)
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionStatusBadgeCompletedPreview() {
    HappyTheme {
        SessionStatusBadge(status = SessionStatus.COMPLETED)
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionStatusBadgeDisconnectedPreview() {
    HappyTheme {
        SessionStatusBadge(status = SessionStatus.DISCONNECTED)
    }
}

@Preview(showBackground = true)
@Composable
private fun SessionStatusBadgeUnknownPreview() {
    HappyTheme {
        SessionStatusBadge(status = SessionStatus.UNKNOWN)
    }
}
