package com.enflame.happy.ui.viewmodel

import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendRequest
import com.enflame.happy.domain.model.FriendRequestStatus
import com.enflame.happy.domain.model.FriendRequestUser
import com.enflame.happy.domain.model.FriendStatus
import com.enflame.happy.domain.repository.FriendsRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FriendsViewModelTest {

    private lateinit var viewModel: FriendsViewModel
    private lateinit var mockRepository: FriendsRepository

    private val testDispatcher = StandardTestDispatcher()
    private val friendsFlow = MutableStateFlow<List<Friend>>(emptyList())
    private val requestsFlow = MutableStateFlow<List<FriendRequest>>(emptyList())

    private val now = System.currentTimeMillis()

    private val testFriends = listOf(
        Friend(
            id = "friend-1",
            displayName = "Alice Developer",
            username = "alice",
            status = FriendStatus.ONLINE,
            addedAt = now - 86_400_000L * 30,
            sharedSessionCount = 5
        ),
        Friend(
            id = "friend-2",
            displayName = "Bob Engineer",
            username = "bob",
            status = FriendStatus.OFFLINE,
            lastSeen = now - 3_600_000,
            addedAt = now - 86_400_000L * 60,
            sharedSessionCount = 2
        ),
        Friend(
            id = "friend-3",
            displayName = "Carol Coder",
            username = "carol",
            status = FriendStatus.IN_SESSION,
            addedAt = now - 86_400_000L * 10,
            sharedSessionCount = 0
        ),
        Friend(
            id = "friend-4",
            displayName = "Dave Designer",
            username = "dave",
            status = FriendStatus.AWAY,
            addedAt = now - 86_400_000L * 5,
            sharedSessionCount = 1
        )
    )

    private val testRequests = listOf(
        FriendRequest(
            id = "req-1",
            fromUser = FriendRequestUser(
                id = "user-10",
                displayName = "Eve Tester",
                username = "eve"
            ),
            toUser = FriendRequestUser(
                id = "user-self",
                displayName = "Me",
                username = "me"
            ),
            status = FriendRequestStatus.PENDING,
            message = "Hey, let's connect!",
            createdAt = now - 3_600_000
        ),
        FriendRequest(
            id = "req-2",
            fromUser = FriendRequestUser(
                id = "user-self",
                displayName = "Me",
                username = "me"
            ),
            toUser = FriendRequestUser(
                id = "user-11",
                displayName = "Frank Admin",
                username = "frank"
            ),
            status = FriendRequestStatus.PENDING,
            createdAt = now - 7_200_000
        )
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockRepository = mockk()
        every { mockRepository.getFriends() } returns friendsFlow
        every { mockRepository.getFriendRequests() } returns requestsFlow
        coEvery { mockRepository.refreshFriends() } coAnswers {
            friendsFlow.value = testFriends
        }
        coEvery { mockRepository.refreshFriendRequests() } coAnswers {
            requestsFlow.value = testRequests
        }
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): FriendsViewModel {
        return FriendsViewModel(mockRepository)
    }

    @Test
    fun `initial state is loading`() = runTest {
        viewModel = createViewModel()

        val state = viewModel.uiState.first()
        assertTrue(state.isLoading)
        assertFalse(state.hasLoaded)
        assertEquals("", state.searchQuery)
        assertEquals(FriendFilter.ALL, state.filter)
    }

    @Test
    fun `friends are loaded from repository on init`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isLoading)
        assertTrue(state.hasLoaded)
        assertNull(state.errorMessage)
        coVerify(exactly = 1) { mockRepository.refreshFriends() }
        coVerify(exactly = 1) { mockRepository.refreshFriendRequests() }
    }

    @Test
    fun `filtered friends returns all when filter is ALL`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        assertEquals(4, friends.size)
    }

    @Test
    fun `filtered friends returns only online when filter is ONLINE`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(FriendFilter.ONLINE)
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        // ONLINE filter includes ONLINE, AWAY, and IN_SESSION (all non-offline)
        assertEquals(3, friends.size)
        assertTrue(friends.all { it.isOnline })
    }

    @Test
    fun `filtered friends returns only in session when filter is IN_SESSION`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(FriendFilter.IN_SESSION)
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        assertEquals(1, friends.size)
        assertTrue(friends.all { it.status == FriendStatus.IN_SESSION })
    }

    @Test
    fun `search filters friends by display name`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("alice")
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        assertEquals(1, friends.size)
        assertEquals("friend-1", friends[0].id)
    }

    @Test
    fun `search filters friends by username`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("carol")
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        assertEquals(1, friends.size)
        assertEquals("friend-3", friends[0].id)
    }

    @Test
    fun `search is case insensitive`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("ALICE")
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        assertEquals(1, friends.size)
    }

    @Test
    fun `search and filter can be combined`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(FriendFilter.ONLINE)
        viewModel.onSearchQueryChanged("carol")
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        assertEquals(1, friends.size)
        assertEquals("friend-3", friends[0].id)
    }

    @Test
    fun `empty search query shows all friends`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("alice")
        advanceUntilIdle()
        assertEquals(1, viewModel.filteredFriends.first().size)

        viewModel.onSearchQueryChanged("")
        advanceUntilIdle()
        assertEquals(4, viewModel.filteredFriends.first().size)
    }

    @Test
    fun `friends are sorted by status priority then name`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        // IN_SESSION first, then ONLINE, then AWAY, then OFFLINE
        assertEquals("friend-3", friends[0].id) // Carol - IN_SESSION
        assertEquals("friend-1", friends[1].id) // Alice - ONLINE
        assertEquals("friend-4", friends[2].id) // Dave - AWAY
        assertEquals("friend-2", friends[3].id) // Bob - OFFLINE
    }

    @Test
    fun `refreshFriends sets refreshing state`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.refreshFriends()

        // During refresh, isRefreshing should be true
        val stateWhileRefreshing = viewModel.uiState.first()
        assertTrue(stateWhileRefreshing.isRefreshing)

        advanceUntilIdle()

        val stateAfterRefresh = viewModel.uiState.first()
        assertFalse(stateAfterRefresh.isRefreshing)
    }

    @Test
    fun `refreshFriends calls repository refresh`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.refreshFriends()
        advanceUntilIdle()

        // Once from init, once from explicit refresh
        coVerify(exactly = 2) { mockRepository.refreshFriends() }
        coVerify(exactly = 2) { mockRepository.refreshFriendRequests() }
    }

    @Test
    fun `error state is set when refresh fails`() = runTest {
        coEvery { mockRepository.refreshFriends() } throws RuntimeException("Network error")

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.hasLoaded)
        assertEquals("Network error", state.errorMessage)
    }

    @Test
    fun `dismissError clears error message`() = runTest {
        coEvery { mockRepository.refreshFriends() } throws RuntimeException("Network error")

        viewModel = createViewModel()
        advanceUntilIdle()
        assertTrue(viewModel.uiState.first().errorMessage != null)

        viewModel.dismissError()

        assertNull(viewModel.uiState.first().errorMessage)
    }

    @Test
    fun `sendFriendRequest sets sending state and shows success`() = runTest {
        val mockRequest = FriendRequest(
            id = "req-new",
            fromUser = FriendRequestUser("self", "Me", "me"),
            toUser = FriendRequestUser("other", "Other", "other"),
            status = FriendRequestStatus.PENDING,
            createdAt = now
        )
        coEvery { mockRepository.sendFriendRequest("other", null) } returns mockRequest

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.sendFriendRequest("other")

        // During sending, isSendingRequest should be true
        val stateWhileSending = viewModel.uiState.first()
        assertTrue(stateWhileSending.isSendingRequest)

        advanceUntilIdle()

        val stateAfterSend = viewModel.uiState.first()
        assertFalse(stateAfterSend.isSendingRequest)
        assertNotNull(stateAfterSend.successMessage)
        assertTrue(stateAfterSend.successMessage!!.contains("other"))
    }

    @Test
    fun `sendFriendRequest shows error on failure`() = runTest {
        coEvery { mockRepository.sendFriendRequest("unknown", null) } throws
            RuntimeException("User not found")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.sendFriendRequest("unknown")
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isSendingRequest)
        assertEquals("User not found", state.errorMessage)
    }

    @Test
    fun `acceptFriendRequest calls repository and shows success`() = runTest {
        val acceptedRequest = testRequests[0].copy(status = FriendRequestStatus.ACCEPTED)
        coEvery { mockRepository.acceptFriendRequest("req-1") } returns acceptedRequest

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.acceptFriendRequest("req-1")
        advanceUntilIdle()

        coVerify { mockRepository.acceptFriendRequest("req-1") }
        val state = viewModel.uiState.first()
        assertNotNull(state.successMessage)
        assertTrue(state.successMessage!!.contains("accepted"))
    }

    @Test
    fun `declineFriendRequest calls repository and shows success`() = runTest {
        val declinedRequest = testRequests[0].copy(status = FriendRequestStatus.DECLINED)
        coEvery { mockRepository.declineFriendRequest("req-1") } returns declinedRequest

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.declineFriendRequest("req-1")
        advanceUntilIdle()

        coVerify { mockRepository.declineFriendRequest("req-1") }
        val state = viewModel.uiState.first()
        assertNotNull(state.successMessage)
        assertTrue(state.successMessage!!.contains("declined"))
    }

    @Test
    fun `removeFriend calls repository and shows success`() = runTest {
        coEvery { mockRepository.removeFriend("friend-1") } returns Unit

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.removeFriend("friend-1")
        advanceUntilIdle()

        coVerify { mockRepository.removeFriend("friend-1") }
        val state = viewModel.uiState.first()
        assertNotNull(state.successMessage)
        assertTrue(state.successMessage!!.contains("removed"))
    }

    @Test
    fun `removeFriend shows error on failure`() = runTest {
        coEvery { mockRepository.removeFriend("friend-1") } throws
            RuntimeException("Server error")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.removeFriend("friend-1")
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals("Server error", state.errorMessage)
    }

    @Test
    fun `filter change updates ui state`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(FriendFilter.IN_SESSION)

        assertEquals(FriendFilter.IN_SESSION, viewModel.uiState.first().filter)
    }

    @Test
    fun `search query change updates ui state`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("test query")

        assertEquals("test query", viewModel.uiState.first().searchQuery)
    }

    @Test
    fun `no matching search returns empty list`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("nonexistent user xyz")
        advanceUntilIdle()

        val friends = viewModel.filteredFriends.first()
        assertTrue(friends.isEmpty())
    }

    @Test
    fun `findFriend returns friend by id`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val friend = viewModel.findFriend("friend-1")
        assertNotNull(friend)
        assertEquals("Alice Developer", friend!!.displayName)
    }

    @Test
    fun `findFriend returns null for unknown id`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val friend = viewModel.findFriend("nonexistent")
        assertNull(friend)
    }

    @Test
    fun `dismissSuccess clears success message`() = runTest {
        val mockRequest = FriendRequest(
            id = "req-new",
            fromUser = FriendRequestUser("self", "Me", "me"),
            toUser = FriendRequestUser("other", "Other", "other"),
            status = FriendRequestStatus.PENDING,
            createdAt = now
        )
        coEvery { mockRepository.sendFriendRequest("other", null) } returns mockRequest

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.sendFriendRequest("other")
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.first().successMessage)

        viewModel.dismissSuccess()

        assertNull(viewModel.uiState.first().successMessage)
    }

    @Test
    fun `online friend count is updated after load`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        // Online friends: Alice (ONLINE), Carol (IN_SESSION), Dave (AWAY) = 3
        assertEquals(3, state.onlineFriendCount)
    }

    @Test
    fun `pending request count is updated after load`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        // Both test requests are PENDING
        assertEquals(2, state.pendingRequestCount)
    }

    @Test
    fun `refreshFriends resets error on success`() = runTest {
        var callCount = 0
        coEvery { mockRepository.refreshFriends() } coAnswers {
            callCount++
            if (callCount == 1) {
                throw RuntimeException("Network error")
            } else {
                friendsFlow.value = testFriends
            }
        }

        viewModel = createViewModel()
        advanceUntilIdle()
        assertTrue(viewModel.uiState.first().errorMessage != null)

        viewModel.refreshFriends()
        advanceUntilIdle()

        assertNull(viewModel.uiState.first().errorMessage)
    }

    @Test
    fun `sendFriendRequest with message passes message to repository`() = runTest {
        val mockRequest = FriendRequest(
            id = "req-new",
            fromUser = FriendRequestUser("self", "Me", "me"),
            toUser = FriendRequestUser("other", "Other", "other"),
            status = FriendRequestStatus.PENDING,
            message = "Hello!",
            createdAt = now
        )
        coEvery { mockRepository.sendFriendRequest("other", "Hello!") } returns mockRequest

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.sendFriendRequest("other", "Hello!")
        advanceUntilIdle()

        coVerify { mockRepository.sendFriendRequest("other", "Hello!") }
    }
}
