/**
 * Stopped Sessions History
 *
 * Tracks sessions that have stopped to enable the daemon to return 'stopped'
 * status instead of 'unknown' for sessions that previously ran on this machine.
 *
 * @see HAP-811 - Track stopped sessions in CLI daemon status
 *
 * Design:
 * - Persists minimal session data (ID, stopped timestamp) to filesystem
 * - Uses TTL-based cleanup to prevent unbounded disk usage
 * - Stores only session IDs (not sensitive data per requirements)
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, renameSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { configuration } from '@/configuration'
import { logger } from '@/ui/logger'
import * as z from 'zod'

/**
 * Default TTL for stopped session entries: 24 hours
 * After this period, entries are cleaned up to prevent unbounded disk usage.
 */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Maximum number of entries to store (safety limit)
 * Oldest entries are pruned if this limit is exceeded.
 */
const MAX_ENTRIES = 1000

/**
 * Schema for a single stopped session entry
 */
const StoppedSessionEntrySchema = z.object({
  /** Session ID in UUID format (normalized) */
  sessionId: z.string(),
  /** Unix timestamp when the session stopped */
  stoppedAt: z.number(),
})

type StoppedSessionEntry = z.infer<typeof StoppedSessionEntrySchema>

/**
 * Schema for the persisted history file
 */
const StoppedSessionsHistorySchema = z.object({
  version: z.literal(1),
  entries: z.array(StoppedSessionEntrySchema),
})

type StoppedSessionsHistoryData = z.infer<typeof StoppedSessionsHistorySchema>

/**
 * Get the path to the stopped sessions history file
 */
function getHistoryFilePath(): string {
  return join(configuration.happyHomeDir, 'stopped-sessions.json')
}

/**
 * Atomically write content to a file using temp file + rename pattern.
 * Ensures the target file is never left in a corrupted state.
 */
function atomicWriteFileSync(filePath: string, content: string): void {
  const tempPath = `${filePath}.${randomUUID()}.tmp`
  try {
    writeFileSync(tempPath, content, 'utf-8')
    renameSync(tempPath, filePath)
  } catch (error) {
    // Clean up temp file on error
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

/**
 * Read the stopped sessions history from disk.
 * Returns empty data if file doesn't exist or is corrupted.
 */
function readHistory(): StoppedSessionsHistoryData {
  const filePath = getHistoryFilePath()

  if (!existsSync(filePath)) {
    return { version: 1, entries: [] }
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(content)
    const validated = StoppedSessionsHistorySchema.safeParse(parsed)

    if (!validated.success) {
      logger.debug(`[STOPPED SESSIONS] History file validation failed: ${validated.error.message}`)
      // Return empty data, don't delete the file (could be a schema upgrade scenario)
      return { version: 1, entries: [] }
    }

    return validated.data
  } catch (error) {
    logger.debug(`[STOPPED SESSIONS] Failed to read history file:`, error)
    return { version: 1, entries: [] }
  }
}

/**
 * Write the stopped sessions history to disk.
 */
function writeHistory(data: StoppedSessionsHistoryData): void {
  const filePath = getHistoryFilePath()

  try {
    atomicWriteFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (error) {
    logger.debug(`[STOPPED SESSIONS] Failed to write history file:`, error)
    // Non-fatal - feature degrades to 'unknown' status
  }
}

/**
 * Record a session as stopped.
 * Called when a session process exits.
 *
 * @param sessionId - The session ID in UUID format (normalized)
 */
export function recordStoppedSession(sessionId: string): void {
  logger.debug(`[STOPPED SESSIONS] Recording stopped session: ${sessionId}`)

  const history = readHistory()

  // Remove any existing entry for this session (in case of restart/re-stop)
  const filteredEntries = history.entries.filter(
    entry => entry.sessionId.toLowerCase() !== sessionId.toLowerCase()
  )

  // Add the new entry
  const newEntry: StoppedSessionEntry = {
    sessionId,
    stoppedAt: Date.now(),
  }

  filteredEntries.push(newEntry)

  // Prune oldest entries if we exceed the limit
  let finalEntries = filteredEntries
  if (finalEntries.length > MAX_ENTRIES) {
    // Sort by stoppedAt descending and keep only MAX_ENTRIES
    finalEntries = finalEntries
      .sort((a, b) => b.stoppedAt - a.stoppedAt)
      .slice(0, MAX_ENTRIES)
    logger.debug(`[STOPPED SESSIONS] Pruned ${filteredEntries.length - MAX_ENTRIES} oldest entries (exceeded max ${MAX_ENTRIES})`)
  }

  writeHistory({ version: 1, entries: finalEntries })
  logger.debug(`[STOPPED SESSIONS] Recorded session ${sessionId}, total entries: ${finalEntries.length}`)
}

/**
 * Check if a session is in the stopped history.
 *
 * @param sessionId - The session ID to check (will be normalized for comparison)
 * @returns The stopped timestamp if found, undefined otherwise
 */
export function getStoppedSessionTimestamp(sessionId: string): number | undefined {
  const history = readHistory()
  const normalizedId = sessionId.toLowerCase()

  const entry = history.entries.find(
    entry => entry.sessionId.toLowerCase() === normalizedId
  )

  return entry?.stoppedAt
}

/**
 * Check if a session was stopped.
 *
 * @param sessionId - The session ID to check (will be normalized for comparison)
 * @returns true if the session is in the stopped history
 */
export function isSessionStopped(sessionId: string): boolean {
  return getStoppedSessionTimestamp(sessionId) !== undefined
}

/**
 * Clean up expired entries based on TTL.
 * Should be called periodically (e.g., during daemon heartbeat).
 *
 * @param ttlMs - Time-to-live in milliseconds (defaults to 24 hours)
 * @returns Number of entries removed
 */
export function cleanupExpiredEntries(ttlMs: number = DEFAULT_TTL_MS): number {
  const history = readHistory()
  const now = Date.now()
  const cutoff = now - ttlMs

  const originalCount = history.entries.length
  const filteredEntries = history.entries.filter(entry => entry.stoppedAt > cutoff)
  const removedCount = originalCount - filteredEntries.length

  if (removedCount > 0) {
    writeHistory({ version: 1, entries: filteredEntries })
    logger.debug(`[STOPPED SESSIONS] Cleaned up ${removedCount} expired entries (TTL: ${ttlMs}ms)`)
  }

  return removedCount
}

/**
 * Get the count of tracked stopped sessions.
 * Useful for health/status endpoints.
 */
export function getStoppedSessionCount(): number {
  return readHistory().entries.length
}

/**
 * Clear all stopped session history.
 * Useful for testing or manual cleanup.
 */
export function clearStoppedSessionsHistory(): void {
  const filePath = getHistoryFilePath()
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath)
      logger.debug('[STOPPED SESSIONS] History cleared')
    } catch (error) {
      logger.debug('[STOPPED SESSIONS] Failed to clear history:', error)
    }
  }
}
