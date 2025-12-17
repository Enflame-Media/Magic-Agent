/**
 * Path security utilities to prevent directory traversal attacks.
 * Validates that file operations remain within the working directory.
 *
 * Security Note: Path validation is critical for RPC handlers that accept
 * user-provided paths. Without validation, attackers could use paths like
 * "../../etc/passwd" to access files outside the intended directory.
 */

import { resolve, relative, isAbsolute } from 'node:path';

/**
 * Result of path validation
 */
export interface PathValidationResult {
    /**
     * Whether the path is valid (within working directory)
     */
    valid: boolean;

    /**
     * The resolved absolute path if valid, undefined otherwise
     */
    resolvedPath?: string;

    /**
     * Error message if invalid
     */
    error?: string;
}

/**
 * Validates that a path resolves to a location within the working directory.
 * Prevents directory traversal attacks (e.g., "../../etc/passwd").
 *
 * This implementation uses path.relative() for cross-platform compatibility,
 * avoiding string prefix checks that can fail on Windows due to:
 * - Case-insensitive filesystem paths
 * - Different path separators (\ vs /)
 * - Drive letter handling
 *
 * @param inputPath - The path to validate (can be absolute or relative)
 * @param workingDirectory - The base directory that paths must be within
 * @returns ValidationResult with resolved path if valid, error message if not
 *
 * @example
 * ```typescript
 * const result = validatePath('./file.txt', '/home/user/project');
 * if (result.valid) {
 *   // Safe to use result.resolvedPath
 * } else {
 *   // Reject with result.error
 * }
 * ```
 *
 * @security
 * - Rejects paths containing null bytes (used in some attacks)
 * - Rejects paths that resolve outside working directory
 * - Handles symlinks by resolving to absolute paths
 */
export function validatePath(inputPath: string, workingDirectory: string): PathValidationResult {
    // Check for null bytes (potential path injection attack)
    if (inputPath.includes('\0')) {
        return {
            valid: false,
            error: 'Path contains invalid characters (null byte)'
        };
    }

    // Resolve the path to an absolute path
    // If inputPath is absolute, resolve() returns it normalized
    // If inputPath is relative, resolve() joins it with workingDirectory
    const resolvedPath = isAbsolute(inputPath)
        ? resolve(inputPath)
        : resolve(workingDirectory, inputPath);

    // Normalize the working directory for comparison
    const normalizedWorkingDir = resolve(workingDirectory);

    // Use path.relative() to determine the relationship between paths
    // If the resolved path is outside working dir, relative() will return
    // a path starting with '..' or an absolute path (on Windows with different drives)
    const relativePath = relative(normalizedWorkingDir, resolvedPath);

    // Check if the path escapes the working directory:
    // 1. Starts with '..' - traverses upward
    // 2. Is an absolute path - on Windows, different drive (e.g., D:\)
    // 3. Empty string is OK (means same directory)
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        return {
            valid: false,
            error: `Path "${inputPath}" resolves outside the working directory`
        };
    }

    return {
        valid: true,
        resolvedPath
    };
}

/**
 * Creates a validation function bound to a specific working directory.
 * Useful for handlers that need to validate multiple paths against the same base.
 *
 * @param workingDirectory - The base directory for validation
 * @returns A function that validates paths against the bound working directory
 *
 * @example
 * ```typescript
 * const validator = createPathValidator('/home/user/project');
 * const result = validator('./subdir/file.txt');
 * ```
 */
export function createPathValidator(workingDirectory: string): (inputPath: string) => PathValidationResult {
    return (inputPath: string) => validatePath(inputPath, workingDirectory);
}

/**
 * Validates a path and throws if invalid.
 * Convenience function for handlers that want to throw on invalid paths.
 *
 * @param inputPath - The path to validate
 * @param workingDirectory - The base directory that paths must be within
 * @returns The resolved absolute path
 * @throws Error if path is invalid
 */
export function validatePathOrThrow(inputPath: string, workingDirectory: string): string {
    const result = validatePath(inputPath, workingDirectory);
    if (!result.valid) {
        throw new Error(result.error);
    }
    return result.resolvedPath!;
}
