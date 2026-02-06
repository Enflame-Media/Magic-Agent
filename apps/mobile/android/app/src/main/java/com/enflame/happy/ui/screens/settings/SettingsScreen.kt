package com.enflame.happy.ui.screens.settings

import android.content.Intent
import android.os.Build
import android.provider.Settings
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
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Vibration
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.util.LocaleHelper
import com.enflame.happy.ui.util.SupportedLanguage
import com.enflame.happy.ui.viewmodel.SettingsUiState
import com.enflame.happy.ui.viewmodel.SettingsViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Settings screen composable.
 *
 * Displays user-configurable settings organized into sections:
 * - **Server Connection**: Server URL, connection status
 * - **Notifications**: Enable/disable, sound, vibration
 * - **Theme**: System, light, or dark mode
 * - **About**: App version, licenses
 * - **Account**: Logout button
 *
 * @param viewModel The [SettingsViewModel] providing state and actions.
 * @param onNavigateBack Callback to navigate back to the previous screen.
 * @param onLogout Callback invoked after successful logout for navigation.
 */
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToVoiceSettings: () -> Unit = {},
    onLogout: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    SettingsScreenContent(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onServerUrlChanged = viewModel::setServerUrl,
        onNotificationsEnabledChanged = viewModel::setNotificationsEnabled,
        onNotificationSoundChanged = viewModel::setNotificationSoundEnabled,
        onNotificationVibrationChanged = viewModel::setNotificationVibrationEnabled,
        onThemeChanged = viewModel::setThemePreference,
        onCheckConnection = viewModel::checkConnection,
        onRefreshNotificationPermission = viewModel::refreshNotificationPermission,
        onNavigateToVoiceSettings = onNavigateToVoiceSettings,
        onLogout = { viewModel.logout(onLogout) }
    )
}

/**
 * Stateless settings screen content.
 *
 * Extracted from [SettingsScreen] for testability and previews.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreenContent(
    uiState: SettingsUiState,
    onNavigateBack: () -> Unit = {},
    onServerUrlChanged: (String) -> Unit = {},
    onNotificationsEnabledChanged: (Boolean) -> Unit = {},
    onNotificationSoundChanged: (Boolean) -> Unit = {},
    onNotificationVibrationChanged: (Boolean) -> Unit = {},
    onThemeChanged: (String) -> Unit = {},
    onCheckConnection: () -> Unit = {},
    onRefreshNotificationPermission: () -> Unit = {},
    onNavigateToVoiceSettings: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    var showLogoutDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current

    // Permission launcher for POST_NOTIFICATIONS (Android 13+)
    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { _ ->
        onRefreshNotificationPermission()
    }

    // Check connection on first load
    LaunchedEffect(Unit) {
        onCheckConnection()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings)) },
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
            // --- Server Connection Section ---
            SettingsSectionHeader(
                icon = Icons.Default.Cloud,
                title = stringResource(R.string.settings_server_connection)
            )

            ServerConnectionCard(
                serverUrl = uiState.serverUrl,
                isConnected = uiState.isConnected,
                isChecking = uiState.isCheckingConnection,
                onServerUrlChanged = onServerUrlChanged,
                onCheckConnection = onCheckConnection
            )

            // --- Notifications Section ---
            SettingsSectionHeader(
                icon = Icons.Default.Notifications,
                title = stringResource(R.string.settings_notifications)
            )

            NotificationSettingsCard(
                notificationsEnabled = uiState.notificationsEnabled,
                soundEnabled = uiState.notificationSoundEnabled,
                vibrationEnabled = uiState.notificationVibrationEnabled,
                hasPermission = uiState.hasNotificationPermission,
                onNotificationsEnabledChanged = onNotificationsEnabledChanged,
                onSoundChanged = onNotificationSoundChanged,
                onVibrationChanged = onNotificationVibrationChanged,
                onRequestPermission = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        notificationPermissionLauncher.launch(
                            android.Manifest.permission.POST_NOTIFICATIONS
                        )
                    }
                },
                onOpenSystemSettings = {
                    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    }
                    context.startActivity(intent)
                }
            )

            // --- Theme Section ---
            SettingsSectionHeader(
                icon = Icons.Default.DarkMode,
                title = stringResource(R.string.settings_theme)
            )

            ThemeSettingsCard(
                currentTheme = uiState.themePreference,
                onThemeChanged = onThemeChanged
            )

            // --- Voice Section ---
            SettingsSectionHeader(
                icon = Icons.Default.RecordVoiceOver,
                title = stringResource(R.string.voice_settings_title)
            )

            VoiceSettingsNavCard(onNavigateToVoiceSettings = onNavigateToVoiceSettings)

            // --- Language Section ---
            SettingsSectionHeader(
                icon = Icons.Default.Language,
                title = stringResource(R.string.settings_language)
            )

            LanguageSettingsCard()

            // --- About Section ---
            SettingsSectionHeader(
                icon = Icons.Default.Info,
                title = stringResource(R.string.settings_about)
            )

            AboutCard(appVersion = uiState.appVersion)

            // --- Account Section ---
            if (uiState.isLoggedIn) {
                SettingsSectionHeader(
                    icon = Icons.AutoMirrored.Filled.Logout,
                    title = stringResource(R.string.settings_account)
                )

                AccountCard(onLogoutClick = { showLogoutDialog = true })
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // Logout confirmation dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text(stringResource(R.string.settings_logout_title)) },
            text = { Text(stringResource(R.string.settings_logout_message)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    }
                ) {
                    Text(
                        stringResource(R.string.settings_logout),
                        color = MaterialTheme.colorScheme.error
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }
}

// --- Section Components ---

@Composable
private fun SettingsSectionHeader(
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

// --- Server Connection Card ---

@Composable
private fun ServerConnectionCard(
    serverUrl: String,
    isConnected: Boolean,
    isChecking: Boolean,
    onServerUrlChanged: (String) -> Unit,
    onCheckConnection: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            OutlinedTextField(
                value = serverUrl,
                onValueChange = onServerUrlChanged,
                label = { Text(stringResource(R.string.settings_server_url)) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (isChecking) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = stringResource(R.string.settings_checking_connection),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        Icon(
                            imageVector = if (isConnected) Icons.Default.CheckCircle
                            else Icons.Default.Error,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = if (isConnected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isConnected) stringResource(R.string.settings_connected)
                            else stringResource(R.string.settings_not_connected),
                            style = MaterialTheme.typography.bodySmall,
                            color = if (isConnected) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.error
                        )
                    }
                }

                IconButton(onClick = onCheckConnection, enabled = !isChecking) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = stringResource(R.string.settings_check_connection)
                    )
                }
            }
        }
    }
}

// --- Notification Settings Card ---

@Composable
private fun NotificationSettingsCard(
    notificationsEnabled: Boolean,
    soundEnabled: Boolean,
    vibrationEnabled: Boolean,
    hasPermission: Boolean,
    onNotificationsEnabledChanged: (Boolean) -> Unit,
    onSoundChanged: (Boolean) -> Unit,
    onVibrationChanged: (Boolean) -> Unit,
    onRequestPermission: () -> Unit,
    onOpenSystemSettings: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Permission status for Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasPermission) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onRequestPermission)
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Notifications,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = stringResource(R.string.settings_notification_permission_required),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.error
                        )
                        Text(
                            text = stringResource(R.string.settings_tap_to_enable),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            // Enable/disable notifications
            SettingsSwitch(
                icon = Icons.Default.Notifications,
                title = stringResource(R.string.settings_enable_notifications),
                checked = notificationsEnabled,
                onCheckedChange = onNotificationsEnabledChanged
            )

            if (notificationsEnabled) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                // Sound toggle
                SettingsSwitch(
                    icon = Icons.Default.VolumeUp,
                    title = stringResource(R.string.settings_notification_sound),
                    checked = soundEnabled,
                    onCheckedChange = onSoundChanged
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                // Vibration toggle
                SettingsSwitch(
                    icon = Icons.Default.Vibration,
                    title = stringResource(R.string.settings_notification_vibration),
                    checked = vibrationEnabled,
                    onCheckedChange = onVibrationChanged
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

                // System notification settings link
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onOpenSystemSettings)
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.PhoneAndroid,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = stringResource(R.string.settings_system_notification_settings),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

// --- Theme Settings Card ---

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ThemeSettingsCard(
    currentTheme: String,
    onThemeChanged: (String) -> Unit
) {
    val themeOptions = listOf("system", "light", "dark")
    val themeLabels = listOf(
        stringResource(R.string.settings_theme_system),
        stringResource(R.string.settings_theme_light),
        stringResource(R.string.settings_theme_dark)
    )
    val themeIcons = listOf(
        Icons.Default.PhoneAndroid,
        Icons.Default.LightMode,
        Icons.Default.DarkMode
    )

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
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                themeOptions.forEachIndexed { index, option ->
                    SegmentedButton(
                        selected = currentTheme == option,
                        onClick = { onThemeChanged(option) },
                        shape = SegmentedButtonDefaults.itemShape(
                            index = index,
                            count = themeOptions.size
                        ),
                        icon = {
                            SegmentedButtonDefaults.Icon(active = currentTheme == option) {
                                Icon(
                                    imageVector = themeIcons[index],
                                    contentDescription = null,
                                    modifier = Modifier.size(SegmentedButtonDefaults.IconSize)
                                )
                            }
                        }
                    ) {
                        Text(themeLabels[index])
                    }
                }
            }
        }
    }
}

// --- About Card ---

@Composable
private fun AboutCard(appVersion: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = stringResource(R.string.settings_app_version),
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = appVersion,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            Text(
                text = stringResource(R.string.settings_licenses),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { /* Open licenses screen in the future */ }
                    .padding(vertical = 4.dp)
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            Text(
                text = stringResource(R.string.settings_copyright),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// --- Account Card ---

@Composable
private fun AccountCard(onLogoutClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onLogoutClick)
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.Logout,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = stringResource(R.string.settings_logout),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

// --- Voice Settings Navigation Card ---

@Composable
private fun VoiceSettingsNavCard(onNavigateToVoiceSettings: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onNavigateToVoiceSettings)
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.RecordVoiceOver,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.voice_settings_title),
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = stringResource(R.string.voice_settings_provider),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// --- Language Settings Card ---

@Composable
private fun LanguageSettingsCard() {
    val context = LocalContext.current
    var showLanguagePicker by remember { mutableStateOf(false) }
    val currentTag = remember { LocaleHelper.getSelectedLocaleTag(context) }
    var selectedTag by remember { mutableStateOf(currentTag) }

    val currentLanguageName = selectedTag?.let { tag ->
        SupportedLanguage.fromTag(tag)?.nativeDisplayName ?: tag
    } ?: stringResource(R.string.settings_language_system)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { showLanguagePicker = true }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Language,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.settings_language),
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = stringResource(R.string.settings_language_current, currentLanguageName),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }

    if (showLanguagePicker) {
        AlertDialog(
            onDismissRequest = { showLanguagePicker = false },
            title = { Text(stringResource(R.string.settings_language)) },
            text = {
                Column {
                    // System default option
                    LanguageOptionRow(
                        name = stringResource(R.string.settings_language_system),
                        isSelected = selectedTag == null,
                        onClick = {
                            selectedTag = null
                            LocaleHelper.setAppLocale(null)
                            showLanguagePicker = false
                        }
                    )
                    HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp))

                    // All supported languages
                    LocaleHelper.getSupportedLanguages().forEach { language ->
                        LanguageOptionRow(
                            name = language.nativeDisplayName,
                            isSelected = selectedTag == language.tag,
                            onClick = {
                                selectedTag = language.tag
                                LocaleHelper.setAppLocale(language.tag)
                                showLanguagePicker = false
                            }
                        )
                        HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLanguagePicker = false }) {
                    Text(stringResource(R.string.cancel))
                }
            }
        )
    }
}

@Composable
private fun LanguageOptionRow(
    name: String,
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
        Text(
            text = name,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f)
        )
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// --- Reusable Switch Row ---

@Composable
private fun SettingsSwitch(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

// --- Preview ---

@Preview(showBackground = true)
@Composable
private fun SettingsScreenPreview() {
    HappyTheme {
        SettingsScreenContent(
            uiState = SettingsUiState(
                serverUrl = "https://api.happy.dev/",
                isConnected = true,
                notificationsEnabled = true,
                notificationSoundEnabled = true,
                notificationVibrationEnabled = false,
                hasNotificationPermission = true,
                themePreference = "system",
                appVersion = "1.0.0",
                isLoggedIn = true
            )
        )
    }
}

@Preview(showBackground = true, name = "Settings - Logged Out")
@Composable
private fun SettingsScreenLoggedOutPreview() {
    HappyTheme {
        SettingsScreenContent(
            uiState = SettingsUiState(
                isConnected = false,
                hasNotificationPermission = false,
                appVersion = "1.0.0",
                isLoggedIn = false
            )
        )
    }
}
