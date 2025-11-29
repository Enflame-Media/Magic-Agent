/**
 * Memory pressure monitoring for daemon long-running sessions.
 *
 * Tracks heap memory usage periodically and triggers cleanup actions
 * when memory usage exceeds configurable thresholds. This helps prevent
 * OOM conditions on resource-constrained systems during long daemon sessions.
 *
 * Key features:
 * - Configurable memory threshold via HAPPY_MEMORY_THRESHOLD_MB env var
 * - Periodic monitoring at configurable intervals
 * - GC hints when available (Node.js --expose-gc flag)
 * - Callback-based cache clearing for modular cleanup
 */

import { memoryUsage } from 'process'
import * as os from 'os'
import { logger } from '@/ui/logger'
import { validatePositiveInteger } from '@/utils/validators'

/**
 * Default memory threshold in MB.
 * Dynamically set to 25% of total system memory, but never less than 1024MB (1GB).
 * When heap usage exceeds this, cleanup actions are triggered.
 */
const DEFAULT_MEMORY_THRESHOLD_MB = Math.max(1024, Math.floor(os.totalmem() / (4 * 1024 * 1024)))
const MB_TO_BYTES = 1024 * 1024

/**
 * Minimum time between GC hints (60 seconds).
 * Prevents excessive GC hints which could degrade performance.
 */
const GC_HINT_COOLDOWN_MS = 60_000

/**
 * Default interval between memory checks (30 seconds).
 */
const DEFAULT_CHECK_INTERVAL_MS = 30_000

/**
 * Configuration for memory monitoring.
 */
export interface MemoryMonitorConfig {
  /**
   * Memory threshold in bytes. When heapUsed exceeds this, cleanup is triggered.
   * Default: 512MB (configurable via HAPPY_MEMORY_THRESHOLD_MB)
   */
  thresholdBytes: number

  /**
   * Interval between memory checks in milliseconds.
   * Default: 30000 (30 seconds)
   */
  checkIntervalMs: number

  /**
   * Callbacks to clear various caches when memory pressure is detected.
   * Each callback should clear non-essential cached data.
   */
  onMemoryPressure?: () => void
}

/**
 * Memory statistics returned by getMemoryStats.
 */
export interface MemoryStats {
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
  heapUsedMB: number
  thresholdMB: number
  percentOfThreshold: number
}

/**
 * Result of starting memory monitoring.
 */
export interface MemoryMonitorHandle {
  /**
   * Stop the memory monitor and clean up the interval.
   */
  stop: () => void

  /**
   * Get current memory statistics.
   */
  getStats: () => MemoryStats

  /**
   * Force a memory pressure check (useful for testing).
   */
  checkNow: () => void
}

// Track last GC hint time to prevent excessive hints
let lastGCHintTime = 0

/**
 * Parse memory threshold from environment variable.
 * Returns threshold in bytes.
 */
export function getMemoryThresholdBytes(): number {
  const thresholdMB = validatePositiveInteger(
    process.env.HAPPY_MEMORY_THRESHOLD_MB,
    'HAPPY_MEMORY_THRESHOLD_MB',
    {
      defaultValue: DEFAULT_MEMORY_THRESHOLD_MB,
      min: 64,  // Minimum 64MB to prevent overly aggressive cleanup
      max: 8192 // Maximum 8GB - beyond this, other issues are likely
    }
  )
  return thresholdMB * MB_TO_BYTES
}

/**
 * Parse memory check interval from environment variable.
 * Returns interval in milliseconds.
 */
export function getMemoryCheckIntervalMs(): number {
  return validatePositiveInteger(
    process.env.HAPPY_MEMORY_CHECK_INTERVAL_MS,
    'HAPPY_MEMORY_CHECK_INTERVAL_MS',
    {
      defaultValue: DEFAULT_CHECK_INTERVAL_MS,
      min: 5000,   // Minimum 5 seconds
      max: 300_000 // Maximum 5 minutes
    }
  )
}

/**
 * Get current memory statistics.
 */
export function getMemoryStats(thresholdBytes: number): MemoryStats {
  const mem = memoryUsage()
  const heapUsedMB = mem.heapUsed / MB_TO_BYTES
  const thresholdMB = thresholdBytes / MB_TO_BYTES

  return {
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    rss: mem.rss,
    heapUsedMB: Math.round(heapUsedMB * 100) / 100,
    thresholdMB,
    percentOfThreshold: Math.round((mem.heapUsed / thresholdBytes) * 100)
  }
}

/**
 * Attempt to hint to the garbage collector.
 * Only works if Node.js was started with --expose-gc flag.
 * Respects cooldown period to prevent excessive GC.
 *
 * @returns true if GC was hinted, false if on cooldown or unavailable
 */
function hintGarbageCollection(): boolean {
  const now = Date.now()

  // Check cooldown
  if (now - lastGCHintTime < GC_HINT_COOLDOWN_MS) {
    return false
  }

  // Try to hint GC if available
  // global.gc is only defined when Node runs with --expose-gc
  const gc = (global as unknown as { gc?: () => void }).gc
  if (gc) {
    gc()
    lastGCHintTime = now
    logger.debug('[MEMORY MONITOR] GC hint executed')
    return true
  }

  return false
}

/**
 * Check memory pressure and take action if threshold exceeded.
 *
 * @param config Memory monitor configuration
 * @returns true if memory pressure was detected and handled
 */
function checkMemoryPressure(config: MemoryMonitorConfig): boolean {
  const stats = getMemoryStats(config.thresholdBytes)

  if (stats.heapUsed > config.thresholdBytes) {
    logger.warn(
      `[MEMORY MONITOR] Memory pressure detected: ${stats.heapUsedMB}MB used ` +
      `(${stats.percentOfThreshold}% of ${stats.thresholdMB}MB threshold)`
    )

    // Hint GC if available
    hintGarbageCollection()

    // Call cleanup callback if provided
    if (config.onMemoryPressure) {
      logger.debug('[MEMORY MONITOR] Clearing non-essential caches')
      config.onMemoryPressure()
    }

    return true
  }

  // Log periodic memory stats in debug mode
  if (process.env.DEBUG) {
    logger.debug(
      `[MEMORY MONITOR] Memory OK: ${stats.heapUsedMB}MB used ` +
      `(${stats.percentOfThreshold}% of ${stats.thresholdMB}MB threshold)`
    )
  }

  return false
}

/**
 * Start memory pressure monitoring.
 *
 * @param config Configuration options
 * @returns Handle to stop monitoring and get stats
 */
export function startMemoryMonitor(config: MemoryMonitorConfig): MemoryMonitorHandle {
  logger.debug(
    `[MEMORY MONITOR] Starting with threshold=${config.thresholdBytes / MB_TO_BYTES}MB, ` +
    `interval=${config.checkIntervalMs}ms`
  )

  // Initial check
  checkMemoryPressure(config)

  // Set up periodic monitoring
  const intervalId = setInterval(() => {
    checkMemoryPressure(config)
  }, config.checkIntervalMs)

  return {
    stop: () => {
      clearInterval(intervalId)
      logger.debug('[MEMORY MONITOR] Stopped')
    },
    getStats: () => getMemoryStats(config.thresholdBytes),
    checkNow: () => checkMemoryPressure(config)
  }
}

/**
 * Create a default memory monitor with environment-based configuration.
 *
 * @param onMemoryPressure Optional callback for cache clearing
 * @returns Memory monitor handle
 */
export function createDefaultMemoryMonitor(
  onMemoryPressure?: () => void
): MemoryMonitorHandle {
  return startMemoryMonitor({
    thresholdBytes: getMemoryThresholdBytes(),
    checkIntervalMs: getMemoryCheckIntervalMs(),
    onMemoryPressure
  })
}
