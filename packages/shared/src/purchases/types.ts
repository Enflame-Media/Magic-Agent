/**
 * RevenueCat Purchase Types
 *
 * Common types that work across all platforms (web, mobile, macOS).
 * Based on the apps/web/react/sources/sync/revenueCat/types.ts implementation.
 *
 * @module @happy-vue/shared/purchases
 */

// ─────────────────────────────────────────────────────────────────────────────
// Customer Information
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Information about the current customer's subscription status.
 */
export interface CustomerInfo {
  /** Map of active subscription product IDs to their details */
  activeSubscriptions: Record<string, unknown>;
  /** Entitlements granted to the customer */
  entitlements: {
    /** All entitlements, keyed by identifier */
    all: Record<string, EntitlementInfo>;
  };
  /** Original app user ID from RevenueCat */
  originalAppUserId: string;
  /** When this info was requested */
  requestDate: Date;
}

/**
 * Information about a specific entitlement.
 */
export interface EntitlementInfo {
  /** Whether this entitlement is currently active */
  isActive: boolean;
  /** The entitlement identifier */
  identifier: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Products and Packages
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A purchasable product.
 */
export interface Product {
  /** Unique product identifier */
  identifier: string;
  /** Formatted price string (e.g., "$9.99") */
  priceString: string;
  /** Price as a number */
  price: number;
  /** Currency code (e.g., "USD") */
  currencyCode: string;
  /** Product title */
  title: string;
  /** Product description */
  description: string;
}

/**
 * A package containing a product with a specific type.
 */
export interface Package {
  /** Package identifier */
  identifier: string;
  /** Package type (e.g., "monthly", "annual", "custom") */
  packageType: string;
  /** The product in this package */
  product: Product;
}

/**
 * An offering containing multiple packages.
 */
export interface Offering {
  /** Offering identifier */
  identifier: string;
  /** Available packages in this offering */
  availablePackages: Package[];
}

/**
 * All available offerings.
 */
export interface Offerings {
  /** The current/default offering */
  current: Offering | null;
  /** All offerings keyed by identifier */
  all: Record<string, Offering>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Results
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of a purchase operation.
 */
export interface PurchaseResult {
  /** Updated customer info after purchase */
  customerInfo: CustomerInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration options for RevenueCat.
 */
export interface RevenueCatConfig {
  /** Platform-specific API key */
  apiKey: string;
  /** Optional app user ID (uses anonymous ID if not provided) */
  appUserID?: string;
  /** Use Amazon App Store (mobile only) */
  useAmazon?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log levels for RevenueCat debugging.
 */
export enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

/**
 * Result of presenting a paywall.
 */
export enum PaywallResult {
  /** Paywall was not presented (user already has entitlement) */
  NOT_PRESENTED = 'NOT_PRESENTED',
  /** An error occurred */
  ERROR = 'ERROR',
  /** User cancelled the paywall */
  CANCELLED = 'CANCELLED',
  /** User successfully purchased */
  PURCHASED = 'PURCHASED',
  /** User successfully restored purchases */
  RESTORED = 'RESTORED',
}

// ─────────────────────────────────────────────────────────────────────────────
// Paywall Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for presenting a paywall.
 */
export interface PaywallOptions {
  /** Specific offering to display (uses current offering if not provided) */
  offering?: Offering;
}

/**
 * Extended options for conditional paywall presentation.
 */
export interface PaywallIfNeededOptions extends PaywallOptions {
  /** Entitlement identifier to check before showing paywall */
  requiredEntitlementIdentifier: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main interface that all platform implementations must follow.
 *
 * This ensures consistent API across web, mobile, and macOS.
 */
export interface RevenueCatInterface {
  /**
   * Configure RevenueCat with API key and optional user ID.
   */
  configure(config: RevenueCatConfig): void | Promise<void>;

  /**
   * Get current customer subscription info.
   */
  getCustomerInfo(): Promise<CustomerInfo>;

  /**
   * Get all available offerings.
   */
  getOfferings(): Promise<Offerings>;

  /**
   * Get specific products by their identifiers.
   */
  getProducts(productIds: string[]): Promise<Product[]>;

  /**
   * Purchase a specific product.
   */
  purchaseProduct(product: Product): Promise<PurchaseResult>;

  /**
   * Purchase a specific package.
   */
  purchasePackage(pkg: Package): Promise<PurchaseResult>;

  /**
   * Sync purchases with RevenueCat backend.
   * Useful for restoring purchases or syncing across devices.
   */
  syncPurchases(): Promise<void>;

  /**
   * Restore previous purchases.
   */
  restorePurchases(): Promise<CustomerInfo>;

  /**
   * Set the log level for debugging.
   */
  setLogLevel(level: LogLevel): void;

  /**
   * Present the paywall UI.
   */
  presentPaywall(options?: PaywallOptions): Promise<PaywallResult>;

  /**
   * Present the paywall only if user doesn't have required entitlement.
   */
  presentPaywallIfNeeded(
    options: PaywallIfNeededOptions
  ): Promise<PaywallResult>;

  /**
   * Check if user has a specific entitlement.
   */
  hasEntitlement(entitlementId: string): Promise<boolean>;

  /**
   * Check if user has an active subscription.
   */
  isSubscribed(): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error codes specific to purchase operations.
 */
export enum PurchaseErrorCode {
  /** RevenueCat not configured */
  NOT_CONFIGURED = 'PURCHASE_NOT_CONFIGURED',
  /** Product not found */
  PRODUCT_NOT_FOUND = 'PURCHASE_PRODUCT_NOT_FOUND',
  /** Purchase was cancelled by user */
  CANCELLED = 'PURCHASE_CANCELLED',
  /** Network error during purchase */
  NETWORK_ERROR = 'PURCHASE_NETWORK_ERROR',
  /** Purchase already owned */
  ALREADY_OWNED = 'PURCHASE_ALREADY_OWNED',
  /** Unknown error */
  UNKNOWN = 'PURCHASE_UNKNOWN_ERROR',
}

/**
 * Custom error class for purchase-related errors.
 */
export class PurchaseError extends Error {
  constructor(
    public readonly code: PurchaseErrorCode,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'PurchaseError';
  }
}
