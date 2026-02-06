import { describe, it, expect } from 'vitest'
import { parseCliArgs } from './cliArgs'

describe('parseCliArgs', () => {
  describe('basic parsing', () => {
    it('should return empty results for no arguments', () => {
      const result = parseCliArgs([])
      expect(result.unknownArgs).toEqual([])
      expect(result.showHelp).toBe(false)
      expect(result.showVersion).toBe(false)
      expect(result.verbose).toBe(false)
    })

    it('should handle help flag', () => {
      const result = parseCliArgs(['--help'])
      expect(result.showHelp).toBe(true)
      expect(result.unknownArgs).toContain('--help')
    })

    it('should handle short help flag', () => {
      const result = parseCliArgs(['-h'])
      expect(result.showHelp).toBe(true)
      expect(result.unknownArgs).toContain('-h')
    })

    it('should handle version flag', () => {
      const result = parseCliArgs(['--version'])
      expect(result.showVersion).toBe(true)
      expect(result.unknownArgs).toContain('--version')
    })

    it('should handle --yolo flag', () => {
      const result = parseCliArgs(['--yolo'])
      expect(result.unknownArgs).toContain('--dangerously-skip-permissions')
      expect(result.unknownArgs).not.toContain('--yolo')
    })

    it('should strip "claude" prefix if present', () => {
      const result = parseCliArgs(['claude', '--help'])
      expect(result.showHelp).toBe(true)
      expect(result.unknownArgs).toEqual(['--help'])
    })
  })

  describe('happy-specific flags', () => {
    it('should parse --verbose flag', () => {
      const result = parseCliArgs(['--verbose'])
      expect(result.verbose).toBe(true)
      // --verbose should NOT be passed through to Claude
      expect(result.unknownArgs).toEqual([])
      expect(result.options.claudeArgs).toBeUndefined()
    })

    it('should parse --verbose with other flags', () => {
      const result = parseCliArgs(['--verbose', '--model', 'claude-3'])
      expect(result.verbose).toBe(true)
      expect(result.unknownArgs).toEqual(['--model', 'claude-3'])
    })

    it('should parse --happy-starting-mode local', () => {
      const result = parseCliArgs(['--happy-starting-mode', 'local'])
      expect(result.options.startingMode).toBe('local')
      expect(result.unknownArgs).toEqual([])
    })

    it('should parse --happy-starting-mode remote', () => {
      const result = parseCliArgs(['--happy-starting-mode', 'remote'])
      expect(result.options.startingMode).toBe('remote')
      expect(result.unknownArgs).toEqual([])
    })

    it('should parse --started-by daemon', () => {
      const result = parseCliArgs(['--started-by', 'daemon'])
      expect(result.options.startedBy).toBe('daemon')
      expect(result.unknownArgs).toEqual([])
    })

    it('should parse --started-by terminal', () => {
      const result = parseCliArgs(['--started-by', 'terminal'])
      expect(result.options.startedBy).toBe('terminal')
      expect(result.unknownArgs).toEqual([])
    })

    it('should throw for invalid --started-by value', () => {
      expect(() => parseCliArgs(['--started-by', 'invalid'])).toThrow(
        'Invalid --started-by value: "invalid". Must be one of: daemon, terminal'
      )
    })
  })

  describe('unknown arguments pass-through', () => {
    it('should pass unknown flags through to claude', () => {
      const result = parseCliArgs(['--model', 'claude-3'])
      expect(result.unknownArgs).toEqual(['--model', 'claude-3'])
    })

    it('should pass multiple unknown arguments through', () => {
      const result = parseCliArgs(['--model', 'claude-3', '--max-tokens', '1000'])
      expect(result.unknownArgs).toEqual(['--model', 'claude-3', '--max-tokens', '1000'])
    })

    it('should include unknown args in claudeArgs option', () => {
      const result = parseCliArgs(['--model', 'claude-3'])
      expect(result.options.claudeArgs).toEqual(['--model', 'claude-3'])
    })
  })

  describe('edge cases - negative numbers and special values (HAP-62 fix)', () => {
    it('should correctly handle negative number values', () => {
      // Critical test: --temperature -1 should NOT treat -1 as a separate flag
      const result = parseCliArgs(['--temperature', '-1'])
      expect(result.unknownArgs).toEqual(['--temperature', '-1'])
      expect(result.unknownArgs.length).toBe(2)
    })

    it('should correctly handle negative decimal values', () => {
      const result = parseCliArgs(['--some-flag', '-0.5'])
      expect(result.unknownArgs).toEqual(['--some-flag', '-0.5'])
    })

    it('should correctly handle multiple flags with negative values', () => {
      const result = parseCliArgs(['--temp', '-1', '--other', '-2'])
      expect(result.unknownArgs).toEqual(['--temp', '-1', '--other', '-2'])
    })

    it('should correctly handle value that looks like a flag', () => {
      // Edge case: value intentionally starts with --
      const result = parseCliArgs(['--prefix', '--special-value'])
      expect(result.unknownArgs).toEqual(['--prefix', '--special-value'])
    })

    it('should correctly handle value that looks like short flag', () => {
      const result = parseCliArgs(['--value', '-x'])
      expect(result.unknownArgs).toEqual(['--value', '-x'])
    })

    it('should handle mixed happy flags and unknown flags with negative values', () => {
      const result = parseCliArgs(['--yolo', '--temperature', '-1', '--max-tokens', '100'])
      expect(result.unknownArgs).toEqual([
        '--dangerously-skip-permissions',
        '--temperature',
        '-1',
        '--max-tokens',
        '100',
      ])
    })

    it('should handle negative values at the end of args', () => {
      const result = parseCliArgs(['--some-flag', '-99'])
      expect(result.unknownArgs).toEqual(['--some-flag', '-99'])
    })

    it('should handle standalone negative number as prompt', () => {
      // User might pass a negative number as part of a prompt
      const result = parseCliArgs(['-42'])
      expect(result.unknownArgs).toEqual(['-42'])
    })
  })

  describe('complex scenarios', () => {
    it('should handle a realistic command line with mixed args', () => {
      const result = parseCliArgs([
        '--happy-starting-mode',
        'local',
        '--yolo',
        '--model',
        'claude-3-opus',
        '--temperature',
        '-1',
        '--help',
      ])
      expect(result.options.startingMode).toBe('local')
      expect(result.showHelp).toBe(true)
      expect(result.unknownArgs).toContain('--dangerously-skip-permissions')
      expect(result.unknownArgs).toContain('--model')
      expect(result.unknownArgs).toContain('claude-3-opus')
      expect(result.unknownArgs).toContain('--temperature')
      expect(result.unknownArgs).toContain('-1')
      expect(result.unknownArgs).toContain('--help')
    })

    it('should preserve argument order', () => {
      const result = parseCliArgs(['--a', '1', '--b', '2', '--c', '3'])
      expect(result.unknownArgs).toEqual(['--a', '1', '--b', '2', '--c', '3'])
    })

    it('should not mutate input array', () => {
      const original = ['claude', '--help']
      const copy = [...original]
      parseCliArgs(original)
      expect(original).toEqual(copy)
    })

    it('should handle empty string arguments', () => {
      const result = parseCliArgs([''])
      expect(result.unknownArgs).toEqual([''])
    })

    it('should handle whitespace-only arguments', () => {
      const result = parseCliArgs(['  '])
      expect(result.unknownArgs).toEqual(['  '])
    })
  })

  describe('edge cases for specific flags', () => {
    it('should throw for invalid --happy-starting-mode value', () => {
      expect(() => parseCliArgs(['--happy-starting-mode', 'invalid']))
        .toThrow('Invalid --happy-starting-mode value: "invalid". Must be one of: local, remote')
    })

    it('should throw for missing --happy-starting-mode value', () => {
      // When value is undefined (missing), zod validation fails
      expect(() => parseCliArgs(['--happy-starting-mode']))
        .toThrow()
    })

    it('should throw for missing --started-by value', () => {
      expect(() => parseCliArgs(['--started-by']))
        .toThrow()
    })

    it('should handle short version flag -v', () => {
      const result = parseCliArgs(['-v'])
      expect(result.showVersion).toBe(true)
      expect(result.unknownArgs).toContain('-v')
    })

    it('should include both short help flag and pass through', () => {
      const result = parseCliArgs(['-h'])
      expect(result.showHelp).toBe(true)
      expect(result.unknownArgs.length).toBeGreaterThan(0)
      expect(result.unknownArgs).toContain('-h')
    })

    it('should handle verbose flag not being passed to claude', () => {
      const result = parseCliArgs(['--verbose', '--some-other-flag'])
      expect(result.verbose).toBe(true)
      expect(result.options.claudeArgs).toBeDefined()
      expect(result.options.claudeArgs).not.toContain('--verbose')
      expect(result.options.claudeArgs).toContain('--some-other-flag')
    })

    it('should create claudeArgs array only when there are unknown args', () => {
      const result = parseCliArgs(['--verbose'])
      expect(result.options.claudeArgs).toBeUndefined()
    })

    it('should properly merge unknown args into claudeArgs', () => {
      const result = parseCliArgs(['--model', 'test', '--temperature', '0.5'])
      expect(result.options.claudeArgs).toEqual(['--model', 'test', '--temperature', '0.5'])
    })

    it('should handle claude prefix with no other args', () => {
      const result = parseCliArgs(['claude'])
      expect(result.unknownArgs).toEqual([])
      expect(result.showHelp).toBe(false)
      expect(result.showVersion).toBe(false)
    })

    it('should handle yolo flag transformation exactly', () => {
      const result = parseCliArgs(['--yolo'])
      expect(result.unknownArgs.length).toBe(1)
      expect(result.unknownArgs[0]).toBe('--dangerously-skip-permissions')
    })
  })

  describe('parsing result structure', () => {
    it('should always return all expected properties', () => {
      const result = parseCliArgs([])

      // Verify structure exists
      expect(result).toHaveProperty('options')
      expect(result).toHaveProperty('showHelp')
      expect(result).toHaveProperty('showVersion')
      expect(result).toHaveProperty('verbose')
      expect(result).toHaveProperty('unknownArgs')

      // Verify types
      expect(typeof result.showHelp).toBe('boolean')
      expect(typeof result.showVersion).toBe('boolean')
      expect(typeof result.verbose).toBe('boolean')
      expect(Array.isArray(result.unknownArgs)).toBe(true)
    })

    it('should set startingMode in options when provided', () => {
      const result = parseCliArgs(['--happy-starting-mode', 'local'])
      expect(result.options.startingMode).toBe('local')
      expect(result.options.startingMode).not.toBe('remote')
    })

    it('should set startedBy in options when provided', () => {
      const result = parseCliArgs(['--started-by', 'daemon'])
      expect(result.options.startedBy).toBe('daemon')
      expect(result.options.startedBy).not.toBe('terminal')
    })
  })
})
