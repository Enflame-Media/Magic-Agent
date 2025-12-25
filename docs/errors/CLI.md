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
