package com.enflame.happy.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.enflame.happy.ui.screens.home.HomeScreen
import com.enflame.happy.ui.screens.pairing.PairingConfirmationScreen
import com.enflame.happy.ui.screens.qrscanner.QrScannerScreen
import java.net.URLDecoder
import java.net.URLEncoder

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
    data object PairingConfirmation : Screen(
        "pairing_confirmation/{publicKey}?deviceName={deviceName}&platform={platform}"
    ) {
        fun createRoute(
            publicKey: String,
            deviceName: String? = null,
            platform: String? = null
        ): String {
            val encodedKey = URLEncoder.encode(publicKey, "UTF-8")
            val builder = StringBuilder("pairing_confirmation/$encodedKey")
            val params = mutableListOf<String>()
            if (deviceName != null) {
                params.add("deviceName=${URLEncoder.encode(deviceName, "UTF-8")}")
            }
            if (platform != null) {
                params.add("platform=${URLEncoder.encode(platform, "UTF-8")}")
            }
            if (params.isNotEmpty()) {
                builder.append("?${params.joinToString("&")}")
            }
            return builder.toString()
        }
    }
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

        composable(Screen.QrScanner.route) {
            QrScannerScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onPairingDataScanned = { pairingData ->
                    navController.navigate(
                        Screen.PairingConfirmation.createRoute(
                            publicKey = pairingData.publicKey,
                            deviceName = pairingData.deviceName,
                            platform = pairingData.platform
                        )
                    ) {
                        // Remove the QR scanner from the back stack so pressing
                        // back on the confirmation screen returns to Home
                        popUpTo(Screen.QrScanner.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.PairingConfirmation.route,
            arguments = listOf(
                navArgument("publicKey") { type = NavType.StringType },
                navArgument("deviceName") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                },
                navArgument("platform") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) { backStackEntry ->
            val publicKey = URLDecoder.decode(
                backStackEntry.arguments?.getString("publicKey") ?: "",
                "UTF-8"
            )
            val deviceName = backStackEntry.arguments?.getString("deviceName")?.let {
                URLDecoder.decode(it, "UTF-8")
            }
            val platform = backStackEntry.arguments?.getString("platform")?.let {
                URLDecoder.decode(it, "UTF-8")
            }

            PairingConfirmationScreen(
                publicKey = publicKey,
                deviceName = deviceName,
                platform = platform,
                onConfirmPairing = {
                    // TODO: Implement actual pairing flow (HAP-962+)
                    // For now, navigate back to home after confirmation
                    navController.popBackStack(Screen.Home.route, inclusive = false)
                },
                onCancelPairing = {
                    navController.popBackStack(Screen.Home.route, inclusive = false)
                }
            )
        }

        // Additional screens will be added here as development progresses
        // composable(Screen.Sessions.route) { SessionsScreen(...) }
        // composable(Screen.SessionDetail.route) { SessionDetailScreen(...) }
        // composable(Screen.Settings.route) { SettingsScreen(...) }
    }
}
