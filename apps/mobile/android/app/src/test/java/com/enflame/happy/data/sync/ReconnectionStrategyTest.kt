package com.enflame.happy.data.sync

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for [ReconnectionStrategy].
 *
 * Validates the exponential backoff delay computation, maximum delay capping,
 * and exhaustion logic.
 */
class ReconnectionStrategyTest {

    // ========================================================================
    // Default Configuration
    // ========================================================================

    @Test
    fun `default strategy has correct base delay`() {
        val strategy = ReconnectionStrategy()
        assertEquals(1_000L, strategy.baseDelayMs)
    }

    @Test
    fun `default strategy has correct max delay`() {
        val strategy = ReconnectionStrategy()
        assertEquals(30_000L, strategy.maxDelayMs)
    }

    @Test
    fun `default strategy has correct backoff multiplier`() {
        val strategy = ReconnectionStrategy()
        assertEquals(2.0, strategy.backoffMultiplier, 0.001)
    }

    @Test
    fun `default strategy has correct max attempts`() {
        val strategy = ReconnectionStrategy()
        assertEquals(10, strategy.maxAttempts)
    }

    // ========================================================================
    // Exponential Backoff Delay
    // ========================================================================

    @Test
    fun `delayForAttempt 0 returns base delay`() {
        val strategy = ReconnectionStrategy()
        assertEquals(1_000L, strategy.delayForAttempt(0))
    }

    @Test
    fun `delayForAttempt 1 returns 2x base delay`() {
        val strategy = ReconnectionStrategy()
        assertEquals(2_000L, strategy.delayForAttempt(1))
    }

    @Test
    fun `delayForAttempt 2 returns 4x base delay`() {
        val strategy = ReconnectionStrategy()
        assertEquals(4_000L, strategy.delayForAttempt(2))
    }

    @Test
    fun `delayForAttempt 3 returns 8x base delay`() {
        val strategy = ReconnectionStrategy()
        assertEquals(8_000L, strategy.delayForAttempt(3))
    }

    @Test
    fun `delayForAttempt 4 returns 16x base delay`() {
        val strategy = ReconnectionStrategy()
        assertEquals(16_000L, strategy.delayForAttempt(4))
    }

    @Test
    fun `delayForAttempt follows exponential backoff progression`() {
        val strategy = ReconnectionStrategy(
            baseDelayMs = 1_000L,
            backoffMultiplier = 2.0,
            maxDelayMs = 60_000L
        )

        // 1s, 2s, 4s, 8s, 16s, 32s
        assertEquals(1_000L, strategy.delayForAttempt(0))
        assertEquals(2_000L, strategy.delayForAttempt(1))
        assertEquals(4_000L, strategy.delayForAttempt(2))
        assertEquals(8_000L, strategy.delayForAttempt(3))
        assertEquals(16_000L, strategy.delayForAttempt(4))
        assertEquals(32_000L, strategy.delayForAttempt(5))
    }

    // ========================================================================
    // Maximum Delay Capping
    // ========================================================================

    @Test
    fun `delayForAttempt is capped at maxDelay`() {
        val strategy = ReconnectionStrategy(
            baseDelayMs = 1_000L,
            maxDelayMs = 30_000L,
            backoffMultiplier = 2.0
        )

        // Attempt 5 would be 32_000 but capped at 30_000
        assertEquals(30_000L, strategy.delayForAttempt(5))
    }

    @Test
    fun `delayForAttempt stays at maxDelay for high attempt numbers`() {
        val strategy = ReconnectionStrategy()

        // All high attempts should return maxDelay
        assertEquals(30_000L, strategy.delayForAttempt(10))
        assertEquals(30_000L, strategy.delayForAttempt(50))
        assertEquals(30_000L, strategy.delayForAttempt(100))
    }

    @Test
    fun `delayForAttempt with small maxDelay caps immediately`() {
        val strategy = ReconnectionStrategy(
            baseDelayMs = 5_000L,
            maxDelayMs = 5_000L,
            backoffMultiplier = 2.0
        )

        // All attempts return baseDelay since it equals maxDelay
        assertEquals(5_000L, strategy.delayForAttempt(0))
        assertEquals(5_000L, strategy.delayForAttempt(1))
        assertEquals(5_000L, strategy.delayForAttempt(5))
    }

    // ========================================================================
    // Custom Configuration
    // ========================================================================

    @Test
    fun `custom base delay is used`() {
        val strategy = ReconnectionStrategy(baseDelayMs = 500L)
        assertEquals(500L, strategy.delayForAttempt(0))
        assertEquals(1_000L, strategy.delayForAttempt(1))
    }

    @Test
    fun `custom backoff multiplier is used`() {
        val strategy = ReconnectionStrategy(
            baseDelayMs = 1_000L,
            backoffMultiplier = 3.0,
            maxDelayMs = 100_000L
        )

        // 1s, 3s, 9s, 27s
        assertEquals(1_000L, strategy.delayForAttempt(0))
        assertEquals(3_000L, strategy.delayForAttempt(1))
        assertEquals(9_000L, strategy.delayForAttempt(2))
        assertEquals(27_000L, strategy.delayForAttempt(3))
    }

    @Test
    fun `backoff multiplier of 1 produces constant delay`() {
        val strategy = ReconnectionStrategy(
            baseDelayMs = 2_000L,
            backoffMultiplier = 1.0,
            maxDelayMs = 30_000L
        )

        assertEquals(2_000L, strategy.delayForAttempt(0))
        assertEquals(2_000L, strategy.delayForAttempt(1))
        assertEquals(2_000L, strategy.delayForAttempt(5))
        assertEquals(2_000L, strategy.delayForAttempt(10))
    }

    // ========================================================================
    // Exhaustion
    // ========================================================================

    @Test
    fun `isExhausted returns false when attempts are below max`() {
        val strategy = ReconnectionStrategy(maxAttempts = 10)

        assertFalse(strategy.isExhausted(0))
        assertFalse(strategy.isExhausted(5))
        assertFalse(strategy.isExhausted(9))
    }

    @Test
    fun `isExhausted returns true when attempts equal max`() {
        val strategy = ReconnectionStrategy(maxAttempts = 10)

        assertTrue(strategy.isExhausted(10))
    }

    @Test
    fun `isExhausted returns true when attempts exceed max`() {
        val strategy = ReconnectionStrategy(maxAttempts = 10)

        assertTrue(strategy.isExhausted(11))
        assertTrue(strategy.isExhausted(100))
    }

    @Test
    fun `isExhausted returns false when maxAttempts is 0 (unlimited)`() {
        val strategy = ReconnectionStrategy(maxAttempts = 0)

        assertFalse(strategy.isExhausted(0))
        assertFalse(strategy.isExhausted(100))
        assertFalse(strategy.isExhausted(1_000_000))
    }

    @Test
    fun `isExhausted with maxAttempts 1 is exhausted after first attempt`() {
        val strategy = ReconnectionStrategy(maxAttempts = 1)

        assertFalse(strategy.isExhausted(0))
        assertTrue(strategy.isExhausted(1))
    }

    // ========================================================================
    // Data Class Equality
    // ========================================================================

    @Test
    fun `strategies with same parameters are equal`() {
        val s1 = ReconnectionStrategy(baseDelayMs = 500, maxDelayMs = 10_000, backoffMultiplier = 3.0, maxAttempts = 5)
        val s2 = ReconnectionStrategy(baseDelayMs = 500, maxDelayMs = 10_000, backoffMultiplier = 3.0, maxAttempts = 5)

        assertEquals(s1, s2)
        assertEquals(s1.hashCode(), s2.hashCode())
    }

    @Test
    fun `default strategy equals another default strategy`() {
        assertEquals(ReconnectionStrategy(), ReconnectionStrategy())
    }
}
