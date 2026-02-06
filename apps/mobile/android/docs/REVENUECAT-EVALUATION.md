# RevenueCat SDK Evaluation for Android Purchase Management

**Issue**: HAP-1016
**Date**: 2026-02-06
**Status**: Complete
**Related**: HAP-1007 (iOS RevenueCat evaluation), HAP-1000 (Android purchases implementation)

---

## Executive Summary

**Recommendation: Integrate RevenueCat SDK** for cross-platform consistency with iOS, server-side receipt validation, and reduced maintenance burden. The iOS app has already integrated RevenueCat (HAP-1007) with a `PurchaseProviding` protocol abstraction. The Android migration is low-risk due to the existing well-structured `PurchaseService` and can follow the same protocol-based pattern.

---

## 1. Current Implementation Analysis

### Android (Direct Google Play Billing)

The current Android implementation in `data/billing/PurchaseService.kt` uses Google Play Billing Client directly:

**Architecture**:
- `PurchaseService` - Singleton managing `BillingClient` lifecycle (611 lines)
- `SubscriptionModels.kt` - Domain models: `SubscriptionTier`, `BillingPeriod`, `SubscriptionPlan`, `SubscriptionStatus`, `PurchaseResult`, `ProductIdentifiers` (203 lines)
- `BillingModule.kt` - Hilt DI module (38 lines)
- `PurchaseViewModel.kt` - UI state management with `StateFlow` (274 lines)
- `PaywallScreen.kt` - Composable paywall UI (601 lines)
- `SubscriptionStatusView.kt` - Subscription management UI (728 lines)

**Capabilities**:
- Connection management with auto-retry
- Product querying with localized pricing
- Purchase flow via Activity
- Purchase acknowledgment (3-day requirement)
- Subscription status tracking via `StateFlow`
- Restore purchases
- Billing period filtering (monthly/annual)
- Tier-based feature gating (Free/Pro/Team)
- Comprehensive error handling (all `BillingResponseCode` values)

**Test Coverage**:
- `PurchaseViewModelTest.kt` - 23 tests covering state management, purchase flows, restore, errors
- `SubscriptionModelsTest.kt` - 27 tests covering domain model behavior

### iOS (StoreKit 2 + RevenueCat)

The iOS app has already integrated RevenueCat via HAP-1007:

**Architecture**:
- `PurchaseProviding` protocol - Abstraction layer enabling backend swapping
- `PurchaseService` - StoreKit 2 direct implementation (fallback)
- `RevenueCatPurchaseService` - RevenueCat-backed implementation (primary)
- `EntitlementService` - Feature gating service using `GatedFeature` enum
- Conditional import: `#if canImport(RevenueCat)` for graceful fallback

**Key Design Decision**: iOS uses a protocol-based approach where `RevenueCatPurchaseService` is the default but falls back to StoreKit 2 when the SDK is unavailable. The `EntitlementService` defaults to `RevenueCatPurchaseService.shared`.

---

## 2. Feature Comparison

| Feature | Direct Play Billing | RevenueCat |
|---------|-------------------|------------|
| Purchase flow | Yes | Yes |
| Subscription management | Yes | Yes (enhanced) |
| Localized pricing | Yes | Yes |
| Restore purchases | Yes | Yes |
| Purchase acknowledgment | Manual (3-day window) | Automatic |
| Server-side receipt validation | No (client-only) | Yes |
| Cross-platform entitlements | No | Yes |
| Subscription analytics | No (custom required) | Built-in dashboard |
| Churn tracking | No | Yes |
| Revenue metrics | No | Yes |
| Grace period handling | Manual | Automatic |
| Billing retry logic | Manual | Automatic |
| Price change notifications | Manual | Automatic |
| A/B testing (paywalls) | No | Yes (Paywalls feature) |
| Webhooks for server | No | Yes |
| User identification | N/A | Cross-device syncing |
| Sandbox testing support | Manual setup | Built-in |
| Entitlement-based gating | Custom implementation | Native SDK feature |
| Offering management | Play Console only | RevenueCat Dashboard + Play Console |

### What RevenueCat Adds Over Current Implementation

1. **Server-side receipt validation**: The current Android implementation validates purchases client-side only. RevenueCat validates receipts server-side, preventing fraud from modified APKs or replayed purchases.

2. **Cross-platform entitlements**: With iOS already on RevenueCat, adding Android creates a unified entitlement system. A user purchasing on Android would be recognized on iOS (and vice versa) without custom backend work.

3. **Automatic subscription lifecycle**: The current implementation manually handles acknowledgment, grace periods, and billing retries. RevenueCat automates all of this.

4. **Analytics without custom code**: The current implementation would need custom analytics events for purchase funnel tracking. RevenueCat provides this out of the box.

5. **Webhook integration**: RevenueCat can notify the Happy server of subscription changes, enabling server-side entitlement checking without client-initiated refreshes.

### What the Current Implementation Already Handles Well

1. **Complete purchase flow**: The `PurchaseService` handles all `BillingResponseCode` values comprehensively
2. **Domain models**: Well-structured Kotlin data classes with proper sealed classes
3. **UI layer**: Full paywall and subscription status screens
4. **Error handling**: Exhaustive error mapping with user-friendly messages
5. **Test coverage**: 50 unit tests across models and ViewModel

---

## 3. Migration Effort Assessment

### Estimated Effort: 2-3 days (Low complexity)

#### Changes Required

**1. Add RevenueCat Dependency** (0.5 hours)

```kotlin
// In app/build.gradle.kts
implementation("com.revenuecat.purchases:purchases:8.x.x")
implementation("com.revenuecat.purchases:purchases-ui:8.x.x") // Optional: Paywalls
```

**2. Create PurchaseProviding Interface** (1 hour)

Following the iOS pattern, extract a Kotlin interface:

```kotlin
interface PurchaseProviding {
    val subscriptionStatus: StateFlow<SubscriptionStatus>
    val availablePlans: StateFlow<List<SubscriptionPlan>>
    val isPurchasing: StateFlow<Boolean>

    suspend fun loadProducts()
    suspend fun purchase(activity: Activity, plan: SubscriptionPlan): PurchaseResult
    suspend fun restorePurchases(): Boolean
    suspend fun refreshSubscriptionStatus()
}
```

The existing `PurchaseService` would implement this interface.

**3. Create RevenueCatPurchaseService** (4-6 hours)

A new implementation routing through RevenueCat SDK:

```kotlin
@Singleton
class RevenueCatPurchaseService @Inject constructor(
    @ApplicationContext private val context: Context
) : PurchaseProviding {

    fun configure(apiKey: String, appUserID: String? = null) {
        Purchases.configure(
            PurchasesConfiguration.Builder(context, apiKey)
                .appUserID(appUserID)
                .build()
        )
    }

    override suspend fun loadProducts() {
        val offerings = Purchases.sharedInstance.awaitOfferings()
        // Convert to SubscriptionPlan domain models
    }

    override suspend fun purchase(activity: Activity, plan: SubscriptionPlan): PurchaseResult {
        // Route through Purchases.sharedInstance.awaitPurchase()
    }

    // ... remaining implementations
}
```

**4. Update Hilt Module** (0.5 hours)

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object BillingModule {
    @Provides
    @Singleton
    fun providePurchaseService(
        @ApplicationContext context: Context
    ): PurchaseProviding {
        // Return RevenueCatPurchaseService if configured,
        // fall back to PurchaseService otherwise
        return if (BuildConfig.REVENUECAT_API_KEY.isNotEmpty()) {
            RevenueCatPurchaseService(context).also {
                it.configure(BuildConfig.REVENUECAT_API_KEY)
            }
        } else {
            PurchaseService(context)
        }
    }
}
```

**5. Add Entitlement Service** (2-3 hours)

Port the iOS `EntitlementService` pattern:

```kotlin
@Singleton
class EntitlementService @Inject constructor(
    private val purchaseService: PurchaseProviding
) {
    fun canAccess(feature: GatedFeature): Boolean
    val currentTier: SubscriptionTier
    val isPremium: Boolean
}
```

**6. Update ViewModel** (1-2 hours)

Change `PurchaseViewModel` to depend on `PurchaseProviding` interface instead of concrete `PurchaseService`.

**7. Update Tests** (2-3 hours)

- Update `PurchaseViewModelTest` to mock `PurchaseProviding` interface
- Add `RevenueCatPurchaseServiceTest` with mocked Purchases SDK
- Add `EntitlementServiceTest`

**8. Configure RevenueCat Dashboard** (1-2 hours, one-time)

- Create RevenueCat project
- Connect Google Play Store credentials
- Configure products, entitlements, and offerings
- Set up webhook to Happy server (optional)

#### Files Modified

| File | Change Type |
|------|-------------|
| `app/build.gradle.kts` | Add dependency |
| `data/billing/PurchaseService.kt` | Implement interface |
| `data/billing/RevenueCatPurchaseService.kt` | **New file** |
| `data/billing/PurchaseProviding.kt` | **New file** (interface) |
| `domain/model/GatedFeature.kt` | **New file** |
| `domain/service/EntitlementService.kt` | **New file** |
| `di/BillingModule.kt` | Update provider |
| `ui/viewmodel/PurchaseViewModel.kt` | Use interface |
| `HappyApplication.kt` | Configure RevenueCat |
| Tests (3-4 files) | Update mocks, add new tests |

#### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration breaks existing flow | Low | High | Interface preserves contract; fallback to direct billing |
| RevenueCat SDK version conflicts | Low | Medium | Version catalogs manage dependencies |
| RevenueCat downtime affects purchases | Very Low | High | Fallback to StoreKit/Play Billing |
| API key exposure | Low | Medium | BuildConfig + ProGuard; key stored as GitHub secret |

---

## 4. Cross-Platform Benefits

### With Both Android + iOS on RevenueCat

1. **Unified Dashboard**: Single view of all subscribers across platforms, revenue metrics, and churn data.

2. **Cross-Platform Entitlements**: Users who purchase on Android can access premium features on iOS and vice versa, using RevenueCat's user identification.

3. **Consistent Offerings**: Manage subscription tiers, pricing, and offerings from one dashboard instead of separate App Store Connect and Play Console configurations.

4. **Server-Side Integration**: Single webhook endpoint on the Happy server for both platforms, enabling:
   - Real-time subscription status on the server
   - Account-level entitlement checking
   - Automated churn intervention

5. **A/B Testing**: Test different paywall configurations across both platforms from a single dashboard.

6. **Shared Code Patterns**: The `PurchaseProviding` protocol pattern is already established on iOS. Android would follow the same architectural pattern, making the codebase easier to maintain.

### iOS Already Has

The iOS app (HAP-1007) has already implemented:
- `PurchaseProviding` protocol
- `RevenueCatPurchaseService` with `#if canImport(RevenueCat)` fallback
- `EntitlementService` with `GatedFeature` enum
- User identification and cross-device syncing
- Entitlement constants (`Entitlement.pro`, `Entitlement.team`)

The Android implementation should mirror these patterns for consistency:
- `PurchaseProviding` interface (Kotlin equivalent of Swift protocol)
- `RevenueCatPurchaseService` with BuildConfig-based fallback
- `EntitlementService` with `GatedFeature` sealed class/enum
- Same entitlement identifiers ("pro", "team")

---

## 5. Cost Analysis

### RevenueCat Pricing (as of 2026)

| Plan | Monthly Revenue | Fee | Notes |
|------|----------------|-----|-------|
| Free | $0 - $2,500 MTR | $0 | Up to 10K tracked users |
| Starter | $2,500 - $10K MTR | 1% of MTR | Basic analytics, webhooks |
| Pro | $10K+ MTR | 1.2% of MTR | Advanced analytics, A/B testing |
| Enterprise | Custom | Negotiated | SLA, dedicated support |

### Cost vs. Maintenance Comparison

**Maintaining Direct Implementation**:
- Developer time for subscription lifecycle edge cases: ~2-4 hours/month
- Server-side receipt validation implementation: ~2-3 days one-time
- Custom analytics dashboard: ~1-2 weeks one-time
- Cross-platform entitlement syncing: ~1 week one-time
- Ongoing maintenance for Play Billing Library updates: ~1-2 hours/quarter

**Estimated internal cost**: ~$3,000-5,000 in developer time for equivalent features, plus ongoing maintenance.

**With RevenueCat**:
- Initial integration: ~2-3 days
- Ongoing: Near-zero maintenance for billing lifecycle
- Cost: 0-1.2% of mobile subscription revenue

**Break-even**: RevenueCat is cost-effective until monthly revenue exceeds approximately $250K-$400K (at which point the 1-1.2% fee exceeds the cost of maintaining custom infrastructure).

---

## 6. Vendor Lock-in Assessment

### Lock-in Risk: Low-Medium

**Mitigations already in place**:
1. **Interface abstraction**: The `PurchaseProviding` protocol/interface means the rest of the app is decoupled from RevenueCat.
2. **Domain models are ours**: `SubscriptionPlan`, `SubscriptionStatus`, `SubscriptionTier` are Happy domain models, not RevenueCat types.
3. **Fallback exists**: The direct `PurchaseService` (Play Billing) and StoreKit 2 implementations remain as fallbacks.

**What would change if we leave RevenueCat**:
1. Swap `RevenueCatPurchaseService` for `PurchaseService` in DI module
2. Implement server-side receipt validation ourselves
3. Build custom subscription analytics
4. Handle cross-platform entitlements manually

**Estimated migration away**: 1-2 weeks to restore full feature parity without RevenueCat.

---

## 7. Recommendation

### Decision: Integrate RevenueCat SDK

**Rationale**:

1. **iOS already uses it** (HAP-1007 complete): The architectural patterns, entitlement constants, and protocol abstractions already exist. Not integrating on Android means maintaining two different purchase management approaches.

2. **Server-side receipt validation is critical**: The current client-only validation is a security gap. Modified APKs on Android are a real attack vector. RevenueCat provides this for free.

3. **Cross-platform entitlements are a user expectation**: Users who subscribe on one platform expect access on the other. RevenueCat makes this trivial.

4. **Low migration effort**: 2-3 days with the interface-based approach. The existing code is well-structured and the domain models can remain unchanged.

5. **Low vendor lock-in risk**: The `PurchaseProviding` interface and direct billing fallback mean we can exit RevenueCat at any time.

6. **Cost is negligible at current scale**: Free tier covers early-stage needs. Even at scale, the 1-1.2% is offset by reduced development overhead.

### Suggested Approach: Phased Integration

**Phase 1** (HAP-1016 follow-up):
- Add RevenueCat dependency
- Create `PurchaseProviding` interface
- Create `RevenueCatPurchaseService`
- Update DI module with fallback
- Keep existing `PurchaseService` as fallback

**Phase 2** (separate issue):
- Add `EntitlementService` and `GatedFeature`
- Port entitlement-gated features from iOS
- Configure RevenueCat dashboard for Android

**Phase 3** (separate issue):
- Add server-side webhook integration
- Enable cross-platform entitlement syncing
- Set up analytics dashboard

### Not Recommended: Hybrid Approach

A hybrid approach (using RevenueCat for analytics only, keeping direct billing for transactions) adds complexity without the core benefits of server-side validation and cross-platform entitlements. RevenueCat is designed as an all-or-nothing purchase layer.

---

## 8. Open Questions Addressed

### Q1: Is RevenueCat integration still desired given the working direct implementation?

**Yes**. The direct implementation is comprehensive and well-tested, but it lacks server-side validation and cross-platform entitlements. With iOS already on RevenueCat, maintaining a different approach on Android creates inconsistency and missed features.

### Q2: Cost-benefit ratio of RevenueCat analytics vs. custom analytics?

RevenueCat's analytics are effectively free (included in the MTR-based pricing). Building equivalent custom analytics (subscriber cohorts, churn tracking, LTV calculations, revenue dashboards) would take 1-2 weeks of development and ongoing maintenance. The cost-benefit strongly favors RevenueCat.

---

## Appendix: File Inventory

### Current Android Purchase Files

| File | Lines | Purpose |
|------|-------|---------|
| `data/billing/PurchaseService.kt` | 611 | Google Play Billing client |
| `domain/model/SubscriptionModels.kt` | 203 | Domain models |
| `di/BillingModule.kt` | 38 | Hilt DI module |
| `ui/viewmodel/PurchaseViewModel.kt` | 274 | Purchase state management |
| `ui/screens/purchases/PaywallScreen.kt` | 601 | Paywall composable |
| `ui/screens/purchases/SubscriptionStatusView.kt` | 728 | Subscription status composable |
| `test/.../PurchaseViewModelTest.kt` | 473 | ViewModel tests (23 tests) |
| `test/.../SubscriptionModelsTest.kt` | 333 | Domain model tests (27 tests) |
| **Total** | **3,261** | |

### iOS RevenueCat Files (Reference)

| File | Lines | Purpose |
|------|-------|---------|
| `Services/PurchaseService.swift` | 431 | StoreKit 2 direct (fallback) |
| `Services/RevenueCatPurchaseService.swift` | 523 | RevenueCat implementation |
| `Services/EntitlementService.swift` | 210 | Feature gating |
| `ViewModels/PurchaseViewModel.swift` | ~300 | Purchase state management |
| `Views/PaywallView.swift` | ~400 | Paywall SwiftUI view |
| `Views/SubscriptionStatusView.swift` | ~500 | Subscription status view |
