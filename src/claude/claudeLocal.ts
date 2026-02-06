import { spawn, execSync } from "node:child_process";
import { resolve, join } from "node:path";
import { createInterface } from "node:readline";
import { mkdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { logger } from "@/ui/logger";
import { claudeCheckSession } from "./utils/claudeCheckSession";
import { getProjectPath } from "./utils/path";
import { projectPath } from "@/projectPath";
import { systemPrompt } from "./utils/systemPrompt";
import { AppError, ErrorCodes } from "@/utils/errors";


// Get Claude CLI path from project root
export const claudeCliPath = resolve(join(projectPath(), 'scripts', 'claude_local_launcher.cjs'))

export async function claudeLocal(opts: {
    abort: AbortSignal,
    sessionId: string | null,
    mcpServers?: Record<string, unknown>,
    path: string,
    onSessionFound: (id: string) => void,
    onThinkingChange?: (thinking: boolean) => void,
    claudeEnvVars?: Record<string, string>,
    claudeArgs?: string[],
    allowedTools?: string[],
    /** Path to temporary settings file with SessionStart hook (required for session tracking) */
    hookSettingsPath?: string
}): Promise<string> {

    // Ensure project directory exists
    const projectDir = getProjectPath(opts.path);
    mkdirSync(projectDir, { recursive: true });

    // Check if session is valid for resumption
    let startFrom = opts.sessionId;
    if (opts.sessionId && !claudeCheckSession(opts.sessionId, opts.path)) {
        startFrom = null;
    }

    // Generate a deterministic session ID upfront
    // This replaces the complex filesystem watcher + UUID interception approach
    const sessionId = startFrom || randomUUID();

    // Thinking state
    let thinking = false;
    let stopThinkingTimeout: NodeJS.Timeout | null = null;
    const updateThinking = (newThinking: boolean) => {
        if (thinking !== newThinking) {
            thinking = newThinking;
            logger.debug(`[ClaudeLocal] Thinking state changed to: ${thinking}`);
            if (opts.onThinkingChange) {
                opts.onThinkingChange(thinking);
            }
        }
    };

    // Notify session immediately since we know it upfront
    opts.onSessionFound(sessionId);

    // Spawn the process
    try {
        // Start the interactive process
        process.stdin.pause();
        await new Promise<void>((r, reject) => {
            const args: string[] = []
            if (startFrom) {
                args.push('--resume', startFrom)
            }
            args.push('--append-system-prompt', systemPrompt);

            if (opts.mcpServers && Object.keys(opts.mcpServers).length > 0) {
                args.push('--mcp-config', JSON.stringify({ mcpServers: opts.mcpServers }));
            }

            if (opts.allowedTools && opts.allowedTools.length > 0) {
                args.push('--allowedTools', opts.allowedTools.join(','));
            }

            // Add custom Claude arguments
            if (opts.claudeArgs) {
                args.push(...opts.claudeArgs)
            }

            if (!claudeCliPath || !existsSync(claudeCliPath)) {
                throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Claude local launcher not found. Please ensure HAPPY_PROJECT_ROOT is set correctly for development.');
            }

            // Prepare environment variables
            const env = {
                ...process.env,
                ...opts.claudeEnvVars
            }

            // Generate a unique tracking ID for process lifecycle management
            // Note: This is separate from the outer sessionId (UUID) used for Claude session identity
            const processTrackingId = `happy-session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

            const child = spawn('node', [claudeCliPath, ...args], {
                stdio: ['inherit', 'inherit', 'inherit', 'pipe'],
                cwd: opts.path,
                env: {
                    ...env,
                    HAPPY_SESSION_ID: processTrackingId  // Pass tracking ID for process cleanup
                }
            });

            logger.debug(`[ClaudeLocal] Child spawned with PID: ${child.pid}, tracking ID: ${processTrackingId}`);

            // Cleanup: Kill child process and any orphaned processes on abort
            opts.abort.addEventListener('abort', () => {
                logger.debug('[ClaudeLocal] Abort signal triggered - terminating Claude processes gracefully');

                const pid = child.pid;
                if (pid) {
                    try {
                        // First: try to kill the child process with SIGTERM (graceful)
                        process.kill(pid, 'SIGTERM');
                        logger.debug(`[ClaudeLocal] Sent SIGTERM to child PID ${pid}`);
                    } catch (e) {
                        logger.debug(`[ClaudeLocal] Error killing child: ${(e as Error).message}`);
                    }
                }

                // Second: wait for graceful shutdown, then hunt down orphaned processes
                setTimeout(() => {
                    // Use SIGTERM (15) instead of SIGKILL (9) for graceful shutdown
                    // Find processes by HAPPY_SESSION_ID environment variable
                    // Note: processTrackingId is internally generated (alphanumeric + hyphens only), safe for shell
                    try {
                        // Use pkill with SIGTERM to terminate them gracefully
                        execSync(`pkill -TERM -f "HAPPY_SESSION_ID=${processTrackingId}"`, {
                            stdio: 'ignore',
                            timeout: 500
                        });
                        logger.debug(`[ClaudeLocal] Terminated processes with tracking ID ${processTrackingId}`);
                    } catch (e) {
                        // No processes found - this is OK
                        logger.debug(`[ClaudeLocal] No additional processes to terminate (tracking: ${processTrackingId})`);
                    }

                    // Final cleanup: if still alive after 500ms, use SIGKILL
                    setTimeout(() => {
                        try {
                            execSync(`pkill -9 -f "HAPPY_SESSION_ID=${processTrackingId}"`, {
                                stdio: 'ignore',
                                timeout: 500
                            });
                            logger.debug(`[ClaudeLocal] Force killed remaining processes`);
                        } catch (e) {
                            // All processes are dead
                            logger.debug(`[ClaudeLocal] All processes terminated gracefully`);
                        }
                    }, 500);
                }, 100);
            }, { once: true });

            // Add timeout to escalate to SIGKILL if child ignores SIGTERM
            // This prevents zombie processes when the child has a SIGTERM handler that doesn't exit
            let killTimeout: NodeJS.Timeout | undefined;
            const setKillTimeout = () => {
                killTimeout = setTimeout(() => {
                    // Check if process is still alive (exitCode/signalCode are null until process exits)
                    if (child.exitCode === null && child.signalCode === null) {
                        logger.debug('[ClaudeLocal] Child did not respond to SIGTERM, sending SIGKILL');
                        child.kill('SIGKILL');
                    }
                }, 5000); // 5 second grace period before SIGKILL
            };

            // In Node.js, addEventListener doesn't fire for already-aborted signals
            // so we need to check and set up the timeout immediately in that case
            if (opts.abort.aborted) {
                setKillTimeout();
            } else {
                opts.abort.addEventListener('abort', setKillTimeout, { once: true });
            }

            // Clear kill timeout when child exits (whether via SIGTERM or otherwise)
            child.on('exit', () => {
                if (killTimeout) {
                    clearTimeout(killTimeout);
                    killTimeout = undefined;
                }
            });

            // Listen to the custom fd (fd 3) line by line
            // stdio[3] is typed as Readable | Writable | null | undefined, but we know it's Readable from 'pipe'
            const customFd = child.stdio[3];
            if (customFd && 'on' in customFd) {
                const rl = createInterface({
                    input: customFd as NodeJS.ReadableStream,
                    crlfDelay: Infinity
                });

                // Track active fetches for thinking state
                const activeFetches = new Map<number, { hostname: string, path: string, startTime: number }>();

                rl.on('line', (line) => {
                    try {
                        // Try to parse as JSON
                        const message = JSON.parse(line);

                        switch (message.type) {
                            case 'fetch-start':
                                // logger.debug(`[ClaudeLocal] Fetch start: ${message.method} ${message.hostname}${message.path} (id: ${message.id})`);
                                activeFetches.set(message.id, {
                                    hostname: message.hostname,
                                    path: message.path,
                                    startTime: message.timestamp
                                });

                                // Clear any pending stop timeout
                                if (stopThinkingTimeout) {
                                    clearTimeout(stopThinkingTimeout);
                                    stopThinkingTimeout = null;
                                }

                                // Start thinking
                                updateThinking(true);
                                break;

                            case 'fetch-end':
                                // logger.debug(`[ClaudeLocal] Fetch end: id ${message.id}`);
                                activeFetches.delete(message.id);

                                // Stop thinking when no active fetches
                                if (activeFetches.size === 0 && thinking && !stopThinkingTimeout) {
                                    stopThinkingTimeout = setTimeout(() => {
                                        if (activeFetches.size === 0) {
                                            updateThinking(false);
                                        }
                                        stopThinkingTimeout = null;
                                    }, 500); // Small delay to avoid flickering
                                }
                                break;

                            default:
                                logger.debug(`[ClaudeLocal] Unknown message type: ${message.type}`);
                        }
                    } catch {
                        // Not JSON, ignore (could be other output)
                        logger.debug(`[ClaudeLocal] Non-JSON line from fd3: ${line}`);
                    }
                });

                rl.on('error', (err) => {
                    console.error('Error reading from fd 3:', err);
                });

                // Cleanup on child exit
                child.on('exit', () => {
                    if (stopThinkingTimeout) {
                        clearTimeout(stopThinkingTimeout);

                    }
                    updateThinking(false);
                });
            }
            child.on('error', (_error) => {
                // Ignore
            });
            child.on('exit', (code, signal) => {
                if (signal === 'SIGTERM' && opts.abort.aborted) {
                    // Normal termination due to abort signal
                    r();
                } else if (signal) {
                    reject(new Error(`Process terminated with signal: ${signal}`));
                } else {
                    r();
                }
            });
        });
    } finally {
        process.stdin.resume();
        if (stopThinkingTimeout) {
            clearTimeout(stopThinkingTimeout);
            stopThinkingTimeout = null;
        }
        updateThinking(false);
    }

    return sessionId;
}