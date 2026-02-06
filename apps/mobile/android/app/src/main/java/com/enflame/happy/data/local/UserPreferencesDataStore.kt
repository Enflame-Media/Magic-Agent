package com.enflame.happy.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * User preferences stored in Jetpack DataStore.
 *
 * Holds non-sensitive application settings such as theme preference,
 * notification toggles, and server configuration. Sensitive data like
 * auth tokens and encryption keys are stored separately in [TokenStorage]
 * using Android Keystore encryption.
 *
 * All reads are exposed as [Flow] for reactive observation of preference
 * changes. Writes are performed via suspend functions using DataStore's
 * transactional edit API.
 */
@Singleton
class UserPreferencesDataStore @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {

    // --- Theme ---

    /**
     * Observe the current theme preference.
     * Returns one of "system", "light", or "dark".
     */
    val themePreference: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.THEME] ?: DEFAULT_THEME
    }

    /**
     * Set the theme preference.
     *
     * @param theme One of "system", "light", or "dark".
     */
    suspend fun setThemePreference(theme: String) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.THEME] = theme
        }
    }

    // --- Server URL ---

    /**
     * Observe the configured server URL.
     */
    val serverUrl: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.SERVER_URL] ?: DEFAULT_SERVER_URL
    }

    /**
     * Set the server URL for API communication.
     */
    suspend fun setServerUrl(url: String) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.SERVER_URL] = url
        }
    }

    // --- Notifications ---

    /**
     * Observe whether push notifications are enabled.
     */
    val notificationsEnabled: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.NOTIFICATIONS_ENABLED] ?: DEFAULT_NOTIFICATIONS_ENABLED
    }

    /**
     * Enable or disable push notifications.
     */
    suspend fun setNotificationsEnabled(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.NOTIFICATIONS_ENABLED] = enabled
        }
    }

    /**
     * Observe whether notification sounds are enabled.
     */
    val notificationSoundEnabled: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.NOTIFICATION_SOUND_ENABLED] ?: DEFAULT_NOTIFICATION_SOUND_ENABLED
    }

    /**
     * Enable or disable notification sounds.
     */
    suspend fun setNotificationSoundEnabled(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.NOTIFICATION_SOUND_ENABLED] = enabled
        }
    }

    /**
     * Observe whether vibration on notifications is enabled.
     */
    val notificationVibrationEnabled: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.NOTIFICATION_VIBRATION_ENABLED]
            ?: DEFAULT_NOTIFICATION_VIBRATION_ENABLED
    }

    /**
     * Enable or disable notification vibration.
     */
    suspend fun setNotificationVibrationEnabled(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.NOTIFICATION_VIBRATION_ENABLED] = enabled
        }
    }

    // --- Session Display ---

    /**
     * Observe the session sort order preference.
     * Returns one of "recent", "name", or "status".
     */
    val sessionSortOrder: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.SESSION_SORT_ORDER] ?: DEFAULT_SESSION_SORT_ORDER
    }

    /**
     * Set the session sort order preference.
     *
     * @param sortOrder One of "recent", "name", or "status".
     */
    suspend fun setSessionSortOrder(sortOrder: String) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.SESSION_SORT_ORDER] = sortOrder
        }
    }

    // --- Voice Settings ---

    /**
     * Observe the voice provider preference.
     * Returns one of "system" or "eleven_labs".
     */
    val voiceProvider: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.VOICE_PROVIDER] ?: DEFAULT_VOICE_PROVIDER
    }

    /**
     * Set the voice provider preference.
     *
     * @param provider One of "system" or "eleven_labs".
     */
    suspend fun setVoiceProvider(provider: String) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.VOICE_PROVIDER] = provider
        }
    }

    /**
     * Observe the selected ElevenLabs voice ID.
     */
    val elevenLabsVoiceId: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.ELEVEN_LABS_VOICE_ID] ?: DEFAULT_ELEVEN_LABS_VOICE_ID
    }

    /**
     * Set the selected ElevenLabs voice ID.
     */
    suspend fun setElevenLabsVoiceId(voiceId: String) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.ELEVEN_LABS_VOICE_ID] = voiceId
        }
    }

    /**
     * Observe the selected ElevenLabs voice name.
     */
    val elevenLabsVoiceName: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.ELEVEN_LABS_VOICE_NAME] ?: DEFAULT_ELEVEN_LABS_VOICE_NAME
    }

    /**
     * Set the selected ElevenLabs voice name.
     */
    suspend fun setElevenLabsVoiceName(voiceName: String) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.ELEVEN_LABS_VOICE_NAME] = voiceName
        }
    }

    /**
     * Observe the selected ElevenLabs model ID.
     */
    val elevenLabsModelId: Flow<String> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.ELEVEN_LABS_MODEL_ID] ?: DEFAULT_ELEVEN_LABS_MODEL_ID
    }

    /**
     * Set the selected ElevenLabs model ID.
     */
    suspend fun setElevenLabsModelId(modelId: String) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.ELEVEN_LABS_MODEL_ID] = modelId
        }
    }

    /**
     * Observe the system voice name preference.
     */
    val systemVoiceName: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.SYSTEM_VOICE_NAME]
    }

    /**
     * Set the system voice name.
     */
    suspend fun setSystemVoiceName(voiceName: String?) {
        dataStore.edit { preferences ->
            if (voiceName != null) {
                preferences[PreferenceKeys.SYSTEM_VOICE_NAME] = voiceName
            } else {
                preferences.remove(PreferenceKeys.SYSTEM_VOICE_NAME)
            }
        }
    }

    /**
     * Observe the voice speech rate (0.5 to 2.0).
     */
    val voiceSpeechRate: Flow<Float> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.VOICE_SPEECH_RATE] ?: DEFAULT_VOICE_SPEECH_RATE
    }

    /**
     * Set the voice speech rate.
     */
    suspend fun setVoiceSpeechRate(rate: Float) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.VOICE_SPEECH_RATE] = rate
        }
    }

    /**
     * Observe the voice volume (0.0 to 1.0).
     */
    val voiceVolume: Flow<Float> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.VOICE_VOLUME] ?: DEFAULT_VOICE_VOLUME
    }

    /**
     * Set the voice volume.
     */
    suspend fun setVoiceVolume(volume: Float) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.VOICE_VOLUME] = volume
        }
    }

    /**
     * Observe whether auto-play for assistant messages is enabled.
     */
    val voiceAutoPlay: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.VOICE_AUTO_PLAY] ?: DEFAULT_VOICE_AUTO_PLAY
    }

    /**
     * Set auto-play for assistant messages.
     */
    suspend fun setVoiceAutoPlay(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.VOICE_AUTO_PLAY] = enabled
        }
    }

    /**
     * Observe whether to skip tool outputs in speech.
     */
    val voiceSkipToolOutputs: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.VOICE_SKIP_TOOL_OUTPUTS] ?: DEFAULT_VOICE_SKIP_TOOL_OUTPUTS
    }

    /**
     * Set whether to skip tool outputs in speech.
     */
    suspend fun setVoiceSkipToolOutputs(skip: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.VOICE_SKIP_TOOL_OUTPUTS] = skip
        }
    }

    // --- Onboarding ---

    /**
     * Observe whether onboarding has been completed.
     */
    val onboardingCompleted: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferenceKeys.ONBOARDING_COMPLETED] ?: false
    }

    /**
     * Mark onboarding as completed.
     */
    suspend fun setOnboardingCompleted(completed: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferenceKeys.ONBOARDING_COMPLETED] = completed
        }
    }

    // --- Clear ---

    /**
     * Clear all user preferences, resetting to defaults.
     */
    suspend fun clearAll() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    /**
     * Preference key definitions.
     */
    private object PreferenceKeys {
        val THEME = stringPreferencesKey("theme")
        val SERVER_URL = stringPreferencesKey("server_url")
        val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
        val NOTIFICATION_SOUND_ENABLED = booleanPreferencesKey("notification_sound_enabled")
        val NOTIFICATION_VIBRATION_ENABLED = booleanPreferencesKey("notification_vibration_enabled")
        val SESSION_SORT_ORDER = stringPreferencesKey("session_sort_order")
        val ONBOARDING_COMPLETED = booleanPreferencesKey("onboarding_completed")

        // Voice settings
        val VOICE_PROVIDER = stringPreferencesKey("voice_provider")
        val ELEVEN_LABS_VOICE_ID = stringPreferencesKey("eleven_labs_voice_id")
        val ELEVEN_LABS_VOICE_NAME = stringPreferencesKey("eleven_labs_voice_name")
        val ELEVEN_LABS_MODEL_ID = stringPreferencesKey("eleven_labs_model_id")
        val SYSTEM_VOICE_NAME = stringPreferencesKey("system_voice_name")
        val VOICE_SPEECH_RATE = floatPreferencesKey("voice_speech_rate")
        val VOICE_VOLUME = floatPreferencesKey("voice_volume")
        val VOICE_AUTO_PLAY = booleanPreferencesKey("voice_auto_play")
        val VOICE_SKIP_TOOL_OUTPUTS = booleanPreferencesKey("voice_skip_tool_outputs")
    }

    companion object {
        const val DEFAULT_THEME = "system"
        const val DEFAULT_SERVER_URL = "https://api.happy.dev/"
        const val DEFAULT_NOTIFICATIONS_ENABLED = true
        const val DEFAULT_NOTIFICATION_SOUND_ENABLED = true
        const val DEFAULT_NOTIFICATION_VIBRATION_ENABLED = true
        const val DEFAULT_SESSION_SORT_ORDER = "recent"

        // Voice defaults
        const val DEFAULT_VOICE_PROVIDER = "system"
        const val DEFAULT_ELEVEN_LABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
        const val DEFAULT_ELEVEN_LABS_VOICE_NAME = "Rachel"
        const val DEFAULT_ELEVEN_LABS_MODEL_ID = "eleven_monolingual_v1"
        const val DEFAULT_VOICE_SPEECH_RATE = 1.0f
        const val DEFAULT_VOICE_VOLUME = 1.0f
        const val DEFAULT_VOICE_AUTO_PLAY = false
        const val DEFAULT_VOICE_SKIP_TOOL_OUTPUTS = true
    }
}
