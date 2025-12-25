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
