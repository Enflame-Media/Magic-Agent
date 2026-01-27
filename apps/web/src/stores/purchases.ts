/**
 * Purchases Store
 *
 * Manages RevenueCat subscription state including customer info,
 * offerings, and purchase operations.
 *
 * @example
 * ```typescript
 * const purchases = usePurchasesStore();
 * await purchases.initialize();
 * if (purchases.isPro) {
 *     // User has pro access
 * }
 * ```
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  CustomerInfo,
  Offerings,
} from '@/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Purchase operation status
 */
export type PurchaseStatus =
  | 'idle'
  | 'loading'
  | 'purchasing'
  | 'restoring'
  | 'success'
  | 'error';

/**
 * Error information for failed operations
 */
export interface PurchaseErrorInfo {
  code: string;
  message: string;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const usePurchasesStore = defineStore('purchases', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether RevenueCat has been configured */
  const isConfigured = ref(false);

  /** Whether data is being loaded */
  const isLoading = ref(false);

  /** Current operation status */
  const status = ref<PurchaseStatus>('idle');

  /** Customer subscription information */
  const customerInfo = ref<CustomerInfo | null>(null);

  /** Available purchase offerings */
  const offerings = ref<Offerings | null>(null);

  /** Last error that occurred */
  const lastError = ref<PurchaseErrorInfo | null>(null);

  /** Whether paywall is currently visible */
  const isPaywallVisible = ref(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Getters (Computed)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Whether user has the "pro" entitlement
   */
  const isPro = computed(() => {
    if (!customerInfo.value) return false;
    return customerInfo.value.entitlements.all['pro']?.isActive ?? false;
  });

  /**
   * Whether user has any active subscription
   */
  const isSubscribed = computed(() => {
    if (!customerInfo.value) return false;
    return Object.keys(customerInfo.value.activeSubscriptions).length > 0;
  });

  /**
   * All active entitlement identifiers
   */
  const activeEntitlements = computed(() => {
    if (!customerInfo.value) return [];
    return Object.entries(customerInfo.value.entitlements.all)
      .filter(([, info]) => info.isActive)
      .map(([id]) => id);
  });

  /**
   * Current offering (the default one to show users)
   */
  const currentOffering = computed(() => offerings.value?.current ?? null);

  /**
   * All available packages from the current offering
   */
  const availablePackages = computed(() => {
    return currentOffering.value?.availablePackages ?? [];
  });

  /**
   * Monthly package if available
   */
  const monthlyPackage = computed(() => {
    return availablePackages.value.find(
      (pkg) =>
        pkg.packageType === 'monthly' ||
        pkg.identifier.toLowerCase().includes('month')
    );
  });

  /**
   * Annual package if available
   */
  const annualPackage = computed(() => {
    return availablePackages.value.find(
      (pkg) =>
        pkg.packageType === 'annual' ||
        pkg.identifier.toLowerCase().includes('annual') ||
        pkg.identifier.toLowerCase().includes('year')
    );
  });

  /**
   * Whether there was an error
   */
  const hasError = computed(() => lastError.value !== null);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set the configured state
   */
  function setConfigured(configured: boolean) {
    isConfigured.value = configured;
  }

  /**
   * Update customer info from RevenueCat
   */
  function setCustomerInfo(info: CustomerInfo | null) {
    customerInfo.value = info;
  }

  /**
   * Update available offerings
   */
  function setOfferings(newOfferings: Offerings | null) {
    offerings.value = newOfferings;
  }

  /**
   * Set loading state
   */
  function setLoading(loading: boolean) {
    isLoading.value = loading;
    if (loading) {
      status.value = 'loading';
    } else if (status.value === 'loading') {
      status.value = 'idle';
    }
  }

  /**
   * Set purchasing state
   */
  function setPurchasing(purchasing: boolean) {
    if (purchasing) {
      status.value = 'purchasing';
    } else if (status.value === 'purchasing') {
      status.value = 'idle';
    }
  }

  /**
   * Set restoring state
   */
  function setRestoring(restoring: boolean) {
    if (restoring) {
      status.value = 'restoring';
    } else if (status.value === 'restoring') {
      status.value = 'idle';
    }
  }

  /**
   * Record an error
   */
  function setError(code: string, message: string) {
    lastError.value = {
      code,
      message,
      timestamp: new Date(),
    };
    status.value = 'error';
  }

  /**
   * Clear the last error
   */
  function clearError() {
    lastError.value = null;
    if (status.value === 'error') {
      status.value = 'idle';
    }
  }

  /**
   * Set paywall visibility
   */
  function setPaywallVisible(visible: boolean) {
    isPaywallVisible.value = visible;
  }

  /**
   * Mark operation as successful
   */
  function setSuccess() {
    status.value = 'success';
    clearError();
  }

  /**
   * Check if user has a specific entitlement
   */
  function hasEntitlement(entitlementId: string): boolean {
    if (!customerInfo.value) return false;
    return (
      customerInfo.value.entitlements.all[entitlementId]?.isActive ?? false
    );
  }

  /**
   * Reset store to initial state
   */
  function $reset() {
    isConfigured.value = false;
    isLoading.value = false;
    status.value = 'idle';
    customerInfo.value = null;
    offerings.value = null;
    lastError.value = null;
    isPaywallVisible.value = false;
  }

  return {
    // State
    isConfigured,
    isLoading,
    status,
    customerInfo,
    offerings,
    lastError,
    isPaywallVisible,
    // Getters
    isPro,
    isSubscribed,
    activeEntitlements,
    currentOffering,
    availablePackages,
    monthlyPackage,
    annualPackage,
    hasError,
    // Actions
    setConfigured,
    setCustomerInfo,
    setOfferings,
    setLoading,
    setPurchasing,
    setRestoring,
    setError,
    clearError,
    setPaywallVisible,
    setSuccess,
    hasEntitlement,
    $reset,
  };
});
