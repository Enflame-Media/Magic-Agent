/**
 * Tests for environment variable validation (HAP-939)
 *
 * Tests pure functions in validateEnv.ts to improve mutation coverage.
 * Focus on validateRemoteLoggingUrl (pure URL validation) and checkEnv (process.env based).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateRemoteLoggingUrl, checkEnv, validateEnv } from './validateEnv'

describe('validateEnv', () => {
  describe('validateRemoteLoggingUrl', () => {
    describe('HTTPS URLs (always valid)', () => {
      it('should accept valid HTTPS URL', () => {
        const result = validateRemoteLoggingUrl('https://api.example.com')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('https://api.example.com')
        expect(result.error).toBeUndefined()
      })

      it('should accept HTTPS URL with path', () => {
        const result = validateRemoteLoggingUrl('https://api.example.com/logs/v1')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('https://api.example.com/logs/v1')
      })

      it('should accept HTTPS URL with port', () => {
        const result = validateRemoteLoggingUrl('https://api.example.com:8443')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('https://api.example.com:8443')
      })

      it('should accept HTTPS URL with query params', () => {
        const result = validateRemoteLoggingUrl('https://api.example.com/logs?key=value')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('https://api.example.com/logs?key=value')
      })

      it('should accept HTTPS localhost', () => {
        const result = validateRemoteLoggingUrl('https://localhost:3000')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('https://localhost:3000')
      })
    })

    describe('HTTP localhost URLs (valid for local development)', () => {
      it('should accept HTTP localhost', () => {
        const result = validateRemoteLoggingUrl('http://localhost:3000')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('http://localhost:3000')
      })

      it('should accept HTTP 127.0.0.1', () => {
        const result = validateRemoteLoggingUrl('http://127.0.0.1:3000')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('http://127.0.0.1:3000')
      })

      it('should accept HTTP ::1 (IPv6 localhost)', () => {
        const result = validateRemoteLoggingUrl('http://[::1]:3000')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('http://[::1]:3000')
      })

      it('should accept HTTP localhost without port', () => {
        const result = validateRemoteLoggingUrl('http://localhost')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('http://localhost')
      })

      it('should accept HTTP localhost with path', () => {
        const result = validateRemoteLoggingUrl('http://localhost:3000/api/logs')
        expect(result.valid).toBe(true)
        expect(result.url).toBe('http://localhost:3000/api/logs')
      })
    })

    describe('HTTP non-localhost URLs (invalid - insecure)', () => {
      it('should reject HTTP for remote hosts', () => {
        const result = validateRemoteLoggingUrl('http://api.example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('insecure for non-local hosts')
        expect(result.error).toContain('Use HTTPS')
        expect(result.url).toBeUndefined()
      })

      it('should reject HTTP with remote IP', () => {
        const result = validateRemoteLoggingUrl('http://192.168.1.1:3000')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('insecure for non-local hosts')
      })

      it('should reject HTTP with public IP', () => {
        const result = validateRemoteLoggingUrl('http://8.8.8.8')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('insecure for non-local hosts')
      })

      it('should provide helpful error message with suggestion', () => {
        const result = validateRemoteLoggingUrl('http://api.example.com/logs')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('https://api.example.com/logs')
        expect(result.error).toContain('HTTP is only allowed for localhost/127.0.0.1')
      })
    })

    describe('Invalid URL formats', () => {
      it('should reject empty string', () => {
        const result = validateRemoteLoggingUrl('')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid URL format')
      })

      it('should reject malformed URL', () => {
        const result = validateRemoteLoggingUrl('not-a-url')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid URL format')
        expect(result.error).toContain('not-a-url')
      })

      it('should reject URL without protocol', () => {
        const result = validateRemoteLoggingUrl('api.example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid URL format')
      })

      it('should reject URL with double slashes only', () => {
        const result = validateRemoteLoggingUrl('//api.example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid URL format')
      })
    })

    describe('Unsupported protocols', () => {
      it('should reject FTP protocol', () => {
        const result = validateRemoteLoggingUrl('ftp://ftp.example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('unsupported protocol')
        expect(result.error).toContain('ftp:')
      })

      it('should reject file protocol', () => {
        const result = validateRemoteLoggingUrl('file:///var/log/app.log')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('unsupported protocol')
        expect(result.error).toContain('file:')
      })

      it('should reject ws protocol', () => {
        const result = validateRemoteLoggingUrl('ws://api.example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('unsupported protocol')
        expect(result.error).toContain('ws:')
      })

      it('should reject wss protocol', () => {
        const result = validateRemoteLoggingUrl('wss://api.example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('unsupported protocol')
        expect(result.error).toContain('wss:')
      })

      it('should reject mailto protocol', () => {
        const result = validateRemoteLoggingUrl('mailto:test@example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('unsupported protocol')
      })

      it('should reject javascript protocol', () => {
        const result = validateRemoteLoggingUrl('javascript:alert(1)')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('unsupported protocol')
      })
    })

    describe('Case sensitivity', () => {
      it('should handle uppercase HTTPS', () => {
        const result = validateRemoteLoggingUrl('HTTPS://api.example.com')
        expect(result.valid).toBe(true)
      })

      it('should handle mixed case http', () => {
        const result = validateRemoteLoggingUrl('Http://localhost:3000')
        expect(result.valid).toBe(true)
      })

      it('should handle uppercase hostname for localhost', () => {
        const result = validateRemoteLoggingUrl('http://LOCALHOST:3000')
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('checkEnv', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      // Create a clean env object
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    describe('environment variable detection', () => {
      it('should detect configured variables', () => {
        process.env.HAPPY_SERVER_URL = 'https://custom.example.com'
        process.env.HAPPY_WEBAPP_URL = 'https://web.example.com'

        const result = checkEnv()

        expect(result.configured).toContain('HAPPY_SERVER_URL')
        expect(result.configured).toContain('HAPPY_WEBAPP_URL')
      })

      it('should detect variables using defaults', () => {
        // Clear custom values
        delete process.env.HAPPY_SERVER_URL
        delete process.env.HAPPY_WEBAPP_URL
        delete process.env.HAPPY_HOME_DIR

        const result = checkEnv()

        expect(result.usingDefaults).toContain('HAPPY_SERVER_URL')
        expect(result.usingDefaults).toContain('HAPPY_WEBAPP_URL')
        expect(result.usingDefaults).toContain('HAPPY_HOME_DIR')
      })

      it('should not include empty string as configured', () => {
        process.env.HAPPY_SERVER_URL = ''

        const result = checkEnv()

        expect(result.configured).not.toContain('HAPPY_SERVER_URL')
        expect(result.usingDefaults).toContain('HAPPY_SERVER_URL')
      })
    })

    describe('warning generation', () => {
      it('should warn when remote logging is set without DEBUG', () => {
        process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING = 'true'
        delete process.env.DEBUG

        const result = checkEnv()

        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.warnings[0]).toContain('Remote logging blocked')
        expect(result.warnings[0]).toContain('DEBUG=1')
      })

      it('should not warn about remote logging when DEBUG is set', () => {
        process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING = 'true'
        process.env.DEBUG = '1'

        const result = checkEnv()

        const remoteLoggingWarning = result.warnings.find(w => w.includes('Remote logging blocked'))
        expect(remoteLoggingWarning).toBeUndefined()
      })

      it('should warn when server URL is set but webapp URL is not', () => {
        process.env.HAPPY_SERVER_URL = 'https://custom.example.com'
        delete process.env.HAPPY_WEBAPP_URL

        const result = checkEnv()

        const mismatchWarning = result.warnings.find(w => w.includes('HAPPY_SERVER_URL is set'))
        expect(mismatchWarning).toBeDefined()
        expect(mismatchWarning).toContain('wrong webapp URL')
      })

      it('should not warn when both server and webapp URLs are set', () => {
        process.env.HAPPY_SERVER_URL = 'https://custom.example.com'
        process.env.HAPPY_WEBAPP_URL = 'https://web.example.com'

        const result = checkEnv()

        const mismatchWarning = result.warnings.find(w => w.includes('HAPPY_SERVER_URL is set'))
        expect(mismatchWarning).toBeUndefined()
      })

      it('should not warn when neither server nor webapp URLs are set', () => {
        delete process.env.HAPPY_SERVER_URL
        delete process.env.HAPPY_WEBAPP_URL

        const result = checkEnv()

        const mismatchWarning = result.warnings.find(w => w.includes('HAPPY_SERVER_URL is set'))
        expect(mismatchWarning).toBeUndefined()
      })
    })

    describe('result structure', () => {
      it('should return proper ValidationResult structure', () => {
        const result = checkEnv()

        expect(result).toHaveProperty('warnings')
        expect(result).toHaveProperty('configured')
        expect(result).toHaveProperty('usingDefaults')
        expect(Array.isArray(result.warnings)).toBe(true)
        expect(Array.isArray(result.configured)).toBe(true)
        expect(Array.isArray(result.usingDefaults)).toBe(true)
      })
    })
  })

  describe('validateEnv', () => {
    const originalEnv = process.env
    const originalConsoleWarn = console.warn
    const originalConsoleLog = console.log

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
      console.warn = vi.fn()
      console.log = vi.fn()
    })

    afterEach(() => {
      process.env = originalEnv
      console.warn = originalConsoleWarn
      console.log = originalConsoleLog
    })

    it('should log warnings when present', () => {
      process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING = 'true'
      delete process.env.DEBUG

      validateEnv()

      expect(console.warn).toHaveBeenCalled()
      const warnCall = (console.warn as any).mock.calls[0][0]
      expect(warnCall).toContain('[WARN]')
    })

    it('should not log when no warnings', () => {
      delete process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING
      delete process.env.HAPPY_SERVER_URL

      validateEnv()

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should show verbose output when DEBUG and verbose are set', () => {
      process.env.DEBUG = '1'

      validateEnv(true)

      expect(console.log).toHaveBeenCalled()
      const logCalls = (console.log as any).mock.calls.map((c: any) => c[0])
      expect(logCalls.some((log: string) => log.includes('Environment configuration'))).toBe(true)
    })

    it('should not show verbose output without DEBUG even if verbose is true', () => {
      delete process.env.DEBUG

      validateEnv(true)

      const logCalls = (console.log as any).mock.calls.map((c: any) => c[0])
      expect(logCalls.some((log: string) => log && log.includes('Environment configuration'))).toBe(false)
    })

    it('should not show verbose output when verbose is false', () => {
      process.env.DEBUG = '1'

      validateEnv(false)

      const logCalls = (console.log as any).mock.calls.map((c: any) => c[0])
      expect(logCalls.some((log: string) => log && log.includes('Environment configuration'))).toBe(false)
    })
  })
})
