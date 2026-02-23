/**
 * ACP client-side terminal resource handlers
 *
 * Implements terminal/create, terminal/output, terminal/waitForExit,
 * terminal/kill, and terminal/release methods that agents call to spawn
 * and manage terminal processes on the client.
 *
 * Terminal processes are tracked in a TerminalRegistry that supports
 * multiple concurrent terminals per session and cleanup on disconnect.
 *
 * @see https://agentclientprotocol.com/protocol/terminals
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { RequestError } from '@agentclientprotocol/sdk';
import type {
    CreateTerminalRequest,
    CreateTerminalResponse,
    TerminalOutputRequest,
    TerminalOutputResponse,
    WaitForTerminalExitRequest,
    WaitForTerminalExitResponse,
    KillTerminalCommandRequest,
    KillTerminalCommandResponse,
    ReleaseTerminalRequest,
    ReleaseTerminalResponse,
    TerminalExitStatus,
} from '@agentclientprotocol/sdk';
import { logger } from '@/ui/logger';

/** Default output byte limit if none specified (1MB) */
const DEFAULT_OUTPUT_BYTE_LIMIT = 1_048_576;

/** Internal state for a tracked terminal process */
interface TerminalEntry {
    process: ChildProcess;
    output: string;
    outputByteLength: number;
    outputByteLimit: number;
    truncated: boolean;
    exitStatus: TerminalExitStatus | null;
    exitPromise: Promise<TerminalExitStatus>;
}

/**
 * Registry that tracks all active terminal processes for ACP sessions.
 *
 * Manages the lifecycle of spawned processes including output buffering,
 * byte-limit truncation, and cleanup.
 */
export class TerminalRegistry {
    private terminals = new Map<string, TerminalEntry>();

    /**
     * Spawn a new terminal process and register it.
     *
     * @returns The unique terminal ID
     */
    create(
        command: string,
        args: string[],
        cwd?: string | null,
        env?: Array<{ name: string; value: string }>,
        outputByteLimit?: number | null,
    ): string {
        const terminalId = randomUUID();
        const limit = outputByteLimit ?? DEFAULT_OUTPUT_BYTE_LIMIT;

        const mergedEnv: Record<string, string> = { ...process.env as Record<string, string> };
        if (env) {
            for (const { name, value } of env) {
                mergedEnv[name] = value;
            }
        }

        const proc = spawn(command, args, {
            cwd: cwd ?? undefined,
            env: mergedEnv,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false,
        });

        let resolve: (status: TerminalExitStatus) => void;
        const exitPromise = new Promise<TerminalExitStatus>((r) => { resolve = r; });

        const entry: TerminalEntry = {
            process: proc,
            output: '',
            outputByteLength: 0,
            outputByteLimit: limit,
            truncated: false,
            exitStatus: null,
            exitPromise,
        };

        const appendOutput = (chunk: Buffer) => {
            const text = chunk.toString('utf-8');
            entry.output += text;
            entry.outputByteLength += chunk.byteLength;

            if (entry.outputByteLimit > 0 && entry.outputByteLength > entry.outputByteLimit) {
                this.truncateOutput(entry);
            }
        };

        proc.stdout?.on('data', appendOutput);
        proc.stderr?.on('data', appendOutput);

        proc.on('exit', (code, signal) => {
            const status: TerminalExitStatus = {
                exitCode: code,
                signal: signal ?? undefined,
            };
            entry.exitStatus = status;
            resolve!(status);
        });

        proc.on('error', (err) => {
            logger.error(`[ACP:terminal] Process error for ${terminalId}: ${err.message}`);
            const status: TerminalExitStatus = { exitCode: -1 };
            entry.exitStatus = status;
            resolve!(status);
        });

        this.terminals.set(terminalId, entry);

        logger.debug(
            `[ACP:terminal] Created terminal ${terminalId}: ${command} ${args.join(' ')}` +
            (cwd ? ` (cwd: ${cwd})` : ''),
        );

        return terminalId;
    }

    /**
     * Get the current output and exit status for a terminal.
     */
    getOutput(terminalId: string): { output: string; truncated: boolean; exitStatus: TerminalExitStatus | null } {
        const entry = this.getEntry(terminalId);
        return {
            output: entry.output,
            truncated: entry.truncated,
            exitStatus: entry.exitStatus,
        };
    }

    /**
     * Wait for a terminal process to exit.
     */
    async waitForExit(terminalId: string): Promise<TerminalExitStatus> {
        const entry = this.getEntry(terminalId);
        return entry.exitPromise;
    }

    /**
     * Send a signal to kill the terminal process without releasing it.
     */
    kill(terminalId: string): void {
        const entry = this.getEntry(terminalId);
        if (entry.exitStatus === null) {
            entry.process.kill('SIGTERM');
            logger.debug(`[ACP:terminal] Killed terminal ${terminalId}`);
        }
    }

    /**
     * Release a terminal, killing the process if still running, and
     * removing it from the registry.
     */
    release(terminalId: string): void {
        const entry = this.terminals.get(terminalId);
        if (!entry) return; // Already released, no-op

        if (entry.exitStatus === null) {
            entry.process.kill('SIGKILL');
        }

        entry.process.stdout?.removeAllListeners();
        entry.process.stderr?.removeAllListeners();
        entry.process.removeAllListeners();

        this.terminals.delete(terminalId);
        logger.debug(`[ACP:terminal] Released terminal ${terminalId}`);
    }

    /**
     * Release all terminals. Called on session end or agent disconnect.
     */
    releaseAll(): void {
        for (const terminalId of this.terminals.keys()) {
            this.release(terminalId);
        }
        logger.debug('[ACP:terminal] Released all terminals');
    }

    /** Number of active terminals */
    get size(): number {
        return this.terminals.size;
    }

    private getEntry(terminalId: string): TerminalEntry {
        const entry = this.terminals.get(terminalId);
        if (!entry) {
            throw RequestError.resourceNotFound(terminalId);
        }
        return entry;
    }

    /**
     * Truncate output from the beginning to stay within the byte limit.
     * Ensures truncation happens at a character boundary per ACP spec.
     */
    private truncateOutput(entry: TerminalEntry): void {
        const encoded = Buffer.from(entry.output, 'utf-8');
        if (encoded.byteLength <= entry.outputByteLimit) return;

        // Slice from the end to keep the most recent output
        const truncated = encoded.subarray(encoded.byteLength - entry.outputByteLimit);

        // Find first valid UTF-8 character boundary (skip continuation bytes 10xxxxxx)
        let start = 0;
        while (start < truncated.length && (truncated[start]! & 0xC0) === 0x80) {
            start++;
        }

        entry.output = truncated.subarray(start).toString('utf-8');
        entry.outputByteLength = entry.outputByteLimit - start;
        entry.truncated = true;
    }
}

// ─── Handler Functions ──────────────────────────────────────────────────────

/**
 * Create handler functions bound to a TerminalRegistry instance.
 *
 * @param registry - The terminal registry to use for process management
 */
export function createTerminalHandlers(registry: TerminalRegistry) {
    async function handleCreateTerminal(
        params: CreateTerminalRequest,
    ): Promise<CreateTerminalResponse> {
        const { command, args, cwd, env, outputByteLimit } = params;

        const terminalId = registry.create(
            command,
            args ?? [],
            cwd,
            env,
            outputByteLimit,
        );

        return { terminalId };
    }

    async function handleTerminalOutput(
        params: TerminalOutputRequest,
    ): Promise<TerminalOutputResponse> {
        const { terminalId } = params;
        const result = registry.getOutput(terminalId);
        return {
            output: result.output,
            truncated: result.truncated,
            exitStatus: result.exitStatus,
        };
    }

    async function handleWaitForTerminalExit(
        params: WaitForTerminalExitRequest,
    ): Promise<WaitForTerminalExitResponse> {
        const { terminalId } = params;
        return registry.waitForExit(terminalId);
    }

    async function handleKillTerminal(
        params: KillTerminalCommandRequest,
    ): Promise<KillTerminalCommandResponse> {
        const { terminalId } = params;
        registry.kill(terminalId);
        return {};
    }

    async function handleReleaseTerminal(
        params: ReleaseTerminalRequest,
    ): Promise<ReleaseTerminalResponse> {
        const { terminalId } = params;
        registry.release(terminalId);
        return {};
    }

    return {
        handleCreateTerminal,
        handleTerminalOutput,
        handleWaitForTerminalExit,
        handleKillTerminal,
        handleReleaseTerminal,
    };
}
