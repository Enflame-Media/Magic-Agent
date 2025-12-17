/**
 * Shared utilities for finding and resolving Claude Code CLI path
 * Used by both local and remote launchers
 *
 * Supports multiple installation methods:
 * 1. npm global: npm install -g @anthropic-ai/claude-code
 * 2. Homebrew: brew install claude-code
 * 3. Native installer:
 *    - macOS/Linux: curl -fsSL https://claude.ai/install.sh | bash
 *    - PowerShell:  irm https://claude.ai/install.ps1 | iex
 *    - Windows CMD: curl -fsSL https://claude.ai/install.cmd | cmd
 *
 * Security Note: This module uses execFileSync instead of execSync to prevent
 * shell injection vulnerabilities. All commands are hardcoded with no user input.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Safely execute a command and return output
 * Uses execFileSync for security (no shell injection possible)
 * @param {string} command - Command to execute
 * @param {string[]} args - Arguments array
 * @returns {string|null} Output string or null on error
 */
function safeExec(command, args = []) {
    try {
        return execFileSync(command, args, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
    } catch (e) {
        return null;
    }
}

/**
 * Safely resolve symlink or return path if it exists
 * @param {string} filePath - Path to resolve
 * @returns {string|null} Resolved path or null if not found
 */
function resolvePathSafe(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return fs.realpathSync(filePath);
    } catch (e) {
        // Symlink resolution failed, return original path
        return filePath;
    }
}

/**
 * Find path to npm globally installed Claude Code CLI
 * @returns {string|null} Path to cli.js or null if not found
 */
function findNpmGlobalCliPath() {
    const globalRoot = safeExec('npm', ['root', '-g']);
    if (!globalRoot) return null;

    const globalCliPath = path.join(globalRoot, '@anthropic-ai', 'claude-code', 'cli.js');
    if (fs.existsSync(globalCliPath)) {
        return globalCliPath;
    }
    return null;
}

/**
 * Find path to Homebrew installed Claude Code CLI
 * @returns {string|null} Path to cli.js or binary, or null if not found
 */
function findHomebrewCliPath() {
    if (process.platform !== 'darwin' && process.platform !== 'linux') {
        return null;
    }

    // Try to get Homebrew prefix via command first
    const brewPrefix = safeExec('brew', ['--prefix']);

    // Standard Homebrew locations to check
    const possiblePrefixes = [];
    if (brewPrefix) {
        possiblePrefixes.push(brewPrefix);
    }

    // Add standard locations based on platform
    if (process.platform === 'darwin') {
        // macOS: Intel (/usr/local) or Apple Silicon (/opt/homebrew)
        possiblePrefixes.push('/opt/homebrew', '/usr/local');
    } else if (process.platform === 'linux') {
        // Linux: system-wide or user installation
        const homeDir = os.homedir();
        possiblePrefixes.push('/home/linuxbrew/.linuxbrew', path.join(homeDir, '.linuxbrew'));
    }

    // Check each possible prefix
    for (const prefix of possiblePrefixes) {
        if (!fs.existsSync(prefix)) {
            continue;
        }

        // Homebrew installs claude-code as a Cask (binary) in Caskroom
        const caskroomPath = path.join(prefix, 'Caskroom', 'claude-code');
        if (fs.existsSync(caskroomPath)) {
            const found = findLatestVersionBinary(caskroomPath, 'claude');
            if (found) return found;
        }

        // Also check Cellar (for formula installations, though claude-code is usually a Cask)
        const cellarPath = path.join(prefix, 'Cellar', 'claude-code');
        if (fs.existsSync(cellarPath)) {
            // Cellar has different structure - check for cli.js in libexec
            try {
                const entries = fs.readdirSync(cellarPath);
                if (entries.length > 0) {
                    const sorted = entries.sort((a, b) => compareVersions(b, a));
                    const latestVersion = sorted[0];
                    const cliPath = path.join(cellarPath, latestVersion, 'libexec', 'lib', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
                    if (fs.existsSync(cliPath)) {
                        return cliPath;
                    }
                }
            } catch (e) {
                // Directory read failed
            }
        }

        // Check bin directory for symlink (most reliable)
        const binPath = path.join(prefix, 'bin', 'claude');
        const resolvedBinPath = resolvePathSafe(binPath);
        if (resolvedBinPath) return resolvedBinPath;
    }

    return null;
}

/**
 * Find path to native installer Claude Code CLI
 *
 * Installation locations:
 * - macOS/Linux: ~/.local/bin/claude (symlink) -> ~/.local/share/claude/versions/<version>
 * - Windows: %LOCALAPPDATA%\Claude\ or %USERPROFILE%\.claude\
 * - Legacy: ~/.claude/local/
 *
 * @returns {string|null} Path to cli.js or binary, or null if not found
 */
function findNativeInstallerCliPath() {
    const homeDir = os.homedir();

    // Windows-specific locations
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');

        // Check %LOCALAPPDATA%\Claude\
        const windowsClaudePath = path.join(localAppData, 'Claude');
        if (fs.existsSync(windowsClaudePath)) {
            // Check for versions directory
            const versionsDir = path.join(windowsClaudePath, 'versions');
            if (fs.existsSync(versionsDir)) {
                const found = findLatestVersionBinary(versionsDir);
                if (found) return found;
            }

            // Check for claude.exe directly
            const exePath = path.join(windowsClaudePath, 'claude.exe');
            if (fs.existsSync(exePath)) {
                return exePath;
            }

            // Check for cli.js
            const cliPath = path.join(windowsClaudePath, 'cli.js');
            if (fs.existsSync(cliPath)) {
                return cliPath;
            }
        }

        // Check %USERPROFILE%\.claude\ (alternative Windows location)
        const dotClaudePath = path.join(homeDir, '.claude');
        if (fs.existsSync(dotClaudePath)) {
            const versionsDir = path.join(dotClaudePath, 'versions');
            if (fs.existsSync(versionsDir)) {
                const found = findLatestVersionBinary(versionsDir);
                if (found) return found;
            }

            const exePath = path.join(dotClaudePath, 'claude.exe');
            if (fs.existsSync(exePath)) {
                return exePath;
            }
        }

        // Try 'where' command as fallback for Windows
        const wherePath = safeExec('where', ['claude']);
        if (wherePath) {
            const firstPath = wherePath.split('\n')[0].trim();
            if (firstPath && fs.existsSync(firstPath)) {
                return firstPath;
            }
        }
    }

    // Check ~/.local/bin/claude symlink (most common location on macOS/Linux)
    const localBinPath = path.join(homeDir, '.local', 'bin', 'claude');
    const resolvedLocalBinPath = resolvePathSafe(localBinPath);
    if (resolvedLocalBinPath) return resolvedLocalBinPath;

    // Check ~/.local/share/claude/versions/ (native installer location)
    const versionsDir = path.join(homeDir, '.local', 'share', 'claude', 'versions');
    if (fs.existsSync(versionsDir)) {
        const found = findLatestVersionBinary(versionsDir);
        if (found) return found;
    }

    // Check ~/.claude/local/ (older installation method)
    const nativeBasePath = path.join(homeDir, '.claude', 'local');
    if (fs.existsSync(nativeBasePath)) {
        // Look for the cli.js in the node_modules structure
        const cliPath = path.join(nativeBasePath, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
        if (fs.existsSync(cliPath)) {
            return cliPath;
        }

        // Alternative: direct cli.js in the installation
        const directCliPath = path.join(nativeBasePath, 'cli.js');
        if (fs.existsSync(directCliPath)) {
            return directCliPath;
        }
    }

    // Try 'which' command as fallback for Unix-like systems
    if (process.platform !== 'win32') {
        const whichPath = safeExec('which', ['claude']);
        if (whichPath && fs.existsSync(whichPath)) {
            return resolvePathSafe(whichPath) || whichPath;
        }
    }

    return null;
}

/**
 * Helper to find the latest version binary in a versions directory
 * @param {string} versionsDir - Path to versions directory
 * @param {string} [binaryName] - Optional binary name to look for inside version directory
 * @returns {string|null} Path to binary or null
 */
function findLatestVersionBinary(versionsDir, binaryName = null) {
    try {
        const entries = fs.readdirSync(versionsDir);
        if (entries.length === 0) return null;

        // Sort using semver comparison (descending)
        const sorted = entries.sort((a, b) => compareVersions(b, a));
        const latestVersion = sorted[0];
        const versionPath = path.join(versionsDir, latestVersion);

        // Check if it's a file (binary) or directory
        const stat = fs.statSync(versionPath);
        if (stat.isFile()) {
            return versionPath;
        } else if (stat.isDirectory()) {
            // If specific binary name provided, check for it
            if (binaryName) {
                const binaryPath = path.join(versionPath, binaryName);
                if (fs.existsSync(binaryPath)) {
                    return binaryPath;
                }
            }
            // Check for executable or cli.js inside directory
            const exePath = path.join(versionPath, process.platform === 'win32' ? 'claude.exe' : 'claude');
            if (fs.existsSync(exePath)) {
                return exePath;
            }
            const cliPath = path.join(versionPath, 'cli.js');
            if (fs.existsSync(cliPath)) {
                return cliPath;
            }
        }
    } catch (e) {
        // Directory read failed
    }
    return null;
}

/**
 * Find path to globally installed Claude Code CLI
 * Checks multiple installation methods in order of preference:
 * 1. npm global (highest priority)
 * 2. Homebrew
 * 3. Native installer
 * @returns {{path: string, source: string}|null} Path and source, or null if not found
 */
function findGlobalClaudeCliPath() {
    // Check npm global first (highest priority)
    const npmPath = findNpmGlobalCliPath();
    if (npmPath) return { path: npmPath, source: 'npm' };

    // Check Homebrew installation
    const homebrewPath = findHomebrewCliPath();
    if (homebrewPath) return { path: homebrewPath, source: 'Homebrew' };

    // Check native installer
    const nativePath = findNativeInstallerCliPath();
    if (nativePath) return { path: nativePath, source: 'native installer' };

    return null;
}

/**
 * Get version from Claude Code package.json
 * @param {string} cliPath - Path to cli.js
 * @returns {string|null} Version string or null
 */
function getVersion(cliPath) {
    try {
        // For .js files, look for package.json in same or parent directory
        const pkgPath = path.join(path.dirname(cliPath), 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            return pkg.version;
        }
        // Try parent directory (common for node_modules structure)
        const parentPkgPath = path.join(path.dirname(path.dirname(cliPath)), 'package.json');
        if (fs.existsSync(parentPkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(parentPkgPath, 'utf8'));
            if (pkg.name === '@anthropic-ai/claude-code') {
                return pkg.version;
            }
        }
    } catch (e) {
        // Ignore errors
    }
    return null;
}

/**
 * Parse version string into numeric parts
 * Handles semver-like strings (e.g., "1.2.3", "1.2.3-beta.1")
 * @param {string} version - Version string
 * @returns {number[]} Array of numeric parts [major, minor, patch]
 */
function parseVersion(version) {
    if (!version || typeof version !== 'string') {
        return [0, 0, 0];
    }
    // Remove any pre-release suffix (e.g., "-beta.1")
    const basePart = version.split('-')[0];
    const parts = basePart.split('.').map(p => {
        const num = parseInt(p, 10);
        return Number.isNaN(num) ? 0 : num;
    });
    // Ensure we have at least 3 parts
    while (parts.length < 3) {
        parts.push(0);
    }
    return parts.slice(0, 3);
}

/**
 * Compare semver versions
 * Fixed to handle non-semver strings properly (returns 0 instead of NaN)
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {number} 1 if a > b, -1 if a < b, 0 if equal or incomparable
 */
function compareVersions(a, b) {
    const partsA = parseVersion(a);
    const partsB = parseVersion(b);

    for (let i = 0; i < 3; i++) {
        if (partsA[i] > partsB[i]) return 1;
        if (partsA[i] < partsB[i]) return -1;
    }
    return 0;
}

/**
 * Get the CLI path to use (global installation)
 * @returns {string} Path to cli.js
 * @throws {Error} If no global installation found
 */
function getClaudeCliPath() {
    const result = findGlobalClaudeCliPath();
    if (!result) {
        console.error('\n\x1b[1m\x1b[33mClaude Code is not installed\x1b[0m\n');
        console.error('Please install Claude Code using one of these methods:\n');
        console.error('\x1b[1mOption 1 - npm (recommended, highest priority):\x1b[0m');
        console.error('  \x1b[36mnpm install -g @anthropic-ai/claude-code\x1b[0m\n');
        console.error('\x1b[1mOption 2 - Homebrew (macOS/Linux):\x1b[0m');
        console.error('  \x1b[36mbrew install claude-code\x1b[0m\n');
        console.error('\x1b[1mOption 3 - Native installer:\x1b[0m');
        console.error('  \x1b[90mmacOS/Linux:\x1b[0m  \x1b[36mcurl -fsSL https://claude.ai/install.sh | bash\x1b[0m');
        console.error('  \x1b[90mPowerShell:\x1b[0m   \x1b[36mirm https://claude.ai/install.ps1 | iex\x1b[0m');
        console.error('  \x1b[90mWindows CMD:\x1b[0m  \x1b[36mcurl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd\x1b[0m\n');
        console.error('\x1b[90mNote: If multiple installations exist, npm takes priority.\x1b[0m\n');
        process.exit(1);
    }

    const version = getVersion(result.path);
    const versionStr = version ? ` v${version}` : '';
    console.error(`\x1b[90mUsing Claude Code${versionStr} from ${result.source}\x1b[0m`);

    return result.path;
}

/**
 * Run Claude CLI, handling both JavaScript and binary files
 * Added proper error handling for dynamic import to prevent unhandled promise rejections
 * @param {string} cliPath - Path to CLI (from getClaudeCliPath)
 */
function runClaudeCli(cliPath) {
    const { pathToFileURL } = require('url');
    const { spawn } = require('child_process');

    // Check if it's a JavaScript file (.js or .cjs) or a binary file
    const isJsFile = cliPath.endsWith('.js') || cliPath.endsWith('.cjs') || cliPath.endsWith('.mjs');

    if (isJsFile) {
        // JavaScript file - use import to keep interceptors working
        const importUrl = pathToFileURL(cliPath).href;
        import(importUrl).catch((error) => {
            console.error('\x1b[31mFailed to load Claude Code CLI:\x1b[0m', error.message);
            if (error.code === 'ERR_MODULE_NOT_FOUND') {
                console.error('\x1b[90mThe Claude Code installation may be corrupted. Try reinstalling.\x1b[0m');
            }
            process.exit(1);
        });
    } else {
        // Binary file (e.g., Homebrew installation) - spawn directly
        // Note: Interceptors won't work with binary files, but that's acceptable
        // as binary files are self-contained and don't need interception
        const args = process.argv.slice(2);
        const child = spawn(cliPath, args, {
            stdio: 'inherit',
            env: process.env,
            shell: process.platform === 'win32' // Use shell on Windows for proper path handling
        });
        child.on('error', (error) => {
            console.error('\x1b[31mFailed to start Claude Code:\x1b[0m', error.message);
            process.exit(1);
        });
        child.on('exit', (code) => {
            process.exit(code || 0);
        });
    }
}

module.exports = {
    findGlobalClaudeCliPath,
    findNpmGlobalCliPath,
    findHomebrewCliPath,
    findNativeInstallerCliPath,
    getVersion,
    parseVersion,
    compareVersions,
    getClaudeCliPath,
    runClaudeCli
};
