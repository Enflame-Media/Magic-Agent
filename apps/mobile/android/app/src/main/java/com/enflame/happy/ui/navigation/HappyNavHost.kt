package com.enflame.happy.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.enflame.happy.ui.screens.artifacts.ArtifactDetailScreen
import com.enflame.happy.ui.screens.artifacts.ArtifactListScreen
import com.enflame.happy.ui.screens.friends.AddFriendScreen
import com.enflame.happy.ui.screens.friends.FriendProfileScreen
import com.enflame.happy.ui.screens.friends.FriendsListScreen
import com.enflame.happy.ui.screens.home.HomeScreen
import com.enflame.happy.ui.screens.pairing.PairingConfirmationScreen
import com.enflame.happy.ui.screens.purchases.PaywallScreen
import com.enflame.happy.ui.screens.purchases.SubscriptionStatusView
import com.enflame.happy.ui.screens.qrscanner.QrScannerScreen
import com.enflame.happy.ui.screens.sessions.SessionDetailScreen
import com.enflame.happy.ui.screens.sessions.SessionListScreen
import com.enflame.happy.ui.screens.settings.SettingsScreen
import com.enflame.happy.ui.screens.settings.VoiceSettingsScreen
import com.enflame.happy.ui.viewmodel.ArtifactViewModel
import com.enflame.happy.ui.viewmodel.FriendsViewModel
import com.enflame.happy.ui.viewmodel.PairingViewModel
import com.enflame.happy.ui.viewmodel.PurchaseViewModel
import com.enflame.happy.ui.viewmodel.SessionDetailViewModel
import com.enflame.happy.ui.viewmodel.SessionListViewModel
import com.enflame.happy.ui.viewmodel.SettingsViewModel
import com.enflame.happy.ui.viewmodel.VoiceViewModel
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
    data object Artifacts : Screen("artifacts/{sessionId}") {
        fun createRoute(sessionId: String) = "artifacts/$sessionId"
    }
    data object ArtifactDetail : Screen("artifact/{sessionId}/{artifactId}") {
        fun createRoute(sessionId: String, artifactId: String) = "artifact/$sessionId/$artifactId"
    }
    data object Settings : Screen("settings")
    data object VoiceSettings : Screen("voice_settings")
    data object Paywall : Screen("paywall")
    data object SubscriptionStatus : Screen("subscription_status")
    data object Friends : Screen("friends")
    data object AddFriend : Screen("add_friend")
    data object FriendProfile : Screen("friend/{friendId}") {
        fun createRoute(friendId: String) = "friend/$friendId"
    }
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
                onNavigateToFriends = {
                    navController.navigate(Screen.Friends.route)
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

            val pairingViewModel: PairingViewModel = hiltViewModel()

            PairingConfirmationScreen(
                publicKey = publicKey,
                deviceName = deviceName,
                platform = platform,
                uiStateFlow = pairingViewModel.uiState,
                onConfirmPairing = {
                    pairingViewModel.confirmPairing(publicKey) {
                        // On success, navigate back to home
                        navController.popBackStack(Screen.Home.route, inclusive = false)
                    }
                },
                onCancelPairing = {
                    navController.popBackStack(Screen.Home.route, inclusive = false)
                },
                onRetry = {
                    pairingViewModel.confirmPairing(publicKey) {
                        navController.popBackStack(Screen.Home.route, inclusive = false)
                    }
                }
            )
        }

        composable(Screen.Sessions.route) {
            val sessionListViewModel: SessionListViewModel = hiltViewModel()

            SessionListScreen(
                uiState = sessionListViewModel.uiState,
                filteredSessions = sessionListViewModel.filteredSessions,
                onSearchQueryChanged = sessionListViewModel::onSearchQueryChanged,
                onFilterChanged = sessionListViewModel::onFilterChanged,
                onRefresh = sessionListViewModel::refreshSessions,
                onSessionClick = { session ->
                    navController.navigate(Screen.SessionDetail.createRoute(session.id))
                },
                onDismissError = sessionListViewModel::dismissError,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(
            route = Screen.SessionDetail.route,
            arguments = listOf(
                navArgument("sessionId") { type = NavType.StringType }
            )
        ) {
            val sessionDetailViewModel: SessionDetailViewModel = hiltViewModel()

            SessionDetailScreen(
                viewModel = sessionDetailViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(
            route = Screen.Artifacts.route,
            arguments = listOf(
                navArgument("sessionId") { type = NavType.StringType }
            )
        ) {
            val artifactViewModel: ArtifactViewModel = hiltViewModel()

            ArtifactListScreen(
                uiState = artifactViewModel.uiState,
                filteredArtifacts = artifactViewModel.filteredArtifacts,
                onSearchQueryChanged = artifactViewModel::onSearchQueryChanged,
                onFilterChanged = artifactViewModel::onFilterChanged,
                onRefresh = artifactViewModel::refreshArtifacts,
                onArtifactClick = { artifact ->
                    navController.navigate(
                        Screen.ArtifactDetail.createRoute(
                            artifactViewModel.sessionId,
                            artifact.id
                        )
                    )
                },
                onDismissError = artifactViewModel::dismissError,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(
            route = Screen.ArtifactDetail.route,
            arguments = listOf(
                navArgument("sessionId") { type = NavType.StringType },
                navArgument("artifactId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val artifactId = backStackEntry.arguments?.getString("artifactId") ?: ""

            // Get the parent ArtifactViewModel from the artifacts route back stack entry
            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry(Screen.Artifacts.route)
            }
            val artifactViewModel: ArtifactViewModel = hiltViewModel(parentEntry)
            val artifact = artifactViewModel.findArtifact(artifactId)

            if (artifact != null) {
                ArtifactDetailScreen(
                    artifact = artifact,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }

        composable(Screen.Settings.route) {
            val settingsViewModel: SettingsViewModel = hiltViewModel()

            SettingsScreen(
                viewModel = settingsViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToVoiceSettings = {
                    navController.navigate(Screen.VoiceSettings.route)
                },
                onLogout = {
                    // After logout, navigate back to home and clear the back stack
                    navController.popBackStack(Screen.Home.route, inclusive = false)
                }
            )
        }

        composable(Screen.VoiceSettings.route) {
            val voiceViewModel: VoiceViewModel = hiltViewModel()

            VoiceSettingsScreen(
                viewModel = voiceViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Paywall.route) {
            val purchaseViewModel: PurchaseViewModel = hiltViewModel()

            PaywallScreen(
                viewModel = purchaseViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.SubscriptionStatus.route) {
            val purchaseViewModel: PurchaseViewModel = hiltViewModel()

            SubscriptionStatusView(
                viewModel = purchaseViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToPaywall = {
                    navController.navigate(Screen.Paywall.route)
                }
            )
        }

        composable(Screen.Friends.route) {
            val friendsViewModel: FriendsViewModel = hiltViewModel()

            FriendsListScreen(
                uiState = friendsViewModel.uiState,
                filteredFriends = friendsViewModel.filteredFriends,
                onSearchQueryChanged = friendsViewModel::onSearchQueryChanged,
                onFilterChanged = friendsViewModel::onFilterChanged,
                onRefresh = friendsViewModel::refreshFriends,
                onFriendClick = { friend ->
                    navController.navigate(Screen.FriendProfile.createRoute(friend.id))
                },
                onAddFriendClick = {
                    navController.navigate(Screen.AddFriend.route)
                },
                onDismissError = friendsViewModel::dismissError,
                onDismissSuccess = friendsViewModel::dismissSuccess,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.AddFriend.route) {
            // Get the parent FriendsViewModel from the friends route back stack entry
            val parentEntry = remember(it) {
                navController.getBackStackEntry(Screen.Friends.route)
            }
            val friendsViewModel: FriendsViewModel = hiltViewModel(parentEntry)

            AddFriendScreen(
                uiState = friendsViewModel.uiState,
                friendRequests = friendsViewModel.friendRequests,
                onSendRequest = friendsViewModel::sendFriendRequest,
                onAcceptRequest = friendsViewModel::acceptFriendRequest,
                onDeclineRequest = friendsViewModel::declineFriendRequest,
                onScanQrCode = {
                    navController.navigate(Screen.QrScanner.route)
                },
                onDismissError = friendsViewModel::dismissError,
                onDismissSuccess = friendsViewModel::dismissSuccess,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(
            route = Screen.FriendProfile.route,
            arguments = listOf(
                navArgument("friendId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val friendId = backStackEntry.arguments?.getString("friendId") ?: ""

            // Get the parent FriendsViewModel from the friends route back stack entry
            val parentEntry = remember(backStackEntry) {
                navController.getBackStackEntry(Screen.Friends.route)
            }
            val friendsViewModel: FriendsViewModel = hiltViewModel(parentEntry)
            val friend = friendsViewModel.findFriend(friendId)

            if (friend != null) {
                FriendProfileScreen(
                    friend = friend,
                    uiState = friendsViewModel.uiState,
                    onRemoveFriend = friendsViewModel::removeFriend,
                    onShareSession = {
                        // Share session functionality - navigates to sessions
                        navController.navigate(Screen.Sessions.route)
                    },
                    onViewSharedSessions = {
                        // View shared sessions - navigates to sessions
                        navController.navigate(Screen.Sessions.route)
                    },
                    onDismissError = friendsViewModel::dismissError,
                    onDismissSuccess = friendsViewModel::dismissSuccess,
                    onNavigateBack = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}
