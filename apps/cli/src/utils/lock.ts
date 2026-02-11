import { AppError, ErrorCodes } from '@/utils/errors';

/**
 * Custom error thrown when lock acquisition times out.
 */
export class LockTimeoutError extends Error {
    constructor(message: string = 'Lock acquisition timeout') {
        super(message);
        this.name = 'LockTimeoutError';
        Error.captureStackTrace(this, this.constructor);
    }
}

export class AsyncLock {
    private permits: number = 1;
    private promiseResolverQueue: Array<(v: boolean) => void> = [];

    /**
     * Execute a function while holding the lock.
     * @param func - The function to execute
     * @param timeout - Optional timeout in milliseconds for lock acquisition. If not provided, waits indefinitely.
     * @throws {LockTimeoutError} If timeout is specified and lock cannot be acquired within the timeout period.
     */
    async inLock<T>(func: () => Promise<T> | T, timeout?: number): Promise<T> {
        const lockAcquired = await this.lock(timeout);
        if (!lockAcquired) {
            throw new LockTimeoutError();
        }
        try {
            return await func();
        } finally {
            this.unlock();
        }
    }

    /**
     * Acquire the lock with optional timeout.
     * @param timeout - Optional timeout in milliseconds. If undefined or <= 0, waits indefinitely.
     * @returns true if lock was acquired, false if timed out
     */
    private async lock(timeout?: number): Promise<boolean> {
        if (this.permits > 0) {
            this.permits -= 1;
            return true;
        }

        return new Promise<boolean>(resolve => {
            let timeoutId: NodeJS.Timeout | undefined;
            let resolved = false;

            const resolver = (v: boolean) => {
                if (resolved) return;
                resolved = true;
                if (timeoutId !== undefined) {
                    clearTimeout(timeoutId);
                    timeoutId = undefined;
                }
                resolve(v);
            };

            this.promiseResolverQueue.push(resolver);

            if (timeout !== undefined && timeout > 0) {
                timeoutId = setTimeout(() => {
                    if (resolved) return;
                    resolved = true;
                    // Remove resolver from queue to prevent memory leak
                    const index = this.promiseResolverQueue.indexOf(resolver);
                    if (index !== -1) {
                        this.promiseResolverQueue.splice(index, 1);
                    }
                    // Clear the timeout reference
                    timeoutId = undefined;
                    resolve(false);
                }, timeout);
            }
        });
    }

    private unlock() {
        this.permits += 1;
        if (this.permits > 1 && this.promiseResolverQueue.length > 0) {
            throw new AppError(ErrorCodes.INTERNAL_ERROR, 'this.permits should never be > 0 when there is someone waiting.');
        } else if (this.permits === 1 && this.promiseResolverQueue.length > 0) {
            // If there is someone else waiting, immediately consume the permit that was released
            // at the beginning of this function and let the waiting function resume.
            this.permits -= 1;

            const nextResolver = this.promiseResolverQueue.shift();
            // Resolve on the next tick
            if (nextResolver) {
                setTimeout(() => {
                    nextResolver(true);
                }, 0);
            }
        }
    }
}
