/**
 * RevenueCat Purchases Composable
 *
 * Provides a Vue composable for managing RevenueCat purchases on the web.
 * Uses the @revenuecat/purchases-js SDK and integrates with the purchases store.
 *
 * @example
 * ```typescript
 * const { initialize, purchase, restorePurchases, isPro } = usePurchases();
 *
 * // Initialize on app start
 * await initialize();
 *
 * // Purchase a package
 * const result = await purchase(monthlyPackage);
 * if (result === PaywallResult.PURCHASED) {
 *     console.log('Purchase successful!');
 * }
 * ```
 *
 * @module composables/usePurchases
 */

import { readonly } from 'vue';
import { storeToRefs } from 'pinia';
import { usePurchasesStore } from '@/stores/purchases';
import { useAuthStore } from '@/stores/auth';
import type {
  CustomerInfo,
  Offerings,
  Package,
} from '@/shared';
import {
  PaywallResult,
  PurchaseError,
  PurchaseErrorCode,
  trackPurchaseEvent,
  PurchaseAnalyticsEvent,
} from '@/shared';

// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat SDK Types (from @revenuecat/purchases-js)
// ─────────────────────────────────────────────────────────────────────────────

// Note: These are simplified types. In production, import from the SDK directly.
// The SDK types will be available when @revenuecat/purchases-js is installed.

interface PurchasesInstance {
  getCustomerInfo(): Promise<RCCustomerInfo>;
  getOfferings(): Promise<RCOfferings>;
  purchase(options: { rcPackage: RCPackage }): Promise<{ customerInfo: RCCustomerInfo }>;
}

interface RCCustomerInfo {
  activeSubscriptions: string[];
  entitlements: {
    all: Record<string, { isActive: boolean; identifier: string }>;
  };
  originalAppUserId: string;
  requestDate: string;
}

interface RCOfferings {
  current: RCOffering | null;
  all: Record<string, RCOffering>;
}

interface RCOffering {
  identifier: string;
  availablePackages: RCPackage[];
}

interface RCPackage {
  identifier: string;
  packageType: string;
  webBillingProduct?: RCProduct;
}

interface RCProduct {
  identifier: string;
  title: string;
  description: string;
  currentPrice: {
    formattedPrice: string;
    amountMicros: number;
    currency: string;
  };
}

// Placeholder for the actual SDK
let Purchases: any = null;
let purchasesInstance: PurchasesInstance | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────

export function usePurchases() {
  const store = usePurchasesStore();
  const authStore = useAuthStore();

  // Extract reactive refs from store
  const {
    isConfigured,
    isLoading,
    status,
    customerInfo,
    offerings,
    lastError,
    isPaywallVisible,
    isPro,
    isSubscribed,
    activeEntitlements,
    currentOffering,
    availablePackages,
    monthlyPackage,
    annualPackage,
    hasError,
  } = storeToRefs(store);

  // ─────────────────────────────────────────────────────────────────────────
  // SDK Initialization
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Dynamically load the RevenueCat SDK
   */
  async function loadSDK(): Promise<void> {
    if (Purchases) return;

    try {
      // Dynamic import to avoid SSR issues
      const module = await import('@revenuecat/purchases-js');
      Purchases = module.Purchases;
    } catch (error) {
      console.error('[usePurchases] Failed to load RevenueCat SDK:', error);
      throw new PurchaseError(
        PurchaseErrorCode.UNKNOWN,
        'Failed to load RevenueCat SDK',
        error
      );
    }
  }

  /**
   * Initialize RevenueCat with API key
   */
  async function initialize(): Promise<void> {
    if (store.isConfigured) {
      console.log('[usePurchases] Already configured');
      return;
    }

    store.setLoading(true);
    store.clearError();

    try {
      await loadSDK();

      const apiKey = import.meta.env.VITE_REVENUECAT_WEB_KEY;
      if (!apiKey) {
        throw new PurchaseError(
          PurchaseErrorCode.NOT_CONFIGURED,
          'VITE_REVENUECAT_WEB_KEY not set'
        );
      }

      // Get user ID for RevenueCat (use account ID if logged in)
      const appUserId = authStore.accountId ?? undefined;

      // Configure RevenueCat
      purchasesInstance = Purchases.configure({
        apiKey,
        appUserId,
      });

      store.setConfigured(true);

      // Fetch initial data
      await Promise.all([refreshCustomerInfo(), refreshOfferings()]);

      console.log('[usePurchases] Initialized successfully');
    } catch (error) {
      const purchaseError =
        error instanceof PurchaseError
          ? error
          : new PurchaseError(
              PurchaseErrorCode.UNKNOWN,
              'Failed to initialize RevenueCat',
              error
            );
      store.setError(purchaseError.code, purchaseError.message);
      throw purchaseError;
    } finally {
      store.setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Refresh customer info from RevenueCat
   */
  async function refreshCustomerInfo(): Promise<CustomerInfo> {
    ensureConfigured();

    try {
      const rcInfo = await purchasesInstance!.getCustomerInfo();
      const info = transformCustomerInfo(rcInfo);
      store.setCustomerInfo(info);
      return info;
    } catch (error) {
      console.error('[usePurchases] Failed to get customer info:', error);
      throw new PurchaseError(
        PurchaseErrorCode.NETWORK_ERROR,
        'Failed to fetch customer info',
        error
      );
    }
  }

  /**
   * Refresh available offerings
   */
  async function refreshOfferings(): Promise<Offerings> {
    ensureConfigured();

    try {
      const rcOfferings = await purchasesInstance!.getOfferings();
      const transformed = transformOfferings(rcOfferings);
      store.setOfferings(transformed);
      return transformed;
    } catch (error) {
      console.error('[usePurchases] Failed to get offerings:', error);
      throw new PurchaseError(
        PurchaseErrorCode.NETWORK_ERROR,
        'Failed to fetch offerings',
        error
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Purchase Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Purchase a package
   */
  async function purchase(pkg: Package): Promise<PaywallResult> {
    ensureConfigured();
    store.setPurchasing(true);
    store.clearError();

    // Track purchase started
    trackPurchaseEvent(PurchaseAnalyticsEvent.PURCHASE_STARTED, {
      platform: 'web',
      packageId: pkg.identifier,
      productId: pkg.product.identifier,
      price: pkg.product.price,
      currency: pkg.product.currencyCode,
      userId: authStore.accountId ?? undefined,
    });

    try {
      // Find the native package
      const rcOfferings = await purchasesInstance!.getOfferings();
      const rcPackage = findPackage(rcOfferings, pkg.identifier);

      if (!rcPackage) {
        throw new PurchaseError(
          PurchaseErrorCode.PRODUCT_NOT_FOUND,
          `Package ${pkg.identifier} not found`
        );
      }

      const result = await purchasesInstance!.purchase({ rcPackage });
      const info = transformCustomerInfo(result.customerInfo);
      store.setCustomerInfo(info);
      store.setSuccess();

      // Track purchase completed
      trackPurchaseEvent(PurchaseAnalyticsEvent.PURCHASE_COMPLETED, {
        platform: 'web',
        packageId: pkg.identifier,
        productId: pkg.product.identifier,
        price: pkg.product.price,
        currency: pkg.product.currencyCode,
        userId: authStore.accountId ?? undefined,
      });

      return PaywallResult.PURCHASED;
    } catch (error: unknown) {
      // Check for user cancellation
      if (isUserCancellation(error)) {
        // Track purchase cancelled
        trackPurchaseEvent(PurchaseAnalyticsEvent.PURCHASE_CANCELLED, {
          platform: 'web',
          packageId: pkg.identifier,
          productId: pkg.product.identifier,
          userId: authStore.accountId ?? undefined,
        });
        return PaywallResult.CANCELLED;
      }

      const purchaseError =
        error instanceof PurchaseError
          ? error
          : new PurchaseError(
              PurchaseErrorCode.UNKNOWN,
              'Purchase failed',
              error
            );

      // Track purchase failed
      trackPurchaseEvent(PurchaseAnalyticsEvent.PURCHASE_FAILED, {
        platform: 'web',
        packageId: pkg.identifier,
        productId: pkg.product.identifier,
        errorCode: purchaseError.code,
        errorMessage: purchaseError.message,
        userId: authStore.accountId ?? undefined,
      });

      store.setError(purchaseError.code, purchaseError.message);
      return PaywallResult.ERROR;
    } finally {
      store.setPurchasing(false);
    }
  }

  /**
   * Restore previous purchases
   */
  async function restorePurchases(): Promise<CustomerInfo> {
    ensureConfigured();
    store.setRestoring(true);
    store.clearError();

    // Track restore started
    trackPurchaseEvent(PurchaseAnalyticsEvent.RESTORE_STARTED, {
      platform: 'web',
      userId: authStore.accountId ?? undefined,
    });

    try {
      // On web, restoring is the same as getting customer info
      // The SDK syncs with the backend automatically
      const info = await refreshCustomerInfo();
      store.setSuccess();

      // Track restore completed
      const restoredCount = Object.keys(info.activeSubscriptions).length;
      const restoredPro = info.entitlements?.all?.['pro']?.isActive ?? false;
      trackPurchaseEvent(PurchaseAnalyticsEvent.RESTORE_COMPLETED, {
        platform: 'web',
        userId: authStore.accountId ?? undefined,
        restoredCount,
        restoredPro,
      });

      return info;
    } catch (error) {
      const purchaseError =
        error instanceof PurchaseError
          ? error
          : new PurchaseError(
              PurchaseErrorCode.NETWORK_ERROR,
              'Failed to restore purchases',
              error
            );

      store.setError(purchaseError.code, purchaseError.message);
      throw purchaseError;
    } finally {
      store.setRestoring(false);
    }
  }

  /**
   * Sync purchases with RevenueCat backend
   */
  async function syncPurchases(): Promise<void> {
    await refreshCustomerInfo();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Paywall
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Show the paywall dialog
   */
  function showPaywall(source?: string): void {
    // Track paywall presented
    trackPurchaseEvent(PurchaseAnalyticsEvent.PAYWALL_PRESENTED, {
      platform: 'web',
      offeringId: store.currentOffering?.identifier,
      source,
      userId: authStore.accountId ?? undefined,
    });

    store.setPaywallVisible(true);
  }

  /**
   * Hide the paywall dialog
   */
  function hidePaywall(): void {
    store.setPaywallVisible(false);
  }

  /**
   * Show paywall only if user doesn't have the required entitlement
   */
  async function showPaywallIfNeeded(
    entitlementId: string = 'pro',
    source?: string
  ): Promise<PaywallResult> {
    const hasIt = store.hasEntitlement(entitlementId);
    if (hasIt) {
      return PaywallResult.NOT_PRESENTED;
    }

    showPaywall(source ?? 'paywall_if_needed');
    return PaywallResult.NOT_PRESENTED; // Actual result comes from user interaction
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Entitlements
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if user has a specific entitlement
   */
  function hasEntitlement(entitlementId: string): boolean {
    return store.hasEntitlement(entitlementId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  function ensureConfigured(): void {
    if (!purchasesInstance || !store.isConfigured) {
      throw new PurchaseError(
        PurchaseErrorCode.NOT_CONFIGURED,
        'RevenueCat not configured. Call initialize() first.'
      );
    }
  }

  function isUserCancellation(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('cancel') ||
        message.includes('user cancelled') ||
        (error as { code?: string }).code === 'UserCancelled'
      );
    }
    return false;
  }

  function findPackage(
    rcOfferings: RCOfferings,
    identifier: string
  ): RCPackage | null {
    for (const offering of Object.values(rcOfferings.all)) {
      for (const pkg of offering.availablePackages) {
        if (pkg.identifier === identifier) {
          return pkg;
        }
      }
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Type Transformers
  // ─────────────────────────────────────────────────────────────────────────

  function transformCustomerInfo(rc: RCCustomerInfo): CustomerInfo {
    const activeSubscriptions: Record<string, unknown> = {};
    rc.activeSubscriptions.forEach((id) => {
      activeSubscriptions[id] = true;
    });

    return {
      activeSubscriptions,
      entitlements: {
        all: rc.entitlements.all,
      },
      originalAppUserId: rc.originalAppUserId,
      requestDate: new Date(rc.requestDate),
    };
  }

  function transformOfferings(rc: RCOfferings): Offerings {
    const transformPackage = (pkg: RCPackage): Package | null => {
      const product = pkg.webBillingProduct;
      if (!product) return null;

      return {
        identifier: pkg.identifier,
        packageType: pkg.packageType || 'custom',
        product: {
          identifier: product.identifier,
          title: product.title,
          description: product.description || '',
          priceString: product.currentPrice.formattedPrice,
          price: product.currentPrice.amountMicros / 1_000_000,
          currencyCode: product.currentPrice.currency,
        },
      };
    };

    const transformOffering = (offering: RCOffering) => ({
      identifier: offering.identifier,
      availablePackages: offering.availablePackages
        .map(transformPackage)
        .filter((pkg): pkg is Package => pkg !== null),
    });

    return {
      current: rc.current ? transformOffering(rc.current) : null,
      all: Object.fromEntries(
        Object.entries(rc.all).map(([key, offering]) => [
          key,
          transformOffering(offering),
        ])
      ),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Return
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // State (readonly refs)
    isConfigured: readonly(isConfigured),
    isLoading: readonly(isLoading),
    status: readonly(status),
    customerInfo: readonly(customerInfo),
    offerings: readonly(offerings),
    lastError: readonly(lastError),
    isPaywallVisible: readonly(isPaywallVisible),

    // Computed (readonly)
    isPro: readonly(isPro),
    isSubscribed: readonly(isSubscribed),
    activeEntitlements: readonly(activeEntitlements),
    currentOffering: readonly(currentOffering),
    availablePackages: readonly(availablePackages),
    monthlyPackage: readonly(monthlyPackage),
    annualPackage: readonly(annualPackage),
    hasError: readonly(hasError),

    // Actions
    initialize,
    refreshCustomerInfo,
    refreshOfferings,
    purchase,
    restorePurchases,
    syncPurchases,
    showPaywall,
    hidePaywall,
    showPaywallIfNeeded,
    hasEntitlement,
  };
}
