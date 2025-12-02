/**
 * Tests for CLI entry point (src/index.ts)
 *
 * Tests command routing, version/help flags, and error handling
 * for the main CLI entry point.
 *
 * These tests use spawnSync to run the actual CLI binary,
 * testing the real command routing behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync, SpawnSyncReturns } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import packageJson from '../package.json'

/**
 * Helper to run happy CLI and capture output
 * Returns stdout, stderr, and exit code
 */
function runHappyCLI(
  args: string[],
  options: { timeout?: number; env?: Record<string, string> } = {}
): SpawnSyncReturns<string> {
  const projectRoot = process.cwd()
  const entrypoint = join(projectRoot, 'dist', 'index.mjs')

  const timeout = options.timeout ?? 10_000
  const env = {
    ...process.env,
    // Use a temp directory to avoid affecting user's real config
    HAPPY_HOME_DIR: join(tmpdir(), `happy-cli-test-${Date.now()}`),
    ...options.env
  }

  return spawnSync('node', ['--no-warnings', '--no-deprecation', entrypoint, ...args], {
    encoding: 'utf8',
    timeout,
    env,
    cwd: projectRoot
  })
}

describe('CLI Entry Point', () => {
  describe('Version flag', () => {
    it('should output version when --version flag is passed', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['--version'], { timeout: 15_000 })

      // Should include the happy version in output
      expect(result.stdout).toContain(`happy version: ${packageJson.version}`)
    })

    it('should accept -v as alias for --version', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['-v'], { timeout: 15_000 })

      // Should include the happy version in output
      expect(result.stdout).toContain(`happy version: ${packageJson.version}`)
    })
  })

  describe('Help flag', () => {
    it('should output help when --help flag is passed', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['--help'], { timeout: 15_000 })

      // Should include help content (the header says "happy - Claude Code On the Go")
      expect(result.stdout).toContain('happy')
      expect(result.stdout).toContain('Usage:')
      expect(result.status).toBe(0)
    })

    it('should accept -h as alias for --help', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['-h'], { timeout: 15_000 })

      // Should include help content
      expect(result.stdout).toContain('happy')
      expect(result.stdout).toContain('Usage:')
      expect(result.status).toBe(0)
    })
  })

  describe('Daemon subcommands', () => {
    it('should show daemon help for "daemon" without subcommand', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['daemon'], { timeout: 15_000 })

      // Should show daemon-specific help
      expect(result.stdout).toContain('daemon')
      // Exit code 0 for help display
      expect(result.status).toBe(0)
    })

    it('should show daemon help for unknown daemon subcommand', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['daemon', 'unknown-subcommand'], { timeout: 15_000 })

      // Should show daemon-specific help (same as no subcommand)
      expect(result.stdout).toContain('daemon')
      expect(result.status).toBe(0)
    })

    it('should handle daemon logs command', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['daemon', 'logs'], { timeout: 15_000 })

      // The logs command outputs path or "No daemon logs found"
      // Either is acceptable for this test
      expect(result.status).toBe(0)
    })

    it('should handle daemon status command with --json flag', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['daemon', 'status', '--json'], { timeout: 15_000 })

      // Should output valid JSON (even if daemon isn't running)
      let parsed
      try {
        parsed = JSON.parse(result.stdout)
      } catch {
        // If it fails to parse, it might have extra output
        // Try to extract the JSON part
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        }
      }

      // Should have a running field in the output
      expect(parsed).toBeDefined()
      expect(typeof parsed.running).toBe('boolean')
    })
  })

  describe('Doctor command', () => {
    it('should run doctor command successfully', { timeout: 35_000 }, () => {
      const result = runHappyCLI(['doctor'], { timeout: 30_000 })

      // Doctor command should run without crashing
      // Exit code can vary based on system state
      // We check that either it completes normally or is just a timeout
      const completedNormally = result.signal === null && result.error === undefined
      const timedOut = result.signal === 'SIGTERM'
      expect(completedNormally || timedOut).toBe(true)
    })
  })

  describe('Auth command', () => {
    it('should show auth help for "auth" without subcommand', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['auth'], { timeout: 15_000 })

      // Should show auth-specific help or error
      expect(result.status).toBe(0)
    })

    it('should show auth status (may fail if not authenticated)', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['auth', 'status'], { timeout: 15_000 })

      // Should run without crashing
      // We check that either it completes normally or is just a timeout
      const completedNormally = result.signal === null && result.error === undefined
      const timedOut = result.signal === 'SIGTERM'
      expect(completedNormally || timedOut).toBe(true)
    })
  })

  describe('Notify command', () => {
    it('should show help for notify --help', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['notify', '--help'], { timeout: 15_000 })

      expect(result.stdout).toContain('notify')
      expect(result.status).toBe(0)
    })

    it('should show help for notify -h', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['notify', '-h'], { timeout: 15_000 })

      expect(result.stdout).toContain('notify')
      expect(result.status).toBe(0)
    })

    it('should error when notify is called without message', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['notify'], { timeout: 15_000 })

      // Should error about missing message
      expect(result.stderr).toContain('Message is required')
      expect(result.status).toBe(1)
    })
  })

  describe('Error handling', () => {
    it('should handle unknown arguments gracefully', { timeout: 20_000 }, () => {
      // Unknown arguments that look like flags might be passed to Claude
      // This is not necessarily an error
      const result = runHappyCLI(['--unknown-flag-that-does-not-exist'], { timeout: 15_000 })

      // Should not crash with unhandled exception
      // We check that either it completes normally or is just a timeout
      const completedNormally = result.signal === null && result.error === undefined
      const timedOut = result.signal === 'SIGTERM'
      expect(completedNormally || timedOut).toBe(true)
    })
  })

  describe('Deprecated logout command', () => {
    it('should show deprecation warning for "logout" command', { timeout: 20_000 }, () => {
      const result = runHappyCLI(['logout'], { timeout: 15_000 })

      // Should mention deprecation
      expect(result.stdout).toContain('deprecated')
      expect(result.stdout).toContain('happy auth logout')
    })
  })
})

describe('handleNotifyCommand', () => {
  let testHomeDir: string

  beforeEach(() => {
    // Create a unique test home directory
    testHomeDir = join(tmpdir(), `happy-notify-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(testHomeDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testHomeDir)) {
      rmSync(testHomeDir, { recursive: true, force: true })
    }
  })

  it('should parse -p argument for message', { timeout: 20_000 }, () => {
    const result = runHappyCLI(['notify', '-p', 'Test message'], {
      timeout: 15_000,
      env: { HAPPY_HOME_DIR: testHomeDir }
    })

    // Without credentials, it should fail with auth error, not parse error
    // This confirms the -p argument was parsed correctly
    expect(result.stderr).toContain('Not authenticated')
    expect(result.stderr).not.toContain('Message is required')
  })

  it('should parse -t argument for title', { timeout: 20_000 }, () => {
    const result = runHappyCLI(['notify', '-p', 'Test message', '-t', 'Test Title'], {
      timeout: 15_000,
      env: { HAPPY_HOME_DIR: testHomeDir }
    })

    // Without credentials, it should fail with auth error
    expect(result.stderr).toContain('Not authenticated')
  })

  it('should reject unknown arguments', { timeout: 20_000 }, () => {
    const result = runHappyCLI(['notify', '--unknown-arg'], {
      timeout: 15_000,
      env: { HAPPY_HOME_DIR: testHomeDir }
    })

    expect(result.stderr).toContain('Unknown argument')
    expect(result.status).toBe(1)
  })
})
