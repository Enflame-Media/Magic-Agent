import { isAuthError, is404Error } from '@/sync/apiHelper';
import { getCurrentAuth } from '@/auth/AuthContext';

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function exponentialBackoffDelay(currentFailureCount: number, minDelay: number, maxDelay: number, maxFailureCount: number) {
    let maxDelayRet = minDelay + ((maxDelay - minDelay) / maxFailureCount) * Math.max(currentFailureCount, maxFailureCount);
    return Math.round(Math.random() * maxDelayRet);
}

/**
 * Calculate exponential backoff delay for 404 errors.
 * Uses true exponential backoff: delay doubles each attempt.
 * Starts at 1s and caps at 30s per retry.
 */
export function calculate404BackoffDelay(attemptCount: number): number {
    const baseDelay = 1000; // Start at 1 second
    const maxDelay = 30000; // Cap at 30 seconds per retry
    const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
}

export type BackoffFunc = <T>(callback: () => Promise<T>) => Promise<T>;

/**
 * Handles authentication errors by triggering logout.
 * Called when a 401/TOKEN_EXPIRED error is detected during API calls.
 */
async function handleAuthError(error: unknown): Promise<void> {
    console.warn('[backoff] Auth error detected, triggering logout:', error);
    const auth = getCurrentAuth();
    if (auth) {
        try {
            await auth.logout();
        } catch (logoutError) {
            console.error('[backoff] Failed to logout:', logoutError);
        }
    }
}

/** Maximum time to retry 404 errors before giving up (2 minutes) */
const NOT_FOUND_TIMEOUT_MS = 2 * 60 * 1000;

export function createBackoff(
    opts?: {
        onError?: (e: any, failuresCount: number) => void,
        minDelay?: number,
        maxDelay?: number,
        maxFailureCount?: number
    }): BackoffFunc {
    return async <T>(callback: () => Promise<T>): Promise<T> => {
        let currentFailureCount = 0;
        const minDelay = opts && opts.minDelay !== undefined ? opts.minDelay : 250;
        const maxDelay = opts && opts.maxDelay !== undefined ? opts.maxDelay : 1000;
        const maxFailureCount = opts && opts.maxFailureCount !== undefined ? opts.maxFailureCount : 50;

        // Track 404 error state for timeout handling
        let notFoundStartTime: number | null = null;
        let notFoundAttemptCount = 0;

        while (true) {
            try {
                return await callback();
            } catch (e) {
                // Check for auth errors (401) - these should NOT be retried
                if (isAuthError(e)) {
                    handleAuthError(e);
                    throw e; // Rethrow to stop the sync and propagate the error
                }

                // Check for 404 errors - use exponential backoff with 2-minute timeout
                if (is404Error(e)) {
                    const now = Date.now();

                    // Initialize 404 tracking on first occurrence
                    if (notFoundStartTime === null) {
                        notFoundStartTime = now;
                        notFoundAttemptCount = 0;
                        console.warn('[backoff] 404 error detected, starting timed retry with exponential backoff');
                    }

                    // Check if we've exceeded the 2-minute timeout
                    const elapsed = now - notFoundStartTime;
                    if (elapsed >= NOT_FOUND_TIMEOUT_MS) {
                        console.warn(`[backoff] 404 timeout reached after ${Math.round(elapsed / 1000)}s and ${notFoundAttemptCount} attempts, giving up`);
                        throw e; // Stop retrying and propagate the error
                    }

                    notFoundAttemptCount++;
                    const waitFor404 = calculate404BackoffDelay(notFoundAttemptCount);
                    const remainingTime = NOT_FOUND_TIMEOUT_MS - elapsed;

                    console.warn(`[backoff] 404 retry ${notFoundAttemptCount}: waiting ${Math.round(waitFor404 / 1000)}s (${Math.round(remainingTime / 1000)}s remaining)`);

                    if (opts && opts.onError) {
                        opts.onError(e, notFoundAttemptCount);
                    }

                    await delay(waitFor404);
                    continue;
                }

                // Regular error handling (non-auth, non-404) - infinite retry with standard backoff
                // Reset 404 tracking if we get a different error
                notFoundStartTime = null;
                notFoundAttemptCount = 0;

                if (currentFailureCount < maxFailureCount) {
                    currentFailureCount++;
                }
                if (opts && opts.onError) {
                    opts.onError(e, currentFailureCount);
                }
                let waitForRequest = exponentialBackoffDelay(currentFailureCount, minDelay, maxDelay, maxFailureCount);
                await delay(waitForRequest);
            }
        }
    };
}

export let backoff = createBackoff({ onError: (e) => { console.warn(e); } });