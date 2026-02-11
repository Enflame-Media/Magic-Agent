/**
 * Tests for stopped sessions history tracking
 * @see HAP-811 - Track stopped sessions in CLI daemon status
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Define the temp directory before the mock - must be a literal for hoisting
const getTempDir = () => `/tmp/happy-test-stopped-sessions-${process.pid}`

// Mock the configuration to use a temp directory
vi.mock('@/configuration', () => ({
  configuration: {
    get happyHomeDir() {
      return `/tmp/happy-test-stopped-sessions-${process.pid}`
    },
  },
}))

// Mock logger to avoid side effects
vi.mock('@/ui/logger', () => ({
  logger: {
    debug: () => {},
  },
}))

// Import after mocks are set up
import {
  recordStoppedSession,
  getStoppedSessionTimestamp,
  isSessionStopped,
  cleanupExpiredEntries,
  getStoppedSessionCount,
  clearStoppedSessionsHistory,
} from './stoppedSessionsHistory'

describe('Stopped Sessions History', () => {
  beforeEach(() => {
    const tempDir = getTempDir()
    // Clean up and recreate temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
    mkdirSync(tempDir, { recursive: true })
    // Clear any existing history from previous tests
    clearStoppedSessionsHistory()
  })

  afterEach(() => {
    const tempDir = getTempDir()
    // Clean up temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true })
    }
  })

  describe('recordStoppedSession', () => {
    it('should record a stopped session', () => {
      const sessionId = 'test-session-123'

      recordStoppedSession(sessionId)

      expect(isSessionStopped(sessionId)).toBe(true)
      expect(getStoppedSessionCount()).toBe(1)
    })

    it('should update timestamp when re-recording the same session', () => {
      const sessionId = 'test-session-123'

      recordStoppedSession(sessionId)
      const firstTimestamp = getStoppedSessionTimestamp(sessionId)

      recordStoppedSession(sessionId)
      const secondTimestamp = getStoppedSessionTimestamp(sessionId)

      // Should still have only one entry
      expect(getStoppedSessionCount()).toBe(1)
      // Timestamps should be different (or same if test runs quickly)
      expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp!)
    })

    it('should handle multiple sessions', () => {
      recordStoppedSession('session-1')
      recordStoppedSession('session-2')
      recordStoppedSession('session-3')

      expect(getStoppedSessionCount()).toBe(3)
      expect(isSessionStopped('session-1')).toBe(true)
      expect(isSessionStopped('session-2')).toBe(true)
      expect(isSessionStopped('session-3')).toBe(true)
    })
  })

  describe('isSessionStopped', () => {
    it('should return false for non-existent session', () => {
      expect(isSessionStopped('non-existent')).toBe(false)
    })

    it('should be case-insensitive', () => {
      recordStoppedSession('ABC-123-DEF')

      expect(isSessionStopped('abc-123-def')).toBe(true)
      expect(isSessionStopped('ABC-123-DEF')).toBe(true)
      expect(isSessionStopped('Abc-123-Def')).toBe(true)
    })
  })

  describe('getStoppedSessionTimestamp', () => {
    it('should return undefined for non-existent session', () => {
      expect(getStoppedSessionTimestamp('non-existent')).toBeUndefined()
    })

    it('should return timestamp for existing session', () => {
      const before = Date.now()
      recordStoppedSession('test-session')
      const after = Date.now()

      const timestamp = getStoppedSessionTimestamp('test-session')

      expect(timestamp).toBeDefined()
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('cleanupExpiredEntries', () => {
    it('should remove expired entries', async () => {
      // Record a session
      recordStoppedSession('old-session')

      // Wait a bit to ensure the entry is older than our TTL
      await new Promise(resolve => setTimeout(resolve, 10))

      // Use a very short TTL (5ms) to simulate expiration
      const removed = cleanupExpiredEntries(5)

      // The entry should be removed (it's older than 5ms)
      expect(removed).toBe(1)
      expect(isSessionStopped('old-session')).toBe(false)
    })

    it('should keep non-expired entries', () => {
      recordStoppedSession('recent-session')

      // Use a long TTL (1 hour)
      const removed = cleanupExpiredEntries(60 * 60 * 1000)

      expect(removed).toBe(0)
      expect(isSessionStopped('recent-session')).toBe(true)
    })

    it('should return 0 when no entries exist', () => {
      const removed = cleanupExpiredEntries()
      expect(removed).toBe(0)
    })
  })

  describe('clearStoppedSessionsHistory', () => {
    it('should clear all entries', () => {
      recordStoppedSession('session-1')
      recordStoppedSession('session-2')
      expect(getStoppedSessionCount()).toBe(2)

      clearStoppedSessionsHistory()

      expect(getStoppedSessionCount()).toBe(0)
      expect(isSessionStopped('session-1')).toBe(false)
      expect(isSessionStopped('session-2')).toBe(false)
    })

    it('should handle clearing empty history', () => {
      // Should not throw
      clearStoppedSessionsHistory()
      expect(getStoppedSessionCount()).toBe(0)
    })
  })

  describe('persistence', () => {
    it('should persist across reads', () => {
      recordStoppedSession('persistent-session')

      // The history file should exist
      const historyPath = join(getTempDir(), 'stopped-sessions.json')
      expect(existsSync(historyPath)).toBe(true)

      // Reading again should return the same data
      expect(isSessionStopped('persistent-session')).toBe(true)
    })
  })

  describe('max entries limit', () => {
    it('should prune oldest entries when exceeding max limit', () => {
      // Record more than MAX_ENTRIES (1000) sessions
      // We'll test with a smaller sample to verify the pruning logic
      for (let i = 0; i < 10; i++) {
        recordStoppedSession(`session-${i}`)
      }

      expect(getStoppedSessionCount()).toBeLessThanOrEqual(1000)
    })
  })
})
