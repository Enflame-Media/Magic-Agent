package com.enflame.happy.ui.screens.settings

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings as AndroidProviderSettings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Speaker
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.data.voice.AudioDevice
import com.enflame.happy.domain.model.ElevenLabsVoice
import com.enflame.happy.domain.model.VoicePlaybackState
import com.enflame.happy.domain.model.VoiceProvider
import com.enflame.happy.ui.components.AudioDeviceSelectionSheet
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.VoiceUiState
import com.enflame.happy.ui.viewmodel.VoiceViewModel

/**
 * Voice settings screen composable.
 *
 * Allows the user to configure text-to-speech preferences including
 * provider selection, voice picker, speech rate, volume, auto-play
 * behavior, and ElevenLabs API key management.
 *
 * @param viewModel The [VoiceViewModel] providing state and actions.
 * @param onNavigateBack Callback to navigate back to the previous screen.
 */
@Composable
fun VoiceSettingsScreen(
    viewModel: VoiceViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Bluetooth permission launcher (Android 12+ / API 31+)
    val bluetoothPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        viewModel.onBluetoothPermissionResult(granted)
    }

    VoiceSettingsScreenContent(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onProviderChanged = viewModel::setProvider,
        onElevenLabsVoiceSelected = viewModel::setElevenLabsVoice,
        onSystemVoiceSelected = viewModel::setSystemVoiceName,
        onSpeechRateChanged = viewModel::setSpeechRate,
        onVolumeChanged = viewModel::setVolume,
        onAutoPlayChanged = viewModel::setAutoPlay,
        onSkipToolOutputsChanged = viewModel::setSkipToolOutputs,
        onSaveApiKey = viewModel::saveApiKey,
        onDeleteApiKey = viewModel::deleteApiKey,
        onTestVoice = { viewModel.speak(TEST_PHRASE) },
        onStopVoice = viewModel::stop,
        onDismissError = viewModel::dismissError,
        onShowAudioDeviceSelection = {
            // Request Bluetooth permission proactively when opening device selection
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && viewModel.needsBluetoothPermission()) {
                bluetoothPermissionLauncher.launch(Manifest.permission.BLUETOOTH_CONNECT)
            }
            viewModel.showAudioDeviceSelection()
        },
        onSelectAudioDevice = viewModel::selectAudioDevice,
        onUseDefaultAudioDevice = viewModel::useDefaultAudioDevice,
        onHideAudioDeviceSelection = viewModel::hideAudioDeviceSelection,
        onRequestBluetoothPermission = {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                bluetoothPermissionLauncher.launch(Manifest.permission.BLUETOOTH_CONNECT)
            }
        },
        onOpenAppSettings = {
            val intent = Intent(AndroidProviderSettings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
            }
            context.startActivity(intent)
        }
    )
}

/**
 * Stateless voice settings screen content.
 *
 * Extracted from [VoiceSettingsScreen] for testability and previews.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceSettingsScreenContent(
    uiState: VoiceUiState,
    onNavigateBack: () -> Unit = {},
    onProviderChanged: (VoiceProvider) -> Unit = {},
    onElevenLabsVoiceSelected: (ElevenLabsVoice) -> Unit = {},
    onSystemVoiceSelected: (String?) -> Unit = {},
    onSpeechRateChanged: (Float) -> Unit = {},
    onVolumeChanged: (Float) -> Unit = {},
    onAutoPlayChanged: (Boolean) -> Unit = {},
    onSkipToolOutputsChanged: (Boolean) -> Unit = {},
    onSaveApiKey: (String) -> Unit = {},
    onDeleteApiKey: () -> Unit = {},
    onTestVoice: () -> Unit = {},
    onStopVoice: () -> Unit = {},
    onDismissError: () -> Unit = {},
    onShowAudioDeviceSelection: () -> Unit = {},
    onSelectAudioDevice: (AudioDevice) -> Unit = {},
    onUseDefaultAudioDevice: () -> Unit = {},
    onHideAudioDeviceSelection: () -> Unit = {},
    onRequestBluetoothPermission: () -> Unit = {},
    onOpenAppSettings: () -> Unit = {}
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.voice_settings_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // --- Provider Section ---
            VoiceSectionHeader(
                icon = Icons.Default.RecordVoiceOver,
                title = stringResource(R.string.voice_settings_provider)
            )

            ProviderSelectionCard(
                selectedProvider = uiState.provider,
                onProviderChanged = onProviderChanged
            )

            // --- Voice Selection Section ---
            VoiceSectionHeader(
                icon = Icons.AutoMirrored.Filled.VolumeUp,
                title = stringResource(R.string.voice_settings_voice)
            )

            if (uiState.provider == VoiceProvider.ELEVEN_LABS) {
                ElevenLabsVoiceCard(
                    selectedVoiceId = uiState.elevenLabsVoiceId,
                    voices = uiState.availableVoices,
                    onVoiceSelected = onElevenLabsVoiceSelected
                )
            } else {
                SystemVoiceCard()
            }

            // --- Playback Section ---
            VoiceSectionHeader(
                icon = Icons.Default.Speed,
                title = stringResource(R.string.voice_settings_playback)
            )

            PlaybackSettingsCard(
                speechRate = uiState.speechRate,
                volume = uiState.volume,
                onSpeechRateChanged = onSpeechRateChanged,
                onVolumeChanged = onVolumeChanged
            )

            // --- Audio Output Section (HAP-1021) ---
            VoiceSectionHeader(
                icon = Icons.Default.Speaker,
                title = stringResource(R.string.audio_output_title)
            )

            AudioOutputCard(
                selectedDeviceName = uiState.selectedAudioDeviceName,
                isBluetoothAvailable = uiState.isBluetoothAvailable,
                bluetoothPermissionDenied = uiState.bluetoothPermissionDenied,
                onSelectDevice = onShowAudioDeviceSelection,
                onRequestBluetoothPermission = onRequestBluetoothPermission,
                onOpenAppSettings = onOpenAppSettings
            )

            // --- Behavior Section ---
            VoiceSectionHeader(
                icon = Icons.Default.Settings,
                title = stringResource(R.string.voice_settings_behavior)
            )

            BehaviorCard(
                autoPlay = uiState.autoPlayAssistantMessages,
                skipToolOutputs = uiState.skipToolOutputs,
                onAutoPlayChanged = onAutoPlayChanged,
                onSkipToolOutputsChanged = onSkipToolOutputsChanged
            )

            // --- API Key Section (ElevenLabs only) ---
            if (uiState.provider == VoiceProvider.ELEVEN_LABS) {
                VoiceSectionHeader(
                    icon = Icons.Default.Key,
                    title = stringResource(R.string.voice_settings_api_key)
                )

                ApiKeyCard(
                    hasApiKey = uiState.hasApiKey,
                    onSaveApiKey = onSaveApiKey,
                    onDeleteApiKey = onDeleteApiKey
                )
            }

            // --- Test Section ---
            VoiceSectionHeader(
                icon = Icons.Default.PlayArrow,
                title = stringResource(R.string.voice_settings_test)
            )

            TestVoiceCard(
                isSpeaking = uiState.isSpeaking,
                isLoading = uiState.playbackState == VoicePlaybackState.LOADING,
                onTestVoice = onTestVoice,
                onStopVoice = onStopVoice
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // Error dialog
    if (uiState.showError && uiState.errorMessage != null) {
        AlertDialog(
            onDismissRequest = onDismissError,
            title = { Text(stringResource(R.string.error_generic)) },
            text = { Text(uiState.errorMessage) },
            confirmButton = {
                TextButton(onClick = onDismissError) {
                    Text(stringResource(R.string.ok))
                }
            }
        )
    }

    // Audio device selection bottom sheet (HAP-1021)
    if (uiState.showAudioDeviceSheet) {
        AudioDeviceSelectionSheet(
            devices = uiState.audioDevices,
            selectedDevice = uiState.selectedAudioDevice,
            onDeviceSelected = onSelectAudioDevice,
            onUseDefault = onUseDefaultAudioDevice,
            onDismiss = onHideAudioDeviceSelection
        )
    }
}

// --- Section Header ---

@Composable
private fun VoiceSectionHeader(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

// --- Provider Selection Card ---

@Composable
private fun ProviderSelectionCard(
    selectedProvider: VoiceProvider,
    onProviderChanged: (VoiceProvider) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            VoiceProvider.entries.forEach { provider ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onProviderChanged(provider) }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = provider.displayName,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Text(
                            text = provider.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (selectedProvider == provider) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = stringResource(R.string.voice_settings_selected),
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                if (provider != VoiceProvider.entries.last()) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                }
            }
        }
    }
}

// --- ElevenLabs Voice Card ---

@Composable
private fun ElevenLabsVoiceCard(
    selectedVoiceId: String,
    voices: List<ElevenLabsVoice>,
    onVoiceSelected: (ElevenLabsVoice) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            voices.forEachIndexed { index, voice ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onVoiceSelected(voice) }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = voice.name,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Text(
                            text = voice.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (selectedVoiceId == voice.id) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = stringResource(R.string.voice_settings_selected),
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                if (index < voices.size - 1) {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                }
            }
        }
    }
}

// --- System Voice Card ---

@Composable
private fun SystemVoiceCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.voice_settings_system_default),
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.voice_settings_system_description),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// --- Playback Settings Card ---

@Composable
private fun PlaybackSettingsCard(
    speechRate: Float,
    volume: Float,
    onSpeechRateChanged: (Float) -> Unit,
    onVolumeChanged: (Float) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Speech rate slider
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = stringResource(R.string.voice_settings_speed),
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = String.format("%.1fx", speechRate),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Slider(
                value = speechRate,
                onValueChange = onSpeechRateChanged,
                valueRange = 0.5f..2.0f,
                steps = 14 // 0.1 increments from 0.5 to 2.0
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Volume slider
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = stringResource(R.string.voice_settings_volume),
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = String.format("%.0f%%", volume * 100),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Slider(
                value = volume,
                onValueChange = onVolumeChanged,
                valueRange = 0.0f..1.0f,
                steps = 19 // 0.05 increments
            )
        }
    }
}

// --- Behavior Card ---

@Composable
private fun BehaviorCard(
    autoPlay: Boolean,
    skipToolOutputs: Boolean,
    onAutoPlayChanged: (Boolean) -> Unit,
    onSkipToolOutputsChanged: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.voice_settings_auto_play),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
                Switch(
                    checked = autoPlay,
                    onCheckedChange = onAutoPlayChanged
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = stringResource(R.string.voice_settings_skip_tool_outputs),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
                Switch(
                    checked = skipToolOutputs,
                    onCheckedChange = onSkipToolOutputsChanged
                )
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.voice_settings_behavior_footer),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// --- API Key Card ---

@Composable
private fun ApiKeyCard(
    hasApiKey: Boolean,
    onSaveApiKey: (String) -> Unit,
    onDeleteApiKey: () -> Unit
) {
    var apiKeyInput by remember { mutableStateOf("") }
    var showApiKeyField by remember { mutableStateOf(false) }
    var showDeleteConfirmation by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            if (hasApiKey) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Security,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = stringResource(R.string.voice_settings_api_key_configured),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    IconButton(onClick = { showDeleteConfirmation = true }) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = stringResource(R.string.voice_settings_remove_api_key),
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            } else {
                Text(
                    text = stringResource(R.string.voice_settings_api_key_required),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                if (showApiKeyField) {
                    OutlinedTextField(
                        value = apiKeyInput,
                        onValueChange = { apiKeyInput = it },
                        label = { Text(stringResource(R.string.voice_settings_api_key_placeholder)) },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = {
                            onSaveApiKey(apiKeyInput)
                            apiKeyInput = ""
                            showApiKeyField = false
                        },
                        enabled = apiKeyInput.isNotBlank(),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(stringResource(R.string.voice_settings_save_api_key))
                    }
                } else {
                    OutlinedButton(
                        onClick = { showApiKeyField = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(stringResource(R.string.voice_settings_add_api_key))
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.voice_settings_api_key_footer),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }

    // Delete confirmation dialog
    if (showDeleteConfirmation) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmation = false },
            title = { Text(stringResource(R.string.voice_settings_remove_api_key_confirm)) },
            text = { Text(stringResource(R.string.voice_settings_remove_api_key_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteConfirmation = false
                        onDeleteApiKey()
                    }
                ) {
                    Text(
                        stringResource(R.string.voice_settings_remove_api_key),
                        color = MaterialTheme.colorScheme.error
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmation = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }
}

// --- Test Voice Card ---

@Composable
private fun TestVoiceCard(
    isSpeaking: Boolean,
    isLoading: Boolean,
    onTestVoice: () -> Unit,
    onStopVoice: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isLoading) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = stringResource(R.string.voice_settings_loading),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            } else if (isSpeaking) {
                Button(
                    onClick = onStopVoice,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Default.Stop,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.voice_settings_stop))
                }
            } else {
                Button(
                    onClick = onTestVoice,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Default.PlayArrow,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(stringResource(R.string.voice_settings_test_voice))
                }
            }
        }
    }
}

// --- Audio Output Card (HAP-1021) ---

@Composable
private fun AudioOutputCard(
    selectedDeviceName: String,
    isBluetoothAvailable: Boolean,
    bluetoothPermissionDenied: Boolean,
    onSelectDevice: () -> Unit,
    onRequestBluetoothPermission: () -> Unit,
    onOpenAppSettings: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onSelectDevice)
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.audio_output_current),
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = selectedDeviceName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                if (isBluetoothAvailable) {
                    Icon(
                        imageVector = Icons.Default.Bluetooth,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedButton(
                onClick = onSelectDevice,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.Speaker,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(stringResource(R.string.audio_output_select))
            }

            // Bluetooth permission denied message (HAP-1027)
            if (bluetoothPermissionDenied && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Spacer(modifier = Modifier.height(8.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f)
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Bluetooth,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = stringResource(R.string.bluetooth_permission_title),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = stringResource(R.string.bluetooth_permission_rationale),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )

                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = onRequestBluetoothPermission,
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = stringResource(R.string.bluetooth_permission_request),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }

                            OutlinedButton(
                                onClick = onOpenAppSettings,
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    text = stringResource(R.string.bluetooth_permission_open_settings),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.audio_output_description),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private const val TEST_PHRASE = "Hello! I'm your voice assistant from Happy. How does this sound?"

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun VoiceSettingsScreenPreview() {
    HappyTheme {
        VoiceSettingsScreenContent(
            uiState = VoiceUiState(
                provider = VoiceProvider.SYSTEM,
                speechRate = 1.0f,
                volume = 1.0f,
                autoPlayAssistantMessages = false,
                skipToolOutputs = true,
                hasApiKey = false
            )
        )
    }
}

@Preview(showBackground = true, name = "Voice Settings - ElevenLabs")
@Composable
private fun VoiceSettingsElevenLabsPreview() {
    HappyTheme {
        VoiceSettingsScreenContent(
            uiState = VoiceUiState(
                provider = VoiceProvider.ELEVEN_LABS,
                elevenLabsVoiceId = "21m00Tcm4TlvDq8ikWAM",
                elevenLabsVoiceName = "Rachel",
                speechRate = 1.2f,
                volume = 0.8f,
                autoPlayAssistantMessages = true,
                skipToolOutputs = true,
                hasApiKey = true
            )
        )
    }
}
