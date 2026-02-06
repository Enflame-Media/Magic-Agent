package com.enflame.happy.domain.model

/**
 * Subscription tier defining the level of access.
 *
 * Mirrors the iOS `SubscriptionTier` enum for cross-platform parity.
 */
enum class SubscriptionTier(val displayName: String, val description: String) {
    FREE("Free", "Basic access with limited features"),
    PRO("Pro", "Full access with unlimited sessions"),
    TEAM("Team", "Everything in Pro plus team management");

    companion object {
        /**
         * Determine the tier for a given product identifier.
         *
         * @param productId The Google Play product identifier.
         * @return The [SubscriptionTier] for the product.
         */
        fun fromProductId(productId: String): SubscriptionTier {
            return when {
                productId.contains("team") -> TEAM
                productId.contains("pro") -> PRO
                else -> FREE
            }
        }
    }
}

/**
 * Billing period for a subscription plan.
 */
enum class BillingPeriod(val displayName: String) {
    MONTHLY("Monthly"),
    ANNUAL("Annual");

    companion object {
        /**
         * Determine the billing period from a product identifier.
         *
         * @param productId The Google Play product identifier.
         * @return The [BillingPeriod] for the product.
         */
        fun fromProductId(productId: String): BillingPeriod {
            return if (productId.contains("annual")) ANNUAL else MONTHLY
        }
    }
}

/**
 * A feature included in a subscription plan.
 *
 * @property title Human-readable feature title.
 * @property iconName Material icon name for display.
 */
data class PlanFeature(
    val title: String,
    val iconName: String = "check_circle"
)

/**
 * Represents a subscription plan available for purchase.
 *
 * @property id The Google Play product identifier.
 * @property tier The subscription tier.
 * @property billingPeriod The billing period.
 * @property displayPrice Formatted price string from Google Play (e.g., "$9.99/mo").
 * @property priceMicros Price in micro-units (e.g., 9990000 for $9.99).
 * @property currencyCode ISO 4217 currency code (e.g., "USD").
 * @property features List of features included in this plan.
 * @property isRecommended Whether this plan is the recommended option.
 * @property offerToken The offer token required for launching the purchase flow.
 */
data class SubscriptionPlan(
    val id: String,
    val tier: SubscriptionTier,
    val billingPeriod: BillingPeriod,
    val displayPrice: String,
    val priceMicros: Long = 0L,
    val currencyCode: String = "USD",
    val features: List<PlanFeature> = emptyList(),
    val isRecommended: Boolean = false,
    val offerToken: String = ""
)

/**
 * Current subscription status for the user.
 *
 * Sealed class mirroring iOS `SubscriptionStatus` for cross-platform parity.
 */
sealed class SubscriptionStatus {
    /** Products/status have not been loaded yet. */
    data object Loading : SubscriptionStatus()

    /** No active subscription found. */
    data object NotSubscribed : SubscriptionStatus()

    /** User has an active subscription. */
    data class Subscribed(val info: SubscriptionInfo) : SubscriptionStatus()

    /** Subscription has expired. */
    data class Expired(val info: SubscriptionInfo) : SubscriptionStatus()

    /** Subscription was revoked (e.g., refund). */
    data object Revoked : SubscriptionStatus()

    /** An error occurred loading subscription status. */
    data class Error(val message: String) : SubscriptionStatus()

    /** Whether the user has an active subscription. */
    val isActive: Boolean
        get() = this is Subscribed

    /** The current tier, if subscribed or expired. */
    val currentTier: SubscriptionTier?
        get() = when (this) {
            is Subscribed -> info.tier
            is Expired -> info.tier
            else -> null
        }
}

/**
 * Detailed information about an active or expired subscription.
 *
 * @property tier The subscription tier.
 * @property productId The Google Play product identifier.
 * @property purchaseTimeMillis When the subscription was originally purchased (epoch millis).
 * @property expiryTimeMillis When the current subscription period expires (epoch millis), or null.
 * @property willAutoRenew Whether the subscription will auto-renew.
 * @property billingPeriod The billing period.
 */
data class SubscriptionInfo(
    val tier: SubscriptionTier,
    val productId: String,
    val purchaseTimeMillis: Long,
    val expiryTimeMillis: Long? = null,
    val willAutoRenew: Boolean = true,
    val billingPeriod: BillingPeriod
) {
    /** Whether the subscription is in a grace period (expired but auto-renew on). */
    val isInGracePeriod: Boolean
        get() {
            val expiry = expiryTimeMillis ?: return false
            return expiry < System.currentTimeMillis() && willAutoRenew
        }

    /** Days remaining in the current subscription period, or null if no expiry. */
    val daysRemaining: Int?
        get() {
            val expiry = expiryTimeMillis ?: return null
            val remainingMs = expiry - System.currentTimeMillis()
            return maxOf(0, (remainingMs / (1000 * 60 * 60 * 24)).toInt())
        }
}

/**
 * Result of a purchase attempt.
 */
sealed class PurchaseResult {
    /** Purchase completed successfully. */
    data object Success : PurchaseResult()

    /** Purchase was cancelled by the user. */
    data object Cancelled : PurchaseResult()

    /** Purchase is pending (e.g., awaiting parent approval). */
    data object Pending : PurchaseResult()

    /** Purchase failed with an error. */
    data class Failed(val message: String) : PurchaseResult()

    /** A billing error occurred. */
    data class BillingError(val responseCode: Int, val debugMessage: String) : PurchaseResult()
}

/**
 * Google Play product identifiers for Happy subscriptions.
 */
object ProductIdentifiers {
    /** Base prefix for all product identifiers. */
    const val PREFIX = "media.enflame.happy.android"

    /** Monthly Pro subscription. */
    const val PRO_MONTHLY = "${PREFIX}.pro.monthly"

    /** Annual Pro subscription. */
    const val PRO_ANNUAL = "${PREFIX}.pro.annual"

    /** Monthly Team subscription. */
    const val TEAM_MONTHLY = "${PREFIX}.team.monthly"

    /** Annual Team subscription. */
    const val TEAM_ANNUAL = "${PREFIX}.team.annual"

    /** All subscription product identifiers. */
    val ALL_SUBSCRIPTIONS = listOf(
        PRO_MONTHLY,
        PRO_ANNUAL,
        TEAM_MONTHLY,
        TEAM_ANNUAL
    )
}
