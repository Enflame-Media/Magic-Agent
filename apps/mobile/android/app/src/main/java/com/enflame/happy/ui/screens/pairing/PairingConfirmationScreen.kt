package com.enflame.happy.ui.screens.pairing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Key
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.PairingUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Pairing confirmation screen shown after successfully scanning a QR code.
 *
 * Displays the scanned pairing details (public key fingerprint, device name)
 * and provides options to confirm or cancel the pairing. When confirmed,
 * initiates the challenge-response authentication flow via PairingViewModel.
 *
 * Shows loading state during pairing and error state if pairing fails.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PairingConfirmationScreen(
    publicKey: String,
    deviceName: String?,
    platform: String?,
    uiStateFlow: StateFlow<PairingUiState>,
    onConfirmPairing: () -> Unit,
    onCancelPairing: () -> Unit,
    onRetry: () -> Unit
) {
    val uiState by uiStateFlow.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.pairing_title)) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                navigationIcon = {
                    IconButton(
                        onClick = onCancelPairing,
                        enabled = !uiState.isPairing
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close)
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (uiState.isPairing) {
                // Loading state
                PairingProgressContent()
            } else if (uiState.errorMessage != null) {
                // Error state
                PairingErrorContent(
                    errorMessage = uiState.errorMessage!!,
                    onRetry = onRetry,
                    onCancel = onCancelPairing
                )
            } else {
                // Default confirmation state
                PairingConfirmationContent(
                    publicKey = publicKey,
                    deviceName = deviceName,
                    platform = platform,
                    onConfirmPairing = onConfirmPairing,
                    onCancelPairing = onCancelPairing
                )
            }
        }
    }
}

/**
 * Content shown while pairing is in progress.
 */
@Composable
private fun PairingProgressContent() {
    CircularProgressIndicator(
        modifier = Modifier.size(72.dp),
        color = MaterialTheme.colorScheme.primary,
        strokeWidth = 6.dp
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = stringResource(R.string.pairing_in_progress),
        style = MaterialTheme.typography.headlineSmall,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = stringResource(R.string.pairing_in_progress_description),
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

/**
 * Content shown when pairing fails with an error.
 */
@Composable
private fun PairingErrorContent(
    errorMessage: String,
    onRetry: () -> Unit,
    onCancel: () -> Unit
) {
    Icon(
        imageVector = Icons.Default.Error,
        contentDescription = null,
        modifier = Modifier.size(72.dp),
        tint = MaterialTheme.colorScheme.error
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = stringResource(R.string.pairing_failed),
        style = MaterialTheme.typography.headlineSmall,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.error
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = errorMessage,
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )

    Spacer(modifier = Modifier.height(40.dp))

    Button(
        onClick = onRetry,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.retry))
    }

    Spacer(modifier = Modifier.height(12.dp))

    FilledTonalButton(
        onClick = onCancel,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.cancel))
    }
}

/**
 * Content shown for the initial pairing confirmation.
 */
@Composable
private fun PairingConfirmationContent(
    publicKey: String,
    deviceName: String?,
    platform: String?,
    onConfirmPairing: () -> Unit,
    onCancelPairing: () -> Unit
) {
    Icon(
        imageVector = Icons.Default.CheckCircle,
        contentDescription = null,
        modifier = Modifier.size(72.dp),
        tint = MaterialTheme.colorScheme.primary
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = stringResource(R.string.pairing_qr_scanned),
        style = MaterialTheme.typography.headlineSmall,
        textAlign = TextAlign.Center
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = stringResource(R.string.pairing_confirm_description),
        style = MaterialTheme.typography.bodyMedium,
        textAlign = TextAlign.Center,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )

    Spacer(modifier = Modifier.height(32.dp))

    // Device details card
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Device name
            if (deviceName != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Computer,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.pairing_device_name),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = buildDeviceLabel(deviceName, platform),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            // Public key fingerprint
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Key,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = stringResource(R.string.pairing_public_key),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = formatPublicKeyFingerprint(publicKey),
                        style = MaterialTheme.typography.bodySmall,
                        fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }

    Spacer(modifier = Modifier.height(40.dp))

    Button(
        onClick = onConfirmPairing,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.pairing_confirm_button))
    }

    Spacer(modifier = Modifier.height(12.dp))

    FilledTonalButton(
        onClick = onCancelPairing,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(stringResource(R.string.cancel))
    }
}

/**
 * Formats a base64 public key into a truncated fingerprint display.
 * Shows the first 8 and last 4 characters with ellipsis.
 */
private fun formatPublicKeyFingerprint(publicKey: String): String {
    return if (publicKey.length > 16) {
        "${publicKey.take(8)}...${publicKey.takeLast(4)}"
    } else {
        publicKey
    }
}

/**
 * Builds a device label combining name and platform if available.
 */
private fun buildDeviceLabel(deviceName: String, platform: String?): String {
    return if (platform != null) {
        "$deviceName ($platform)"
    } else {
        deviceName
    }
}

@Preview(showBackground = true)
@Composable
private fun PairingConfirmationPreview() {
    HappyTheme {
        PairingConfirmationScreen(
            publicKey = "dGVzdHB1YmxpY2tleXRoYXRpc2V4YWN0bHkzMmJ5dGVz",
            deviceName = "Ryan's MacBook",
            platform = "macos",
            uiStateFlow = MutableStateFlow(PairingUiState()),
            onConfirmPairing = {},
            onCancelPairing = {},
            onRetry = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PairingInProgressPreview() {
    HappyTheme {
        PairingConfirmationScreen(
            publicKey = "dGVzdHB1YmxpY2tleXRoYXRpc2V4YWN0bHkzMmJ5dGVz",
            deviceName = "Ryan's MacBook",
            platform = "macos",
            uiStateFlow = MutableStateFlow(PairingUiState(isPairing = true)),
            onConfirmPairing = {},
            onCancelPairing = {},
            onRetry = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PairingErrorPreview() {
    HappyTheme {
        PairingConfirmationScreen(
            publicKey = "dGVzdHB1YmxpY2tleXRoYXRpc2V4YWN0bHkzMmJ5dGVz",
            deviceName = "Ryan's MacBook",
            platform = "macos",
            uiStateFlow = MutableStateFlow(
                PairingUiState(errorMessage = "Network error: Connection timed out")
            ),
            onConfirmPairing = {},
            onCancelPairing = {},
            onRetry = {}
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PairingConfirmationNoDevicePreview() {
    HappyTheme {
        PairingConfirmationScreen(
            publicKey = "dGVzdHB1YmxpY2tleXRoYXRpc2V4YWN0bHkzMmJ5dGVz",
            deviceName = null,
            platform = null,
            uiStateFlow = MutableStateFlow(PairingUiState()),
            onConfirmPairing = {},
            onCancelPairing = {},
            onRetry = {}
        )
    }
}
