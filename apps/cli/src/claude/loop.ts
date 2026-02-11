import { ApiSessionClient } from "@/api/apiSession"
import { MessageQueue2 } from "@/utils/MessageQueue2"
import { logger } from "@/ui/logger"
import { Session } from "./session"
import { claudeLocalLauncher } from "./claudeLocalLauncher"
import { claudeRemoteLauncher } from "./claudeRemoteLauncher"
import { ApiClient } from "@/lib"
import { addBreadcrumb, setTag, trackMetric } from "@/telemetry"

export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

/**
 * Result returned by launcher functions containing the exit reason and a Promise
 * that resolves when all cleanup operations are complete.
 *
 * HAP-948: This replaces the arbitrary 50ms delay with Promise-based completion,
 * ensuring mode change notifications only fire after cleanup is fully complete.
 */
export interface LauncherResult {
    /** The reason the launcher exited: 'switch' to change modes, 'exit' to terminate */
    reason: 'switch' | 'exit';
    /** Promise that resolves when all cleanup operations (finally blocks) have completed */
    cleanupComplete: Promise<void>;
}

export interface EnhancedMode {
    permissionMode: PermissionMode;
    model?: string;
    fallbackModel?: string;
    customSystemPrompt?: string;
    appendSystemPrompt?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
}

interface LoopOptions {
    path: string
    model?: string
    permissionMode?: PermissionMode
    startingMode?: 'local' | 'remote'
    onModeChange: (mode: 'local' | 'remote') => void
    mcpServers: Record<string, any>
    session: ApiSessionClient
    api: ApiClient,
    claudeEnvVars?: Record<string, string>
    claudeArgs?: string[]
    messageQueue: MessageQueue2<EnhancedMode>
    allowedTools?: string[]
    onSessionReady?: (session: Session) => void
}

/**
 * Handles post-launch mode switch operations: telemetry, cleanup, and notifications.
 *
 * @param session - The active session
 * @param fromMode - The mode being switched from
 * @param toMode - The mode being switched to
 * @param result - The launcher result containing cleanup promise
 * @param onModeChange - Optional callback to notify of mode changes
 */
async function handleModeSwitch(
    session: Session,
    fromMode: 'local' | 'remote',
    toMode: 'local' | 'remote',
    result: LauncherResult,
    onModeChange?: (mode: 'local' | 'remote') => void
): Promise<void> {
    // Track mode switch for debugging context (HAP-522)
    addBreadcrumb({ category: 'session', message: `Mode switch: ${fromMode} → ${toMode}`, level: 'info' })
    setTag('session.mode', toMode)

    // HAP-948: Wait for actual cleanup completion instead of arbitrary delay
    await result.cleanupComplete;

    if (onModeChange) {
        onModeChange(toMode);
    }

    // HAP-952: Send ready notification after mode switch completion
    // This allows mobile app to know CLI is ready to receive commands
    try {
        session.client.sendSessionEvent({ type: 'ready' }, `mode-switch-${toMode}`);
        logger.debug(`[loop] Sent ready event after mode switch to ${toMode}`);
    } catch (error) {
        // Non-fatal: log but don't fail the mode switch
        logger.debug('[loop] Failed to send ready event after mode switch:', error);
    }
}

export async function loop(opts: LoopOptions): Promise<void> {
    // Track session duration for performance monitoring (HAP-534)
    const sessionStart = Date.now()
    let modeChanges = 0

    // Get log path for debug display
    const logPath = logger.logFilePath;
    let session: Session | null = null;

    try {
        session = new Session({
            api: opts.api,
            client: opts.session,
            path: opts.path,
            sessionId: null,
            claudeEnvVars: opts.claudeEnvVars,
            claudeArgs: opts.claudeArgs,
            mcpServers: opts.mcpServers,
            logPath: logPath,
            messageQueue: opts.messageQueue,
            allowedTools: opts.allowedTools,
            onModeChange: opts.onModeChange
        });

        // Notify that session is ready
        if (opts.onSessionReady) {
            opts.onSessionReady(session);
        }

        // Track session creation for debugging context (HAP-522)
        addBreadcrumb({ category: 'session', message: 'Session created', level: 'info' })

        let mode: 'local' | 'remote' = opts.startingMode ?? 'local';
        setTag('session.mode', mode)
        while (true) {
            logger.debug(`[loop] Iteration with mode: ${mode}`);

            // Run local mode if applicable
            if (mode === 'local') {
                const result = await claudeLocalLauncher(session);
                if (result.reason === 'exit') { // Normal exit - Exit loop
                    return;
                }

                // Non "exit" reason means we need to switch to remote mode
                const fromMode = mode;
                mode = 'remote';
                modeChanges++

                await handleModeSwitch(session, fromMode, mode, result, opts.onModeChange);
                continue;
            }

            // Start remote mode
            if (mode === 'remote') {
                const result = await claudeRemoteLauncher(session);
                if (result.reason === 'exit') { // Normal exit - Exit loop
                    return;
                }

                // Non "exit" reason means we need to switch to local mode
                const fromMode = mode;
                mode = 'local';
                modeChanges++

                await handleModeSwitch(session, fromMode, mode, result, opts.onModeChange);
                continue;
            }
        }
    } finally {
        // Track session duration before cleanup (HAP-534)
        trackMetric('session_duration', Date.now() - sessionStart, {
            startingMode: opts.startingMode ?? 'local',
            modeChanges,
            agent: 'claude'
        })
        addBreadcrumb({ category: 'session', message: 'Session ended', level: 'info' })

        session?.destroy();
    }
}
