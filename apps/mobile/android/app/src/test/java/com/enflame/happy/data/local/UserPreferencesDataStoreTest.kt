package com.enflame.happy.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * Unit tests for UserPreferencesDataStore.
 *
 * Uses a real DataStore backed by a temporary file for accurate
 * testing of preference read/write operations.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class UserPreferencesDataStoreTest {

    @get:Rule
    val tmpFolder: TemporaryFolder = TemporaryFolder.builder().assureDeletion().build()

    private val testDispatcher = UnconfinedTestDispatcher()
    private val testScope = TestScope(testDispatcher + Job())

    private lateinit var testDataStore: DataStore<Preferences>
    private lateinit var userPreferences: UserPreferencesDataStore

    @Before
    fun setup() {
        testDataStore = PreferenceDataStoreFactory.create(
            scope = testScope,
            produceFile = { tmpFolder.newFile("test_preferences.preferences_pb") }
        )
        userPreferences = UserPreferencesDataStore(testDataStore)
    }

    @After
    fun cleanup() {
        // TestScope cleanup is handled automatically
    }

    // --- Theme ---

    @Test
    fun `themePreference returns default when not set`() = testScope.runTest {
        val result = userPreferences.themePreference.first()
        assertEquals(UserPreferencesDataStore.DEFAULT_THEME, result)
    }

    @Test
    fun `setThemePreference persists and reads back correctly`() = testScope.runTest {
        userPreferences.setThemePreference("dark")
        val result = userPreferences.themePreference.first()
        assertEquals("dark", result)
    }

    @Test
    fun `setThemePreference can be changed`() = testScope.runTest {
        userPreferences.setThemePreference("dark")
        assertEquals("dark", userPreferences.themePreference.first())

        userPreferences.setThemePreference("light")
        assertEquals("light", userPreferences.themePreference.first())
    }

    // --- Server URL ---

    @Test
    fun `serverUrl returns default when not set`() = testScope.runTest {
        val result = userPreferences.serverUrl.first()
        assertEquals(UserPreferencesDataStore.DEFAULT_SERVER_URL, result)
    }

    @Test
    fun `setServerUrl persists and reads back correctly`() = testScope.runTest {
        userPreferences.setServerUrl("https://custom.server.com/")
        val result = userPreferences.serverUrl.first()
        assertEquals("https://custom.server.com/", result)
    }

    // --- Notifications ---

    @Test
    fun `notificationsEnabled returns default when not set`() = testScope.runTest {
        val result = userPreferences.notificationsEnabled.first()
        assertEquals(UserPreferencesDataStore.DEFAULT_NOTIFICATIONS_ENABLED, result)
    }

    @Test
    fun `setNotificationsEnabled persists and reads back correctly`() = testScope.runTest {
        userPreferences.setNotificationsEnabled(false)
        val result = userPreferences.notificationsEnabled.first()
        assertEquals(false, result)
    }

    @Test
    fun `notificationSoundEnabled returns default when not set`() = testScope.runTest {
        val result = userPreferences.notificationSoundEnabled.first()
        assertEquals(UserPreferencesDataStore.DEFAULT_NOTIFICATION_SOUND_ENABLED, result)
    }

    @Test
    fun `setNotificationSoundEnabled persists and reads back correctly`() = testScope.runTest {
        userPreferences.setNotificationSoundEnabled(false)
        val result = userPreferences.notificationSoundEnabled.first()
        assertEquals(false, result)
    }

    @Test
    fun `notificationVibrationEnabled returns default when not set`() = testScope.runTest {
        val result = userPreferences.notificationVibrationEnabled.first()
        assertEquals(UserPreferencesDataStore.DEFAULT_NOTIFICATION_VIBRATION_ENABLED, result)
    }

    @Test
    fun `setNotificationVibrationEnabled persists and reads back correctly`() = testScope.runTest {
        userPreferences.setNotificationVibrationEnabled(false)
        val result = userPreferences.notificationVibrationEnabled.first()
        assertEquals(false, result)
    }

    // --- Session Display ---

    @Test
    fun `sessionSortOrder returns default when not set`() = testScope.runTest {
        val result = userPreferences.sessionSortOrder.first()
        assertEquals(UserPreferencesDataStore.DEFAULT_SESSION_SORT_ORDER, result)
    }

    @Test
    fun `setSessionSortOrder persists and reads back correctly`() = testScope.runTest {
        userPreferences.setSessionSortOrder("name")
        val result = userPreferences.sessionSortOrder.first()
        assertEquals("name", result)
    }

    // --- Onboarding ---

    @Test
    fun `onboardingCompleted returns false when not set`() = testScope.runTest {
        val result = userPreferences.onboardingCompleted.first()
        assertEquals(false, result)
    }

    @Test
    fun `setOnboardingCompleted persists and reads back correctly`() = testScope.runTest {
        userPreferences.setOnboardingCompleted(true)
        val result = userPreferences.onboardingCompleted.first()
        assertEquals(true, result)
    }

    // --- Clear ---

    @Test
    fun `clearAll resets all preferences to defaults`() = testScope.runTest {
        // Set various preferences
        userPreferences.setThemePreference("dark")
        userPreferences.setServerUrl("https://custom.com/")
        userPreferences.setNotificationsEnabled(false)
        userPreferences.setOnboardingCompleted(true)

        // Verify they were set
        assertEquals("dark", userPreferences.themePreference.first())
        assertEquals(true, userPreferences.onboardingCompleted.first())

        // Clear all
        userPreferences.clearAll()

        // Verify defaults are returned
        assertEquals(UserPreferencesDataStore.DEFAULT_THEME, userPreferences.themePreference.first())
        assertEquals(UserPreferencesDataStore.DEFAULT_SERVER_URL, userPreferences.serverUrl.first())
        assertEquals(
            UserPreferencesDataStore.DEFAULT_NOTIFICATIONS_ENABLED,
            userPreferences.notificationsEnabled.first()
        )
        assertEquals(false, userPreferences.onboardingCompleted.first())
    }
}
