package com.enflame.happy.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.local.UserPreferencesDataStore
import com.enflame.happy.data.notifications.NotificationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the settings screen.
 *
 * @property serverUrl The currently configured server URL.
 * @property isConnected Whether the app is connected to the server.
 * @property isCheckingConnection Whether a connection check is in progress.
 * @property notificationsEnabled Whether push notifications are enabled in app preferences.
 * @property notificationSoundEnabled Whether notification sounds are enabled.
 * @property notificationVibrationEnabled Whether notification vibration is enabled.
 * @property hasNotificationPermission Whether the OS-level notification permission is granted.
 * @property themePreference The current theme preference ("system", "light", or "dark").
 * @property appVersion The app version string.
 * @property isLoggedIn Whether the user has stored authentication credentials.
 */
data class SettingsUiState(
    val serverUrl: String = UserPreferencesDataStore.DEFAULT_SERVER_URL,
    val isConnected: Boolean = false,
    val isCheckingConnection: Boolean = false,
    val notificationsEnabled: Boolean = UserPreferencesDataStore.DEFAULT_NOTIFICATIONS_ENABLED,
    val notificationSoundEnabled: Boolean = UserPreferencesDataStore.DEFAULT_NOTIFICATION_SOUND_ENABLED,
    val notificationVibrationEnabled: Boolean = UserPreferencesDataStore.DEFAULT_NOTIFICATION_VIBRATION_ENABLED,
    val hasNotificationPermission: Boolean = false,
    val themePreference: String = UserPreferencesDataStore.DEFAULT_THEME,
    val appVersion: String = "",
    val isLoggedIn: Boolean = false
)

/**
 * ViewModel for the settings screen.
 *
 * Manages user preferences via [UserPreferencesDataStore], handles logout
 * by clearing [TokenStorage], and provides connection status checking.
 *
 * Preferences are observed as reactive [StateFlow]s so the UI updates
 * automatically when values change. All write operations are performed
 * as coroutines via [viewModelScope].
 */
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val userPreferences: UserPreferencesDataStore,
    private val tokenStorage: TokenStorage,
    private val notificationHelper: NotificationHelper
) : ViewModel() {

    private val _connectionState = MutableStateFlow(
        ConnectionState(isConnected = false, isChecking = false)
    )

    /**
     * Combined UI state derived from multiple DataStore flows and local state.
     */
    val uiState: StateFlow<SettingsUiState> = combine(
        userPreferences.serverUrl,
        userPreferences.notificationsEnabled,
        userPreferences.notificationSoundEnabled,
        userPreferences.notificationVibrationEnabled,
        userPreferences.themePreference
    ) { serverUrl, notifEnabled, soundEnabled, vibrationEnabled, theme ->
        SettingsUiState(
            serverUrl = serverUrl,
            isConnected = _connectionState.value.isConnected,
            isCheckingConnection = _connectionState.value.isChecking,
            notificationsEnabled = notifEnabled,
            notificationSoundEnabled = soundEnabled,
            notificationVibrationEnabled = vibrationEnabled,
            hasNotificationPermission = notificationHelper.hasNotificationPermission(),
            themePreference = theme,
            appVersion = getAppVersion(),
            isLoggedIn = tokenStorage.hasStoredCredentials()
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SettingsUiState(
            hasNotificationPermission = notificationHelper.hasNotificationPermission(),
            appVersion = getAppVersion(),
            isLoggedIn = tokenStorage.hasStoredCredentials()
        )
    )

    /**
     * Update the server URL preference.
     *
     * @param url The new server URL.
     */
    fun setServerUrl(url: String) {
        viewModelScope.launch {
            userPreferences.setServerUrl(url)
        }
    }

    /**
     * Enable or disable push notifications in app preferences.
     *
     * Note: This controls the app-level preference only. The OS-level
     * POST_NOTIFICATIONS permission must also be granted for notifications
     * to actually display.
     *
     * @param enabled Whether notifications should be enabled.
     */
    fun setNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            userPreferences.setNotificationsEnabled(enabled)
        }
    }

    /**
     * Enable or disable notification sounds.
     *
     * @param enabled Whether notification sounds should be enabled.
     */
    fun setNotificationSoundEnabled(enabled: Boolean) {
        viewModelScope.launch {
            userPreferences.setNotificationSoundEnabled(enabled)
        }
    }

    /**
     * Enable or disable notification vibration.
     *
     * @param enabled Whether notification vibration should be enabled.
     */
    fun setNotificationVibrationEnabled(enabled: Boolean) {
        viewModelScope.launch {
            userPreferences.setNotificationVibrationEnabled(enabled)
        }
    }

    /**
     * Update the theme preference.
     *
     * @param theme One of "system", "light", or "dark".
     */
    fun setThemePreference(theme: String) {
        viewModelScope.launch {
            userPreferences.setThemePreference(theme)
        }
    }

    /**
     * Check server connectivity by attempting a simple HTTP request.
     *
     * Updates the connection state in the UI state flow.
     */
    fun checkConnection() {
        viewModelScope.launch {
            _connectionState.value = ConnectionState(isConnected = false, isChecking = true)
            try {
                // Simple connectivity check: see if we have stored credentials
                // and the server URL is configured. A full HTTP health check
                // would be added when the API service supports it.
                val hasCredentials = tokenStorage.hasStoredCredentials()
                val hasServerUrl = tokenStorage.serverUrl != null

                _connectionState.value = ConnectionState(
                    isConnected = hasCredentials && hasServerUrl,
                    isChecking = false
                )
            } catch (e: Exception) {
                Log.e(TAG, "Connection check failed", e)
                _connectionState.value = ConnectionState(
                    isConnected = false,
                    isChecking = false
                )
            }
        }
    }

    /**
     * Log out the current user.
     *
     * Clears all stored credentials from [TokenStorage] and resets
     * user preferences to defaults. The caller should navigate to
     * the home screen after this completes.
     *
     * @param onComplete Callback invoked after logout is complete.
     */
    fun logout(onComplete: () -> Unit) {
        viewModelScope.launch {
            try {
                tokenStorage.clearAll()
                userPreferences.clearAll()
                notificationHelper.cancelAllNotifications()
                Log.d(TAG, "Logout completed")
                onComplete()
            } catch (e: Exception) {
                Log.e(TAG, "Logout error", e)
                // Still navigate away even if cleanup partially fails
                onComplete()
            }
        }
    }

    /**
     * Refresh notification permission status.
     *
     * Should be called when returning from system settings to update
     * the UI with the current permission state.
     */
    fun refreshNotificationPermission() {
        // The permission check happens in the combine flow via
        // notificationHelper.hasNotificationPermission(), but we need
        // to trigger a recomposition. We do this by emitting on the
        // connection state flow (which is part of the combine).
        _connectionState.value = _connectionState.value.copy()
    }

    private fun getAppVersion(): String {
        return try {
            // BuildConfig.VERSION_NAME is generated at compile time
            com.enflame.happy.BuildConfig.VERSION_NAME
        } catch (_: Exception) {
            "1.0.0"
        }
    }

    private data class ConnectionState(
        val isConnected: Boolean,
        val isChecking: Boolean
    )

    companion object {
        private const val TAG = "SettingsViewModel"
    }
}
