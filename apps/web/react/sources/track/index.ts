import { tracking } from './tracking';

// Re-export tracking for direct access
export { tracking } from './tracking';

// Re-export performance monitoring utilities (HAP-336, HAP-483)
export {
    // Startup tracking (HAP-336)
    markAppStart,
    markFirstRender,
    getStartupDuration,
    // Screen render tracking (HAP-336)
    trackScreenRender,
    getScreenBaseline,
    getAllScreenBaselines,
    logBaselines,
    reportBaselines,
    createTimer,
    // API latency tracking (HAP-483)
    trackApiLatency,
    createApiTimer,
    getApiMetrics,
    reportApiHealth,
} from '@/utils/performance';

/**
 * Initialize tracking with an anonymous user ID.
 * Should be called once during auth initialization.
 */
export function initializeTracking(anonymousUserId: string) {
    tracking?.identify(anonymousUserId, { name: anonymousUserId });
}

/**
 * Auth events
 */
export function trackAccountCreated() {
    tracking?.capture('account_created');
}

export function trackAccountRestored() {
    tracking?.capture('account_restored');
}

export function trackLogout() {
    tracking?.reset();
}

/**
 * Core user interactions
 */
export function trackConnectAttempt() {
    tracking?.capture('connect_attempt');
}

export function trackMessageSent() {
    tracking?.capture('message_sent');
}

export function trackVoiceRecording(action: 'start' | 'stop') {
    tracking?.capture('voice_recording', { action });
}

export function trackPermissionResponse(allowed: boolean) {
    tracking?.capture('permission_response', { allowed });
}

/**
 * Paywall events
 */
export function trackPaywallButtonClicked() {
    tracking?.capture('paywall_button_clicked');
}

export function trackPaywallPresented() {
    tracking?.capture('paywall_presented');
}

export function trackPaywallPurchased() {
    tracking?.capture('paywall_purchased');
}

export function trackPaywallCancelled() {
    tracking?.capture('paywall_cancelled');
}

export function trackPaywallRestored() {
    tracking?.capture('paywall_restored');
}

export function trackPaywallError(error: string) {
    tracking?.capture('paywall_error', { error });
}

/**
 * Review request events
 */
export function trackReviewPromptShown() {
    tracking?.capture('review_prompt_shown');
}

export function trackReviewPromptResponse(likesApp: boolean) {
    tracking?.capture('review_prompt_response', { likes_app: likesApp });
}

export function trackReviewStoreShown() {
    tracking?.capture('review_store_shown');
}

export function trackReviewRetryScheduled(daysUntilRetry: number) {
    tracking?.capture('review_retry_scheduled', { days_until_retry: daysUntilRetry });
}

/**
 * What's New / Changelog events
 */
export function trackWhatsNewClicked() {
    tracking?.capture('whats_new_clicked');
}

/**
 * Friends feature events
 *
 * NOTE: We're measuring how interested people are in the friend feature as-is,
 * considering removing the tab to avoid confusion.
 */
export function trackFriendsSearch() {
    tracking?.capture('friends_search');
}

export function trackFriendsProfileView() {
    tracking?.capture('friends_profile_view');
}

export function trackFriendsConnect() {
    tracking?.capture('friends_connect');
}

/**
 * Session restore events (HAP-688)
 *
 * Track restore operations to understand timeout patterns and success rates.
 * These events help answer: "What is the actual success rate of restores that timeout?"
 */

export interface SessionRestoreStartedProps {
    /** The session ID being restored */
    sessionId: string;
    /** The machine ID where the session will be restored */
    machineId: string;
}

export interface SessionRestoreCompletedProps {
    /** The session ID that was being restored */
    sessionId: string;
    /** The machine ID where the session was restored */
    machineId: string;
    /** Whether the restore was successful */
    success: boolean;
    /** Whether the operation timed out (may have succeeded despite timeout) */
    timedOut: boolean;
    /** Duration of the restore operation in milliseconds */
    durationMs: number;
    /** The new session ID if successful */
    newSessionId?: string;
}

/**
 * Track when a session restore operation starts
 */
export function trackSessionRestoreStarted(props: SessionRestoreStartedProps) {
    tracking?.capture('session_restore_started', {
        session_id: props.sessionId,
        machine_id: props.machineId,
    });
}

/**
 * Track when a session restore operation completes (success, failure, or timeout)
 */
export function trackSessionRestoreCompleted(props: SessionRestoreCompletedProps) {
    tracking?.capture('session_restore_completed', {
        session_id: props.sessionId,
        machine_id: props.machineId,
        success: props.success,
        timed_out: props.timedOut,
        duration_ms: props.durationMs,
        // Only include new_session_id if present (PostHog doesn't accept undefined)
        ...(props.newSessionId && { new_session_id: props.newSessionId }),
    });
}

