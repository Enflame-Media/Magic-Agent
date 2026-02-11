/**
 * Daemon-specific types (not related to API/server communication)
 */

import { Metadata } from '@/api/types';
import { ChildProcess } from 'child_process';
import type { DirResult } from 'tmp';

/**
 * Possible session status values returned by get-session-status RPC.
 *
 * - 'active': Session is currently running on this machine
 * - 'stopped': Session previously ran on this machine but has ended
 * - 'unknown': Session was never active on this machine (or history expired)
 *
 * @see HAP-642 - Original implementation (active/unknown only)
 * @see HAP-811 - Added 'stopped' status via historical tracking
 * @see stoppedSessionsHistory.ts - Persistence for stopped session tracking
 */
export type SessionStatus = 'active' | 'stopped' | 'unknown';

/**
 * Response from get-session-status RPC handler
 * @see HAP-642
 */
export interface GetSessionStatusResponse {
    status: SessionStatus;
    /** Session ID in UUID format (normalized) */
    sessionId: string;
    /** Human-readable message explaining the status */
    message?: string;
    /** Session metadata if available and active */
    metadata?: {
        startedBy: string;
        pid?: number;
    };
}

/**
 * Session tracking for daemon
 */
export interface TrackedSession {
  startedBy: 'daemon' | string;
  happySessionId?: string;
  happySessionMetadataFromLocalWebhook?: Metadata;
  pid: number;
  childProcess?: ChildProcess;
  error?: string;
  directoryCreated?: boolean;
  message?: string;
  /** Temporary directory created for Codex sessions (for auth.json storage). Cleaned up on session exit. */
  codexTempDir?: DirResult;
  /**
   * Working directory where the session was started.
   * Used for session revival to ensure the revived session uses the same directory.
   * @see HAP-740 - Track session working directory for revival
   */
  workingDirectory?: string;
}


/**
 * Configuration for rate limiting on the control server.
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed per time window. Default: 100 */
  maxRequests: number;
  /** Time window in milliseconds. Default: 60000 (1 minute) */
  windowMs: number;
}

/**
 * Internal state for the sliding window rate limiter.
 */
export interface RateLimiterState {
  /** Number of requests in the current window */
  count: number;
  /** Timestamp when the current window started */
  windowStart: number;
}

/**
 * Metrics tracking for rate limiting.
 */
export interface RateLimitMetrics {
  /** Total number of requests received */
  totalRequests: number;
  /** Number of requests that were rate limited */
  rateLimitedRequests: number;
  /** Number of times the rate limit window has reset */
  windowResets: number;
}
