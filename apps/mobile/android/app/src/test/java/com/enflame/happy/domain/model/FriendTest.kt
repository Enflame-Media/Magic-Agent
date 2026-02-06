package com.enflame.happy.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FriendTest {

    private val now = System.currentTimeMillis()

    @Test
    fun `isOnline returns true for ONLINE status`() {
        val friend = createFriend(status = FriendStatus.ONLINE)
        assertTrue(friend.isOnline)
    }

    @Test
    fun `isOnline returns true for AWAY status`() {
        val friend = createFriend(status = FriendStatus.AWAY)
        assertTrue(friend.isOnline)
    }

    @Test
    fun `isOnline returns true for IN_SESSION status`() {
        val friend = createFriend(status = FriendStatus.IN_SESSION)
        assertTrue(friend.isOnline)
    }

    @Test
    fun `isOnline returns false for OFFLINE status`() {
        val friend = createFriend(status = FriendStatus.OFFLINE)
        assertFalse(friend.isOnline)
    }

    @Test
    fun `Friend has correct default values`() {
        val friend = Friend(
            id = "test-id",
            displayName = "Test User",
            username = "testuser",
            addedAt = now
        )

        assertNull(friend.avatarUrl)
        assertEquals(FriendStatus.OFFLINE, friend.status)
        assertNull(friend.lastSeen)
        assertEquals(0, friend.sharedSessionCount)
    }

    @Test
    fun `FriendRequest has correct default status`() {
        val request = FriendRequest(
            id = "req-1",
            fromUser = FriendRequestUser("u1", "User One", "user1"),
            toUser = FriendRequestUser("u2", "User Two", "user2"),
            createdAt = now
        )

        assertEquals(FriendRequestStatus.PENDING, request.status)
        assertNull(request.message)
    }

    @Test
    fun `FriendRequestUser has correct default values`() {
        val user = FriendRequestUser(
            id = "u1",
            displayName = "Test User",
            username = "testuser"
        )

        assertNull(user.avatarUrl)
    }

    @Test
    fun `FriendStatus enum has correct entries`() {
        val statuses = FriendStatus.entries
        assertEquals(4, statuses.size)
        assertTrue(statuses.contains(FriendStatus.ONLINE))
        assertTrue(statuses.contains(FriendStatus.AWAY))
        assertTrue(statuses.contains(FriendStatus.IN_SESSION))
        assertTrue(statuses.contains(FriendStatus.OFFLINE))
    }

    @Test
    fun `FriendRequestStatus enum has correct entries`() {
        val statuses = FriendRequestStatus.entries
        assertEquals(3, statuses.size)
        assertTrue(statuses.contains(FriendRequestStatus.PENDING))
        assertTrue(statuses.contains(FriendRequestStatus.ACCEPTED))
        assertTrue(statuses.contains(FriendRequestStatus.DECLINED))
    }

    private fun createFriend(
        id: String = "friend-1",
        displayName: String = "Test User",
        username: String = "testuser",
        status: FriendStatus = FriendStatus.OFFLINE
    ): Friend {
        return Friend(
            id = id,
            displayName = displayName,
            username = username,
            status = status,
            addedAt = now
        )
    }
}
