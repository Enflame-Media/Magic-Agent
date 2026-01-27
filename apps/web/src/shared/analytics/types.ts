/**
 * Purchase Analytics Types
 *
 * Shared analytics types for tracking purchase funnel events
 * across all platforms (web, mobile, macOS).
 *
 * @module @happy-vue/shared/analytics
 */

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Purchase funnel analytics events.
 *
 * These events track the complete user journey through the purchase funnel.
 */
export enum PurchaseAnalyticsEvent {
  /** Paywall was displayed to the user */
  PAYWALL_PRESENTED = 'paywall_presented',

  /** User initiated a purchase */
  PURCHASE_STARTED = 'purchase_started',

  /** Purchase completed successfully */
  PURCHASE_COMPLETED = 'purchase_completed',

  /** User cancelled the purchase */
  PURCHASE_CANCELLED = 'purchase_cancelled',

  /** Purchase failed due to an error */
  PURCHASE_FAILED = 'purchase_failed',

  /** User initiated restore purchases */
  RESTORE_STARTED = 'restore_started',

  /** Restore purchases completed */
  RESTORE_COMPLETED = 'restore_completed',
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Properties
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform identifier for analytics events.
 */
export type AnalyticsPlatform = 'web' | 'mobile' | 'macos';

/**
 * Common properties for all purchase analytics events.
 */
export interface BasePurchaseEventProperties {
  /** Platform where the event occurred */
  platform: AnalyticsPlatform;

  /** ISO timestamp when the event occurred */
  timestamp: string;

  /** User ID if available */
  userId?: string;
}

/**
 * Properties for paywall events.
 */
export interface PaywallEventProperties extends BasePurchaseEventProperties {
  /** Offering identifier that was displayed */
  offeringId?: string;

  /** Source/trigger that caused paywall to appear */
  source?: string;
}

/**
 * Properties for purchase events.
 */
export interface PurchaseEventProperties extends BasePurchaseEventProperties {
  /** Package identifier (e.g., "$rc_monthly") */
  packageId?: string;

  /** Product identifier from the store */
  productId?: string;

  /** Price amount in the user's currency */
  price?: number;

  /** Currency code (e.g., "USD") */
  currency?: string;
}

/**
 * Properties for purchase error events.
 */
export interface PurchaseErrorEventProperties extends PurchaseEventProperties {
  /** Error code from the purchase system */
  errorCode?: string;

  /** Human-readable error message */
  errorMessage?: string;
}

/**
 * Properties for restore events.
 */
export interface RestoreEventProperties extends BasePurchaseEventProperties {
  /** Number of purchases restored (for completed events) */
  restoredCount?: number;

  /** Whether any pro entitlement was restored */
  restoredPro?: boolean;
}

/**
 * Union type of all possible event property types.
 */
export type PurchaseEventData =
  | PaywallEventProperties
  | PurchaseEventProperties
  | PurchaseErrorEventProperties
  | RestoreEventProperties;

/**
 * All possible properties that can be passed to trackPurchaseEvent.
 *
 * This is a more permissive type that allows any valid event property
 * to be passed, letting the analytics provider handle validation.
 */
export interface PurchaseEventProperties_All extends BasePurchaseEventProperties {
  /** Offering identifier that was displayed */
  offeringId?: string;

  /** Source/trigger that caused paywall to appear */
  source?: string;

  /** Package identifier (e.g., "$rc_monthly") */
  packageId?: string;

  /** Product identifier from the store */
  productId?: string;

  /** Price amount in the user's currency */
  price?: number;

  /** Currency code (e.g., "USD") */
  currency?: string;

  /** Error code from the purchase system */
  errorCode?: string;

  /** Human-readable error message */
  errorMessage?: string;

  /** Number of purchases restored (for completed events) */
  restoredCount?: number;

  /** Whether any pro entitlement was restored */
  restoredPro?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Provider Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interface for analytics provider implementations.
 *
 * Each platform can provide its own implementation that sends events
 * to the appropriate analytics service (e.g., Amplitude, Mixpanel, Firebase).
 *
 * @example
 * ```typescript
 * class AmplitudeProvider implements AnalyticsProvider {
 *   track(event: PurchaseAnalyticsEvent, properties: PurchaseEventData): void {
 *     amplitude.track(event, properties);
 *   }
 * }
 * ```
 */
export interface AnalyticsProvider {
  /**
   * Track a purchase analytics event.
   *
   * @param event - The event type to track
   * @param properties - Event properties and metadata
   */
  track(event: PurchaseAnalyticsEvent, properties: PurchaseEventData): void;

  /**
   * Identify the current user for analytics.
   *
   * @param userId - The user identifier
   * @param traits - Optional user traits/properties
   */
  identify?(userId: string, traits?: Record<string, unknown>): void;
}
