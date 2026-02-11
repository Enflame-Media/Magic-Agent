import { AppError, ErrorCodes } from '@/utils/errors';

export async function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const timeoutId = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });
}

export function exponentialBackoffDelay(currentFailureCount: number, minDelay: number, maxDelay: number, maxFailureCount: number) {
    let maxDelayRet = minDelay + ((maxDelay - minDelay) / maxFailureCount) * Math.min(currentFailureCount, maxFailureCount);
    return Math.round(Math.random() * maxDelayRet);
}

export type BackoffFunc = <T>(callback: () => Promise<T>, signal?: AbortSignal) => Promise<T>;

export function createBackoff(opts?: {
    onError?: (e: any, failuresCount: number) => void | boolean,
    minDelay?: number,
    maxDelay?: number,
    maxFailureCount?: number,
    maxElapsedTime?: number
}): BackoffFunc {
    return async <T>(callback: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
        const minDelay = opts?.minDelay ?? 250;
        const maxDelay = opts?.maxDelay ?? 1000;
        const maxFailureCount = opts?.maxFailureCount ?? 50;
        const maxElapsedTime = opts?.maxElapsedTime ?? 300000; // 5 minutes default

        const startTime = Date.now();
        let currentFailureCount = 0;
        let lastError: any;

        while (currentFailureCount < maxFailureCount) {
            if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }

            // Check elapsed time before attempting
            const elapsed = Date.now() - startTime;
            if (elapsed >= maxElapsedTime) {
                throw new AppError(ErrorCodes.PROCESS_TIMEOUT, `Backoff timeout after ${currentFailureCount} attempts (${elapsed}ms elapsed). Last error: ${lastError}`);
            }

            try {
                return await callback();
            } catch (e) {
                lastError = e;

                if (e instanceof DOMException && e.name === 'AbortError') {
                    throw e;
                }

                currentFailureCount++;

                // Allow onError to cancel retries by returning false
                if (opts?.onError) {
                    const result = opts.onError(e, currentFailureCount);
                    if (result === false) {
                        throw e;
                    }
                }

                const waitFor = exponentialBackoffDelay(currentFailureCount, minDelay, maxDelay, maxFailureCount);
                await delay(waitFor, signal);
            }
        }

        // Max retries exceeded
        throw new AppError(ErrorCodes.OPERATION_FAILED, `Backoff failed after ${maxFailureCount} attempts. Last error: ${lastError}`);
    };
}

export let backoff = createBackoff();