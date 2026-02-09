#!/usr/bin/env node
/**
 * Lint script to enforce @magic-agent/protocol ID accessor helper usage.
 *
 * This script detects direct access to session/machine ID fields on API update objects
 * and suggests using the helper functions from @magic-agent/protocol instead.
 *
 * INCORRECT (direct field access on update bodies):
 *   - update.body.sid → Use getSessionId(update.body)
 *   - data.body.sid → Use getSessionId(data.body)
 *   - update.body.machineId → Use getMachineId(update.body)
 *
 * CORRECT (using helpers):
 *   - getSessionId(update.body)
 *   - tryGetSessionId(update.body)
 *   - getMachineId(update.body)
 *   - getSessionIdFromEphemeral(ephemeral)
 *
 * The script specifically targets .body.sid and .body.machineId patterns
 * which indicate access on @magic-agent/protocol update objects.
 *
 * Usage:
 *   node scripts/lint-protocol-helpers.mjs [directory]
 *   node scripts/lint-protocol-helpers.mjs sources
 *   node scripts/lint-protocol-helpers.mjs src
 *
 * Exit codes:
 *   0 - No issues found
 *   1 - Issues found (warnings)
 *
 * Related: HAP-653 (helper functions), HAP-658 (this lint rule)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Patterns to detect direct field access on @magic-agent/protocol update objects
// These match the .body.sid and .body.machineId access patterns
const PATTERNS = [
    {
        // Matches: .body.sid, .body?.sid (for session updates)
        // Examples: update.body.sid, data.body?.sid, updateData.body.sid
        pattern: /\.body\??\.sid\b/g,
        message: 'Avoid direct .sid access on update body.',
        suggestion: 'Use getSessionId(update.body) from @magic-agent/protocol. See HAP-653.',
    },
    {
        // Matches: .body.machineId, .body?.machineId (for machine updates)
        // Examples: update.body.machineId, data.body?.machineId
        pattern: /\.body\??\.machineId\b/g,
        message: 'Avoid direct .machineId access on update body.',
        suggestion: 'Use getMachineId(update.body) from @magic-agent/protocol. See HAP-653.',
    },
]

// File extensions to check
const EXTENSIONS = new Set(['.ts', '.tsx'])

// Directories to skip
const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    '.expo',
    'ios',
    'android',
    '.wrangler',
    '__mocks__',
    '__testdata__',
])

// Files/directories that are allowed to use direct access
const ALLOWED_PATHS = [
    // The @magic-agent/protocol package itself - helpers need direct access
    'packages/schema/protocol',
    // Test files can have mock objects with direct construction
    '.test.ts',
    '.spec.ts',
    '__tests__',
    // Fixtures and mocks
    'fixtures',
    'mocks',
]

/**
 * Check if a path should be skipped
 * @param {string} name - Directory or file name
 * @returns {boolean}
 */
function shouldSkipDir(name) {
    return SKIP_DIRS.has(name) || name.startsWith('.')
}

/**
 * Check if a file path is allowed to use direct access
 * @param {string} filePath - Full file path
 * @returns {boolean}
 */
function isAllowedPath(filePath) {
    return ALLOWED_PATHS.some(allowed => filePath.includes(allowed))
}

/**
 * Get all TypeScript files in a directory recursively
 * @param {string} dir - Directory to scan
 * @returns {string[]} - Array of file paths
 */
function getFiles(dir) {
    const files = []

    try {
        const entries = readdirSync(dir)

        for (const entry of entries) {
            if (shouldSkipDir(entry)) continue

            const fullPath = join(dir, entry)
            const stat = statSync(fullPath)

            if (stat.isDirectory()) {
                files.push(...getFiles(fullPath))
            } else if (stat.isFile()) {
                const ext = entry.slice(entry.lastIndexOf('.'))
                if (EXTENSIONS.has(ext)) {
                    files.push(fullPath)
                }
            }
        }
    } catch {
        // Ignore permission errors
    }

    return files
}

/**
 * Check if a line is a comment or inside a string
 * @param {string} line - The line content
 * @param {number} matchIndex - The position of the match
 * @returns {boolean}
 */
function isInCommentOrString(line, matchIndex) {
    const trimmedLine = line.trim()

    // Skip comment lines
    if (trimmedLine.startsWith('*') || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
        return true
    }

    // Skip JSDoc examples
    if (trimmedLine.includes('@example') || trimmedLine.includes('@see')) {
        return true
    }

    // Check if match is after a comment marker on the same line
    const beforeMatch = line.slice(0, matchIndex)
    if (beforeMatch.includes('//') || beforeMatch.includes('/*')) {
        return true
    }

    // Skip if it's in a string literal (basic check - count quotes before match)
    const singleQuotes = (beforeMatch.match(/'/g) || []).length
    const doubleQuotes = (beforeMatch.match(/"/g) || []).length
    const backticks = (beforeMatch.match(/`/g) || []).length
    if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
        return true
    }

    return false
}

/**
 * Check if the line contains a helper function call (to avoid false positives)
 * @param {string} line - The line content
 * @returns {boolean}
 */
function containsHelperCall(line) {
    const helperFunctions = [
        'getSessionId',
        'tryGetSessionId',
        'getSessionIdFromEphemeral',
        'tryGetSessionIdFromEphemeral',
        'getMachineId',
        'tryGetMachineId',
        'getMachineIdFromEphemeral',
        'tryGetMachineIdFromEphemeral',
        'hasSessionId',
        'hasSessionIdEphemeral',
        'hasMachineId',
        'hasMachineIdEphemeral',
    ]
    return helperFunctions.some(fn => line.includes(fn))
}

/**
 * Check a single file for protocol helper issues
 * @param {string} filePath - Path to the file
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Array} - Array of issues found
 */
function checkFile(filePath, baseDir) {
    const issues = []

    // Skip allowed paths
    if (isAllowedPath(filePath)) {
        return issues
    }

    try {
        const content = readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Skip if line contains helper function call (likely already using helpers)
            if (containsHelperCall(line)) continue

            for (const { pattern, message, suggestion } of PATTERNS) {
                // Reset regex state
                pattern.lastIndex = 0

                let match
                while ((match = pattern.exec(line)) !== null) {
                    // Check if in comment or string
                    if (isInCommentOrString(line, match.index)) continue

                    issues.push({
                        file: relative(baseDir, filePath),
                        line: i + 1,
                        column: match.index + 1,
                        match: match[0],
                        message,
                        suggestion,
                    })
                }
            }
        }
    } catch {
        // Ignore read errors
    }

    return issues
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2)

    if (args.length === 0) {
        console.error('Usage: lint-protocol-helpers.mjs [directory]')
        console.error('Example: lint-protocol-helpers.mjs sources')
        console.error('Example: lint-protocol-helpers.mjs src')
        process.exit(1)
    }

    const targetDir = args[0]
    const baseDir = process.cwd()
    const fullPath = join(baseDir, targetDir)

    try {
        statSync(fullPath)
    } catch {
        console.error('Error: Directory not found: ' + targetDir)
        process.exit(1)
    }

    const files = getFiles(fullPath)
    const allIssues = []

    for (const file of files) {
        const issues = checkFile(file, baseDir)
        allIssues.push(...issues)
    }

    if (allIssues.length === 0) {
        console.log('✓ No @magic-agent/protocol ID accessor issues found')
        process.exit(0)
    }

    console.log('\n⚠️  Found ' + allIssues.length + ' @magic-agent/protocol ID accessor issue(s):\n')

    for (const issue of allIssues) {
        console.log('  ' + issue.file + ':' + issue.line + ':' + issue.column)
        console.log('    ' + issue.match + ' → ' + issue.message)
        console.log('    💡 ' + issue.suggestion)
        console.log()
    }

    console.log('Hint: Use helper functions from @magic-agent/protocol for type-safe ID extraction.')
    console.log('      Import: import { getSessionId, getMachineId } from "@magic-agent/protocol"')
    console.log('      See: HAP-653 for helper function documentation\n')

    // Exit with warning code
    process.exit(1)
}

main()
