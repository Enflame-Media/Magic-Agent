package com.enflame.happy.ui.components

import android.media.AudioDeviceInfo
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Speaker
import androidx.compose.material.icons.filled.Usb
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.data.voice.AudioDevice
import com.enflame.happy.ui.theme.HappyTheme

/**
 * Bottom sheet for selecting audio output device.
 *
 * Displays available audio output devices (speakers, Bluetooth, wired,
 * USB) and allows the user to select one for audio routing. Shows device
 * type icons and highlights the currently selected device.
 *
 * @param devices List of available audio output devices.
 * @param selectedDevice Currently selected device, or null for system default.
 * @param onDeviceSelected Callback when a device is selected.
 * @param onUseDefault Callback when "Use Default" is selected.
 * @param onDismiss Callback when the sheet is dismissed.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AudioDeviceSelectionSheet(
    devices: List<AudioDevice>,
    selectedDevice: AudioDevice?,
    onDeviceSelected: (AudioDevice) -> Unit,
    onUseDefault: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            // Title
            Text(
                text = stringResource(R.string.audio_device_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // System Default option
            AudioDeviceRow(
                icon = Icons.Default.PhoneAndroid,
                name = stringResource(R.string.audio_device_default),
                description = stringResource(R.string.audio_device_default_description),
                isSelected = selectedDevice == null,
                onClick = onUseDefault
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            if (devices.isEmpty()) {
                // No devices found
                Text(
                    text = stringResource(R.string.audio_device_no_devices),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 16.dp)
                )
            } else {
                // Device list
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    items(devices) { device ->
                        AudioDeviceRow(
                            icon = deviceIcon(device),
                            name = device.name,
                            description = deviceTypeDescription(device),
                            isSelected = selectedDevice?.id == device.id,
                            onClick = { onDeviceSelected(device) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Bluetooth permission hint
            if (devices.none { it.isBluetoothDevice }) {
                Text(
                    text = stringResource(R.string.audio_device_bluetooth_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}

/**
 * Single row for an audio device option.
 */
@Composable
private fun AudioDeviceRow(
    icon: ImageVector,
    name: String,
    description: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (isSelected) {
                MaterialTheme.colorScheme.primary
            } else {
                MaterialTheme.colorScheme.onSurfaceVariant
            },
            modifier = Modifier.size(24.dp)
        )

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = name,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isSelected) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurface
                },
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = stringResource(R.string.voice_settings_selected),
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

/**
 * Get the appropriate icon for an audio device type.
 */
private fun deviceIcon(device: AudioDevice): ImageVector {
    return when {
        device.isBluetoothDevice -> Icons.Default.Bluetooth
        device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
            device.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> Icons.Default.Headphones
        device.type == AudioDeviceInfo.TYPE_USB_DEVICE ||
            device.type == AudioDeviceInfo.TYPE_USB_HEADSET -> Icons.Default.Usb
        device.isBuildInSpeaker -> Icons.Default.Speaker
        else -> Icons.Default.Speaker
    }
}

/**
 * Get a human-readable description for an audio device type.
 */
private fun deviceTypeDescription(device: AudioDevice): String {
    return when {
        device.isBluetoothDevice -> "Bluetooth audio"
        device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired headset with microphone"
        device.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired headphones"
        device.type == AudioDeviceInfo.TYPE_USB_DEVICE -> "USB audio device"
        device.type == AudioDeviceInfo.TYPE_USB_HEADSET -> "USB headset"
        device.type == AudioDeviceInfo.TYPE_HDMI -> "HDMI audio output"
        device.isBuildInSpeaker -> "Built-in device speaker"
        else -> "Audio output"
    }
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun AudioDeviceRowPreview() {
    HappyTheme {
        Column(modifier = Modifier.padding(16.dp)) {
            AudioDeviceRow(
                icon = Icons.Default.Bluetooth,
                name = "AirPods Pro",
                description = "Bluetooth audio",
                isSelected = true,
                onClick = {}
            )
            AudioDeviceRow(
                icon = Icons.Default.Speaker,
                name = "Device Speaker",
                description = "Built-in device speaker",
                isSelected = false,
                onClick = {}
            )
        }
    }
}
