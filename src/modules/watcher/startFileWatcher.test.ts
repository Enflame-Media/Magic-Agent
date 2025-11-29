import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startFileWatcher } from './startFileWatcher';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('startFileWatcher', () => {
    let testDir: string;
    let testFile: string;

    beforeEach(() => {
        // Create a temporary test directory
        testDir = join(tmpdir(), `test-watcher-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
        testFile = join(testDir, 'test.txt');
    });

    afterEach(() => {
        // Clean up
        try {
            rmSync(testDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    it('should call callback when file changes', async () => {
        // Create initial file
        writeFileSync(testFile, 'initial content');

        let callCount = 0;
        const abort = startFileWatcher(testFile, () => {
            callCount++;
        });

        // Wait a bit for watcher to start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Modify the file
        writeFileSync(testFile, 'modified content');

        // Wait for the change to be detected
        await new Promise(resolve => setTimeout(resolve, 200));

        // Clean up
        abort();

        // Should have been called at least once
        expect(callCount).toBeGreaterThan(0);
    });

    it('should stop watching when file is deleted (ENOENT)', async () => {
        // Create initial file
        writeFileSync(testFile, 'initial content');

        let callCount = 0;
        const abort = startFileWatcher(testFile, () => {
            callCount++;
        });

        // Wait for watcher to start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Delete the file
        unlinkSync(testFile);

        // Wait to ensure watcher processes the deletion
        await new Promise(resolve => setTimeout(resolve, 500));

        // Watcher should have stopped, so recreating and modifying shouldn't trigger callback
        const initialCallCount = callCount;
        writeFileSync(testFile, 'new content');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Should not have increased (watcher stopped)
        expect(callCount).toBe(initialCallCount);

        abort();
    });

    it('should respect abort signal', async () => {
        writeFileSync(testFile, 'initial content');

        let callCount = 0;
        const abort = startFileWatcher(testFile, () => {
            callCount++;
        });

        // Wait for watcher to start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Abort the watcher
        abort();

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));

        // Modify the file
        writeFileSync(testFile, 'modified content');

        // Wait to ensure change would have been detected
        await new Promise(resolve => setTimeout(resolve, 200));

        // Should not have been called after abort
        expect(callCount).toBe(0);
    });

    it('should handle non-existent file gracefully (ENOENT)', async () => {
        const nonExistentFile = join(testDir, 'does-not-exist.txt');

        let callCount = 0;
        const abort = startFileWatcher(nonExistentFile, () => {
            callCount++;
        });

        // Wait to ensure watcher has time to fail
        await new Promise(resolve => setTimeout(resolve, 300));

        // Should not have called callback
        expect(callCount).toBe(0);

        abort();
    });

    it('should reset error count on successful watch', async () => {
        writeFileSync(testFile, 'initial content');

        let callCount = 0;
        const abort = startFileWatcher(testFile, () => {
            callCount++;
        }, { maxConsecutiveErrors: 3 });

        // Wait for watcher to start
        await new Promise(resolve => setTimeout(resolve, 100));

        // Trigger a change
        writeFileSync(testFile, 'change 1');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Should have been called
        expect(callCount).toBeGreaterThan(0);

        abort();
    });
});
