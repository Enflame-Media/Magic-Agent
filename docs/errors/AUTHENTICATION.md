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
