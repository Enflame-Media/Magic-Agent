package com.enflame.happy.ui.viewmodel

import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.local.UserPreferencesDataStore
import com.enflame.happy.data.notifications.NotificationHelper
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [SettingsViewModel].
 *
 * Tests preference read/write operations via mocked [UserPreferencesDataStore],
 * logout flow via mocked [TokenStorage], and notification permission checking
 * via mocked [NotificationHelper].
 */
@OptIn(ExperimentalCoroutinesApi::class)
class SettingsViewModelTest {

    private lateinit var viewModel: SettingsViewModel
    private lateinit var mockUserPreferences: UserPreferencesDataStore
    private lateinit var mockTokenStorage: TokenStorage
    private lateinit var mockNotificationHelper: NotificationHelper

    private val testDispatcher = StandardTestDispatcher()

    // Mutable flows to simulate DataStore behavior
    private val serverUrlFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_SERVER_URL)
    private val notificationsEnabledFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_NOTIFICATIONS_ENABLED)
    private val soundEnabledFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_NOTIFICATION_SOUND_ENABLED)
    private val vibrationEnabledFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_NOTIFICATION_VIBRATION_ENABLED)
    private val themeFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_THEME)

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        mockUserPreferences = mockk(relaxed = true)
        mockTokenStorage = mockk(relaxed = true)
        mockNotificationHelper = mockk(relaxed = true)

        // Set up DataStore flow mocks
        every { mockUserPreferences.serverUrl } returns serverUrlFlow
        every { mockUserPreferences.notificationsEnabled } returns notificationsEnabledFlow
        every { mockUserPreferences.notificationSoundEnabled } returns soundEnabledFlow
        every { mockUserPreferences.notificationVibrationEnabled } returns vibrationEnabledFlow
        every { mockUserPreferences.themePreference } returns themeFlow

        // Default permission state
        every { mockNotificationHelper.hasNotificationPermission() } returns true
        every { mockTokenStorage.hasStoredCredentials() } returns false

        viewModel = SettingsViewModel(
            mockUserPreferences,
            mockTokenStorage,
            mockNotificationHelper
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // --- Initial State ---

    @Test
    fun `initial state has default values`() = runTest {
        advanceUntilIdle()
        val state = viewModel.uiState.first()

        assertEquals(UserPreferencesDataStore.DEFAULT_SERVER_URL, state.serverUrl)
        assertEquals(UserPreferencesDataStore.DEFAULT_NOTIFICATIONS_ENABLED, state.notificationsEnabled)
        assertEquals(UserPreferencesDataStore.DEFAULT_NOTIFICATION_SOUND_ENABLED, state.notificationSoundEnabled)
        assertEquals(UserPreferencesDataStore.DEFAULT_NOTIFICATION_VIBRATION_ENABLED, state.notificationVibrationEnabled)
        assertEquals(UserPreferencesDataStore.DEFAULT_THEME, state.themePreference)
    }

    @Test
    fun `initial state reflects notification permission`() = runTest {
        every { mockNotificationHelper.hasNotificationPermission() } returns true
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.hasNotificationPermission)
    }

    @Test
    fun `initial state shows not logged in when no credentials`() = runTest {
        every { mockTokenStorage.hasStoredCredentials() } returns false
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isLoggedIn)
    }

    // --- Server URL ---

    @Test
    fun `setServerUrl updates preference`() = runTest {
        viewModel.setServerUrl("https://custom.server.com/")
        advanceUntilIdle()

        coVerify { mockUserPreferences.setServerUrl("https://custom.server.com/") }
    }

    @Test
    fun `server URL flow changes are reflected in state`() = runTest {
        advanceUntilIdle()

        serverUrlFlow.value = "https://new.server.com/"
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals("https://new.server.com/", state.serverUrl)
    }

    // --- Notifications ---

    @Test
    fun `setNotificationsEnabled updates preference`() = runTest {
        viewModel.setNotificationsEnabled(false)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setNotificationsEnabled(false) }
    }

    @Test
    fun `setNotificationSoundEnabled updates preference`() = runTest {
        viewModel.setNotificationSoundEnabled(false)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setNotificationSoundEnabled(false) }
    }

    @Test
    fun `setNotificationVibrationEnabled updates preference`() = runTest {
        viewModel.setNotificationVibrationEnabled(false)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setNotificationVibrationEnabled(false) }
    }

    @Test
    fun `notification enabled flow changes are reflected in state`() = runTest {
        advanceUntilIdle()

        notificationsEnabledFlow.value = false
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.notificationsEnabled)
    }

    // --- Theme ---

    @Test
    fun `setThemePreference updates preference`() = runTest {
        viewModel.setThemePreference("dark")
        advanceUntilIdle()

        coVerify { mockUserPreferences.setThemePreference("dark") }
    }

    @Test
    fun `theme flow changes are reflected in state`() = runTest {
        advanceUntilIdle()

        themeFlow.value = "light"
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals("light", state.themePreference)
    }

    // --- Connection Check ---

    @Test
    fun `checkConnection sets connected when credentials exist`() = runTest {
        every { mockTokenStorage.hasStoredCredentials() } returns true
        every { mockTokenStorage.serverUrl } returns "https://api.happy.dev/"

        viewModel.checkConnection()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.isConnected)
        assertFalse(state.isCheckingConnection)
    }

    @Test
    fun `checkConnection sets not connected when no credentials`() = runTest {
        every { mockTokenStorage.hasStoredCredentials() } returns false

        viewModel.checkConnection()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isConnected)
        assertFalse(state.isCheckingConnection)
    }

    // --- Logout ---

    @Test
    fun `logout clears token storage and preferences`() = runTest {
        var logoutCompleted = false

        viewModel.logout { logoutCompleted = true }
        advanceUntilIdle()

        verify { mockTokenStorage.clearAll() }
        coVerify { mockUserPreferences.clearAll() }
        verify { mockNotificationHelper.cancelAllNotifications() }
        assertTrue(logoutCompleted)
    }

    @Test
    fun `logout calls onComplete even if clearAll throws`() = runTest {
        every { mockTokenStorage.clearAll() } throws RuntimeException("Storage error")
        var logoutCompleted = false

        viewModel.logout { logoutCompleted = true }
        advanceUntilIdle()

        assertTrue(logoutCompleted)
    }

    // --- Notification Permission ---

    @Test
    fun `refreshNotificationPermission updates state`() = runTest {
        every { mockNotificationHelper.hasNotificationPermission() } returns false

        viewModel.refreshNotificationPermission()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.hasNotificationPermission)
    }
}
