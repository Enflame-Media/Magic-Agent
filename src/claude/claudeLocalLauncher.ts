import { logger } from "@/ui/logger";
import { claudeLocal } from "./claudeLocal";
import { Session } from "./session";
import { Future } from "@/utils/future";
import { createSessionScanner } from "./utils/sessionScanner";
import { SocketDisconnectedError } from "@/api/socketUtils";
import { LauncherResult } from "./loop";

/**
 * Launches Claude in local (interactive terminal) mode.
 *
 * HAP-948: Returns a LauncherResult with a cleanupComplete Promise that resolves
 * when all cleanup operations (finally blocks) have completed. This allows the
 * caller to wait for actual cleanup completion instead of using arbitrary delays.
 *
 * @param session - The active session
 * @returns LauncherResult with reason and cleanupComplete promise
 */
export async function claudeLocalLauncher(session: Session): Promise<LauncherResult> {
    // HAP-948: Create a Future that resolves when the finally block completes
    const cleanupFuture = new Future<void>();

    // HAP-943: Handle session deletion event with race condition fix
    // Store abort promise so main loop can await it, preventing partial execution
    let sessionDeleted = false;
    let sessionDeletionAbortPromise: Promise<void> | null = null;
    const onSessionDeleted = (deletedSessionId: string) => {
        if (deletedSessionId === session.client.sessionId) {
            logger.warn('[local] Session was deleted/archived remotely - initiating abort');
            sessionDeleted = true;
            // Trigger abort and store promise for main loop to await
            if (!processAbortController.signal.aborted) {
                processAbortController.abort();
            }
            // Store promise so main loop can await completion
            sessionDeletionAbortPromise = exitFuture.promise;
        }
    };
    session.client.on('sessionDeleted', onSessionDeleted);

    // Create scanner
    const scanner = await createSessionScanner({
        sessionId: session.sessionId,
        workingDirectory: session.path,
        onMessage: (message) => {
            // Block SDK summary messages - we generate our own
            if (message.type !== 'summary') {
                try {
                    session.client.sendClaudeSessionMessage(message);
                } catch (error) {
                    if (error instanceof SocketDisconnectedError) {
                        logger.warn('[local] Socket disconnected - cannot send message');
                    } else {
                        throw error;
                    }
                }
            }
        }
    });
    
    // Register callback to notify scanner when session ID is found via hook
    // This is important for --continue/--resume where session ID is not known upfront
    // Fix #12: Add error handling to prevent scanner errors from crashing the session
    const scannerSessionCallback = (sessionId: string) => {
        try {
            scanner.onNewSession(sessionId);
        } catch (error) {
            logger.debug('[local] Error in scanner callback:', error);
            // Don't re-throw - scanner errors shouldn't crash the session
        }
    };
    session.addSessionFoundCallback(scannerSessionCallback);


    // Handle abort
    let exitReason: 'switch' | 'exit' | null = null;
    const processAbortController = new AbortController();
    // Fix #9: Track whether handlers have been registered to avoid cleanup issues
    let handlersRegistered = false;
    let exitFuture = new Future<void>();
    try {
        async function abort() {

            // Send abort signal
            if (!processAbortController.signal.aborted) {
                processAbortController.abort();
            }

            // Await full exit
            await exitFuture.promise;
        }

        async function doAbort() {
            logger.debug('[local]: doAbort');

            // Switching to remote mode
            if (!exitReason) {
                exitReason = 'switch';
            }

            // Reset sent messages
            session.queue.reset();

            // Abort
            await abort();
        }

        async function doSwitch() {
            logger.debug('[local]: doSwitch');

            // Switching to remote mode
            if (!exitReason) {
                exitReason = 'switch';
            }

            // Abort
            await abort();
        }

        /**
         * HAP-943: Checks if the session was deleted and awaits any pending abort completion.
         * @returns true if session deletion was detected and handled, false otherwise
         */
        async function handleSessionDeletionIfNeeded(): Promise<boolean> {
            if (sessionDeleted) {
                if (sessionDeletionAbortPromise) {
                    await sessionDeletionAbortPromise;
                }
                return true;
            }
            return false;
        }

        // When to abort
        // Fix #9: Track registration state to ensure proper cleanup
        session.client.rpcHandlerManager.registerHandler('abort', doAbort); // Abort current process, clean queue and switch to remote mode
        session.client.rpcHandlerManager.registerHandler('switch', doSwitch); // When user wants to switch to remote mode
        handlersRegistered = true;
        session.queue.setOnMessage((_message: string, _mode) => {
            // Switch to remote mode when message received
            doSwitch().catch((error) => {
                logger.debug('[local]: doSwitch error', error);
            });
        }); // When any message is received, abort current process, clean queue and switch to remote mode

        // Exit if there are messages in the queue
        // HAP-948: Set exit reason instead of returning directly to ensure finally block runs
        if (session.queue.size() > 0) {
            exitReason = 'switch';
        }

        // HAP-943: Check if session was deleted and await abort completion
        if (!exitReason && await handleSessionDeletionIfNeeded()) {
            exitReason = 'exit';
        }

        // Handle session start
        const handleSessionStart = (sessionId: string) => {
            session.onSessionFound(sessionId);
            scanner.onNewSession(sessionId);
        }

        // Run local mode
        // HAP-948: Check exitReason before loop - may be set by early exit conditions above
        while (!exitReason) {
            // HAP-943: Check if session was deleted during operation and await abort completion
            if (await handleSessionDeletionIfNeeded()) {
                exitReason = 'exit';
                break;
            }

            // Launch
            logger.debug('[local]: launch');
            try {
                await claudeLocal({
                    path: session.path,
                    sessionId: session.sessionId,
                    onSessionFound: handleSessionStart,
                    onThinkingChange: session.onThinkingChange,
                    abort: processAbortController.signal,
                    claudeEnvVars: session.claudeEnvVars,
                    claudeArgs: session.claudeArgs,
                    mcpServers: session.mcpServers,
                    allowedTools: session.allowedTools,
                    hookSettingsPath: session.hookSettingsPath,
                });

                // Consume one-time Claude flags after spawn
                // For example we don't want to pass --resume flag after first spawn
                session.consumeOneTimeFlags();

                // Normal exit
                if (!exitReason) {
                    // HAP-943: Check if exit was due to session deletion and await abort
                    await handleSessionDeletionIfNeeded();
                    exitReason = 'exit';
                    break;
                }
            } catch (e) {
                logger.debug('[local]: launch error', e);
                if (!exitReason) {
                    // HAP-957: Check socket connection state before trying to send event
                    // If socket is already disconnected, we're shutting down - exit immediately
                    if (!session.client.connected) {
                        logger.warn('[local] Socket already disconnected - exiting instead of restarting');
                        exitReason = 'exit';
                        break;
                    }
                    try {
                        session.client.sendSessionEvent({ type: 'message', message: 'Process exited unexpectedly' });
                    } catch (sendError) {
                        if (sendError instanceof SocketDisconnectedError) {
                            // HAP-957: Socket disconnected means we're shutting down (e.g., killSession)
                            // Don't restart - exit the loop to avoid spawning a blank session
                            logger.warn('[local] Socket disconnected - exiting instead of restarting');
                            exitReason = 'exit';
                            break;
                        } else {
                            throw sendError;
                        }
                    }
                    continue;
                } else {
                    break;
                }
            }
            logger.debug('[local]: launch done');
        }
    } finally {

        // Resolve future
        exitFuture.resolve(undefined);

        // Fix #9: Only reset handlers if they were registered
        if (handlersRegistered) {
            session.client.rpcHandlerManager.registerHandler('abort', async () => { });
            session.client.rpcHandlerManager.registerHandler('switch', async () => { });
        }
        session.queue.setOnMessage(null);

        // Remove session found callback
        session.removeSessionFoundCallback(scannerSessionCallback);

        // HAP-943: Remove session deleted listener
        session.client.off('sessionDeleted', onSessionDeleted);

        // Cleanup
        await scanner.cleanup();

        // HAP-948: Resolve cleanup future after all cleanup operations complete
        cleanupFuture.resolve(undefined);
    }

    // HAP-948: Return LauncherResult with cleanup promise
    return {
        reason: exitReason || 'exit',
        cleanupComplete: cleanupFuture.promise
    };
}