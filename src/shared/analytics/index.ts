/**
 * Purchase Analytics Module
 *
 * Provides analytics tracking for purchase funnel events across all platforms.
 *
 * @example
 * ```typescript
 * import { trackPurchaseEvent, PurchaseAnalyticsEvent, setAnalyticsProvider } from '@/shared';
 *
 * // Track a paywall view
 * trackPurchaseEvent(PurchaseAnalyticsEvent.PAYWALL_PRESENTED, {
 *   platform: 'web',
 *   offeringId: 'default',
 * });
 *
 * // Use a custom provider
 * setAnalyticsProvider(myAmplitudeProvider);
 * ```
 *
 * @module @/shared/analytics
 */

export * from './types';

import type {
  AnalyticsProvider,
  PurchaseAnalyticsEvent,
  PurchaseEventData,
  PurchaseEventProperties_All,
  AnalyticsPlatform,
  BasePurchaseEventProperties,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Default Console Provider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default analytics provider that logs to console.
 *
 * Useful for development and debugging. In production, replace with
 * a provider that sends events to your analytics service.
 */
const consoleProvider: AnalyticsProvider = {
  track(event: PurchaseAnalyticsEvent, properties: PurchaseEventData): void {
    console.log('[Analytics]', event, properties);
  },

  identify(userId: string, traits?: Record<string, unknown>): void {
    console.log('[Analytics] Identify:', userId, traits);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider Management
// ─────────────────────────────────────────────────────────────────────────────

let currentProvider: AnalyticsProvider = consoleProvider;

/**
 * Set the analytics provider for purchase tracking.
 *
 * Call this early in your app initialization to configure where
 * analytics events are sent.
 *
 * @param provider - The analytics provider implementation
 *
 * @example
 * ```typescript
 * import { setAnalyticsProvider } from '@/shared';
 *
 * // Use Amplitude
 * setAnalyticsProvider({
 *   track: (event, props) => amplitude.track(event, props),
 *   identify: (userId) => amplitude.setUserId(userId),
 * });
 * ```
 */
export function setAnalyticsProvider(provider: AnalyticsProvider): void {
  currentProvider = provider;
}

/**
 * Get the current analytics provider.
 *
 * @returns The currently configured analytics provider
 */
export function getAnalyticsProvider(): AnalyticsProvider {
  return currentProvider;
}

/**
 * Reset to the default console provider.
 *
 * Useful for testing or development.
 */
export function resetAnalyticsProvider(): void {
  currentProvider = consoleProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Track a purchase analytics event.
 *
 * This is the main function for tracking purchase funnel events.
 * It automatically adds a timestamp if not provided.
 *
 * @param event - The event type to track
 * @param properties - Event properties (platform is required)
 *
 * @example
 * ```typescript
 * // Track paywall shown
 * trackPurchaseEvent(PurchaseAnalyticsEvent.PAYWALL_PRESENTED, {
 *   platform: 'web',
 *   offeringId: 'default',
 *   source: 'settings_button',
 * });
 *
 * // Track successful purchase
 * trackPurchaseEvent(PurchaseAnalyticsEvent.PURCHASE_COMPLETED, {
 *   platform: 'mobile',
 *   packageId: '$rc_monthly',
 *   productId: 'happy_pro_monthly',
 *   price: 9.99,
 *   currency: 'USD',
 * });
 *
 * // Track purchase error
 * trackPurchaseEvent(PurchaseAnalyticsEvent.PURCHASE_FAILED, {
 *   platform: 'web',
 *   packageId: '$rc_annual',
 *   errorCode: 'NETWORK_ERROR',
 *   errorMessage: 'Failed to connect to payment server',
 * });
 * ```
 */
export function trackPurchaseEvent(
  event: PurchaseAnalyticsEvent,
  properties: Omit<PurchaseEventProperties_All, 'timestamp'> & { timestamp?: string }
): void {
  const fullProperties: PurchaseEventData = {
    ...properties,
    timestamp: properties.timestamp ?? new Date().toISOString(),
  } as PurchaseEventData;

  try {
    currentProvider.track(event, fullProperties);
  } catch (error) {
    // Never let analytics errors break the app
    console.error('[Analytics] Failed to track event:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create base properties for an event.
 *
 * Helper to create the common properties with current timestamp.
 *
 * @param platform - The platform identifier
 * @param userId - Optional user ID
 * @returns Base properties object
 */
export function createBaseProperties(
  platform: AnalyticsPlatform,
  userId?: string
): BasePurchaseEventProperties {
  return {
    platform,
    timestamp: new Date().toISOString(),
    userId,
  };
}

/**
 * Identify the current user for analytics.
 *
 * Associates future events with this user ID.
 *
 * @param userId - The user identifier
 * @param traits - Optional user traits
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  try {
    currentProvider.identify?.(userId, traits);
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}
