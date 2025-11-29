import { logger } from "@/ui/logger";
import { delay } from "@/utils/time";
import { watch } from "fs/promises";

/**
 * Type guard for Node.js system errors with error codes
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && 'code' in error && typeof (error as NodeJS.ErrnoException).code === 'string';
}

/**
 * Fatal error codes that should immediately stop the watcher without retrying
 */
const FATAL_ERROR_CODES = new Set(['ENOENT', 'EACCES', 'EISDIR', 'EINVAL']);

/** Options for configuring the file watcher behavior */
export interface FileWatcherOptions {
    /** Maximum consecutive errors before stopping the watcher. Default: 10 */
    maxConsecutiveErrors?: number;
}

/**
 * Starts a file watcher that monitors a file for changes and calls the callback on each change.
 *
 * The watcher will automatically restart on transient errors, but will stop if:
 * - A fatal error occurs (ENOENT, EACCES, EISDIR, EINVAL)
 * - Maximum consecutive errors is reached
 * - The abort function is called
 *
 * @param file - Path to the file to watch
 * @param onFileChange - Callback invoked when the file changes
 * @param options - Configuration options for the watcher
 * @returns Abort function to stop the watcher
 */
export function startFileWatcher(
    file: string,
    onFileChange: (file: string) => void,
    options: FileWatcherOptions = {}
): () => void {
    const abortController = new AbortController();
    const maxErrors = options.maxConsecutiveErrors ?? 10;
    let consecutiveErrors = 0;

    void (async (): Promise<void> => {
        while (consecutiveErrors < maxErrors) {
            try {
                logger.debug(`[FILE_WATCHER] Starting watcher for ${file}`);
                const watcher = watch(file, { persistent: true, signal: abortController.signal });
                for await (const event of watcher) {
                    if (abortController.signal.aborted) {
                        return;
                    }
                    // Reset error counter on successful event
                    consecutiveErrors = 0;
                    logger.debug(`[FILE_WATCHER] File changed: ${file}`);
                    onFileChange(file);
                }
            } catch (e: unknown) {
                // Always check abort signal first to avoid unnecessary error processing
                if (abortController.signal.aborted) {
                    return;
                }

                // Use type guard for safe error handling
                if (!isNodeError(e)) {
                    // Unknown error type - treat as fatal
                    logger.debug(`[FILE_WATCHER] Unknown error type for ${file}, stopping watcher: ${e}`);
                    return;
                }

                // Stop immediately on fatal errors - no point retrying
                if (FATAL_ERROR_CODES.has(e.code || '')) {
                    logger.debug(`[FILE_WATCHER] Fatal error (${e.code}): ${e.message} for ${file}, stopping watcher`);
                    return;
                }

                // Transient error - retry with backoff
                consecutiveErrors++;
                logger.debug(
                    `[FILE_WATCHER] Watch error (${e.code || 'unknown'}): ${e.message}, ` +
                    `attempt ${consecutiveErrors}/${maxErrors}, restarting in 1s`
                );

                // Delay with abort signal awareness
                await Promise.race([
                    delay(1000),
                    new Promise<void>((resolve) => {
                        if (abortController.signal.aborted) resolve();
                        else abortController.signal.addEventListener('abort', () => resolve(), { once: true });
                    })
                ]);

                // Check again after delay
                if (abortController.signal.aborted) {
                    return;
                }
            }
        }

        // Max errors reached
        logger.debug(
            `[FILE_WATCHER] Max consecutive errors (${maxErrors}) reached for ${file}, stopping watcher`
        );
    })();

    return () => {
        abortController.abort();
    };
}
