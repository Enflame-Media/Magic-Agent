package com.enflame.happy.ui.viewmodel

import com.enflame.happy.data.billing.PurchaseService
import com.enflame.happy.domain.model.BillingPeriod
import com.enflame.happy.domain.model.PlanFeature
import com.enflame.happy.domain.model.PurchaseResult
import com.enflame.happy.domain.model.SubscriptionInfo
import com.enflame.happy.domain.model.SubscriptionPlan
import com.enflame.happy.domain.model.SubscriptionStatus
import com.enflame.happy.domain.model.SubscriptionTier
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [PurchaseViewModel].
 *
 * Tests billing state management, purchase flow handling, subscription
 * status tracking, and error handling via mocked [PurchaseService].
 */
@OptIn(ExperimentalCoroutinesApi::class)
class PurchaseViewModelTest {

    private lateinit var viewModel: PurchaseViewModel
    private lateinit var mockPurchaseService: PurchaseService

    private val testDispatcher = StandardTestDispatcher()

    // Mutable state flows simulating PurchaseService behavior
    private val availablePlansFlow = MutableStateFlow<List<SubscriptionPlan>>(emptyList())
    private val subscriptionStatusFlow = MutableStateFlow<SubscriptionStatus>(SubscriptionStatus.Loading)
    private val isPurchasingFlow = MutableStateFlow(false)
    private val isConnectedFlow = MutableStateFlow(false)

    private val sampleProMonthly = SubscriptionPlan(
        id = "media.enflame.happy.android.pro.monthly",
        tier = SubscriptionTier.PRO,
        billingPeriod = BillingPeriod.MONTHLY,
        displayPrice = "$9.99",
        priceMicros = 9990000L,
        currencyCode = "USD",
        features = listOf(
            PlanFeature(title = "Unlimited sessions", iconName = "all_inclusive"),
            PlanFeature(title = "Multiple devices", iconName = "devices")
        ),
        isRecommended = true,
        offerToken = "test-offer-token"
    )

    private val sampleProAnnual = SubscriptionPlan(
        id = "media.enflame.happy.android.pro.annual",
        tier = SubscriptionTier.PRO,
        billingPeriod = BillingPeriod.ANNUAL,
        displayPrice = "$99.99",
        priceMicros = 99990000L,
        currencyCode = "USD",
        features = listOf(
            PlanFeature(title = "Unlimited sessions", iconName = "all_inclusive"),
            PlanFeature(title = "Multiple devices", iconName = "devices")
        ),
        isRecommended = false,
        offerToken = "test-offer-token-annual"
    )

    private val sampleTeamMonthly = SubscriptionPlan(
        id = "media.enflame.happy.android.team.monthly",
        tier = SubscriptionTier.TEAM,
        billingPeriod = BillingPeriod.MONTHLY,
        displayPrice = "$29.99",
        priceMicros = 29990000L,
        currencyCode = "USD",
        features = listOf(
            PlanFeature(title = "Everything in Pro", iconName = "verified"),
            PlanFeature(title = "Team management", iconName = "groups")
        ),
        isRecommended = false,
        offerToken = "test-offer-token-team"
    )

    private val allPlans = listOf(sampleProMonthly, sampleProAnnual, sampleTeamMonthly)

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        mockPurchaseService = mockk(relaxed = true)

        // Set up PurchaseService flow mocks
        every { mockPurchaseService.availablePlans } returns availablePlansFlow
        every { mockPurchaseService.subscriptionStatus } returns subscriptionStatusFlow
        every { mockPurchaseService.isPurchasing } returns isPurchasingFlow
        every { mockPurchaseService.isConnected } returns isConnectedFlow

        // Default: billing connects and queries successfully
        coEvery { mockPurchaseService.connect() } returns true
        coEvery { mockPurchaseService.queryProducts() } returns true
        coEvery { mockPurchaseService.refreshSubscriptionStatus() } returns Unit

        viewModel = PurchaseViewModel(mockPurchaseService)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // --- Initial State ---

    @Test
    fun `initial state shows loading`() = runTest {
        val state = viewModel.uiState.first()
        assertTrue(state.isLoading)
    }

    @Test
    fun `initial state connects and loads products`() = runTest {
        advanceUntilIdle()

        coVerify { mockPurchaseService.connect() }
        coVerify { mockPurchaseService.queryProducts() }
        coVerify { mockPurchaseService.refreshSubscriptionStatus() }
    }

    @Test
    fun `initial state has monthly billing period selected`() = runTest {
        advanceUntilIdle()
        val state = viewModel.uiState.first()
        assertEquals(BillingPeriod.MONTHLY, state.selectedBillingPeriod)
    }

    // --- Products Loading ---

    @Test
    fun `available plans are reflected in state`() = runTest {
        advanceUntilIdle()

        availablePlansFlow.value = allPlans
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(3, state.availablePlans.size)
    }

    @Test
    fun `filtered plans match selected billing period`() = runTest {
        advanceUntilIdle()

        availablePlansFlow.value = allPlans
        advanceUntilIdle()

        // Default is MONTHLY
        val state = viewModel.uiState.first()
        assertEquals(2, state.filteredPlans.size)
        assertTrue(state.filteredPlans.all { it.billingPeriod == BillingPeriod.MONTHLY })
    }

    @Test
    fun `changing billing period filters plans`() = runTest {
        advanceUntilIdle()

        availablePlansFlow.value = allPlans
        viewModel.selectBillingPeriod(BillingPeriod.ANNUAL)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(BillingPeriod.ANNUAL, state.selectedBillingPeriod)
        assertEquals(1, state.filteredPlans.size)
        assertEquals(BillingPeriod.ANNUAL, state.filteredPlans.first().billingPeriod)
    }

    @Test
    fun `loading state is false after products loaded`() = runTest {
        advanceUntilIdle()

        availablePlansFlow.value = allPlans
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isLoading)
    }

    // --- Connection Failure ---

    @Test
    fun `connection failure shows error`() = runTest {
        coEvery { mockPurchaseService.connect() } returns false

        viewModel = PurchaseViewModel(mockPurchaseService)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals("Unable to connect to Google Play", state.errorMessage)
    }

    @Test
    fun `connection exception shows error`() = runTest {
        coEvery { mockPurchaseService.connect() } throws RuntimeException("Network error")

        viewModel = PurchaseViewModel(mockPurchaseService)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.errorMessage?.contains("Network error") == true)
    }

    // --- Subscription Status ---

    @Test
    fun `subscription status is reflected in state`() = runTest {
        advanceUntilIdle()

        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis(),
            billingPeriod = BillingPeriod.MONTHLY
        )
        subscriptionStatusFlow.value = SubscriptionStatus.Subscribed(info)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.isSubscribed)
        assertEquals(SubscriptionTier.PRO, state.currentTier)
    }

    @Test
    fun `not subscribed status is reflected correctly`() = runTest {
        advanceUntilIdle()

        subscriptionStatusFlow.value = SubscriptionStatus.NotSubscribed
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isSubscribed)
        assertNull(state.currentTier)
    }

    @Test
    fun `expired status shows current tier`() = runTest {
        advanceUntilIdle()

        val info = SubscriptionInfo(
            tier = SubscriptionTier.TEAM,
            productId = "team.monthly",
            purchaseTimeMillis = System.currentTimeMillis() - 86400000L * 60,
            expiryTimeMillis = System.currentTimeMillis() - 86400000L,
            willAutoRenew = false,
            billingPeriod = BillingPeriod.MONTHLY
        )
        subscriptionStatusFlow.value = SubscriptionStatus.Expired(info)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isSubscribed)
        assertEquals(SubscriptionTier.TEAM, state.currentTier)
    }

    // --- Restore Purchases ---

    @Test
    fun `restore purchases calls service`() = runTest {
        advanceUntilIdle()

        coEvery { mockPurchaseService.restorePurchases() } returns true
        subscriptionStatusFlow.value = SubscriptionStatus.NotSubscribed

        viewModel.restorePurchases()
        advanceUntilIdle()

        coVerify { mockPurchaseService.restorePurchases() }
    }

    @Test
    fun `restore purchases shows success when subscription found`() = runTest {
        advanceUntilIdle()

        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis(),
            billingPeriod = BillingPeriod.MONTHLY
        )

        coEvery { mockPurchaseService.restorePurchases() } answers {
            subscriptionStatusFlow.value = SubscriptionStatus.Subscribed(info)
            true
        }

        viewModel.restorePurchases()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.showRestoreSuccess)
        assertFalse(state.isRestoring)
    }

    @Test
    fun `restore purchases shows error when no subscription found`() = runTest {
        advanceUntilIdle()

        coEvery { mockPurchaseService.restorePurchases() } returns true
        subscriptionStatusFlow.value = SubscriptionStatus.NotSubscribed

        viewModel.restorePurchases()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals("No active subscriptions found", state.errorMessage)
        assertFalse(state.isRestoring)
    }

    @Test
    fun `restore purchases shows error on failure`() = runTest {
        advanceUntilIdle()

        coEvery { mockPurchaseService.restorePurchases() } returns false

        viewModel.restorePurchases()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.errorMessage?.contains("Failed to restore") == true)
        assertFalse(state.isRestoring)
    }

    @Test
    fun `restore purchases handles exception`() = runTest {
        advanceUntilIdle()

        coEvery { mockPurchaseService.restorePurchases() } throws RuntimeException("Network error")

        viewModel.restorePurchases()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.errorMessage?.contains("Network error") == true)
        assertFalse(state.isRestoring)
    }

    // --- Billing Period Selection ---

    @Test
    fun `selectBillingPeriod updates state`() = runTest {
        advanceUntilIdle()

        viewModel.selectBillingPeriod(BillingPeriod.ANNUAL)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(BillingPeriod.ANNUAL, state.selectedBillingPeriod)
    }

    // --- Dialog Dismissals ---

    @Test
    fun `dismissPurchaseSuccess clears flag`() = runTest {
        advanceUntilIdle()

        viewModel.dismissPurchaseSuccess()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.showPurchaseSuccess)
    }

    @Test
    fun `dismissRestoreSuccess clears flag`() = runTest {
        advanceUntilIdle()

        viewModel.dismissRestoreSuccess()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.showRestoreSuccess)
    }

    @Test
    fun `dismissError clears error message`() = runTest {
        advanceUntilIdle()

        // Force an error
        coEvery { mockPurchaseService.connect() } returns false
        viewModel = PurchaseViewModel(mockPurchaseService)
        advanceUntilIdle()

        var state = viewModel.uiState.first()
        assertTrue(state.errorMessage != null)

        viewModel.dismissError()
        advanceUntilIdle()

        state = viewModel.uiState.first()
        assertNull(state.errorMessage)
    }

    // --- Refresh Status ---

    @Test
    fun `refreshStatus calls service`() = runTest {
        advanceUntilIdle()

        viewModel.refreshStatus()
        advanceUntilIdle()

        // Called once during init + once from refreshStatus
        coVerify(atLeast = 2) { mockPurchaseService.refreshSubscriptionStatus() }
    }

    // --- PurchaseUiState Derived Properties ---

    @Test
    fun `isSubscribed returns true when status is Subscribed`() {
        val state = PurchaseUiState(
            subscriptionStatus = SubscriptionStatus.Subscribed(
                SubscriptionInfo(
                    tier = SubscriptionTier.PRO,
                    productId = "pro.monthly",
                    purchaseTimeMillis = System.currentTimeMillis(),
                    billingPeriod = BillingPeriod.MONTHLY
                )
            )
        )
        assertTrue(state.isSubscribed)
    }

    @Test
    fun `isSubscribed returns false when status is NotSubscribed`() {
        val state = PurchaseUiState(
            subscriptionStatus = SubscriptionStatus.NotSubscribed
        )
        assertFalse(state.isSubscribed)
    }

    @Test
    fun `currentTier returns tier from Subscribed status`() {
        val state = PurchaseUiState(
            subscriptionStatus = SubscriptionStatus.Subscribed(
                SubscriptionInfo(
                    tier = SubscriptionTier.TEAM,
                    productId = "team.monthly",
                    purchaseTimeMillis = System.currentTimeMillis(),
                    billingPeriod = BillingPeriod.MONTHLY
                )
            )
        )
        assertEquals(SubscriptionTier.TEAM, state.currentTier)
    }

    @Test
    fun `currentTier returns null when not subscribed`() {
        val state = PurchaseUiState(
            subscriptionStatus = SubscriptionStatus.NotSubscribed
        )
        assertNull(state.currentTier)
    }
}
