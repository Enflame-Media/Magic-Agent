package com.enflame.happy.ui.screens.pairing

import android.util.Base64
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodes
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.PairingUiState
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * Instrumented UI tests for the pairing confirmation screen.
 *
 * Verifies that device details are displayed correctly after a QR code
 * has been scanned, and that the confirm/cancel buttons invoke the
 * correct callbacks. Also verifies loading and error states.
 */
class PairingConfirmationScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val testPublicKey: String by lazy {
        Base64.encodeToString(ByteArray(32) { it.toByte() }, Base64.NO_WRAP)
    }

    private val defaultUiState = MutableStateFlow(PairingUiState())

    // ---------------------------------------------------------------
    // Screen Title and Header
    // ---------------------------------------------------------------

    @Test
    fun screen_displaysConfirmPairingTitle() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Confirm Pairing").assertIsDisplayed()
    }

    @Test
    fun screen_displaysQrScannedHeading() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("QR Code Scanned").assertIsDisplayed()
    }

    @Test
    fun screen_displaysConfirmDescription() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Review the device details below", substring = true)
            .assertIsDisplayed()
    }

    // ---------------------------------------------------------------
    // Device Info Display
    // ---------------------------------------------------------------

    @Test
    fun screen_displaysDeviceNameWithPlatform() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Ryan's MacBook",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Ryan's MacBook (macos)")
            .assertIsDisplayed()
    }

    @Test
    fun screen_displaysDeviceLabel() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test PC",
                    platform = "linux",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Device").assertIsDisplayed()
    }

    @Test
    fun screen_displaysDeviceNameWithoutPlatformWhenNull() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "My Device",
                    platform = null,
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("My Device").assertIsDisplayed()
    }

    @Test
    fun screen_displaysPublicKeyLabel() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Public Key").assertIsDisplayed()
    }

    @Test
    fun screen_displaysPublicKeyFingerprint() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        // The fingerprint displays first 8 chars + "..." + last 4 chars
        val expectedFingerprint = "${testPublicKey.take(8)}...${testPublicKey.takeLast(4)}"
        composeTestRule.onNodeWithText(expectedFingerprint).assertIsDisplayed()
    }

    @Test
    fun screen_hidesDeviceRowWhenDeviceNameIsNull() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = null,
                    platform = null,
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        // "Device" label should not appear when deviceName is null
        composeTestRule.onNodeWithText("Device").assertDoesNotExist()
        // Public Key should still be visible
        composeTestRule.onNodeWithText("Public Key").assertIsDisplayed()
    }

    // ---------------------------------------------------------------
    // Confirm / Cancel Buttons
    // ---------------------------------------------------------------

    @Test
    fun screen_displaysConfirmPairingButton() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Confirm Pairing").assertIsDisplayed()
    }

    @Test
    fun screen_displaysCancelButton() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Cancel").assertIsDisplayed()
    }

    @Test
    fun confirmButton_callsOnConfirmPairing() {
        var confirmed = false

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = { confirmed = true },
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        // "Confirm Pairing" appears both as the top bar title and the button text.
        // The button is the second node matching this text.
        val nodes = composeTestRule.onAllNodes(hasText("Confirm Pairing"))
        nodes[1].performClick()

        assertTrue("Expected confirm callback to be invoked", confirmed)
    }

    @Test
    fun cancelButton_callsOnCancelPairing() {
        var cancelled = false

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = { cancelled = true },
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Cancel").performClick()
        assertTrue("Expected cancel callback to be invoked", cancelled)
    }

    // ---------------------------------------------------------------
    // Loading State
    // ---------------------------------------------------------------

    @Test
    fun screen_displaysProgressIndicatorWhenPairing() {
        val pairingState = MutableStateFlow(PairingUiState(isPairing = true))

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = pairingState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Pairing in Progress").assertIsDisplayed()
        // Confirm button should not be visible during pairing
        composeTestRule.onNodeWithText("Confirm Pairing", substring = false).assertDoesNotExist()
    }

    // ---------------------------------------------------------------
    // Error State
    // ---------------------------------------------------------------

    @Test
    fun screen_displaysErrorMessageOnFailure() {
        val errorState = MutableStateFlow(
            PairingUiState(errorMessage = "Network error: Connection refused")
        )

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = errorState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Pairing Failed").assertIsDisplayed()
        composeTestRule.onNodeWithText("Network error: Connection refused").assertIsDisplayed()
        composeTestRule.onNodeWithText("Retry").assertIsDisplayed()
    }

    @Test
    fun retryButton_callsOnRetry() {
        var retried = false
        val errorState = MutableStateFlow(
            PairingUiState(errorMessage = "Some error")
        )

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Test Mac",
                    platform = "macos",
                    uiStateFlow = errorState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = { retried = true }
                )
            }
        }

        composeTestRule.onNodeWithText("Retry").performClick()
        assertTrue("Expected retry callback to be invoked", retried)
    }

    // ---------------------------------------------------------------
    // Platform Variants
    // ---------------------------------------------------------------

    @Test
    fun screen_displaysLinuxPlatform() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Dev Server",
                    platform = "linux",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Dev Server (linux)").assertIsDisplayed()
    }

    @Test
    fun screen_displaysWindowsPlatform() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = testPublicKey,
                    deviceName = "Work PC",
                    platform = "windows",
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Work PC (windows)").assertIsDisplayed()
    }

    // ---------------------------------------------------------------
    // Short Public Key (no truncation needed)
    // ---------------------------------------------------------------

    @Test
    fun screen_displaysShortPublicKeyWithoutTruncation() {
        val shortKey = "shortkey"

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PairingConfirmationScreen(
                    publicKey = shortKey,
                    deviceName = "Test",
                    platform = null,
                    uiStateFlow = defaultUiState,
                    onConfirmPairing = {},
                    onCancelPairing = {},
                    onRetry = {}
                )
            }
        }

        // Key of 8 chars is <= 16, so no truncation
        composeTestRule.onNodeWithText(shortKey).assertIsDisplayed()
    }
}
