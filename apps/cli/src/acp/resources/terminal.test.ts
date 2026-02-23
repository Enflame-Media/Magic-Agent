/**
 * Tests for ACP client-side terminal resource handlers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TerminalRegistry, createTerminalHandlers } from './terminal';

describe('TerminalRegistry', () => {
    let registry: TerminalRegistry;

    beforeEach(() => {
        registry = new TerminalRegistry();
    });

    afterEach(() => {
        registry.releaseAll();
    });

    it('should create a terminal and return an ID', () => {
        const terminalId = registry.create('echo', ['hello']);
        expect(terminalId).toBeTruthy();
        expect(typeof terminalId).toBe('string');
        expect(registry.size).toBe(1);
    });

    it('should capture stdout output', async () => {
        const terminalId = registry.create('echo', ['test output']);
        await registry.waitForExit(terminalId);

        const { output } = registry.getOutput(terminalId);
        expect(output).toContain('test output');
    });

    it('should capture stderr output', async () => {
        const terminalId = registry.create('sh', ['-c', 'echo error-msg >&2']);
        await registry.waitForExit(terminalId);

        const { output } = registry.getOutput(terminalId);
        expect(output).toContain('error-msg');
    });

    it('should report exit status', async () => {
        const terminalId = registry.create('sh', ['-c', 'exit 42']);
        const status = await registry.waitForExit(terminalId);

        expect(status.exitCode).toBe(42);
    });

    it('should report exit code 0 for success', async () => {
        const terminalId = registry.create('true', []);
        const status = await registry.waitForExit(terminalId);

        expect(status.exitCode).toBe(0);
    });

    it('should support multiple concurrent terminals', async () => {
        const id1 = registry.create('echo', ['first']);
        const id2 = registry.create('echo', ['second']);
        expect(registry.size).toBe(2);

        await registry.waitForExit(id1);
        await registry.waitForExit(id2);

        const output1 = registry.getOutput(id1);
        const output2 = registry.getOutput(id2);
        expect(output1.output).toContain('first');
        expect(output2.output).toContain('second');
    });

    it('should kill a running process', async () => {
        const terminalId = registry.create('sleep', ['60']);

        // Give process time to start
        await new Promise((r) => setTimeout(r, 50));

        registry.kill(terminalId);
        const status = await registry.waitForExit(terminalId);

        // Process should have been terminated by signal
        expect(status.signal === 'SIGTERM' || status.exitCode !== null).toBe(true);
    });

    it('should release a terminal', async () => {
        const terminalId = registry.create('echo', ['test']);
        await registry.waitForExit(terminalId);

        registry.release(terminalId);
        expect(registry.size).toBe(0);
    });

    it('should release a running process', async () => {
        const terminalId = registry.create('sleep', ['60']);

        // Give process time to start
        await new Promise((r) => setTimeout(r, 50));

        registry.release(terminalId);
        expect(registry.size).toBe(0);
    });

    it('should handle releasing already-released terminal gracefully', () => {
        const terminalId = registry.create('echo', ['test']);
        registry.release(terminalId);
        // Second release should be a no-op
        registry.release(terminalId);
        expect(registry.size).toBe(0);
    });

    it('should release all terminals', async () => {
        registry.create('echo', ['a']);
        registry.create('echo', ['b']);
        registry.create('echo', ['c']);
        expect(registry.size).toBe(3);

        registry.releaseAll();
        expect(registry.size).toBe(0);
    });

    it('should throw resourceNotFound for unknown terminal ID', () => {
        expect(() => registry.getOutput('nonexistent')).toThrow();
    });

    it('should truncate output at byte limit', async () => {
        // Generate output exceeding a small byte limit
        const terminalId = registry.create(
            'sh',
            ['-c', 'printf "AAAA"; printf "BBBB"'],
            undefined,
            undefined,
            4, // 4 byte limit
        );
        await registry.waitForExit(terminalId);

        const { output, truncated } = registry.getOutput(terminalId);
        // Should have truncated from the beginning
        expect(truncated).toBe(true);
        expect(Buffer.from(output, 'utf-8').byteLength).toBeLessThanOrEqual(4);
    });

    it('should not truncate when within byte limit', async () => {
        const terminalId = registry.create('echo', ['hi'], undefined, undefined, 1024);
        await registry.waitForExit(terminalId);

        const { truncated } = registry.getOutput(terminalId);
        expect(truncated).toBe(false);
    });

    it('should pass environment variables', async () => {
        const terminalId = registry.create(
            'sh',
            ['-c', 'echo $ACP_TEST_VAR'],
            undefined,
            [{ name: 'ACP_TEST_VAR', value: 'test_value_42' }],
        );
        await registry.waitForExit(terminalId);

        const { output } = registry.getOutput(terminalId);
        expect(output).toContain('test_value_42');
    });

    it('should use specified working directory', async () => {
        const terminalId = registry.create('pwd', [], '/tmp');
        await registry.waitForExit(terminalId);

        const { output } = registry.getOutput(terminalId);
        // /tmp may be a symlink on some systems (e.g. macOS -> /private/tmp)
        expect(output.trim()).toMatch(/\/tmp/);
    });
});

describe('createTerminalHandlers', () => {
    let registry: TerminalRegistry;

    beforeEach(() => {
        registry = new TerminalRegistry();
    });

    afterEach(() => {
        registry.releaseAll();
    });

    it('should create handlers bound to registry', async () => {
        const handlers = createTerminalHandlers(registry);

        const { terminalId } = await handlers.handleCreateTerminal({
            command: 'echo',
            args: ['handler test'],
            sessionId: 'test-session',
        });

        expect(terminalId).toBeTruthy();
        expect(registry.size).toBe(1);

        const exitResult = await handlers.handleWaitForTerminalExit({
            terminalId,
            sessionId: 'test-session',
        });
        expect(exitResult.exitCode).toBe(0);

        const outputResult = await handlers.handleTerminalOutput({
            terminalId,
            sessionId: 'test-session',
        });
        expect(outputResult.output).toContain('handler test');
        expect(outputResult.truncated).toBe(false);

        await handlers.handleReleaseTerminal({
            terminalId,
            sessionId: 'test-session',
        });
        expect(registry.size).toBe(0);
    });

    it('should handle kill through handler', async () => {
        const handlers = createTerminalHandlers(registry);

        const { terminalId } = await handlers.handleCreateTerminal({
            command: 'sleep',
            args: ['60'],
            sessionId: 'test-session',
        });

        await new Promise((r) => setTimeout(r, 50));

        await handlers.handleKillTerminal({
            terminalId,
            sessionId: 'test-session',
        });

        const status = await handlers.handleWaitForTerminalExit({
            terminalId,
            sessionId: 'test-session',
        });

        expect(status.signal === 'SIGTERM' || status.exitCode !== null).toBe(true);

        await handlers.handleReleaseTerminal({
            terminalId,
            sessionId: 'test-session',
        });
    });
});
