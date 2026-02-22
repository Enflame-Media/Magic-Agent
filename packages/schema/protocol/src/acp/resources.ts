/**
 * ACP client-side resource method types
 *
 * These schemas define file system and terminal operations that the agent
 * can request from the client.
 *
 * @see https://agentclientprotocol.com/protocol/overview#client
 * @see https://agentclientprotocol.com/protocol/terminals
 */

import { z } from 'zod';
import { AcpMetaSchema } from './jsonrpc';
import { AcpSessionIdSchema, AcpEnvVariableSchema } from './common';

// ─── File System ─────────────────────────────────────────────────────────────

/**
 * Request to read content from a text file
 *
 * Only available if the client supports the `fs.readTextFile` capability.
 */
export const AcpReadTextFileRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    path: z.string(),
    line: z.number().int().min(0).nullable().optional(),
    limit: z.number().int().min(0).nullable().optional(),
});

export type AcpReadTextFileRequest = z.infer<typeof AcpReadTextFileRequestSchema>;

/** Response containing the contents of a text file */
export const AcpReadTextFileResponseSchema = z.object({
    _meta: AcpMetaSchema,
    content: z.string(),
});

export type AcpReadTextFileResponse = z.infer<typeof AcpReadTextFileResponseSchema>;

/**
 * Request to write content to a text file
 *
 * Only available if the client supports the `fs.writeTextFile` capability.
 */
export const AcpWriteTextFileRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    path: z.string(),
    content: z.string(),
});

export type AcpWriteTextFileRequest = z.infer<typeof AcpWriteTextFileRequestSchema>;

/** Response to write text file (empty on success) */
export const AcpWriteTextFileResponseSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpWriteTextFileResponse = z.infer<typeof AcpWriteTextFileResponseSchema>;

// ─── Terminal ────────────────────────────────────────────────────────────────

/**
 * Request to create a new terminal and execute a command
 *
 * Only available if the `terminal` client capability is set to true.
 *
 * @see https://agentclientprotocol.com/protocol/terminals
 */
export const AcpCreateTerminalRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    command: z.string(),
    args: z.array(z.string()).optional(),
    cwd: z.string().nullable().optional(),
    env: z.array(AcpEnvVariableSchema).optional(),
    outputByteLimit: z.number().int().min(0).nullable().optional(),
});

export type AcpCreateTerminalRequest = z.infer<typeof AcpCreateTerminalRequestSchema>;

/** Response containing the ID of the created terminal */
export const AcpCreateTerminalResponseSchema = z.object({
    _meta: AcpMetaSchema,
    terminalId: z.string(),
});

export type AcpCreateTerminalResponse = z.infer<typeof AcpCreateTerminalResponseSchema>;

/**
 * Request to get the current output and status of a terminal
 *
 * @see https://agentclientprotocol.com/protocol/terminals
 */
export const AcpTerminalOutputRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    terminalId: z.string(),
});

export type AcpTerminalOutputRequest = z.infer<typeof AcpTerminalOutputRequestSchema>;

/** Exit status of a terminal command */
export const AcpTerminalExitStatusSchema = z.object({
    _meta: AcpMetaSchema,
    exitCode: z.number().int().min(0).nullable().optional(),
    signal: z.string().nullable().optional(),
});

export type AcpTerminalExitStatus = z.infer<typeof AcpTerminalExitStatusSchema>;

/** Response containing the terminal output and exit status */
export const AcpTerminalOutputResponseSchema = z.object({
    _meta: AcpMetaSchema,
    output: z.string(),
    truncated: z.boolean(),
    exitStatus: AcpTerminalExitStatusSchema.nullable().optional(),
});

export type AcpTerminalOutputResponse = z.infer<typeof AcpTerminalOutputResponseSchema>;

/** Request to wait for a terminal command to exit */
export const AcpWaitForTerminalExitRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    terminalId: z.string(),
});

export type AcpWaitForTerminalExitRequest = z.infer<typeof AcpWaitForTerminalExitRequestSchema>;

/** Response containing the exit status of a terminal command */
export const AcpWaitForTerminalExitResponseSchema = z.object({
    _meta: AcpMetaSchema,
    exitCode: z.number().int().min(0).nullable().optional(),
    signal: z.string().nullable().optional(),
});

export type AcpWaitForTerminalExitResponse = z.infer<typeof AcpWaitForTerminalExitResponseSchema>;

/** Request to kill a terminal command without releasing the terminal */
export const AcpKillTerminalCommandRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    terminalId: z.string(),
});

export type AcpKillTerminalCommandRequest = z.infer<typeof AcpKillTerminalCommandRequestSchema>;

/** Response to terminal/kill command method */
export const AcpKillTerminalCommandResponseSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpKillTerminalCommandResponse = z.infer<typeof AcpKillTerminalCommandResponseSchema>;

/** Request to release a terminal and free its resources */
export const AcpReleaseTerminalRequestSchema = z.object({
    _meta: AcpMetaSchema,
    sessionId: AcpSessionIdSchema,
    terminalId: z.string(),
});

export type AcpReleaseTerminalRequest = z.infer<typeof AcpReleaseTerminalRequestSchema>;

/** Response to terminal/release method */
export const AcpReleaseTerminalResponseSchema = z.object({
    _meta: AcpMetaSchema,
});

export type AcpReleaseTerminalResponse = z.infer<typeof AcpReleaseTerminalResponseSchema>;
