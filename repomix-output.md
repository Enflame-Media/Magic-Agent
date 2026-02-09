This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where comments have been removed, empty lines have been removed, content has been formatted for parsing in markdown style, content has been compressed (code blocks are separated by ⋮---- delimiter).

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Code comments have been removed from supported file types
- Empty lines have been removed from all files
- Content has been formatted for parsing in markdown style
- Content has been compressed - code blocks are separated by ⋮---- delimiter
- Files are sorted by Git change count (files with more changes are at the bottom)
- Git logs (50 commits) are included to show development patterns

# Directory Structure
```
.github/
  workflows/
    bundle-size.yml
    codeql.yml
    shared-types-validation.yml
  dependabot.yml
docs/
  errors/
    AUTHENTICATION.md
    CLI.md
    CONNECTION.md
    DAEMON.md
    ENCRYPTION.md
    README.md
    SESSIONS.md
  API-RATE-LIMITS.md
  API-VERSIONING.md
  ENCRYPTION-ARCHITECTURE.md
  RFC-SHARED-TYPES-PACKAGE.md
packages/
  @happy/
    errors/
      src/
        index.test.ts
        index.ts
        safeError.ts
      CLAUDE.md
      package.json
      package.tgz
      tsconfig.json
      tsup.config.ts
    lint-rules/
      src/
        rules/
          github-casing.js
          github-casing.test.js
          protocol-helpers.js
          protocol-helpers.test.js
        index.js
      CLAUDE.md
      package.json
      vitest.config.js
    protocol/
      coverage/
        src/
          ephemeral/
            events.ts.html
            index.html
            index.ts.html
          updates/
            account.ts.html
            artifact.ts.html
            index.html
            index.ts.html
            machine.ts.html
            message.ts.html
            misc.ts.html
            session.ts.html
          common.ts.html
          constraints.ts.html
          helpers.ts.html
          index.html
          index.ts.html
          mcp.ts.html
          payloads.ts.html
        base.css
        block-navigation.js
        clover.xml
        coverage-final.json
        favicon.png
        index.html
        prettify.css
        prettify.js
        sort-arrow-sprite.png
        sorter.js
      scripts/
        extract-schemas.ts
        generate-swift.ts
      src/
        ephemeral/
          events.ts
          index.ts
        updates/
          account.ts
          artifact.ts
          index.ts
          machine.ts
          message.ts
          misc.ts
          session.ts
        common.test.ts
        common.ts
        constraints.ts
        helpers.test.ts
        helpers.ts
        index.ts
        mcp.ts
        payloads.ts
        sharing.test.ts
        sharing.ts
        usageLimits.test.ts
        usageLimits.ts
      CLAUDE.md
      package.json
      README.md
      tsconfig.json
      tsup.config.ts
scripts/
  compare-schemas.ts
  lint-github-casing.mjs
  lint-protocol-helpers.mjs
.gitignore
.yarnrc.yml
AGENTS.md
CLAUDE.md
knip.json
package.json
README.md
wget-log
```

# Files

## File: AGENTS.md
````markdown
# Repository Guidelines

## Project Structure & Module Organization
- Root workspace config lives in `package.json` with Yarn workspaces.
- Shared packages live in `packages/@happy/`:
  - `packages/@magic-agent/protocol/` for Zod schemas and shared API types.
  - `packages/@magic-agent/errors/` for AppError utilities.
  - `packages/@happy/lint-rules/` for custom ESLint/Oxlint rules.
- Product apps and services are top-level directories (`happy-app/`, `happy-cli/`, `happy-server-workers/`, `happy-admin/`, `happy-admin-api/`).
- `happy-cli/` is the Node.js CLI wrapper (TypeScript, ESM).
- `happy-app/` is the Expo React Native mobile/web client.
- `happy-server-workers/` is the Cloudflare Workers backend.
- `happy-vue/` is a separate Yarn workspace for Vue web + mobile clients.
- `happy-macos/` is an Xcode project for the native SwiftUI macOS app.
- Cross-project documentation lives in `docs/`.
- Each project has its own `CLAUDE.md` with local conventions; consult it before making changes there.

## Build, Test, and Development Commands
- `yarn install` installs workspace dependencies (Yarn 4 via Corepack).
- `yarn build:protocol` builds `@magic-agent/protocol`.
- `yarn build:errors` builds `@magic-agent/errors`.
- `yarn typecheck:protocol` or `yarn typecheck:errors` runs TypeScript checks.
- `yarn workspace @magic-agent/protocol test` runs protocol tests (Vitest).
- `yarn workspace @magic-agent/errors test` runs errors tests (Vitest).
- `yarn workspace @happy/lint-rules test` runs lint-rules tests (Vitest).

## Project-Specific Commands
- `happy-cli/`: `yarn dev`, `yarn build`, `yarn test`, `yarn lint`.
- `happy-app/`: `yarn start`, `yarn ios` or `yarn android`, `yarn test`, `yarn typecheck`.
- `happy-server-workers/`: `yarn dev`, `yarn deploy:dev`, `yarn deploy:prod`, `yarn db:migrate:local`.
- `happy-vue/`: `yarn dev:web`, `yarn dev:mobile`, `yarn build`, `yarn lint`, `yarn test`.
- `happy-macos/`: `xcodebuild build -scheme Happy`, `xcodebuild test -scheme Happy`, or open `Happy.xcodeproj` in Xcode.

## Coding Style & Naming Conventions
- TypeScript/ESM is the default in shared packages.
- Indentation is 4 spaces in TypeScript and JSON files; match existing file style.
- Use existing naming patterns in each package (e.g., `GitHub` casing rules are enforced by lint rules).
- Prefer small, focused modules; keep shared types in `@magic-agent/protocol` instead of duplicating across projects.

## Testing Guidelines
- Tests are co-located next to source (`src/*.test.ts`, `src/rules/*.test.js`).
- Use Vitest for unit tests in shared packages.
- When updating shared types or errors, add or adjust tests in the same package.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and often follow Conventional Commits (e.g., `chore: ...`, `fix: ...`, `feat: ...`).
- PRs should include a clear summary, linked issue (if applicable), and testing notes.
- Include screenshots or clips for UI changes in `happy-app/` or `happy-admin/`.

## Security & Configuration Tips
- Never commit secrets or real `.env` files.
- Use project-specific env templates (`.env.example`, `.env.dev`) and follow each project’s `CLAUDE.md` for configuration details.
````

## File: wget-log
````
Will not apply HSTS. The HSTS database must be a regular and non-world-writable file.
ERROR: could not open HSTS store at '/var/services/homes/TheJACKedViking/.wget-hsts'. HSTS will be disabled.
--2026-01-06 18:15:43--  http://localhost:1455/auth/callback?code=ac_zMuWXFOxGF2LbvT5UZZE1Oxt9GuKdOqgKmipyoQmujk.18rFVid4lI1rDOznXatyiUhUMYneAdzZ89clz6ry6pA
Resolving localhost (localhost)... 127.0.0.1
Connecting to localhost (localhost)|127.0.0.1|:1455... connected.
HTTP request sent, awaiting response... 400 Bad Request
2026-01-06 18:15:43 ERROR 400: Bad Request.
````

## File: .github/workflows/codeql.yml
````yaml
name: "CodeQL Advanced"
on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  schedule:
    - cron: '34 10 * * 6'
jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ${{ (matrix.language == 'swift' && 'macos-latest') || 'ubuntu-latest' }}
    permissions:
      security-events: write
      packages: read
      actions: read
      contents: read
    strategy:
      fail-fast: false
      matrix:
        include:
        - language: actions
          build-mode: none
        - language: javascript-typescript
          build-mode: none
    steps:
    - name: Checkout repository
      uses: actions/checkout@v6
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v4
      with:
        languages: ${{ matrix.language }}
        build-mode: ${{ matrix.build-mode }}
    - name: Run manual build steps
      if: matrix.build-mode == 'manual'
      shell: bash
      run: |
        echo 'If you are using a "manual" build mode for one or more of the' \
          'languages you are analyzing, replace this with the commands to build' \
          'your code, for example:'
        echo '  make bootstrap'
        echo '  make release'
        exit 1
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v4
      with:
        category: "/language:${{matrix.language}}"
````

## File: .github/dependabot.yml
````yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/Denver"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    commit-message:
      prefix: "chore(deps)"
    groups:
      minor-and-patch:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/Denver"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "github-actions"
    commit-message:
      prefix: "ci(deps)"
````

## File: docs/errors/AUTHENTICATION.md
````markdown
# Authentication Errors

This guide covers errors related to the authentication flow between the Happy CLI and mobile app.

---

## auth-failed

**Error Code**: `AUTH_FAILED`

### Symptoms

- CLI shows "Authentication failed" or "Auth failed"
- QR code pairing doesn't complete
- Session expires unexpectedly
- Mobile app shows "connection rejected"

### Common Causes

1. **QR code expired** - QR codes have a limited validity window
2. **Clock skew** - Significant time difference between devices
3. **Token expired** - Authentication token has expired
4. **Revoked access** - Access was revoked from another device

### Solutions

#### 1. Generate a fresh QR code

```bash
# Stop any existing session
happy stop

# Start fresh authentication
happy auth
```

Scan the new QR code promptly (within 5 minutes).

#### 2. Check device clocks

Both your computer and mobile device should have accurate time:

```bash
# Check system time on your computer
date

# Compare with actual time at time.is
```

On mobile:
- iOS: Settings > General > Date & Time > Set Automatically
- Android: Settings > System > Date & time > Automatic

#### 3. Re-authenticate from scratch

If the issue persists:

```bash
# Clear local auth state
rm -rf ~/.happy/auth/

# Start fresh
happy auth
```

#### 4. Check for multiple devices

If you have multiple computers paired:

1. Open the Happy mobile app
2. Go to Settings > Linked Devices
3. Remove stale device entries
4. Re-authenticate on your computer

### Related Errors

- [TOKEN_EXCHANGE_FAILED](#token-exchange-failed) - Token exchange step failed
- [ENCRYPTION_ERROR](ENCRYPTION.md#encryption-error) - Key exchange issues

---

## token-exchange-failed

**Error Code**: `TOKEN_EXCHANGE_FAILED`

### Symptoms

- Error occurs after QR code scan
- Mobile app shows success but CLI shows error
- Message mentions "token exchange failed"

### Common Causes

1. **Network interruption** - Connection dropped during exchange
2. **Server-side issue** - Temporary server error during processing
3. **Concurrent auth attempts** - Multiple auth flows interfering

### Solutions

#### 1. Retry the authentication

The token exchange is a brief network operation that may fail transiently:

```bash
# Cancel current attempt (Ctrl+C)
# Then start fresh
happy auth
```

#### 2. Ensure stable network

Both devices (computer and mobile) need network access during the exchange:

- Avoid switching WiFi networks mid-authentication
- Ensure mobile data or WiFi is stable on phone
- Disable VPN temporarily if issues persist

#### 3. Check for interference

Close other Happy CLI instances that might be running:

```bash
# Check for running processes
pgrep -f happy

# Kill any stale processes
pkill -f "happy daemon"

# Start fresh
happy auth
```

#### 4. Verify mobile app version

Ensure your mobile app is up to date:

- iOS: Check App Store for updates
- Android: Check Play Store for updates

Outdated apps may have incompatible token exchange protocols.

### Technical Details

The token exchange flow:

1. CLI generates a keypair and displays QR code
2. Mobile app scans QR and initiates challenge
3. Server facilitates the cryptographic exchange
4. Both sides derive shared secrets for E2E encryption

Failure at step 3 typically indicates a transient server issue.

### Related Errors

- [AUTH_FAILED](#auth-failed) - General authentication failure
- [CONNECT_FAILED](CONNECTION.md#connect-failed) - Network connectivity issues

---

## When to Contact Support

Contact support if:

- You've tried all solutions and still can't authenticate
- You see this error consistently across multiple devices
- Your organization uses custom authentication (SSO)

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- Which step fails (QR generation, scanning, or exchange)
- Mobile app version and OS version
- CLI version (`happy --version`)
````

## File: docs/errors/CLI.md
````markdown
# CLI Errors

This guide covers general operational errors in the Happy CLI.

---

## version-mismatch

**Error Code**: `VERSION_MISMATCH`

### Symptoms

- CLI shows "Version mismatch" or "Incompatible version"
- Warning about client/server version compatibility
- Features not working as expected

### Common Causes

1. **Outdated CLI** - Your CLI version is behind the server
2. **Server update** - Server was updated and requires newer client
3. **Beta/nightly versions** - Using unstable versions with production server

### Solutions

#### 1. Check current version

```bash
# Show CLI version
happy --version

# Compare with latest release
npm view @anthropic-ai/happy version
```

#### 2. Update the CLI

```bash
# Update to latest stable version
npm update -g @anthropic-ai/happy

# Or reinstall completely
npm uninstall -g @anthropic-ai/happy
npm install -g @anthropic-ai/happy
```

#### 3. Verify after update

```bash
# Confirm new version
happy --version

# Test connectivity
happy status
```

#### 4. Clear npm cache (if update fails)

```bash
# Clear npm cache
npm cache clean --force

# Retry installation
npm install -g @anthropic-ai/happy
```

### Version Compatibility

| CLI Version | Minimum Server Version | Notes |
|-------------|------------------------|-------|
| 1.x.x | 1.0.0 | Initial release |
| 2.x.x | 2.0.0 | Breaking API changes |

The CLI will warn you if versions are incompatible but will attempt to continue.

### Related Errors

- [REQUEST_CONFIG_ERROR](CONNECTION.md#request-config-error) - API format issues

---

## lock-acquisition-failed

**Error Code**: `LOCK_ACQUISITION_FAILED`

### Symptoms

- CLI shows "Could not acquire lock"
- Error when starting daemon or running commands
- Message mentions lock file or resource contention

### Common Causes

1. **Another instance running** - Happy CLI already running in another terminal
2. **Stale lock file** - Previous process crashed leaving lock behind
3. **File system issues** - NFS or network drives with locking problems

### Solutions

#### 1. Check for running instances

```bash
# List Happy processes
pgrep -f happy

# Check daemon status
happy status
```

#### 2. Remove stale lock file

```bash
# Check for lock file
ls -la ~/.happy/*.lock

# If daemon isn't running but lock exists, remove it
rm ~/.happy/daemon.lock
```

#### 3. Force stop and restart

```bash
# Force kill any Happy processes
pkill -9 -f "happy daemon"

# Remove lock files
rm -f ~/.happy/*.lock

# Start fresh
happy start
```

#### 4. Check file system

If on network drive or NFS:

```bash
# Check if ~/.happy is on a network mount
df ~/.happy/

# Consider moving to local storage
export HAPPY_HOME_DIR=/tmp/happy
```

### Related Errors

- [DAEMON_START_FAILED](DAEMON.md#start-failed) - Daemon fails to start
- [DIRECTORY_REQUIRED](#directory-required) - Required directory issues

---

## directory-required

**Error Code**: `DIRECTORY_REQUIRED`

### Symptoms

- CLI shows "Directory required" or "Directory does not exist"
- Operations fail due to missing directory
- First-time setup issues

### Common Causes

1. **First run** - Happy hasn't been initialized yet
2. **Deleted directory** - `~/.happy/` was manually removed
3. **Permission issues** - Cannot create required directories

### Solutions

#### 1. Initialize Happy

```bash
# Run initialization
happy init

# Or simply run any command - directories auto-create
happy status
```

#### 2. Manually create directory

```bash
# Create the home directory
mkdir -p ~/.happy

# Set correct permissions
chmod 700 ~/.happy
```

#### 3. Check home directory location

```bash
# See where Happy expects its files
echo ${HAPPY_HOME_DIR:-~/.happy}

# If using custom location, ensure it exists
mkdir -p $HAPPY_HOME_DIR
```

#### 4. Fix permissions

```bash
# Ensure you own the directory
sudo chown -R $(whoami) ~/.happy/

# Set appropriate permissions
chmod -R 700 ~/.happy/
```

### Expected Directory Structure

```
~/.happy/
├── auth/           # Authentication tokens
├── config.json     # CLI configuration
├── daemon.json     # Daemon state
├── logs/           # Log files
└── sessions/       # Session cache
```

### Related Errors

- [LOCK_ACQUISITION_FAILED](#lock-acquisition-failed) - File locking issues
- [RESOURCE_NOT_FOUND](#resource-not-found) - Missing files

---

## resource-not-found

**Error Code**: `RESOURCE_NOT_FOUND`

### Symptoms

- CLI shows "Resource not found"
- Requested file, session, or entity doesn't exist
- Operation cannot complete due to missing resource

### Common Causes

1. **Invalid identifier** - Typo in session ID, file path, etc.
2. **Resource deleted** - Resource existed but was removed
3. **Sync not complete** - Resource exists on server but not locally cached
4. **Wrong account** - Logged into different account than resource owner

### Solutions

#### 1. Verify the resource exists

```bash
# For sessions
happy sessions list

# For local files
ls -la ~/.happy/
```

#### 2. Check identifier format

Ensure you're using the correct format:
- Session IDs: UUID format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- File paths: Absolute or relative to current directory

#### 3. Force sync

```bash
# Refresh local cache from server
happy sync --force
```

#### 4. Verify authentication

```bash
# Check which account you're logged into
happy status

# Re-authenticate if needed
happy auth
```

### Related Errors

- [SESSION_NOT_FOUND](SESSIONS.md#session-not-found) - Session-specific not found
- [DIRECTORY_REQUIRED](#directory-required) - Required directory missing

---

## When to Contact Support

Contact support if:

- Errors persist after trying all documented solutions
- You encounter an error code not listed in this documentation
- You suspect a bug in the CLI

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- CLI version (`happy --version`)
- Node.js version (`node --version`)
- Operating system and version
- Steps to reproduce the issue
````

## File: docs/errors/CONNECTION.md
````markdown
# Connection Errors

This guide covers network and connectivity errors when communicating with the Happy server.

---

## connect-failed

**Error Code**: `CONNECT_FAILED`

### Symptoms

- CLI shows "Failed to connect to server"
- Connection times out during initial handshake
- Error appears when starting a session or during authentication

### Common Causes

1. **Server is unreachable** - The Happy server may be down or experiencing issues
2. **Network connectivity** - Firewall, proxy, or DNS blocking outbound connections
3. **Incorrect server URL** - The `HAPPY_SERVER_URL` environment variable points to wrong address

### Solutions

#### 1. Check server status

Verify the server is responding:

```bash
# Check server health endpoint
curl -I https://api.happy-servers.com/health

# Expected: HTTP 200 OK
```

#### 2. Verify your network connection

```bash
# Test basic connectivity
ping api.happy-servers.com

# Check DNS resolution
nslookup api.happy-servers.com
```

#### 3. Check environment configuration

```bash
# View current server URL
echo $HAPPY_SERVER_URL

# The default is usually correct; only set this if instructed
```

#### 4. Check firewall/proxy settings

If behind a corporate firewall or proxy:

- Ensure HTTPS (port 443) outbound connections are allowed
- Check if your proxy requires authentication
- Try connecting from a different network to isolate the issue

### Related Errors

- [NO_RESPONSE](#no-response) - Server reachable but not responding
- [REQUEST_CONFIG_ERROR](#request-config-error) - Configuration issue with request

---

## no-response

**Error Code**: `NO_RESPONSE`

### Symptoms

- CLI hangs then shows "No response from server"
- Request sent successfully but no reply received
- Timeout after extended waiting period

### Common Causes

1. **Server overload** - Server is processing too many requests
2. **Network instability** - Packets being dropped mid-connection
3. **Long-running operation** - Request requires more processing time than allowed

### Solutions

#### 1. Retry the operation

Transient issues often resolve on retry:

```bash
# Simply run your command again
happy <your-command>
```

#### 2. Check for server status

Visit the Happy status page or check social channels for any reported outages.

#### 3. Check your connection stability

```bash
# Test for packet loss
ping -c 10 api.happy-servers.com

# Look for packet loss percentage - should be 0%
```

#### 4. Try with verbose logging

```bash
DEBUG=1 happy <your-command>
```

This may reveal more details about where the request is stalling.

### Related Errors

- [CONNECT_FAILED](#connect-failed) - Cannot establish initial connection
- [PROCESS_TIMEOUT](DAEMON.md#process-timeout) - Local process timeout

---

## request-config-error

**Error Code**: `REQUEST_CONFIG_ERROR`

### Symptoms

- Error immediately on sending request
- Message indicates "Request configuration error"
- No network activity occurs

### Common Causes

1. **Invalid URL format** - Malformed `HAPPY_SERVER_URL`
2. **Missing required headers** - Internal configuration issue
3. **Incompatible client version** - CLI version mismatch

### Solutions

#### 1. Check environment variables

```bash
# Verify URL format is correct
echo $HAPPY_SERVER_URL

# Should be a valid HTTPS URL like:
# https://api.happy-servers.com
```

#### 2. Reset to defaults

```bash
# Unset custom server URL to use defaults
unset HAPPY_SERVER_URL

# Try your command again
happy <your-command>
```

#### 3. Update the CLI

```bash
# Check current version
happy --version

# Update to latest
npm update -g @anthropic-ai/happy
```

#### 4. Clear local state

If issues persist after update:

```bash
# Remove cached configuration (data is preserved)
rm -rf ~/.happy/config.json

# Re-run authentication
happy auth
```

### Related Errors

- [CONNECT_FAILED](#connect-failed) - Cannot connect to server
- [VERSION_MISMATCH](CLI.md#version-mismatch) - Client/server version incompatibility

---

## When to Contact Support

Contact support if:

- Server health check passes but you still can't connect
- Error persists across multiple networks/devices
- You see this error intermittently with no clear pattern

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- Output of `happy --version`
- Network environment (home, corporate, VPN)
- Contents of `~/.happy/logs/` (latest log file)
````

## File: docs/errors/DAEMON.md
````markdown
# Daemon Errors

This guide covers errors related to the Happy background daemon, which manages session sync and communication.

---

## start-failed

**Error Code**: `DAEMON_START_FAILED`

### Symptoms

- CLI shows "Failed to start daemon" or "Daemon start failed"
- `happy start` command fails immediately
- Background process doesn't launch

### Common Causes

1. **Another daemon already running** - Only one daemon can run at a time
2. **Port conflict** - Required port is in use by another application
3. **Permission issues** - Cannot write to required directories
4. **Node.js issues** - Corrupted Node.js installation or missing dependencies

### Solutions

#### 1. Check for existing daemon

```bash
# Check if daemon is already running
happy status

# If running, stop it first
happy stop

# Then start fresh
happy start
```

#### 2. Kill orphaned processes

If `happy stop` doesn't work:

```bash
# Find happy processes
pgrep -f "happy daemon"

# Kill them if found
pkill -f "happy daemon"

# Wait a moment, then start
sleep 2
happy start
```

#### 3. Check directory permissions

```bash
# Ensure ~/.happy directory is writable
ls -la ~/.happy/

# If permission issues, fix them
chmod -R u+rw ~/.happy/
```

#### 4. Check available ports

The daemon uses a local port for IPC. Check if it's available:

```bash
# Check if the port is in use (default port varies)
lsof -i :3847

# If something is using it, you may need to stop that process
```

#### 5. Verify Node.js installation

```bash
# Check Node.js version
node --version

# Should be v18.0.0 or higher
# If issues, reinstall Node.js
```

#### 6. Clear daemon state

```bash
# Remove daemon lock and state files
rm -f ~/.happy/daemon.lock
rm -f ~/.happy/daemon.json

# Start fresh
happy start
```

### Related Errors

- [LOCK_ACQUISITION_FAILED](CLI.md#lock-acquisition-failed) - Cannot acquire process lock
- [PROCESS_TIMEOUT](#process-timeout) - Process startup times out

---

## process-timeout

**Error Code**: `PROCESS_TIMEOUT`

### Symptoms

- CLI hangs then shows "Process timeout" error
- Operations take much longer than expected
- Daemon becomes unresponsive

### Common Causes

1. **System resource constraints** - CPU or memory pressure
2. **Slow disk I/O** - Storage bottleneck affecting operations
3. **Network latency** - Server communication taking too long
4. **Large session data** - Processing exceptionally large sessions

### Solutions

#### 1. Check system resources

```bash
# Check CPU and memory usage
top -l 1 | head -20

# Or on Linux
htop
```

If system is under heavy load, close other applications.

#### 2. Restart the daemon

```bash
# Stop the current daemon
happy stop

# Wait a moment
sleep 5

# Start fresh
happy start
```

#### 3. Check disk space

```bash
# Check available disk space
df -h ~/.happy/

# If low, clean up old files
happy cleanup
```

#### 4. Reduce session size

If working with very large sessions:

- Consider breaking work into smaller sessions
- Use `happy sessions cleanup` to remove old session data
- Archive completed sessions

#### 5. Check network quality

```bash
# Test latency to server
ping api.happy-servers.com

# High latency (>200ms) or packet loss can cause timeouts
```

#### 6. Increase timeout (advanced)

For users with slow connections, you can increase the timeout:

```bash
# Set a longer timeout (in milliseconds)
export HAPPY_PROCESS_TIMEOUT=60000

# Then run your command
happy start
```

### Timeout Thresholds

| Operation | Default Timeout | Notes |
|-----------|-----------------|-------|
| Daemon startup | 30s | Time to initialize and connect |
| Session sync | 10s | Per sync operation |
| Authentication | 60s | Full auth flow including QR scan |

### Related Errors

- [NO_RESPONSE](CONNECTION.md#no-response) - Server not responding
- [DAEMON_START_FAILED](#start-failed) - Daemon fails to start

---

## Daemon Logs

For detailed daemon debugging:

```bash
# Find the latest daemon log
ls -lt ~/.happy/logs/*-daemon.log | head -1

# View recent entries
tail -100 ~/.happy/logs/<latest>-daemon.log

# Or use the CLI shortcut
happy logs daemon
```

## When to Contact Support

Contact support if:

- Daemon consistently fails to start after trying all solutions
- Timeouts occur even on fast systems with good network
- You see repeated crashes in daemon logs

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- Output of `happy status`
- Last 100 lines of daemon log
- System info (OS, Node.js version, available RAM)
````

## File: docs/errors/ENCRYPTION.md
````markdown
# Encryption Errors

This guide covers errors related to end-to-end encryption in the Happy CLI.

Happy uses TweetNaCl (NaCl Box) for end-to-end encryption. All data is encrypted on your device before transmission, ensuring the server never sees plaintext content.

---

## encryption-error

**Error Code**: `ENCRYPTION_ERROR`

### Symptoms

- CLI shows "Encryption error" or "Failed to encrypt/decrypt"
- Cannot send or receive messages
- Session data appears corrupted or unreadable

### Common Causes

1. **Key mismatch** - Encryption keys don't match between devices
2. **Corrupted key material** - Local key files are damaged
3. **Re-authentication needed** - Key exchange needs to be repeated
4. **Clock skew** - Significant time differences affecting crypto operations

### Solutions

#### 1. Re-authenticate

The most reliable fix is to re-establish the key exchange:

```bash
# Stop current session
happy stop

# Clear auth state
rm -rf ~/.happy/auth/

# Re-authenticate with mobile app
happy auth
```

This generates fresh keypairs and performs a new key exchange.

#### 2. Check for key file corruption

```bash
# Check key files exist and have content
ls -la ~/.happy/auth/

# Files should be non-empty
# If any are 0 bytes, delete and re-auth
```

#### 3. Verify device pairing

Ensure both devices completed the pairing:

1. Open Happy mobile app
2. Go to Settings > Linked Devices
3. Verify your computer is listed
4. If not, re-pair the devices

#### 4. Check system time

Cryptographic operations can fail with significant clock drift:

```bash
# Check system time
date

# Sync with NTP if needed
# macOS:
sudo sntp -sS time.apple.com

# Linux:
sudo ntpdate pool.ntp.org
```

### Understanding E2E Encryption

Happy's encryption flow:

1. **Key Generation**: Each device generates a NaCl keypair
2. **Key Exchange**: Public keys are exchanged during QR pairing
3. **Shared Secret**: Both devices derive the same shared secret
4. **Message Encryption**: All messages encrypted with NaCl Box before transmission
5. **Server Role**: Server relays encrypted blobs; cannot decrypt content

### Related Errors

- [AUTH_FAILED](AUTHENTICATION.md#auth-failed) - Authentication issues
- [NONCE_TOO_SHORT](#nonce-too-short) - Cryptographic nonce issues

---

## nonce-too-short

**Error Code**: `NONCE_TOO_SHORT`

### Symptoms

- CLI shows "Nonce too short" or "Invalid nonce length"
- Decryption fails with cryptographic error
- Error appears when receiving messages

### Common Causes

1. **Data corruption** - Encrypted message was corrupted in transit
2. **Protocol mismatch** - Sender using different encryption protocol version
3. **Truncated message** - Message was cut off during transmission

### Solutions

#### 1. Retry the operation

Transient network issues can corrupt data:

```bash
# Stop and restart
happy stop
happy start

# Retry your operation
```

#### 2. Check CLI version

Ensure both devices use compatible versions:

```bash
# Check CLI version
happy --version

# Update if needed
npm update -g @anthropic-ai/happy
```

Also update the mobile app to the latest version.

#### 3. Re-authenticate

If errors persist, refresh the encryption setup:

```bash
# Full re-authentication
rm -rf ~/.happy/auth/
happy auth
```

#### 4. Clear session cache

Corrupted cached data can cause issues:

```bash
# Clear session cache
rm -rf ~/.happy/sessions/

# Sync fresh from server
happy sync --force
```

### Technical Details

NaCl Box encryption requires:

- **Nonce**: 24 bytes (192 bits) - unique per message
- **Public Key**: 32 bytes (256 bits)
- **Secret Key**: 32 bytes (256 bits)

The "nonce too short" error means the nonce portion of an encrypted message is less than 24 bytes, making decryption impossible.

### Message Format

Encrypted messages are structured as:

```
[nonce (24 bytes)][ciphertext (variable)]
```

If a message is truncated before the full nonce is received, this error occurs.

### Related Errors

- [ENCRYPTION_ERROR](#encryption-error) - General encryption failure
- [NO_RESPONSE](CONNECTION.md#no-response) - Network delivery issues

---

## Security Best Practices

1. **Keep devices updated** - Use latest CLI and mobile app versions
2. **Secure your devices** - Encryption keys are stored locally
3. **Re-authenticate periodically** - Rotate keys by re-pairing
4. **Don't share key files** - Never copy `~/.happy/auth/` between machines

## When to Contact Support

Contact support if:

- Encryption errors persist after re-authentication
- You suspect key compromise
- You see consistent nonce errors on fresh installs

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- CLI version (`happy --version`)
- Whether re-authentication was attempted
- Whether the issue affects all paired devices or just one

**Note**: For security reasons, never share your key files or encryption-related log entries with support.
````

## File: docs/errors/README.md
````markdown
# Happy CLI Error Reference

This directory contains troubleshooting guides for common errors in the Happy CLI. When an error occurs, the CLI will display a link to the relevant documentation section.

## Quick Reference

| Error Code | Category | Description |
|------------|----------|-------------|
| [`CONNECT_FAILED`](CONNECTION.md#connect-failed) | Connection | Failed to establish connection to server |
| [`NO_RESPONSE`](CONNECTION.md#no-response) | Connection | Server did not respond to request |
| [`REQUEST_CONFIG_ERROR`](CONNECTION.md#request-config-error) | Connection | Invalid request configuration |
| [`AUTH_FAILED`](AUTHENTICATION.md#auth-failed) | Authentication | Authentication request failed |
| [`TOKEN_EXCHANGE_FAILED`](AUTHENTICATION.md#token-exchange-failed) | Authentication | Token exchange with server failed |
| [`SESSION_NOT_FOUND`](SESSIONS.md#session-not-found) | Sessions | Requested session does not exist |
| [`DAEMON_START_FAILED`](DAEMON.md#start-failed) | Daemon | Failed to start background daemon |
| [`PROCESS_TIMEOUT`](DAEMON.md#process-timeout) | Daemon | Process exceeded timeout threshold |
| [`VERSION_MISMATCH`](CLI.md#version-mismatch) | CLI | CLI and server version incompatibility |
| [`LOCK_ACQUISITION_FAILED`](CLI.md#lock-acquisition-failed) | CLI | Could not acquire lock on resource |
| [`DIRECTORY_REQUIRED`](CLI.md#directory-required) | CLI | Required directory does not exist |
| [`RESOURCE_NOT_FOUND`](CLI.md#resource-not-found) | CLI | Requested resource not found |
| [`ENCRYPTION_ERROR`](ENCRYPTION.md#encryption-error) | Encryption | Encryption or decryption operation failed |
| [`NONCE_TOO_SHORT`](ENCRYPTION.md#nonce-too-short) | Encryption | Cryptographic nonce length invalid |

## Documentation Structure

- **[CONNECTION.md](CONNECTION.md)** - Network and server connectivity issues
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Authentication and authorization errors
- **[SESSIONS.md](SESSIONS.md)** - Session management errors
- **[DAEMON.md](DAEMON.md)** - Background daemon lifecycle issues
- **[CLI.md](CLI.md)** - General CLI operational errors
- **[ENCRYPTION.md](ENCRYPTION.md)** - End-to-end encryption errors

## Understanding Error Messages

When an error occurs, the CLI displays:

```
Error: Failed to connect to server (ref: abc12345)
  For more information, see: https://github.com/Enflame-Media/happy-shared/blob/main/docs/errors/CONNECTION.md#connect-failed
```

- **Error message**: Brief description of what went wrong
- **ref**: Correlation ID for support requests (first 8 characters)
- **URL**: Link to detailed troubleshooting steps

## Getting More Details

Use verbose mode for additional diagnostics:

```bash
# Show full correlation ID and stack trace
happy --verbose <command>

# Or set DEBUG environment variable
DEBUG=1 happy <command>
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HAPPY_SERVER_URL` | Override the default server URL |
| `HAPPY_HOME_DIR` | Override the default data directory (~/.happy) |
| `DEBUG` | Enable verbose logging (set to `1`) |

## Support

If you can't resolve an issue using these guides:

1. Note your **correlation ID** (the `ref:` value in the error)
2. Check your log files at `~/.happy/logs/`
3. Open an issue at [GitHub Issues](https://github.com/Enflame-Media/happy/issues)

Include your correlation ID in support requests to help us trace the issue.
````

## File: docs/errors/SESSIONS.md
````markdown
# Session Errors

This guide covers errors related to session management in the Happy CLI.

---

## session-not-found

**Error Code**: `SESSION_NOT_FOUND`

### Symptoms

- CLI shows "Session not found" when trying to view or resume a session
- Mobile app shows empty session list or missing session
- Error when trying to share or access a specific session ID

### Common Causes

1. **Session expired** - Sessions are automatically cleaned up after inactivity
2. **Session deleted** - Session was manually deleted from mobile app or another device
3. **Invalid session ID** - Typo or incorrect session ID provided
4. **Sync delay** - Session exists but hasn't synced to this device yet

### Solutions

#### 1. List available sessions

Check which sessions are actually available:

```bash
# List all sessions visible to this device
happy sessions list
```

If your session isn't listed, it may have been deleted or expired.

#### 2. Check session ID format

Session IDs are UUIDs that look like: `550e8400-e29b-41d4-a716-446655440000`

```bash
# Ensure you're using the correct format
happy session view 550e8400-e29b-41d4-a716-446655440000
```

Common mistakes:
- Partial ID (must be full UUID)
- Extra spaces or characters
- Confusing similar-looking characters (0 vs O, l vs 1)

#### 3. Wait for sync

If you just created a session on another device:

```bash
# Force a sync refresh
happy sync

# Then try again
happy sessions list
```

Sync typically completes within seconds, but network issues can cause delays.

#### 4. Check mobile app

Open the Happy mobile app and verify:

1. You're logged into the correct account
2. The session appears in your session list
3. The session hasn't been archived or deleted

#### 5. Verify device pairing

If sessions consistently don't appear:

```bash
# Check connection status
happy status

# Re-authenticate if needed
happy auth
```

### Session Lifecycle

Sessions follow this lifecycle:

1. **Created** - Session starts when you run `happy start`
2. **Active** - Session is running and syncing to paired devices
3. **Idle** - No activity, but session is preserved
4. **Expired** - Automatically removed after extended inactivity (configurable)
5. **Deleted** - Manually removed by user

### Recovering Data

If a session was deleted but you need its content:

1. Check local Claude Code history (if the session ran locally)
2. Check `~/.happy/sessions/` for any cached session data
3. Contact support with your correlation ID for potential recovery

### Related Errors

- [AUTH_FAILED](AUTHENTICATION.md#auth-failed) - Device not properly authenticated
- [CONNECT_FAILED](CONNECTION.md#connect-failed) - Cannot reach server to fetch sessions

---

## When to Contact Support

Contact support if:

- Session definitely exists on mobile but never appears on CLI
- Sessions are disappearing unexpectedly
- You need to recover data from a deleted session

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- The session ID you were trying to access (if known)
- Output of `happy sessions list`
- When the session was last seen
````

## File: docs/API-RATE-LIMITS.md
````markdown
# API Rate Limiting

This document describes the rate limiting system implemented in happy-server to protect against abuse and ensure fair resource usage.

## Overview

Rate limiting is implemented using [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit) with Redis backend for distributed rate limiting across multiple server instances.

### Key Features

- **Redis-backed**: Consistent rate limits across all server instances
- **Per-user tracking**: Authenticated requests use `userId` as the rate limit key
- **IP fallback**: Unauthenticated requests fall back to IP-based limiting
- **Graceful degradation**: API continues functioning if Redis fails
- **Standard headers**: IETF draft spec rate limit headers on all responses

## Rate Limit Tiers

Endpoints are categorized into four tiers based on their computational cost and abuse potential:

| Tier | Limit | Use Case | Example Endpoints |
|------|-------|----------|-------------------|
| **CRITICAL** | 5/min | External paid APIs | `/v1/voice/token` (ElevenLabs) |
| **HIGH** | 30/min | Auth, crypto, DB writes | `/v1/auth`, `/v1/sessions` (POST), `/v1/artifacts` (POST/DELETE) |
| **MEDIUM** | 60/min | List/query endpoints | `/v1/sessions` (GET), `/v1/artifacts` (GET), `/v1/feed` |
| **LOW** | 120/min | Simple reads | `/v1/version`, `/v1/machines/:id` (GET) |

### Health Check Exemption

The following endpoints are **exempt from rate limiting** to ensure monitoring systems can always check server health:

- `GET /v1/health` - Liveness probe
- `GET /ready` - Readiness probe

## Response Headers

All responses include standard rate limit headers:

```http
HTTP/1.1 200 OK
x-ratelimit-limit: 60
x-ratelimit-remaining: 45
x-ratelimit-reset: 1703600400
```

### Header Descriptions

| Header | Description |
|--------|-------------|
| `x-ratelimit-limit` | Maximum requests allowed in the time window |
| `x-ratelimit-remaining` | Requests remaining in the current window |
| `x-ratelimit-reset` | Unix timestamp when the limit resets |
| `retry-after` | Seconds until retry allowed (only on 429 responses) |

## Rate Limit Exceeded Response

When a rate limit is exceeded, the API returns HTTP 429:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded, retry in 30 seconds",
  "retryAfter": 30
}
```

## Endpoint Reference

### CRITICAL Tier (5 requests/minute)

These endpoints involve external paid API calls:

| Endpoint | Method | Reason |
|----------|--------|--------|
| `/v1/voice/token` | POST | ElevenLabs API call ($$$) + RevenueCat subscription check |

### HIGH Tier (30 requests/minute)

These endpoints involve authentication, cryptographic operations, or database writes:

| Endpoint | Method | Reason |
|----------|--------|--------|
| `/v1/auth` | POST | Crypto verification + DB upsert + JWT creation |
| `/v1/auth/request` | POST | Crypto validation + DB upsert |
| `/v1/auth/response` | POST | Auth + DB update |
| `/v1/auth/account/request` | POST | Crypto validation + DB upsert |
| `/v1/auth/account/response` | POST | Auth + DB update |
| `/v1/sessions` | POST | DB create + event emission |
| `/v1/sessions/:id` | DELETE | Cascade delete + event emission |
| `/v1/artifacts` | POST | DB write + event emission |
| `/v1/artifacts/:id` | POST | Version control + DB update + event |
| `/v1/artifacts/:id` | DELETE | DB delete + event emission |
| `/v1/machines` | POST | DB lookup + potential create + events |
| `/v1/machines/:id/status` | PUT | Status update + event emission |
| `/v1/access-keys/:sessionId/:machineId` | POST | DB create |
| `/v1/access-keys/:sessionId/:machineId` | PUT | Version control + DB update |
| `/v1/push-tokens` | POST | Token registration |
| `/v1/push-tokens/:token` | DELETE | Token deletion |
| `/v1/connect/*` | ALL | OAuth flows, external API calls |
| `/v1/friends/add` | POST | Relationship modification |
| `/v1/friends/remove` | POST | Relationship modification |
| `/v1/account/settings` | POST | Settings update with version check |
| `/v1/kv` | POST | Batch mutation |
| `/logs-combined-...` | POST | Dev logging (when enabled) |

### MEDIUM Tier (60 requests/minute)

These endpoints involve database queries and list operations:

| Endpoint | Method | Reason |
|----------|--------|--------|
| `/v1/sessions` | GET | Returns up to 150 sessions |
| `/v2/sessions` | GET | Cursor pagination |
| `/v1/sessions/:id/messages` | GET | Up to 150 messages |
| `/v1/artifacts` | GET | All user artifacts |
| `/v1/machines` | GET | Machine listing |
| `/v1/account/profile` | GET | Profile with relations |
| `/v1/account/settings` | GET | Settings lookup |
| `/v1/feed` | GET | Feed aggregation |
| `/v1/kv` | GET | Key-value listing |
| `/v1/kv/:key` | GET | Single KV lookup |
| `/v1/kv/bulk` | POST | Bulk KV lookup |
| `/v1/push-tokens` | GET | Token listing |
| `/v1/friends` | GET | Friends list |
| `/v1/user/search` | GET | User search |
| `/v1/access-keys/:sessionId/:machineId` | GET | Access key lookup |
| `/v1/usage/query` | POST | Usage aggregation |
| `/v1/connect/github` | GET | GitHub connection status |

### LOW Tier (120 requests/minute)

These endpoints are simple reads with minimal server load:

| Endpoint | Method | Reason |
|----------|--------|--------|
| `/v1/auth/request/status` | GET | Simple DB lookup |
| `/v2/sessions/active` | GET | Filtered, small result |
| `/v1/sessions/:id` | GET | Single session lookup |
| `/v1/artifacts/:id` | GET | Single artifact lookup |
| `/v1/machines/:id` | GET | Single machine lookup |
| `/v1/version` | POST | No DB, static response |
| `/v1/user/:id` | GET | Single user lookup |

## Implementation Details

### Key Generation

Rate limit keys are generated based on authentication status:

```typescript
keyGenerator: (request) => {
    if (request.userId) {
        return `user:${request.userId}`;  // Authenticated
    }
    return request.ip;  // Unauthenticated
}
```

### Graceful Degradation

If Redis is unavailable, rate limiting falls back to in-memory limiting per server instance:

```typescript
skipOnError: true  // Continue without rate limiting on Redis failure
```

### Test Environment

Rate limiting is **disabled** when `NODE_ENV=test` to prevent test interference.

## Monitoring

Rate limit events are logged with warning level:

- **Approaching limit**: Logged when a client is close to their limit
- **Exceeded limit**: Logged when a 429 response is sent

Log format:
```
[rate-limit] WARN: Rate limit exceeded for user:abc123: POST /v1/sessions
```

## Client Best Practices

1. **Respect headers**: Check `x-ratelimit-remaining` before making requests
2. **Exponential backoff**: On 429 responses, wait for `retry-after` seconds
3. **Batch operations**: Use bulk endpoints (e.g., `/v1/kv/bulk`) when possible
4. **Cache responses**: Avoid repeated requests for the same data

## Adjusting Limits

Rate limits are configured in `sources/app/api/utils/enableRateLimiting.ts`:

```typescript
export const RateLimitTiers = {
    CRITICAL: { max: 5, timeWindow: '1 minute' },
    HIGH: { max: 30, timeWindow: '1 minute' },
    MEDIUM: { max: 60, timeWindow: '1 minute' },
    LOW: { max: 120, timeWindow: '1 minute' },
} as const;
```

To adjust a specific endpoint's tier, modify its route configuration:

```typescript
app.get('/v1/endpoint', {
    config: {
        rateLimit: RateLimitTiers.HIGH  // Change tier here
    }
}, handler);
```

## Related Documentation

- [@fastify/rate-limit documentation](https://github.com/fastify/fastify-rate-limit)
- [IETF Draft: RateLimit Header Fields](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
````

## File: docs/RFC-SHARED-TYPES-PACKAGE.md
````markdown
# RFC: Shared Types Package for Happy Monorepo

**Issue**: HAP-383
**Status**: RFC / Investigation Complete
**Date**: 2025-12-17
**Author**: Claude Code

---

## Executive Summary

This RFC recommends implementing a **yarn workspaces-based shared package** (`@magic-agent/protocol`) to consolidate ~95 duplicated type definitions across the Happy monorepo. The investigation identified significant schema drift risk, as evidenced by the recent `sessionId` vs `sid` bug that caused production sync failures.

**Recommendation**: Yarn workspaces with Zod schemas as the source of truth.

---

## Table of Contents

1. [Type Inventory](#1-type-inventory)
2. [Approach Comparison](#2-approach-comparison)
3. [Recommendation](#3-recommendation)
4. [Proof of Concept Design](#4-proof-of-concept-design)
5. [Migration Path](#5-migration-path)
6. [Open Questions - Resolved](#6-open-questions---resolved)
7. [Follow-up Issues](#7-follow-up-issues)

---

## 1. Type Inventory

### 1.1 Summary

| Project | File | Lines | Zod Schemas | TS Types | Total |
|---------|------|-------|-------------|----------|-------|
| happy-app | `sources/sync/apiTypes.ts` | 248 | 18 | 6 | 24 |
| happy-app | `sources/sync/storageTypes.ts` | 189 | 5 | 6 | 11 |
| happy-cli | `src/api/types.ts` | 570 | 20 | 15 | 35 |
| happy-server-workers | `src/durable-objects/types.ts` | 664 | 0 | 25 | 25 |
| happy-server | `sources/app/events/eventRouter.ts` | 623 | 0 | 12 | 12 |
| happy-server | `sources/storage/types.ts` | 101 | 0 | 5 | 5 |
| **Total** | | **2395** | **43** | **69** | **~112** |

**Note**: Many types are duplicated across files, resulting in ~95 unique type definitions with 4x average duplication.

### 1.2 Detailed File Analysis

#### happy-app/sources/sync/apiTypes.ts (248 lines)

Primary Zod schemas for client-side validation:

```
ApiMessageSchema          - Encrypted message structure
ApiUpdateNewMessageSchema - new-message update (uses 'sid')
ApiUpdateNewSessionSchema - new-session update
ApiDeleteSessionSchema    - delete-session update
ApiUpdateSessionStateSchema - update-session update
ApiUpdateAccountSchema    - update-account update
ApiUpdateMachineStateSchema - update-machine update
ApiNewMachineSchema       - new-machine update
ApiNewArtifactSchema      - new-artifact update
ApiUpdateArtifactSchema   - update-artifact update
ApiDeleteArtifactSchema   - delete-artifact update
ApiRelationshipUpdatedSchema - relationship-updated update
ApiNewFeedPostSchema      - new-feed-post update
ApiKvBatchUpdateSchema    - kv-batch-update update
ApiUpdateSchema           - Discriminated union of all updates
ApiUpdateContainerSchema  - Wrapper with id, seq, body, createdAt
ApiEphemeralActivityUpdateSchema - Session activity
ApiEphemeralUsageUpdateSchema - Token/cost usage
ApiEphemeralMachineActivityUpdateSchema - Machine activity
ApiEphemeralUpdateSchema  - Union of ephemeral updates
```

#### happy-cli/src/api/types.ts (570 lines)

CLI-specific schemas (many duplicates of app):

```
SessionMessageContentSchema - Same as ApiMessage content
UpdateBodySchema          - Same as ApiUpdateNewMessage
UpdateSessionBodySchema   - Same as ApiUpdateSessionState
UpdateMachineBodySchema   - Same as ApiUpdateMachineState
NewSessionBodySchema      - Same as ApiUpdateNewSession
GitHubProfileSchema       - GitHub user data
UpdateAccountBodySchema   - Same as ApiUpdateAccount
NewMachineBodySchema      - Same as ApiNewMachine
DeleteSessionBodySchema   - Same as ApiDeleteSession
NewArtifactBodySchema     - Same as ApiNewArtifact
UpdateArtifactBodySchema  - Same as ApiUpdateArtifact
DeleteArtifactBodySchema  - Same as ApiDeleteArtifact
RelationshipUpdatedBodySchema - Same as ApiRelationshipUpdated
NewFeedPostBodySchema     - Same as ApiNewFeedPost
KvBatchUpdateBodySchema   - Same as ApiKvBatchUpdate
UpdateSchema              - Container wrapper

+ Socket event interfaces:
ServerToClientEvents      - Server → Client events
ClientToServerEvents      - Client → Server events

+ Domain types:
Session, Machine, MachineMetadata, DaemonState
Metadata, AgentState, MessageContent, UserMessageSchema
EphemeralActivityUpdate, EphemeralUsageUpdate, EphemeralMachineActivityUpdate
```

#### happy-server-workers/src/durable-objects/types.ts (664 lines)

Workers-specific WebSocket types + duplicated protocol types:

```
WebSocket Infrastructure (Workers-specific, keep local):
- ClientType, ConnectionAuthState, ConnectionMetadata
- WebSocketAuthHandshake, CloseCode constants
- WebSocketMessageType, WebSocketMessage, ClientMessage
- NormalizedMessage, type guards
- ErrorMessage, ConnectedMessage
- BroadcastFilter types, ConnectionStats
- ConnectionManagerConfig, DEFAULT_CONFIG
- AuthMessagePayload

Protocol Types (DUPLICATED - should be shared):
- GitHubProfile
- UpdateEvent (large union - uses 'sessionId', not 'sid'!)
- EphemeralEvent
- UpdatePayload, EphemeralPayload
```

**Critical Finding**: `UpdateEvent` uses `sessionId` while app expects `sid`. This is the root cause of the bug!

#### happy-server/sources/app/events/eventRouter.ts (623 lines)

Server event routing + duplicated types:

```
Connection Types (server-specific, keep local):
- SessionScopedConnection, UserScopedConnection, MachineScopedConnection
- ClientConnection union
- RecipientFilter types

Protocol Types (DUPLICATED - should be shared):
- UpdateEvent (identical structure to workers)
- EphemeralEvent (identical structure to workers)
- UpdatePayload, EphemeralPayload

Builder Functions (server-specific, keep local):
- buildNewSessionUpdate, buildNewMessageUpdate
- buildUpdateSessionUpdate, buildDeleteSessionUpdate
- buildUpdateAccountUpdate, buildNewMachineUpdate
- buildUpdateMachineUpdate, buildSessionActivityEphemeral
- buildMachineActivityEphemeral, buildUsageEphemeral
- etc.
```

#### happy-app/sources/sync/storageTypes.ts (189 lines)

Client-side storage types:

```
Utility Types:
- UsageHistoryEntry, MAX_USAGE_HISTORY_SIZE, MIN_CONTEXT_CHANGE_FOR_HISTORY

Schemas (some overlap with CLI):
- MetadataSchema, Metadata
- AgentStateSchema, AgentState
- MachineMetadataSchema, MachineMetadata

Interfaces:
- Session (client-side, includes UI state like draft, permissionMode)
- DecryptedMessage
- Machine
- GitStatus
```

#### happy-server/sources/storage/types.ts (101 lines)

Prisma JSON type augmentation:

```
PrismaJson namespace:
- SessionMessageContent
- UsageReportData
- UpdateBody (same structure as UpdateEvent)
- Re-exports: GitHubProfile, GitHubOrg, ImageRef
```

### 1.3 Duplication Categories

#### Category A: Protocol Updates (CRITICAL - caused bug)

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| new-message | Zod (sid) | Zod (sid) | TS (sessionId) | TS (sid) |
| new-session | Zod | Zod | TS | TS |
| update-session | Zod | Zod | TS | TS |
| delete-session | Zod | Zod | TS | TS |
| update-account | Zod | Zod | TS | TS |
| new-machine | Zod | Zod | TS | TS |
| update-machine | Zod | Zod | TS | TS |
| new-artifact | Zod | Zod | TS | TS |
| update-artifact | Zod | Zod | TS | TS |
| delete-artifact | Zod | Zod | TS | TS |
| relationship-updated | Zod | Zod | TS | TS |
| new-feed-post | Zod | Zod | TS | TS |
| kv-batch-update | Zod | Zod | TS | TS |

**Risk**: Field naming inconsistencies (`sid` vs `sessionId`) cause runtime validation failures.

#### Category B: Ephemeral Events

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| activity | Zod | TS | TS | TS |
| usage | Zod | TS | TS | TS |
| machine-activity | Zod | TS | TS | TS |
| machine-status | - | - | TS | TS |

#### Category C: Payload Wrappers

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| UpdatePayload | - | - | TS | TS |
| EphemeralPayload | - | - | TS | TS |
| ApiUpdateContainer | Zod | - | - | - |

#### Category D: Domain Types

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| Metadata | Zod | TS | - | - |
| AgentState | Zod | TS | - | - |
| MachineMetadata | Zod | Zod | - | - |
| DaemonState | - | Zod | - | - |
| GitHubProfile | Zod (import) | Zod | TS | import |
| Session | TS | TS | - | - |
| Machine | TS | TS | - | - |

---

## 2. Approach Comparison

### 2.1 Option A: Yarn Workspaces

**Implementation**: Create `packages/@magic-agent/protocol/` with shared Zod schemas, referenced via `"@magic-agent/protocol": "workspace:*"` in each project.

| Aspect | Assessment |
|--------|------------|
| **Setup Complexity** | Low - monorepo already exists |
| **Local Development** | Excellent - symlinked, instant updates |
| **Type Checking** | Excellent - unified compile across projects |
| **Build Complexity** | Medium - dual ESM/CJS output needed |
| **Metro (React Native)** | Medium - requires `watchFolders` config |
| **Future-Proofing** | Medium - migration needed if monorepo splits |
| **Team Learning** | Low - familiar tooling |

**Pros**:
- Simplest setup, no publishing
- Immediate type errors across all projects
- Zero-config local development
- Natural fit for existing monorepo
- TypeScript project references enable incremental builds

**Cons**:
- If monorepo splits, needs migration to npm package
- Metro bundler requires explicit configuration
- happy-server (CommonJS) needs dual build output
- All projects must use yarn

### 2.2 Option B: NPM Package

**Implementation**: Publish `@magic-agent/protocol` to npm (private registry or public), consumed as standard dependency.

| Aspect | Assessment |
|--------|------------|
| **Setup Complexity** | Medium - CI/CD publishing required |
| **Local Development** | Poor - npm link or yalc required |
| **Type Checking** | Good - but only against published version |
| **Build Complexity** | Low - standard npm package |
| **Metro (React Native)** | Low - standard dependency |
| **Future-Proofing** | Excellent - works if repos split |
| **Team Learning** | Low - familiar tooling |

**Pros**:
- Works if monorepo splits
- Standard npm versioning
- No special bundler config needed
- Each project can pin different versions

**Cons**:
- Publishing overhead (CI/CD setup, versioning)
- Version drift possible (opposite of goal)
- More complex release process
- Local development friction (changes require publish cycle)
- Overkill for internal monorepo use

### 2.3 Option C: Code Generation (OpenAPI/Protobuf)

**Implementation**: Define schemas in OpenAPI YAML or Protobuf, generate TypeScript/Zod for each project.

| Aspect | Assessment |
|--------|------------|
| **Setup Complexity** | High - toolchain setup required |
| **Local Development** | Poor - regeneration required on changes |
| **Type Checking** | Good - generated types are consistent |
| **Build Complexity** | High - code generation pipeline |
| **Metro (React Native)** | Low - generated code is standard TS |
| **Future-Proofing** | Excellent - language-agnostic |
| **Team Learning** | High - OpenAPI/Protobuf expertise needed |

**Pros**:
- Language-agnostic source of truth
- Automatic validation generation
- Could generate docs, client SDKs
- Industry standard tooling

**Cons**:
- Significant initial investment
- Zod generation from OpenAPI is imperfect (edge cases)
- Two layers of abstraction (schema → Zod → types)
- Team would need to learn new tooling
- Overkill for TypeScript-only codebase
- Generated code may not match hand-crafted Zod patterns

### 2.4 Comparison Matrix

| Criteria | Weight | Yarn Workspaces | NPM Package | Code Generation |
|----------|--------|-----------------|-------------|-----------------|
| Setup simplicity | High | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Local development | High | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ |
| Type safety across projects | Critical | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| Maintenance overhead | Medium | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ |
| React Native support | Medium | ★★★☆☆ | ★★★★★ | ★★★★★ |
| Future flexibility | Low | ★★★☆☆ | ★★★★★ | ★★★★★ |
| Team expertise fit | High | ★★★★★ | ★★★★★ | ★★☆☆☆ |
| **Total (weighted)** | | **4.5** | **3.5** | **3.0** |

---

## 3. Recommendation

### 3.1 Decision: Yarn Workspaces

**Recommendation**: Implement yarn workspaces with Zod schemas as the source of truth.

### 3.2 Rationale

1. **All projects are TypeScript**: No need for language-agnostic schema language
2. **All projects already use Zod**: Direct schema sharing is natural
3. **Monorepo structure exists**: Yarn workspaces fit naturally
4. **Primary goal is compile-time safety**: Workspaces provide immediate cross-project type checking
5. **Small team, internal project**: Publishing overhead is unjustified
6. **Code generation is overengineered**: Two abstraction layers for a TypeScript-only codebase

### 3.3 Open Questions - Resolved

**Q1: Zod schemas vs TypeScript interfaces?**
- **Answer**: Zod schemas
- **Rationale**: Already used everywhere, enables runtime validation

**Q2: Yarn workspaces vs npm package?**
- **Answer**: Yarn workspaces
- **Rationale**: Simpler, no publishing, immediate type checking

**Q3: Minimum viable scope?**
- **Answer**: Protocol types only (Update events, Ephemeral events, Payloads)
- **Rationale**: These caused the bug; storage types can remain local for now

**Q4: React Native bundling?**
- **Answer**: Requires Metro configuration (see §4.4)
- **Rationale**: Add `watchFolders` and potentially `nodeModulesPaths` config

---

## 4. Proof of Concept Design

### 4.1 Package Structure

```
packages/
└── @happy/
    └── protocol/
        ├── package.json
        ├── tsconfig.json
        ├── tsup.config.ts        # Dual ESM/CJS build
        ├── src/
        │   ├── index.ts          # Main exports
        │   ├── updates/
        │   │   ├── index.ts
        │   │   ├── message.ts    # new-message, delete-session
        │   │   ├── session.ts    # new-session, update-session
        │   │   ├── machine.ts    # new-machine, update-machine
        │   │   ├── artifact.ts   # artifact updates
        │   │   ├── account.ts    # update-account
        │   │   └── misc.ts       # relationship, feed, kv
        │   ├── ephemeral/
        │   │   ├── index.ts
        │   │   └── events.ts     # activity, usage, machine-activity
        │   ├── payloads.ts       # UpdatePayload, EphemeralPayload
        │   └── common.ts         # Shared primitives (GitHubProfile, etc.)
        └── dist/
            ├── index.js          # ESM
            ├── index.cjs         # CommonJS (for happy-server)
            └── index.d.ts        # Type declarations
```

### 4.2 Core Types for PoC (Priority 1)

```typescript
// packages/@magic-agent/protocol/src/updates/index.ts

import { z } from 'zod';

// Standardize on 'sid' (not 'sessionId') per client expectation
export const ApiUpdateNewMessageSchema = z.object({
    t: z.literal('new-message'),
    sid: z.string(),  // CRITICAL: Use 'sid', not 'sessionId'
    message: z.object({
        id: z.string(),
        seq: z.number(),
        content: z.object({
            t: z.literal('encrypted'),
            c: z.string(),
        }),
        localId: z.string().nullish(),
        createdAt: z.number(),
    }),
});

// ... other update schemas ...

export const ApiUpdateSchema = z.discriminatedUnion('t', [
    ApiUpdateNewMessageSchema,
    ApiUpdateNewSessionSchema,
    ApiDeleteSessionSchema,
    // ... all 13 update types
]);

export type ApiUpdate = z.infer<typeof ApiUpdateSchema>;
```

### 4.3 Build Configuration

```typescript
// packages/@magic-agent/protocol/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],  // Dual output
    dts: true,               // TypeScript declarations
    clean: true,
    sourcemap: true,
    treeshake: true,
    external: ['zod'],       // Peer dependency
});
```

```json
// packages/@magic-agent/protocol/package.json
{
    "name": "@magic-agent/protocol",
    "version": "0.0.1",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "import": "./dist/index.js",
            "require": "./dist/index.cjs",
            "types": "./dist/index.d.ts"
        }
    },
    "peerDependencies": {
        "zod": "^3.0.0"
    },
    "devDependencies": {
        "tsup": "^8.0.0",
        "typescript": "^5.0.0",
        "zod": "^3.0.0"
    },
    "scripts": {
        "build": "tsup",
        "typecheck": "tsc --noEmit"
    }
}
```

### 4.4 Metro Configuration (React Native)

```javascript
// happy-app/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add workspace packages to watchFolders
const workspaceRoot = path.resolve(__dirname, '..');
config.watchFolders = [
    ...(config.watchFolders || []),
    path.resolve(workspaceRoot, 'packages/@magic-agent/protocol'),
];

// Resolve workspace packages
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

### 4.5 Root Workspace Configuration

```json
// package.json (root)
{
    "private": true,
    "workspaces": [
        "packages/@happy/*",
        "happy-cli",
        "happy-server",
        "happy-server-workers",
        "happy-app"
    ]
}
```

---

## 5. Migration Path

### Phase 1: Create Package (1-2 days)

1. Create `packages/@magic-agent/protocol/` directory structure
2. Add root `package.json` with workspaces config
3. Implement core update schemas (copy from happy-app, standardize field names)
4. Implement ephemeral schemas
5. Implement payload wrappers
6. Build and verify dual output (ESM + CJS)
7. Run `yarn install` to link workspace

**Deliverable**: `@magic-agent/protocol` package builds with ~15 core types

### Phase 2: Integrate happy-app (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to happy-app/package.json
2. Update Metro config for workspace resolution
3. Replace imports in `sources/sync/apiTypes.ts`:
   ```typescript
   // Before
   export const ApiUpdateSchema = z.discriminatedUnion('t', [...]);

   // After
   export { ApiUpdateSchema, type ApiUpdate } from '@magic-agent/protocol';
   ```
4. Run `yarn typecheck` to verify
5. Run `yarn start` to verify Metro resolves package

**Validation**: App compiles and runs with shared types

### Phase 3: Integrate happy-cli (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to happy-cli/package.json
2. Replace imports in `src/api/types.ts`
3. Remove duplicated schema definitions
4. Run `yarn typecheck` and `yarn test`

**Validation**: CLI compiles and tests pass

### Phase 4: Integrate happy-server-workers (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to happy-server-workers/package.json
2. Update `src/durable-objects/types.ts`:
   - Import shared types from `@magic-agent/protocol`
   - Keep Workers-specific types (WebSocket infrastructure) local
3. Run `yarn typecheck` and `yarn test`

**Critical**: Ensure `UpdateEvent` field names match shared schema

**Validation**: Workers compile and tests pass

### Phase 5: Integrate happy-server (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to happy-server/package.json
2. Verify CommonJS import works: `const { ApiUpdateSchema } = require('@magic-agent/protocol')`
3. Update `sources/app/events/eventRouter.ts`:
   - Import shared types
   - Keep EventRouter class and builder functions local
4. Run `yarn build` and `yarn test`

**Validation**: Server compiles and tests pass

### Phase 6: Cleanup and Documentation (1 day)

1. Remove all duplicated type definitions
2. Add JSDoc comments to shared types
3. Update each project's CLAUDE.md with new import patterns
4. Add CI job to build all projects together

**Validation**: Full monorepo builds with no type errors

### Phase 7: CI Validation (optional, recommended)

1. Create GitHub Action that:
   - Builds `@magic-agent/protocol`
   - Builds all 4 projects
   - Runs type checking across all
2. Fail PR if any project has type errors

**Validation**: CI catches schema drift before merge

---

## 6. Technical Decisions

### 6.1 Field Naming: `sid` vs `sessionId`

**Decision**: Use `sid` consistently

**Rationale**:
- Client (happy-app) expects `sid`
- Bug was caused by workers using `sessionId`
- Shorter field name is acceptable for protocol types

**Migration**:
- Update `happy-server-workers/src/durable-objects/types.ts` to use `sid`
- Update `happy-server/sources/app/events/eventRouter.ts` to use `sid`

### 6.2 Zod Version

**Decision**: Peer dependency on `zod ^3.0.0`

**Rationale**:
- All projects already use Zod 3.x
- Peer dependency avoids version conflicts
- Each project manages own Zod version

### 6.3 Build Tool

**Decision**: Use `tsup` for builds

**Rationale**:
- Simple config for dual ESM/CJS output
- Built-in TypeScript declaration generation
- Fast esbuild-based compilation
- Well-suited for library packages

---

## 7. Follow-up Issues

If this RFC is approved, create the following implementation issues:

### HAP-XXX: Create @magic-agent/protocol package

**Scope**: Set up package structure, implement core types, verify builds

**Acceptance Criteria**:
- [ ] Package structure created
- [ ] 15 core update/ephemeral schemas implemented
- [ ] Dual ESM/CJS build working
- [ ] Root workspace config added

### HAP-XXX: Integrate @magic-agent/protocol in happy-app

**Scope**: Metro config, import migration, type verification

**Acceptance Criteria**:
- [ ] Metro config updated
- [ ] Shared types imported
- [ ] Local duplicates removed
- [ ] App compiles and runs

### HAP-XXX: Integrate @magic-agent/protocol in happy-cli

**Scope**: Import migration, duplicate removal, test verification

### HAP-XXX: Integrate @magic-agent/protocol in happy-server-workers

**Scope**: Import migration, field naming fixes, test verification

### HAP-XXX: Integrate @magic-agent/protocol in happy-server

**Scope**: CommonJS import verification, duplicate removal, test verification

### HAP-XXX: Add CI validation for shared types

**Scope**: GitHub Action to build all projects, type check validation

---

## Appendix A: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Metro bundler issues | Medium | High | Test Metro config in Phase 2 before full migration |
| CommonJS compatibility | Low | Medium | tsup dual output tested in Phase 1 |
| Circular dependency | Low | High | Package only exports types, no runtime deps on projects |
| Breaking change during migration | Medium | Medium | Migrate one project at a time with validation |
| Build time increase | Low | Low | Package build adds ~3-5s, incremental builds available |

## Appendix B: Alternatives Considered

1. **Git submodules**: Rejected - poor DX, version sync issues
2. **Copy-paste with linting**: Rejected - doesn't solve root cause
3. **TypeScript path mapping only**: Rejected - doesn't enable runtime validation
4. **Single source file imported by all**: Rejected - metro can't resolve cross-project imports

---

*This RFC was generated by Claude Code as part of HAP-383 investigation.*
````

## File: packages/@magic-agent/errors/src/index.test.ts
````typescript
import { describe, it, expect } from 'vitest';
import { AppError, ErrorCodes, type ErrorCode } from './index';
````

## File: packages/@magic-agent/errors/src/safeError.ts
````typescript
import { AppError, type ErrorCode } from './index';
export interface SafeErrorResponse {
    error: string;
    code?: ErrorCode;
    requestId?: string;
    timestamp: string;
    canTryAgain?: boolean;
}
export interface SafeErrorOptions {
    requestId?: string;
    isDevelopment?: boolean;
    logger?: (requestId: string | undefined, message: string, stack?: string, context?: Record<string, unknown>) => void;
}
function defaultLogger(
    requestId: string | undefined,
    message: string,
    stack?: string,
    context?: Record<string, unknown>
): void
export function createSafeError(
    err: Error | AppError | unknown,
    options: SafeErrorOptions = {}
): SafeErrorResponse
function getSafeMessage(error: Error, isDevelopment: boolean): string
export type ErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 500 | 502 | 503;
export function getErrorStatusCode(err: Error | AppError | unknown): ErrorStatusCode
function getStatusCodeFromErrorCode(code: ErrorCode): ErrorStatusCode
````

## File: packages/@magic-agent/errors/CLAUDE.md
````markdown
# @magic-agent/errors - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

## Package Overview

**@magic-agent/errors** provides unified error handling for the Happy monorepo. It exports:

- **AppError class**: Standardized error with codes, retry support, and cause chaining
- **ErrorCodes**: Centralized error code constants organized by project

## Commands

```bash
# Build ESM + CJS output
yarn build

# Type check without emitting
yarn typecheck

# Run tests
yarn test
yarn test:watch

# Remove dist folder
yarn clean
```

## Structure

```
src/
└── index.ts          # All exports: ErrorCodes, AppError, types
```

## Usage Examples

### Basic Usage

```typescript
import { AppError, ErrorCodes } from '@magic-agent/errors';

// Throw with error code constant
throw new AppError(ErrorCodes.AUTH_FAILED, 'Session expired');
```

### With Retry Support

```typescript
// Mark error as retryable (UI shows retry button)
throw new AppError(ErrorCodes.FETCH_FAILED, 'Network error', {
    canTryAgain: true
});
```

### Error Chaining

```typescript
try {
    await fetch(url);
} catch (error) {
    throw new AppError(ErrorCodes.API_ERROR, 'Failed to fetch data', {
        canTryAgain: true,
        cause: error instanceof Error ? error : undefined,
        context: { url, attemptNumber: 3 }
    });
}
```

### Static Factories

```typescript
// Wrap unknown errors
catch (error) {
    throw AppError.fromUnknown(ErrorCodes.OPERATION_FAILED, 'Failed', error, true);
}

// CLI-style (no retry flag)
throw AppError.withCause(ErrorCodes.AUTH_FAILED, 'Auth failed', originalError);
```

### Type Guard

```typescript
if (AppError.isAppError(error)) {
    console.log(error.code, error.canTryAgain);
}
```

## ErrorCodes Organization

Error codes are organized by scope:

| Category | Examples | Used By |
|----------|----------|---------|
| **Shared** | `AUTH_FAILED`, `ENCRYPTION_ERROR`, `NOT_FOUND` | All projects |
| **CLI-specific** | `DAEMON_START_FAILED`, `LOCK_ACQUISITION_FAILED` | happy-cli |
| **App-specific** | `RPC_FAILED`, `SOCKET_NOT_CONNECTED`, `FETCH_ABORTED` | happy-app |
| **Server-specific** | `AUTH_NOT_INITIALIZED`, `INVARIANT_VIOLATION` | happy-server |

## Development Guidelines

### Adding New Error Codes

1. **Determine category**: Shared, CLI, App, or Server?
2. **Add constant with JSDoc**: Include description comment
3. **Use SCREAMING_SNAKE_CASE**: Match existing naming
4. **Update documentation** (docs/errors/) if CLI error

### AppError Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `canTryAgain` | boolean | false | UI shows retry button |
| `cause` | Error | undefined | Original error for chaining |
| `context` | Record | undefined | Debug metadata |

### Serialization

AppError implements `toJSON()` for structured logging:

```typescript
const error = new AppError(ErrorCodes.API_ERROR, 'Failed', {
    canTryAgain: true,
    context: { url: '/api/data' }
});

console.log(JSON.stringify(error));
// {
//   "code": "API_ERROR",
//   "message": "Failed",
//   "name": "AppError",
//   "canTryAgain": true,
//   "context": { "url": "/api/data" }
// }
```

## Consumer Projects

| Project | Module Format | Primary Usage |
|---------|---------------|---------------|
| happy-cli | ESM | Error throwing with codes |
| happy-app | ESM (Expo) | Error display with retry |
| happy-server | CommonJS | API error responses |
| happy-server-workers | ESM | HTTP error responses |

## Important Rules

1. **Never remove error codes** - May break existing error handling
2. **Use specific codes** - Avoid `UNKNOWN_ERROR` when a specific code exists
3. **Document CLI errors** - Update docs/errors/ for user-facing CLI errors
4. **Test both formats** - ESM and CJS consumers must work
````

## File: packages/@magic-agent/errors/package.json
````json
{
    "name": "@magic-agent/errors",
    "version": "0.0.1",
    "description": "Unified error handling for Happy monorepo - AppError class with options pattern",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "import": {
                "types": "./dist/index.d.ts",
                "default": "./dist/index.js"
            },
            "require": {
                "types": "./dist/index.d.cts",
                "default": "./dist/index.cjs"
            }
        }
    },
    "files": [
        "dist",
        "src"
    ],
    "sideEffects": false,
    "devDependencies": {
        "tsup": "^8.5.1",
        "typescript": "^5.9.3",
        "vitest": "^4.0.16"
    },
    "scripts": {
        "build": "npx tsup",
        "typecheck": "npx tsc --noEmit",
        "test": "vitest run",
        "test:watch": "vitest",
        "clean": "rm -rf dist"
    },
    "keywords": [
        "happy",
        "errors",
        "typescript",
        "apperror"
    ],
    "license": "MIT"
}
````

## File: packages/@magic-agent/errors/tsconfig.json
````json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["ES2022"],
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
````

## File: packages/@magic-agent/errors/tsup.config.ts
````typescript
import { defineConfig } from 'tsup';
````

## File: packages/@happy/lint-rules/src/rules/github-casing.js
````javascript
function hasIncorrectGithubCasing(name)
function fixGithubCasing(name)
function isTypeLikeDeclaration(node)
function create(context)
⋮----
function reportIncorrectCasing(node)
⋮----
fix(fixer)
⋮----
TSTypeAliasDeclaration(node)
TSInterfaceDeclaration(node)
ClassDeclaration(node)
TSEnumDeclaration(node)
````

## File: packages/@happy/lint-rules/src/rules/github-casing.test.js
````javascript

````

## File: packages/@happy/lint-rules/src/rules/protocol-helpers.js
````javascript
function isTestFile(filename)
function matchesBodyPropertyPattern(node, propertyName)
function create(context)
⋮----
MemberExpression(node)
````

## File: packages/@happy/lint-rules/src/rules/protocol-helpers.test.js
````javascript

````

## File: packages/@happy/lint-rules/src/index.js
````javascript

````

## File: packages/@happy/lint-rules/vitest.config.js
````javascript

````

## File: packages/@magic-agent/protocol/coverage/src/ephemeral/events.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/ephemeral/events.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/ephemeral</a> events.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">71.42% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>5/7</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/2</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">71.42% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>5/7</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line medium'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a>
<a name='L101'></a><a href='#L101'>101</a>
<a name='L102'></a><a href='#L102'>102</a>
<a name='L103'></a><a href='#L103'>103</a>
<a name='L104'></a><a href='#L104'>104</a>
<a name='L105'></a><a href='#L105'>105</a>
<a name='L106'></a><a href='#L106'>106</a>
<a name='L107'></a><a href='#L107'>107</a>
<a name='L108'></a><a href='#L108'>108</a>
<a name='L109'></a><a href='#L109'>109</a>
<a name='L110'></a><a href='#L110'>110</a>
<a name='L111'></a><a href='#L111'>111</a>
<a name='L112'></a><a href='#L112'>112</a>
<a name='L113'></a><a href='#L113'>113</a>
<a name='L114'></a><a href='#L114'>114</a>
<a name='L115'></a><a href='#L115'>115</a>
<a name='L116'></a><a href='#L116'>116</a>
<a name='L117'></a><a href='#L117'>117</a>
<a name='L118'></a><a href='#L118'>118</a>
<a name='L119'></a><a href='#L119'>119</a>
<a name='L120'></a><a href='#L120'>120</a>
<a name='L121'></a><a href='#L121'>121</a>
<a name='L122'></a><a href='#L122'>122</a>
<a name='L123'></a><a href='#L123'>123</a>
<a name='L124'></a><a href='#L124'>124</a>
<a name='L125'></a><a href='#L125'>125</a>
<a name='L126'></a><a href='#L126'>126</a>
<a name='L127'></a><a href='#L127'>127</a>
<a name='L128'></a><a href='#L128'>128</a>
<a name='L129'></a><a href='#L129'>129</a>
<a name='L130'></a><a href='#L130'>130</a>
<a name='L131'></a><a href='#L131'>131</a>
<a name='L132'></a><a href='#L132'>132</a>
<a name='L133'></a><a href='#L133'>133</a>
<a name='L134'></a><a href='#L134'>134</a>
<a name='L135'></a><a href='#L135'>135</a>
<a name='L136'></a><a href='#L136'>136</a>
<a name='L137'></a><a href='#L137'>137</a>
<a name='L138'></a><a href='#L138'>138</a>
<a name='L139'></a><a href='#L139'>139</a>
<a name='L140'></a><a href='#L140'>140</a>
<a name='L141'></a><a href='#L141'>141</a>
<a name='L142'></a><a href='#L142'>142</a>
<a name='L143'></a><a href='#L143'>143</a>
<a name='L144'></a><a href='#L144'>144</a>
<a name='L145'></a><a href='#L145'>145</a>
<a name='L146'></a><a href='#L146'>146</a>
<a name='L147'></a><a href='#L147'>147</a>
<a name='L148'></a><a href='#L148'>148</a>
<a name='L149'></a><a href='#L149'>149</a>
<a name='L150'></a><a href='#L150'>150</a>
<a name='L151'></a><a href='#L151'>151</a>
<a name='L152'></a><a href='#L152'>152</a>
<a name='L153'></a><a href='#L153'>153</a>
<a name='L154'></a><a href='#L154'>154</a>
<a name='L155'></a><a href='#L155'>155</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Ephemeral event schemas
 *
 * Ephemeral events are transient status updates that don't need persistence.
 * These are real-time indicators of activity (typing, presence, etc.)
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { STRING_LIMITS } from '../constraints';
&nbsp;
/**
 * Session activity update
 *
 * Real-time indicator of session activity and thinking state.
 */
export const ApiEphemeralActivityUpdateSchema = z.object({
    type: z.literal('activity'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    active: z.boolean(),
    activeAt: z.number(),
    thinking: z.boolean(),
});
&nbsp;
export type ApiEphemeralActivityUpdate = z.infer&lt;typeof ApiEphemeralActivityUpdateSchema&gt;;
&nbsp;
/**
 * Token/cost usage update
 *
 * Real-time cost and token tracking for a session.
 * Uses flexible Record types to accommodate varying token breakdown keys
 * from different AI providers (Claude, Codex, etc.)
 *
 * Required: `total` key must be present
 * Optional: Additional breakdown keys (input, output, cache_creation, cache_read, etc.)
 */
export const ApiEphemeralUsageUpdateSchema = z.object({
    type: z.literal('usage'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    key: z.string().min(1).max(STRING_LIMITS.LABEL_MAX), // Usage key/identifier
    timestamp: z.number(),
    tokens: z.record(z.string().max(STRING_LIMITS.LABEL_MAX), z.number()).refine(
<span class="fstat-no" title="function not covered" >        (o</span>bj) =&gt; <span class="cstat-no" title="statement not covered" >typeof obj.total === 'number',</span>
        { message: 'tokens.total is required' }
    ),
    cost: z.record(z.string().max(STRING_LIMITS.LABEL_MAX), z.number()).refine(
<span class="fstat-no" title="function not covered" >        (o</span>bj) =&gt; <span class="cstat-no" title="statement not covered" >typeof obj.total === 'number',</span>
        { message: 'cost.total is required' }
    ),
});
&nbsp;
export type ApiEphemeralUsageUpdate = z.infer&lt;typeof ApiEphemeralUsageUpdateSchema&gt;;
&nbsp;
/**
 * Machine activity update
 *
 * Real-time indicator of machine/daemon activity.
 */
export const ApiEphemeralMachineActivityUpdateSchema = z.object({
    type: z.literal('machine-activity'),
    /**
     * Machine ID - uniquely identifies the machine/daemon
     *
     * @remarks
     * Field name: `machineId` (standardized in HAP-655)
     *
     * All machine-related schemas now consistently use `machineId`:
     * - `new-machine`: uses `machineId`
     * - `update-machine`: uses `machineId`
     * - `machine-status`: uses `machineId`
     * - `machine-activity`: uses `machineId`
     *
     * @see ApiNewMachineSchema
     * @see ApiUpdateMachineStateSchema
     * @see ApiEphemeralMachineStatusUpdateSchema
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    active: z.boolean(),
    activeAt: z.number(),
});
&nbsp;
export type ApiEphemeralMachineActivityUpdate = z.infer&lt;typeof ApiEphemeralMachineActivityUpdateSchema&gt;;
&nbsp;
/**
 * Machine online status update
 *
 * Real-time indicator of machine online/offline status.
 */
export const ApiEphemeralMachineStatusUpdateSchema = z.object({
    type: z.literal('machine-status'),
    /**
     * Machine ID - uniquely identifies the machine/daemon
     *
     * @remarks
     * Field name: `machineId`
     *
     * All machine-related schemas consistently use `machineId`:
     * - `new-machine`: uses `machineId`
     * - `update-machine`: uses `machineId`
     * - `machine-status`: uses `machineId`
     * - `machine-activity`: uses `machineId`
     *
     * @see ApiNewMachineSchema
     * @see ApiUpdateMachineStateSchema
     * @see ApiEphemeralMachineActivityUpdateSchema
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    online: z.boolean(),
    timestamp: z.number(),
});
&nbsp;
export type ApiEphemeralMachineStatusUpdate = z.infer&lt;typeof ApiEphemeralMachineStatusUpdateSchema&gt;;
&nbsp;
/**
 * Union of all ephemeral update types
 */
export const ApiEphemeralUpdateSchema = z.union([
    ApiEphemeralActivityUpdateSchema,
    ApiEphemeralUsageUpdateSchema,
    ApiEphemeralMachineActivityUpdateSchema,
    ApiEphemeralMachineStatusUpdateSchema,
]);
&nbsp;
export type ApiEphemeralUpdate = z.infer&lt;typeof ApiEphemeralUpdateSchema&gt;;
&nbsp;
/**
 * Ephemeral update type discriminator values
 */
export type ApiEphemeralUpdateType = ApiEphemeralUpdate['type'];
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/ephemeral/index.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/ephemeral</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> src/ephemeral</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">71.42% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>5/7</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/2</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">71.42% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>5/7</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line medium'></div>
    <div class="pad1">
<table class="coverage-summary">
<thead>
<tr>
   <th data-col="file" data-fmt="html" data-html="true" class="file">File</th>
   <th data-col="pic" data-type="number" data-fmt="html" data-html="true" class="pic"></th>
   <th data-col="statements" data-type="number" data-fmt="pct" class="pct">Statements</th>
   <th data-col="statements_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="branches" data-type="number" data-fmt="pct" class="pct">Branches</th>
   <th data-col="branches_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="functions" data-type="number" data-fmt="pct" class="pct">Functions</th>
   <th data-col="functions_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="lines" data-type="number" data-fmt="pct" class="pct">Lines</th>
   <th data-col="lines_raw" data-type="number" data-fmt="html" class="abs"></th>
</tr>
</thead>
<tbody><tr>
	<td class="file medium" data-value="events.ts"><a href="events.ts.html">events.ts</a></td>
	<td data-value="71.42" class="pic medium">
	<div class="chart"><div class="cover-fill" style="width: 71%"></div><div class="cover-empty" style="width: 29%"></div></div>
	</td>
	<td data-value="71.42" class="pct medium">71.42%</td>
	<td data-value="7" class="abs medium">5/7</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="0" class="pct low">0%</td>
	<td data-value="2" class="abs low">0/2</td>
	<td data-value="71.42" class="pct medium">71.42%</td>
	<td data-value="7" class="abs medium">5/7</td>
	</tr>
<tr>
	<td class="file empty" data-value="index.ts"><a href="index.ts.html">index.ts</a></td>
	<td data-value="0" class="pic empty">
	<div class="chart"><div class="cover-fill" style="width: 0%"></div><div class="cover-empty" style="width: 100%"></div></div>
	</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	</tr>
</tbody>
</table>
</div>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/ephemeral/index.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/ephemeral/index.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/ephemeral</a> index.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>0/0</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line low'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Ephemeral events barrel export
 *
 * Ephemeral events are real-time, non-persistent status updates.
 */
&nbsp;
export * from './events';
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/account.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates/account.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/updates</a> account.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>1/1</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>1/1</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Account-related update schemas
 *
 * Handles: update-account
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { GitHubProfileSchema, ImageRefSchema, NullableVersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
&nbsp;
/**
 * Update account
 *
 * Sent when user account settings or profile changes.
 *
 * @example
 * ```typescript
 * const accountUpdate = ApiUpdateAccountSchema.parse({
 *     t: 'update-account',
 *     id: 'user_abc123',
 *     firstName: 'Jane',
 *     lastName: 'Doe',
 *     avatar: {
 *         path: 'avatars/user_abc123/profile.jpg',
 *         url: 'https://cdn.example.com/avatars/user_abc123/profile.jpg'
 *     },
 *     github: { id: 12345678, login: 'janedoe', name: 'Jane Doe' }
 * });
 * ```
 */
export const ApiUpdateAccountSchema = z.object({
    t: z.literal('update-account'),
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    settings: NullableVersionedValueSchema.nullish(),
    firstName: z.string().max(STRING_LIMITS.NAME_MAX).nullish(),
    lastName: z.string().max(STRING_LIMITS.NAME_MAX).nullish(),
    avatar: ImageRefSchema.nullish(),
    github: GitHubProfileSchema.nullish(),
});
&nbsp;
export type ApiUpdateAccount = z.infer&lt;typeof ApiUpdateAccountSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/artifact.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates/artifact.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/updates</a> artifact.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>3/3</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>3/3</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Artifact-related update schemas
 *
 * Handles: new-artifact, update-artifact, delete-artifact
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { VersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
&nbsp;
/**
 * New artifact update
 *
 * Sent when a new artifact (file/output) is created.
 *
 * @example
 * ```typescript
 * const newArtifact = ApiNewArtifactSchema.parse({
 *     t: 'new-artifact',
 *     artifactId: 'artifact_code1',
 *     header: 'encryptedHeader',
 *     headerVersion: 1,
 *     body: 'encryptedCodeBody',
 *     bodyVersion: 1,
 *     dataEncryptionKey: 'base64EncodedKey==',
 *     seq: 5,
 *     createdAt: Date.now(),
 *     updatedAt: Date.now()
 * });
 * ```
 */
export const ApiNewArtifactSchema = z.object({
    t: z.literal('new-artifact'),
    artifactId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    header: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX), // Encrypted header
    headerVersion: z.number(),
    body: z.string().max(STRING_LIMITS.CONTENT_MAX).optional(), // Encrypted body (optional for header-only artifacts)
    bodyVersion: z.number().optional(),
    dataEncryptionKey: z.string().min(1).max(STRING_LIMITS.DATA_ENCRYPTION_KEY_MAX),
    seq: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
});
&nbsp;
export type ApiNewArtifact = z.infer&lt;typeof ApiNewArtifactSchema&gt;;
&nbsp;
/**
 * Update artifact
 *
 * Sent when artifact header or body changes.
 *
 * @example
 * ```typescript
 * const artifactUpdate = ApiUpdateArtifactSchema.parse({
 *     t: 'update-artifact',
 *     artifactId: 'artifact_code1',
 *     body: { version: 2, value: 'updatedEncryptedBody' }
 * });
 * ```
 */
export const ApiUpdateArtifactSchema = z.object({
    t: z.literal('update-artifact'),
    artifactId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    header: VersionedValueSchema.optional(),
    body: VersionedValueSchema.optional(),
});
&nbsp;
export type ApiUpdateArtifact = z.infer&lt;typeof ApiUpdateArtifactSchema&gt;;
&nbsp;
/**
 * Delete artifact
 *
 * Sent when an artifact is deleted.
 *
 * @example
 * ```typescript
 * const deleteArtifact = ApiDeleteArtifactSchema.parse({
 *     t: 'delete-artifact',
 *     artifactId: 'artifact_code1'
 * });
 * ```
 */
export const ApiDeleteArtifactSchema = z.object({
    t: z.literal('delete-artifact'),
    artifactId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
});
&nbsp;
export type ApiDeleteArtifact = z.infer&lt;typeof ApiDeleteArtifactSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/index.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> src/updates</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>15/15</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>15/15</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <div class="pad1">
<table class="coverage-summary">
<thead>
<tr>
   <th data-col="file" data-fmt="html" data-html="true" class="file">File</th>
   <th data-col="pic" data-type="number" data-fmt="html" data-html="true" class="pic"></th>
   <th data-col="statements" data-type="number" data-fmt="pct" class="pct">Statements</th>
   <th data-col="statements_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="branches" data-type="number" data-fmt="pct" class="pct">Branches</th>
   <th data-col="branches_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="functions" data-type="number" data-fmt="pct" class="pct">Functions</th>
   <th data-col="functions_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="lines" data-type="number" data-fmt="pct" class="pct">Lines</th>
   <th data-col="lines_raw" data-type="number" data-fmt="html" class="abs"></th>
</tr>
</thead>
<tbody><tr>
	<td class="file high" data-value="account.ts"><a href="account.ts.html">account.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="1" class="abs high">1/1</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="1" class="abs high">1/1</td>
	</tr>
<tr>
	<td class="file high" data-value="artifact.ts"><a href="artifact.ts.html">artifact.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	</tr>
<tr>
	<td class="file high" data-value="index.ts"><a href="index.ts.html">index.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="1" class="abs high">1/1</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="1" class="abs high">1/1</td>
	</tr>
<tr>
	<td class="file high" data-value="machine.ts"><a href="machine.ts.html">machine.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="2" class="abs high">2/2</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="2" class="abs high">2/2</td>
	</tr>
<tr>
	<td class="file high" data-value="message.ts"><a href="message.ts.html">message.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	</tr>
<tr>
	<td class="file high" data-value="misc.ts"><a href="misc.ts.html">misc.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	</tr>
<tr>
	<td class="file high" data-value="session.ts"><a href="session.ts.html">session.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="2" class="abs high">2/2</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="2" class="abs high">2/2</td>
	</tr>
</tbody>
</table>
</div>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/index.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates/index.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/updates</a> index.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>1/1</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>1/1</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Update schemas barrel export
 *
 * All persistent update event types for the Happy protocol.
 * Updates represent state changes that are stored and synced.
 */
&nbsp;
import { z } from 'zod';
&nbsp;
// Re-export individual update schemas
export * from './message';
export * from './session';
export * from './machine';
export * from './artifact';
export * from './account';
export * from './misc';
&nbsp;
// Import for discriminated union
import { ApiUpdateNewMessageSchema, ApiDeleteSessionSchema } from './message';
import { ApiUpdateNewSessionSchema, ApiUpdateSessionStateSchema } from './session';
import { ApiNewMachineSchema, ApiUpdateMachineStateSchema } from './machine';
import { ApiNewArtifactSchema, ApiUpdateArtifactSchema, ApiDeleteArtifactSchema } from './artifact';
import { ApiUpdateAccountSchema } from './account';
import { ApiRelationshipUpdatedSchema, ApiNewFeedPostSchema, ApiKvBatchUpdateSchema } from './misc';
&nbsp;
/**
 * Discriminated union of all update types
 *
 * This is the main type for all persistent updates sent via WebSocket.
 * Uses 't' (type) as the discriminator field.
 *
 * @example
 * ```typescript
 * // Parse any incoming WebSocket update
 * const update = ApiUpdateSchema.parse(incomingData);
 *
 * // Type-safe handling based on discriminator
 * switch (update.t) {
 *     case 'new-session':
 *         console.log('New session:', update.id);
 *         break;
 *     case 'new-message':
 *         console.log('Message in session:', update.sid);
 *         break;
 *     // ... handle other update types
 * }
 * ```
 */
export const ApiUpdateSchema = z.discriminatedUnion('t', [
    ApiUpdateNewMessageSchema,
    ApiUpdateNewSessionSchema,
    ApiDeleteSessionSchema,
    ApiUpdateSessionStateSchema,
    ApiUpdateAccountSchema,
    ApiUpdateMachineStateSchema,
    ApiNewMachineSchema,
    ApiNewArtifactSchema,
    ApiUpdateArtifactSchema,
    ApiDeleteArtifactSchema,
    ApiRelationshipUpdatedSchema,
    ApiNewFeedPostSchema,
    ApiKvBatchUpdateSchema,
]);
&nbsp;
export type ApiUpdate = z.infer&lt;typeof ApiUpdateSchema&gt;;
&nbsp;
/**
 * Update type discriminator values
 *
 * Useful for type guards and switch statements.
 */
export type ApiUpdateType = ApiUpdate['t'];
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/machine.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates/machine.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/updates</a> machine.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>2/2</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>2/2</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a>
<a name='L101'></a><a href='#L101'>101</a>
<a name='L102'></a><a href='#L102'>102</a>
<a name='L103'></a><a href='#L103'>103</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Machine-related update schemas
 *
 * Handles: new-machine, update-machine
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { VersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
&nbsp;
/**
 * New machine update
 *
 * Sent when a new CLI machine is registered.
 *
 * @example
 * ```typescript
 * const newMachine = ApiNewMachineSchema.parse({
 *     t: 'new-machine',
 *     machineId: 'machine_laptop1',
 *     seq: 1,
 *     metadata: 'encryptedMachineMetadata',
 *     metadataVersion: 1,
 *     daemonState: null,
 *     daemonStateVersion: 0,
 *     dataEncryptionKey: 'base64EncodedKey==',
 *     active: true,
 *     activeAt: Date.now(),
 *     createdAt: Date.now(),
 *     updatedAt: Date.now()
 * });
 * ```
 */
export const ApiNewMachineSchema = z.object({
    t: z.literal('new-machine'),
    /**
     * Machine ID
     *
     * @remarks
     * Field name: `machineId`
     *
     * Note: Other machine-related schemas use different field names:
     * - `new-machine`, `update-machine`, `machine-status`: use `machineId`
     * - `machine-activity`: uses `id`
     *
     * @see ApiEphemeralMachineActivityUpdateSchema - uses `id` for machine ID
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    seq: z.number(),
    metadata: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX), // Encrypted metadata
    metadataVersion: z.number(),
    daemonState: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX).nullable(), // Encrypted daemon state
    daemonStateVersion: z.number(),
    dataEncryptionKey: z.string().max(STRING_LIMITS.DATA_ENCRYPTION_KEY_MAX).nullable(), // Base64 encoded
    active: z.boolean(),
    activeAt: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
});
&nbsp;
export type ApiNewMachine = z.infer&lt;typeof ApiNewMachineSchema&gt;;
&nbsp;
/**
 * Update machine state
 *
 * Sent when machine metadata or daemon state changes.
 *
 * @example
 * ```typescript
 * const machineUpdate = ApiUpdateMachineStateSchema.parse({
 *     t: 'update-machine',
 *     machineId: 'machine_laptop1',
 *     daemonState: { version: 2, value: 'encryptedDaemonState' },
 *     active: true,
 *     activeAt: Date.now()
 * });
 * ```
 */
export const ApiUpdateMachineStateSchema = z.object({
    t: z.literal('update-machine'),
    /**
     * Machine ID
     *
     * @remarks
     * Field name: `machineId`
     *
     * Note: Other machine-related schemas use different field names:
     * - `new-machine`, `update-machine`, `machine-status`: use `machineId`
     * - `machine-activity`: uses `id`
     *
     * @see ApiEphemeralMachineActivityUpdateSchema - uses `id` for machine ID
     */
    machineId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    metadata: VersionedValueSchema.optional(),
    daemonState: VersionedValueSchema.optional(),
    active: z.boolean().optional(),
    activeAt: z.number().optional(),
});
&nbsp;
export type ApiUpdateMachineState = z.infer&lt;typeof ApiUpdateMachineStateSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/message.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates/message.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/updates</a> message.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>3/3</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>3/3</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a>
<a name='L101'></a><a href='#L101'>101</a>
<a name='L102'></a><a href='#L102'>102</a>
<a name='L103'></a><a href='#L103'>103</a>
<a name='L104'></a><a href='#L104'>104</a>
<a name='L105'></a><a href='#L105'>105</a>
<a name='L106'></a><a href='#L106'>106</a>
<a name='L107'></a><a href='#L107'>107</a>
<a name='L108'></a><a href='#L108'>108</a>
<a name='L109'></a><a href='#L109'>109</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Message-related update schemas
 *
 * Handles: new-message, delete-session (session lifecycle)
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { EncryptedContentSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
&nbsp;
/**
 * API Message schema - encrypted message structure
 *
 * Messages are stored encrypted; the server cannot read content.
 *
 * @example
 * ```typescript
 * const message = ApiMessageSchema.parse({
 *     id: 'msg_xyz789',
 *     seq: 42,
 *     localId: 'local_123',
 *     content: { t: 'encrypted', c: 'base64EncryptedContent==' },
 *     createdAt: Date.now()
 * });
 * ```
 */
export const ApiMessageSchema = z.object({
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    seq: z.number(),
    localId: z.string().max(STRING_LIMITS.LOCAL_ID_MAX).nullish(),
    content: EncryptedContentSchema,
    createdAt: z.number(),
});
&nbsp;
export type ApiMessage = z.infer&lt;typeof ApiMessageSchema&gt;;
&nbsp;
/**
 * New message update
 *
 * Contains the message payload and session reference.
 *
 * @example
 * ```typescript
 * const newMessage = ApiUpdateNewMessageSchema.parse({
 *     t: 'new-message',
 *     sid: 'session_abc123',
 *     message: {
 *         id: 'msg_xyz789',
 *         seq: 42,
 *         content: { t: 'encrypted', c: 'base64EncryptedContent==' },
 *         createdAt: Date.now()
 *     }
 * });
 * ```
 */
export const ApiUpdateNewMessageSchema = z.object({
    t: z.literal('new-message'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    message: ApiMessageSchema,
});
&nbsp;
export type ApiUpdateNewMessage = z.infer&lt;typeof ApiUpdateNewMessageSchema&gt;;
&nbsp;
/**
 * Delete session update
 *
 * Sent when a session is archived or deleted.
 *
 * @example
 * ```typescript
 * const deleteSession = ApiDeleteSessionSchema.parse({
 *     t: 'delete-session',
 *     sid: 'session_abc123'
 * });
 * ```
 */
export const ApiDeleteSessionSchema = z.object({
    t: z.literal('delete-session'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
});
&nbsp;
export type ApiDeleteSession = z.infer&lt;typeof ApiDeleteSessionSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/misc.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates/misc.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/updates</a> misc.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>3/3</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>3/3</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Miscellaneous update schemas
 *
 * Handles: relationship-updated, new-feed-post, kv-batch-update
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { RelationshipStatusSchema, UserProfileSchema, FeedBodySchema } from '../common';
import { STRING_LIMITS } from '../constraints';
&nbsp;
/**
 * Relationship update
 *
 * Sent when a friend relationship status changes.
 *
 * @example
 * ```typescript
 * const relationshipUpdate = ApiRelationshipUpdatedSchema.parse({
 *     t: 'relationship-updated',
 *     fromUserId: 'user_abc123',
 *     toUserId: 'user_xyz789',
 *     status: 'friend',
 *     action: 'created',
 *     timestamp: Date.now()
 * });
 * ```
 */
export const ApiRelationshipUpdatedSchema = z.object({
    t: z.literal('relationship-updated'),
    fromUserId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    toUserId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    status: RelationshipStatusSchema,
    action: z.enum(['created', 'updated', 'deleted']),
    fromUser: UserProfileSchema.optional(),
    toUser: UserProfileSchema.optional(),
    timestamp: z.number(),
});
&nbsp;
export type ApiRelationshipUpdated = z.infer&lt;typeof ApiRelationshipUpdatedSchema&gt;;
&nbsp;
/**
 * New feed post
 *
 * Sent when a new activity feed item is created.
 *
 * @example
 * ```typescript
 * const feedPost = ApiNewFeedPostSchema.parse({
 *     t: 'new-feed-post',
 *     id: 'feed_123',
 *     body: { kind: 'friend_request', uid: 'user_xyz789' },
 *     cursor: 'cursor_abc',
 *     createdAt: Date.now(),
 *     repeatKey: null,
 *     counter: 1
 * });
 * ```
 */
export const ApiNewFeedPostSchema = z.object({
    t: z.literal('new-feed-post'),
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    body: FeedBodySchema,
    cursor: z.string().max(STRING_LIMITS.CURSOR_MAX),
    createdAt: z.number(),
    repeatKey: z.string().max(STRING_LIMITS.REPEAT_KEY_MAX).nullable(),
    counter: z.number(),
});
&nbsp;
export type ApiNewFeedPost = z.infer&lt;typeof ApiNewFeedPostSchema&gt;;
&nbsp;
/**
 * KV batch update
 *
 * Sent when key-value settings change (batch sync).
 *
 * @example
 * ```typescript
 * const kvUpdate = ApiKvBatchUpdateSchema.parse({
 *     t: 'kv-batch-update',
 *     changes: [
 *         { key: 'theme', value: 'dark', version: 1 },
 *         { key: 'notifications', value: 'enabled', version: 2 },
 *         { key: 'deprecated_setting', value: null, version: 3 }  // Deleted
 *     ]
 * });
 * ```
 */
export const ApiKvBatchUpdateSchema = z.object({
    t: z.literal('kv-batch-update'),
    changes: z.array(z.object({
        key: z.string().min(1).max(STRING_LIMITS.KV_KEY_MAX),
        value: z.string().max(STRING_LIMITS.KV_VALUE_MAX).nullable(),
        version: z.number(),
    })),
});
&nbsp;
export type ApiKvBatchUpdate = z.infer&lt;typeof ApiKvBatchUpdateSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/updates/session.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/updates/session.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../../prettify.css" />
    <link rel="stylesheet" href="../../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../../index.html">All files</a> / <a href="index.html">src/updates</a> session.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>2/2</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>2/2</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a>
<a name='L101'></a><a href='#L101'>101</a>
<a name='L102'></a><a href='#L102'>102</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Session-related update schemas
 *
 * Handles: new-session, update-session
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { NullableVersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
&nbsp;
/**
 * New session update
 *
 * Sent when a new Claude Code session is created.
 * Contains initial encrypted metadata and agent state.
 *
 * @example
 * ```typescript
 * const newSession = ApiUpdateNewSessionSchema.parse({
 *     t: 'new-session',
 *     sid: 'session_abc123',
 *     seq: 1,
 *     metadata: 'encryptedMetadataString',
 *     metadataVersion: 1,
 *     agentState: null,
 *     agentStateVersion: 0,
 *     dataEncryptionKey: 'base64EncodedKey==',
 *     active: true,
 *     activeAt: Date.now(),
 *     createdAt: Date.now(),
 *     updatedAt: Date.now()
 * });
 * ```
 */
export const ApiUpdateNewSessionSchema = z.object({
    t: z.literal('new-session'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    seq: z.number(),
    metadata: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX), // Encrypted metadata
    metadataVersion: z.number(),
    agentState: z.string().max(STRING_LIMITS.ENCRYPTED_STATE_MAX).nullable(), // Encrypted agent state
    agentStateVersion: z.number(),
    dataEncryptionKey: z.string().max(STRING_LIMITS.DATA_ENCRYPTION_KEY_MAX).nullable(), // Base64 encoded
    active: z.boolean(),
    activeAt: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
});
&nbsp;
export type ApiUpdateNewSession = z.infer&lt;typeof ApiUpdateNewSessionSchema&gt;;
&nbsp;
/**
 * Update session state
 *
 * Sent when session metadata or agent state changes.
 * Both fields are optional - only changed fields are included.
 *
 * @example
 * ```typescript
 * const sessionUpdate = ApiUpdateSessionStateSchema.parse({
 *     t: 'update-session',
 *     sid: 'session_abc123',
 *     agentState: { version: 2, value: 'encryptedState' },
 *     metadata: { version: 3, value: null }  // Cleared metadata
 * });
 * ```
 */
export const ApiUpdateSessionStateSchema = z.object({
    t: z.literal('update-session'),
    /**
     * Session ID
     *
     * @remarks
     * Field name: `sid` (short for session ID)
     *
     * All session-related schemas now use `sid` for consistency:
     * - `new-session`, `update-session`, `new-message`, `delete-session`: use `sid`
     * - Ephemeral events (`activity`, `usage`): use `sid`
     *
     * @see HAP-654 - Standardization of session ID field names
     */
    sid: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    agentState: NullableVersionedValueSchema.nullish(),
    metadata: NullableVersionedValueSchema.nullish(),
});
&nbsp;
export type ApiUpdateSessionState = z.infer&lt;typeof ApiUpdateSessionStateSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../../sorter.js"></script>
        <script src="../../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/common.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/common.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../prettify.css" />
    <link rel="stylesheet" href="../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../index.html">All files</a> / <a href="index.html">src</a> common.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>8/8</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>8/8</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a>
<a name='L101'></a><a href='#L101'>101</a>
<a name='L102'></a><a href='#L102'>102</a>
<a name='L103'></a><a href='#L103'>103</a>
<a name='L104'></a><a href='#L104'>104</a>
<a name='L105'></a><a href='#L105'>105</a>
<a name='L106'></a><a href='#L106'>106</a>
<a name='L107'></a><a href='#L107'>107</a>
<a name='L108'></a><a href='#L108'>108</a>
<a name='L109'></a><a href='#L109'>109</a>
<a name='L110'></a><a href='#L110'>110</a>
<a name='L111'></a><a href='#L111'>111</a>
<a name='L112'></a><a href='#L112'>112</a>
<a name='L113'></a><a href='#L113'>113</a>
<a name='L114'></a><a href='#L114'>114</a>
<a name='L115'></a><a href='#L115'>115</a>
<a name='L116'></a><a href='#L116'>116</a>
<a name='L117'></a><a href='#L117'>117</a>
<a name='L118'></a><a href='#L118'>118</a>
<a name='L119'></a><a href='#L119'>119</a>
<a name='L120'></a><a href='#L120'>120</a>
<a name='L121'></a><a href='#L121'>121</a>
<a name='L122'></a><a href='#L122'>122</a>
<a name='L123'></a><a href='#L123'>123</a>
<a name='L124'></a><a href='#L124'>124</a>
<a name='L125'></a><a href='#L125'>125</a>
<a name='L126'></a><a href='#L126'>126</a>
<a name='L127'></a><a href='#L127'>127</a>
<a name='L128'></a><a href='#L128'>128</a>
<a name='L129'></a><a href='#L129'>129</a>
<a name='L130'></a><a href='#L130'>130</a>
<a name='L131'></a><a href='#L131'>131</a>
<a name='L132'></a><a href='#L132'>132</a>
<a name='L133'></a><a href='#L133'>133</a>
<a name='L134'></a><a href='#L134'>134</a>
<a name='L135'></a><a href='#L135'>135</a>
<a name='L136'></a><a href='#L136'>136</a>
<a name='L137'></a><a href='#L137'>137</a>
<a name='L138'></a><a href='#L138'>138</a>
<a name='L139'></a><a href='#L139'>139</a>
<a name='L140'></a><a href='#L140'>140</a>
<a name='L141'></a><a href='#L141'>141</a>
<a name='L142'></a><a href='#L142'>142</a>
<a name='L143'></a><a href='#L143'>143</a>
<a name='L144'></a><a href='#L144'>144</a>
<a name='L145'></a><a href='#L145'>145</a>
<a name='L146'></a><a href='#L146'>146</a>
<a name='L147'></a><a href='#L147'>147</a>
<a name='L148'></a><a href='#L148'>148</a>
<a name='L149'></a><a href='#L149'>149</a>
<a name='L150'></a><a href='#L150'>150</a>
<a name='L151'></a><a href='#L151'>151</a>
<a name='L152'></a><a href='#L152'>152</a>
<a name='L153'></a><a href='#L153'>153</a>
<a name='L154'></a><a href='#L154'>154</a>
<a name='L155'></a><a href='#L155'>155</a>
<a name='L156'></a><a href='#L156'>156</a>
<a name='L157'></a><a href='#L157'>157</a>
<a name='L158'></a><a href='#L158'>158</a>
<a name='L159'></a><a href='#L159'>159</a>
<a name='L160'></a><a href='#L160'>160</a>
<a name='L161'></a><a href='#L161'>161</a>
<a name='L162'></a><a href='#L162'>162</a>
<a name='L163'></a><a href='#L163'>163</a>
<a name='L164'></a><a href='#L164'>164</a>
<a name='L165'></a><a href='#L165'>165</a>
<a name='L166'></a><a href='#L166'>166</a>
<a name='L167'></a><a href='#L167'>167</a>
<a name='L168'></a><a href='#L168'>168</a>
<a name='L169'></a><a href='#L169'>169</a>
<a name='L170'></a><a href='#L170'>170</a>
<a name='L171'></a><a href='#L171'>171</a>
<a name='L172'></a><a href='#L172'>172</a>
<a name='L173'></a><a href='#L173'>173</a>
<a name='L174'></a><a href='#L174'>174</a>
<a name='L175'></a><a href='#L175'>175</a>
<a name='L176'></a><a href='#L176'>176</a>
<a name='L177'></a><a href='#L177'>177</a>
<a name='L178'></a><a href='#L178'>178</a>
<a name='L179'></a><a href='#L179'>179</a>
<a name='L180'></a><a href='#L180'>180</a>
<a name='L181'></a><a href='#L181'>181</a>
<a name='L182'></a><a href='#L182'>182</a>
<a name='L183'></a><a href='#L183'>183</a>
<a name='L184'></a><a href='#L184'>184</a>
<a name='L185'></a><a href='#L185'>185</a>
<a name='L186'></a><a href='#L186'>186</a>
<a name='L187'></a><a href='#L187'>187</a>
<a name='L188'></a><a href='#L188'>188</a>
<a name='L189'></a><a href='#L189'>189</a>
<a name='L190'></a><a href='#L190'>190</a>
<a name='L191'></a><a href='#L191'>191</a>
<a name='L192'></a><a href='#L192'>192</a>
<a name='L193'></a><a href='#L193'>193</a>
<a name='L194'></a><a href='#L194'>194</a>
<a name='L195'></a><a href='#L195'>195</a>
<a name='L196'></a><a href='#L196'>196</a>
<a name='L197'></a><a href='#L197'>197</a>
<a name='L198'></a><a href='#L198'>198</a>
<a name='L199'></a><a href='#L199'>199</a>
<a name='L200'></a><a href='#L200'>200</a>
<a name='L201'></a><a href='#L201'>201</a>
<a name='L202'></a><a href='#L202'>202</a>
<a name='L203'></a><a href='#L203'>203</a>
<a name='L204'></a><a href='#L204'>204</a>
<a name='L205'></a><a href='#L205'>205</a>
<a name='L206'></a><a href='#L206'>206</a>
<a name='L207'></a><a href='#L207'>207</a>
<a name='L208'></a><a href='#L208'>208</a>
<a name='L209'></a><a href='#L209'>209</a>
<a name='L210'></a><a href='#L210'>210</a>
<a name='L211'></a><a href='#L211'>211</a>
<a name='L212'></a><a href='#L212'>212</a>
<a name='L213'></a><a href='#L213'>213</a>
<a name='L214'></a><a href='#L214'>214</a>
<a name='L215'></a><a href='#L215'>215</a>
<a name='L216'></a><a href='#L216'>216</a>
<a name='L217'></a><a href='#L217'>217</a>
<a name='L218'></a><a href='#L218'>218</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Common types shared across Happy protocol
 *
 * These are foundational types used by multiple update and ephemeral schemas.
 *
 * Security: All string fields have maximum length constraints to prevent
 * DoS attacks via oversized payloads and database bloat.
 *
 * @see ./constraints.ts for STRING_LIMITS constants
 */
&nbsp;
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
&nbsp;
/**
 * GitHub profile data from OAuth
 * Used in update-account events
 *
 * IMPORTANT: This is the CANONICAL schema - all projects must import from here.
 *
 * GitHub API field requirements:
 * - id: Always present (required)
 * - login: Always present (required)
 * - name: User-settable, can be null or missing
 * - avatar_url: Usually present but not guaranteed
 * - email: User preference, can be null or missing
 * - bio: Optional user field, can be null or missing
 *
 * We use .strip() to safely ignore additional GitHub fields while preventing
 * prototype pollution and storage bloat attacks.
 *
 * @example
 * ```typescript
 * const profile = GitHubProfileSchema.parse({
 *     id: 12345678,
 *     login: 'octocat',
 *     name: 'The Octocat',
 *     avatar_url: 'https://avatars.githubusercontent.com/u/12345678',
 *     email: 'octocat@github.com',
 *     bio: 'I love coding!'
 * });
 * ```
 */
export const GitHubProfileSchema = z.object({
    id: z.number(),
    login: z.string().min(1).max(STRING_LIMITS.USERNAME_MAX),
    name: z.string().max(STRING_LIMITS.NAME_MAX).nullable().optional(),
    avatar_url: z.string().max(STRING_LIMITS.URL_MAX).optional(),
    email: z.string().max(STRING_LIMITS.NAME_MAX).nullable().optional(),
    bio: z.string().max(STRING_LIMITS.BIO_MAX).nullable().optional(),
}).strip();
&nbsp;
export type GitHubProfile = z.infer&lt;typeof GitHubProfileSchema&gt;;
&nbsp;
/**
 * Image reference for avatars and other media
 *
 * Note: width, height, and thumbhash are optional because:
 * - Image dimensions may not be available at upload time
 * - Thumbhash is generated asynchronously and may not exist yet
 *
 * @example
 * ```typescript
 * const avatar = ImageRefSchema.parse({
 *     path: 'avatars/user123/profile.jpg',
 *     url: 'https://cdn.example.com/avatars/user123/profile.jpg',
 *     width: 256,
 *     height: 256,
 *     thumbhash: 'YJqGPQw7WGdweIeAeH...'
 * });
 * ```
 */
export const ImageRefSchema = z.object({
    path: z.string().min(1).max(STRING_LIMITS.PATH_MAX),
    url: z.string().min(1).max(STRING_LIMITS.URL_MAX),
    width: z.number().optional(),
    height: z.number().optional(),
    thumbhash: z.string().max(STRING_LIMITS.THUMBHASH_MAX).optional(),
});
&nbsp;
export type ImageRef = z.infer&lt;typeof ImageRefSchema&gt;;
&nbsp;
/**
 * Relationship status between users
 *
 * @example
 * ```typescript
 * const status = RelationshipStatusSchema.parse('friend');
 * // Valid values: 'none', 'requested', 'pending', 'friend', 'rejected'
 * ```
 */
export const RelationshipStatusSchema = z.enum([
    'none',
    'requested',
    'pending',
    'friend',
    'rejected',
]);
&nbsp;
export type RelationshipStatus = z.infer&lt;typeof RelationshipStatusSchema&gt;;
&nbsp;
/**
 * User profile for social features
 *
 * @example
 * ```typescript
 * const user = UserProfileSchema.parse({
 *     id: 'user_abc123',
 *     firstName: 'Jane',
 *     lastName: 'Doe',
 *     avatar: null,
 *     username: 'janedoe',
 *     bio: 'Software developer',
 *     status: 'friend'
 * });
 * ```
 */
export const UserProfileSchema = z.object({
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    firstName: z.string().min(1).max(STRING_LIMITS.NAME_MAX),
    lastName: z.string().max(STRING_LIMITS.NAME_MAX).nullable(),
    avatar: ImageRefSchema.nullable(),
    username: z.string().min(1).max(STRING_LIMITS.USERNAME_MAX),
    bio: z.string().max(STRING_LIMITS.BIO_MAX).nullable(),
    status: RelationshipStatusSchema,
});
&nbsp;
export type UserProfile = z.infer&lt;typeof UserProfileSchema&gt;;
&nbsp;
/**
 * Feed body types for activity feed
 *
 * @example
 * ```typescript
 * // Friend request notification
 * const friendRequest = FeedBodySchema.parse({
 *     kind: 'friend_request',
 *     uid: 'user_xyz789'
 * });
 *
 * // Text notification
 * const textPost = FeedBodySchema.parse({
 *     kind: 'text',
 *     text: 'Welcome to Happy!'
 * });
 * ```
 */
export const FeedBodySchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('friend_request'), uid: z.string().min(1).max(STRING_LIMITS.ID_MAX) }),
    z.object({ kind: z.literal('friend_accepted'), uid: z.string().min(1).max(STRING_LIMITS.ID_MAX) }),
    z.object({ kind: z.literal('text'), text: z.string().max(STRING_LIMITS.FEED_TEXT_MAX) }),
]);
&nbsp;
export type FeedBody = z.infer&lt;typeof FeedBodySchema&gt;;
&nbsp;
/**
 * Encrypted message content structure
 * Used for all encrypted payloads in the protocol
 *
 * @example
 * ```typescript
 * const encrypted = EncryptedContentSchema.parse({
 *     t: 'encrypted',
 *     c: 'base64EncodedEncryptedContent=='
 * });
 * ```
 */
export const EncryptedContentSchema = z.object({
    t: z.literal('encrypted'),
    c: z.string().max(STRING_LIMITS.CONTENT_MAX), // Base64 encoded encrypted content
});
&nbsp;
export type EncryptedContent = z.infer&lt;typeof EncryptedContentSchema&gt;;
&nbsp;
/**
 * Versioned value wrapper for optimistic concurrency
 * Used for metadata, agentState, daemonState, etc.
 *
 * @example
 * ```typescript
 * const versioned = VersionedValueSchema.parse({
 *     version: 5,
 *     value: '{"key": "encrypted-data"}'
 * });
 * ```
 */
export const VersionedValueSchema = z.object({
    version: z.number(),
    value: z.string().max(STRING_LIMITS.VERSIONED_VALUE_MAX),
});
&nbsp;
export type VersionedValue = z.infer&lt;typeof VersionedValueSchema&gt;;
&nbsp;
/**
 * Nullable versioned value (for updates where value can be cleared)
 *
 * @example
 * ```typescript
 * // Set a value
 * const withValue = NullableVersionedValueSchema.parse({
 *     version: 3,
 *     value: '{"state": "active"}'
 * });
 *
 * // Clear a value
 * const cleared = NullableVersionedValueSchema.parse({
 *     version: 4,
 *     value: null
 * });
 * ```
 */
export const NullableVersionedValueSchema = z.object({
    version: z.number(),
    value: z.string().max(STRING_LIMITS.VERSIONED_VALUE_MAX).nullable(),
});
&nbsp;
export type NullableVersionedValue = z.infer&lt;typeof NullableVersionedValueSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../sorter.js"></script>
        <script src="../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/constraints.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/constraints.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../prettify.css" />
    <link rel="stylesheet" href="../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../index.html">All files</a> / <a href="index.html">src</a> constraints.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>3/3</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>3/3</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a>
<a name='L101'></a><a href='#L101'>101</a>
<a name='L102'></a><a href='#L102'>102</a>
<a name='L103'></a><a href='#L103'>103</a>
<a name='L104'></a><a href='#L104'>104</a>
<a name='L105'></a><a href='#L105'>105</a>
<a name='L106'></a><a href='#L106'>106</a>
<a name='L107'></a><a href='#L107'>107</a>
<a name='L108'></a><a href='#L108'>108</a>
<a name='L109'></a><a href='#L109'>109</a>
<a name='L110'></a><a href='#L110'>110</a>
<a name='L111'></a><a href='#L111'>111</a>
<a name='L112'></a><a href='#L112'>112</a>
<a name='L113'></a><a href='#L113'>113</a>
<a name='L114'></a><a href='#L114'>114</a>
<a name='L115'></a><a href='#L115'>115</a>
<a name='L116'></a><a href='#L116'>116</a>
<a name='L117'></a><a href='#L117'>117</a>
<a name='L118'></a><a href='#L118'>118</a>
<a name='L119'></a><a href='#L119'>119</a>
<a name='L120'></a><a href='#L120'>120</a>
<a name='L121'></a><a href='#L121'>121</a>
<a name='L122'></a><a href='#L122'>122</a>
<a name='L123'></a><a href='#L123'>123</a>
<a name='L124'></a><a href='#L124'>124</a>
<a name='L125'></a><a href='#L125'>125</a>
<a name='L126'></a><a href='#L126'>126</a>
<a name='L127'></a><a href='#L127'>127</a>
<a name='L128'></a><a href='#L128'>128</a>
<a name='L129'></a><a href='#L129'>129</a>
<a name='L130'></a><a href='#L130'>130</a>
<a name='L131'></a><a href='#L131'>131</a>
<a name='L132'></a><a href='#L132'>132</a>
<a name='L133'></a><a href='#L133'>133</a>
<a name='L134'></a><a href='#L134'>134</a>
<a name='L135'></a><a href='#L135'>135</a>
<a name='L136'></a><a href='#L136'>136</a>
<a name='L137'></a><a href='#L137'>137</a>
<a name='L138'></a><a href='#L138'>138</a>
<a name='L139'></a><a href='#L139'>139</a>
<a name='L140'></a><a href='#L140'>140</a>
<a name='L141'></a><a href='#L141'>141</a>
<a name='L142'></a><a href='#L142'>142</a>
<a name='L143'></a><a href='#L143'>143</a>
<a name='L144'></a><a href='#L144'>144</a>
<a name='L145'></a><a href='#L145'>145</a>
<a name='L146'></a><a href='#L146'>146</a>
<a name='L147'></a><a href='#L147'>147</a>
<a name='L148'></a><a href='#L148'>148</a>
<a name='L149'></a><a href='#L149'>149</a>
<a name='L150'></a><a href='#L150'>150</a>
<a name='L151'></a><a href='#L151'>151</a>
<a name='L152'></a><a href='#L152'>152</a>
<a name='L153'></a><a href='#L153'>153</a>
<a name='L154'></a><a href='#L154'>154</a>
<a name='L155'></a><a href='#L155'>155</a>
<a name='L156'></a><a href='#L156'>156</a>
<a name='L157'></a><a href='#L157'>157</a>
<a name='L158'></a><a href='#L158'>158</a>
<a name='L159'></a><a href='#L159'>159</a>
<a name='L160'></a><a href='#L160'>160</a>
<a name='L161'></a><a href='#L161'>161</a>
<a name='L162'></a><a href='#L162'>162</a>
<a name='L163'></a><a href='#L163'>163</a>
<a name='L164'></a><a href='#L164'>164</a>
<a name='L165'></a><a href='#L165'>165</a>
<a name='L166'></a><a href='#L166'>166</a>
<a name='L167'></a><a href='#L167'>167</a>
<a name='L168'></a><a href='#L168'>168</a>
<a name='L169'></a><a href='#L169'>169</a>
<a name='L170'></a><a href='#L170'>170</a>
<a name='L171'></a><a href='#L171'>171</a>
<a name='L172'></a><a href='#L172'>172</a>
<a name='L173'></a><a href='#L173'>173</a>
<a name='L174'></a><a href='#L174'>174</a>
<a name='L175'></a><a href='#L175'>175</a>
<a name='L176'></a><a href='#L176'>176</a>
<a name='L177'></a><a href='#L177'>177</a>
<a name='L178'></a><a href='#L178'>178</a>
<a name='L179'></a><a href='#L179'>179</a>
<a name='L180'></a><a href='#L180'>180</a>
<a name='L181'></a><a href='#L181'>181</a>
<a name='L182'></a><a href='#L182'>182</a>
<a name='L183'></a><a href='#L183'>183</a>
<a name='L184'></a><a href='#L184'>184</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * String length constraints and validation patterns for input validation
 *
 * These constants define security-focused limits to prevent:
 * - Memory exhaustion from oversized payloads (DoS)
 * - Database bloat from unbounded field sizes
 * - Buffer overflow issues
 * - Log injection attacks
 *
 * @see https://owasp.org/www-community/controls/Input_Validation
 */
&nbsp;
/**
 * Maximum string lengths for different field types
 *
 * Categories:
 * - Short: Labels, titles, names (UI-displayed, single line)
 * - Medium: Descriptions, summaries (multi-line, bounded)
 * - Large: Content, messages (main payload data)
 * - IDs: Fixed-length identifiers
 */
export const STRING_LIMITS = {
    // ═══════════════════════════════════════════════════════════════
    // Short strings (single-line, UI-displayed)
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Max title length (session titles, artifact titles) */
    TITLE_MAX: 256,
&nbsp;
    /** Max name length (user names, machine names, server names) */
    NAME_MAX: 128,
&nbsp;
    /** Max label/tag length (short identifiers) */
    LABEL_MAX: 64,
&nbsp;
    /** Max username length (login identifiers) */
    USERNAME_MAX: 64,
&nbsp;
    // ═══════════════════════════════════════════════════════════════
    // Medium strings (multi-line, bounded content)
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Max description length (session descriptions, bios) */
    DESCRIPTION_MAX: 4096,
&nbsp;
    /** Max summary length (short descriptions) */
    SUMMARY_MAX: 1024,
&nbsp;
    /** Max bio length (user profile bios) */
    BIO_MAX: 500,
&nbsp;
    // ═══════════════════════════════════════════════════════════════
    // Large strings (main payload content)
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Max content length for encrypted payloads (1MB) */
    CONTENT_MAX: 1_000_000,
&nbsp;
    /** Max message content length (100KB) */
    MESSAGE_MAX: 100_000,
&nbsp;
    /** Max encrypted state length (500KB) */
    ENCRYPTED_STATE_MAX: 500_000,
&nbsp;
    /** Max versioned value content (500KB) */
    VERSIONED_VALUE_MAX: 500_000,
&nbsp;
    // ═══════════════════════════════════════════════════════════════
    // IDs and tokens
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Standard UUID length (36 chars with hyphens) */
    UUID_LENGTH: 36,
&nbsp;
    /** Max token/key length (for encryption keys, API tokens) */
    TOKEN_MAX: 8192,
&nbsp;
    /** Max data encryption key length (base64 encoded NaCl key) */
    DATA_ENCRYPTION_KEY_MAX: 256,
&nbsp;
    /** Max session/machine/artifact ID length */
    ID_MAX: 128,
&nbsp;
    /** Max local ID length (client-generated IDs) */
    LOCAL_ID_MAX: 128,
&nbsp;
    // ═══════════════════════════════════════════════════════════════
    // URLs and paths
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Max URL length */
    URL_MAX: 2048,
&nbsp;
    /** Max file path length */
    PATH_MAX: 1024,
&nbsp;
    /** Max thumbhash length (base64 encoded placeholder image) */
    THUMBHASH_MAX: 256,
&nbsp;
    // ═══════════════════════════════════════════════════════════════
    // KV and settings
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Max KV key length */
    KV_KEY_MAX: 256,
&nbsp;
    /** Max KV value length */
    KV_VALUE_MAX: 65536, // 64KB
&nbsp;
    // ═══════════════════════════════════════════════════════════════
    // MCP-specific
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Max MCP server name length */
    MCP_SERVER_NAME_MAX: 128,
&nbsp;
    /** Max MCP tool name length */
    MCP_TOOL_NAME_MAX: 128,
&nbsp;
    /** Max MCP tool description length */
    MCP_TOOL_DESCRIPTION_MAX: 2048,
&nbsp;
    // ═══════════════════════════════════════════════════════════════
    // Feed and social
    // ═══════════════════════════════════════════════════════════════
&nbsp;
    /** Max feed post text length */
    FEED_TEXT_MAX: 4096,
&nbsp;
    /** Max cursor string length */
    CURSOR_MAX: 256,
&nbsp;
    /** Max repeat key length */
    REPEAT_KEY_MAX: 128,
} as const;
&nbsp;
/**
 * Validation patterns for format checking
 *
 * Note: These are security-focused patterns. For GitHub specifically,
 * we validate username format but allow passthrough for additional fields.
 */
export const PATTERNS = {
    /** URL slug pattern (lowercase alphanumeric with hyphens) */
    SLUG: /^[a-z0-9-]+$/,
&nbsp;
    /** Basic email format validation */
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
&nbsp;
    /** Username pattern (alphanumeric with underscores and hyphens) */
    USERNAME: /^[a-zA-Z0-9_-]+$/,
&nbsp;
    /** GitHub login pattern (alphanumeric with hyphens, no leading/trailing) */
    GITHUB_LOGIN: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
&nbsp;
    /** Safe string pattern (no control characters except newline/tab) */
    SAFE_STRING: /^[^\x00-\x08\x0B\x0C\x0E-\x1F]*$/,
} as const;
&nbsp;
/**
 * Request body size limits for server-level validation
 *
 * These are enforced at the server level before schema validation.
 * Schema-level limits provide defense in depth.
 */
export const BODY_SIZE_LIMITS = {
    /** Default max request body (5MB) */
    DEFAULT: 5 * 1024 * 1024,
&nbsp;
    /** Max body for file uploads (50MB) */
    UPLOAD: 50 * 1024 * 1024,
&nbsp;
    /** Max body for sync payloads (10MB) */
    SYNC: 10 * 1024 * 1024,
&nbsp;
    /** Max body for admin API (1MB) */
    ADMIN: 1 * 1024 * 1024,
} as const;
&nbsp;
// Type exports for better IDE support
export type StringLimits = typeof STRING_LIMITS;
export type Patterns = typeof PATTERNS;
export type BodySizeLimits = typeof BODY_SIZE_LIMITS;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../sorter.js"></script>
        <script src="../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/helpers.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/helpers.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../prettify.css" />
    <link rel="stylesheet" href="../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../index.html">All files</a> / <a href="index.html">src</a> helpers.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">91.3% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>21/23</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">90.9% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>10/11</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>12/12</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">91.3% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>21/23</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a>
<a name='L91'></a><a href='#L91'>91</a>
<a name='L92'></a><a href='#L92'>92</a>
<a name='L93'></a><a href='#L93'>93</a>
<a name='L94'></a><a href='#L94'>94</a>
<a name='L95'></a><a href='#L95'>95</a>
<a name='L96'></a><a href='#L96'>96</a>
<a name='L97'></a><a href='#L97'>97</a>
<a name='L98'></a><a href='#L98'>98</a>
<a name='L99'></a><a href='#L99'>99</a>
<a name='L100'></a><a href='#L100'>100</a>
<a name='L101'></a><a href='#L101'>101</a>
<a name='L102'></a><a href='#L102'>102</a>
<a name='L103'></a><a href='#L103'>103</a>
<a name='L104'></a><a href='#L104'>104</a>
<a name='L105'></a><a href='#L105'>105</a>
<a name='L106'></a><a href='#L106'>106</a>
<a name='L107'></a><a href='#L107'>107</a>
<a name='L108'></a><a href='#L108'>108</a>
<a name='L109'></a><a href='#L109'>109</a>
<a name='L110'></a><a href='#L110'>110</a>
<a name='L111'></a><a href='#L111'>111</a>
<a name='L112'></a><a href='#L112'>112</a>
<a name='L113'></a><a href='#L113'>113</a>
<a name='L114'></a><a href='#L114'>114</a>
<a name='L115'></a><a href='#L115'>115</a>
<a name='L116'></a><a href='#L116'>116</a>
<a name='L117'></a><a href='#L117'>117</a>
<a name='L118'></a><a href='#L118'>118</a>
<a name='L119'></a><a href='#L119'>119</a>
<a name='L120'></a><a href='#L120'>120</a>
<a name='L121'></a><a href='#L121'>121</a>
<a name='L122'></a><a href='#L122'>122</a>
<a name='L123'></a><a href='#L123'>123</a>
<a name='L124'></a><a href='#L124'>124</a>
<a name='L125'></a><a href='#L125'>125</a>
<a name='L126'></a><a href='#L126'>126</a>
<a name='L127'></a><a href='#L127'>127</a>
<a name='L128'></a><a href='#L128'>128</a>
<a name='L129'></a><a href='#L129'>129</a>
<a name='L130'></a><a href='#L130'>130</a>
<a name='L131'></a><a href='#L131'>131</a>
<a name='L132'></a><a href='#L132'>132</a>
<a name='L133'></a><a href='#L133'>133</a>
<a name='L134'></a><a href='#L134'>134</a>
<a name='L135'></a><a href='#L135'>135</a>
<a name='L136'></a><a href='#L136'>136</a>
<a name='L137'></a><a href='#L137'>137</a>
<a name='L138'></a><a href='#L138'>138</a>
<a name='L139'></a><a href='#L139'>139</a>
<a name='L140'></a><a href='#L140'>140</a>
<a name='L141'></a><a href='#L141'>141</a>
<a name='L142'></a><a href='#L142'>142</a>
<a name='L143'></a><a href='#L143'>143</a>
<a name='L144'></a><a href='#L144'>144</a>
<a name='L145'></a><a href='#L145'>145</a>
<a name='L146'></a><a href='#L146'>146</a>
<a name='L147'></a><a href='#L147'>147</a>
<a name='L148'></a><a href='#L148'>148</a>
<a name='L149'></a><a href='#L149'>149</a>
<a name='L150'></a><a href='#L150'>150</a>
<a name='L151'></a><a href='#L151'>151</a>
<a name='L152'></a><a href='#L152'>152</a>
<a name='L153'></a><a href='#L153'>153</a>
<a name='L154'></a><a href='#L154'>154</a>
<a name='L155'></a><a href='#L155'>155</a>
<a name='L156'></a><a href='#L156'>156</a>
<a name='L157'></a><a href='#L157'>157</a>
<a name='L158'></a><a href='#L158'>158</a>
<a name='L159'></a><a href='#L159'>159</a>
<a name='L160'></a><a href='#L160'>160</a>
<a name='L161'></a><a href='#L161'>161</a>
<a name='L162'></a><a href='#L162'>162</a>
<a name='L163'></a><a href='#L163'>163</a>
<a name='L164'></a><a href='#L164'>164</a>
<a name='L165'></a><a href='#L165'>165</a>
<a name='L166'></a><a href='#L166'>166</a>
<a name='L167'></a><a href='#L167'>167</a>
<a name='L168'></a><a href='#L168'>168</a>
<a name='L169'></a><a href='#L169'>169</a>
<a name='L170'></a><a href='#L170'>170</a>
<a name='L171'></a><a href='#L171'>171</a>
<a name='L172'></a><a href='#L172'>172</a>
<a name='L173'></a><a href='#L173'>173</a>
<a name='L174'></a><a href='#L174'>174</a>
<a name='L175'></a><a href='#L175'>175</a>
<a name='L176'></a><a href='#L176'>176</a>
<a name='L177'></a><a href='#L177'>177</a>
<a name='L178'></a><a href='#L178'>178</a>
<a name='L179'></a><a href='#L179'>179</a>
<a name='L180'></a><a href='#L180'>180</a>
<a name='L181'></a><a href='#L181'>181</a>
<a name='L182'></a><a href='#L182'>182</a>
<a name='L183'></a><a href='#L183'>183</a>
<a name='L184'></a><a href='#L184'>184</a>
<a name='L185'></a><a href='#L185'>185</a>
<a name='L186'></a><a href='#L186'>186</a>
<a name='L187'></a><a href='#L187'>187</a>
<a name='L188'></a><a href='#L188'>188</a>
<a name='L189'></a><a href='#L189'>189</a>
<a name='L190'></a><a href='#L190'>190</a>
<a name='L191'></a><a href='#L191'>191</a>
<a name='L192'></a><a href='#L192'>192</a>
<a name='L193'></a><a href='#L193'>193</a>
<a name='L194'></a><a href='#L194'>194</a>
<a name='L195'></a><a href='#L195'>195</a>
<a name='L196'></a><a href='#L196'>196</a>
<a name='L197'></a><a href='#L197'>197</a>
<a name='L198'></a><a href='#L198'>198</a>
<a name='L199'></a><a href='#L199'>199</a>
<a name='L200'></a><a href='#L200'>200</a>
<a name='L201'></a><a href='#L201'>201</a>
<a name='L202'></a><a href='#L202'>202</a>
<a name='L203'></a><a href='#L203'>203</a>
<a name='L204'></a><a href='#L204'>204</a>
<a name='L205'></a><a href='#L205'>205</a>
<a name='L206'></a><a href='#L206'>206</a>
<a name='L207'></a><a href='#L207'>207</a>
<a name='L208'></a><a href='#L208'>208</a>
<a name='L209'></a><a href='#L209'>209</a>
<a name='L210'></a><a href='#L210'>210</a>
<a name='L211'></a><a href='#L211'>211</a>
<a name='L212'></a><a href='#L212'>212</a>
<a name='L213'></a><a href='#L213'>213</a>
<a name='L214'></a><a href='#L214'>214</a>
<a name='L215'></a><a href='#L215'>215</a>
<a name='L216'></a><a href='#L216'>216</a>
<a name='L217'></a><a href='#L217'>217</a>
<a name='L218'></a><a href='#L218'>218</a>
<a name='L219'></a><a href='#L219'>219</a>
<a name='L220'></a><a href='#L220'>220</a>
<a name='L221'></a><a href='#L221'>221</a>
<a name='L222'></a><a href='#L222'>222</a>
<a name='L223'></a><a href='#L223'>223</a>
<a name='L224'></a><a href='#L224'>224</a>
<a name='L225'></a><a href='#L225'>225</a>
<a name='L226'></a><a href='#L226'>226</a>
<a name='L227'></a><a href='#L227'>227</a>
<a name='L228'></a><a href='#L228'>228</a>
<a name='L229'></a><a href='#L229'>229</a>
<a name='L230'></a><a href='#L230'>230</a>
<a name='L231'></a><a href='#L231'>231</a>
<a name='L232'></a><a href='#L232'>232</a>
<a name='L233'></a><a href='#L233'>233</a>
<a name='L234'></a><a href='#L234'>234</a>
<a name='L235'></a><a href='#L235'>235</a>
<a name='L236'></a><a href='#L236'>236</a>
<a name='L237'></a><a href='#L237'>237</a>
<a name='L238'></a><a href='#L238'>238</a>
<a name='L239'></a><a href='#L239'>239</a>
<a name='L240'></a><a href='#L240'>240</a>
<a name='L241'></a><a href='#L241'>241</a>
<a name='L242'></a><a href='#L242'>242</a>
<a name='L243'></a><a href='#L243'>243</a>
<a name='L244'></a><a href='#L244'>244</a>
<a name='L245'></a><a href='#L245'>245</a>
<a name='L246'></a><a href='#L246'>246</a>
<a name='L247'></a><a href='#L247'>247</a>
<a name='L248'></a><a href='#L248'>248</a>
<a name='L249'></a><a href='#L249'>249</a>
<a name='L250'></a><a href='#L250'>250</a>
<a name='L251'></a><a href='#L251'>251</a>
<a name='L252'></a><a href='#L252'>252</a>
<a name='L253'></a><a href='#L253'>253</a>
<a name='L254'></a><a href='#L254'>254</a>
<a name='L255'></a><a href='#L255'>255</a>
<a name='L256'></a><a href='#L256'>256</a>
<a name='L257'></a><a href='#L257'>257</a>
<a name='L258'></a><a href='#L258'>258</a>
<a name='L259'></a><a href='#L259'>259</a>
<a name='L260'></a><a href='#L260'>260</a>
<a name='L261'></a><a href='#L261'>261</a>
<a name='L262'></a><a href='#L262'>262</a>
<a name='L263'></a><a href='#L263'>263</a>
<a name='L264'></a><a href='#L264'>264</a>
<a name='L265'></a><a href='#L265'>265</a>
<a name='L266'></a><a href='#L266'>266</a>
<a name='L267'></a><a href='#L267'>267</a>
<a name='L268'></a><a href='#L268'>268</a>
<a name='L269'></a><a href='#L269'>269</a>
<a name='L270'></a><a href='#L270'>270</a>
<a name='L271'></a><a href='#L271'>271</a>
<a name='L272'></a><a href='#L272'>272</a>
<a name='L273'></a><a href='#L273'>273</a>
<a name='L274'></a><a href='#L274'>274</a>
<a name='L275'></a><a href='#L275'>275</a>
<a name='L276'></a><a href='#L276'>276</a>
<a name='L277'></a><a href='#L277'>277</a>
<a name='L278'></a><a href='#L278'>278</a>
<a name='L279'></a><a href='#L279'>279</a>
<a name='L280'></a><a href='#L280'>280</a>
<a name='L281'></a><a href='#L281'>281</a>
<a name='L282'></a><a href='#L282'>282</a>
<a name='L283'></a><a href='#L283'>283</a>
<a name='L284'></a><a href='#L284'>284</a>
<a name='L285'></a><a href='#L285'>285</a>
<a name='L286'></a><a href='#L286'>286</a>
<a name='L287'></a><a href='#L287'>287</a>
<a name='L288'></a><a href='#L288'>288</a>
<a name='L289'></a><a href='#L289'>289</a>
<a name='L290'></a><a href='#L290'>290</a>
<a name='L291'></a><a href='#L291'>291</a>
<a name='L292'></a><a href='#L292'>292</a>
<a name='L293'></a><a href='#L293'>293</a>
<a name='L294'></a><a href='#L294'>294</a>
<a name='L295'></a><a href='#L295'>295</a>
<a name='L296'></a><a href='#L296'>296</a>
<a name='L297'></a><a href='#L297'>297</a>
<a name='L298'></a><a href='#L298'>298</a>
<a name='L299'></a><a href='#L299'>299</a>
<a name='L300'></a><a href='#L300'>300</a>
<a name='L301'></a><a href='#L301'>301</a>
<a name='L302'></a><a href='#L302'>302</a>
<a name='L303'></a><a href='#L303'>303</a>
<a name='L304'></a><a href='#L304'>304</a>
<a name='L305'></a><a href='#L305'>305</a>
<a name='L306'></a><a href='#L306'>306</a>
<a name='L307'></a><a href='#L307'>307</a>
<a name='L308'></a><a href='#L308'>308</a>
<a name='L309'></a><a href='#L309'>309</a>
<a name='L310'></a><a href='#L310'>310</a>
<a name='L311'></a><a href='#L311'>311</a>
<a name='L312'></a><a href='#L312'>312</a>
<a name='L313'></a><a href='#L313'>313</a>
<a name='L314'></a><a href='#L314'>314</a>
<a name='L315'></a><a href='#L315'>315</a>
<a name='L316'></a><a href='#L316'>316</a>
<a name='L317'></a><a href='#L317'>317</a>
<a name='L318'></a><a href='#L318'>318</a>
<a name='L319'></a><a href='#L319'>319</a>
<a name='L320'></a><a href='#L320'>320</a>
<a name='L321'></a><a href='#L321'>321</a>
<a name='L322'></a><a href='#L322'>322</a>
<a name='L323'></a><a href='#L323'>323</a>
<a name='L324'></a><a href='#L324'>324</a>
<a name='L325'></a><a href='#L325'>325</a>
<a name='L326'></a><a href='#L326'>326</a>
<a name='L327'></a><a href='#L327'>327</a>
<a name='L328'></a><a href='#L328'>328</a>
<a name='L329'></a><a href='#L329'>329</a>
<a name='L330'></a><a href='#L330'>330</a>
<a name='L331'></a><a href='#L331'>331</a>
<a name='L332'></a><a href='#L332'>332</a>
<a name='L333'></a><a href='#L333'>333</a>
<a name='L334'></a><a href='#L334'>334</a>
<a name='L335'></a><a href='#L335'>335</a>
<a name='L336'></a><a href='#L336'>336</a>
<a name='L337'></a><a href='#L337'>337</a>
<a name='L338'></a><a href='#L338'>338</a>
<a name='L339'></a><a href='#L339'>339</a>
<a name='L340'></a><a href='#L340'>340</a>
<a name='L341'></a><a href='#L341'>341</a>
<a name='L342'></a><a href='#L342'>342</a>
<a name='L343'></a><a href='#L343'>343</a>
<a name='L344'></a><a href='#L344'>344</a>
<a name='L345'></a><a href='#L345'>345</a>
<a name='L346'></a><a href='#L346'>346</a>
<a name='L347'></a><a href='#L347'>347</a>
<a name='L348'></a><a href='#L348'>348</a>
<a name='L349'></a><a href='#L349'>349</a>
<a name='L350'></a><a href='#L350'>350</a>
<a name='L351'></a><a href='#L351'>351</a>
<a name='L352'></a><a href='#L352'>352</a>
<a name='L353'></a><a href='#L353'>353</a>
<a name='L354'></a><a href='#L354'>354</a>
<a name='L355'></a><a href='#L355'>355</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">26x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">9x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">18x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">5x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">11x</span>
<span class="cline-any cline-yes">6x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">5x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">4x</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">12x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">9x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">7x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">7x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">5x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">5x</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">3x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">4x</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">2x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Type-safe accessor helpers for session and machine IDs
 *
 * These helpers centralize the logic for extracting IDs from various update types,
 * handling the field name variations (`id`, `sid`, `machineId`) internally.
 *
 * @example
 * ```typescript
 * import { hasSessionId, getSessionId, tryGetSessionId } from '@magic-agent/protocol';
 *
 * // Type-safe extraction
 * if (hasSessionId(update)) {
 *     const sessionId = getSessionId(update);
 *     console.log('Session:', sessionId);
 * }
 *
 * // Or use the try variant
 * const sessionId = tryGetSessionId(update);
 * if (sessionId) {
 *     console.log('Session:', sessionId);
 * }
 * ```
 *
 * @packageDocumentation
 */
&nbsp;
import type {
    ApiUpdate,
    ApiEphemeralUpdate,
    ApiUpdateNewSession,
    ApiUpdateSessionState,
    ApiUpdateNewMessage,
    ApiDeleteSession,
    ApiEphemeralActivityUpdate,
    ApiEphemeralUsageUpdate,
    ApiNewMachine,
    ApiUpdateMachineState,
    ApiEphemeralMachineActivityUpdate,
    ApiEphemeralMachineStatusUpdate,
} from './index';
&nbsp;
// =============================================================================
// SESSION ID HELPERS
// =============================================================================
&nbsp;
/**
 * Session update types that contain a session ID
 *
 * All session-related schemas now use `sid` for consistency (HAP-654):
 * - `new-session`, `update-session`, `new-message`, `delete-session`: use field `sid`
 */
export type SessionIdUpdate =
    | ApiUpdateNewSession
    | ApiUpdateSessionState
    | ApiUpdateNewMessage
    | ApiDeleteSession;
&nbsp;
/**
 * Ephemeral update types that contain a session ID
 *
 * All session-related ephemeral schemas now use `sid` for consistency (HAP-654):
 * - `activity`, `usage`: use field `sid`
 */
export type SessionIdEphemeral =
    | ApiEphemeralActivityUpdate
    | ApiEphemeralUsageUpdate;
&nbsp;
/**
 * Type guard: checks if an update contains a session ID
 *
 * @param update - Any ApiUpdate to check
 * @returns `true` if the update contains a session ID
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasSessionId(update)) {
 *     // TypeScript knows update is SessionIdUpdate here
 *     const sessionId = getSessionId(update);
 * }
 * ```
 */
export function hasSessionId(update: ApiUpdate): update is SessionIdUpdate {
    return ['new-session', 'update-session', 'new-message', 'delete-session'].includes(update.t);
}
&nbsp;
/**
 * Type guard: checks if an ephemeral update contains a session ID
 *
 * @param update - Any ApiEphemeralUpdate to check
 * @returns `true` if the update contains a session ID
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasSessionIdEphemeral(ephemeral)) {
 *     const sessionId = getSessionIdFromEphemeral(ephemeral);
 * }
 * ```
 */
export function hasSessionIdEphemeral(update: ApiEphemeralUpdate): update is SessionIdEphemeral {
    return ['activity', 'usage'].includes(update.type);
}
&nbsp;
/**
 * Extract session ID from a persistent update
 *
 * All session-related schemas now use `sid` for consistency (HAP-654).
 *
 * @param update - A SessionIdUpdate (use hasSessionId type guard first)
 * @returns The session ID string
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasSessionId(update)) {
 *     const sessionId = getSessionId(update);
 *     const encryption = sessionManager.getEncryption(sessionId);
 * }
 * ```
 */
export function getSessionId(update: SessionIdUpdate): string {
    // All session update types now consistently use `sid` (HAP-654)
    return update.sid;
}
&nbsp;
/**
 * Extract session ID from an ephemeral update
 *
 * All session-related ephemeral schemas now use `sid` for consistency (HAP-654).
 *
 * @param update - A SessionIdEphemeral (use hasSessionIdEphemeral type guard first)
 * @returns The session ID string
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasSessionIdEphemeral(ephemeral)) {
 *     const sessionId = getSessionIdFromEphemeral(ephemeral);
 *     updateSessionActivity(sessionId);
 * }
 * ```
 */
export function getSessionIdFromEphemeral(update: SessionIdEphemeral): string {
    // All session ephemeral types now consistently use `sid` (HAP-654)
    return update.sid;
}
&nbsp;
/**
 * Try to extract session ID from any update
 *
 * Safe variant that returns `undefined` if the update doesn't contain a session ID,
 * instead of throwing an error.
 *
 * @param update - Any ApiUpdate
 * @returns The session ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const sessionId = tryGetSessionId(update);
 * if (sessionId) {
 *     processSession(sessionId);
 * } else {
 *     // Handle non-session update (e.g., machine update)
 * }
 * ```
 */
export function tryGetSessionId(update: ApiUpdate): string | undefined {
    if (hasSessionId(update)) {
        return getSessionId(update);
    }
    return undefined;
}
&nbsp;
/**
 * Try to extract session ID from any ephemeral update
 *
 * Safe variant that returns `undefined` if the ephemeral update doesn't contain
 * a session ID, instead of throwing an error.
 *
 * @param update - Any ApiEphemeralUpdate
 * @returns The session ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const sessionId = tryGetSessionIdFromEphemeral(ephemeral);
 * if (sessionId) {
 *     updateSessionActivity(sessionId);
 * }
 * ```
 */
export function tryGetSessionIdFromEphemeral(update: ApiEphemeralUpdate): string | undefined {
    if (hasSessionIdEphemeral(update)) {
        return getSessionIdFromEphemeral(update);
    }
    return undefined;
}
&nbsp;
// =============================================================================
// MACHINE ID HELPERS
// =============================================================================
&nbsp;
/**
 * Machine update types that contain a machine ID
 *
 * - `new-machine`, `update-machine`: use field `machineId`
 */
export type MachineIdUpdate = ApiNewMachine | ApiUpdateMachineState;
&nbsp;
/**
 * Ephemeral update types that contain a machine ID
 *
 * All machine-related ephemeral schemas now use `machineId` for consistency (HAP-655):
 * - `machine-activity`: uses field `machineId`
 * - `machine-status`: uses field `machineId`
 */
export type MachineIdEphemeral =
    | ApiEphemeralMachineActivityUpdate
    | ApiEphemeralMachineStatusUpdate;
&nbsp;
/**
 * Type guard: checks if an update contains a machine ID
 *
 * @param update - Any ApiUpdate to check
 * @returns `true` if the update contains a machine ID
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasMachineId(update)) {
 *     const machineId = getMachineId(update);
 * }
 * ```
 */
export function hasMachineId(update: ApiUpdate): update is MachineIdUpdate {
    return ['new-machine', 'update-machine'].includes(update.t);
}
&nbsp;
/**
 * Type guard: checks if an ephemeral update contains a machine ID
 *
 * @param update - Any ApiEphemeralUpdate to check
 * @returns `true` if the update contains a machine ID
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasMachineIdEphemeral(ephemeral)) {
 *     const machineId = getMachineIdFromEphemeral(ephemeral);
 * }
 * ```
 */
export function hasMachineIdEphemeral(update: ApiEphemeralUpdate): update is MachineIdEphemeral {
    return ['machine-activity', 'machine-status'].includes(update.type);
}
&nbsp;
/**
 * Extract machine ID from a persistent update
 *
 * Both `new-machine` and `update-machine` use the `machineId` field.
 *
 * @param update - A MachineIdUpdate (use hasMachineId type guard first)
 * @returns The machine ID string
 *
 * @example
 * ```typescript
 * const update = parseUpdate(rawData);
 * if (hasMachineId(update)) {
 *     const machineId = getMachineId(update);
 *     updateMachineState(machineId);
 * }
 * ```
 */
export function getMachineId(update: MachineIdUpdate): string {
    switch (update.t) {
        case 'new-machine':
        case 'update-machine':
            return update.machineId;
<span class="branch-2 cbranch-no" title="branch not covered" >        default: {</span>
            const _exhaustive: never = <span class="cstat-no" title="statement not covered" >update;</span>
<span class="cstat-no" title="statement not covered" >            throw new Error(`Unknown update type: ${(_exhaustive as MachineIdUpdate).t}`);</span>
        }
    }
}
&nbsp;
/**
 * Extract machine ID from an ephemeral update
 *
 * All machine-related ephemeral schemas now use `machineId` for consistency (HAP-655).
 *
 * @param update - A MachineIdEphemeral (use hasMachineIdEphemeral type guard first)
 * @returns The machine ID string
 *
 * @example
 * ```typescript
 * const ephemeral = parseEphemeral(rawData);
 * if (hasMachineIdEphemeral(ephemeral)) {
 *     const machineId = getMachineIdFromEphemeral(ephemeral);
 *     updateMachineStatus(machineId);
 * }
 * ```
 */
export function getMachineIdFromEphemeral(update: MachineIdEphemeral): string {
    // All machine ephemeral types now consistently use `machineId` (HAP-655)
    return update.machineId;
}
&nbsp;
/**
 * Try to extract machine ID from any update
 *
 * Safe variant that returns `undefined` if the update doesn't contain a machine ID,
 * instead of throwing an error.
 *
 * @param update - Any ApiUpdate
 * @returns The machine ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const machineId = tryGetMachineId(update);
 * if (machineId) {
 *     processMachine(machineId);
 * }
 * ```
 */
export function tryGetMachineId(update: ApiUpdate): string | undefined {
    if (hasMachineId(update)) {
        return getMachineId(update);
    }
    return undefined;
}
&nbsp;
/**
 * Try to extract machine ID from any ephemeral update
 *
 * Safe variant that returns `undefined` if the ephemeral update doesn't contain
 * a machine ID, instead of throwing an error.
 *
 * @param update - Any ApiEphemeralUpdate
 * @returns The machine ID string, or `undefined` if not present
 *
 * @example
 * ```typescript
 * const machineId = tryGetMachineIdFromEphemeral(ephemeral);
 * if (machineId) {
 *     updateMachineActivity(machineId);
 * }
 * ```
 */
export function tryGetMachineIdFromEphemeral(update: ApiEphemeralUpdate): string | undefined {
    if (hasMachineIdEphemeral(update)) {
        return getMachineIdFromEphemeral(update);
    }
    return undefined;
}
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../sorter.js"></script>
        <script src="../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/index.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../prettify.css" />
    <link rel="stylesheet" href="../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../index.html">All files</a> src</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">84.44% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>38/45</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">90.9% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>10/11</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">92.3% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>12/13</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">84.44% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>38/45</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <div class="pad1">
<table class="coverage-summary">
<thead>
<tr>
   <th data-col="file" data-fmt="html" data-html="true" class="file">File</th>
   <th data-col="pic" data-type="number" data-fmt="html" data-html="true" class="pic"></th>
   <th data-col="statements" data-type="number" data-fmt="pct" class="pct">Statements</th>
   <th data-col="statements_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="branches" data-type="number" data-fmt="pct" class="pct">Branches</th>
   <th data-col="branches_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="functions" data-type="number" data-fmt="pct" class="pct">Functions</th>
   <th data-col="functions_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="lines" data-type="number" data-fmt="pct" class="pct">Lines</th>
   <th data-col="lines_raw" data-type="number" data-fmt="html" class="abs"></th>
</tr>
</thead>
<tbody><tr>
	<td class="file high" data-value="common.ts"><a href="common.ts.html">common.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="8" class="abs high">8/8</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="8" class="abs high">8/8</td>
	</tr>
<tr>
	<td class="file high" data-value="constraints.ts"><a href="constraints.ts.html">constraints.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	</tr>
<tr>
	<td class="file high" data-value="helpers.ts"><a href="helpers.ts.html">helpers.ts</a></td>
	<td data-value="91.3" class="pic high">
	<div class="chart"><div class="cover-fill" style="width: 91%"></div><div class="cover-empty" style="width: 9%"></div></div>
	</td>
	<td data-value="91.3" class="pct high">91.3%</td>
	<td data-value="23" class="abs high">21/23</td>
	<td data-value="90.9" class="pct high">90.9%</td>
	<td data-value="11" class="abs high">10/11</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="12" class="abs high">12/12</td>
	<td data-value="91.3" class="pct high">91.3%</td>
	<td data-value="23" class="abs high">21/23</td>
	</tr>
<tr>
	<td class="file empty" data-value="index.ts"><a href="index.ts.html">index.ts</a></td>
	<td data-value="0" class="pic empty">
	<div class="chart"><div class="cover-fill" style="width: 0%"></div><div class="cover-empty" style="width: 100%"></div></div>
	</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	<td data-value="0" class="pct empty">0%</td>
	<td data-value="0" class="abs empty">0/0</td>
	</tr>
<tr>
	<td class="file high" data-value="mcp.ts"><a href="mcp.ts.html">mcp.ts</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="3" class="abs high">3/3</td>
	</tr>
<tr>
	<td class="file low" data-value="payloads.ts"><a href="payloads.ts.html">payloads.ts</a></td>
	<td data-value="37.5" class="pic low">
	<div class="chart"><div class="cover-fill" style="width: 37%"></div><div class="cover-empty" style="width: 63%"></div></div>
	</td>
	<td data-value="37.5" class="pct low">37.5%</td>
	<td data-value="8" class="abs low">3/8</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="0" class="pct low">0%</td>
	<td data-value="1" class="abs low">0/1</td>
	<td data-value="37.5" class="pct low">37.5%</td>
	<td data-value="8" class="abs low">3/8</td>
	</tr>
</tbody>
</table>
</div>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../sorter.js"></script>
        <script src="../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/index.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/index.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../prettify.css" />
    <link rel="stylesheet" href="../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../index.html">All files</a> / <a href="index.html">src</a> index.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>0/0</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line low'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * @magic-agent/protocol - Shared protocol types for Happy monorepo
 *
 * This package provides Zod schemas and TypeScript types for the Happy sync protocol.
 * It serves as the single source of truth for:
 * - Update events (persistent state changes)
 * - Ephemeral events (real-time status updates)
 * - Payload wrappers (sequencing containers)
 * - Common types (GitHubProfile, ImageRef, etc.)
 *
 * @example
 * ```typescript
 * import { ApiUpdateSchema, type ApiUpdate } from '@magic-agent/protocol';
 *
 * // Validate incoming update
 * const result = ApiUpdateSchema.safeParse(data);
 * if (result.success) {
 *     const update: ApiUpdate = result.data;
 *     switch (update.t) {
 *         case 'new-message':
 *             console.log('Session:', update.sid);
 *             break;
 *         // ...
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */
&nbsp;
// Validation constraints (security-focused limits)
export * from './constraints';
&nbsp;
// Common types used across the protocol
export * from './common';
&nbsp;
// Update event schemas (persistent)
export * from './updates';
&nbsp;
// Ephemeral event schemas (transient)
export * from './ephemeral';
&nbsp;
// Payload wrapper schemas
export * from './payloads';
&nbsp;
// MCP state schemas for CLI-to-App sync
export * from './mcp';
&nbsp;
// Type-safe accessor helpers for session and machine IDs
export * from './helpers';
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../sorter.js"></script>
        <script src="../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/mcp.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/mcp.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../prettify.css" />
    <link rel="stylesheet" href="../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../index.html">All files</a> / <a href="index.html">src</a> mcp.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>3/3</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>3/3</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a>
<a name='L66'></a><a href='#L66'>66</a>
<a name='L67'></a><a href='#L67'>67</a>
<a name='L68'></a><a href='#L68'>68</a>
<a name='L69'></a><a href='#L69'>69</a>
<a name='L70'></a><a href='#L70'>70</a>
<a name='L71'></a><a href='#L71'>71</a>
<a name='L72'></a><a href='#L72'>72</a>
<a name='L73'></a><a href='#L73'>73</a>
<a name='L74'></a><a href='#L74'>74</a>
<a name='L75'></a><a href='#L75'>75</a>
<a name='L76'></a><a href='#L76'>76</a>
<a name='L77'></a><a href='#L77'>77</a>
<a name='L78'></a><a href='#L78'>78</a>
<a name='L79'></a><a href='#L79'>79</a>
<a name='L80'></a><a href='#L80'>80</a>
<a name='L81'></a><a href='#L81'>81</a>
<a name='L82'></a><a href='#L82'>82</a>
<a name='L83'></a><a href='#L83'>83</a>
<a name='L84'></a><a href='#L84'>84</a>
<a name='L85'></a><a href='#L85'>85</a>
<a name='L86'></a><a href='#L86'>86</a>
<a name='L87'></a><a href='#L87'>87</a>
<a name='L88'></a><a href='#L88'>88</a>
<a name='L89'></a><a href='#L89'>89</a>
<a name='L90'></a><a href='#L90'>90</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * MCP (Model Context Protocol) state schemas for sync
 *
 * These schemas define the structure for syncing MCP state from CLI to App.
 * The CLI tracks MCP server states and can send this information to connected
 * mobile apps for display.
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
&nbsp;
/**
 * Schema for MCP server state sent from CLI to App
 *
 * This represents the state of a single MCP server as tracked by the CLI.
 * The server name is used as the key in the parent record.
 *
 * @example
 * ```typescript
 * const serverState = McpServerStateSchema.parse({
 *     disabled: false,
 *     toolCount: 15,
 *     lastValidated: '2024-12-28T10:30:00.000Z',
 *     disabledTools: ['dangerous-tool']
 * });
 * ```
 */
export const McpServerStateSchema = z.object({
    disabled: z.boolean(),
    toolCount: z.number().optional(),
    lastValidated: z.string().datetime().max(STRING_LIMITS.LABEL_MAX).optional(),
    disabledTools: z.array(z.string().max(STRING_LIMITS.MCP_TOOL_NAME_MAX)).optional(),
});
&nbsp;
export type McpServerState = z.infer&lt;typeof McpServerStateSchema&gt;;
&nbsp;
/**
 * Schema for MCP tool info
 *
 * Minimal information about an MCP tool for display purposes.
 *
 * @example
 * ```typescript
 * const tool = McpToolInfoSchema.parse({
 *     name: 'search_codebase',
 *     description: 'Search for patterns in the codebase'
 * });
 * ```
 */
export const McpToolInfoSchema = z.object({
    name: z.string().min(1).max(STRING_LIMITS.MCP_TOOL_NAME_MAX),
    description: z.string().max(STRING_LIMITS.MCP_TOOL_DESCRIPTION_MAX).optional(),
});
&nbsp;
export type McpToolInfo = z.infer&lt;typeof McpToolInfoSchema&gt;;
&nbsp;
/**
 * Full MCP state for sync
 *
 * This is the top-level schema containing all MCP state that gets synced
 * from CLI to App. It's designed to be included in session update payloads.
 *
 * - `servers`: Record of server name -&gt; state (always present)
 * - `tools`: Optional record of server name -&gt; tool list (only if tools are fetched)
 *
 * @example
 * ```typescript
 * const mcpState = McpSyncStateSchema.parse({
 *     servers: {
 *         'github-mcp': { disabled: false, toolCount: 10 },
 *         'local-tools': { disabled: true }
 *     },
 *     tools: {
 *         'github-mcp': [
 *             { name: 'get_issues', description: 'Fetch GitHub issues' },
 *             { name: 'create_pr', description: 'Create a pull request' }
 *         ]
 *     }
 * });
 * ```
 */
export const McpSyncStateSchema = z.object({
    servers: z.record(z.string().max(STRING_LIMITS.MCP_SERVER_NAME_MAX), McpServerStateSchema),
    tools: z.record(z.string().max(STRING_LIMITS.MCP_SERVER_NAME_MAX), z.array(McpToolInfoSchema)).optional(),
});
&nbsp;
export type McpSyncState = z.infer&lt;typeof McpSyncStateSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../sorter.js"></script>
        <script src="../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/src/payloads.ts.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for src/payloads.ts</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../prettify.css" />
    <link rel="stylesheet" href="../base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="../favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(../sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1><a href="../index.html">All files</a> / <a href="index.html">src</a> payloads.ts</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">37.5% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>3/8</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">100% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>0/0</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">0% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>0/1</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">37.5% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>3/8</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line low'></div>
    <pre><table class="coverage">
<tr><td class="line-count quiet"><a name='L1'></a><a href='#L1'>1</a>
<a name='L2'></a><a href='#L2'>2</a>
<a name='L3'></a><a href='#L3'>3</a>
<a name='L4'></a><a href='#L4'>4</a>
<a name='L5'></a><a href='#L5'>5</a>
<a name='L6'></a><a href='#L6'>6</a>
<a name='L7'></a><a href='#L7'>7</a>
<a name='L8'></a><a href='#L8'>8</a>
<a name='L9'></a><a href='#L9'>9</a>
<a name='L10'></a><a href='#L10'>10</a>
<a name='L11'></a><a href='#L11'>11</a>
<a name='L12'></a><a href='#L12'>12</a>
<a name='L13'></a><a href='#L13'>13</a>
<a name='L14'></a><a href='#L14'>14</a>
<a name='L15'></a><a href='#L15'>15</a>
<a name='L16'></a><a href='#L16'>16</a>
<a name='L17'></a><a href='#L17'>17</a>
<a name='L18'></a><a href='#L18'>18</a>
<a name='L19'></a><a href='#L19'>19</a>
<a name='L20'></a><a href='#L20'>20</a>
<a name='L21'></a><a href='#L21'>21</a>
<a name='L22'></a><a href='#L22'>22</a>
<a name='L23'></a><a href='#L23'>23</a>
<a name='L24'></a><a href='#L24'>24</a>
<a name='L25'></a><a href='#L25'>25</a>
<a name='L26'></a><a href='#L26'>26</a>
<a name='L27'></a><a href='#L27'>27</a>
<a name='L28'></a><a href='#L28'>28</a>
<a name='L29'></a><a href='#L29'>29</a>
<a name='L30'></a><a href='#L30'>30</a>
<a name='L31'></a><a href='#L31'>31</a>
<a name='L32'></a><a href='#L32'>32</a>
<a name='L33'></a><a href='#L33'>33</a>
<a name='L34'></a><a href='#L34'>34</a>
<a name='L35'></a><a href='#L35'>35</a>
<a name='L36'></a><a href='#L36'>36</a>
<a name='L37'></a><a href='#L37'>37</a>
<a name='L38'></a><a href='#L38'>38</a>
<a name='L39'></a><a href='#L39'>39</a>
<a name='L40'></a><a href='#L40'>40</a>
<a name='L41'></a><a href='#L41'>41</a>
<a name='L42'></a><a href='#L42'>42</a>
<a name='L43'></a><a href='#L43'>43</a>
<a name='L44'></a><a href='#L44'>44</a>
<a name='L45'></a><a href='#L45'>45</a>
<a name='L46'></a><a href='#L46'>46</a>
<a name='L47'></a><a href='#L47'>47</a>
<a name='L48'></a><a href='#L48'>48</a>
<a name='L49'></a><a href='#L49'>49</a>
<a name='L50'></a><a href='#L50'>50</a>
<a name='L51'></a><a href='#L51'>51</a>
<a name='L52'></a><a href='#L52'>52</a>
<a name='L53'></a><a href='#L53'>53</a>
<a name='L54'></a><a href='#L54'>54</a>
<a name='L55'></a><a href='#L55'>55</a>
<a name='L56'></a><a href='#L56'>56</a>
<a name='L57'></a><a href='#L57'>57</a>
<a name='L58'></a><a href='#L58'>58</a>
<a name='L59'></a><a href='#L59'>59</a>
<a name='L60'></a><a href='#L60'>60</a>
<a name='L61'></a><a href='#L61'>61</a>
<a name='L62'></a><a href='#L62'>62</a>
<a name='L63'></a><a href='#L63'>63</a>
<a name='L64'></a><a href='#L64'>64</a>
<a name='L65'></a><a href='#L65'>65</a></td><td class="line-coverage quiet"><span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-no">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-yes">1x</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span>
<span class="cline-any cline-neutral">&nbsp;</span></td><td class="text"><pre class="prettyprint lang-js">/**
 * Payload wrapper schemas
 *
 * These wrap update and ephemeral events with sequencing metadata.
 *
 * Security: All string fields have maximum length constraints.
 */
&nbsp;
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
import { ApiUpdateSchema, type ApiUpdateType } from './updates';
import { ApiEphemeralUpdateSchema } from './ephemeral';
&nbsp;
/**
 * Update payload container
 *
 * Wraps update events with sequencing information for ordered delivery.
 * The 'body' contains the actual update with 't' field renamed to differentiate
 * from the container structure.
 */
export const ApiUpdateContainerSchema = z.object({
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    seq: z.number(),
    body: ApiUpdateSchema,
    createdAt: z.number(),
});
&nbsp;
export type ApiUpdateContainer = z.infer&lt;typeof ApiUpdateContainerSchema&gt;;
&nbsp;
/**
 * Update payload for server-side use
 *
 * This is the wire format where body.t becomes body.t for the discriminator.
 * Matches the format used by eventRouter.ts builder functions.
 */
export const UpdatePayloadSchema = z.object({
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    seq: z.number(),
    body: z.object({
        t: z.string() as z.ZodType&lt;ApiUpdateType&gt;,
    }).passthrough().transform(<span class="fstat-no" title="function not covered" >(d</span>ata) =&gt; {
        // HAP-626: Sanitize dangerous prototype pollution keys
        // We use passthrough here (not strip) because this schema only validates
        // the type discriminator - the actual payload data must pass through.
        // Full validation happens via ApiUpdateContainerSchema with ApiUpdateSchema.
        const sanitized = <span class="cstat-no" title="statement not covered" >{ ...data };</span>
<span class="cstat-no" title="statement not covered" >        delete (sanitized as Record&lt;string, unknown&gt;)['__proto__'];</span>
<span class="cstat-no" title="statement not covered" >        delete (sanitized as Record&lt;string, unknown&gt;)['constructor'];</span>
<span class="cstat-no" title="statement not covered" >        delete (sanitized as Record&lt;string, unknown&gt;)['prototype'];</span>
<span class="cstat-no" title="statement not covered" >        return sanitized;</span>
    }),
    createdAt: z.number(),
});
&nbsp;
export type UpdatePayload = z.infer&lt;typeof UpdatePayloadSchema&gt;;
&nbsp;
/**
 * Ephemeral payload wrapper
 *
 * Simpler than UpdatePayload since ordering isn't critical for ephemeral events.
 */
export const EphemeralPayloadSchema = ApiEphemeralUpdateSchema;
&nbsp;
export type EphemeralPayload = z.infer&lt;typeof EphemeralPayloadSchema&gt;;
&nbsp;</pre></td></tr></table></pre>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="../prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="../sorter.js"></script>
        <script src="../block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/base.css
````css
body, html {
body {
.small { font-size: 12px; }
*, *:after, *:before {
h1 { font-size: 20px; margin: 0;}
h2 { font-size: 14px; }
pre {
a { color:#0074D9; text-decoration:none; }
a:hover { text-decoration:underline; }
.strong { font-weight: bold; }
.space-top1 { padding: 10px 0 0 0; }
.pad2y { padding: 20px 0; }
.pad1y { padding: 10px 0; }
.pad2x { padding: 0 20px; }
.pad2 { padding: 20px; }
.pad1 { padding: 10px; }
.space-left2 { padding-left:55px; }
.space-right2 { padding-right:20px; }
.center { text-align:center; }
.clearfix { display:block; }
.clearfix:after {
.fl { float: left; }
⋮----
.col3 { width:100%; max-width:100%; }
.hide-mobile { display:none!important; }
⋮----
.quiet {
.quiet a { opacity: 0.7; }
.fraction {
div.path a:link, div.path a:visited { color: #333; }
table.coverage {
table.coverage td {
table.coverage td.line-count {
table.coverage td.line-coverage {
table.coverage td span.cline-any {
.missing-if-branch {
.skip-if-branch {
.missing-if-branch .typ, .skip-if-branch .typ {
.coverage-summary {
.coverage-summary tr { border-bottom: 1px solid #bbb; }
.keyline-all { border: 1px solid #ddd; }
.coverage-summary td, .coverage-summary th { padding: 10px; }
.coverage-summary tbody { border: 1px solid #bbb; }
.coverage-summary td { border-right: 1px solid #bbb; }
.coverage-summary td:last-child { border-right: none; }
.coverage-summary th {
.coverage-summary th.file { border-right: none !important; }
.coverage-summary th.pct { }
.coverage-summary th.pic,
.coverage-summary td.file { white-space: nowrap;  }
.coverage-summary td.pic { min-width: 120px !important;  }
.coverage-summary tfoot td { }
.coverage-summary .sorter {
.coverage-summary .sorted .sorter {
.coverage-summary .sorted-desc .sorter {
.status-line {  height: 10px; }
.cbranch-no { background: yellow !important; color: #111; }
.red.solid, .status-line.low, .low .cover-fill { background:#C21F39 }
.low .chart { border:1px solid #C21F39 }
.highlighted,
.cstat-no, .fstat-no, .cbranch-no, .cbranch-no { background:#F6C6CE }
.low, .cline-no { background:#FCE1E5 }
.high, .cline-yes { background:rgb(230,245,208) }
.cstat-yes { background:rgb(161,215,106) }
.status-line.high, .high .cover-fill { background:rgb(77,146,33) }
.high .chart { border:1px solid rgb(77,146,33) }
.status-line.medium, .medium .cover-fill { background: #f9cd0b; }
.medium .chart { border:1px solid #f9cd0b; }
.medium { background: #fff4c2; }
.cstat-skip { background: #ddd; color: #111; }
.fstat-skip { background: #ddd; color: #111 !important; }
.cbranch-skip { background: #ddd !important; color: #111; }
span.cline-neutral { background: #eaeaea; }
.coverage-summary td.empty {
.cover-fill, .cover-empty {
.chart {
.cover-empty {
.cover-full {
pre.prettyprint {
.com { color: #999 !important; }
.ignore-none { color: #999; font-weight: normal; }
.wrapper {
.footer, .push {
````

## File: packages/@magic-agent/protocol/coverage/block-navigation.js
````javascript
function toggleClass(index)
function makeCurrent(index)
function goToPrevious()
function goToNext()
````

## File: packages/@magic-agent/protocol/coverage/clover.xml
````xml
<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1767050362986" clover="3.2.0">
  <project timestamp="1767050362987" name="All files">
    <metrics statements="67" coveredstatements="58" conditionals="11" coveredconditionals="10" methods="15" coveredmethods="12" elements="93" coveredelements="80" complexity="0" loc="67" ncloc="67" packages="3" files="15" classes="15"/>
    <package name="src">
      <metrics statements="45" coveredstatements="38" conditionals="11" coveredconditionals="10" methods="13" coveredmethods="12"/>
      <file name="common.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/common.ts">
        <metrics statements="8" coveredstatements="8" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="44" count="2" type="stmt"/>
        <line num="73" count="2" type="stmt"/>
        <line num="92" count="2" type="stmt"/>
        <line num="118" count="2" type="stmt"/>
        <line num="148" count="2" type="stmt"/>
        <line num="168" count="2" type="stmt"/>
        <line num="187" count="2" type="stmt"/>
        <line num="212" count="2" type="stmt"/>
      </file>
      <file name="constraints.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/constraints.ts">
        <metrics statements="3" coveredstatements="3" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="22" count="2" type="stmt"/>
        <line num="143" count="2" type="stmt"/>
        <line num="166" count="2" type="stmt"/>
      </file>
      <file name="helpers.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/helpers.ts">
        <metrics statements="23" coveredstatements="21" conditionals="11" coveredconditionals="10" methods="12" coveredmethods="12"/>
        <line num="84" count="26" type="stmt"/>
        <line num="102" count="9" type="stmt"/>
        <line num="124" count="18" type="stmt"/>
        <line num="146" count="5" type="stmt"/>
        <line num="169" count="11" type="cond" truecount="2" falsecount="0"/>
        <line num="170" count="6" type="stmt"/>
        <line num="172" count="5" type="stmt"/>
        <line num="193" count="4" type="cond" truecount="2" falsecount="0"/>
        <line num="194" count="2" type="stmt"/>
        <line num="196" count="2" type="stmt"/>
        <line num="236" count="12" type="stmt"/>
        <line num="254" count="9" type="stmt"/>
        <line num="275" count="7" type="cond" truecount="2" falsecount="1"/>
        <line num="278" count="7" type="stmt"/>
        <line num="280" count="0" type="stmt"/>
        <line num="281" count="0" type="stmt"/>
        <line num="305" count="5" type="stmt"/>
        <line num="326" count="5" type="cond" truecount="2" falsecount="0"/>
        <line num="327" count="2" type="stmt"/>
        <line num="329" count="3" type="stmt"/>
        <line num="350" count="4" type="cond" truecount="2" falsecount="0"/>
        <line num="351" count="2" type="stmt"/>
        <line num="353" count="2" type="stmt"/>
      </file>
      <file name="index.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/index.ts">
        <metrics statements="0" coveredstatements="0" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
      </file>
      <file name="mcp.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/mcp.ts">
        <metrics statements="3" coveredstatements="3" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="30" count="1" type="stmt"/>
        <line num="52" count="1" type="stmt"/>
        <line num="84" count="1" type="stmt"/>
      </file>
      <file name="payloads.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/payloads.ts">
        <metrics statements="8" coveredstatements="3" conditionals="0" coveredconditionals="0" methods="1" coveredmethods="0"/>
        <line num="21" count="1" type="stmt"/>
        <line num="36" count="1" type="stmt"/>
        <line num="46" count="0" type="stmt"/>
        <line num="47" count="0" type="stmt"/>
        <line num="48" count="0" type="stmt"/>
        <line num="49" count="0" type="stmt"/>
        <line num="50" count="0" type="stmt"/>
        <line num="62" count="1" type="stmt"/>
      </file>
    </package>
    <package name="src.ephemeral">
      <metrics statements="7" coveredstatements="5" conditionals="0" coveredconditionals="0" methods="2" coveredmethods="0"/>
      <file name="events.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/ephemeral/events.ts">
        <metrics statements="7" coveredstatements="5" conditionals="0" coveredconditionals="0" methods="2" coveredmethods="0"/>
        <line num="18" count="1" type="stmt"/>
        <line num="50" count="1" type="stmt"/>
        <line num="68" count="0" type="stmt"/>
        <line num="72" count="0" type="stmt"/>
        <line num="84" count="1" type="stmt"/>
        <line num="114" count="1" type="stmt"/>
        <line num="142" count="1" type="stmt"/>
      </file>
      <file name="index.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/ephemeral/index.ts">
        <metrics statements="0" coveredstatements="0" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
      </file>
    </package>
    <package name="src.updates">
      <metrics statements="15" coveredstatements="15" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
      <file name="account.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/account.ts">
        <metrics statements="1" coveredstatements="1" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="33" count="1" type="stmt"/>
      </file>
      <file name="artifact.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/artifact.ts">
        <metrics statements="3" coveredstatements="3" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="34" count="1" type="stmt"/>
        <line num="63" count="1" type="stmt"/>
        <line num="85" count="1" type="stmt"/>
      </file>
      <file name="index.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/index.ts">
        <metrics statements="1" coveredstatements="1" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="49" count="1" type="stmt"/>
      </file>
      <file name="machine.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/machine.ts">
        <metrics statements="2" coveredstatements="2" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="36" count="1" type="stmt"/>
        <line num="81" count="1" type="stmt"/>
      </file>
      <file name="message.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/message.ts">
        <metrics statements="3" coveredstatements="3" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="29" count="2" type="stmt"/>
        <line num="58" count="2" type="stmt"/>
        <line num="91" count="2" type="stmt"/>
      </file>
      <file name="misc.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/misc.ts">
        <metrics statements="3" coveredstatements="3" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="30" count="1" type="stmt"/>
        <line num="61" count="1" type="stmt"/>
        <line num="90" count="1" type="stmt"/>
      </file>
      <file name="session.ts" path="/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/session.ts">
        <metrics statements="2" coveredstatements="2" conditionals="0" coveredconditionals="0" methods="0" coveredmethods="0"/>
        <line num="37" count="2" type="stmt"/>
        <line num="82" count="2" type="stmt"/>
      </file>
    </package>
  </project>
</coverage>
````

## File: packages/@magic-agent/protocol/coverage/coverage-final.json
````json
{"/volume1/Projects/happy/packages/@magic-agent/protocol/src/common.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/common.ts","statementMap":{"0":{"start":{"line":44,"column":35},"end":{"line":51,"column":null}},"1":{"start":{"line":73,"column":30},"end":{"line":79,"column":null}},"2":{"start":{"line":92,"column":40},"end":{"line":98,"column":null}},"3":{"start":{"line":118,"column":33},"end":{"line":126,"column":null}},"4":{"start":{"line":148,"column":30},"end":{"line":152,"column":null}},"5":{"start":{"line":168,"column":38},"end":{"line":171,"column":null}},"6":{"start":{"line":187,"column":36},"end":{"line":190,"column":null}},"7":{"start":{"line":212,"column":44},"end":{"line":215,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":2,"1":2,"2":2,"3":2,"4":2,"5":2,"6":2,"7":2},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":8,"seen":{"s:44:35:51:Infinity":0,"s:73:30:79:Infinity":1,"s:92:40:98:Infinity":2,"s:118:33:126:Infinity":3,"s:148:30:152:Infinity":4,"s:168:38:171:Infinity":5,"s:187:36:190:Infinity":6,"s:212:44:215:Infinity":7}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/constraints.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/constraints.ts","statementMap":{"0":{"start":{"line":22,"column":29},"end":{"line":135,"column":null}},"1":{"start":{"line":143,"column":24},"end":{"line":158,"column":null}},"2":{"start":{"line":166,"column":32},"end":{"line":178,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":2,"1":2,"2":2},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":3,"seen":{"s:22:29:135:Infinity":0,"s:143:24:158:Infinity":1,"s:166:32:178:Infinity":2}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/helpers.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/helpers.ts","statementMap":{"0":{"start":{"line":84,"column":4},"end":{"line":84,"column":null}},"1":{"start":{"line":102,"column":4},"end":{"line":102,"column":null}},"2":{"start":{"line":124,"column":4},"end":{"line":124,"column":null}},"3":{"start":{"line":146,"column":4},"end":{"line":146,"column":null}},"4":{"start":{"line":169,"column":4},"end":{"line":171,"column":null}},"5":{"start":{"line":170,"column":8},"end":{"line":170,"column":null}},"6":{"start":{"line":172,"column":4},"end":{"line":172,"column":null}},"7":{"start":{"line":193,"column":4},"end":{"line":195,"column":null}},"8":{"start":{"line":194,"column":8},"end":{"line":194,"column":null}},"9":{"start":{"line":196,"column":4},"end":{"line":196,"column":null}},"10":{"start":{"line":236,"column":4},"end":{"line":236,"column":null}},"11":{"start":{"line":254,"column":4},"end":{"line":254,"column":null}},"12":{"start":{"line":275,"column":4},"end":{"line":283,"column":null}},"13":{"start":{"line":278,"column":12},"end":{"line":278,"column":null}},"14":{"start":{"line":280,"column":39},"end":{"line":280,"column":null}},"15":{"start":{"line":281,"column":12},"end":{"line":281,"column":null}},"16":{"start":{"line":305,"column":4},"end":{"line":305,"column":null}},"17":{"start":{"line":326,"column":4},"end":{"line":328,"column":null}},"18":{"start":{"line":327,"column":8},"end":{"line":327,"column":null}},"19":{"start":{"line":329,"column":4},"end":{"line":329,"column":null}},"20":{"start":{"line":350,"column":4},"end":{"line":352,"column":null}},"21":{"start":{"line":351,"column":8},"end":{"line":351,"column":null}},"22":{"start":{"line":353,"column":4},"end":{"line":353,"column":null}}},"fnMap":{"0":{"name":"hasSessionId","decl":{"start":{"line":83,"column":16},"end":{"line":83,"column":29}},"loc":{"start":{"line":83,"column":75},"end":{"line":85,"column":null}},"line":83},"1":{"name":"hasSessionIdEphemeral","decl":{"start":{"line":101,"column":16},"end":{"line":101,"column":38}},"loc":{"start":{"line":101,"column":96},"end":{"line":103,"column":null}},"line":101},"2":{"name":"getSessionId","decl":{"start":{"line":122,"column":16},"end":{"line":122,"column":29}},"loc":{"start":{"line":122,"column":62},"end":{"line":125,"column":null}},"line":122},"3":{"name":"getSessionIdFromEphemeral","decl":{"start":{"line":144,"column":16},"end":{"line":144,"column":42}},"loc":{"start":{"line":144,"column":78},"end":{"line":147,"column":null}},"line":144},"4":{"name":"tryGetSessionId","decl":{"start":{"line":168,"column":16},"end":{"line":168,"column":32}},"loc":{"start":{"line":168,"column":71},"end":{"line":173,"column":null}},"line":168},"5":{"name":"tryGetSessionIdFromEphemeral","decl":{"start":{"line":192,"column":16},"end":{"line":192,"column":45}},"loc":{"start":{"line":192,"column":93},"end":{"line":197,"column":null}},"line":192},"6":{"name":"hasMachineId","decl":{"start":{"line":235,"column":16},"end":{"line":235,"column":29}},"loc":{"start":{"line":235,"column":75},"end":{"line":237,"column":null}},"line":235},"7":{"name":"hasMachineIdEphemeral","decl":{"start":{"line":253,"column":16},"end":{"line":253,"column":38}},"loc":{"start":{"line":253,"column":96},"end":{"line":255,"column":null}},"line":253},"8":{"name":"getMachineId","decl":{"start":{"line":274,"column":16},"end":{"line":274,"column":29}},"loc":{"start":{"line":274,"column":62},"end":{"line":284,"column":null}},"line":274},"9":{"name":"getMachineIdFromEphemeral","decl":{"start":{"line":303,"column":16},"end":{"line":303,"column":42}},"loc":{"start":{"line":303,"column":78},"end":{"line":306,"column":null}},"line":303},"10":{"name":"tryGetMachineId","decl":{"start":{"line":325,"column":16},"end":{"line":325,"column":32}},"loc":{"start":{"line":325,"column":71},"end":{"line":330,"column":null}},"line":325},"11":{"name":"tryGetMachineIdFromEphemeral","decl":{"start":{"line":349,"column":16},"end":{"line":349,"column":45}},"loc":{"start":{"line":349,"column":93},"end":{"line":354,"column":null}},"line":349}},"branchMap":{"0":{"loc":{"start":{"line":169,"column":4},"end":{"line":171,"column":null}},"type":"if","locations":[{"start":{"line":169,"column":4},"end":{"line":171,"column":null}},{"start":{},"end":{}}],"line":169},"1":{"loc":{"start":{"line":193,"column":4},"end":{"line":195,"column":null}},"type":"if","locations":[{"start":{"line":193,"column":4},"end":{"line":195,"column":null}},{"start":{},"end":{}}],"line":193},"2":{"loc":{"start":{"line":275,"column":4},"end":{"line":283,"column":null}},"type":"switch","locations":[{"start":{"line":276,"column":8},"end":{"line":276,"column":null}},{"start":{"line":277,"column":8},"end":{"line":278,"column":null}},{"start":{"line":279,"column":8},"end":{"line":282,"column":null}}],"line":275},"3":{"loc":{"start":{"line":326,"column":4},"end":{"line":328,"column":null}},"type":"if","locations":[{"start":{"line":326,"column":4},"end":{"line":328,"column":null}},{"start":{},"end":{}}],"line":326},"4":{"loc":{"start":{"line":350,"column":4},"end":{"line":352,"column":null}},"type":"if","locations":[{"start":{"line":350,"column":4},"end":{"line":352,"column":null}},{"start":{},"end":{}}],"line":350}},"s":{"0":26,"1":9,"2":18,"3":5,"4":11,"5":6,"6":5,"7":4,"8":2,"9":2,"10":12,"11":9,"12":7,"13":7,"14":0,"15":0,"16":5,"17":5,"18":2,"19":3,"20":4,"21":2,"22":2},"f":{"0":26,"1":9,"2":18,"3":5,"4":11,"5":4,"6":12,"7":9,"8":7,"9":5,"10":5,"11":4},"b":{"0":[6,5],"1":[2,2],"2":[4,7,0],"3":[2,3],"4":[2,2]},"meta":{"lastBranch":5,"lastFunction":12,"lastStatement":23,"seen":{"f:83:16:83:29":0,"s:84:4:84:Infinity":0,"f:101:16:101:38":1,"s:102:4:102:Infinity":1,"f:122:16:122:29":2,"s:124:4:124:Infinity":2,"f:144:16:144:42":3,"s:146:4:146:Infinity":3,"f:168:16:168:32":4,"b:169:4:171:Infinity:undefined:undefined:undefined:undefined":0,"s:169:4:171:Infinity":4,"s:170:8:170:Infinity":5,"s:172:4:172:Infinity":6,"f:192:16:192:45":5,"b:193:4:195:Infinity:undefined:undefined:undefined:undefined":1,"s:193:4:195:Infinity":7,"s:194:8:194:Infinity":8,"s:196:4:196:Infinity":9,"f:235:16:235:29":6,"s:236:4:236:Infinity":10,"f:253:16:253:38":7,"s:254:4:254:Infinity":11,"f:274:16:274:29":8,"b:276:8:276:Infinity:277:8:278:Infinity:279:8:282:Infinity":2,"s:275:4:283:Infinity":12,"s:278:12:278:Infinity":13,"s:280:39:280:Infinity":14,"s:281:12:281:Infinity":15,"f:303:16:303:42":9,"s:305:4:305:Infinity":16,"f:325:16:325:32":10,"b:326:4:328:Infinity:undefined:undefined:undefined:undefined":3,"s:326:4:328:Infinity":17,"s:327:8:327:Infinity":18,"s:329:4:329:Infinity":19,"f:349:16:349:45":11,"b:350:4:352:Infinity:undefined:undefined:undefined:undefined":4,"s:350:4:352:Infinity":20,"s:351:8:351:Infinity":21,"s:353:4:353:Infinity":22}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/index.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/index.ts","statementMap":{},"fnMap":{},"branchMap":{},"s":{},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":0,"seen":{}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/mcp.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/mcp.ts","statementMap":{"0":{"start":{"line":30,"column":36},"end":{"line":35,"column":null}},"1":{"start":{"line":52,"column":33},"end":{"line":55,"column":null}},"2":{"start":{"line":84,"column":34},"end":{"line":87,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":1,"1":1,"2":1},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":3,"seen":{"s:30:36:35:Infinity":0,"s:52:33:55:Infinity":1,"s:84:34:87:Infinity":2}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/payloads.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/payloads.ts","statementMap":{"0":{"start":{"line":21,"column":40},"end":{"line":26,"column":null}},"1":{"start":{"line":36,"column":35},"end":{"line":53,"column":null}},"2":{"start":{"line":46,"column":26},"end":{"line":46,"column":null}},"3":{"start":{"line":47,"column":8},"end":{"line":47,"column":null}},"4":{"start":{"line":48,"column":8},"end":{"line":48,"column":null}},"5":{"start":{"line":49,"column":8},"end":{"line":49,"column":null}},"6":{"start":{"line":50,"column":8},"end":{"line":50,"column":null}},"7":{"start":{"line":62,"column":38},"end":{"line":62,"column":null}}},"fnMap":{"0":{"name":"(anonymous_0)","decl":{"start":{"line":41,"column":31},"end":{"line":41,"column":32}},"loc":{"start":{"line":41,"column":41},"end":{"line":51,"column":5}},"line":41}},"branchMap":{},"s":{"0":1,"1":1,"2":0,"3":0,"4":0,"5":0,"6":0,"7":1},"f":{"0":0},"b":{},"meta":{"lastBranch":0,"lastFunction":1,"lastStatement":8,"seen":{"s:21:40:26:Infinity":0,"s:36:35:53:Infinity":1,"f:41:31:41:32":0,"s:46:26:46:Infinity":2,"s:47:8:47:Infinity":3,"s:48:8:48:Infinity":4,"s:49:8:49:Infinity":5,"s:50:8:50:Infinity":6,"s:62:38:62:Infinity":7}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/ephemeral/events.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/ephemeral/events.ts","statementMap":{"0":{"start":{"line":18,"column":48},"end":{"line":36,"column":null}},"1":{"start":{"line":50,"column":45},"end":{"line":75,"column":null}},"2":{"start":{"line":68,"column":17},"end":{"line":68,"column":null}},"3":{"start":{"line":72,"column":17},"end":{"line":72,"column":null}},"4":{"start":{"line":84,"column":55},"end":{"line":105,"column":null}},"5":{"start":{"line":114,"column":53},"end":{"line":135,"column":null}},"6":{"start":{"line":142,"column":40},"end":{"line":147,"column":null}}},"fnMap":{"0":{"name":"(anonymous_0)","decl":{"start":{"line":68,"column":8},"end":{"line":68,"column":9}},"loc":{"start":{"line":68,"column":17},"end":{"line":68,"column":null}},"line":68},"1":{"name":"(anonymous_1)","decl":{"start":{"line":72,"column":8},"end":{"line":72,"column":9}},"loc":{"start":{"line":72,"column":17},"end":{"line":72,"column":null}},"line":72}},"branchMap":{},"s":{"0":1,"1":1,"2":0,"3":0,"4":1,"5":1,"6":1},"f":{"0":0,"1":0},"b":{},"meta":{"lastBranch":0,"lastFunction":2,"lastStatement":7,"seen":{"s:18:48:36:Infinity":0,"s:50:45:75:Infinity":1,"f:68:8:68:9":0,"s:68:17:68:Infinity":2,"f:72:8:72:9":1,"s:72:17:72:Infinity":3,"s:84:55:105:Infinity":4,"s:114:53:135:Infinity":5,"s:142:40:147:Infinity":6}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/ephemeral/index.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/ephemeral/index.ts","statementMap":{},"fnMap":{},"branchMap":{},"s":{},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":0,"seen":{}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/account.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/account.ts","statementMap":{"0":{"start":{"line":33,"column":38},"end":{"line":41,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":1},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":1,"seen":{"s:33:38:41:Infinity":0}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/artifact.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/artifact.ts","statementMap":{"0":{"start":{"line":34,"column":36},"end":{"line":45,"column":null}},"1":{"start":{"line":63,"column":39},"end":{"line":68,"column":null}},"2":{"start":{"line":85,"column":39},"end":{"line":88,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":1,"1":1,"2":1},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":3,"seen":{"s:34:36:45:Infinity":0,"s:63:39:68:Infinity":1,"s:85:39:88:Infinity":2}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/index.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/index.ts","statementMap":{"0":{"start":{"line":49,"column":31},"end":{"line":63,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":1},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":1,"seen":{"s:49:31:63:Infinity":0}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/machine.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/machine.ts","statementMap":{"0":{"start":{"line":36,"column":35},"end":{"line":61,"column":null}},"1":{"start":{"line":81,"column":43},"end":{"line":100,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":1,"1":1},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":2,"seen":{"s:36:35:61:Infinity":0,"s:81:43:100:Infinity":1}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/message.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/message.ts","statementMap":{"0":{"start":{"line":29,"column":32},"end":{"line":35,"column":null}},"1":{"start":{"line":58,"column":41},"end":{"line":74,"column":null}},"2":{"start":{"line":91,"column":38},"end":{"line":106,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":2,"1":2,"2":2},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":3,"seen":{"s:29:32:35:Infinity":0,"s:58:41:74:Infinity":1,"s:91:38:106:Infinity":2}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/misc.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/misc.ts","statementMap":{"0":{"start":{"line":30,"column":44},"end":{"line":39,"column":null}},"1":{"start":{"line":61,"column":36},"end":{"line":69,"column":null}},"2":{"start":{"line":90,"column":38},"end":{"line":97,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":1,"1":1,"2":1},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":3,"seen":{"s:30:44:39:Infinity":0,"s:61:36:69:Infinity":1,"s:90:38:97:Infinity":2}}}
,"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/session.ts": {"path":"/volume1/Projects/happy/packages/@magic-agent/protocol/src/updates/session.ts","statementMap":{"0":{"start":{"line":37,"column":41},"end":{"line":62,"column":null}},"1":{"start":{"line":82,"column":43},"end":{"line":99,"column":null}}},"fnMap":{},"branchMap":{},"s":{"0":2,"1":2},"f":{},"b":{},"meta":{"lastBranch":0,"lastFunction":0,"lastStatement":2,"seen":{"s:37:41:62:Infinity":0,"s:82:43:99:Infinity":1}}}
}
````

## File: packages/@magic-agent/protocol/coverage/index.html
````html
<!doctype html>
<html lang="en">
<head>
    <title>Code coverage report for All files</title>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="prettify.css" />
    <link rel="stylesheet" href="base.css" />
    <link rel="shortcut icon" type="image/x-icon" href="favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style type='text/css'>
        .coverage-summary .sorter {
            background-image: url(sort-arrow-sprite.png);
        }
    </style>
</head>
<body>
<div class='wrapper'>
    <div class='pad1'>
        <h1>All files</h1>
        <div class='clearfix'>
            <div class='fl pad1y space-right2'>
                <span class="strong">86.56% </span>
                <span class="quiet">Statements</span>
                <span class='fraction'>58/67</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">90.9% </span>
                <span class="quiet">Branches</span>
                <span class='fraction'>10/11</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">80% </span>
                <span class="quiet">Functions</span>
                <span class='fraction'>12/15</span>
            </div>
            <div class='fl pad1y space-right2'>
                <span class="strong">86.56% </span>
                <span class="quiet">Lines</span>
                <span class='fraction'>58/67</span>
            </div>
        </div>
        <p class="quiet">
            Press <em>n</em> or <em>j</em> to go to the next uncovered block, <em>b</em>, <em>p</em> or <em>k</em> for the previous block.
        </p>
        <template id="filterTemplate">
            <div class="quiet">
                Filter:
                <input type="search" id="fileSearch">
            </div>
        </template>
    </div>
    <div class='status-line high'></div>
    <div class="pad1">
<table class="coverage-summary">
<thead>
<tr>
   <th data-col="file" data-fmt="html" data-html="true" class="file">File</th>
   <th data-col="pic" data-type="number" data-fmt="html" data-html="true" class="pic"></th>
   <th data-col="statements" data-type="number" data-fmt="pct" class="pct">Statements</th>
   <th data-col="statements_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="branches" data-type="number" data-fmt="pct" class="pct">Branches</th>
   <th data-col="branches_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="functions" data-type="number" data-fmt="pct" class="pct">Functions</th>
   <th data-col="functions_raw" data-type="number" data-fmt="html" class="abs"></th>
   <th data-col="lines" data-type="number" data-fmt="pct" class="pct">Lines</th>
   <th data-col="lines_raw" data-type="number" data-fmt="html" class="abs"></th>
</tr>
</thead>
<tbody><tr>
	<td class="file high" data-value="src"><a href="src/index.html">src</a></td>
	<td data-value="84.44" class="pic high">
	<div class="chart"><div class="cover-fill" style="width: 84%"></div><div class="cover-empty" style="width: 16%"></div></div>
	</td>
	<td data-value="84.44" class="pct high">84.44%</td>
	<td data-value="45" class="abs high">38/45</td>
	<td data-value="90.9" class="pct high">90.9%</td>
	<td data-value="11" class="abs high">10/11</td>
	<td data-value="92.3" class="pct high">92.3%</td>
	<td data-value="13" class="abs high">12/13</td>
	<td data-value="84.44" class="pct high">84.44%</td>
	<td data-value="45" class="abs high">38/45</td>
	</tr>
<tr>
	<td class="file medium" data-value="src/ephemeral"><a href="src/ephemeral/index.html">src/ephemeral</a></td>
	<td data-value="71.42" class="pic medium">
	<div class="chart"><div class="cover-fill" style="width: 71%"></div><div class="cover-empty" style="width: 29%"></div></div>
	</td>
	<td data-value="71.42" class="pct medium">71.42%</td>
	<td data-value="7" class="abs medium">5/7</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="0" class="pct low">0%</td>
	<td data-value="2" class="abs low">0/2</td>
	<td data-value="71.42" class="pct medium">71.42%</td>
	<td data-value="7" class="abs medium">5/7</td>
	</tr>
<tr>
	<td class="file high" data-value="src/updates"><a href="src/updates/index.html">src/updates</a></td>
	<td data-value="100" class="pic high">
	<div class="chart"><div class="cover-fill cover-full" style="width: 100%"></div><div class="cover-empty" style="width: 0%"></div></div>
	</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="15" class="abs high">15/15</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="0" class="abs high">0/0</td>
	<td data-value="100" class="pct high">100%</td>
	<td data-value="15" class="abs high">15/15</td>
	</tr>
</tbody>
</table>
</div>
                <div class='push'></div>
            </div>
            <div class='footer quiet pad2 space-top1 center small'>
                Code coverage generated by
                <a href="https://istanbul.js.org/" target="_blank" rel="noopener noreferrer">istanbul</a>
                at 2025-12-29T23:19:22.927Z
            </div>
        <script src="prettify.js"></script>
        <script>
            window.onload = function () {
                prettyPrint();
            };
        </script>
        <script src="sorter.js"></script>
        <script src="block-navigation.js"></script>
    </body>
</html>
````

## File: packages/@magic-agent/protocol/coverage/prettify.css
````css
.pln{color:#000}@media screen{.str{color:#080}.kwd{color:#008}.com{color:#800}.typ{color:#606}.lit{color:#066}.pun,.opn,.clo{color:#660}.tag{color:#008}.atn{color:#606}.atv{color:#080}.dec,.var{color:#606}.fun{color:red}}@media print,projection{.str{color:#060}.kwd{color:#006;font-weight:bold}.com{color:#600;font-style:italic}.typ{color:#404;font-weight:bold}.lit{color:#044}.pun,.opn,.clo{color:#440}.tag{color:#006;font-weight:bold}.atn{color:#404}.atv{color:#060}}pre.prettyprint{padding:2px;border:1px solid #888}ol.linenums{margin-top:0;margin-bottom:0}li.L0,li.L1,li.L2,li.L3,li.L5,li.L6,li.L7,li.L8{list-style-type:none}li.L1,li.L3,li.L5,li.L7,li.L9{background:#eee}
````

## File: packages/@magic-agent/protocol/coverage/prettify.js
````javascript
window.PR_SHOULD_USE_CONTINUATION=true;(function()
````

## File: packages/@magic-agent/protocol/src/ephemeral/index.ts
````typescript

````

## File: packages/@magic-agent/protocol/src/constraints.ts
````typescript
export type StringLimits = typeof STRING_LIMITS;
export type Patterns = typeof PATTERNS;
export type BodySizeLimits = typeof BODY_SIZE_LIMITS;
````

## File: packages/@magic-agent/protocol/src/sharing.test.ts
````typescript
import { describe, it, expect } from 'vitest';
import {
    SessionSharePermissionSchema,
    SessionShareEntrySchema,
    SessionShareUrlConfigSchema,
    InvitationStatusSchema,
    SessionShareInvitationSchema,
    SessionShareSettingsSchema,
    AddSessionShareRequestSchema,
    UpdateSessionShareRequestSchema,
    RemoveSessionShareRequestSchema,
    UpdateUrlSharingRequestSchema,
    RevokeInvitationRequestSchema,
    ResendInvitationRequestSchema,
} from './sharing';
import { STRING_LIMITS } from './constraints';
⋮----
// ═══════════════════════════════════════════════════════════════
// SessionShareEntrySchema Tests
// ═══════════════════════════════════════════════════════════════
````

## File: packages/@magic-agent/protocol/src/sharing.ts
````typescript
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
import { UserProfileSchema } from './common';
⋮----
export type SessionSharePermission = z.infer<typeof SessionSharePermissionSchema>;
⋮----
export type SessionShareEntry = z.infer<typeof SessionShareEntrySchema>;
⋮----
export type SessionShareUrlConfig = z.infer<typeof SessionShareUrlConfigSchema>;
⋮----
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
⋮----
export type SessionShareInvitation = z.infer<typeof SessionShareInvitationSchema>;
⋮----
export type SessionShareSettings = z.infer<typeof SessionShareSettingsSchema>;
⋮----
export type AddSessionShareRequest = z.infer<typeof AddSessionShareRequestSchema>;
⋮----
export type UpdateSessionShareRequest = z.infer<typeof UpdateSessionShareRequestSchema>;
⋮----
export type RemoveSessionShareRequest = z.infer<typeof RemoveSessionShareRequestSchema>;
⋮----
export type UpdateUrlSharingRequest = z.infer<typeof UpdateUrlSharingRequestSchema>;
⋮----
export type RevokeInvitationRequest = z.infer<typeof RevokeInvitationRequestSchema>;
⋮----
export type ResendInvitationRequest = z.infer<typeof ResendInvitationRequestSchema>;
````

## File: packages/@magic-agent/protocol/src/usageLimits.test.ts
````typescript
import { describe, it, expect } from 'vitest';
import { UsageLimitSchema, PlanLimitsResponseSchema } from './usageLimits';
import { STRING_LIMITS } from './constraints';
⋮----
id: '', // invalid - empty id
````

## File: packages/@magic-agent/protocol/src/usageLimits.ts
````typescript
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
⋮----
export type UsageLimit = z.infer<typeof UsageLimitSchema>;
⋮----
export type PlanLimitsResponse = z.infer<typeof PlanLimitsResponseSchema>;
````

## File: packages/@magic-agent/protocol/tsconfig.json
````json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["ES2022"],
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "outDir": "./dist",
        "rootDir": "./src",
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
````

## File: packages/@magic-agent/protocol/tsup.config.ts
````typescript
import { defineConfig } from 'tsup';
````

## File: scripts/compare-schemas.ts
````typescript
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
⋮----
interface SchemaProperty {
    type?: string;
    enum?: string[];
    properties?: Record<string, SchemaProperty>;
    required?: string[];
    additionalProperties?: boolean | SchemaProperty;
    items?: SchemaProperty;
    oneOf?: SchemaProperty[];
    anyOf?: SchemaProperty[];
    allOf?: SchemaProperty[];
    $ref?: string;
    nullable?: boolean;
    description?: string;
}
interface DriftIssue {
    severity: 'error' | 'warning' | 'info';
    type: 'missing' | 'type_mismatch' | 'property_diff' | 'enum_diff' | 'breaking';
    path: string;
    message: string;
    details?: Record<string, unknown>;
}
interface ComparisonResult {
    timestamp: string;
    protocolVersion: string;
    openApiVersion: string;
    issues: DriftIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        passed: boolean;
    };
}
function parseArgs():
function loadJsonFile<T>(path: string): T
function getTypeString(schema: SchemaProperty | undefined): string
function compareSchemaProperties(
    protocolProp: SchemaProperty | undefined,
    openApiProp: SchemaProperty | undefined,
    path: string,
    issues: DriftIssue[]
): void
function isOasdiffAvailable(): boolean
function checkBreakingChanges(baseline: string, current: string): DriftIssue[]
function generateMarkdownReport(result: ComparisonResult): string
⋮----
// Group by severity
⋮----
/**
 * Main comparison function
 */
async function main(): Promise<void>
⋮----
// Check prerequisites
⋮----
// Load schemas
⋮----
interface ProtocolSchemas {
        _metadata: { packageVersion: string };
        schemas: Record<string, Record<string, SchemaProperty>>;
    }
interface OpenAPISpec {
        info: { version: string };
        components?: { schemas?: Record<string, SchemaProperty> };
        paths?: Record<string, unknown>;
    }
````

## File: scripts/lint-github-casing.mjs
````javascript
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
⋮----
// Pattern to match PascalCase identifiers containing "Github" (incorrect)
// This should be "GitHub" in PascalCase contexts
// Matches: GithubProfile, GithubUser, MyGithubService
// Does NOT match: githubToken (camelCase), GITHUB_KEY (SCREAMING_CASE)
⋮----
// File extensions to check
⋮----
// Directories to skip
⋮----
/**
 * Check if a path should be skipped
 * @param {string} name - Directory or file name
 * @returns {boolean}
 */
function shouldSkip(name)
⋮----
/**
 * Get all TypeScript/JavaScript files in a directory recursively
 * @param {string} dir - Directory to scan
 * @returns {string[]} - Array of file paths
 */
function getFiles(dir)
⋮----
// Ignore permission errors
⋮----
/**
 * Generate the corrected identifier
 * @param {string} match - The incorrect identifier
 * @returns {string} - The corrected identifier
 */
function getSuggestion(match)
⋮----
/**
 * Check a single file for GitHub casing issues
 * @param {string} filePath - Path to the file
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Array} - Array of issues found
 */
function checkFile(filePath, baseDir)
⋮----
// Reset regex state
⋮----
// Skip if line starts with comment markers (JSDoc, block comment, single-line)
⋮----
// Skip if match is after a comment marker on the same line
⋮----
// Skip if it's in a string literal (basic check - count quotes before match)
⋮----
// Ignore read errors
⋮----
/**
 * Main function
 */
function main()
⋮----
// Exit with warning code (allows CI to continue but flags the issue)
````

## File: scripts/lint-protocol-helpers.mjs
````javascript
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
⋮----
// Patterns to detect direct field access on @magic-agent/protocol update objects
// These match the .body.sid and .body.machineId access patterns
⋮----
// Matches: .body.sid, .body?.sid (for session updates)
// Examples: update.body.sid, data.body?.sid, updateData.body.sid
⋮----
// Matches: .body.machineId, .body?.machineId (for machine updates)
// Examples: update.body.machineId, data.body?.machineId
⋮----
// File extensions to check
⋮----
// Directories to skip
⋮----
// Files/directories that are allowed to use direct access
⋮----
// The @magic-agent/protocol package itself - helpers need direct access
⋮----
// Test files can have mock objects with direct construction
⋮----
// Fixtures and mocks
⋮----
/**
 * Check if a path should be skipped
 * @param {string} name - Directory or file name
 * @returns {boolean}
 */
function shouldSkipDir(name)
⋮----
/**
 * Check if a file path is allowed to use direct access
 * @param {string} filePath - Full file path
 * @returns {boolean}
 */
function isAllowedPath(filePath)
⋮----
/**
 * Get all TypeScript files in a directory recursively
 * @param {string} dir - Directory to scan
 * @returns {string[]} - Array of file paths
 */
function getFiles(dir)
⋮----
// Ignore permission errors
⋮----
/**
 * Check if a line is a comment or inside a string
 * @param {string} line - The line content
 * @param {number} matchIndex - The position of the match
 * @returns {boolean}
 */
function isInCommentOrString(line, matchIndex)
⋮----
// Skip comment lines
⋮----
// Skip JSDoc examples
⋮----
// Check if match is after a comment marker on the same line
⋮----
// Skip if it's in a string literal (basic check - count quotes before match)
⋮----
/**
 * Check if the line contains a helper function call (to avoid false positives)
 * @param {string} line - The line content
 * @returns {boolean}
 */
function containsHelperCall(line)
⋮----
/**
 * Check a single file for protocol helper issues
 * @param {string} filePath - Path to the file
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Array} - Array of issues found
 */
function checkFile(filePath, baseDir)
⋮----
// Skip allowed paths
⋮----
// Skip if line contains helper function call (likely already using helpers)
⋮----
// Reset regex state
⋮----
// Check if in comment or string
⋮----
// Ignore read errors
⋮----
/**
 * Main function
 */
function main()
⋮----
// Exit with warning code
````

## File: knip.json
````json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "ignoreExportsUsedInFile": {
    "interface": true,
    "type": true
  },
  "workspaces": {
    "packages/@magic-agent/protocol": {
      "entry": ["src/index.ts"],
      "project": ["src/**/*.ts"],
      "ignoreDependencies": ["zod"]
    },
    "happy-app": {
      "expo": {
        "config": ["app.json", "app.config.js"],
        "production": ["sources/app/**/*.{ts,tsx}"]
      },
      "entry": [
        "sources/app/**/*.{ts,tsx}",
        "app.config.js",
        "metro.config.js",
        "babel.config.js",
        "plugins/**/*.js"
      ],
      "project": ["sources/**/*.{ts,tsx}", "plugins/**/*.js"],
      "ignore": [
        "sources/-*/**",
        "sources/trash/**",
        "sources/**/*.test.ts",
        "sources/**/*.spec.ts"
      ],
      "ignoreDependencies": [
        "@babel/runtime",
        "@config-plugins/*",
        "@elevenlabs/*",
        "@expo/*",
        "@magic-agent/protocol",
        "@legendapp/*",
        "@livekit/*",
        "@lottiefiles/*",
        "@material/*",
        "@more-tech/*",
        "@peoplesgrocers/*",
        "@react-native*",
        "@react-navigation/*",
        "@revenuecat/*",
        "@shopify/*",
        "@stablelib/*",
        "@tauri-apps/*",
        "@types/*",
        "@vitest/*",
        "axios",
        "babel-*",
        "chalk",
        "color",
        "diff",
        "expo",
        "expo-*",
        "fuse.js",
        "knip",
        "libsodium-wrappers",
        "livekit-client",
        "lottie-react-native",
        "mermaid",
        "oxlint",
        "patch-package",
        "posthog-react-native",
        "qrcode",
        "react",
        "react-dom",
        "react-native",
        "react-native-*",
        "react-syntax-highlighter",
        "react-test-renderer",
        "react-textarea-autosize",
        "resolve-path",
        "rn-encryption",
        "tsx",
        "twrnc",
        "typescript",
        "uuid",
        "vitest",
        "wrangler",
        "zod",
        "zustand"
      ],
      "ignoreBinaries": [
        "eas",
        "expo",
        "knip",
        "oxlint",
        "patch-package",
        "tsc",
        "tsx",
        "vitest",
        "wrangler"
      ],
      "ignoreUnresolved": ["metro-minify-terser"]
    },
    "happy-cli": {
      "entry": [
        "src/index.ts",
        "src/lib.ts",
        "bin/happy.mjs",
        "scripts/claude_local_launcher.cjs!",
        "scripts/claude_remote_launcher.cjs!",
        "scripts/claude_version_utils.cjs!",
        "scripts/ripgrep_launcher.cjs!",
        "scripts/fix-mcp-imports.js!"
      ],
      "project": ["src/**/*.ts", "scripts/**/*.{js,cjs,mjs}"],
      "ignore": ["src/**/*.test.ts", "src/**/*.spec.ts"],
      "ignoreDependencies": [
        "@fastify/swagger",
        "@magic-agent/protocol",
        "@modelcontextprotocol/sdk",
        "@sentry/node",
        "@stablelib/hex",
        "@types/*",
        "@vitest/*",
        "axios",
        "chalk",
        "cross-spawn",
        "dotenv",
        "expo-server-sdk",
        "fastify",
        "fastify-type-provider-zod",
        "glob",
        "http-proxy",
        "ink",
        "open",
        "openapi-types",
        "oxlint",
        "pkgroll",
        "plist",
        "ps-list",
        "qrcode-terminal",
        "react",
        "release-it",
        "tar",
        "tmp",
        "tweetnacl",
        "typescript",
        "vitest",
        "ws",
        "zod"
      ],
      "ignoreBinaries": ["knip", "oxlint", "pkgroll", "release-it", "tsc", "tsx", "vitest"],
      "ignoreFiles": ["pkgroll.config.js"]
    },
    "happy-server": {
      "entry": ["sources/main.ts", "prisma.config.ts", "vitest.config.ts"],
      "project": ["sources/**/*.ts"],
      "ignore": ["sources/**/*.test.ts", "sources/**/*.spec.ts"],
      "ignoreDependencies": [
        "@fastify/cors",
        "@fastify/swagger",
        "@magic-agent/protocol",
        "@prisma/client",
        "@socket.io/*",
        "@types/*",
        "axios",
        "chalk",
        "date-fns",
        "dotenv",
        "elevenlabs",
        "fastify",
        "fastify-type-provider-zod",
        "ioredis",
        "jsonwebtoken",
        "minio",
        "octokit",
        "openapi-types",
        "pino-pretty",
        "prisma",
        "prisma-json-types-generator",
        "privacy-kit",
        "prom-client",
        "semver",
        "sharp",
        "socket.io",
        "socket.io-adapter",
        "tmp",
        "ts-node",
        "tweetnacl",
        "typescript",
        "uuid",
        "vite-tsconfig-paths",
        "vitest",
        "yaml",
        "zod",
        "zod-to-json-schema"
      ],
      "ignoreBinaries": ["lsof", "prisma", "tsc", "tsx", "vitest"]
    },
    "happy-server-workers": {
      "entry": [
        "src/index.ts",
        "src/durable-objects/**/*.ts",
        "src/db/seed.ts",
        "src/db/comparison-tool.ts",
        "scripts/**/*.ts"
      ],
      "project": ["src/**/*.ts", "scripts/**/*.ts"],
      "ignore": ["src/**/*.test.ts", "src/**/*.spec.ts", "src/__tests__/**", "load-tests/**"],
      "ignoreDependencies": [
        "@cloudflare/workers-types",
        "@eslint/*",
        "@magic-agent/protocol",
        "@hono/zod-openapi",
        "@stablelib/*",
        "@types/*",
        "@typescript-eslint/*",
        "@vitest/*",
        "cloudflare",
        "drizzle-kit",
        "drizzle-orm",
        "eslint",
        "hono",
        "jose",
        "jpeg-js",
        "oxlint",
        "prettier",
        "thumbhash",
        "tsx",
        "tweetnacl",
        "typescript",
        "upng-js",
        "vitest",
        "wrangler",
        "zod"
      ],
      "ignoreBinaries": [
        "drizzle-kit",
        "eslint",
        "knip",
        "oxlint",
        "prettier",
        "tsc",
        "tsx",
        "vitest",
        "wrangler"
      ]
    }
  }
}
````

## File: .github/workflows/bundle-size.yml
````yaml
name: Bundle Size
on:
  pull_request:
    branches: [main]
    paths:
      - 'happy-app/**'
      - 'packages/@happy/**'
      - '!happy-app/**/*.md'
      - '!happy-app/**/*.test.ts'
      - '!happy-app/**/*.test.tsx'
  push:
    branches: [main]
    paths:
      - 'happy-app/**'
      - 'packages/@happy/**'
permissions:
  contents: read
  pull-requests: write
concurrency:
  group: bundle-size-${{ github.ref }}
  cancel-in-progress: true
jobs:
  bundle-size:
    name: Analyze Bundle Size
    runs-on: ubuntu-latest
    timeout-minutes: 20
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v6
      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '24'
      - name: Enable Corepack (for Yarn 4)
        run: corepack enable
      - name: Get yarn cache directory
        id: yarn-cache-dir
        run: echo "dir=$(yarn config get cacheFolder)" >> "$GITHUB_OUTPUT"
      - name: Cache yarn dependencies
        uses: actions/cache@v5
        with:
          path: |
            ${{ steps.yarn-cache-dir.outputs.dir }}
            .yarn/install-state.gz
          key: ${{ runner.os }}-yarn-${{ hashFiles('yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-yarn-
      - name: Restore baseline bundle stats
        id: baseline-cache
        uses: actions/cache/restore@v5
        with:
          path: .bundle-baseline.json
          key: bundle-stats-main-${{ hashFiles('yarn.lock') }}
          restore-keys: |
            bundle-stats-main-
      - name: Install dependencies
        run: yarn install --immutable
      - name: Build @magic-agent/protocol
        run: yarn workspace @magic-agent/protocol build
      - name: Build web bundle
        working-directory: happy-app
        run: yarn build:web:dev
        env:
          NODE_ENV: production
          APP_ENV: development
      - name: Analyze bundle size
        id: analyze
        working-directory: happy-app
        env:
          HAPPY_API_URL: ${{ secrets.HAPPY_API_URL }}
          CI_METRICS_API_KEY: ${{ secrets.CI_METRICS_API_KEY }}
          GITHUB_PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          if [ -f "../.bundle-baseline.json" ]; then
            yarn analyze:bundle --baseline ../.bundle-baseline.json --output ./bundle-report.json --format json
            yarn analyze:bundle --baseline ../.bundle-baseline.json --output ./bundle-report.md --format github
          else
            yarn analyze:bundle --output ./bundle-report.json --format json
            yarn analyze:bundle --output ./bundle-report.md --format github
          fi
          TOTAL_SIZE=$(jq -r '.totalFormatted' bundle-report.json)
          JS_SIZE=$(jq -r '.jsBundle.totalFormatted' bundle-report.json)
          echo "total_size=$TOTAL_SIZE" >> "$GITHUB_OUTPUT"
          echo "js_size=$JS_SIZE" >> "$GITHUB_OUTPUT"
      - name: Post bundle size comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const reportPath = 'happy-app/bundle-report.md';
            if (!fs.existsSync(reportPath)) {
              console.log('No bundle report found, skipping comment');
              return;
            }
            const report = fs.readFileSync(reportPath, 'utf8');
            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const botComment = comments.find(comment =>
              comment.user.type === 'Bot' &&
              comment.body.includes('Bundle Size Report')
            );
            const workflowUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;
            const commentBody = report + '\n\n' +
              `> [View workflow run](${workflowUrl})`;
            if (botComment) {
              // Update existing comment
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body: commentBody,
              });
              console.log('Updated existing bundle size comment');
            } else {
              // Create new comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: commentBody,
              });
              console.log('Created new bundle size comment');
            }
      - name: Upload bundle stats
        uses: actions/upload-artifact@v6
        with:
          name: bundle-stats
          path: |
            happy-app/bundle-report.json
            happy-app/bundle-report.md
          retention-days: 7
  update-baseline:
    name: Update Baseline
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: github.event_name == 'push'
    steps:
      - name: Checkout main branch
        uses: actions/checkout@v6
      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '24'
      - name: Enable Corepack
        run: corepack enable
      - name: Get yarn cache directory
        id: yarn-cache-dir
        run: echo "dir=$(yarn config get cacheFolder)" >> "$GITHUB_OUTPUT"
      - name: Cache yarn dependencies
        uses: actions/cache@v5
        with:
          path: |
            ${{ steps.yarn-cache-dir.outputs.dir }}
            .yarn/install-state.gz
          key: ${{ runner.os }}-yarn-${{ hashFiles('yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-yarn-
      - name: Install dependencies
        run: yarn install --immutable
      - name: Build @magic-agent/protocol
        run: yarn workspace @magic-agent/protocol build
      - name: Build web bundle
        working-directory: happy-app
        run: yarn build:web:dev
        env:
          NODE_ENV: production
          APP_ENV: development
      - name: Generate baseline stats and report to Analytics Engine
        working-directory: happy-app
        env:
          HAPPY_API_URL: ${{ secrets.HAPPY_API_URL }}
          CI_METRICS_API_KEY: ${{ secrets.CI_METRICS_API_KEY }}
        run: yarn analyze:bundle --output ../.bundle-baseline.json
      - name: Cache baseline stats
        uses: actions/cache/save@v5
        with:
          path: .bundle-baseline.json
          key: bundle-stats-main-${{ hashFiles('yarn.lock') }}-${{ github.sha }}
````

## File: docs/API-VERSIONING.md
````markdown
# API Versioning Policy

This document describes the API versioning strategy for Happy Server, including how versions are managed, what constitutes breaking vs. non-breaking changes, and how the CI pipeline enforces API contract stability.

## Versioning Strategy

### URL-Based Versioning

Happy Server uses **URL path versioning** with the `/v1/` prefix:

```
https://api.happy.engineering/v1/sessions
https://api.happy.engineering/v1/auth/token
```

This approach was chosen for:
- **Explicitness**: The version is clearly visible in every request
- **Cacheability**: Different versions can be cached independently
- **Simplicity**: Easy to understand and implement

### Current Version

| Version | Status | Description |
|---------|--------|-------------|
| `/v1/` | **Current** | Production API, actively maintained |

### Future Versions

When a new major version is needed (e.g., `/v2/`):
1. Both versions will run in parallel during a deprecation period
2. Clients will be notified via push notifications and app updates
3. The old version will be deprecated with a sunset date
4. After the sunset date, the old version will return `410 Gone`

## Change Classification

### Non-Breaking Changes (Safe)

These changes are backward-compatible and can be deployed without version increment:

| Change Type | Example | Safe? |
|-------------|---------|-------|
| Add new endpoint | `POST /v1/sessions/archive` | ✅ |
| Add optional request field | `{ "name": "...", "tags"?: [] }` | ✅ |
| Add response field | `{ "id": "...", "createdAt": "..." }` | ✅ |
| Widen accepted values | Accept both `"active"` and `"ACTIVE"` | ✅ |
| Add new enum value (response) | Status: `"pending"` → `"pending" \| "queued"` | ✅ |
| Increase rate limits | 100 req/min → 200 req/min | ✅ |
| Improve error messages | Better descriptions | ✅ |

### Breaking Changes (Require New Version)

These changes break existing clients and require a new API version:

| Change Type | Example | Breaking? |
|-------------|---------|-----------|
| Remove endpoint | Delete `GET /v1/legacy` | ❌ |
| Remove request field | Remove `{ "oldField": "..." }` | ❌ |
| Remove response field | Remove `"legacyId"` from response | ❌ |
| Rename field | `userId` → `user_id` | ❌ |
| Change field type | `"count": "5"` → `"count": 5` | ❌ |
| Add required request field | New required `"apiVersion"` field | ❌ |
| Change URL structure | `/v1/sessions` → `/v1/claude/sessions` | ❌ |
| Narrow accepted values | Remove accepted enum value | ❌ |
| Change authentication | Bearer → API Key | ❌ |
| Reduce rate limits | 100 req/min → 50 req/min | ❌ |

## OpenAPI Specification

### Automatic Generation

The OpenAPI specification is automatically generated from route schemas using `@fastify/swagger` and Zod schemas:

```bash
# Generate OpenAPI spec
cd happy-server
yarn openapi:generate        # Creates openapi.json
yarn openapi:generate:yaml   # Creates openapi.yaml
```

### Accessing the Spec

| Method | URL/Command |
|--------|-------------|
| Runtime (JSON) | `GET /documentation/json` |
| Runtime (YAML) | `GET /documentation/yaml` |
| Generated file | `happy-server/openapi.json` |
| CI Artifact | Download from GitHub Actions |

### CI Validation

The CI pipeline validates the OpenAPI spec on every PR:

1. **Generation**: Spec is generated from current route schemas
2. **Linting**: Validated using Redocly CLI for OpenAPI 3.0 compliance
3. **Artifact**: Uploaded as a build artifact for review

```yaml
# .github/workflows/ci.yml
openapi-server:
  name: OpenAPI - happy-server
  steps:
    - run: yarn openapi:generate
    - run: npx @redocly/cli lint openapi.json
```

## Schema Drift Detection

Schema drift occurs when the server's API schemas diverge from what clients expect. The CI pipeline includes automated drift detection to catch these issues before they reach production.

### How It Works

1. **Protocol Schema Extraction**: The `@magic-agent/protocol` package's Zod schemas are converted to JSON Schema format
2. **OpenAPI Schema Extraction**: The server's OpenAPI spec contains schemas derived from route definitions
3. **Comparison**: A comparison script identifies mismatches between protocol and server schemas
4. **Breaking Change Detection**: Optional `oasdiff` integration detects breaking changes vs. baseline

### Running Locally

```bash
# Extract protocol schemas to JSON
yarn schema:extract

# Generate OpenAPI spec (if not already done)
cd happy-server && yarn openapi:generate && cd ..

# Compare schemas
yarn schema:compare

# For CI-style markdown output
yarn schema:compare --ci

# With verbose output
yarn schema:compare --verbose

# Compare against a baseline (breaking change detection)
yarn schema:compare --baseline path/to/baseline-openapi.json
```

### CI Integration

The `schema-drift` job runs on every PR:

```yaml
schema-drift:
  name: Schema Drift Detection
  needs: [build-protocol, openapi-server]
  steps:
    - run: yarn schema:extract
    - run: yarn schema:compare --ci
```

**Artifacts produced:**
- `protocol-schemas` - JSON Schema representation of `@magic-agent/protocol`
- `schema-drift-report` - Markdown report of any detected drift

### Issue Severity

| Severity | Description | Blocks PR |
|----------|-------------|-----------|
| 🔴 Error | Breaking type mismatch | Yes |
| 🟡 Warning | Potential compatibility issue | No |
| 🔵 Info | Informational difference | No |

### Troubleshooting Common Issues

#### Type Mismatch

```
🔴 [type_mismatch] updates.ApiMessage.id: Type mismatch: protocol has "string", OpenAPI has "integer"
```

**Cause**: Protocol schema and server route schema define different types for the same field.

**Fix**: Align the Zod schemas in both locations. Usually the protocol schema is the source of truth.

#### Missing Property

```
🟡 [missing] common.UserProfile.avatar: Property exists in protocol but not in OpenAPI
```

**Cause**: The protocol defines a property that the server doesn't expose in its OpenAPI spec.

**Fix**: Either add the property to the server route schema, or remove it from the protocol if it's not part of the API contract.

#### Enum Drift

```
🟡 [enum_diff] common.RelationshipStatus: Enum values in protocol missing from OpenAPI: rejected
```

**Cause**: The protocol defines enum values that the server doesn't document.

**Fix**: Ensure both schemas define the same set of valid enum values.

### Schema Matching Strategy

Not all protocol schemas are expected to match OpenAPI schemas:

| Schema Type | Expected in OpenAPI | Notes |
|-------------|---------------------|-------|
| Common types (GitHubProfile, ImageRef) | Sometimes | Depends on route usage |
| Update events (ApiUpdate*) | No | WebSocket-only, not REST |
| Ephemeral events | No | Real-time only |
| Payload wrappers | No | Internal wire format |

The comparison script only reports mismatches for schemas that exist in both locations.

## Schema Definition Guidelines

### Using Zod for Route Schemas

All route schemas should use Zod for type-safe validation:

```typescript
import { z } from "zod";

app.post('/v1/sessions', {
    schema: {
        body: z.object({
            name: z.string().describe("Session name"),
            machineId: z.string().uuid().describe("Machine identifier"),
        }),
        response: {
            200: z.object({
                id: z.string().uuid(),
                name: z.string(),
                createdAt: z.string().datetime(),
            }),
            400: z.object({
                error: z.string(),
                code: z.string(),
            }),
        },
    },
}, handler);
```

### Documentation Best Practices

1. **Use `.describe()`** on Zod schemas for OpenAPI descriptions
2. **Define all response codes** including error responses
3. **Use appropriate Zod types** (`z.string().uuid()`, `z.string().datetime()`)
4. **Group endpoints with tags** in route handlers

## Shared Types with @magic-agent/protocol

The `@magic-agent/protocol` package contains shared Zod schemas for API payloads:

```typescript
// In @magic-agent/protocol
export const SessionUpdateSchema = z.object({
    sessionId: z.string(),
    status: z.enum(["active", "paused", "completed"]),
    // ...
});

// In happy-server route
import { SessionUpdateSchema } from "@magic-agent/protocol";

app.post('/v1/sessions/update', {
    schema: {
        body: SessionUpdateSchema,
    },
}, handler);
```

This ensures type consistency between:
- `happy-server` (API producer)
- `happy-cli` (API consumer)
- `happy-app` (API consumer)

## Deprecation Process

### Deprecating an Endpoint

1. Add `deprecated: true` to the route schema
2. Add `X-Deprecated` response header with sunset date
3. Update OpenAPI spec description with deprecation notice
4. Log usage of deprecated endpoints for monitoring
5. After sunset date, return `410 Gone`

```typescript
app.get('/v1/legacy-endpoint', {
    schema: {
        deprecated: true,
        description: "**DEPRECATED**: Use /v1/new-endpoint instead. Sunset: 2025-06-01",
    },
}, handler);
```

### Deprecating a Field

1. Mark field as deprecated in Zod schema
2. Continue accepting the field but ignore it
3. Stop including in responses after sunset
4. Document in changelog

## Monitoring & Alerts

### API Contract Monitoring

- **CI Failure**: OpenAPI validation fails on PR
- **Schema Drift**: Detected by comparing generated spec to baseline
- **Deprecated Usage**: Logged and alerted when deprecated endpoints are called

### Recommended Monitoring

```typescript
// Log deprecated endpoint usage
app.addHook('onRequest', (request, reply, done) => {
    if (isDeprecated(request.url)) {
        log({
            module: 'api-deprecation',
            level: 'warn',
            url: request.url,
            userId: request.userId,
        }, 'Deprecated endpoint accessed');
    }
    done();
});
```

## Related Documentation

- [Encryption Architecture](./ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [RFC: Shared Types Package](./RFC-SHARED-TYPES-PACKAGE.md) - @magic-agent/protocol design
- [@magic-agent/protocol CLAUDE.md](../packages/@magic-agent/protocol/CLAUDE.md) - Protocol package guidelines

## Changelog

| Date | Change | Issue |
|------|--------|-------|
| 2025-12-26 | Add schema drift detection CI job | HAP-565 |
| 2025-12-26 | Initial API versioning policy | HAP-473 |
````

## File: docs/ENCRYPTION-ARCHITECTURE.md
````markdown
# Happy Encryption Architecture

This document describes the encryption architecture used across the Happy platform. Understanding this architecture is essential for security reviews, development, and troubleshooting.

## Overview

Happy uses a **zero-knowledge architecture** where the server cannot decrypt user data. All sensitive user information is encrypted client-side before transmission, and the server stores only encrypted blobs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENCRYPTION ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐       │
│  │  happy-cli  │◄──────► │  happy-server    │◄──────► │  happy-app  │       │
│  │  (Node.js)  │  E2E    │  (Workers)       │  E2E    │ (React Nat) │       │
│  │             │  Enc    │                  │  Enc    │             │       │
│  └──────┬──────┘         └────────┬─────────┘         └──────┬──────┘       │
│         │                         │                          │               │
│         │          ┌──────────────┼──────────────┐          │               │
│         │          │              │              │          │               │
│         ▼          ▼              ▼              ▼          ▼               │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────┐          │
│  │ AES-256-GCM │ │ happy-macos │ │ TweetNaCl    │ │ AES-256-GCM │          │
│  │ + Key Ver.  │ │ (CryptoKit) │ │ secretbox    │ │ + SecretBox │          │
│  │ + Legacy    │ │ AES-256-GCM │ │ (svr secrets)│ │ (legacy)    │          │
│  └─────────────┘ └─────────────┘ └──────────────┘ └─────────────┘          │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│   Layer 1: TLS 1.3 Transport (all connections)                               │
│   Layer 2: End-to-End Encryption (user data - CLI/App/macOS clients)         │
│   Layer 3: Server-Side Encryption (server-managed secrets only)              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Encryption Layers

### Layer 1: Transport Security (TLS)

All HTTP/WebSocket connections use TLS 1.3 for transport encryption.

| Component | Transport |
|-----------|-----------|
| CLI → Server | HTTPS/WSS |
| App → Server | HTTPS/WSS |
| Server APIs | HTTPS only |

**Note**: Transport encryption is separate from and in addition to the application-level encryption described below.

### Layer 2: End-to-End Encryption (Client-Side)

**Purpose**: Protect user data (sessions, messages, metadata) so the server cannot read it.

| What's Encrypted | Where Encrypted | Key Source |
|------------------|-----------------|------------|
| Session data | CLI/App | User's master secret |
| Messages | CLI/App | Per-session data key |
| Machine metadata | CLI/App | User's master secret |
| Artifacts | CLI/App | Per-artifact data key |

The server stores encrypted blobs and **cannot decrypt them**.

### Layer 3: Server-Side Encryption

**Purpose**: Protect server-managed secrets like AI API tokens (OpenAI, Anthropic keys).

| What's Encrypted | Where Encrypted | Key Source |
|------------------|-----------------|------------|
| AI vendor tokens | Server | HANDY_MASTER_SECRET |
| OAuth tokens | Server | HANDY_MASTER_SECRET |

**Important**: Server-side encryption uses a completely different key hierarchy from E2E encryption. These are intentionally separate systems.

## Algorithm Choices by Component

### CLI (`happy-cli/src/api/encryption.ts`)

The CLI uses **AES-256-GCM** as the primary algorithm with legacy TweetNaCl support.

```typescript
// Modern encryption (AES-256-GCM with key versioning)
encryptWithDataKey(data, dataKey)  // Version 0x00 bundles
encryptWithKeyVersion(data, dataKey, keyVersion)  // Version 0x01 bundles

// Legacy encryption (TweetNaCl secretbox)
encryptLegacy(data, secret)  // XSalsa20-Poly1305
```

**Features**:
- **AES-256-GCM**: Hardware-accelerated on modern CPUs, AEAD authentication
- **Key Versioning**: Supports key rotation via `KeyVersionManager`
- **Hybrid Nonce**: Random bytes + monotonic counter prevents nonce reuse
- **Version Byte**: First byte indicates format (0x00 = legacy, 0x01 = versioned)

**Bundle Format (Version 0x00)**:
```
[version:1][nonce:12][ciphertext:N][authTag:16]
```

**Bundle Format (Version 0x01 - with key versioning)**:
```
[version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
```

### macOS (`happy-macos/Happy/Services/EncryptionService.swift`)

The macOS app uses **AES-256-GCM** via CryptoKit, matching the primary E2E format.

```swift
// Encrypt using AES-256-GCM
let encrypted = try EncryptionService.encrypt(data, with: symmetricKey)

// Decrypt using AES-256-GCM
let decrypted = try EncryptionService.decrypt(encrypted, with: symmetricKey)
```

**Features**:
- **AES-256-GCM**: Native CryptoKit implementation with hardware acceleration
- **Hybrid Nonce**: 4 random bytes + 8-byte counter prevents nonce reuse
- **Version Detection**: Supports both v0 (0x00) and v1 (0x01) bundle formats
- **Key Derivation**: X25519 ECDH with HKDF using same parameters as CLI/App

**Bundle Format**:
```
[version:1][nonce:12][ciphertext:N][authTag:16]
```

**Note**: The macOS app does NOT support the legacy secretbox format (XSalsa20-Poly1305) as it only needs to interoperate with modern encrypted data created by happy-cli and happy-app.

### App (`happy-app/sources/sync/encryption/`)

The App supports both legacy and modern encryption for interoperability.

```typescript
// Modern encryption
class AES256Encryption implements Encryptor, Decryptor

// Legacy encryption (for older sessions)
class SecretBoxEncryption implements Encryptor, Decryptor
```

**Features**:
- **AES256Encryption**: Uses Web Crypto API (AES-GCM)
- **SecretBoxEncryption**: TweetNaCl secretbox (XSalsa20-Poly1305)
- **EncryptionCache**: Performance optimization for frequently accessed data
- **SessionEncryption/MachineEncryption**: High-level abstractions per entity type

**Key Derivation**:
```typescript
// Derive content data key from master secret
const contentDataKey = await deriveKey(masterSecret, 'Happy EnCoder', ['content']);

// Create keypair for data encryption key operations
const contentKeyPair = sodium.crypto_box_seed_keypair(contentDataKey);
```

### Server Workers (`happy-server-workers/src/lib/encryption.ts`)

The server uses **TweetNaCl secretbox only** for server-side secrets.

```typescript
// Encrypt a string with path-based key derivation
await encryptString(['user', userId, 'vendors', vendor, 'token'], apiKey)

// Decrypt with the same path
await decryptString(['user', userId, 'vendors', vendor, 'token'], encryptedData)
```

**Features**:
- **TweetNaCl secretbox**: XSalsa20-Poly1305 authenticated encryption
- **HKDF Key Derivation**: Unique keys per path from HANDY_MASTER_SECRET
- **Key Cache**: Up to 1000 cached derived keys for performance
- **Path-Based Keys**: `['user', userId, 'vendors', 'openai', 'token']`

**Why Simpler?**: The server only encrypts server-managed secrets. It doesn't need:
- Key rotation (secrets can be re-encrypted when rotated)
- Multiple algorithm support (no legacy data)
- Version tracking (single format)

## Why Different Algorithms?

### End-to-End (CLI & App): AES-256-GCM

Chosen for:
1. **Performance**: Hardware acceleration (AES-NI) on modern devices
2. **Key Rotation**: Version byte enables seamless key rotation
3. **Interoperability**: Both CLI (Node.js) and App (React Native) can use it
4. **AEAD**: Built-in authentication prevents tampering

### Server-Side: TweetNaCl secretbox

Chosen for:
1. **Simplicity**: No configuration, audited, secure by default
2. **Sufficient**: Server secrets don't need complex key management
3. **Performance**: Fast enough for low-volume secret access
4. **Proven**: TweetNaCl is a widely audited library

## Key Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KEY HIERARCHY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLIENT-SIDE (E2E)                          SERVER-SIDE                      │
│  ═════════════════                          ═══════════════                  │
│                                                                              │
│  User Master Secret                         HANDY_MASTER_SECRET              │
│        │                                           │                         │
│        ├── Content Data Key                        │                         │
│        │       │                                   │                         │
│        │       ├── Session Keys                    └── HKDF                  │
│        │       │                                        │                    │
│        │       ├── Machine Keys                         ├── user/X/vendors/  │
│        │       │                                        │      openai/token  │
│        │       └── Artifact Keys                        │                    │
│        │                                                ├── user/X/vendors/  │
│        └── Analytics ID (derived)                       │      anthropic/    │
│                                                         │                    │
│                                                         └── ... (per-path)   │
│                                                                              │
│  [Stored on device]                         [Stored in env variable]         │
│  [Never sent to server]                     [Server-only access]             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Client-Side Key Derivation

1. **Master Secret**: User's 32-byte secret, stored locally (`~/.happy/access.key`)
2. **Content Data Key**: Derived via HKDF with context `['content']`
3. **Per-Entity Keys**: Each session/machine/artifact can have its own data encryption key

### Server-Side Key Derivation

1. **HANDY_MASTER_SECRET**: Environment variable (32+ characters)
2. **Path-Derived Keys**: HKDF with path as info (e.g., `user/abc123/vendors/openai/token`)

## Security Properties

### What the Server Can See

| Data | Visible to Server? |
|------|-------------------|
| Session IDs | Yes |
| Session content | No (encrypted) |
| Message content | No (encrypted) |
| Machine IDs | Yes |
| Machine metadata | No (encrypted) |
| User public keys | Yes |
| AI API tokens | No (server-encrypted) |

### What the Server Cannot Do

- Decrypt user session data
- Read message content
- Access user encryption keys
- Impersonate users (requires private key)

### Attack Resistance

| Attack | Mitigation |
|--------|------------|
| Server compromise | E2E encryption - user data remains encrypted |
| Man-in-the-middle | TLS + E2E double protection |
| Nonce reuse | Hybrid nonce (random + counter) |
| Key compromise | Key versioning enables rotation |
| Replay attacks | Challenge-response authentication |

## Implementation Details

### Nonce Generation (CLI)

The CLI uses a hybrid nonce to prevent collisions:

```typescript
function generateHybridNonce(totalLength: number): Uint8Array {
  // Structure: [random bytes][8-byte counter (big-endian)]
  // 24-byte nonce (NaCl): 16 random + 8 counter
  // 12-byte nonce (AES-GCM): 4 random + 8 counter

  const nonce = new Uint8Array(totalLength);
  nonce.set(getRandomBytes(randomLength), 0);  // Random prefix
  counterView.setBigUint64(0, nonceCounter, false);  // Counter suffix
  nonceCounter++;
  return nonce;
}
```

### Data Encryption Key Exchange

Sessions and machines can have dedicated data encryption keys:

```typescript
// CLI encrypts DEK for recipient using their public key
const encryptedDEK = libsodiumEncryptForPublicKey(dataKey, recipientPublicKey);

// App decrypts DEK using content keypair
const dataKey = await encryption.decryptEncryptionKey(encryptedDEKBase64);
```

### Version Detection

Both CLI and App detect encryption format from the first byte:

```typescript
function detectFormat(bundle: Uint8Array): 'legacy' | 'v0' | 'v1' {
  if (bundle.length < 1) return 'invalid';
  switch (bundle[0]) {
    case 0x00: return 'v0';  // AES-GCM without key version
    case 0x01: return 'v1';  // AES-GCM with key version
    default: return 'legacy';  // TweetNaCl secretbox
  }
}
```

## Migration Considerations

### Legacy Data Support

Both CLI and App maintain backward compatibility:

1. **Detection**: First byte indicates format
2. **Legacy Path**: Route to SecretBoxEncryption
3. **Modern Path**: Route to AES256Encryption

### Key Rotation

The `KeyVersionManager` class (CLI) enables gradual key rotation:

```typescript
const manager = new KeyVersionManager(initialKey, {
  autoRotateInterval: 86400000,  // 24 hours
  maxKeyAge: 604800000,          // 7 days
  retainOldKeys: 10              // Keep 10 versions for decryption
});

// Encrypt with current key
const encrypted = manager.encrypt(data);

// Decrypt with appropriate key (auto-detected from bundle)
const decrypted = manager.decrypt(encrypted);
```

## Related Files

### CLI
- `happy-cli/src/api/encryption.ts` - Main encryption module
- `happy-cli/src/api/auth.ts` - Authentication signatures

### App
- `happy-app/sources/sync/encryption/encryption.ts` - Main encryption class
- `happy-app/sources/sync/encryption/encryptor.ts` - Encryptor implementations
- `happy-app/sources/sync/encryption/encryptionCache.ts` - Caching layer
- `happy-app/sources/sync/encryption/sessionEncryption.ts` - Session-specific
- `happy-app/sources/sync/encryption/machineEncryption.ts` - Machine-specific

### Server Workers
- `happy-server-workers/src/lib/encryption.ts` - Server-side encryption
- `happy-server-workers/docs/SECRETS.md` - Secret management

## FAQ

### Why not use the same algorithm everywhere?

Each component has different requirements:
- **CLI/App**: Need key rotation, version tracking, cross-platform compatibility
- **Server**: Needs simple, fast encryption for limited secret storage

### Can the CLI decrypt App-encrypted data?

Yes, both use compatible AES-256-GCM implementations. The version byte ensures format detection works correctly.

### What happens if HANDY_MASTER_SECRET is compromised?

Only server-side secrets (AI tokens) would be exposed. User data remains protected because it uses E2E encryption with user-controlled keys.

### How do I rotate the server master secret?

1. Generate new secret: `openssl rand -hex 32`
2. Re-encrypt all server secrets with new key
3. Update `HANDY_MASTER_SECRET` in production
4. Clear key cache

See `happy-server/docs/SECRET-ROTATION.md` for detailed procedures.

### Why is the server encryption separate from E2E?

By design. Server encryption protects server-managed secrets (like AI tokens the user provides). E2E encryption protects user data. These are fundamentally different trust models:
- **E2E**: User doesn't trust the server with their data
- **Server**: Server needs to use certain secrets (AI tokens) but must protect them at rest

---

*Last updated: December 2025*
*Related issues: HAP-355*
````

## File: packages/@happy/lint-rules/CLAUDE.md
````markdown
# @happy/lint-rules

Custom oxlint/ESLint rules for the Happy monorepo.

## Overview

This package provides shared linting rules that can be used with both oxlint (via JS plugins) and ESLint. It centralizes custom rules that enforce Happy-specific conventions across all projects.

## Rules

### happy/github-casing

Enforces proper "GitHub" casing (capital H) in PascalCase identifiers.

**Bad:**
```typescript
interface GithubUser {}  // ❌ Should be "GitHub"
type GithubProfile = {}  // ❌ Should be "GitHub"
class GithubService {}   // ❌ Should be "GitHub"
```

**Good:**
```typescript
interface GitHubUser {}  // ✅
type GitHubProfile = {}  // ✅
class GitHubService {}   // ✅
const githubToken = ""   // ✅ (camelCase is fine)
```

**Fixable:** Yes (auto-fix available)

**See:** HAP-502

### happy/protocol-helpers

Enforces use of `@magic-agent/protocol` ID accessor helpers instead of direct property access.

**Bad:**
```typescript
const sid = update.body.sid;           // ❌ Direct access
const machineId = update.body.machineId; // ❌ Direct access
```

**Good:**
```typescript
import { getSessionId, getMachineId } from '@magic-agent/protocol';

const sid = getSessionId(update.body);      // ✅
const machineId = getMachineId(update.body); // ✅
```

**Fixable:** No (requires import changes)

**Note:** Test files (`*.spec.ts`, `*.test.ts`, `__tests__/*`) are excluded.

**See:** HAP-658, HAP-653

## Usage

### With oxlint

Add to your `.oxlintrc.json`:

```json
{
    "jsPlugins": ["@happy/lint-rules"],
    "rules": {
        "happy/github-casing": "warn",
        "happy/protocol-helpers": "warn"
    }
}
```

### With ESLint

Add to your `eslint.config.js`:

```javascript
import happyPlugin from '@happy/lint-rules';

export default [
    {
        plugins: { happy: happyPlugin },
        rules: {
            'happy/github-casing': 'warn',
            'happy/protocol-helpers': 'warn'
        }
    }
];
```

Or use the recommended config:

```javascript
import { configs } from '@happy/lint-rules';

export default [
    configs.recommended,
    // ... other configs
];
```

## Development

### Package Structure

```
packages/@happy/lint-rules/
├── src/
│   ├── index.js                   # Plugin entry point
│   └── rules/
│       ├── github-casing.js       # GitHub casing rule
│       ├── github-casing.test.js  # Tests for github-casing rule
│       ├── protocol-helpers.js    # Protocol helper rule
│       └── protocol-helpers.test.js # Tests for protocol-helpers rule
├── vitest.config.js               # Vitest configuration
├── package.json
└── CLAUDE.md                      # This file
```

### Adding New Rules

1. Create a new file in `src/rules/` following the pattern:
   ```javascript
   const meta = { /* rule metadata */ };
   function create(context) { /* rule implementation */ }
   export const rule = { meta, create };
   export default rule;
   ```

2. Add the rule to `src/index.js`:
   ```javascript
   import newRule from './rules/new-rule.js';

   const plugin = {
       rules: {
           // ...existing rules
           'new-rule': newRule,
       },
   };
   ```

3. Document the rule in this file.

### Testing

Rules are tested using Vitest with ESLint's `RuleTester`:

```bash
# Run tests
yarn workspace @happy/lint-rules test

# Run tests in watch mode
yarn workspace @happy/lint-rules test:watch
```

Each rule has a corresponding `.test.js` file that tests:
- Valid code patterns (should not trigger warnings)
- Invalid code patterns (should trigger warnings with correct message IDs)
- Auto-fix behavior (for fixable rules like `github-casing`)
- Edge cases (test file exclusions, various access patterns)

**Test counts:**
- `github-casing`: 21 tests (14 valid + 7 invalid patterns)
- `protocol-helpers`: 27 tests (14 valid + 13 invalid patterns)

**See:** HAP-763 for test implementation

## Related Issues

- HAP-758: Adopt oxlint type-aware linting and JS plugins
- HAP-763: Add unit tests for @happy/lint-rules oxlint plugin
- HAP-502: ESLint naming convention rule for GitHub casing
- HAP-658: ESLint rule to enforce @magic-agent/protocol ID accessor helper usage
- HAP-653: Protocol ID accessor helper design

## Compatibility

- **oxlint:** 1.36.0+ (with JS plugins support)
- **ESLint:** 9.x (flat config)
- **Node.js:** 18+
````

## File: packages/@magic-agent/protocol/coverage/sorter.js
````javascript
function getTable()
function getTableHeader()
function getTableBody()
function getNthColumn(n)
function onFilterInput()
function addSearchBox()
function loadColumns()
function loadRowData(tableRow)
// loads all row data
function loadData()
function sortByIndex(index, desc)
function removeSortIndicators()
// adds sort indicators for current column being sorted
function addSortIndicators()
function enableUI()
````

## File: packages/@magic-agent/protocol/scripts/extract-schemas.ts
````typescript
import { z } from 'zod';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GitHubProfileSchema,
    ImageRefSchema,
    RelationshipStatusSchema,
    UserProfileSchema,
    FeedBodySchema,
    EncryptedContentSchema,
    VersionedValueSchema,
    NullableVersionedValueSchema,
    ApiUpdateSchema,
    ApiMessageSchema,
    ApiUpdateNewMessageSchema,
    ApiDeleteSessionSchema,
    ApiUpdateNewSessionSchema,
    ApiUpdateSessionStateSchema,
    ApiNewMachineSchema,
    ApiUpdateMachineStateSchema,
    ApiNewArtifactSchema,
    ApiUpdateArtifactSchema,
    ApiDeleteArtifactSchema,
    ApiUpdateAccountSchema,
    ApiRelationshipUpdatedSchema,
    ApiNewFeedPostSchema,
    ApiKvBatchUpdateSchema,
    ApiEphemeralUpdateSchema,
    ApiEphemeralActivityUpdateSchema,
    ApiEphemeralUsageUpdateSchema,
    ApiEphemeralMachineActivityUpdateSchema,
    ApiEphemeralMachineStatusUpdateSchema,
    ApiUpdateContainerSchema,
    UpdatePayloadSchema,
    EphemeralPayloadSchema,
} from '../src/index';
⋮----
function zodToJson(schema: unknown): Record<string, unknown>
function extractSchemas(): Record<string, unknown>
function generateMetadata(): Record<string, unknown>
async function main(): Promise<void>
````

## File: packages/@magic-agent/protocol/scripts/generate-swift.ts
````typescript
import { z } from 'zod';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    quicktype,
    InputData,
    JSONSchemaInput,
    FetchingJSONSchemaStore,
} from 'quicktype-core';
import {
    GitHubProfileSchema,
    ImageRefSchema,
    RelationshipStatusSchema,
    UserProfileSchema,
    FeedBodySchema,
    EncryptedContentSchema,
    VersionedValueSchema,
    NullableVersionedValueSchema,
    ApiUpdateSchema,
    ApiMessageSchema,
    ApiUpdateNewMessageSchema,
    ApiDeleteSessionSchema,
    ApiUpdateNewSessionSchema,
    ApiUpdateSessionStateSchema,
    ApiNewMachineSchema,
    ApiUpdateMachineStateSchema,
    ApiNewArtifactSchema,
    ApiUpdateArtifactSchema,
    ApiDeleteArtifactSchema,
    ApiUpdateAccountSchema,
    ApiRelationshipUpdatedSchema,
    ApiNewFeedPostSchema,
    ApiKvBatchUpdateSchema,
    ApiEphemeralUpdateSchema,
    ApiEphemeralActivityUpdateSchema,
    ApiEphemeralUsageUpdateSchema,
    ApiEphemeralMachineActivityUpdateSchema,
    ApiEphemeralMachineStatusUpdateSchema,
    ApiUpdateContainerSchema,
    UpdatePayloadSchema,
    EphemeralPayloadSchema,
    SessionSharePermissionSchema,
    SessionShareEntrySchema,
    SessionShareUrlConfigSchema,
    InvitationStatusSchema,
    SessionShareInvitationSchema,
    SessionShareSettingsSchema,
    AddSessionShareRequestSchema,
    UpdateSessionShareRequestSchema,
    RemoveSessionShareRequestSchema,
    UpdateUrlSharingRequestSchema,
    RevokeInvitationRequestSchema,
    ResendInvitationRequestSchema,
} from '../src/index';
⋮----
function zodToJson(schema: unknown): Record<string, unknown>
async function generateSwift(
    jsonSchemas: Record<string, Record<string, unknown>>
): Promise<string>
function generateHeader(): string
async function main(): Promise<void>
````

## File: packages/@magic-agent/protocol/src/helpers.test.ts
````typescript
import { describe, it, expect } from 'vitest';
import {
    hasSessionId,
    hasSessionIdEphemeral,
    getSessionId,
    getSessionIdFromEphemeral,
    tryGetSessionId,
    tryGetSessionIdFromEphemeral,
    hasMachineId,
    hasMachineIdEphemeral,
    getMachineId,
    getMachineIdFromEphemeral,
    tryGetMachineId,
    tryGetMachineIdFromEphemeral,
    type SessionIdUpdate,
    type SessionIdEphemeral,
    type MachineIdUpdate,
    type MachineIdEphemeral,
    type ApiUpdate,
    type ApiEphemeralUpdate,
} from './index';
````

## File: packages/@magic-agent/protocol/src/helpers.ts
````typescript
import type {
    ApiUpdate,
    ApiEphemeralUpdate,
    ApiUpdateNewSession,
    ApiUpdateSessionState,
    ApiUpdateNewMessage,
    ApiDeleteSession,
    ApiEphemeralActivityUpdate,
    ApiEphemeralUsageUpdate,
    ApiNewMachine,
    ApiUpdateMachineState,
    ApiEphemeralMachineActivityUpdate,
    ApiEphemeralMachineStatusUpdate,
    ApiEphemeralMachineDisconnectedUpdate,
} from './index';
export type SessionIdUpdate =
    | ApiUpdateNewSession
    | ApiUpdateSessionState
    | ApiUpdateNewMessage
    | ApiDeleteSession;
export type SessionIdEphemeral =
    | ApiEphemeralActivityUpdate
    | ApiEphemeralUsageUpdate;
export function hasSessionId(update: ApiUpdate): update is SessionIdUpdate
export function hasSessionIdEphemeral(update: ApiEphemeralUpdate): update is SessionIdEphemeral
export function getSessionId(update: SessionIdUpdate): string
export function getSessionIdFromEphemeral(update: SessionIdEphemeral): string
export function tryGetSessionId(update: ApiUpdate): string | undefined
export function tryGetSessionIdFromEphemeral(update: ApiEphemeralUpdate): string | undefined
export type MachineIdUpdate = ApiNewMachine | ApiUpdateMachineState;
export type MachineIdEphemeral =
    | ApiEphemeralMachineActivityUpdate
    | ApiEphemeralMachineStatusUpdate
    | ApiEphemeralMachineDisconnectedUpdate;
export function hasMachineId(update: ApiUpdate): update is MachineIdUpdate
export function hasMachineIdEphemeral(update: ApiEphemeralUpdate): update is MachineIdEphemeral
export function getMachineId(update: MachineIdUpdate): string
export function getMachineIdFromEphemeral(update: MachineIdEphemeral): string
export function tryGetMachineId(update: ApiUpdate): string | undefined
export function tryGetMachineIdFromEphemeral(update: ApiEphemeralUpdate): string | undefined
````

## File: packages/@magic-agent/protocol/src/mcp.ts
````typescript
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
⋮----
export type McpServerState = z.infer<typeof McpServerStateSchema>;
⋮----
export type McpToolInfo = z.infer<typeof McpToolInfoSchema>;
⋮----
export type McpSyncState = z.infer<typeof McpSyncStateSchema>;
````

## File: packages/@magic-agent/protocol/CLAUDE.md
````markdown
# @magic-agent/protocol - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

## Package Overview

**@magic-agent/protocol** provides shared Zod schemas and TypeScript types for the Happy sync protocol. This is the **single source of truth** for all API types used across the four consumer projects.

## Why This Package Exists

The Happy monorepo had ~95 duplicated types across four projects, causing schema drift bugs (notably HAP-383: `sessionId` vs `sid` inconsistency). This package:

1. **Single source of truth** - All protocol types defined once
2. **Zod validation** - Runtime validation matches TypeScript types
3. **Dual format** - Works with both ESM and CommonJS projects

## Commands

```bash
# Build ESM + CJS output
yarn build

# Type check without emitting
yarn typecheck

# Run tests
yarn test
yarn test:watch

# Remove dist folder
yarn clean

# Generate Swift types for happy-macos
yarn generate:swift
yarn generate:swift:dry-run  # Preview without writing
```

## Swift Type Generation

The package includes a script to generate Swift `Codable` types from Zod schemas for the `happy-macos` native app.

### How It Works

1. **Zod → JSON Schema**: Uses Zod 4's native `z.toJSONSchema()` function
2. **JSON Schema → Swift**: Uses [quicktype](https://quicktype.io/) to generate Swift structs

### Generated Output

```
happy-macos/Happy/Generated/
└── HappyProtocol.swift    # All API types as Swift Codable structs
```

### When to Regenerate

Run `yarn generate:swift` after:
- Adding new Zod schemas to @magic-agent/protocol
- Modifying existing schema field types
- Changing schema property names

### Limitations

- Schemas with `.transform()` cannot be converted to JSON Schema (e.g., `UpdatePayload`)
- These are skipped with a warning during generation

### Adding New Schemas for Swift

When adding a new schema that needs Swift support:

1. Add the Zod schema to the appropriate module
2. Add it to `scripts/generate-swift.ts` in the `schemasToGenerate` object
3. Run `yarn generate:swift` to regenerate
4. Commit the updated `HappyProtocol.swift` to happy-macos

See HAP-687 for implementation details.

## Structure

```
src/
├── index.ts          # Re-exports all modules
├── common.ts         # Shared types (GitHubProfile, ImageRef, VersionedValue)
├── common.test.ts    # Tests for common types
├── payloads.ts       # Payload wrapper schemas (UpdatePayload, EphemeralPayload)
├── updates/          # Persistent event schemas
│   └── index.ts      # Session, Machine, Artifact, Account updates
└── ephemeral/        # Transient event schemas
    └── index.ts      # Activity, Usage, Machine status events
```

## Development Guidelines

### Adding New Schemas

1. **Determine category**: Is it persistent (updates/) or transient (ephemeral/)?
2. **Add Zod schema with JSDoc**: Include `@description` and `@example` tags
3. **Export from index.ts**: Add both schema and inferred type
4. **Add tests**: Test parsing and type inference
5. **Update README.md**: Document in the appropriate table

### Schema Naming Convention

- Schemas: `Api[Entity][Action]Schema` (e.g., `ApiUpdateNewMessageSchema`)
- Types: `Api[Entity][Action]` (e.g., `ApiUpdateNewMessage`)
- Union schemas: `ApiUpdateSchema`, `ApiEphemeralUpdateSchema`

### Type Exports

Always export both the Zod schema and the inferred TypeScript type:

```typescript
export const ApiNewSessionSchema = z.object({
    t: z.literal('new-session'),
    sid: z.string(),
    // ...
});

export type ApiNewSession = z.infer<typeof ApiNewSessionSchema>;
```

### Versioned Values Pattern

For optimistic concurrency, use the versioned value helpers:

```typescript
import { VersionedValueSchema, NullableVersionedValueSchema } from '@magic-agent/protocol';

// Non-nullable versioned field
metadata: VersionedValueSchema,

// Nullable versioned field
agentState: NullableVersionedValueSchema,
```

## Consumer Projects

| Project | Module Format | Import Path |
|---------|---------------|-------------|
| happy-cli | ESM | `@magic-agent/protocol` |
| happy-app | ESM (Expo) | `@magic-agent/protocol` |
| happy-server | CommonJS | `@magic-agent/protocol` |
| happy-server-workers | ESM | `@magic-agent/protocol` |

## Testing

Tests use Vitest and are colocated with source files:

```bash
yarn test              # Run once
yarn test:watch        # Watch mode
```

## Output Files

After building, `dist/` contains:

| File | Format | Purpose |
|------|--------|---------|
| `index.js` | ESM | Modern ES modules |
| `index.cjs` | CommonJS | Legacy require() support |
| `index.d.ts` | TypeScript | ESM type declarations |
| `index.d.cts` | TypeScript | CJS type declarations |

## ID Field Naming Conventions

### ⚠️ Important: Inconsistent Field Names

The protocol schemas use **different field names** for the same semantic concept (session ID / machine ID). This is documented in [README.md](./README.md#field-name-reference) and must be considered when:

1. Adding new schemas (follow existing pattern for the update category)
2. Reviewing consumer code (verify correct field accessor)
3. Writing tests (use correct field name per update type)

**Quick Reference:**

| Semantic Meaning | Persistent Updates | Ephemeral Events |
|------------------|-------------------|------------------|
| Session ID | `id` (new/update-session) or `sid` (message/delete) | `id` |
| Machine ID | `machineId` | `machineId` or `id` (activity) |
| Discriminator | `t` | `type` |

**Root Cause**: Historical schema drift (HAP-383). Preserved for backward compatibility.

### Discriminator Field Difference

- **Persistent updates** use `t` field (e.g., `update.t === 'new-session'`)
- **Ephemeral events** use `type` field (e.g., `event.type === 'activity'`)

This is intentional and must be preserved. See [README.md](./README.md#discriminator-fields) for details.

## Important Rules

1. **Never break existing schemas** - Add new fields as optional
2. **Test both formats** - ESM and CJS consumers must work
3. **JSDoc all exports** - Document with `@description` and `@example`
4. **Keep discriminator patterns** - Persistent updates use `t`, ephemeral events use `type`
5. **Preserve field name conventions** - Follow the ID field naming documented above
````

## File: .yarnrc.yml
````yaml
nodeLinker: node-modules
enableImmutableInstalls: false
logFilters:
  - code: YN0060
    pattern: "@lottiefiles/dotlottie-react*"
    level: discard
  - code: YN0086
    level: discard
````

## File: README.md
````markdown
# happy-shared

[![CI](https://github.com/Enflame-Media/happy-shared/actions/workflows/ci.yml/badge.svg)](https://github.com/Enflame-Media/happy-shared/actions/workflows/ci.yml)
[![Shared Types Validation](https://github.com/Enflame-Media/happy-shared/actions/workflows/shared-types-validation.yml/badge.svg)](https://github.com/Enflame-Media/happy-shared/actions/workflows/shared-types-validation.yml)

Shared packages and root configurations for the Happy monorepo.

## Overview

This repository contains shared code used across the Happy ecosystem - a mobile and web client for Claude Code and Codex enabling remote control and session sharing with end-to-end encryption.

## Packages

### @magic-agent/protocol

Shared Zod schemas and TypeScript types for the Happy sync protocol.

```typescript
import { ApiUpdateSchema, ApiEphemeralUpdateSchema } from '@magic-agent/protocol';
```

See [packages/@magic-agent/protocol/README.md](packages/@magic-agent/protocol/README.md) for detailed documentation.

## Repository Structure

```
happy-shared/
├── packages/
│   └── @happy/
│       └── protocol/    # Shared Zod schemas for API updates/events
├── .github/
│   └── workflows/       # CI/CD workflows
├── docs/                # Shared documentation
├── package.json         # Root workspace configuration
└── yarn.lock            # Shared lockfile
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- Yarn 4 (enabled via Corepack)

### Setup

```bash
# Enable Corepack for Yarn 4
corepack enable

# Install dependencies
yarn install

# Build the protocol package
yarn workspace @magic-agent/protocol build

# Type check
yarn workspace @magic-agent/protocol typecheck
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `yarn build:protocol` | Build @magic-agent/protocol |
| `yarn typecheck:protocol` | Type check @magic-agent/protocol |

## CI/CD Pipeline

The repository uses GitHub Actions for continuous integration. Every PR triggers:

| Check | Projects | Description |
|-------|----------|-------------|
| **Type Check** | happy-cli, happy-app, happy-server-workers | TypeScript compilation |
| **Lint** | happy-cli, happy-app, happy-server-workers | ESLint/OxLint validation |
| **Tests** | happy-server-workers | Vitest test suite |
| **Build** | happy-cli, happy-server-workers | Production build verification |

### Branch Protection

PRs require all CI checks to pass before merge. The `ci-summary` job acts as a single status check that blocks merge if any quality gate fails.

### Dependabot

Security updates are automated via Dependabot:
- Weekly scans for npm vulnerabilities
- GitHub Actions dependency updates
- Grouped minor/patch updates to reduce PR noise

## Related Repositories

| Repository | Description |
|------------|-------------|
| [happy](https://github.com/Enflame-Media/happy) | React Native mobile/web app |
| happy-cli | Node.js CLI wrapper |
| happy-server | Fastify backend server |
| happy-server-workers | Cloudflare Workers edge functions |

## License

MIT
````

## File: packages/@magic-agent/protocol/src/updates/account.ts
````typescript
import { z } from 'zod';
import { GitHubProfileSchema, ImageRefSchema, NullableVersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
⋮----
export type ApiUpdateAccount = z.infer<typeof ApiUpdateAccountSchema>;
````

## File: packages/@magic-agent/protocol/src/updates/artifact.ts
````typescript
import { z } from 'zod';
import { VersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
⋮----
export type ApiNewArtifact = z.infer<typeof ApiNewArtifactSchema>;
⋮----
export type ApiUpdateArtifact = z.infer<typeof ApiUpdateArtifactSchema>;
⋮----
export type ApiDeleteArtifact = z.infer<typeof ApiDeleteArtifactSchema>;
````

## File: packages/@magic-agent/protocol/src/payloads.ts
````typescript
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
import { ApiUpdateSchema, type ApiUpdateType } from './updates';
import { ApiEphemeralUpdateSchema } from './ephemeral';
⋮----
export type ApiUpdateContainer = z.infer<typeof ApiUpdateContainerSchema>;
⋮----
export type UpdatePayload = z.infer<typeof UpdatePayloadSchema>;
⋮----
export type EphemeralPayload = z.infer<typeof EphemeralPayloadSchema>;
````

## File: .gitignore
````
# Root monorepo gitignore
# This repo tracks shared packages and root config only.
# Each project (happy-app, happy-cli, etc.) has its own git repo.

# Project directories (have their own git repos)
/happy-admin/
/happy-admin-api/
/happy-app/
/happy-cli/
/happy-macos/
/happy-server/
/happy-server-workers/
/happy-vue/

# Dependencies (yarn workspaces hoisted dependencies)
node_modules/

# Yarn
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

# OS files
.DS_Store
Thumbs.db

# IDE/Editor files
.idea/
.vscode/
*.swp
*.swo
*~

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files (each project has its own)
.env
.env.local
.env.*.local
.env.production

# Temp directories (used for Prisma on NAS with noexec /tmp)
.tmp/

# AI/Tool config directories (local to developer machine)
.serena/
.zencoder/
.zenflow/
.mcp.json

# Claude Code config (local overrides)
.claude/

# Build artifacts for shared packages
packages/**/dist/

# Generated schema files (CI artifacts)
packages/@magic-agent/protocol/protocol-schemas.json
schema-diff.md
````

## File: packages/@happy/lint-rules/package.json
````json
{
    "name": "@happy/lint-rules",
    "version": "0.0.1",
    "description": "Custom oxlint/ESLint rules for the Happy monorepo",
    "type": "module",
    "main": "./src/index.js",
    "exports": {
        ".": "./src/index.js",
        "./github-casing": "./src/rules/github-casing.js",
        "./protocol-helpers": "./src/rules/protocol-helpers.js"
    },
    "files": [
        "src"
    ],
    "scripts": {
        "test": "vitest run",
        "test:watch": "vitest"
    },
    "keywords": [
        "eslint",
        "oxlint",
        "linting",
        "happy"
    ],
    "author": "Enflame Media",
    "license": "UNLICENSED",
    "private": true,
    "devDependencies": {
        "@typescript-eslint/parser": "^8.52.0",
        "eslint": "^9.39.2",
        "oxlint": "^1.37.0",
        "vitest": "^4.0.16"
    },
    "peerDependencies": {
        "oxlint": ">=1.36.0"
    }
}
````

## File: packages/@magic-agent/protocol/src/updates/misc.ts
````typescript
import { z } from 'zod';
import { RelationshipStatusSchema, UserProfileSchema, FeedBodySchema } from '../common';
import { STRING_LIMITS } from '../constraints';
⋮----
export type ApiRelationshipUpdated = z.infer<typeof ApiRelationshipUpdatedSchema>;
⋮----
export type ApiNewFeedPost = z.infer<typeof ApiNewFeedPostSchema>;
⋮----
export type ApiKvBatchUpdate = z.infer<typeof ApiKvBatchUpdateSchema>;
````

## File: packages/@magic-agent/protocol/src/common.test.ts
````typescript
import { describe, it, expect } from 'vitest';
import {
    GitHubProfileSchema,
    UserProfileSchema,
    ImageRefSchema,
    EncryptedContentSchema,
    VersionedValueSchema,
} from './common';
import { STRING_LIMITS } from './constraints';
import { ApiUpdateNewSessionSchema } from './updates/session';
import { ApiMessageSchema } from './updates/message';
⋮----
sid: '', // HAP-654: standardized to `sid`
````

## File: .github/workflows/shared-types-validation.yml
````yaml
name: Shared Types Validation
permissions:
  contents: read
  actions: write
on:
  push:
    branches:
      - main
    paths:
      - 'packages/@magic-agent/protocol/**'
  pull_request:
    paths:
      - 'packages/@magic-agent/protocol/**'
jobs:
  validate-shared-types:
    name: Validate Cross-Project Types
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '24'
      - name: Enable Corepack (for Yarn 4)
        run: corepack enable
      - name: Get yarn cache directory
        id: yarn-cache-dir
        run: echo "dir=$(yarn config get cacheFolder)" >> $GITHUB_OUTPUT
      - name: Cache yarn dependencies
        uses: actions/cache@v5
        with:
          path: |
            ${{ steps.yarn-cache-dir.outputs.dir }}
            **/node_modules
            .yarn/install-state.gz
          key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-yarn-
      - name: Install dependencies
        run: yarn install --immutable
      - name: Build @magic-agent/protocol
        run: yarn build:protocol
      - name: Type check @magic-agent/protocol
        run: yarn typecheck:protocol
      - name: Type check happy-cli
        working-directory: happy-cli
        run: yarn typecheck
      - name: Type check happy-app
        working-directory: happy-app
        run: yarn typecheck
      - name: Type check happy-server-workers
        working-directory: happy-server-workers
        run: yarn typecheck
      - name: Summary
        run: |
          echo "## Shared Types Validation Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "All 4 consumer projects type-check successfully against @magic-agent/protocol." >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "
          echo "- happy-cli" >> $GITHUB_STEP_SUMMARY
          echo "- happy-app" >> $GITHUB_STEP_SUMMARY
          echo "- happy-server" >> $GITHUB_STEP_SUMMARY
          echo "- happy-server-workers" >> $GITHUB_STEP_SUMMARY
````

## File: packages/@magic-agent/errors/src/index.ts
````typescript
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
export interface AppErrorOptions {
    canTryAgain?: boolean;
    cause?: Error;
    context?: Record<string, unknown>;
}
export interface AppErrorJSON {
    code: ErrorCode;
    message: string;
    name: string;
    canTryAgain: boolean;
    cause?: string;
    context?: Record<string, unknown>;
    stack?: string;
}
export interface SafeAppErrorJSON {
    code: ErrorCode;
    message: string;
    canTryAgain: boolean;
}
export class AppError extends Error
⋮----
constructor(
        code: ErrorCode,
        message: string,
        options?: AppErrorOptions
)
toJSON(): AppErrorJSON
toSafeJSON(): SafeAppErrorJSON
static fromUnknown(
        code: ErrorCode,
        message: string,
        error: unknown,
        canTryAgain: boolean = false
): AppError
static withCause(code: ErrorCode, message: string, cause?: Error): AppError
static isAppError(error: unknown): error is AppError
````

## File: packages/@magic-agent/protocol/src/updates/index.ts
````typescript
import { z } from 'zod';
⋮----
import { ApiUpdateNewMessageSchema, ApiDeleteSessionSchema } from './message';
import { ApiUpdateNewSessionSchema, ApiUpdateSessionStateSchema, ApiArchiveSessionSchema } from './session';
import { ApiNewMachineSchema, ApiUpdateMachineStateSchema, ApiDeleteMachineSchema } from './machine';
import { ApiNewArtifactSchema, ApiUpdateArtifactSchema, ApiDeleteArtifactSchema } from './artifact';
import { ApiUpdateAccountSchema } from './account';
import { ApiRelationshipUpdatedSchema, ApiNewFeedPostSchema, ApiKvBatchUpdateSchema } from './misc';
⋮----
export type ApiUpdate = z.infer<typeof ApiUpdateSchema>;
export type ApiUpdateType = ApiUpdate['t'];
````

## File: packages/@magic-agent/protocol/src/updates/message.ts
````typescript
import { z } from 'zod';
import { EncryptedContentSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
⋮----
export type ApiMessage = z.infer<typeof ApiMessageSchema>;
⋮----
export type ApiUpdateNewMessage = z.infer<typeof ApiUpdateNewMessageSchema>;
⋮----
export type ApiDeleteSession = z.infer<typeof ApiDeleteSessionSchema>;
````

## File: packages/@magic-agent/protocol/README.md
````markdown
# @magic-agent/protocol

Shared protocol types for the Happy monorepo. This package provides **Zod schemas** and **TypeScript types** for the Happy sync protocol, serving as the single source of truth across all four consumer projects.

## Installation

This package is automatically available within the Happy monorepo via **yarn workspaces**. No additional installation is required.

```bash
# From monorepo root - already included in workspace
yarn install
```

## Usage

### ESM (happy-cli, happy-app, happy-server-workers)

```typescript
import {
  ApiUpdateSchema,
  ApiEphemeralUpdateSchema,
  type ApiUpdate,
  type ApiEphemeralUpdate
} from '@magic-agent/protocol';

// Validate incoming update
const result = ApiUpdateSchema.safeParse(data);
if (result.success) {
  const update: ApiUpdate = result.data;
  switch (update.t) {
    case 'new-message':
    case 'new-session':
    case 'update-session':
    case 'delete-session':
      // All session updates use 'sid' (standardized in HAP-654)
      console.log('Session:', update.sid);
      break;
    // ... handle other types (see Field Name Reference below)
  }
}
```

### CommonJS (happy-server)

```javascript
const { ApiUpdateSchema, ApiEphemeralUpdateSchema } = require('@magic-agent/protocol');

// Same usage as ESM
const result = ApiUpdateSchema.safeParse(data);
```

## Available Exports

### Update Schemas (Persistent Events)

These are state changes that are stored and synced across devices.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiUpdateSchema` | `ApiUpdate` | Discriminated union of all update types |
| `ApiUpdateNewMessageSchema` | `ApiUpdateNewMessage` | New encrypted message in session |
| `ApiUpdateNewSessionSchema` | `ApiUpdateNewSession` | New session created |
| `ApiDeleteSessionSchema` | `ApiDeleteSession` | Session archived/deleted |
| `ApiUpdateSessionStateSchema` | `ApiUpdateSessionState` | Session state change |
| `ApiUpdateAccountSchema` | `ApiUpdateAccount` | Account metadata update |
| `ApiNewMachineSchema` | `ApiNewMachine` | New machine registered |
| `ApiUpdateMachineStateSchema` | `ApiUpdateMachineState` | Machine state change |
| `ApiNewArtifactSchema` | `ApiNewArtifact` | New artifact created |
| `ApiUpdateArtifactSchema` | `ApiUpdateArtifact` | Artifact updated |
| `ApiDeleteArtifactSchema` | `ApiDeleteArtifact` | Artifact deleted |
| `ApiRelationshipUpdatedSchema` | `ApiRelationshipUpdated` | Friend relationship change |
| `ApiNewFeedPostSchema` | `ApiNewFeedPost` | Activity feed post |
| `ApiKvBatchUpdateSchema` | `ApiKvBatchUpdate` | KV store batch update |

### Ephemeral Schemas (Transient Events)

Real-time status updates that don't require persistence.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiEphemeralUpdateSchema` | `ApiEphemeralUpdate` | Union of all ephemeral types |
| `ApiEphemeralActivityUpdateSchema` | `ApiEphemeralActivityUpdate` | Session activity status |
| `ApiEphemeralUsageUpdateSchema` | `ApiEphemeralUsageUpdate` | Token/cost usage |
| `ApiEphemeralMachineActivityUpdateSchema` | `ApiEphemeralMachineActivityUpdate` | Machine activity |
| `ApiEphemeralMachineStatusUpdateSchema` | `ApiEphemeralMachineStatusUpdate` | Machine online/offline |

### Payload Wrappers

Container schemas for WebSocket message sequencing.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiUpdateContainerSchema` | `ApiUpdateContainer` | Sequenced update wrapper |
| `UpdatePayloadSchema` | `UpdatePayload` | Server-side wire format |
| `EphemeralPayloadSchema` | `EphemeralPayload` | Ephemeral wrapper |

### Common Types

Shared types used across the protocol.

| Schema | Type | Description |
|--------|------|-------------|
| `GitHubProfileSchema` | `GitHubProfile` | GitHub OAuth profile data |
| `ImageRefSchema` | `ImageRef` | Image/avatar reference |
| `RelationshipStatusSchema` | `RelationshipStatus` | User relationship enum |
| `UserProfileSchema` | `UserProfile` | Social user profile |
| `FeedBodySchema` | `FeedBody` | Activity feed content |
| `EncryptedContentSchema` | `EncryptedContent` | Encrypted payload wrapper |
| `VersionedValueSchema` | `VersionedValue` | Optimistic concurrency value |
| `NullableVersionedValueSchema` | `NullableVersionedValue` | Nullable versioned value |

### Session Sharing Schemas

Types for sharing sessions with other users (HAP-766).

| Schema | Type | Description |
|--------|------|-------------|
| `SessionSharePermissionSchema` | `SessionSharePermission` | Permission enum (view_only, view_and_chat) |
| `SessionShareEntrySchema` | `SessionShareEntry` | Individual user share with profile |
| `SessionShareUrlConfigSchema` | `SessionShareUrlConfig` | Public URL sharing configuration |
| `InvitationStatusSchema` | `InvitationStatus` | Invitation status enum |
| `SessionShareInvitationSchema` | `SessionShareInvitation` | Email invitation with status |
| `SessionShareSettingsSchema` | `SessionShareSettings` | Combined sharing state container |
| `AddSessionShareRequestSchema` | `AddSessionShareRequest` | Add share by userId or email |
| `UpdateSessionShareRequestSchema` | `UpdateSessionShareRequest` | Update permission level |
| `RemoveSessionShareRequestSchema` | `RemoveSessionShareRequest` | Remove share access |
| `UpdateUrlSharingRequestSchema` | `UpdateUrlSharingRequest` | Configure URL sharing |
| `RevokeInvitationRequestSchema` | `RevokeInvitationRequest` | Revoke pending invitation |
| `ResendInvitationRequestSchema` | `ResendInvitationRequest` | Resend invitation email |

### Usage Limits Schemas

Types for plan and rate limiting data.

| Schema | Type | Description |
|--------|------|-------------|
| `UsageLimitSchema` | `UsageLimit` | Single usage limit entry |
| `PlanLimitsResponseSchema` | `PlanLimitsResponse` | Complete plan limits response |

## Field Name Reference

### Session ID Field Names

All session-related schemas now consistently use `sid` (standardized in HAP-654):

| Schema | Update Type | Field Name | Discriminator | Notes |
|--------|-------------|------------|---------------|-------|
| `ApiUpdateNewSessionSchema` | `new-session` | `sid` | `t` | Persistent update |
| `ApiUpdateSessionStateSchema` | `update-session` | `sid` | `t` | Persistent update |
| `ApiUpdateNewMessageSchema` | `new-message` | `sid` | `t` | Persistent update |
| `ApiDeleteSessionSchema` | `delete-session` | `sid` | `t` | Persistent update |
| `ApiEphemeralActivityUpdateSchema` | `activity` | `sid` | `type` | Ephemeral event |
| `ApiEphemeralUsageUpdateSchema` | `usage` | `sid` | `type` | Ephemeral event |

**Pattern Summary:**
- **`sid`**: All session schemas now consistently use `sid` (standardized in HAP-654)

### Machine ID Field Names

The machine ID is represented with different field names:

| Schema | Update Type | Field Name | Discriminator | Notes |
|--------|-------------|------------|---------------|-------|
| `ApiNewMachineSchema` | `new-machine` | `machineId` | `t` | Persistent update |
| `ApiUpdateMachineStateSchema` | `update-machine` | `machineId` | `t` | Persistent update |
| `ApiEphemeralMachineStatusUpdateSchema` | `machine-status` | `machineId` | `type` | Ephemeral event |
| `ApiEphemeralMachineActivityUpdateSchema` | `machine-activity` | `machineId` | `type` | Ephemeral event |

**Pattern Summary:**
- **`machineId`**: All machine schemas now consistently use `machineId` (standardized in HAP-655)

### Discriminator Fields

**Important:** Persistent updates and ephemeral events use different discriminator field names:

| Category | Discriminator Field | Example |
|----------|---------------------|---------|
| Persistent Updates | `t` | `update.t === 'new-session'` |
| Ephemeral Events | `type` | `event.type === 'activity'` |

### Historical Context

The original naming inconsistencies (HAP-383) have been fully resolved:
- **Session ID**: All session schemas now use `sid` (HAP-654) - previously some used `id`
- **Machine ID**: All machine schemas now use `machineId` (HAP-655) - previously `machine-activity` used `id`

### Consumer Code Example

When handling updates, always check the discriminator (`t` or `type`) first:

```typescript
import type { ApiUpdate, ApiEphemeralUpdate } from '@magic-agent/protocol';

// Persistent updates use 't' discriminator
function handleUpdate(update: ApiUpdate) {
  switch (update.t) {
    case 'new-message':
    case 'delete-session':
    case 'new-session':
    case 'update-session':
      // All session updates now use 'sid' (HAP-654)
      const sessionId = update.sid;
      break;
    case 'new-machine':
    case 'update-machine':
      // All machine updates use 'machineId'
      const machineId = update.machineId;
      break;
  }
}

// Ephemeral events use 'type' discriminator
function handleEphemeral(event: ApiEphemeralUpdate) {
  switch (event.type) {
    case 'activity':
    case 'usage':
      // All session ephemerals now use 'sid' (HAP-654)
      const sessionId = event.sid;
      break;
    case 'machine-activity':
    case 'machine-status':
      // All machine ephemerals now use 'machineId' (HAP-655)
      const machineId = event.machineId;
      break;
  }
}
```

## Type Guard Patterns

```typescript
import { ApiUpdateSchema, type ApiUpdate, type ApiUpdateType } from '@magic-agent/protocol';

// Type narrowing with switch
function handleUpdate(update: ApiUpdate) {
  switch (update.t) {
    case 'new-message':
      // TypeScript knows: update is ApiUpdateNewMessage
      console.log(update.sid, update.message);
      break;
    case 'new-session':
      // TypeScript knows: update is ApiUpdateNewSession
      console.log(update.sid, update.metadata);
      break;
  }
}

// Available type discriminators
const updateTypes: ApiUpdateType[] = [
  'new-message', 'new-session', 'delete-session',
  'update-session', 'update-account', 'new-machine',
  // ... etc
];
```

## Building

```bash
# From packages/@magic-agent/protocol
yarn build        # Build ESM + CJS output
yarn typecheck    # Type check without emitting
yarn clean        # Remove dist folder

# From monorepo root
yarn build:protocol
yarn typecheck:protocol
```

## Output Files

After building, the `dist/` folder contains:

| File | Format | Purpose |
|------|--------|---------|
| `index.js` | ESM | Modern ES modules |
| `index.cjs` | CommonJS | Legacy require() support |
| `index.d.ts` | TypeScript | ESM type declarations |
| `index.d.cts` | TypeScript | CJS type declarations |
| `index.js.map` | Sourcemap | ESM debugging |
| `index.cjs.map` | Sourcemap | CJS debugging |

## Peer Dependencies

This package requires `zod@^3.0.0` as a peer dependency. All consumer projects in the monorepo already have zod installed.

## Why This Package Exists

The Happy monorepo had ~95 duplicated types across four projects, causing schema drift bugs. The most notable was the `sessionId` vs `sid` field naming inconsistency (see HAP-383).

This package:
1. **Single source of truth** - All protocol types defined once
2. **Zod validation** - Runtime validation matches TypeScript types
3. **Dual format** - Works with both ESM and CommonJS projects
4. **Migration path** - Projects can adopt gradually

## Migration Guide

When migrating existing code to use `@magic-agent/protocol`:

1. **Import from package** instead of local types:
   ```typescript
   // Before
   import { ApiUpdate } from '../api/types';

   // After
   import { ApiUpdate } from '@magic-agent/protocol';
   ```

2. **Remove duplicate definitions** from local files

3. **Run typecheck** to catch any mismatches

See individual project integration issues (HAP-385 through HAP-388) for detailed migration steps.

## Related Issues

- **HAP-383**: RFC - Shared Types Package (complete)
- **HAP-384**: Set up yarn workspaces (this package)
- **HAP-385**: Integrate in happy-app
- **HAP-386**: Integrate in happy-cli
- **HAP-387**: Integrate in happy-server-workers
- **HAP-388**: Integrate in happy-server
- **HAP-389**: CI validation

## License

MIT
````

## File: packages/@magic-agent/protocol/src/updates/machine.ts
````typescript
import { z } from 'zod';
import { VersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
⋮----
export type ApiNewMachine = z.infer<typeof ApiNewMachineSchema>;
⋮----
export type ApiUpdateMachineState = z.infer<typeof ApiUpdateMachineStateSchema>;
⋮----
export type ApiDeleteMachine = z.infer<typeof ApiDeleteMachineSchema>;
````

## File: packages/@magic-agent/protocol/src/updates/session.ts
````typescript
import { z } from 'zod';
import { NullableVersionedValueSchema } from '../common';
import { STRING_LIMITS } from '../constraints';
⋮----
export type ApiUpdateNewSession = z.infer<typeof ApiUpdateNewSessionSchema>;
⋮----
export type ApiUpdateSessionState = z.infer<typeof ApiUpdateSessionStateSchema>;
⋮----
export type ArchiveReason = z.infer<typeof ArchiveReasonSchema>;
⋮----
export type ApiArchiveSession = z.infer<typeof ApiArchiveSessionSchema>;
````

## File: packages/@magic-agent/protocol/src/common.ts
````typescript
import { z } from 'zod';
import { STRING_LIMITS } from './constraints';
⋮----
export type GitHubProfile = z.infer<typeof GitHubProfileSchema>;
export function makeOpenApiGitHubProfileSchema(zOpenApi: any)
⋮----
export type ImageRef = z.infer<typeof ImageRefSchema>;
⋮----
export type RelationshipStatus = z.infer<typeof RelationshipStatusSchema>;
⋮----
export type UserProfile = z.infer<typeof UserProfileSchema>;
⋮----
export type FeedBody = z.infer<typeof FeedBodySchema>;
⋮----
export type EncryptedContent = z.infer<typeof EncryptedContentSchema>;
⋮----
export type VersionedValue = z.infer<typeof VersionedValueSchema>;
⋮----
export type NullableVersionedValue = z.infer<typeof NullableVersionedValueSchema>;
````

## File: packages/@magic-agent/protocol/src/index.ts
````typescript

````

## File: packages/@magic-agent/protocol/src/ephemeral/events.ts
````typescript
import { z } from 'zod';
import { STRING_LIMITS } from '../constraints';
⋮----
export type ApiEphemeralActivityUpdate = z.infer<typeof ApiEphemeralActivityUpdateSchema>;
⋮----
export type ApiEphemeralUsageUpdate = z.infer<typeof ApiEphemeralUsageUpdateSchema>;
⋮----
export type ApiEphemeralMachineActivityUpdate = z.infer<typeof ApiEphemeralMachineActivityUpdateSchema>;
⋮----
export type ApiEphemeralMachineStatusUpdate = z.infer<typeof ApiEphemeralMachineStatusUpdateSchema>;
⋮----
export type ApiEphemeralMachineDisconnectedUpdate = z.infer<typeof ApiEphemeralMachineDisconnectedUpdateSchema>;
⋮----
export type ApiEphemeralFriendStatusUpdate = z.infer<typeof ApiEphemeralFriendStatusUpdateSchema>;
⋮----
export type ApiEphemeralUpdate = z.infer<typeof ApiEphemeralUpdateSchema>;
export type ApiEphemeralUpdateType = ApiEphemeralUpdate['type'];
````

## File: packages/@magic-agent/protocol/package.json
````json
{
    "name": "@magic-agent/protocol",
    "version": "0.0.1",
    "description": "Shared protocol types for Happy monorepo (Zod schemas for API updates, ephemeral events)",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "import": {
                "types": "./dist/index.d.ts",
                "default": "./dist/index.js"
            },
            "require": {
                "types": "./dist/index.d.cts",
                "default": "./dist/index.cjs"
            }
        }
    },
    "files": [
        "dist",
        "src"
    ],
    "sideEffects": false,
    "peerDependencies": {
        "zod": "^3.0.0 || ^4.0.0"
    },
    "devDependencies": {
        "quicktype": "^23.2.6",
        "quicktype-core": "^23.2.6",
        "tsup": "^8.5.1",
        "tsx": "^4.21.0",
        "typescript": "^5.9.3",
        "vitest": "^4.0.16",
        "zod": "^4.3.5"
    },
    "scripts": {
        "build": "npx tsup",
        "typecheck": "npx tsc --noEmit",
        "test": "vitest run",
        "test:watch": "vitest",
        "clean": "rm -rf dist",
        "schema:extract": "tsx scripts/extract-schemas.ts",
        "generate:swift": "tsx scripts/generate-swift.ts",
        "generate:swift:dry-run": "tsx scripts/generate-swift.ts --dry-run --verbose"
    },
    "keywords": [
        "happy",
        "protocol",
        "zod",
        "typescript",
        "types"
    ],
    "license": "MIT"
}
````

## File: CLAUDE.md
````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Navigation**: This is the root documentation. Each project has its own detailed CLAUDE.md—see [Project Documentation](#project-documentation) below.

## Project Overview

**Happy** is a mobile and web client for Claude Code and Codex, enabling remote control and session sharing across devices with end-to-end encryption. This is a TypeScript monorepo containing six projects and shared packages.

## Project Documentation

**⚠️ Always consult the project-specific CLAUDE.md when working within that project's directory.**

### Applications

| Project | Directory | Description | Documentation |
|---------|-----------|-------------|---------------|
| **happy-cli** | [`/happy-cli/`](./happy-cli/) | Node.js CLI wrapper for Claude Code | [`happy-cli/CLAUDE.md`](./happy-cli/CLAUDE.md) |
| **happy-app** | [`/happy-app/`](./happy-app/) | React Native mobile/web client (Expo) | [`happy-app/CLAUDE.md`](./happy-app/CLAUDE.md) |
| **happy-server** | [`/happy-server/`](./happy-server/) | Fastify backend API server | [`happy-server/CLAUDE.md`](./happy-server/CLAUDE.md) |
| **happy-server-workers** | [`/happy-server-workers/`](./happy-server-workers/) | Cloudflare Workers edge functions | [`happy-server-workers/CLAUDE.md`](./happy-server-workers/CLAUDE.md) |
| **happy-admin** | [`/happy-admin/`](./happy-admin/) | Admin dashboard Vue.js SPA (frontend-only) | [`happy-admin/CLAUDE.md`](./happy-admin/CLAUDE.md) |
| **happy-admin-api** | [`/happy-admin-api/`](./happy-admin-api/) | Admin dashboard API (Hono + Cloudflare Workers) | [`happy-admin-api/CLAUDE.md`](./happy-admin-api/CLAUDE.md) |

### Shared Packages

| Package | Directory | Description | Documentation |
|---------|-----------|-------------|---------------|
| **@magic-agent/protocol** | [`packages/@magic-agent/protocol/`](./packages/@magic-agent/protocol/) | Shared Zod schemas for API types | [`packages/@magic-agent/protocol/CLAUDE.md`](./packages/@magic-agent/protocol/CLAUDE.md) |
| **@magic-agent/errors** | [`packages/@magic-agent/errors/`](./packages/@magic-agent/errors/) | Unified error handling (AppError) | [`packages/@magic-agent/errors/CLAUDE.md`](./packages/@magic-agent/errors/CLAUDE.md) |
| **@happy/lint-rules** | [`packages/@happy/lint-rules/`](./packages/@happy/lint-rules/) | Custom oxlint/ESLint rules | [`packages/@happy/lint-rules/CLAUDE.md`](./packages/@happy/lint-rules/CLAUDE.md) |

### Additional Documentation

| Document | Location | Description |
|----------|----------|-------------|
| Encryption Architecture | [`docs/ENCRYPTION-ARCHITECTURE.md`](./docs/ENCRYPTION-ARCHITECTURE.md) | E2E encryption design |
| Error Codes | [`docs/errors/`](./docs/errors/) | CLI error code documentation |
| Shared Types RFC | [`docs/RFC-SHARED-TYPES-PACKAGE.md`](./docs/RFC-SHARED-TYPES-PACKAGE.md) | Design decision for @magic-agent/protocol |

## Monorepo Structure

```
/happy/
├── CLAUDE.md               # ← You are here (root documentation)
├── packages/               # Shared packages (tracked in happy-shared repo)
│   └── @happy/
│       ├── protocol/       # Shared Zod schemas for API updates/events
│       │   └── CLAUDE.md   # Protocol package guidelines
│       └── errors/         # Unified error handling
│           └── CLAUDE.md   # Errors package guidelines
├── happy-cli/              # Node.js CLI (ESM)
│   ├── src/                # TypeScript sources
│   ├── bin/                # Executable scripts
│   ├── package.json
│   └── CLAUDE.md           # CLI-specific guidelines ★
├── happy-server/           # Fastify server (CommonJS)
│   ├── sources/            # TypeScript sources (note: not 'src')
│   ├── prisma/             # Database schema
│   ├── package.json
│   └── CLAUDE.md           # Server-specific guidelines ★
├── happy-server-workers/   # Cloudflare Workers (ESM)
│   ├── src/                # TypeScript sources
│   ├── wrangler.toml       # Cloudflare config
│   ├── package.json
│   └── CLAUDE.md           # Workers-specific guidelines ★
├── happy-app/              # Expo React Native (ESM)
│   ├── sources/            # TypeScript sources (note: not 'src')
│   ├── app/                # Expo Router screens
│   ├── package.json
│   └── CLAUDE.md           # App-specific guidelines ★
├── happy-admin/            # Admin Dashboard Frontend (Vue.js SPA)
│   ├── src/worker/         # Minimal worker (static serving)
│   ├── src/app/            # Vue.js SPA
│   ├── wrangler.toml       # Cloudflare config
│   ├── package.json
│   └── CLAUDE.md           # Frontend-specific guidelines ★
├── happy-admin-api/        # Admin Dashboard API (Hono + Cloudflare Workers)
│   ├── src/                # TypeScript sources
│   ├── migrations/         # D1 migrations
│   ├── wrangler.toml       # Cloudflare config
│   ├── package.json
│   └── CLAUDE.md           # API-specific guidelines ★
├── docs/                   # Cross-project documentation
│   └── ENCRYPTION-ARCHITECTURE.md
├── package.json            # Root workspaces config
└── yarn.lock               # Shared lockfile
```

> ★ = Primary development guidelines for each project

## Package Management

All projects use **yarn** (not npm). The monorepo uses **yarn workspaces** configured in the root `package.json` to:
- Share dependencies across projects (hoisted to root `node_modules/`)
- Link shared packages like `@magic-agent/protocol` via `workspace:*`
- Maintain a single `yarn.lock` for consistent dependency versions

## Shared Packages

Shared packages live in `packages/@happy/` and are tracked in the `happy-shared` GitHub repository (separate from individual project repos). Each package has its own [`CLAUDE.md`](#shared-packages) with detailed development guidelines.

### @magic-agent/protocol

> **Full documentation**: [`packages/@magic-agent/protocol/CLAUDE.md`](./packages/@magic-agent/protocol/CLAUDE.md)

The `@magic-agent/protocol` package provides shared Zod schemas for:
- **API Updates**: Session, machine, message, artifact, account schemas
- **Ephemeral Events**: Real-time events like typing indicators, cost updates

**Usage:**
```typescript
import { ApiUpdateSchema, type ApiUpdate } from '@magic-agent/protocol';
```

**Building:**
```bash
yarn workspace @magic-agent/protocol build
yarn workspace @magic-agent/protocol typecheck
```

### @magic-agent/errors

> **Full documentation**: [`packages/@magic-agent/errors/CLAUDE.md`](./packages/@magic-agent/errors/CLAUDE.md)

The `@magic-agent/errors` package provides unified error handling:
- **AppError class**: Standardized error structure with error codes
- **Error codes**: Centralized error code constants

**Usage:**
```typescript
import { AppError, ErrorCodes } from '@magic-agent/errors';
```

**Building:**
```bash
yarn workspace @magic-agent/errors build
yarn workspace @magic-agent/errors typecheck
```

### @happy/lint-rules

> **Full documentation**: [`packages/@happy/lint-rules/CLAUDE.md`](./packages/@happy/lint-rules/CLAUDE.md)

The `@happy/lint-rules` package provides custom linting rules for oxlint and ESLint:
- **happy/github-casing**: Enforces "GitHub" casing in PascalCase identifiers (HAP-502)
- **happy/protocol-helpers**: Enforces `@magic-agent/protocol` ID accessor helper usage (HAP-658)

**Usage with oxlint:**
```json
{
    "jsPlugins": ["@happy/lint-rules"],
    "rules": {
        "happy/github-casing": "warn",
        "happy/protocol-helpers": "warn"
    }
}
```

### Consuming Shared Packages

Projects consume packages via workspace linking:
```json
{
  "dependencies": {
    "@magic-agent/protocol": "workspace:*",
    "@magic-agent/errors": "workspace:*"
  },
  "devDependencies": {
    "@happy/lint-rules": "workspace:*"
  }
}
```

## Git Repository Structure

The monorepo uses **multiple git repositories**:

| Repository | Tracks | GitHub |
|------------|--------|--------|
| `happy-shared` | Root configs, `packages/`, docs | [Enflame-Media/happy-shared](https://github.com/Enflame-Media/happy-shared) |
| `happy-app` | Mobile/web app code | [Enflame-Media/happy](https://github.com/Enflame-Media/happy) |
| `happy-cli` | CLI wrapper code | Individual repo |
| `happy-server` | Backend server code | Individual repo |
| `happy-server-workers` | Cloudflare Workers | Individual repo |
| `happy-admin` | Admin dashboard frontend (Vue.js) | Individual repo |
| `happy-admin-api` | Admin dashboard API (Hono) | Individual repo |

Each project directory has its own `.git/` - they are independent repositories.

## Development Workflow

### Working on a Single Project

Navigate to the project directory and follow its specific `CLAUDE.md`:

```bash
# CLI development
cd happy-cli
yarn build && yarn test

# Server development
cd happy-server
yarn dev  # Uses .env.dev

# Mobile app development
cd happy-app
yarn start
```

### Cross-Project Changes

When changes span multiple projects:

1. **Protocol/API changes**: Update in this order:
   - `happy-server` - Update API endpoints/types first
   - `happy-cli` - Update API client to match
   - `happy-app` - Update sync logic to match

2. **Type definitions**: Use `@magic-agent/protocol` for shared types. Project-specific types remain in:
   - Shared: `packages/@magic-agent/protocol/` (Zod schemas for API updates/events)
   - Server: `sources/app/api/types.ts`
   - CLI: `src/api/types.ts`
   - App: `sources/sync/types.ts`

3. **Testing**: Test each project independently after changes

## System Architecture

### Authentication Flow
1. CLI generates keypair and displays QR code
2. Mobile app scans QR and approves connection
3. Server facilitates challenge-response authentication
4. All subsequent data is end-to-end encrypted

### Session Synchronization
1. CLI wraps Claude Code and captures session state
2. CLI encrypts and sends updates to server via WebSocket
3. Server relays encrypted messages to connected mobile devices
4. Mobile app decrypts and displays real-time session state

### Data Flow
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  happy-cli  │◄──────► │ happy-server │◄──────► │  happy-app  │
│  (Node.js)  │ encrypt │  (Fastify)   │ encrypt │ (React Native)│
│             │  WSS    │              │  WSS    │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                                  │
       ▼                                                  ▼
  Claude Code                                      Mobile UI
  (subprocess)                                    (encrypted view)
```

## Common Commands

### Building All Projects
```bash
# From root
cd happy-cli && yarn build
cd ../happy-server && yarn build
cd ../happy-app && yarn typecheck
```

### Running Tests
```bash
# CLI tests (includes integration tests)
cd happy-cli && yarn test

# Server tests
cd happy-server && yarn test

# App tests
cd happy-app && yarn test
```

### Local Development with All Components
```bash
# Terminal 1: Start server locally
cd happy-server
yarn dev

# Terminal 2: Run CLI with local server
cd happy-cli
yarn dev:local-server

# Terminal 3: Run mobile app with local server
cd happy-app
yarn start:local-server
```

## Important Notes

- **Path aliases**: All three projects use `@/*` to import from their respective source directories
- **Source directories**: CLI uses `src/`, server and app use `sources/`
- **Module systems**: CLI uses ESM, server uses CommonJS, app uses ESM (via Expo)
- **TypeScript**: All projects use strict mode
- **Encryption**: End-to-end encryption using TweetNaCl (NaCl Box) - server never sees plaintext
- **Database**: Server uses Prisma with PostgreSQL (never modify schema without migrations)
- **Environment variables**: Each project has its own `.env` file structure (see Environment & Secrets section below)

## Code Style Conventions

### GitHub Naming Convention

When referencing GitHub in code:

| Context | Convention | Example |
|---------|------------|---------|
| Type/Class/Schema names | `GitHub` (PascalCase with capital H) | `GitHubProfileSchema`, `GitHubUser` |
| Variable names | `github` (camelCase) | `githubToken`, `existingGithubConnection` |
| Function names | `GitHub` in name | `createGitHubToken`, `verifyGitHubToken` |
| URL paths | `github` (lowercase) | `/v1/connect/github/callback` |
| Translation keys | `github` (lowercase) | `t('modals.disconnectGithub')` |
| File names | `github` (lowercase) | `apiGithub.ts`, `githubConnect.ts` |

This follows the official GitHub branding (capital H) while respecting language-specific conventions.

## Environment & Secrets Management

### Environment File Structure

Each project follows a consistent pattern for environment files:

| File | Purpose | Committed to Git |
|------|---------|------------------|
| `.env.example` | Template with all variables and descriptions | Yes |
| `.env.dev` | Local development with safe defaults | Yes |
| `.env.staging` | Staging environment template | Yes |
| `.env` | Active environment (copied from template) | No |
| `.env.local` | Local overrides | No |
| `.env.production` | Production values | No |

### Project-Specific Variables

#### happy-cli
- `HAPPY_SERVER_URL` - API server URL
- `HAPPY_WEBAPP_URL` - Web application URL
- `HAPPY_HOME_DIR` - Local data directory (~/.happy)
- `DEBUG` - Enable verbose logging

#### happy-server
- `DATABASE_URL` - PostgreSQL connection string (required)
- `REDIS_URL` - Redis connection for pub/sub (required)
- `HAPPY_MASTER_SECRET` - Master encryption key (required, replaces deprecated `HANDY_MASTER_SECRET`)
- `S3_*` - S3/MinIO storage configuration (required)
- `ELEVENLABS_API_KEY` - Voice synthesis (optional)
- `GITHUB_*` - GitHub OAuth integration (optional)

#### happy-app
- `EXPO_PUBLIC_HAPPY_SERVER_URL` - API server URL (baked into app at build time)

#### happy-server-workers (Cloudflare)
- Uses `.dev.vars` for local development (gitignored)
- Production secrets via `wrangler secret put`
- Bindings (D1, R2, Durable Objects) in `wrangler.toml`

#### happy-admin (Cloudflare - Frontend)
- Frontend-only worker, no secrets required
- Serves Vue.js SPA via [site] bucket
- API calls go to happy-admin-api

#### happy-admin-api (Cloudflare - API)
- Uses `.dev.vars` for local development (gitignored)
- `BETTER_AUTH_SECRET` - Session signing secret
- Uses main happy D1 databases (happy-dev, happy-prod)
- Analytics Engine via Secrets Store bindings

### Generating Secrets

Use the provided script to generate cryptographic secrets:

```bash
cd happy-server
./scripts/generate-secrets.sh
./scripts/generate-secrets.sh --env production
```

This generates:
- `HAPPY_MASTER_SECRET` - 32-byte hex for JWT signing (replaces deprecated `HANDY_MASTER_SECRET`)
- `GITHUB_WEBHOOK_SECRET` - Webhook signature verification
- TweetNaCl keypairs for client encryption

### Cloudflare Secrets (Workers)

For `happy-server-workers`, production secrets are managed via Wrangler:

```bash
cd happy-server-workers

# Set a secret
wrangler secret put HAPPY_MASTER_SECRET --env prod

# List all secrets
wrangler secret list --env prod

# Delete a secret
wrangler secret delete SECRET_NAME --env prod
```

Required production secrets:
- `HAPPY_MASTER_SECRET` - Authentication and encryption (replaces deprecated `HANDY_MASTER_SECRET`)

Optional:
- `ELEVENLABS_API_KEY` - Voice features
- `GITHUB_PRIVATE_KEY` - GitHub App authentication
- `GITHUB_CLIENT_SECRET` - GitHub OAuth

### Secret Rotation

See `happy-server/docs/SECRET-ROTATION.md` for detailed procedures on rotating secrets, including:
- Impact assessment for each secret type
- Step-by-step rotation procedures
- Emergency rotation checklist
- Cloudflare Secrets commands reference

### Security Best Practices

1. **Never commit secrets** - All `.env` files with real credentials are gitignored
2. **Use different secrets per environment** - Dev, staging, and production should have unique secrets
3. **Rotate quarterly** - Regular rotation reduces exposure window
4. **Use Cloudflare Secrets for Workers** - Never put production secrets in `wrangler.toml`
5. **Generate cryptographically secure secrets** - Use `openssl rand -hex 32` or the provided script

## Security Considerations

- All sensitive data is encrypted client-side before transmission
- Server acts as a "zero-knowledge" relay - cannot decrypt messages
- Authentication uses cryptographic signatures, no passwords
- Session IDs and encryption keys never leave the client devices

## Project Dependencies

- **happy-cli** depends on: Claude Code (globally installed, not bundled)
- **happy-server** depends on: Nothing (standalone)
- **happy-app** depends on: Nothing (standalone)

All three communicate via the HTTP/WebSocket API defined by happy-server.

## When Working Across Projects

1. **Always check project-specific CLAUDE.md** before making changes
2. **Respect different conventions** (ESM vs CommonJS, src vs sources, 2-space vs 4-space indentation)
3. **Test independently** - each project has its own test suite
4. **Consider backward compatibility** - mobile apps may be on older versions
5. **Update @magic-agent/protocol first** when changing shared types, then update consuming projects
6. **Commit to correct repo** - shared packages go to `happy-shared`, project code to individual repos
````

## File: package.json
````json
{
  "private": true,
  "name": "happy-monorepo",
  "description": "Happy monorepo - Mobile and web client for Claude Code and Codex",
  "packageManager": "yarn@4.12.0",
  "workspaces": [
    "packages/@happy/*",
    "happy-cli",
    "happy-server-workers",
    "happy-app",
    "happy-admin",
    "happy-admin-api"
  ],
  "scripts": {
    "postinstall": "yarn workspace @magic-agent/errors build && yarn workspace @magic-agent/protocol build",
    "build:errors": "yarn workspace @magic-agent/errors build",
    "build:protocol": "yarn workspace @magic-agent/protocol build",
    "typecheck:errors": "yarn workspace @magic-agent/errors typecheck",
    "typecheck:protocol": "yarn workspace @magic-agent/protocol typecheck",
    "schema:extract": "yarn workspace @magic-agent/protocol schema:extract",
    "schema:compare": "tsx scripts/compare-schemas.ts",
    "ncu:all": "find . -name package.json -not -path '*/node_modules/*' -execdir ncu -u \\;",
    "deploy:stack:pro": "yarn install && cd happy-cli && yarn build && cd ../happy-app && yarn deploy:workers:pro && cd ../happy-server-workers && yarn deploy:prod",
    "deploy:stack:dev": "yarn install && cd happy-cli && yarn build && cd ../happy-app && yarn deploy:workers:dev && cd ../happy-server-workers && yarn deploy:dev"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "resolutions": {
    "@react-navigation/native": "7.1.26",
    "@react-navigation/core": "7.13.7",
    "@react-navigation/elements": "2.9.3",
    "@react-navigation/native-stack": "7.9.0",
    "@react-navigation/bottom-tabs": "7.8.12",
    "@react-navigation/routers": "7.5.3",
    "miniflare/zod": "3.22.3"
  }
}
````



# Git Logs

## Commit: 2026-01-06 03:46:59 -0600
**Message:** Add deploy scripts and update dependencies

**Files:**
- package.json
- packages/@happy/lint-rules/package.json
- yarn.lock

## Commit: 2026-01-04 18:53:21 -0600
**Message:** chore: remove CI workflow configuration

**Files:**
- .github/workflows/ci.yml

## Commit: 2026-01-04 18:46:44 -0600
**Message:** chore: remove happy-server from workspaces

**Files:**
- package.json
- yarn.lock

## Commit: 2026-01-04 18:20:19 -0600
**Message:** Merge pull request #15 from Enflame-Media/alert-autofix-5

**Files:**

## Commit: 2026-01-04 18:19:41 -0600
**Message:** Update permissions to allow actions write access

**Files:**
- .github/workflows/shared-types-validation.yml

## Commit: 2026-01-04 18:18:27 -0600
**Message:** Merge pull request #16 from Enflame-Media/alert-autofix-17

**Files:**

## Commit: 2026-01-04 18:11:28 -0600
**Message:** Potential fix for code scanning alert no. 17: DOM text reinterpreted as HTML

**Files:**
- packages/@magic-agent/protocol/coverage/sorter.js

## Commit: 2026-01-04 18:07:48 -0600
**Message:** Potential fix for code scanning alert no. 2: Workflow does not contain permissions

**Files:**
- .github/workflows/shared-types-validation.yml

## Commit: 2026-01-04 18:06:59 -0600
**Message:** Potential fix for code scanning alert no. 5: Workflow does not contain permissions

**Files:**
- .github/workflows/ci.yml

## Commit: 2026-01-04 18:04:58 -0600
**Message:** Merge pull request #4 from Enflame-Media/dependabot/github_actions/actions/download-artifact-7

**Files:**

## Commit: 2026-01-04 18:04:25 -0600
**Message:** Merge pull request #5 from Enflame-Media/dependabot/github_actions/actions/setup-node-6

**Files:**

## Commit: 2026-01-04 23:29:56 +0000
**Message:** ci(deps): Bump actions/setup-node from 4 to 6

**Files:**
- .github/workflows/shared-types-validation.yml

## Commit: 2026-01-04 23:29:54 +0000
**Message:** ci(deps): Bump actions/download-artifact from 4 to 7

**Files:**
- .github/workflows/ci.yml

## Commit: 2026-01-04 17:28:53 -0600
**Message:** chore: exclude new project directories from happy-shared tracking

**Files:**
- .gitignore
- happy-admin/.dev.vars.example
- happy-admin/.gitignore
- happy-admin/CLAUDE.md
- happy-admin/docs/ANALYTICS-SCHEMA.md
- happy-admin/eslint.config.js
- happy-admin/package.json
- happy-admin/postcss.config.js
- happy-admin/src/app/App.vue
- happy-admin/src/app/components/BundleSizeChart.vue
- happy-admin/src/app/components/BundleSizeLatest.vue
- happy-admin/src/app/components/DateRangeSelector.vue
- happy-admin/src/app/components/MetricsSummary.vue
- happy-admin/src/app/components/ModeDistribution.vue
- happy-admin/src/app/components/PerformanceTrends.vue
- happy-admin/src/app/components/SyncMetricsChart.vue
- happy-admin/src/app/components/UnknownTypeBreakdown.vue
- happy-admin/src/app/components/ValidationSummary.vue
- happy-admin/src/app/components/ValidationTrendsChart.vue
- happy-admin/src/app/composables/useAdminUsers.ts
- happy-admin/src/app/composables/useAnalytics.ts
- happy-admin/src/app/composables/useBundleSize.ts
- happy-admin/src/app/composables/useMetrics.ts
- happy-admin/src/app/composables/useValidation.ts
- happy-admin/src/app/index.html
- happy-admin/src/app/lib/api.ts
- happy-admin/src/app/main.ts
- happy-admin/src/app/style.css
- happy-admin/src/app/views/AdminUsers.vue
- happy-admin/src/app/views/Dashboard.vue
- happy-admin/src/app/views/Login.vue
- happy-admin/src/shims-vue.d.ts
- happy-admin/src/worker/auth.ts
- happy-admin/src/worker/env.ts
- happy-admin/src/worker/index.ts
- happy-admin/src/worker/middleware/auth.ts
- happy-admin/src/worker/routes/auth.ts
- happy-admin/src/worker/routes/metrics.ts
- happy-admin/tailwind.config.js
- happy-admin/tsconfig.json
- happy-admin/vite.config.ts
- happy-admin/wrangler.toml

## Commit: 2026-01-04 17:22:04 -0600
**Message:** Merge branch 'main' of https://github.com/Enflame-Media/happy-shared

**Files:**

## Commit: 2026-01-04 17:21:43 -0600
**Message:** Add knip config, update deps, and add coverage output

**Files:**
- knip.json
- package.json
- packages/@magic-agent/errors/CLAUDE.md
- packages/@magic-agent/errors/package.tgz
- packages/@happy/lint-rules/package.json
- packages/@magic-agent/protocol/coverage/base.css
- packages/@magic-agent/protocol/coverage/block-navigation.js
- packages/@magic-agent/protocol/coverage/clover.xml
- packages/@magic-agent/protocol/coverage/coverage-final.json
- packages/@magic-agent/protocol/coverage/favicon.png
- packages/@magic-agent/protocol/coverage/index.html
- packages/@magic-agent/protocol/coverage/prettify.css
- packages/@magic-agent/protocol/coverage/prettify.js
- packages/@magic-agent/protocol/coverage/sort-arrow-sprite.png
- packages/@magic-agent/protocol/coverage/sorter.js
- packages/@magic-agent/protocol/coverage/src/common.ts.html
- packages/@magic-agent/protocol/coverage/src/constraints.ts.html
- packages/@magic-agent/protocol/coverage/src/ephemeral/events.ts.html
- packages/@magic-agent/protocol/coverage/src/ephemeral/index.html
- packages/@magic-agent/protocol/coverage/src/ephemeral/index.ts.html
- packages/@magic-agent/protocol/coverage/src/helpers.ts.html
- packages/@magic-agent/protocol/coverage/src/index.html
- packages/@magic-agent/protocol/coverage/src/index.ts.html
- packages/@magic-agent/protocol/coverage/src/mcp.ts.html
- packages/@magic-agent/protocol/coverage/src/payloads.ts.html
- packages/@magic-agent/protocol/coverage/src/updates/account.ts.html
- packages/@magic-agent/protocol/coverage/src/updates/artifact.ts.html
- packages/@magic-agent/protocol/coverage/src/updates/index.html
- packages/@magic-agent/protocol/coverage/src/updates/index.ts.html
- packages/@magic-agent/protocol/coverage/src/updates/machine.ts.html
- packages/@magic-agent/protocol/coverage/src/updates/message.ts.html
- packages/@magic-agent/protocol/coverage/src/updates/misc.ts.html
- packages/@magic-agent/protocol/coverage/src/updates/session.ts.html
- packages/@magic-agent/protocol/package.json
- packages/@magic-agent/protocol/src/common.ts
- yarn.lock

## Commit: 2026-01-04 14:26:11 -0600
**Message:** test(HAP-780): Add tests for machine-disconnected ephemeral event

**Files:**
- packages/@magic-agent/protocol/src/helpers.test.ts

## Commit: 2026-01-04 14:18:21 -0600
**Message:** feat(HAP-780): Add machine-disconnected ephemeral event schema

**Files:**
- packages/@magic-agent/protocol/src/ephemeral/events.ts
- packages/@magic-agent/protocol/src/helpers.ts

## Commit: 2026-01-04 13:44:39 -0600
**Message:** feat(HAP-778): Add ApiDeleteMachineSchema for machine disconnect

**Files:**
- packages/@magic-agent/protocol/src/updates/index.ts
- packages/@magic-agent/protocol/src/updates/machine.ts

## Commit: 2026-01-04 11:01:31 -0600
**Message:** docs(HAP-721): Add happy-macos to encryption architecture documentation

**Files:**
- docs/ENCRYPTION-ARCHITECTURE.md

## Commit: 2026-01-04 10:54:32 -0600
**Message:** chore(HAP-764): Add lint jobs for happy-admin and happy-admin-api to root CI

**Files:**
- .github/workflows/ci.yml

## Commit: 2026-01-04 10:12:47 -0600
**Message:** feat(HAP-766): Add session sharing protocol schemas to @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/README.md
- packages/@magic-agent/protocol/scripts/generate-swift.ts
- packages/@magic-agent/protocol/src/index.ts
- packages/@magic-agent/protocol/src/sharing.test.ts
- packages/@magic-agent/protocol/src/sharing.ts

## Commit: 2026-01-04 09:05:20 -0600
**Message:** test(HAP-763): Add unit tests for @happy/lint-rules oxlint plugin

**Files:**
- packages/@happy/lint-rules/CLAUDE.md
- packages/@happy/lint-rules/package.json
- packages/@happy/lint-rules/src/rules/github-casing.test.js
- packages/@happy/lint-rules/src/rules/protocol-helpers.test.js
- packages/@happy/lint-rules/vitest.config.js
- yarn.lock

## Commit: 2026-01-04 08:56:23 -0600
**Message:** docs(HAP-758): Add @happy/lint-rules to root CLAUDE.md

**Files:**
- CLAUDE.md

## Commit: 2026-01-04 07:58:54 -0600
**Message:** refactor(HAP-758): Add @happy/lint-rules package for oxlint JS plugins

**Files:**
- packages/@happy/lint-rules/CLAUDE.md
- packages/@happy/lint-rules/package.json
- packages/@happy/lint-rules/src/index.js
- packages/@happy/lint-rules/src/rules/github-casing.js
- packages/@happy/lint-rules/src/rules/protocol-helpers.js
- yarn.lock

## Commit: 2026-01-04 00:37:49 -0600
**Message:** feat(HAP-658): Add ESLint rule to enforce @magic-agent/protocol ID accessor helper usage

**Files:**
- happy-admin/eslint.config.js
- scripts/lint-protocol-helpers.mjs

## Commit: 2026-01-02 18:09:26 -0600
**Message:** feat(HAP-741): Add archive-session update schema to @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/src/updates/index.ts
- packages/@magic-agent/protocol/src/updates/session.ts

## Commit: 2026-01-02 00:55:39 -0600
**Message:** feat(HAP-733): Add SESSION_REVIVAL_FAILED error code

**Files:**
- packages/@magic-agent/errors/src/index.ts

## Commit: 2026-01-01 23:28:51 -0600
**Message:** feat(HAP-729): Add UsageLimits schema to @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/src/index.ts
- packages/@magic-agent/protocol/src/usageLimits.test.ts
- packages/@magic-agent/protocol/src/usageLimits.ts

## Commit: 2026-01-01 19:11:41 -0600
**Message:** feat(HAP-716): Add FriendStatusEventSchema to @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/src/ephemeral/events.ts

## Commit: 2026-01-01 05:15:49 -0600
**Message:** chore(HAP-695): Migrate extract-schemas.ts to Zod 4 native JSON Schema

**Files:**
- packages/@magic-agent/protocol/package.json
- packages/@magic-agent/protocol/scripts/extract-schemas.ts

## Commit: 2026-01-01 04:49:13 -0600
**Message:** feat(HAP-687): Set up Zod to Swift type generation for happy-macos

**Files:**
- packages/@magic-agent/protocol/CLAUDE.md
- packages/@magic-agent/protocol/package.json
- packages/@magic-agent/protocol/scripts/generate-swift.ts
- yarn.lock

## Commit: 2025-12-29 17:45:30 -0600
**Message:** test(HAP-654): Update common.test.ts to use `sid` field

**Files:**
- packages/@magic-agent/protocol/src/common.test.ts

## Commit: 2025-12-29 17:43:45 -0600
**Message:** docs(HAP-654): Fix outdated JSDoc example in ApiUpdateSchema

**Files:**
- packages/@magic-agent/protocol/src/updates/index.ts

## Commit: 2025-12-29 17:35:03 -0600
**Message:** docs(HAP-654): Update README.md to reflect standardized field names

**Files:**
- packages/@magic-agent/protocol/README.md

## Commit: 2025-12-29 17:25:14 -0600
**Message:** feat(HAP-654): Standardize session ID field to 'sid' in @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/README.md
- packages/@magic-agent/protocol/src/updates/machine.ts
- packages/@magic-agent/protocol/src/updates/message.ts
- packages/@magic-agent/protocol/src/updates/session.ts

## Commit: 2025-12-29 17:24:36 -0600
**Message:** feat(HAP-655): Standardize machine ID field to 'machineId' in ephemeral events

**Files:**
- packages/@magic-agent/protocol/src/ephemeral/events.ts

## Commit: 2025-12-29 17:16:21 -0600
**Message:** feat(HAP-653): Add type-safe session/machine ID accessor helpers to @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/src/helpers.test.ts
- packages/@magic-agent/protocol/src/helpers.ts
- packages/@magic-agent/protocol/src/index.ts

## Commit: 2025-12-29 17:06:49 -0600
**Message:** docs(HAP-651): Add JSDoc comments clarifying session/machine ID fields

**Files:**
- packages/@magic-agent/protocol/src/ephemeral/events.ts
- packages/@magic-agent/protocol/src/updates/machine.ts
- packages/@magic-agent/protocol/src/updates/message.ts
- packages/@magic-agent/protocol/src/updates/session.ts

## Commit: 2025-12-29 17:04:30 -0600
**Message:** docs(HAP-652): Add session/machine ID field name mapping to @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/CLAUDE.md
- packages/@magic-agent/protocol/README.md

## Commit: 2025-12-29 05:34:56 -0600
**Message:** chore(happy-app): Remove 35 unused dependencies and 4 dead code files

**Files:**
- yarn.lock

## Commit: 2025-12-29 05:02:41 -0600
**Message:** fix(HAP-630): Add safe error response utilities to @magic-agent/errors

**Files:**
- packages/@magic-agent/errors/src/index.ts
- packages/@magic-agent/errors/src/safeError.ts

## Commit: 2025-12-28 19:54:44 -0600
**Message:** feat(HAP-631): Enforce type-safe error codes in AppError class

**Files:**
- packages/@magic-agent/errors/src/index.test.ts
- packages/@magic-agent/errors/src/index.ts

## Commit: 2025-12-28 19:43:52 -0600
**Message:** feat(HAP-629): Add string length validation to protocol schemas

**Files:**
- packages/@magic-agent/protocol/src/common.test.ts
- packages/@magic-agent/protocol/src/ephemeral/events.ts
- packages/@magic-agent/protocol/src/index.ts
- packages/@magic-agent/protocol/src/mcp.ts
- packages/@magic-agent/protocol/src/payloads.ts
- packages/@magic-agent/protocol/src/updates/account.ts
- packages/@magic-agent/protocol/src/updates/artifact.ts
- packages/@magic-agent/protocol/src/updates/machine.ts
- packages/@magic-agent/protocol/src/updates/message.ts
- packages/@magic-agent/protocol/src/updates/misc.ts
- packages/@magic-agent/protocol/src/updates/session.ts

## Commit: 2025-12-28 19:30:12 -0600
**Message:** fix(HAP-626): Replace .passthrough() with .strip() for security

**Files:**
- happy-admin/src/app/composables/useAdminUsers.ts
- happy-admin/src/app/main.ts
- happy-admin/src/app/views/AdminUsers.vue
- happy-admin/src/app/views/Dashboard.vue
- packages/@magic-agent/protocol/src/common.test.ts
- packages/@magic-agent/protocol/src/common.ts
- packages/@magic-agent/protocol/src/constraints.ts
- packages/@magic-agent/protocol/src/payloads.ts

## Commit: 2025-12-28 07:27:08 -0600
**Message:** feat(HAP-605): Add MCP state sync schemas to @magic-agent/protocol

**Files:**
- packages/@magic-agent/protocol/src/index.ts
- packages/@magic-agent/protocol/src/mcp.ts

## Commit: 2025-12-27 04:38:27 -0600
**Message:** feat(HAP-582): Add validation metrics UI section to admin dashboard

**Files:**
- happy-admin/src/app/components/UnknownTypeBreakdown.vue
- happy-admin/src/app/components/ValidationSummary.vue
- happy-admin/src/app/components/ValidationTrendsChart.vue
- happy-admin/src/app/composables/useValidation.ts
- happy-admin/src/app/lib/api.ts
- happy-admin/src/app/views/Dashboard.vue

## Commit: 2025-12-26 20:20:20 -0600
**Message:** Upgrade actions/checkout from v4 to v6

**Files:**
- .github/workflows/codeql.yml

## Commit: 2025-12-26 19:25:06 -0600
**Message:** docs(HAP-577): Update analytics schema documentation

**Files:**
- happy-admin/docs/ANALYTICS-SCHEMA.md

## Commit: 2025-12-26 16:45:33 -0600
**Message:** chore: Suppress safe peer dependency warnings in Yarn config

**Files:**
- .yarnrc.yml
