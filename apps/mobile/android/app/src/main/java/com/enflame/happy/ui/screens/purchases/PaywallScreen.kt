package com.enflame.happy.ui.screens.purchases

import android.app.Activity
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AllInclusive
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Devices
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.HeadsetMic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Verified
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
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.BillingPeriod
import com.enflame.happy.domain.model.PlanFeature
import com.enflame.happy.domain.model.SubscriptionPlan
import com.enflame.happy.domain.model.SubscriptionTier
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.PurchaseUiState
import com.enflame.happy.ui.viewmodel.PurchaseViewModel

/**
 * Paywall screen displaying subscription plans with pricing and features.
 *
 * Presents available subscription tiers, a billing period selector,
 * purchase and restore options, and links to terms/privacy.
 * This is the Android counterpart to the iOS `PaywallView`.
 *
 * @param viewModel The [PurchaseViewModel] managing purchase state.
 * @param onNavigateBack Callback to navigate back to the previous screen.
 */
@Composable
fun PaywallScreen(
    viewModel: PurchaseViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    PaywallScreenContent(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onBillingPeriodChanged = viewModel::selectBillingPeriod,
        onPurchase = { plan ->
            val activity = (LocalContext.current as? Activity)
            if (activity != null) {
                viewModel.purchase(activity, plan)
            }
        },
        onRestorePurchases = viewModel::restorePurchases,
        onDismissPurchaseSuccess = {
            viewModel.dismissPurchaseSuccess()
            onNavigateBack()
        },
        onDismissRestoreSuccess = {
            viewModel.dismissRestoreSuccess()
            onNavigateBack()
        },
        onDismissError = viewModel::dismissError
    )
}

/**
 * Stateless paywall screen content.
 *
 * Extracted from [PaywallScreen] for testability and previews.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaywallScreenContent(
    uiState: PurchaseUiState,
    onNavigateBack: () -> Unit = {},
    onBillingPeriodChanged: (BillingPeriod) -> Unit = {},
    onPurchase: (SubscriptionPlan) -> Unit = {},
    onRestorePurchases: () -> Unit = {},
    onDismissPurchaseSuccess: () -> Unit = {},
    onDismissRestoreSuccess: () -> Unit = {},
    onDismissError: () -> Unit = {}
) {
    val uriHandler = LocalUriHandler.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.paywall_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close)
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
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            PaywallHeader()

            // Billing period selector
            BillingPeriodSelector(
                selectedPeriod = uiState.selectedBillingPeriod,
                onPeriodChanged = onBillingPeriodChanged
            )

            // Plans or loading skeleton
            if (uiState.isLoading) {
                LoadingSkeleton()
            } else {
                uiState.filteredPlans.forEach { plan ->
                    PlanCard(
                        plan = plan,
                        isCurrentPlan = uiState.currentTier == plan.tier,
                        isPurchasing = uiState.isPurchasing,
                        onPurchase = { onPurchase(plan) }
                    )
                }
            }

            // Restore purchases button
            TextButton(
                onClick = onRestorePurchases,
                enabled = !uiState.isRestoring
            ) {
                if (uiState.isRestoring) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(stringResource(R.string.paywall_restore_purchases))
            }

            // Legal footer
            LegalFooter(
                onTermsClick = { uriHandler.openUri("https://happy.engineering/terms") },
                onPrivacyClick = { uriHandler.openUri("https://happy.engineering/privacy") }
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    // Purchase success dialog
    if (uiState.showPurchaseSuccess) {
        AlertDialog(
            onDismissRequest = onDismissPurchaseSuccess,
            title = { Text(stringResource(R.string.paywall_purchase_success_title)) },
            text = { Text(stringResource(R.string.paywall_purchase_success_message)) },
            confirmButton = {
                TextButton(onClick = onDismissPurchaseSuccess) {
                    Text(stringResource(R.string.ok))
                }
            }
        )
    }

    // Restore success dialog
    if (uiState.showRestoreSuccess) {
        AlertDialog(
            onDismissRequest = onDismissRestoreSuccess,
            title = { Text(stringResource(R.string.paywall_restore_success_title)) },
            text = { Text(stringResource(R.string.paywall_restore_success_message)) },
            confirmButton = {
                TextButton(onClick = onDismissRestoreSuccess) {
                    Text(stringResource(R.string.ok))
                }
            }
        )
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

// MARK: - Subcomponents

/**
 * Paywall header with branding and value proposition.
 */
@Composable
private fun PaywallHeader() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(top = 8.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Star,
            contentDescription = null,
            modifier = Modifier.size(48.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = stringResource(R.string.paywall_headline),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = stringResource(R.string.paywall_subheadline),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

/**
 * Segmented button row for switching between monthly and annual billing.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BillingPeriodSelector(
    selectedPeriod: BillingPeriod,
    onPeriodChanged: (BillingPeriod) -> Unit
) {
    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
        BillingPeriod.entries.forEachIndexed { index, period ->
            SegmentedButton(
                selected = selectedPeriod == period,
                onClick = { onPeriodChanged(period) },
                shape = SegmentedButtonDefaults.itemShape(
                    index = index,
                    count = BillingPeriod.entries.size
                )
            ) {
                Text(period.displayName)
            }
        }
    }
}

/**
 * A card displaying a single subscription plan with features and purchase button.
 *
 * Mirrors the iOS `PlanCardView` with Material Design 3 styling.
 */
@Composable
private fun PlanCard(
    plan: SubscriptionPlan,
    isCurrentPlan: Boolean,
    isPurchasing: Boolean,
    onPurchase: () -> Unit
) {
    val borderColor = if (plan.isRecommended) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.outlineVariant
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            width = if (plan.isRecommended) 2.dp else 1.dp,
            color = borderColor
        ),
        elevation = if (plan.isRecommended) {
            CardDefaults.cardElevation(defaultElevation = 4.dp)
        } else {
            CardDefaults.cardElevation(defaultElevation = 0.dp)
        }
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Plan header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = plan.tier.displayName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        if (plan.isRecommended) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = stringResource(R.string.paywall_recommended),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier
                                    .padding(horizontal = 8.dp, vertical = 2.dp),
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = plan.displayPrice,
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                if (isCurrentPlan) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = stringResource(R.string.paywall_current_plan),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))

            // Features list
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                plan.features.forEach { feature ->
                    FeatureRow(feature = feature)
                }
            }

            // Purchase button
            AnimatedVisibility(visible = !isCurrentPlan) {
                Column {
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = onPurchase,
                        enabled = !isPurchasing,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isPurchasing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text(
                                text = stringResource(R.string.paywall_subscribe),
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * A single feature row within a plan card.
 */
@Composable
private fun FeatureRow(feature: PlanFeature) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = getFeatureIcon(feature.iconName),
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = feature.title,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

/**
 * Loading skeleton displayed while products are being fetched.
 */
@Composable
private fun LoadingSkeleton() {
    repeat(2) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }
    }
}

/**
 * Legal footer with terms and privacy links.
 */
@Composable
private fun LegalFooter(
    onTermsClick: () -> Unit,
    onPrivacyClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = stringResource(R.string.paywall_auto_renew_notice),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            TextButton(onClick = onTermsClick) {
                Text(
                    text = stringResource(R.string.paywall_terms),
                    style = MaterialTheme.typography.labelSmall
                )
            }

            TextButton(onClick = onPrivacyClick) {
                Text(
                    text = stringResource(R.string.paywall_privacy),
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

/**
 * Maps feature icon names to Material Icons.
 *
 * Falls back to [Icons.Default.CheckCircle] for unknown names.
 */
private fun getFeatureIcon(iconName: String): ImageVector {
    return when (iconName) {
        "person" -> Icons.Default.Person
        "phone_android" -> Icons.Default.PhoneAndroid
        "schedule" -> Icons.Default.Schedule
        "all_inclusive" -> Icons.Default.AllInclusive
        "devices" -> Icons.Default.Devices
        "star" -> Icons.Default.Star
        "bar_chart" -> Icons.Default.BarChart
        "verified" -> Icons.Default.Verified
        "groups" -> Icons.Default.Groups
        "share" -> Icons.Default.Share
        "admin_panel_settings" -> Icons.Default.Settings
        "headset_mic" -> Icons.Default.HeadsetMic
        "check_circle" -> Icons.Default.CheckCircle
        else -> Icons.Default.CheckCircle
    }
}

// MARK: - Previews

@Preview(showBackground = true)
@Composable
private fun PaywallScreenPreview() {
    val samplePlans = listOf(
        SubscriptionPlan(
            id = "pro.monthly",
            tier = SubscriptionTier.PRO,
            billingPeriod = BillingPeriod.MONTHLY,
            displayPrice = "$9.99/mo",
            features = listOf(
                PlanFeature(title = "Unlimited sessions", iconName = "all_inclusive"),
                PlanFeature(title = "Multiple devices", iconName = "devices"),
                PlanFeature(title = "Priority support", iconName = "star"),
                PlanFeature(title = "Advanced analytics", iconName = "bar_chart")
            ),
            isRecommended = true
        ),
        SubscriptionPlan(
            id = "team.monthly",
            tier = SubscriptionTier.TEAM,
            billingPeriod = BillingPeriod.MONTHLY,
            displayPrice = "$29.99/mo",
            features = listOf(
                PlanFeature(title = "Everything in Pro", iconName = "verified"),
                PlanFeature(title = "Team management", iconName = "groups"),
                PlanFeature(title = "Shared sessions", iconName = "share")
            ),
            isRecommended = false
        )
    )

    HappyTheme {
        PaywallScreenContent(
            uiState = PurchaseUiState(
                availablePlans = samplePlans,
                filteredPlans = samplePlans,
                isLoading = false
            )
        )
    }
}

@Preview(showBackground = true, name = "Paywall - Loading")
@Composable
private fun PaywallScreenLoadingPreview() {
    HappyTheme {
        PaywallScreenContent(
            uiState = PurchaseUiState(isLoading = true)
        )
    }
}
