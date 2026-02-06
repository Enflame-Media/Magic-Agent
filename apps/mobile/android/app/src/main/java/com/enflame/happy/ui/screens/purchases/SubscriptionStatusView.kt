package com.enflame.happy.ui.screens.purchases

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.BillingPeriod
import com.enflame.happy.domain.model.SubscriptionInfo
import com.enflame.happy.domain.model.SubscriptionStatus
import com.enflame.happy.domain.model.SubscriptionTier
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.PurchaseUiState
import com.enflame.happy.ui.viewmodel.PurchaseViewModel
import java.text.DateFormat
import java.util.Date

/**
 * Subscription status screen displaying current plan and management options.
 *
 * Shows subscription details including tier, renewal date, and actions
 * for upgrading, restoring, or managing the subscription via Play Store.
 * This is the Android counterpart to the iOS `SubscriptionStatusView`.
 *
 * @param viewModel The [PurchaseViewModel] managing purchase state.
 * @param onNavigateBack Callback to navigate back.
 * @param onNavigateToPaywall Callback to navigate to the paywall screen.
 */
@Composable
fun SubscriptionStatusView(
    viewModel: PurchaseViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToPaywall: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    SubscriptionStatusContent(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onNavigateToPaywall = onNavigateToPaywall,
        onRestorePurchases = viewModel::restorePurchases,
        onRefresh = viewModel::refreshStatus,
        onDismissError = viewModel::dismissError
    )
}

/**
 * Stateless subscription status content.
 *
 * Extracted from [SubscriptionStatusView] for testability and previews.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionStatusContent(
    uiState: PurchaseUiState,
    onNavigateBack: () -> Unit = {},
    onNavigateToPaywall: () -> Unit = {},
    onRestorePurchases: () -> Unit = {},
    onRefresh: () -> Unit = {},
    onDismissError: () -> Unit = {}
) {
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.subscription_status_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = stringResource(R.string.subscription_refresh)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Current Plan Section
            CurrentPlanCard(subscriptionStatus = uiState.subscriptionStatus)

            // Subscription Details (when subscribed)
            val status = uiState.subscriptionStatus
            if (status is SubscriptionStatus.Subscribed) {
                SubscriptionDetailsCard(info = status.info)
            }

            // Expired Notice
            if (status is SubscriptionStatus.Expired) {
                ExpiredNoticeCard(
                    info = status.info,
                    onRenew = onNavigateToPaywall
                )
            }

            // Actions Section
            ActionsCard(
                isSubscribed = uiState.isSubscribed,
                isRestoring = uiState.isRestoring,
                onUpgrade = onNavigateToPaywall,
                onRestore = onRestorePurchases
            )

            // Manage Subscription
            ManageSubscriptionCard(
                onManage = {
                    // Open Google Play subscription management
                    val intent = Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://play.google.com/store/account/subscriptions")
                    )
                    context.startActivity(intent)
                }
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // Error dialog
    if (uiState.errorMessage != null) {
        AlertDialog(
            onDismissRequest = onDismissError,
            title = { Text(stringResource(R.string.error_generic)) },
            text = { Text(uiState.errorMessage) },
            confirmButton = {
                TextButton(onClick = onDismissError) {
                    Text(stringResource(R.string.ok))
                }
            }
        )
    }
}

// MARK: - Section Cards

/**
 * Card displaying the current plan tier and status badge.
 */
@Composable
private fun CurrentPlanCard(subscriptionStatus: SubscriptionStatus) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = getCurrentTierName(subscriptionStatus),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = getCurrentTierDescription(subscriptionStatus),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            StatusBadge(subscriptionStatus = subscriptionStatus)
        }
    }
}

/**
 * Card showing subscription details: billing period, dates, auto-renew.
 */
@Composable
private fun SubscriptionDetailsCard(info: SubscriptionInfo) {
    val dateFormat = DateFormat.getDateInstance(DateFormat.MEDIUM)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.subscription_details),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Billing period
            DetailRow(
                icon = Icons.Default.CalendarMonth,
                label = stringResource(R.string.subscription_billing_period),
                value = info.billingPeriod.displayName
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Purchase date
            DetailRow(
                icon = Icons.Default.ShoppingCart,
                label = stringResource(R.string.subscription_purchase_date),
                value = dateFormat.format(Date(info.purchaseTimeMillis))
            )

            // Expiry/renewal date
            if (info.expiryTimeMillis != null) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                DetailRow(
                    icon = Icons.Default.Refresh,
                    label = stringResource(R.string.subscription_renewal_date),
                    value = dateFormat.format(Date(info.expiryTimeMillis))
                )
            }

            // Days remaining
            val daysRemaining = info.daysRemaining
            if (daysRemaining != null) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                DetailRow(
                    icon = Icons.Default.Timer,
                    label = stringResource(R.string.subscription_days_remaining),
                    value = "$daysRemaining",
                    valueColor = if (daysRemaining <= 7) {
                        MaterialTheme.colorScheme.error
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            // Auto-renew status
            DetailRow(
                icon = Icons.Default.Refresh,
                label = stringResource(R.string.subscription_auto_renew),
                value = if (info.willAutoRenew) {
                    stringResource(R.string.subscription_enabled)
                } else {
                    stringResource(R.string.subscription_disabled)
                },
                valueColor = if (info.willAutoRenew) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.error
                }
            )
        }
    }
}

/**
 * Notice card displayed when the subscription has expired.
 */
@Composable
private fun ExpiredNoticeCard(
    info: SubscriptionInfo,
    onRenew: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.subscription_expired_notice),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.error
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(R.string.subscription_expired_description),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = onRenew,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(stringResource(R.string.subscription_renew))
            }
        }
    }
}

/**
 * Card with upgrade and restore actions.
 */
@Composable
private fun ActionsCard(
    isSubscribed: Boolean,
    isRestoring: Boolean,
    onUpgrade: () -> Unit,
    onRestore: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.subscription_actions),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Upgrade button (only if not subscribed)
            if (!isSubscribed) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onUpgrade)
                        .padding(vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.ArrowUpward,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = stringResource(R.string.subscription_upgrade),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(
                        imageVector = Icons.Default.OpenInNew,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
            }

            // Restore purchases
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = !isRestoring, onClick = onRestore)
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.History,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = stringResource(R.string.subscription_restore),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
                if (isRestoring) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.OpenInNew,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/**
 * Card linking to Google Play subscription management.
 */
@Composable
private fun ManageSubscriptionCard(onManage: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onManage)
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = stringResource(R.string.subscription_manage),
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.weight(1f)
                )
                Icon(
                    imageVector = Icons.Default.OpenInNew,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = stringResource(R.string.subscription_manage_footer),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// MARK: - Helper Components

/**
 * Status badge showing the current subscription state.
 */
@Composable
private fun StatusBadge(subscriptionStatus: SubscriptionStatus) {
    when (subscriptionStatus) {
        is SubscriptionStatus.Subscribed -> {
            if (subscriptionStatus.info.isInGracePeriod) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = stringResource(R.string.subscription_grace_period),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = stringResource(R.string.subscription_active),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        is SubscriptionStatus.Expired -> {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Error,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = stringResource(R.string.subscription_expired),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }

        is SubscriptionStatus.Revoked -> {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Error,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = stringResource(R.string.subscription_revoked),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }

        is SubscriptionStatus.Loading -> {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp
            )
        }

        is SubscriptionStatus.NotSubscribed -> {
            Text(
                text = stringResource(R.string.subscription_free),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        is SubscriptionStatus.Error -> {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Error,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp),
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = stringResource(R.string.subscription_error),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

/**
 * A row displaying a label-value pair with an icon.
 */
@Composable
private fun DetailRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurfaceVariant
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
        }
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = valueColor
        )
    }
}

// MARK: - Helper Functions

private fun getCurrentTierName(status: SubscriptionStatus): String {
    return when (status) {
        is SubscriptionStatus.Subscribed -> status.info.tier.displayName
        is SubscriptionStatus.Expired -> status.info.tier.displayName
        else -> SubscriptionTier.FREE.displayName
    }
}

private fun getCurrentTierDescription(status: SubscriptionStatus): String {
    return when (status) {
        is SubscriptionStatus.Subscribed -> status.info.tier.description
        is SubscriptionStatus.Expired -> status.info.tier.description
        else -> SubscriptionTier.FREE.description
    }
}

// MARK: - Previews

@Preview(showBackground = true)
@Composable
private fun SubscriptionStatusSubscribedPreview() {
    HappyTheme {
        SubscriptionStatusContent(
            uiState = PurchaseUiState(
                subscriptionStatus = SubscriptionStatus.Subscribed(
                    SubscriptionInfo(
                        tier = SubscriptionTier.PRO,
                        productId = "pro.monthly",
                        purchaseTimeMillis = System.currentTimeMillis() - 86400000L * 30,
                        expiryTimeMillis = System.currentTimeMillis() + 86400000L * 30,
                        willAutoRenew = true,
                        billingPeriod = BillingPeriod.MONTHLY
                    )
                ),
                isLoading = false
            )
        )
    }
}

@Preview(showBackground = true, name = "Status - Not Subscribed")
@Composable
private fun SubscriptionStatusFreePreview() {
    HappyTheme {
        SubscriptionStatusContent(
            uiState = PurchaseUiState(
                subscriptionStatus = SubscriptionStatus.NotSubscribed,
                isLoading = false
            )
        )
    }
}
