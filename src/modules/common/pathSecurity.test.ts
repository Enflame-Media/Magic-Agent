/**
 * Tests for path security validation
 */

import { describe, it, expect } from 'vitest';
import { validatePath, createPathValidator, validatePathOrThrow } from './pathSecurity';
import { join, resolve } from 'node:path';
import { platform } from 'node:os';

describe('validatePath', () => {
    const workingDir = '/home/user/project';

    describe('valid paths', () => {
        it('accepts relative path within working directory', () => {
            const result = validatePath('./file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, './file.txt'));
        });

        it('accepts nested relative path', () => {
            const result = validatePath('./subdir/nested/file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, './subdir/nested/file.txt'));
        });

        it('accepts path without ./ prefix', () => {
            const result = validatePath('file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'file.txt'));
        });

        it('accepts absolute path within working directory', () => {
            const absolutePath = join(workingDir, 'subdir', 'file.txt');
            const result = validatePath(absolutePath, workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(absolutePath);
        });

        it('accepts path that resolves to working directory itself', () => {
            const result = validatePath('.', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir));
        });

        it('normalizes redundant path segments', () => {
            // ./foo/../bar resolves to ./bar which is within working dir
            const result = validatePath('./foo/../bar/file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'bar/file.txt'));
        });
    });

    describe('invalid paths - directory traversal', () => {
        it('rejects simple parent directory traversal', () => {
            const result = validatePath('../file.txt', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects nested parent directory traversal', () => {
            const result = validatePath('../../etc/passwd', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects traversal disguised in nested path', () => {
            // ./subdir/../../etc/passwd resolves outside
            const result = validatePath('./subdir/../../etc/passwd', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects absolute path outside working directory', () => {
            const result = validatePath('/etc/passwd', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects deeply nested traversal that escapes', () => {
            const result = validatePath('./a/b/c/../../../../outside', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });
    });

    describe('invalid paths - injection attacks', () => {
        it('rejects path with null byte', () => {
            const result = validatePath('./file.txt\0.jpg', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('null byte');
        });

        it('rejects null byte at beginning', () => {
            const result = validatePath('\0./file.txt', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('null byte');
        });

        it('rejects null byte in middle of path', () => {
            const result = validatePath('./sub\0dir/file.txt', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('null byte');
        });
    });

    describe('edge cases', () => {
        it('handles empty string as current directory', () => {
            const result = validatePath('', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir));
        });

        it('handles path with spaces', () => {
            const result = validatePath('./my file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'my file.txt'));
        });

        it('handles path with special characters', () => {
            const result = validatePath('./file-name_v2.test.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'file-name_v2.test.txt'));
        });

        it('handles unicode in path', () => {
            const result = validatePath('./日本語/файл.txt', workingDir);
            expect(result.valid).toBe(true);
        });
    });
});

describe('createPathValidator', () => {
    it('creates a bound validator function', () => {
        const workingDir = '/home/user/project';
        const validate = createPathValidator(workingDir);

        const validResult = validate('./file.txt');
        expect(validResult.valid).toBe(true);

        const invalidResult = validate('../outside.txt');
        expect(invalidResult.valid).toBe(false);
    });
});

describe('validatePathOrThrow', () => {
    const workingDir = '/home/user/project';

    it('returns resolved path for valid input', () => {
        const result = validatePathOrThrow('./file.txt', workingDir);
        expect(result).toBe(resolve(workingDir, './file.txt'));
    });

    it('throws for invalid path', () => {
        expect(() => validatePathOrThrow('../outside.txt', workingDir))
            .toThrow('resolves outside the working directory');
    });

    it('throws for null byte injection', () => {
        expect(() => validatePathOrThrow('./file\0.txt', workingDir))
            .toThrow('null byte');
    });
});

// Platform-specific tests
describe('cross-platform compatibility', () => {
    // These tests verify the implementation handles platform differences
    // The path module normalizes separators, so / works on Windows

    it('handles forward slashes on all platforms', () => {
        const workingDir = '/home/user/project';
        const result = validatePath('./sub/dir/file.txt', workingDir);
        expect(result.valid).toBe(true);
    });

    it('rejects traversal regardless of separator style', () => {
        const workingDir = '/home/user/project';
        // Forward slash traversal
        const result1 = validatePath('../../../etc', workingDir);
        expect(result1.valid).toBe(false);
    });
});
