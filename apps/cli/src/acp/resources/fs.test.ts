/**
 * Tests for ACP client-side file system resource handlers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { RequestError } from '@agentclientprotocol/sdk';
import { handleReadTextFile, handleWriteTextFile } from './fs';

describe('handleReadTextFile', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = join(tmpdir(), `acp-fs-test-${randomUUID()}`);
        await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
    });

    it('should read an entire file', async () => {
        const filePath = join(testDir, 'test.txt');
        await writeFile(filePath, 'line1\nline2\nline3');

        const result = await handleReadTextFile({
            path: filePath,
            sessionId: 'test-session',
        });

        expect(result.content).toBe('line1\nline2\nline3');
    });

    it('should read with 1-based line offset', async () => {
        const filePath = join(testDir, 'test.txt');
        await writeFile(filePath, 'line1\nline2\nline3\nline4\nline5');

        const result = await handleReadTextFile({
            path: filePath,
            sessionId: 'test-session',
            line: 2,
        });

        expect(result.content).toBe('line2\nline3\nline4\nline5');
    });

    it('should read with line offset and limit', async () => {
        const filePath = join(testDir, 'test.txt');
        await writeFile(filePath, 'line1\nline2\nline3\nline4\nline5');

        const result = await handleReadTextFile({
            path: filePath,
            sessionId: 'test-session',
            line: 2,
            limit: 2,
        });

        expect(result.content).toBe('line2\nline3');
    });

    it('should return empty content for out-of-range line offset', async () => {
        const filePath = join(testDir, 'test.txt');
        await writeFile(filePath, 'line1\nline2');

        const result = await handleReadTextFile({
            path: filePath,
            sessionId: 'test-session',
            line: 100,
        });

        expect(result.content).toBe('');
    });

    it('should throw resourceNotFound for missing file', async () => {
        const filePath = join(testDir, 'nonexistent.txt');

        await expect(
            handleReadTextFile({ path: filePath, sessionId: 'test-session' }),
        ).rejects.toThrow(RequestError);

        try {
            await handleReadTextFile({ path: filePath, sessionId: 'test-session' });
        } catch (err) {
            expect(err).toBeInstanceOf(RequestError);
            expect((err as RequestError).code).toBe(-32002);
        }
    });

    it('should throw invalidParams for relative path', async () => {
        await expect(
            handleReadTextFile({ path: 'relative/path.txt', sessionId: 'test-session' }),
        ).rejects.toThrow(RequestError);

        try {
            await handleReadTextFile({ path: 'relative/path.txt', sessionId: 'test-session' });
        } catch (err) {
            expect(err).toBeInstanceOf(RequestError);
            expect((err as RequestError).code).toBe(-32602);
        }
    });

    it('should read empty file', async () => {
        const filePath = join(testDir, 'empty.txt');
        await writeFile(filePath, '');

        const result = await handleReadTextFile({
            path: filePath,
            sessionId: 'test-session',
        });

        expect(result.content).toBe('');
    });

    it('should handle file with no trailing newline', async () => {
        const filePath = join(testDir, 'no-newline.txt');
        await writeFile(filePath, 'single line');

        const result = await handleReadTextFile({
            path: filePath,
            sessionId: 'test-session',
            line: 1,
            limit: 1,
        });

        expect(result.content).toBe('single line');
    });
});

describe('handleWriteTextFile', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = join(tmpdir(), `acp-fs-test-${randomUUID()}`);
        await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testDir, { recursive: true, force: true });
    });

    it('should write content to a new file', async () => {
        const filePath = join(testDir, 'output.txt');

        await handleWriteTextFile({
            path: filePath,
            content: 'hello world',
            sessionId: 'test-session',
        });

        const { readFile: readF } = await import('node:fs/promises');
        const written = await readF(filePath, 'utf-8');
        expect(written).toBe('hello world');
    });

    it('should create parent directories', async () => {
        const filePath = join(testDir, 'nested', 'deep', 'output.txt');

        await handleWriteTextFile({
            path: filePath,
            content: 'nested content',
            sessionId: 'test-session',
        });

        const { readFile: readF } = await import('node:fs/promises');
        const written = await readF(filePath, 'utf-8');
        expect(written).toBe('nested content');
    });

    it('should overwrite existing file', async () => {
        const filePath = join(testDir, 'existing.txt');
        await writeFile(filePath, 'old content');

        await handleWriteTextFile({
            path: filePath,
            content: 'new content',
            sessionId: 'test-session',
        });

        const { readFile: readF } = await import('node:fs/promises');
        const written = await readF(filePath, 'utf-8');
        expect(written).toBe('new content');
    });

    it('should throw invalidParams for relative path', async () => {
        await expect(
            handleWriteTextFile({
                path: 'relative/path.txt',
                content: 'test',
                sessionId: 'test-session',
            }),
        ).rejects.toThrow(RequestError);

        try {
            await handleWriteTextFile({
                path: 'relative/path.txt',
                content: 'test',
                sessionId: 'test-session',
            });
        } catch (err) {
            expect(err).toBeInstanceOf(RequestError);
            expect((err as RequestError).code).toBe(-32602);
        }
    });

    it('should write empty content', async () => {
        const filePath = join(testDir, 'empty.txt');

        await handleWriteTextFile({
            path: filePath,
            content: '',
            sessionId: 'test-session',
        });

        const { readFile: readF } = await import('node:fs/promises');
        const written = await readF(filePath, 'utf-8');
        expect(written).toBe('');
    });
});
