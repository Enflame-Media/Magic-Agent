/**
 * Tests for caffeinate utility module (HAP-939)
 *
 * Tests the caffeinate functions to improve mutation coverage.
 * Focus on startCaffeinate, stopCaffeinate, and getCaffeinatePid.
 *
 * Note: Many functions in caffeinate.ts cannot be properly unit tested because
 * they rely on module-level state that persists between imports. Instead, we test
 * the public API behavior where possible.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('utils/caffeinate', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    vi.restoreAllMocks()
  })

  describe('startCaffeinate', () => {
    it('should return false on non-macOS platforms', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })

      // Mock dependencies
      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: vi.fn()
      }))

      const { startCaffeinate } = await import('./caffeinate')

      const result = startCaffeinate()

      expect(result).toBe(false)
    })

    it('should return false on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })

      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: vi.fn()
      }))

      const { startCaffeinate } = await import('./caffeinate')

      const result = startCaffeinate()

      expect(result).toBe(false)
    })

    it('should return false when caffeinate is disabled via configuration', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: true }
      }))
      vi.doMock('child_process', () => ({
        spawn: vi.fn()
      }))

      const { startCaffeinate } = await import('./caffeinate')

      const result = startCaffeinate()

      expect(result).toBe(false)
    })

    it('should spawn caffeinate on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      const mockSpawn = vi.fn().mockReturnValue({
        pid: 12345,
        killed: false,
        on: vi.fn()
      })

      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: mockSpawn
      }))

      const { startCaffeinate } = await import('./caffeinate')

      const result = startCaffeinate()

      expect(result).toBe(true)
      expect(mockSpawn).toHaveBeenCalledWith('caffeinate', ['-im'], expect.any(Object))
    })

    it('should return true if already running', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      const mockSpawn = vi.fn().mockReturnValue({
        pid: 12345,
        killed: false,
        on: vi.fn()
      })

      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: mockSpawn
      }))

      const { startCaffeinate } = await import('./caffeinate')

      // First call starts caffeinate
      const result1 = startCaffeinate()
      expect(result1).toBe(true)

      // Second call should return true without spawning again
      const result2 = startCaffeinate()
      expect(result2).toBe(true)
      expect(mockSpawn).toHaveBeenCalledTimes(1)
    })

    it('should handle spawn error gracefully', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      const mockSpawn = vi.fn().mockImplementation(() => {
        throw new Error('spawn failed')
      })

      const loggerDebug = vi.fn()

      vi.doMock('@/ui/logger', () => ({
        logger: { debug: loggerDebug }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: mockSpawn
      }))

      const { startCaffeinate } = await import('./caffeinate')

      const result = startCaffeinate()

      expect(result).toBe(false)
      expect(loggerDebug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start'),
        expect.any(Error)
      )
    })
  })

  describe('stopCaffeinate', () => {
    it('should do nothing if not running', async () => {
      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: vi.fn()
      }))

      const { stopCaffeinate } = await import('./caffeinate')

      // Should not throw
      await stopCaffeinate()
    })

    it('should kill the caffeinate process', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      const mockKill = vi.fn()
      const mockSpawn = vi.fn().mockReturnValue({
        pid: 12345,
        killed: false,
        on: vi.fn(),
        kill: mockKill
      })

      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: mockSpawn
      }))

      const { startCaffeinate, stopCaffeinate } = await import('./caffeinate')

      startCaffeinate()
      await stopCaffeinate()

      expect(mockKill).toHaveBeenCalledWith('SIGTERM')
    })
  })

  describe('getCaffeinatePid', () => {
    it('should return undefined when not running', async () => {
      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: vi.fn()
      }))

      const { getCaffeinatePid } = await import('./caffeinate')

      const result = getCaffeinatePid()

      expect(result).toBeUndefined()
    })

    it('should return PID when running', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      const mockSpawn = vi.fn().mockReturnValue({
        pid: 12345,
        killed: false,
        on: vi.fn(),
        kill: vi.fn()
      })

      vi.doMock('@/ui/logger', () => ({
        logger: { debug: vi.fn() }
      }))
      vi.doMock('@/configuration', () => ({
        configuration: { disableCaffeinate: false }
      }))
      vi.doMock('child_process', () => ({
        spawn: mockSpawn
      }))

      const { startCaffeinate, getCaffeinatePid } = await import('./caffeinate')

      startCaffeinate()

      const result = getCaffeinatePid()

      expect(result).toBe(12345)
    })
  })
})
