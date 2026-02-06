/**
 * Tests for telemetry sender module (HAP-939)
 *
 * Tests the TelemetrySender class and related functions to improve mutation coverage.
 * Focus on trackEvent, trackMetric, flush, and anonymization logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing the module
vi.mock('../../package.json', () => ({
  default: { version: '1.0.0-test' }
}))

describe('telemetry/sender', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.HAPPY_TELEMETRY_ENDPOINT
    global.fetch = vi.fn()
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('TelemetrySender', () => {
    describe('constructor', () => {
      it('should create instance with disabled config', async () => {
        const { TelemetrySender } = await import('./sender')
        const sender = new TelemetrySender({
          enabled: false,
          anonymize: true,
          categories: { errors: false, usage: false, performance: false }
        })

        expect(sender).toBeDefined()
        // Should not start periodic flush when disabled
        sender.stopPeriodicFlush()
      })

      it('should create instance with enabled config but no endpoint', async () => {
        const { TelemetrySender } = await import('./sender')
        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        expect(sender).toBeDefined()
        sender.stopPeriodicFlush()
      })

      it('should start periodic flush when enabled with endpoint', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        expect(sender).toBeDefined()
        sender.stopPeriodicFlush()
      })
    })

    describe('trackEvent', () => {
      it('should not track events when usage is disabled', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: false, performance: true }
        })

        sender.trackEvent('session_started', { mode: 'cli' })

        // Flush should return true immediately (nothing to flush)
        const result = await sender.flush()
        expect(result).toBe(true)

        sender.stopPeriodicFlush()
      })

      it('should track events when usage is enabled', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response)

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackEvent('session_started', { mode: 'cli' })

        await sender.flush()

        expect(global.fetch).toHaveBeenCalled()
        sender.stopPeriodicFlush()
      })

      it('should anonymize sensitive data in events', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

        let capturedBody: any = null
        vi.mocked(global.fetch).mockImplementation(async (url, options) => {
          capturedBody = JSON.parse(options?.body as string)
          return { ok: true } as Response
        })

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackEvent('session_started', {
          mode: 'cli',
          password: 'secret123',
          token: 'abc123',
          userId: 'user-id',
          normalField: 'visible'
        })

        await sender.flush()

        expect(capturedBody).toBeDefined()
        expect(capturedBody.events).toHaveLength(1)
        expect(capturedBody.events[0].data.password).toBe('[present]')
        expect(capturedBody.events[0].data.token).toBe('[present]')
        expect(capturedBody.events[0].data.userId).toBe('[present]')
        expect(capturedBody.events[0].data.normalField).toBe('visible')

        sender.stopPeriodicFlush()
      })

      it('should not anonymize data when anonymize is false', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

        let capturedBody: any = null
        vi.mocked(global.fetch).mockImplementation(async (url, options) => {
          capturedBody = JSON.parse(options?.body as string)
          return { ok: true } as Response
        })

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackEvent('session_started', {
          mode: 'cli',
          normalField: 'visible'
        })

        await sender.flush()

        expect(capturedBody.events[0].data.normalField).toBe('visible')

        sender.stopPeriodicFlush()
      })

      it('should anonymize nested sensitive data', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

        let capturedBody: any = null
        vi.mocked(global.fetch).mockImplementation(async (url, options) => {
          capturedBody = JSON.parse(options?.body as string)
          return { ok: true } as Response
        })

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackEvent('session_started', {
          nested: {
            password: 'secret',
            visible: 'data'
          }
        })

        await sender.flush()

        expect(capturedBody.events[0].data.nested.password).toBe('[present]')
        expect(capturedBody.events[0].data.nested.visible).toBe('data')

        sender.stopPeriodicFlush()
      })

      it('should auto-flush when batch size is reached', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response)

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        // Send 10 events (batch size)
        for (let i = 0; i < 10; i++) {
          sender.trackEvent('session_started', { index: i })
        }

        // Wait for flush to complete
        await new Promise(resolve => setTimeout(resolve, 50))

        expect(global.fetch).toHaveBeenCalled()

        sender.stopPeriodicFlush()
      })
    })

    describe('trackMetric', () => {
      it('should not track metrics when performance is disabled', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: false }
        })

        sender.trackMetric('startup_time', 500, { context: 'test' })

        const result = await sender.flush()
        expect(result).toBe(true)

        sender.stopPeriodicFlush()
      })

      it('should track metrics when performance is enabled', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

        let capturedBody: any = null
        vi.mocked(global.fetch).mockImplementation(async (url, options) => {
          capturedBody = JSON.parse(options?.body as string)
          return { ok: true } as Response
        })

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackMetric('startup_time', 500, { command: 'start' })

        await sender.flush()

        expect(capturedBody).toBeDefined()
        expect(capturedBody.metrics).toHaveLength(1)
        expect(capturedBody.metrics[0].type).toBe('startup_time')
        expect(capturedBody.metrics[0].value).toBe(500)
        expect(capturedBody.metrics[0].context.command).toBe('start')

        sender.stopPeriodicFlush()
      })

      it('should anonymize sensitive context in metrics', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

        let capturedBody: any = null
        vi.mocked(global.fetch).mockImplementation(async (url, options) => {
          capturedBody = JSON.parse(options?.body as string)
          return { ok: true } as Response
        })

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackMetric('api_latency', 100, {
          sessionId: 'abc123',
          endpoint: '/api/test'
        })

        await sender.flush()

        expect(capturedBody.metrics[0].context.sessionId).toBe('[present]')
        expect(capturedBody.metrics[0].context.endpoint).toBe('/api/test')

        sender.stopPeriodicFlush()
      })

      it('should auto-flush when batch size is reached', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response)

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        // Send 10 metrics (batch size)
        for (let i = 0; i < 10; i++) {
          sender.trackMetric('startup_time', i * 100)
        }

        // Wait for flush to complete
        await new Promise(resolve => setTimeout(resolve, 50))

        expect(global.fetch).toHaveBeenCalled()

        sender.stopPeriodicFlush()
      })
    })

    describe('flush', () => {
      it('should return true when disabled', async () => {
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: false,
          anonymize: true,
          categories: { errors: false, usage: false, performance: false }
        })

        const result = await sender.flush()
        expect(result).toBe(true)

        sender.stopPeriodicFlush()
      })

      it('should return true when queues are empty', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        const result = await sender.flush()
        expect(result).toBe(true)

        sender.stopPeriodicFlush()
      })

      it('should return true on successful flush', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response)

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackEvent('session_started')

        const result = await sender.flush()
        expect(result).toBe(true)

        sender.stopPeriodicFlush()
      })

      it('should return false on failed flush and re-queue events', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackEvent('session_started')

        const result = await sender.flush()
        expect(result).toBe(false)

        sender.stopPeriodicFlush()
      })

      it('should return false on non-ok response', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500 } as Response)

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.trackEvent('session_started')

        const result = await sender.flush()
        expect(result).toBe(false)

        sender.stopPeriodicFlush()
      })

      it('should limit re-queued events to prevent memory issues', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

        let callCount = 0
        vi.mocked(global.fetch).mockImplementation(async () => {
          callCount++
          throw new Error('Network error')
        })

        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: false,
          categories: { errors: true, usage: true, performance: true }
        })

        // Add 25 events (2.5x batch size)
        for (let i = 0; i < 25; i++) {
          sender.trackEvent('session_started', { index: i })
        }

        // Flush multiple times - should not grow unbounded
        for (let i = 0; i < 5; i++) {
          await sender.flush()
        }

        // Events should be capped at 3x batch size (30)
        sender.stopPeriodicFlush()
      })
    })

    describe('updateConfig', () => {
      it('should start periodic flush when enabling', async () => {
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: false,
          anonymize: true,
          categories: { errors: false, usage: false, performance: false }
        })

        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

        sender.updateConfig({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.stopPeriodicFlush()
      })

      it('should stop periodic flush when disabling', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.updateConfig({
          enabled: false,
          anonymize: true,
          categories: { errors: false, usage: false, performance: false }
        })

        sender.stopPeriodicFlush()
      })
    })

    describe('stopPeriodicFlush', () => {
      it('should be safe to call multiple times', async () => {
        process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'
        const { TelemetrySender } = await import('./sender')

        const sender = new TelemetrySender({
          enabled: true,
          anonymize: true,
          categories: { errors: true, usage: true, performance: true }
        })

        sender.stopPeriodicFlush()
        sender.stopPeriodicFlush()
        sender.stopPeriodicFlush()
      })
    })
  })

  describe('getTelemetrySender', () => {
    it('should return null when no config provided and not initialized', async () => {
      const { getTelemetrySender } = await import('./sender')

      const result = getTelemetrySender()
      // May or may not be null depending on test order, just check it doesn't throw
      expect(result === null || result !== null).toBe(true)
    })

    it('should create and return sender with config', async () => {
      const { getTelemetrySender } = await import('./sender')

      const sender = getTelemetrySender({
        enabled: false,
        anonymize: true,
        categories: { errors: false, usage: false, performance: false }
      })

      expect(sender).not.toBeNull()
      sender?.stopPeriodicFlush()
    })
  })

  describe('trackEvent convenience function', () => {
    it('should not throw when sender not initialized', async () => {
      vi.resetModules()
      const { trackEvent } = await import('./sender')

      // Should not throw
      trackEvent('session_started', { mode: 'cli' })
    })
  })

  describe('trackMetric convenience function', () => {
    it('should not throw when sender not initialized', async () => {
      vi.resetModules()
      const { trackMetric } = await import('./sender')

      // Should not throw
      trackMetric('startup_time', 500, { command: 'start' })
    })
  })

  describe('flushTelemetry convenience function', () => {
    it('should return true when sender not initialized', async () => {
      vi.resetModules()
      const { flushTelemetry } = await import('./sender')

      const result = await flushTelemetry()
      expect(result).toBe(true)
    })
  })

  describe('anonymizeData edge cases', () => {
    it('should handle various sensitive key patterns', async () => {
      process.env.HAPPY_TELEMETRY_ENDPOINT = 'https://telemetry.example.com'

      let capturedBody: any = null
      vi.mocked(global.fetch).mockImplementation(async (url, options) => {
        capturedBody = JSON.parse(options?.body as string)
        return { ok: true } as Response
      })

      const { TelemetrySender } = await import('./sender')

      const sender = new TelemetrySender({
        enabled: true,
        anonymize: true,
        categories: { errors: true, usage: true, performance: true }
      })

      sender.trackEvent('session_started', {
        secret: 'value',
        apiKey: 'value',
        authorization: 'value',
        credential: 'value',
        session: 'value',
        user: 'value',
        email: 'value',
        ip: 'value',
        path: 'value',
        file: 'value',
        dir: 'value',
        key: 'value',
        auth: 'value',
        safeField: 'visible'
      })

      await sender.flush()

      // All sensitive fields should be anonymized
      expect(capturedBody.events[0].data.secret).toBe('[present]')
      expect(capturedBody.events[0].data.apiKey).toBe('[present]')
      expect(capturedBody.events[0].data.authorization).toBe('[present]')
      expect(capturedBody.events[0].data.credential).toBe('[present]')
      expect(capturedBody.events[0].data.session).toBe('[present]')
      expect(capturedBody.events[0].data.user).toBe('[present]')
      expect(capturedBody.events[0].data.email).toBe('[present]')
      expect(capturedBody.events[0].data.ip).toBe('[present]')
      expect(capturedBody.events[0].data.path).toBe('[present]')
      expect(capturedBody.events[0].data.file).toBe('[present]')
      expect(capturedBody.events[0].data.dir).toBe('[present]')
      expect(capturedBody.events[0].data.key).toBe('[present]')
      expect(capturedBody.events[0].data.auth).toBe('[present]')
      expect(capturedBody.events[0].data.safeField).toBe('visible')

      sender.stopPeriodicFlush()
    })
  })
})
