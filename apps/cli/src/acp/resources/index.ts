/**
 * ACP client-side resource handlers
 *
 * Provides file system and terminal handlers that implement the client side
 * of ACP's bidirectional protocol. When an agent needs to read/write files
 * or execute terminal commands, these handlers process those requests.
 *
 * Usage:
 * ```typescript
 * import { createResourceHandlers } from '@/acp/resources';
 *
 * const resources = createResourceHandlers();
 *
 * // Use as part of a Client implementation:
 * const client: Client = {
 *     readTextFile: resources.readTextFile,
 *     writeTextFile: resources.writeTextFile,
 *     createTerminal: resources.createTerminal,
 *     terminalOutput: resources.terminalOutput,
 *     waitForTerminalExit: resources.waitForTerminalExit,
 *     killTerminal: resources.killTerminal,
 *     releaseTerminal: resources.releaseTerminal,
 *     // ... other Client methods
 * };
 *
 * // Cleanup on disconnect:
 * resources.releaseAllTerminals();
 * ```
 *
 * @see https://agentclientprotocol.com/protocol/overview#client
 * @see https://agentclientprotocol.com/protocol/terminals
 */

import type {
    ReadTextFileRequest,
    ReadTextFileResponse,
    WriteTextFileRequest,
    WriteTextFileResponse,
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
} from '@agentclientprotocol/sdk';
import { handleReadTextFile, handleWriteTextFile } from './fs';
import { TerminalRegistry, createTerminalHandlers } from './terminal';

/** All ACP client-side resource handler methods */
export interface AcpResourceHandlers {
    readTextFile: (params: ReadTextFileRequest) => Promise<ReadTextFileResponse>;
    writeTextFile: (params: WriteTextFileRequest) => Promise<WriteTextFileResponse>;
    createTerminal: (params: CreateTerminalRequest) => Promise<CreateTerminalResponse>;
    terminalOutput: (params: TerminalOutputRequest) => Promise<TerminalOutputResponse>;
    waitForTerminalExit: (params: WaitForTerminalExitRequest) => Promise<WaitForTerminalExitResponse>;
    killTerminal: (params: KillTerminalCommandRequest) => Promise<KillTerminalCommandResponse>;
    releaseTerminal: (params: ReleaseTerminalRequest) => Promise<ReleaseTerminalResponse>;
    releaseAllTerminals: () => void;
}

/**
 * Create a complete set of ACP client-side resource handlers.
 *
 * Creates a TerminalRegistry for process management and returns handler
 * functions for all fs and terminal methods, ready to be plugged into
 * an ACP Client implementation.
 *
 * @returns Handler functions plus a releaseAllTerminals cleanup method
 */
export function createResourceHandlers(): AcpResourceHandlers {
    const registry = new TerminalRegistry();
    const terminalHandlers = createTerminalHandlers(registry);

    return {
        readTextFile: handleReadTextFile,
        writeTextFile: handleWriteTextFile,
        createTerminal: terminalHandlers.handleCreateTerminal,
        terminalOutput: terminalHandlers.handleTerminalOutput,
        waitForTerminalExit: terminalHandlers.handleWaitForTerminalExit,
        killTerminal: terminalHandlers.handleKillTerminal,
        releaseTerminal: terminalHandlers.handleReleaseTerminal,
        releaseAllTerminals: () => registry.releaseAll(),
    };
}

export { TerminalRegistry } from './terminal';
export { handleReadTextFile, handleWriteTextFile } from './fs';
