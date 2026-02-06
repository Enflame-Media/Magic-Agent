package com.enflame.happy.data.repository

import com.enflame.happy.data.api.FriendsApiService
import com.enflame.happy.data.api.HappyApiService
import com.enflame.happy.data.api.SendFriendRequestBody
import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendInviteLink
import com.enflame.happy.domain.model.FriendRequest
import com.enflame.happy.domain.model.InviteSource
import com.enflame.happy.domain.model.PrivacySettings
import com.enflame.happy.domain.model.ProcessFriendInviteRequest
import com.enflame.happy.domain.model.SessionShare
import com.enflame.happy.domain.model.SharePermission
import com.enflame.happy.domain.model.ShareSessionRequest
import com.enflame.happy.domain.repository.FriendsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of [FriendsRepository] that fetches data from the remote API
 * and maintains an in-memory cache via [MutableStateFlow].
 *
 * @property friendsApiService Retrofit API service for friends endpoints.
 * @property happyApiService Retrofit API service for session sharing endpoints.
 */
@Singleton
class FriendsRepositoryImpl @Inject constructor(
    private val friendsApiService: FriendsApiService,
    private val happyApiService: HappyApiService
) : FriendsRepository {

    private val _friends = MutableStateFlow<List<Friend>>(emptyList())
    private val _friendRequests = MutableStateFlow<List<FriendRequest>>(emptyList())

    override fun getFriends(): Flow<List<Friend>> = _friends.asStateFlow()

    override fun getFriendRequests(): Flow<List<FriendRequest>> = _friendRequests.asStateFlow()

    override suspend fun refreshFriends() {
        val friends = friendsApiService.getFriends()
        _friends.value = friends
    }

    override suspend fun refreshFriendRequests() {
        val requests = friendsApiService.getFriendRequests()
        _friendRequests.value = requests
    }

    override suspend fun sendFriendRequest(username: String, message: String?): FriendRequest {
        val request = friendsApiService.sendFriendRequest(
            SendFriendRequestBody(username = username, message = message)
        )
        // Refresh requests to include the newly sent one
        refreshFriendRequests()
        return request
    }

    override suspend fun acceptFriendRequest(requestId: String): FriendRequest {
        val updatedRequest = friendsApiService.acceptFriendRequest(requestId)
        // Refresh both friends (new friend added) and requests (status changed)
        refreshFriends()
        refreshFriendRequests()
        return updatedRequest
    }

    override suspend fun declineFriendRequest(requestId: String): FriendRequest {
        val updatedRequest = friendsApiService.declineFriendRequest(requestId)
        // Refresh requests to reflect the declined status
        refreshFriendRequests()
        return updatedRequest
    }

    override suspend fun removeFriend(friendId: String) {
        friendsApiService.removeFriend(friendId)
        // Remove from local cache immediately
        _friends.value = _friends.value.filter { it.id != friendId }
    }

    // --- Privacy Settings ---

    override suspend fun getPrivacySettings(): PrivacySettings {
        return friendsApiService.getPrivacySettings()
    }

    override suspend fun updatePrivacySettings(settings: PrivacySettings): PrivacySettings {
        return friendsApiService.updatePrivacySettings(settings)
    }

    // --- Session Sharing ---

    override suspend fun shareSession(
        sessionId: String,
        friendId: String,
        permission: SharePermission
    ): SessionShare {
        return happyApiService.shareSession(
            sessionId = sessionId,
            request = ShareSessionRequest(friendId = friendId, permission = permission)
        )
    }

    override suspend fun getSharedSessions(friendId: String): List<SessionShare> {
        return happyApiService.getSharedSessions(friendId)
    }

    override suspend fun revokeSessionShare(sessionId: String, shareId: String) {
        happyApiService.revokeSessionShare(sessionId, shareId)
    }

    // --- Friend Invites ---

    override suspend fun generateFriendInvite(): FriendInviteLink {
        return friendsApiService.generateFriendInvite()
    }

    override suspend fun processFriendInvite(code: String, source: InviteSource): FriendRequest {
        val request = friendsApiService.processFriendInvite(
            ProcessFriendInviteRequest(code = code, source = source)
        )
        // Refresh requests after processing invite
        refreshFriendRequests()
        return request
    }
}
