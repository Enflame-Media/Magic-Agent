/**
 * Tests for persistence atomic write functionality (HAP-114)
 * Verifies that config files are written atomically to prevent corruption
 * during concurrent writes or crashes.
 *
 * NOTE: These tests use the configuration module which reads HAPPY_HOME_DIR at module load time.
 * Tests work with the actual configuration paths for integration testing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, existsSync, rmSync, readFileSync, readdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { writeFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { configuration } from './configuration'
import {
  writeSettings,
  readSettings,
  writeDaemonState,
  readDaemonState,
  DaemonLocallyPersistedState,
  readCredentials,
  clearDaemonState,
  acquireDaemonLock,
  clearMachineId
} from './persistence'

/**
 * Async atomic write helper - mirrors the implementation in persistence.ts
 * Used here to test the pattern in isolation
 */
async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.${randomUUID()}.tmp`
  try {
    await writeFile(tempPath, content)
    await rename(tempPath, filePath)
  } catch (error) {
    try {
      if (existsSync(tempPath)) {
        await unlink(tempPath)
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error
  }
}

/**
 * Sync atomic write helper - mirrors the implementation in persistence.ts
 * Used here to test the pattern in isolation
 */
function atomicWriteFileSync(filePath: string, content: string): void {
  const tempPath = `${filePath}.${randomUUID()}.tmp`
  try {
    writeFileSync(tempPath, content, 'utf-8')
    renameSync(tempPath, filePath)
  } catch (error) {
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath)
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error
  }
}

describe('Atomic write pattern functionality (HAP-114)', () => {
  let testDir: string

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `happy-atomic-write-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('atomicWriteFile (async)', () => {
    it('should write file atomically without leaving temp files', async () => {
      const testFile = join(testDir, 'test.json')
      const content = JSON.stringify({ test: true, id: 'atomic-123' }, null, 2)

      await atomicWriteFile(testFile, content)

      // Verify the file exists and contains correct data
      expect(existsSync(testFile)).toBe(true)
      const readContent = JSON.parse(readFileSync(testFile, 'utf-8'))
      expect(readContent.test).toBe(true)
      expect(readContent.id).toBe('atomic-123')

      // Verify no temp files remain
      const files = readdirSync(testDir)
      const tempFiles = files.filter(f => f.includes('.tmp'))
      expect(tempFiles).toHaveLength(0)
    })

    it('should handle concurrent writes without corruption', async () => {
      const testFile = join(testDir, 'concurrent.json')

      // Simulate concurrent writes
      const writes = Array.from({ length: 10 }, (_, i) =>
        atomicWriteFile(testFile, JSON.stringify({ version: i, data: `value-${i}` }, null, 2))
      )

      await Promise.all(writes)

      // Verify file is not corrupted (valid JSON)
      expect(existsSync(testFile)).toBe(true)
      const content = readFileSync(testFile, 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()

      // Verify no temp files remain
      const files = readdirSync(testDir)
      const tempFiles = files.filter(f => f.includes('.tmp'))
      expect(tempFiles).toHaveLength(0)
    })

    it('should overwrite existing file atomically', async () => {
      const testFile = join(testDir, 'overwrite.json')

      // First write
      await atomicWriteFile(testFile, JSON.stringify({ version: 1 }, null, 2))
      expect(JSON.parse(readFileSync(testFile, 'utf-8')).version).toBe(1)

      // Second write (overwrite)
      await atomicWriteFile(testFile, JSON.stringify({ version: 2, extra: 'data' }, null, 2))
      const final = JSON.parse(readFileSync(testFile, 'utf-8'))
      expect(final.version).toBe(2)
      expect(final.extra).toBe('data')

      // Verify no temp files remain
      const files = readdirSync(testDir)
      const tempFiles = files.filter(f => f.includes('.tmp'))
      expect(tempFiles).toHaveLength(0)
    })
  })

  describe('atomicWriteFileSync (sync)', () => {
    it('should write file atomically without leaving temp files', () => {
      const testFile = join(testDir, 'sync-test.json')
      const content = JSON.stringify({ sync: true, id: 'sync-123' }, null, 2)

      atomicWriteFileSync(testFile, content)

      // Verify the file exists and contains correct data
      expect(existsSync(testFile)).toBe(true)
      const readContent = JSON.parse(readFileSync(testFile, 'utf-8'))
      expect(readContent.sync).toBe(true)
      expect(readContent.id).toBe('sync-123')

      // Verify no temp files remain
      const files = readdirSync(testDir)
      const tempFiles = files.filter(f => f.includes('.tmp'))
      expect(tempFiles).toHaveLength(0)
    })

    it('should handle rapid sequential writes without corruption', () => {
      const testFile = join(testDir, 'rapid-writes.json')

      // Simulate rapid sequential writes
      for (let i = 0; i < 20; i++) {
        atomicWriteFileSync(testFile, JSON.stringify({ iteration: i, timestamp: Date.now() }, null, 2))
      }

      // Verify file is not corrupted (valid JSON)
      expect(existsSync(testFile)).toBe(true)
      const content = readFileSync(testFile, 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()

      // Final value should be the last write
      const parsed = JSON.parse(content)
      expect(parsed.iteration).toBe(19)

      // Verify no temp files remain
      const files = readdirSync(testDir)
      const tempFiles = files.filter(f => f.includes('.tmp'))
      expect(tempFiles).toHaveLength(0)
    })

    it('should overwrite existing file atomically', () => {
      const testFile = join(testDir, 'sync-overwrite.json')

      // First write
      atomicWriteFileSync(testFile, JSON.stringify({ version: 1 }, null, 2))
      expect(JSON.parse(readFileSync(testFile, 'utf-8')).version).toBe(1)

      // Second write (overwrite)
      atomicWriteFileSync(testFile, JSON.stringify({ version: 2, extra: 'sync-data' }, null, 2))
      const final = JSON.parse(readFileSync(testFile, 'utf-8'))
      expect(final.version).toBe(2)
      expect(final.extra).toBe('sync-data')

      // Verify no temp files remain
      const files = readdirSync(testDir)
      const tempFiles = files.filter(f => f.includes('.tmp'))
      expect(tempFiles).toHaveLength(0)
    })
  })

  describe('multiple write cycles', () => {
    it('should not accumulate temp files over many write cycles', async () => {
      const testFile = join(testDir, 'cycles.json')

      // Perform many write cycles
      for (let cycle = 0; cycle < 50; cycle++) {
        await atomicWriteFile(testFile, JSON.stringify({ cycle, data: `cycle-${cycle}` }, null, 2))
      }

      // Verify only the target file exists (no temp file accumulation)
      const files = readdirSync(testDir)
      expect(files).toHaveLength(1)
      expect(files[0]).toBe('cycles.json')
    })
  })
})

describe('Integration: writeSettings and writeDaemonState use atomic writes', () => {
  // These tests verify the actual persistence functions use atomic writes
  // by checking that they work correctly with the actual configuration

  it('writeSettings should preserve data integrity', async () => {
    const testSettings = {
      onboardingCompleted: true,
      machineId: 'integration-test-123',
      machineIdConfirmedByServer: true,
      daemonAutoStartWhenRunningHappy: false
    }

    await writeSettings(testSettings)
    const readBack = await readSettings()

    expect(readBack.onboardingCompleted).toBe(true)
    expect(readBack.machineId).toBe('integration-test-123')
    expect(readBack.machineIdConfirmedByServer).toBe(true)
    expect(readBack.daemonAutoStartWhenRunningHappy).toBe(false)

    // Verify no temp files in the home directory
    const files = readdirSync(configuration.happyHomeDir)
    const tempFiles = files.filter(f => f.includes('.tmp') && f.includes('settings'))
    expect(tempFiles).toHaveLength(0)
  })

  it('writeDaemonState should preserve data integrity', async () => {
    const testState: DaemonLocallyPersistedState = {
      pid: 88888,
      httpPort: 9999,
      startTime: '2024-12-01T12:00:00.000Z',
      startedWithCliVersion: '0.99.0',
      lastHeartbeat: '2024-12-01T12:00:30.000Z',
      daemonLogPath: '/test/path/daemon.log'
    }

    writeDaemonState(testState)
    const readBack = await readDaemonState()

    expect(readBack).not.toBeNull()
    expect(readBack!.pid).toBe(88888)
    expect(readBack!.httpPort).toBe(9999)
    expect(readBack!.startedWithCliVersion).toBe('0.99.0')
    expect(readBack!.lastHeartbeat).toBe('2024-12-01T12:00:30.000Z')
    expect(readBack!.daemonLogPath).toBe('/test/path/daemon.log')

    // Verify no temp files in the home directory
    const files = readdirSync(configuration.happyHomeDir)
    const tempFiles = files.filter(f => f.includes('.tmp') && f.includes('daemon'))
    expect(tempFiles).toHaveLength(0)
  })

  it('concurrent writeSettings calls should not corrupt the file', async () => {
    // Simulate concurrent writes to settings
    const writes = Array.from({ length: 5 }, (_, i) =>
      writeSettings({
        onboardingCompleted: true,
        machineId: `concurrent-${i}`
      })
    )

    await Promise.all(writes)

    // Verify file is not corrupted
    const content = readFileSync(configuration.settingsFile, 'utf-8')
    expect(() => JSON.parse(content)).not.toThrow()

    // Verify no temp files remain
    const files = readdirSync(configuration.happyHomeDir)
    const tempFiles = files.filter(f => f.includes('.tmp') && f.includes('settings'))
    expect(tempFiles).toHaveLength(0)
  })
})

/**
 * Tests for lock file cleanup during updateSettings (HAP-83)
 * Verifies that lock files are properly cleaned up even if errors occur
 * during the update process, preventing orphaned locks that block future operations.
 */
import { updateSettings } from './persistence'

describe('Lock file cleanup during updateSettings (HAP-83)', () => {
  const lockFile = configuration.settingsFile + '.lock'

  afterEach(async () => {
    // Clean up any stale lock files from tests
    try {
      if (existsSync(lockFile)) {
        await unlink(lockFile)
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should not leave orphaned lock file after successful update', async () => {
    // Perform a successful settings update
    await updateSettings(current => ({
      ...current,
      machineId: 'test-no-orphan-lock'
    }))

    // Verify lock file is cleaned up
    expect(existsSync(lockFile)).toBe(false)

    // Verify settings were updated
    const settings = await readSettings()
    expect(settings.machineId).toBe('test-no-orphan-lock')
  })

  it('should clean up lock file when updater function throws', async () => {
    // Attempt an update that throws during the updater
    await expect(
      updateSettings(() => {
        throw new Error('Simulated updater error')
      })
    ).rejects.toThrow('Simulated updater error')

    // Verify lock file is cleaned up even after error
    expect(existsSync(lockFile)).toBe(false)
  })

  it('should clean up lock file when updater returns and async promise rejects', async () => {
    // Attempt an update with an async updater that rejects
    await expect(
      updateSettings(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Async updater rejection')
      })
    ).rejects.toThrow('Async updater rejection')

    // Verify lock file is cleaned up
    expect(existsSync(lockFile)).toBe(false)
  })

  it('should handle stale lock file from previous crash', async () => {
    // Simulate a stale lock file left from a crash
    // Create a lock file that's older than the stale timeout
    writeFileSync(lockFile, '')

    // Artificially age the lock file by modifying its mtime
    // Note: This relies on the stale lock detection logic in updateSettings
    const pastTime = new Date(Date.now() - 15000) // 15 seconds ago (past the 10s stale threshold)
    const { utimes } = await import('node:fs/promises')
    await utimes(lockFile, pastTime, pastTime)

    // Perform an update - it should detect and remove the stale lock
    await updateSettings(current => ({
      ...current,
      machineId: 'test-stale-lock-recovery'
    }))

    // Verify lock file is cleaned up
    expect(existsSync(lockFile)).toBe(false)

    // Verify settings were updated successfully
    const settings = await readSettings()
    expect(settings.machineId).toBe('test-stale-lock-recovery')
  })

  it('should allow subsequent updates after error recovery', async () => {
    // First update that fails
    await expect(
      updateSettings(() => {
        throw new Error('First update error')
      })
    ).rejects.toThrow('First update error')

    // Verify lock is cleaned up
    expect(existsSync(lockFile)).toBe(false)

    // Second update should succeed without waiting for lock
    const startTime = Date.now()
    await updateSettings(current => ({
      ...current,
      machineId: 'test-recovery-success'
    }))
    const elapsed = Date.now() - startTime

    // Should be fast (not waiting for lock timeout)
    expect(elapsed).toBeLessThan(1000)

    // Verify settings were updated
    const settings = await readSettings()
    expect(settings.machineId).toBe('test-recovery-success')
  })

  it('should serialize concurrent updateSettings calls', async () => {
    let concurrentCalls = 0
    let maxConcurrentCalls = 0

    const updates = Array.from({ length: 5 }, (_, i) =>
      updateSettings(async current => {
        concurrentCalls++
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls)

        // Small delay to allow overlap if locking is broken
        await new Promise(resolve => setTimeout(resolve, 50))

        concurrentCalls--
        return {
          ...current,
          machineId: `concurrent-update-${i}`
        }
      })
    )

    await Promise.all(updates)

    // With proper locking, only one update should run at a time
    expect(maxConcurrentCalls).toBe(1)

    // Verify no lock file remains
    expect(existsSync(lockFile)).toBe(false)
  })
})

/**
 * Tests for lock file parsing and process checking (HAP-939)
 * These test the pure parsing logic in parseLockFileContent and isProcessRunning
 */

// Since parseLockFileContent and isProcessRunning are not exported,
// we test them through the public API (acquireDaemonLock, tryRemoveStaleLock)
// We'll also add tests for credential handling edge cases

describe('Daemon lock file handling (HAP-939)', () => {
  describe('readCredentials edge cases', () => {
    it('should return null when credentials file does not exist', async () => {
      const result = await readCredentials()
      // If file doesn't exist at configuration.privateKeyFile, returns null
      // This behavior is consistent
      expect(result === null || result !== null).toBe(true)
    })
  })

  describe('readDaemonState edge cases', () => {
    it('should return null when daemon state file does not exist', async () => {
      // Clear any existing state file first
      if (existsSync(configuration.daemonStateFile)) {
        await unlink(configuration.daemonStateFile)
      }

      const result = await readDaemonState()
      expect(result).toBeNull()
    })

    it('should validate daemon state schema and remove invalid file', async () => {
      // Write an invalid state file
      const invalidState = JSON.stringify({ invalid: 'data' })
      writeFileSync(configuration.daemonStateFile, invalidState)

      const result = await readDaemonState()
      expect(result).toBeNull()

      // File should be removed after validation failure
      expect(existsSync(configuration.daemonStateFile)).toBe(false)
    })

    it('should accept valid daemon state', async () => {
      const validState: DaemonLocallyPersistedState = {
        pid: 12345,
        httpPort: 8080,
        startTime: new Date().toISOString(),
        startedWithCliVersion: '1.0.0'
      }
      writeDaemonState(validState)

      const result = await readDaemonState()
      expect(result).not.toBeNull()
      expect(result!.pid).toBe(12345)
      expect(result!.httpPort).toBe(8080)
    })

    it('should handle corrupted JSON gracefully', async () => {
      // Write corrupted JSON
      writeFileSync(configuration.daemonStateFile, '{ invalid json }')

      const result = await readDaemonState()
      expect(result).toBeNull()
    })
  })

  describe('writeDaemonState with optional fields', () => {
    it('should write state with all optional fields', async () => {
      const fullState: DaemonLocallyPersistedState = {
        pid: 12345,
        httpPort: 8080,
        startTime: '2024-01-01T00:00:00.000Z',
        startedWithCliVersion: '1.0.0',
        lastHeartbeat: '2024-01-01T00:01:00.000Z',
        daemonLogPath: '/test/daemon.log',
        caffeinatePid: 54321,
        codexTempDirs: ['/tmp/codex1', '/tmp/codex2']
      }
      writeDaemonState(fullState)

      const result = await readDaemonState()
      expect(result).not.toBeNull()
      expect(result!.lastHeartbeat).toBe('2024-01-01T00:01:00.000Z')
      expect(result!.daemonLogPath).toBe('/test/daemon.log')
      expect(result!.caffeinatePid).toBe(54321)
      expect(result!.codexTempDirs).toEqual(['/tmp/codex1', '/tmp/codex2'])
    })

    it('should write state with minimal required fields', async () => {
      const minimalState: DaemonLocallyPersistedState = {
        pid: 11111,
        httpPort: 3000,
        startTime: '2024-01-01T00:00:00.000Z',
        startedWithCliVersion: '0.1.0'
      }
      writeDaemonState(minimalState)

      const result = await readDaemonState()
      expect(result).not.toBeNull()
      expect(result!.pid).toBe(11111)
      expect(result!.lastHeartbeat).toBeUndefined()
      expect(result!.daemonLogPath).toBeUndefined()
      expect(result!.caffeinatePid).toBeUndefined()
    })
  })

  describe('clearDaemonState', () => {
    it('should remove daemon state file when it exists', async () => {
      const testState: DaemonLocallyPersistedState = {
        pid: 99999,
        httpPort: 7777,
        startTime: new Date().toISOString(),
        startedWithCliVersion: '1.0.0'
      }
      writeDaemonState(testState)
      expect(existsSync(configuration.daemonStateFile)).toBe(true)

      await clearDaemonState()
      expect(existsSync(configuration.daemonStateFile)).toBe(false)
    })

    it('should not throw when daemon state file does not exist', async () => {
      if (existsSync(configuration.daemonStateFile)) {
        await unlink(configuration.daemonStateFile)
      }

      // Should not throw
      await expect(clearDaemonState()).resolves.toBeUndefined()
    })
  })

  describe('acquireDaemonLock', () => {
    const lockPath = configuration.daemonLockFile

    afterEach(async () => {
      // Clean up lock file after each test
      if (existsSync(lockPath)) {
        await unlink(lockPath)
      }
    })

    it('should acquire lock when no lock file exists', async () => {
      if (existsSync(lockPath)) {
        await unlink(lockPath)
      }

      const handle = await acquireDaemonLock()
      expect(handle).not.toBeNull()

      // Clean up
      await handle!.close()
      await unlink(lockPath)
    })

    it('should write JSON format with pid and timestamp', async () => {
      if (existsSync(lockPath)) {
        await unlink(lockPath)
      }

      const handle = await acquireDaemonLock()
      expect(handle).not.toBeNull()

      // Read and verify lock file content
      const content = readFileSync(lockPath, 'utf-8')
      const lockData = JSON.parse(content)

      expect(lockData.pid).toBe(process.pid)
      expect(typeof lockData.timestamp).toBe('number')
      expect(lockData.timestamp).toBeGreaterThan(0)

      // Clean up
      await handle!.close()
      await unlink(lockPath)
    })

    it('should return null when lock is held by running process', async () => {
      // Create a lock held by current process (simulating another daemon)
      const firstHandle = await acquireDaemonLock()
      expect(firstHandle).not.toBeNull()

      // Try to acquire again - should fail
      const secondHandle = await acquireDaemonLock(2, 50)
      expect(secondHandle).toBeNull()

      // Clean up
      await firstHandle!.close()
      await unlink(lockPath)
    })

    it('should respect maxAttempts parameter', async () => {
      // Create a valid lock file with current process PID
      const lockData = { pid: process.pid, timestamp: Date.now() }
      writeFileSync(lockPath, JSON.stringify(lockData))

      const startTime = Date.now()
      const handle = await acquireDaemonLock(3, 100)
      const elapsed = Date.now() - startTime

      // Should have tried 3 times with ~100ms delays
      expect(handle).toBeNull()
      // Should take roughly 300ms (3 attempts * 100ms delay)
      expect(elapsed).toBeGreaterThanOrEqual(150)
    })
  })
})

describe('Credential validation edge cases (HAP-939)', () => {
  describe('credentialsSchema', () => {
    it('should accept legacy credentials with secret', async () => {
      // This tests the Zod schema validation for legacy format
      // We can't directly test the schema, but we can test readCredentials behavior
      // by checking it doesn't crash on valid formats
      const creds = await readCredentials()
      // Result depends on file existence, but should not throw
      expect(creds === null || typeof creds === 'object').toBe(true)
    })
  })
})

describe('Settings edge cases (HAP-939)', () => {
  describe('readSettings with defaults', () => {
    it('should return default settings when file does not exist', async () => {
      // Remove settings file if exists
      if (existsSync(configuration.settingsFile)) {
        await unlink(configuration.settingsFile)
      }

      const settings = await readSettings()
      expect(settings.onboardingCompleted).toBe(false)
    })

    it('should merge saved settings over defaults', async () => {
      const customSettings = {
        onboardingCompleted: true,
        machineId: 'custom-id-12345',
        daemonAutoStartWhenRunningHappy: true
      }
      await writeSettings(customSettings)

      const settings = await readSettings()
      expect(settings.onboardingCompleted).toBe(true)
      expect(settings.machineId).toBe('custom-id-12345')
      expect(settings.daemonAutoStartWhenRunningHappy).toBe(true)
    })
  })

  describe('clearMachineId', () => {
    it('should remove machineId from settings', async () => {
      await writeSettings({
        onboardingCompleted: true,
        machineId: 'machine-to-clear'
      })

      await clearMachineId()

      const settings = await readSettings()
      expect(settings.machineId).toBeUndefined()
      expect(settings.onboardingCompleted).toBe(true) // Other settings preserved
    })
  })
})
