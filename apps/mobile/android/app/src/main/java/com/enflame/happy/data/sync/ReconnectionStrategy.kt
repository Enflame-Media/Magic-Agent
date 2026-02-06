package com.enflame.happy.data.sync

import kotlin.math.min
import kotlin.math.pow

/**
 * Exponential backoff reconnection strategy for WebSocket connections.
 *
 * Computes reconnection delays using the formula:
 * ```
 * delay = min(baseDelay * backoffMultiplier^attempt, maxDelay)
 * ```
 *
 * ## Delay Progression (default config)
 * | Attempt | Delay |
 * |---------|-------|
 * | 0       | 1s    |
 * | 1       | 2s    |
 * | 2       | 4s    |
 * | 3       | 8s    |
 * | 4       | 16s   |
 * | 5+      | 30s   |
 *
 * This matches the iOS `SyncService.ReconnectionConfig` for cross-platform parity.
 *
 * @property baseDelayMs Base delay in milliseconds (default: 1000).
 * @property maxDelayMs Maximum delay in milliseconds (default: 30000).
 * @property backoffMultiplier Multiplier for exponential backoff (default: 2.0).
 * @property maxAttempts Maximum consecutive reconnection attempts before giving up.
 *                       Set to 0 for unlimited attempts (default: 10).
 */
data class ReconnectionStrategy(
    val baseDelayMs: Long = DEFAULT_BASE_DELAY_MS,
    val maxDelayMs: Long = DEFAULT_MAX_DELAY_MS,
    val backoffMultiplier: Double = DEFAULT_BACKOFF_MULTIPLIER,
    val maxAttempts: Int = DEFAULT_MAX_ATTEMPTS
) {

    /**
     * Compute the delay in milliseconds for the given attempt number.
     *
     * @param attempt Zero-based attempt index.
     * @return Delay in milliseconds, capped at [maxDelayMs].
     */
    fun delayForAttempt(attempt: Int): Long {
        val uncapped = baseDelayMs * backoffMultiplier.pow(attempt.toDouble())
        return min(uncapped.toLong(), maxDelayMs)
    }

    /**
     * Whether the given attempt number has exceeded the maximum allowed attempts.
     *
     * @param attempt Zero-based attempt index (i.e., the number of attempts already made).
     * @return `true` if [maxAttempts] > 0 and [attempt] >= [maxAttempts], `false` otherwise.
     */
    fun isExhausted(attempt: Int): Boolean {
        return maxAttempts > 0 && attempt >= maxAttempts
    }

    companion object {
        /** Default base delay: 1 second. */
        const val DEFAULT_BASE_DELAY_MS = 1_000L

        /** Default maximum delay: 30 seconds. */
        const val DEFAULT_MAX_DELAY_MS = 30_000L

        /** Default backoff multiplier: 2x. */
        const val DEFAULT_BACKOFF_MULTIPLIER = 2.0

        /** Default maximum attempts: 10. */
        const val DEFAULT_MAX_ATTEMPTS = 10
    }
}
