/**
 * Tests for CLI version update checker (HAP-939)
 *
 * Tests functions in checkForUpdates.ts to improve mutation coverage.
 * Focus on isNewerVersion logic (tested via checkForUpdates) and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkForUpdatesAndNotify } from './checkForUpdates'

// We need to test the internal isNewerVersion function through checkForUpdates
// since it's not exported. Mock fetch to control the responses.

describe('checkForUpdates', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('isNewerVersion logic (via checkForUpdates integration)', () => {
    // Test version comparison by mocking fetch responses

    it('should detect update when latest major version is higher', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '2.0.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('new version')
      )
    })

    it('should detect update when latest minor version is higher', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.1.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('new version')
      )
    })

    it('should detect update when latest patch version is higher', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.1' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('new version')
      )
    })

    it('should not detect update when versions are equal', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Already up to date')
      )
    })

    it('should not detect update when current version is higher', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '2.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Already up to date')
      )
    })

    it('should handle version with more segments', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.0.1' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('new version')
      )
    })

    it('should handle version with fewer segments comparing to more', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.1' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('new version')
      )
    })
  })

  describe('HTTP error handling', () => {
    it('should handle 404 response gracefully', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('HTTP error: 404')
      )
    })

    it('should handle 500 response gracefully', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('HTTP error: 500')
      )
    })
  })

  describe('network error handling', () => {
    it('should handle timeout error gracefully', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      const timeoutError = new Error('Timeout')
      timeoutError.name = 'TimeoutError'
      global.fetch = vi.fn().mockRejectedValue(timeoutError) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timeout')
      )
    })

    it('should handle abort error gracefully', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      global.fetch = vi.fn().mockRejectedValue(abortError) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted')
      )
    })

    it('should handle network fetch error gracefully', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      const fetchError = new TypeError('fetch failed')
      global.fetch = vi.fn().mockRejectedValue(fetchError) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      )
    })

    it('should handle generic error gracefully', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockRejectedValue(new Error('Unknown error')) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Unknown error')
      )
    })

    it('should handle non-Error rejection gracefully', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockRejectedValue('string error') as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      // Should not throw, and should handle gracefully
      expect(mockLogger.debug).toHaveBeenCalled()
    })
  })

  describe('request configuration', () => {
    it('should send request with correct headers', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('registry.npmjs.org'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/json',
            'User-Agent': expect.stringContaining('happy-coder')
          })
        })
      )
    })

    it('should include abort signal for timeout', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      )
    })
  })

  describe('checkForUpdatesAndNotify', () => {
    it('should log update message when update is available', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '2.0.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('npm update -g happy-coder')
      )
    })

    it('should not log update message when no update available', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '2.0.0' }
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'happy-coder', version: '1.0.0' })
      }) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      const updateCall = mockLogger.debug.mock.calls.find(
        (call: string[]) => call[0].includes('npm update')
      )
      expect(updateCall).toBeUndefined()
    })

    it('should not log update message on error', async () => {
      const mockLogger = { debug: vi.fn() }
      vi.doMock('@/ui/logger', () => ({ logger: mockLogger }))
      vi.doMock('@/configuration', () => ({
        configuration: { currentCliVersion: '1.0.0' }
      }))

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any

      const { checkForUpdatesAndNotify } = await import('./checkForUpdates')
      await checkForUpdatesAndNotify()

      const updateCall = mockLogger.debug.mock.calls.find(
        (call: string[]) => call[0].includes('npm update')
      )
      expect(updateCall).toBeUndefined()
    })
  })
})
