#!/usr/bin/env node
/**
 * Lint script to enforce proper "GitHub" casing in TypeScript identifiers.
 *
 * This script checks for incorrect casing of "Github" in PascalCase identifiers
 * (types, interfaces, classes) where it should be "GitHub".
 *
 * CORRECT:
 *   - GitHubProfile (PascalCase with proper GitHub casing)
 *   - githubToken (camelCase - lowercase 'g' is correct)
 *   - GITHUB_API_KEY (SCREAMING_SNAKE_CASE - all caps is correct)
 *
 * INCORRECT:
 *   - GithubProfile (should be GitHubProfile)
 *   - GithubUser (should be GitHubUser)
 *
 * Usage:
 *   node scripts/lint-github-casing.mjs [directory]
 *   node scripts/lint-github-casing.mjs src
 *   node scripts/lint-github-casing.mjs sources
 *
 * Exit codes:
 *   0 - No issues found
 *   1 - Issues found (warnings)
 *
 * Related: HAP-470 (casing fix), HAP-501 (style guide), HAP-502 (this lint rule)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Pattern to match PascalCase identifiers containing "Github" (incorrect)
// This should be "GitHub" in PascalCase contexts
// Matches: GithubProfile, GithubUser, MyGithubService
// Does NOT match: githubToken (camelCase), GITHUB_KEY (SCREAMING_CASE)
const INCORRECT_GITHUB_PATTERN = /\b([A-Z][a-zA-Z0-9]*)?Github([A-Z][a-zA-Z0-9]*)?\b/g

// File extensions to check
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'])

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
])

/**
 * Check if a path should be skipped
 * @param {string} name - Directory or file name
 * @returns {boolean}
 */
function shouldSkip(name) {
  return SKIP_DIRS.has(name) || name.startsWith('.')
}

/**
 * Get all TypeScript/JavaScript files in a directory recursively
 * @param {string} dir - Directory to scan
 * @returns {string[]} - Array of file paths
 */
function getFiles(dir) {
  const files = []

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      if (shouldSkip(entry)) continue

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
 * Generate the corrected identifier
 * @param {string} match - The incorrect identifier
 * @returns {string} - The corrected identifier
 */
function getSuggestion(match) {
  return match.replace(/Github/g, 'GitHub')
}

/**
 * Check a single file for GitHub casing issues
 * @param {string} filePath - Path to the file
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Array} - Array of issues found
 */
function checkFile(filePath, baseDir) {
  const issues = []

  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      let match

      // Reset regex state
      INCORRECT_GITHUB_PATTERN.lastIndex = 0

      while ((match = INCORRECT_GITHUB_PATTERN.exec(line)) !== null) {
        const matchedText = match[0]

        // Skip if line starts with comment markers (JSDoc, block comment, single-line)
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('*') || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
          continue
        }

        // Skip if match is after a comment marker on the same line
        const beforeMatch = line.slice(0, match.index)
        if (beforeMatch.includes('//') || beforeMatch.includes('/*')) {
          continue
        }

        // Skip if it's in a string literal (basic check - count quotes before match)
        const singleQuotes = (beforeMatch.match(/'/g) || []).length
        const doubleQuotes = (beforeMatch.match(/"/g) || []).length
        const backticks = (beforeMatch.match(/`/g) || []).length
        if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
          continue
        }

        issues.push({
          file: relative(baseDir, filePath),
          line: i + 1,
          column: match.index + 1,
          match: matchedText,
          suggestion: getSuggestion(matchedText),
        })
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
    console.error('Usage: lint-github-casing.mjs [directory]')
    console.error('Example: lint-github-casing.mjs src')
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
    console.log('✓ No GitHub casing issues found')
    process.exit(0)
  }

  console.log('\n⚠️  Found ' + allIssues.length + ' GitHub casing issue(s):\n')

  for (const issue of allIssues) {
    console.log('  ' + issue.file + ':' + issue.line + ':' + issue.column)
    console.log('    "' + issue.match + '" should be "' + issue.suggestion + '"')
    console.log()
  }

  console.log('Hint: "GitHub" should always use capital H in PascalCase identifiers.')
  console.log('      Example: GitHubProfile, GitHubUser, MyGitHubService\n')

  // Exit with warning code (allows CI to continue but flags the issue)
  process.exit(1)
}

main()
