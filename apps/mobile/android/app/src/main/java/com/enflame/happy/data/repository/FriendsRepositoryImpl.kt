package com.enflame.happy.data.repository

import com.enflame.happy.data.api.FriendsApiService
import com.enflame.happy.data.api.SendFriendRequestBody
import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendRequest
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
 */
@Singleton
class FriendsRepositoryImpl @Inject constructor(
    private val friendsApiService: FriendsApiService
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
}
