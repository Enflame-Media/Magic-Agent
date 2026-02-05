package com.enflame.happy.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.enflame.happy.ui.screens.home.HomeScreen

/**
 * Navigation destinations for the Happy app.
 */
sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Sessions : Screen("sessions")
    data object SessionDetail : Screen("session/{sessionId}") {
        fun createRoute(sessionId: String) = "session/$sessionId"
    }
    data object Settings : Screen("settings")
    data object QrScanner : Screen("qr_scanner")
}

/**
 * Navigation host for the Happy app.
 *
 * Defines the navigation graph with all app destinations.
 */
@Composable
fun HappyNavHost(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToSessions = {
                    navController.navigate(Screen.Sessions.route)
                },
                onNavigateToSettings = {
                    navController.navigate(Screen.Settings.route)
                },
                onNavigateToQrScanner = {
                    navController.navigate(Screen.QrScanner.route)
                }
            )
        }

        // Additional screens will be added here as development progresses
        // composable(Screen.Sessions.route) { SessionsScreen(...) }
        // composable(Screen.SessionDetail.route) { SessionDetailScreen(...) }
        // composable(Screen.Settings.route) { SettingsScreen(...) }
        // composable(Screen.QrScanner.route) { QrScannerScreen(...) }
    }
}
