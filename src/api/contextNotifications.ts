import { logger } from '@/ui/logger'
import { PushNotificationClient } from './pushNotifications'

/**
 * Usage data structure from Claude API responses
 */
export interface UsageData {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
}

/**
 * Maximum context size in tokens (190K tokens for Claude's context window).
 * Using 190K as practical maximum per HAP-309 specification.
 */
const MAX_CONTEXT_SIZE = 190000

/**
 * Threshold percentages for warning states - matching mobile app constants.
 */
const WARNING_THRESHOLD = 0.80 // 80%
const CRITICAL_THRESHOLD = 0.95 // 95%

/**
 * Minimum time between notifications for the same threshold (5 minutes).
 * Prevents spam when context hovers near a threshold.
 */
const DEBOUNCE_INTERVAL_MS = 5 * 60 * 1000

/**
 * Tracks context usage and sends push notifications when thresholds are crossed.
 *
 * This service monitors context usage via the sendUsageData calls in apiSession.ts
 * and triggers push notifications when usage crosses 80% (warning) or 95% (critical).
 *
 * Debouncing Logic:
 * - Only sends notification when crossing INTO a threshold level
 * - Won't re-notify for same threshold within DEBOUNCE_INTERVAL_MS
 * - Resets when context drops below threshold
 *
 * @see HAP-343 for feature specification
 */
export class ContextNotificationService {
    private readonly pushClient: PushNotificationClient
    private readonly sessionId: string
    private readonly sessionPath: string

    /** Last threshold level that triggered a notification: 'none' | 'warning' | 'critical' */
    private lastNotifiedLevel: 'none' | 'warning' | 'critical' = 'none'

    /** Timestamp of last notification sent (for debouncing) */
    private lastNotificationTime = 0

    /** Whether notifications are enabled (respects user setting) */
    private enabled = true

    constructor(
        pushClient: PushNotificationClient,
        sessionId: string,
        sessionPath: string
    ) {
        this.pushClient = pushClient
        this.sessionId = sessionId
        this.sessionPath = sessionPath
    }

    /**
     * Enable or disable context notifications.
     * When disabled, no notifications will be sent regardless of context usage.
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled
        logger.debug(`[CONTEXT-NOTIFY] Notifications ${enabled ? 'enabled' : 'disabled'}`)
    }

    /**
     * Calculate context size from usage data.
     * Context size = input_tokens + cache_creation_input_tokens + cache_read_input_tokens
     * This matches the formula used in the mobile app's reducer.
     *
     * @param usage - Usage data from Claude API
     * @returns Total context size in tokens
     */
    static calculateContextSize(usage: UsageData): number {
        return usage.input_tokens +
            (usage.cache_creation_input_tokens || 0) +
            (usage.cache_read_input_tokens || 0)
    }

    /**
     * Check context usage from usage data and send notification if threshold is crossed.
     * Convenience method that calculates context size from usage data.
     *
     * @param usage - Usage data from Claude API response
     */
    async checkUsageAndNotify(usage: UsageData): Promise<void> {
        const contextSize = ContextNotificationService.calculateContextSize(usage)
        await this.checkAndNotify(contextSize)
    }

    /**
     * Check context usage and send notification if threshold is crossed.
     * Call this after each usage report with the total context size.
     *
     * @param contextSize - Total context size in tokens
     */
    async checkAndNotify(contextSize: number): Promise<void> {
        if (!this.enabled) {
            return
        }

        const percentage = contextSize / MAX_CONTEXT_SIZE
        const currentLevel = this.getThresholdLevel(percentage)

        logger.debug(`[CONTEXT-NOTIFY] Context: ${contextSize} tokens (${Math.round(percentage * 100)}%), level: ${currentLevel}`)

        // Check if we crossed into a new threshold and need to notify
        // Note: shouldNotify only returns true for 'warning' or 'critical' levels
        if (currentLevel !== 'none' && this.shouldNotify(currentLevel)) {
            await this.sendNotification(currentLevel, percentage)
        }

        // Update last notified level
        this.lastNotifiedLevel = currentLevel
    }

    /**
     * Determine the threshold level for a given percentage.
     */
    private getThresholdLevel(percentage: number): 'none' | 'warning' | 'critical' {
        if (percentage >= CRITICAL_THRESHOLD) {
            return 'critical'
        } else if (percentage >= WARNING_THRESHOLD) {
            return 'warning'
        }
        return 'none'
    }

    /**
     * Determine if we should send a notification based on:
     * 1. We crossed INTO a threshold level (not already there)
     * 2. We haven't notified for this level recently (debounce)
     */
    private shouldNotify(currentLevel: 'none' | 'warning' | 'critical'): boolean {
        // Don't notify if no threshold crossed
        if (currentLevel === 'none') {
            return false
        }

        const now = Date.now()
        const timeSinceLastNotification = now - this.lastNotificationTime

        // If we're escalating (warning -> critical), always notify
        if (currentLevel === 'critical' && this.lastNotifiedLevel === 'warning') {
            return timeSinceLastNotification >= DEBOUNCE_INTERVAL_MS
        }

        // If we already notified for this level, respect debounce
        if (currentLevel === this.lastNotifiedLevel) {
            return false
        }

        // If we dropped below and came back up, respect debounce
        if (timeSinceLastNotification < DEBOUNCE_INTERVAL_MS) {
            return false
        }

        // New threshold crossing with debounce satisfied
        return true
    }

    /**
     * Send push notification for threshold crossing.
     */
    private async sendNotification(level: 'warning' | 'critical', percentage: number): Promise<void> {
        const percentDisplay = Math.round(percentage * 100)
        const projectName = this.getProjectName()

        let title: string
        let body: string

        if (level === 'critical') {
            title = '⚠️ Context Almost Full'
            body = `${projectName}: ${percentDisplay}% context used. Consider summarizing or starting a new session.`
        } else {
            title = '📊 High Context Usage'
            body = `${projectName}: ${percentDisplay}% context used.`
        }

        logger.debug(`[CONTEXT-NOTIFY] Sending ${level} notification: "${title}"`)

        try {
            await this.pushClient.sendToAllDevices(title, body, {
                type: 'context-warning',
                level,
                sessionId: this.sessionId,
                percentage: percentDisplay,
                // Deep link data - allows mobile app to open the session directly
                screen: 'session',
                params: {
                    id: this.sessionId
                }
            })

            this.lastNotificationTime = Date.now()
            logger.debug(`[CONTEXT-NOTIFY] ${level} notification sent successfully`)
        } catch (error) {
            // Log but don't throw - notifications are best-effort
            logger.debug(`[CONTEXT-NOTIFY] Failed to send notification:`, error)
        }
    }

    /**
     * Extract a human-readable project name from the session path.
     */
    private getProjectName(): string {
        // Get last path segment as project name
        const parts = this.sessionPath.split('/')
        const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || 'Session'
        return lastPart
    }

    /**
     * Reset notification state. Call when session ends or is resumed.
     */
    reset(): void {
        this.lastNotifiedLevel = 'none'
        this.lastNotificationTime = 0
    }
}
