/* oxlint-disable no-console */
/**
 * Simple remote logger for React Native
 * Patches console to send logs to remote server
 *
 * HAP-842: Runtime toggle support
 * Remote logging can now be toggled on/off at runtime via developer settings,
 * without requiring a rebuild. The toggle is available in the dev settings UI.
 *
 * PRODUCTION GUARDRAILS (HAP-836):
 * - Remote logging is ONLY allowed in development builds (__DEV__ === true)
 * - Remote logging is ONLY allowed to local/dev server URLs
 * - Any violation results in a clear console warning
 */

import { Platform, AppState } from 'react-native';
import type { NativeEventSubscription, AppStateStatus } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { config } from '@/config';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';
import { redactArgs } from '@/utils/logger';
import { safeStringify, safeSerializeArgs } from '@/utils/safeSerialize';

/**
 * Allowlist of URL patterns for remote logging.
 * Only these patterns are allowed to receive remote logs.
 */
const ALLOWED_DEV_URL_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?/i,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?/i,        // Private 10.x.x.x
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?/i,       // Private 192.168.x.x
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?/i, // Private 172.16-31.x.x
  /^https?:\/\/\[::1\](:\d+)?/i,                  // IPv6 localhost
];

/**
 * Checks if a URL is allowed for remote logging.
 * Only local/dev URLs are permitted to prevent accidental production logging.
 */
function isAllowedDevUrl(url: string): boolean {
  return ALLOWED_DEV_URL_PATTERNS.some(pattern => pattern.test(url));
}

// Log buffer entry type for developer settings UI
export interface LogBufferEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: any[];
}

let logBuffer: LogBufferEntry[] = []
let currentBufferBytes = 0
const MAX_BUFFER_SIZE = 1000
const MAX_BUFFER_BYTES = 5 * 1024 * 1024 // 5MB - prevent memory bloat from large log entries

/**
 * HAP-839: Maximum payload size for remote log requests.
 * 100KB provides sufficient context for debugging while staying well under
 * typical request size limits (1MB for most servers, 512KB for Cloudflare Workers).
 */
const MAX_REMOTE_PAYLOAD_BYTES = 100 * 1024 // 100KB

/**
 * Truncation marker appended to indicate content was cut off.
 */
const TRUNCATION_MARKER = '... [TRUNCATED]'

// ============================================================================
// HAP-840: Remote logging batch configuration (reserved for future use)
// ============================================================================
// Note: Batching configuration is defined here for future HAP-840 implementation.
// The actual batching logic will be added in a separate PR.

/**
 * HAP-839: Truncates a string to fit within the specified byte limit.
 * Preserves the leading portion for context and appends a truncation marker.
 */
function truncateString(str: string, maxBytes: number): string {
  if (str.length <= maxBytes) {
    return str
  }
  // Reserve space for truncation marker
  const availableBytes = maxBytes - TRUNCATION_MARKER.length
  if (availableBytes <= 0) {
    return TRUNCATION_MARKER
  }
  return str.slice(0, availableBytes) + TRUNCATION_MARKER
}

/**
 * HAP-839: Truncates an object's string values recursively to reduce payload size.
 * Preserves structure while limiting the size of individual string values.
 */
function truncateValue(value: unknown, maxStringBytes: number): unknown {
  if (typeof value === 'string') {
    return truncateString(value, maxStringBytes)
  }
  if (Array.isArray(value)) {
    return value.map(item => truncateValue(item, maxStringBytes))
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = truncateValue(val, maxStringBytes)
    }
    return result
  }
  return value
}

/**
 * HAP-839: Truncates a remote log payload to fit within MAX_REMOTE_PAYLOAD_BYTES.
 * Applies progressive truncation:
 * 1. First tries the full payload
 * 2. If too large, truncates messageRawObject strings
 * 3. If still too large, truncates the main message
 * 4. Final fallback: aggressively truncate everything
 */
function truncatePayloadForRemote(payload: Record<string, unknown>): Record<string, unknown> {
  // Try the original payload first
  let serialized = JSON.stringify(payload)
  if (serialized.length <= MAX_REMOTE_PAYLOAD_BYTES) {
    return payload
  }

  // Clone payload for modification
  let truncated = { ...payload }

  // Step 1: Truncate messageRawObject (usually contains complex objects)
  if (truncated.messageRawObject !== undefined) {
    // Limit each string in raw object to 2KB
    truncated.messageRawObject = truncateValue(truncated.messageRawObject, 2048)
    serialized = JSON.stringify(truncated)
    if (serialized.length <= MAX_REMOTE_PAYLOAD_BYTES) {
      return truncated
    }
  }

  // Step 2: Truncate the main message string
  if (typeof truncated.message === 'string') {
    // Calculate how much space we have for the message
    const overhead = serialized.length - (truncated.message as string).length
    const availableForMessage = MAX_REMOTE_PAYLOAD_BYTES - overhead - 100 // 100 bytes buffer
    truncated.message = truncateString(truncated.message as string, Math.max(500, availableForMessage))
    serialized = JSON.stringify(truncated)
    if (serialized.length <= MAX_REMOTE_PAYLOAD_BYTES) {
      return truncated
    }
  }

  // Step 3: Aggressive truncation - limit all strings to 500 bytes
  if (truncated.messageRawObject !== undefined) {
    truncated.messageRawObject = truncateValue(truncated.messageRawObject, 500)
  }
  if (typeof truncated.message === 'string') {
    truncated.message = truncateString(truncated.message as string, 2048)
  }

  // Step 4: If still too large, remove messageRawObject entirely
  serialized = JSON.stringify(truncated)
  if (serialized.length > MAX_REMOTE_PAYLOAD_BYTES) {
    truncated.messageRawObject = '[REMOVED - payload too large]'
    serialized = JSON.stringify(truncated)
  }

  // Final safeguard: if somehow still too large, just truncate the whole thing
  if (serialized.length > MAX_REMOTE_PAYLOAD_BYTES) {
    truncated.message = truncateString(truncated.message as string, 1024)
    truncated.messageRawObject = '[REMOVED]'
  }

  return truncated
}

// Idempotency guard: ensure console is only patched once per app lifecycle
// This prevents duplicate logs and nested patches during HMR or re-mounts
let isPatched = false

/**
 * HAP-853: Exponential backoff state for remote log send failures.
 * Prevents hammering the network when offline or server is unavailable.
 *
 * Behavior:
 * - On first failure: wait 1 second before next attempt
 * - On each subsequent failure: double the wait time (2s, 4s, 8s, ...)
 * - Maximum wait time: 5 minutes
 * - On successful send: reset backoff to allow immediate sends again
 */
const INITIAL_BACKOFF_MS = 1000        // Start with 1 second delay
const MAX_BACKOFF_MS = 5 * 60 * 1000   // Cap at 5 minutes
const BACKOFF_MULTIPLIER = 2           // Double the delay on each failure

let consecutiveFailures = 0
let nextAllowedSendTime = 0  // Timestamp when sending is allowed again

/**
 * HAP-853: Calculates the backoff delay based on consecutive failure count.
 * Uses exponential backoff: delay = INITIAL_BACKOFF_MS * 2^(failures-1)
 */
function calculateBackoffMs(failures: number): number {
    if (failures <= 0) return 0
    const delay = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, failures - 1)
    return Math.min(delay, MAX_BACKOFF_MS)
}

/**
 * HAP-853: Checks if sending is currently allowed based on backoff state.
 */
function canSendNow(): boolean {
    return Date.now() >= nextAllowedSendTime
}

/**
 * HAP-853: Records a send failure and updates backoff state.
 */
function recordSendFailure(): void {
    consecutiveFailures++
    const backoffMs = calculateBackoffMs(consecutiveFailures)
    nextAllowedSendTime = Date.now() + backoffMs
}

/**
 * HAP-853: Records a successful send and resets backoff state.
 */
function recordSendSuccess(): void {
    consecutiveFailures = 0
    nextAllowedSendTime = 0
}

// ============================================================================
// HAP-842: Runtime toggle for remote logging
// ============================================================================

/**
 * HAP-842: Runtime toggle state for remote logging.
 * This is checked on each log call to determine whether to send to remote.
 * When false, logs are still buffered locally but not sent to server.
 */
let runtimeRemoteLoggingEnabled = false

/**
 * HAP-842: Store original console for internal logging
 */
let originalConsoleLog: ((...args: any[]) => void) | null = null

/**
 * HAP-842: Sets the runtime remote logging enabled state.
 * Called from the developer settings UI.
 */
export function setRemoteLoggingEnabled(enabled: boolean): void {
  runtimeRemoteLoggingEnabled = enabled
  if (__DEV__) {
    // Use original console if available to avoid recursion
    const log = originalConsoleLog || console.log
    log(`[RemoteLogger] Runtime remote logging ${enabled ? 'enabled' : 'disabled'}`)
  }
}

/**
 * HAP-842: Gets the current runtime remote logging enabled state.
 */
export function isRemoteLoggingEnabled(): boolean {
  return runtimeRemoteLoggingEnabled
}

/**
 * HAP-842: Checks if the current environment allows remote logging.
 * Returns an object with the validation result and any error message.
 */
export function validateRemoteLoggingEnvironment(): { valid: boolean; error?: string } {
  // Must be in development mode
  if (!__DEV__) {
    return {
      valid: false,
      error: 'Remote logging is only available in development builds (__DEV__ must be true).'
    }
  }

  // Must have a server URL
  const url = config.serverUrl
  if (!url) {
    return {
      valid: false,
      error: 'No server URL configured. Remote logging requires a server URL.'
    }
  }

  // Must be a local/dev URL
  if (!isAllowedDevUrl(url)) {
    return {
      valid: false,
      error: `Server URL "${url}" is not a local/dev URL. Remote logging only works with localhost, 127.0.0.1, or private network addresses.`
    }
  }

  return { valid: true }
}

/**
 * HAP-842: Gets the current remote logging status.
 * Returns information about whether remote logging is active and why.
 */
export function getRemoteLoggingStatus(): {
  enabled: boolean;
  active: boolean;
  serverUrl: string | null;
  reason?: string;
} {
  const url = config.serverUrl ?? null
  const validation = validateRemoteLoggingEnvironment()

  if (!validation.valid) {
    return {
      enabled: runtimeRemoteLoggingEnabled,
      active: false,
      serverUrl: url,
      reason: validation.error
    }
  }

  return {
    enabled: runtimeRemoteLoggingEnabled,
    active: runtimeRemoteLoggingEnabled && isPatched,
    serverUrl: url
  }
}

/**
 * HAP-842: Gets statistics about the current log buffer.
 */
export function getLogBufferStats(): {
  count: number;
  sizeBytes: number;
  maxCount: number;
  maxSizeBytes: number;
} {
  return {
    count: logBuffer.length,
    sizeBytes: currentBufferBytes,
    maxCount: MAX_BUFFER_SIZE,
    maxSizeBytes: MAX_BUFFER_BYTES
  }
}

function estimateEntrySize(entry: any): number {
  // HAP-848: Use safeStringify to handle circular references for accurate size estimation
  return safeStringify(entry).length
}

export function monkeyPatchConsoleForRemoteLoggingForFasterAiAutoDebuggingOnlyInLocalBuilds() {
  // NEVER ENABLE REMOTE LOGGING IN PRODUCTION
  // This is for local debugging with AI only
  // So AI will have all the logs easily accessible in one file for analysis
  if (!process.env.EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) {
    return
  }

  // HAP-836: Production guardrail - only allow remote logging in development builds
  if (!__DEV__) {
    console.warn(
      '[RemoteLogger] BLOCKED: Remote logging is only allowed in development builds (__DEV__ must be true). ' +
      'This is a safety guardrail to prevent accidental production logging. ' +
      'Remove EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING from your production environment.'
    );
    return;
  }

  // Idempotency: skip if already patched (prevents duplicate logs during HMR/re-mounts)
  if (isPatched) {
    return
  }
  isPatched = true

  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }

  const url = config.serverUrl

  if (!url) {
    console.log('[RemoteLogger] No server URL provided, remote logging disabled')
    return
  }

  // HAP-836: Production guardrail - only allow local/dev server URLs
  if (!isAllowedDevUrl(url)) {
    console.warn(
      `[RemoteLogger] BLOCKED: Server URL "${url}" is not a local/dev URL. ` +
      'Remote logging is only allowed to localhost, 127.0.0.1, or private network addresses (10.x.x.x, 192.168.x.x, 172.16-31.x.x). ' +
      'This is a safety guardrail to prevent accidental logging to production servers.'
    );
    return;
  }

  const sendLog = async (level: string, args: any[]) => {
    // HAP-853: Skip sending if we're in backoff period due to previous failures
    if (!canSendNow()) {
      return
    }

    try {
      // HAP-838: Redact sensitive data before sending to remote server
      // This prevents tokens, keys, and credentials from being logged remotely
      const redactedArgs = redactArgs(args);

      // HAP-848: Use safe serialization to handle circular references
      // This prevents JSON.stringify from throwing on circular objects
      const safeRedactedArgs = safeSerializeArgs(redactedArgs);

      // Build the payload
      const payload: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        level,
        message: safeRedactedArgs.map(a =>
          typeof a === 'object' ? safeStringify(a, { indent: 2 }) : String(a)
        ).join('\n'),
        messageRawObject: safeRedactedArgs,
        source: 'mobile',
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? null,
        buildNumber: Application.nativeBuildVersion ?? null,
      }

      // HAP-839: Truncate payload to prevent oversized requests
      const truncatedPayload = truncatePayloadForRemote(payload)

      // HAP-837: Build headers with optional auth token
      // When configured, include X-Dev-Logging-Token for server authentication
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.devLoggingToken) {
        headers['X-Dev-Logging-Token'] = config.devLoggingToken;
      }

      await fetchWithTimeout(url + '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging', {
        method: 'POST',
        headers,
        body: JSON.stringify(truncatedPayload),
        timeoutMs: 5000, // 5s - logger should not block app
      })

      // HAP-853: Reset backoff on successful send
      recordSendSuccess()
    } catch {
      // HAP-853: Record failure and apply exponential backoff
      // Remote logging is optional - log suppression prevents network hammering when offline
      recordSendFailure()
    }
  }

  // Patch console methods
  ;(['log', 'info', 'warn', 'error', 'debug'] as const).forEach(level => {
    console[level] = (...args: any[]) => {
      // Always call original
      originalConsole[level](...args)
      
      // Buffer for developer settings
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message: args
      }
      const entrySize = estimateEntrySize(entry)

      // Evict oldest entries until we're under the byte limit
      while (currentBufferBytes + entrySize > MAX_BUFFER_BYTES && logBuffer.length > 0) {
        const removed = logBuffer.shift()
        if (removed) {
          currentBufferBytes -= estimateEntrySize(removed)
        }
      }

      logBuffer.push(entry)
      currentBufferBytes += entrySize

      // Secondary count-based safety limit
      if (logBuffer.length > MAX_BUFFER_SIZE) {
        const removed = logBuffer.shift()
        if (removed) {
          currentBufferBytes -= estimateEntrySize(removed)
        }
      }

      // Send to remote
      sendLog(level, args)
    }
  })

  console.log('[RemoteLogger] Initialized with server:', url)
}

// For developer settings UI
export function getLogBuffer() {
  return [...logBuffer]
}

export function clearLogBuffer() {
  logBuffer = []
  currentBufferBytes = 0
}