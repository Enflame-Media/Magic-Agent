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
