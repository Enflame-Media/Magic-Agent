/**
 * ACP client-side file system resource handlers
 *
 * Implements fs/readTextFile and fs/writeTextFile methods that agents call
 * to read and write files on the client's local filesystem.
 *
 * All paths must be absolute per the ACP specification. Line numbering
 * for readTextFile is 1-based.
 *
 * @see https://agentclientprotocol.com/protocol/overview#client
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { RequestError } from '@agentclientprotocol/sdk';
import type {
    ReadTextFileRequest,
    ReadTextFileResponse,
    WriteTextFileRequest,
    WriteTextFileResponse,
} from '@agentclientprotocol/sdk';
import { logger } from '@/ui/logger';

/**
 * Handle fs/readTextFile requests from the agent.
 *
 * Reads a text file from the local filesystem. Supports optional line-based
 * slicing with 1-based line numbers (per ACP spec).
 *
 * @param params - The read request with path, optional line offset and limit
 * @returns The file content (or sliced portion)
 * @throws RequestError with resourceNotFound for missing files
 * @throws RequestError with invalidParams for non-absolute paths
 */
export async function handleReadTextFile(
    params: ReadTextFileRequest,
): Promise<ReadTextFileResponse> {
    const { path, line, limit } = params;

    if (!isAbsolute(path)) {
        throw RequestError.invalidParams(
            { path },
            'Path must be absolute',
        );
    }

    logger.debug(`[ACP:fs] readTextFile: ${path} (line=${line ?? 'all'}, limit=${limit ?? 'all'})`);

    let content: string;
    try {
        content = await readFile(path, 'utf-8');
    } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'ENOENT') {
            throw RequestError.resourceNotFound(path);
        }
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            throw new RequestError(-32002, `Permission denied: ${path}`);
        }
        throw new RequestError(-32603, `Failed to read file: ${error.message}`);
    }

    if (line != null && line > 0) {
        const lines = content.split('\n');
        const startIndex = line - 1; // Convert 1-based to 0-based
        const endIndex = limit != null ? startIndex + limit : lines.length;
        content = lines.slice(startIndex, endIndex).join('\n');
    }

    return { content };
}

/**
 * Handle fs/writeTextFile requests from the agent.
 *
 * Writes content to a file on the local filesystem. Creates parent
 * directories if they don't exist.
 *
 * @param params - The write request with path and content
 * @returns Empty response on success
 * @throws RequestError with invalidParams for non-absolute paths
 */
export async function handleWriteTextFile(
    params: WriteTextFileRequest,
): Promise<WriteTextFileResponse> {
    const { path, content } = params;

    if (!isAbsolute(path)) {
        throw RequestError.invalidParams(
            { path },
            'Path must be absolute',
        );
    }

    logger.debug(`[ACP:fs] writeTextFile: ${path} (${content.length} chars)`);

    try {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, 'utf-8');
    } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'EACCES' || error.code === 'EPERM') {
            throw new RequestError(-32002, `Permission denied: ${path}`);
        }
        throw new RequestError(-32603, `Failed to write file: ${error.message}`);
    }

    return {};
}
