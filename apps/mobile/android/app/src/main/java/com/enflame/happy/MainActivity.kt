package com.enflame.happy

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.enflame.happy.ui.HappyApp
import com.enflame.happy.ui.theme.HappyTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main activity for Happy Android.
 *
 * This is the single activity in the application, following the single-activity
 * architecture pattern with Jetpack Compose for navigation.
 *
 * Handles deep links for friend invites:
 * - Custom scheme: happy://invite/{code}
 * - Universal link: https://happy.app/invite/{code}
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Extract invite code from deep link if present
        val inviteCode = extractInviteCode(intent)

        setContent {
            HappyTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    HappyApp(deepLinkInviteCode = inviteCode)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Handle deep links when app is already running
        val inviteCode = extractInviteCode(intent)
        if (inviteCode != null) {
            // Re-render with the new invite code
            setContent {
                HappyTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        HappyApp(deepLinkInviteCode = inviteCode)
                    }
                }
            }
        }
    }

    /**
     * Extracts a friend invite code from a deep link intent.
     *
     * Supports two URL formats:
     * - happy://invite/{code}
     * - https://happy.app/invite/{code}
     *
     * @param intent The incoming intent to parse.
     * @return The invite code if found, null otherwise.
     */
    private fun extractInviteCode(intent: Intent?): String? {
        val uri = intent?.data ?: return null
        val pathSegments = uri.pathSegments

        return when {
            // Custom scheme: happy://invite/{code}
            uri.scheme == "happy" && uri.host == "invite" && pathSegments.isNotEmpty() -> {
                pathSegments.firstOrNull()
            }
            // Universal link: https://happy.app/invite/{code}
            uri.host == "happy.app" && pathSegments.size >= 2 &&
                pathSegments[0] == "invite" -> {
                pathSegments[1]
            }
            else -> null
        }
    }
}
