package com.enflame.happy.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.enflame.happy.ui.navigation.HappyNavHost
import com.enflame.happy.ui.navigation.Screen
import com.enflame.happy.ui.viewmodel.FriendsViewModel

/**
 * Root composable for the Happy app.
 *
 * Sets up the navigation controller and hosts the navigation graph.
 *
 * @param deepLinkInviteCode Friend invite code from a deep link, if any.
 *   When provided, navigates to the friends screen and processes the invite.
 */
@Composable
fun HappyApp(deepLinkInviteCode: String? = null) {
    val navController = rememberNavController()

    HappyNavHost(navController = navController)

    // Handle deep link invite codes
    if (deepLinkInviteCode != null) {
        LaunchedEffect(deepLinkInviteCode) {
            // Navigate to friends screen to process the invite
            navController.navigate(Screen.Friends.route) {
                launchSingleTop = true
            }
        }
    }
}
