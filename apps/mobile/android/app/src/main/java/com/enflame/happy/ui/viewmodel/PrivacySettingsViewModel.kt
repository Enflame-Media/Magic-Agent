package com.enflame.happy.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.domain.model.FriendRequestPermission
import com.enflame.happy.domain.model.PrivacySettings
import com.enflame.happy.domain.model.ProfileVisibility
import com.enflame.happy.domain.repository.FriendsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the privacy settings screen.
 *
 * @property isLoading Whether the initial load is in progress.
 * @property isSaving Whether a save operation is in progress.
 * @property errorMessage The current error message, if any.
 * @property successMessage A transient success message to display.
 * @property onlineStatusVisible Whether the user's online status is visible.
 * @property profileVisibility Who can see the user's full profile.
 * @property friendRequestPermission Who can send the user friend requests.
 */
data class PrivacySettingsUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val onlineStatusVisible: Boolean = true,
    val profileVisibility: ProfileVisibility = ProfileVisibility.EVERYONE,
    val friendRequestPermission: FriendRequestPermission = FriendRequestPermission.EVERYONE
)

/**
 * ViewModel for the Privacy Settings screen.
 *
 * Manages loading and updating user privacy settings via the server API (HAP-794).
 * Each toggle/selection change triggers an immediate API call to persist the change.
 */
@HiltViewModel
class PrivacySettingsViewModel @Inject constructor(
    private val friendsRepository: FriendsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PrivacySettingsUiState())
    val uiState: StateFlow<PrivacySettingsUiState> = _uiState.asStateFlow()

    init {
        loadPrivacySettings()
    }

    /**
     * Load current privacy settings from the server.
     */
    fun loadPrivacySettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val settings = friendsRepository.getPrivacySettings()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        onlineStatusVisible = settings.onlineStatusVisible,
                        profileVisibility = settings.profileVisibility,
                        friendRequestPermission = settings.friendRequestPermission
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = e.message ?: "Failed to load privacy settings"
                    )
                }
            }
        }
    }

    /**
     * Toggle the online status visibility setting.
     *
     * @param visible Whether online status should be visible to friends.
     */
    fun setOnlineStatusVisible(visible: Boolean) {
        _uiState.update { it.copy(onlineStatusVisible = visible) }
        saveSettings()
    }

    /**
     * Update the profile visibility setting.
     *
     * @param visibility Who can see the user's full profile.
     */
    fun setProfileVisibility(visibility: ProfileVisibility) {
        _uiState.update { it.copy(profileVisibility = visibility) }
        saveSettings()
    }

    /**
     * Update the friend request permission setting.
     *
     * @param permission Who can send friend requests.
     */
    fun setFriendRequestPermission(permission: FriendRequestPermission) {
        _uiState.update { it.copy(friendRequestPermission = permission) }
        saveSettings()
    }

    /**
     * Dismiss the current error message.
     */
    fun dismissError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    /**
     * Dismiss the current success message.
     */
    fun dismissSuccess() {
        _uiState.update { it.copy(successMessage = null) }
    }

    /**
     * Save current settings to the server.
     */
    private fun saveSettings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, errorMessage = null) }
            try {
                val currentState = _uiState.value
                val settings = PrivacySettings(
                    onlineStatusVisible = currentState.onlineStatusVisible,
                    profileVisibility = currentState.profileVisibility,
                    friendRequestPermission = currentState.friendRequestPermission
                )
                val updatedSettings = friendsRepository.updatePrivacySettings(settings)
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        onlineStatusVisible = updatedSettings.onlineStatusVisible,
                        profileVisibility = updatedSettings.profileVisibility,
                        friendRequestPermission = updatedSettings.friendRequestPermission,
                        successMessage = "Privacy settings updated"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        errorMessage = e.message ?: "Failed to save privacy settings"
                    )
                }
            }
        }
    }
}
