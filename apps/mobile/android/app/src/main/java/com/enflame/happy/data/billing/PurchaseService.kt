package com.enflame.happy.data.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.enflame.happy.domain.model.BillingPeriod
import com.enflame.happy.domain.model.PlanFeature
import com.enflame.happy.domain.model.ProductIdentifiers
import com.enflame.happy.domain.model.PurchaseResult
import com.enflame.happy.domain.model.SubscriptionInfo
import com.enflame.happy.domain.model.SubscriptionPlan
import com.enflame.happy.domain.model.SubscriptionStatus
import com.enflame.happy.domain.model.SubscriptionTier
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

/**
 * Service managing Google Play Billing for in-app subscriptions.
 *
 * Handles the full lifecycle of the billing client including connection,
 * product queries, purchase flows, acknowledgment, and subscription
 * status tracking. This is the Android counterpart to the iOS
 * `PurchaseService` (StoreKit 2).
 *
 * Key responsibilities:
 * - Connect to and disconnect from the Google Play Billing service
 * - Query available subscription products and convert to domain models
 * - Launch the purchase flow via an Activity
 * - Acknowledge purchases (required within 3 days to prevent refund)
 * - Track and refresh the current subscription status
 * - Restore previously purchased subscriptions
 *
 * All state is exposed via [StateFlow]s for reactive UI consumption.
 */
@Singleton
class PurchaseService @Inject constructor(
    @ApplicationContext private val context: Context
) {

    // MARK: - Public State

    private val _subscriptionStatus = MutableStateFlow<SubscriptionStatus>(SubscriptionStatus.Loading)

    /** The current subscription status. */
    val subscriptionStatus: StateFlow<SubscriptionStatus> = _subscriptionStatus.asStateFlow()

    private val _availablePlans = MutableStateFlow<List<SubscriptionPlan>>(emptyList())

    /** Available subscription plans loaded from Google Play. */
    val availablePlans: StateFlow<List<SubscriptionPlan>> = _availablePlans.asStateFlow()

    private val _isPurchasing = MutableStateFlow(false)

    /** Whether a purchase is currently in progress. */
    val isPurchasing: StateFlow<Boolean> = _isPurchasing.asStateFlow()

    private val _isConnected = MutableStateFlow(false)

    /** Whether the billing client is connected to Google Play. */
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    // MARK: - Private State

    /** Cached product details keyed by product ID. */
    private var productDetailsMap: Map<String, ProductDetails> = emptyMap()

    /** Callback for the current purchase flow result. */
    private var purchaseResultCallback: ((PurchaseResult) -> Unit)? = null

    // MARK: - Billing Client

    private val purchasesUpdatedListener = PurchasesUpdatedListener { billingResult, purchases ->
        handlePurchaseResult(billingResult, purchases)
    }

    private val billingClient: BillingClient = BillingClient.newBuilder(context)
        .setListener(purchasesUpdatedListener)
        .enablePendingPurchases()
        .build()

    // MARK: - Connection

    /**
     * Connects to the Google Play Billing service.
     *
     * This must be called before any billing operations. The connection
     * is maintained as a singleton and will retry on disconnection.
     *
     * @return `true` if the connection was established successfully.
     */
    suspend fun connect(): Boolean = suspendCancellableCoroutine { continuation ->
        if (billingClient.isReady) {
            _isConnected.value = true
            continuation.resume(true)
            return@suspendCancellableCoroutine
        }

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                val success = billingResult.responseCode == BillingClient.BillingResponseCode.OK
                _isConnected.value = success

                if (success) {
                    Log.d(TAG, "Billing client connected")
                } else {
                    Log.e(
                        TAG,
                        "Billing setup failed: ${billingResult.responseCode} - ${billingResult.debugMessage}"
                    )
                }

                if (continuation.isActive) {
                    continuation.resume(success)
                }
            }

            override fun onBillingServiceDisconnected() {
                _isConnected.value = false
                Log.w(TAG, "Billing service disconnected")
            }
        })
    }

    /**
     * Disconnects from the Google Play Billing service.
     *
     * Should be called when the billing service is no longer needed
     * to release resources.
     */
    fun disconnect() {
        billingClient.endConnection()
        _isConnected.value = false
        Log.d(TAG, "Billing client disconnected")
    }

    // MARK: - Query Products

    /**
     * Queries available subscription products from Google Play.
     *
     * Fetches product details for all known subscription identifiers
     * and converts them into [SubscriptionPlan] domain models with
     * localized pricing from the Play Store.
     *
     * @return `true` if products were loaded successfully.
     */
    suspend fun queryProducts(): Boolean {
        if (!ensureConnected()) return false

        val productList = ProductIdentifiers.ALL_SUBSCRIPTIONS.map { productId ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        }

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        val result = suspendCancellableCoroutine { continuation ->
            billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
                if (continuation.isActive) {
                    continuation.resume(Pair(billingResult, productDetailsList))
                }
            }
        }

        val (billingResult, productDetailsList) = result

        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "Failed to query products: ${billingResult.debugMessage}")
            return false
        }

        if (productDetailsList.isEmpty()) {
            Log.w(TAG, "No subscription products found")
            return false
        }

        // Cache product details
        productDetailsMap = productDetailsList.associateBy { it.productId }

        // Convert to domain models
        val plans = productDetailsList.mapNotNull { details ->
            convertToSubscriptionPlan(details)
        }.sortedWith(compareBy<SubscriptionPlan> { plan ->
            // Pro before Team
            when (plan.tier) {
                SubscriptionTier.PRO -> 0
                SubscriptionTier.TEAM -> 1
                SubscriptionTier.FREE -> 2
            }
        }.thenBy { plan ->
            // Monthly before Annual
            when (plan.billingPeriod) {
                BillingPeriod.MONTHLY -> 0
                BillingPeriod.ANNUAL -> 1
            }
        })

        _availablePlans.value = plans
        Log.d(TAG, "Loaded ${plans.size} subscription plans")
        return true
    }

    // MARK: - Purchase

    /**
     * Launches the purchase flow for a subscription plan.
     *
     * This presents the Google Play purchase dialog to the user.
     * The result is returned asynchronously via the [PurchaseResult].
     *
     * @param activity The activity to launch the purchase flow from.
     * @param plan The subscription plan to purchase.
     * @return The result of the purchase attempt.
     */
    suspend fun purchase(activity: Activity, plan: SubscriptionPlan): PurchaseResult {
        if (!ensureConnected()) {
            return PurchaseResult.Failed("Billing service not connected")
        }

        val productDetails = productDetailsMap[plan.id]
            ?: return PurchaseResult.Failed("Product not found: ${plan.id}")

        // Find the matching offer (subscription plans have offers with pricing phases)
        val offerToken = plan.offerToken.ifEmpty {
            productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
        } ?: return PurchaseResult.Failed("No offer available for product: ${plan.id}")

        val productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(productDetails)
            .setOfferToken(offerToken)
            .build()

        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productDetailsParams))
            .build()

        _isPurchasing.value = true

        return suspendCancellableCoroutine { continuation ->
            purchaseResultCallback = { result ->
                _isPurchasing.value = false
                if (continuation.isActive) {
                    continuation.resume(result)
                }
            }

            val billingResult = billingClient.launchBillingFlow(activity, billingFlowParams)

            if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                _isPurchasing.value = false
                purchaseResultCallback = null
                if (continuation.isActive) {
                    continuation.resume(
                        PurchaseResult.BillingError(
                            billingResult.responseCode,
                            billingResult.debugMessage
                        )
                    )
                }
            }
        }
    }

    // MARK: - Restore Purchases

    /**
     * Restores previously purchased subscriptions.
     *
     * Queries Google Play for active subscriptions and updates
     * the subscription status accordingly.
     *
     * @return `true` if restore completed successfully.
     */
    suspend fun restorePurchases(): Boolean {
        if (!ensureConnected()) return false

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        val result = suspendCancellableCoroutine { continuation ->
            billingClient.queryPurchasesAsync(params) { billingResult, purchases ->
                if (continuation.isActive) {
                    continuation.resume(Pair(billingResult, purchases))
                }
            }
        }

        val (billingResult, purchases) = result

        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "Failed to restore purchases: ${billingResult.debugMessage}")
            return false
        }

        processPurchases(purchases)
        return true
    }

    // MARK: - Subscription Status

    /**
     * Refreshes the current subscription status by querying Google Play.
     *
     * Checks for active subscriptions and updates the status flow.
     */
    suspend fun refreshSubscriptionStatus() {
        if (!ensureConnected()) {
            _subscriptionStatus.value = SubscriptionStatus.NotSubscribed
            return
        }

        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        val result = suspendCancellableCoroutine { continuation ->
            billingClient.queryPurchasesAsync(params) { billingResult, purchases ->
                if (continuation.isActive) {
                    continuation.resume(Pair(billingResult, purchases))
                }
            }
        }

        val (billingResult, purchases) = result

        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            Log.e(TAG, "Failed to query subscription status: ${billingResult.debugMessage}")
            _subscriptionStatus.value = SubscriptionStatus.Error(
                "Failed to check subscription: ${billingResult.debugMessage}"
            )
            return
        }

        updateSubscriptionStatus(purchases)
    }

    // MARK: - Private Helpers

    /**
     * Ensures the billing client is connected, attempting to connect if not.
     */
    private suspend fun ensureConnected(): Boolean {
        if (billingClient.isReady) return true
        return connect()
    }

    /**
     * Handles purchase results from the [PurchasesUpdatedListener].
     */
    private fun handlePurchaseResult(billingResult: BillingResult, purchases: List<Purchase>?) {
        val result = when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                if (purchases != null && purchases.isNotEmpty()) {
                    // Acknowledge purchases and update status
                    processPurchasesSync(purchases)
                    PurchaseResult.Success
                } else {
                    PurchaseResult.Failed("No purchases returned")
                }
            }

            BillingClient.BillingResponseCode.USER_CANCELED -> {
                PurchaseResult.Cancelled
            }

            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                // User already has this subscription
                PurchaseResult.Success
            }

            BillingClient.BillingResponseCode.DEVELOPER_ERROR -> {
                Log.e(TAG, "Developer error in billing: ${billingResult.debugMessage}")
                PurchaseResult.BillingError(
                    billingResult.responseCode,
                    billingResult.debugMessage
                )
            }

            BillingClient.BillingResponseCode.NETWORK_ERROR,
            BillingClient.BillingResponseCode.SERVICE_UNAVAILABLE,
            BillingClient.BillingResponseCode.SERVICE_DISCONNECTED -> {
                _isConnected.value = false
                PurchaseResult.BillingError(
                    billingResult.responseCode,
                    billingResult.debugMessage
                )
            }

            BillingClient.BillingResponseCode.BILLING_UNAVAILABLE -> {
                PurchaseResult.BillingError(
                    billingResult.responseCode,
                    "Billing is not available on this device"
                )
            }

            BillingClient.BillingResponseCode.ITEM_UNAVAILABLE -> {
                PurchaseResult.Failed("This subscription is not available")
            }

            BillingClient.BillingResponseCode.FEATURE_NOT_SUPPORTED -> {
                PurchaseResult.Failed("Subscriptions are not supported on this device")
            }

            BillingClient.BillingResponseCode.ITEM_NOT_OWNED -> {
                PurchaseResult.Failed("Item not owned")
            }

            BillingClient.BillingResponseCode.ERROR -> {
                PurchaseResult.BillingError(
                    billingResult.responseCode,
                    billingResult.debugMessage
                )
            }

            else -> {
                PurchaseResult.BillingError(
                    billingResult.responseCode,
                    "Unknown billing error: ${billingResult.debugMessage}"
                )
            }
        }

        purchaseResultCallback?.invoke(result)
        purchaseResultCallback = null
    }

    /**
     * Processes purchases synchronously (called from listener callback).
     * Acknowledges any unacknowledged purchases.
     */
    private fun processPurchasesSync(purchases: List<Purchase>) {
        for (purchase in purchases) {
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
                !purchase.isAcknowledged
            ) {
                acknowledgePurchase(purchase)
            }
        }
    }

    /**
     * Processes purchases from a query result (async context).
     * Acknowledges unacknowledged purchases and updates status.
     */
    private fun processPurchases(purchases: List<Purchase>) {
        for (purchase in purchases) {
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED &&
                !purchase.isAcknowledged
            ) {
                acknowledgePurchase(purchase)
            }
        }
        updateSubscriptionStatus(purchases)
    }

    /**
     * Acknowledges a purchase to prevent automatic refund.
     *
     * Purchases must be acknowledged within 3 days or Google Play
     * will automatically refund them.
     */
    private fun acknowledgePurchase(purchase: Purchase) {
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()

        billingClient.acknowledgePurchase(params) { billingResult ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged: ${purchase.orderId}")
            } else {
                Log.e(
                    TAG,
                    "Failed to acknowledge purchase: ${billingResult.responseCode} - ${billingResult.debugMessage}"
                )
            }
        }
    }

    /**
     * Updates the subscription status based on current purchases.
     */
    private fun updateSubscriptionStatus(purchases: List<Purchase>) {
        // Find the most recent active subscription
        val activePurchase = purchases
            .filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
            .maxByOrNull { it.purchaseTime }

        if (activePurchase != null) {
            val productId = activePurchase.products.firstOrNull() ?: ""
            val tier = SubscriptionTier.fromProductId(productId)
            val billingPeriod = BillingPeriod.fromProductId(productId)

            val info = SubscriptionInfo(
                tier = tier,
                productId = productId,
                purchaseTimeMillis = activePurchase.purchaseTime,
                expiryTimeMillis = null, // Expiry not directly available from Purchase object
                willAutoRenew = activePurchase.isAutoRenewing,
                billingPeriod = billingPeriod
            )

            _subscriptionStatus.value = if (activePurchase.isAutoRenewing ||
                activePurchase.purchaseState == Purchase.PurchaseState.PURCHASED
            ) {
                SubscriptionStatus.Subscribed(info)
            } else {
                SubscriptionStatus.Expired(info)
            }
        } else {
            // Check for pending purchases
            val pendingPurchase = purchases.firstOrNull {
                it.purchaseState == Purchase.PurchaseState.PENDING
            }

            if (pendingPurchase != null) {
                Log.d(TAG, "Pending purchase found")
                _subscriptionStatus.value = SubscriptionStatus.NotSubscribed
            } else {
                _subscriptionStatus.value = SubscriptionStatus.NotSubscribed
            }
        }

        Log.d(TAG, "Subscription status updated: ${_subscriptionStatus.value}")
    }

    /**
     * Converts a [ProductDetails] to a [SubscriptionPlan] domain model.
     *
     * Extracts pricing from the first subscription offer's base plan
     * pricing phase.
     */
    private fun convertToSubscriptionPlan(productDetails: ProductDetails): SubscriptionPlan? {
        val subscriptionOfferDetails = productDetails.subscriptionOfferDetails ?: return null
        val offer = subscriptionOfferDetails.firstOrNull() ?: return null
        val pricingPhase = offer.pricingPhases.pricingPhaseList.firstOrNull() ?: return null

        val productId = productDetails.productId
        val tier = SubscriptionTier.fromProductId(productId)
        val billingPeriod = BillingPeriod.fromProductId(productId)

        return SubscriptionPlan(
            id = productId,
            tier = tier,
            billingPeriod = billingPeriod,
            displayPrice = pricingPhase.formattedPrice,
            priceMicros = pricingPhase.priceAmountMicros,
            currencyCode = pricingPhase.priceCurrencyCode,
            features = getFeaturesForTier(tier),
            isRecommended = productId == ProductIdentifiers.PRO_MONTHLY,
            offerToken = offer.offerToken
        )
    }

    companion object {
        private const val TAG = "PurchaseService"

        /**
         * Returns the features for a given subscription tier.
         *
         * Mirrors the iOS `PurchaseService.features(for:)` method.
         *
         * @param tier The subscription tier.
         * @return List of [PlanFeature] for the tier.
         */
        fun getFeaturesForTier(tier: SubscriptionTier): List<PlanFeature> {
            return when (tier) {
                SubscriptionTier.FREE -> listOf(
                    PlanFeature(title = "Basic access", iconName = "person"),
                    PlanFeature(title = "Single device", iconName = "phone_android"),
                    PlanFeature(title = "Limited sessions", iconName = "schedule")
                )

                SubscriptionTier.PRO -> listOf(
                    PlanFeature(title = "Unlimited sessions", iconName = "all_inclusive"),
                    PlanFeature(title = "Multiple devices", iconName = "devices"),
                    PlanFeature(title = "Priority support", iconName = "star"),
                    PlanFeature(title = "Advanced analytics", iconName = "bar_chart")
                )

                SubscriptionTier.TEAM -> listOf(
                    PlanFeature(title = "Everything in Pro", iconName = "verified"),
                    PlanFeature(title = "Team management", iconName = "groups"),
                    PlanFeature(title = "Shared sessions", iconName = "share"),
                    PlanFeature(title = "Admin controls", iconName = "admin_panel_settings"),
                    PlanFeature(title = "Dedicated support", iconName = "headset_mic")
                )
            }
        }
    }
}
