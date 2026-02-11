/**
 * Tests for telemetry notice module (HAP-939)
 *
 * Tests the telemetry notice functions to improve mutation coverage.
 * Focus on showTelemetryNoticeIfNeeded and resetTelemetryNotice.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock persistence module
vi.mock('@/persistence', () => ({
  readSettings: vi.fn(),
  updateSettings: vi.fn()
}))

describe('telemetry/notice', () => {
  const originalConsoleLog = console.log

  beforeEach(() => {
    vi.resetModules()
    console.log = vi.fn()
  })

  afterEach(() => {
    console.log = originalConsoleLog
    vi.restoreAllMocks()
  })

  describe('showTelemetryNoticeIfNeeded', () => {
    it('should return false when notice was already shown', async () => {
      const { readSettings } = await import('@/persistence')
      vi.mocked(readSettings).mockResolvedValue({
        onboardingCompleted: true,
        telemetryNoticeShown: true
      })

      const { showTelemetryNoticeIfNeeded } = await import('./notice')

      const result = await showTelemetryNoticeIfNeeded()

      expect(result).toBe(false)
      expect(console.log).not.toHaveBeenCalled()
    })

    it('should show notice and return true when not shown before', async () => {
      const { readSettings, updateSettings } = await import('@/persistence')
      vi.mocked(readSettings).mockResolvedValue({
        onboardingCompleted: true,
        telemetryNoticeShown: false
      })
      vi.mocked(updateSettings).mockImplementation(async (updater) => {
        return updater({ onboardingCompleted: true })
      })

      const { showTelemetryNoticeIfNeeded } = await import('./notice')

      const result = await showTelemetryNoticeIfNeeded()

      expect(result).toBe(true)
      expect(console.log).toHaveBeenCalled()
    })

    it('should show notice when telemetryNoticeShown is undefined', async () => {
      const { readSettings, updateSettings } = await import('@/persistence')
      vi.mocked(readSettings).mockResolvedValue({
        onboardingCompleted: true
        // telemetryNoticeShown is undefined
      })
      vi.mocked(updateSettings).mockImplementation(async (updater) => {
        return updater({ onboardingCompleted: true })
      })

      const { showTelemetryNoticeIfNeeded } = await import('./notice')

      const result = await showTelemetryNoticeIfNeeded()

      expect(result).toBe(true)
      expect(console.log).toHaveBeenCalled()
    })

    it('should mark notice as shown in settings', async () => {
      const { readSettings, updateSettings } = await import('@/persistence')
      vi.mocked(readSettings).mockResolvedValue({
        onboardingCompleted: true,
        telemetryNoticeShown: false
      })

      let updatedSettings: any = null
      vi.mocked(updateSettings).mockImplementation(async (updater) => {
        updatedSettings = updater({ onboardingCompleted: true })
        return updatedSettings
      })

      const { showTelemetryNoticeIfNeeded } = await import('./notice')

      await showTelemetryNoticeIfNeeded()

      expect(updateSettings).toHaveBeenCalled()
      expect(updatedSettings.telemetryNoticeShown).toBe(true)
    })

    it('should preserve other settings when updating', async () => {
      const { readSettings, updateSettings } = await import('@/persistence')
      vi.mocked(readSettings).mockResolvedValue({
        onboardingCompleted: true,
        machineId: 'test-machine-123'
      })

      let updatedSettings: any = null
      vi.mocked(updateSettings).mockImplementation(async (updater) => {
        updatedSettings = updater({
          onboardingCompleted: true,
          machineId: 'test-machine-123'
        })
        return updatedSettings
      })

      const { showTelemetryNoticeIfNeeded } = await import('./notice')

      await showTelemetryNoticeIfNeeded()

      expect(updatedSettings.onboardingCompleted).toBe(true)
      expect(updatedSettings.machineId).toBe('test-machine-123')
      expect(updatedSettings.telemetryNoticeShown).toBe(true)
    })

    it('should output notice with expected content', async () => {
      const { readSettings, updateSettings } = await import('@/persistence')
      vi.mocked(readSettings).mockResolvedValue({
        onboardingCompleted: true
      })
      vi.mocked(updateSettings).mockImplementation(async (updater) => {
        return updater({ onboardingCompleted: true })
      })

      const { showTelemetryNoticeIfNeeded } = await import('./notice')

      await showTelemetryNoticeIfNeeded()

      const logCalls = (console.log as any).mock.calls.flat().join('')

      // Check for key content in the notice
      expect(logCalls).toContain('Help Improve Happy CLI')
      expect(logCalls).toContain('HAPPY_TELEMETRY=true')
      expect(logCalls).toContain('privacy')
    })
  })

  describe('resetTelemetryNotice', () => {
    it('should set telemetryNoticeShown to false', async () => {
      const { updateSettings } = await import('@/persistence')

      let updatedSettings: any = null
      vi.mocked(updateSettings).mockImplementation(async (updater) => {
        updatedSettings = updater({
          onboardingCompleted: true,
          telemetryNoticeShown: true
        })
        return updatedSettings
      })

      const { resetTelemetryNotice } = await import('./notice')

      await resetTelemetryNotice()

      expect(updateSettings).toHaveBeenCalled()
      expect(updatedSettings.telemetryNoticeShown).toBe(false)
    })

    it('should preserve other settings when resetting', async () => {
      const { updateSettings } = await import('@/persistence')

      let updatedSettings: any = null
      vi.mocked(updateSettings).mockImplementation(async (updater) => {
        updatedSettings = updater({
          onboardingCompleted: true,
          machineId: 'test-machine-123',
          telemetryNoticeShown: true
        })
        return updatedSettings
      })

      const { resetTelemetryNotice } = await import('./notice')

      await resetTelemetryNotice()

      expect(updatedSettings.onboardingCompleted).toBe(true)
      expect(updatedSettings.machineId).toBe('test-machine-123')
      expect(updatedSettings.telemetryNoticeShown).toBe(false)
    })
  })
})
