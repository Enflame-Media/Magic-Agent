/**
 * useBulkSessionRestore - Bulk restore logic for multiple archived sessions
 *
 * Handles batch restoration of archived Claude sessions with:
 * - Rate limiting (max 3 concurrent operations)
 * - Progress tracking with real-time updates
 * - Partial failure support (some succeed, some fail)
 * - Cancellation support
 *
 * Uses the existing machineSpawnNewSession with sessionId to resume sessions.
 * Only Claude sessions support restore (Codex doesn't have --resume).
 *
 * @example
 * const { restore, progress, isRestoring, cancel } = useBulkSessionRestore();
 * await restore(sessions); // Sessions to restore
 */
import * as React from 'react';
import { machineSpawnNewSession, SpawnSessionResult, isTemporaryPidSessionId, pollForRealSession } from '@/sync/ops';
import { Session } from '@/sync/storageTypes';
import { useAllMachines, storage } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { t } from '@/text';
import { trackSessionRestoreStarted, trackSessionRestoreCompleted } from '@/track';
import { AppError, ErrorCodes } from '@/utils/errors';
import { Toast } from '@/toast';

/** Maximum concurrent restore operations to avoid overwhelming the server */
const MAX_CONCURRENT = 3;

/**
 * HAP-659: Extended timeout for individual restore operation
 *
 * Changed from 30s to 60s because:
 * - Restore operations can take longer on slow networks
 * - The CLI needs to spawn a new Claude session with --resume flag
 * - Timeout errors create confusion when restore actually succeeded
 */
const RESTORE_TIMEOUT = 60000;

export interface RestoreResult {
    sessionId: string;
    sessionName: string;
    success: boolean;
    newSessionId?: string;
    error?: string;
    /**
     * HAP-659: Indicates the operation timed out but may have succeeded
     * When true, users should check if the session was restored after refresh
     */
    timedOut?: boolean;
    /**
     * HAP-748: Indicates SESSION_REVIVAL_FAILED error occurred
     * When true, the session couldn't be revived because it had stopped unexpectedly
     */
    revivalFailed?: boolean;
}

export interface BulkRestoreProgress {
    /** Total number of sessions to restore */
    total: number;
    /** Number of sessions processed so far */
    completed: number;
    /** Number of successful restores */
    succeeded: number;
    /** Number of failed restores */
    failed: number;
    /** HAP-659: Number of timed out restores (may have succeeded) */
    timedOut: number;
    /** HAP-748: Number of revival failures (session stopped unexpectedly) */
    revivalFailed: number;
    /** Currently processing session name (for display) */
    currentSession?: string;
    /** Whether the operation was cancelled */
    cancelled: boolean;
    /** All results (populated as they complete) */
    results: RestoreResult[];
}

export interface UseBulkSessionRestoreReturn {
    /** Execute bulk restore on the given sessions */
    restore: (sessions: Session[]) => Promise<RestoreResult[]>;
    /** Current progress state */
    progress: BulkRestoreProgress | null;
    /** Whether a restore operation is in progress */
    isRestoring: boolean;
    /** Cancel the current restore operation */
    cancel: () => void;
    /** Reset progress state */
    reset: () => void;
}

/**
 * Gets a display name for a session
 */
function getSessionDisplayName(session: Session): string {
    return session.metadata?.path?.split('/').pop() || session.id.slice(0, 8);
}

/**
 * Creates a promise that rejects after the specified timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), ms)
        ),
    ]);
}

export function useBulkSessionRestore(): UseBulkSessionRestoreReturn {
    const machines = useAllMachines();
    const [progress, setProgress] = React.useState<BulkRestoreProgress | null>(null);
    const [isRestoring, setIsRestoring] = React.useState(false);
    const cancelledRef = React.useRef(false);

    const cancel = React.useCallback(() => {
        cancelledRef.current = true;
        setProgress(prev => prev ? { ...prev, cancelled: true } : null);
    }, []);

    const reset = React.useCallback(() => {
        setProgress(null);
        setIsRestoring(false);
        cancelledRef.current = false;
    }, []);

    const restore = React.useCallback(async (sessions: Session[]): Promise<RestoreResult[]> => {
        if (sessions.length === 0) return [];

        cancelledRef.current = false;
        setIsRestoring(true);

        // Initialize progress
        const initialProgress: BulkRestoreProgress = {
            total: sessions.length,
            completed: 0,
            succeeded: 0,
            failed: 0,
            timedOut: 0,
            revivalFailed: 0,
            currentSession: getSessionDisplayName(sessions[0]),
            cancelled: false,
            results: [],
        };
        setProgress(initialProgress);

        const results: RestoreResult[] = [];

        // Process sessions in batches to limit concurrency
        for (let i = 0; i < sessions.length; i += MAX_CONCURRENT) {
            if (cancelledRef.current) break;

            const batch = sessions.slice(i, i + MAX_CONCURRENT);

            // Process batch concurrently
            const batchPromises = batch.map(async (session): Promise<RestoreResult> => {
                const sessionName = getSessionDisplayName(session);

                // Update current session being processed
                setProgress(prev => prev ? {
                    ...prev,
                    currentSession: sessionName,
                } : null);

                // Check if cancelled
                if (cancelledRef.current) {
                    return {
                        sessionId: session.id,
                        sessionName,
                        success: false,
                        error: t('bulkRestore.cancelledByUser'),
                    };
                }

                // Validate session can be restored
                const isClaudeSession = !session.metadata?.flavor || session.metadata.flavor === 'claude';
                if (!isClaudeSession) {
                    return {
                        sessionId: session.id,
                        sessionName,
                        success: false,
                        error: t('sessionHistory.resumeClaudeOnly'),
                    };
                }

                if (!session.metadata?.machineId || !session.metadata?.path) {
                    return {
                        sessionId: session.id,
                        sessionName,
                        success: false,
                        error: t('sessionInfo.failedToRestoreSession'),
                    };
                }

                // Check machine is online
                const machine = machines.find(m => m.id === session.metadata?.machineId);
                if (!machine || !isMachineOnline(machine)) {
                    return {
                        sessionId: session.id,
                        sessionName,
                        success: false,
                        error: t('sessionInfo.restoreRequiresMachine'),
                    };
                }

                // HAP-584: Capture spawn time BEFORE RPC call for optimistic polling fallback
                // HAP-688: Also used for telemetry duration tracking
                const spawnStartTime = Date.now();
                const machineId = session.metadata.machineId;

                // HAP-688: Track restore started (fire-and-forget, non-blocking)
                trackSessionRestoreStarted({
                    sessionId: session.id,
                    machineId,
                });

                // HAP-688: Helper to track completion and return result
                const completeWithTracking = (restoreResult: RestoreResult): RestoreResult => {
                    const durationMs = Date.now() - spawnStartTime;
                    trackSessionRestoreCompleted({
                        sessionId: session.id,
                        machineId,
                        success: restoreResult.success,
                        timedOut: restoreResult.timedOut ?? false,
                        durationMs,
                        newSessionId: restoreResult.newSessionId,
                    });
                    return restoreResult;
                };

                try {
                    // Attempt restore with timeout
                    const result = await withTimeout<SpawnSessionResult>(
                        machineSpawnNewSession({
                            machineId,
                            directory: session.metadata.path,
                            agent: 'claude',
                            sessionId: session.id,
                        }),
                        RESTORE_TIMEOUT,
                        t('newSession.sessionTimeout')
                    );

                    if (result.type === 'success') {
                        let newSessionId: string | null = result.sessionId;

                        // HAP-488: Check for temporary PID-based session ID
                        if (isTemporaryPidSessionId(result.sessionId)) {
                            // HAP-584: Use pre-captured spawnStartTime for polling
                            const realSessionId = await pollForRealSession(
                                machineId,
                                spawnStartTime,
                                { interval: 5000, maxAttempts: 24 }
                            );

                            if (!realSessionId) {
                                return completeWithTracking({
                                    sessionId: session.id,
                                    sessionName,
                                    success: false,
                                    error: t('newSession.sessionStartFailed'),
                                });
                            }

                            newSessionId = realSessionId;
                        } else if (!newSessionId) {
                            // HAP-584: Optimistic polling fallback
                            // The RPC may have timed out even though the session was created successfully.
                            const polledSessionId = await pollForRealSession(
                                machineId,
                                spawnStartTime,
                                { interval: 3000, maxAttempts: 10 }
                            );

                            if (!polledSessionId) {
                                return completeWithTracking({
                                    sessionId: session.id,
                                    sessionName,
                                    success: false,
                                    error: t('sessionInfo.failedToRestoreSession'),
                                });
                            }

                            newSessionId = polledSessionId;
                        }

                        // HAP-649: Mark the old session as superseded by the new session
                        storage.getState().markSessionAsSuperseded(session.id, newSessionId);

                        return completeWithTracking({
                            sessionId: session.id,
                            sessionName,
                            success: true,
                            newSessionId,
                        });
                    } else if (result.type === 'error') {
                        return completeWithTracking({
                            sessionId: session.id,
                            sessionName,
                            success: false,
                            error: result.errorMessage,
                        });
                    } else {
                        // requestToApproveDirectoryCreation - shouldn't happen for restore
                        return completeWithTracking({
                            sessionId: session.id,
                            sessionName,
                            success: false,
                            error: t('sessionInfo.failedToRestoreSession'),
                        });
                    }
                } catch (error) {
                    // HAP-659: Check if this was a timeout error
                    // Timeout errors are special - the restore may have succeeded even though we timed out
                    const isTimeoutError = error instanceof Error &&
                        error.message === t('newSession.sessionTimeout');

                    // HAP-748: Check for SESSION_REVIVAL_FAILED error
                    // These errors indicate the session stopped unexpectedly and couldn't be revived
                    const isRevivalFailed = AppError.isAppError(error) &&
                        error.code === ErrorCodes.SESSION_REVIVAL_FAILED;

                    return completeWithTracking({
                        sessionId: session.id,
                        sessionName,
                        success: false,
                        error: isTimeoutError
                            ? t('bulkRestore.timeoutWarning')
                            : (error instanceof Error ? error.message : t('errors.unknownError')),
                        timedOut: isTimeoutError,
                        revivalFailed: isRevivalFailed,
                    });
                }
            });

            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);

            // Update progress with batch results
            for (const result of batchResults) {
                results.push(result);
                setProgress(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        completed: prev.completed + 1,
                        succeeded: prev.succeeded + (result.success ? 1 : 0),
                        // HAP-659: Timed out errors are counted separately, not as failures
                        // HAP-748: Revival failures also counted separately
                        failed: prev.failed + (!result.success && !result.timedOut && !result.revivalFailed ? 1 : 0),
                        timedOut: prev.timedOut + (result.timedOut ? 1 : 0),
                        revivalFailed: prev.revivalFailed + (result.revivalFailed ? 1 : 0),
                        results: [...prev.results, result],
                    };
                });
            }
        }

        // Mark as complete
        setProgress(prev => prev ? {
            ...prev,
            currentSession: undefined,
        } : null);
        setIsRestoring(false);

        // HAP-748: Show notification if any sessions had revival failures
        // We show this after bulk operation completes to avoid interrupting the flow
        const revivalFailedCount = results.filter(r => r.revivalFailed).length;
        if (revivalFailedCount > 0) {
            Toast.show({
                message: t('bulkRestore.revivalIssues', { count: revivalFailedCount }),
                type: 'error',
                duration: 6000, // Slightly longer to ensure user sees it
            });
        }

        return results;
    }, [machines]);

    return {
        restore,
        progress,
        isRestoring,
        cancel,
        reset,
    };
}
