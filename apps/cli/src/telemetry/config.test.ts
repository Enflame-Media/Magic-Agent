import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadTelemetryConfig, isTelemetryDisabledByEnv } from './config'
import { DEFAULT_TELEMETRY_CONFIG } from './types'

describe('telemetry/config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.HAPPY_TELEMETRY
    delete process.env.HAPPY_TELEMETRY_ANONYMIZE
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isTelemetryDisabledByEnv', () => {
    it('returns false when HAPPY_TELEMETRY is not set', () => {
      expect(isTelemetryDisabledByEnv()).toBe(false)
    })

    it('returns true when HAPPY_TELEMETRY is "false"', () => {
      process.env.HAPPY_TELEMETRY = 'false'
      expect(isTelemetryDisabledByEnv()).toBe(true)
    })

    it('returns true when HAPPY_TELEMETRY is "0"', () => {
      process.env.HAPPY_TELEMETRY = '0'
      expect(isTelemetryDisabledByEnv()).toBe(true)
    })

    it('returns true when HAPPY_TELEMETRY is "no"', () => {
      process.env.HAPPY_TELEMETRY = 'no'
      expect(isTelemetryDisabledByEnv()).toBe(true)
    })

    it('returns false when HAPPY_TELEMETRY is "true"', () => {
      process.env.HAPPY_TELEMETRY = 'true'
      expect(isTelemetryDisabledByEnv()).toBe(false)
    })

    it('is case-insensitive', () => {
      process.env.HAPPY_TELEMETRY = 'FALSE'
      expect(isTelemetryDisabledByEnv()).toBe(true)

      process.env.HAPPY_TELEMETRY = 'True'
      expect(isTelemetryDisabledByEnv()).toBe(false)
    })
  })

  describe('loadTelemetryConfig', () => {
    it('returns default config when no env vars or settings', async () => {
      const config = await loadTelemetryConfig()
      expect(config.enabled).toBe(false)
      expect(config.anonymize).toBe(true)
      expect(config.categories.errors).toBe(false)
      expect(config.categories.usage).toBe(false)
      expect(config.categories.performance).toBe(false)
    })

    it('returns fully disabled config when HAPPY_TELEMETRY is false', async () => {
      process.env.HAPPY_TELEMETRY = 'false'
      const config = await loadTelemetryConfig()
      expect(config.enabled).toBe(false)
      expect(config.anonymize).toBe(true)
      expect(config.categories.errors).toBe(false)
      expect(config.categories.usage).toBe(false)
      expect(config.categories.performance).toBe(false)
    })

    it('enables telemetry when HAPPY_TELEMETRY is true', async () => {
      process.env.HAPPY_TELEMETRY = 'true'
      const config = await loadTelemetryConfig()
      expect(config.enabled).toBe(true)
    })

    it('respects HAPPY_TELEMETRY_ANONYMIZE env var', async () => {
      process.env.HAPPY_TELEMETRY = 'true'
      process.env.HAPPY_TELEMETRY_ANONYMIZE = 'false'
      const config = await loadTelemetryConfig()
      expect(config.anonymize).toBe(false)
    })
  })

  describe('DEFAULT_TELEMETRY_CONFIG', () => {
    it('has telemetry disabled by default', () => {
      expect(DEFAULT_TELEMETRY_CONFIG.enabled).toBe(false)
    })

    it('has anonymize enabled by default', () => {
      expect(DEFAULT_TELEMETRY_CONFIG.anonymize).toBe(true)
    })

    it('has all categories disabled by default', () => {
      expect(DEFAULT_TELEMETRY_CONFIG.categories.errors).toBe(false)
      expect(DEFAULT_TELEMETRY_CONFIG.categories.usage).toBe(false)
      expect(DEFAULT_TELEMETRY_CONFIG.categories.performance).toBe(false)
    })
  })
})
