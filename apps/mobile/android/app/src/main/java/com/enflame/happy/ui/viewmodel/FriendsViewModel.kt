package com.enflame.happy.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendInviteLink
import com.enflame.happy.domain.model.FriendRequest
import com.enflame.happy.domain.model.FriendRequestStatus
import com.enflame.happy.domain.model.FriendStatus
import com.enflame.happy.domain.model.InviteSource
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionShare
import com.enflame.happy.domain.model.SharePermission
import com.enflame.happy.domain.repository.FriendsRepository
import com.enflame.happy.domain.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Filter options for the friends list.
 */
enum class FriendFilter(val label: String) {
    ALL("All"),
    ONLINE("Online"),
    IN_SESSION("In Session")
}

/**
 * UI state for the friends list screen.
 *
 * @property isLoading Whether the initial load is in progress.
 * @property hasLoaded Whether the initial load has completed.
 * @property isRefreshing Whether a pull-to-refresh is in progress.
 * @property errorMessage The current error message, if any.
 * @property successMessage A transient success message to display.
 * @property searchQuery The current search query for filtering friends.
 * @property filter The current status filter.
 * @property isSendingRequest Whether a friend request is being sent.
 * @property onlineFriendCount Number of friends currently online.
 * @property pendingRequestCount Number of pending incoming friend requests.
 * @property isShareDialogVisible Whether the session sharing dialog is showing.
 * @property shareTargetFriendId The friend ID to share a session with.
 * @property availableSessions Sessions available for sharing.
 * @property isSharingSession Whether a session share is in progress.
 * @property sharedSessions Shared sessions with the current friend profile.
 * @property isLoadingSharedSessions Whether shared sessions are loading.
 * @property friendInviteLink The generated friend invite link, if available.
 * @property isGeneratingInvite Whether an invite is being generated.
 * @property isProcessingInvite Whether an invite code is being processed.
 */
data class FriendsUiState(
    val isLoading: Boolean = false,
    val hasLoaded: Boolean = false,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val searchQuery: String = "",
    val filter: FriendFilter = FriendFilter.ALL,
    val isSendingRequest: Boolean = false,
    val onlineFriendCount: Int = 0,
    val pendingRequestCount: Int = 0,
    val isShareDialogVisible: Boolean = false,
    val shareTargetFriendId: String? = null,
    val availableSessions: List<Session> = emptyList(),
    val isSharingSession: Boolean = false,
    val sharedSessions: List<SessionShare> = emptyList(),
    val isLoadingSharedSessions: Boolean = false,
    val friendInviteLink: FriendInviteLink? = null,
    val isGeneratingInvite: Boolean = false,
    val isProcessingInvite: Boolean = false
)

/**
 * ViewModel for the Friends screens.
 *
 * Manages friends list loading, filtering, searching, friend request operations,
 * session sharing, QR friend invites, shareable links, and pull-to-refresh.
 * Observes friends and requests from the repository as reactive Flows and
 * combines with UI state for filtered results.
 */
@HiltViewModel
class FriendsViewModel @Inject constructor(
    private val friendsRepository: FriendsRepository,
    private val sessionRepository: SessionRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FriendsUiState())
    val uiState: StateFlow<FriendsUiState> = _uiState.asStateFlow()

    /**
     * Raw friends from the repository, sorted by online status then name.
     */
    private val allFriends: StateFlow<List<Friend>> = friendsRepository.getFriends()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /**
     * Friend requests from the repository.
     */
    val friendRequests: StateFlow<List<FriendRequest>> = friendsRepository.getFriendRequests()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    /**
     * Filtered and searched friends for display.
     * Combines the raw friends list with the current filter and search query.
     */
    val filteredFriends: StateFlow<List<Friend>> = combine(
        allFriends,
        _uiState
    ) { friends, state ->
        var result = friends

        // Apply status filter
        result = when (state.filter) {
            FriendFilter.ALL -> result
            FriendFilter.ONLINE -> result.filter { it.isOnline }
            FriendFilter.IN_SESSION -> result.filter { it.status == FriendStatus.IN_SESSION }
        }

        // Apply search filter
        if (state.searchQuery.isNotBlank()) {
            val query = state.searchQuery.lowercase()
            result = result.filter { friend ->
                friend.displayName.lowercase().contains(query) ||
                    friend.username.lowercase().contains(query)
            }
        }

        // Sort: online friends first (by status priority), then alphabetically
        result.sortedWith(
            compareBy<Friend> { statusSortOrder(it.status) }
                .thenBy { it.displayName.lowercase() }
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        loadFriends()
    }

    /**
     * Initial load of friends and requests from the repository.
     */
    fun loadFriends() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                friendsRepository.refreshFriends()
                friendsRepository.refreshFriendRequests()
                updateCounts()
                _uiState.update { it.copy(isLoading = false, hasLoaded = true) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        hasLoaded = true,
                        errorMessage = e.message ?: "Failed to load friends"
                    )
                }
            }
        }
    }

    /**
     * Refresh friends and requests via pull-to-refresh.
     */
    fun refreshFriends() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            try {
                friendsRepository.refreshFriends()
                friendsRepository.refreshFriendRequests()
                updateCounts()
                _uiState.update { it.copy(isRefreshing = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isRefreshing = false,
                        errorMessage = e.message ?: "Failed to refresh friends"
                    )
                }
            }
        }
    }

    /**
     * Send a friend request to a user by username.
     *
     * @param username The target user's username.
     * @param message Optional message to include.
     */
    fun sendFriendRequest(username: String, message: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSendingRequest = true, errorMessage = null) }
            try {
                friendsRepository.sendFriendRequest(username, message)
                updateCounts()
                _uiState.update {
                    it.copy(
                        isSendingRequest = false,
                        successMessage = "Friend request sent to $username"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSendingRequest = false,
                        errorMessage = e.message ?: "Failed to send friend request"
                    )
                }
            }
        }
    }

    /**
     * Accept a pending friend request.
     *
     * @param requestId The unique identifier of the friend request.
     */
    fun acceptFriendRequest(requestId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(errorMessage = null) }
            try {
                friendsRepository.acceptFriendRequest(requestId)
                updateCounts()
                _uiState.update {
                    it.copy(successMessage = "Friend request accepted")
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message ?: "Failed to accept friend request"
                    )
                }
            }
        }
    }

    /**
     * Decline a pending friend request.
     *
     * @param requestId The unique identifier of the friend request.
     */
    fun declineFriendRequest(requestId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(errorMessage = null) }
            try {
                friendsRepository.declineFriendRequest(requestId)
                updateCounts()
                _uiState.update {
                    it.copy(successMessage = "Friend request declined")
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message ?: "Failed to decline friend request"
                    )
                }
            }
        }
    }

    /**
     * Remove a friend connection.
     *
     * @param friendId The unique identifier of the friend to remove.
     */
    fun removeFriend(friendId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(errorMessage = null) }
            try {
                friendsRepository.removeFriend(friendId)
                updateCounts()
                _uiState.update {
                    it.copy(successMessage = "Friend removed")
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message ?: "Failed to remove friend"
                    )
                }
            }
        }
    }

    /**
     * Update the search query for filtering friends.
     */
    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    /**
     * Update the status filter.
     */
    fun onFilterChanged(filter: FriendFilter) {
        _uiState.update { it.copy(filter = filter) }
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
     * Find a friend by their ID.
     *
     * @param friendId The unique identifier of the friend.
     * @return The friend if found, null otherwise.
     */
    fun findFriend(friendId: String): Friend? {
        return allFriends.value.find { it.id == friendId }
    }

    /**
     * Update the online and pending request counts in the UI state.
     */
    private fun updateCounts() {
        val onlineCount = allFriends.value.count { it.isOnline }
        val pendingCount = friendRequests.value.count {
            it.status == FriendRequestStatus.PENDING
        }
        _uiState.update {
            it.copy(
                onlineFriendCount = onlineCount,
                pendingRequestCount = pendingCount
            )
        }
    }

    // --- Session Sharing ---

    /**
     * Show the session sharing dialog for a friend.
     * Loads available sessions from the repository.
     *
     * @param friendId The ID of the friend to share with.
     */
    fun showShareSessionDialog(friendId: String) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isShareDialogVisible = true,
                    shareTargetFriendId = friendId,
                    errorMessage = null
                )
            }
            try {
                val sessions = sessionRepository.getActiveSessions()
                _uiState.update { it.copy(availableSessions = sessions) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message ?: "Failed to load sessions"
                    )
                }
            }
        }
    }

    /**
     * Dismiss the session sharing dialog.
     */
    fun dismissShareSessionDialog() {
        _uiState.update {
            it.copy(
                isShareDialogVisible = false,
                shareTargetFriendId = null,
                availableSessions = emptyList()
            )
        }
    }

    /**
     * Share a session with a friend.
     *
     * @param sessionId The session to share.
     * @param friendId The friend to share with.
     * @param permission The permission level to grant.
     */
    fun shareSession(
        sessionId: String,
        friendId: String,
        permission: SharePermission = SharePermission.VIEW
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSharingSession = true, errorMessage = null) }
            try {
                friendsRepository.shareSession(sessionId, friendId, permission)
                _uiState.update {
                    it.copy(
                        isSharingSession = false,
                        isShareDialogVisible = false,
                        shareTargetFriendId = null,
                        availableSessions = emptyList(),
                        successMessage = "Session shared successfully"
                    )
                }
                // Refresh shared sessions for the friend profile
                loadSharedSessions(friendId)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isSharingSession = false,
                        errorMessage = e.message ?: "Failed to share session"
                    )
                }
            }
        }
    }

    /**
     * Load shared sessions for a specific friend.
     *
     * @param friendId The friend's unique identifier.
     */
    fun loadSharedSessions(friendId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingSharedSessions = true) }
            try {
                val sharedSessions = friendsRepository.getSharedSessions(friendId)
                _uiState.update {
                    it.copy(
                        sharedSessions = sharedSessions,
                        isLoadingSharedSessions = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoadingSharedSessions = false,
                        errorMessage = e.message ?: "Failed to load shared sessions"
                    )
                }
            }
        }
    }

    /**
     * Revoke a session share.
     *
     * @param sessionId The session ID.
     * @param shareId The share record ID.
     * @param friendId The friend ID (for refreshing the list).
     */
    fun revokeSessionShare(sessionId: String, shareId: String, friendId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(errorMessage = null) }
            try {
                friendsRepository.revokeSessionShare(sessionId, shareId)
                _uiState.update {
                    it.copy(successMessage = "Session share revoked")
                }
                loadSharedSessions(friendId)
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message ?: "Failed to revoke session share"
                    )
                }
            }
        }
    }

    // --- Friend Invites ---

    /**
     * Generate a friend invite link for sharing.
     * The invite can be encoded as a QR code or shared as a URL.
     */
    fun generateFriendInvite() {
        viewModelScope.launch {
            _uiState.update { it.copy(isGeneratingInvite = true, errorMessage = null) }
            try {
                val invite = friendsRepository.generateFriendInvite()
                _uiState.update {
                    it.copy(
                        friendInviteLink = invite,
                        isGeneratingInvite = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isGeneratingInvite = false,
                        errorMessage = e.message ?: "Failed to generate invite"
                    )
                }
            }
        }
    }

    /**
     * Process a friend invite code from a QR scan.
     *
     * @param code The invite code extracted from the QR payload.
     */
    fun processFriendInviteFromQr(code: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcessingInvite = true, errorMessage = null) }
            try {
                friendsRepository.processFriendInvite(code, InviteSource.QR_CODE)
                _uiState.update {
                    it.copy(
                        isProcessingInvite = false,
                        successMessage = "Friend request sent via QR code"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isProcessingInvite = false,
                        errorMessage = e.message ?: "Failed to process invite"
                    )
                }
            }
        }
    }

    /**
     * Process a friend invite code from a deep link.
     *
     * @param code The invite code extracted from the URL.
     */
    fun processFriendInviteFromLink(code: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isProcessingInvite = true, errorMessage = null) }
            try {
                friendsRepository.processFriendInvite(code, InviteSource.LINK)
                _uiState.update {
                    it.copy(
                        isProcessingInvite = false,
                        successMessage = "Friend request sent via invite link"
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isProcessingInvite = false,
                        errorMessage = e.message ?: "Failed to process invite link"
                    )
                }
            }
        }
    }

    /**
     * Clear the generated friend invite link.
     */
    fun clearFriendInviteLink() {
        _uiState.update { it.copy(friendInviteLink = null) }
    }

    /**
     * Sort order for friend status (online first, offline last).
     */
    private fun statusSortOrder(status: FriendStatus): Int = when (status) {
        FriendStatus.IN_SESSION -> 0
        FriendStatus.ONLINE -> 1
        FriendStatus.AWAY -> 2
        FriendStatus.OFFLINE -> 3
    }
}
