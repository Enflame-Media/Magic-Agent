/**
 * Tests for configuration module
 *
 * Tests environment variable handling, path configuration,
 * and feature flag parsing in the Configuration class.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, rmSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Configuration } from './configuration'

/**
 * Helper to save and restore environment variables
 */
function withEnv(envVars: Record<string, string | undefined>, fn: () => void): void {
  const originalEnv: Record<string, string | undefined> = {}

  // Save original values and set new ones
  for (const [key, value] of Object.entries(envVars)) {
    originalEnv[key] = process.env[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    fn()
  } finally {
    // Restore original values
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

/**
 * Helper to save and restore process.argv
 */
function withArgv(args: string[], fn: () => void): void {
  const originalArgv = process.argv
  process.argv = ['node', 'happy', ...args]

  try {
    fn()
  } finally {
    process.argv = originalArgv
  }
}

describe('Configuration', () => {
  describe('Server URL configuration', () => {
    it('should use default serverUrl when HAPPY_SERVER_URL is not set', () => {
      withEnv({ HAPPY_SERVER_URL: undefined }, () => {
        const config = new Configuration()
        expect(config.serverUrl).toBe('https://api.cluster-fluster.com')
      })
    })

    it('should use HAPPY_SERVER_URL when set', () => {
      withEnv({ HAPPY_SERVER_URL: 'http://localhost:3005' }, () => {
        const config = new Configuration()
        expect(config.serverUrl).toBe('http://localhost:3005')
      })
    })

    it('should use default webappUrl when HAPPY_WEBAPP_URL is not set', () => {
      withEnv({ HAPPY_WEBAPP_URL: undefined }, () => {
        const config = new Configuration()
        expect(config.webappUrl).toBe('https://app.happy.engineering')
      })
    })

    it('should use HAPPY_WEBAPP_URL when set', () => {
      withEnv({ HAPPY_WEBAPP_URL: 'http://localhost:3000' }, () => {
        const config = new Configuration()
        expect(config.webappUrl).toBe('http://localhost:3000')
      })
    })
  })

  describe('isDaemonProcess detection', () => {
    it('should return true when args are ["daemon", "start-sync"]', () => {
      withArgv(['daemon', 'start-sync'], () => {
        const config = new Configuration()
        expect(config.isDaemonProcess).toBe(true)
      })
    })

    it('should return false for daemon start (not start-sync)', () => {
      withArgv(['daemon', 'start'], () => {
        const config = new Configuration()
        expect(config.isDaemonProcess).toBe(false)
      })
    })

    it('should return false for daemon stop', () => {
      withArgv(['daemon', 'stop'], () => {
        const config = new Configuration()
        expect(config.isDaemonProcess).toBe(false)
      })
    })

    it('should return false for regular command', () => {
      withArgv(['auth', 'login'], () => {
        const config = new Configuration()
        expect(config.isDaemonProcess).toBe(false)
      })
    })

    it('should return false for no args', () => {
      withArgv([], () => {
        const config = new Configuration()
        expect(config.isDaemonProcess).toBe(false)
      })
    })

    it('should return false for single arg', () => {
      withArgv(['daemon'], () => {
        const config = new Configuration()
        expect(config.isDaemonProcess).toBe(false)
      })
    })
  })

  describe('HAPPY_HOME_DIR expansion', () => {
    it('should use default ~/.happy when HAPPY_HOME_DIR is not set', () => {
      withEnv({ HAPPY_HOME_DIR: undefined }, () => {
        const config = new Configuration()
        expect(config.happyHomeDir).toBe(join(homedir(), '.happy'))
      })
    })

    it('should use custom HAPPY_HOME_DIR when set', () => {
      withEnv({ HAPPY_HOME_DIR: '/custom/path' }, () => {
        const config = new Configuration()
        expect(config.happyHomeDir).toBe('/custom/path')
      })
    })

    it('should expand ~ to home directory', () => {
      withEnv({ HAPPY_HOME_DIR: '~/custom-happy' }, () => {
        const config = new Configuration()
        expect(config.happyHomeDir).toBe(join(homedir(), 'custom-happy'))
      })
    })

    it('should expand ~ only at the beginning', () => {
      withEnv({ HAPPY_HOME_DIR: '/path/with~tilde' }, () => {
        const config = new Configuration()
        expect(config.happyHomeDir).toBe('/path/with~tilde')
      })
    })
  })

  describe('Path derivation from happyHomeDir', () => {
    it('should derive all paths from happyHomeDir', () => {
      withEnv({ HAPPY_HOME_DIR: '/test/home' }, () => {
        const config = new Configuration()

        expect(config.logsDir).toBe('/test/home/logs')
        expect(config.settingsFile).toBe('/test/home/settings.json')
        expect(config.privateKeyFile).toBe('/test/home/access.key')
        expect(config.daemonStateFile).toBe('/test/home/daemon.state.json')
        expect(config.daemonLockFile).toBe('/test/home/daemon.state.json.lock')
        expect(config.daemonAuthTokenFile).toBe('/test/home/.daemon-token')
      })
    })
  })

  describe('Feature flag parsing', () => {
    describe('HAPPY_EXPERIMENTAL', () => {
      it('should be false when not set', () => {
        withEnv({ HAPPY_EXPERIMENTAL: undefined }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(false)
        })
      })

      it('should be true when set to "true"', () => {
        withEnv({ HAPPY_EXPERIMENTAL: 'true' }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(true)
        })
      })

      it('should be true when set to "TRUE" (case insensitive)', () => {
        withEnv({ HAPPY_EXPERIMENTAL: 'TRUE' }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(true)
        })
      })

      it('should be true when set to "1"', () => {
        withEnv({ HAPPY_EXPERIMENTAL: '1' }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(true)
        })
      })

      it('should be true when set to "yes"', () => {
        withEnv({ HAPPY_EXPERIMENTAL: 'yes' }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(true)
        })
      })

      it('should be true when set to "YES" (case insensitive)', () => {
        withEnv({ HAPPY_EXPERIMENTAL: 'YES' }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(true)
        })
      })

      it('should be false when set to other values', () => {
        withEnv({ HAPPY_EXPERIMENTAL: 'false' }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(false)
        })
      })

      it('should be false when set to empty string', () => {
        withEnv({ HAPPY_EXPERIMENTAL: '' }, () => {
          const config = new Configuration()
          expect(config.isExperimentalEnabled).toBe(false)
        })
      })
    })

    describe('HAPPY_DISABLE_CAFFEINATE', () => {
      it('should be false when not set', () => {
        withEnv({ HAPPY_DISABLE_CAFFEINATE: undefined }, () => {
          const config = new Configuration()
          expect(config.disableCaffeinate).toBe(false)
        })
      })

      it('should be true when set to "true"', () => {
        withEnv({ HAPPY_DISABLE_CAFFEINATE: 'true' }, () => {
          const config = new Configuration()
          expect(config.disableCaffeinate).toBe(true)
        })
      })

      it('should be true when set to "1"', () => {
        withEnv({ HAPPY_DISABLE_CAFFEINATE: '1' }, () => {
          const config = new Configuration()
          expect(config.disableCaffeinate).toBe(true)
        })
      })

      it('should be true when set to "yes"', () => {
        withEnv({ HAPPY_DISABLE_CAFFEINATE: 'yes' }, () => {
          const config = new Configuration()
          expect(config.disableCaffeinate).toBe(true)
        })
      })
    })
  })

  describe('currentCliVersion', () => {
    it('should have a valid version string', () => {
      const config = new Configuration()
      // Version should be a semver-like string (e.g., "0.11.4")
      expect(config.currentCliVersion).toMatch(/^\d+\.\d+\.\d+/)
    })
  })

  describe('ensureSetup', () => {
    let testDir: string

    beforeEach(() => {
      // Create a unique test directory
      testDir = join(tmpdir(), `happy-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    })

    afterEach(() => {
      // Clean up test directory
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    it('should create happyHomeDir if it does not exist', () => {
      withEnv({ HAPPY_HOME_DIR: testDir }, () => {
        const config = new Configuration()

        expect(existsSync(testDir)).toBe(false)

        config.ensureSetup()

        expect(existsSync(testDir)).toBe(true)
      })
    })

    it('should create logsDir if it does not exist', () => {
      withEnv({ HAPPY_HOME_DIR: testDir }, () => {
        const config = new Configuration()
        const expectedLogsDir = join(testDir, 'logs')

        expect(existsSync(expectedLogsDir)).toBe(false)

        config.ensureSetup()

        expect(existsSync(expectedLogsDir)).toBe(true)
      })
    })

    it('should not fail if directories already exist', () => {
      withEnv({ HAPPY_HOME_DIR: testDir }, () => {
        // Pre-create directories
        mkdirSync(testDir, { recursive: true })
        mkdirSync(join(testDir, 'logs'), { recursive: true })

        const config = new Configuration()

        // Should not throw
        expect(() => config.ensureSetup()).not.toThrow()

        expect(existsSync(testDir)).toBe(true)
        expect(existsSync(join(testDir, 'logs'))).toBe(true)
      })
    })

    it('should be callable multiple times without error', () => {
      withEnv({ HAPPY_HOME_DIR: testDir }, () => {
        const config = new Configuration()

        config.ensureSetup()
        config.ensureSetup()
        config.ensureSetup()

        expect(existsSync(testDir)).toBe(true)
        expect(existsSync(join(testDir, 'logs'))).toBe(true)
      })
    })
  })
})
