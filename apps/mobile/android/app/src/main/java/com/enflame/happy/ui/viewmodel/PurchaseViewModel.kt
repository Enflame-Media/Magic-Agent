package com.enflame.happy.ui.viewmodel

import android.app.Activity
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.billing.PurchaseService
import com.enflame.happy.domain.model.BillingPeriod
import com.enflame.happy.domain.model.PurchaseResult
import com.enflame.happy.domain.model.SubscriptionPlan
import com.enflame.happy.domain.model.SubscriptionStatus
import com.enflame.happy.domain.model.SubscriptionTier
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the paywall and subscription screens.
 *
 * @property availablePlans All available subscription plans from Google Play.
 * @property filteredPlans Plans filtered by the selected billing period.
 * @property subscriptionStatus The current subscription status.
 * @property selectedBillingPeriod The currently selected billing period filter.
 * @property isPurchasing Whether a purchase is in progress.
 * @property isLoading Whether products are being loaded.
 * @property isRestoring Whether a restore is in progress.
 * @property showPurchaseSuccess Whether to show the purchase success dialog.
 * @property showRestoreSuccess Whether to show the restore success dialog.
 * @property errorMessage Error message to display, or null.
 */
data class PurchaseUiState(
    val availablePlans: List<SubscriptionPlan> = emptyList(),
    val filteredPlans: List<SubscriptionPlan> = emptyList(),
    val subscriptionStatus: SubscriptionStatus = SubscriptionStatus.Loading,
    val selectedBillingPeriod: BillingPeriod = BillingPeriod.MONTHLY,
    val isPurchasing: Boolean = false,
    val isLoading: Boolean = true,
    val isRestoring: Boolean = false,
    val showPurchaseSuccess: Boolean = false,
    val showRestoreSuccess: Boolean = false,
    val errorMessage: String? = null
) {
    /** Whether the user currently has an active subscription. */
    val isSubscribed: Boolean
        get() = subscriptionStatus.isActive

    /** The current subscription tier, or null if not subscribed. */
    val currentTier: SubscriptionTier?
        get() = subscriptionStatus.currentTier
}

/**
 * ViewModel managing billing state for the paywall and subscription screens.
 *
 * Coordinates between the [PurchaseService] and the UI, providing reactive
 * state updates for available plans, purchase progress, and subscription
 * status. Follows the same patterns as [SettingsViewModel] for state management.
 *
 * Usage:
 * ```kotlin
 * val purchaseViewModel: PurchaseViewModel = hiltViewModel()
 *
 * // In composable
 * val uiState by purchaseViewModel.uiState.collectAsState()
 * ```
 */
@HiltViewModel
class PurchaseViewModel @Inject constructor(
    private val purchaseService: PurchaseService
) : ViewModel() {

    private val _selectedBillingPeriod = MutableStateFlow(BillingPeriod.MONTHLY)
    private val _isLoading = MutableStateFlow(true)
    private val _isRestoring = MutableStateFlow(false)
    private val _showPurchaseSuccess = MutableStateFlow(false)
    private val _showRestoreSuccess = MutableStateFlow(false)
    private val _errorMessage = MutableStateFlow<String?>(null)

    /**
     * Combined UI state derived from purchase service flows and local state.
     */
    val uiState: StateFlow<PurchaseUiState> = combine(
        purchaseService.availablePlans,
        purchaseService.subscriptionStatus,
        purchaseService.isPurchasing,
        _selectedBillingPeriod,
        _isLoading
    ) { plans, status, isPurchasing, period, isLoading ->
        PurchaseUiState(
            availablePlans = plans,
            filteredPlans = plans.filter { it.billingPeriod == period },
            subscriptionStatus = status,
            selectedBillingPeriod = period,
            isPurchasing = isPurchasing,
            isLoading = isLoading && plans.isEmpty(),
            isRestoring = _isRestoring.value,
            showPurchaseSuccess = _showPurchaseSuccess.value,
            showRestoreSuccess = _showRestoreSuccess.value,
            errorMessage = _errorMessage.value
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = PurchaseUiState()
    )

    init {
        connectAndLoadProducts()
    }

    // MARK: - Public Actions

    /**
     * Loads available products from Google Play.
     *
     * Connects to the billing service if needed, queries products,
     * and refreshes the current subscription status.
     */
    fun loadProducts() {
        connectAndLoadProducts()
    }

    /**
     * Purchases a subscription plan.
     *
     * Launches the Google Play purchase flow. The activity is required
     * to display the purchase dialog.
     *
     * @param activity The current activity for the purchase flow.
     * @param plan The subscription plan to purchase.
     */
    fun purchase(activity: Activity, plan: SubscriptionPlan) {
        viewModelScope.launch {
            _errorMessage.value = null

            when (val result = purchaseService.purchase(activity, plan)) {
                is PurchaseResult.Success -> {
                    _showPurchaseSuccess.value = true
                    purchaseService.refreshSubscriptionStatus()
                    Log.d(TAG, "Purchase successful for ${plan.id}")
                }

                is PurchaseResult.Cancelled -> {
                    Log.d(TAG, "Purchase cancelled by user")
                    // No error shown for user cancellation
                }

                is PurchaseResult.Pending -> {
                    _errorMessage.value = "Purchase is pending approval"
                    Log.d(TAG, "Purchase pending for ${plan.id}")
                }

                is PurchaseResult.Failed -> {
                    _errorMessage.value = result.message
                    Log.e(TAG, "Purchase failed: ${result.message}")
                }

                is PurchaseResult.BillingError -> {
                    _errorMessage.value = "Billing error: ${result.debugMessage}"
                    Log.e(TAG, "Billing error ${result.responseCode}: ${result.debugMessage}")
                }
            }
        }
    }

    /**
     * Restores previously purchased subscriptions.
     */
    fun restorePurchases() {
        viewModelScope.launch {
            _isRestoring.value = true
            _errorMessage.value = null

            try {
                val success = purchaseService.restorePurchases()
                if (success) {
                    val status = purchaseService.subscriptionStatus.value
                    if (status.isActive) {
                        _showRestoreSuccess.value = true
                    } else {
                        _errorMessage.value = "No active subscriptions found"
                    }
                } else {
                    _errorMessage.value = "Failed to restore purchases. Please try again."
                }
            } catch (e: Exception) {
                _errorMessage.value = "Error restoring purchases: ${e.localizedMessage}"
                Log.e(TAG, "Restore failed", e)
            } finally {
                _isRestoring.value = false
            }
        }
    }

    /**
     * Refreshes the current subscription status.
     */
    fun refreshStatus() {
        viewModelScope.launch {
            purchaseService.refreshSubscriptionStatus()
        }
    }

    /**
     * Changes the selected billing period filter.
     *
     * @param period The billing period to filter by.
     */
    fun selectBillingPeriod(period: BillingPeriod) {
        _selectedBillingPeriod.value = period
    }

    /**
     * Dismisses the purchase success dialog.
     */
    fun dismissPurchaseSuccess() {
        _showPurchaseSuccess.value = false
    }

    /**
     * Dismisses the restore success dialog.
     */
    fun dismissRestoreSuccess() {
        _showRestoreSuccess.value = false
    }

    /**
     * Dismisses the error message.
     */
    fun dismissError() {
        _errorMessage.value = null
    }

    // MARK: - Private

    /**
     * Connects to billing and loads products on initialization.
     */
    private fun connectAndLoadProducts() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val connected = purchaseService.connect()
                if (connected) {
                    purchaseService.queryProducts()
                    purchaseService.refreshSubscriptionStatus()
                } else {
                    _errorMessage.value = "Unable to connect to Google Play"
                }
            } catch (e: Exception) {
                _errorMessage.value = "Error loading products: ${e.localizedMessage}"
                Log.e(TAG, "Failed to load products", e)
            } finally {
                _isLoading.value = false
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        // Note: Don't disconnect here as the service is a singleton
        // and may be used by other ViewModels
    }

    companion object {
        private const val TAG = "PurchaseViewModel"
    }
}
