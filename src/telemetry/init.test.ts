/**
 * Tests for telemetry init module (HAP-939)
 *
 * Tests the telemetry initialization functions to improve mutation coverage.
 * Focus on initializeTelemetry, shutdownTelemetry, and related utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config module
vi.mock('./config', () => ({
  loadTelemetryConfig: vi.fn()
}))

// Mock sentry module
vi.mock('./sentry', () => ({
  initializeSentry: vi.fn().mockReturnValue(true),
  flush: vi.fn().mockResolvedValue(true)
}))

// Mock sender module
vi.mock('./sender', () => ({
  getTelemetrySender: vi.fn().mockReturnValue({
    trackEvent: vi.fn(),
    stopPeriodicFlush: vi.fn()
  }),
  flushTelemetry: vi.fn().mockResolvedValue(true),
  trackEvent: vi.fn()
}))

describe('telemetry/init', () => {
  const originalEnv = process.env
  const originalArgv = process.argv

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    process.argv = [...originalArgv]
  })

  afterEach(() => {
    process.env = originalEnv
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  describe('initializeTelemetry', () => {
    it('should return disabled result when telemetry is disabled', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: false,
        anonymize: true,
        categories: { errors: false, usage: false, performance: false }
      })

      const { initializeTelemetry } = await import('./init')

      const result = await initializeTelemetry()

      expect(result.initialized).toBe(false)
      expect(result.config.enabled).toBe(false)
      expect(result.sentryEnabled).toBe(false)
      expect(result.usageEnabled).toBe(false)
      expect(result.performanceEnabled).toBe(false)
    })

    it('should initialize Sentry when errors category is enabled', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: false, performance: false }
      })

      const { initializeSentry } = await import('./sentry')
      const { initializeTelemetry } = await import('./init')

      const result = await initializeTelemetry()

      expect(initializeSentry).toHaveBeenCalled()
      expect(result.sentryEnabled).toBe(true)
    })

    it('should initialize sender when usage category is enabled', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: true, performance: false }
      })

      const { getTelemetrySender } = await import('./sender')
      const { initializeTelemetry } = await import('./init')

      const result = await initializeTelemetry()

      expect(getTelemetrySender).toHaveBeenCalled()
      expect(result.usageEnabled).toBe(true)
    })

    it('should track session_started event when usage is enabled', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: true, performance: false }
      })

      const { trackEvent } = await import('./sender')
      const { initializeTelemetry } = await import('./init')

      await initializeTelemetry()

      expect(trackEvent).toHaveBeenCalledWith('session_started', expect.any(Object))
    })

    it('should detect daemon mode from process argv', async () => {
      process.argv = ['node', 'happy', 'daemon', 'start']

      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: true, performance: false }
      })

      const { trackEvent } = await import('./sender')
      const { initializeTelemetry } = await import('./init')

      await initializeTelemetry()

      expect(trackEvent).toHaveBeenCalledWith('session_started', { mode: 'daemon' })
    })

    it('should detect cli mode when not daemon', async () => {
      process.argv = ['node', 'happy', 'start']

      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: true, performance: false }
      })

      const { trackEvent } = await import('./sender')
      const { initializeTelemetry } = await import('./init')

      await initializeTelemetry()

      expect(trackEvent).toHaveBeenCalledWith('session_started', { mode: 'cli' })
    })

    it('should return cached result on subsequent calls', async () => {
      vi.resetModules()

      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: true, performance: true }
      })

      const { initializeTelemetry } = await import('./init')

      const result1 = await initializeTelemetry()
      const callsAfterFirst = vi.mocked(loadTelemetryConfig).mock.calls.length

      const result2 = await initializeTelemetry()
      const callsAfterSecond = vi.mocked(loadTelemetryConfig).mock.calls.length

      expect(result1.initialized).toBe(true)
      expect(result2.initialized).toBe(true)
      // loadTelemetryConfig should not be called again after second init
      expect(callsAfterSecond).toBe(callsAfterFirst)
    })

    it('should set performanceEnabled based on config', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: false, performance: true }
      })

      const { initializeTelemetry } = await import('./init')

      const result = await initializeTelemetry()

      expect(result.performanceEnabled).toBe(true)
    })
  })

  describe('shutdownTelemetry', () => {
    it('should return true when not initialized', async () => {
      vi.resetModules()
      const { shutdownTelemetry } = await import('./init')

      const result = await shutdownTelemetry()

      expect(result).toBe(true)
    })

    it('should track session_ended when usage was enabled', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: true, performance: false }
      })

      const { trackEvent } = await import('./sender')
      const { initializeTelemetry, shutdownTelemetry } = await import('./init')

      await initializeTelemetry()
      vi.mocked(trackEvent).mockClear()

      await shutdownTelemetry()

      expect(trackEvent).toHaveBeenCalledWith('session_ended')
    })

    it('should flush Sentry when errors was enabled', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: false, performance: false }
      })

      const { flush } = await import('./sentry')
      const { initializeTelemetry, shutdownTelemetry } = await import('./init')

      await initializeTelemetry()

      await shutdownTelemetry()

      expect(flush).toHaveBeenCalled()
    })

    it('should flush telemetry when usage was enabled', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: true, performance: false }
      })

      const { flushTelemetry } = await import('./sender')
      const { initializeTelemetry, shutdownTelemetry } = await import('./init')

      await initializeTelemetry()

      await shutdownTelemetry()

      expect(flushTelemetry).toHaveBeenCalled()
    })

    it('should respect custom timeout', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: false, performance: false }
      })

      const { flush } = await import('./sentry')
      const { initializeTelemetry, shutdownTelemetry } = await import('./init')

      await initializeTelemetry()

      await shutdownTelemetry(5000)

      expect(flush).toHaveBeenCalledWith(5000)
    })

    it('should return false when flush fails', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: false, performance: false }
      })

      const { flush } = await import('./sentry')
      vi.mocked(flush).mockResolvedValue(false)

      const { initializeTelemetry, shutdownTelemetry } = await import('./init')

      await initializeTelemetry()

      const result = await shutdownTelemetry()

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: false, performance: false }
      })

      const { flush } = await import('./sentry')
      vi.mocked(flush).mockRejectedValue(new Error('Flush failed'))

      const { initializeTelemetry, shutdownTelemetry } = await import('./init')

      await initializeTelemetry()

      const result = await shutdownTelemetry()

      expect(result).toBe(false)
    })

    it('should return true when nothing to flush', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: false, performance: false }
      })

      const { initializeTelemetry, shutdownTelemetry } = await import('./init')

      await initializeTelemetry()

      const result = await shutdownTelemetry()

      expect(result).toBe(true)
    })
  })

  describe('getTelemetryConfig', () => {
    it('should return null when not initialized', async () => {
      vi.resetModules()
      const { getTelemetryConfig } = await import('./init')

      const result = getTelemetryConfig()

      expect(result).toBeNull()
    })

    it('should return config after initialization', async () => {
      const { loadTelemetryConfig } = await import('./config')
      const mockConfig = {
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: true, performance: true }
      }
      vi.mocked(loadTelemetryConfig).mockResolvedValue(mockConfig)

      const { initializeTelemetry, getTelemetryConfig } = await import('./init')

      await initializeTelemetry()

      const result = getTelemetryConfig()

      expect(result).toEqual(mockConfig)
    })
  })

  describe('isTelemetryInitialized', () => {
    it('should return false when not initialized', async () => {
      vi.resetModules()
      const { isTelemetryInitialized } = await import('./init')

      const result = isTelemetryInitialized()

      expect(result).toBe(false)
    })

    it('should return true after initialization', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: true, performance: true }
      })

      const { initializeTelemetry, isTelemetryInitialized } = await import('./init')

      await initializeTelemetry()

      const result = isTelemetryInitialized()

      expect(result).toBe(true)
    })

    it('should return true even when telemetry is disabled (but initialized)', async () => {
      const { loadTelemetryConfig } = await import('./config')
      vi.mocked(loadTelemetryConfig).mockResolvedValue({
        enabled: false,
        anonymize: true,
        categories: { errors: false, usage: false, performance: false }
      })

      const { initializeTelemetry, isTelemetryInitialized } = await import('./init')

      await initializeTelemetry()

      const result = isTelemetryInitialized()

      expect(result).toBe(true)
    })
  })
})
