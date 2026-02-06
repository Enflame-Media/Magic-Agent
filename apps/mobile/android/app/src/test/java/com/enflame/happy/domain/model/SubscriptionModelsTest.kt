package com.enflame.happy.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for subscription domain models.
 *
 * Tests [SubscriptionTier], [BillingPeriod], [SubscriptionStatus],
 * [SubscriptionInfo], [PurchaseResult], and [ProductIdentifiers].
 */
class SubscriptionModelsTest {

    // --- SubscriptionTier ---

    @Test
    fun `SubscriptionTier fromProductId returns PRO for pro products`() {
        assertEquals(
            SubscriptionTier.PRO,
            SubscriptionTier.fromProductId("media.enflame.happy.android.pro.monthly")
        )
        assertEquals(
            SubscriptionTier.PRO,
            SubscriptionTier.fromProductId("media.enflame.happy.android.pro.annual")
        )
    }

    @Test
    fun `SubscriptionTier fromProductId returns TEAM for team products`() {
        assertEquals(
            SubscriptionTier.TEAM,
            SubscriptionTier.fromProductId("media.enflame.happy.android.team.monthly")
        )
        assertEquals(
            SubscriptionTier.TEAM,
            SubscriptionTier.fromProductId("media.enflame.happy.android.team.annual")
        )
    }

    @Test
    fun `SubscriptionTier fromProductId returns FREE for unknown products`() {
        assertEquals(SubscriptionTier.FREE, SubscriptionTier.fromProductId("unknown.product"))
        assertEquals(SubscriptionTier.FREE, SubscriptionTier.fromProductId(""))
    }

    @Test
    fun `SubscriptionTier has correct display names`() {
        assertEquals("Free", SubscriptionTier.FREE.displayName)
        assertEquals("Pro", SubscriptionTier.PRO.displayName)
        assertEquals("Team", SubscriptionTier.TEAM.displayName)
    }

    // --- BillingPeriod ---

    @Test
    fun `BillingPeriod fromProductId returns MONTHLY for monthly products`() {
        assertEquals(
            BillingPeriod.MONTHLY,
            BillingPeriod.fromProductId("media.enflame.happy.android.pro.monthly")
        )
    }

    @Test
    fun `BillingPeriod fromProductId returns ANNUAL for annual products`() {
        assertEquals(
            BillingPeriod.ANNUAL,
            BillingPeriod.fromProductId("media.enflame.happy.android.pro.annual")
        )
    }

    @Test
    fun `BillingPeriod fromProductId defaults to MONTHLY`() {
        assertEquals(BillingPeriod.MONTHLY, BillingPeriod.fromProductId("unknown"))
        assertEquals(BillingPeriod.MONTHLY, BillingPeriod.fromProductId(""))
    }

    @Test
    fun `BillingPeriod has correct display names`() {
        assertEquals("Monthly", BillingPeriod.MONTHLY.displayName)
        assertEquals("Annual", BillingPeriod.ANNUAL.displayName)
    }

    // --- SubscriptionStatus ---

    @Test
    fun `SubscriptionStatus isActive returns true for Subscribed`() {
        val info = createSampleInfo()
        assertTrue(SubscriptionStatus.Subscribed(info).isActive)
    }

    @Test
    fun `SubscriptionStatus isActive returns false for other states`() {
        assertFalse(SubscriptionStatus.NotSubscribed.isActive)
        assertFalse(SubscriptionStatus.Loading.isActive)
        assertFalse(SubscriptionStatus.Revoked.isActive)
        assertFalse(SubscriptionStatus.Error("test").isActive)
        assertFalse(SubscriptionStatus.Expired(createSampleInfo()).isActive)
    }

    @Test
    fun `SubscriptionStatus currentTier returns tier for Subscribed`() {
        val info = createSampleInfo(tier = SubscriptionTier.PRO)
        assertEquals(SubscriptionTier.PRO, SubscriptionStatus.Subscribed(info).currentTier)
    }

    @Test
    fun `SubscriptionStatus currentTier returns tier for Expired`() {
        val info = createSampleInfo(tier = SubscriptionTier.TEAM)
        assertEquals(SubscriptionTier.TEAM, SubscriptionStatus.Expired(info).currentTier)
    }

    @Test
    fun `SubscriptionStatus currentTier returns null for other states`() {
        assertNull(SubscriptionStatus.NotSubscribed.currentTier)
        assertNull(SubscriptionStatus.Loading.currentTier)
        assertNull(SubscriptionStatus.Revoked.currentTier)
        assertNull(SubscriptionStatus.Error("test").currentTier)
    }

    // --- SubscriptionInfo ---

    @Test
    fun `SubscriptionInfo isInGracePeriod returns true when expired with auto-renew`() {
        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis() - 86400000L * 30,
            expiryTimeMillis = System.currentTimeMillis() - 86400000L, // Expired yesterday
            willAutoRenew = true,
            billingPeriod = BillingPeriod.MONTHLY
        )
        assertTrue(info.isInGracePeriod)
    }

    @Test
    fun `SubscriptionInfo isInGracePeriod returns false when expired without auto-renew`() {
        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis() - 86400000L * 30,
            expiryTimeMillis = System.currentTimeMillis() - 86400000L,
            willAutoRenew = false,
            billingPeriod = BillingPeriod.MONTHLY
        )
        assertFalse(info.isInGracePeriod)
    }

    @Test
    fun `SubscriptionInfo isInGracePeriod returns false when not expired`() {
        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis(),
            expiryTimeMillis = System.currentTimeMillis() + 86400000L * 30,
            willAutoRenew = true,
            billingPeriod = BillingPeriod.MONTHLY
        )
        assertFalse(info.isInGracePeriod)
    }

    @Test
    fun `SubscriptionInfo isInGracePeriod returns false when no expiry`() {
        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis(),
            expiryTimeMillis = null,
            willAutoRenew = true,
            billingPeriod = BillingPeriod.MONTHLY
        )
        assertFalse(info.isInGracePeriod)
    }

    @Test
    fun `SubscriptionInfo daysRemaining returns correct days`() {
        val thirtyDaysFromNow = System.currentTimeMillis() + 86400000L * 30
        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis(),
            expiryTimeMillis = thirtyDaysFromNow,
            willAutoRenew = true,
            billingPeriod = BillingPeriod.MONTHLY
        )
        // Should be approximately 30 days (29 or 30 depending on timing)
        val days = info.daysRemaining
        assertTrue(days != null && days in 29..30)
    }

    @Test
    fun `SubscriptionInfo daysRemaining returns 0 for expired`() {
        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis() - 86400000L * 60,
            expiryTimeMillis = System.currentTimeMillis() - 86400000L,
            willAutoRenew = false,
            billingPeriod = BillingPeriod.MONTHLY
        )
        assertEquals(0, info.daysRemaining)
    }

    @Test
    fun `SubscriptionInfo daysRemaining returns null when no expiry`() {
        val info = SubscriptionInfo(
            tier = SubscriptionTier.PRO,
            productId = "pro.monthly",
            purchaseTimeMillis = System.currentTimeMillis(),
            expiryTimeMillis = null,
            willAutoRenew = true,
            billingPeriod = BillingPeriod.MONTHLY
        )
        assertNull(info.daysRemaining)
    }

    // --- PurchaseResult ---

    @Test
    fun `PurchaseResult Success is correct type`() {
        val result: PurchaseResult = PurchaseResult.Success
        assertTrue(result is PurchaseResult.Success)
    }

    @Test
    fun `PurchaseResult Cancelled is correct type`() {
        val result: PurchaseResult = PurchaseResult.Cancelled
        assertTrue(result is PurchaseResult.Cancelled)
    }

    @Test
    fun `PurchaseResult Pending is correct type`() {
        val result: PurchaseResult = PurchaseResult.Pending
        assertTrue(result is PurchaseResult.Pending)
    }

    @Test
    fun `PurchaseResult Failed carries message`() {
        val result = PurchaseResult.Failed("Test error")
        assertEquals("Test error", result.message)
    }

    @Test
    fun `PurchaseResult BillingError carries code and message`() {
        val result = PurchaseResult.BillingError(3, "Billing unavailable")
        assertEquals(3, result.responseCode)
        assertEquals("Billing unavailable", result.debugMessage)
    }

    // --- ProductIdentifiers ---

    @Test
    fun `ProductIdentifiers has correct prefix`() {
        assertEquals("media.enflame.happy.android", ProductIdentifiers.PREFIX)
    }

    @Test
    fun `ProductIdentifiers has correct product IDs`() {
        assertEquals(
            "media.enflame.happy.android.pro.monthly",
            ProductIdentifiers.PRO_MONTHLY
        )
        assertEquals(
            "media.enflame.happy.android.pro.annual",
            ProductIdentifiers.PRO_ANNUAL
        )
        assertEquals(
            "media.enflame.happy.android.team.monthly",
            ProductIdentifiers.TEAM_MONTHLY
        )
        assertEquals(
            "media.enflame.happy.android.team.annual",
            ProductIdentifiers.TEAM_ANNUAL
        )
    }

    @Test
    fun `ProductIdentifiers ALL_SUBSCRIPTIONS contains all four products`() {
        assertEquals(4, ProductIdentifiers.ALL_SUBSCRIPTIONS.size)
        assertTrue(ProductIdentifiers.ALL_SUBSCRIPTIONS.contains(ProductIdentifiers.PRO_MONTHLY))
        assertTrue(ProductIdentifiers.ALL_SUBSCRIPTIONS.contains(ProductIdentifiers.PRO_ANNUAL))
        assertTrue(ProductIdentifiers.ALL_SUBSCRIPTIONS.contains(ProductIdentifiers.TEAM_MONTHLY))
        assertTrue(ProductIdentifiers.ALL_SUBSCRIPTIONS.contains(ProductIdentifiers.TEAM_ANNUAL))
    }

    // --- SubscriptionPlan ---

    @Test
    fun `SubscriptionPlan data class holds values correctly`() {
        val plan = SubscriptionPlan(
            id = "test.pro.monthly",
            tier = SubscriptionTier.PRO,
            billingPeriod = BillingPeriod.MONTHLY,
            displayPrice = "$9.99",
            priceMicros = 9990000L,
            currencyCode = "USD",
            features = listOf(PlanFeature(title = "Feature 1")),
            isRecommended = true,
            offerToken = "token"
        )

        assertEquals("test.pro.monthly", plan.id)
        assertEquals(SubscriptionTier.PRO, plan.tier)
        assertEquals(BillingPeriod.MONTHLY, plan.billingPeriod)
        assertEquals("$9.99", plan.displayPrice)
        assertEquals(9990000L, plan.priceMicros)
        assertEquals("USD", plan.currencyCode)
        assertEquals(1, plan.features.size)
        assertTrue(plan.isRecommended)
        assertEquals("token", plan.offerToken)
    }

    @Test
    fun `PlanFeature has default icon name`() {
        val feature = PlanFeature(title = "Test feature")
        assertEquals("check_circle", feature.iconName)
    }

    // --- Helpers ---

    private fun createSampleInfo(
        tier: SubscriptionTier = SubscriptionTier.PRO
    ): SubscriptionInfo {
        return SubscriptionInfo(
            tier = tier,
            productId = "test.${tier.name.lowercase()}.monthly",
            purchaseTimeMillis = System.currentTimeMillis(),
            billingPeriod = BillingPeriod.MONTHLY
        )
    }
}
