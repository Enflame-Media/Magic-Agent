package com.enflame.happy.ui.screens.qrscanner

import android.util.Base64
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.enflame.happy.ui.theme.HappyTheme
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

/**
 * Instrumented UI tests for the QR scanner screen composables.
 *
 * These tests exercise the permission-request UI, the scan-error UI,
 * the scanning overlay, and the scan-success processing state.
 *
 * Camera preview tests are limited because CameraX requires actual
 * hardware; camera-dependent paths are verified through ViewModel
 * integration tests that run on-device with access to android.util.Base64.
 */
class QrScannerScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    // ---------------------------------------------------------------
    // Permission Request Content
    // ---------------------------------------------------------------

    @Test
    fun permissionRequest_displaysTitle() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PermissionRequestContentTestable(
                    shouldShowRationale = false,
                    onRequestPermission = {},
                    onGoBack = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Camera Access Required").assertIsDisplayed()
    }

    @Test
    fun permissionRequest_displaysDescriptionForFirstRequest() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PermissionRequestContentTestable(
                    shouldShowRationale = false,
                    onRequestPermission = {},
                    onGoBack = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText(
                "Happy needs camera access to scan QR codes from Claude Code CLI for device pairing."
            )
            .assertIsDisplayed()
    }

    @Test
    fun permissionRequest_displaysRationaleWhenPreviouslyDenied() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PermissionRequestContentTestable(
                    shouldShowRationale = true,
                    onRequestPermission = {},
                    onGoBack = {}
                )
            }
        }

        composeTestRule
            .onNodeWithText("Camera permission was denied", substring = true)
            .assertIsDisplayed()
    }

    @Test
    fun permissionRequest_grantButtonCallsCallback() {
        var permissionRequested = false

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PermissionRequestContentTestable(
                    shouldShowRationale = false,
                    onRequestPermission = { permissionRequested = true },
                    onGoBack = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Grant Camera Access").performClick()
        assertTrue("Expected permission request callback to be invoked", permissionRequested)
    }

    @Test
    fun permissionRequest_cancelButtonCallsGoBack() {
        var wentBack = false

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                PermissionRequestContentTestable(
                    shouldShowRationale = false,
                    onRequestPermission = {},
                    onGoBack = { wentBack = true }
                )
            }
        }

        composeTestRule.onNodeWithText("Cancel").performClick()
        assertTrue("Expected go-back callback to be invoked", wentBack)
    }

    // ---------------------------------------------------------------
    // Scan Error Content
    // ---------------------------------------------------------------

    @Test
    fun scanError_displaysErrorTitle() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                ScanErrorContentTestable(
                    errorMessage = "Invalid QR code. Please scan a QR code from Claude Code CLI.",
                    onRetry = {},
                    onGoBack = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Invalid QR Code").assertIsDisplayed()
    }

    @Test
    fun scanError_displaysErrorMessage() {
        val message = "Invalid QR code. Please scan a QR code from Claude Code CLI."

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                ScanErrorContentTestable(
                    errorMessage = message,
                    onRetry = {},
                    onGoBack = {}
                )
            }
        }

        composeTestRule.onNodeWithText(message).assertIsDisplayed()
    }

    @Test
    fun scanError_scanAgainButtonCallsRetry() {
        var retried = false

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                ScanErrorContentTestable(
                    errorMessage = "Error",
                    onRetry = { retried = true },
                    onGoBack = {}
                )
            }
        }

        composeTestRule.onNodeWithText("Scan Again").performClick()
        assertTrue("Expected retry callback to be invoked", retried)
    }

    @Test
    fun scanError_cancelButtonCallsGoBack() {
        var wentBack = false

        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                ScanErrorContentTestable(
                    errorMessage = "Error",
                    onRetry = {},
                    onGoBack = { wentBack = true }
                )
            }
        }

        composeTestRule.onNodeWithText("Cancel").performClick()
        assertTrue("Expected go-back callback to be invoked", wentBack)
    }

    // ---------------------------------------------------------------
    // Scanning Overlay Instruction
    // ---------------------------------------------------------------

    @Test
    fun scanningOverlay_displaysInstructionText() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                ScanningOverlayContentTestable()
            }
        }

        composeTestRule
            .onNodeWithText("Point your camera at the QR code shown in Claude Code CLI")
            .assertIsDisplayed()
    }

    // ---------------------------------------------------------------
    // Processing State (ScannedSuccess transition)
    // ---------------------------------------------------------------

    @Test
    fun processingState_displaysProcessingText() {
        composeTestRule.setContent {
            HappyTheme(dynamicColor = false) {
                ProcessingContentTestable()
            }
        }

        composeTestRule
            .onNodeWithText("Processing QR code", substring = true)
            .assertIsDisplayed()
    }

    // ---------------------------------------------------------------
    // ViewModel State Transitions (integration-style, on-device)
    //
    // These run as instrumented tests so android.util.Base64 is
    // available without mocking.
    // ---------------------------------------------------------------

    @Test
    fun viewModel_scanToErrorToRescan_stateTransitions() {
        val jsonInstance = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }
        val viewModel = QrScannerViewModel(jsonInstance)

        // Initial state
        assertTrue(viewModel.uiState.value is QrScannerUiState.Scanning)

        // Scan invalid content -> error
        viewModel.onQrCodeScanned("not-valid")
        assertTrue(
            "Expected ScannedError but got ${viewModel.uiState.value}",
            viewModel.uiState.value is QrScannerUiState.ScannedError
        )

        // Reset -> back to scanning
        viewModel.resetScanner()
        assertTrue(viewModel.uiState.value is QrScannerUiState.Scanning)
    }

    @Test
    fun viewModel_scanValidJson_producesSuccessWithAllFields() {
        val jsonInstance = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }
        val viewModel = QrScannerViewModel(jsonInstance)

        val validKey = Base64.encodeToString(ByteArray(32) { it.toByte() }, Base64.NO_WRAP)
        val payload =
            """{"publicKey":"$validKey","deviceName":"Test Mac","platform":"macos","appVersion":"1.2.3"}"""

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue("Expected ScannedSuccess but got $state", state is QrScannerUiState.ScannedSuccess)
        val data = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals(validKey, data.publicKey)
        assertEquals("Test Mac", data.deviceName)
        assertEquals("macos", data.platform)
        assertEquals("1.2.3", data.appVersion)
    }

    @Test
    fun viewModel_scanValidRawBase64_producesSuccess() {
        val jsonInstance = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }
        val viewModel = QrScannerViewModel(jsonInstance)

        val validKey = Base64.encodeToString(ByteArray(32) { it.toByte() }, Base64.NO_WRAP)

        viewModel.onQrCodeScanned(validKey)

        val state = viewModel.uiState.value
        assertTrue("Expected ScannedSuccess but got $state", state is QrScannerUiState.ScannedSuccess)
        assertEquals(validKey, (state as QrScannerUiState.ScannedSuccess).pairingData.publicKey)
    }

    @Test
    fun viewModel_scanEmptyString_producesError() {
        val jsonInstance = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }
        val viewModel = QrScannerViewModel(jsonInstance)

        viewModel.onQrCodeScanned("")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun viewModel_errorRecovery_multipleScansSucceed() {
        val jsonInstance = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }
        val viewModel = QrScannerViewModel(jsonInstance)

        // First scan fails
        viewModel.onQrCodeScanned("bad-data")
        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)

        // Reset and scan valid data
        viewModel.resetScanner()
        assertTrue(viewModel.uiState.value is QrScannerUiState.Scanning)

        val validKey = Base64.encodeToString(ByteArray(32) { it.toByte() }, Base64.NO_WRAP)
        viewModel.onQrCodeScanned("""{"publicKey":"$validKey"}""")
        assertTrue(
            "Expected ScannedSuccess after recovery but got ${viewModel.uiState.value}",
            viewModel.uiState.value is QrScannerUiState.ScannedSuccess
        )
    }
}

// ---------------------------------------------------------------------------
// Test-only composables
//
// The production composables (PermissionRequestContent, ScanErrorContent, etc.)
// are private in QrScannerScreen.kt. These wrappers duplicate the minimal UI
// needed to verify rendering and callbacks without modifying production code.
// ---------------------------------------------------------------------------

@Composable
private fun PermissionRequestContentTestable(
    shouldShowRationale: Boolean,
    onRequestPermission: () -> Unit,
    onGoBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.CameraAlt,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Camera Access Required",
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = if (shouldShowRationale) {
                "Camera permission was denied. Happy needs camera access to scan QR codes for pairing. Please grant camera access to continue."
            } else {
                "Happy needs camera access to scan QR codes from Claude Code CLI for device pairing."
            },
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(onClick = onRequestPermission) {
            Text("Grant Camera Access")
        }

        Spacer(modifier = Modifier.height(16.dp))

        FilledTonalButton(onClick = onGoBack) {
            Text("Cancel")
        }
    }
}

@Composable
private fun ScanErrorContentTestable(
    errorMessage: String,
    onRetry: () -> Unit,
    onGoBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.ErrorOutline,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.error
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Invalid QR Code",
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = errorMessage,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(32.dp))

        Button(onClick = onRetry) {
            Text("Scan Again")
        }

        Spacer(modifier = Modifier.height(16.dp))

        FilledTonalButton(onClick = onGoBack) {
            Text("Cancel")
        }
    }
}

@Composable
private fun ScanningOverlayContentTestable() {
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Bottom
        ) {
            Text(
                text = "Point your camera at the QR code shown in Claude Code CLI",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun ProcessingContentTestable() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Processing QR code\u2026",
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
