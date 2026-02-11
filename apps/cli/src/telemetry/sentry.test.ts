/**
 * Tests for telemetry sentry module (HAP-939)
 *
 * Tests the Sentry integration functions to improve mutation coverage.
 * Focus on initializeSentry, captureException, captureMessage, and anonymization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type * as SentryTypes from '@sentry/node'

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
  close: vi.fn().mockResolvedValue(true),
  withScope: vi.fn((callback: (scope: any) => void) => {
    callback({
      setExtras: vi.fn()
    })
  })
}))

// Mock package.json
vi.mock('../../package.json', () => ({
  default: { version: '1.0.0-test' }
}))

describe('telemetry/sentry', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.HAPPY_SENTRY_DSN
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('initializeSentry', () => {
    it('should return false when telemetry is disabled', async () => {
      const { initializeSentry } = await import('./sentry')

      const result = initializeSentry({
        enabled: false,
        anonymize: true,
        categories: { errors: true, usage: true, performance: true }
      })

      expect(result).toBe(false)
    })

    it('should return false when errors category is disabled', async () => {
      const { initializeSentry } = await import('./sentry')

      const result = initializeSentry({
        enabled: true,
        anonymize: true,
        categories: { errors: false, usage: true, performance: true }
      })

      expect(result).toBe(false)
    })

    it('should initialize Sentry when enabled with errors category', async () => {
      const Sentry = await import('@sentry/node')
      const { initializeSentry } = await import('./sentry')

      const result = initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      expect(result).toBe(true)
      expect(Sentry.init).toHaveBeenCalled()
    })

    it('should use custom DSN from environment variable', async () => {
      process.env.HAPPY_SENTRY_DSN = 'https://custom.sentry.io/123'

      const Sentry = await import('@sentry/node')
      const { initializeSentry } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://custom.sentry.io/123'
        })
      )
    })

    it('should return true on subsequent calls (already initialized)', async () => {
      const { initializeSentry } = await import('./sentry')

      // First call
      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      // Second call should return true without re-initializing
      const result = initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      expect(result).toBe(true)
    })

    it('should set tracesSampleRate based on performance category', async () => {
      const Sentry = await import('@sentry/node')
      vi.resetModules()
      const { initializeSentry } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0.1
        })
      )
    })

    it('should set tracesSampleRate to 0 when performance is disabled', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: false }
      })

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 0
        })
      )
    })
  })

  describe('captureException', () => {
    it('should not capture when Sentry is not initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { captureException } = await import('./sentry')

      captureException(new Error('Test error'))

      expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('should capture exception after Sentry is initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, captureException } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      const error = new Error('Test error')
      captureException(error)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should use withScope when context is provided', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, captureException } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      const error = new Error('Test error')
      captureException(error, { operation: 'test' })

      expect(Sentry.withScope).toHaveBeenCalled()
    })
  })

  describe('captureMessage', () => {
    it('should not capture when Sentry is not initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { captureMessage } = await import('./sentry')

      captureMessage('Test message')

      expect(Sentry.captureMessage).not.toHaveBeenCalled()
    })

    it('should capture message after Sentry is initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, captureMessage } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      captureMessage('Test message')

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info')
    })

    it('should use specified severity level', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, captureMessage } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      captureMessage('Warning message', 'warning')

      expect(Sentry.captureMessage).toHaveBeenCalledWith('Warning message', 'warning')
    })

    it('should use withScope when context is provided', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, captureMessage } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      captureMessage('Test message', 'info', { operation: 'test' })

      expect(Sentry.withScope).toHaveBeenCalled()
    })
  })

  describe('addBreadcrumb', () => {
    it('should not add breadcrumb when Sentry is not initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { addBreadcrumb } = await import('./sentry')

      addBreadcrumb({ message: 'Test breadcrumb', category: 'test' })

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'test'
      })
    })

    it('should add breadcrumb after Sentry is initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, addBreadcrumb } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      // Clear mock calls from initialization
      vi.mocked(Sentry.addBreadcrumb).mockClear()

      addBreadcrumb({ message: 'Test breadcrumb', category: 'test' })

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test breadcrumb',
        category: 'test'
      })
    })
  })

  describe('setTag', () => {
    it('should not set tag when Sentry is not initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { setTag } = await import('./sentry')

      setTag('testKey', 'testValue')

      // Check that setTag was not called with our specific key/value
      // (initializeSentry would have called it with different values)
      expect(Sentry.setTag).not.toHaveBeenCalledWith('testKey', 'testValue')
    })

    it('should set tag after Sentry is initialized', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, setTag } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      // Clear mock calls from initialization
      vi.mocked(Sentry.setTag).mockClear()

      setTag('testKey', 'testValue')

      expect(Sentry.setTag).toHaveBeenCalledWith('testKey', 'testValue')
    })
  })

  describe('flush', () => {
    it('should return true when Sentry is not initialized', async () => {
      vi.resetModules()
      const { flush } = await import('./sentry')

      const result = await flush()

      expect(result).toBe(true)
    })

    it('should call Sentry.close with timeout after initialization', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, flush } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      await flush(3000)

      expect(Sentry.close).toHaveBeenCalledWith(3000)
    })

    it('should use default timeout of 2000ms', async () => {
      vi.resetModules()
      const Sentry = await import('@sentry/node')
      const { initializeSentry, flush } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      await flush()

      expect(Sentry.close).toHaveBeenCalledWith(2000)
    })
  })

  describe('isSentryInitialized', () => {
    it('should return false when not initialized', async () => {
      vi.resetModules()
      const { isSentryInitialized } = await import('./sentry')

      const result = isSentryInitialized()

      expect(result).toBe(false)
    })

    it('should return true after initialization', async () => {
      vi.resetModules()
      const { initializeSentry, isSentryInitialized } = await import('./sentry')

      initializeSentry({
        enabled: true,
        anonymize: false,
        categories: { errors: true, usage: true, performance: true }
      })

      const result = isSentryInitialized()

      expect(result).toBe(true)
    })
  })
})

describe('scrubSensitiveData (internal)', () => {
  // We test this indirectly through the beforeSend hook by checking
  // that the init call configures anonymization properly

  beforeEach(() => {
    vi.resetModules()
  })

  it('should configure beforeSend when anonymize is true', async () => {
    const Sentry = await import('@sentry/node')
    const { initializeSentry } = await import('./sentry')

    initializeSentry({
      enabled: true,
      anonymize: true,
      categories: { errors: true, usage: true, performance: true }
    })

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        beforeSend: expect.any(Function)
      })
    )
  })

  it('should filter Console integration when anonymizing', async () => {
    const Sentry = await import('@sentry/node')
    const { initializeSentry } = await import('./sentry')

    initializeSentry({
      enabled: true,
      anonymize: true,
      categories: { errors: true, usage: true, performance: true }
    })

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: expect.any(Function)
      })
    )
  })
})
